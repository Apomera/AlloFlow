import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 640, height: 480,
  preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('periodic cleanup preserves live intersection populations while parked facing either direction', async ({ page }) => {
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
    return hook?.timeRef.current >= 4.2 && Object.keys(hook.threeRef.current?._loadedChunks || {}).length >= 12;
  }, undefined, { timeout: 90_000 });
  for (const direction of [-1, 1]) {
    await page.evaluate(sign => {
      const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
      const world = hook.infiniteWorldRef.current;
      const frame = RR.mainRoadLocalPoint(world, hook.carRef.current.x, hook.carRef.current.y);
      hook.carRef.current.heading = (sign < 0 ? -Math.PI / 2 : Math.PI / 2) - frame.heading;
      hook.carRef.current.speed = 0; hook.gearRef.current = 'P';
      const chunk = Math.floor(frame.longitudinal / RR.CHUNK_SIZE);
      w.__streamWindow = { chunk, low: chunk - (sign < 0 ? 8 : 3), high: chunk + (sign < 0 ? 3 : 8) };
    }, direction);
    await page.waitForFunction(() => {
      const w = window as any, hook = w.__testHooks.roadReady, range = w.__streamWindow;
      const loaded = hook.threeRef.current._loadedChunks;
      for (let chunk = range.low; chunk <= range.high; chunk++) if (!loaded[chunk]) return false;
      return Object.keys(loaded).every(key => +key >= range.low - 1 && +key <= range.high + 1);
    });
    const baseline = await page.evaluate(() => {
      const w = window as any, hook = w.__testHooks.roadReady, world = hook.infiniteWorldRef.current;
      const farSignal = hook.signalsRef.current.find((signal: any) => Math.abs(signal._chunk - w.__streamWindow.chunk) > 4);
      if (!farSignal) throw new Error('Expected an active intersection beyond the old four-chunk cleanup radius');
      const chunk = farSignal._chunk;
      w.__streamOriginal = { chunk, data: world.getChunk(chunk), signal: farSignal,
        cars: hook.trafficRef.current.filter((actor: any) => actor._chunk === chunk),
        pedestrians: hook.pedsRef.current.filter((actor: any) => actor._chunk === chunk) };
      return { chunk, counts: [1, w.__streamOriginal.cars.length, w.__streamOriginal.pedestrians.length] };
    });
    expect(baseline.counts[1]).toBeGreaterThan(0); expect(baseline.counts[2]).toBeGreaterThan(0);
    for (let cycle = 0; cycle < 4; cycle++) {
      // Advance only the existing clock, then let the actual physics/render
      // loops execute their periodic cleanup and seeding. No lifecycle helper
      // is invoked by the fixture and no large movement timestep is injected.
      const cleanupSecond = await page.evaluate(() => {
        const hook = (window as any).__testHooks.roadReady;
        const next = (Math.floor(hook.timeRef.current / 5) + 1) * 5;
        hook.timeRef.current = next;
        return next;
      });
      await page.waitForFunction(second => {
        const hook = (window as any).__testHooks.roadReady;
        return hook.statsRef.current._lastChunkCleanSec === second && hook.timeRef.current >= second + 0.15;
      }, cleanupSecond);
      const actual = await page.evaluate(() => {
        const w = window as any, hook = w.__testHooks.roadReady, original = w.__streamOriginal;
        const signals = hook.signalsRef.current.filter((signal: any) => signal._chunk === original.chunk);
        const cars = hook.trafficRef.current.filter((actor: any) => actor._chunk === original.chunk);
        const pedestrians = hook.pedsRef.current.filter((actor: any) => actor._chunk === original.chunk);
        return { counts: [signals.length, cars.length, pedestrians.length],
          dataPreserved: hook.infiniteWorldRef.current.getChunk(original.chunk) === original.data,
          signalPreserved: signals[0] === original.signal,
          carsPreserved: original.cars.every((actor: any) => cars.includes(actor)),
          pedestriansPreserved: original.pedestrians.every((actor: any) => pedestrians.includes(actor)),
          duplicateCarIds: cars.length - new Set(cars.map((actor: any) => actor.id)).size };
      });
      expect(actual.counts).toEqual(baseline.counts);
      expect(actual.dataPreserved).toBe(true); expect(actual.signalPreserved).toBe(true);
      expect(actual.carsPreserved).toBe(true); expect(actual.pedestriansPreserved).toBe(true);
      expect(actual.duplicateCarIds).toBe(0);
    }
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
