export const GAME_TITLE = "Break Lab";

export const LIMITS = {
  majorPieces: 80,
  minorDebris: 150,
  decals: 200,
  debrisLifetime: 14,
} as const;

export const PHYSICS = {
  gravity: -9.81,
  fixedStep: 1 / 60,
  slowMotion: 0.25,
} as const;

export const PLAYER = {
  height: 1.65,
  speed: 3.3,
  sensitivity: 0.0018,
  boundsX: 5.3,
  minZ: -2.5,
  maxZ: 6.65,
  pedestalRadius: 1.72,
} as const;

export const DEBUG = import.meta.env.DEV;
