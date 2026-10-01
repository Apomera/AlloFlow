import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780, appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: `window.__testHooks = {}; window.__signalPaint = {};
    const originalText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...rest) {
      if (/MISSION ·|SCAN AND YIELD|HOLD AT RED|PROTECTED TURN|CHECK BEFORE PROCEEDING|YIELD BEFORE TURNING/.test(String(text))) {
        window.__signalPaint[String(text)] = { x, y };
      }
      return originalText.call(this, text, x, y, ...rest);
    };`,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('stopped drivers receive scan, hold, and protected-turn guidance on desktop and phone', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.setViewportSize({ width: 1140, height: 860 });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'residential', scenario: 'residential',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Start Residential Street', exact: true }).click();
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    const RR = (window as any).__RR_TEST_EXPORTS__.roadReady;
    const car = hook.carRef.current;
    const world = hook.infiniteWorldRef.current;
    const frame = RR.mainRoadLocalPoint(world, car.x, car.y);
    const sign = Math.sin(car.heading) < 0 ? -1 : 1;
    const length = RR.vehicleFootprint('sedan').length;
    const position = RR.mainRoadWorldPoint(world, frame.longitudinal + sign * (length / 2 + 4.1 + 0.25), 0);
    const fixture = (window as any).__signalFixture = { type: 'stop', state: 'red', phase: null };
    const signal = { ...(hook.signalsRef.current[0] || {}), x: position.x, y: position.y, timer: 0 };
    for (const [key, value] of [['type', 'type'], ['state', 'state'], ['_phase', 'phase']]) {
      Object.defineProperty(signal, key, { configurable: true, get: () => fixture[value], set: () => {} });
    }
    delete signal._chunk;
    hook.signalsRef.current = [signal];
    hook.trafficRef.current = [];
    hook.pedsRef.current = [];
    hook.eventToastRef.current = null;
    car.speed = 0;
    hook.gearRef.current = 'P';
    const distance = RR.controlDistanceAhead(world, signal, car, length);
    if (distance == null || distance < 0 || distance > 1) throw new Error('Invalid stop-line fixture: ' + distance);
    (window as any).__signalPaint = {};
  });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__signalPaint))).toContain('SCAN AND YIELD');
  await page.evaluate(() => {
    (window as any).__signalFixture.type = 'light';
    (window as any).__signalPaint = {};
  });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__signalPaint))).toContain('HOLD AT RED');
  await page.screenshot({ path: 'reports/roadready-review/intersection-hold.png', scale: 'css' });
  await page.evaluate(() => {
    (window as any).__signalFixture.state = 'green';
    (window as any).__signalPaint = {};
  });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__signalPaint))).toContain('CHECK BEFORE PROCEEDING');
  expect(await page.evaluate(() => Object.keys((window as any).__signalPaint).some(text => text.startsWith('MISSION ·')))).toBe(false);
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__signalPaint))).toContain('YIELD BEFORE TURNING');
  await page.evaluate(() => {
    (window as any).__signalFixture.phase = 'main_left_green';
    (window as any).__signalPaint = {};
    (window as any).__testHooks.roadReady.eventToastRef.current = null;
  });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__signalPaint))).toContain('PROTECTED TURN');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__signalPaint = {};
  });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__signalPaint))).toContain('PROTECTED TURN');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'reports/roadready-review/intersection-arrow-mobile.png', scale: 'css' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
