import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { LIMITS } from "../app/config";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import { damageStage, radialFalloff, weightedIntegrity } from "./logic";
import { StructuralGraph } from "./StructuralGraph";
import type { DamageEvent, DamageResult, MaterialKind, ObjectDefinition, PartState } from "./types";

interface RuntimePart {
  definition: ObjectDefinition["parts"][number];
  mesh: THREE.Mesh;
  state: PartState;
  body?: RAPIER.RigidBody;
  recycleAt?: number;
}

export class DestructibleObject {
  readonly group = new THREE.Group();
  readonly parts = new Map<string, RuntimePart>();
  private readonly graph: StructuralGraph;
  private destroyed = false;
  private initialDetached = 0;

  constructor(
    readonly definition: ObjectDefinition,
    private readonly scene: THREE.Scene,
    private readonly physics: PhysicsWorld,
  ) {
    this.group.name = definition.id;
    this.group.position.set(0, 1.02, 0);
    this.graph = new StructuralGraph(definition.parts, definition.bonds);
    for (const definitionPart of definition.parts) {
      const mesh = new THREE.Mesh(createPartGeometry(definitionPart.shape), createPartMaterial(definitionPart.material, definitionPart.color));
      mesh.position.set(...definitionPart.position);
      if (definitionPart.rotation) mesh.rotation.set(...definitionPart.rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = definitionPart.visible !== false;
      mesh.name = definitionPart.label;
      mesh.userData.destructiblePartId = definitionPart.id;
      mesh.userData.destructibleObject = this;
      this.group.add(mesh);
      this.parts.set(definitionPart.id, {
        definition: definitionPart,
        mesh,
        state: { id: definitionPart.id, health: definitionPart.maxHealth, stage: "intact", detached: false },
      });
    }
    this.scene.add(this.group);
    this.group.updateWorldMatrix(true, false);
    for (const runtime of this.parts.values()) {
      if (!runtime.definition.startsDynamic) continue;
      this.scene.attach(runtime.mesh);
      runtime.body = this.physics.addDynamic(runtime.mesh, runtime.definition.shape, runtime.definition.mass);
    }
  }

  applyDamage(partId: string, event: DamageEvent): DamageResult {
    const hitPart = this.parts.get(partId);
    if (!hitPart) return { hit: false, damage: 0, detached: [], majorBreak: false, destroyedNow: false };
    let totalDamage = 0;
    const point = event.point;
    const worldPosition = new THREE.Vector3();
    for (const runtime of this.parts.values()) {
      if (runtime.state.health <= 0) continue;
      runtime.mesh.getWorldPosition(worldPosition);
      const falloff = runtime === hitPart ? 1 : radialFalloff(worldPosition.distanceTo(point), event.radius);
      if (falloff <= 0) continue;
      const materialScale = runtime.definition.material === "ceramic" ? 1.12 : 1;
      const amount = event.amount * falloff * materialScale;
      runtime.state.health = Math.max(0, runtime.state.health - amount);
      runtime.state.stage = damageStage(runtime.state.health, runtime.definition.maxHealth);
      if (runtime.state.health <= 0 && runtime.definition.shape.kind === "crate" && runtime.recycleAt === undefined) {
        runtime.recycleAt = performance.now() + LIMITS.debrisLifetime * 1000;
      }
      totalDamage += amount;
      updatePartVisual(runtime);
      this.graph.damageAdjacent(runtime.definition.id, amount * 0.58);
    }
    if (hitPart.state.health <= 0) this.graph.damageAdjacent(hitPart.definition.id, event.amount * 2);
    const detached = this.detachDisconnected(event);
    if (hitPart.body && !detached.includes(hitPart.definition.id)) {
      hitPart.body.applyImpulse({ x: event.direction.x * event.impulse, y: event.direction.y * event.impulse, z: event.direction.z * event.impulse }, true);
    }
    const nowDestroyed = this.isDestroyed();
    const destroyedNow = nowDestroyed && !this.destroyed;
    if (destroyedNow && this.definition.id === "crate") {
      const recycleAt = performance.now() + LIMITS.debrisLifetime * 1000;
      for (const runtime of this.parts.values()) runtime.recycleAt ??= recycleAt;
    }
    this.destroyed = this.destroyed || nowDestroyed;
    return {
      hit: true,
      damage: Math.min(totalDamage, event.amount * 1.8),
      detached,
      majorBreak: detached.some((id) => this.parts.get(id)?.definition.debrisClass !== "minor"),
      destroyedNow,
      material: hitPart.definition.material,
    };
  }

  get integrity(): number {
    return weightedIntegrity(this.definition.parts, new Map([...this.parts].map(([id, runtime]) => [id, runtime.state])));
  }

  get detachedCount(): number {
    return [...this.parts.values()].filter((part) => part.state.detached).length - this.initialDetached;
  }

  get detachedIds(): string[] {
    return [...this.parts.values()].filter((part) => part.state.detached).map((part) => part.definition.id);
  }

  get tvPowered(): boolean {
    const power = [...this.parts.values()].find((part) => part.definition.functionalTag === "power");
    return !power || power.state.health > 0;
  }

  get screenDamage(): number {
    const screen = [...this.parts.values()].find((part) => part.definition.functionalTag === "screen");
    return screen ? 1 - screen.state.health / screen.definition.maxHealth : 0;
  }

  getHitSurface(partId: string): THREE.Object3D | undefined {
    return this.parts.get(partId)?.mesh;
  }

  isDestroyed(): boolean {
    if (this.integrity <= 15) return true;
    if (this.definition.id === "crate") {
      return [...this.parts.values()].filter((part) => part.state.detached && part.definition.integrityWeight >= 1).length >= 4;
    }
    if (this.definition.criticalFailure === "all-supports") {
      return [...this.parts.values()].filter((part) => part.definition.functionalTag === "support").every((part) => part.state.detached);
    }
    if (this.definition.criticalFailure === "vase-core") return (this.parts.get("lower")?.state.health ?? 1) <= 0;
    return false;
  }

  update(): void {
    for (const runtime of this.parts.values()) {
      if (runtime.recycleAt !== undefined && performance.now() >= runtime.recycleAt) {
        if (runtime.body) {
          this.physics.removeBody(runtime.body);
          runtime.body = undefined;
        }
        runtime.mesh.visible = false;
        runtime.recycleAt = undefined;
        continue;
      }
      if (runtime.state.detached && runtime.mesh.position.y < -3) runtime.mesh.visible = false;
    }
    if (this.definition.id === "television") {
      const screen = this.parts.get("screen");
      if (screen) {
        const material = screen.mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = this.tvPowered ? Math.max(0.1, 0.65 - this.screenDamage * 0.6) : 0;
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.group);
    for (const runtime of this.parts.values()) {
      if (runtime.body) this.physics.removeBody(runtime.body);
      this.scene.remove(runtime.mesh);
      runtime.mesh.geometry.dispose();
      (runtime.mesh.material as THREE.Material).dispose();
    }
    this.parts.clear();
  }

  private detachDisconnected(event: DamageEvent): string[] {
    const alreadyDetached = new Set(this.detachedIds);
    const ids = this.graph.getDetached(alreadyDetached);
    let activeMajor = this.physics.activeBodies;
    for (const id of ids) {
      const runtime = this.parts.get(id);
      if (!runtime) continue;
      runtime.state.detached = true;
      this.group.updateWorldMatrix(true, false);
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      runtime.mesh.getWorldPosition(worldPosition);
      runtime.mesh.getWorldQuaternion(worldQuaternion);
      this.scene.attach(runtime.mesh);
      runtime.mesh.position.copy(worldPosition);
      runtime.mesh.quaternion.copy(worldQuaternion);
      if (runtime.body) {
        runtime.body.applyImpulse({ x: event.direction.x * event.impulse, y: Math.max(0.4, event.direction.y * event.impulse), z: event.direction.z * event.impulse }, true);
      } else if (activeMajor < LIMITS.majorPieces) {
        runtime.body = this.physics.addDynamic(runtime.mesh, runtime.definition.shape, runtime.definition.mass);
        runtime.body.applyImpulse({ x: event.direction.x * event.impulse, y: Math.max(0.4, event.direction.y * event.impulse), z: event.direction.z * event.impulse }, true);
        activeMajor++;
      } else {
        runtime.mesh.visible = false;
      }
    }
    return ids;
  }
}

export function createPartGeometry(shape: ObjectDefinition["parts"][number]["shape"]): THREE.BufferGeometry {
  const [x, y, z] = shape.size;
  if (shape.kind === "crate") return smallCrateGeometry(x, y, z);
  if (shape.kind === "sphere") return new THREE.SphereGeometry(0.5, 14, 9).scale(x, y, z);
  if (shape.kind === "cylinder") return new THREE.CylinderGeometry(x, z, y, 14);
  if (shape.kind === "torus") return new THREE.TorusGeometry(x, y, 10, 24);
  return new THREE.BoxGeometry(x, y, z);
}

export function createPartMaterial(kind: MaterialKind, color: number): THREE.MeshStandardMaterial {
  const metal = kind === "metal";
  const glass = kind === "glass";
  return new THREE.MeshStandardMaterial({
    color,
    roughness: metal ? 0.32 : glass ? 0.22 : 0.72,
    metalness: metal ? 0.78 : 0.02,
    transparent: glass,
    opacity: glass ? 0.82 : 1,
    emissive: glass ? 0x275657 : 0x000000,
    emissiveIntensity: glass ? 0.65 : 0,
    vertexColors: true,
  });
}

function smallCrateGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const thickness = Math.min(width, height, depth) * 0.065;
  const panelWidth = width * 0.86;
  const panelHeight = height * 0.86;
  const panelDepth = depth * 0.78;
  const front = depth / 2 - thickness / 2;
  const side = width / 2 - thickness / 2;
  const top = height / 2 - thickness / 2;
  const braceWidth = width * 0.105;
  const braceDepth = thickness * 0.72;
  const braceOffset = width * 0.31;
  const geometries: THREE.BufferGeometry[] = [
    coloredBox([panelWidth, panelHeight, thickness], [0, 0, front], 0xf4ddbc),
    coloredBox([panelWidth, panelHeight, thickness], [0, 0, -front], 0xd9b98e),
    coloredBox([thickness, panelHeight, panelDepth], [-side, 0, 0], 0xcfa979),
    coloredBox([thickness, panelHeight, panelDepth], [side, 0, 0], 0xe3c293),
    coloredBox([panelWidth, thickness, panelDepth], [0, top, 0], 0xf7dfb7),
    coloredBox([panelWidth, thickness, panelDepth], [0, -top, 0], 0xb98e5d),
    coloredBox([braceWidth, panelHeight, braceDepth], [-braceOffset, 0, depth / 2 + braceDepth / 2], 0x806242),
    coloredBox([braceWidth, panelHeight, braceDepth], [braceOffset, 0, depth / 2 + braceDepth / 2], 0x806242),
    coloredBox([panelWidth, braceWidth, braceDepth], [0, top - braceWidth / 2, depth / 2 + braceDepth / 2], 0x8d6c48),
    coloredBox([panelWidth, braceWidth, braceDepth], [0, -top + braceWidth / 2, depth / 2 + braceDepth / 2], 0x765738),
  ];
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) return new THREE.BoxGeometry(width, height, depth);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function coloredBox(
  size: [number, number, number],
  position: [number, number, number],
  colorHex: number,
): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.translate(...position);
  const color = new THREE.Color(colorHex);
  const colors = new Float32Array(geometry.getAttribute("position").count * 3);
  for (let index = 0; index < colors.length; index += 3) {
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function updatePartVisual(runtime: RuntimePart): void {
  const material = runtime.mesh.material as THREE.MeshStandardMaterial;
  if (runtime.state.stage === "damaged") {
    material.color.multiplyScalar(0.78);
    material.roughness = Math.min(1, material.roughness + 0.1);
  } else if (runtime.state.stage === "critical") {
    material.color.multiplyScalar(0.62);
    material.emissive.setHex(0x250b05);
    material.emissiveIntensity = 0.15;
  } else if (runtime.state.stage === "broken") {
    material.color.multiplyScalar(0.45);
  }
}
