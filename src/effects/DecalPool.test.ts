import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DecalPool } from "./DecalPool";

describe("DecalPool", () => {
  it("keeps an impact attached to the surface it hit", () => {
    const scene = new THREE.Scene();
    const surface = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    scene.add(surface);
    const pool = new DecalPool(scene);

    pool.place(new THREE.Vector3(0, 0, 0.5), new THREE.Vector3(0, 0, 1), "wood", surface);
    const decal = surface.children[0];
    expect(decal).toBeDefined();

    surface.position.x = 2;
    scene.updateMatrixWorld(true);
    expect(decal.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(2);

    pool.clear();
    expect(decal.parent).toBe(scene);
    expect(decal.visible).toBe(false);
    pool.dispose();
  });
});
