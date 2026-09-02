import { describe, expect, it } from "vitest";
import { damageStage, radialFalloff, weightedIntegrity } from "./logic";
import type { DestructiblePartDefinition, PartState } from "./types";

const definition: DestructiblePartDefinition = {
  id: "panel", label: "Panel", material: "wood", maxHealth: 100, mass: 1,
  integrityWeight: 2, position: [0, 0, 0], shape: { kind: "box", size: [1, 1, 1] }, color: 0,
};

describe("damage logic", () => {
  it("applies linear radial falloff", () => {
    expect(radialFalloff(0, 2)).toBe(1);
    expect(radialFalloff(1, 2)).toBe(0.5);
    expect(radialFalloff(3, 2)).toBe(0);
  });

  it("uses four readable health stages", () => {
    expect(damageStage(100, 100)).toBe("intact");
    expect(damageStage(66, 100)).toBe("damaged");
    expect(damageStage(33, 100)).toBe("critical");
    expect(damageStage(0, 100)).toBe("broken");
  });

  it("weights remaining integrity", () => {
    const cosmetic = { ...definition, id: "trim", integrityWeight: 1 };
    const states = new Map<string, PartState>([
      ["panel", { id: "panel", health: 50, stage: "damaged", detached: false }],
      ["trim", { id: "trim", health: 100, stage: "intact", detached: false }],
    ]);
    expect(weightedIntegrity([definition, cosmetic], states)).toBeCloseTo(66.67, 1);
  });
});
