import { test, expect, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ deviceScaleFactor: 2 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-trail-identity-2026-10-02');
type Point = { x: number; y: number };
type Stroke = { points: Point[]; rgb: number[]; alpha: number; dash: number[]; width: number; contrast: number; sceneContrast: number | null; sample: Point; sceneRGB: number[] | null; underpaintRGB: number[] };
const patterns = [[10, 4], [3, 4], [12, 4, 2, 4], [8, 3, 2, 3, 2, 3], [2, 3]];
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__trailTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
    w.__trailCapture = false; w.__trailStrokes = []; w.__trailText = []; w.__trailFrame = 0; w.__trailSceneImage = null; w.__trailSceneCapture = null;
    const proto = CanvasRenderingContext2D.prototype, commands = new WeakMap<CanvasRenderingContext2D, Point[]>();
    const begin = proto.beginPath, move = proto.moveTo, line = proto.lineTo, stroke = proto.stroke, text = proto.fillText;
    const point = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      const t = ctx.getTransform(), b = ctx.canvas.getBoundingClientRect();
      return { x: (t.a * x + t.c * y + t.e) * b.width / ctx.canvas.width, y: (t.b * x + t.d * y + t.f) * b.height / ctx.canvas.height };
    };
    const rgb = (color: string) => {
      const hex = color.match(/^#([\da-f]{6})$/i), css = color.match(/^rgba?\(([^)]+)\)$/);
      if (hex) return [0, 2, 4].map(offset => parseInt(hex[1].slice(offset, offset + 2), 16));
      if (css) return css[1].split(',').map(Number);
      throw Error('Unsupported actual canvas paint: ' + color);
    };
    const lum = (channels: number[]) => channels.slice(0, 3).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    proto.beginPath = function () { commands.set(this, []); begin.call(this); };
    proto.moveTo = function (x, y) { if (this.canvas.id === 'physicsCanvas' && w.__trailCapture) commands.set(this, [point(this, x, y)]); move.call(this, x, y); };
    proto.lineTo = function (x, y) { if (this.canvas.id === 'physicsCanvas' && w.__trailCapture) { const p = commands.get(this) || []; p.push(point(this, x, y)); commands.set(this, p); } line.call(this, x, y); };
    proto.stroke = function (given?: Path2D) {
      if (!given && this.canvas.id === 'physicsCanvas' && w.__trailCapture) {
        const p = commands.get(this) || [], bounds = this.canvas.getBoundingClientRect(), ratio = this.canvas.width / bounds.width;
        if (p.length >= 2) {
          const ink = rgb(String(this.strokeStyle)), alpha = this.globalAlpha * (ink[3] ?? 1), sample = p[Math.floor(p.length / 2)];
          const dash = this.getLineDash().map(v => v / ratio), width = this.lineWidth / ratio;
          // Freeze the rendered scene before the vacuum curve, prior flights, and focused glow.
          // Its scope-derived 41 points are independently verified after this same frame finishes.
          if (!w.__trailSceneImage && p.length === 41 && ink.slice(0, 3).join() === '255,255,255' && dash.join() === '4,4' && Math.abs(width - 1.2) < .01) {
            w.__trailSceneImage = this.getImageData(0, 0, this.canvas.width, this.canvas.height);
            w.__trailSceneCapture = { frame: w.__trailFrame, beforeStroke: true, strokeIndex: w.__trailStrokes.length,
              points: p.slice(), rgb: ink.slice(0, 3), alpha, dash, width, canvasWidth: this.canvas.width, canvasHeight: this.canvas.height,
              parameters: { ...(this.canvas as any)._inspection?.snapshot?.parameters } };
          }
          const x = Math.max(0, Math.min(this.canvas.width - 1, Math.round(sample.x * ratio))), y = Math.max(0, Math.min(this.canvas.height - 1, Math.round(sample.y * this.canvas.height / bounds.height)));
          const background = [...this.getImageData(x, y, 1, 1).data].slice(0, 3), foreground = ink.slice(0, 3).map((c, i) => c * alpha + background[i] * (1 - alpha));
          const a = lum(foreground), b = lum(background);
          // Sample adjacent pixels from that frozen scene; coincident trajectories remain underpaint evidence.
          const image = w.__trailSceneImage as ImageData | null;
          const nearby = image ? [[-4, -4], [-4, 4], [4, -4], [4, 4]].map(([dx, dy]) => {
            const px = Math.max(0, Math.min(image.width - 1, Math.round((sample.x + dx) * ratio))),
              py = Math.max(0, Math.min(image.height - 1, Math.round((sample.y + dy) * this.canvas.height / bounds.height))), offset = (py * image.width + px) * 4;
            return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
          }).sort((a, b) => lum(a) - lum(b)) : null;
          const surface = nearby?.[1] || null, front = surface && ink.slice(0, 3).map((c, i) => c * alpha + surface[i] * (1 - alpha)), c = front && lum(front), d = surface && lum(surface);
          w.__trailStrokes.push({ points: p.slice(), rgb: ink.slice(0, 3), alpha, dash, width, sample, sceneRGB: surface, underpaintRGB: background,
            contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), sceneContrast: c == null || d == null ? null : (Math.max(c, d) + .05) / (Math.min(c, d) + .05) });
        }
      }
      if (given) stroke.call(this, given); else stroke.call(this);
    };
    proto.fillText = function (value, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas' && w.__trailCapture) {
        const m = this.measureText(String(value)), t = this.getTransform(), b = this.canvas.getBoundingClientRect(), font = this.font.match(/([\d.]+)px/);
        const squeeze = maxWidth && maxWidth < m.width ? maxWidth / m.width : 1;
        const corners = [[x - m.actualBoundingBoxLeft * squeeze, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight * squeeze, y + m.actualBoundingBoxDescent]].map(([px, py]) => point(this, px, py));
        w.__trailText.push({ text: String(value), font: Number(font?.[1]) * Math.hypot(t.c, t.d) * b.height / this.canvas.height, left: corners[0].x, right: corners[1].x, top: corners[0].y, bottom: corners[1].y });
      }
      if (maxWidth === undefined) text.call(this, value, x, y); else text.call(this, value, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap')!; wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__trailTheme = (theme: string) => {
      w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark' ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px' : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__trailCsv = []; w.StemLab.writeClipboard = (csv: string) => { w.__trailCsv.push(csv); return Promise.resolve(); };
  });
}
async function patch(page: Page, value: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), value);
  await page.waitForTimeout(40);
}
async function finish(page: Page) {
  await page.evaluate(() => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; let ticks = 0; while (cv._launched && ticks++ < 10000) w.__trailTick(); if (cv._launched) throw Error('Trail fixture did not land'); });
}
async function launch(page: Page, changes: object = {}) {
  const run = await page.evaluate(() => ((window as any).__toolData.physics.runCount || 0) + 1);
  await patch(page, { angle: 35, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, showOverlay: true, showVectors: false, showEnergy: true, showGraphs: true, showFlightData: true, simSpeed: 2, ...changes });
  await page.locator('[data-physics-launch]').click(); await finish(page);
  await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, run, { polling: 20 }); await patch(page, { simSpeed: 0 });
}
async function fiveRuns(page: Page, count = 5) {
  for (let i = 0; i < count; i++) await launch(page, { airResist: i % 2 === 1, velocity: i < 2 ? 15 : 15 + i * 2 });
}
async function paint(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any; w.__trailStrokes = []; w.__trailText = [];
    w.__trailFrame++; w.__trailSceneImage = null; w.__trailSceneCapture = null; w.__trailCapture = true;
    try { cv._physScheduleFrame(); w.__trailTick(); } finally { w.__trailCapture = false; }
    const b = cv.getBoundingClientRect();
    return { strokes: w.__trailStrokes as Stroke[], text: w.__trailText as Array<{ text: string; font: number; left: number; right: number; top: number; bottom: number }>,
      view: cv._launchView, layout: cv._visualLayout, selected: cv._inspection?.snapshot || null, selectedTrail: cv._inspection ? cv._trails.indexOf(cv._inspection.trail) : -1, launched: cv._launched, preview: cv._visualPreview,
      width: b.width, height: b.height, canvasWidth: cv.width, canvasHeight: cv.height, frame: w.__trailFrame, sceneCapture: w.__trailSceneCapture,
      pageWidth: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
      trails: cv._trails.map((t: any, index: number) => ({ key: t.run == null ? null : String(t.run), index, points: [...t], parameters: t.parameters, run: t.run })) };
  });
}
async function evidence(page: Page) {
  return page.evaluate(() => { const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics; return { ball: cv._ball,
    trails: cv._trails.map((t: any) => ({ run: t.run, points: [...t], parameters: t.parameters, apex: t.apex, modelVersion: t.modelVersion })),
    log: d.runLog, recordings: d.recordedFlights, last: d.lastFlight }; });
}
async function copyCsv(page: Page) {
  const active = await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab');
  await page.locator('[data-physics-analysis-tab="data"]').click();
  const count = await page.evaluate(() => (window as any).__trailCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__trailCsv.length)).toBe(count + 1);
  const csv = await page.evaluate(() => (window as any).__trailCsv.at(-1) as string);
  await page.locator('[data-physics-analysis-tab="' + active + '"]').click(); return csv;
}
async function keys(page: Page) {
  return page.locator('[data-physics-trail-key]').evaluateAll(rows => rows.map(row => {
    const swatch = row.querySelector('[data-physics-trail-swatch]')!, shaft = swatch.querySelector('path,line,polyline') || swatch;
    const style = getComputedStyle(shaft), color = style.stroke.match(/^rgba?\(([^)]+)\)$/), b = row.getBoundingClientRect();
    const labelStyle = getComputedStyle(row), stops = [...swatch.querySelectorAll('stop')].map(stop => getComputedStyle(stop).stopColor.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number).slice(0, 3));
    let alpha = Number(style.strokeOpacity); for (let p: Element | null = shaft; p && p !== row; p = p.parentElement) alpha *= Number(getComputedStyle(p).opacity);
    const rgba = (value: string) => value.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number);
    let surface: number[] | null = null; for (let p: Element | null = row; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); if (c.length === 3 || c[3] >= .99) { surface = c; break; } }
    if (!surface) throw Error('Trail swatch lacks an opaque surface');
    const lum = (c: number[]) => c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const paints = color ? [color[1].split(',').map(Number).slice(0, 3)] : stops;
    const svgContrast = Math.min(...paints.map(c => { const a = lum(c.map((v, i) => v * alpha + surface![i] * (1 - alpha))), b = lum(surface!); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
    return { key: row.getAttribute('data-physics-trail-key')!, active: row.getAttribute('data-active') === 'true', model: row.getAttribute('data-model'),
      role: row.getAttribute('data-role'), sampleCount: Number(row.getAttribute('data-sample-count')), alpha, stops, svgContrast, viewBox: swatch.getAttribute('viewBox'), contrastTheme: row.closest('#physics-fs-outer')!.getAttribute('data-physics-theme') === 'contrast',
      text: row.textContent!.replace(/\s+/g, ' ').trim(), rgb: color ? color[1].split(',').map(Number).slice(0, 3) : null,
      dash: style.strokeDasharray === 'none' ? [] : style.strokeDasharray.split(/[,\s]+/).map(parseFloat),
      left: b.left, right: b.right, font: parseFloat(labelStyle.fontSize) };
  }));
}
function same(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y) < 1e-6; }
function pathMatches(actual: Point[], expected: Point[]) { return actual.length === expected.length && actual.every((p, i) => same(p, expected[i])); }
function meterPoint(draw: Awaited<ReturnType<typeof paint>>, p: any) {
  return { x: (draw.view.x + p.mX * draw.view.scale) * draw.width / draw.layout.width, y: (draw.view.groundY - p.mY * draw.view.scale) * draw.height / draw.layout.height };
}
function speedColor(p: any) {
  const n = Math.min(1, Math.hypot(p.mVx, p.mVy) / 60), stops = [[103, 232, 249], [251, 191, 36], [251, 113, 133]], segment = n < .5 ? 0 : 1, blend = segment === 0 ? n * 2 : (n - .5) * 2;
  return stops[segment].map((value, i) => Math.round(value + (stops[segment + 1][i] - value) * blend));
}
async function assertPaths(page: Page, draw: Awaited<ReturnType<typeof paint>>) {
  const drawable = draw.trails.filter(t => t.points.length >= 2 || draw.launched && t.index === draw.trails.length - 1 && t.points.length === 1);
  const rows = await keys(page); expect(rows).toHaveLength(drawable.length);
  expect(new Set(rows.map(row => row.key)).size, 'each drawable original has one unique row identity').toBe(rows.length);
  for (const [index, trail] of drawable.entries()) {
    const row = rows[index];
    if (trail.key) expect(row.key).toBe(trail.key); else expect(row.key).toMatch(/^unfinished-\d+$/);
    const p = trail.parameters; expect(row.model).toBe(p.drag ? 'drag' : 'vacuum');
    const active = draw.selected ? trail.index === draw.selectedTrail : trail.index === draw.trails.length - 1;
    const role = active && draw.selected ? 'selected' : trail.index === draw.trails.length - 1 && draw.launched ? 'current' : trail.run == null ? 'unfinished' : trail.index === draw.trails.length - 1 ? 'latest' : 'recorded';
    expect(row!.active).toBe(active); expect(row!.role).toBe(role); expect(row!.sampleCount).toBe(trail.points.length); expect(row!.viewBox).toBe('0 0 56 16');
    expect(row!.alpha).toBeCloseTo(active || row!.contrastTheme ? 1 : .85, 6);
    const label = row!.text.replace(/\s/g, ''); expect(label).toContain('θ' + p.angle + '°'); expect(label).toContain('v₀' + p.velocity + 'm/s');
    if (trail.run != null) expect(row!.text).toContain('Run ' + trail.run); else { expect(row!.key).toMatch(/^unfinished-\d+$/); expect(row!.text).toMatch(/^Unfinished path \d+/); expect(row!.text).not.toMatch(/Run \d+/); }
    const points = trail.points.map((point: any) => meterPoint(draw, point));
    if (row!.active) {
      expect(row!.dash).toEqual([]); expect(row!.stops).toEqual([[103, 232, 249], [251, 191, 36], [251, 113, 133]]);
      for (let i = 1; i < points.length; i++) expect(draw.strokes.some(s => s.dash.length === 0 && Math.abs(s.width - 2.5) < .01
        && Math.abs(s.alpha - 1) < 1e-7 && pathMatches(s.points, [points[i - 1], points[i]]) && s.rgb.join() === speedColor(trail.points[i]).join()), 'focused original segment is solid and speed colored').toBe(true);
    } else {
      expect(row!.dash.length).toBeGreaterThan(0); expect(row!.rgb, 'run swatch resolves to a named color').not.toBeNull();
      expect(patterns.some(pattern => pattern.join() === row.dash.join()), 'assigned line pattern comes from the distinct run palette').toBe(true);
      const strokes = draw.strokes.filter(s => pathMatches(s.points, points) && s.rgb.join() === row!.rgb!.join() && s.dash.join() === row!.dash.join());
      if (points.length >= 2) { expect(strokes, 'other run has one continuous actual stroke with SVG-matching CSS dash units').toHaveLength(1);
        expect(strokes[0].width).toBeCloseTo(2, 6); expect(strokes[0].alpha).toBeCloseTo(row!.alpha, 6); }
      else expect(strokes, 'a one-point release does not invent a measured path').toHaveLength(0);
    }
    expect(row!.text).toMatch(p.drag ? /Air drag on|Drag ON|Air drag/ : /Air drag off|No air drag|No drag/);
  }
  const focusedDrawable = drawable.some(trail => draw.selected ? trail.index === draw.selectedTrail : trail.index === draw.trails.length - 1);
  expect(rows.filter(row => row.active)).toHaveLength(Number(focusedDrawable));
  const otherPatterns = rows.filter(row => !row.active).map(row => row.dash.join());
  expect(new Set(otherPatterns).size, 'retained comparison paths use distinct patterns').toBe(otherPatterns.length);
  return rows;
}
function trajectoryStrokes(draw: Awaited<ReturnType<typeof paint>>, rows: Awaited<ReturnType<typeof keys>>) {
  const originals = draw.trails.filter(trail => trail.points.length >= 2 || draw.launched && trail.index === draw.trails.length - 1 && trail.points.length === 1);
  const matched: Array<{ run: string; segment: number | null; stroke: Stroke }> = [];
  let expected = 0;
  for (const [index, trail] of originals.entries()) {
    const row = rows[index], points = trail.points.map((point: any) => meterPoint(draw, point));
    if (row.active) {
      expected += Math.max(0, points.length - 1);
      for (let segment = 1; segment < points.length; segment++) {
        const matches = draw.strokes.filter(stroke => pathMatches(stroke.points, [points[segment - 1], points[segment]])
          && stroke.rgb.join() === speedColor(trail.points[segment]).join() && stroke.dash.length === 0
          && Math.abs(stroke.width - 2.5) < .01 && Math.abs(stroke.alpha - 1) < 1e-7);
        expect(matches, 'exact focused original segment ' + segment + ' has one actual paint').toHaveLength(1);
        matched.push({ run: row.key, segment, stroke: matches[0] });
      }
    } else if (points.length >= 2) {
      expected++;
      const matches = draw.strokes.filter(stroke => pathMatches(stroke.points, points) && stroke.rgb.join() === row.rgb!.join()
        && stroke.dash.join() === row.dash.join() && Math.abs(stroke.width - 2) < .01 && Math.abs(stroke.alpha - row.alpha) < 1e-7);
      expect(matches, 'exact original path ' + row.key + ' has one actual paint').toHaveLength(1);
      matched.push({ run: row.key, segment: null, stroke: matches[0] });
    }
  }
  expect(matched, 'all original focused segments and comparison paths have contrast evidence').toHaveLength(expected);
  return matched;
}
function styleMap(rows: Awaited<ReturnType<typeof keys>>) { return Object.fromEntries(rows.filter(row => !row.active).map(row => [row.key, { rgb: row.rgb, dash: row.dash, alpha: row.alpha }])); }
function renderedGradient(buffer: Buffer) {
  const pixels = readPng(buffer), center = Math.floor(pixels.height / 2), backgroundY = Math.max(0, Math.floor(pixels.height * 2 / 16));
  const stops: Array<[number, number, number]> = [[103, 232, 249], [251, 191, 36], [251, 113, 133]];
  const samples = [];
  for (let x = 0; x < pixels.width; x++) {
    const svgX = (x + .5) * 56 / pixels.width;
    if (svgX < 3 || svgX > 53) continue;
    const progress = (svgX - 2) / 52, segment = progress < .5 ? 0 : 1, blend = segment === 0 ? progress * 2 : (progress - .5) * 2;
    const expected = stops[segment].map((value, channel) => Math.round(value + (stops[segment + 1][channel] - value) * blend));
    const rgb = pixels.at(x, center), surface = pixels.at(x, backgroundY);
    samples.push({ x, svgX, rgb, surface, expected, contrast: contrastRatio(rgb, surface), channelError: Math.max(...rgb.map((value, channel) => Math.abs(value - expected[channel]))) });
  }
  const visible = samples.filter(sample => sample.contrast >= 3), matching = samples.filter(sample => sample.channelError <= 4);
  return { pixelWidth: pixels.width, pixelHeight: pixels.height, sampledColumns: samples.length, visibleColumns: visible.length, matchingColumns: matching.length,
    visibleSpanCSS: visible.length ? (visible.at(-1)!.x - visible[0].x + 1) * 56 / pixels.width : 0,
    minContrast: Math.min(...samples.map(sample => sample.contrast)), maxChannelError: Math.max(...samples.map(sample => sample.channelError)), samples };
}
function assertRenderedGradient(metrics: ReturnType<typeof renderedGradient>, theme: string) {
  expect(metrics.sampledColumns).toBeGreaterThanOrEqual(48);
  expect(metrics.visibleColumns, 'focused swatch has a visible gradient across every sampled center pixel').toBe(metrics.sampledColumns);
  expect(metrics.visibleSpanCSS).toBeGreaterThanOrEqual(48);
  expect(metrics.matchingColumns, 'actual focused swatch pixels match cyan to amber to rose interpolation').toBe(metrics.sampledColumns);
  expect(metrics.minContrast, 'rendered focused gradient contrasts with its actual screenshot surface').toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
}
async function select(page: Page, index: number) { await page.locator('[data-physics-history-select]').selectOption(String(index)); }
function vacuumPoints(draw: Awaited<ReturnType<typeof paint>>, p: any) {
  const rad = p.angle * Math.PI / 180, vx = p.velocity * Math.cos(rad), vy = p.velocity * Math.sin(rad);
  const time = (vy + Math.sqrt(vy * vy + 2 * p.gravity * p.launchHeight)) / p.gravity, range = vx * time;
  return Array.from({ length: 41 }, (_, i) => { const x = range * i / 40, t = x / vx; return meterPoint(draw, { mX: x, mY: Math.max(0, p.launchHeight + vy * t - .5 * p.gravity * t * t) }); });
}
function assertVacuumPath(draw: Awaited<ReturnType<typeof paint>>, p: any, kind: string) {
  expect(draw.preview).toMatchObject({ kind, angle: p.angle, velocity: p.velocity, gravity: p.gravity, launchHeight: p.launchHeight });
  expect(draw.strokes.filter(s => s.rgb.join() === '255,255,255' && s.dash.join() === '4,4' && pathMatches(s.points, vacuumPoints(draw, p))), 'actual vacuum curve uses the same captured launch parameters').toHaveLength(1);
}
function assertSceneCapture(draw: Awaited<ReturnType<typeof paint>>, theme: string) {
  expect(draw.sceneCapture, 'this frame captured actual scene pixels before the verified vacuum curve').not.toBeNull();
  const capture = draw.sceneCapture, p = draw.selected.parameters;
  assertVacuumPath(draw, p, 'reference');
  expect(capture).toMatchObject({ frame: draw.frame, beforeStroke: true, rgb: [255, 255, 255], dash: [4, 4], canvasWidth: draw.canvasWidth, canvasHeight: draw.canvasHeight });
  expect(capture.width).toBeCloseTo(1.2, 6); expect(capture.alpha).toBeCloseTo(theme === 'contrast' ? 1 : .56, 6);
  expect(capture.parameters).toMatchObject({ angle: p.angle, velocity: p.velocity, gravity: p.gravity, launchHeight: p.launchHeight });
  expect(pathMatches(capture.points, vacuumPoints(draw, p)), 'scene capture precedes the original-scope 41-point vacuum stroke').toBe(true);
  const actual = draw.strokes[capture.strokeIndex];
  expect({ points: actual.points, rgb: actual.rgb, alpha: actual.alpha, dash: actual.dash, width: actual.width })
    .toEqual({ points: capture.points, rgb: capture.rgb, alpha: capture.alpha, dash: capture.dash, width: capture.width });
}
async function assertVacuumKey(page: Page, p: any, kind: string, run: number | null = null, referenceScope = 'Current flight') {
  const key = page.locator('[data-physics-vacuum-key]'); await expect(key).toHaveAttribute('data-physics-vacuum-key', kind);
  for (const [name, value] of [['angle', p.angle], ['velocity', p.velocity], ['gravity', p.gravity], ['launch-height', p.launchHeight]]) await expect(key).toHaveAttribute('data-' + name, String(value));
  expect(await key.getAttribute('data-run')).toBe(run == null ? null : String(run));
  await expect(key).toContainText(kind === 'preview' ? 'White dashed · vacuum preview · Next launch' : 'White dashed · vacuum reference · ' + (run == null ? referenceScope : 'Run ' + run));
  await expect(key).toContainText('θ ' + p.angle + '° · v₀ ' + p.velocity + ' m/s · g ' + p.gravity + ' m/s² · h₀ ' + p.launchHeight + ' m');
}
async function remount(page: Page, state: object) {
  await page.evaluate(seed => { const w = window as any; w.__destroy(); w.__mount({ physics: seed }); document.getElementById('wrap')!.style.width = '100%'; }, state);
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 }); await paint(page);
}

test('five same-angle runs retain distinct painted identities through focus, control changes, and comparison toggles', async ({ page }) => {
  await mount(page); await fiveRuns(page);
  const before = await evidence(page), styles: Record<string, unknown> = {};
  expect(before.trails.map(t => t.parameters.angle)).toEqual([35, 35, 35, 35, 35]);
  expect(before.trails.slice(0, 2).map(t => t.parameters.drag)).toEqual([false, true]);
  for (let index = 0; index < 5; index++) {
    await select(page, index); const draw = await paint(page), rows = await assertPaths(page, draw), current = styleMap(rows);
    expect(draw.selected.run).toBe(index + 1);
    for (const [run, style] of Object.entries(current)) { if (styles[run]) expect(style).toEqual(styles[run]); styles[run] = style; }
  }
  expect(Object.keys(styles)).toHaveLength(5);
  expect(new Set(Object.values(styles).map((s: any) => s.dash.join())).size).toBe(5);
  expect(new Set(Object.values(styles).map((s: any) => s.rgb.join())).size, 'same launch angle retains the same scientific color cue').toBe(1);
  await expect(page.locator('[data-physics-plot-key]')).toContainText(/Other paths use their run.s line pattern; their color shows launch angle/);
  await select(page, 1); const selected = (await paint(page)).selected, csv = await copyCsv(page);
  await patch(page, { angle: 80, velocity: 50, gravity: 25, mass: 9, launchHeight: 50, airResist: false });
  const changed = await paint(page); expect(changed.selected).toEqual(selected); await assertPaths(page, changed);
  expect(styleMap(await keys(page))).toEqual(Object.fromEntries(Object.entries(styles).filter(([run]) => run !== '2')));
  await page.locator('[data-physics-view="overlay"]').click(); await expect(page.locator('[data-physics-trail-key]')).toHaveCount(0);
  await page.locator('[data-physics-view="overlay"]').click(); const returned = await paint(page);
  expect(returned.selected).toEqual(selected); await assertPaths(page, returned);
  expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(before);
});

test('selected old drag flight owns its vacuum reference while a newer no-drag flight is paused', async ({ page }) => {
  await mount(page); await launch(page, { airResist: true });
  const original = (await evidence(page)).trails[0].parameters, originalCsv = await copyCsv(page);
  await patch(page, { angle: 60, velocity: 25, gravity: 1, mass: 4, launchHeight: 30, airResist: false, simSpeed: 0 });
  await page.locator('[data-physics-launch]').click(); await paint(page);
  await expect(page.locator('[data-physics-trail-key^="unfinished-"]')).toHaveCount(1);
  const release = await paint(page); expect(release.trails.at(-1)!.points).toHaveLength(1);
  const unfinishedKey = (await assertPaths(page, release)).find(row => row.key.startsWith('unfinished-'))!.key;
  await patch(page, { simSpeed: 1 });
  await page.evaluate(() => { for (let i = 0; i < 12; i++) (window as any).__trailTick(); }); await patch(page, { simSpeed: 0 });
  const before = await evidence(page); await select(page, 0); const selected = await paint(page);
  expect(selected.selected).toMatchObject({ run: 1, parameters: { airResist: true } }); await assertPaths(page, selected); assertVacuumPath(selected, original, 'reference');
  await assertVacuumKey(page, original, 'reference', 1);
  expect((await keys(page)).find(r => r.key.startsWith('unfinished-'))).toMatchObject({ key: unfinishedKey, active: false, model: 'vacuum', role: 'current' });
  const unfinishedStyle = styleMap(await keys(page))[unfinishedKey];
  expect(await copyCsv(page)).toBe(originalCsv);
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-sample-close]').click(); const live = await paint(page);
  expect(live.selected).toBeNull(); expect(live.preview).toBeNull(); await assertPaths(page, live);
  await expect(page.locator('[data-physics-vacuum-key]')).toHaveCount(0);
  await patch(page, { simSpeed: 2 }); await finish(page); await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 2); await patch(page, { simSpeed: 0 });
  const landedRows = await assertPaths(page, await paint(page));
  expect(landedRows.find(row => row.key === '2')).toMatchObject({ active: true, role: 'latest', model: 'vacuum' });
  expect(landedRows.some(row => row.key === unfinishedKey)).toBe(false);
  await select(page, 0); const completedRows = await assertPaths(page, await paint(page));
  expect(styleMap(completedRows)['2'], 'completion preserves the original path pattern when focus returns to another flight').toEqual(unfinishedStyle);
  await page.locator('[data-physics-sample-close]').click();
  await patch(page, { angle: 80, velocity: 5, gravity: 25, launchHeight: 0 }); const next = await paint(page);
  assertVacuumPath(next, { angle: 80, velocity: 5, gravity: 25, launchHeight: 0 }, 'preview');
  await assertVacuumKey(page, { angle: 80, velocity: 5, gravity: 25, launchHeight: 0 }, 'preview');
  const completedCounts = await page.evaluate(() => ({ count: (window as any).__toolData.physics.runCount, rows: (window as any).__toolData.physics.runLog.length }));
  expect(completedCounts).toEqual({ count: 2, rows: 2 });
  await patch(page, { angle: 35, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true, simSpeed: 1 });
  await page.locator('[data-physics-launch]').click();
  await page.evaluate(() => { for (let i = 0; i < 10; i++) (window as any).__trailTick(); }); await patch(page, { simSpeed: 0 });
  const olderIndex = await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails.length - 1);
  await select(page, olderIndex);
  const interrupted = await evidence(page), interruptedDraw = await paint(page), interruptedCsv = await copyCsv(page);
  expect(interruptedDraw.selected.run).toBeNull(); expect(interruptedDraw.selected.impact).toBe(false);
  expect(interrupted.trails[olderIndex].points.length).toBeGreaterThan(1);
  const olderKey = (await assertPaths(page, interruptedDraw)).find(row => row.active)!.key;
  expect(olderKey).toMatch(/^unfinished-\d+$/);
  await patch(page, { angle: 60, velocity: 25, gravity: 1, mass: 4, launchHeight: 30, airResist: false, simSpeed: 0 });
  await page.locator('[data-physics-launch]').click(); await paint(page);
  await expect(page.locator('[data-physics-trail-key^="unfinished-"]')).toHaveCount(2);
  const restarted = await evidence(page); expect(restarted.trails[olderIndex]).toEqual(interrupted.trails[olderIndex]);
  await select(page, olderIndex); const oldUnfinished = await paint(page), captured = interrupted.trails[olderIndex].parameters;
  expect(oldUnfinished.selected).toMatchObject({ run: null, parameters: { angle: 35, velocity: 15, airResist: true } });
  expect((await assertPaths(page, oldUnfinished)).find(row => row.active)).toMatchObject({ key: olderKey, role: 'selected', model: 'drag' });
  assertVacuumPath(oldUnfinished, captured, 'reference'); await assertVacuumKey(page, captured, 'reference', null, 'Selected flight');
  await expect(page.locator('[data-physics-vacuum-key]')).not.toContainText(/Current flight|Next launch|Run \d+/);
  expect(await copyCsv(page)).toBe(interruptedCsv); expect(await evidence(page)).toEqual(restarted);
  expect(await page.evaluate(() => ({ count: (window as any).__toolData.physics.runCount, rows: (window as any).__toolData.physics.runLog.length }))).toEqual(completedCounts);
  const onePointIndex = oldUnfinished.trails.length - 1;
  await select(page, onePointIndex); const onePoint = await paint(page);
  expect(onePoint.selected.t).toBe(0);
  const onePointKey = (await assertPaths(page, onePoint)).find(row => row.active)!.key;
  const onePointOriginal = (await evidence(page)).trails[onePointIndex];
  await page.locator('[data-physics-launch]').click(); await select(page, onePointIndex);
  const omitted = await paint(page), omittedRows = await assertPaths(page, omitted);
  expect(omitted.selected.t).toBe(0); expect(omittedRows.some(row => row.key === onePointKey)).toBe(false);
  expect(omittedRows.some(row => row.active), 'an older one-point selection does not invent a drawable path').toBe(false);
  const beforeCompletion = await evidence(page); expect(beforeCompletion.trails[onePointIndex]).toEqual(onePointOriginal);
  await select(page, olderIndex); const pending = await paint(page), pendingRows = await assertPaths(page, pending);
  const pendingKey = pendingRows.at(-1)!.key, pendingStyle = styleMap(pendingRows)[pendingKey];
  expect(pendingRows.at(-1)).toMatchObject({ active: false, role: 'current', sampleCount: 1 });
  await page.locator('[data-physics-sample-close]').click();
  await patch(page, { simSpeed: 2 }); await finish(page);
  await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 3); await patch(page, { simSpeed: 0 }); await select(page, olderIndex);
  const afterCompletion = await paint(page), completed = await assertPaths(page, afterCompletion);
  expect(afterCompletion.selected).toEqual(pending.selected);
  expect(styleMap(completed)['3'], 'an earlier interrupted path may occupy the preferred slot; completion keeps the current path assignment').toEqual(pendingStyle);
  expect(completed.some(row => row.key === pendingKey)).toBe(false);
  const finalEvidence = await evidence(page);
  expect(finalEvidence.trails[olderIndex]).toEqual(interrupted.trails[olderIndex]);
  expect(finalEvidence.trails[onePointIndex]).toEqual(onePointOriginal);
  expect(await copyCsv(page)).toBe(interruptedCsv);
  expect(await page.evaluate(() => ({ count: (window as any).__toolData.physics.runCount, rows: (window as any).__toolData.physics.runLog.length }))).toEqual({ count: 3, rows: 3 });
});

test('five retained original run keys restore accurately and disappear when trails are cleared', async ({ page }) => {
  await mount(page); await fiveRuns(page, 7);
  const before = await evidence(page), saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.physics)));
  expect(before.trails.map(t => t.run)).toEqual([3, 4, 5, 6, 7]); await select(page, 0);
  const csv = await copyCsv(page), styles = styleMap(await assertPaths(page, await paint(page)));
  await remount(page, saved); await select(page, 0); const restored = await evidence(page);
  expect(restored.trails).toEqual(before.trails); expect(restored.recordings).toEqual(before.recordings); expect(restored.log).toEqual(before.log);
  expect(styleMap(await assertPaths(page, await paint(page)))).toEqual(styles); expect(await copyCsv(page)).toBe(csv);
  await expect(page.locator('[data-physics-history-recording]')).toHaveAttribute('data-physics-history-recording', 'saved');
  await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click(); await paint(page);
  await expect(page.locator('[data-physics-trail-key]')).toHaveCount(0);
  const cleared = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.physics)));
  expect(cleared.recordedFlights).toEqual([]); expect(cleared.runCount).toBe(7); await remount(page, cleared);
  await expect(page.locator('[data-physics-trail-key]')).toHaveCount(0); await expect(page.locator('[data-physics-history-select]')).toHaveCount(0);
});

test('painted path keys remain readable at 1100, 375, and 320 pixels in all themes', async ({ page }) => {
  test.setTimeout(300_000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); mkdirSync(reports, { recursive: true });
  const source = path.resolve('stem_lab/stem_tool_physics.js'), mirror = path.resolve('desktop/web-app/public/stem_lab/stem_tool_physics.js');
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex'), initial = [sha(source), sha(mirror)], configurations: object[] = [];
  let oldGradientReproduction: object | null = null;
  expect(initial[0]).toBe(initial[1]); await mount(page); await fiveRuns(page); await select(page, 1);
  const original = await evidence(page), selected = (await paint(page)).selected;
  try {
    for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__trailTheme(t), theme); await page.waitForTimeout(50);
      const draw = await paint(page); expect(draw.selected).toEqual(selected); const rows = await assertPaths(page, draw);
      expect(draw.pageWidth).toBeLessThanOrEqual(draw.viewport + 1);
      for (const item of draw.text) { expect(item.font).toBeGreaterThanOrEqual(11.99); expect(item.left).toBeGreaterThanOrEqual(-1); expect(item.right).toBeLessThanOrEqual(draw.width + 1); expect(item.top).toBeGreaterThanOrEqual(-1); expect(item.bottom).toBeLessThanOrEqual(draw.height + 1); }
      for (const row of rows) { expect(row.font).toBeGreaterThanOrEqual(12); expect(row.left).toBeGreaterThanOrEqual(0); expect(row.right).toBeLessThanOrEqual(width + 1); }
      for (const row of rows) expect(row.svgContrast).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
      const focusSwatch = page.locator('[data-physics-trail-key][data-active="true"] [data-physics-trail-swatch]');
      const swatchScreenshot = path.join(reports, 'swatch-focus-' + theme + '-' + width + '.png');
      const renderedSwatch = renderedGradient(await focusSwatch.screenshot({ path: swatchScreenshot, animations: 'disabled' }));
      writeFileSync(path.join(reports, 'swatch-focus-' + theme + '-' + width + '.json'), JSON.stringify(renderedSwatch, null, 2));
      assertRenderedGradient(renderedSwatch, theme);
      if (width === 1100 && theme === 'default') {
        const negativeDirectory = path.join(reports, 'gradient-negative-control'); mkdirSync(negativeDirectory, { recursive: true });
        const attributes = await focusSwatch.evaluate(svg => {
          const gradient = svg.querySelector('linearGradient')!, names = ['gradientUnits', 'x1', 'y1', 'x2', 'y2'];
          const previous = Object.fromEntries(names.map(name => [name, gradient.getAttribute(name)]));
          names.forEach(name => gradient.removeAttribute(name)); return previous;
        });
        let negative: ReturnType<typeof renderedGradient>;
        try { negative = renderedGradient(await focusSwatch.screenshot({ path: path.join(negativeDirectory, 'old-object-bounding-box.png'), animations: 'disabled' })); }
        finally { await focusSwatch.evaluate((svg, previous) => { const gradient = svg.querySelector('linearGradient')!;
          for (const [name, value] of Object.entries(previous)) { if (value == null) gradient.removeAttribute(name); else gradient.setAttribute(name, value); }
        }, attributes); }
        const restored = renderedGradient(await focusSwatch.screenshot({ animations: 'disabled' })); assertRenderedGradient(restored, theme);
        oldGradientReproduction = { detectedBlankPaint: negative.visibleColumns === 0, restoredPaintVerified: true, negative, restored };
        writeFileSync(path.join(negativeDirectory, 'evidence.json'), JSON.stringify(oldGradientReproduction, null, 2));
        expect(negative.visibleColumns, 'old zero-height bounding-box gradient produces no visible colored stroke').toBe(0);
        expect(() => assertRenderedGradient(negative, theme), 'the raster check rejects the old blank gradient').toThrow(/visible gradient/);
      }
      assertSceneCapture(draw, theme);
      const actualTrails = trajectoryStrokes(draw, rows);
      writeFileSync(path.join(reports, 'contrast-' + theme + '-' + width + '.json'), JSON.stringify({ width, theme, frame: draw.frame,
        sceneCapture: draw.sceneCapture, trajectories: actualTrails }, null, 2));
      expect(actualTrails.length).toBeGreaterThan(4);
      for (const { run, segment, stroke } of actualTrails) {
        const label = 'original path ' + run + (segment == null ? '' : ' segment ' + segment) + ' scene RGB ' + stroke.sceneRGB + ' paint RGB ' + stroke.rgb;
        expect(stroke.sceneContrast, label + ' has scene evidence').not.toBeNull();
        expect(stroke.sceneContrast!, label).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
      }
      const metrics = await page.locator('[data-physics-trail-key],[data-physics-vacuum-key]').evaluateAll(elements => {
        const rgb = (color: string) => { const m = color.match(/^rgba?\(([^)]+)\)$/); if (!m) throw Error('Unresolved key paint: ' + color); return m[1].split(',').map(Number); };
        const lum = (c: number[]) => c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
        return elements.flatMap(el => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), metrics = [];
          const bounds = el.getBoundingClientRect();
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (!text.textContent!.trim()) continue;
            const node = text.parentElement!, range = document.createRange(); range.selectNodeContents(text);
            const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
            if (!rects.length) continue;
            const style = getComputedStyle(node); if (style.visibility === 'hidden' || style.visibility === 'collapse') continue;
            let background: number[] | null = null, alpha = rgb(style.color)[3] ?? 1;
            for (let p: Element | null = node; p; p = p.parentElement) {
              const parentStyle = getComputedStyle(p); alpha *= Number(parentStyle.opacity);
              const color = rgb(parentStyle.backgroundColor); if (color.length === 3 || color[3] >= .99) { background = color; break; }
            }
            if (!background) throw Error('Key has no opaque surface');
            const color = rgb(style.color), a = lum(color.slice(0, 3).map((v, i) => v * alpha + background![i] * (1 - alpha))), b = lum(background);
            metrics.push({ text: text.textContent!.trim(), font: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05),
              titleKey: node.closest('.phys-trail-title') ? el.getAttribute('data-physics-trail-key') : null,
              vacuum: el.hasAttribute('data-physics-vacuum-key'), vacuumPart: el.hasAttribute('data-physics-vacuum-key') ? node.closest('[data-physics-vacuum-parameters]') ? 'parameters' : 'caption' : null, bounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
              rects: rects.map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })) });
          }
          return metrics;
        });
      });
      expect(metrics.length).toBeGreaterThan(4);
      const titleTextGroups = new Set(metrics.filter(metric => metric.titleKey).map(metric => metric.titleKey)).size;
      const vacuumTextNodes = metrics.filter(metric => metric.vacuum).length;
      const captionNodes = metrics.filter(metric => metric.vacuumPart === 'caption'), parameterNodes = metrics.filter(metric => metric.vacuumPart === 'parameters');
      const vacuumCaption = captionNodes.map(metric => metric.text).join(' ').replace(/\s+/g, ' ').trim();
      const vacuumParameters = parameterNodes.map(metric => metric.text).join(' ').replace(/\s+/g, ' ').trim(), p = selected.parameters;
      expect(titleTextGroups, 'every flight title has measured painted text').toBe(rows.length);
      expect(captionNodes.length, 'the complete reference caption has visible measured text').toBeGreaterThan(0);
      expect(parameterNodes.length, 'the complete captured parameter line has visible measured text').toBeGreaterThan(0);
      expect(vacuumCaption).toBe('White dashed · vacuum reference · Run ' + selected.run);
      expect(vacuumParameters).toBe('θ ' + p.angle + '° · v₀ ' + p.velocity + ' m/s · g ' + p.gravity + ' m/s² · h₀ ' + p.launchHeight + ' m');
      for (const metric of metrics) {
        expect(metric.font).toBeGreaterThanOrEqual(12); expect(metric.contrast).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
        for (const rect of metric.rects) {
          expect(rect.left).toBeGreaterThanOrEqual(Math.max(0, metric.bounds.left) - 1);
          expect(rect.right).toBeLessThanOrEqual(Math.min(width, metric.bounds.right) + 1);
          expect(rect.top).toBeGreaterThanOrEqual(metric.bounds.top - 1); expect(rect.bottom).toBeLessThanOrEqual(metric.bounds.bottom + 1);
        }
      }
      const screenshot = path.join(reports, 'trails-' + theme + '-' + width + '.png'); await page.locator('.phys-scene').screenshot({ path: screenshot, animations: 'disabled' });
      configurations.push({ width, theme, rows: rows.length, minFont: Math.min(...metrics.map(m => m.font), ...draw.text.map(t => t.font)), minTextContrast: Math.min(...metrics.map(m => m.contrast)), minSVGContrast: Math.min(...rows.map(r => r.svgContrast)), minCanvasContrast: Math.min(...actualTrails.map(({ stroke }) => stroke.sceneContrast!)), minUnderpaintContrast: Math.min(...actualTrails.map(({ stroke }) => stroke.contrast)), trajectoryPaints: actualTrails.length, sceneFrameVerified: true, renderedSwatch: { sampledColumns: renderedSwatch.sampledColumns, visibleColumns: renderedSwatch.visibleColumns, matchingColumns: renderedSwatch.matchingColumns, visibleSpanCSS: renderedSwatch.visibleSpanCSS, minContrast: renderedSwatch.minContrast, maxChannelError: renderedSwatch.maxChannelError, screenshot: swatchScreenshot }, noOverflow: draw.pageWidth <= draw.viewport + 1, titleTextGroups, vacuumTextNodes, vacuumCaptionNodes: captionNodes.length, vacuumParameterNodes: parameterNodes.length, vacuumCaption, vacuumParameters, textGlyphsWithinKeys: true, screenshot });
      expect(await evidence(page)).toEqual(original);
    }
  } finally { writeFileSync(path.join(reports, 'visual-results.json'), JSON.stringify({ sourceSha256: initial[0], mirrorSha256: initial[1], finalSourceSha256: sha(source), finalMirrorSha256: sha(mirror), sourceStable: initial[0] === sha(source), mirrorStable: initial[1] === sha(mirror), configurations, oldGradientReproduction, errors }, null, 2)); }
  expect(configurations).toHaveLength(9); expect([sha(source), sha(mirror)]).toEqual(initial); expect(errors).toEqual([]);
});
