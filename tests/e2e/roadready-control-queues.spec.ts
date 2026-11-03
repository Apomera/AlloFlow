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

test('a live mixed queue holds before the railroad warning and clears without touching', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__RR_TEST_EXPORTS__ = {};
    Math.random = () => 0.5;
  });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', scenario: 'rural',
    pendingScenario: 'rural', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('rural', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });

  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    let selected: any = null;
    // Let the actual renderer create an eligible authored crossing. The local
    // fixture controls traffic while keeping real road and gate geometry.
    for (let index = 0; index <= 40; index++) {
      const chunk = world.getChunk(index), station = index * 32 + 19.2;
      if (!['rural', 'industrial'].includes(chunk.biome) || chunk.hasIntersection || chunk.landmark ||
          ((index * 2654435761) >>> 0) % 7 !== 3 || Math.abs(world.spline.headingAt(station)) < 0.1) continue;
      selected = { index, station }; break;
    }
    if (!selected) throw new Error('No authored bent road with a railroad crossing');
    w.__queueCrossing = selected;
    const parked = RR.mainRoadWorldPoint(world, selected.station + 40, 8);
    Object.assign(hook.carRef.current, { x: parked.x, y: parked.y,
      heading: -Math.PI / 2 - parked.heading, speed: 0 });
    hook.gearRef.current = 'P';
    // Pin the participants so streaming unrelated junctions cannot change the
    // encounter. Objects remain live and move through the production updater.
    w.__queueActors = [];
    Object.defineProperty(hook.trafficRef, 'current', { configurable: true,
      get: () => w.__queueActors.slice(), set: () => {} });
    for (const ref of [hook.pedsRef, hook.cyclistsRef, hook.signalsRef]) {
      Object.defineProperty(ref, 'current', { configurable: true, get: () => [], set: () => {} });
    }
    hook.wildlifeRef.current = null; hook.emergencyRef.current = null;
  });
  await page.waitForFunction(() => {
    const w = window as any, hook = w.__testHooks.roadReady;
    return hook.infiniteWorldRef.current._railroadCrossings?.some((crossing: any) =>
      crossing.chunkIdx === w.__queueCrossing.index);
  }, undefined, { timeout: 90_000 });

  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    const crossing = world._railroadCrossings.find((entry: any) => entry.chunkIdx === w.__queueCrossing.index);
    crossing.activeControl = true;
    crossing.cycleOffset = 21 - hook.timeRef.current % 40;
    const actors = ['schoolbus', 'car', 'schoolbus'].map((type, index) => {
      const desiredGap = 0.77 + 5 + 5.3 + index * 12 - RR.vehicleFootprint(type).length / 2 - 0.77;
      let lower = 0, upper = 50, actor: any = null;
      for (let sample = 0; sample < 36; sample++) {
        const delta = (lower + upper) / 2;
        const point = RR.mainRoadWorldPoint(world, w.__queueCrossing.station + delta, 1.6);
        actor = { id: 'live-control-queue-' + index, type, x: point.x, y: point.y,
          heading: -Math.PI / 2 - point.heading, laneOffset: 1.6, speed: index === 0 ? 0 : 8,
          color: ['#fbbf24', '#ef4444', '#3b82f6'][index], _busCycleTimer: 1000,
          personality: { speedBias: 1, followMult: 1, aggro: 0, rollsStops: 0 } };
        if (RR.railroadApproach(actor, crossing, type, 1, world).clearance < desiredGap) lower = delta;
        else upper = delta;
      }
      return actor;
    });
    w.__queueActors = actors;
    const report = w.__controlQueueReport = { started: hook.timeRef.current, releaseStarted: null,
      warningFrames: 0, contacts: 0, minimumClearance: Infinity, held: [false, false, false],
      passed: [false, false, false] };
    w.__controlledRail = crossing;
    let previousTime = hook.timeRef.current;
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      if (live.timeRef.current > previousTime) {
        for (let index = 0; index < actors.length; index++) {
          const actor = actors[index];
          for (let other = index + 1; other < actors.length; other++) {
            if (RR.vehicleRectsOverlap(actor, RR.vehicleFootprint(actor.type),
              actors[other], RR.vehicleFootprint(actors[other].type))) report.contacts++;
          }
          const gap = RR.railroadApproach(actor, crossing, actor.type, 1, world).clearance;
          if (report.releaseStarted == null) report.held[index] ||= actor.speed < 0.15;
          else report.passed[index] ||= gap < -12;
        }
        if (report.releaseStarted == null) {
          report.warningFrames++;
          report.minimumClearance = Math.min(report.minimumClearance,
            RR.railroadApproach(actors[0], crossing, actors[0].type, 1, world).clearance);
        }
        previousTime = live.timeRef.current;
      }
      w.__controlQueueMonitor = requestAnimationFrame(sample);
    };
    w.__controlQueueMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__controlQueueReport.started >= 6;
  }, undefined, { timeout: 120_000 });
  const held = await page.evaluate(() => ({ ...(window as any).__controlQueueReport }));
  expect(held.warningFrames).toBeGreaterThan(15);
  expect(held.minimumClearance).toBeGreaterThanOrEqual(15 * 0.3048);
  expect(held.contacts).toBe(0);
  expect(held.held).toEqual([true, true, true]);
  await page.screenshot({ path: 'tmp/roadready-queue-pass/railroad-queue.png' });
  await page.evaluate(() => {
    const w = window as any, time = w.__testHooks.roadReady.timeRef.current;
    w.__controlQueueReport.releaseStarted = time;
    w.__controlledRail.cycleOffset = 1 - time % 40;
  });
  await page.waitForFunction(() => (window as any).__controlQueueReport.passed.every(Boolean),
    undefined, { timeout: 150_000 });
  const result = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__controlQueueMonitor);
    return { ...w.__controlQueueReport, crashes: w.__testHooks.roadReady.statsRef.current.crashes };
  });
  expect(result.contacts).toBe(0);
  expect(result.crashes).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
