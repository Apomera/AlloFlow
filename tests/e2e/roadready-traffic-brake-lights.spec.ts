import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('rendered traffic brake lamps brighten for braking and holding, then release for cruising', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'roundabout',
    scenario: 'roundabout', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const fixture = w.__brakeLampFixture = { phase: 'cruise', started: hook.timeRef.current };
    const actor = RR.spawnRoundaboutTraffic({ traffic: 'medium' }).find((v: any) => v._roundaboutState === 'approach');
    Object.assign(actor, { id: 'brake-lamp-probe', type: 'car', _roundaboutEntryIndex: 2,
      _roundaboutEntryAngle: Math.PI / 2, _slowFor: 1 });
    // Supply a known speed trajectory while the real renderer controls every
    // lamp. Freeze pose so no traffic interaction changes that trajectory.
    for (const [key, value] of Object.entries({ x: 49.75, y: 68, heading: -Math.PI / 2 })) {
      Object.defineProperty(actor, key, { configurable: true, get: () => value, set: () => {} });
    }
    Object.defineProperty(actor, 'speed', { configurable: true, set: () => {}, get: () => {
      const elapsed = hook.timeRef.current - fixture.started;
      if (fixture.phase === 'braking') return Math.max(2, 9 - 3 * elapsed);
      if (fixture.phase === 'holding') return 0;
      if (fixture.phase === 'accelerating') return Math.min(9, elapsed * 2);
      return 9;
    } });
    hook.trafficRef.current = [actor]; hook.pedsRef.current = []; hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = null; hook.signalsRef.current = []; hook.gearRef.current = 'P';
  });

  for (const [phase, lit] of [['cruise', false], ['braking', true], ['holding', true], ['accelerating', false]] as const) {
    await page.evaluate((name) => {
      const w = window as any, hook = w.__testHooks.roadReady;
      w.__brakeLampFixture.phase = name;
      w.__brakeLampFixture.started = hook.timeRef.current;
      hook.trafficRef.current[0]._slowFor = name === 'cruise' ? 1 : 0;
    }, phase);
    await page.waitForFunction(() => {
      const w = window as any, hook = w.__testHooks.roadReady;
      return hook.timeRef.current - w.__brakeLampFixture.started >= 1 &&
        !!hook.threeRef.current?.trafficGroup?.children[0]?.getObjectByName('rr_chmsl');
    });
    const lamps = await page.evaluate(() => {
      const group = (window as any).__testHooks.roadReady.threeRef.current.trafficGroup.children[0];
      return ['rr_brR', 'rr_brL', 'rr_chmsl'].map(name => ({
        name, opacity: group.getObjectByName(name).material.opacity,
      }));
    });
    for (const lamp of lamps) {
      expect(lamp.opacity, `${phase}: ${lamp.name}`).toBeCloseTo(lit
        ? (lamp.name === 'rr_chmsl' ? 0.9 : 0.95)
        : (lamp.name === 'rr_chmsl' ? 0.12 : 0.32), 5);
    }
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
