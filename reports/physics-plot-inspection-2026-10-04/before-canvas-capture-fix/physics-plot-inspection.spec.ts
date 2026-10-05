import { test, expect, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ deviceScaleFactor: 2 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-plot-inspection-2026-10-04');
type Point = { t: number; mX: number; mY: number; mVx: number; mVy: number };
type Trail = { run: number | null; points: Point[]; parameters: any; apex: any; modelVersion: string };
type Moment = { id: string; index: number; time: number };
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__plotTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
    w.__plotText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas') w.__plotText.push(String(value));
      if (maxWidth === undefined) original.call(this, value, x, y); else original.call(this, value, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap')!; wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__plotTheme = (theme: string) => {
      w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark' ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px' : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__plotCsv = []; w.StemLab.writeClipboard = (csv: string) => { w.__plotCsv.push(csv); return Promise.resolve(); };
  });
}
async function patch(page: Page, changes: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), changes);
  await page.waitForTimeout(40);
}
async function redraw(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__plotText = []; cv._physScheduleFrame(); w.__plotTick();
    return { selected: cv._inspection?.snapshot || null, marker: cv._visualInspection, text: w.__plotText as string[],
      selectedTrail: cv._inspection ? cv._trails.indexOf(cv._inspection.trail) : -1, launched: cv._launched, preview: cv._visualPreview };
  });
}
async function ticks(page: Page, count: number) {
  await page.evaluate(n => { for (let i = 0; i < n; i++) (window as any).__plotTick(); }, count);
}
async function finish(page: Page) {
  await page.evaluate(() => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; let count = 0; while (cv._launched && count++ < 10000) w.__plotTick(); if (cv._launched) throw Error('Plot fixture did not land'); });
}
async function launch(page: Page, changes: object = {}, complete = true) {
  const run = await page.evaluate(() => ((window as any).__toolData.physics.runCount || 0) + 1);
  await patch(page, { angle: 35, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, simSpeed: complete ? 2 : 0,
    showOverlay: true, showGraphs: true, showFlightData: true, showVectors: true, showEnergy: true, ...changes });
  await page.locator('[data-physics-launch]').click();
  if (complete) { await finish(page); await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, run, { polling: 20 }); await patch(page, { simSpeed: 0 }); }
  await redraw(page);
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ run: t.run ?? null, points: [...t], parameters: t.parameters, apex: t.apex, modelVersion: t.modelVersion })) as Trail[],
      log: d.runLog, recordings: d.recordedFlights, last: d.lastFlight, count: d.runCount };
  });
}
function originalMoments(trail: Trail): Moment[] {
  const last = trail.points.length - 1, end = trail.points[last];
  const highest = trail.points.reduce((best, p, i) => p.mY > trail.points[best].mY ? i : best, 0);
  const apex = trail.apex ? trail.points.findIndex(p => p.mVy === 0 && p.t === trail.apex.tSec && p.mX === trail.apex.mX && p.mY === trail.apex.mY && p.mVx === trail.apex.vx) : -1;
  const candidates = [{ id: 'launch', index: 0, priority: 2 }, { id: apex >= 0 ? 'apex' : 'highest', index: apex >= 0 ? apex : highest, priority: apex >= 0 ? 3 : 0 },
    { id: end.t > 0 && end.mY === 0 && end.mVy <= 0 ? 'impact' : 'latest', index: last, priority: 1 }];
  const distinct = new Map<number, typeof candidates[number]>();
  for (const row of candidates) if (!distinct.has(row.index) || distinct.get(row.index)!.priority < row.priority) distinct.set(row.index, row);
  return [...distinct.values()].sort((a, b) => a.index - b.index).map(row => ({ id: row.id, index: row.index, time: trail.points[row.index].t }));
}
async function assertMoments(page: Page, trail: Trail, id: string) {
  await expect(page.locator('[data-physics-plot-inspection]')).toHaveAttribute('data-flight', id);
  const actual = await page.locator('[data-physics-plot-moment]').evaluateAll(items => items.map(el => ({ id: el.getAttribute('data-physics-plot-moment'), index: Number(el.getAttribute('data-sample-index')), time: Number(el.getAttribute('data-time')) })));
  expect(actual).toEqual(originalMoments(trail));
  return originalMoments(trail);
}
function formatted(value: number) { return value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2); }
async function assertSelected(page: Page, trail: Trail, index: number, id: string, full = true) {
  const draw = await redraw(page), original = trail.points[index], s = draw.selected;
  expect(s).toMatchObject({ run: trail.run, index, count: trail.points.length, t: original.t, x: original.mX, y: original.mY, vx: original.mVx, vy: original.mVy });
  expect(s.parameters).toMatchObject({ ...Object.fromEntries(['angle', 'velocity', 'gravity', 'mass', 'launchHeight'].map(k => [k, trail.parameters[k]])), airResist: trail.parameters.drag, modelVersion: trail.modelVersion });
  expect(draw.marker).toMatchObject({ run: trail.run, index, t: original.t });
  await expect(page.locator('[data-physics-plot-flight="' + id + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-physics-plot-flight][aria-pressed="true"]')).toHaveCount(1);
  const moments = await assertMoments(page, trail, id), pressed = moments.filter(m => m.index === index);
  await expect(page.locator('[data-physics-plot-moment][aria-pressed="true"]')).toHaveCount(pressed.length);
  for (const moment of pressed) await expect(page.locator('[data-physics-plot-moment="' + moment.id + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-physics-sample-slider]')).toHaveValue(String(index));
  await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0');
  if (!full) return draw;
  await page.locator('[data-physics-analysis-tab="motion"]').click();
  await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', trail.run == null ? 'unfinished' : String(trail.run));
  for (const [field, value] of [['vx', original.mVx], ['vy', original.mVy]] as const) {
    await expect(page.locator('[data-physics-graph-marker="' + field + '"]')).toHaveAttribute('data-sample-index', String(index));
    await expect(page.locator('[data-physics-graph-marker="' + field + '"]')).toHaveAttribute('data-time', String(original.t));
    await expect(page.locator('[data-physics-graph-marker="' + field + '"]')).toHaveAttribute('data-value', String(value));
  }
  await page.locator('[data-physics-analysis-tab="data"]').click();
  const row = page.locator('[data-physics-flight-table] tbody tr[data-selected="true"]');
  await expect(row).toHaveCount(1);
  await expect(row.locator('[data-physics-sample-index]')).toHaveAttribute('data-physics-sample-index', String(index));
  expect(await row.locator('td').allTextContents()).toEqual([original.mX, original.mY, original.mVx, original.mVy, Math.hypot(original.mVx, original.mVy)].map(formatted));
  await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-sample-index', String(index));
  await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-time', String(original.t));
  await page.locator('[data-physics-analysis-tab="motion"]').click();
  return draw;
}
async function copyCsv(page: Page, trail: Trail) {
  const previous = await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab');
  await page.locator('[data-physics-analysis-tab="data"]').click();
  const count = await page.evaluate(() => (window as any).__plotCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__plotCsv.length)).toBe(count + 1);
  const csv = await page.evaluate(() => (window as any).__plotCsv.at(-1) as string), lines = csv.split('\n');
  expect(lines).toHaveLength(trail.points.length + 2);
  expect(lines.slice(2)).toEqual(trail.points.map(p => [p.t, p.mX, p.mY, p.mVx, p.mVy, Math.hypot(p.mVx, p.mVy)].join(',')));
  expect(lines[0]).toContain('angle_deg=' + trail.parameters.angle); expect(lines[0]).toContain('air_drag=' + (trail.parameters.drag ? 'on' : 'off'));
  if (trail.run != null) expect(lines[0]).toContain('run=' + trail.run);
  await page.locator('[data-physics-analysis-tab="' + previous + '"]').click(); return csv;
}
async function assertUnfinishedIdentity(page: Page, trail: Trail, index: number, id: string) {
  const label = 'Unfinished path ' + id.split('-')[1], sample = 'Sample ' + (index + 1) + ' / ' + trail.points.length;
  const point = trail.points[index]; expect(point.mVy, 'these unfinished fixtures retain their original rising samples').toBeGreaterThan(0);
  await expect(page.locator('[data-physics-history-run]')).toHaveText(label);
  await expect(page.locator('[data-physics-recorded-context] .phys-recorded-heading > span')).toHaveText(label);
  await expect(page.locator('[data-physics-graph-flight]')).toHaveText(label + ' · ' + sample);
  await expect(page.locator('[data-physics-sample-status]')).toHaveText(label + ' · ' + sample + ' · t = ' + point.t.toFixed(3) + ' s · Rising');
}

test('native plot buttons and original moments link exact evidence after all launch settings change', async ({ page }) => {
  await mount(page); await launch(page); await launch(page, { airResist: true });
  await patch(page, { angle: 80, velocity: 5, gravity: 25, mass: 9, launchHeight: 30, airResist: false });
  const before = await evidence(page);
  await expect(page.locator('[data-physics-plot-inspection]')).toHaveCount(0);
  await expect(page.locator('[data-physics-plot-flight][aria-pressed="true"]')).toHaveCount(0);
  const first = page.locator('[data-physics-plot-flight="1"]'); await expect(first).toHaveJSProperty('tagName', 'BUTTON');
  await first.focus(); await first.press('Enter'); await expect(first).toBeFocused();
  await assertSelected(page, before.trails[0], before.trails[0].points.length - 1, '1');
  const firstCsv = await copyCsv(page, before.trails[0]);
  for (const moment of originalMoments(before.trails[0])) {
    const button = page.locator('[data-physics-plot-moment="' + moment.id + '"]'); await expect(button).toHaveJSProperty('tagName', 'BUTTON');
    await button.click(); await expect(button).toBeFocused(); await assertSelected(page, before.trails[0], moment.index, '1');
    expect(await copyCsv(page, before.trails[0])).toBe(firstCsv); expect(await evidence(page)).toEqual(before);
  }
  const middle = Math.floor(before.trails[0].points.length / 3);
  await page.locator('[data-physics-sample-slider]').evaluate((el, index) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(index));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, middle); await first.click();
  await assertSelected(page, before.trails[0], middle, '1');
  const second = page.locator('[data-physics-plot-flight="2"]'); await second.focus(); await second.press('Space'); await expect(second).toBeFocused();
  await assertSelected(page, before.trails[1], before.trails[1].points.length - 1, '2');
  const secondCsv = await copyCsv(page, before.trails[1]); expect(secondCsv).not.toBe(firstCsv);
  for (const moment of originalMoments(before.trails[1])) { await page.locator('[data-physics-plot-moment="' + moment.id + '"]').click(); await assertSelected(page, before.trails[1], moment.index, '2'); expect(await copyCsv(page, before.trails[1])).toBe(secondCsv); }
  await page.locator('[data-physics-plot-analysis]').click(); await expect(page.locator('[data-physics-sample-slider]')).toBeFocused();
  await page.locator('[data-physics-sample-close]').click(); await expect(second).toBeFocused();
  await expect(page.locator('[data-physics-plot-inspection]')).toHaveCount(0);
  expect(await evidence(page)).toEqual(before);
});

test('choosing an old path pauses a newer live flight and return keeps its original ball paused', async ({ page }) => {
  await mount(page); await launch(page, { airResist: true });
  await launch(page, { angle: 65, velocity: 25, gravity: 1, launchHeight: 30, airResist: false, simSpeed: 1 }, false); await ticks(page, 18);
  const before = await evidence(page); expect(before.trails.at(-1)!.points.length).toBeGreaterThan(1);
  await page.locator('[data-physics-plot-flight="1"]').click();
  await assertSelected(page, before.trails[0], before.trails[0].points.length - 1, '1');
  await ticks(page, 30); expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-plot-moment="apex"]').click();
  await assertSelected(page, before.trails[0], originalMoments(before.trails[0]).find(m => m.id === 'apex')!.index, '1');
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-plot-close]').click(); await expect(page.locator('[data-physics-plot-flight="1"]')).toBeFocused();
  expect((await redraw(page)).selected).toBeNull(); await ticks(page, 30); expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-playback-rate="1"]').click(); await ticks(page, 4); await patch(page, { simSpeed: 0 });
  const resumed = await evidence(page); expect(resumed.ball.t).toBeGreaterThan(before.ball.t); expect(resumed.trails[0]).toEqual(before.trails[0]);
  expect(resumed.trails.at(-1)!.points.slice(0, before.trails.at(-1)!.points.length)).toEqual(before.trails.at(-1)!.points);
  expect(resumed.count).toBe(before.count); expect(resumed.log).toEqual(before.log); expect(resumed.recordings).toEqual(before.recordings);
});

test('unfinished, horizontal, and noncanonical recordings expose only original chronological moments', async ({ page }) => {
  await mount(page); await launch(page, {}, false);
  const onePointId = await page.locator('[data-physics-plot-flight]').getAttribute('data-physics-plot-flight'); expect(onePointId).toMatch(/^unfinished-\d+$/);
  await launch(page, { angle: 60, gravity: 1, simSpeed: 1 }, false); await ticks(page, 8); await patch(page, { simSpeed: 0 }); await redraw(page);
  const ascending = await evidence(page), id = await page.locator('[data-physics-plot-flight]').last().getAttribute('data-physics-plot-flight');
  await page.locator('[data-physics-plot-flight="' + id + '"]').click(); await assertSelected(page, ascending.trails[1], ascending.trails[1].points.length - 1, id!);
  await assertUnfinishedIdentity(page, ascending.trails[1], ascending.trails[1].points.length - 1, id!);
  await expect(page.locator('[data-physics-plot-moment="latest"]')).toHaveCount(1); await expect(page.locator('[data-physics-plot-moment="apex"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-plot-inspection]')).not.toContainText(/Run \d+|Apex|Ground impact/);
  await expect(page.locator('[data-physics-history-select] option').nth(1)).toContainText('Unfinished path ' + id!.split('-')[1]);
  await page.locator('[data-physics-history-select]').selectOption('0');
  const one = await redraw(page); expect(one.selected).toMatchObject({ run: null, index: 0, t: 0, count: 1 });
  await assertMoments(page, ascending.trails[0], onePointId!); await expect(page.locator('[data-physics-plot-flight="' + onePointId + '"]')).toHaveCount(0);
  await assertUnfinishedIdentity(page, ascending.trails[0], 0, onePointId!);
  await expect(page.locator('[data-physics-history-select] option').first()).toContainText('Unfinished path ' + onePointId!.split('-')[1]);
  await expect(page.locator('[data-physics-history-run]')).toHaveText('Unfinished path ' + onePointId!.split('-')[1]);
  expect(await evidence(page)).toEqual(ascending);
  await launch(page, { angle: 0, launchHeight: 10 });
  const horizontal = (await evidence(page)).trails.at(-1)!; await page.locator('[data-physics-plot-flight="1"]').click();
  await assertMoments(page, horizontal, '1'); await expect(page.locator('[data-physics-plot-moment]')).toHaveCount(2);
  await expect(page.locator('[data-physics-plot-moment="apex"]')).toContainText('Highest point at release');
  await page.locator('[data-physics-plot-moment="apex"]').click(); const release = await assertSelected(page, horizontal, 0, '1');
  expect(release.selected.apex).toBe(true); expect(release.text).toContain('Highest point at release');
  await launch(page, { airResist: true });
  await page.evaluate(() => { const cv = document.getElementById('physicsCanvas') as any; delete cv._trails.at(-1).apex; (window as any).__rerender(); });
  const noApex = (await evidence(page)).trails.at(-1)!; await page.locator('[data-physics-plot-flight="2"]').click();
  await assertMoments(page, noApex, '2'); await expect(page.locator('[data-physics-plot-moment="apex"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-plot-moment="highest"]')).toContainText('Highest recorded point');
  const highest = originalMoments(noApex).find(m => m.id === 'highest')!; await page.locator('[data-physics-plot-moment="highest"]').click();
  expect((await assertSelected(page, noApex, highest.index, '2')).selected.apex).toBe(false);
  for (let i = 0; i < 6; i++) await launch(page, { angle: 5, velocity: 5, gravity: 25, launchHeight: 0 });
  expect((await evidence(page)).trails.map(t => t.run)).toEqual([4, 5, 6, 7, 8]);
  expect(await page.locator('[data-physics-plot-flight]').evaluateAll(rows => rows.map(el => el.getAttribute('data-physics-plot-flight')))).toEqual(['4', '5', '6', '7', '8']);
  await expect(page.locator('[data-physics-plot-flight="1"],[data-physics-plot-flight="2"],[data-physics-plot-flight^="unfinished-"]')).toHaveCount(0);
});

function renderedGradient(buffer: Buffer) {
  const pixels = readPng(buffer), stops: Array<[number, number, number]> = [[103, 232, 249], [251, 191, 36], [251, 113, 133]], samples = [];
  for (let x = 0; x < pixels.width; x++) {
    const svgX = (x + .5) * 56 / pixels.width; if (svgX < 3 || svgX > 53) continue;
    const progress = (svgX - 2) / 52, segment = progress < .5 ? 0 : 1, blend = segment === 0 ? progress * 2 : (progress - .5) * 2;
    const expected = stops[segment].map((v, i) => Math.round(v + (stops[segment + 1][i] - v) * blend));
    const rgb = pixels.at(x, Math.floor(pixels.height / 2)), surface = pixels.at(x, Math.floor(pixels.height * 2 / 16));
    samples.push({ x, svgX, rgb, surface, expected, contrast: contrastRatio(rgb, surface), channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expected[i]))) });
  }
  const visible = samples.filter(s => s.contrast >= 3), matching = samples.filter(s => s.channelError <= 4);
  return { pixelWidth: pixels.width, pixelHeight: pixels.height, sampledColumns: samples.length, visibleColumns: visible.length, matchingColumns: matching.length,
    visibleSpanCSS: visible.length ? (visible.at(-1)!.x - visible[0].x + 1) * 56 / pixels.width : 0, minContrast: Math.min(...samples.map(s => s.contrast)), maxChannelError: Math.max(...samples.map(s => s.channelError)), samples };
}
async function focusRaster(page: Page, selector: string, screenshot: string, threshold: number) {
  const target = page.locator(selector); await page.keyboard.press('Tab'); await target.focus(); await expect(target).toBeFocused();
  const metrics = await target.evaluate(el => {
    const b = el.getBoundingClientRect(), scene = el.closest('.phys-scene')!.getBoundingClientRect(), style = getComputedStyle(el);
    const rect = (r: DOMRect) => ({ x: r.x, y: r.y, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
    return { label: el.textContent!.replace(/\s+/g, ' ').trim(), rect: rect(b), sceneRect: rect(scene), focusVisible: el.matches(':focus-visible'),
      outlineWidth: parseFloat(style.outlineWidth), outlineOffset: parseFloat(style.outlineOffset), outlineStyle: style.outlineStyle,
      outlineRGB: style.outlineColor.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number).slice(0, 3) };
  });
  expect(metrics.focusVisible).toBe(true); expect(metrics.outlineStyle).toBe('solid'); expect(metrics.outlineWidth).toBeGreaterThanOrEqual(3);
  const pixels = readPng(await page.locator('.phys-scene').screenshot({ path: screenshot, animations: 'disabled' }));
  const { rect: b, sceneRect: scene } = metrics, distance = metrics.outlineOffset + metrics.outlineWidth / 2;
  // Sample the exposed surface just outside the focus ring, before the next button's border.
  const outside = metrics.outlineOffset + metrics.outlineWidth + .75;
  const positions = [
    { x: b.left - distance, y: b.top + b.height / 2, surfaceX: b.left - outside, surfaceY: b.top + b.height / 2 },
    { x: b.right + distance, y: b.top + b.height / 2, surfaceX: b.right + outside, surfaceY: b.top + b.height / 2 },
    { x: b.left + b.width / 2, y: b.top - distance, surfaceX: b.left + b.width / 2, surfaceY: b.top - outside },
    { x: b.left + b.width / 2, y: b.bottom + distance, surfaceX: b.left + b.width / 2, surfaceY: b.bottom + outside },
  ];
  const px = (x: number) => Math.floor((x - scene.left) * pixels.width / scene.width), py = (y: number) => Math.floor((y - scene.top) * pixels.height / scene.height);
  const samples = positions.map(p => {
    const pixelX = px(p.x), pixelY = py(p.y), surfacePixelX = px(p.surfaceX), surfacePixelY = py(p.surfaceY);
    for (const [x, y] of [[pixelX, pixelY], [surfacePixelX, surfacePixelY]]) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(pixels.width); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(pixels.height); }
    const rgb = pixels.at(pixelX, pixelY), surface = pixels.at(surfacePixelX, surfacePixelY), contrast = contrastRatio(rgb, surface);
    expect(Math.max(...rgb.map((v, i) => Math.abs(v - metrics.outlineRGB[i]))), selector + ' has actual focus ink').toBeLessThanOrEqual(4);
    expect(contrast, selector + ' physical focus outline contrast').toBeGreaterThanOrEqual(threshold);
    return { ...p, pixelX, pixelY, surfacePixelX, surfacePixelY, rgb, surface, contrast };
  });
  return { selector, ...metrics, screenshot, pixelWidth: pixels.width, pixelHeight: pixels.height, samples, minContrast: Math.min(...samples.map(s => s.contrast)) };
}

test('plot inspection controls retain readable text, actual keyboard focus, and painted swatches in nine layouts', async ({ page }) => {
  test.setTimeout(300_000); mkdirSync(reports, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const source = path.resolve('stem_lab/stem_tool_physics.js'), mirror = path.resolve('desktop/web-app/public/stem_lab/stem_tool_physics.js');
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex'), initial = [sha(source), sha(mirror)], configurations: object[] = [];
  expect(initial[0]).toBe(initial[1]); await mount(page);
  for (let i = 0; i < 5; i++) await launch(page, { velocity: 15 + i * 2, airResist: i % 2 === 1 });
  await page.locator('[data-physics-plot-flight="2"]').click(); await page.locator('[data-physics-plot-moment="apex"]').click();
  const original = await evidence(page), selected = (await redraw(page)).selected;
  try {
    for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__plotTheme(t), theme); await page.waitForTimeout(50);
      expect((await redraw(page)).selected).toEqual(selected);
      const threshold = theme === 'contrast' ? 7 : 3, textThreshold = theme === 'contrast' ? 7 : 4.5;
      const measurements = await page.locator('[data-physics-plot-flight],[data-physics-plot-inspection]').evaluateAll(elements => {
        const rgb = (paint: string) => { const m = paint.match(/^rgba?\(([^)]+)\)$/); if (!m) throw Error('Unresolved plot control paint: ' + paint); return m[1].split(',').map(Number); };
        const lum = (c: number[]) => c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
        return elements.flatMap(el => {
          const bounds = el.getBoundingClientRect(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), result = [];
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent!.trim()) continue; const parent = node.parentElement!, style = getComputedStyle(parent), range = document.createRange(); range.selectNodeContents(node);
            const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0); if (!rects.length || style.visibility === 'hidden') continue;
            let surface: number[] | null = null, alpha = rgb(style.color)[3] ?? 1;
            for (let p: Element | null = parent; p; p = p.parentElement) { const s = getComputedStyle(p); alpha *= Number(s.opacity); const c = rgb(s.backgroundColor); if (c.length === 3 || c[3] >= .99) { surface = c; break; } }
            if (!surface) throw Error('Plot control text has no opaque surface'); const ink = rgb(style.color), a = lum(ink.slice(0, 3).map((v, i) => v * alpha + surface![i] * (1 - alpha))), b = lum(surface);
            result.push({ text: node.textContent!.trim(), font: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05),
              flight: el.getAttribute('data-physics-plot-flight'), bounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }, rects: rects.map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })) });
          } return result;
        });
      });
      expect(new Set(measurements.filter(m => m.flight).map(m => m.flight)).size).toBe(5); expect(measurements.length).toBeGreaterThan(10);
      for (const m of measurements) { expect(m.font).toBeGreaterThanOrEqual(12); expect(m.contrast).toBeGreaterThanOrEqual(textThreshold); for (const r of m.rects) { expect(r.left).toBeGreaterThanOrEqual(Math.max(0, m.bounds.left) - 1); expect(r.right).toBeLessThanOrEqual(Math.min(width, m.bounds.right) + 1); expect(r.top).toBeGreaterThanOrEqual(m.bounds.top - 1); expect(r.bottom).toBeLessThanOrEqual(m.bounds.bottom + 1); } }
      const targets = await page.locator('[data-physics-plot-flight],[data-physics-plot-moment],[data-physics-plot-analysis],[data-physics-plot-close]').evaluateAll(els => els.map(el => {
        const b = el.getBoundingClientRect(), attribute = ['data-physics-plot-flight', 'data-physics-plot-moment', 'data-physics-plot-analysis', 'data-physics-plot-close'].find(a => el.hasAttribute(a))!;
        const kind = { 'data-physics-plot-flight': 'trail', 'data-physics-plot-moment': 'moment', 'data-physics-plot-analysis': 'analysis', 'data-physics-plot-close': 'close' }[attribute];
        return { selector: '[' + attribute + '="' + el.getAttribute(attribute) + '"]', label: el.textContent!.replace(/\s+/g, ' ').trim(), kind, type: attribute, id: el.getAttribute(attribute), rect: { x: b.x, y: b.y, left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height } };
      }));
      expect(targets.filter(t => t.type === 'data-physics-plot-flight').map(t => t.id)).toEqual(['1', '2', '3', '4', '5']);
      expect(targets.filter(t => t.type === 'data-physics-plot-moment').map(t => t.id)).toEqual(['launch', 'apex', 'impact']);
      expect(targets.filter(t => t.type === 'data-physics-plot-analysis')).toHaveLength(1); expect(targets.filter(t => t.type === 'data-physics-plot-close')).toHaveLength(1);
      for (const t of targets) { expect(t.rect.height).toBeGreaterThanOrEqual(44); expect(t.rect.width).toBeGreaterThanOrEqual(44); expect(t.rect.left).toBeGreaterThanOrEqual(0); expect(t.rect.right).toBeLessThanOrEqual(width + 1); }
      const pageSize = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth })); expect(pageSize.content).toBeLessThanOrEqual(pageSize.viewport + 1);
      const screenshot = path.join(reports, 'plot-inspection-' + theme + '-' + width + '.png');
      const focusTargets = [await focusRaster(page, '[data-physics-plot-flight="2"]', screenshot, threshold),
        await focusRaster(page, '[data-physics-plot-moment="apex"]', path.join(reports, 'moment-focus-' + theme + '-' + width + '.png'), threshold)];
      const swatchScreenshot = path.join(reports, 'swatch-selected-' + theme + '-' + width + '.png');
      const swatch = renderedGradient(await page.locator('[data-physics-plot-flight="2"] [data-physics-trail-swatch]').screenshot({ path: swatchScreenshot, animations: 'disabled' }));
      expect(swatch.sampledColumns).toBeGreaterThanOrEqual(48); expect(swatch.visibleColumns).toBe(swatch.sampledColumns); expect(swatch.matchingColumns).toBe(swatch.sampledColumns); expect(swatch.visibleSpanCSS).toBeGreaterThanOrEqual(48); expect(swatch.minContrast).toBeGreaterThanOrEqual(threshold);
      configurations.push({ id: theme + '-' + width, width, theme, minFont: Math.min(...measurements.map(m => m.font)), minTextContrast: Math.min(...measurements.map(m => m.contrast)),
        minFocusContrast: Math.min(...focusTargets.map(f => f.minContrast)), minSVGContrast: swatch.minContrast, minTargetHeight: Math.min(...targets.map(t => t.rect.height)), minTargetWidth: Math.min(...targets.map(t => t.rect.width)),
        noOverflow: pageSize.content <= pageSize.viewport + 1, textGlyphsWithinControls: true, focusPaintVerified: true, focusTargets, targets, text: measurements, renderedSwatch: { ...swatch, screenshot: swatchScreenshot }, screenshot });
      expect(await evidence(page)).toEqual(original);
    }
  } finally { writeFileSync(path.join(reports, 'visual-results.json'), JSON.stringify({ sourceSha256: initial[0], mirrorSha256: initial[1], finalSourceSha256: sha(source), finalMirrorSha256: sha(mirror), sourceStable: initial[0] === sha(source), mirrorStable: initial[1] === sha(mirror), configurations, errors }, null, 2)); }
  expect(configurations).toHaveLength(9); expect([sha(source), sha(mirror)]).toEqual(initial); expect(errors).toEqual([]);
});

test('a focused live path keeps its DOM identity through landing and closing safely handles removed origins', async ({ page }) => {
  await mount(page); await launch(page, { simSpeed: 1 }, false); await ticks(page, 8); await redraw(page);
  const live = page.locator('[data-physics-plot-flight]').last(), pendingId = await live.getAttribute('data-physics-plot-flight'); expect(pendingId).toMatch(/^unfinished-\d+$/);
  await page.keyboard.press('Tab'); await live.focus();
  await live.evaluate(el => { (window as any).__originalPlotButton = el; }); await expect(live).toBeFocused();
  await patch(page, { simSpeed: 2 }); await finish(page); await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 1); await patch(page, { simSpeed: 0 }); await redraw(page);
  const completed = page.locator('[data-physics-plot-flight="1"]');
  expect(await completed.evaluate(el => el === (window as any).__originalPlotButton)).toBe(true); await expect(completed).toBeFocused();
  await expect(page.locator('[data-physics-plot-flight="' + pendingId + '"]')).toHaveCount(0); await completed.press('Enter');
  const original = await evidence(page); await assertSelected(page, original.trails[0], original.trails[0].points.length - 1, '1', false);
  await page.locator('[data-physics-sample-close]').click(); await expect(completed).toBeFocused();
  await completed.press('Space'); await patch(page, { showOverlay: false });
  await expect(page.locator('[data-physics-plot-flight]')).toHaveCount(0); await page.locator('[data-physics-sample-close]').click();
  await expect.poll(() => page.evaluate(() => { const el = document.activeElement as HTMLElement | null; return !!el && el !== document.body && el.isConnected && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0; })).toBe(true);
  expect((await redraw(page)).selected).toBeNull(); expect(await evidence(page)).toEqual(original);
  await patch(page, { showOverlay: true }); await completed.click();
  await page.locator('[data-physics-clear]').click(); await redraw(page);
  await expect(page.locator('[data-physics-plot-inspection],[data-physics-plot-flight],[data-physics-sample-inspector]')).toHaveCount(0);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._inspection)).toBeNull();
  await expect(page.locator('[data-physics-clear]')).toBeFocused();
  const cleared = await evidence(page); expect(cleared.trails).toEqual([]); expect(cleared.recordings).toEqual([]); expect(cleared.log).toEqual(original.log); expect(cleared.count).toBe(original.count);
});
