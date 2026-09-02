# Break Lab

Break Lab is a browser-based 3D destruction sandbox. Six procedural targets—including 100-crate and instanced 1,000-crate rigid-body stacks—break through local part health and authored structural bonds; detached pieces become Rapier rigid bodies and can be dismantled further.

## Setup

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. Use `npm run check` for lint, unit tests, type-checking, and a production build. Playwright smoke tests run with `npm run test:e2e` after installing its Chromium browser (`npx playwright install chromium`).

## Controls

| Input | Action |
| --- | --- |
| Mouse / left click | Aim / fire |
| Right click | Focus aim |
| WASD | Move |
| R | Reload |
| 1 / 2 / 3 | Pistol / shotgun / machine gun |
| Tab | Targets and weapons |
| Hold Space | 25% slow motion |
| Backspace | Reset target |
| Escape | Release pointer and pause |

The lower-right buttons provide visible alternatives for weapon selection and reset.

## Architecture

Content in `src/content` is serializable configuration. `DestructibleObject` owns part health, bonds, connectivity, functional tags, and Three.js meshes. `PhysicsWorld` owns Rapier and synchronizes detached bodies in one update phase. Weapons only produce `DamageEvent` values. Pooled particles and decals cap transient scene growth. The plain-DOM UI consumes immutable store snapshots and calls the public `Game` API.

The app exposes `window.__BREAK_LAB__` as a deterministic automation seam for reset, target/weapon selection, settings, firing, and state inspection.

## Persistence and assets

Only versioned settings and tutorial dismissal are stored. The room, objects, effects, and audio are generated locally at runtime; the app makes no asset or gameplay network requests.

See [ATTRIBUTION.md](./ATTRIBUTION.md) for asset details and [TODO.md](./TODO.md) for documented MVP compromises.
