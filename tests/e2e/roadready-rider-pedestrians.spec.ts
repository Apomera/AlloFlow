import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ trace: 'off', video: 'off' });
const evidence = process.env.RR_RIDER_EVIDENCE || 'tmp/roadready-rider-crossings-20261101';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const type of ['cyclist', 'motorcycle']) test(`a live ${type} stops for the actual walker and resumes after crossing`, async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; Math.random = () => 0.5; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'residential',
    scenario: 'residential', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.evaluate(type => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    const playerStation = RR.mainRoadLocalPoint(world, hook.carRef.current.x, hook.carRef.current.y).longitudinal;
    const authored = hook.pedsRef.current.filter((p: any) => p._curvedRoadFrame && p.crosswalkY != null)
      .sort((a: any, b: any) => Math.abs(a.crosswalkY - playerStation) - Math.abs(b.crosswalkY - playerStation))[0];
    if (!authored) throw Error('No authored streamed crossing');
    const station = authored.crosswalkY, sidewalk = Math.abs(authored._sidewalkOffset || 4.5);
    const profile = world.getChunk(Math.floor(station / 32));
    const lane = RR.vulnerableRoadUserLaneOffset(profile, type, -1, 2.8);
    const home = RR.mainRoadWorldPoint(world, station, sidewalk);
    const target = RR.mainRoadWorldPoint(world, station, -sidewalk);
    const pedestrian = { ...authored, ...home, homeX: home.x, homeY: home.y, kind: 'adult',
      crossing: true, waitingAtCrosswalk: true, crossDwell: 0, crossDirection: 1,
      sidewalkLeft: target.x, sidewalkRight: home.x, _roadStation: station,
      _sidewalkLateral: sidewalk, _crossTargetLateral: -sidewalk, _sidewalkOffset: sidewalk,
      _curvedRoadFrame: true, vx: 0, vy: 0 };
    const parked = RR.mainRoadWorldPoint(world, station, sidewalk + 18);
    Object.assign(hook.carRef.current, parked, { heading: -Math.PI / 2 - parked.heading, speed: 0 });
    hook.gearRef.current = 'P';
    for (const [ref, value] of [[hook.pedsRef, [pedestrian]], [hook.trafficRef, []], [hook.signalsRef, []]])
      Object.defineProperty(ref, 'current', { configurable: true, get: () => value, set: () => {} });
    hook.wildlifeRef.current = null; hook.emergencyRef.current = null;
    const distance = type === 'cyclist' ? 18 : 35, speed = type === 'cyclist' ? 6 : 12;
    const source = RR.mainRoadWorldPoint(world, station + distance, lane);
    const rider = { ...source, id: 'native-crossing-' + type, type,
      heading: -Math.PI / 2 - source.heading, speed, _cruiseSpeed: speed,
      _roadStation: station + distance, _bikeLane: lane };
    Object.defineProperty(hook.cyclistsRef, 'current', {
      configurable: true, get: () => [rider], set: () => {},
    });
    const size = RR.vulnerableRoadUserFootprint(rider);
    const report = w.__riderPedestrianReport = { type, startedAt: hook.timeRef.current, started: false,
      completed: false, stoppedSamples: 0, pedestrianContact: false, passedBeforeComplete: false,
      encounterLost: false, resumed: false, minimumGap: Infinity, largestDeceleration: 0,
      samples: 0, timeline: [] };
    let previousTime = hook.timeRef.current, previousSpeed = rider.speed;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const dt = live.timeRef.current - previousTime;
      if (dt > 0) {
        report.samples++;
        report.encounterLost ||= live.cyclistsRef.current[0] !== rider;
        report.started ||= pedestrian.crossing;
        report.completed ||= report.started && !pedestrian.crossing;
        report.pedestrianContact ||= RR.pointOverlapsVehicle(rider, size, pedestrian, 0.28);
        const stationNow = RR.mainRoadLocalPoint(world, rider.x, rider.y).longitudinal;
        if (stationNow < station && !report.completed) report.passedBeforeComplete = true;
        if (pedestrian.crossing) {
          const gap = (pedestrian.x - rider.x) * Math.cos(rider.heading) +
            (pedestrian.y - rider.y) * Math.sin(rider.heading) - size.length / 2 - 0.28;
          report.minimumGap = Math.min(report.minimumGap, gap);
          report.largestDeceleration = Math.max(report.largestDeceleration, (previousSpeed - rider.speed) / dt);
          if (rider.speed < 0.1) report.stoppedSamples++;
        }
        report.resumed ||= report.completed && stationNow < station - 4 && rider.speed > 2;
        if (Math.floor(live.timeRef.current) !== Math.floor(previousTime)) report.timeline.push({
          t: live.timeRef.current - report.startedAt, speed: rider.speed,
          crossing: pedestrian.crossing, lateral: pedestrian._sidewalkLateral, ahead: stationNow - station,
        });
        previousTime = live.timeRef.current; previousSpeed = rider.speed;
      }
      w.__riderPedestrianMonitor = requestAnimationFrame(sample);
    };
    w.__riderPedestrianMonitor = requestAnimationFrame(sample);
  }, type);
  await page.waitForFunction(() => {
    const r = (window as any).__riderPedestrianReport;
    return r.resumed || r.pedestrianContact || r.passedBeforeComplete || r.encounterLost;
  }, undefined, { timeout: 180_000 });
  const result = await page.evaluate(() => {
    const w = window as any; cancelAnimationFrame(w.__riderPedestrianMonitor);
    return { ...w.__riderPedestrianReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes,
      rendererCreated: !!w.__testHooks.roadReady.threeRef.current?.renderer, errors: w.__events.errors };
  });
  writeFileSync(evidence + '/browser-' + type + '-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.pedestrianContact).toBe(false); expect(result.passedBeforeComplete).toBe(false);
  expect(result.encounterLost).toBe(false); expect(result.started).toBe(true); expect(result.completed).toBe(true);
  expect(result.stoppedSamples).toBeGreaterThan(5); expect(result.resumed).toBe(true);
  expect(result.minimumGap).toBeGreaterThan(0.25);
  expect(result.largestDeceleration).toBeLessThanOrEqual(6.5 + 1e-5);
  expect(result.crashes).toBe(0); expect(result.rendererCreated).toBe(true); expect(result.errors).toEqual([]);
});
