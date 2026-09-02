import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { LIMITS } from "../app/config";
import { OBJECTS } from "../content/objects";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import { DestructibleObject } from "./DestructibleObject";
import type { DamageEvent } from "./types";

class FakePhysics {
  activeBodies = 0;
  addDynamic() {
    this.activeBodies++;
    return { handle: this.activeBodies, applyImpulse: () => undefined };
  }
  removeBody() { this.activeBodies--; }
}

const damageEvent = (point: THREE.Vector3, amount = 42): DamageEvent => ({
  point, normal: new THREE.Vector3(0, 0, 1), direction: new THREE.Vector3(0, 0, -1),
  amount, radius: 0.42, impulse: 1, weaponId: "pistol",
});

function setup(id: "crate" | "television" | "crate-stack") {
  const scene = new THREE.Scene();
  const physics = new FakePhysics();
  const object = new DestructibleObject(OBJECTS[id], scene, physics as unknown as PhysicsWorld);
  object.group.updateMatrixWorld(true);
  return { scene, physics, object };
}

describe("DestructibleObject integration", () => {
  it("resolves local hits to a part and detaches it after its anchored routes break", () => {
    const { object, physics } = setup("crate");
    const front = object.parts.get("front")!;
    const hitPoint = front.mesh.getWorldPosition(new THREE.Vector3());
    object.applyDamage("front", damageEvent(hitPoint));
    expect(front.state.health).toBe(13);
    expect(front.state.detached).toBe(false);
    object.applyDamage("front", damageEvent(hitPoint));
    expect(front.state.detached).toBe(true);
    expect(physics.activeBodies).toBeGreaterThan(0);
  });

  it("cleans up detached bodies and restores pristine state through reconstruction", () => {
    const { object, physics, scene } = setup("crate");
    const point = object.parts.get("front")!.mesh.getWorldPosition(new THREE.Vector3());
    object.applyDamage("front", damageEvent(point, 100));
    expect(physics.activeBodies).toBeGreaterThan(0);
    object.dispose();
    expect(physics.activeBodies).toBe(0);
    const reset = new DestructibleObject(OBJECTS.crate, scene, physics as unknown as PhysicsWorld);
    expect(reset.integrity).toBe(100);
    expect(reset.detachedCount).toBe(0);
  });

  it("turns off the television when its power component fails", () => {
    const { object } = setup("television");
    const power = object.parts.get("power")!;
    const point = power.mesh.getWorldPosition(new THREE.Vector3());
    object.applyDamage("power", damageEvent(point, 100));
    expect(object.tvPowered).toBe(false);
    expect(object.integrity).toBeGreaterThan(50);
  });

  it("initializes all 100 small crates as physical bodies", () => {
    const { object, physics } = setup("crate-stack");
    expect(physics.activeBodies).toBe(100);
    object.dispose();
    expect(physics.activeBodies).toBe(0);
  });

  it("recycles a fully destroyed small crate after the debris lifetime", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    const { object, physics } = setup("crate-stack");
    const crate = object.parts.get("small-crate-1")!;
    const point = crate.mesh.getWorldPosition(new THREE.Vector3());
    const event = damageEvent(point, 100);
    event.radius = 0;
    object.applyDamage("small-crate-1", event);
    expect(crate.mesh.visible).toBe(true);
    expect(physics.activeBodies).toBe(100);

    now.mockReturnValue(1001 + LIMITS.debrisLifetime * 1000);
    object.update();
    expect(crate.mesh.visible).toBe(false);
    expect(physics.activeBodies).toBe(99);
    now.mockRestore();
    object.dispose();
  });
});
