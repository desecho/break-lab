import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { LIMITS } from "../app/config";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import { createPartGeometry, createPartMaterial } from "./DestructibleObject";
import { radialFalloff } from "./logic";
import type { DestructionTarget } from "./Target";
import type { DamageEvent, DamageResult, DestructiblePartDefinition, ObjectDefinition } from "./types";

interface InstanceRuntime {
  definition: DestructiblePartDefinition;
  index: number;
  health: number;
  detached: boolean;
  recycleAt?: number;
  transform: THREE.Object3D;
  body?: RAPIER.RigidBody;
}

export class InstancedCrateTarget implements DestructionTarget {
  readonly tvPowered = true;
  private readonly mesh: THREE.InstancedMesh;
  private readonly runtimes = new Map<string, InstanceRuntime>();
  private readonly runtimeList: InstanceRuntime[] = [];
  private detachedTotal = 0;
  private readonly maximumHealth: number;
  private totalHealth: number;
  private destroyed = false;

  constructor(
    readonly definition: ObjectDefinition,
    private readonly scene: THREE.Scene,
    private readonly physics: PhysicsWorld,
  ) {
    const first = definition.parts[0];
    if (!first) throw new Error("The 1000-crate target has no crate definitions.");
    this.maximumHealth = definition.parts.reduce((sum, part) => sum + part.maxHealth, 0);
    this.totalHealth = this.maximumHealth;
    this.mesh = new THREE.InstancedMesh(
      createPartGeometry(first.shape),
      createPartMaterial("wood", 0xffffff),
      definition.parts.length,
    );
    this.mesh.name = definition.name;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.userData.instancePartIds = definition.parts.map((part) => part.id);
    this.scene.add(this.mesh);

    for (let index = 0; index < definition.parts.length; index++) {
      const part = definition.parts[index];
      const transform = new THREE.Object3D();
      transform.position.set(part.position[0], part.position[1] + 1.02, part.position[2]);
      if (part.rotation) transform.rotation.set(...part.rotation);
      transform.updateMatrix();
      this.scene.add(transform);
      this.mesh.setMatrixAt(index, transform.matrix);
      this.mesh.setColorAt(index, new THREE.Color(part.color));
      const body = this.physics.addDynamic(transform, part.shape, part.mass);
      const runtime = { definition: part, index, health: part.maxHealth, detached: false, transform, body };
      this.runtimes.set(part.id, runtime);
      this.runtimeList.push(runtime);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  applyDamage(partId: string, event: DamageEvent): DamageResult {
    const hit = this.runtimes.get(partId);
    if (!hit) return { hit: false, damage: 0, detached: [], majorBreak: false, destroyedNow: false };
    let totalDamage = 0;
    const detached: string[] = [];
    for (const runtime of this.runtimeList) {
      if (runtime.health <= 0) continue;
      const falloff = runtime === hit ? 1 : radialFalloff(runtime.transform.position.distanceTo(event.point), event.radius) * 0.3;
      if (falloff <= 0) continue;
      const amount = Math.min(runtime.health, event.amount * falloff);
      runtime.health -= amount;
      this.totalHealth -= amount;
      totalDamage += amount;
      this.updateInstanceColor(runtime);
      if (runtime.health <= 0 && !runtime.detached) {
        runtime.detached = true;
        runtime.recycleAt = performance.now() + LIMITS.debrisLifetime * 1000;
        this.detachedTotal++;
        detached.push(runtime.definition.id);
      }
    }
    hit.body?.applyImpulse(
      {
        x: event.direction.x * event.impulse,
        y: Math.max(0.18, event.direction.y * event.impulse),
        z: event.direction.z * event.impulse,
      },
      true,
    );
    const nowDestroyed = this.isDestroyed();
    const destroyedNow = nowDestroyed && !this.destroyed;
    this.destroyed ||= nowDestroyed;
    return {
      hit: true,
      damage: totalDamage,
      detached,
      majorBreak: detached.length >= 4,
      destroyedNow,
      material: "wood",
    };
  }

  get integrity(): number {
    return this.maximumHealth === 0 ? 0 : Math.max(0, (this.totalHealth / this.maximumHealth) * 100);
  }

  get detachedCount(): number {
    return this.detachedTotal;
  }

  getHitSurface(partId: string): THREE.Object3D | undefined {
    return this.runtimes.get(partId)?.transform;
  }

  isDestroyed(): boolean {
    return this.integrity <= 15;
  }

  update(): void {
    let changed = false;
    for (const runtime of this.runtimeList) {
      if (runtime.recycleAt !== undefined && performance.now() >= runtime.recycleAt) {
        if (runtime.body) {
          this.physics.removeBody(runtime.body);
          runtime.body = undefined;
        }
        runtime.transform.scale.setScalar(0);
        runtime.transform.updateMatrix();
        this.mesh.setMatrixAt(runtime.index, runtime.transform.matrix);
        runtime.transform.removeFromParent();
        runtime.recycleAt = undefined;
        changed = true;
        continue;
      }
      if (!runtime.body || runtime.body.isSleeping()) continue;
      runtime.transform.updateMatrix();
      this.mesh.setMatrixAt(runtime.index, runtime.transform.matrix);
      changed = true;
    }
    if (changed) {
      this.mesh.instanceMatrix.needsUpdate = true;
      // InstancedMesh does not automatically expand its raycast bounds when
      // physics moves instances beyond their original stacked positions.
      this.mesh.computeBoundingSphere();
    }
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    for (const runtime of this.runtimeList) {
      if (runtime.body) this.physics.removeBody(runtime.body);
      runtime.transform.removeFromParent();
    }
    this.runtimeList.length = 0;
    this.runtimes.clear();
  }

  private updateInstanceColor(runtime: InstanceRuntime): void {
    const ratio = runtime.health / runtime.definition.maxHealth;
    const shade = ratio > 0.66 ? 1 : ratio > 0.33 ? 0.72 : ratio > 0 ? 0.5 : 0.34;
    this.mesh.setColorAt(runtime.index, new THREE.Color(runtime.definition.color).multiplyScalar(shade));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
