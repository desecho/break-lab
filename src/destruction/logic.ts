import type { DamageStage, DestructiblePartDefinition, PartState } from "./types";

export function radialFalloff(distance: number, radius: number): number {
  if (radius <= 0) return distance <= 0 ? 1 : 0;
  return Math.max(0, 1 - distance / radius);
}

export function damageStage(health: number, maxHealth: number): DamageStage {
  const ratio = maxHealth <= 0 ? 0 : health / maxHealth;
  if (ratio <= 0) return "broken";
  if (ratio <= 0.33) return "critical";
  if (ratio <= 0.66) return "damaged";
  return "intact";
}

export function weightedIntegrity(
  definitions: DestructiblePartDefinition[],
  states: ReadonlyMap<string, PartState>,
): number {
  let remaining = 0;
  let total = 0;
  for (const part of definitions) {
    total += part.integrityWeight;
    const health = states.get(part.id)?.health ?? part.maxHealth;
    remaining += part.integrityWeight * Math.max(0, health / part.maxHealth);
  }
  return total === 0 ? 0 : (remaining / total) * 100;
}
