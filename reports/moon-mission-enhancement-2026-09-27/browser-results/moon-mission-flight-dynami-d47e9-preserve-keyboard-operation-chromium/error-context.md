# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-flight-dynamics.spec.ts >> phone instruments and controls fit the viewport and preserve keyboard operation
- Location: tests\e2e\moon-mission-flight-dynamics.spec.ts:49:5

# Error details

```
TimeoutError: locator.focus: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('Engine throttle', { exact: true })

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | 
  4  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
  5  | const state = { moonMission: { missionPhase: 5, descentStarted: true, soundOff: true } };
  6  | test.beforeAll(async () => { await harness.start(); });
  7  | test.afterAll(async () => { await harness.stop(); });
  8  | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  9  | test.describe.configure({ timeout: 150000, retries: 0 });
  10 | 
  11 | async function readFlight(page: any) {
  12 |   return page.locator('[data-descent-canvas]').evaluate((cv: HTMLCanvasElement) => ({
  13 |     time: Number(cv.dataset.descentElapsed), alt: Number(cv.dataset.descentAlt),
  14 |     mass: Number(cv.dataset.descentMass), fuel: Number(cv.dataset.descentFuel),
  15 |     speed: Number(cv.dataset.descentVspeed), thrust: Number(cv.dataset.descentThrust),
  16 |     x: Number(cv.dataset.descentX), paused: cv.dataset.descentPaused,
  17 |   }));
  18 | }
  19 | 
  20 | test('throttle drives the live mass model, pause freezes the entire flight, and instruments remain readable', async ({ page }, testInfo) => {
  21 |   const errors: string[] = [];
  22 |   page.on('pageerror', e => errors.push(e.message));
  23 |   await page.setViewportSize({ width: 1280, height: 1100 });
  24 |   await harness.mount(page, state, undefined, { expectCanvas: false });
  25 |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  26 |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  27 |   const before = await readFlight(page);
  28 |   await page.locator('[data-descent-throttle]').fill('65');
  29 |   await expect.poll(async () => (await readFlight(page)).thrust).toBeGreaterThan(0.6);
  30 |   await expect.poll(async () => (await readFlight(page)).mass).toBeLessThan(before.mass - 1);
  31 |   const burning = await readFlight(page);
  32 |   expect(burning.speed).toBeGreaterThan(before.speed);
  33 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  34 |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  35 |   const paused = await readFlight(page);
  36 |   await page.waitForTimeout(600);
  37 |   expect(await readFlight(page)).toEqual(paused);
  38 |   await expect(page.locator('[data-descent-guidance]')).toContainText('Paused');
  39 |   await page.locator('[data-descent-throttle]').fill('0');
  40 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  41 |   await expect.poll(async () => (await readFlight(page)).time).toBeGreaterThan(paused.time + 0.5);
  42 |   await expect.poll(async () => (await readFlight(page)).thrust).toBeLessThan(0.02);
  43 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  44 |   await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  45 |   await page.screenshot({ path: testInfo.outputPath('descent-desktop.png'), fullPage: true });
  46 |   expect(errors).toEqual([]);
  47 | });
  48 | 
  49 | test('phone instruments and controls fit the viewport and preserve keyboard operation', async ({ page }, testInfo) => {
  50 |   await page.setViewportSize({ width: 390, height: 844 });
  51 |   await page.goto(`${harness.url}/__harness`);
  52 |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  53 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount({ moonMission: { missionPhase: 5, descentStarted: true, soundOff: true } }); });
  54 |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  55 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  56 |   const lever = page.getByLabel('Engine throttle', { exact: true });
> 57 |   await lever.focus();
     |               ^ TimeoutError: locator.focus: Timeout 30000ms exceeded.
  58 |   await page.keyboard.press('ArrowRight');
  59 |   await expect(lever).toHaveValue('1');
  60 |   const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  61 |   expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  62 |   for (const selector of ['[data-descent-pause]', '[data-descent-throttle]', '[data-descent-pad] button']) {
  63 |     const boxes = await page.locator(selector).evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, right: b.right, height: b.height }; }));
  64 |     for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(390); expect(b.height).toBeGreaterThanOrEqual(44); }
  65 |   }
  66 |   await page.screenshot({ path: testInfo.outputPath('descent-phone.png'), fullPage: true });
  67 | });
  68 | 
  69 | test('the fallback view flies and reports a physical impact without WebGL', async ({ page }, testInfo) => {
  70 |   await page.addInitScript(() => {
  71 |     const original = HTMLCanvasElement.prototype.getContext;
  72 |     (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
  73 |       if (/webgl/i.test(type)) return null;
  74 |       return (original as any).apply(this, [type, ...args]);
  75 |     };
  76 |   });
  77 |   await harness.mount(page, state, undefined, { expectCanvas: false });
  78 |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  79 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  80 |   await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  81 |   await page.screenshot({ path: testInfo.outputPath('descent-fallback.png'), fullPage: true });
  82 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  83 |   await expect(page.locator('[data-descent-callout]')).toContainText('HARD LANDING', { timeout: 35000 });
  84 |   await expect(page.locator('[data-flight-value="altitude"]')).toHaveText('0.0 m');
  85 |   await expect(page.locator('[data-flight-value="throttle"]')).toHaveText('0%');
  86 |   await expect(page.getByRole('button', { name: 'Pause flight', exact: true })).toBeDisabled();
  87 |   await page.getByRole('button', { name: 'Retry the powered descent from the start' }).click();
  88 |   await expect(page.locator('[data-descent-instruments]')).toHaveCount(0);
  89 |   await page.getByRole('button', { name: /Begin Descent/ }).click();
  90 |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  91 |   await expect(page.locator('[data-descent-throttle]')).toHaveValue('0');
  92 | });
  93 | 
```