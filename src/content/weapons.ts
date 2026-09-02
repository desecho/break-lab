import type { WeaponId } from "../destruction/types";

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  magazine: number;
  damage: number;
  radius: number;
  impulse: number;
  pellets: number;
  reloadSeconds: number;
  cooldown: number;
  spread: number;
  automatic: boolean;
}

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  pistol: {
    id: "pistol",
    name: "Pistol",
    magazine: 12,
    damage: 42,
    radius: 0.42,
    impulse: 1.7,
    pellets: 1,
    reloadSeconds: 0.8,
    cooldown: 0.2,
    spread: 0,
    automatic: false,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    magazine: 6,
    damage: 17,
    radius: 0.3,
    impulse: 2.6,
    pellets: 8,
    reloadSeconds: 1.15,
    cooldown: 0.7,
    spread: 0.055,
    automatic: false,
  },
  "machine-gun": {
    id: "machine-gun",
    name: "Machine Gun",
    magazine: 30,
    damage: 12,
    radius: 0.18,
    impulse: 0.8,
    pellets: 1,
    reloadSeconds: 1.25,
    cooldown: 0.085,
    spread: 0.012,
    automatic: true,
  },
};

export function seededSpread(seed: number, pellets = 8, rotation = 0): [number, number][] {
  let state = seed >>> 0;
  const random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: pellets }, (_, index) => {
    const radius = Math.sqrt((index + 0.45) / pellets);
    const angle = index * goldenAngle + rotation + (random() - 0.5) * 0.12;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
}
