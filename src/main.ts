import "./styles.css";
import { Game } from "./app/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const root = document.querySelector<HTMLElement>("#ui-root");

if (!canvas || !root) throw new Error("Break Lab could not find its page roots.");

root.innerHTML = `<div class="loading"><span></span><p>INITIALIZING PHYSICS LAB</p></div>`;

Game.create(canvas)
  .then((game) => {
    window.__BREAK_LAB__ = {
      fire: () => game.fire(),
      reset: () => game.reset(),
      selectObject: (id) => game.selectObject(id),
      selectWeapon: (id) => game.selectWeapon(id),
      updateSettings: (settings) => game.updateSettings(settings),
      getState: () => game.getSnapshot(),
    };
  })
  .catch((error: unknown) => {
    console.error(error);
    root.innerHTML = `<div class="fatal"><h1>Lab initialization failed</h1><p>${error instanceof Error ? error.message : "Unknown error"}</p><button onclick="location.reload()">Try again</button></div>`;
  });
