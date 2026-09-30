import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
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
    w.__historyTick = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
    w.__historyCanvasText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas') w.__historyCanvasText.push(String(text));
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%';
    const w = window as any; w.__historyCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__historyCsv.push(text); return Promise.resolve(); };
  });
}
async function patch(page: Page, next: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), next);
  await page.waitForTimeout(40);
}
async function redraw(page: Page) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__historyCanvasText = []; cv._physScheduleFrame(); w.__historyTick();
  });
}
async function launch(page: Page, airResist: boolean, count: number, settings = {}) {
  await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist, simSpeed: 2, showGraphs: true, showFlightData: true, showEnergy: true, ...settings });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) w.__historyTick();
    if (cv._launched) throw Error('History fixture did not land');
  });
  await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, count, { polling: 20 });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ points: [...t], parameters: t.parameters, run: t.run, apex: t.apex, modelVersion: t.modelVersion })),
      log: w.__toolData.physics.runLog, lastFlight: w.__toolData.physics.lastFlight };
  });
}
async function copyCsv(page: Page) {
  const before = await page.evaluate(() => (window as any).__historyCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__historyCsv.length)).toBe(before + 1);
  return page.evaluate(() => (window as any).__historyCsv.at(-1) as string);
}
async function assertRun(page: Page, run: number, landmarks = true) {
  await redraw(page);
  const state = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, s = cv._inspection.snapshot, t = cv._inspection.trail;
    return { s, recorded: t[s.index], marker: cv._visualInspection, text: (window as any).__historyCanvasText,
      apex: t.apex, end: t.at(-1), retained: cv._trails.includes(t), simSpeed: cv.dataset.simSpeed };
  });
  expect(state.retained).toBe(true);
  expect(state.s.run).toBe(run);
  expect(state.simSpeed).toBe('0');
  expect(state.s).toMatchObject({ t: state.recorded.t, x: state.recorded.mX, y: state.recorded.mY, vx: state.recorded.mVx, vy: state.recorded.mVy });
  expect(state.marker).toMatchObject({ run, index: state.s.index, t: state.s.t });
  if (landmarks) {
    expect(state.text).toContain(`Landed ${state.end.mX.toFixed(1)} m`);
    if (state.apex?.tSec > .001) expect(state.text.some((t: string) => t.includes((state.apex.mY !== 0 && Math.abs(state.apex.mY) < .01 ? state.apex.mY.toPrecision(3) : state.apex.mY.toFixed(2)) + ' m') && t.includes('APEX'))).toBe(true);
  }
  await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', String(run));
  await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-run', String(run));
  for (const field of ['vx', 'vy']) {
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-sample-index', String(state.s.index));
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-value', String(state.s[field]));
  }
  await expect(page.locator('[data-physics-sample-inspector]')).toContainText('Run ' + run);
  await expect(page.locator('[data-physics-plot-key]')).toContainText('Selected flight speed');
  return state;
}

test('vacuum and drag history keep every view on the chosen original run', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await launch(page, false, 1);
  await launch(page, true, 2);
  await patch(page, { angle: 80, velocity: 5, mass: 9, launchHeight: 30, showOverlay: true });
  const before = await evidence(page);
  const latestCsv = await copyCsv(page);
  expect(latestCsv).toContain('# run=2,');
  await page.locator('[data-physics-history-select]').selectOption('0');
  const first = await assertRun(page, 1);
  const originalCsv = await copyCsv(page);
  expect(originalCsv).toContain('# run=1,');
  expect(originalCsv).toContain('air_drag=off');
  expect(originalCsv.split('\n')).toHaveLength(before.trails[0].points.length + 2);
  expect(first.s.parameters).toMatchObject({ angle: 35, velocity: 35, mass: 2, launchHeight: 10, airResist: false });
  await expect(page.locator('[data-physics-motion-panel]')).toContainText('horizontal velocity stays constant');
  const slider = page.locator('[data-physics-graph-time-slider]');
  await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
  expect((await assertRun(page, 1)).s.index).toBe(1);
  await expect(slider).toBeFocused();
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const highest = await assertRun(page, 1);
  const points = before.trails[0].points;
  expect(highest.s.index).toBe(points.reduce((best: number, p: any, i: number) => p.mY > points[best].mY ? i : best, 0));
  await page.locator('[data-physics-run-inspect="2"]').click();
  expect((await assertRun(page, 2)).s.parameters.airResist).toBe(true);
  await expect(page.locator('[data-physics-motion-panel]')).toContainText('Horizontal velocity decreases');
  await page.locator('[data-physics-run-inspect="1"]').click();
  await assertRun(page, 1);
  expect(await copyCsv(page)).toBe(originalCsv);
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-sample-close]').click();
  await expect(page.locator('[data-physics-history-select]')).toBeFocused();
  await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', '2');
  expect(await copyCsv(page)).toBe(latestCsv);
  expect(errors).toEqual([]);
});

test('retention and clearing remove inspection links while saved summaries remain valid', async ({ page }) => {
  await mount(page);
  for (let n = 1; n <= 6; n++) await launch(page, n % 2 === 0, n, { angle: 5, velocity: 5, gravity: 25, launchHeight: 0 });
  await expect(page.locator('[data-physics-history-select] option')).toHaveCount(5);
  await expect(page.locator('[data-physics-run-inspect="1"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-run-inspect="2"]')).toHaveCount(1);
  await page.locator('[data-physics-run-inspect="2"]').click();
  await assertRun(page, 2, false);
  const saved = (await evidence(page)).log;
  await patch(page, { runLog: saved.map((r: any) => r.n === 2 ? { ...r, angle: 40 } : r) });
  await expect(page.locator('[data-physics-run-inspect="2"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-run-inspect="3"]')).toHaveCount(1);
  await patch(page, { runLog: saved.map((r: any) => r.n === 2 ? { ...r, modelVersion: 'projectile-v2' } : r) });
  await expect(page.locator('[data-physics-run-inspect="2"]')).toHaveCount(0);
  await patch(page, { runLog: saved });
  await expect(page.locator('[data-physics-run-inspect="2"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
  await expect(page.locator('[data-physics-sample-inspector]')).toHaveCount(0);
  await expect(page.locator('[data-physics-flight-history]')).toHaveCount(0);
  await expect(page.locator('[data-physics-run-inspect]')).toHaveCount(0);
  expect((await evidence(page)).log).toEqual(saved);
  await harness.destroy(page);
  await mount(page);
  await patch(page, { runLog: saved, runCount: 6, showGraphs: true, showFlightData: true });
  await expect(page.locator('[data-physics-run-log] tbody tr')).toHaveCount(6);
  await expect(page.locator('[data-physics-run-inspect]')).toHaveCount(0);
  await expect(page.locator('[data-physics-flight-history]')).toHaveCount(0);
  await launch(page, false, 7, { angle: 5, velocity: 5, gravity: 25, launchHeight: 0 });
  await expect(page.locator('[data-physics-run-inspect]')).toHaveCount(1);
  await expect(page.locator('[data-physics-run-inspect="7"]')).toHaveCount(1);
});

test('inspecting an older flight pauses a newer launch and resuming continues its actual state', async ({ page }) => {
  await mount(page); await launch(page, false, 1);
  await patch(page, { airResist: true, simSpeed: 0 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await expect(page.locator('[data-physics-history-select] option').last()).toContainText('Unfinished flight');
  const before = await evidence(page);
  await page.locator('[data-physics-history-select]').selectOption('0');
  await assertRun(page, 1);
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-history-select]').selectOption('1');
  await expect(page.locator('[data-physics-sample-slider]')).toBeDisabled();
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._inspection.snapshot)).toMatchObject({ run: null, t: 0, y: 10 });
  await page.locator('[data-physics-step]').click(); await redraw(page);
  await expect(page.locator('[data-physics-sample-inspector]')).toHaveCount(0);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._ball.t)).toBeCloseTo(.035, 10);
});

for (const theme of ['default', 'dark', 'contrast']) test(`320px ${theme} history is accessible without page overflow`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  await page.evaluate(t => {
    const wrap = document.getElementById('wrap')!;
    const main = document.createElement('main'); main.className = 'main-content';
    const card = document.createElement('div'); card.className = 'card';
    wrap.parentElement!.insertBefore(main, wrap); main.append(card); card.append(wrap);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('high-contrast', t === 'contrast');
    const ctx = (window as any).__ctx;
    ctx.isDark = t === 'dark'; ctx.isContrast = t === 'contrast'; ctx.theme = t;
    main.className = 'main-content ' + (t === 'default' ? '' : 'theme-' + t);
    (window as any).__rerender();
  }, theme);
  await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
  await launch(page, false, 1); await launch(page, true, 2);
  const chooser = page.getByLabel('Inspect a recorded flight', { exact: true });
  await chooser.focus(); await chooser.selectOption('0'); await assertRun(page, 1, false);
  await expect(chooser).toBeFocused();
  await page.locator('[data-physics-history-inspect]').click();
  await expect(page.locator('[data-physics-sample-slider]')).toBeFocused();
  const layout = await page.locator('[data-physics-flight-history]').evaluate(root => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    controls: [...root.querySelectorAll('button,select')].map(el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width })),
  }));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  for (const c of layout.controls) { expect(c.height).toBeGreaterThanOrEqual(44); expect(c.width).toBeGreaterThan(0); }
});
