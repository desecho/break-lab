import { GAME_TITLE } from "../app/config";
import { OBJECTS } from "../content/objects";
import { WEAPONS } from "../content/weapons";
import type { ObjectId, WeaponId } from "../destruction/types";
import type { GameSnapshot, SettingsState, Store } from "../app/store";

export interface UIActions {
  enter: () => void;
  resume: () => void;
  reset: () => void;
  selectObject: (id: ObjectId) => void;
  selectWeapon: (id: WeaponId) => void;
  closeMenu: () => void;
  openSettings: () => void;
  dismissResults: () => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
}

export class UI {
  private readonly root: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly pause: HTMLElement;
  private readonly tutorial: HTMLElement;
  private readonly results: HTMLElement;
  private readonly settings: HTMLElement;
  private readonly hitMarker: HTMLElement;
  private settingsOpen = false;
  private resultsKey = "";

  constructor(store: Store, private readonly actions: UIActions) {
    const root = document.querySelector<HTMLElement>("#ui-root");
    if (!root) throw new Error("Missing UI root");
    this.root = root;
    root.innerHTML = this.template();
    this.hud = this.required("#hud");
    this.menu = this.required("#menu");
    this.pause = this.required("#pause-overlay");
    this.tutorial = this.required("#tutorial");
    this.results = this.required("#results");
    this.settings = this.required("#settings-panel");
    this.hitMarker = this.required("#hit-marker");
    this.bind();
    store.subscribe((snapshot) => this.render(snapshot));
  }

  confirmHit(): void {
    this.hitMarker.classList.remove("confirm");
    void this.hitMarker.offsetWidth;
    this.hitMarker.classList.add("confirm");
  }

  showTutorial(show: boolean): void {
    this.tutorial.classList.toggle("hidden", !show);
  }

  private render(state: Readonly<GameSnapshot>): void {
    this.hud.querySelector("[data-object]")!.textContent = state.objectName;
    this.hud.querySelector("[data-integrity]")!.textContent = `${Math.round(state.integrity)}%`;
    (this.hud.querySelector("[data-integrity-bar]") as HTMLElement).style.width = `${state.integrity}%`;
    this.hud.querySelector("[data-detached]")!.textContent = `${state.detached}`;
    this.hud.querySelector("[data-value]")!.textContent = `$${Math.round(state.damageValue)}`;
    this.hud.querySelector("[data-weapon]")!.textContent = state.reloading ? "RELOADING" : state.weaponName;
    this.hud.querySelector("[data-ammo]")!.textContent = `${state.ammo} / ∞`;
    this.menu.classList.toggle("hidden", !state.menuOpen);
    this.pause.classList.toggle("hidden", !state.paused || state.menuOpen);
    this.results.classList.toggle("hidden", !state.results);
    if (state.results) {
      const resultsKey = JSON.stringify(state.results);
      if (resultsKey !== this.resultsKey) {
        this.resultsKey = resultsKey;
        this.results.innerHTML = `<button class="card-close" data-action="dismiss-results" aria-label="Dismiss results">×</button><p class="eyebrow">TEST COMPLETE</p><h2>Object destroyed</h2><div class="results-grid"><span>Time <strong>${state.results.elapsed.toFixed(1)}s</strong></span><span>Shots <strong>${state.results.shots}</strong></span><span>Accuracy <strong>${Math.round(state.results.accuracy)}%</strong></span><span>Detached <strong>${state.results.detached}</strong></span><span>Integrity <strong>${Math.round(state.results.integrity)}%</strong></span></div>`;
      }
    } else {
      this.resultsKey = "";
    }
    this.root.style.setProperty("--crosshair-scale", `${state.settings.crosshairScale}`);
    this.root.classList.toggle("reduced-flashes", state.settings.reducedFlashes);
    for (const element of this.settings.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-setting]")) {
      const value = state.settings[element.dataset.setting as keyof SettingsState];
      if (element instanceof HTMLInputElement && element.type === "checkbox") element.checked = Boolean(value);
      else element.value = String(value);
    }
    const debug = this.root.querySelector("[data-debug]") as HTMLElement;
    debug.textContent = `${Math.round(state.fps)} FPS · ${state.activeBodies} bodies`;
  }

  private bind(): void {
    this.root.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "enter") this.actions.enter();
      if (action === "resume") this.actions.resume();
      if (action === "reset") this.actions.reset();
      if (action === "close-menu") this.actions.closeMenu();
      if (action === "settings") {
        this.settingsOpen = !this.settingsOpen;
        this.settings.classList.toggle("hidden", !this.settingsOpen);
        this.actions.openSettings();
      }
      if (action === "dismiss-results") this.actions.dismissResults();
      if (action === "object") this.actions.selectObject(target.dataset.id as ObjectId);
      if (action === "weapon") this.actions.selectWeapon(target.dataset.id as WeaponId);
    });
    this.settings.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement | HTMLSelectElement;
      const key = input.dataset.setting as keyof SettingsState | undefined;
      if (!key) return;
      const value: string | number | boolean = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input instanceof HTMLInputElement && input.type === "range" ? Number(input.value) : input.value;
      this.actions.updateSettings({ [key]: value });
    });
  }

  private template(): string {
    const objectCards = Object.values(OBJECTS).map((object) => `<button class="selection-card" data-action="object" data-id="${object.id}"><span>${object.name}</span><small>LOAD TARGET</small></button>`).join("");
    return `<div id="hud"><section class="hud-object"><p class="eyebrow">TEST SUBJECT</p><h1 data-object></h1><div class="integrity"><i data-integrity-bar></i></div><p><strong data-integrity></strong> INTEGRITY</p><p class="muted"><span data-detached></span> detached · <span data-value></span> damage</p></section><div id="crosshair"><i></i><i></i><i></i><i></i><b id="hit-marker"></b></div><section class="hud-weapon"><p class="eyebrow">EQUIPPED</p><h2 data-weapon></h2><strong data-ammo></strong><div class="quick-actions"><button data-action="weapon" data-id="pistol">1 Pistol</button><button data-action="weapon" data-id="shotgun">2 Shotgun</button><button data-action="weapon" data-id="machine-gun">3 Machine Gun</button><button data-action="reset">Reset</button></div></section><div class="debug" data-debug></div></div>
    <section id="tutorial" class="overlay"><div class="intro-card"><p class="eyebrow">INDUSTRIAL DESTRUCTION RANGE</p><h1>${GAME_TITLE}</h1><p>Every shot leaves a mark. Break bonds, expose components, and dismantle the target piece by piece.</p><div class="controls"><span><kbd>Mouse</kbd>Aim / fire</span><span><kbd>WASD</kbd>Move</span><span><kbd>R</kbd>Reload</span><span><kbd>1 / 2 / 3</kbd>Weapons</span><span><kbd>Tab</kbd>Targets</span><span><kbd>Space</kbd>Slow motion</span><span><kbd>⌫</kbd>Reset</span><span><kbd>Esc</kbd>Pause</span></div><button class="primary" data-action="enter">ENTER THE LAB</button></div></section>
    <section id="pause-overlay" class="overlay hidden"><div class="pause-card"><p class="eyebrow">SESSION PAUSED</p><h2>${GAME_TITLE}</h2><button class="primary" data-action="resume">Resume test</button><button data-action="settings">Settings</button><button data-action="reset">Reset target</button><p class="muted">Mouse aim · LMB fire · RMB focus · WASD move · R reload · Tab menu</p></div></section>
    <section id="menu" class="panel hidden"><header><div><p class="eyebrow">SANDBOX TERMINAL</p><h2>Select a target</h2></div><button data-action="close-menu">Close <kbd>Tab</kbd></button></header><h3>Targets</h3><div class="card-grid">${objectCards}</div><h3>Weapons</h3><div class="button-row">${Object.values(WEAPONS).map((weapon) => `<button data-action="weapon" data-id="${weapon.id}">${weapon.name} · ${weapon.magazine} rounds</button>`).join("")}<button data-action="reset">Reset target</button></div><div id="settings-panel" class="settings hidden">${settingsTemplate()}</div></section>
    <aside id="results" class="results-card hidden"></aside>`;
  }

  private required(selector: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing UI element ${selector}`);
    return element;
  }
}

function settingsTemplate(): string {
  return `<h3>Settings</h3><label>Master volume<input data-setting="masterVolume" type="range" min="0" max="1" step="0.05" value="0.75"></label><label>Effects volume<input data-setting="effectsVolume" type="range" min="0" max="1" step="0.05" value="0.8"></label><label>UI volume<input data-setting="uiVolume" type="range" min="0" max="1" step="0.05" value="0.65"></label><label>Camera shake<select data-setting="cameraShake"><option>off</option><option selected>low</option><option>high</option></select></label><label>Crosshair scale<input data-setting="crosshairScale" type="range" min="0.6" max="2" step="0.1" value="1"></label><label>Mouse sensitivity<input data-setting="mouseSensitivity" type="range" min="0.3" max="2" step="0.1" value="1"></label><label>Graphics<select data-setting="graphics"><option>low</option><option selected>high</option></select></label><label class="check"><input data-setting="reducedFlashes" type="checkbox"> Reduced flashes</label>`;
}
