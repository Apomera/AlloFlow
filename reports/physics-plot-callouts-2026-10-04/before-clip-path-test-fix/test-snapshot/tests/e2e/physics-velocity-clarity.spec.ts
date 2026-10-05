import { test, expect, Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-velocity-clarity-2026-10-02');
const colors = { v: '#93c5fd', vx: '#6ee7b7', vy: '#c4b5fd', gravity: '#fda4af' };
type Point = { x: number; y: number };
type Card = { x: number; y: number; width: number; height: number; color: string; alpha: number; paintOrder: number };
type PaintedArc = { x: number; y: number; radius: number; start: number; end: number; color: string; width: number; alpha: number };
type Stroke = { color: string; dash: number[]; width: number; segments: Array<{ from: Point; to: Point }> };
type DrawnText = {
  text: string; fontSize: number; contrast: number; x: number; y: number; paintOrder: number;
  left: number; right: number; top: number; bottom: number;
};

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
    w.__tickVelocity = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
    w.__captureVelocity = false; w.__velocityText = []; w.__velocityStrokes = []; w.__velocityCards = []; w.__velocityArcs = []; w.__velocityPaintOrder = 0;
    const paths = new WeakMap<CanvasRenderingContext2D, Array<{ op: string; x: number; y: number }>>();
    const roundedPaths = new WeakMap<CanvasRenderingContext2D, { x: number; y: number; width: number; height: number }>();
    const arcPaths = new WeakMap<CanvasRenderingContext2D, Array<{ x: number; y: number; radius: number; start: number; end: number }>>();
    const proto = CanvasRenderingContext2D.prototype;
    const beginPath = proto.beginPath, moveTo = proto.moveTo, lineTo = proto.lineTo, stroke = proto.stroke, fillText = proto.fillText;
    const roundRect = proto.roundRect, fill = proto.fill, arc = proto.arc;
    const point = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      const t = ctx.getTransform(), bounds = ctx.canvas.getBoundingClientRect();
      return { x: (t.a * x + t.c * y + t.e) / (ctx.canvas.width / bounds.width),
        y: (t.b * x + t.d * y + t.f) / (ctx.canvas.height / bounds.height) };
    };
    proto.beginPath = function () { paths.set(this, []); roundedPaths.delete(this); arcPaths.set(this, []); beginPath.call(this); };
    proto.arc = function (x, y, radius, start, end, counterclockwise?) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureVelocity) {
        const center = point(this, x, y), edge = point(this, x + radius, y), circles = arcPaths.get(this) || [];
        circles.push({ ...center, radius: Math.hypot(edge.x - center.x, edge.y - center.y), start, end });
        arcPaths.set(this, circles);
      }
      arc.call(this, x, y, radius, start, end, counterclockwise);
    };
    // Annotation panels are actual filled roundRect paths, measured independently of layout metadata.
    proto.roundRect = function (x, y, width, height, radii?) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureVelocity) {
        const corners = [point(this, x, y), point(this, x + width, y), point(this, x, y + height), point(this, x + width, y + height)];
        const left = Math.min(...corners.map(item => item.x)), top = Math.min(...corners.map(item => item.y));
        roundedPaths.set(this, { x: left, y: top, width: Math.max(...corners.map(item => item.x)) - left,
          height: Math.max(...corners.map(item => item.y)) - top });
      }
      roundRect.call(this, x, y, width, height, radii);
    };
    proto.fill = function (pathOrRule?: Path2D | CanvasFillRule, rule?: CanvasFillRule) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureVelocity && typeof pathOrRule !== 'object') {
        const rect = roundedPaths.get(this);
        if (rect) w.__velocityCards.push({ ...rect, color: String(this.fillStyle).toLowerCase(), alpha: this.globalAlpha,
          paintOrder: ++w.__velocityPaintOrder });
      }
      if (typeof pathOrRule === 'object') fill.call(this, pathOrRule, rule);
      else fill.call(this, pathOrRule);
    };
    proto.moveTo = function (x, y) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureVelocity) {
        const commands = paths.get(this) || []; commands.push({ op: 'M', ...point(this, x, y) }); paths.set(this, commands);
      }
      moveTo.call(this, x, y);
    };
    proto.lineTo = function (x, y) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureVelocity) {
        const commands = paths.get(this) || []; commands.push({ op: 'L', ...point(this, x, y) }); paths.set(this, commands);
      }
      lineTo.call(this, x, y);
    };
    proto.stroke = function (givenPath?: Path2D) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureVelocity && !givenPath) {
        const arcRatio = this.canvas.width / this.canvas.getBoundingClientRect().width;
        for (const circle of arcPaths.get(this) || []) w.__velocityArcs.push({ ...circle,
          color: String(this.strokeStyle).toLowerCase(), width: this.lineWidth / arcRatio, alpha: this.globalAlpha });
        let current: Point | null = null;
        const segments: Array<{ from: Point; to: Point }> = [];
        for (const command of paths.get(this) || []) {
          const to = { x: command.x, y: command.y };
          if (command.op === 'L' && current) segments.push({ from: current, to });
          current = to;
        }
        if (segments.length) {
          const ratio = this.canvas.width / this.canvas.getBoundingClientRect().width;
          w.__velocityStrokes.push({ color: String(this.strokeStyle).toLowerCase(),
            dash: this.getLineDash().map(value => value / ratio), width: this.lineWidth / ratio, segments });
        }
      }
      if (givenPath) stroke.call(this, givenPath); else stroke.call(this);
    };
    // Measure actual rendered glyphs and transformations, not simulated layout metadata.
    proto.fillText = function (text, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureVelocity) {
        const metrics = this.measureText(String(text)), transform = this.getTransform();
        const bounds = this.canvas.getBoundingClientRect(), ratioX = this.canvas.width / bounds.width, ratioY = this.canvas.height / bounds.height;
        const squeeze = maxWidth !== undefined && maxWidth > 0 && metrics.width > maxWidth ? maxWidth / metrics.width : 1;
        const left = x - metrics.actualBoundingBoxLeft * squeeze, right = x + metrics.actualBoundingBoxRight * squeeze;
        const top = y - metrics.actualBoundingBoxAscent, bottom = y + metrics.actualBoundingBoxDescent;
        const corners = [[left, top], [right, top], [left, bottom], [right, bottom]].map(([px, py]) => ({
          x: (transform.a * px + transform.c * py + transform.e) / ratioX,
          y: (transform.b * px + transform.d * py + transform.f) / ratioY,
        }));
        const font = this.font.match(/([\d.]+)px/);
        const sampleX = Math.max(0, Math.min(this.canvas.width - 1, Math.round(transform.a * (left + right) / 2 + transform.c * (top + bottom) / 2 + transform.e)));
        const sampleY = Math.max(0, Math.min(this.canvas.height - 1, Math.round(transform.b * (left + right) / 2 + transform.d * (top + bottom) / 2 + transform.f)));
        const background = [...this.getImageData(sampleX, sampleY, 1, 1).data].slice(0, 3);
        const paint = String(this.fillStyle);
        const hex = paint.match(/^#([\da-f]{6})$/i), css = paint.match(/^rgba?\(([^)]+)\)$/);
        const ink = hex ? [0, 2, 4].map(offset => parseInt(hex[1].slice(offset, offset + 2), 16))
          : css ? css[1].split(',').map(Number) : null;
        if (!ink) throw Error('Unresolved painted text color: ' + paint);
        const alpha = this.globalAlpha * (ink[3] ?? 1);
        const foreground = ink.slice(0, 3).map((value, index) => value * alpha + background[index] * (1 - alpha));
        const luminance = (channels: number[]) => channels.map(value => {
          const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const surfaceLum = luminance(background), inkLum = luminance(foreground);
        const contrast = (Math.max(inkLum, surfaceLum) + .05) / (Math.min(inkLum, surfaceLum) + .05);
        w.__velocityText.push({ text: String(text), contrast, paintOrder: ++w.__velocityPaintOrder,
          fontSize: font ? Number(font[1]) * Math.hypot(transform.c, transform.d) / ratioY : 0,
          ...point(this, x, y),
          left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
          top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)),
        });
      }
      if (maxWidth === undefined) fillText.call(this, text, x, y); else fillText.call(this, text, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__setVelocityTheme = (theme: string) => {
      const ctx = w.__ctx; ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__velocityCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__velocityCsv.push(text); return Promise.resolve(); };
  });
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), patch);
  await page.waitForTimeout(40);
}

async function readDraw(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__velocityText = []; w.__velocityStrokes = []; w.__velocityCards = []; w.__velocityArcs = []; w.__velocityPaintOrder = 0; w.__captureVelocity = true;
    try { cv._physScheduleFrame(); w.__tickVelocity(); } finally { w.__captureVelocity = false; }
    const bounds = cv.getBoundingClientRect();
    return { text: w.__velocityText as DrawnText[], strokes: w.__velocityStrokes as Stroke[], cards: w.__velocityCards as Card[],
      arcs: w.__velocityArcs as PaintedArc[], width: bounds.width, height: bounds.height, vectors: cv._visualVectors,
      selected: cv._inspection?.snapshot || null,
      selectedOriginal: cv._inspection ? { index: cv._inspection.index, count: cv._inspection.trail.length,
        run: cv._inspection.trail.run ?? null, point: { ...cv._inspection.trail[cv._inspection.index] },
        apex: cv._inspection.trail.apex || null } : null,
      visualInspection: cv._visualInspection, ball: cv._ball, launched: cv._launched,
      layout: cv._visualLayout, pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth };
  });
}

async function launch(page: Page, patch: object = {}) {
  await setState(page, { angle: 45, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
    simSpeed: 1, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true, ...patch });
  await page.locator('[data-physics-launch]').click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) (window as any).__tickVelocity();
    if (cv._launched) throw new Error('The velocity-clarity fixture did not land');
  });
  await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  await setState(page, { simSpeed: 0 });
  await page.locator('[data-physics-inspect]').click();
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return { ball: cv._ball, trails: cv._trails.map((trail: any) => ({ points: [...trail], parameters: trail.parameters,
      modelVersion: trail.modelVersion, run: trail.run, apex: trail.apex })), runLog: w.__toolData.physics.runLog,
      lastFlight: w.__toolData.physics.lastFlight, recordedFlights: w.__toolData.physics.recordedFlights };
  });
}

async function copyCsv(page: Page) {
  const active = await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab');
  await page.locator('[data-physics-analysis-tab="data"]').click();
  const before = await page.evaluate(() => (window as any).__velocityCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__velocityCsv.length)).toBe(before + 1);
  const csv = await page.evaluate(() => (window as any).__velocityCsv.at(-1) as string);
  await page.locator(`[data-physics-analysis-tab="${active}"]`).click();
  return csv;
}

function samePoint(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y) < 1e-7; }
function pointEqual(actual: Point, expected: Point) {
  expect(actual.x).toBeCloseTo(expected.x, 8); expect(actual.y).toBeCloseTo(expected.y, 8);
}
function header(draw: Awaited<ReturnType<typeof readDraw>>) { return draw.text.filter(item => item.y < 100).map(item => item.text).join('\n'); }

function expectReadable(draw: Awaited<ReturnType<typeof readDraw>>, label: string) {
  expect(draw.text.length, label + ' real canvas text').toBeGreaterThan(5);
  for (const item of draw.text) {
    expect(item.fontSize, label + ': ' + item.text).toBeGreaterThanOrEqual(11.99);
    expect(item.left, label + ': ' + item.text + ' left').toBeGreaterThanOrEqual(-1);
    expect(item.right, label + ': ' + item.text + ' right').toBeLessThanOrEqual(draw.width + 1);
    expect(item.top, label + ': ' + item.text + ' top').toBeGreaterThanOrEqual(-1);
    expect(item.bottom, label + ': ' + item.text + ' bottom').toBeLessThanOrEqual(draw.height + 1);
  }
  expect(draw.pageWidth, label + ' page overflow').toBeLessThanOrEqual(draw.viewportWidth + 1);
  const row = draw.text.filter(item => Math.abs(item.y - 47) < 1);
  const speed = row.find(item => item.text.startsWith('|v| ')), settings = row.find(item => item.text.startsWith('g '));
  if (speed && settings) expect(speed.left - settings.right, label + ' speed separated from gravity/mass').toBeGreaterThanOrEqual(4);
  expectAnnotationClearance(draw);
}

function expectedSelectedCard(draw: Awaited<ReturnType<typeof readDraw>>) {
  const original = draw.selectedOriginal;
  expect(original, 'selection exposes its original recorded point').toBeTruthy();
  const point = original!.point, apex = original!.apex;
  const canonicalApex = !!apex && point.mVy === 0 && point.t === apex.tSec
    && point.mX === apex.mX && point.mY === apex.mY && point.mVx === apex.vx;
  const impact = original!.index === original!.count - 1 && point.t > 0 && point.mY === 0 && point.mVy <= 0;
  const title = canonicalApex && point.t === 0 ? 'Highest point at release'
    : original!.index === 0 ? 'Launch point' : canonicalApex ? 'At apex' : impact ? 'Ground impact'
      : point.mVy > 0 ? 'Rising' : point.mVy < 0 ? 'Falling' : 'Vertical velocity is zero';
  const height = point.mY !== 0 && Math.abs(point.mY) < .01 ? point.mY.toPrecision(3) : point.mY.toFixed(2);
  expect(draw.selected).toMatchObject({ index: original!.index, count: original!.count, run: original!.run,
    t: point.t, x: point.mX, y: point.mY, vx: point.mVx, vy: point.mVy, apex: canonicalApex, impact });
  return { title, reading: 'y = ' + height + ' m · t = ' + point.t.toFixed(3) + ' s', canonicalApex, impact };
}

function selectedCardText(draw: Awaited<ReturnType<typeof readDraw>>) {
  const inspection = draw.layout.labels.find((label: any) => label.id === 'inspection');
  expect(inspection, 'selection retains a positioned annotation').toBeTruthy();
  const ratioX = draw.width / draw.layout.width, ratioY = draw.height / draw.layout.height;
  const cards = draw.cards.filter(card => Math.abs(card.x - inspection.x * ratioX) < 1e-7
    && Math.abs(card.y - inspection.y * ratioY) < 1e-7
    && Math.abs(card.width - inspection.width * ratioX) < 1e-7
    && Math.abs(card.height - inspection.height * ratioY) < 1e-7);
  expect(cards, 'selection has one actually filled panel').toHaveLength(1);
  const card = cards[0];
  // Earlier grid glyphs are hidden by this opaque fill and are not panel text.
  return draw.text.filter(item => item.paintOrder > card.paintOrder
    && item.left >= card.x - 1 && item.right <= card.x + card.width + 1
    && item.top >= card.y - 1 && item.bottom <= card.y + card.height + 1)
    .sort((a, b) => a.y - b.y || a.x - b.x).map(item => item.text);
}

function expectSelectedCard(draw: Awaited<ReturnType<typeof readDraw>>) {
  const expected = expectedSelectedCard(draw);
  expect(selectedCardText(draw), 'actual selected-panel paint reflects the original point').toEqual([expected.title, expected.reading]);
  expect(header(draw), 'HUD retains recorded identity alongside the phase card').toContain('Recorded point');
  const original = draw.selectedOriginal!;
  if (original.index === 0) expect(draw.layout.labels.some((label: any) => label.id === 'height'), 'release card replaces separate height card').toBe(false);
  if (expected.canonicalApex) expect(draw.layout.labels.some((label: any) => label.id === 'apex'), 'canonical apex card replaces separate apex card').toBe(false);
  if (expected.impact) expect(draw.layout.labels.some((label: any) => label.id === 'landing'), 'impact card replaces separate landing card').toBe(false);
  const radius = original.index === 0 ? 7 : expected.canonicalApex || expected.impact ? 5 : null;
  if (radius !== null) {
    const ratioX = draw.width / draw.layout.width, ratioY = draw.height / draw.layout.height;
    const center = { x: draw.visualInspection.x * ratioX, y: draw.visualInspection.y * ratioY };
    const markerColors = radius === 7 ? ['#67e8f9', '#ffff00'] : ['#fde68a'];
    const marker = draw.arcs.find(circle => Math.abs(circle.radius - radius * ratioX) < 1e-7
      && Math.abs(Math.abs(circle.end - circle.start) - Math.PI * 2) < 1e-7
      && samePoint(circle, center) && circle.alpha === 1 && markerColors.includes(circle.color));
    expect(marker, 'selected landmark retains its actual stroked ring').toBeTruthy();
  }
  return { selectedCardTitle: expected.title, selectedCardReading: expected.reading, selectedCardPaintMatchesOriginal: true };
}

async function selectedSnapshot(page: Page, filename: string) {
  mkdirSync(reports, { recursive: true });
  await page.locator('.phys-scene').screenshot({ path: path.join(reports, filename), animations: 'disabled' });
}

function segmentIntersectsCard(from: Point, to: Point, card: Card, padding: number) {
  let lower = 0, upper = 1;
  for (const [origin, delta, minimum, maximum] of [
    [from.x, to.x - from.x, card.x - padding, card.x + card.width + padding],
    [from.y, to.y - from.y, card.y - padding, card.y + card.height + padding],
  ]) {
    if (Math.abs(delta) < 1e-12) { if (origin < minimum || origin > maximum) return false; continue; }
    const entry = (minimum - origin) / delta, exit = (maximum - origin) / delta;
    lower = Math.max(lower, Math.min(entry, exit)); upper = Math.min(upper, Math.max(entry, exit));
    if (lower > upper) return false;
  }
  return true;
}

function expectAnnotationClearance(draw: Awaited<ReturnType<typeof readDraw>>) {
  if (draw.selected) expect(draw.cards.length, 'actual painted annotation panels exist for the selection').toBeGreaterThan(0);
  expect(draw.cards, 'filled panels agree with retained annotation metadata').toHaveLength(draw.layout.labels.length);
  const ratioX = draw.width / draw.layout.width, ratioY = draw.height / draw.layout.height;
  for (const label of draw.layout.labels) {
    const cards = draw.cards.filter(card => Math.abs(card.x - label.x * ratioX) < 1e-7 && Math.abs(card.y - label.y * ratioY) < 1e-7
      && Math.abs(card.width - label.width * ratioX) < 1e-7 && Math.abs(card.height - label.height * ratioY) < 1e-7);
    expect(cards, label.id + ' has one actual painted panel').toHaveLength(1);
  }
  const bundle = draw.strokes.filter(stroke => Object.values(colors).includes(stroke.color));
  for (const card of draw.cards) {
    expect(card.alpha, 'annotation panel remains opaque').toBe(1);
    for (const stroke of bundle) for (const segment of stroke.segments) {
      expect(segmentIntersectsCard(segment.from, segment.to, card, stroke.width / 2),
        'painted annotation covers a velocity or gravity shaft/head: ' + JSON.stringify({ card, color: stroke.color, segment })).toBe(false);
    }
  }
  const inspection = draw.layout.labels.find((label: any) => label.id === 'inspection');
  if (draw.selected) {
    expect(inspection, 'selected recorded point keeps its annotation').toBeTruthy();
    expect(draw.visualInspection, 'selected point remains plotted').toBeTruthy();
    expect(draw.visualInspection).toMatchObject({ index: draw.selected.index, run: draw.selected.run, t: draw.selected.t });
    pointEqual(inspection.anchor, draw.visualInspection);
    expectSelectedCard(draw);
  }
  return { cardCount: draw.cards.length, inspectionCardVisible: !!inspection, annotationVectorClearance: true,
    ...(draw.selected ? expectSelectedCard(draw) : {}) };
}

function expectVelocityArrows(draw: Awaited<ReturnType<typeof readDraw>>, reading: any) {
  const v = draw.vectors;
  expect(v).not.toBeNull(); expect(v.scale).toBeGreaterThan(0);
  const origin = { x: v.x, y: v.y };
  const resultant = { x: origin.x + reading.vx * v.scale, y: origin.y - reading.vy * v.scale };
  pointEqual({ x: v.endX, y: v.endY }, resultant);
  expect(v.vxX).toBeCloseTo(resultant.x, 8); expect(v.vyY).toBeCloseTo(resultant.y, 8);
  const total = draw.strokes.find(stroke => stroke.color === colors.v && stroke.dash.length === 0
    && stroke.segments.some(segment => samePoint(segment.from, origin) && samePoint(segment.to, resultant)));
  expect(total, 'actual resultant stroke').toBeTruthy();
  for (const [key, value, tip] of [
    ['vx', reading.vx, { x: resultant.x, y: origin.y }],
    ['vy', reading.vy, { x: origin.x, y: resultant.y }],
  ] as const) {
    const strokes = draw.strokes.filter(stroke => stroke.color === colors[key]);
    if (value === 0) { expect(strokes, key + ' zero component has no painted arrow').toHaveLength(0); continue; }
    const shaft = strokes.find(stroke => stroke.dash.length === 2 && stroke.segments.some(segment => samePoint(segment.from, origin) && samePoint(segment.to, tip)));
    expect(shaft, key + ' actual dashed shaft').toBeTruthy(); expect(shaft!.dash[0]).toBeCloseTo(4, 8); expect(shaft!.dash[1]).toBeCloseTo(3, 8);
    const body = shaft!.segments.find(segment => samePoint(segment.from, origin) && samePoint(segment.to, tip))!;
    pointEqual(body.from, origin); pointEqual(body.to, tip);
    const length = Math.hypot(tip.x - origin.x, tip.y - origin.y);
    expect(length).toBeCloseTo(Math.abs(value) * v.scale, 8);
    const heads = strokes.filter(stroke => stroke.dash.length === 0).flatMap(stroke => stroke.segments)
      .filter(segment => samePoint(segment.from, tip) && !samePoint(segment.to, origin));
    expect(heads, key + ' actual solid arrowheads').toHaveLength(2);
    const wingSides: number[] = [];
    for (const head of heads) {
      const dx = head.to.x - tip.x, dy = head.to.y - tip.y;
      expect(dx * (tip.x - origin.x) + dy * (tip.y - origin.y), key + ' heads point with signed component').toBeLessThan(0);
      expect(Math.hypot(dx, dy), key + ' tiny heads stay proportional').toBeLessThanOrEqual(length / 3 + 1e-7);
      wingSides.push(dx * (tip.y - origin.y) - dy * (tip.x - origin.x));
    }
    expect(wingSides[0] * wingSides[1], key + ' heads straddle the shaft').toBeLessThan(0);
  }
  const gravity = draw.strokes.find(stroke => stroke.color === colors.gravity && stroke.dash.length === 2
    && stroke.segments.some(segment => samePoint(segment.from, origin)));
  expect(gravity, 'actual separate gravity stroke').toBeTruthy(); expect(gravity!.dash).toEqual([2, 3]);
  const downward = gravity!.segments.find(segment => samePoint(segment.from, origin))!;
  expect(downward.to.x).toBeCloseTo(origin.x, 8); expect(downward.to.y).toBeGreaterThan(origin.y);
  for (const stroke of draw.strokes.filter(item => Object.values(colors).includes(item.color))) {
    for (const segment of stroke.segments) for (const point of [segment.from, segment.to]) {
      expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(draw.width);
      expect(point.y).toBeGreaterThanOrEqual(draw.layout.plotTop); expect(point.y).toBeLessThanOrEqual(draw.layout.groundY);
    }
  }
}

async function assertLegend(page: Page) {
  const group = page.locator('[data-physics-velocity-key-group]'); await expect(group).toBeVisible();
  await expect(group.locator('[data-physics-velocity-key]')).toHaveCount(4);
  for (const [key, label, pattern] of [
    ['v', 'Velocity v · m/s', null], ['vx', 'Horizontal vx · m/s', '4 3'],
    ['vy', 'Vertical vy · m/s', '4 3'], ['gravity', 'Gravity g · m/s²', '2 3'],
  ] as const) {
    const entry = group.locator(`[data-physics-velocity-key="${key}"]`); await expect(entry).toHaveText(label);
    await expect(entry.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(entry.locator('svg path')).toHaveCount(2);
    expect(await entry.locator('svg path').first().getAttribute('stroke-dasharray')).toBe(pattern);
    expect(await entry.locator('svg path').last().getAttribute('stroke-dasharray')).toBeNull();
  }
  await expect(group.locator('[data-physics-speed-help]')).toHaveText('v₀ is launch speed. Speed |v| = √(vx² + vy²). At the apex vy = 0, so speed = |vx|.');
  await expect(group.locator('[data-physics-velocity-scale-help]')).toContainText('Velocity arrows share a scale at each point');
  await expect(group.locator('[data-physics-velocity-scale-help]')).toContainText('Gravity uses a separate scale');
}

test('selected launch, rising, apex, near-apex, falling, and impact cards match original points and preserve velocity direction', async ({ page }) => {
  await mount(page); await launch(page);
  const before = await evidence(page); await assertLegend(page);
  await page.locator('[data-physics-sample-jump="launch"]').click();
  let draw = await readDraw(page); expect(draw.selected.phase).toBe('rising'); expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'launch');
  await selectedSnapshot(page, 'selected-launch.png');
  const gravityShaft = draw.strokes.find(stroke => stroke.color === colors.gravity && stroke.dash.length)!;
  const gravityLength = gravityShaft.segments[0].to.y - gravityShaft.segments[0].from.y;
  expect(gravityLength / draw.selected.parameters.gravity).not.toBeCloseTo(draw.vectors.scale, 5);
  await page.locator('[data-physics-sample-next]').click();
  draw = await readDraw(page); expect(draw.selected.index).toBeGreaterThan(0); expect(draw.selected.vy).toBeGreaterThan(0);
  expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'original rising point');
  await selectedSnapshot(page, 'selected-rising.png');
  await page.locator('[data-physics-sample-jump="highest"]').click();
  draw = await readDraw(page); expect(draw.selected).toMatchObject({ phase: 'apex', vy: 0 });
  expect(draw.selected.speed).toBeCloseTo(Math.abs(draw.selected.vx), 10); expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'apex');
  expect(header(draw)).toContain('|v| ' + Math.abs(draw.selected.vx).toFixed(2) + ' m/s');
  await selectedSnapshot(page, 'selected-apex.png');
  await page.locator('[data-physics-sample-next]').click();
  draw = await readDraw(page); expect(draw.selected.vy).toBeLessThan(0); expect(Math.abs(draw.selected.vy)).toBeLessThan(.05);
  expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'tiny near apex');
  expect(selectedCardText(draw)[0]).toBe('Falling'); await selectedSnapshot(page, 'selected-near-apex.png');
  for (let index = 0; index < 12; index++) await page.locator('[data-physics-sample-next]').click();
  draw = await readDraw(page); expect(draw.selected.phase).toBe('falling'); expect(draw.selected.vy).toBeLessThan(-1);
  expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'falling');
  await selectedSnapshot(page, 'selected-falling.png');
  await page.locator('[data-physics-sample-jump="latest"]').click();
  draw = await readDraw(page); expect(draw.selected.impact).toBe(true); expect(draw.vectors).toBeNull(); expectReadable(draw, 'impact');
  expect(draw.strokes.filter(stroke => Object.values(colors).includes(stroke.color))).toHaveLength(0);
  await selectedSnapshot(page, 'selected-impact.png');
  expect(await evidence(page)).toEqual(before);
});

test('actual speed stays tied to the selected record after controls change and uses current live components after a new launch', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page); await launch(page);
  await page.locator('[data-physics-sample-jump="highest"]').click(); await page.locator('[data-physics-sample-next]').click();
  const originalDraw = await readDraw(page), sample = originalDraw.selected, originalCard = selectedCardText(originalDraw),
    before = await evidence(page), csv = await copyCsv(page);
  expectSelectedCard(originalDraw);
  const expectedSpeed = Math.hypot(sample.vx, sample.vy).toFixed(2);
  await setState(page, { angle: 80, velocity: 50, gravity: 25, mass: 9, launchHeight: 50, airResist: true });
  for (const showVectors of [true, false, true]) {
    await setState(page, { showVectors }); const draw = await readDraw(page);
    expect(draw.selected).toEqual(sample); expect(selectedCardText(draw)).toEqual(originalCard); expect(header(draw)).toContain('v₀ 15 m/s');
    expect(header(draw)).toContain('|v| ' + expectedSpeed + ' m/s'); expect(header(draw)).toContain('g 9.8 m/s²  ·  2 kg');
    if (showVectors) { expectVelocityArrows(draw, sample); await assertLegend(page); }
    else { expect(draw.vectors).toBeNull(); await expect(page.locator('[data-physics-velocity-key-group]')).toHaveCount(0); }
    expectReadable(draw, 'retained selected speed'); expect(await evidence(page)).toEqual(before);
  }
  expect(await copyCsv(page)).toBe(csv); await selectedSnapshot(page, 'selected-after-six-control-changes.png');
  await page.locator('[data-physics-sample-close]').click();
  let draw = await readDraw(page); expect(draw.selected).toBeNull(); expect(header(draw)).toContain('v₀ 50 m/s');
  expect(header(draw)).not.toContain('|v| '); expectReadable(draw, 'next launch has no stale instantaneous speed');
  await setState(page, { simSpeed: 1 }); await page.locator('[data-physics-launch]').click();
  await page.evaluate(() => { for (let index = 0; index < 35; index++) (window as any).__tickVelocity(); });
  await setState(page, { simSpeed: 0 }); draw = await readDraw(page);
  expect(draw.launched).toBe(true); expect(draw.selected).toBeNull();
  const liveSpeed = Math.hypot(draw.ball.mVx, draw.ball.mVy);
  expect(liveSpeed).toBeLessThan(50); expect(header(draw)).toContain('|v| ' + liveSpeed.toFixed(1) + ' m/s');
  expect(header(draw)).toContain('v₀ 50 m/s'); expectReadable(draw, 'live instantaneous speed');
});

test('live near-apex vertical velocity retains its small negative value and painted downward component', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  await setState(page, { angle: 45, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
    simSpeed: 1, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true });
  await page.locator('[data-physics-launch]').click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && cv._ball.mVy >= 0 && ticks++ < 1000) (window as any).__tickVelocity();
    if (!cv._launched || cv._ball.mVy >= 0) throw new Error('The live near-apex fixture was not reached');
  });
  await setState(page, { simSpeed: 0 });
  const before = await evidence(page), draw = await readDraw(page);
  expect(draw.selected).toBeNull(); expect(draw.launched).toBe(true);
  expect(draw.ball.mVy).toBeLessThan(0); expect(Math.abs(draw.ball.mVy)).toBeLessThan(.05);
  const expectedVy = Math.abs(draw.ball.mVy) < .01 ? draw.ball.mVy.toPrecision(3) : draw.ball.mVy.toFixed(2);
  expect(header(draw)).toContain('Vy ' + expectedVy + ' m/s'); expect(header(draw)).not.toContain('Vy -0.0 m/s');
  expect(header(draw)).toContain('|v| ' + Math.hypot(draw.ball.mVx, draw.ball.mVy).toFixed(1) + ' m/s');
  expectVelocityArrows(draw, { vx: draw.ball.mVx, vy: draw.ball.mVy }); expectReadable(draw, 'small live vertical velocity');
  expect(await evidence(page)).toEqual(before);
});
test('horizontal release card distinguishes an unresolved launch point from the canonical highest point at release', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  await setState(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
    simSpeed: 0, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true });
  await page.locator('[data-physics-launch]').click(); await readDraw(page);
  await page.locator('[data-physics-inspect]').click();
  let draw = await readDraw(page), before = await evidence(page);
  expect(draw.selected).toMatchObject({ index: 0, t: 0, vy: 0, apex: false, impact: false });
  expect(draw.selectedOriginal.apex).toBeNull(); expectReadable(draw, 'unresolved horizontal release');
  expect(selectedCardText(draw)[0]).toBe('Launch point'); expectVelocityArrows(draw, draw.selected);
  await selectedSnapshot(page, 'horizontal-release-unresolved.png');
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-step]').click(); await readDraw(page);
  await page.locator('[data-physics-inspect]').click(); await page.locator('[data-physics-sample-jump="highest"]').click();
  draw = await readDraw(page); before = await evidence(page);
  expect(draw.selected).toMatchObject({ index: 0, t: 0, vy: 0, apex: true, impact: false });
  expectReadable(draw, 'canonical horizontal release');
  expect(selectedCardText(draw)).toEqual(['Highest point at release', 'y = 10.00 m · t = 0.000 s']);
  expectVelocityArrows(draw, draw.selected); await selectedSnapshot(page, 'horizontal-release-canonical-apex.png');
  expect(await evidence(page)).toEqual(before);
});

test('the highest recorded sample in unfinished ascent remains Rising with its original height and time', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  await setState(page, { angle: 45, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
    simSpeed: 1, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true });
  await page.locator('[data-physics-launch]').click();
  await page.evaluate(() => { for (let index = 0; index < 10; index++) (window as any).__tickVelocity(); });
  await setState(page, { simSpeed: 0 }); await page.locator('[data-physics-inspect]').click();
  await expect(page.locator('[data-physics-sample-jump="highest"]')).toContainText('Highest recorded point');
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const before = await evidence(page), draw = await readDraw(page), csv = await copyCsv(page);
  const points = before.trails[0].points;
  const highest = points.reduce((best: number, point: any, index: number) => point.mY > points[best].mY ? index : best, 0);
  expect(draw.launched).toBe(true); expect(draw.selectedOriginal.apex).toBeNull();
  expect(draw.selected).toMatchObject({ index: highest, apex: false, impact: false, phase: 'rising' });
  expect(draw.selected.index).toBeGreaterThan(0); expect(draw.selected.vy).toBeGreaterThan(0);
  expectReadable(draw, 'unfinished highest recorded sample'); expectVelocityArrows(draw, draw.selected);
  expect(selectedCardText(draw)[0]).toBe('Rising');
  expect(draw.layout.labels.some((label: any) => label.id === 'apex' || label.id === 'landing')).toBe(false);
  await selectedSnapshot(page, 'unfinished-highest-rising.png');
  expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(before);
});

test('velocity symbols and actual speed remain readable at 1100, 375, and 320 pixels in every theme', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  mkdirSync(reports, { recursive: true });
  const sourcePath = path.resolve('stem_lab/stem_tool_physics.js');
  const mirrorPath = path.resolve('desktop/web-app/public/stem_lab/stem_tool_physics.js');
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const sourceBefore = sha(sourcePath), mirrorBefore = sha(mirrorPath);
  let sourceAfter = '', mirrorAfter = '';
  const configurations: Array<Record<string, unknown>> = [];
  expect(mirrorBefore).toBe(sourceBefore);
  await mount(page); await launch(page, { velocity: 50, gravity: 25, launchHeight: 50, mass: 9 });
  await page.locator('[data-physics-sample-jump="highest"]').click();
  for (let index = 0; index < 12; index++) await page.locator('[data-physics-sample-next]').click();
  const selected = (await readDraw(page)).selected, before = await evidence(page);
  try {
    for (const width of [1100, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(60);
      for (const theme of ['default', 'dark', 'contrast']) {
        await page.evaluate(value => (window as any).__setVelocityTheme(value), theme); await page.waitForTimeout(40);
        const draw = await readDraw(page); expect(draw.selected).toEqual(selected);
        expectVelocityArrows(draw, selected); expectReadable(draw, theme + ' / ' + width); await assertLegend(page);
        const glyphs = await page.locator('[data-physics-velocity-key-group]').evaluate(group => {
          const rgb = (color: string) => {
            const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved legend color: ' + color);
            return match[1].split(',').map(Number);
          };
          const lum = (color: string) => rgb(color).slice(0, 3).map(value => {
            const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
          }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
          return [...group.querySelectorAll('[data-physics-velocity-key]>span,p')].map(node => {
            const bounds = node.getBoundingClientRect(), style = getComputedStyle(node); let background: string | null = null;
            for (let parent: Element | null = node; parent; parent = parent.parentElement) {
              const color = getComputedStyle(parent).backgroundColor, channels = rgb(color);
              if (channels.length === 3 || channels[3] >= .99) { background = color; break; }
            }
            if (!background) throw Error('Velocity legend lacks an opaque surface');
            const ink = lum(style.color), surface = lum(background);
            const svg = node.parentElement?.hasAttribute('data-physics-velocity-key') ? node.parentElement.querySelector('svg') : null;
            const symbol = svg ? lum(getComputedStyle(svg).stroke) : null;
            return { text: node.textContent, left: bounds.left, right: bounds.right, font: parseFloat(style.fontSize),
              contrast: (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05),
              svgContrast: symbol === null ? null : (Math.max(symbol, surface) + .05) / (Math.min(symbol, surface) + .05) };
          });
        });
        expect(glyphs).toHaveLength(6);
        for (const glyph of glyphs) {
          expect(glyph.font, String(glyph.text)).toBeGreaterThanOrEqual(12);
          expect(glyph.left, String(glyph.text)).toBeGreaterThanOrEqual(0); expect(glyph.right, String(glyph.text)).toBeLessThanOrEqual(width + 1);
          expect(glyph.contrast, String(glyph.text)).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
        }
        const svgContrasts = glyphs.flatMap(glyph => glyph.svgContrast === null ? [] : [glyph.svgContrast]);
        expect(svgContrasts).toHaveLength(4);
        for (const contrast of svgContrasts) expect(contrast).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
        const row47 = draw.text.filter(item => Math.abs(item.y - 47) < 1);
        const speed = row47.find(item => item.text.startsWith('|v| '))!, gravity = row47.find(item => item.text.startsWith('g '))!;
        const screenshot = path.join(reports, `velocity-${theme}-${width}.png`);
        const clearance = expectAnnotationClearance(draw);
        configurations.push({ theme, width, minFont: Math.min(...draw.text.map(item => item.fontSize), ...glyphs.map(item => item.font)),
          minTextContrast: Math.min(...draw.text.map(item => item.contrast), ...glyphs.map(item => item.contrast)),
          minCanvasTextContrast: Math.min(...draw.text.map(item => item.contrast)),
          minLegendTextContrast: Math.min(...glyphs.map(item => item.contrast)), minSVGContrast: Math.min(...svgContrasts),
          pageOverflow: draw.pageWidth - draw.viewportWidth, noOverflow: draw.pageWidth <= draw.viewportWidth + 1,
          row47Gap: speed.left - gravity.right, ...clearance, screenshot });
        for (const item of draw.text) expect(item.contrast, theme + ' / ' + width + ': ' + item.text).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
        await page.locator('.phys-scene').screenshot({ path: screenshot, animations: 'disabled' });
        expect(await evidence(page)).toEqual(before);
      }
    }
  } finally {
    sourceAfter = sha(sourcePath); mirrorAfter = sha(mirrorPath);
    writeFileSync(path.join(reports, 'visual-results.json'), JSON.stringify({
      sourceSha256: sourceBefore, mirrorSha256: mirrorBefore, finalSourceSha256: sourceAfter, finalMirrorSha256: mirrorAfter,
      sourceStable: sourceAfter === sourceBefore, mirrorStable: mirrorAfter === mirrorBefore,
      configurations, errors, completedAt: new Date().toISOString(),
    }, null, 2));
  }
  expect(configurations).toHaveLength(9); expect(sourceAfter).toBe(sourceBefore); expect(mirrorAfter).toBe(mirrorBefore);
  expect(errors).toEqual([]);
});
