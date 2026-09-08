import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780, appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: `window.__testHooks = {};
    window.__gapPaint = {};
    const originalText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...rest) {
      if (/FOLLOWING SPACE|Target .*s|Increase gap|Keep scanning/.test(String(text))) {
        window.__gapPaint[String(text)] = { color: this.fillStyle, x, y };
      }
      return originalText.call(this, text, x, y, ...rest);
    };`,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('wet-road gap meter detects a lead vehicle beyond 30 metres and shows its practice target', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.setViewportSize({ width: 1140, height: 860 });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'rain', scenario: 'rain',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Start Rain', exact: true }).click();
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    const RR = (window as any).__RR_TEST_EXPORTS__.roadReady;
    const car = hook.carRef.current;
    const world = hook.infiniteWorldRef.current;
    // Hold the test vehicles at a known speed and road-local separation while
    // the real simulation renders. The other suites exercise free acceleration.
    Object.defineProperty(car, 'speed', { configurable: true, get: () => 20, set: () => {} });
    hook.gearRef.current = 'D';
    const lead = { ...hook.trafficRef.current[0], type: 'car', speed: 20, crossStreet: false, _turning: false };
    const pose = () => {
      const frame = RR.mainRoadLocalPoint(world, car.x, car.y);
      const sign = Math.cos(car.heading) * Math.sin(frame.heading) + Math.sin(car.heading) * Math.cos(frame.heading) < 0 ? -1 : 1;
      const next = RR.mainRoadWorldPoint(world, frame.longitudinal + 75 * sign, frame.lateral);
      return { x: next.x, y: next.y, heading: sign > 0 ? Math.PI / 2 - next.heading : -Math.PI / 2 - next.heading };
    };
    for (const key of ['x', 'y', 'heading']) {
      Object.defineProperty(lead, key, { configurable: true, get: () => pose()[key], set: () => {} });
    }
    hook.trafficRef.current = [lead];
    const fixture = RR.followingVehicleRoadState(world, car, lead, 1.5);
    if (!fixture.eligible || !fixture.sameLane || fixture.ahead < 70) throw new Error('Invalid lead-vehicle fixture: ' + JSON.stringify(fixture));
    hook.signalsRef.current = [];
    (window as any).__gapPaint = {};
  });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__gapPaint))).toContain('FOLLOWING SPACE');
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__gapPaint))).toContain('Target 4+ s');
  const paint = await page.evaluate(() => (window as any).__gapPaint);
  const action = Object.keys(paint).find(text => text.startsWith('Increase gap'));
  expect(action).toBeTruthy();
  expect(paint[action!].color).toBe('#f59e0b');
  await page.screenshot({ path: 'reports/roadready-review/following-space-rain.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__gapPaint = {};
    (window as any).__testHooks.roadReady.eventToastRef.current = null;
  });
  await expect.poll(() => page.evaluate(() => (window as any).__gapPaint['FOLLOWING SPACE']?.x)).toBeLessThan(220);
  const compact = await page.evaluate(() => (window as any).__gapPaint['FOLLOWING SPACE']);
  expect(compact.x).toBeGreaterThan(0);
  expect(compact.y).toBeGreaterThan(230);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'reports/roadready-review/following-space-mobile.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
