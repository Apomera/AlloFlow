import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ trace: 'off', video: 'off' });
const evidence = process.env.RR_RIDER_SIGNAL_EVIDENCE || 'tmp/roadready-rider-signals-20261102';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  const last = await page.evaluate(() => (window as any).__riderSignalReport || null).catch(() => null);
  if (last) writeFileSync(evidence + '/browser-last-state.json', JSON.stringify(last, null, 2) + '\n');
  await harness.destroy(page);
});

for (const type of ['cyclist', 'motorcycle']) test(`a live ${type} stops at an actual red bar and resumes on green`, async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; Math.random = () => 0.5; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'suburban',
    scenario: 'suburban', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('suburban', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.evaluate(type => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current, direction = type === 'cyclist' ? 1 : -1;
    const playerStation = RR.mainRoadLocalPoint(world, hook.carRef.current.x, hook.carRef.current.y).longitudinal;
    const authored = hook.signalsRef.current.filter((s: any) => s.type === 'light')
      .sort((a: any, b: any) => Math.abs(a.y - playerStation) - Math.abs(b.y - playerStation))[0];
    if (!authored) throw Error('No authored suburban light');
    const station = RR.mainRoadLocalPoint(world, authored.x, authored.y).longitudinal;
    const center = RR.mainRoadWorldPoint(world, station, 0);
    const signal = { ...authored, x: center.x, y: center.y, state: 'red', _crossState: 'green',
      _phase: 'cross_green', timer: 0, greenDur: 1000, redDur: 1000, yellowDur: 3, allRedDur: 1 };
    Object.defineProperty(hook.signalsRef, 'current', { configurable: true, get: () => [signal], set: () => {} });
    for (const ref of [hook.trafficRef, hook.pedsRef]) Object.defineProperty(ref, 'current', {
      configurable: true, get: () => [], set: () => {},
    });
    for (const ref of [hook.wildlifeRef, hook.emergencyRef]) Object.defineProperty(ref, 'current', {
      configurable: true, get: () => null, set: () => {},
    });
    const profile = world.getChunk(Math.floor(station / 32));
    const lane = RR.vulnerableRoadUserLaneOffset(profile, type, direction, -direction * 2.8);
    const size = RR.vulnerableRoadUserFootprint({ type });
    const line = RR.mainRoadWorldPoint(world, station - direction * 4.1, lane);
    const forward = { x: direction * Math.sin(line.heading), y: direction * Math.cos(line.heading) };
    const distance = type === 'cyclist' ? 18 : 35, speed = type === 'cyclist' ? 6 : 12;
    const sourceStation = station - direction * (4.1 + size.length / 2 + distance) * Math.cos(line.heading);
    const source = RR.mainRoadWorldPoint(world, sourceStation, lane);
    const rider = { ...source, type, id: 'native-red-' + type,
      heading: direction * Math.PI / 2 - source.heading, speed, _cruiseSpeed: speed,
      _roadStation: sourceStation, _bikeLane: lane };
    Object.defineProperty(hook.cyclistsRef, 'current', {
      configurable: true, get: () => [rider], set: () => {},
    });
    const parked = RR.mainRoadWorldPoint(world, station, lane + 18);
    Object.assign(hook.carRef.current, parked, { heading: rider.heading, speed: 0 });
    hook.gearRef.current = 'P';
    const report = w.__riderSignalReport = { type, direction, startedAt: hook.timeRef.current,
      stoppedSamples: 0, crossedWhileRed: false, resumed: false, lostActor: false,
      redSamples: 0, greenSamples: 0, minimumGap: Infinity, largestDeceleration: 0, timeline: [] };
    w.__riderSignalFixture = { signal, rider };
    let previousTime = hook.timeRef.current, previousSpeed = rider.speed;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const dt = live.timeRef.current - previousTime;
      if (dt > 0) {
        const along = Math.cos(rider.heading) * forward.x + Math.sin(rider.heading) * forward.y;
        const across = -Math.sin(rider.heading) * forward.x + Math.cos(rider.heading) * forward.y;
        const gap = (line.x - rider.x) * forward.x + (line.y - rider.y) * forward.y -
          Math.abs(along) * size.length / 2 - Math.abs(across) * size.width / 2;
        const indication = RR.trafficSignalIndication(signal, 'main');
        report.lostActor ||= live.cyclistsRef.current[0] !== rider;
        if (indication === 'red') {
          report.redSamples++; report.minimumGap = Math.min(report.minimumGap, gap);
          report.largestDeceleration = Math.max(report.largestDeceleration, (previousSpeed - rider.speed) / dt);
          report.crossedWhileRed ||= gap < -0.01;
          if (rider.speed < 0.1) report.stoppedSamples++;
        } else if (indication === 'green') {
          report.greenSamples++; report.resumed ||= gap < -4 && rider.speed > 2;
        }
        if (Math.floor(live.timeRef.current) !== Math.floor(previousTime)) report.timeline.push({
          t: live.timeRef.current - report.startedAt, speed: rider.speed, gap, indication,
        });
        previousTime = live.timeRef.current; previousSpeed = rider.speed;
      }
      w.__riderSignalMonitor = requestAnimationFrame(sample);
    };
    w.__riderSignalMonitor = requestAnimationFrame(sample);
  }, type);
  await page.waitForFunction(() => {
    const r = (window as any).__riderSignalReport;
    return r.stoppedSamples > 10 || r.crossedWhileRed || r.lostActor;
  }, undefined, { timeout: 160_000 });
  const safe = await page.evaluate(() => !(window as any).__riderSignalReport.crossedWhileRed &&
    !(window as any).__riderSignalReport.lostActor);
  if (safe) {
    await page.evaluate(() => Object.assign((window as any).__riderSignalFixture.signal,
      { state: 'green', _crossState: 'red', _phase: 'main_green', timer: 0 }));
    await page.waitForFunction(() => (window as any).__riderSignalReport.resumed ||
      (window as any).__riderSignalReport.lostActor, undefined, { timeout: 90_000 });
  }
  const result = await page.evaluate(() => {
    const w = window as any; cancelAnimationFrame(w.__riderSignalMonitor);
    return { ...w.__riderSignalReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes,
      rendererCreated: !!w.__testHooks.roadReady.threeRef.current?.renderer, errors: w.__events.errors };
  });
  writeFileSync(evidence + '/browser-' + type + '-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.crossedWhileRed).toBe(false); expect(result.lostActor).toBe(false);
  expect(result.stoppedSamples).toBeGreaterThan(10); expect(result.resumed).toBe(true);
  expect(result.minimumGap).toBeGreaterThan(0.1); expect(result.largestDeceleration).toBeLessThanOrEqual(6.5 + 1e-5);
  expect(result.greenSamples).toBeGreaterThan(5); expect(result.crashes).toBe(0);
  expect(result.rendererCreated).toBe(true); expect(result.errors).toEqual([]);
});
