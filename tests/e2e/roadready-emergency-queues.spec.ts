import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  const report = await page.evaluate(() => (window as any).__emergencyQueueReport || null).catch(() => null);
  if (report) writeFileSync('tmp/roadready-emergency-queues-20261101/browser-last-state.json', JSON.stringify(report, null, 2) + '\n');
  await harness.destroy(page);
});

test('a live fire truck brakes behind a constrained red-light queue and follows it when clear', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; Math.random = () => 0.5; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'suburban',
    scenario: 'suburban', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('suburban', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    let junction: any;
    for (let index = 0; index < 30; index++) {
      const chunk = world.getChunk(index), station = index * 32 + chunk.intersectionY;
      if (chunk.hasIntersection && Math.abs(world.spline.headingAt(station)) > 0.02) {
        junction = { index, station, chunk }; break;
      }
    }
    if (!junction) throw new Error('No authored curved suburban junction');
    const lane = RR.roadLayoutFor(junction.chunk).laneCenters.at(-1);
    const leadStation = RR.vehicleStopCenterCoordinate(junction.station, -1, 4.5);
    const leadPoint = RR.mainRoadWorldPoint(world, leadStation, lane);
    const position: any = { x: leadPoint.x, y: leadPoint.y,
      heading: -Math.PI / 2 - leadPoint.heading, speed: 0 };
    const phase = w.__emergencyQueuePhase = { held: true };
    const leader: any = { id: 'red-queue-lead', type: 'car', laneOffset: lane,
      _chunk: junction.index, color: '#3b82f6',
      personality: { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 } };
    // This queue cannot pull sideways while occupied. Only the lead vehicle's
    // held pose is constrained; the responder runs the real movement/controller.
    for (const key of ['x', 'y', 'heading', 'speed']) {
      Object.defineProperty(leader, key, { configurable: true,
        get: () => position[key], set: value => { if (!phase.held) position[key] = value; } });
    }
    const signal = { x: world.spline.centerAt(junction.station), y: junction.station,
      type: 'light', state: 'red', timer: 0, redDur: 1e6, greenDur: 1e6, yellowDur: 3,
      _chunk: junction.index };
    const sourcePoint = RR.mainRoadWorldPoint(world, leadStation + 75, lane);
    const responder = { x: sourcePoint.x, y: sourcePoint.y, heading: -Math.PI / 2 - sourcePoint.heading,
      speed: 18, _cruiseSpeed: 18, _roadStation: leadStation + 75,
      _travelSign: -1, _laneOff: lane, _homeLaneOff: lane, kind: 'firetruck',
      icon: '🚒', color: '#dc2626', bodyColor: 0xcc2200, lightColor1: 0xff0000,
      lightColor2: 0xff4400, sirenFreq: 600, life: 1000, checked: true, responded: true };
    const parked = RR.mainRoadWorldPoint(world, leadStation - 15, 11);
    Object.assign(hook.carRef.current, { x: parked.x, y: parked.y, heading: -Math.PI / 2 - parked.heading, speed: 0 });
    hook.gearRef.current = 'P';
    Object.defineProperty(hook.trafficRef, 'current', { configurable: true,
      get: () => [leader], set: () => {} });
    Object.defineProperty(hook.signalsRef, 'current', { configurable: true,
      get: () => [signal], set: () => {} });
    for (const ref of [hook.pedsRef, hook.cyclistsRef]) {
      Object.defineProperty(ref, 'current', { configurable: true, get: () => [], set: () => {} });
    }
    hook.wildlifeRef.current = null;
    hook.emergencyRef.current = responder;
    w.__emergencyQueueLeader = leader; w.__emergencyQueueSignal = signal;
    const report = w.__emergencyQueueReport = { started: hook.timeRef.current, released: null,
      samples: 0, contacts: 0, minimumGap: Infinity, largestDeceleration: 0,
      stoppedSamples: 0, resumed: false, encounterLost: false,
      startLeader: { x: leader.x, y: leader.y }, timeline: [] };
    let previousTime = hook.timeRef.current, previousSpeed = responder.speed;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const dt = live.timeRef.current - previousTime;
      if (dt > 0) {
        report.encounterLost ||= live.emergencyRef.current !== responder;
        report.samples++;
        if (RR.vehicleRectsOverlap(responder, RR.vehicleFootprint('firetruck'), leader, RR.vehicleFootprint('car'))) report.contacts++;
        const state = RR.followingVehicleRoadState(world, responder, leader, 1);
        const gap = RR.followingCenterDistance(world, responder, leader, state) - 6;
        report.minimumGap = Math.min(report.minimumGap, gap);
        if (Math.floor(live.timeRef.current) !== Math.floor(previousTime)) {
          report.timeline.push({ t: live.timeRef.current - report.started, speed: responder.speed,
            gap, responderX: responder.x, responderY: responder.y,
            leaderX: leader.x, leaderY: leader.y, following: state.eligible });
        }
        if (phase.held) {
          report.largestDeceleration = Math.max(report.largestDeceleration, (previousSpeed - responder.speed) / dt);
          if (responder.speed < 0.1) report.stoppedSamples++;
        } else {
          report.resumed ||= responder.speed > 3 &&
            Math.hypot(leader.x - report.startLeader.x, leader.y - report.startLeader.y) > 15;
        }
        previousTime = live.timeRef.current; previousSpeed = responder.speed;
      }
      w.__emergencyQueueMonitor = requestAnimationFrame(sample);
    };
    w.__emergencyQueueMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__emergencyQueueReport.started >= 12 &&
      (w.__emergencyQueueReport.stoppedSamples > 5 || w.__emergencyQueueReport.encounterLost);
  }, undefined, { timeout: 150_000 });
  const held = await page.evaluate(() => ({ ...(window as any).__emergencyQueueReport }));
  writeFileSync('tmp/roadready-emergency-queues-20261101/browser-held.json', JSON.stringify(held, null, 2) + '\n');
  expect(held.samples).toBeGreaterThan(30);
  expect(held.contacts).toBe(0);
  expect(held.encounterLost).toBe(false);
  expect(Number.isFinite(held.minimumGap)).toBe(true);
  expect(held.minimumGap).toBeGreaterThanOrEqual(0.25);
  expect(held.largestDeceleration).toBeLessThanOrEqual(6.5 + 1e-5);
  expect(held.stoppedSamples).toBeGreaterThan(5);
  await page.evaluate(() => {
    const w = window as any;
    w.__emergencyQueuePhase.held = false;
    w.__emergencyQueueReport.released = w.__testHooks.roadReady.timeRef.current;
    w.__emergencyQueueSignal.state = 'green'; w.__emergencyQueueSignal.timer = 0;
    delete w.__emergencyQueueLeader._emergencyPullOver;
    delete w.__emergencyQueueLeader._emergencyHomeLaneOffset;
  });
  await page.waitForFunction(() => (window as any).__emergencyQueueReport.resumed,
    undefined, { timeout: 120_000 });
  const result = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__emergencyQueueMonitor);
    return { ...w.__emergencyQueueReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes,
      errors: w.__events.errors };
  });
  writeFileSync('tmp/roadready-emergency-queues-20261101/browser-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.contacts).toBe(0);
  expect(result.encounterLost).toBe(false);
  expect(result.crashes).toBe(0);
  expect(result.errors).toEqual([]);
});
