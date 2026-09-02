import type { MaterialKind, WeaponId } from "../destruction/types";
import type { SettingsState } from "../app/store";

export class AudioManager {
  private context?: AudioContext;
  private lastDebris = 0;

  constructor(private getSettings: () => SettingsState) {}

  resume(): void {
    const AudioContextClass = window.AudioContext;
    this.context ??= new AudioContextClass();
    void this.context.resume();
  }

  weapon(id: WeaponId): void {
    const frequency = id === "pistol" ? 95 : id === "shotgun" ? 58 : 78;
    const duration = id === "pistol" ? 0.09 : id === "shotgun" ? 0.16 : 0.055;
    this.tone(frequency, duration, id === "pistol" ? "square" : "sawtooth", id === "machine-gun" ? 0.17 : 0.25);
    if (id === "shotgun") this.noise(0.13, 0.3);
    if (id === "machine-gun") this.noise(0.035, 0.12);
  }

  reload(id: WeaponId): void {
    this.tone(id === "pistol" ? 640 : id === "shotgun" ? 390 : 510, 0.045, "square", 0.1);
    window.setTimeout(() => this.tone(820, 0.035, "square", 0.08), id === "pistol" ? 280 : id === "shotgun" ? 420 : 330);
  }

  impact(material: MaterialKind): void {
    const frequency = { wood: 170, ceramic: 960, glass: 1250, plastic: 250, metal: 720 }[material];
    const wave: OscillatorType = material === "metal" ? "sine" : material === "wood" ? "triangle" : "square";
    this.tone(frequency * (0.92 + Math.random() * 0.16), 0.045, wave, 0.08);
  }

  majorBreak(): void {
    this.noise(0.23, 0.24);
    this.tone(72, 0.24, "sawtooth", 0.16);
  }

  debris(): void {
    const now = performance.now();
    if (now - this.lastDebris < 90) return;
    this.lastDebris = now;
    this.tone(110 + Math.random() * 220, 0.03, "triangle", 0.025);
  }

  ui(): void {
    this.tone(560, 0.025, "sine", 0.06, true);
  }

  private tone(frequency: number, duration: number, type: OscillatorType, level: number, ui = false): void {
    const context = this.context;
    if (!context) return;
    const settings = this.getSettings();
    const gainValue = level * settings.masterVolume * (ui ? settings.uiVolume : settings.effectsVolume);
    if (gainValue <= 0) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  private noise(duration: number, level: number): void {
    const context = this.context;
    if (!context) return;
    const settings = this.getSettings();
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = level * settings.masterVolume * settings.effectsVolume;
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    source.start();
  }
}
