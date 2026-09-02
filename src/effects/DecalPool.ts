import * as THREE from "three";
import { LIMITS } from "../app/config";
import type { MaterialKind } from "../destruction/types";

export class DecalPool {
  private readonly decals: THREE.Mesh[] = [];
  private cursor = 0;

  constructor(private readonly scene: THREE.Scene) {
    const geometry = new THREE.CircleGeometry(0.055, 9);
    for (let i = 0; i < LIMITS.decals; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0x15110e, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
      const decal = new THREE.Mesh(geometry, material);
      decal.visible = false;
      decal.renderOrder = 4;
      scene.add(decal);
      this.decals.push(decal);
    }
  }

  place(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    material: MaterialKind | "room",
    surface: THREE.Object3D = this.scene,
  ): void {
    const decal = this.decals[this.cursor++ % this.decals.length];
    surface.updateWorldMatrix(true, false);
    decal.removeFromParent();
    surface.add(decal);
    decal.visible = true;
    const localPoint = surface.worldToLocal(point.clone());
    const inverseSurfaceRotation = surface.getWorldQuaternion(new THREE.Quaternion()).invert();
    const localNormal = normal.clone().applyQuaternion(inverseSurfaceRotation).normalize();
    decal.position.copy(localPoint).addScaledVector(localNormal, 0.006);
    decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal);
    decal.rotateZ(Math.random() * Math.PI * 2);
    const scale = material === "ceramic" || material === "glass" ? 1.7 : 1;
    decal.scale.setScalar(scale * (0.75 + Math.random() * 0.45));
    (decal.material as THREE.MeshBasicMaterial).color.setHex(material === "glass" ? 0xd7f0ef : material === "ceramic" ? 0x7f7567 : 0x171411);
  }

  clear(): void {
    for (const decal of this.decals) {
      decal.visible = false;
      decal.removeFromParent();
      this.scene.add(decal);
    }
    this.cursor = 0;
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    for (const decal of this.decals) {
      decal.removeFromParent();
      geometries.add(decal.geometry);
      (decal.material as THREE.Material).dispose();
    }
    for (const geometry of geometries) geometry.dispose();
  }
}
