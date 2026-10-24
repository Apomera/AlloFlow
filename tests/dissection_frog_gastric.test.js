import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function production(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = new RegExp('^' + match[1] + '}[ \\t]*\\r?$', 'gm'); ending.lastIndex = start;
  const end = ending.exec(source);
  if (!end) throw Error('Missing standalone function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end.index + end[0].trimEnd().length) + ');')(...Object.values(bindings));
}

const dimensions = [[500, 600], [1000, 600], [320, 900]];
const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap',
  'lineJoin', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class Context {
  constructor(matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = [...matrix]; this.path = []; this.clips = ['specimen']; this.stack = []; this.events = []; this.dash = [3, 2];
    Object.assign(this, { globalAlpha: .96, globalCompositeOperation: 'source-over', fillStyle: '#135724', strokeStyle: '#246813',
      lineWidth: 2.3, lineCap: 'butt', lineJoin: 'miter', shadowBlur: 2, shadowColor: '#151617', shadowOffsetX: -1, shadowOffsetY: 2 });
  }
  state() { return { matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash], ...Object.fromEntries(stateKeys.map(k => [k, this[k]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced restore'); Object.assign(this, this.stack.pop()); }
  point(x, y) { const [a, b, c, d, e, f] = this.matrix; return [a * x + c * y + e, b * x + d * y + f]; }
  translate(x, y) { const p = this.point(x, y); this.matrix[4] = p[0]; this.matrix[5] = p[1]; }
  scale(x, y) { this.matrix[0] *= x; this.matrix[1] *= x; this.matrix[2] *= y; this.matrix[3] *= y; }
  rotate(angle) {
    const [a, b, c, d, e, f] = this.matrix, co = Math.cos(angle), si = Math.sin(angle);
    this.matrix = [a * co + c * si, b * co + d * si, c * co - a * si, d * co - b * si, e, f];
  }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push(['moveTo', ...this.point(x, y)]); }
  lineTo(x, y) { this.path.push(['lineTo', ...this.point(x, y)]); }
  bezierCurveTo(...c) { this.path.push(['bezierCurveTo', ...this.point(c[0], c[1]), ...this.point(c[2], c[3]), ...this.point(c[4], c[5])]); }
  quadraticCurveTo(...c) { this.path.push(['quadraticCurveTo', ...this.point(c[0], c[1]), ...this.point(c[2], c[3])]); }
  ellipse(x, y, rx, ry, rotation, start, end) {
    for (let i = 0; i <= 160; i++) {
      const angle = start + (end - start) * i / 160, u = Math.cos(angle) * rx, v = Math.sin(angle) * ry;
      const px = x + u * Math.cos(rotation) - v * Math.sin(rotation), py = y + u * Math.sin(rotation) + v * Math.cos(rotation);
      if (i === 0) this.moveTo(px, py); else this.lineTo(px, py);
    }
  }
  closePath() { this.path.push(['closePath']); }
  clip() { const path = structuredClone(this.path); this.clips.push(path); this.events.push({ operation: 'clip', path }); }
  createLinearGradient(...args) {
    const gradient = { kind: 'linear', args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } };
    this.events.push({ operation: 'gradient', gradient }); return gradient;
  }
  paint(operation) {
    this.events.push({ operation, path: structuredClone(this.path), clips: [...this.clips], alpha: this.globalAlpha,
      fill: this.fillStyle, stroke: this.strokeStyle, width: this.lineWidth, matrix: [...this.matrix],
      composite: this.globalCompositeOperation, cap: this.lineCap, join: this.lineJoin });
  }
  fill() { this.paint('fill'); }
  stroke() { this.paint('stroke'); }
}

function samplePath(path, steps = 120) {
  const paths = []; let points, previous, start;
  for (const op of path) {
    if (op[0] === 'moveTo') {
      previous = { x: op[1], y: op[2] }; start = previous; points = [previous]; paths.push(points);
    } else if (op[0] === 'lineTo') { previous = { x: op[1], y: op[2] }; points.push(previous); }
    else if (op[0] === 'bezierCurveTo' || op[0] === 'quadraticCurveTo') {
      const a = previous;
      for (let step = 1; step <= steps; step++) {
        const t = step / steps, u = 1 - t;
        points.push(op[0] === 'bezierCurveTo'
          ? { x: u ** 3 * a.x + 3 * u * u * t * op[1] + 3 * u * t * t * op[3] + t ** 3 * op[5],
            y: u ** 3 * a.y + 3 * u * u * t * op[2] + 3 * u * t * t * op[4] + t ** 3 * op[6] }
          : { x: u * u * a.x + 2 * u * t * op[1] + t * t * op[3],
            y: u * u * a.y + 2 * u * t * op[2] + t * t * op[4] });
      }
      previous = points.at(-1);
    } else if (op[0] === 'closePath') { if (previous.x !== start.x || previous.y !== start.y) points.push(start); previous = start; }
  }
  return paths;
}
function contains(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function distance(p, paths) {
  let result = Infinity;
  for (const points of paths) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    result = Math.min(result, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
  }
  return result;
}
const geometry = production('frogGastricGeometry'), trace = production('traceFrogGastricRegion');
function tracePath(region, W, H, outline = false, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H, outline); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function mutatePath(ctx) { ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001); }
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix);
  const strokeTube = vi.fn((...args) => {
    ctx.events.push({ operation: 'tube', args, path: structuredClone(ctx.path) });
    ctx.strokeStyle = args[1]; ctx.lineWidth = args[0]; ctx.stroke(); mutatePath(ctx);
  });
  const contact = vi.fn((...args) => { ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path) }); mutatePath(ctx); });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path) });
    ctx.save(); try { ctx.clip(); mutatePath(ctx); } finally { ctx.restore(); }
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', strokeTube, contact, finish, ...overrides };
  const draw = production('drawFrogGastricComplex', { frogGastricGeometry: geometry, traceFrogGastricRegion: trace });
  return { ctx, options, strokeTube, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}

function pathFragment(startMarker, endMarker, W, H) {
  const marker = source.indexOf(startMarker), begin = startMarker.startsWith('var ') ? marker : source.indexOf('ctx.beginPath()', marker), end = source.indexOf(endMarker, begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing production path: ' + startMarker);
  const ctx = new Context();
  new Function('ctx', 'W', 'H', 'cx', 'cy', source.slice(begin, end))(ctx, W, H, W * .5, H * .45);
  return ctx.path;
}
function actualIleum(W, H) {
  const marker = source.indexOf('// Coiled ileum sits centrally and feeds a short, broad large intestine.');
  const begin = source.indexOf('drawEntericBowel(', marker), ending = "'frog-ileum');", end = source.indexOf(ending, begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing actual frog ileum');
  let result;
  new Function('drawEntericBowel', 'W', 'H', 'cx', 'cy', source.slice(begin, end + ending.length))((start, curves, width) => {
    const ctx = new Context(); ctx.beginPath(); ctx.moveTo(...start); for (const curve of curves) ctx.bezierCurveTo(...curve);
    result = { start, curves, width, paths: samplePath(ctx.path) };
  }, W, H, W * .5, H * .45);
  return result;
}
function actualLaterPaths(W, H) {
  const pancreaticGeometry = production('frogPancreaticGeometry'), pancreaticTrace = production('traceFrogPancreaticRegion');
  const pancreaticDraw = production('drawFrogPancreaticSurface', { frogPancreaticGeometry: pancreaticGeometry, traceFrogPancreaticRegion: pancreaticTrace });
  const splenicGeometry = production('frogSplenicGeometry'), splenicTrace = production('traceFrogSplenicRegion');
  const splenicDraw = production('drawFrogSplenicSurface', { frogSplenicGeometry: splenicGeometry, traceFrogSplenicRegion: splenicTrace });
  const actualFills = draw => [true, false].map(detailed => {
    const ctx = new Context(); draw(ctx, { width: W, height: H, detailed });
    const fills = ctx.events.filter(e => e.operation === 'fill');
    if (fills.length !== 1 || fills[0].path.at(-1)[0] !== 'closePath') throw Error('Missing actual closed accessory-organ fill');
    return samplePath(fills[0].path);
  });
  const membrane = pathFragment('// Translucent mesentery sits beneath the coiled gut;', 'ctx.fillStyle', W, H);
  return { pancreaticFills: actualFills(pancreaticDraw), splenicFills: actualFills(splenicDraw), membrane: samplePath(membrane), ileum: actualIleum(W, H) };
}

describe('continuous frog gastric and duodenal anatomy', () => {
  it.each(dimensions)('contains the whole stomach and proximal course within the actual cavity at %s by %s', (W, H) => {
    const g = geometry(W, H), cavity = samplePath(pathFragment('// Organs are drawn posterior-to-anterior', 'var frogCavity', W, H))[0];
    const stomach = samplePath(tracePath(g.stomach, W, H))[0], course = samplePath(tracePath(g.duodenum, W, H))[0];
    expect(g.stomach.closed).toBe(true); expect(g.duodenum.closed).toBe(false);
    expect(g.stomach.curves.length).toBeGreaterThanOrEqual(6); expect(g.stomach.curves.length).toBeLessThanOrEqual(10);
    expect(g.stomach.curves.at(-1)[2]).toEqual(g.stomach.start);
    for (const p of [...stomach, ...course]) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(contains(p, cavity)).toBe(true);
    }
    const target = { x: g.target.x * W, y: g.target.y * H };
    expect(contains(target, stomach)).toBe(true); expect(distance(target, [stomach])).toBeGreaterThan(3);
    expect(contains({ x: g.stomach.center.x * W, y: g.stomach.center.y * H }, stomach)).toBe(true);
    expect(g.stomach.extent.x > 0 && g.stomach.extent.y > 0).toBe(true);
  });

  it.each(dimensions)('leaves the gastric body exactly once through its unstroked pyloric opening at %s by %s', (W, H) => {
    const g = geometry(W, H), stomach = samplePath(tracePath(g.stomach, W, H), 400)[0];
    const course = samplePath(tracePath(g.duodenum, W, H), 800)[0], tubeRadius = W * .009 / 2;
    expect(contains(course[0], stomach)).toBe(true); expect(distance(course[0], [stomach])).toBeGreaterThan(tubeRadius);
    const transitions = [];
    for (let i = 1; i < course.length; i++) if (contains(course[i], stomach) !== contains(course[i - 1], stomach)) transitions.push(i);
    expect(transitions).toHaveLength(1); expect(contains(course.at(-1), stomach)).toBe(false);
    const index = transitions[0], exit = { x: (course[index].x + course[index - 1].x) / 2, y: (course[index].y + course[index - 1].y) / 2 };
    const cap = { start: g.stomach.curves[g.stomach.outlineBreak - 1][2], curves: [g.stomach.curves[g.stomach.outlineBreak]], closed: false };
    expect(distance(exit, samplePath(tracePath(cap, W, H), 400))).toBeLessThan(.2);
    const openBorder = samplePath(tracePath(g.stomach, W, H, true), 400);
    expect(openBorder).toHaveLength(2);
    // The actual line radius must fit through the open border, rather than merely touching its centerline.
    expect(distance(exit, openBorder)).toBeGreaterThan(tubeRadius);
  });

  it.each(dimensions)('joins the actual ileum endpoint and direction without an invented gap at %s by %s', (W, H) => {
    const g = geometry(W, H), actual = actualIleum(W, H), end = g.duodenum.curves.at(-1)[2], previous = g.duodenum.curves.at(-1)[1];
    expect(end.x * W).toBeCloseTo(actual.start[0], 10); expect(end.y * H).toBeCloseTo(actual.start[1], 10);
    expect(g.ileumStart).toEqual(end);
    const a = { x: (end.x - previous.x) * W, y: (end.y - previous.y) * H };
    const b = { x: actual.curves[0][0] - actual.start[0], y: actual.curves[0][1] - actual.start[1] };
    expect(Math.hypot(a.x, a.y)).toBeGreaterThan(0); expect(Math.hypot(b.x, b.y)).toBeGreaterThan(0);
    expect(Math.abs(a.x * b.y - a.y * b.x) / Math.hypot(a.x, a.y) / Math.hypot(b.x, b.y)).toBeLessThan(1e-10);
    expect(a.x * b.x + a.y * b.y).toBeGreaterThan(0);
  });

  it.each(dimensions)('keeps the stomach target exposed after actual pancreas, spleen, membrane and ileum paint at %s by %s', (W, H) => {
    const g = geometry(W, H), p = { x: g.target.x * W, y: g.target.y * H }, later = actualLaterPaths(W, H);
    expect(later.pancreaticFills).toHaveLength(2); expect(later.splenicFills).toHaveLength(2);
    for (const paths of [...later.pancreaticFills, ...later.splenicFills, later.membrane]) {
      expect(paths.length).toBeGreaterThan(0); expect(paths[0].length).toBeGreaterThan(100);
      expect(contains(p, paths[0])).toBe(false); expect(distance(p, paths)).toBeGreaterThan(2);
    }
    expect(distance(p, later.ileum.paths) - later.ileum.width / 2).toBeGreaterThan(2);
    const registered = production('paintedSmallStructurePoint', { spec: { bodyShape: 'frog' }, frogGastricGeometry: geometry,
      queryDissectionNode: () => ({ _logicalW: W, _logicalH: H }) })({ id: 'stomach' });
    expect(registered).toEqual(g.target);
  });

  it('creates fresh deterministic anatomy and finite aspect-limited pyloric openings', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(first);
    first.target.x = 100; first.stomach.curves[0][0].x = 100; first.duodenum.start.y = -100;
    expect(geometry()).toEqual(saved);
    for (const [W, H] of [[1, 10000], [10000, 1], [500, 600]]) {
      const g = geometry(W, H), cap = g.stomach.curves[g.stomach.outlineBreak];
      const halfHeight = Math.abs(g.stomach.curves[g.stomach.outlineBreak - 1][2].y - cap[2].y) / 2;
      expect(halfHeight).toBeGreaterThanOrEqual(.004 - 1e-12); expect(halfHeight).toBeLessThanOrEqual(.012 + 1e-12);
      for (const region of [g.stomach, g.duodenum]) for (const p of [region.start, ...region.curves.flat()]) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
  });

  it('rejects unusable dimensions and traces no absent region', () => {
    for (const [W, H] of [[0, 600], [500, -1], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    const ctx = new Context(); for (const region of [null, {}, { start: {} }]) expect(trace(ctx, region, 500, 600)).toBe(false);
    expect(trace(null, geometry().stomach, 500, 600)).toBe(false); expect(ctx.events).toEqual([]); expect(ctx.path).toEqual([]);
  });
});

describe('bounded closed-serosa frog gastric rendering', () => {
  it.each(dimensions)('paints the duodenum behind the closed stomach with an open outlet border at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['stroke', 'fill', 'stroke']);
    expect(painting[0].path).toEqual(tracePath(g.duodenum, width, height));
    expect(painting[0].path.some(op => op[0] === 'closePath')).toBe(false);
    expect(painting[1].path).toEqual(tracePath(g.stomach, width, height)); expect(painting[1].fill.kind).toBe('linear');
    expect(painting[1].fill.stops).toHaveLength(4);
    expect(painting[2].path).toEqual(tracePath(g.stomach, width, height, true));
    expect(painting[2].path.some(op => op[0] === 'closePath')).toBe(false);
    expect(painting[2].path.filter(op => op[0] === 'moveTo')).toHaveLength(2);
    expect(f.strokeTube).toHaveBeenCalledTimes(1); expect(f.strokeTube.mock.calls[0][0]).toBe(width * .009);
    expect(painting.every(e => e.alpha === before.globalAlpha && e.composite === before.globalCompositeOperation)).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('re-traces the intended open contact and closed finish paths despite callbacks replacing the current path', () => {
    const f = fixture(), g = geometry(); f.draw();
    expect(f.contact).toHaveBeenCalledTimes(1); expect(f.finish).toHaveBeenCalledTimes(1);
    expect(f.ctx.events.find(e => e.operation === 'contact').path).toEqual(tracePath(g.stomach, 500, 600, true));
    expect(f.contact.mock.calls[0]).toEqual([g.stomach.extent.x * 500, g.stomach.extent.y * 600]);
    expect(f.ctx.events.find(e => e.operation === 'finish').path).toEqual(tracePath(g.stomach, 500, 600));
    expect(f.finish.mock.calls[0]).toEqual([g.stomach.center.x * 500, g.stomach.center.y * 600,
      g.stomach.extent.x * 500, g.stomach.extent.y * 600, 'serosa', 'frog-stomach']);
    const clips = f.ctx.events.filter(e => e.operation === 'clip'); expect(clips).toHaveLength(1);
    expect(clips[0].path).toEqual(tracePath(g.stomach, 500, 600));
    expect(clips[0].path.at(-1)).toEqual(['closePath']);
  });

  it.each(dimensions)('retains continuous anatomy and suppresses material effects in the teaching fallback at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), g = geometry(width, height), before = f.ctx.state(); expect(f.draw()).toBe(true);
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled(); expect(f.strokeTube).toHaveBeenCalledTimes(1);
    expect(f.ctx.events.some(e => e.operation === 'gradient' || e.operation === 'clip')).toBe(false);
    const painting = paints(f.ctx); expect(painting).toHaveLength(3); expect(typeof painting[1].fill).toBe('string');
    expect(painting.map(e => e.path)).toEqual([tracePath(g.duodenum, width, height), tracePath(g.stomach, width, height), tracePath(g.stomach, width, height, true)]);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('changes directional illumination without moving the stomach or duodenal course', () => {
    const left = fixture({ lightDirection: 'left' }), right = fixture({ lightDirection: 'right' }); left.draw(); right.draw();
    const a = paints(left.ctx), b = paints(right.ctx); expect(a.map(e => e.path)).toEqual(b.map(e => e.path));
    expect(a[1].fill.args[0]).toBeLessThan(a[1].fill.args[2]); expect(b[1].fill.args[0]).toBeGreaterThan(b[1].fill.args[2]);
    expect(a[1].fill.stops).toEqual(b[1].fill.stops);
  });

  it('inherits and restores the mirrored affine transform, camera clip and translucent tissue opacity', () => {
    const f = fixture({}, [-2.7, .2, .3, 3, 800, -175]); f.ctx.globalAlpha = .9;
    const before = f.ctx.state(), g = geometry(); f.draw();
    expect(paints(f.ctx).map(e => e.path)).toEqual([tracePath(g.duodenum, 500, 600, false, before.matrix),
      tracePath(g.stomach, 500, 600, false, before.matrix), tracePath(g.stomach, 500, 600, true, before.matrix)]);
    expect(paints(f.ctx).every(e => e.alpha === .9 && JSON.stringify(e.matrix) === JSON.stringify(before.matrix))).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['tube', 'contact', 'gradient', 'fill', 'outline', 'finish'])('restores parent state after an injected %s failure', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected gastric error'); };
    if (location === 'tube') f.options.strokeTube = fail;
    else if (location === 'contact') f.options.contact = fail;
    else if (location === 'finish') f.options.finish = fail;
    else if (location === 'gradient') f.ctx.createLinearGradient = fail;
    else if (location === 'fill') f.ctx.fill = fail;
    else { const original = f.ctx.stroke.bind(f.ctx); f.ctx.stroke = () => { if (f.ctx.path.filter(op => op[0] === 'moveTo').length === 2) fail(); original(); }; }
    expect(f.draw).toThrow('Injected gastric error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('provides a bounded rounded duodenal stroke when no optional callbacks are supplied', () => {
    const f = fixture({ strokeTube: null, contact: null, finish: null }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting).toHaveLength(3);
    expect(painting[0].path).toEqual(tracePath(geometry().duodenum, 500, 600)); expect(painting[0].width).toBe(4.5);
    expect(painting[0].cap).toBe('round'); expect(painting[0].join).toBe('round');
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('does no canvas work for unusable dimensions and keeps the desktop source identical', () => {
    for (const input of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: -1 }, { width: undefined }]) {
      const f = fixture(input), before = f.ctx.state(); expect(f.draw()).toBe(false);
      expect(f.ctx.events).toEqual([]); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
    }
    const f = fixture(); expect(f.rawDraw(null, f.options)).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});
