import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function brakePedal(page: Page, value: number) {
  await page.evaluate((pressure) => {
    const w = window as any;
    w.__surfaceBrakePad.buttons[6] = { pressed: pressure > 0, value: pressure };
    w.StemInput.poll();
  }, value);
}

async function tireSnapshot(page: Page) {
  return page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    const tire = hook.tireDynamicsRef.current;
    return {
      brake: hook.carRef.current.brake,
      absActive: tire.absActive,
      wheelLocked: tire.wheelLocked,
      surface: tire.surface,
      contactCount: tire.surfaceContact?.contactCount,
      offRoadFraction: tire.surfaceContact?.offRoadFraction,
      waterCoverage: tire.waterCoverage,
      mu: tire.mu,
      brakingMu: tire.brakingMu,
    };
  });
}

test('live wheel contacts govern ABS, wheel lock, and release at the same pedal pressure', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__surfaceBrakePad = {
      id: 'Surface braking test controller', index: 0, mapping: 'standard', connected: true,
      axes: [0, 0, 0, 0, -1],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true, value: () => [w.__surfaceBrakePad],
    });
  });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'residential', scenario: 'residential',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  // Wait for a neutral gamepad sample so startup rearming cannot suppress LT.
  await expect.poll(() => page.evaluate(() =>
    (window as any).__testHooks.roadReady.keysRef.current._gpA
  )).toBe(false);
  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    if (!hook.tireDynamicsRef) throw new Error('Missing live tire-dynamics test hook');
    if (hook.getCurrentScenario().weather !== 'clear') throw new Error('Fixture requires dry weather');
    const car = hook.carRef.current;
    // This checks live input -> wheel sampling -> tire decisions. Keep the
    // observation speed and location constant, rather than letting braking
    // stop the car before the browser can observe a lock/ABS transition.
    const pose = { x: car.x, y: car.y, heading: car.heading, speed: 40 * hook.constants.MPH_TO_MS };
    for (const key of ['x', 'y', 'heading', 'speed'] as const) {
      Object.defineProperty(car, key, { configurable: true, get: () => pose[key], set: () => {} });
    }
    hook.gearRef.current = 'D';
    hook.trafficRef.current = [];
    hook.pedsRef.current = [];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = [];
    hook.signalsRef.current = [];
    Object.assign(hook.tireDynamicsRef.current, { absEnabled: true, tread32: 7, psi: 32 });
    // Uniform cells are a deterministic road fixture: every actual wheel
    // sample receives pavement or grass, with no tree/collision interference.
    w.__surfaceBrakeCell = 0;
    hook.infiniteWorldRef.current.getCell = () => w.__surfaceBrakeCell;
  });

  await brakePedal(page, 0.5);
  await expect.poll(async () => {
    const state = await tireSnapshot(page);
    return state.brake > 0.4999 && state.brake <= 0.5 && state.surface === 'pavement';
  }).toBe(true);
  const pavement = await tireSnapshot(page);
  expect(pavement.contactCount).toBe(4);
  expect(pavement.offRoadFraction).toBe(0);
  expect(pavement.waterCoverage).toBe(0);
  expect(pavement.absActive).toBe(false);
  expect(pavement.wheelLocked).toBe(false);

  await page.evaluate(() => { (window as any).__surfaceBrakeCell = 2; });
  await expect.poll(async () => {
    const state = await tireSnapshot(page);
    return state.surface === 'grass' && state.absActive;
  }).toBe(true);
  const grassAbs = await tireSnapshot(page);
  expect(grassAbs.contactCount).toBe(4);
  expect(grassAbs.offRoadFraction).toBe(1);
  expect(grassAbs.waterCoverage).toBe(0);
  expect(grassAbs.brake).toBeCloseTo(pavement.brake, 2);
  expect(grassAbs.mu).toBeLessThan(pavement.mu);
  expect(grassAbs.wheelLocked).toBe(false);

  await page.evaluate(() => {
    (window as any).__testHooks.roadReady.tireDynamicsRef.current.absEnabled = false;
  });
  await expect.poll(async () => {
    const state = await tireSnapshot(page);
    return state.surface === 'grass' && state.wheelLocked && !state.absActive;
  }).toBe(true);
  const grassLocked = await tireSnapshot(page);
  expect(grassLocked.brake).toBeCloseTo(grassAbs.brake, 2);
  expect(grassLocked.brakingMu).toBeLessThan(grassAbs.brakingMu);

  await brakePedal(page, 0);
  await expect.poll(async () => {
    const state = await tireSnapshot(page);
    return state.brake < 0.01 && !state.absActive && !state.wheelLocked;
  }).toBe(true);
  const released = await tireSnapshot(page);
  expect(released.surface).toBe('grass');
  expect(released.brakingMu).toBeLessThan(grassLocked.brakingMu);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
