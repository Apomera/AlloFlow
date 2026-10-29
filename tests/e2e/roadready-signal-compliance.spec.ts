import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('live signal grading follows a bus front on a curved road and distinguishes backing out from entry', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'rural',
    scenario: 'rural', vehicle: 'school_bus', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('rural', 'school_bus'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    let chosen: any = null;
    // Use a real authored intersection and its painted stop bar. Find one
    // whose heading makes the old station-plus-half-length error measurable.
    for (let index = -60; index <= 60 && !chosen; index += 6) {
      const chunk = world.getChunk(index);
      if (!chunk.hasIntersection) continue;
      const signalStation = index * 32 + chunk.intersectionY;
      for (const direction of [-1, 1]) {
        const lineStation = signalStation - direction * 4.1;
        const line = RR.mainRoadWorldPoint(world, lineStation, -direction * 1.5);
        const forward = { x: direction * Math.sin(line.heading), y: direction * Math.cos(line.heading) };
        const center = { x: line.x - forward.x * 5.2, y: line.y - forward.y * 5.2 };
        const centerFrame = RR.mainRoadLocalPoint(world, center.x, center.y);
        const frontFrame = RR.mainRoadLocalPoint(world, line.x - forward.x * 0.2, line.y - forward.y * 0.2);
        const oldOvershoot = (centerFrame.longitudinal + direction * 5 - lineStation) * direction;
        if (oldOvershoot > 0.2 && oldOvershoot < 0.85 &&
            (frontFrame.longitudinal - lineStation) * direction < -0.1 &&
            Math.abs(centerFrame.lateral + direction * 1.5) < 0.4) {
          chosen = { index, signalStation, line, forward, direction, oldOvershoot }; break;
        }
      }
    }
    if (!chosen) throw new Error('No suitable authored curved intersection for signal regression');
    const fixture = w.__signalAccuracy = { ...chosen, gap: 1.2, speed: 1, state: 'red',
      stageStarted: hook.timeRef.current, baselineViolations: 0, baselineScore: 0 };
    const car = hook.carRef.current;
    const pose = () => ({ x: chosen.line.x - chosen.forward.x * (5 + fixture.gap),
      y: chosen.line.y - chosen.forward.y * (5 + fixture.gap),
      heading: Math.atan2(chosen.forward.y, chosen.forward.x), speed: fixture.speed });
    for (const key of ['x', 'y', 'heading', 'speed']) {
      Object.defineProperty(car, key, { configurable: true, get: () => pose()[key], set: () => {} });
    }
    const signal = { x: world.spline.centerAt(chosen.signalStation), y: chosen.signalStation,
      _chunk: chosen.index, type: 'light', timer: 0, greenDur: 1000, redDur: 1000, yellowDur: 3 };
    Object.defineProperty(signal, 'state', { configurable: true, get: () => fixture.state, set: () => {} });
    // Keep one controlled indication while streaming the selected real road;
    // its ordinary rural stop-sign actor must not grade the same line twice.
    Object.defineProperty(hook.signalsRef, 'current', { configurable: true,
      get: () => [signal], set: () => {} });
    hook.trafficRef.current = []; hook.pedsRef.current = [];
    hook.cyclistsRef.current = []; hook.wildlifeRef.current = null; hook.emergencyRef.current = null;
    hook.gearRef.current = 'D';
  });
  const waitStage = () => page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__signalAccuracy.stageStarted > 0.45;
  }, undefined, { timeout: 90_000 });
  await waitStage();
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, fixture = w.__signalAccuracy;
    fixture.baselineViolations = hook.statsRef.current.majorViolations || 0;
    fixture.baselineScore = hook.statsRef.current.safetyScore;
    fixture.gap = 0.2; fixture.stageStarted = hook.timeRef.current;
  });
  await waitStage();
  const violations = () => page.evaluate(() => {
    const w = window as any;
    return (w.__testHooks.roadReady.statsRef.current.majorViolations || 0) - w.__signalAccuracy.baselineViolations;
  });
  expect(await violations()).toBe(0);
  await page.screenshot({ path: 'tmp/roadready-accuracy/curved-signal-stopline.png' });
  await page.evaluate(() => {
    const w = window as any, fixture = w.__signalAccuracy;
    fixture.state = 'green'; fixture.gap = -0.4;
    fixture.stageStarted = w.__testHooks.roadReady.timeRef.current;
  });
  await waitStage();
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, fixture = w.__signalAccuracy;
    fixture.state = 'red'; fixture.gap = 0.4; fixture.speed = -1;
    hook.gearRef.current = 'R'; fixture.stageStarted = hook.timeRef.current;
  });
  await waitStage();
  expect(await violations()).toBe(0);
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, fixture = w.__signalAccuracy;
    fixture.gap = -0.4; fixture.speed = 1;
    hook.gearRef.current = 'D'; fixture.stageStarted = hook.timeRef.current;
  });
  await waitStage();
  expect(await violations()).toBe(1);
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.__signalAccuracy.baselineScore - w.__testHooks.roadReady.statsRef.current.safetyScore;
  })).toBe(25);
  expect(await page.evaluate(() => (window as any).__testHooks.roadReady.statsRef.current.crashes)).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
