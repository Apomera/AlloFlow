import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1000, height: 900, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__tickPhysics = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn(now));
    };
    w.__pendingFrames = () => frames.size;
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._startModelComparison, null, { polling: 20 });
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), patch);
  await page.waitForTimeout(30);
}

async function finishFlight(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let steps = 0;
    while (cv._launched && steps++ < 20000) w.__tickPhysics(1000 / 60);
    return { landed: !cv._launched, range: cv._ball.mX, maxH: cv._ball.maxH, time: cv._ball.t };
  });
}

test('paired models use two actual landings, preserve controls, and respect pause and stepping', async ({ page }) => {
  await mount(page);
  const parameters = { angle: 35, velocity: 20, gravity: 9.8, mass: 3, launchHeight: 0 };
  await setState(page, { ...parameters, airResist: true, simSpeed: 0 });
  await page.locator('[data-physics-model-comparison-start]').click();
  await page.evaluate(() => { for (let i = 0; i < 20; i++) (window as any).__tickPhysics(50); });
  await page.waitForTimeout(75);
  expect(await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    return { t: cv._ball.t, shots: cv._trails.length, result: (window as any).__toolData.physics.modelComparison };
  })).toEqual({ t: 0, shots: 1, result: null });

  await page.locator('[data-physics-step]').click();
  await page.evaluate(() => (window as any).__tickPhysics(16));
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._ball.t)).toBeCloseTo(0.035, 12);
  await setState(page, { simSpeed: 0.25 });
  const vacuum = await finishFlight(page);
  expect(vacuum.landed).toBe(true);
  await page.waitForFunction(() => (document.getElementById('physicsCanvas') as any)._trails.length === 2, null, { polling: 20 });
  expect(await page.evaluate(() => (window as any).__toolData.physics.modelComparison)).toBeNull();

  await setState(page, { simSpeed: 0 });
  await page.evaluate(() => { for (let i = 0; i < 20; i++) (window as any).__tickPhysics(50); });
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._ball.t)).toBe(0);
  await setState(page, { simSpeed: 0.5 });
  const drag = await finishFlight(page);
  expect(drag.landed).toBe(true);
  await page.waitForFunction(() => !!(window as any).__toolData.physics.modelComparison, null, { polling: 20 });

  const state = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any, d = w.__toolData.physics;
    return {
      result: d.modelComparison,
      controls: { angle: d.angle, velocity: d.velocity, gravity: d.gravity, mass: d.mass, launchHeight: d.launchHeight, airResist: d.airResist },
      log: d.runLog,
      shots: cv._trails.map((tr: any) => ({ parameters: tr.parameters, last: tr.at(-1), first: tr[0] })),
      expectedVacuum: w.StemLab._physics.simulate(d.angle, d.velocity, d.gravity, false, d.mass, d.launchHeight),
      expectedDrag: w.StemLab._physics.simulate(d.angle, d.velocity, d.gravity, true, d.mass, d.launchHeight)
    };
  });
  expect(state.controls).toEqual({ ...parameters, airResist: true });
  expect(state.result.parameters).toEqual(parameters);
  expect(state.log.map((r: any) => ({ n: r.n, drag: r.drag }))).toEqual([{ n: 1, drag: false }, { n: 2, drag: true }]);
  for (const [index, model, actual, expected] of [[0, 'vacuum', vacuum, state.expectedVacuum], [1, 'drag', drag, state.expectedDrag]] as const) {
    expect(state.log[index].launchHeight).toBe(0);
    expect(state.log[index].modelVersion).toBe('projectile-v3');
    expect(state.shots[index].parameters).toMatchObject(parameters);
    for (const key of ['range', 'maxH', 'time'] as const) {
      expect(state.result[model][key]).toBeCloseTo(actual[key], 12);
      expect(state.result[model][key]).toBeCloseTo(expected[key], 10);
      expect(state.log[index][key]).toBeCloseTo(actual[key], 12);
    }
    expect(state.shots[index].first.t).toBe(0);
    expect(state.shots[index].first.mY).toBe(parameters.launchHeight);
    expect(state.shots[index].last.mY).toBe(0);
    expect(state.shots[index].last.mX).toBe(actual.range);
    expect(state.shots[index].last.t).toBe(actual.time);
  }
  expect(state.result.drag.range).toBeLessThan(state.result.vacuum.range);
  await expect(page.locator('[data-physics-model-comparison]')).toBeVisible();
  await expect(page.locator('[data-physics-model-comparison-settings]')).toContainText('35°, 20 m/s, g = 9.8 m/s², 3 kg');
  await expect(page.locator('[data-comparison-measurement="range"]')).toContainText((drag.range - vacuum.range).toFixed(3));
  await setState(page, { angle: 65, velocity: 30 });
  await expect(page.locator('[data-physics-model-comparison-settings]')).toContainText('35°, 20 m/s');
});

test('manual launch and changed launch settings cancel pending paired flights', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 35, velocity: 10, simSpeed: 0 });
  await page.locator('[data-physics-model-comparison-start]').click();
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._demo)).toBeNull();
  await page.locator('[data-physics-model-comparison-start]').click();
  await setState(page, { mass: 2, simSpeed: 1 });
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._demo)).toBeNull();
  await finishFlight(page);
  await page.waitForTimeout(75);
  expect(await page.evaluate(() => ({ count: (document.getElementById('physicsCanvas') as any)._trails.length, result: (window as any).__toolData.physics.modelComparison }))).toEqual({ count: 3, result: null });
});

test('missions, clearing and unmount cancel paired comparisons without fabricated results', async ({ page }) => {
  await mount(page);
  await setState(page, { simSpeed: 0 });
  await page.locator('[data-physics-model-comparison-start]').click();
  await setState(page, { targetMode: true, targetRound: 1, targetConstraint: { type: 'fixedAngle', value: 45 } });
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._demo)).toBeNull();
  await expect(page.locator('[data-physics-model-comparison-start]')).toBeDisabled();
  await setState(page, { targetMode: false, targetConstraint: null });
  await page.locator('[data-physics-model-comparison-start]').click();
  await setState(page, { battleMode: true });
  await expect(page.locator('[data-physics-model-comparison-start]')).toBeDisabled();
  expect(await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, before = cv._trails.length;
    cv._startModelComparison();
    return { demo: cv._demo, unchanged: cv._trails.length === before };
  })).toEqual({ demo: null, unchanged: true });
  await setState(page, { battleMode: false });
  await page.locator('[data-physics-model-comparison-start]').click();
  await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
  expect(await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    return { demo: cv._demo, launched: cv._launched, shots: cv._trails.length, result: (window as any).__toolData.physics.modelComparison };
  })).toEqual({ demo: null, launched: false, shots: 0, result: null });
  await page.locator('[data-physics-model-comparison-start]').click();
  await page.evaluate(() => { (window as any).__modelCanvas = document.getElementById('physicsCanvas'); });
  await harness.destroy(page);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => ({ demo: (window as any).__modelCanvas._demo, pending: (window as any).__pendingFrames() }))).toEqual({ demo: null, pending: 0 });
});
