import type {
  BondDefinition,
  DestructiblePartDefinition,
  MaterialKind,
  ObjectDefinition,
  ObjectId,
  PartShape,
} from "../destruction/types";

const part = (
  id: string,
  label: string,
  material: MaterialKind,
  position: [number, number, number],
  shape: PartShape,
  color: number,
  options: Partial<DestructiblePartDefinition> = {},
): DestructiblePartDefinition => ({
  id,
  label,
  material,
  position,
  shape,
  color,
  maxHealth: 70,
  mass: 1,
  integrityWeight: 1,
  debrisClass: "major",
  ...options,
});

const bond = (
  id: string,
  partA: string,
  partB: string,
  maxStrength = 42,
  damageMultiplier = 1,
): BondDefinition => ({ id, partA, partB, maxStrength, damageMultiplier });

const crate: ObjectDefinition = {
  id: "crate",
  name: "Wooden Crate",
  value: 85,
  criticalFailure: "none",
  parts: [
    part("base", "Base panel", "wood", [0, 0.12, 0], { kind: "box", size: [1.7, 0.18, 1.45] }, 0x8a542b, { anchored: true, maxHealth: 70, integrityWeight: 2 }),
    part("front", "Front panel", "wood", [0, 0.92, 0.68], { kind: "box", size: [1.7, 1.45, 0.16] }, 0xa66a35, { maxHealth: 55, integrityWeight: 1.5 }),
    part("back", "Back panel", "wood", [0, 0.92, -0.68], { kind: "box", size: [1.7, 1.45, 0.16] }, 0x9a6030, { maxHealth: 55, integrityWeight: 1.5 }),
    part("left", "Left panel", "wood", [-0.78, 0.92, 0], { kind: "box", size: [0.16, 1.45, 1.25] }, 0x9b6030, { maxHealth: 55 }),
    part("right", "Right panel", "wood", [0.78, 0.92, 0], { kind: "box", size: [0.16, 1.45, 1.25] }, 0x9b6030, { maxHealth: 55 }),
    part("top", "Top panel", "wood", [0, 1.68, 0], { kind: "box", size: [1.7, 0.18, 1.45] }, 0xb0733d, { maxHealth: 55 }),
    part("brace-left", "Left brace", "wood", [-0.58, 0.92, 0.79], { kind: "box", size: [0.18, 1.5, 0.1] }, 0x5f391e, { maxHealth: 30, mass: 0.4, integrityWeight: 0.5 }),
    part("brace-right", "Right brace", "wood", [0.58, 0.92, 0.79], { kind: "box", size: [0.18, 1.5, 0.1] }, 0x5f391e, { maxHealth: 30, mass: 0.4, integrityWeight: 0.5 }),
  ],
  bonds: [
    bond("base-front", "base", "front"), bond("base-back", "base", "back"),
    bond("base-left", "base", "left"), bond("base-right", "base", "right"),
    bond("front-left", "front", "left", 32), bond("front-right", "front", "right", 32),
    bond("back-left", "back", "left", 32), bond("back-right", "back", "right", 32),
    bond("top-front", "top", "front", 38), bond("top-back", "top", "back", 38),
    bond("brace-left", "front", "brace-left", 25), bond("brace-right", "front", "brace-right", 25),
  ],
};

const vaseParts: DestructiblePartDefinition[] = [
  part("foot", "Vase foot", "ceramic", [0, 0.13, 0], { kind: "cylinder", size: [0.43, 0.22, 0.43] }, 0xd9cfb8, { anchored: true, maxHealth: 70, integrityWeight: 1.3 }),
  part("lower", "Lower bowl", "ceramic", [0, 0.47, 0], { kind: "sphere", size: [0.66, 0.55, 0.66] }, 0xe4dbc7, { maxHealth: 55, integrityWeight: 1.6 }),
  ...Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2;
    return part(
      `shard-${index + 1}`,
      `Vase section ${index + 1}`,
      "ceramic",
      [Math.cos(angle) * 0.31, 0.93, Math.sin(angle) * 0.31],
      { kind: "box", size: [0.46, 0.72, 0.13] },
      index % 2 ? 0xcabfa7 : 0xeee5d2,
      { rotation: [0, -angle, 0], maxHealth: 42, mass: 0.45, integrityWeight: 1 },
    );
  }),
  part("rim", "Vase rim", "ceramic", [0, 1.38, 0], { kind: "torus", size: [0.38, 0.08, 0.08] }, 0xf1e7d1, { maxHealth: 35, mass: 0.3, integrityWeight: 0.7 }),
];

const vase: ObjectDefinition = {
  id: "vase",
  name: "Ceramic Vase",
  value: 140,
  criticalFailure: "vase-core",
  parts: vaseParts,
  bonds: [
    bond("foot-lower", "foot", "lower", 32, 1.3),
    ...Array.from({ length: 6 }, (_, index) => bond(`lower-shard-${index}`, "lower", `shard-${index + 1}`, 27, 1.55)),
    ...Array.from({ length: 6 }, (_, index) => bond(`shard-ring-${index}`, `shard-${index + 1}`, `shard-${((index + 1) % 6) + 1}`, 22, 1.5)),
    ...Array.from({ length: 3 }, (_, index) => bond(`rim-${index}`, `shard-${index * 2 + 1}`, "rim", 20, 1.4)),
  ],
};

const television: ObjectDefinition = {
  id: "television",
  name: "CRT Television",
  value: 220,
  criticalFailure: "none",
  parts: [
    part("base", "TV base", "plastic", [0, 0.14, 0], { kind: "box", size: [1.45, 0.22, 0.88] }, 0x272b2d, { anchored: true, maxHealth: 100, integrityWeight: 1.2 }),
    part("shell", "Outer shell", "plastic", [0, 0.82, 0], { kind: "box", size: [1.8, 1.22, 1.0] }, 0x303638, { maxHealth: 120, integrityWeight: 2 }),
    part("screen", "Glass screen", "glass", [0, 0.87, 0.53], { kind: "box", size: [1.35, 0.82, 0.08] }, 0x5ca3a3, { maxHealth: 65, mass: 0.8, integrityWeight: 2.4, functionalTag: "screen" }),
    part("rear", "Rear cover", "plastic", [0, 0.84, -0.56], { kind: "box", size: [1.35, 0.94, 0.16] }, 0x272c2e, { maxHealth: 58, integrityWeight: 0.8 }),
    part("power", "Power supply", "metal", [-0.42, 0.58, -0.26], { kind: "box", size: [0.48, 0.3, 0.45] }, 0x9b7c3c, { maxHealth: 38, mass: 0.8, integrityWeight: 2, functionalTag: "power" }),
    part("tube", "Picture tube", "glass", [0.18, 0.82, -0.1], { kind: "box", size: [0.75, 0.65, 0.58] }, 0x49676a, { maxHealth: 62, integrityWeight: 1.8 }),
    part("buttons", "Control buttons", "plastic", [0.68, 0.36, 0.58], { kind: "box", size: [0.25, 0.16, 0.08] }, 0x16191a, { maxHealth: 25, mass: 0.15, integrityWeight: 0.3 }),
  ],
  bonds: [
    bond("base-shell", "base", "shell", 80), bond("shell-screen", "shell", "screen", 50),
    bond("shell-rear", "shell", "rear", 45), bond("shell-power", "shell", "power", 30),
    bond("shell-tube", "shell", "tube", 55), bond("screen-tube", "screen", "tube", 40),
    bond("screen-buttons", "screen", "buttons", 18),
  ],
};

const chair: ObjectDefinition = {
  id: "chair",
  name: "Office Chair",
  value: 175,
  criticalFailure: "all-supports",
  parts: [
    part("column", "Central column", "metal", [0, 0.68, 0], { kind: "cylinder", size: [0.12, 1.15, 0.12] }, 0x858d90, { anchored: true, maxHealth: 100, integrityWeight: 2 }),
    part("seat", "Seat", "plastic", [0, 1.23, 0], { kind: "box", size: [1.25, 0.22, 1.15] }, 0x33444b, { maxHealth: 95, integrityWeight: 2 }),
    part("back", "Chair back", "plastic", [0, 1.92, -0.46], { kind: "box", size: [1.18, 1.1, 0.18] }, 0x40545b, { maxHealth: 75, integrityWeight: 1.8 }),
    ...Array.from({ length: 5 }, (_, index) => {
      const angle = (index / 5) * Math.PI * 2;
      return part(`leg-${index + 1}`, `Leg ${index + 1}`, "metal", [Math.sin(angle) * 0.55, 0.19, Math.cos(angle) * 0.55], { kind: "box", size: [0.16, 0.12, 1.12] }, 0x646d70, { rotation: [0, angle, 0], maxHealth: 42, mass: 0.55, integrityWeight: 1, functionalTag: "support" });
    }),
    ...Array.from({ length: 5 }, (_, index) => {
      const angle = (index / 5) * Math.PI * 2;
      return part(`wheel-${index + 1}`, `Wheel ${index + 1}`, "plastic", [Math.sin(angle) * 0.93, 0.08, Math.cos(angle) * 0.93], { kind: "cylinder", size: [0.11, 0.1, 0.11] }, 0x15191b, { rotation: [Math.PI / 2, 0, angle], maxHealth: 22, mass: 0.2, integrityWeight: 0.25, debrisClass: "minor" });
    }),
  ],
  bonds: [
    bond("column-seat", "column", "seat", 75), bond("seat-back", "seat", "back", 45),
    ...Array.from({ length: 5 }, (_, index) => bond(`column-leg-${index}`, "column", `leg-${index + 1}`, 32)),
    ...Array.from({ length: 5 }, (_, index) => bond(`leg-wheel-${index}`, `leg-${index + 1}`, `wheel-${index + 1}`, 18)),
  ],
};

const smallCrates = Array.from({ length: 100 }, (_, index) => {
  const column = index % 5;
  const row = Math.floor(index / 5) % 5;
  const depth = Math.floor(index / 25);
  const woodColors = [0x9f6637, 0xaa7040, 0x8f572e, 0xb07843];
  return part(
    `small-crate-${index + 1}`,
    `Small crate ${index + 1}`,
    "wood",
    [(column - 2) * 0.36, 0.135 + row * 0.31, (depth - 1.5) * 0.36],
    { kind: "crate", size: [0.31, 0.31, 0.31] },
    woodColors[(column + row + depth) % woodColors.length],
    { maxHealth: 12, mass: 0.18, integrityWeight: 1, debrisClass: "minor", startsDynamic: true },
  );
});

const crateStack: ObjectDefinition = {
  id: "crate-stack",
  name: "100 Small Crates",
  value: 500,
  criticalFailure: "none",
  parts: [
    part("stack-anchor", "Stack anchor", "wood", [0, 0, 0], { kind: "box", size: [0.05, 0.05, 0.05] }, 0x000000, {
      anchored: true,
      visible: false,
      maxHealth: 1,
      mass: 0,
      integrityWeight: 0,
      debrisClass: "minor",
    }),
    ...smallCrates,
  ],
  bonds: smallCrates.map((cratePart, index) => bond(`stack-crate-${index + 1}`, "stack-anchor", cratePart.id, 24)),
};

const megaCrates = Array.from({ length: 1000 }, (_, index) => {
  const column = index % 10;
  const row = Math.floor(index / 10) % 10;
  const depth = Math.floor(index / 100);
  const woodColors = [0x9f6637, 0xaa7040, 0x8f572e, 0xb07843];
  return part(
    `mega-crate-${index + 1}`,
    `Crate ${index + 1} of 1000`,
    "wood",
    [(column - 4.5) * 0.185, 0.065 + row * 0.17, (depth - 4.5) * 0.185],
    { kind: "crate", size: [0.17, 0.17, 0.17] },
    woodColors[(column + row + depth) % woodColors.length],
    { maxHealth: 12, mass: 0.07, integrityWeight: 1, debrisClass: "minor", startsDynamic: true },
  );
});

const crateMega: ObjectDefinition = {
  id: "crate-mega",
  name: "1000 Crates",
  value: 2500,
  criticalFailure: "none",
  parts: megaCrates,
  bonds: [],
};

export const OBJECTS: Record<ObjectId, ObjectDefinition> = {
  crate,
  vase,
  television,
  chair,
  "crate-stack": crateStack,
  "crate-mega": crateMega,
};
