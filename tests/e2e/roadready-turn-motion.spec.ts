import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 640, height: 480,
  preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('live committed turns hold at zero speed and resume along their physical curve distance', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__RR_TEST_EXPORTS__ = {};
    Math.random = () => 0.5;
  });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', scenario: 'residential',
    pendingScenario: 'residential', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });

  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current, junctions: any[] = [];
    for (let index = 0; index <= 30 && junctions.length < 2; index++) {
      const chunk = world.getChunk(index), station = index * 32 + chunk.intersectionY;
      if (chunk.hasIntersection && Math.abs(world.spline.headingAt(station)) > 0.01) {
        junctions.push({ index, station, x: world.spline.centerAt(station),
          theta: world.spline.headingAt(station) });
      }
    }
    if (junctions.length !== 2) throw new Error('Need two authored curved-road junctions');
    const parked = RR.mainRoadWorldPoint(world, (junctions[0].station + junctions[1].station) / 2, 9);
    Object.assign(hook.carRef.current, { x: parked.x, y: parked.y,
      heading: -Math.PI / 2 - parked.heading, speed: 0 });
    hook.gearRef.current = 'P';
    const signals = junctions.map(junction => ({ x: junction.x, y: junction.station,
      type: 'uncontrolled', _chunk: junction.index }));
    const actors = junctions.map((junction, index) => {
      const cross = RR.crossStreetPose(junction.x, junction.station, junction.theta, 6.5, 40);
      const actor: any = { id: 'live-turn-' + index, type: 'schoolbus', speed: 0,
        _stopArmActive: true, _busCycleTimer: 1000, _childSpawned: true,
        _turning: true, _turnProgress: 0.2, _turnIntent: index === 0 ? 'right' : 'left',
        _turnSignal: signals[index], _chunk: junction.index, color: '#fbbf24',
        personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } };
      if (index === 0) {
        Object.assign(actor, RR.mainRoadWorldPoint(world, junction.station - 2.2, -1.5),
          { heading: Math.PI / 2 - junction.theta, laneOffset: -1.5,
            _turnCrossPose: cross, _turnCrossDirection: 1 });
        actor._turnPath = RR.createIntersectionTurnPath(actor.x, actor.y, actor.heading, cross, 1, 'right');
        actor._turnTarget = actor._turnPath.endHeading;
      } else {
        Object.assign(actor, RR.crossStreetWorldPoint(cross, -2.2, 1.5),
          { heading: RR.crossStreetTravelHeading(cross, 1), laneOffset: 1.5,
            crossStreet: true, _crossPose: cross, _crossDirection: 1 });
        actor._turnPath = RR.createCrossToMainTurnPath(world, signals[index], actor, 'left');
      }
      Object.assign(actor, (RR.intersectionTurnPose || RR.intersectionTurnPoint)(actor._turnPath, 0.2));
      return actor;
    });
    // Streaming may add unrelated traffic; retain only these live participant
    // objects while the real mounted simulation and its renderer update them.
    Object.defineProperty(hook.trafficRef, 'current', { configurable: true,
      get: () => actors.slice(), set: () => {} });
    Object.defineProperty(hook.signalsRef, 'current', { configurable: true,
      get: () => signals.slice(), set: () => {} });
    for (const ref of [hook.pedsRef, hook.cyclistsRef]) {
      Object.defineProperty(ref, 'current', { configurable: true, get: () => [], set: () => {} });
    }
    hook.wildlifeRef.current = null; hook.emergencyRef.current = null;
    const references = actors.map(actor => {
      const path = actor._turnPath, points = [RR.intersectionTurnPoint(path, 0)], distances = [0];
      for (let i = 1; i <= 4096; i++) {
        points.push(RR.intersectionTurnPoint(path, i / 4096));
        distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y));
      }
      return { path, points, distances, length: distances[4096], start: { x: actor.x, y: actor.y,
        heading: actor.heading, progress: actor._turnProgress } };
    });
    const report = w.__turnMotionReport = { started: hook.timeRef.current, releaseStarted: null,
      heldSamples: 0, movingSamples: 0, maximumHeldDisplacement: 0, maximumHeldHeadingChange: 0,
      maximumHeldProgressChange: 0, maximumHeldSpeed: 0, maximumCurveError: 0,
      completed: [false, false], destinationCrossStreet: [null, null], laneOffsets: [null, null] };
    w.__turnMotionActors = actors;
    let previousTime = hook.timeRef.current;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      if (live.timeRef.current > previousTime) {
        if (report.releaseStarted == null) report.heldSamples++;
        else report.movingSamples++;
        actors.forEach((actor, index) => {
          const reference = references[index];
          if (report.releaseStarted == null) {
            report.maximumHeldDisplacement = Math.max(report.maximumHeldDisplacement,
              Math.hypot(actor.x - reference.start.x, actor.y - reference.start.y));
            report.maximumHeldHeadingChange = Math.max(report.maximumHeldHeadingChange,
              Math.abs(actor.heading - reference.start.heading));
            report.maximumHeldProgressChange = Math.max(report.maximumHeldProgressChange,
              Math.abs(actor._turnProgress - reference.start.progress));
            report.maximumHeldSpeed = Math.max(report.maximumHeldSpeed, Math.abs(actor.speed));
          } else if (actor._turning) {
            const distance = actor._turnProgress * reference.length;
            let lo = 0, hi = 4096;
            while (hi - lo > 1) {
              const middle = (lo + hi) >> 1;
              if (reference.distances[middle] < distance) lo = middle; else hi = middle;
            }
            const part = (distance - reference.distances[lo]) /
              Math.max(1e-12, reference.distances[hi] - reference.distances[lo]);
            const expected = RR.intersectionTurnPoint(reference.path, (lo + part) / 4096);
            report.maximumCurveError = Math.max(report.maximumCurveError,
              Math.hypot(actor.x - expected.x, actor.y - expected.y));
          } else if (!report.completed[index]) {
            report.completed[index] = true;
            report.destinationCrossStreet[index] = !!actor.crossStreet;
            report.laneOffsets[index] = actor.laneOffset;
          }
        });
        previousTime = live.timeRef.current;
      }
      w.__turnMotionMonitor = requestAnimationFrame(sample);
    };
    w.__turnMotionMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__turnMotionReport.started >= 2;
  }, undefined, { timeout: 90_000 });
  const held = await page.evaluate(() => ({ ...(window as any).__turnMotionReport }));
  expect(held.heldSamples).toBeGreaterThan(15);
  expect(held.maximumHeldSpeed).toBe(0);
  expect(held.maximumHeldProgressChange).toBe(0);
  expect(held.maximumHeldDisplacement).toBeLessThan(1e-9);
  expect(held.maximumHeldHeadingChange).toBeLessThan(1e-9);
  await page.evaluate(() => {
    const w = window as any;
    w.__turnMotionReport.releaseStarted = w.__testHooks.roadReady.timeRef.current;
    w.__turnMotionActors.forEach((actor: any) => { actor._stopArmActive = false; });
  });
  await page.waitForFunction(() => (window as any).__turnMotionReport.completed.every(Boolean),
    undefined, { timeout: 120_000 });
  const result = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__turnMotionMonitor);
    return { ...w.__turnMotionReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes,
      errors: w.__events.errors };
  });
  writeFileSync('tmp/roadready-turn-pass/browser-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.movingSamples).toBeGreaterThan(15);
  expect(result.maximumCurveError).toBeLessThan(0.002);
  expect(result.destinationCrossStreet).toEqual([true, false]);
  expect(result.laneOffsets[0]).toBe(1.5);
  expect(result.laneOffsets[1]).toBeGreaterThan(0);
  expect(result.crashes).toBe(0);
  expect(result.errors).toEqual([]);
});
