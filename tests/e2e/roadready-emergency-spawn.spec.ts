import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
const evidence = process.env.RR_SPAWN_EVIDENCE || 'tmp/roadready-emergency-spawn-20261101';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  const report = await page.evaluate(() => (window as any).__emergencySpawnReport || null).catch(() => null);
  if (report) writeFileSync(evidence + '/browser-last-state.json', JSON.stringify(report, null, 2) + '\n');
  await harness.destroy(page);
});

test('a blocked live encounter waits, enters behind a bus at queue speed, and resumes after clearance', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; Math.random = () => 0.5; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'suburban',
    scenario: 'suburban', vehicle: 'sedan', emergencyDrillMode: true, reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('suburban', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current, station = 128;
    const lane = RR.roadLayoutFor(world.getChunk(Math.floor(station / 32))).laneCenters.at(-1);
    const player = RR.mainRoadWorldPoint(world, station, lane);
    Object.assign(hook.carRef.current, { x: player.x, y: player.y, heading: -Math.PI / 2 - player.heading, speed: 0 });
    hook.gearRef.current = 'P';
    const spawnStation = RR.mainRoadLocalPoint(world, player.x, player.y).longitudinal + 78;
    const point = RR.mainRoadWorldPoint(world, spawnStation, lane);
    const position: any = { x: point.x, y: point.y, heading: -Math.PI / 2 - point.heading, speed: 0 };
    const phase = w.__emergencySpawnPhase = { state: 'occupied', traffic: true, spawnStation, lane };
    const bus: any = { id: 'spawn-clearance-bus', type: 'schoolbus', laneOffset: lane,
      _chunk: Math.floor(spawnStation / 32), color: '#eab308',
      personality: { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 } };
    // Only the obstacle's pose is held. The actual drill timer, spawn gate,
    // announcement, emergency movement and queue controller remain live.
    for (const key of ['x', 'y', 'heading', 'speed']) Object.defineProperty(bus, key, {
      configurable: true, get: () => position[key], set: () => {},
    });
    Object.defineProperty(hook.trafficRef, 'current', { configurable: true,
      get: () => phase.traffic ? [bus] : [], set: () => {},
    });
    for (const ref of [hook.pedsRef, hook.cyclistsRef, hook.signalsRef]) Object.defineProperty(ref, 'current', {
      configurable: true, get: () => [], set: () => {},
    });
    hook.wildlifeRef.current = null;
    hook.emergencyRef.current = null;
    hook.timeRef.current = 21.1;
    w.__emergencySpawnBusPosition = position;
    const report = w.__emergencySpawnReport = { started: hook.timeRef.current, samples: 0,
      birthsWhileOccupied: 0, firstBirth: null, firstSpeed: null, kind: null,
      contacts: 0, minimumQueueGap: Infinity, queueSamples: 0, maximumQueueSpeed: 0,
      encounterLost: false, resumed: false, timeline: [] };
    let active: any, previousTime = hook.timeRef.current;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const time = live.timeRef.current, em = live.emergencyRef.current;
      if (time > previousTime) {
        report.samples++;
        if (phase.state === 'occupied' && em) report.birthsWhileOccupied++;
        if (em && !active) {
          active = em; report.firstBirth = time; report.firstSpeed = em.speed; report.kind = em.kind;
        }
        if (active) report.encounterLost ||= em !== active;
        if (em && phase.traffic) {
          const own = RR.vehicleFootprint(RR.emergencyVehicleFootprintType(em.kind));
          const size = RR.vehicleFootprint('schoolbus');
          if (RR.vehicleRectsOverlap(em, own, bus, size)) report.contacts++;
          if (phase.state === 'queued') {
            const relation = RR.followingVehicleRoadState(world, em, bus, 1);
            const angle = bus.heading - em.heading;
            const projectedLength = Math.abs(Math.cos(angle)) * size.length + Math.abs(Math.sin(angle)) * size.width;
            const gap = RR.followingCenterDistance(world, em, bus, relation) - (own.length + projectedLength) / 2;
            report.minimumQueueGap = Math.min(report.minimumQueueGap, gap);
            report.maximumQueueSpeed = Math.max(report.maximumQueueSpeed, em.speed);
            report.queueSamples++;
          }
        }
        if (em && phase.state === 'clear') report.resumed ||= em.speed > 3;
        if (Math.floor(time) !== Math.floor(previousTime)) report.timeline.push({
          t: time - report.started, state: phase.state, speed: em?.speed, kind: em?.kind,
        });
        previousTime = time;
      }
      w.__emergencySpawnMonitor = requestAnimationFrame(sample);
    };
    w.__emergencySpawnMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => {
    const w = window as any; return w.__testHooks.roadReady.timeRef.current - w.__emergencySpawnReport.started >= 2;
  }, undefined, { timeout: 60_000 });
  const occupied = await page.evaluate(() => ({ ...(window as any).__emergencySpawnReport,
    active: !!(window as any).__testHooks.roadReady.emergencyRef.current }));
  writeFileSync(evidence + '/browser-occupied.json', JSON.stringify(occupied, null, 2) + '\n');
  expect(occupied.samples).toBeGreaterThan(10);
  expect(occupied.birthsWhileOccupied).toBe(0);
  expect(occupied.active).toBe(false);
  await page.evaluate(() => {
    const w = window as any, RR = w.__RR_TEST_EXPORTS__.roadReady, hook = w.__testHooks.roadReady;
    const phase = w.__emergencySpawnPhase;
    const point = RR.mainRoadWorldPoint(hook.infiniteWorldRef.current, phase.spawnStation - 9.75, phase.lane);
    Object.assign(w.__emergencySpawnBusPosition, { x: point.x, y: point.y, heading: -Math.PI / 2 - point.heading });
    phase.state = 'queued'; phase.queuedAt = hook.timeRef.current;
  });
  await page.waitForFunction(() => {
    const w = window as any; return w.__testHooks.roadReady.timeRef.current - w.__emergencySpawnPhase.queuedAt >= 3;
  }, undefined, { timeout: 60_000 });
  const queued = await page.evaluate(() => ({ ...(window as any).__emergencySpawnReport }));
  writeFileSync(evidence + '/browser-queued.json', JSON.stringify(queued, null, 2) + '\n');
  expect(queued.kind).toBe('police');
  expect(queued.firstBirth).not.toBeNull();
  expect(queued.firstSpeed).toBeLessThan(2);
  expect(queued.maximumQueueSpeed).toBeLessThan(2);
  expect(queued.queueSamples).toBeGreaterThan(10);
  expect(queued.minimumQueueGap).toBeGreaterThan(0.25);
  expect(queued.contacts).toBe(0);
  expect(queued.encounterLost).toBe(false);
  await page.evaluate(() => { const phase = (window as any).__emergencySpawnPhase; phase.state = 'clear'; phase.traffic = false; });
  await page.waitForFunction(() => (window as any).__emergencySpawnReport.resumed, undefined, { timeout: 60_000 });
  const result = await page.evaluate(() => {
    const w = window as any; cancelAnimationFrame(w.__emergencySpawnMonitor);
    return { ...w.__emergencySpawnReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes, errors: w.__events.errors };
  });
  writeFileSync(evidence + '/browser-result.json', JSON.stringify(result, null, 2) + '\n');
  expect(result.contacts).toBe(0);
  expect(result.encounterLost).toBe(false);
  expect(result.crashes).toBe(0);
  expect(result.errors).toEqual([]);
});
