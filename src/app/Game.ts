import * as THREE from "three";
import { DEBUG, PHYSICS } from "./config";
import { loadPersistence, savePersistence, type PersistedState } from "./persistence";
import { Store, type GameSnapshot, type SettingsState } from "./store";
import { OBJECTS } from "../content/objects";
import { seededSpread, WEAPONS } from "../content/weapons";
import { DestructibleObject } from "../destruction/DestructibleObject";
import { InstancedCrateTarget } from "../destruction/InstancedCrateTarget";
import type { DestructionTarget } from "../destruction/Target";
import type { DamageEvent, ObjectId, WeaponId } from "../destruction/types";
import { AudioManager } from "../effects/AudioManager";
import { DecalPool } from "../effects/DecalPool";
import { ParticlePool } from "../effects/ParticlePool";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { FirstPersonController } from "../player/FirstPersonController";
import { WeaponView } from "../player/WeaponView";
import { createLighting, createTestingRoom } from "../scene/createTestingRoom";
import { UI } from "../ui/UI";

export interface BreakLabTestApi {
  fire: () => void;
  reset: () => void;
  selectObject: (id: ObjectId) => void;
  selectWeapon: (id: WeaponId) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  getState: () => Readonly<GameSnapshot>;
}

declare global {
  interface Window { __BREAK_LAB__?: BreakLabTestApi; }
}

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.03, 80);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly physics: PhysicsWorld;
  private readonly controller: FirstPersonController;
  private readonly weaponView: WeaponView;
  private readonly particles: ParticlePool;
  private readonly decals: DecalPool;
  private readonly audio: AudioManager;
  private readonly ui: UI;
  private readonly store: Store;
  private readonly raycaster = new THREE.Raycaster();
  private readonly clock = new THREE.Clock();
  private readonly persistence: PersistedState;
  private target!: DestructionTarget;
  private slowMotion = false;
  private triggerHeld = false;
  private hidden = false;
  private cooldownUntil = 0;
  private reloadToken = 0;
  private sessionStarted = 0;
  private lastFpsUpdate = 0;
  private frames = 0;
  private breakStop = 0;

  private constructor(canvas: HTMLCanvasElement, physics: PhysicsWorld) {
    this.physics = physics;
    this.persistence = loadPersistence();
    const initialWeapon = WEAPONS.pistol;
    this.store = new Store({
      objectId: "crate", objectName: OBJECTS.crate.name,
      weaponId: "pistol", weaponName: initialWeapon.name,
      ammo: initialWeapon.magazine, magazine: initialWeapon.magazine,
      integrity: 100, detached: 0, damageValue: 0, shots: 0, hits: 0,
      reloading: false, tvPowered: true,
      elapsed: 0, results: null, menuOpen: false, paused: false,
      settings: this.persistence.settings, fps: 60, activeBodies: 0,
    });
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.32;
    this.renderer.shadowMap.enabled = this.persistence.settings.graphics === "high";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.camera);
    createTestingRoom(this.scene);
    createLighting(this.scene);
    this.particles = new ParticlePool(this.scene);
    this.decals = new DecalPool(this.scene);
    this.audio = new AudioManager(() => this.store.get().settings);
    this.weaponView = new WeaponView(this.camera);
    this.controller = new FirstPersonController(
      this.camera,
      canvas,
      () => this.store.get().settings.mouseSensitivity,
      (locked) => this.onPointerLock(locked),
    );
    this.ui = new UI(this.store, {
      enter: () => this.enter(), resume: () => this.enter(), reset: () => this.reset(),
      selectObject: (id) => this.selectObject(id), selectWeapon: (id) => this.selectWeapon(id),
      closeMenu: () => this.closeMenu(),
      openSettings: () => this.openSettings(), dismissResults: () => this.store.update({ results: null }),
      updateSettings: (settings) => this.updateSettings(settings),
    });
    this.target = this.createTarget("crate");
    this.bindEvents(canvas);
    this.resize();
    this.ui.showTutorial(!this.persistence.tutorialDismissed);
  }

  static async create(canvas: HTMLCanvasElement): Promise<Game> {
    const physics = await PhysicsWorld.create();
    const game = new Game(canvas, physics);
    game.start();
    return game;
  }

  fire(): void {
    const state = this.store.get();
    const now = performance.now() / 1000;
    if (state.paused || state.menuOpen || state.reloading || now < this.cooldownUntil) return;
    const weapon = WEAPONS[state.weaponId];
    if (state.ammo <= 0) { this.reload(); return; }
    this.cooldownUntil = now + weapon.cooldown;
    this.audio.resume();
    this.audio.weapon(weapon.id);
    this.weaponView.fire(weapon.id, state.settings.reducedFlashes);
    this.store.update({ ammo: state.ammo - 1, shots: state.shots + 1 });
    const spread = weapon.spread > 0
      ? seededSpread(state.shots + 991, weapon.pellets, (state.shots * 0.61) % Math.PI)
      : [[0, 0] as [number, number]];
    let triggerHit = false;
    let destroyedNow = false;
    let addedDamage = 0;
    for (const [spreadX, spreadY] of spread) {
      const ndc = new THREE.Vector2(spreadX * weapon.spread, spreadY * weapon.spread);
      this.raycaster.setFromCamera(ndc, this.camera);
      const intersection = this.firstValidIntersection();
      if (!intersection) continue;
      const normal = this.intersectionNormal(intersection);
      const instancePartIds = intersection.object.userData.instancePartIds as string[] | undefined;
      const partId = intersection.instanceId === undefined
        ? intersection.object.userData.destructiblePartId as string | undefined
        : instancePartIds?.[intersection.instanceId];
      if (!partId) {
        this.decals.place(intersection.point, normal, "room", intersection.object);
        continue;
      }
      const event: DamageEvent = {
        point: intersection.point.clone(), normal, direction: this.raycaster.ray.direction.clone(),
        amount: weapon.damage, radius: weapon.radius, impulse: weapon.impulse, weaponId: weapon.id,
      };
      const result = this.target.applyDamage(partId, event);
      if (!result.hit || !result.material) continue;
      triggerHit = true;
      destroyedNow ||= result.destroyedNow;
      addedDamage += result.damage;
      this.decals.place(intersection.point, normal, result.material, this.target.getHitSurface(partId) ?? intersection.object);
      this.particles.burst(intersection.point, normal, result.material, result.majorBreak, state.settings.graphics);
      this.audio.impact(result.material);
      if (result.majorBreak) {
        this.audio.majorBreak();
        this.breakStop = 0.055;
        document.body.classList.add("major-break");
        window.setTimeout(() => document.body.classList.remove("major-break"), 90);
      }
    }
    if (triggerHit) this.ui.confirmHit();
    const latest = this.store.get();
    const damageValue = latest.damageValue + (addedDamage / this.totalTargetHealth()) * this.target.definition.value;
    this.store.update({ hits: latest.hits + (triggerHit ? 1 : 0), damageValue });
    this.updateTargetSnapshot();
    if (destroyedNow) this.showResults();
  }

  reset(): void {
    const id = this.store.get().objectId;
    this.reloadToken++;
    this.target.dispose();
    this.decals.clear();
    this.target = this.createTarget(id);
    const weapon = WEAPONS[this.store.get().weaponId];
    this.sessionStarted = performance.now();
    this.store.update({
      ammo: weapon.magazine, integrity: 100, detached: 0, damageValue: 0, shots: 0, hits: 0,
      reloading: false, tvPowered: true, elapsed: 0, results: null,
    });
  }

  selectObject(id: ObjectId): void {
    this.target.dispose();
    this.decals.clear();
    this.target = this.createTarget(id);
    this.reloadToken++;
    const weapon = WEAPONS[this.store.get().weaponId];
    this.sessionStarted = performance.now();
    this.store.update({ objectId: id, objectName: OBJECTS[id].name, ammo: weapon.magazine, integrity: 100, detached: 0, damageValue: 0, shots: 0, hits: 0, reloading: false, tvPowered: true, elapsed: 0, results: null });
  }

  selectWeapon(id: WeaponId): void {
    const weapon = WEAPONS[id];
    this.reloadToken++;
    this.weaponView.setWeapon(id);
    this.store.update({ weaponId: id, weaponName: weapon.name, ammo: weapon.magazine, magazine: weapon.magazine, reloading: false });
    this.audio.ui();
  }

  updateSettings(settings: Partial<SettingsState>): void {
    const next = { ...this.store.get().settings, ...settings };
    this.store.update({ settings: next });
    this.persistence.settings = next;
    this.renderer.shadowMap.enabled = next.graphics === "high";
    savePersistence(this.persistence);
  }

  getSnapshot(): Readonly<GameSnapshot> {
    return this.store.get();
  }

  private reload(): void {
    const state = this.store.get();
    if (state.reloading || state.ammo === state.magazine) return;
    const token = ++this.reloadToken;
    const weapon = WEAPONS[state.weaponId];
    this.audio.reload(weapon.id);
    this.store.update({ reloading: true });
    window.setTimeout(() => {
      if (token !== this.reloadToken) return;
      this.store.update({ ammo: weapon.magazine, reloading: false });
    }, weapon.reloadSeconds * 1000);
  }

  private createTarget(id: ObjectId): DestructionTarget {
    if (id === "crate-mega") return new InstancedCrateTarget(OBJECTS[id], this.scene, this.physics);
    return new DestructibleObject(OBJECTS[id], this.scene, this.physics);
  }

  private enter(): void {
    this.audio.resume();
    this.persistence.tutorialDismissed = true;
    savePersistence(this.persistence);
    this.ui.showTutorial(false);
    this.store.update({ menuOpen: false, paused: false });
    this.controller.requestLock();
  }

  private closeMenu(): void {
    this.store.update({ menuOpen: false, paused: false });
    this.controller.requestLock();
  }

  private openSettings(): void {
    if (document.pointerLockElement) document.exitPointerLock();
    this.store.update({ menuOpen: true, paused: true });
  }

  private onPointerLock(locked: boolean): void {
    if (locked) this.store.update({ paused: false, menuOpen: false });
    else {
      this.triggerHeld = false;
      if (!this.store.get().menuOpen) this.store.update({ paused: true });
    }
  }

  private openMenu(): void {
    const open = !this.store.get().menuOpen;
    if (open) {
      this.store.update({ menuOpen: true, paused: true });
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      this.store.update({ menuOpen: false, paused: false });
      this.controller.requestLock();
    }
  }

  private firstValidIntersection(): THREE.Intersection | undefined {
    return this.raycaster.intersectObjects(this.scene.children, true).find((hit) => hit.object.userData.destructiblePartId || hit.object.userData.instancePartIds || hit.object.userData.room);
  }

  private intersectionNormal(intersection: THREE.Intersection): THREE.Vector3 {
    const normal = intersection.face?.normal.clone() ?? new THREE.Vector3(0, 0, 1);
    if (!(intersection.object instanceof THREE.InstancedMesh) || intersection.instanceId === undefined) {
      return normal.transformDirection(intersection.object.matrixWorld);
    }
    const instanceMatrix = new THREE.Matrix4();
    intersection.object.getMatrixAt(intersection.instanceId, instanceMatrix);
    return normal.transformDirection(new THREE.Matrix4().multiplyMatrices(intersection.object.matrixWorld, instanceMatrix));
  }

  private totalTargetHealth(): number {
    return this.target.definition.parts.reduce((sum, part) => sum + part.maxHealth, 0);
  }

  private updateTargetSnapshot(): void {
    this.store.update({ integrity: this.target.integrity, detached: this.target.detachedCount, tvPowered: this.target.tvPowered, activeBodies: this.physics.activeBodies });
  }

  private showResults(): void {
    if (this.store.get().results) return;
    const state = this.store.get();
    this.store.update({ results: { elapsed: state.elapsed, shots: state.shots, accuracy: state.shots ? (state.hits / state.shots) * 100 : 0, detached: this.target.detachedCount, integrity: this.target.integrity } });
  }

  private bindEvents(canvas: HTMLCanvasElement): void {
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("mousedown", this.onMouseDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "Tab") { event.preventDefault(); this.openMenu(); }
    if (event.code === "Backspace") { event.preventDefault(); this.reset(); }
    if (event.code === "Digit1") this.selectWeapon("pistol");
    if (event.code === "Digit2") this.selectWeapon("shotgun");
    if (event.code === "Digit3") this.selectWeapon("machine-gun");
    if (event.code === "KeyR") this.reload();
    if (event.code === "Space") { event.preventDefault(); this.slowMotion = true; }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => { if (event.code === "Space") this.slowMotion = false; };
  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || this.store.get().menuOpen) return;
    if (document.pointerLockElement === this.renderer.domElement) {
      this.triggerHeld = true;
      this.fire();
    }
    else this.controller.requestLock();
  };
  private readonly onMouseUp = (event: MouseEvent): void => { if (event.button === 0) this.triggerHeld = false; };
  private readonly onVisibility = (): void => { this.hidden = document.hidden; if (!this.hidden) this.clock.start(); };
  private readonly resize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  };

  private start(): void {
    const loop = (): void => {
      requestAnimationFrame(loop);
      if (this.hidden) return;
      const delta = Math.min(this.clock.getDelta(), 0.05);
      const state = this.store.get();
      const paused = state.paused || state.menuOpen;
      let scale = this.slowMotion ? PHYSICS.slowMotion : 1;
      if (this.breakStop > 0) { this.breakStop -= delta; scale *= 0.12; }
      if (!paused) {
        if (this.triggerHeld && WEAPONS[state.weaponId].automatic) this.fire();
        this.physics.step(delta, scale);
        this.particles.update(delta, scale);
        this.controller.update(delta);
        this.weaponView.update(delta);
        this.target.update();
        this.updateTargetSnapshot();
        const elapsed = (performance.now() - this.sessionStarted) / 1000;
        this.store.update({ elapsed });
      } else {
        this.weaponView.update(delta);
      }
      this.renderer.render(this.scene, this.camera);
      this.updateDiagnostics(delta);
    };
    this.sessionStarted = performance.now();
    loop();
  }

  private updateDiagnostics(delta: number): void {
    this.frames++;
    this.lastFpsUpdate += delta;
    if (this.lastFpsUpdate >= 0.5) {
      this.store.update({ fps: this.frames / this.lastFpsUpdate, activeBodies: this.physics.activeBodies });
      this.frames = 0;
      this.lastFpsUpdate = 0;
    }
    const debug = document.querySelector<HTMLElement>("[data-debug]");
    if (debug) debug.hidden = !DEBUG;
  }
}
