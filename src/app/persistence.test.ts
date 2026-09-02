import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parsePersistence } from "./persistence";

describe("versioned persistence", () => {
  it("falls back safely for invalid and future data", () => {
    expect(parsePersistence("bad-json").settings).toEqual(DEFAULT_SETTINGS);
    expect(parsePersistence('{"version":99}').version).toBe(1);
  });

  it("keeps valid settings and rejects invalid ranges", () => {
    const parsed = parsePersistence(JSON.stringify({ version: 1, settings: { masterVolume: 0.4, effectsVolume: 9 }, tutorialDismissed: true }));
    expect(parsed.settings.masterVolume).toBe(0.4);
    expect(parsed.settings.effectsVolume).toBe(DEFAULT_SETTINGS.effectsVolume);
    expect(parsed.tutorialDismissed).toBe(true);
  });
});
