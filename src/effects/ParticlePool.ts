import * as THREE from "three";
import { LIMITS } from "../app/config";
import type { MaterialKind } from "../destruction/types";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

const COLORS: Record<MaterialKind, number> = {
  wood: 0xc79555,
  ceramic: 0xe8dfcc,
  glass: 0xa6e1df,
  plastic: 0x66777b,
  metal: 0xb8c1c4,
};

export class ParticlePool {
  private readonly particles: Particle[] = [];
  private cursor = 0;

  constructor(private readonly scene: THREE.Scene) {
    const geometry = new THREE.TetrahedronGeometry(0.025);
    for (let i = 0; i < LIMITS.minorDebris; i++) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({ mesh, velocity: new THREE.Vector3(), life: 0 });
    }
  }

  burst(point: THREE.Vector3, normal: THREE.Vector3, material: MaterialKind, major = false, quality: "low" | "high" = "high"): void {
    const count = (major ? 24 : 9) * (quality === "low" ? 0.5 : 1);
    for (let i = 0; i < count; i++) {
      const particle = this.particles[this.cursor++ % this.particles.length];
      particle.mesh.position.copy(point);
      particle.mesh.visible = true;
      (particle.mesh.material as THREE.MeshBasicMaterial).color.setHex(COLORS[material]);
      particle.velocity.copy(normal).multiplyScalar(0.5 + Math.random() * 1.6);
      particle.velocity.x += (Math.random() - 0.5) * 1.5;
      particle.velocity.y += Math.random() * 1.2;
      particle.velocity.z += (Math.random() - 0.5) * 1.5;
      particle.life = 0.45 + Math.random() * 0.55;
    }
  }

  update(delta: number, timeScale: number): void {
    const step = delta * timeScale;
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      particle.life -= step;
      particle.velocity.y -= 5.5 * step;
      particle.mesh.position.addScaledVector(particle.velocity, step);
      particle.mesh.scale.setScalar(Math.max(0, particle.life * 1.4));
      if (particle.life <= 0) particle.mesh.visible = false;
    }
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      geometries.add(particle.mesh.geometry);
      (particle.mesh.material as THREE.Material).dispose();
    }
    for (const geometry of geometries) geometry.dispose();
  }
}
