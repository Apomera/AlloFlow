import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
const evidence = process.env.RR_EMERGENCY_PEDESTRIAN_EVIDENCE || 'tmp/roadready-emergency-pedestrians-20261101';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  const report = await page.evaluate(() => (window as any).__emergencyPedestrianReport || null).catch(() => null);
  if (report) writeFileSync(evidence + '/browser-last-state.json', JSON.stringify(report, null, 2) + '\n');
  await harness.destroy(page);
});

test('a live fire truck brakes for the actual walker, holds its full body clear and resumes after crossing', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; Math.random = () => 0.5; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'residential',
    scenario: 'residential', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    const playerStation = RR.mainRoadLocalPoint(world, hook.carRef.current.x, hook.carRef.current.y).longitudinal;
    const authored = hook.pedsRef.current.filter((ped: any) => ped._curvedRoadFrame && ped.crosswalkY != null)
      .sort((a: any, b: any) => Math.abs(a.crosswalkY - playerStation) - Math.abs(b.crosswalkY - playerStation))[0];
    if (!authored) throw Error('No authored streamed pedestrian crossing');
    const station = authored.crosswalkY, sidewalk = Math.abs(authored._sidewalkOffset || 4.5);
    const lane = RR.roadLayoutFor(world.getChunk(Math.floor(station / 32))).laneCenters.at(-1);
    const home = RR.mainRoadWorldPoint(world, station, sidewalk);
    const target = RR.mainRoadWorldPoint(world, station, -sidewalk);
    const pedestrian = { ...authored, x: home.x, y: home.y, homeX: home.x, homeY: home.y,
      kind: 'adult', crossing: true, waitingAtCrosswalk: true, crossDwell: 0, crossDirection: 1,
      sidewalkLeft: target.x, sidewalkRight: home.x, _roadStation: station,
      _sidewalkLateral: sidewalk, _crossTargetLateral: -sidewalk, _sidewalkOffset: sidewalk,
      _curvedRoadFrame: true, vx: 0, vy: 0 };
    const parked = RR.mainRoadWorldPoint(world, station - 40, sidewalk + 6);
    Object.assign(hook.carRef.current, { x: parked.x, y: parked.y, heading: -Math.PI / 2 - parked.heading, speed: 0 });
    hook.gearRef.current = 'P';
    Object.defineProperty(hook.pedsRef, 'current', { configurable: true, get: () => [pedestrian], set: () => {} });
    for (const ref of [hook.trafficRef, hook.cyclistsRef, hook.signalsRef]) Object.defineProperty(ref, 'current', {
      configurable: true, get: () => [], set: () => {},
    });
    hook.wildlifeRef.current = null;
    const source = RR.mainRoadWorldPoint(world, station + 50, lane);
    const responder = { x: source.x, y: source.y, heading: -Math.PI / 2 - source.heading,
      speed: 18, _cruiseSpeed: 18, _roadStation: station + 50, _travelSign: -1,
      _laneOff: lane, _homeLaneOff: lane, kind: 'firetruck', icon: '🚒', color: '#dc2626',
      bodyColor: 0xcc2200, lightColor1: 0xff0000, lightColor2: 0xff4400,
      sirenFreq: 600, life: 120, checked: true, responded: true };
    hook.emergencyRef.current = responder;
    const report = w.__emergencyPedestrianReport = { startedAt: hook.timeRef.current, started: false,
      completed: false, stoppedSamples: 0, pedestrianContact: false, passedBeforeComplete: false,
      encounterLost: false, resumed: false, minimumGap: Infinity, largestDeceleration: 0,
      samples: 0, timeline: [] };
    let previousTime = hook.timeRef.current, previousSpeed = responder.speed;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const dt = live.timeRef.current - previousTime;
      if (dt > 0) {
        report.samples++;
        report.encounterLost ||= live.emergencyRef.current !== responder;
        report.started ||= pedestrian.crossing;
        report.completed ||= report.started && !pedestrian.crossing;
        report.pedestrianContact ||= RR.pointOverlapsVehicle(responder, RR.vehicleFootprint('firetruck'), pedestrian, 0.28);
        const sourceStation = RR.mainRoadLocalPoint(world, responder.x, responder.y).longitudinal;
        if (sourceStation < station && !report.completed) report.passedBeforeComplete = true;
        if (pedestrian.crossing) {
          const gap = (pedestrian.x - responder.x) * Math.cos(responder.heading) +
            (pedestrian.y - responder.y) * Math.sin(responder.heading) - 3.75 - 0.28;
          report.minimumGap = Math.min(report.minimumGap, gap);
          report.largestDeceleration = Math.max(report.largestDeceleration, (previousSpeed - responder.speed) / dt);
          if (responder.speed < 0.1) report.stoppedSamples++;
        }
        report.resumed ||= report.completed && sourceStation < station - 5 && responder.speed > 3;
        if (Math.floor(live.timeRef.current) !== Math.floor(previousTime)) report.timeline.push({
          t: live.timeRef.current - report.startedAt, speed: responder.speed,
          pedestrianCrossing: pedestrian.crossing, pedestrianLateral: pedestrian._sidewalkLateral,
          aheadOfCrossing: sourceStation - station,
        });
        previousTime = live.timeRef.current; previousSpeed = responder.speed;
      }
      w.__emergencyPedestrianMonitor = requestAnimationFrame(sample);
    };
    w.__emergencyPedestrianMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => {
    const report = (window as any).__emergencyPedestrianReport;
    return report.resumed || report.pedestrianContact || report.passedBeforeComplete || report.encounterLost;
  }, undefined, { timeout: 180_000 });
  const result = await page.evaluate(() => {
    const w = window as any; cancelAnimationFrame(w.__emergencyPedestrianMonitor);
    return { ...w.__emergencyPedestrianReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes, errors: w.__events.errors };
  });
  writeFileSync(evidence + '/browser-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.pedestrianContact).toBe(false);
  expect(result.passedBeforeComplete).toBe(false); expect(result.encounterLost).toBe(false);
  expect(result.started).toBe(true); expect(result.completed).toBe(true);
  expect(result.stoppedSamples).toBeGreaterThan(5); expect(result.resumed).toBe(true);
  expect(result.minimumGap).toBeGreaterThan(0.25);
  expect(result.largestDeceleration).toBeLessThanOrEqual(6.5 + 1e-5);
  expect(result.crashes).toBe(0); expect(result.errors).toEqual([]);
});
