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
    expect(stack.parts.filter((part) => part.id.startsWith("small-crate-")).length).toBe(100);
    expect(stack.parts.filter((part) => part.startsDynamic).length).toBe(100);
    expect(stack.parts.filter((part) => part.shape.kind === "crate").length).toBe(100);
    expect(stack.bonds).toHaveLength(100);
    expect(new Set(stack.bonds.map((bond) => bond.partB)).size).toBe(100);
  });

  it("defines exactly 1000 detailed crates for the instanced physics target", () => {
    const mega = OBJECTS["crate-mega"];
    expect(mega.parts).toHaveLength(1000);
    expect(mega.parts.every((part) => part.shape.kind === "crate" && part.startsDynamic)).toBe(true);
  });
});
