import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ trace: 'off', video: 'off' });
const evidence = process.env.RR_AI_RIDER_EVIDENCE || 'tmp/roadready-ai-rider-following-20261102';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }, testInfo) => {
  try {
    if (testInfo.status !== testInfo.expectedStatus) {
      const diagnostics = await page.evaluate(() => {
        const w = window as any, hook = w.__testHooks?.roadReady;
        return { body: document.body.innerText.slice(-12000), errors: w.__events?.errors,
          simTime: hook?.timeRef?.current, rendererCreated: !!hook?.threeRef?.current?.renderer,
          trafficScenarioStarted: !!w.__aiRiderReport, report: w.__aiRiderReport };
      }).catch(error => ({ unavailable: String(error) }));
      const name = testInfo.title.includes('schoolbus') ? 'schoolbus' : 'car';
      writeFileSync(evidence + '/failure-' + name + '-diagnostics.json', JSON.stringify(diagnostics, null, 2) + '\n');
      await page.screenshot({ path: evidence + '/failure-' + name + '-before-teardown.png' }).catch(() => {});
    }
  } finally { await harness.destroy(page); }
});

const cases = [{ type: 'car', riderType: 'motorcycle', direction: 1 },
  { type: 'schoolbus', riderType: 'cyclist', direction: -1 }];
for (const options of cases) test(`live ${options.type} follows a ${options.riderType} through red and green without body contact`, async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; Math.random = () => 0.5; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'suburban',
    scenario: 'suburban', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('suburban', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.evaluate(options => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const { type, riderType, direction } = options, world = hook.infiniteWorldRef.current;
    const playerStation = RR.mainRoadLocalPoint(world, hook.carRef.current.x, hook.carRef.current.y).longitudinal;
    const authored = hook.signalsRef.current.filter((s: any) => s.type === 'light')
      .sort((a: any, b: any) => Math.abs(a.y - playerStation) - Math.abs(b.y - playerStation))[0];
    if (!authored) throw Error('No authored suburban light');
    const station = RR.mainRoadLocalPoint(world, authored.x, authored.y).longitudinal;
    const center = RR.mainRoadWorldPoint(world, station, 0);
    const signal = { ...authored, ...center, state: 'red', _crossState: 'green',
      _phase: 'cross_green', timer: 0, greenDur: 1000, redDur: 1000, yellowDur: 3, allRedDur: 1 };
    Object.defineProperty(hook.signalsRef, 'current', { configurable: true, get: () => [signal], set: () => {} });
    Object.defineProperty(hook.pedsRef, 'current', { configurable: true, get: () => [], set: () => {} });
    for (const ref of [hook.wildlifeRef, hook.emergencyRef]) Object.defineProperty(ref, 'current', {
      configurable: true, get: () => null, set: () => {},
    });
    const profile = world.getChunk(Math.floor(station / 32));
    const laneCenters = RR.roadLayoutFor(profile).laneCenters;
    const lane = -direction * laneCenters[riderType === 'cyclist' ? laneCenters.length - 1 : 0];
    const riderLane = RR.vulnerableRoadUserLaneOffset(profile, riderType, direction, lane);
    const point = (behind: number, lateral: number) => RR.mainRoadWorldPoint(world,
      station - direction * behind * Math.cos(center.heading), lateral);
    const aiPoint = point(25, lane), riderPoint = point(8.25, riderLane);
    const actor = { ...aiPoint, type, id: 'native-ai-follower', speed: 10,
      heading: direction * Math.PI / 2 - aiPoint.heading, laneOffset: lane,
      _roadStation: RR.mainRoadLocalPoint(world, aiPoint.x, aiPoint.y).longitudinal,
      personality: { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 },
      _busCycleTimer: 1000, _stopArmActive: false, _turnSignalSeen: signal };
    const rider = { ...riderPoint, type: riderType, id: 'native-rider-leader', speed: 0, _cruiseSpeed: 6,
      heading: direction * Math.PI / 2 - riderPoint.heading, _bikeLane: riderLane,
      _roadStation: RR.mainRoadLocalPoint(world, riderPoint.x, riderPoint.y).longitudinal };
    Object.defineProperty(hook.trafficRef, 'current', { configurable: true, get: () => [actor], set: () => {} });
    Object.defineProperty(hook.cyclistsRef, 'current', { configurable: true, get: () => [rider], set: () => {} });
    const parked = RR.mainRoadWorldPoint(world, station, lane + 18);
    Object.assign(hook.carRef.current, parked, { heading: actor.heading, speed: 0 }); hook.gearRef.current = 'P';
    const actorSize = RR.vehicleFootprint(type), riderSize = RR.vulnerableRoadUserFootprint(rider);
    const angle = rider.heading - actor.heading;
    const riderWidth = Math.abs(Math.cos(angle)) * riderSize.width + Math.abs(Math.sin(angle)) * riderSize.length;
    const relation = RR.followingVehicleRoadState(world, actor, rider, (actorSize.width + riderWidth) / 2);
    if (!relation.eligible || !relation.sameLane || relation.ahead <= (actorSize.length + riderSize.length) / 2) {
      throw Error('Native fixture must start ahead in a physically overlapping travel corridor');
    }
    const line = RR.mainRoadWorldPoint(world, station - direction * 4.1, 0);
    const forward = { x: direction * Math.sin(line.heading), y: direction * Math.cos(line.heading) };
    const lineGap = (body: any, size: any) => {
      const along = Math.cos(body.heading) * forward.x + Math.sin(body.heading) * forward.y;
      const across = -Math.sin(body.heading) * forward.x + Math.cos(body.heading) * forward.y;
      return (line.x - body.x) * forward.x + (line.y - body.y) * forward.y -
        Math.abs(along) * size.length / 2 - Math.abs(across) * size.width / 2;
    };
    const report = w.__aiRiderReport = { type, riderType, direction, startedAt: hook.timeRef.current,
      fixture: { laneCenters, lane, riderLane, roadHalfWidth: profile.roadHalfWidth,
        eligible: relation.eligible, sameLane: relation.sameLane, ahead: relation.ahead, lateral: relation.lateral },
      stoppedSamples: 0, greenSamples: 0, overlap: false, crossedRed: false, resumed: false,
      lostActors: false, brakeSamples: 0, minimumGap: Infinity, minimumRedLineGap: Infinity, timeline: [] };
    w.__aiRiderFixture = { signal, actor, rider };
    let previousTime = hook.timeRef.current;
    const sample = () => {
      const live = w.__testHooks?.roadReady; if (!live) return;
      if (live.timeRef.current > previousTime) {
        const angle = rider.heading - actor.heading;
        const gap = (rider.x - actor.x) * Math.cos(actor.heading) +
          (rider.y - actor.y) * Math.sin(actor.heading) - actorSize.length / 2 -
          Math.abs(Math.cos(angle)) * riderSize.length / 2 - Math.abs(Math.sin(angle)) * riderSize.width / 2;
        report.minimumGap = Math.min(report.minimumGap, gap);
        report.overlap ||= RR.vehicleRectsOverlap(actor, actorSize, rider, riderSize);
        report.lostActors ||= live.trafficRef.current[0] !== actor || live.cyclistsRef.current[0] !== rider;
        const indication = RR.trafficSignalIndication(signal, 'main');
        if (indication === 'red') {
          report.minimumRedLineGap = Math.min(report.minimumRedLineGap, lineGap(actor, actorSize), lineGap(rider, riderSize));
          report.crossedRed ||= lineGap(actor, actorSize) < -0.01 || lineGap(rider, riderSize) < -0.01;
          if (actor.speed < 0.1 && rider.speed < 0.1) report.stoppedSamples++;
          if ((actor as any)._brakeLightState?.braking) report.brakeSamples++;
        } else if (indication === 'green') {
          report.greenSamples++; report.resumed ||= lineGap(actor, actorSize) < -4 && lineGap(rider, riderSize) < -4 &&
            actor.speed > 2 && rider.speed > 2;
        }
        if (Math.floor(live.timeRef.current) !== Math.floor(previousTime)) report.timeline.push({
          t: live.timeRef.current - report.startedAt, speed: actor.speed, riderSpeed: rider.speed, gap, indication,
        });
        previousTime = live.timeRef.current;
      }
      w.__aiRiderMonitor = requestAnimationFrame(sample);
    };
    w.__aiRiderMonitor = requestAnimationFrame(sample);
  }, options);
  await page.waitForFunction(() => {
    const r = (window as any).__aiRiderReport; return r.stoppedSamples > 10 || r.overlap || r.crossedRed || r.lostActors;
  }, undefined, { timeout: 170_000 });
  const safe = await page.evaluate(() => {
    const r = (window as any).__aiRiderReport; return !r.overlap && !r.crossedRed && !r.lostActors;
  });
  if (safe) {
    await page.evaluate(() => Object.assign((window as any).__aiRiderFixture.signal,
      { state: 'green', _crossState: 'red', _phase: 'main_green', timer: 0 }));
    await page.waitForFunction(() => {
      const r = (window as any).__aiRiderReport; return r.resumed || r.overlap || r.lostActors;
    }, undefined, { timeout: 100_000 });
  }
  const result = await page.evaluate(() => {
    const w = window as any; cancelAnimationFrame(w.__aiRiderMonitor);
    return { ...w.__aiRiderReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes,
      rendererCreated: !!w.__testHooks.roadReady.threeRef.current?.renderer, errors: w.__events.errors };
  });
  writeFileSync(evidence + '/browser-' + options.type + '-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.overlap).toBe(false); expect(result.crossedRed).toBe(false); expect(result.lostActors).toBe(false);
  expect(result.stoppedSamples).toBeGreaterThan(10); expect(result.resumed).toBe(true);
  expect(result.minimumGap).toBeGreaterThan(0.2); expect(result.minimumRedLineGap).toBeGreaterThan(0.1);
  expect(result.brakeSamples).toBeGreaterThan(0); expect(result.crashes).toBe(0);
  expect(result.rendererCreated).toBe(true); expect(result.errors).toEqual([]);
});
