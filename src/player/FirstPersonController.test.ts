import { describe, expect, it } from "vitest";
import { PLAYER } from "../app/config";
import { constrainPlayerPosition } from "./FirstPersonController";

describe("player movement constraints", () => {
  it("allows positions on every side of the pedestal", () => {
    expect(constrainPlayerPosition(0, -2)).toEqual([0, -2]);
    expect(constrainPlayerPosition(-2, 0)).toEqual([-2, 0]);
    expect(constrainPlayerPosition(2, 0)).toEqual([2, 0]);
  });

  it("keeps the camera outside the physical pedestal", () => {
    const [x, z] = constrainPlayerPosition(0.5, 0.5);
    expect(Math.hypot(x, z)).toBeCloseTo(PLAYER.pedestalRadius);
  });

  it("keeps the camera inside the room walls", () => {
    expect(constrainPlayerPosition(20, 20)).toEqual([PLAYER.boundsX, PLAYER.maxZ]);
    expect(constrainPlayerPosition(-20, -20)).toEqual([-PLAYER.boundsX, PLAYER.minZ]);
  });
});
