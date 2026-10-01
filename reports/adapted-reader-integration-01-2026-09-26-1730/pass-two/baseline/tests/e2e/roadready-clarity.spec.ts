import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780, appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: "window.__testHooks = {}; document.documentElement.classList.add('theme-dark');",
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('lesson briefing and live cockpit remain readable', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 860 });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'residential', reducedMotion: true, calmDrive: true } }, undefined, { expectCanvas: false });
  await expect(page.getByRole('heading', { name: 'Residential Street' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Stop means stationary' })).toBeVisible();
  await page.screenshot({ path: 'reports/roadready-review/briefing.png', fullPage: true });
  await page.getByRole('button', { name: 'Start Residential Street', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fasten seatbelt' })).toBeVisible();
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  expect(await page.evaluate(() => (window as any).__testHooks.roadReady.threeRef.current.dashboardInstrumentGroup.visible)).toBe(false);
  await page.screenshot({ path: 'reports/roadready-review/cockpit.png' });
  const paint = await page.evaluate(() => {
    const found: any[] = [];
    (window as any).__testHooks.roadReady.threeRef.current.scene.traverse((node: any) => {
      if (node.name !== 'rr-road-paint') return;
      const points = Array.from(node.geometry.attributes.position.array) as number[];
      const heights = points.filter((_, i) => i % 3 === 1);
      found.push({ finite: points.every(Number.isFinite), vertices: points.length / 3,
        rise: Math.max(...heights) - Math.min(...heights) });
    });
    return found;
  });
  expect(paint.length).toBeGreaterThan(0);
  expect(paint.every((item) => item.finite)).toBe(true);
  expect(paint.some((item) => item.vertices > 4 && item.rise > 0.01)).toBe(true);
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  expect(await page.evaluate(() => (window as any).__testHooks.roadReady.carRef.current.speed)).toBeGreaterThan(0.5);
  await page.keyboard.down('s');
  await expect.poll(() => page.evaluate(() => Math.abs((window as any).__testHooks.roadReady.carRef.current.speed))).toBeLessThan(0.05);
  await page.keyboard.up('s');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('learning path opens an actionable briefing on a phone without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { roadReady: { view: 'menu', reducedMotion: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  await page.getByRole('button', { name: 'Skip tour', exact: true }).click();
  const path = page.getByRole('navigation', { name: 'Road rules learning path' });
  await expect(path.getByRole('button')).toHaveCount(3);
  await page.screenshot({ path: 'reports/roadready-review/menu-mobile.png' });
  await path.getByRole('button', { name: /Practice one skill/ }).click();
  await expect(page.getByRole('heading', { name: 'Residential Street' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Maine BMV rules/ })).toHaveAttribute('href', /maine.gov/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'reports/roadready-review/briefing-mobile.png', fullPage: true });
});

test('Ride-Along keeps moving safely with the revised steering model', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 860 });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'residential', scenario: 'residential', vehicle: 'sedan', rideAlong: true, reducedMotion: true, calmDrive: true } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Start Ride-Along · Residential Street', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 12, null, { timeout: 90000 });
  const state = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    return { stats: hook.statsRef.current, car: hook.carRef.current, gear: hook.gearRef.current };
  });
  expect(state.gear).toBe('D');
  expect(state.stats.maxSpeed).toBeGreaterThan(2);
  expect(state.stats.crashes - (state.stats.aiCausedCrashes || 0)).toBe(0);
  expect(state.stats.offRoadSeconds || 0).toBeLessThan(0.5);
  expect(Number.isFinite(state.car.heading)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
