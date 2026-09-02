import type * as THREE from "three";

export type MaterialKind = "wood" | "ceramic" | "glass" | "plastic" | "metal";
export type DamageStage = "intact" | "damaged" | "critical" | "broken";

export interface PartShape {
  kind: "box" | "cylinder" | "sphere" | "torus" | "crate";
  size: [number, number, number];
}

export interface DestructiblePartDefinition {
  id: string;
  label: string;
  material: MaterialKind;
  maxHealth: number;
  mass: number;
  integrityWeight: number;
  anchored?: boolean;
  functionalTag?: string;
  debrisClass?: "major" | "minor";
  position: [number, number, number];
  rotation?: [number, number, number];
  shape: PartShape;
  color: number;
  visible?: boolean;
  startsDynamic?: boolean;
}

export interface BondDefinition {
  id: string;
  partA: string;
  partB: string;
  maxStrength: number;
  damageMultiplier?: number;
}

export interface ObjectDefinition {
  id: ObjectId;
  name: string;
  value: number;
  parts: DestructiblePartDefinition[];
  bonds: BondDefinition[];
  criticalFailure?: "all-supports" | "vase-core" | "none";
}

export type ObjectId = "crate" | "vase" | "television" | "chair" | "crate-stack" | "crate-mega";
export type WeaponId = "pistol" | "shotgun" | "machine-gun";

export interface DamageEvent {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  direction: THREE.Vector3;
  amount: number;
  radius: number;
  impulse: number;
  weaponId: WeaponId;
}

export interface PartState {
  id: string;
  health: number;
  stage: DamageStage;
  detached: boolean;
}

export interface DamageResult {
  hit: boolean;
  damage: number;
  detached: string[];
  majorBreak: boolean;
  destroyedNow: boolean;
  material?: MaterialKind;
}
