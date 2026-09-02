import { describe, expect, it } from "vitest";
import { StructuralGraph } from "./StructuralGraph";
import type { DestructiblePartDefinition } from "./types";

const basePart = (id: string, anchored = false): DestructiblePartDefinition => ({
  id, label: id, material: "metal", maxHealth: 10, mass: 1, integrityWeight: 1,
  anchored, position: [0, 0, 0], shape: { kind: "box", size: [1, 1, 1] }, color: 0,
});

describe("StructuralGraph", () => {
  it("detaches only after the final route to an anchor breaks", () => {
    const graph = new StructuralGraph(
      [basePart("root", true), basePart("a"), basePart("b")],
      [
        { id: "root-a", partA: "root", partB: "a", maxStrength: 10 },
        { id: "a-b", partA: "a", partB: "b", maxStrength: 10 },
      ],
    );
    expect(graph.getDetached()).toEqual([]);
    graph.damageBond("root-a", 10);
    expect(graph.getDetached()).toEqual(["a", "b"]);
  });
});
