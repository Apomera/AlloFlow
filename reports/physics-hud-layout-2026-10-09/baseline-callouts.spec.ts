import { test, expect, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from '../../tests/e2e/helpers/stem_gl_harness';
import { readPng, contrastRatio } from '../../tests/e2e/helpers/png_pixels';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
const harness = new GlHarness({ toolFile: 'reports/physics-hud-layout-2026-10-09/source-before-hud.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-plot-callouts-2026-10-04');
const source = path.resolve('reports/physics-hud-layout-2026-10-09/source-before-hud.js');
const mirror = path.resolve('reports/physics-hud-layout-2026-10-09/source-before-hud.js');
const spec = path.resolve('reports/physics-hud-layout-2026-10-09/baseline-callouts.spec.ts');
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
type Point = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };
type Original = { t: number; mX: number; mY: number; mVx: number; mVy: number };
type Trail = { run: number | null; points: Original[]; parameters: any; apex: any; modelVersion: string };
type Witness = { x: number; y: number; rgb: number[]; expected?: number[]; before?: number[]; contrast?: number; alpha?: number; channelError?: number; fraction?: number; along?: number; distanceToLine?: number; startClearance?: number; cardBorderClearance?: number; finalNativeRgba?: number[]; finalPaintNeighbors?: Array<{ pixelX: number; pixelY: number; rgba: number[] }>; paintNeighbors: Array<{ pixelX: number; pixelY: number; rgba: number[] }> };
type TextPaint = { text: string; x: number; y: number; left: number; right: number; top: number; bottom: number; fontSize: number; color: string; rgb: number[]; alpha: number; paintOrder: number; witnesses: Witness[] };
type CardPaint = Box & { color: string; rgb: number[]; alpha: number; paintOrder: number };
type StrokePaint = { color: string; rgb: number[]; alpha: number; width: number; dash: number[]; lineCap: CanvasLineCap; lineJoin: CanvasLineJoin; finalWitnesses?: Witness[]; paintOrder: number; segments: Array<{ from: Point; to: Point }>; witnesses: Witness[] };
type RingPaint = Point & { radius: number; start: number; end: number; color: string; alpha: number; width: number };
type Draw = { width: number; height: number; backingWidth: number; backingHeight: number; generation: number; measurements: Array<{ text: string; font: string; nativeWidth: number }>; layout: any; view: any; marker: any; selected: any; originalPoint: Original; selectedTrailIndex: number; selectedApex: any; cards: CardPaint[]; text: TextPaint[]; strokes: StrokePaint[]; rings: RingPaint[]; launched: boolean; preview: any; pageWidth: number; viewportWidth: number };
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
    const reset = () => { w.__calloutText = []; w.__calloutCards = []; w.__calloutStrokes = []; w.__calloutRings = []; w.__calloutMeasures = new Map(); w.__calloutPaintOrder = 0; w.__calloutGeneration++; };
    reset();
    const proto = CanvasRenderingContext2D.prototype, clear = proto.clearRect, begin = proto.beginPath, move = proto.moveTo, line = proto.lineTo;
    const stroke = proto.stroke, fill = proto.fill, text = proto.fillText, measure = proto.measureText, rounded = proto.roundRect, arc = proto.arc;
    const paths = new WeakMap<CanvasRenderingContext2D, Array<{ op: string; x: number; y: number }>>();
    const rectangles = new WeakMap<CanvasRenderingContext2D, Box>();
    const circles = new WeakMap<CanvasRenderingContext2D, Array<{ x: number; y: number; radius: number; start: number; end: number }>>();
    const active = (ctx: CanvasRenderingContext2D) => ctx.canvas.id === 'physicsCanvas' && w.__calloutCapture;
    proto.measureText = function (value) {
      const metrics = measure.call(this, value);
      if (active(this) && this.font.startsWith('600 ')) {
        const observed = { text: String(value), font: this.font, nativeWidth: metrics.width };
        w.__calloutMeasures.set(this.font + '\u0000' + String(value), observed);
      }
      return metrics;
    };
    const position = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      const t = ctx.getTransform(), b = ctx.canvas.getBoundingClientRect();
      return { x: (t.a * x + t.c * y + t.e) * b.width / ctx.canvas.width, y: (t.b * x + t.d * y + t.f) * b.height / ctx.canvas.height };
    };
    const colors = new Map<string, number[]>();
    const color = (paint: string | CanvasGradient | CanvasPattern) => {
      if (typeof paint !== 'string') throw Error('Expected solid annotation paint');
      const cached = colors.get(paint); if (cached) return cached;
      const sample = document.createElement('canvas'); sample.width = sample.height = 1;
      const ctx = sample.getContext('2d')!; ctx.fillStyle = paint; ctx.fillRect(0, 0, 1, 1);
      const rgba = [...ctx.getImageData(0, 0, 1, 1).data]; colors.set(paint, rgba); return rgba;
    };
    const contrast = (a: number[], b: number[]) => {
      const lum = (c: number[]) => c.slice(0, 3).map(v => { const unit = v / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const la = lum(a), lb = lum(b); return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05);
    };
    const readRegion = (ctx: CanvasRenderingContext2D, points: Array<{ px: number; py: number }>) => {
      const left = Math.max(0, Math.min(...points.map(p => p.px)) - 1), top = Math.max(0, Math.min(...points.map(p => p.py)) - 1);
      const right = Math.min(ctx.canvas.width, Math.max(...points.map(p => p.px)) + 2), bottom = Math.min(ctx.canvas.height, Math.max(...points.map(p => p.py)) + 2);
      const width = right - left, height = bottom - top, data = ctx.getImageData(left, top, width, height).data;
      return (x: number, y: number) => [...data.slice(((y - top) * width + x - left) * 4, ((y - top) * width + x - left) * 4 + 4)];
    };
    const neighborhood = (ctx: CanvasRenderingContext2D, x: number, y: number, sample?: (x: number, y: number) => number[]) => {
      const pixels = [];
      const rgba = sample || readRegion(ctx, [{ px: x, py: y }]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const pixelX = x + dx, pixelY = y + dy;
        if (pixelX >= 0 && pixelY >= 0 && pixelX < ctx.canvas.width && pixelY < ctx.canvas.height) pixels.push({ pixelX, pixelY, rgba: rgba(pixelX, pixelY) });
      }
      return pixels;
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
            width: this.lineWidth / ratio, dash: this.getLineDash().map(n => n / ratio), lineCap: this.lineCap, lineJoin: this.lineJoin, segments, paintOrder: ++w.__calloutPaintOrder, witnesses: [] };
          // The actual foreground leader and its opaque outline. Observe each native stroke separately.
          if ((Math.abs(record.width - 1) < .01 || Math.abs(record.width - 3) < .01) && segments.length === 1 && !record.dash.length) {
            const segment = segments[0];
            const length = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y), normal = { x: -(segment.to.y - segment.from.y) / length, y: (segment.to.x - segment.from.x) / length };
            for (const fraction of [.25, .5, .75]) for (const side of record.width > 2 ? [-1, 1] : [0]) {
              const cssX = segment.from.x + (segment.to.x - segment.from.x) * fraction + normal.x * side;
              const cssY = segment.from.y + (segment.to.y - segment.from.y) * fraction + normal.y * side;
              const group = [];
              const reach = record.width > 2 ? 1 : 2;
              for (let oy = -reach; oy <= reach; oy++) for (let ox = -reach; ox <= reach; ox++) {
                const px = Math.floor(cssX * ratio) + ox, py = Math.floor(cssY * this.canvas.height / b.height) + oy;
                if (px < 0 || py < 0 || px >= this.canvas.width || py >= this.canvas.height) continue;
                const x = (px + .5) / ratio, y = (py + .5) * b.height / this.canvas.height;
                const along = ((x - segment.from.x) * (segment.to.x - segment.from.x) + (y - segment.from.y) * (segment.to.y - segment.from.y)) / length;
                const distanceToLine = Math.abs((x - segment.from.x) * normal.x + (y - segment.from.y) * normal.y);
                // The future card border covers the final .5 CSS px of this connector.
                // Observe the original stroke body, including its overlap with the original crosshair.
                if (record.width <= 2 && (along < .5 || along > length - .75 || distanceToLine > .5)) continue;
                group.push({ px, py, x, y, along, distanceToLine, fraction, distance: Math.hypot(x - cssX, y - cssY) });
              }
              candidates.push(group);
            }
          }
          if (candidates.length) {
            const readBefore = readRegion(this, candidates.flat());
            for (const group of candidates) for (const p of group) p.before = readBefore(p.px, p.py).slice(0, 3);
          }
          w.__calloutStrokes.push(record);
        }
      }
      if (givenPath) stroke.call(this, givenPath); else stroke.call(this);
      const readAfter = record && candidates.length ? readRegion(this, candidates.flat()) : null;
      if (record && candidates.length) for (const group of candidates) {
        const painted = group.map((p: any) => { const rgb = readAfter!(p.px, p.py).slice(0, 3), expected = record.rgb.map((v: number, i: number) => Math.round(v * record.alpha + p.before[i] * (1 - record.alpha)));
          return { x: p.x, y: p.y, rgb, expected, before: p.before, contrast: contrast(rgb, p.before), channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expected[i]))), changed: Math.max(...rgb.map((v, i) => Math.abs(v - p.before[i]))), fraction: p.fraction, along: p.along, distanceToLine: p.distanceToLine, startClearance: p.along, cardBorderClearance: Math.hypot(record.segments[0].to.x - record.segments[0].from.x, record.segments[0].to.y - record.segments[0].from.y) - p.along, distance: p.distance, paintNeighbors: neighborhood(this, p.px, p.py, readAfter!) }; });
        painted.sort((a: any, b: any) => a.channelError - b.channelError || (record.width > 2 ? a.distance - b.distance : b.changed - a.changed) || a.y - b.y || a.x - b.x);
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
          let coverage = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy; if (nx >= 0 && ny >= 0 && nx < stencil.width && ny < stencil.height) coverage += mask[(ny * stencil.width + nx) * 4 + 3];
          }
          solid.push({ px: backingX, py: backingY, x: (backingX + .5) * b.width / this.canvas.width, y: (backingY + .5) * b.height / this.canvas.height,
            alpha: alpha / 255, coverage });
        }
        // Choose solid interior strokes rather than antialiasing edges when the browser composites a fractional page position.
        solid.sort((a, b) => b.coverage - a.coverage || a.py - b.py || a.px - b.px);
        for (const candidate of solid) { if (witnesses.every(p => Math.hypot(p.px - candidate.px, p.py - candidate.py) >= 2)) witnesses.push(candidate); if (witnesses.length === 3) break; }
        if (witnesses.length) { const readBefore = readRegion(this, witnesses); witnesses.forEach(p => p.before = readBefore(p.px, p.py).slice(0, 3)); }
        w.__calloutText.push(record);
      }
      if (maxWidth === undefined) text.call(this, value, x, y); else text.call(this, value, x, y, maxWidth);
      const readAfter = record && witnesses.length ? readRegion(this, witnesses) : null;
      if (record) record.witnesses = witnesses.map(p => {
        const rgb = readAfter!(p.px, p.py).slice(0, 3), alpha = record.alpha * p.alpha;
        const expected = record.rgb.map((v: number, i: number) => Math.round(v * alpha + p.before[i] * (1 - alpha)));
        return { x: p.x, y: p.y, rgb, expected, before: p.before, alpha: p.alpha, contrast: contrast(record.rgb.map((v: number, i: number) => v * record.alpha + p.before[i] * (1 - record.alpha)), p.before), channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expected[i]))), paintNeighbors: neighborhood(this, p.px, p.py, readAfter!) };
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
    const draw = { width: b.width, height: b.height, backingWidth: cv.width, backingHeight: cv.height, generation: w.__calloutGeneration, measurements: [...w.__calloutMeasures.values()],
      layout: cv._visualLayout, view: cv._launchView, marker: cv._visualInspection, selected, originalPoint: cv._inspection?.trail[selected?.index], selectedTrailIndex: cv._inspection ? cv._trails.indexOf(cv._inspection.trail) : -1, selectedApex: cv._inspection?.trail.apex,
      cards: w.__calloutCards, text: w.__calloutText, strokes: w.__calloutStrokes, rings: w.__calloutRings, launched: cv._launched, preview: cv._visualPreview,
      pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth };
    // Read surviving native ink independently after every annotation has painted.
    const ctx = cv.getContext('2d')!, ratioX = cv.width / b.width, ratioY = cv.height / b.height;
    const finalPixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const finalRgba = (x: number, y: number) => [...finalPixels.slice((y * cv.width + x) * 4, (y * cv.width + x) * 4 + 4)];
    for (const paint of draw.strokes.filter((s: any) => Math.abs(s.width - 1) < .01 && s.segments.length === 1 && !s.dash.length)) {
      for (const witness of paint.witnesses) {
        const px = Math.floor(witness.x * ratioX), py = Math.floor(witness.y * ratioY), neighbors = [];
        witness.finalNativeRgba = finalRgba(px, py);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          if (px + ox >= 0 && py + oy >= 0 && px + ox < cv.width && py + oy < cv.height) neighbors.push({ pixelX: px + ox, pixelY: py + oy, rgba: finalRgba(px + ox, py + oy) });
        }
        witness.finalPaintNeighbors = neighbors;
      }
    }
    for (const paint of draw.strokes.filter((s: any) => (Math.abs(s.width - 3) < .01 && s.segments.length === 1) || (Math.abs(s.width - 2) < .01 && s.segments.length === 4))) {
      paint.finalWitnesses = [];
      for (const segment of paint.segments) {
        const length = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y), normal = { x: -(segment.to.y - segment.from.y) / length, y: (segment.to.x - segment.from.x) / length };
        for (const fraction of [.25, .5, .75]) for (const side of paint.width > 2 ? [-1, 1] : [0]) {
          const target = { x: segment.from.x + (segment.to.x - segment.from.x) * fraction + normal.x * side * 1.1, y: segment.from.y + (segment.to.y - segment.from.y) * fraction + normal.y * side * 1.1 }, candidates = [];
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const px = Math.floor(target.x * ratioX) + dx, py = Math.floor(target.y * ratioY) + dy;
            if (px < 1 || py < 1 || px >= cv.width - 1 || py >= cv.height - 1) continue;
            const x = (px + .5) / ratioX, y = (py + .5) / ratioY;
            if (x < draw.view.x + .25 || x > draw.width - 20 - .25 || y < draw.layout.plotTop + .25 || y > draw.view.groundY - .25) continue;
            const along = ((x - segment.from.x) * (segment.to.x - segment.from.x) + (y - segment.from.y) * (segment.to.y - segment.from.y)) / length;
            const distanceToLine = Math.abs((x - segment.from.x) * normal.x + (y - segment.from.y) * normal.y);
            if (along < 0 || along > length || (paint.width > 2 && (distanceToLine < .7 || distanceToLine > 1.45)) || (paint.width <= 2 && distanceToLine > paint.width / 2)) continue;
            const rgb = finalRgba(px, py).slice(0, 3), channelError = Math.max(...rgb.map((v, i) => Math.abs(v - paint.rgb[i]))), neighbors = [];
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) neighbors.push({ pixelX: px + ox, pixelY: py + oy, rgba: finalRgba(px + ox, py + oy) });
            candidates.push({ x, y, rgb, expected: paint.rgb, channelError, distance: Math.hypot(x - target.x, y - target.y), distanceToLine, fraction, side, paintNeighbors: neighbors });
          }
          candidates.sort((a, b) => a.channelError - b.channelError || a.distance - b.distance || a.y - b.y || a.x - b.x);
          if (candidates.length) paint.finalWitnesses.push(candidates[0]);
        }
      }
    }
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
function finiteSegmentDistance(a: Point, b: Point, c: Point, d: Point) {
  const u = { x: b.x - a.x, y: b.y - a.y }, v = { x: d.x - c.x, y: d.y - c.y }, delta = { x: c.x - a.x, y: c.y - a.y };
  const determinant = u.x * v.y - u.y * v.x;
  if (Math.abs(determinant) > 1e-12) {
    const t = (delta.x * v.y - delta.y * v.x) / determinant, s = (delta.x * u.y - delta.y * u.x) / determinant;
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return 0;
  }
  const toSegment = (p: Point, from: Point, to: Point) => {
    const dx = to.x - from.x, dy = to.y - from.y, squared = dx * dx + dy * dy;
    const fraction = squared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.y - from.y) * dy) / squared));
    return Math.hypot(p.x - from.x - dx * fraction, p.y - from.y - dy * fraction);
  };
  return Math.min(toSegment(a, c, d), toSegment(b, c, d), toSegment(c, a, b), toSegment(d, a, b));
}
function segmentBeyondBundle(segment: { from: Point; to: Point }, bundle: Box) {
  if (!contains(bundle, segment.from)) return segment;
  if (contains(bundle, segment.to)) return null;
  const dx = segment.to.x - segment.from.x, dy = segment.to.y - segment.from.y;
  const exits = [dx > 0 ? (bundle.x + bundle.width - segment.from.x) / dx : dx < 0 ? (bundle.x - segment.from.x) / dx : Infinity,
    dy > 0 ? (bundle.y + bundle.height - segment.from.y) / dy : dy < 0 ? (bundle.y - segment.from.y) / dy : Infinity];
  const fraction = Math.min(...exits);
  return { from: { x: segment.from.x + dx * fraction, y: segment.from.y + dy * fraction }, to: segment.to };
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
  const crosshairs = draw.strokes.filter(s => s.segments.length === 4 && Math.abs(s.width - 2 * scaleX) < .01 && s.color.toLowerCase() === (draw.rings.find(r => Math.abs(r.radius - 10 * scaleX) < .01 && Math.hypot(r.x - projected.x, r.y - projected.y) < .01)?.color || '').toLowerCase());
  expect(crosshairs, 'actual selected point paints its original four crosshair arms').toHaveLength(1);
  // The original trajectory's rounded strokes are scoped by save/restore; these annotations retain the native butt/miter styles.
  const crosshair = crosshairs[0]; expect(crosshair.lineCap, 'original crosshair caps are preserved').toBe('butt'); expect(crosshair.lineJoin).toBe('miter');
  const expectedCrosshair = [
    { from: { x: projected.x - 14 * scaleX, y: projected.y }, to: { x: projected.x - 6 * scaleX, y: projected.y } },
    { from: { x: projected.x + 6 * scaleX, y: projected.y }, to: { x: projected.x + 14 * scaleX, y: projected.y } },
    { from: { x: projected.x, y: projected.y - 14 * scaleY }, to: { x: projected.x, y: projected.y - 6 * scaleY } },
    { from: { x: projected.x, y: projected.y + 6 * scaleY }, to: { x: projected.x, y: projected.y + 14 * scaleY } }
  ];
  crosshair.segments.forEach((segment, i) => { for (const endpoint of ['from', 'to'] as const) { expect(segment[endpoint].x).toBeCloseTo(expectedCrosshair[i][endpoint].x, 8); expect(segment[endpoint].y).toBeCloseTo(expectedCrosshair[i][endpoint].y, 8); } });
  const annotated = draw.cards.map(card => {
    const label = labelFor(card); expect(label, 'actual panel maps to a retained semantic identity').toBeTruthy(); expect(card.alpha).toBe(1);
    const text = draw.text.filter(t => t.paintOrder > card.paintOrder && t.paintOrder < (draw.cards.find(other => other.paintOrder > card.paintOrder)?.paintOrder ?? Infinity));
    expect(text.length, label.id + ' paints actual text').toBeGreaterThan(0);
    const leaders = draw.strokes.filter(s => s.paintOrder === card.paintOrder - 1 && s.segments.length === 1 && Math.abs(s.width - scaleX) < .01 && !s.dash.length);
    expect(leaders, label.id + ' has one actual painted leader').toHaveLength(1); const leader = leaders[0];
    const outlines = draw.strokes.filter(s => s.paintOrder === card.paintOrder - 2 && s.segments.length === 1 && Math.abs(s.width - 3 * scaleX) < .01 && !s.dash.length);
    expect(outlines, label.id + ' actual outline agrees with optional paint metadata').toHaveLength(label.outline ? 1 : 0); const outline = outlines[0] || null;
    expect(leader.lineCap, 'original foreground connector caps are preserved').toBe('butt'); expect(leader.lineJoin).toBe('miter');
    if (outline) {
      expect(outline.alpha).toBe(1); expect(outline.rgb).toEqual(card.rgb); expect(outline.lineCap).toBe(leader.lineCap);
      const foreground = leader.segments[0], dark = outline.segments[0], vector = { x: foreground.to.x - foreground.from.x, y: foreground.to.y - foreground.from.y }, squared = vector.x ** 2 + vector.y ** 2;
      const startFraction = ((dark.from.x - foreground.from.x) * vector.x + (dark.from.y - foreground.from.y) * vector.y) / squared;
      expect(startFraction, 'outline starts on or after the preserved foreground start').toBeGreaterThanOrEqual(-1e-8); expect(startFraction).toBeLessThan(1);
      expect(Math.abs((dark.from.x - foreground.from.x) * vector.y - (dark.from.y - foreground.from.y) * vector.x), 'shortened outline remains collinear with original connector').toBeLessThan(1e-5);
      expect(dark.to).toEqual(foreground.to);
      for (const endpoint of ['from', 'to'] as const) { expect(dark[endpoint].x).toBeCloseTo(label.outline[endpoint].x * scaleX, 8); expect(dark[endpoint].y).toBeCloseTo(label.outline[endpoint].y * scaleY, 8); }
      for (const point of points) for (const segment of outline.segments) expect(segmentTouchesBox(segment.from, segment.to, point, outline.width / 2), label.id + ' dark outline erases a point ring or its caps').toBe(false);
      for (const stroke of [...arrows, crosshair]) for (const protectedSegment of stroke.segments) {
        const box = { x: Math.min(protectedSegment.from.x, protectedSegment.to.x), y: Math.min(protectedSegment.from.y, protectedSegment.to.y), width: Math.abs(protectedSegment.to.x - protectedSegment.from.x), height: Math.abs(protectedSegment.to.y - protectedSegment.from.y) };
        for (const segment of outline.segments) expect(segmentTouchesBox(segment.from, segment.to, box, (outline.width + stroke.width) / 2), label.id + ' dark outline erases actual vector or crosshair ink').toBe(false);
      }
    }
    expect(card.x).toBeGreaterThanOrEqual((draw.view.x + 8) * scaleX - .01); expect(card.x + card.width).toBeLessThanOrEqual(draw.width - 28 * scaleX + .01);
    expect(card.y).toBeGreaterThanOrEqual((draw.layout.plotTop + 8) * scaleY - .01); expect(card.y + card.height).toBeLessThanOrEqual((draw.view.groundY - 8) * scaleY + .01);
    for (const t of text) { expect(t.fontSize, t.text).toBeGreaterThanOrEqual(11.99); expect(t.left).toBeGreaterThanOrEqual(card.x + 7 * scaleX - .01); expect(t.right).toBeLessThanOrEqual(card.x + card.width - 7 * scaleX + .01); expect(t.top).toBeGreaterThanOrEqual(card.y); expect(t.bottom).toBeLessThanOrEqual(card.y + card.height); }
    for (const axis of axisBoxes) { expect(overlaps(card, axis, 2), label.id + ' covers actual axis glyphs: ' + axis.text).toBe(false); for (const segment of outline?.segments || []) expect(segmentTouchesBox(segment.from, segment.to, axis, outline!.width / 2), label.id + ' connector outline crosses actual axis glyphs').toBe(false); }
    for (const point of points) { expect(overlaps(card, point), label.id + ' covers an original point ring').toBe(false); if (Math.hypot(point.center.x - label.anchor.x * scaleX, point.center.y - label.anchor.y * scaleY) > point.radius + 4) for (const segment of leader.segments) expect(segmentTouchesBox(segment.from, segment.to, point), label.id + ' leader crosses another point').toBe(false); }
    for (const arrow of arrows) for (const segment of arrow.segments) expect(segmentTouchesBox(segment.from, segment.to, card, arrow.width / 2), label.id + ' covers an actual velocity/gravity shaft or arrowhead').toBe(false);
    const segment = leader.segments[0], anchor = { x: label.anchor.x * scaleX, y: label.anchor.y * scaleY };
    const cross = (segment.to.x - anchor.x) * (segment.from.y - anchor.y) - (segment.to.y - anchor.y) * (segment.from.x - anchor.x);
    expect(Math.abs(cross), label.id + ' leader points to its actual original anchor').toBeLessThan(1e-5);
    expect(Math.hypot(segment.from.x - anchor.x, segment.from.y - anchor.y)).toBeCloseTo((label.anchor.radius + 2) * scaleX, 7);
    expect(contains(card, segment.to, .01)).toBe(true); expect(Math.min(Math.abs(segment.to.x - card.x), Math.abs(segment.to.x - card.x - card.width), Math.abs(segment.to.y - card.y), Math.abs(segment.to.y - card.y - card.height))).toBeLessThan(.01);
    return { id: label.id, card, text, leader, outline, anchor, radius: label.anchor.radius };
  });
  const cssPoint = (point: Point) => ({ x: point.x / scaleX, y: point.y / scaleY });
  const lowerForegroundCrosshairPairs = annotated.filter(label => label.id !== 'inspection').flatMap(label => crosshair.segments.map((observedArm, armIndex) => {
    const segment = { from: cssPoint(label.leader.segments[0].from), to: cssPoint(label.leader.segments[0].to) }, arm = { from: cssPoint(observedArm.from), to: cssPoint(observedArm.to) };
    const distance = finiteSegmentDistance(segment.from, segment.to, arm.from, arm.to), pair = { id: label.id, armIndex, segment, arm, distance, requiredDistance: 2 };
    expect(distance, 'lower-priority foreground clears the actual selected crosshair: ' + JSON.stringify(pair)).toBeGreaterThanOrEqual(2 - 1e-7);
    return pair;
  }));
  const markerBoxes = [...points.map(point => ({ x: point.x / scaleX, y: point.y / scaleY, width: point.width / scaleX, height: point.height / scaleY })),
    ...annotated.map(label => ({ x: label.anchor.x / scaleX - label.radius - 4, y: label.anchor.y / scaleY - label.radius - 4, width: (label.radius + 4) * 2, height: (label.radius + 4) * 2 }))];
  const vectorBoxes = arrows.filter(stroke => stroke.color.toLowerCase() === '#93c5fd').map(resultant => {
    const origin = resultant.segments[0].from;
    const shafts = arrows.flatMap(stroke => stroke.segments.filter(segment => Math.hypot(segment.from.x - origin.x, segment.from.y - origin.y) < 1e-7).map(segment => ({ from: cssPoint(segment.from), to: cssPoint(segment.to) })));
    const left = Math.min(...shafts.flatMap(segment => [segment.from.x, segment.to.x])) - 6, top = Math.min(...shafts.flatMap(segment => [segment.from.y, segment.to.y])) - 6;
    const right = Math.max(...shafts.flatMap(segment => [segment.from.x, segment.to.x])) + 6, bottom = Math.max(...shafts.flatMap(segment => [segment.from.y, segment.to.y])) + 6;
    return { x: left, y: top, width: right - left, height: bottom - top, shafts };
  });
  const connectorPairs = [];
  for (let i = 0; i < annotated.length; i++) for (let j = i + 1; j < annotated.length; j++) {
    const a = annotated[i], b = annotated[j]; expect(overlaps(a.card, b.card, 5.99 * scaleX), a.id + ' overlaps ' + b.id).toBe(false);
    for (const segment of a.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, b.card, 1.99 * scaleX), a.id + ' leader crosses ' + b.id).toBe(false);
    for (const segment of b.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, a.card, 1.99 * scaleX), b.id + ' leader crosses ' + a.id).toBe(false);
    const anchorA = cssPoint(a.anchor), anchorB = cssPoint(b.anchor), sharedAnchor = Math.abs(anchorA.x - anchorB.x) < 1e-7 && Math.abs(anchorA.y - anchorB.y) < 1e-7;
    const actualA = { from: cssPoint(a.leader.segments[0].from), to: cssPoint(a.leader.segments[0].to) }, actualB = { from: cssPoint(b.leader.segments[0].from), to: cssPoint(b.leader.segments[0].to) };
    let comparedA: { from: Point; to: Point } | null = actualA, comparedB: { from: Point; to: Point } | null = actualB, bundle: Box | null = null;
    if (sharedAnchor) {
      const own = [...markerBoxes, ...vectorBoxes].filter(box => contains(box, anchorA));
      const left = Math.min(...own.map(box => box.x)) - 3, top = Math.min(...own.map(box => box.y)) - 3;
      const right = Math.max(...own.map(box => box.x + box.width)) + 3, bottom = Math.max(...own.map(box => box.y + box.height)) + 3;
      bundle = { x: left, y: top, width: right - left, height: bottom - top };
      comparedA = segmentBeyondBundle(actualA, bundle); comparedB = segmentBeyondBundle(actualB, bundle);
    }
    const distance = comparedA && comparedB ? finiteSegmentDistance(comparedA.from, comparedA.to, comparedB.from, comparedB.to) : null;
    const pair = { idA: a.id, idB: b.id, sharedAnchor, bundle, actualA, actualB, comparedA, comparedB, distance, requiredDistance: 4 };
    if (distance !== null) expect(distance, 'actual connector pair retains four CSS pixels: ' + JSON.stringify(pair)).toBeGreaterThanOrEqual(4 - 1e-7);
    connectorPairs.push(pair);
  }
  return { selectedText: selectedText.map(t => t.text), expectedText, projected, annotated, axes, axisBoxes, points, arrows, crosshair, connectorClearance: { requiredDistance: 4, markerBoxes, vectorBoxes, pairs: connectorPairs }, lowerForegroundCrosshairClearance: { requiredDistance: 2, pairs: lowerForegroundCrosshairPairs }, geometryVerified: true, selectedCardVisible: true, selectedTextComplete: true, axisGlyphClearance: true, originalPointClearance: true, vectorClearance: true, otherLabelClearance: true };
}
async function capture(page: Page, trail: Trail, index: number, theme: string, filename: string) {
  mkdirSync(reports, { recursive: true }); const before = await evidence(page);
  await page.locator('#physicsCanvas').scrollIntoViewIfNeeded();
  await page.locator('#physicsCanvas').evaluate(el => {
    const b = el.getBoundingClientRect();
    if (b.height + 4 > window.innerHeight) throw Error('Canvas fixture cannot fit in the capture viewport');
    // Native element scrolling can leave its fractional top just above the viewport edge.
    window.scrollBy(0, Math.floor(b.top) - 2);
  });
  await page.evaluate(async () => { const w = window as any; w.__calloutNative(); await w.__calloutSettle(); });
  const draw = await redraw(page);
  let layoutProof: ReturnType<typeof geometry>;
  try { layoutProof = geometry(draw, trail, index); }
  catch (error) {
    writeFileSync(path.join(reports, filename.replace(/\.png$/, '-geometry-failure.json')), JSON.stringify({ filename, theme, index, sourceSha256: initialHashes[0], specSha256: initialHashes[2], trail, draw }, null, 2));
    throw error;
  }
  const screenshotGeometry = await page.locator('#physicsCanvas').evaluate(el => {
    const b = el.getBoundingClientRect(), cv = el as HTMLCanvasElement;
    const canvasDocumentRect = { left: b.left + window.scrollX, top: b.top + window.scrollY, right: b.right + window.scrollX, bottom: b.bottom + window.scrollY, width: b.width, height: b.height };
    const clip = { x: Math.floor(canvasDocumentRect.left + .001), y: Math.floor(canvasDocumentRect.top + .001), width: Math.ceil(canvasDocumentRect.right - .001) - Math.floor(canvasDocumentRect.left + .001), height: Math.ceil(canvasDocumentRect.bottom - .001) - Math.floor(canvasDocumentRect.top + .001) };
    return { canvasRect: { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }, canvasDocumentRect, clip, coordinateSpace: 'document',
      dpr: window.devicePixelRatio, backingWidth: cv.width, backingHeight: cv.height, scrollX: window.scrollX, scrollY: window.scrollY, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight };
  });
  expect(screenshotGeometry.canvasRect.width).toBe(draw.width); expect(screenshotGeometry.canvasRect.height).toBe(draw.height);
  expect(screenshotGeometry.backingWidth).toBe(draw.backingWidth); expect(screenshotGeometry.backingHeight).toBe(draw.backingHeight);
  const { clip, canvasRect, dpr } = screenshotGeometry;
  const cdp = await page.context().newCDPSession(page);
  const beforeCaptureMetrics = await cdp.send('Page.getLayoutMetrics');
  // Element screenshots send an integer document clip directly to Chromium.
  // Preserve the actual document canvas origin and independent capture metrics.
  const documentCanvasOrigin = { left: canvasRect.left + screenshotGeometry.scrollX, top: canvasRect.top + screenshotGeometry.scrollY };
  const screenshotDocumentOrigin = { left: clip.x, top: clip.y };
  const effectiveCanvasOrigin = documentCanvasOrigin;
  // Validate one image-wide browser mapping against fixed native axis-pixel constellations.
  // Small fractional origins may snap; larger origins retain continuous CSS placement.
  expect(draw.backingWidth).toBe(draw.width * dpr); expect(draw.backingHeight).toBe(draw.height * dpr);
  const calibrationNative = await page.evaluate(anchors => {
    const cv = document.getElementById('physicsCanvas') as HTMLCanvasElement, ctx = cv.getContext('2d')!;
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    return anchors.map(anchor => {
      const neighbors = [];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const pixelX = anchor.anchorNativePixel.x + dx, pixelY = anchor.anchorNativePixel.y + dy;
        if (pixelX < 0 || pixelY < 0 || pixelX >= cv.width || pixelY >= cv.height) throw Error('Fixed calibration constellation must remain inside native canvas');
        neighbors.push({ pixelX, pixelY, rgba: [...data.slice((pixelY * cv.width + pixelX) * 4, (pixelY * cv.width + pixelX) * 4 + 4)] });
      }
      return { text: anchor.text, anchorNativePixel: anchor.anchorNativePixel, targets: anchor.neighbors.map(p => ({ pixelX: p.pixelX, pixelY: p.pixelY })), neighbors };
    });
  }, layoutProof.axes.flatMap(t => t.witnesses.map(witness => ({ text: t.text, anchorNativePixel: { x: Math.floor(witness.x * draw.backingWidth / draw.width), y: Math.floor(witness.y * draw.backingHeight / draw.height) }, neighbors: witness.paintNeighbors }))));
  expect(calibrationNative.length, 'independent axis pixel anchors calibrate the one image transform').toBeGreaterThanOrEqual(3);
  expect(clip.x).toBeGreaterThanOrEqual(0); expect(clip.y).toBeGreaterThanOrEqual(0); expect(clip.x + clip.width).toBeLessThanOrEqual(screenshotGeometry.documentWidth); expect(clip.y + clip.height).toBeLessThanOrEqual(screenshotGeometry.documentHeight);
  const screenshot = path.join(reports, filename), buffer = await page.locator('#physicsCanvas').screenshot({ path: screenshot, scale: 'device', animations: 'disabled' }), pixels = readPng(buffer);
  const afterCaptureMetrics = await cdp.send('Page.getLayoutMetrics'); await cdp.detach();
  const afterCanvasDocumentRect = await page.locator('#physicsCanvas').evaluate(el => {
    const b = el.getBoundingClientRect(); return { left: b.left + window.scrollX, top: b.top + window.scrollY, right: b.right + window.scrollX, bottom: b.bottom + window.scrollY, width: b.width, height: b.height };
  });
  expect(afterCanvasDocumentRect, 'the actual element document bounds remain stable through capture').toEqual(screenshotGeometry.canvasDocumentRect);
  expect(afterCaptureMetrics.visualViewport, 'actual Chromium document capture viewport remains stable').toEqual(beforeCaptureMetrics.visualViewport);
  const captureMetrics = { beforeCaptureMetrics, afterCaptureMetrics, afterCanvasDocumentRect };
  expect(pixels.width).toBe(clip.width * dpr); expect(pixels.height).toBe(clip.height * dpr);
  const projectAtOrigin = (pixelX: number, pixelY: number, neighbors: Witness['paintNeighbors'], origin: { left: number; top: number }) => {
    const rawX = ((clip.x + (pixelX + .5) / dpr - origin.left) * draw.backingWidth / draw.width) - .5;
    const rawY = ((clip.y + (pixelY + .5) / dpr - origin.top) * draw.backingHeight / draw.height) - .5;
    const left = Math.floor(rawX), top = Math.floor(rawY), xWeight = rawX - left, yWeight = rawY - top;
    const inputs = [[left, top, (1 - xWeight) * (1 - yWeight)], [left + 1, top, xWeight * (1 - yWeight)], [left, top + 1, (1 - xWeight) * yWeight], [left + 1, top + 1, xWeight * yWeight]].map(([x, y, weight]) => {
      const neighbor = neighbors.find(p => p.pixelX === x && p.pixelY === y); if (!neighbor) throw Error('Independent paint must contain every compositor input: ' + JSON.stringify({ x, y, pixelX, pixelY })); return { ...neighbor, weight };
    });
    const rgba = [0, 1, 2, 3].map(channel => Math.round(inputs.reduce((sum, p) => sum + p.rgba[channel] * p.weight, 0)));
    return { rawX, rawY, xWeight, yWeight, inputs, rgba };
  };
  const candidates = [
    // Blink HTMLCanvasPainter rounds the CSS layout rectangle for a foreign canvas layer.
    // https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/paint/html_canvas_painter.cc
    { kind: 'css-origin-rounding', rasterOrigin: { left: Math.round(effectiveCanvasOrigin.left), top: Math.round(effectiveCanvasOrigin.top) } },
    { kind: 'device-origin-rounding', rasterOrigin: { left: Math.round(effectiveCanvasOrigin.left * dpr) / dpr, top: Math.round(effectiveCanvasOrigin.top * dpr) / dpr } },
    { kind: 'continuous-css-origin', rasterOrigin: effectiveCanvasOrigin }
  ].map((candidate, order) => {
    const calibration = calibrationNative.map(anchor => ({ text: anchor.text, anchorNativePixel: anchor.anchorNativePixel, samples: anchor.targets.map(p => {
      const pixelX = Math.floor((candidate.rasterOrigin.left - clip.x) * dpr + (p.pixelX + .5) * dpr * draw.width / draw.backingWidth), pixelY = Math.floor((candidate.rasterOrigin.top - clip.y) * dpr + (p.pixelY + .5) * dpr * draw.height / draw.backingHeight), rgb = pixels.at(pixelX, pixelY);
      const projected = projectAtOrigin(pixelX, pixelY, anchor.neighbors, candidate.rasterOrigin), channelError = Math.max(...rgb.map((v, i) => Math.abs(v - projected.rgba[i])));
      if (projected.inputs.some(p => p.rgba[3] !== 255)) throw Error('Every fixed native calibration input must be opaque');
      return { nativePixelX: p.pixelX, nativePixelY: p.pixelY, savedPixelX: pixelX, savedPixelY: pixelY, savedRgb: rgb, projected, channelError };
    }) }));
    const errors = calibration.flatMap(c => c.samples.map(s => s.channelError));
    return { ...candidate, order, calibration, maxResidual: Math.max(...errors), meanResidual: errors.reduce((sum, v) => sum + v, 0) / errors.length };
  });
  const selectedTransform = [...candidates].sort((a, b) => a.maxResidual - b.maxResidual || a.meanResidual - b.meanResidual || a.order - b.order)[0];
  if (selectedTransform.maxResidual > 4) throw Error('No deterministic browser raster transform preserves every fixed axis constellation: ' + JSON.stringify(candidates.map(c => ({ kind: c.kind, rasterOrigin: c.rasterOrigin, maxResidual: c.maxResidual, worst: c.calibration.flatMap(a => a.samples).sort((a, b) => b.channelError - a.channelError).slice(0, 2) }))));
  const rasterOrigin = selectedTransform.rasterOrigin, offsetDevicePixels = { x: (rasterOrigin.left - effectiveCanvasOrigin.left) * dpr, y: (rasterOrigin.top - effectiveCanvasOrigin.top) * dpr };
  expect(Math.abs(offsetDevicePixels.x)).toBeLessThanOrEqual(.5 * dpr); expect(Math.abs(offsetDevicePixels.y)).toBeLessThanOrEqual(.5 * dpr);
  const rasterTransform = { kind: selectedTransform.kind, selectionRule: 'lowest maximum residual, then mean residual, then CSS rounding, device rounding, continuous origin', cssOrigin: { left: canvasRect.left, top: canvasRect.top }, documentCanvasOrigin, screenshotDocumentOrigin, effectiveCanvasOrigin, rasterOrigin, offsetDevicePixels, nativeConstellations: calibrationNative, candidates, calibration: selectedTransform.calibration, maxResidual: selectedTransform.maxResidual };
  const at = (p: Point) => { const pixelX = Math.floor((rasterOrigin.left + p.x - clip.x) * dpr), pixelY = Math.floor((rasterOrigin.top + p.y - clip.y) * dpr); if (pixelX < 0 || pixelX >= pixels.width || pixelY < 0 || pixelY >= pixels.height) throw Error('Saved witness must remain inside PNG bounds: ' + JSON.stringify({ p, pixelX, pixelY })); return { pixelX, pixelY, rgb: pixels.at(pixelX, pixelY) }; };
  const projection = (pixelX: number, pixelY: number, neighbors: Witness['paintNeighbors']) => projectAtOrigin(pixelX, pixelY, neighbors, rasterOrigin);
  const textThreshold = theme === 'contrast' ? 7 : 4.5, graphicThreshold = theme === 'contrast' ? 7 : 3;
  const glyphs = [...layoutProof.axes.map(t => ({ kind: 'axis', ...t })), ...layoutProof.annotated.flatMap(a => a.text.map(t => ({ kind: a.id, ...t })))].map(t => {
    expect(t.witnesses.length, 'actual solid glyph witnesses: ' + t.text).toBeGreaterThanOrEqual(1);
    const samples = t.witnesses.map(witness => { const actual = at(witness), projected = projection(actual.pixelX, actual.pixelY, witness.paintNeighbors), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - projected.rgba[i]))), contrast = contrastRatio(actual.rgb, witness.before! as [number, number, number]);
      expect(channelError, 'saved glyph survives final opaque panels: ' + t.text).toBeLessThanOrEqual(4); expect(witness.channelError, 'independent glyph stencil matches actual text paint').toBeLessThanOrEqual(6); expect(contrast, 'actual saved text contrast: ' + t.text).toBeGreaterThanOrEqual(textThreshold); return { ...witness, ...actual, projected, contrast, channelError }; });
    return { ...t, samples, minContrast: Math.min(...samples.map(w => w.contrast!)) };
  });
  const cardPanels = layoutProof.annotated.map(a => {
    const b = a.card, inset = 3 * draw.width / draw.layout.width;
    const samples = [{ x: b.x + b.width / 2, y: b.y + inset }, { x: b.x + b.width / 2, y: b.y + b.height - inset }, { x: b.x + inset, y: b.y + b.height / 2 }, { x: b.x + b.width - inset, y: b.y + b.height / 2 }].map(p => {
      const pixel = at(p), channelError = Math.max(...pixel.rgb.map((v, i) => Math.abs(v - b.rgb[i]))); expect(channelError, a.id + ' opaque panel is retained in saved PNG').toBeLessThanOrEqual(4); return { ...p, ...pixel, expected: b.rgb, channelError };
    }); return { id: a.id, card: b, samples };
  });
  const sceneSurface = (leader: StrokePaint) => {
    const segment = leader.segments[0], middle = { x: (segment.from.x + segment.to.x) / 2, y: (segment.from.y + segment.to.y) / 2 };
    const length = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y), normal = { x: -(segment.to.y - segment.from.y) / length, y: (segment.to.x - segment.from.x) / length };
    const candidates: Point[] = [];
    for (const distance of [6, 10, 14, 20, 28, 40, 56, 80]) for (const sign of [-1, 1]) candidates.push({ x: middle.x + normal.x * distance * sign, y: middle.y + normal.y * distance * sign });
    for (let y = draw.layout.plotTop + 4; y < draw.view.groundY - 4; y += 8) for (let x = draw.view.x + 6; x < draw.width - 24; x += 8) candidates.push({ x, y });
    candidates.sort((a, b) => Math.hypot(a.x - middle.x, a.y - middle.y) - Math.hypot(b.x - middle.x, b.y - middle.y) || a.y - b.y || a.x - b.x);
    const glyphBoxes = draw.text.map(t => ({ x: t.left, y: t.top, width: t.right - t.left, height: t.bottom - t.top }));
    for (const candidate of candidates) {
      if (candidate.x < draw.view.x + 4 || candidate.x > draw.width - 24 || candidate.y < draw.layout.plotTop + 4 || candidate.y > draw.view.groundY - 4) continue;
      if ([...draw.cards, ...glyphBoxes, ...layoutProof.points].some(b => contains(b, candidate, 2))) continue;
      const pixelBox = { x: candidate.x - .5, y: candidate.y - .5, width: 1, height: 1 };
      if (draw.strokes.some(stroke => stroke.segments.some(s => segmentTouchesBox(s.from, s.to, pixelBox, stroke.width / 2 + 3)))) continue;
      const sample = at(candidate); if (!sample.rgb.every((v, i) => v <= [30, 50, 75][i])) continue;
      return { ...candidate, ...sample, leaderMiddle: middle, distance: Math.hypot(candidate.x - middle.x, candidate.y - middle.y), clearOfObservedPaint: true };
    }
    throw Error('No independently clear, visible scene surface near the actual leader');
  };
  const leaders = layoutProof.annotated.map(a => {
    const surfaceWitness = sceneSurface(a.leader);
    expect(a.leader.witnesses).toHaveLength(3);
    const samples = a.leader.witnesses.map(witness => { const actual = at(witness), projected = projection(actual.pixelX, actual.pixelY, witness.paintNeighbors), finalProjected = projection(actual.pixelX, actual.pixelY, witness.finalPaintNeighbors!), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - projected.rgba[i]))), finalChannelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - finalProjected.rgba[i]))), overlapContrast = contrastRatio(actual.rgb, witness.before! as [number, number, number]), contrast = contrastRatio(actual.rgb, surfaceWitness.rgb);
      const finalInkError = Math.max(...witness.rgb.map((v, i) => Math.abs(v - witness.finalNativeRgba![i])));
      expect(finalInkError, a.id + ' original leader ink survives later annotations ' + JSON.stringify({ witness, leader: a.leader })).toBeLessThanOrEqual(4); expect(finalChannelError, a.id + ' final native leader paint remains in saved PNG').toBeLessThanOrEqual(4);
      expect(channelError, a.id + ' saved leader paint ' + JSON.stringify({ witness, actual, projected, finalProjected, finalChannelError, screenshotGeometry, leader: a.leader, card: a.card, anchor: a.anchor })).toBeLessThanOrEqual(4); expect(witness.channelError, a.id + ' physical leader contains its expected ink').toBeLessThanOrEqual(8); expect(contrast, a.id + ' physical saved leader contrast against visible scene').toBeGreaterThanOrEqual(graphicThreshold); return { ...witness, ...actual, projected, finalProjected, contrast, overlapContrast, channelError, finalChannelError, finalInkError }; });
    return { id: a.id, ...a.leader, samples, surfaceWitness, minContrast: Math.min(...samples.map(w => w.contrast!)), minOverlapContrast: Math.min(...samples.map(w => w.overlapContrast)) };
  });
  const survivingStroke = (paint: StrokePaint, id: string, threshold?: number) => {
    expect(paint.finalWitnesses!.length, id + ' has native ink after every annotation').toBeGreaterThanOrEqual(paint.segments.length === 4 ? 6 : 2);
    const samples = paint.finalWitnesses!.map(witness => {
      const actual = at(witness), projected = projection(actual.pixelX, actual.pixelY, witness.paintNeighbors), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - projected.rgba[i])));
      expect(witness.channelError, id + ' survives native final paint ' + JSON.stringify({ witness, paint })).toBeLessThanOrEqual(4); expect(channelError, id + ' survives in saved PNG').toBeLessThanOrEqual(4);
      const surfaceWitness = sceneSurface(paint), contrast = contrastRatio(actual.rgb, surfaceWitness.rgb);
      if (threshold !== undefined) expect(contrast, id + ' actual saved ink contrast against visible scene').toBeGreaterThanOrEqual(threshold);
      return { ...witness, ...actual, projected, channelError, contrast, surfaceWitness };
    });
    return { id, ...paint, samples, minContrast: Math.min(...samples.map(s => s.contrast)) };
  };
  const outlines = layoutProof.annotated.filter(a => a.outline).map(a => survivingStroke(a.outline!, a.id + '-outline'));
  const crosshair = survivingStroke(layoutProof.crosshair, 'selected-crosshair', graphicThreshold);
  const sky = [{ x: 16, y: 10 }, { x: draw.width - 16, y: 10 }, { x: 16, y: draw.height - 5 }, { x: draw.width - 16, y: draw.height - 5 }].map(p => { const sample = at(p); expect(sample.rgb.every((v, i) => v <= [30, 50, 75][i]), 'saved canvas is painted inside its rounded parent').toBe(true); return { ...p, ...sample }; });
  const expectedMarker = theme === 'contrast' ? [255, 255, 0] : [103, 232, 249], sx = draw.width / draw.layout.width, sy = draw.height / draw.layout.height;
  const marker = Array.from({ length: 16 }, (_, i) => i * Math.PI / 8).map(angle => ({ x: layoutProof.projected.x + Math.cos(angle) * 10 * sx, y: layoutProof.projected.y + Math.sin(angle) * 10 * sy }))
    .filter(p => p.x >= draw.view.x * sx + .25 && p.x <= draw.width - 20 * sx - .25 && p.y >= draw.layout.plotTop * sy + .25 && p.y <= draw.view.groundY * sy - .25)
    .map(predicted => {
      const candidates = [], initial = at(predicted), cx = initial.pixelX, cy = initial.pixelY;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const pixelX = cx + dx, pixelY = cy + dy, rgb = pixels.at(pixelX, pixelY); candidates.push({ x: clip.x + (pixelX + .5) / dpr - rasterOrigin.left, y: clip.y + (pixelY + .5) / dpr - rasterOrigin.top, pixelX, pixelY, rgb, channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expectedMarker[i]))) }); }
      candidates.sort((a, b) => a.channelError - b.channelError || Math.hypot(a.x - predicted.x, a.y - predicted.y) - Math.hypot(b.x - predicted.x, b.y - predicted.y));
      const witness = candidates[0], contrast = contrastRatio(witness.rgb, sky[0].rgb); expect(witness.channelError, 'saved original selected marker ink').toBeLessThanOrEqual(4); expect(contrast).toBeGreaterThanOrEqual(graphicThreshold); return { predicted, ...witness, expected: expectedMarker, contrast };
    });
  expect(marker.length, 'selected original ring retains multiple independent witnesses').toBeGreaterThanOrEqual(2);
  const all = [...glyphs.flatMap(g => g.samples), ...cardPanels.flatMap(c => c.samples), ...leaders.flatMap(l => [...l.samples, l.surfaceWitness]), ...outlines.flatMap(o => o.samples), ...crosshair.samples, ...sky, ...marker];
  const liveInputs = await page.evaluate(async ({ points, geometry }: any) => {
    const w = window as any; await w.__calloutSettle(); const cv = document.getElementById('physicsCanvas') as HTMLCanvasElement, b = cv.getBoundingClientRect(), ctx = cv.getContext('2d')!;
    if (b.left !== geometry.canvasRect.left || b.top !== geometry.canvasRect.top || b.width !== geometry.canvasRect.width || b.height !== geometry.canvasRect.height || cv.width !== geometry.backingWidth || cv.height !== geometry.backingHeight) throw Error('Canvas bounds changed during screenshot');
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    return points.map((p: any) => {
    const rawX = ((geometry.clip.x + (p.pixelX + .5) / geometry.dpr - geometry.rasterOrigin.left) * cv.width / b.width) - .5, rawY = ((geometry.clip.y + (p.pixelY + .5) / geometry.dpr - geometry.rasterOrigin.top) * cv.height / b.height) - .5;
      const pixels = []; for (const dy of [0, 1]) for (const dx of [0, 1]) { const pixelX = Math.floor(rawX) + dx, pixelY = Math.floor(rawY) + dy; pixels.push({ pixelX, pixelY, rgba: [...data.slice((pixelY * cv.width + pixelX) * 4, (pixelY * cv.width + pixelX) * 4 + 4)] }); } return pixels;
    });
  }, { points: all, geometry: { ...screenshotGeometry, rasterOrigin } });
  const live = liveInputs.map((inputs: Witness['paintNeighbors'], i: number) => { const projected = projection(all[i].pixelX, all[i].pixelY, inputs); const channelError = Math.max(...projected.rgba.slice(0, 3).map((v, c) => Math.abs(v - all[i].rgb[c]))); if (inputs.some(p => p.rgba[3] !== 255) || channelError > 4) throw Error('Saved PNG must retain every actual opaque composited canvas witness: ' + JSON.stringify({ input: all[i], projected, channelError })); return { pixelX: all[i].pixelX, pixelY: all[i].pixelY, ...projected }; });
  expect(await evidence(page), 'native snapshot preserves the full original ball, trails, records and log').toEqual(before);
  expect([sha(source), sha(mirror), sha(spec)]).toEqual(initialHashes); expect(errors).toEqual([]);
  return { filename, screenshot, screenshotSha256: sha(screenshot), screenshotGeometry, captureMetrics, rasterTransform, theme, pixelWidth: pixels.width, pixelHeight: pixels.height, sourceSha256: initialHashes[0], originalTrail: trail, originalIndex: index, originalPoint: trail.points[index], draw,
    ...layoutProof, glyphs, cardPanels, leaders, outlines, crosshair, sky, marker, liveCanvasPixels: live, savedPaintVerified: true, originalEvidenceUnchanged: true,
    minFont: Math.min(...glyphs.map(t => t.fontSize)), minTextContrast: Math.min(...glyphs.map(t => t.minContrast)), minLeaderContrast: Math.min(...leaders.map(l => l.minContrast)), minMarkerContrast: Math.min(...marker.map(m => m.contrast)), minCrosshairContrast: crosshair.minContrast };
}
async function select(page: Page, id: string, moment: string) { await page.locator('[data-physics-plot-flight="' + id + '"]').click(); await page.locator('[data-physics-plot-moment="' + moment + '"]').click(); await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0'); }

test('original launch, apex and impact callouts retain painted text and clearance in nine layouts', async ({ page }) => {
  test.setTimeout(300_000); await mount(page); await launch(page); const before = await evidence(page), trail = before.trails[0];
  const moments = [{ id: 'launch', index: 0 }, { id: 'apex', index: apexIndex(trail) }, { id: 'impact', index: trail.points.length - 1 }];
  for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
    await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__calloutTheme(t), theme); await page.waitForTimeout(50);
    const captures = [];
    for (const moment of moments) { await select(page, '1', moment.id); captures.push(await capture(page, trail, moment.index, theme, 'callout-' + theme + '-' + width + '-' + moment.id + '.png')); expect(await evidence(page)).toEqual(before); }
    if (width === 320 && theme === 'dark') {
      const impact = captures.find(proof => proof.originalIndex === trail.points.length - 1)!;
      expect(impact.selectedCardVisible, 'dark320 impact retains its actually painted original readout').toBe(true);
      expect(impact.selectedTextComplete, 'dark320 impact retains the entire original phase, height and time').toBe(true);
      expect(impact.selectedText.join(' ')).toBe(impact.expectedText);
    }
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
  const initialEdgeCount = edgeCases.length;
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
  const cluster = '\u0915' + '\u094d\u0915'.repeat(60);
  const clusterMetrics = await page.evaluate(label => {
    const cv = document.getElementById('physicsCanvas') as any, ctx = cv.getContext('2d'), dpr = cv.width / cv._visualLayout.width;
    ctx.save(); ctx.font = '600 ' + (12 * dpr) + 'px sans-serif'; const measuredWidth = ctx.measureText(label).width / dpr; ctx.restore();
    const graphemes = [...new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' }).segment(label)].length;
    cv._L.runPrefix = label; cv._physScheduleFrame();
    return { codepoints: Array.from(label).length, graphemes, measuredWidth, availableTextWidth: Math.min(240, cv._visualLayout.labelBounds.right - cv._visualLayout.labelBounds.left) - 18 };
  }, cluster);
  expect(clusterMetrics.codepoints).toBe(121); expect(clusterMetrics.graphemes).toBe(1); expect(clusterMetrics.measuredWidth).toBeGreaterThan(clusterMetrics.availableTextWidth);
  const omittedDraw = await redraw(page), omittedGeometry = geometry(omittedDraw, trail, apexIndex(trail));
  expect(omittedGeometry.annotated.filter(a => a.id.startsWith('run-')), 'an indivisible oversized grapheme produces no invalid route panel').toHaveLength(0);
  expect(omittedGeometry.annotated.flatMap(a => a.text).some(t => t.text.includes(cluster))).toBe(false);
  await expect(page.locator('[data-physics-sample-slider]')).toHaveValue(String(apexIndex(trail)));
  await expect(page.locator('[data-physics-sample-status]')).toContainText('At apex');
  const omissionProof = { cluster, clusterMetrics, draw: omittedDraw, ...omittedGeometry, selectedMeasurementRetained: true, originalEvidenceUnchanged: true, noInvalidRoutePanel: true };
  edgeCases.push({ id: 'dense-long-token', ...long, omissionProof }); expect(await evidence(page)).toEqual(before);
  expect(edgeCases.length - initialEdgeCount, 'dense fixtures retain both original captures').toBe(2); expect(errors).toEqual([]);
});
