import { describe, expect, it } from "vitest";
import { seededSpread, WEAPONS } from "./weapons";
import { OBJECTS } from "./objects";

describe("content rules", () => {
  it("keeps seeded shotgun spread reproducible", () => {
    expect(seededSpread(42)).toEqual(seededSpread(42));
    expect(seededSpread(42)).not.toEqual(seededSpread(43));
  });

  it("configures the machine gun for automatic 30-round fire", () => {
    expect(WEAPONS["machine-gun"].automatic).toBe(true);
    expect(WEAPONS["machine-gun"].magazine).toBe(30);
    expect(WEAPONS["machine-gun"].cooldown).toBeLessThan(0.1);
  });

  it("defines exactly 100 independently bonded small crates", () => {
    const stack = OBJECTS["crate-stack"];
    const crates = stack.parts.filter((part) => part.id.startsWith("small-crate-"));
    expect(crates.length).toBe(100);
    expect(stack.parts.filter((part) => part.startsDynamic).length).toBe(100);
    expect(stack.parts.filter((part) => part.shape.kind === "crate").length).toBe(100);
    expect(stack.bonds).toHaveLength(100);
    expect(new Set(stack.bonds.map((bond) => bond.partB)).size).toBe(100);
    expect(Math.min(...crates.map((crate) => crate.position[1])) + 1.02 - 0.31 / 2).toBeCloseTo(1);
    const rows = [...new Set(crates.map((crate) => crate.position[1]))].sort((a, b) => a - b);
    expect(rows).toHaveLength(5);
    rows.slice(1).forEach((height, index) => expect(height - rows[index]).toBeCloseTo(0.31));
  });

  it("defines exactly 1000 detailed crates for the instanced physics target", () => {
    const mega = OBJECTS["crate-mega"];
    expect(mega.parts).toHaveLength(1000);
    expect(mega.parts.every((part) => part.shape.kind === "crate" && part.startsDynamic)).toBe(true);
    expect(Math.min(...mega.parts.map((crate) => crate.position[1])) + 1.02 - 0.17 / 2).toBeCloseTo(1);
    const rows = [...new Set(mega.parts.map((crate) => crate.position[1]))].sort((a, b) => a - b);
    expect(rows).toHaveLength(10);
    rows.slice(1).forEach((height, index) => expect(height - rows[index]).toBeCloseTo(0.17));
  });
});
