import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { LIMITS } from "../app/config";
import { OBJECTS } from "../content/objects";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import { InstancedCrateTarget } from "./InstancedCrateTarget";

class FakePhysics {
  activeBodies = 0;
  sleepingStates: boolean[] = [];
  addDynamic(_mesh: THREE.Object3D, _shape: unknown, _mass: number, startSleeping = false) {
    this.activeBodies++;
    this.sleepingStates.push(startSleeping);
    return { isSleeping: () => false, applyImpulse: () => undefined };
  }
  removeBody() { this.activeBodies--; }
}

describe("InstancedCrateTarget", () => {
  it("expands raycast bounds when physics moves a crate away from the stack", () => {
    const definition = { ...OBJECTS["crate-mega"], parts: OBJECTS["crate-mega"].parts.slice(0, 2) };
    const scene = new THREE.Scene();
    const physics = new FakePhysics();
    const target = new InstancedCrateTarget(definition, scene, physics as unknown as PhysicsWorld);
    expect(physics.sleepingStates).toEqual([true, true]);
    const internals = target as unknown as {
      mesh: THREE.InstancedMesh;
      runtimeList: Array<{ transform: THREE.Object3D }>;
    };

    internals.runtimeList[0].transform.position.x = 12;
    target.update();

    const movedPosition = internals.runtimeList[0].transform.position;
    expect(internals.mesh.boundingSphere?.containsPoint(movedPosition)).toBe(true);
    target.dispose();
    expect(physics.activeBodies).toBe(0);
  });

  it("removes a destroyed instance and its body after the debris lifetime", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    const definition = { ...OBJECTS["crate-mega"], parts: OBJECTS["crate-mega"].parts.slice(0, 2) };
    const physics = new FakePhysics();
    const target = new InstancedCrateTarget(definition, new THREE.Scene(), physics as unknown as PhysicsWorld);
    const part = definition.parts[0];
    const point = new THREE.Vector3(part.position[0], part.position[1] + 1.02, part.position[2]);
    target.applyDamage(part.id, {
      point,
      normal: new THREE.Vector3(0, 0, 1),
      direction: new THREE.Vector3(0, 0, -1),
      amount: 100,
      radius: 0.01,
      impulse: 1,
      weaponId: "pistol",
    });
    expect(physics.activeBodies).toBe(2);

    now.mockReturnValue(1001 + LIMITS.debrisLifetime * 1000);
    target.update();
    expect(physics.activeBodies).toBe(1);
    now.mockRestore();
    target.dispose();
  });
});
