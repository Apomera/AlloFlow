import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('live AI measures following clearance along the curved road and slows when that clearance shrinks', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__RR_TEST_EXPORTS__ = {};
    Math.random = () => 0.5;
  });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'rural', scenario: 'rural',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('rural', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => {
    const hook = (window as any).__testHooks?.roadReady;
    return hook?.timeRef.current >= 4.2 && !!hook.infiniteWorldRef.current?.spline;
  }, undefined, { timeout: 90_000 });

  const geometry = await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    // The authored rural seed has 32.76m of lane between stations 50 and 17.7,
    // although its world-Y station difference is only 32.30. At 10m/s the
    // controller's 32.5m following threshold must use the physical lane length.
    const fixture = w.__aiPhysicalGapFixture = {
      followerStation: 50, leaderStation: 17.7, stage: 'clear',
      startedAt: hook.timeRef.current,
    };
    const report = w.__aiPhysicalGapReport = {
      clear: { frames: 0, minCommand: Infinity, maxCommand: 0, maxSlowFor: 0 },
      close: { frames: 0, minCommand: Infinity, maxCommand: 0, maxSlowFor: 0 },
      overlap: false,
    };
    const pose = (station: number) => {
      const point = RR.mainRoadWorldPoint(world, station, 1.6);
      return { x: point.x, y: point.y, heading: -Math.PI / 2 - point.heading };
    };
    const actor = (id: string, isFollower: boolean) => {
      const vehicle: any = { id, type: 'car', color: isFollower ? '#ef4444' : '#3b82f6',
        laneOffset: 1.6, personality: { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 } };
      // Hold measured velocity and geometry fixed while the real traffic loop
      // makes its decisions. Record its speed requests; never call the updater.
      for (const key of ['x', 'y', 'heading'] as const) {
        Object.defineProperty(vehicle, key, { configurable: true,
          get: () => pose(isFollower ? fixture.followerStation : fixture.leaderStation)[key],
          set: () => {} });
      }
      Object.defineProperty(vehicle, 'speed', { configurable: true, get: () => 10,
        set: (command: number) => {
          if (!isFollower || !Number.isFinite(command)) return;
          const stage = report[fixture.stage as 'clear' | 'close'];
          stage.minCommand = Math.min(stage.minCommand, command);
          stage.maxCommand = Math.max(stage.maxCommand, command);
        } });
      return vehicle;
    };
    const follower = actor('physical-gap-follower', true);
    const leader = actor('physical-gap-leader', false);
    hook.trafficRef.current = [follower, leader];
    hook.pedsRef.current = [];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = null;
    hook.signalsRef.current = [];
    Object.assign(hook.carRef.current, RR.mainRoadWorldPoint(world, 50, 15),
      { speed: 0, heading: -Math.PI / 2 });
    hook.gearRef.current = 'P';

    let previousTime = hook.timeRef.current;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const time = live.timeRef.current;
      if (time > previousTime) {
        const stage = report[fixture.stage as 'clear' | 'close'];
        stage.frames++;
        stage.maxSlowFor = Math.max(stage.maxSlowFor, follower._slowFor || 0);
        report.overlap ||= RR.vehicleRectsOverlap(follower, RR.vehicleFootprint('car'),
          leader, RR.vehicleFootprint('car'));
        previousTime = time;
      }
      w.__aiPhysicalGapMonitor = requestAnimationFrame(sample);
    };
    w.__aiPhysicalGapMonitor = requestAnimationFrame(sample);

    const state = RR.followingVehicleRoadState(world, follower, leader, 1);
    // Independent fine polyline measurement validates the fixture without
    // using the physical-distance helper being tested by the controller.
    let laneDistance = 0;
    let previous = RR.mainRoadWorldPoint(world, fixture.followerStation, 1.6);
    for (let index = 1; index <= 1000; index++) {
      const station = fixture.followerStation +
        (fixture.leaderStation - fixture.followerStation) * index / 1000;
      const next = RR.mainRoadWorldPoint(world, station, 1.6);
      laneDistance += Math.hypot(next.x - previous.x, next.y - previous.y);
      previous = next;
    }
    return { seed: world.seed, stationGap: state.ahead, laneDistance,
      targetGap: RR.recommendedFollowingMeters(10, 'clear', 1), sameLane: state.sameLane };
  });
  expect(geometry.sameLane).toBe(true);
  expect(geometry.stationGap).toBeLessThan(geometry.targetGap - 0.1);
  expect(geometry.laneDistance).toBeGreaterThan(geometry.targetGap + 0.15);

  const waitStage = () => page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__aiPhysicalGapFixture.startedAt >= 1.5;
  }, undefined, { timeout: 60_000 });
  await waitStage();
  const clear = await page.evaluate(() => (window as any).__aiPhysicalGapReport.clear);
  expect(clear.frames).toBeGreaterThan(5);
  expect(clear.maxSlowFor).toBe(0);
  expect(clear.minCommand).toBeGreaterThanOrEqual(10 - 1e-8);
  expect(clear.maxCommand).toBeGreaterThan(10);

  await page.evaluate(() => {
    const w = window as any;
    const fixture = w.__aiPhysicalGapFixture;
    fixture.leaderStation = 28;
    fixture.stage = 'close';
    fixture.startedAt = w.__testHooks.roadReady.timeRef.current;
  });
  await waitStage();
  const result = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__aiPhysicalGapMonitor);
    return { ...w.__aiPhysicalGapReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes };
  });
  expect(result.close.frames).toBeGreaterThan(5);
  expect(result.close.maxSlowFor).toBe(1);
  expect(result.close.minCommand).toBeLessThan(10);
  expect(result.overlap).toBe(false);
  expect(result.crashes).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
