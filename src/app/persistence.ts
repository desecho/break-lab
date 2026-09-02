import type { SettingsState } from "./store";

const STORAGE_KEY = "break-lab:v1";
export const PERSISTENCE_VERSION = 1;

export interface PersistedState {
  version: 1;
  settings: SettingsState;
  tutorialDismissed: boolean;
}

export const DEFAULT_SETTINGS: SettingsState = {
  masterVolume: 0.75,
  effectsVolume: 0.8,
  uiVolume: 0.65,
  cameraShake: "low",
  crosshairScale: 1,
  mouseSensitivity: 1,
  graphics: "high",
  reducedFlashes: false,
};

export function parsePersistence(raw: string | null): PersistedState {
  if (!raw) return defaults();
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== PERSISTENCE_VERSION) return defaults();
    const settings = isRecord(value.settings) ? value.settings : {};
    return {
      version: 1,
      settings: {
        masterVolume: numberInRange(settings.masterVolume, 0, 1, DEFAULT_SETTINGS.masterVolume),
        effectsVolume: numberInRange(settings.effectsVolume, 0, 1, DEFAULT_SETTINGS.effectsVolume),
        uiVolume: numberInRange(settings.uiVolume, 0, 1, DEFAULT_SETTINGS.uiVolume),
        cameraShake: settings.cameraShake === "off" || settings.cameraShake === "high" ? settings.cameraShake : "low",
        crosshairScale: numberInRange(settings.crosshairScale, 0.6, 2, DEFAULT_SETTINGS.crosshairScale),
        mouseSensitivity: numberInRange(settings.mouseSensitivity, 0.3, 2, DEFAULT_SETTINGS.mouseSensitivity),
        graphics: settings.graphics === "low" ? "low" : "high",
        reducedFlashes: settings.reducedFlashes === true,
      },
      tutorialDismissed: value.tutorialDismissed === true,
    };
  } catch {
    return defaults();
  }
}

export function loadPersistence(): PersistedState {
  const state = parsePersistence(localStorage.getItem(STORAGE_KEY));
  savePersistence(state);
  return state;
}

export function savePersistence(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaults(): PersistedState {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, tutorialDismissed: false };
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}
