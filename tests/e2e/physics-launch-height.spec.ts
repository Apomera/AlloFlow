import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1000, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    (window as any).__tickHeight = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
}
async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), patch);
  await page.waitForTimeout(40);
}
async function tick(page: Page, count = 1) {
  await page.evaluate(n => { for (let i = 0; i < n; i++) (window as any).__tickHeight(1000 / 60); }, count);
}
async function finish(page: Page, hz = 60) {
  return page.evaluate(rate => {
    const cv = document.getElementById('physicsCanvas') as any;
    let count = 0;
    while (cv._launched && count++ < 20000) (window as any).__tickHeight(1000 / rate);
    return { landed: !cv._launched, range: cv._ball.mX, maxH: cv._ball.maxH, time: cv._ball.t,
      points: [...cv._trails.at(-1)], parameters: cv._trails.at(-1).parameters };
  }, hz);
}

test('horizontal elevated launch preserves paused energy and lands at the analytic time', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await mount(page);
  await setState(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, simSpeed: 0, showFormulas: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await tick(page, 20);
  const initial = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    return { y: cv._ball.mY, t: cv._ball.t, energy: cv._ball.E0, view: cv._launchView, prediction: cv._predictionCache.range };
  });
  expect(initial.y).toBe(10);
  expect(initial.t).toBe(0);
  expect(initial.energy).toBeCloseTo(421, 12);
  expect(initial.view.groundY - initial.view.y).toBeCloseTo(10 * initial.view.scale, 10);
  expect(initial.view.y).toBeGreaterThan(40);
  expect(initial.prediction).toBeCloseTo(15 * Math.sqrt(20 / 9.8), 9);
  await page.locator('[data-physics-inspect]').click();
  await expect(page.locator('[data-physics-inspection]')).toContainText('PE = 196.00 J');
  await page.locator('[data-physics-step]').click();
  await tick(page);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._ball.t)).toBeCloseTo(0.035, 12);
  await setState(page, { simSpeed: 1 });
  const result = await finish(page);
  expect(result.landed).toBe(true);
  expect(result.time).toBeCloseTo(Math.sqrt(20 / 9.8), 9);
  expect(result.range).toBeCloseTo(15 * result.time, 10);
  expect(result.maxH).toBe(10);
  expect(result.points[0]).toMatchObject({ mX: 0, mY: 10, t: 0 });
  expect(result.points.at(-1)).toMatchObject({ mY: 0, t: result.time, mX: result.range });
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.physics.runLog?.length)).toBe(1);
  expect(await page.evaluate(() => (window as any).__toolData.physics.runLog[0])).toMatchObject({ launchHeight: 10, modelVersion: 'projectile-v3' });
  await expect(page.locator('[data-physics-last-flight]')).toContainText('10');
  expect(errors).toEqual([]);
});

test('elevated drag has identical samples across frame rates and captures height during flight', async ({ page }) => {
  await mount(page);
  let canonical: Awaited<ReturnType<typeof finish>> | undefined;
  for (const [hz, speed] of [[30, 1], [60, 0.25], [144, 1]]) {
    await setState(page, { angle: 35, velocity: 15, gravity: 9.8, mass: 1, launchHeight: 50, airResist: true, simSpeed: speed });
    await page.getByRole('button', { name: 'Launch!', exact: true }).click();
    await tick(page);
    await setState(page, { launchHeight: 5 });
    await tick(page);
    expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._launchView.height)).toBe(50);
    const result = await finish(page, hz);
    expect(result.landed).toBe(true);
    expect(result.parameters.launchHeight).toBe(50);
    if (canonical) expect(result).toEqual(canonical);
    canonical = result;
  }
  const expected = await page.evaluate(() => (window as any).StemLab._physics.simulate(35, 15, 9.8, true, 1, 50));
  for (const key of ['range', 'maxH', 'time'] as const) expect(canonical![key]).toBeCloseTo(expected[key], 10);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.physics.lastFlight?.launchHeight)).toBe(50);
});

test('model comparison retains elevation and target missions restore exploration settings', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 0, velocity: 15, launchHeight: 10, airResist: true, simSpeed: 1 });
  await page.locator('[data-physics-model-comparison-start]').click();
  await finish(page);
  await page.waitForFunction(() => (document.getElementById('physicsCanvas') as any)._trails.length === 2, null, { polling: 20 });
  await finish(page);
  await page.waitForFunction(() => !!(window as any).__toolData.physics.modelComparison, null, { polling: 20 });
  expect(await page.evaluate(() => {
    const d = (window as any).__toolData.physics;
    return { height: d.launchHeight, angle: d.angle, paired: d.modelComparison.parameters.launchHeight, runs: d.runLog.map((r: any) => r.launchHeight) };
  })).toEqual({ height: 10, angle: 0, paired: 10, runs: [10, 10] });
  await expect(page.locator('[data-physics-model-comparison-settings]')).toContainText('10 m');
  await page.getByRole('button', { name: 'Start Mission', exact: true }).click();
  await expect(page.locator('[data-physics-parameter="launchHeight"]')).toBeDisabled();
  await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-launch-height', '0');
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await expect(page.locator('[data-physics-parameter="launchHeight"]')).toBeEnabled();
  await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-launch-height', '10');
  expect(await page.evaluate(() => (window as any).__toolData.physics.angle)).toBe(0);
  await page.getByRole('button', { name: /^Vacuum symmetry comparison/ }).click();
  const first = await finish(page);
  await page.waitForFunction(() => (document.getElementById('physicsCanvas') as any)._trails.length === 4, null, { polling: 20 });
  const second = await finish(page);
  expect(first.parameters.launchHeight).toBe(0);
  expect(second.parameters.launchHeight).toBe(0);
  expect(first.range).toBeCloseTo(second.range, 8);
  expect(await page.evaluate(() => (window as any).__toolData.physics.launchHeight)).toBe(10);
});

test('horizontal investigation records equal falling time when horizontal speed doubles', async ({ page }) => {
  await mount(page);
  const notebook = page.locator('[data-physics-investigations]');
  await notebook.locator('summary').click();
  await notebook.locator('[data-physics-investigation-activity]').selectOption('horizontal_motion');
  for (const n of [1, 2]) {
    await notebook.locator(`[data-physics-investigation-trial="${n}"]`).click();
    await page.getByRole('button', { name: 'Launch!', exact: true }).click();
    await finish(page);
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.physics.runLog?.length)).toBe(n);
  }
  const runs = await page.evaluate(() => (window as any).__toolData.physics.runLog);
  expect(runs.map((r: any) => [r.angle, r.launchHeight, r.drag])).toEqual([[0, 10, false], [0, 10, false]]);
  expect(runs[1].vel / runs[0].vel).toBe(2);
  expect(runs[1].time).toBeCloseTo(runs[0].time, 10);
  expect(runs[1].range / runs[0].range).toBeCloseTo(2, 10);
  await notebook.getByRole('checkbox', { name: 'Run 1', exact: true }).check();
  await notebook.getByRole('checkbox', { name: 'Run 2', exact: true }).check();
  await notebook.locator('#physics-investigation-observation').fill('Horizontal speed doubled the range while falling time stayed the same.');
  await notebook.locator('[data-physics-investigation-save]').click();
  await expect(notebook.locator('[data-physics-investigation-report]')).toContainText('Launch height above ground: 10 m');
  await expect(notebook.locator('[data-physics-investigation-report]')).toContainText('Horizontal speed doubled the range');
});
