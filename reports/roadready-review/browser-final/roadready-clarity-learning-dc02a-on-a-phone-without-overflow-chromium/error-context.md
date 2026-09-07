# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roadready-clarity.spec.ts >> learning path opens an actionable briefing on a phone without overflow
- Location: tests\e2e\roadready-clarity.spec.ts:50:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('navigation', { name: 'Road rules learning path' }).getByRole('button')
Expected: 3
Received: 0
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for getByRole('navigation', { name: 'Road rules learning path' }).getByRole('button')
    33 × locator resolved to 0 elements
       - unexpected value "0"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | 
  4  | test.describe.configure({ timeout: 150_000 });
  5  | const harness = new GlHarness({
  6  |   toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  7  |   width: 1100, height: 780, appStyles: true,
  8  |   preScripts: ['stem_lab/stem_lab_module.js'],
  9  |   probes: "window.__testHooks = {}; document.documentElement.classList.add('theme-dark');",
  10 | });
  11 | test.beforeAll(async () => { await harness.start(); });
  12 | test.afterAll(async () => { await harness.stop(); });
  13 | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  14 | 
  15 | test('lesson briefing and live cockpit remain readable', async ({ page }) => {
  16 |   await page.setViewportSize({ width: 1140, height: 860 });
  17 |   await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'residential', reducedMotion: true, calmDrive: true } }, undefined, { expectCanvas: false });
  18 |   await expect(page.getByRole('heading', { name: 'Residential Street' })).toBeVisible();
  19 |   await expect(page.getByRole('heading', { name: 'Stop means stationary' })).toBeVisible();
  20 |   await page.screenshot({ path: 'reports/roadready-review/briefing.png', fullPage: true });
  21 |   await page.getByRole('button', { name: 'Start Residential Street', exact: true }).click();
  22 |   await expect(page.getByRole('button', { name: 'Fasten seatbelt' })).toBeVisible();
  23 |   await page.keyboard.press('b');
  24 |   await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  25 |   await page.screenshot({ path: 'reports/roadready-review/cockpit.png' });
  26 |   const paint = await page.evaluate(() => {
  27 |     const found: any[] = [];
  28 |     (window as any).__testHooks.roadReady.threeRef.current.scene.traverse((node: any) => {
  29 |       if (node.name !== 'rr-road-paint') return;
  30 |       const points = Array.from(node.geometry.attributes.position.array) as number[];
  31 |       const heights = points.filter((_, i) => i % 3 === 1);
  32 |       found.push({ finite: points.every(Number.isFinite), vertices: points.length / 3,
  33 |         rise: Math.max(...heights) - Math.min(...heights) });
  34 |     });
  35 |     return found;
  36 |   });
  37 |   expect(paint.length).toBeGreaterThan(0);
  38 |   expect(paint.every((item) => item.finite)).toBe(true);
  39 |   expect(paint.some((item) => item.vertices > 4 && item.rise > 0.01)).toBe(true);
  40 |   await page.keyboard.down('w');
  41 |   await page.waitForTimeout(1200);
  42 |   await page.keyboard.up('w');
  43 |   expect(await page.evaluate(() => (window as any).__testHooks.roadReady.carRef.current.speed)).toBeGreaterThan(0.5);
  44 |   await page.keyboard.down('s');
  45 |   await expect.poll(() => page.evaluate(() => Math.abs((window as any).__testHooks.roadReady.carRef.current.speed))).toBeLessThan(0.05);
  46 |   await page.keyboard.up('s');
  47 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  48 | });
  49 | 
  50 | test('learning path opens an actionable briefing on a phone without overflow', async ({ page }) => {
  51 |   await page.setViewportSize({ width: 390, height: 844 });
  52 |   await harness.mount(page, { roadReady: { view: 'menu', reducedMotion: true } }, undefined, { expectCanvas: false });
  53 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  54 |   const path = page.getByRole('navigation', { name: 'Road rules learning path' });
> 55 |   await expect(path.getByRole('button')).toHaveCount(3);
     |                                          ^ Error: expect(locator).toHaveCount(expected) failed
  56 |   await page.screenshot({ path: 'reports/roadready-review/menu-mobile.png' });
  57 |   await path.getByRole('button', { name: /Practice one skill/ }).click();
  58 |   await expect(page.getByRole('heading', { name: 'Residential Street' })).toBeVisible();
  59 |   await expect(page.getByRole('link', { name: /Maine BMV rules/ })).toHaveAttribute('href', /maine.gov/);
  60 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  61 |   await page.screenshot({ path: 'reports/roadready-review/briefing-mobile.png', fullPage: true });
  62 | });
  63 | 
  64 | test('Ride-Along keeps moving safely with the revised steering model', async ({ page }) => {
  65 |   await page.setViewportSize({ width: 1140, height: 860 });
  66 |   await harness.mount(page, { roadReady: { view: 'driving', scenario: 'residential', vehicle: 'sedan', rideAlong: true, reducedMotion: true, calmDrive: true } }, undefined, { expectCanvas: false });
  67 |   await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  68 |   await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 16);
  69 |   const state = await page.evaluate(() => {
  70 |     const hook = (window as any).__testHooks.roadReady;
  71 |     return { stats: hook.statsRef.current, car: hook.carRef.current, gear: hook.gearRef.current };
  72 |   });
  73 |   expect(state.gear).toBe('D');
  74 |   expect(state.stats.maxSpeed).toBeGreaterThan(2);
  75 |   expect(state.stats.crashes - (state.stats.aiCausedCrashes || 0)).toBe(0);
  76 |   expect(state.stats.offRoadSeconds || 0).toBeLessThan(0.5);
  77 |   expect(Number.isFinite(state.car.heading)).toBe(true);
  78 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  79 | });
  80 | 
```