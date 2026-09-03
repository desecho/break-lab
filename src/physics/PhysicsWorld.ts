import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { PHYSICS } from "../app/config";
import type { PartShape } from "../destruction/types";

interface BodyBinding {
  body: RAPIER.RigidBody;
  object: THREE.Object3D;
}

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private readonly bindings = new Map<number, BodyBinding>();
  private accumulator = 0;

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: PHYSICS.gravity, z: 0 });
    const floor = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.11, 2.05));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(5.75, 0.1, 5.1).setFriction(0.75), floor);
    const pedestal = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(0.5, 1.42).setFriction(0.85), pedestal);
    this.addFixedBox([0, 2.5, -2.8], [5.8, 2.5, 0.12]);
    this.addFixedBox([0, 2.5, 7.05], [5.8, 2.5, 0.12]);
    this.addFixedBox([-5.65, 2.5, 2], [0.12, 2.5, 5]);
    this.addFixedBox([5.65, 2.5, 2], [0.12, 2.5, 5]);
  }

  static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();
    return new PhysicsWorld();
  }

  addDynamic(mesh: THREE.Object3D, shape: PartShape, mass: number, startSleeping = false): RAPIER.RigidBody {
    mesh.updateWorldMatrix(true, false);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    mesh.getWorldPosition(position);
    mesh.getWorldQuaternion(quaternion);
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setRotation(quaternion)
        .setLinearDamping(0.18)
        .setAngularDamping(0.24)
        .setCanSleep(true)
        .setSleeping(startSleeping),
    );
    const collider = colliderFor(shape).setMass(Math.max(0.05, mass)).setRestitution(0.12).setFriction(0.7);
    this.world.createCollider(collider, body);
    this.bindings.set(body.handle, { body, object: mesh });
    return body;
  }

  removeBody(body: RAPIER.RigidBody): void {
    this.bindings.delete(body.handle);
    this.world.removeRigidBody(body);
  }

  step(delta: number, timeScale: number): void {
    this.accumulator = Math.min(this.accumulator + delta * timeScale, 0.15);
    while (this.accumulator >= PHYSICS.fixedStep) {
      this.world.timestep = PHYSICS.fixedStep;
      this.world.step();
      this.accumulator -= PHYSICS.fixedStep;
    }
    for (const { body, object } of this.bindings.values()) {
      const position = body.translation();
      const rotation = body.rotation();
      object.position.set(position.x, position.y, position.z);
      object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  get activeBodies(): number {
    return this.bindings.size;
  }

  dispose(): void {
    this.bindings.clear();
    this.world.free();
  }

  private addFixedBox(position: [number, number, number], halfSize: [number, number, number]): void {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...position));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(...halfSize), body);
  }
}

function colliderFor(shape: PartShape): RAPIER.ColliderDesc {
  const [x, y, z] = shape.size;
  if (shape.kind === "sphere") return RAPIER.ColliderDesc.ball(Math.max(x, y, z) / 2);
  if (shape.kind === "cylinder") return RAPIER.ColliderDesc.cylinder(y / 2, Math.max(x, z) / 2);
  if (shape.kind === "torus") return RAPIER.ColliderDesc.cylinder(y / 2, x);
  return RAPIER.ColliderDesc.cuboid(x / 2, y / 2, z / 2);
}
