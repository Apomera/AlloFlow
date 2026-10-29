import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('live roundabout traffic yields to the learner, then enters after clearance', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'roundabout', scenario: 'roundabout',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    const RR = (window as any).__RR_TEST_EXPORTS__.roadReady;
    // The inbound east lane joins the circulating lane at its southeast
    // diagonal, after the curved entry connector.
    Object.assign(hook.carRef.current, RR.roundaboutPose(-Math.PI / 4 + 0.2), { speed: 0 });
    hook.gearRef.current = 'P';
    const approach = RR.spawnRoundaboutTraffic({ traffic: 'medium' })
      .find((actor: any) => actor._roundaboutState === 'approach');
    const inbound = RR.roundaboutApproach(1);
    Object.assign(approach, {
      x: RR.MAP_SIZE / 2 + 20, y: inbound.y, heading: inbound.heading,
      speed: 18 * RR.MPH_TO_MS,
    });
    hook.trafficRef.current = [approach];
    hook.pedsRef.current = [];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = [];
    (window as any).__yieldStarted = hook.timeRef.current;
  });
  await page.waitForFunction(() => {
    const hook = (window as any).__testHooks.roadReady;
    return hook.timeRef.current - (window as any).__yieldStarted >= 7;
  });
  const held = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    const RR = (window as any).__RR_TEST_EXPORTS__.roadReady;
    const actor = hook.trafficRef.current[0];
    return { state: actor._roundaboutState, speed: actor.speed,
      frontRadius: actor.x - RR.MAP_SIZE / 2 - RR.vehicleFootprint(actor.type).length / 2,
      crashes: hook.statsRef.current.crashes };
  });
  expect(held.state).toBe('approach');
  expect(held.speed).toBeLessThan(0.1);
  expect(held.frontRadius).toBeGreaterThanOrEqual(10.5);
  expect(held.crashes).toBe(0);
  await page.screenshot({ path: 'tmp/roadready-accuracy/roundabout-yield.png' });
  await page.evaluate(() => {
    Object.assign((window as any).__testHooks.roadReady.carRef.current,
      { x: 49.75, y: 80, speed: 0, heading: -Math.PI / 2 });
  });
  await expect.poll(() => page.evaluate(() =>
    (window as any).__testHooks.roadReady.trafficRef.current[0]._roundaboutState
  )).toBe('circulating');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('live circulating traffic stops behind a parked learner and resumes after the lane clears', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'roundabout', scenario: 'roundabout',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const RR = w.__RR_TEST_EXPORTS__.roadReady;
    Object.assign(hook.carRef.current, RR.roundaboutPose(0), { speed: 0 });
    hook.gearRef.current = 'P';
    const follower = {
      ...RR.spawnRoundaboutTraffic({ traffic: 'medium' })[0],
      ...RR.roundaboutPose(2.5), id: 'live_stopped_learner_follower', type: 'car',
      speed: 18 * RR.MPH_TO_MS, _roundaboutState: 'circulating',
      _roundaboutAngle: 2.5, _roundaboutRadius: 8,
      _roundaboutTravel: 0, _roundaboutExitAfter: 100,
    };
    hook.trafficRef.current = [follower];
    hook.pedsRef.current = [];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = [];
    hook.signalsRef.current = [];
    w.__circleFollowingStarted = hook.timeRef.current;
    w.__circleFollowingOverlap = false;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const actor = live.trafficRef.current[0];
      if (actor) {
        w.__circleFollowingOverlap ||= RR.vehicleRectsOverlap(
          actor, RR.vehicleFootprint(actor.type), live.carRef.current, RR.vehicleFootprint('sedan'));
      }
      w.__circleFollowingMonitor = requestAnimationFrame(sample);
    };
    w.__circleFollowingMonitor = requestAnimationFrame(sample);
  });

  await page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__circleFollowingStarted >= 10;
  });
  const held = await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const actor = hook.trafficRef.current[0];
    return { state: actor._roundaboutState, speed: actor.speed,
      travel: actor._roundaboutTravel, overlap: w.__circleFollowingOverlap,
      crashes: hook.statsRef.current.crashes, learnerSpeed: hook.carRef.current.speed };
  });
  expect(held.state).toBe('circulating');
  expect(held.speed).toBeLessThan(0.1);
  expect(held.travel).toBeGreaterThan(0.5);
  expect(held.travel).toBeLessThan(2.5);
  expect(held.learnerSpeed).toBe(0);
  expect(held.overlap).toBe(false);
  expect(held.crashes).toBe(0);

  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    Object.assign(hook.carRef.current, { x: 49.75, y: 80, speed: 0, heading: -Math.PI / 2 });
    w.__circleFollowingReleased = hook.timeRef.current;
  });
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__circleFollowingReleased >= 3;
  });
  const resumed = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__circleFollowingMonitor);
    const hook = w.__testHooks.roadReady;
    const actor = hook.trafficRef.current[0];
    return { speed: actor.speed, travel: actor._roundaboutTravel,
      overlap: w.__circleFollowingOverlap, crashes: hook.statsRef.current.crashes };
  });
  expect(resumed.speed).toBeGreaterThan(2);
  expect(resumed.travel).toBeGreaterThan(held.travel + 0.3);
  expect(resumed.overlap).toBe(false);
  expect(resumed.crashes).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('live roundabout grading permits queued stops and waits for clear-road idling before deducting', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'roundabout', scenario: 'roundabout',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const RR = w.__RR_TEST_EXPORTS__.roadReady;
    Object.assign(hook.carRef.current, RR.roundaboutPose(0.9), { speed: 0 });
    hook.gearRef.current = 'P';
    const parkedLeader = (base: any, id: string) => {
      const pose = RR.roundaboutPose(0);
      const leader = { ...base, ...pose, id, speed: 0, _roundaboutState: 'circulating',
        _roundaboutAngle: 0, _roundaboutRadius: 8, _roundaboutTravel: 0, _roundaboutExitAfter: 100 };
      // Keep the obstruction parked while the real traffic, rider, and grading
      // loops run. No grader or movement helper is called from the fixture.
      for (const key of ['x', 'y', 'heading'] as const) {
        Object.defineProperty(leader, key, { configurable: true, get: () => pose[key], set: () => {} });
      }
      Object.defineProperty(leader, 'speed', { configurable: true, get: () => 0, set: () => {} });
      return leader;
    };
    hook.trafficRef.current = [parkedLeader(RR.spawnRoundaboutTraffic({ traffic: 'medium' })[0], 'parked-grade-leader')];
    const scenario = RR.SCENARIOS.find((candidate: any) => candidate.id === 'roundabout');
    w.__gradeQueueRider = parkedLeader(RR.spawnCyclists(scenario)[0], 'parked-grade-rider');
    hook.pedsRef.current = [];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = null;
    hook.signalsRef.current = [];
    hook.statsRef.current._roundaboutCompliance = { inCircle: true, lastAngle: 0.9 };
    w.__gradeQueueStageStarted = hook.timeRef.current;
  });

  const stopEvents = () => page.evaluate(() =>
    (window as any).__testHooks.roadReady.statsRef.current.driveEvents
      .filter((event: any) => event.type === 'roundabout_stopped_inside').length);
  const waitStage = (seconds: number) => page.waitForFunction((duration) => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__gradeQueueStageStarted >= duration;
  }, seconds);

  await waitStage(5);
  expect(await stopEvents()).toBe(0);
  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    hook.trafficRef.current = [];
    hook.cyclistsRef.current = [w.__gradeQueueRider];
    w.__gradeQueueStageStarted = hook.timeRef.current;
  });
  await waitStage(5);
  expect(await stopEvents()).toBe(0);
  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    hook.cyclistsRef.current = [];
    const report = w.__gradeQueueClearReport = {
      startedAt: hook.timeRef.current, lastClearElapsed: 0,
      firstEventElapsed: null, firstObservedElapsed: null,
    };
    // Observe the threshold within the animation frame. A round trip through
    // Playwright can take longer than the remaining 0.2-second grace window.
    const sample = () => {
      const live = w.__testHooks.roadReady;
      const elapsed = live.timeRef.current - report.startedAt;
      const event = live.statsRef.current.driveEvents
        .find((entry: any) => entry.type === 'roundabout_stopped_inside');
      if (event) {
        report.firstEventElapsed = event.t - report.startedAt;
        report.firstObservedElapsed = elapsed;
      } else {
        report.lastClearElapsed = elapsed;
        w.__gradeQueueClearMonitor = requestAnimationFrame(sample);
      }
    };
    w.__gradeQueueClearMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => (window as any).__gradeQueueClearReport.firstEventElapsed !== null);
  const timing = await page.evaluate(() => (window as any).__gradeQueueClearReport);
  expect(timing.lastClearElapsed).toBeGreaterThan(1.4);
  expect(timing.firstEventElapsed).toBeGreaterThanOrEqual(1.5 - 1e-6);
  expect(timing.firstEventElapsed).toBeLessThan(1.6);
  expect(timing.firstObservedElapsed).toBeGreaterThanOrEqual(timing.firstEventElapsed);
  expect(await stopEvents()).toBe(1);
  expect(await page.evaluate(() => (window as any).__testHooks.roadReady.statsRef.current.crashes)).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
