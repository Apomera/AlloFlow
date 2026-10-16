import { test, expect, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-force-readings-2026-10-13');
type View = 'motion' | 'forces' | 'energy' | 'data';
type Force = 'gravity' | 'drag' | 'net';
type Vector = { x: number; y: number; magnitude: number };
const forces: Force[] = ['gravity', 'drag', 'net'];

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
    w.__constructionTick = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__setConstructionTheme = (theme: string) => {
      const ctx = w.__ctx; ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__constructionCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__constructionCsv.push(text); return Promise.resolve(); };
  });
}

async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), values);
  await page.waitForTimeout(40);
}

async function view(page: Page, name: View) {
  const tab = page.locator(`[data-physics-analysis-tab="${name}"]`);
  if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    (document.getElementById('physicsCanvas') as any)._physScheduleFrame(); (window as any).__constructionTick();
  });
}

async function launch(page: Page, drag = false, complete = true) {
  const count = await page.evaluate(() => ((window as any).__toolData.physics.runLog || []).length);
  await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag,
    simSpeed: complete ? 1 : 0, showGraphs: true, showFlightData: true, showEnergy: true });
  await page.locator('[data-physics-launch]').click();
  if (complete) {
    await page.evaluate(() => {
      const cv = document.getElementById('physicsCanvas') as any;
      let ticks = 0;
      while (cv._launched && ticks++ < 10000) (window as any).__constructionTick();
      if (cv._launched) throw Error('The force construction fixture did not land');
    });
    await page.waitForFunction(n => (window as any).__toolData.physics.runLog.length === n + 1, count, { polling: 20 });
    await patch(page, { simSpeed: 0 });
  }
  await redraw(page);
}

async function openForces(page: Page) {
  await view(page, 'forces');
  const details = page.locator('[data-physics-sample-forces]');
  if (!(await details.evaluate(node => (node as HTMLDetailsElement).open))) {
    await details.locator('summary').focus(); await details.locator('summary').press('Enter');
  }
  await expect(details).toHaveJSProperty('open', true);
  await expect(page.locator('[data-physics-force-construction]')).toBeVisible();
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ points: [...t], parameters: t.parameters,
      run: t.run, apex: t.apex, modelVersion: t.modelVersion })), runLog: d.runLog, lastFlight: d.lastFlight,
      recordedFlights: d.recordedFlights };
  });
}

async function copyCsv(page: Page) {
  const previous = await page.locator('[data-physics-analysis-workspace]').getAttribute('data-physics-analysis-view') as View;
  await view(page, 'data');
  try {
    const before = await page.evaluate(() => (window as any).__constructionCsv.length);
    await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__constructionCsv.length)).toBe(before + 1);
    return await page.evaluate(() => (window as any).__constructionCsv.at(-1) as string);
  } finally { await view(page, previous); }
}

function formatted(value: number) {
  return value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
}

// Derive expectations from original recorded parameters and velocities, without using rendered force attributes.
function vectors(point: any, parameters: any): Record<Force, Vector> {
  const speed = Math.hypot(point.mVx, point.mVy), k = parameters.drag ? .004 : 0;
  const gravity = { x: 0, y: -parameters.mass * parameters.gravity, magnitude: parameters.mass * parameters.gravity };
  const drag = { x: -k * speed * point.mVx, y: -k * speed * point.mVy, magnitude: k * speed * speed };
  const net = { x: gravity.x + drag.x, y: gravity.y + drag.y,
    magnitude: Math.hypot(gravity.x + drag.x, gravity.y + drag.y) };
  return { gravity, drag, net };
}

async function assertComponentBalances(page: Page, expected: Record<Force, Vector>) {
  const figure = page.locator('[data-physics-force-construction]');
  const balances = figure.locator('[data-physics-force-component-balances]');
  await expect(balances).toBeVisible(); expect(await balances.evaluate(node => node.tagName)).toBe('DL');
  await expect(balances.locator('dt')).toHaveCount(2);
  await expect(balances.locator('[data-physics-force-balance-axis]')).toHaveCount(2);
  await expect(figure.getByText('Gravity + air drag ≈ net force in each direction.', { exact: true })).toBeVisible();
  for (const [axis, label] of [['x', 'Horizontal · Fx'], ['y', 'Vertical · Fy']] as const) {
    const reading = balances.locator(`[data-physics-force-balance-axis="${axis}"]`);
    await expect(balances.locator('dt').filter({ hasText: label })).toHaveCount(1);
    expect(await reading.evaluate(node => node.tagName)).toBe('DD');
    for (const force of forces) await expect(reading).toHaveAttribute('data-' + force, String(expected[force][axis]));
    await expect(reading).toHaveText(formatted(expected.gravity[axis]) + ' N + (' + formatted(expected.drag[axis]) +
      ' N) ≈ ' + formatted(expected.net[axis]) + ' N');
  }
}

async function assertConstruction(page: Page, phase?: string) {
  await redraw(page);
  const captured = await page.evaluate(() => {
    const inspection = (document.getElementById('physicsCanvas') as any)._inspection;
    return { snapshot: inspection.snapshot, index: inspection.index, points: [...inspection.trail],
      parameters: inspection.trail.parameters, run: inspection.trail.run ?? null };
  });
  const point = captured.points[captured.index], expected = vectors(point, captured.parameters);
  const scale = captured.points.reduce((maximum: number, recorded: any) => {
    const value = vectors(recorded, captured.parameters);
    return Math.max(maximum, value.gravity.magnitude, value.drag.magnitude, value.net.magnitude);
  }, 0);
  expect(Number.isFinite(scale)).toBe(true);
  if (phase) expect(captured.snapshot.phase).toBe(phase);
  const figure = page.locator('[data-physics-force-construction]'), graph = figure.locator('[data-physics-force-construction-graph]');
  await expect(figure).toBeVisible();
  await expect(figure).toHaveAttribute('data-run', captured.run == null ? 'unfinished' : String(captured.run));
  await expect(figure).toHaveAttribute('data-sample-index', String(captured.index));
  await expect(figure).toHaveAttribute('data-time', String(point.t));
  expect(await figure.getAttribute('tabindex')).toBeNull();
  const heading = await figure.getAttribute('aria-labelledby'); expect(heading).toBeTruthy();
  await expect(page.locator('#' + heading)).toBeVisible();
  const descriptions = (await graph.getAttribute('aria-describedby') || '').split(/\s+/);
  expect((await figure.getAttribute('aria-describedby') || '').split(/\s+/)).toEqual(descriptions);
  for (const id of ['physics-force-construction-help', 'physics-force-scale-help', 'physics-force-construction-range']) {
    expect(descriptions).toContain(id); await expect(page.locator('#' + id)).toHaveCount(1);
    await expect(page.locator('#' + id)).toBeVisible();
  }
  const range = figure.locator('[data-physics-force-construction-range]');
  await expect(range).toHaveAttribute('id', 'physics-force-construction-range');
  await expect(range).toHaveAttribute('data-value', String(scale));
  await expect(range).toBeVisible();
  await expect(range).toHaveText(scale > 0 ? 'Circle radius: ' + formatted(scale) + ' N'
    : 'All recorded forces are zero; no arrows are drawn.');
  await assertComponentBalances(page, expected);
  await expect(graph).toHaveAttribute('viewBox', '0 0 320 220');
  await expect(graph).toHaveAttribute('role', 'img'); await expect(graph).toHaveAttribute('focusable', 'false');
  await expect(graph).toHaveAttribute('aria-label', new RegExp('t = ' + point.t.toFixed(3).replace('.', '\\.') + ' s'));
  for (const key of forces) await expect(graph).toHaveAttribute('aria-label', new RegExp('Fx = ' + formatted(expected[key].x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    ' N, Fy = ' + formatted(expected[key].y).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' N'));
  await expect(graph).toHaveAttribute('data-scale-force', String(scale));
  expect(await graph.locator('text').allTextContents()).toEqual(['+x', '−x', '+y', '−y']);
  await expect(page.locator('[data-physics-force-balance]')).toHaveAttribute('data-force-scale', String(scale));
  const reference = graph.locator('[data-physics-force-construction-scale]');
  await expect(reference).toHaveAttribute('r', '70'); await expect(reference).toHaveAttribute('cx', '160');
  await expect(reference).toHaveAttribute('cy', '110'); await expect(reference).toHaveAttribute('data-value', String(scale));
  const gravityTip = { x: 160, y: 110 - (scale > 0 ? 70 * (expected.gravity.y / scale) : 0) };
  const netTip = { x: 160 + (scale > 0 ? 70 * (expected.net.x / scale) : 0),
    y: 110 - (scale > 0 ? 70 * (expected.net.y / scale) : 0) };
  await expect(graph.locator('[data-physics-force-construction-arrow]')).toHaveCount(forces.filter(key => expected[key].magnitude > 0).length);
  for (const key of forces) {
    const value = expected[key], arrow = graph.locator(`[data-physics-force-construction-arrow="${key}"]`);
    await expect(arrow).toHaveCount(value.magnitude === 0 ? 0 : 1);
    for (const [field, quantity] of Object.entries({ x: value.x, y: value.y, magnitude: value.magnitude })) {
      const reading = page.locator(`[data-physics-force-component="${key}-${field}"]`);
      await expect(reading).toHaveAttribute('data-value', String(quantity)); await expect(reading).toHaveText(formatted(quantity) + ' N');
    }
    if (value.magnitude === 0) continue;
    for (const [field, quantity] of Object.entries({ fx: value.x, fy: value.y, magnitude: value.magnitude, scale })) {
      await expect(arrow).toHaveAttribute('data-' + field, String(quantity));
    }
    const geometry = await arrow.evaluate(node => ({
      ...Object.fromEntries(['x1', 'y1', 'x2', 'y2'].map(key => [key, Number(node.getAttribute(key))])),
      width: parseFloat(getComputedStyle(node).strokeWidth), dash: node.getAttribute('stroke-dasharray'),
    }));
    const start = key === 'drag' ? gravityTip : { x: 160, y: 110 };
    const end = key === 'gravity' ? gravityTip : netTip;
    expect(geometry.x1).toBeCloseTo(start.x, 12); expect(geometry.y1).toBeCloseTo(start.y, 12);
    expect(geometry.x2).toBeCloseTo(end.x, 12); expect(geometry.y2).toBeCloseTo(end.y, 12);
    expect([geometry.x1, geometry.y1, geometry.x2, geometry.y2].every(Number.isFinite)).toBe(true);
    expect(Math.hypot(geometry.x2 - geometry.x1, geometry.y2 - geometry.y1)).toBeCloseTo(70 * (value.magnitude / scale), 11);
    expect(geometry.width).toBe(key === 'net' ? 5 : 3);
    expect(geometry.dash).toBe(key === 'gravity' ? '8 4' : key === 'drag' ? '2 5' : null);
    const head = graph.locator(`[data-physics-force-construction-head="${key}"]`);
    await expect(head).toHaveCount(1);
    const length = 70 * (value.magnitude / scale);
    expect(Number(await head.getAttribute('data-vector-length'))).toBeCloseTo(length, 12);
    expect(Number(await head.getAttribute('data-length'))).toBeCloseTo(Math.min(8, length / 3), 12);
    expect(Number(await head.getAttribute('data-length'))).toBeGreaterThan(0);
    const cardArrow = page.locator(`[data-physics-force-arrow="${key}"]`);
    await expect(cardArrow).toHaveAttribute('data-scale', String(scale));
    expect(Number(await cardArrow.getAttribute('x2'))).toBeCloseTo(64 + 42 * (value.x / scale), 12);
    expect(Number(await cardArrow.getAttribute('y2'))).toBeCloseTo(64 - 42 * (value.y / scale), 12);
  }
  if (expected.net.magnitude > 0) {
    const order = await graph.locator('[data-physics-force-construction-arrow]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-physics-force-construction-arrow')));
    expect(order[0]).toBe('net');
  }
  return { ...captured, expected, scale, gravityTip, netTip };
}

test('force construction keeps one completed-flight scale through vacuum, drag, controls, and older-flight inspection', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  let firstCsv = '', firstScale = 0;
  for (const drag of [false, true]) {
    await launch(page, drag); const before = await evidence(page), csv = await copyCsv(page);
    await page.locator('[data-physics-inspect]').click(); await openForces(page);
    const moments: Awaited<ReturnType<typeof assertConstruction>>[] = [];
    for (const [jump, phase] of [['launch', 'rising'], ['highest', 'apex']] as const) {
      await page.locator(`[data-physics-sample-jump="${jump}"]`).click();
      moments.push(await assertConstruction(page, phase));
    }
    await page.locator('[data-physics-sample-next]').click(); moments.push(await assertConstruction(page, 'falling'));
    await page.locator('[data-physics-sample-jump="latest"]').click(); moments.push(await assertConstruction(page, 'impact'));
    expect(new Set(moments.map(moment => moment.scale)).size).toBe(1);
    await expect(page.locator('#physics-force-scale-help')).toContainText('Selecting another recorded moment keeps this scale');
    await expect(page.locator('#physics-force-scale-help')).not.toContainText('new points');
    const apex = moments[1]; expect(apex.expected.drag.y === 0).toBe(true);
    expect(apex.expected.gravity.magnitude).toBe(19.6); expect(apex.expected.net.y).toBe(-19.6);
    if (drag) {
      expect(moments[0].expected.drag.y).toBeLessThan(0); expect(moments[2].expected.drag.y).toBeGreaterThan(0);
      expect(apex.expected.drag.x).toBeLessThan(0);
      expect(moments[2].expected.net.magnitude).toBeLessThan(moments[0].expected.net.magnitude);
    } else {
      expect(moments.every(moment => moment.expected.drag.magnitude === 0)).toBe(true);
      expect(apex.gravityTip).toEqual(apex.netTip); expect(apex.scale).toBe(19.6);
      await expect(page.locator('[data-physics-force-construction-overlap]')).toBeVisible();
    }
    await patch(page, { angle: 80, velocity: 5, gravity: 25, mass: 9, launchHeight: 30, airResist: !drag });
    await page.locator('[data-physics-sample-jump="launch"]').click();
    expect((await assertConstruction(page, 'rising')).scale).toBe(moments[0].scale);
    expect(await evidence(page)).toEqual(before); expect(await copyCsv(page)).toBe(csv);
    if (!drag) { firstCsv = csv; firstScale = moments[0].scale; }
  }
  const both = await evidence(page);
  await page.locator('[data-physics-history-select]').selectOption('0'); await openForces(page);
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const older = await assertConstruction(page, 'apex'); expect(older.run).toBe(1); expect(older.scale).toBe(firstScale);
  expect(older.parameters).toMatchObject({ mass: 2, gravity: 9.8, drag: false });
  expect(await copyCsv(page)).toBe(firstCsv); expect(await evidence(page)).toEqual(both); expect(errors).toEqual([]);
});

test('zero, tiny, subnormal, opposing and signed forces retain exact geometry and scale from unplotted observations', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, true, false);
  const fixtures = [
    { name: 'all zero', mass: 2, gravity: 0, drag: false, points: [{ vx: 0, vy: 0 }] },
    { name: 'tiny drag', mass: 2, gravity: 9.8, drag: true, points: [{ vx: .001, vy: 0 }] },
    { name: 'minimum positive gravity', mass: Number.MIN_VALUE, gravity: 1, drag: false, points: [{ vx: 0, vy: 0 }] },
    { name: 'cancelling forces', mass: .4, gravity: 1, drag: true, points: [{ vx: 0, vy: -10 }] },
    { name: 'upward net', mass: .2, gravity: 1, drag: true, points: [{ vx: 0, vy: -10 }] },
    { name: 'leftward downward drag', mass: 2, gravity: 9.8, drag: true, points: [{ vx: 8, vy: 6 }] },
    { name: 'rightward upward drag', mass: 2, gravity: 9.8, drag: true, points: [{ vx: -8, vy: -6 }] },
    { name: 'full-resolution peak omitted by graph', mass: 2, gravity: 9.8, drag: true,
      points: Array.from({ length: 161 }, (_, index) => ({ vx: index === 1 ? 100 : 1, vy: 0 })) },
  ];
  for (const fixture of fixtures) {
    if (await page.locator('[data-physics-sample-close]').count()) await page.locator('[data-physics-sample-close]').click();
    await page.evaluate(value => {
      const cv = document.getElementById('physicsCanvas') as any, trail = cv._trails.at(-1), template = trail[0];
      // These synthetic observations isolate the supported captured-record display contract; they are not a simulated flight.
      trail.parameters = { ...trail.parameters, velocity: 0, mass: value.mass, gravity: value.gravity, launchHeight: 10, drag: value.drag };
      trail.splice(0, trail.length, ...value.points.map((point, index) => ({ ...template,
        t: index, mX: index * .1, mY: 10, mVx: point.vx, mVy: point.vy })));
      delete trail.apex; (window as any).__rerender();
    }, fixture);
    await redraw(page); const before = await evidence(page);
    await page.locator('[data-physics-inspect]').click(); await openForces(page);
    await page.locator('[data-physics-sample-jump="launch"]').click(); const selected = await assertConstruction(page);
    if (fixture.name === 'all zero') {
      expect(selected.scale).toBe(0); await expect(page.locator('[data-physics-force-construction-arrow]')).toHaveCount(0);
      await expect(page.locator('[data-physics-force-zero]')).toHaveCount(3);
      await expect(page.locator('[data-physics-force-construction-overlap]')).toHaveCount(0);
    }
    if (fixture.name === 'tiny drag') {
      expect(selected.expected.drag.magnitude).toBe(4e-9);
      const line = page.locator('[data-physics-force-construction-arrow="drag"]');
      const head = page.locator('[data-physics-force-construction-head="drag"]');
      expect(160 - Number(await line.getAttribute('x2'))).toBeGreaterThan(0);
      expect(160 - Number(await line.getAttribute('x2'))).toBeLessThan(1e-6);
      expect(Number(await head.getAttribute('data-length'))).toBeLessThan(1e-6);
      await expect(page.locator('[data-physics-force-component="drag-magnitude"]')).toHaveText('4.00e-9 N');
    }
    if (fixture.name === 'minimum positive gravity') {
      expect(selected.scale).toBe(Number.MIN_VALUE);
      await expect(page.locator('[data-physics-force-construction-arrow="gravity"]')).toHaveAttribute('y2', '180');
      await expect(page.locator('[data-physics-force-construction-arrow="net"]')).toHaveAttribute('y2', '180');
      await expect(page.locator('[data-physics-force-component="gravity-magnitude"]')).toHaveText('4.94e-324 N');
    }
    if (fixture.name === 'cancelling forces') {
      expect(selected.expected.net.magnitude).toBe(0); expect(selected.netTip).toEqual({ x: 160, y: 110 });
      await expect(page.locator('[data-physics-force-construction-arrow="net"]')).toHaveCount(0);
    }
    if (fixture.name === 'upward net') expect(selected.netTip.y).toBeLessThan(110);
    if (fixture.name === 'leftward downward drag') {
      expect(selected.expected.drag.x).toBeLessThan(0); expect(selected.expected.drag.y).toBeLessThan(0);
      expect(selected.netTip.x).toBeLessThan(160); expect(selected.netTip.y).toBeGreaterThan(selected.gravityTip.y);
    }
    if (fixture.name === 'rightward upward drag') {
      expect(selected.expected.drag.x).toBeGreaterThan(0); expect(selected.expected.drag.y).toBeGreaterThan(0);
      expect(selected.netTip.x).toBeGreaterThan(160); expect(selected.netTip.y).toBeLessThan(selected.gravityTip.y);
    }
    if (fixture.name === 'full-resolution peak omitted by graph') {
      expect(selected.scale).toBeCloseTo(Math.hypot(40, 19.6), 12);
      const launchScale = selected.scale; await view(page, 'motion');
      const graph = page.locator('[data-physics-graph="vx"]');
      await expect(graph).toHaveAttribute('data-plotted-count', '80');
      expect((await graph.getAttribute('data-plotted-indices'))!.split(',')).not.toContain('1');
      await graph.focus(); await graph.press('Home'); await graph.press('ArrowRight'); await openForces(page);
      const peak = await assertConstruction(page); expect(peak.index).toBe(1); expect(peak.scale).toBe(launchScale);
      expect(peak.expected.drag.magnitude).toBe(40); expect(peak.expected.net.magnitude).toBe(launchScale);
      await page.locator('[data-physics-sample-jump="latest"]').click(); expect((await assertConstruction(page)).scale).toBe(launchScale);
      await expect(page.locator('#physics-force-scale-help')).toContainText('new points are recorded');
    }
    expect(await evidence(page), fixture.name).toEqual(before);
  }
  // New observations can increase an unfinished flight's scale; selecting a point must not determine it.
  await page.locator('[data-physics-sample-close]').click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, trail = cv._trails.at(-1), last = trail.at(-1);
    trail.push({ ...last, t: last.t + 1, mX: last.mX + .1, mVx: 200 }); (window as any).__rerender();
  });
  await redraw(page); const extended = await evidence(page);
  await page.locator('[data-physics-inspect]').click(); await openForces(page);
  await page.locator('[data-physics-sample-jump="launch"]').click();
  const grown = await assertConstruction(page); expect(grown.scale).toBeCloseTo(Math.hypot(160, 19.6), 12);
  expect(await evidence(page)).toEqual(extended);
  // Keep selected components available when a later recorded observation exceeds the diagram's supported range.
  await page.locator('[data-physics-sample-close]').click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, trail = cv._trails.at(-1), template = trail[0];
    trail.parameters = { ...trail.parameters, velocity: 0, mass: 1, gravity: Number.MAX_VALUE, launchHeight: 0, drag: true };
    // Supported first and final observations keep ordinary inspection available around the unsupported interior point.
    trail.splice(0, trail.length, ...[0, 9e153, 0].map((vx, index) => ({ ...template,
      t: index, mX: index, mY: 0, mVx: vx, mVy: 0 })));
    (window as any).__rerender();
  });
  await redraw(page); const unsupported = await evidence(page);
  await page.locator('[data-physics-inspect]').click(); await openForces(page);
  await page.locator('[data-physics-sample-jump="launch"]').click();
  expect(Math.hypot(.004 * 9e153 * 9e153, Number.MAX_VALUE)).toBe(Infinity);
  const balance = page.locator('[data-physics-force-balance]');
  await expect(balance).toHaveAttribute('data-scale-supported', 'false'); expect(await balance.getAttribute('data-force-scale')).toBeNull();
  await expect(page.locator('[data-physics-force-construction-graph]')).toHaveCount(0);
  await expect(page.locator('[data-physics-force-arrow]')).toHaveCount(0);
  await expect(page.locator('#physics-force-scale-help')).toContainText('outside the diagram');
  const localRange = page.locator('[data-physics-force-construction] [data-physics-force-construction-range]');
  await expect(localRange).toBeVisible(); expect(await localRange.getAttribute('data-value')).toBeNull();
  await expect(localRange).toHaveText('The flight scale is unavailable because another recorded observation is unsupported. The selected component readings remain available.');
  expect((await page.locator('[data-physics-force-construction]').getAttribute('aria-describedby') || '').split(/\s+/))
    .toContain('physics-force-construction-range');
  await assertComponentBalances(page, vectors(unsupported.trails[0].points[0], unsupported.trails[0].parameters));
  await expect(page.locator('[data-physics-force-component="gravity-magnitude"]')).toHaveAttribute('data-value', String(Number.MAX_VALUE));
  await expect(page.locator('[data-physics-force-component="gravity-y"]')).toHaveAttribute('data-value', String(-Number.MAX_VALUE));
  expect(await balance.locator('svg').evaluateAll(nodes => nodes.every(svg => [...svg.querySelectorAll('*')].every(node =>
    [...node.attributes].every(attribute => !/NaN|Infinity/.test(attribute.value)))))).toBe(true);
  expect(await evidence(page)).toEqual(unsupported); expect(errors).toEqual([]);
});

function rgb(color: string): [number, number, number] {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (!match) throw Error('Unresolved force construction color: ' + color);
  const channels = match[1].split(',').map(Number); return [channels[0], channels[1], channels[2]];
}

async function capture(page: Page, file: string, theme: string) {
  const figure = page.locator('[data-physics-force-construction]');
  const measured = await figure.evaluate(node => {
    const graph = node.querySelector('[data-physics-force-construction-graph]') as SVGSVGElement;
    const figureBox = node.getBoundingClientRect(), bounds = graph.getBoundingClientRect(), matrix = graph.getScreenCTM()!;
    const point = (x: number, y: number) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x - figureBox.left, y: p.y - figureBox.top }; };
    const surface = (element: Element) => {
      for (let parent: Element | null = element; parent; parent = parent.parentElement) {
        const color = getComputedStyle(parent).backgroundColor, channels = color.match(/^rgba?\(([^)]+)\)$/)?.[1].split(',').map(Number);
        if (channels && (channels.length === 3 || channels[3] >= .99)) return color;
      }
      throw Error('Force construction has no resolved surface');
    };
    const arrows = [...graph.querySelectorAll('[data-physics-force-construction-arrow]')].map(line => {
      const x1 = Number(line.getAttribute('x1')), y1 = Number(line.getAttribute('y1'));
      const x2 = Number(line.getAttribute('x2')), y2 = Number(line.getAttribute('y2'));
      const force = line.getAttribute('data-physics-force-construction-arrow')!;
      const head = graph.querySelector(`[data-physics-force-construction-head="${force}"]`)!;
      return { force, x1, y1, x2, y2, fx: Number(line.getAttribute('data-fx')), fy: Number(line.getAttribute('data-fy')),
        magnitude: Number(line.getAttribute('data-magnitude')), scale: Number(line.getAttribute('data-scale')),
        headLength: Number(head.getAttribute('data-length')), vectorLength: Number(head.getAttribute('data-vector-length')),
        color: getComputedStyle(line).stroke,
        background: surface(line), dash: line.getAttribute('stroke-dasharray'),
        witnesses: Array.from({ length: 33 }, (_, index) => { const t = .1 + index / 40; return point(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); }) };
    });
    const texts: Array<{ text: string; font: number; color: string; background: string; left: number; right: number; top: number; bottom: number }> = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const element = text.parentElement!;
      if (!text.textContent?.trim() || !element.getClientRects().length || element.closest('.sr-only')) continue;
      const style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(text);
      const svg = element instanceof SVGGraphicsElement, textMatrix = svg ? element.getScreenCTM() : null;
      const physicalScale = textMatrix ? Math.hypot(textMatrix.a, textMatrix.b) : 1;
      for (const rect of range.getClientRects()) texts.push({ text: text.textContent.trim(), font: parseFloat(style.fontSize) * physicalScale,
        color: svg ? style.fill : style.color, background: surface(element), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    }
    const range = node.querySelector('[data-physics-force-construction-range]')!;
    const componentBalances = [...node.querySelectorAll('[data-physics-force-balance-axis]')].map(reading => ({
      axis: reading.getAttribute('data-physics-force-balance-axis'), gravity: Number(reading.getAttribute('data-gravity')),
      drag: Number(reading.getAttribute('data-drag')), net: Number(reading.getAttribute('data-net')), text: reading.textContent,
    }));
    return { width: bounds.width, height: bounds.height, pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth, figure: { left: figureBox.left, right: figureBox.right, top: figureBox.top, bottom: figureBox.bottom },
      arrows, texts, range: { value: Number(range.getAttribute('data-value')), text: range.textContent }, componentBalances };
  });
  const palette = theme === 'contrast' ? { net: [255, 255, 0], gravity: [255, 255, 255], drag: [255, 255, 0] }
    : theme === 'dark' ? { net: [103, 184, 255], gravity: [207, 180, 255], drag: [251, 191, 36] }
      : { net: [23, 103, 178], gravity: [121, 61, 187], drag: [169, 91, 5] };
  expect(measured.width).toBeGreaterThan(200); expect(measured.height).toBeGreaterThan(130);
  expect(measured.pageWidth).toBeLessThanOrEqual(measured.viewportWidth + 1);
  expect(measured.figure.left).toBeGreaterThanOrEqual(0); expect(measured.figure.right).toBeLessThanOrEqual(measured.viewportWidth + 1);
  expect(measured.arrows).toHaveLength(3); expect(measured.texts.length).toBeGreaterThan(4);
  for (const text of measured.texts) {
    expect(text.font, text.text).toBeGreaterThanOrEqual(12); expect(text.left, text.text).toBeGreaterThanOrEqual(measured.figure.left - .5);
    expect(text.right, text.text).toBeLessThanOrEqual(measured.figure.right + .5);
    expect(text.top, text.text).toBeGreaterThanOrEqual(measured.figure.top - .5); expect(text.bottom, text.text).toBeLessThanOrEqual(measured.figure.bottom + .5);
    expect(contrastRatio(rgb(text.color), rgb(text.background)), text.text).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
  }
  for (const arrow of measured.arrows) {
    expect(rgb(arrow.color)).toEqual(palette[arrow.force as Force]);
    expect(contrastRatio(rgb(arrow.color), rgb(arrow.background)), arrow.force).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
  }
  mkdirSync(reports, { recursive: true });
  const buffer = await figure.screenshot({ path: path.join(reports, file) }), pixels = readPng(buffer);
  const box = (await figure.boundingBox())!, ratioX = pixels.width / box.width, ratioY = pixels.height / box.height;
  const witnesses = measured.arrows.map(arrow => {
    const wanted = rgb(arrow.color); let best = { error: Infinity, x: -1, y: -1, actual: [] as number[] };
    for (const point of arrow.witnesses) {
      const x = Math.round(point.x * ratioX), y = Math.round(point.y * ratioY);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (x + dx < 0 || y + dy < 0 || x + dx >= pixels.width || y + dy >= pixels.height) continue;
        const actual = pixels.at(x + dx, y + dy), error = Math.max(...actual.map((channel, index) => Math.abs(channel - wanted[index])));
        if (error < best.error) best = { error, x: x + dx, y: y + dy, actual };
      }
    }
    expect(best.error, arrow.force + ' must paint in the saved PNG').toBeLessThanOrEqual(8);
    return { force: arrow.force, wanted, ...best };
  });
  expect(witnesses).toHaveLength(3);
  return { file, measured, pixels: { width: pixels.width, height: pixels.height, witnesses } };
}

test('force addition, signed axes, labels, and patterned arrows remain readable in twelve saved layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, true); await page.locator('[data-physics-inspect]').click();
  const original = await evidence(page), captures: any[] = [];
  try {
    for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => (window as any).__setConstructionTheme(value), theme); await openForces(page);
      await page.locator('[data-physics-sample-jump="highest"]').click(); await page.locator('[data-physics-sample-next]').click();
      await assertConstruction(page, 'falling');
      captures.push({ width, theme, phase: 'falling', ...(await capture(page, `force-construction-${theme}-${width}.png`, theme)) });
      if (width === 320) {
        await page.locator('[data-physics-sample-jump="latest"]').click(); await assertConstruction(page, 'impact');
        captures.push({ width, theme, phase: 'impact', ...(await capture(page, `force-construction-impact-${theme}-${width}.png`, theme)) });
      }
    }
    expect(captures).toHaveLength(12); expect(await evidence(page)).toEqual(original); expect(errors).toEqual([]);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error)); throw error;
  } finally {
    mkdirSync(reports, { recursive: true });
    writeFileSync(path.join(reports, 'force-construction-visual-results.json'), JSON.stringify({ captures, errors }, null, 2) + '\n');
  }
});
