import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780,
  preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('ordinary streamed traffic stops for a far-curb walker, keeps its queue clear, then resumes', async ({ page }) => {
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
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    const playerStation = RR.mainRoadLocalPoint(world, hook.carRef.current.x, hook.carRef.current.y).longitudinal;
    const authored = hook.pedsRef.current.filter((p: any) => p._curvedRoadFrame && p.crosswalkY != null)
      .sort((a: any, b: any) => Math.abs(a.crosswalkY - playerStation) - Math.abs(b.crosswalkY - playerStation))[0];
    if (!authored) throw new Error('Expected an authored streamed pedestrian crossing');
    const crossingStation = authored.crosswalkY;
    const sidewalk = Math.abs(authored._sidewalkOffset || 4.5);
    const home = RR.mainRoadWorldPoint(world, crossingStation, -sidewalk);
    const target = RR.mainRoadWorldPoint(world, crossingStation, sidewalk);
    hook.pedsRef.current = [{ ...authored, x: home.x, y: home.y, homeX: home.x, homeY: home.y,
      vx: 0, vy: 0, kind: 'adult', crossing: false, waitingAtCrosswalk: true, crossDwell: 0,
      crossDirection: -1, sidewalkLeft: home.x, sidewalkLeftY: home.y,
      sidewalkRight: target.x, sidewalkRightY: target.y, _roadStation: crossingStation,
      _sidewalkLateral: -sidewalk, _sidewalkOffset: sidewalk, _curvedRoadFrame: true }];
    const parked = RR.mainRoadWorldPoint(world, crossingStation + 8, sidewalk + 4);
    Object.assign(hook.carRef.current, { x: parked.x, y: parked.y,
      heading: -Math.PI / 2 - parked.heading, speed: 0 });
    hook.gearRef.current = 'P'; hook.signalsRef.current = [];
    hook.cyclistsRef.current = []; hook.wildlifeRef.current = null; hook.emergencyRef.current = null;
    hook.trafficRef.current = [25, 38, 51].map((distance, index) => {
      const station = crossingStation + distance, point = RR.mainRoadWorldPoint(world, station, 1.5);
      return { id: 'live-ped-queue-' + index, type: index === 1 ? 'schoolbus' : 'car',
        x: point.x, y: point.y, heading: -Math.PI / 2 - point.heading, laneOffset: 1.5,
        _roadStation: station, speed: 10.5, color: ['#ef4444', '#fbbf24', '#3b82f6'][index],
        _busCycleTimer: 100, _stopArmActive: false,
        personality: { speedBias: 1, followMult: 1.2, aggro: 0, rollsStops: 0 } };
    });
    // Streaming can append unrelated actors after relocating the learner.
    // Observe these actual objects throughout the encounter, not array length
    // or IDs that the normal recycling controller may later replace.
    const pedestrian = hook.pedsRef.current[0];
    const actors = hook.trafficRef.current.slice();
    const report = w.__aiPedestrianReport = { started: false, completed: false, stopped: [false, false, false],
      pedestrianContact: false, vehicleContact: false, passedBeforeComplete: false, resumed: false };
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      if (live.pedsRef.current.includes(pedestrian)) {
        report.started ||= pedestrian.crossing;
        report.completed ||= report.started && !pedestrian.crossing;
        actors.forEach((actor: any, index: number) => {
          if (actor.speed < 0.1) report.stopped[index] = true;
          report.pedestrianContact ||= RR.pointOverlapsVehicle(actor, RR.vehicleFootprint(actor.type), pedestrian, 0.28);
          for (let other = index + 1; other < actors.length; other++) {
            report.vehicleContact ||= RR.vehicleRectsOverlap(actor, RR.vehicleFootprint(actor.type),
              actors[other], RR.vehicleFootprint(actors[other].type));
          }
        });
        const leadStation = RR.mainRoadLocalPoint(world, actors[0].x, actors[0].y).longitudinal;
        if (leadStation < crossingStation && !report.completed) report.passedBeforeComplete = true;
        report.resumed ||= report.completed && leadStation < crossingStation - 5 && actors.every((actor: any) => actor.speed > 1);
      }
      w.__aiPedestrianMonitor = requestAnimationFrame(sample);
    };
    w.__aiPedestrianMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => (window as any).__aiPedestrianReport.resumed, undefined, { timeout: 180_000 });
  const result = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__aiPedestrianMonitor);
    return { ...w.__aiPedestrianReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes };
  });
  expect(result.started).toBe(true); expect(result.completed).toBe(true);
  expect(result.stopped).toEqual([true, true, true]);
  expect(result.pedestrianContact).toBe(false); expect(result.vehicleContact).toBe(false);
  expect(result.passedBeforeComplete).toBe(false); expect(result.crashes).toBe(0);
  await page.screenshot({ path: 'tmp/roadready-accuracy/ordinary-ai-pedestrian-yield.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
