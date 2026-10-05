import { test, expect, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-plot-callouts-2026-10-04');
const source = path.resolve('stem_lab/stem_tool_physics.js');
const mirror = path.resolve('desktop/web-app/public/stem_lab/stem_tool_physics.js');
const spec = path.resolve('tests/e2e/physics-canvas-callouts.spec.ts');
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
type Point = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };
type Original = { t: number; mX: number; mY: number; mVx: number; mVy: number };
type Trail = { run: number | null; points: Original[]; parameters: any; apex: any; modelVersion: string };
type Witness = { x: number; y: number; rgb: number[]; expected?: number[]; before?: number[]; contrast?: number; alpha?: number; channelError?: number };
type TextPaint = { text: string; x: number; y: number; left: number; right: number; top: number; bottom: number; fontSize: number; color: string; rgb: number[]; alpha: number; paintOrder: number; witnesses: Witness[] };
type CardPaint = Box & { color: string; rgb: number[]; alpha: number; paintOrder: number };
type StrokePaint = { color: string; rgb: number[]; alpha: number; width: number; dash: number[]; paintOrder: number; segments: Array<{ from: Point; to: Point }>; witnesses: Witness[] };
type RingPaint = Point & { radius: number; start: number; end: number; color: string; alpha: number; width: number };
type Draw = { width: number; height: number; backingWidth: number; backingHeight: number; generation: number; layout: any; view: any; marker: any; selected: any; originalPoint: Original; selectedTrailIndex: number; selectedApex: any; cards: CardPaint[]; text: TextPaint[]; strokes: StrokePaint[]; rings: RingPaint[]; launched: boolean; preview: any; pageWidth: number; viewportWidth: number };
const configurations: any[] = [], edgeCases: any[] = [], errors: string[] = [];
let initialHashes: string[] = [];

test.beforeAll(async () => { initialHashes = [sha(source), sha(mirror), sha(spec)]; expect(initialHashes[0]).toBe(initialHashes[1]); await harness.start(); });
test.afterAll(async () => {
  await harness.stop(); mkdirSync(reports, { recursive: true });
  writeFileSync(path.join(reports, 'visual-results.json'), JSON.stringify({ sourceSha256: initialHashes[0], mirrorSha256: initialHashes[1], specSha256: initialHashes[2],
    finalSourceSha256: sha(source), finalMirrorSha256: sha(mirror), finalSpecSha256: sha(spec), sourceStable: initialHashes[0] === sha(source), mirrorStable: initialHashes[1] === sha(mirror), specStable: initialHashes[2] === sha(spec),
    configurations, edgeCases, errors }, null, 2));
});
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const w = window as any; let id = 0, now = 1000, nativeSnapshots = false;
    const nativeRaf = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
    const frames = new Map<number, FrameRequestCallback>(), nativeFrames = new Map<number, number>();
    const queueNative = (key: number, cb: FrameRequestCallback) => nativeFrames.set(key, nativeRaf(time => { nativeFrames.delete(key); cb(time); }));
    window.requestAnimationFrame = cb => { const key = ++id; if (nativeSnapshots) queueNative(key, cb); else frames.set(key, cb); return key; };
    window.cancelAnimationFrame = key => { frames.delete(key); const nativeKey = nativeFrames.get(key); if (nativeKey != null) { nativeCancel(nativeKey); nativeFrames.delete(key); } };
    w.__calloutTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
    w.__calloutNative = () => {
      const cv = document.getElementById('physicsCanvas') as any;
      if (!cv?._inspection || cv.dataset.simSpeed !== '0') throw Error('Native snapshots require an original selected point and paused playback');
      nativeSnapshots = true; w.__calloutNativeSnapshots = true;
      const pending = [...frames.entries()]; frames.clear(); pending.forEach(([key, cb]) => queueNative(key, cb));
    };
    w.__calloutSettle = () => new Promise<void>(resolve => nativeRaf(() => nativeRaf(() => resolve())));
    w.__calloutCapture = false; w.__calloutGeneration = 0;
    const reset = () => { w.__calloutText = []; w.__calloutCards = []; w.__calloutStrokes = []; w.__calloutRings = []; w.__calloutPaintOrder = 0; w.__calloutGeneration++; };
    reset();
    const proto = CanvasRenderingContext2D.prototype, clear = proto.clearRect, begin = proto.beginPath, move = proto.moveTo, line = proto.lineTo;
    const stroke = proto.stroke, fill = proto.fill, text = proto.fillText, rounded = proto.roundRect, arc = proto.arc;
    const paths = new WeakMap<CanvasRenderingContext2D, Array<{ op: string; x: number; y: number }>>();
    const rectangles = new WeakMap<CanvasRenderingContext2D, Box>();
    const circles = new WeakMap<CanvasRenderingContext2D, Array<{ x: number; y: number; radius: number; start: number; end: number }>>();
    const active = (ctx: CanvasRenderingContext2D) => ctx.canvas.id === 'physicsCanvas' && w.__calloutCapture;
    const position = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      const t = ctx.getTransform(), b = ctx.canvas.getBoundingClientRect();
      return { x: (t.a * x + t.c * y + t.e) * b.width / ctx.canvas.width, y: (t.b * x + t.d * y + t.f) * b.height / ctx.canvas.height };
    };
    const color = (paint: string | CanvasGradient | CanvasPattern) => {
      if (typeof paint !== 'string') throw Error('Expected solid annotation paint');
      const sample = document.createElement('canvas'); sample.width = sample.height = 1;
      const ctx = sample.getContext('2d')!; ctx.fillStyle = paint; ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };
    const contrast = (a: number[], b: number[]) => {
      const lum = (c: number[]) => c.slice(0, 3).map(v => { const unit = v / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const la = lum(a), lb = lum(b); return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05);
    };
    proto.clearRect = function (x, y, width, height) { if (active(this) && x === 0 && y === 0) reset(); clear.call(this, x, y, width, height); };
    proto.beginPath = function () { paths.set(this, []); rectangles.delete(this); circles.set(this, []); begin.call(this); };
    proto.moveTo = function (x, y) { if (active(this)) { const p = paths.get(this) || []; p.push({ op: 'M', ...position(this, x, y) }); paths.set(this, p); } move.call(this, x, y); };
    proto.lineTo = function (x, y) { if (active(this)) { const p = paths.get(this) || []; p.push({ op: 'L', ...position(this, x, y) }); paths.set(this, p); } line.call(this, x, y); };
    proto.roundRect = function (x, y, width, height, radii?) {
      if (active(this)) { const a = position(this, x, y), b = position(this, x + width, y + height); rectangles.set(this, { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y }); }
      rounded.call(this, x, y, width, height, radii);
    };
    proto.arc = function (x, y, radius, start, end, counterclockwise?) {
      if (active(this)) { const p = position(this, x, y), edge = position(this, x + radius, y), list = circles.get(this) || []; list.push({ ...p, radius: Math.hypot(edge.x - p.x, edge.y - p.y), start, end }); circles.set(this, list); }
      arc.call(this, x, y, radius, start, end, counterclockwise);
    };
    proto.fill = function (pathOrRule?: Path2D | CanvasFillRule, rule?: CanvasFillRule) {
      if (active(this) && typeof pathOrRule !== 'object') { const b = rectangles.get(this); if (b) w.__calloutCards.push({ ...b, color: String(this.fillStyle), rgb: color(this.fillStyle).slice(0, 3), alpha: this.globalAlpha, paintOrder: ++w.__calloutPaintOrder }); }
      if (typeof pathOrRule === 'object') fill.call(this, pathOrRule, rule); else fill.call(this, pathOrRule);
    };
    proto.stroke = function (givenPath?: Path2D) {
      let record: any = null, candidates: any[] = [];
      if (active(this) && !givenPath) {
        const b = this.canvas.getBoundingClientRect(), ratio = this.canvas.width / b.width;
        for (const ring of circles.get(this) || []) w.__calloutRings.push({ ...ring, color: String(this.strokeStyle), alpha: this.globalAlpha, width: this.lineWidth / ratio });
        let previous: Point | null = null; const segments = [];
        for (const p of paths.get(this) || []) { const next = { x: p.x, y: p.y }; if (p.op === 'L' && previous) segments.push({ from: previous, to: next }); previous = next; }
        if (segments.length) {
          const rgba = color(this.strokeStyle); record = { color: String(this.strokeStyle), rgb: rgba.slice(0, 3), alpha: this.globalAlpha * rgba[3] / 255,
            width: this.lineWidth / ratio, dash: this.getLineDash().map(n => n / ratio), segments, paintOrder: ++w.__calloutPaintOrder, witnesses: [] };
          // Actual solid, one-pixel annotation leaders. Sample their paint before and after the native stroke.
          if (Math.abs(record.width - 1) < .01 && segments.length === 1 && !record.dash.length) {
            const segment = segments[0];
            for (const fraction of [.25, .5, .75]) {
              const cssX = segment.from.x + (segment.to.x - segment.from.x) * fraction, cssY = segment.from.y + (segment.to.y - segment.from.y) * fraction;
              const group = [];
              for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
                const px = Math.floor(cssX * ratio) + ox, py = Math.floor(cssY * this.canvas.height / b.height) + oy;
                if (px < 0 || py < 0 || px >= this.canvas.width || py >= this.canvas.height) continue;
                group.push({ px, py, x: (px + .5) / ratio, y: (py + .5) * b.height / this.canvas.height, before: [...this.getImageData(px, py, 1, 1).data].slice(0, 3) });
              }
              candidates.push(group);
            }
          }
          w.__calloutStrokes.push(record);
        }
      }
      if (givenPath) stroke.call(this, givenPath); else stroke.call(this);
      if (record && candidates.length) for (const group of candidates) {
        const painted = group.map((p: any) => { const rgb = [...this.getImageData(p.px, p.py, 1, 1).data].slice(0, 3), expected = record.rgb.map((v: number, i: number) => Math.round(v * record.alpha + p.before[i] * (1 - record.alpha)));
          return { x: p.x, y: p.y, rgb, expected, before: p.before, contrast: contrast(rgb, p.before), channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expected[i]))), changed: Math.max(...rgb.map((v, i) => Math.abs(v - p.before[i]))) }; });
        painted.sort((a: any, b: any) => a.channelError - b.channelError || b.changed - a.changed || a.y - b.y || a.x - b.x);
        record.witnesses.push(painted[0]);
      }
    };
    proto.fillText = function (value, x, y, maxWidth?) {
      let record: any = null, witnesses: any[] = [];
      if (active(this)) {
        const s = String(value), metrics = this.measureText(s), transform = this.getTransform(), b = this.canvas.getBoundingClientRect();
        if (maxWidth !== undefined && maxWidth < metrics.width) throw Error('Callout test does not accept squeezed canvas text');
        const raw = { left: x - metrics.actualBoundingBoxLeft, right: x + metrics.actualBoundingBoxRight, top: y - metrics.actualBoundingBoxAscent, bottom: y + metrics.actualBoundingBoxDescent };
        const corners = [position(this, raw.left, raw.top), position(this, raw.right, raw.top), position(this, raw.left, raw.bottom), position(this, raw.right, raw.bottom)];
        const rgba = color(this.fillStyle), px = this.font.match(/([\d.]+)px/);
        record = { text: s, ...position(this, x, y), left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)), top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)),
          color: String(this.fillStyle), rgb: rgba.slice(0, 3), alpha: this.globalAlpha * rgba[3] / 255,
          fontSize: px ? Number(px[1]) * Math.hypot(transform.c, transform.d) * b.height / this.canvas.height : 0, paintOrder: ++w.__calloutPaintOrder, witnesses: [] };
        // Rasterize the actually painted font independently to choose solid glyph pixels, preserving fractional placement.
        const originX = Math.floor(raw.left) - 2, originY = Math.floor(raw.top) - 2;
        const stencil = document.createElement('canvas'); stencil.width = Math.max(1, Math.ceil(raw.right) - originX + 2); stencil.height = Math.max(1, Math.ceil(raw.bottom) - originY + 2);
        const ctx = stencil.getContext('2d')!; ctx.font = this.font; ctx.textAlign = this.textAlign; ctx.textBaseline = this.textBaseline; ctx.fillStyle = '#fff';
        text.call(ctx, s, x - originX, y - originY);
        const mask = ctx.getImageData(0, 0, stencil.width, stencil.height).data, solid = [];
        for (let py = 0; py < stencil.height; py++) for (let px = 0; px < stencil.width; px++) {
          const alpha = mask[(py * stencil.width + px) * 4 + 3]; if (alpha < 250) continue;
          const rawX = originX + px + .5, rawY = originY + py + .5, backingX = Math.floor(transform.a * rawX + transform.c * rawY + transform.e), backingY = Math.floor(transform.b * rawX + transform.d * rawY + transform.f);
          if (backingX < 0 || backingY < 0 || backingX >= this.canvas.width || backingY >= this.canvas.height) continue;
          solid.push({ px: backingX, py: backingY, x: (backingX + .5) * b.width / this.canvas.width, y: (backingY + .5) * b.height / this.canvas.height,
            alpha: alpha / 255, before: [...this.getImageData(backingX, backingY, 1, 1).data].slice(0, 3) });
        }
        if (solid.length) witnesses = [solid[0], solid[Math.floor(solid.length / 2)], solid[solid.length - 1]];
        w.__calloutText.push(record);
      }
      if (maxWidth === undefined) text.call(this, value, x, y); else text.call(this, value, x, y, maxWidth);
      if (record) record.witnesses = witnesses.map(p => {
        const rgb = [...this.getImageData(p.px, p.py, 1, 1).data].slice(0, 3), alpha = record.alpha * p.alpha;
        const expected = record.rgb.map((v: number, i: number) => Math.round(v * alpha + p.before[i] * (1 - alpha)));
        return { x: p.x, y: p.y, rgb, expected, before: p.before, alpha: p.alpha, contrast: contrast(record.rgb.map((v: number, i: number) => v * record.alpha + p.before[i] * (1 - record.alpha)), p.before), channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expected[i]))) };
      });
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap')!; wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__calloutTheme = (theme: string) => {
      w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark' ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px' : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
  });
}
async function patch(page: Page, changes: object) { await page.evaluate(p => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, physics: { ...previous.physics, ...p } })), changes); await page.waitForTimeout(40); }
async function redraw(page: Page): Promise<Draw> {
  return page.evaluate(async () => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any; w.__calloutCapture = true; cv._physScheduleFrame();
    if (w.__calloutNativeSnapshots) await w.__calloutSettle(); else w.__calloutTick();
    const b = cv.getBoundingClientRect(), selected = cv._inspection?.snapshot;
    const draw = { width: b.width, height: b.height, backingWidth: cv.width, backingHeight: cv.height, generation: w.__calloutGeneration,
      layout: cv._visualLayout, view: cv._launchView, marker: cv._visualInspection, selected, originalPoint: cv._inspection?.trail[selected?.index], selectedTrailIndex: cv._inspection ? cv._trails.indexOf(cv._inspection.trail) : -1, selectedApex: cv._inspection?.trail.apex,
      cards: w.__calloutCards, text: w.__calloutText, strokes: w.__calloutStrokes, rings: w.__calloutRings, launched: cv._launched, preview: cv._visualPreview,
      pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth };
    w.__calloutCapture = false; return draw;
  });
}
async function ticks(page: Page, n: number) { await page.evaluate(count => { for (let i = 0; i < count; i++) (window as any).__calloutTick(); }, n); }
async function launch(page: Page, changes: object = {}, complete = true) {
  const run = await page.evaluate(() => ((window as any).__toolData.physics.runCount || 0) + 1);
  await patch(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 0, airResist: false, simSpeed: complete ? 2 : 1,
    showOverlay: true, showGraphs: true, showFlightData: true, showVectors: true, showEnergy: true, showFormulas: true, ...changes });
  await page.locator('[data-physics-launch]').click();
  if (complete) {
    await page.evaluate(() => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; let count = 0; while (cv._launched && count++ < 10000) w.__calloutTick(); if (cv._launched) throw Error('Original callout fixture failed to land'); });
    await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, run, { polling: 20 }); await patch(page, { simSpeed: 0 });
  }
  await redraw(page);
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ run: t.run ?? null, points: [...t], parameters: t.parameters, apex: t.apex, modelVersion: t.modelVersion })) as Trail[],
      log: d.runLog, recordings: d.recordedFlights, last: d.lastFlight, count: d.runCount };
  });
}
function apexIndex(trail: Trail) {
  expect(trail.apex, 'fixture has original canonical apex evidence').toBeTruthy();
  const index = trail.points.findIndex(p => p.mVy === 0 && p.t === trail.apex.tSec && p.mX === trail.apex.mX && p.mY === trail.apex.mY && p.mVx === trail.apex.vx);
  expect(index, 'canonical apex is an original stored point').toBeGreaterThanOrEqual(0); return index;
}
function value(n: number) { return n !== 0 && Math.abs(n) < .01 ? n.toPrecision(3) : n.toFixed(2); }
function contains(b: Box, p: Point, pad = 0) { return p.x >= b.x - pad && p.x <= b.x + b.width + pad && p.y >= b.y - pad && p.y <= b.y + b.height + pad; }
function overlaps(a: Box, b: Box, pad = 0) { return a.x < b.x + b.width + pad && a.x + a.width + pad > b.x && a.y < b.y + b.height + pad && a.y + a.height + pad > b.y; }
function segmentTouchesBox(a: Point, b: Point, box: Box, pad = 0) {
  const r = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  if (contains(r, a) || contains(r, b)) return true;
  const orientation = (p: Point, q: Point, t: Point) => (q.x - p.x) * (t.y - p.y) - (q.y - p.y) * (t.x - p.x);
  const crosses = (p: Point, q: Point) => {
    const v = [orientation(a, b, p), orientation(a, b, q), orientation(p, q, a), orientation(p, q, b)];
    return v[0] * v[1] <= 0 && v[2] * v[3] <= 0 && Math.max(Math.min(a.x, b.x), Math.min(p.x, q.x)) <= Math.min(Math.max(a.x, b.x), Math.max(p.x, q.x))
      && Math.max(Math.min(a.y, b.y), Math.min(p.y, q.y)) <= Math.min(Math.max(a.y, b.y), Math.max(p.y, q.y));
  };
  const tl = { x: r.x, y: r.y }, tr = { x: r.x + r.width, y: r.y }, br = { x: r.x + r.width, y: r.y + r.height }, bl = { x: r.x, y: r.y + r.height };
  return crosses(tl, tr) || crosses(tr, br) || crosses(br, bl) || crosses(bl, tl);
}
function geometry(draw: Draw, trail: Trail, index: number) {
  const p = trail.points[index], scaleX = draw.width / draw.layout.width, scaleY = draw.height / draw.layout.height;
  const projected = { x: (draw.view.x + p.mX * draw.view.scale) * scaleX, y: (draw.view.groundY - p.mY * draw.view.scale) * scaleY };
  expect(draw.selected).toMatchObject({ run: trail.run, index, count: trail.points.length, t: p.t, x: p.mX, y: p.mY, vx: p.mVx, vy: p.mVy });
  expect(draw.originalPoint).toEqual(p); expect(draw.selected.parameters).toMatchObject({ angle: trail.parameters.angle, velocity: trail.parameters.velocity, gravity: trail.parameters.gravity, mass: trail.parameters.mass, launchHeight: trail.parameters.launchHeight, airResist: trail.parameters.drag, modelVersion: trail.modelVersion });
  expect(draw.marker).toMatchObject({ index, run: trail.run, t: p.t });
  expect(draw.marker.x * scaleX).toBeCloseTo(projected.x, 8); expect(draw.marker.y * scaleY).toBeCloseTo(projected.y, 8);
  expect(draw.pageWidth).toBeLessThanOrEqual(draw.viewportWidth + 1);
  const selectedLayout = draw.layout.labels.find((label: any) => label.id === 'inspection'); expect(selectedLayout, 'selected original point has a visible readout').toBeTruthy();
  const labelFor = (card: CardPaint) => draw.layout.labels.find((label: any) => Math.abs(label.x * scaleX - card.x) < 1e-7 && Math.abs(label.y * scaleY - card.y) < 1e-7 && Math.abs(label.width * scaleX - card.width) < 1e-7 && Math.abs(label.height * scaleY - card.height) < 1e-7);
  expect(draw.cards.length).toBe(draw.layout.labels.length); expect(draw.cards.length).toBeGreaterThan(0);
  const selectedCard = draw.cards.find(card => labelFor(card)?.id === 'inspection'); expect(selectedCard, 'selected readout is actually filled').toBeTruthy();
  const selectedText = draw.text.filter(t => t.paintOrder > selectedCard!.paintOrder && contains(selectedCard!, { x: t.left, y: t.top }) && contains(selectedCard!, { x: t.right, y: t.bottom })).sort((a, b) => a.y - b.y || a.x - b.x);
  const atApex = !!trail.apex && index === apexIndex(trail), impact = p.t > 0 && p.mY === 0 && p.mVy <= 0;
  const title = atApex && p.t === 0 ? 'Highest point at release' : index === 0 ? 'Launch point' : impact ? 'Ground impact' : atApex ? 'At apex' : p.mVy > 0 ? 'Rising' : p.mVy < 0 ? 'Falling' : 'Vertical velocity is zero';
  const expectedText = title + ' y = ' + value(p.mY) + ' m · t = ' + p.t.toFixed(3) + ' s';
  expect(selectedText.map(t => t.text).join(' '), 'wrapped selected text retains every original value').toBe(expectedText);
  const axes = draw.text.filter(t => t.paintOrder < draw.cards[0].paintOrder && (t.text === 'Height (m)' || t.text === 'Distance (m)'
    || (/^-?\d+(?:\.\d+)?$/.test(t.text) && (Math.abs(t.x - (draw.view.x - 9) * scaleX) < .01 || Math.abs(t.y - (draw.view.groundY + 20) * scaleY) < .01))));
  expect(axes.length, 'actual axis/tick glyphs are observed').toBeGreaterThanOrEqual(4);
  const axisBoxes = axes.map(t => ({ x: t.left, y: t.top, width: t.right - t.left, height: t.bottom - t.top, text: t.text }));
  const points = draw.rings.filter(r => Math.abs(Math.abs(r.end - r.start) - Math.PI * 2) < 1e-7 && r.radius >= 3 && r.radius <= 10.01 && r.x >= draw.view.x * scaleX - .01 && r.x <= draw.width - 20 * scaleX + .01 && r.y >= draw.layout.plotTop * scaleY && r.y <= draw.view.groundY * scaleY + .01)
    .map(r => ({ x: r.x - r.radius - 4 * scaleX, y: r.y - r.radius - 4 * scaleY, width: r.radius * 2 + 8 * scaleX, height: r.radius * 2 + 8 * scaleY, center: { x: r.x, y: r.y }, radius: r.radius }));
  expect(points.some(r => Math.hypot(r.center.x - draw.view.x * scaleX, r.center.y - (draw.view.groundY - trail.parameters.launchHeight * draw.view.scale) * scaleY) < .01), 'original release ring is protected, including h0=0').toBe(true);
  const arrows = draw.strokes.filter(s => ['#93c5fd', '#6ee7b7', '#c4b5fd', '#fda4af'].includes(s.color.toLowerCase()));
  const annotated = draw.cards.map(card => {
    const label = labelFor(card); expect(label, 'actual panel maps to a retained semantic identity').toBeTruthy(); expect(card.alpha).toBe(1);
    const text = draw.text.filter(t => t.paintOrder > card.paintOrder && t.paintOrder < (draw.cards.find(other => other.paintOrder > card.paintOrder)?.paintOrder ?? Infinity));
    expect(text.length, label.id + ' paints actual text').toBeGreaterThan(0);
    const leaders = draw.strokes.filter(s => s.paintOrder === card.paintOrder - 1 && s.segments.length === 1 && Math.abs(s.width - scaleX) < .01 && !s.dash.length);
    expect(leaders, label.id + ' has one actual painted leader').toHaveLength(1); const leader = leaders[0];
    expect(card.x).toBeGreaterThanOrEqual((draw.view.x + 8) * scaleX - .01); expect(card.x + card.width).toBeLessThanOrEqual(draw.width - 28 * scaleX + .01);
    expect(card.y).toBeGreaterThanOrEqual((draw.layout.plotTop + 8) * scaleY - .01); expect(card.y + card.height).toBeLessThanOrEqual((draw.view.groundY - 8) * scaleY + .01);
    for (const t of text) { expect(t.fontSize, t.text).toBeGreaterThanOrEqual(11.99); expect(t.left).toBeGreaterThanOrEqual(card.x + 7 * scaleX - .01); expect(t.right).toBeLessThanOrEqual(card.x + card.width - 7 * scaleX + .01); expect(t.top).toBeGreaterThanOrEqual(card.y); expect(t.bottom).toBeLessThanOrEqual(card.y + card.height); }
    for (const axis of axisBoxes) { expect(overlaps(card, axis, 2), label.id + ' covers actual axis glyphs: ' + axis.text).toBe(false); for (const segment of leader.segments) expect(segmentTouchesBox(segment.from, segment.to, axis, 1), label.id + ' leader crosses actual axis glyphs').toBe(false); }
    for (const point of points) { expect(overlaps(card, point), label.id + ' covers an original point ring').toBe(false); if (Math.hypot(point.center.x - label.anchor.x * scaleX, point.center.y - label.anchor.y * scaleY) > point.radius + 4) for (const segment of leader.segments) expect(segmentTouchesBox(segment.from, segment.to, point), label.id + ' leader crosses another point').toBe(false); }
    for (const arrow of arrows) for (const segment of arrow.segments) expect(segmentTouchesBox(segment.from, segment.to, card, arrow.width / 2), label.id + ' covers an actual velocity/gravity shaft or arrowhead').toBe(false);
    const segment = leader.segments[0], anchor = { x: label.anchor.x * scaleX, y: label.anchor.y * scaleY };
    const cross = (segment.to.x - anchor.x) * (segment.from.y - anchor.y) - (segment.to.y - anchor.y) * (segment.from.x - anchor.x);
    expect(Math.abs(cross), label.id + ' leader points to its actual original anchor').toBeLessThan(1e-5);
    expect(Math.hypot(segment.from.x - anchor.x, segment.from.y - anchor.y)).toBeCloseTo((label.anchor.radius + 2) * scaleX, 7);
    expect(contains(card, segment.to, .01)).toBe(true); expect(Math.min(Math.abs(segment.to.x - card.x), Math.abs(segment.to.x - card.x - card.width), Math.abs(segment.to.y - card.y), Math.abs(segment.to.y - card.y - card.height))).toBeLessThan(.01);
    return { id: label.id, card, text, leader, anchor, radius: label.anchor.radius };
  });
  for (let i = 0; i < annotated.length; i++) for (let j = i + 1; j < annotated.length; j++) {
    const a = annotated[i], b = annotated[j]; expect(overlaps(a.card, b.card, 5.99 * scaleX), a.id + ' overlaps ' + b.id).toBe(false);
    for (const segment of a.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, b.card, 1.99 * scaleX), a.id + ' leader crosses ' + b.id).toBe(false);
    for (const segment of b.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, a.card, 1.99 * scaleX), b.id + ' leader crosses ' + a.id).toBe(false);
  }
  return { selectedText: selectedText.map(t => t.text), expectedText, projected, annotated, axes, axisBoxes, points, geometryVerified: true, selectedCardVisible: true, axisGlyphClearance: true, originalPointClearance: true, vectorClearance: true, otherLabelClearance: true };
}
async function capture(page: Page, trail: Trail, index: number, theme: string, filename: string) {
  mkdirSync(reports, { recursive: true }); const before = await evidence(page);
  await page.evaluate(async () => { const w = window as any; w.__calloutNative(); await w.__calloutSettle(); });
  const draw = await redraw(page), layoutProof = geometry(draw, trail, index);
  const screenshot = path.join(reports, filename), buffer = await page.locator('#physicsCanvas').screenshot({ path: screenshot, animations: 'disabled' }), pixels = readPng(buffer);
  expect(pixels.width).toBe(draw.backingWidth); expect(pixels.height).toBe(draw.backingHeight);
  const at = (p: Point) => { const pixelX = Math.floor(p.x * pixels.width / draw.width), pixelY = Math.floor(p.y * pixels.height / draw.height); expect(pixelX).toBeGreaterThanOrEqual(0); expect(pixelX).toBeLessThan(pixels.width); expect(pixelY).toBeGreaterThanOrEqual(0); expect(pixelY).toBeLessThan(pixels.height); return { pixelX, pixelY, rgb: pixels.at(pixelX, pixelY) }; };
  const textThreshold = theme === 'contrast' ? 7 : 4.5, graphicThreshold = theme === 'contrast' ? 7 : 3;
  const glyphs = [...layoutProof.axes.map(t => ({ kind: 'axis', ...t })), ...layoutProof.annotated.flatMap(a => a.text.map(t => ({ kind: a.id, ...t })))].map(t => {
    expect(t.witnesses.length, 'actual solid glyph witnesses: ' + t.text).toBeGreaterThanOrEqual(1);
    const samples = t.witnesses.map(witness => { const actual = at(witness), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - witness.rgb[i]))); expect(channelError, 'saved glyph survives final opaque panels: ' + t.text).toBeLessThanOrEqual(4); expect(witness.channelError, 'independent glyph stencil matches actual text paint').toBeLessThanOrEqual(6); expect(witness.contrast, 'actual text contrast: ' + t.text).toBeGreaterThanOrEqual(textThreshold); return { ...witness, ...actual, channelError }; });
    return { ...t, samples, minContrast: Math.min(...samples.map(w => w.contrast!)) };
  });
  const cardPanels = layoutProof.annotated.map(a => {
    const b = a.card, inset = 3 * draw.width / draw.layout.width;
    const samples = [{ x: b.x + b.width / 2, y: b.y + inset }, { x: b.x + b.width / 2, y: b.y + b.height - inset }, { x: b.x + inset, y: b.y + b.height / 2 }, { x: b.x + b.width - inset, y: b.y + b.height / 2 }].map(p => {
      const pixel = at(p), channelError = Math.max(...pixel.rgb.map((v, i) => Math.abs(v - b.rgb[i]))); expect(channelError, a.id + ' opaque panel is retained in saved PNG').toBeLessThanOrEqual(4); return { ...p, ...pixel, expected: b.rgb, channelError };
    }); return { id: a.id, card: b, samples };
  });
  const leaders = layoutProof.annotated.map(a => {
    expect(a.leader.witnesses).toHaveLength(3);
    const samples = a.leader.witnesses.map(witness => { const actual = at(witness), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - witness.rgb[i]))); expect(channelError, a.id + ' saved leader paint').toBeLessThanOrEqual(4); expect(witness.channelError, a.id + ' physical leader contains its expected ink').toBeLessThanOrEqual(8); expect(witness.contrast, a.id + ' physical leader contrast').toBeGreaterThanOrEqual(graphicThreshold); return { ...witness, ...actual, channelError }; });
    return { id: a.id, ...a.leader, samples, minContrast: Math.min(...samples.map(w => w.contrast!)) };
  });
  const sky = [{ x: 4, y: 4 }, { x: draw.width - 4, y: 4 }, { x: 4, y: draw.height - 4 }, { x: draw.width - 4, y: draw.height - 4 }].map(p => { const sample = at(p); expect(sample.rgb.every((v, i) => v <= [30, 50, 75][i]), 'saved canvas is painted').toBe(true); return { ...p, ...sample }; });
  const expectedMarker = theme === 'contrast' ? [255, 255, 0] : [103, 232, 249], sx = draw.width / draw.layout.width, sy = draw.height / draw.layout.height;
  const marker = [-Math.PI / 2, 0, Math.PI / 2, Math.PI, -Math.PI / 4, -Math.PI * 3 / 4].map(angle => ({ x: layoutProof.projected.x + Math.cos(angle) * 10 * sx, y: layoutProof.projected.y + Math.sin(angle) * 10 * sy }))
    .filter(p => p.x >= draw.view.x * sx + .25 && p.x <= draw.width - 20 * sx - .25 && p.y >= draw.layout.plotTop * sy + .25 && p.y <= draw.view.groundY * sy - .25)
    .map(predicted => {
      const candidates = []; const cx = Math.floor(predicted.x * pixels.width / draw.width), cy = Math.floor(predicted.y * pixels.height / draw.height);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const pixelX = cx + dx, pixelY = cy + dy, rgb = pixels.at(pixelX, pixelY); candidates.push({ x: (pixelX + .5) * draw.width / pixels.width, y: (pixelY + .5) * draw.height / pixels.height, pixelX, pixelY, rgb, channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expectedMarker[i]))) }); }
      candidates.sort((a, b) => a.channelError - b.channelError || Math.hypot(a.x - predicted.x, a.y - predicted.y) - Math.hypot(b.x - predicted.x, b.y - predicted.y));
      const witness = candidates[0], contrast = contrastRatio(witness.rgb, sky[0].rgb); expect(witness.channelError, 'saved original selected marker ink').toBeLessThanOrEqual(4); expect(contrast).toBeGreaterThanOrEqual(graphicThreshold); return { predicted, ...witness, expected: expectedMarker, contrast };
    });
  expect(marker.length, 'selected original ring retains multiple independent witnesses').toBeGreaterThanOrEqual(2);
  const all = [...glyphs.flatMap(g => g.samples), ...cardPanels.flatMap(c => c.samples), ...leaders.flatMap(l => l.samples), ...sky, ...marker];
  const live = await page.evaluate(async (points: Point[]) => { const w = window as any; await w.__calloutSettle(); const cv = document.getElementById('physicsCanvas') as HTMLCanvasElement, b = cv.getBoundingClientRect(), ctx = cv.getContext('2d')!; return points.map(p => [...ctx.getImageData(Math.floor(p.x * cv.width / b.width), Math.floor(p.y * cv.height / b.height), 1, 1).data]); }, all);
  live.forEach((rgba, i) => { expect(rgba[3], 'actual canvas witness opaque').toBe(255); expect(Math.max(...rgba.slice(0, 3).map((v, c) => Math.abs(v - all[i].rgb[c]))), 'saved PNG retains actual canvas paint').toBeLessThanOrEqual(4); });
  expect(await evidence(page), 'native snapshot preserves the full original ball, trails, records and log').toEqual(before);
  expect([sha(source), sha(mirror), sha(spec)]).toEqual(initialHashes); expect(errors).toEqual([]);
  return { filename, screenshot, screenshotSha256: sha(screenshot), theme, pixelWidth: pixels.width, pixelHeight: pixels.height, sourceSha256: initialHashes[0], originalTrail: trail, originalIndex: index, originalPoint: trail.points[index], draw,
    ...layoutProof, glyphs, cardPanels, leaders, sky, marker, liveCanvasPixels: live, savedPaintVerified: true, originalEvidenceUnchanged: true,
    minFont: Math.min(...glyphs.map(t => t.fontSize)), minTextContrast: Math.min(...glyphs.map(t => t.minContrast)), minLeaderContrast: Math.min(...leaders.map(l => l.minContrast)), minMarkerContrast: Math.min(...marker.map(m => m.contrast)) };
}
async function select(page: Page, id: string, moment: string) { await page.locator('[data-physics-plot-flight="' + id + '"]').click(); await page.locator('[data-physics-plot-moment="' + moment + '"]').click(); await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0'); }

test('original launch, apex and impact callouts retain painted text and clearance in nine layouts', async ({ page }) => {
  test.setTimeout(300_000); await mount(page); await launch(page); const before = await evidence(page), trail = before.trails[0];
  const moments = [{ id: 'launch', index: 0 }, { id: 'apex', index: apexIndex(trail) }, { id: 'impact', index: trail.points.length - 1 }];
  for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
    await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__calloutTheme(t), theme); await page.waitForTimeout(50);
    const captures = [];
    for (const moment of moments) { await select(page, '1', moment.id); captures.push(await capture(page, trail, moment.index, theme, 'callout-' + theme + '-' + width + '-' + moment.id + '.png')); expect(await evidence(page)).toEqual(before); }
    configurations.push({ id: theme + '-' + width, width, theme, captures, minFont: Math.min(...captures.map(c => c.minFont)), minTextContrast: Math.min(...captures.map(c => c.minTextContrast)), minLeaderContrast: Math.min(...captures.map(c => c.minLeaderContrast)), minMarkerContrast: Math.min(...captures.map(c => c.minMarkerContrast)), originalEvidenceUnchanged: true });
  }
  expect(configurations).toHaveLength(9);
});

test('horizontal release and ground impact preserve original events and clear point markers', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await launch(page, { angle: 0, launchHeight: 10 });
  const before = await evidence(page), trail = before.trails[0]; expect(apexIndex(trail)).toBe(0); expect(trail.points[0]).toMatchObject({ t: 0, mY: 10, mVy: 0 });
  await select(page, '1', 'apex'); await expect(page.locator('[data-physics-plot-moment="launch"]')).toHaveCount(0);
  edgeCases.push({ id: 'horizontal-release', ...(await capture(page, trail, 0, 'default', 'horizontal-release.png')) });
  await select(page, '1', 'impact'); edgeCases.push({ id: 'horizontal-impact', ...(await capture(page, trail, trail.points.length - 1, 'default', 'horizontal-impact.png')) });
  expect(await evidence(page)).toEqual(before);
});

test('drag callouts retain captured values after all six launch controls change', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 }); await mount(page); await launch(page, { angle: 60, velocity: 30, gravity: 3.7, mass: 2.5, launchHeight: 25, airResist: true });
  const before = await evidence(page), trail = before.trails[0]; await patch(page, { angle: 5, velocity: 5, gravity: 25, mass: 10, launchHeight: 0, airResist: false });
  await page.evaluate(t => (window as any).__calloutTheme(t), 'contrast');
  for (const moment of [{ id: 'launch', index: 0 }, { id: 'apex', index: apexIndex(trail) }, { id: 'impact', index: trail.points.length - 1 }]) {
    await select(page, '1', moment.id); const proof = await capture(page, trail, moment.index, 'contrast', 'drag-' + moment.id + '.png');
    expect(proof.draw.preview).toMatchObject({ kind: 'reference', angle: trail.parameters.angle, velocity: trail.parameters.velocity, gravity: trail.parameters.gravity, launchHeight: trail.parameters.launchHeight });
    edgeCases.push({ id: 'drag-' + moment.id, ...proof }); expect(await evidence(page)).toEqual(before);
  }
});

test('an unfinished rising path stays paused with a visible original latest-point callout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await launch(page, { velocity: 15, angle: 30 });
  await launch(page, { angle: 75, velocity: 30, gravity: 1, launchHeight: 20, airResist: true }, false); await ticks(page, 12); await patch(page, { simSpeed: 0 });
  const before = await evidence(page), trail = before.trails.at(-1)!, index = trail.points.length - 1;
  expect(trail.run).toBeNull(); expect(trail.apex).toBeUndefined(); expect(trail.points[index].mVy).toBeGreaterThan(0);
  const id = await page.locator('[data-physics-plot-flight]').last().getAttribute('data-physics-plot-flight'); expect(id).toMatch(/^unfinished-\d+$/);
  await select(page, id!, 'latest'); await expect(page.locator('[data-physics-plot-moment="impact"],[data-physics-plot-moment="apex"]')).toHaveCount(0);
  const proof = await capture(page, trail, index, 'default', 'unfinished-latest.png'); expect(proof.draw.launched).toBe(true); expect(proof.draw.selected.impact).toBe(false); expect(proof.draw.selected.apex).toBe(false);
  edgeCases.push({ id: 'unfinished-latest', ...proof }); await page.locator('[data-physics-plot-close]').click(); await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0');
  await page.evaluate(async () => { const w = window as any; await w.__calloutSettle(); await w.__calloutSettle(); }); expect(await evidence(page)).toEqual(before);
});

test('dense original route labels and long translation tokens fit beside protected points', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 }); await mount(page);
  for (const angle of [25, 35, 45, 55, 65]) await launch(page, { angle, velocity: 20, launchHeight: 10, airResist: angle === 35 || angle === 55 });
  const before = await evidence(page), trail = before.trails[2]; await select(page, '3', 'apex');
  const dense = await capture(page, trail, apexIndex(trail), 'default', 'dense-overlays.png');
  expect(dense.annotated.some(a => a.id.startsWith('run-')), 'at least one original comparison route retains an actual readable label').toBe(true); edgeCases.push({ id: 'dense-overlays', ...dense });
  const token = 'ComparisonRecordingWithoutWhitespaceABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  await page.evaluate(label => { const cv = document.getElementById('physicsCanvas') as any; cv._L.runPrefix = label; cv._physScheduleFrame(); }, token);
  const long = await capture(page, trail, apexIndex(trail), 'default', 'dense-long-token.png');
  const routes = long.annotated.filter(a => a.id.startsWith('run-')); expect(routes.length, 'long translated route label is drawn rather than silently discarded').toBeGreaterThan(0);
  for (const route of routes) expect(route.text.map(t => t.text).join('').includes(token), 'wrapped codepoints retain the full original translated token').toBe(true);
  edgeCases.push({ id: 'dense-long-token', ...long }); expect(await evidence(page)).toEqual(before);
  expect(edgeCases).toHaveLength(8); expect(errors).toEqual([]);
});
