import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const matches = [...source.matchAll(/^([ \t]*)function drawClampedSpecimenCaption\(/gm)];
if (matches.length !== 1) throw new Error('Expected one production caption helper');
const start = matches[0].index + matches[0][1].length;
const ending = '\n' + matches[0][1] + '}';
const end = source.indexOf(ending, start);
if (end < start) throw new Error('Missing production caption helper ending');
const drawCaption = new Function('return (' + source.slice(start, end + ending.length) + ');')();

const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const stateKeys = ['font', 'textAlign', 'textBaseline', 'fillStyle', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowColor'];
function inkMetrics(text, font) {
  const size = Number(font.match(/([\d.]+)px/)[1]);
  return { width: text.length * size * 0.55, actualBoundingBoxLeft: 0.8,
    actualBoundingBoxRight: text.length * size * 0.55 - 0.2,
    actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2 };
}
class AffineContext {
  constructor(matrix = identity) {
    this.matrix = { ...matrix }; this.stack = []; this.draws = [];
    this.currentPath = Object.freeze({ name: 'Authored specimen path' });
    this.font = 'bold 17px original'; this.textAlign = 'right'; this.textBaseline = 'middle';
    this.fillStyle = '#345678'; this.shadowBlur = 7; this.shadowOffsetX = 3;
    this.shadowOffsetY = -2; this.shadowColor = '#987654';
    this.measureText = vi.fn(text => inkMetrics(text, this.font));
  }
  getTransform() { return { ...this.matrix }; }
  state() { return { matrix: this.getTransform(), ...Object.fromEntries(stateKeys.map(key => [key, this[key]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { Object.assign(this, this.stack.pop()); }
  transform(a, b, c, d, e, f) {
    const m = this.matrix;
    this.matrix = { a: m.a * a + m.c * b, b: m.b * a + m.d * b,
      c: m.a * c + m.c * d, d: m.b * c + m.d * d,
      e: m.a * e + m.c * f + m.e, f: m.b * e + m.d * f + m.f };
  }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  fillText(text, x, y) { this.draws.push({ text, x, y, ...this.state(), metrics: inkMetrics(text, this.font) }); }
}
function surface(cssWidth = 500, cssHeight = 600, width = cssWidth, height = cssHeight) {
  return { width, height, getBoundingClientRect: () => ({ width: cssWidth, height: cssHeight }) };
}
function paintedBounds(draw, host) {
  const rect = host.getBoundingClientRect();
  const px = host.width / rect.width, py = host.height / rect.height;
  const m = draw.matrix, metrics = draw.metrics;
  const corners = [
    [-metrics.actualBoundingBoxLeft, -metrics.actualBoundingBoxAscent],
    [Math.max(metrics.width, metrics.actualBoundingBoxRight), -metrics.actualBoundingBoxAscent],
    [-metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxDescent],
    [Math.max(metrics.width, metrics.actualBoundingBoxRight), metrics.actualBoundingBoxDescent]
  ].map(([x, y]) => ({ x: (m.a * (x + draw.x) + m.c * (y + draw.y) + m.e) / px,
    y: (m.b * (x + draw.x) + m.d * (y + draw.y) + m.f) / py }));
  return { left: Math.min(...corners.map(point => point.x)), right: Math.max(...corners.map(point => point.x)),
    top: Math.min(...corners.map(point => point.y)), bottom: Math.max(...corners.map(point => point.y)) };
}
function expectVisibleUpright(draw, host, padding = 12) {
  const rect = host.getBoundingClientRect(), bounds = paintedBounds(draw, host);
  expect(draw.matrix.a / (host.width / rect.width)).toBeCloseTo(1, 10);
  expect(draw.matrix.b / (host.height / rect.height)).toBeCloseTo(0, 10);
  expect(draw.matrix.c / (host.width / rect.width)).toBeCloseTo(0, 10);
  expect(draw.matrix.d / (host.height / rect.height)).toBeCloseTo(1, 10);
  expect(bounds.left).toBeGreaterThanOrEqual(padding - 1e-7);
  expect(bounds.top).toBeGreaterThanOrEqual(padding - 1e-7);
  expect(bounds.right).toBeLessThanOrEqual(rect.width - padding + 1e-7);
  expect(bounds.bottom).toBeLessThanOrEqual(rect.height - padding + 1e-7);
  return bounds;
}

describe('dissection caption in CSS screen space', () => {
  it.each([
    ['identity', identity, surface()],
    ['zoom out and pan', { a: 0.5, b: 0, c: 0, d: 0.5, e: 125, f: 150 }, surface()],
    ['DPR 2, zoom and mirror', { a: -6, b: 0, c: 0, d: 6, e: 1800, f: -400 }, surface(500, 600, 1000, 1200)],
    ['DPR 3 with mirror and shear', { a: -4.5, b: 0.12, c: 0.3, d: 5.4, e: 1700, f: -900 }, surface(500, 600, 1500, 1800)],
    ['embedded phone with unequal backing density', { a: 2.4, b: 0.17, c: -0.1, d: 3, e: -150, f: 400 }, surface(260, 312, 1500, 1600)]
  ])('keeps readable 12px glyphs inside the host under %s', (_name, matrix, host) => {
    const ctx = new AffineContext(matrix), before = ctx.state(), path = ctx.currentPath;
    const result = drawCaption(ctx, host, 'Refracted light', 210, 155, { color: '#fbbf24' });
    expect(result).not.toBeNull(); expect(ctx.draws).toHaveLength(1);
    const draw = ctx.draws[0], bounds = expectVisibleUpright(draw, host);
    expect(draw.text).toBe('Refracted light'); expect(draw.font).toBe('12px Inter, system-ui');
    expect(draw.fillStyle).toBe('#fbbf24'); expect(draw.textAlign).toBe('left'); expect(draw.textBaseline).toBe('alphabetic');
    expect(draw.shadowBlur).toBe(0); expect(draw.shadowOffsetX).toBe(0); expect(draw.shadowOffsetY).toBe(0);
    expect(result.x).toBeCloseTo(bounds.left, 8); expect(result.y).toBeCloseTo(bounds.top, 8);
    expect(result.anchorX).toBeCloseTo((matrix.a * 210 + matrix.c * 155 + matrix.e) / (host.width / host.getBoundingClientRect().width), 8);
    expect(result.anchorY).toBeCloseTo((matrix.b * 210 + matrix.d * 155 + matrix.f) / (host.height / host.getBoundingClientRect().height), 8);
    expect(ctx.state()).toEqual(before); expect(ctx.stack).toEqual([]); expect(ctx.currentPath).toBe(path);
  });

  it.each([[-10000, -10000], [10000, -10000], [-10000, 10000], [10000, 10000]])(
    'clamps the full ink bounds for an offscreen anchor (%s, %s)', (x, y) => {
      const ctx = new AffineContext(), host = surface();
      const result = drawCaption(ctx, host, 'Refracted light', x, y);
      expect(result.clamped).toBe(true);
      expectVisibleUpright(ctx.draws[0], host);
    });

  it('preserves a visible anchor, supports larger text, and fits long text within a narrow host', () => {
    const ctx = new AffineContext(), host = surface();
    const visible = drawCaption(ctx, host, 'Refracted light', 100, 100, { fontSize: 14, bold: true });
    expect(visible.clamped).toBe(false); expect(ctx.draws[0].font).toBe('bold 14px Inter, system-ui');
    expect(ctx.draws[0].matrix.e).toBe(100); expect(ctx.draws[0].matrix.f).toBe(100);
    expectVisibleUpright(ctx.draws[0], host);
    const narrow = surface(120, 100, 240, 200), longContext = new AffineContext({ ...identity, a: 2, d: 2 });
    const longText = 'Refracted light through the preserved specimen '.repeat(100);
    const fitted = drawCaption(longContext, narrow, longText, 60, 50);
    expect(fitted.text.length).toBeLessThan(longText.length); expect(fitted.text.endsWith('\u2026')).toBe(true);
    expect(longContext.draws).toHaveLength(1); expectVisibleUpright(longContext.draws[0], narrow);
    expect(longContext.measureText.mock.calls.length).toBeLessThan(25);
  });

  it('uses font ascent/descent fallbacks when the browser only supplies advance width', () => {
    const ctx = new AffineContext(), host = surface();
    ctx.measureText.mockImplementation(text => ({ width: text.length * 6.6 }));
    const result = drawCaption(ctx, host, 'Refracted light', -100, -100);
    expect(result).not.toBeNull(); expect(result.height).toBeCloseTo(12 * (0.8 + 0.22), 10);
    expect(result.x).toBe(12); expect(result.y).toBe(12);
    expect(result.width).toBeCloseTo('Refracted light'.length * 6.6, 10);
    expect(ctx.draws[0].matrix.e).toBe(12); expect(ctx.draws[0].matrix.f).toBeCloseTo(12 + 12 * 0.8, 10);
    expect(ctx.stack).toEqual([]);
  });

  it('rejects nonfinite and singular transforms, invalid anchors and unavailable surface geometry without painting', () => {
    const matrices = Object.keys(identity).flatMap(key => [NaN, Infinity, -Infinity].map(value => ({ ...identity, [key]: value })));
    matrices.push({ a: 1, b: 2, c: 2, d: 4, e: 0, f: 0 });
    for (const matrix of matrices) {
      const ctx = new AffineContext(matrix);
      expect(drawCaption(ctx, surface(), 'Refracted light', 20, 30)).toBeNull();
      expect(ctx.draws).toEqual([]); expect(ctx.stack).toEqual([]); expect(ctx.measureText).not.toHaveBeenCalled();
    }
    for (const [x, y] of [[NaN, 30], [20, Infinity], [-Infinity, 0]]) {
      const ctx = new AffineContext();
      expect(drawCaption(ctx, surface(), 'Refracted light', x, y)).toBeNull(); expect(ctx.draws).toEqual([]);
    }
    for (const host of [surface(0), surface(500, 0), surface(500, 600, 0), surface(500, 600, 500, NaN),
      surface(Infinity), surface(500, Infinity), surface(500, 600, Infinity), surface(500, 600, 500, Infinity)]) {
      const ctx = new AffineContext();
      expect(drawCaption(ctx, host, 'Refracted light', 20, 30)).toBeNull();
      expect(ctx.draws).toEqual([]); expect(ctx.stack).toEqual([]);
    }
  });

  it('does not paint absent text, missing context APIs, or a host too small for legible ink', () => {
    for (const text of ['', null, undefined, 5]) {
      const ctx = new AffineContext();
      expect(drawCaption(ctx, surface(), text, 20, 30)).toBeNull(); expect(ctx.draws).toEqual([]);
    }
    expect(drawCaption(null, surface(), 'Refracted light', 20, 30)).toBeNull();
    expect(drawCaption({}, surface(), 'Refracted light', 20, 30)).toBeNull();
    const ctx = new AffineContext(), before = ctx.state();
    expect(drawCaption(ctx, surface(100, 20), 'Refracted light', 20, 30)).toBeNull();
    expect(ctx.draws).toEqual([]); expect(ctx.state()).toEqual(before); expect(ctx.stack).toEqual([]);
  });

  it.each(['measureText', 'fillText'])('restores the caller transform, style and path after a %s error', operation => {
    const ctx = new AffineContext({ a: -3, b: 0.1, c: 0.2, d: 3, e: 650, f: -90 });
    const before = ctx.state(), path = ctx.currentPath;
    ctx[operation] = vi.fn(() => { throw new Error('Injected caption failure'); });
    expect(() => drawCaption(ctx, surface(), 'Refracted light', 50, 70, { color: '#fbbf24' })).toThrow('Injected caption failure');
    expect(ctx.state()).toEqual(before); expect(ctx.stack).toEqual([]); expect(ctx.currentPath).toBe(path);
  });
});
