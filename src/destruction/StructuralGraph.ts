import type { BondDefinition, DestructiblePartDefinition } from "./types";

export class StructuralGraph {
  private readonly strengths = new Map<string, number>();

  constructor(
    private readonly parts: DestructiblePartDefinition[],
    private readonly bonds: BondDefinition[],
  ) {
    for (const bond of bonds) this.strengths.set(bond.id, bond.maxStrength);
  }

  damageBond(id: string, amount: number): boolean {
    const strength = this.strengths.get(id);
    if (strength === undefined || strength <= 0) return false;
    const next = Math.max(0, strength - amount);
    this.strengths.set(id, next);
    return next === 0;
  }

  damageAdjacent(partId: string, amount: number): string[] {
    const broken: string[] = [];
    for (const bond of this.bonds) {
      if (bond.partA !== partId && bond.partB !== partId) continue;
      if (this.damageBond(bond.id, amount * (bond.damageMultiplier ?? 1))) broken.push(bond.id);
    }
    return broken;
  }

  connectedToAnchor(): Set<string> {
    const connected = new Set(this.parts.filter((part) => part.anchored).map((part) => part.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const bond of this.bonds) {
        if ((this.strengths.get(bond.id) ?? 0) <= 0) continue;
        if (connected.has(bond.partA) && !connected.has(bond.partB)) {
          connected.add(bond.partB);
          changed = true;
        } else if (connected.has(bond.partB) && !connected.has(bond.partA)) {
          connected.add(bond.partA);
          changed = true;
        }
      }
    }
    return connected;
  }

  getDetached(currentlyDetached: ReadonlySet<string> = new Set()): string[] {
    const connected = this.connectedToAnchor();
    return this.parts
      .filter((part) => !part.anchored && !connected.has(part.id) && !currentlyDetached.has(part.id))
      .map((part) => part.id);
  }

  reset(): void {
    for (const bond of this.bonds) this.strengths.set(bond.id, bond.maxStrength);
  }
}
