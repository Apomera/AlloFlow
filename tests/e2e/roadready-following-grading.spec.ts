import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('live following grading accounts for a bus body and deducts by elapsed simulation time', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'residential',
    scenario: 'residential', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const car = hook.carRef.current, world = hook.infiniteWorldRef.current;
    const frame = RR.mainRoadLocalPoint(world, car.x, car.y);
    const sign = Math.cos(car.heading) * Math.sin(frame.heading) +
      Math.sin(car.heading) * Math.cos(frame.heading) < 0 ? -1 : 1;
    const poseAt = (distance: number) => {
      const pose = RR.mainRoadWorldPoint(world, frame.longitudinal + distance * sign, frame.lateral);
      return { x: pose.x, y: pose.y,
        heading: (sign > 0 ? Math.PI / 2 : -Math.PI / 2) - pose.heading };
    };
    const carPose = poseAt(0), leadPose = poseAt(17);
    // Pin only the actors' known poses and speeds. The production animation
    // loop, following assessor, event capture, and score update all run freely.
    for (const [key, value] of Object.entries({ ...carPose, speed: 10 })) {
      Object.defineProperty(car, key, { configurable: true, get: () => value, set: () => {} });
    }
    const lead = { ...hook.trafficRef.current[0], type: 'schoolbus', id: 'following-grade-bus',
      crossStreet: false, _turning: false, _closeFollowFlagged: false };
    for (const [key, value] of Object.entries({ ...leadPose, speed: 10 })) {
      Object.defineProperty(lead, key, { configurable: true, get: () => value, set: () => {} });
    }
    hook.trafficRef.current = [lead]; hook.pedsRef.current = []; hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = null; hook.signalsRef.current = []; hook.gearRef.current = 'D';
    const report = w.__followingGradeReport = {
      started: hook.timeRef.current, initialScore: hook.statsRef.current.safetyScore,
      initialFollows: hook.statsRef.current.closeFollows, centerDistance: Math.hypot(lead.x - car.x, lead.y - car.y),
      done: false, elapsed: 0, scoreLoss: 0, closeFollows: 0, events: [], crashes: 0,
    };
    const sample = () => {
      report.elapsed = hook.timeRef.current - report.started;
      if (report.elapsed < 2) { requestAnimationFrame(sample); return; }
      report.scoreLoss = report.initialScore - hook.statsRef.current.safetyScore;
      report.closeFollows = hook.statsRef.current.closeFollows - report.initialFollows;
      report.events = hook.statsRef.current.driveEvents.filter((event: any) =>
        event.type === 'tailgate' && event.t >= report.started);
      report.crashes = hook.statsRef.current.crashes;
      report.done = true;
    };
    requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => (window as any).__followingGradeReport?.done);
  const report = await page.evaluate(() => (window as any).__followingGradeReport);
  expect(report.closeFollows).toBe(1);
  expect(report.events).toHaveLength(1);
  expect(report.scoreLoss).toBeCloseTo(6 * report.elapsed, 5);
  expect(report.events[0].leadDistanceFt).toBeGreaterThan(20);
  // Body clearance must be materially below center spacing. Exact path length
  // is verified by the independent curved-road model regressions.
  expect(report.events[0].leadDistanceFt).toBeLessThan((report.centerDistance - 6) * 3.28084);
  expect(report.crashes).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
