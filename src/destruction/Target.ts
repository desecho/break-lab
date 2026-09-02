import type * as THREE from "three";
import type { DamageEvent, DamageResult, ObjectDefinition } from "./types";

export interface DestructionTarget {
  readonly definition: ObjectDefinition;
  readonly integrity: number;
  readonly detachedCount: number;
  readonly tvPowered: boolean;
  applyDamage(partId: string, event: DamageEvent): DamageResult;
  getHitSurface(partId: string): THREE.Object3D | undefined;
  isDestroyed(): boolean;
  update(): void;
  dispose(): void;
}
