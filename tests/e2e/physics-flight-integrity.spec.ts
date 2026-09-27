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
    window.requestAnimationFrame = (cb) => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = (key) => { frames.delete(key); };
    w.__tickPhysics = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn(now));
      return frames.size;
    };
    w.__pendingFrames = () => frames.size;
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
}
async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), patch);
  await page.waitForTimeout(30);
}
async function finish(page: Page, hz = 60) {
  return page.evaluate((fps) => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let count = 0;
    while (cv._launched && count++ < 10000) w.__tickPhysics(1000 / fps);
    const trail = cv._trails.at(-1);
    return { landed: !cv._launched, time: cv._ball.t, range: cv._ball.mX, maxH: cv._ball.maxH, first: trail[0], last: trail.at(-1), mass: trail.mass, samples: trail.length };
  }, hz);
}

test('prediction, samples and measured results agree across display and playback rates', async ({ page }) => {
  await mount(page);
  const measurements = [];
  for (const hz of [30, 60, 144]) for (const speed of [1, 0.25]) {
    await setState(page, { angle: 35, velocity: 15, gravity: 9.8, mass: 1, airResist: true, simSpeed: speed });
    await page.getByRole('button', { name: 'Launch!', exact: true }).click();
    const result = await finish(page, hz);
    expect(result.landed).toBe(true);
    expect(result.first.t).toBe(0);
    expect(result.last.mY).toBe(0);
    expect(result.last.mX).toBe(result.range);
    expect(result.last.t).toBe(result.time);
    measurements.push(result);
  }
  const expected = await page.evaluate(() => (window as any).StemLab._physics.simulate(35, 15, 9.8, true, 1));
  for (const r of measurements) {
    expect(r.range).toBeCloseTo(expected.range, 10);
    expect(r.time).toBeCloseTo(expected.time, 10);
    expect(r.maxH).toBeCloseTo(expected.maxH, 10);
    expect(r.samples).toBe(measurements[0].samples);
  }
});

test('paused launch waits for a step and short flights use the actual impact', async ({ page }) => {
  await mount(page);
  await setState(page, { simSpeed: 0, angle: 5, velocity: 5, gravity: 25 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  const paused = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    for (let i = 0; i < 20; i++) w.__tickPhysics(50);
    return { t: cv._ball.t, launched: cv._launched, count: w.__toolData.physics.runCount || 0, samples: cv._trails.at(-1).length };
  });
  expect(paused).toEqual({ t: 0, launched: true, count: 0, samples: 1 });
  await page.locator('[data-physics-step]').click();
  await page.evaluate(() => (window as any).__tickPhysics(16));
  await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 1, null, { polling: 20, timeout: 10_000 });
  const landed = await page.evaluate(() => (window as any).__toolData.physics.lastFlight);
  expect(landed.range).toBeCloseTo(25 * Math.sin(10 * Math.PI / 180) / 25, 9);
  expect(landed.time).toBeCloseTo(2 * 5 * Math.sin(5 * Math.PI / 180) / 25, 9);
  expect(Number.isFinite(landed.maxH)).toBe(true);
});

test('UI updates retain the controller and unmount disposes its work', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { (window as any).__controller = (document.getElementById('physicsCanvas') as any)._launch; });
  for (let i = 0; i < 4; i++) await setState(page, { showGraphs: i % 2 === 0, velocity: 20 + i });
  const retained = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__tickPhysics(16); w.__tickPhysics(16);
    return { same: cv._launch === w.__controller, pending: w.__pendingFrames() };
  });
  expect(retained).toEqual({ same: true, pending: 0 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await harness.destroy(page);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => (window as any).__pendingFrames())).toBe(0);
});

test('symmetry compares completed vacuum flights and survives pause without timers advancing it', async ({ page }) => {
  await mount(page);
  await setState(page, { airResist: true, velocity: 10, simSpeed: 0 });
  await page.getByRole('button', { name: /Vacuum symmetry comparison/i }).click();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails.length)).toBe(1);
  await setState(page, { simSpeed: 1 });
  await finish(page);
  await page.waitForFunction(() => (document.getElementById('physicsCanvas') as any)._trails.length === 2, null, { polling: 20, timeout: 10_000 });
  await finish(page);
  await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 2, null, { polling: 20, timeout: 10_000 });
  const shots = await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails.map((t: any) => ({ angle: t.angle, drag: t.drag, range: t.at(-1).mX })));
  expect(shots.map((s: any) => s.angle)).toEqual([30, 60]);
  expect(shots.every((s: any) => s.drag === false)).toBe(true);
  expect(shots[0].range).toBeCloseTo(shots[1].range, 9);
});

test('exports preserve capped run IDs and the current flight mass and impact', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const w = window as any;
    const copy = async (value: string) => { w.__copiedPhysics = value; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
  });
  await setState(page, { angle: 5, velocity: 5, gravity: 25, showFlightData: true });
  for (let i = 1; i <= 9; i++) {
    await page.getByRole('button', { name: 'Launch!', exact: true }).click();
    await finish(page);
    await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, i, { polling: 20 });
  }
  await page.getByRole('button', { name: 'Copy the experiment log as CSV for a spreadsheet', exact: true }).click();
  const rows = await page.evaluate(() => (window as any).__copiedPhysics.trim().split('\n').slice(1).map((s: string) => Number(s.split(',')[0])));
  expect(rows).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  await setState(page, { mass: 10, simSpeed: 0 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__copiedPhysics)).toContain('mass_kg=10');
  await page.locator('[data-physics-step]').click();
  await page.evaluate(() => (window as any).__tickPhysics(16));
  await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 10, null, { polling: 20 });
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  const exported = await page.evaluate(() => ({ csv: (window as any).__copiedPhysics, flight: (window as any).__toolData.physics.lastFlight }));
  const end = exported.csv.trim().split('\n').at(-1).split(',').map(Number);
  expect(end[0]).toBe(Number(exported.flight.time.toFixed(3)));
  expect(end[1]).toBe(Number(exported.flight.range.toFixed(2)));
  expect(end[2]).toBe(0);
});

test('keyboard respects target locks and manual launches cancel a pending demo', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, targetMode: true, targetRound: 1, targetConstraint: { type: 'fixedAngle', value: 45 } });
  await page.locator('#physicsCanvas').focus();
  await page.keyboard.press('ArrowUp');
  expect(await page.evaluate(() => (window as any).__toolData.physics.angle)).toBe(45);
  await setState(page, { targetMode: false, targetConstraint: null, simSpeed: 0 });
  await page.getByRole('button', { name: /Vacuum symmetry comparison/i }).click();
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._demo)).toBeNull();
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails.at(-1).angle)).toBe(45);
});
