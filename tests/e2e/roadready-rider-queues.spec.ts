import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ trace: 'off', video: 'off' });
const evidence = process.env.RR_RIDER_QUEUE_EVIDENCE || 'tmp/roadready-rider-queues-20261102';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const type of ['cyclist', 'motorcycle']) test(`live ${type} queues keep separate bodies through red and green`, async ({ page }) => {
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
    if (!authored) throw Error('No authored suburban traffic light');
    const station = RR.mainRoadLocalPoint(world, authored.x, authored.y).longitudinal;
    const center = RR.mainRoadWorldPoint(world, station, 0);
    const signal = { ...authored, ...center, state: 'red', _crossState: 'green',
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
    const speed = type === 'cyclist' ? 6 : 12, approach = type === 'cyclist' ? 28 : 44;
    const makeRider = (id: string, extra: number) => {
      const sourceStation = station - direction * (4.1 + size.length / 2 + approach + extra) * Math.cos(line.heading);
      const source = RR.mainRoadWorldPoint(world, sourceStation, lane);
      return { ...source, type, id, heading: direction * Math.PI / 2 - source.heading,
        speed, _cruiseSpeed: speed, _roadStation: sourceStation, _bikeLane: lane };
    };
    const leader = makeRider('queue-lead', 0), follower = makeRider('queue-rear', 7);
    const riders = type === 'cyclist' ? [leader, follower] : [follower, leader];
    Object.defineProperty(hook.cyclistsRef, 'current', { configurable: true, get: () => riders, set: () => {} });
    const parked = RR.mainRoadWorldPoint(world, station, lane + 18);
    Object.assign(hook.carRef.current, parked, { heading: leader.heading, speed: 0 }); hook.gearRef.current = 'P';
    const report = w.__riderQueueReport = { type, direction, startedAt: hook.timeRef.current,
      stoppedSamples: 0, greenSamples: 0, overlap: false, crossedRed: false, resumed: false,
      lostActors: false, minimumGap: Infinity, minimumRedLineGap: Infinity, timeline: [] };
    w.__riderQueueFixture = { signal, leader, follower };
    const lineGap = (rider: any) => {
      const along = Math.cos(rider.heading) * forward.x + Math.sin(rider.heading) * forward.y;
      const across = -Math.sin(rider.heading) * forward.x + Math.cos(rider.heading) * forward.y;
      return (line.x - rider.x) * forward.x + (line.y - rider.y) * forward.y -
        Math.abs(along) * size.length / 2 - Math.abs(across) * size.width / 2;
    };
    let previousTime = hook.timeRef.current;
    const sample = () => {
      const live = w.__testHooks?.roadReady; if (!live) return;
      if (live.timeRef.current > previousTime) {
        const angle = leader.heading - follower.heading;
        const gap = (leader.x - follower.x) * Math.cos(follower.heading) +
          (leader.y - follower.y) * Math.sin(follower.heading) - size.length / 2 -
          Math.abs(Math.cos(angle)) * size.length / 2 - Math.abs(Math.sin(angle)) * size.width / 2;
        report.minimumGap = Math.min(report.minimumGap, gap);
        report.overlap ||= RR.vehicleRectsOverlap(leader, size, follower, size);
        report.lostActors ||= !live.cyclistsRef.current.includes(leader) || !live.cyclistsRef.current.includes(follower);
        const indication = RR.trafficSignalIndication(signal, 'main');
        if (indication === 'red') {
          report.minimumRedLineGap = Math.min(report.minimumRedLineGap, lineGap(leader), lineGap(follower));
          report.crossedRed ||= lineGap(leader) < -0.01 || lineGap(follower) < -0.01;
          if (leader.speed < 0.1 && follower.speed < 0.1) report.stoppedSamples++;
        } else if (indication === 'green') {
          report.greenSamples++; report.resumed ||= lineGap(leader) < -4 && lineGap(follower) < -4 &&
            leader.speed > 2 && follower.speed > 2;
        }
        if (Math.floor(live.timeRef.current) !== Math.floor(previousTime)) report.timeline.push({
          t: live.timeRef.current - report.startedAt, leaderSpeed: leader.speed, followerSpeed: follower.speed, gap, indication,
        });
        previousTime = live.timeRef.current;
      }
      w.__riderQueueMonitor = requestAnimationFrame(sample);
    };
    w.__riderQueueMonitor = requestAnimationFrame(sample);
  }, type);
  await page.waitForFunction(() => {
    const r = (window as any).__riderQueueReport;
    return r.stoppedSamples > 10 || r.overlap || r.crossedRed || r.lostActors;
  }, undefined, { timeout: 170_000 });
  const safe = await page.evaluate(() => {
    const r = (window as any).__riderQueueReport; return !r.overlap && !r.crossedRed && !r.lostActors;
  });
  if (safe) {
    await page.evaluate(() => Object.assign((window as any).__riderQueueFixture.signal,
      { state: 'green', _crossState: 'red', _phase: 'main_green', timer: 0 }));
    await page.waitForFunction(() => {
      const r = (window as any).__riderQueueReport; return r.resumed || r.overlap || r.lostActors;
    }, undefined, { timeout: 100_000 });
  }
  const result = await page.evaluate(() => {
    const w = window as any; cancelAnimationFrame(w.__riderQueueMonitor);
    return { ...w.__riderQueueReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes,
      rendererCreated: !!w.__testHooks.roadReady.threeRef.current?.renderer, errors: w.__events.errors };
  });
  writeFileSync(evidence + '/browser-' + type + '-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.overlap).toBe(false); expect(result.crossedRed).toBe(false); expect(result.lostActors).toBe(false);
  expect(result.stoppedSamples).toBeGreaterThan(10); expect(result.resumed).toBe(true);
  expect(result.minimumGap).toBeGreaterThan(0.2); expect(result.minimumRedLineGap).toBeGreaterThan(0.1);
  expect(result.greenSamples).toBeGreaterThan(5); expect(result.crashes).toBe(0);
  expect(result.rendererCreated).toBe(true); expect(result.errors).toEqual([]);
});
