import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780, preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('live emergency route stays around the island and rewards yielding only after the learner clears it', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'roundabout', scenario: 'roundabout',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    Object.assign(hook.carRef.current, { x: 51.6, y: 42, heading: -Math.PI / 2, speed: 0 });
    hook.gearRef.current = 'P'; hook.trafficRef.current = []; hook.cyclistsRef.current = [];
    hook.pedsRef.current = []; hook.wildlifeRef.current = null; hook.signalsRef.current = [];
    const responder = RR.spawnRoundaboutEmergency(hook.carRef.current, 'firetruck', [], [], [], 'sedan');
    hook.emergencyRef.current = { ...responder, kind: 'firetruck', icon: '🚒', color: '#dc2626',
      sirenFreq: 600, responded: false, checked: false, _cruiseSpeed: responder.speed };
    w.__emergencyPhases = []; w.__emergencyIslandEntry = false;
    w.__emergencyStarted = hook.timeRef.current;
    const sample = () => {
      const em = w.__testHooks?.roadReady?.emergencyRef.current;
      if (em) {
        if (!w.__emergencyPhases.includes(em._roundaboutState)) w.__emergencyPhases.push(em._roundaboutState);
        w.__emergencyIslandEntry ||= Math.hypot(em.x - 48, em.y - 48) < 5.5;
      }
      w.__emergencyMonitor = requestAnimationFrame(sample);
    };
    w.__emergencyMonitor = requestAnimationFrame(sample);
  });
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.timeRef.current - w.__emergencyStarted >= 4;
  });
  const inside = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady, em = hook.emergencyRef.current;
    return { yields: hook.statsRef.current.emergencyYields || 0, responded: em.responded,
      timer: em._responseWindowStartedAt ?? null, guidance: hook.eventToastRef.current?.msg || '' };
  });
  expect(inside.yields).toBe(0); expect(inside.responded).toBe(false); expect(inside.timer).toBeNull();
  expect(inside.guidance).toMatch(/exit.*roundabout|roundabout.*exit/i);
  await page.screenshot({ path: 'tmp/roadready-accuracy/roundabout-emergency-circle.png' });

  await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    Object.assign(hook.carRef.current, { x: 75, y: 52.25, heading: 0, speed: 0 });
  });
  await expect.poll(() => page.evaluate(() =>
    (window as any).__testHooks.roadReady.statsRef.current.emergencyYields || 0
  )).toBe(1);
  await page.waitForFunction(() => !(window as any).__testHooks.roadReady.emergencyRef.current, null, { timeout: 180_000 });
  const completed = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__emergencyMonitor);
    return { phases: w.__emergencyPhases, island: w.__emergencyIslandEntry,
      crashes: w.__testHooks.roadReady.statsRef.current.crashes };
  });
  expect(completed.phases).toEqual(expect.arrayContaining(['approach', 'entering', 'circulating', 'exiting']));
  expect(completed.island).toBe(false); expect(completed.crashes).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
