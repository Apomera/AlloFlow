import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('a live pedestrian waits for equivalent approaching headings and crosses only after traffic recedes', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'residential', scenario: 'residential',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => {
    const hook = (window as any).__testHooks?.roadReady;
    return hook?.timeRef.current >= 4.2 && !!hook.infiniteWorldRef.current?.spline;
  });

  const fixture = await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    const car = hook.carRef.current;
    const station = RR.mainRoadLocalPoint(world, car.x, car.y).longitudinal;
    const learnerPoint = RR.mainRoadWorldPoint(world, station, 1.75);
    const crossingStation = station - 5;
    const home = RR.mainRoadWorldPoint(world, crossingStation, 4.5);
    const left = RR.mainRoadWorldPoint(world, crossingStation, -4.5);
    const northHeading = -Math.PI / 2 - world.spline.headingAt(station);
    const setup = w.__pedestrianApproachFixture = {
      x: learnerPoint.x, y: learnerPoint.y, heading: northHeading, speed: 6,
      northHeading, crossingStation, stage: 'normal', stageStarted: hook.timeRef.current,
    };
    // Freeze position while supplying a measured approach velocity to the real
    // scanner. Only the heading representation/direction changes between stages.
    // The pedestrian itself remains fully controlled by the animation loop.
    for (const key of ['x', 'y', 'heading', 'speed'] as const) {
      Object.defineProperty(car, key, { configurable: true,
        get: () => setup[key], set: () => {} });
    }
    hook.gearRef.current = 'D';
    hook.trafficRef.current = [];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = null;
    hook.signalsRef.current = [];
    hook.pedsRef.current = [{
      x: home.x, y: home.y, homeX: home.x, homeY: home.y,
      vx: 0, vy: 0, kind: 'adult', color: '#ec4899',
      crossing: false, waitingAtCrosswalk: true,
      crosswalkY: crossingStation, crossDirection: 1, crossDwell: 0,
      sidewalkLeft: left.x, sidewalkLeftY: left.y,
      sidewalkRight: home.x, sidewalkRightY: home.y,
      _roadStation: crossingStation, _sidewalkLateral: 4.5,
      _sidewalkOffset: 4.5, _curvedRoadFrame: true,
    }];
    const report = w.__pedestrianApproachReport = {
      sawCrossingWhileApproaching: false, sawCrossingAfterRelease: false,
      waitingFrames: 0, walkingSamples: 0, minWalkingSpeed: Infinity, maxWalkingSpeed: 0,
      maxWaitingLateralChange: 0, overlap: false,
    };
    let previous = { time: hook.timeRef.current, lateral: 4.5, crossing: false };
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const person = live.pedsRef.current[0];
      const time = live.timeRef.current;
      if (person && time > previous.time) {
        report.overlap ||= RR.pointOverlapsVehicle(live.carRef.current,
          RR.vehicleFootprint('sedan'), person, 0.28);
        if (setup.stage !== 'receding') {
          report.waitingFrames++;
          report.sawCrossingWhileApproaching ||= person.crossing;
          report.maxWaitingLateralChange = Math.max(report.maxWaitingLateralChange,
            Math.abs(person._sidewalkLateral - 4.5));
        } else {
          report.sawCrossingAfterRelease ||= person.crossing;
          if (previous.crossing && person.crossing) {
            const speed = Math.abs(person._sidewalkLateral - previous.lateral) / (time - previous.time);
            report.walkingSamples++;
            report.minWalkingSpeed = Math.min(report.minWalkingSpeed, speed);
            report.maxWalkingSpeed = Math.max(report.maxWalkingSpeed, speed);
          }
        }
        previous = { time, lateral: person._sidewalkLateral, crossing: person.crossing };
      }
      w.__pedestrianApproachMonitor = requestAnimationFrame(sample);
    };
    w.__pedestrianApproachMonitor = requestAnimationFrame(sample);
    const roadFrame = RR.mainRoadLocalPoint(world, car.x, car.y);
    const along = car.speed * (Math.cos(car.heading) * Math.sin(roadFrame.heading) +
      Math.sin(car.heading) * Math.cos(roadFrame.heading));
    return { gap: roadFrame.longitudinal - crossingStation, along };
  });
  expect(fixture.gap).toBeCloseTo(5, 2);
  expect(fixture.along).toBeLessThan(-5.9);

  for (const stage of ['normal', 'wrapped', 'reversing'] as const) {
    await page.evaluate((stageName) => {
      const w = window as any;
      const hook = w.__testHooks.roadReady;
      const fixture = w.__pedestrianApproachFixture;
      fixture.stage = stageName;
      fixture.stageStarted = hook.timeRef.current;
      fixture.heading = fixture.northHeading + (stageName === 'normal' ? 0 : 2 * Math.PI) +
        (stageName === 'reversing' ? Math.PI : 0);
      fixture.speed = stageName === 'reversing' ? -6 : 6;
      hook.gearRef.current = stageName === 'reversing' ? 'R' : 'D';
    }, stage);
    await page.waitForFunction(() => {
      const w = window as any;
      return w.__testHooks.roadReady.timeRef.current - w.__pedestrianApproachFixture.stageStarted >= 2;
    }, undefined, { timeout: 60_000 });
    const held = await page.evaluate(() => {
      const w = window as any;
      const person = w.__testHooks.roadReady.pedsRef.current[0];
      return { crossing: person.crossing, lateral: person._sidewalkLateral,
        entered: w.__pedestrianApproachReport.sawCrossingWhileApproaching };
    });
    expect(held, stage).toEqual({ crossing: false, lateral: 4.5, entered: false });
  }

  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const fixture = w.__pedestrianApproachFixture;
    fixture.stage = 'receding';
    fixture.stageStarted = hook.timeRef.current;
    fixture.heading = fixture.northHeading + Math.PI + 2 * Math.PI;
    fixture.speed = 6;
    hook.gearRef.current = 'D';
  });
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__pedestrianApproachReport.sawCrossingAfterRelease &&
      w.__testHooks.roadReady.timeRef.current - w.__pedestrianApproachFixture.stageStarted >= 2;
  }, undefined, { timeout: 60_000 });
  const released = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__pedestrianApproachMonitor);
    const hook = w.__testHooks.roadReady;
    const person = hook.pedsRef.current[0];
    return { ...w.__pedestrianApproachReport,
      crossing: person.crossing, lateral: person._sidewalkLateral,
      stationError: Math.abs(person._roadStation - w.__pedestrianApproachFixture.crossingStation),
      crashes: hook.statsRef.current.crashes,
    };
  });
  expect(released.waitingFrames).toBeGreaterThan(10);
  expect(released.maxWaitingLateralChange).toBe(0);
  expect(released.sawCrossingWhileApproaching).toBe(false);
  expect(released.sawCrossingAfterRelease).toBe(true);
  expect(released.crossing).toBe(true);
  // Timing is sampled in the animation frame below. Permit browser command
  // latency here while still requiring clear progress into the crossing.
  expect(released.lateral).toBeGreaterThan(0);
  expect(released.lateral).toBeLessThan(3);
  expect(released.stationError).toBeLessThan(1e-6);
  expect(released.walkingSamples).toBeGreaterThan(5);
  expect(released.minWalkingSpeed).toBeGreaterThan(1.18);
  expect(released.maxWalkingSpeed).toBeLessThan(1.22);
  expect(released.overlap).toBe(false);
  expect(released.crashes).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
