import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__BREAK_LAB__));
});

test("loads HUD and changes targets through the deterministic API", async ({ page }) => {
  await expect(page.locator("#hud")).toBeVisible();
  expect(await page.evaluate(() => window.__BREAK_LAB__?.getState().paused)).toBe(false);
  await page.evaluate(() => window.__BREAK_LAB__?.selectWeapon("machine-gun"));
  await expect(page.locator("[data-weapon]")).toHaveText("Machine Gun");
  expect(await page.evaluate(() => window.__BREAK_LAB__?.getState().ammo)).toBe(30);
  await page.evaluate(() => window.__BREAK_LAB__?.selectObject("vase"));
  await expect(page.locator("[data-object]")).toHaveText("Ceramic Vase");
  await page.evaluate(() => window.__BREAK_LAB__?.selectObject("crate-stack"));
  await expect(page.locator("[data-object]")).toHaveText("100 Small Crates");
  await page.waitForFunction(() => window.__BREAK_LAB__?.getState().activeBodies === 100);
  await page.evaluate(() => window.__BREAK_LAB__?.selectObject("crate-mega"));
  await expect(page.locator("[data-object]")).toHaveText("1000 Crates");
  await page.waitForFunction(() => window.__BREAK_LAB__?.getState().activeBodies === 1000);
  await page.evaluate(() => window.__BREAK_LAB__?.selectObject("crate"));
  await page.waitForFunction(() => window.__BREAK_LAB__?.getState().activeBodies === 0);
  await page.evaluate(() => window.__BREAK_LAB__?.reset());
  expect(await page.evaluate(() => window.__BREAK_LAB__?.getState().integrity)).toBe(100);
});

test("closing the Tab menu resumes play", async ({ page }) => {
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => window.__BREAK_LAB__?.getState().menuOpen)).toBe(true);
  await page.keyboard.press("Tab");
  const state = await page.evaluate(() => window.__BREAK_LAB__?.getState());
  expect(state?.menuOpen).toBe(false);
  expect(state?.paused).toBe(false);
});

test("persists settings across reload", async ({ page }) => {
  await page.evaluate(() => window.__BREAK_LAB__?.updateSettings({ crosshairScale: 1.6 }));
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__BREAK_LAB__));
  expect(await page.evaluate(() => window.__BREAK_LAB__?.getState().settings.crosshairScale)).toBe(1.6);
});

test("remains pristine after 20 consecutive resets", async ({ page }) => {
  await page.evaluate(() => {
    for (let index = 0; index < 20; index++) window.__BREAK_LAB__?.reset();
  });
  const state = await page.evaluate(() => window.__BREAK_LAB__?.getState());
  expect(state?.integrity).toBe(100);
  expect(state?.detached).toBe(0);
  expect(state?.activeBodies).toBe(0);
});
