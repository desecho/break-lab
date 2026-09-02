import type { ObjectId, WeaponId } from "../destruction/types";

export interface SettingsState {
  masterVolume: number;
  effectsVolume: number;
  uiVolume: number;
  cameraShake: "off" | "low" | "high";
  crosshairScale: number;
  mouseSensitivity: number;
  graphics: "low" | "high";
  reducedFlashes: boolean;
}

export interface ResultsSnapshot {
  elapsed: number;
  shots: number;
  accuracy: number;
  detached: number;
  integrity: number;
}

export interface GameSnapshot {
  objectId: ObjectId;
  objectName: string;
  weaponId: WeaponId;
  weaponName: string;
  ammo: number;
  magazine: number;
  integrity: number;
  detached: number;
  damageValue: number;
  shots: number;
  hits: number;
  reloading: boolean;
  tvPowered: boolean;
  elapsed: number;
  results: ResultsSnapshot | null;
  menuOpen: boolean;
  paused: boolean;
  settings: SettingsState;
  fps: number;
  activeBodies: number;
}

export type StoreListener = (snapshot: Readonly<GameSnapshot>) => void;

export class Store {
  private listeners = new Set<StoreListener>();

  constructor(private state: GameSnapshot) {}

  get(): Readonly<GameSnapshot> {
    return this.state;
  }

  update(patch: Partial<GameSnapshot>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}
