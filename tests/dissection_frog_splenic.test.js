import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function production(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)(?:};[ \\t]*)?function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = source.indexOf('function ' + name + '(', match.index);
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
    Object.assign(this, { globalAlpha: .84, globalCompositeOperation: 'source-over', fillStyle: '#135724', strokeStyle: '#246813',
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
  rect(x, y, width, height) {
    this.moveTo(x, y); this.lineTo(x + width, y); this.lineTo(x + width, y + height); this.lineTo(x, y + height); this.closePath();
  }
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
  clip(rule = 'nonzero') {
    const path = structuredClone(this.path); this.clips.push(path); this.events.push({ operation: 'clip', path, rule });
  }
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
function evenOddContains(p, path) { return samplePath(path).reduce((inside, points) => inside !== contains(p, points), false); }
function distance(p, paths) {
  let result = Infinity;
  for (const points of paths) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    result = Math.min(result, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
  }
  return result;
}


const geometry = production('frogSplenicGeometry'), trace = production('traceFrogSplenicRegion');
function tracePath(region, W, H, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function mutatePath(ctx) { ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001); }
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix); ctx.globalAlpha = .96;
  const contact = vi.fn((...args) => { ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path) }); mutatePath(ctx); });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: structuredClone(ctx.clips) });
    ctx.save(); try { ctx.clip(); mutatePath(ctx); } finally { ctx.restore(); }
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawFrogSplenicSurface', { frogSplenicGeometry: geometry, traceFrogSplenicRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}
function actualCavity(W, H) {
  const marker = source.indexOf('// Organs are drawn posterior-to-anterior'), begin = source.indexOf('ctx.beginPath()', marker), end = source.indexOf('var frogCavity', begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing actual frog cavity');
  const ctx = new Context();
  new Function('ctx', 'W', 'H', 'cx', 'cy', source.slice(begin, end))(ctx, W, H, W * .5, H * .45);
  return samplePath(ctx.path)[0];
}
function actualIleum(W, H) {
  const marker = source.indexOf('// Coiled ileum sits centrally and feeds a short, broad large intestine.');
  const begin = source.indexOf('drawEntericBowel(', marker), ending = "'frog-ileum');", end = source.indexOf(ending, begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing actual frog ileum');
  let result;
  new Function('drawEntericBowel', 'W', 'H', 'cx', 'cy', source.slice(begin, end + ending.length))((start, curves, width) => {
    const ctx = new Context(); ctx.beginPath(); ctx.moveTo(...start); for (const curve of curves) ctx.bezierCurveTo(...curve);
    result = { width, paths: samplePath(ctx.path) };
  }, W, H, W * .5, H * .45);
  return result;
}

describe('compact frog splenic anatomy', () => {
  it.each(dimensions)('keeps a closed smooth ovoid, physical frame and actual cavity containment at %s by %s', (W, H) => {
    const g = geometry(W, H), path = tracePath(g.region, W, H), points = samplePath(path)[0], cavity = actualCavity(W, H);
    expect(g.target).toEqual({ x: .408, y: .565 }); expect(g.center.x).toBeCloseTo(g.target.x, 12); expect(g.center.y).toBeCloseTo(g.target.y, 12);
    expect(g.frame.rotation).toBe(-.2); expect(g.frame.radiusX).toBeCloseTo(W * .012, 12); expect(g.frame.radiusY).toBeCloseTo(H * .009, 12);
    expect(g.region.curves).toHaveLength(6); expect(g.region.curves.at(-1)[2]).toEqual(g.region.start);
    expect(path.filter(op => op[0] === 'bezierCurveTo')).toHaveLength(6); expect(path.at(-1)).toEqual(['closePath']);
    expect(path.some(op => op[0] === 'lineTo')).toBe(false);
    const co = Math.cos(g.frame.rotation), si = Math.sin(g.frame.rotation), local = [];
    for (const p of points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(contains(p, cavity)).toBe(true);
      const dx = p.x - g.center.x * W, dy = p.y - g.center.y * H;
      local.push({ x: (dx * co + dy * si) / g.frame.radiusX, y: (-dx * si + dy * co) / g.frame.radiusY });
      expect(p.x / W).toBeGreaterThanOrEqual(g.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.bounds.maxX + 1e-12);
      expect(p.y / H).toBeGreaterThanOrEqual(g.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(g.bounds.maxY + 1e-12);
    }
    const spanX = Math.max(...local.map(p => p.x)) - Math.min(...local.map(p => p.x));
    const spanY = Math.max(...local.map(p => p.y)) - Math.min(...local.map(p => p.y));
    expect(spanX).toBeGreaterThan(1.5); expect(spanX).toBeLessThan(2.2);
    expect(spanY).toBeGreaterThan(1.5); expect(spanY).toBeLessThan(2.2);
    expect(spanX / spanY).toBeGreaterThan(.8); expect(spanX / spanY).toBeLessThan(1.2);
    const target = { x: g.target.x * W, y: g.target.y * H };
    expect(contains(target, points)).toBe(true); expect(distance(target, [points])).toBeGreaterThan(1);
    expect(g.extent.x).toBeCloseTo(Math.max(g.center.x - g.bounds.minX, g.bounds.maxX - g.center.x), 12);
    expect(g.extent.y).toBeCloseTo(Math.max(g.center.y - g.bounds.minY, g.bounds.maxY - g.center.y), 12);
  });

  it('preserves the same physical capsule across aspect changes without stretching rotation coordinates', () => {
    const normalized = dimensions.map(([W, H]) => {
      const g = geometry(W, H), co = Math.cos(g.frame.rotation), si = Math.sin(g.frame.rotation);
      return [g.region.start, ...g.region.curves.flat()].map(p => {
        const dx = (p.x - g.center.x) * W, dy = (p.y - g.center.y) * H;
        return { x: (dx * co + dy * si) / g.frame.radiusX, y: (-dx * si + dy * co) / g.frame.radiusY };
      });
    });
    for (const points of normalized.slice(1)) points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(normalized[0][i].x, 10); expect(p.y).toBeCloseTo(normalized[0][i].y, 10);
    });
  });

  it.each(dimensions)('keeps its target clear of the actual gastric body, duodenum and ileum at %s by %s', (W, H) => {
    const g = geometry(W, H), p = { x: g.target.x * W, y: g.target.y * H }, ileum = actualIleum(W, H);
    const gastric = production('frogGastricGeometry')(W, H), gastricTrace = production('traceFrogGastricRegion');
    for (const [region, width] of [[gastric.stomach, 0], [gastric.duodenum, W * .009]]) {
      const ctx = new Context(); gastricTrace(ctx, region, W, H);
      const paths = samplePath(ctx.path); expect(paths[0].length).toBeGreaterThan(100);
      if (region === gastric.stomach) expect(contains(p, paths[0])).toBe(false);
      expect(distance(p, paths) - width / 2).toBeGreaterThan(1);
    }
    expect(ileum.paths[0].length).toBeGreaterThan(100); expect(ileum.width).toBeGreaterThan(0);
    expect(distance(p, ileum.paths) - ileum.width / 2).toBeGreaterThan(1);
    const capsule = samplePath(tracePath(g.region, W, H))[0];
    const getPoint = production('paintedSmallStructurePoint', { spec: { bodyShape: 'frog' }, frogGastricGeometry: production('frogGastricGeometry') });
    for (const id of ['stomach', 'sm_intestine']) {
      const point = getPoint({ id }), q = { x: point.x * W, y: point.y * H };
      expect(contains(q, capsule)).toBe(false); expect(distance(q, [capsule])).toBeGreaterThan(2);
    }
  });

  it('creates fresh geometry and rejects dimensions unable to produce finite visible tissue', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(first);
    first.target.x = 100; first.region.curves[0][0].x = 100; first.bounds.minY = -100; expect(geometry()).toEqual(saved);
    for (const [W, H] of [[0, 600], [.99, 600], [500, .5], [500, -1], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    const ctx = new Context(); for (const region of [null, {}, { start: {} }]) expect(trace(ctx, region, 500, 600)).toBe(false);
    expect(trace(null, geometry().region, 500, 600)).toBe(false); expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });
});

describe('bounded intact frog splenic capsule rendering', () => {
  it.each(dimensions)('re-traces the whole closed capsule after path-mutating material callbacks at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height), expected = tracePath(g.region, width, height);
    expect(f.draw()).toBe(true); expect(f.contact).toHaveBeenCalledTimes(1); expect(f.finish).toHaveBeenCalledTimes(1);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke']);
    expect(painting.every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    expect(painting[0].fill.kind).toBe('linear'); expect(painting[0].fill.stops).toHaveLength(4);
    expect(painting[1].width).toBe(.45);
    expect(f.ctx.events.find(e => e.operation === 'contact').path).toEqual(expected);
    expect(f.ctx.events.find(e => e.operation === 'finish').path).toEqual(expected);
    expect(f.ctx.events.find(e => e.operation === 'finish').clips.at(-1)).toEqual(expected);
    expect(f.contact.mock.calls[0]).toEqual([g.extent.x * width, g.extent.y * height]);
    expect(f.finish.mock.calls[0]).toEqual([g.center.x * width, g.center.y * height, g.extent.x * width, g.extent.y * height, 'capsule', 'frog-spleen']);
    const clips = f.ctx.events.filter(e => e.operation === 'clip'); expect(clips.length).toBeGreaterThan(0);
    for (const clip of clips) { expect(clip.path).toEqual(expected); expect(clip.path.at(-1)).toEqual(['closePath']); }
    expect(painting.every(e => e.alpha === before.globalAlpha && e.composite === before.globalCompositeOperation)).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('retains the same recognizable closed ovoid with two flat paints in clarity modes at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(), g = geometry(width, height); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke']);
    expect(typeof painting[0].fill).toBe('string'); expect(painting[1].width).toBe(.45);
    expect(painting.every(e => JSON.stringify(e.path) === JSON.stringify(tracePath(g.region, width, height)))).toBe(true);
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'gradient' || e.operation === 'clip')).toBe(false);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });


  it('isolates contact callback state mutations before body paint and clips replacement finish paths to the full capsule', () => {
    const f = fixture(), before = f.ctx.state(), expected = tracePath(geometry().region, 500, 600);
    f.options.contact = vi.fn(() => {
      f.ctx.globalAlpha = .1; f.ctx.globalCompositeOperation = 'destination-out'; f.ctx.scale(4, 7);
      f.ctx.lineWidth = 100; f.ctx.shadowBlur = 50; f.ctx.dash = [100];
      mutatePath(f.ctx); f.ctx.clip();
    });
    let finishEntry;
    f.options.finish = vi.fn(() => {
      finishEntry = f.ctx.state(); f.ctx.beginPath(); f.ctx.rect(-10000, -10000, 20000, 20000);
      f.ctx.fillStyle = '#ffffff'; f.ctx.fill(); f.ctx.globalAlpha = .01; f.ctx.scale(3, -2);
    });
    expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke', 'fill']);
    expect(painting[0].path).toEqual(expected); expect(painting[1].path).toEqual(expected);
    for (const event of painting.slice(0, 2)) {
      expect(event.alpha).toBe(before.globalAlpha); expect(event.composite).toBe(before.globalCompositeOperation);
      expect(event.matrix).toEqual(before.matrix); expect(event.clips).toEqual(before.clips);
    }
    expect(finishEntry.matrix).toEqual(before.matrix); expect(finishEntry.globalAlpha).toBe(before.globalAlpha);
    expect(finishEntry.clips.at(-1)).toEqual(expected); expect(painting[2].clips.at(-1)).toEqual(expected);
    expect(painting[2].path).not.toEqual(expected); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('responds to directional illumination without moving the contour or target', () => {
    const left = fixture({ lightDirection: 'left' }), right = fixture({ lightDirection: 'right' }); left.draw(); right.draw();
    const a = paints(left.ctx), b = paints(right.ctx); expect(a.map(e => e.path)).toEqual(b.map(e => e.path));
    expect(a[0].fill.args[0]).toBeLessThan(a[0].fill.args[2]); expect(b[0].fill.args[0]).toBeGreaterThan(b[0].fill.args[2]);
    expect(a[0].fill.stops).toEqual(b[0].fill.stops);
  });

  it.each([.84, .96, 1])('preserves affine state, inherited clips and tissue alpha %s', alpha => {
    const f = fixture({}, [-2.7, .2, .3, 3, 800, -175]); f.ctx.globalAlpha = alpha; const before = f.ctx.state(); f.draw();
    const expected = tracePath(geometry().region, 500, 600, before.matrix);
    expect(paints(f.ctx).every(e => JSON.stringify(e.path) === JSON.stringify(expected) && e.alpha === alpha)).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['contact', 'gradient', 'fill', 'border', 'finish'])('restores parent state after an injected %s failure', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected splenic error'); };
    if (location === 'contact') f.options.contact = fail;
    else if (location === 'finish') f.options.finish = fail;
    else if (location === 'gradient') f.ctx.createLinearGradient = fail;
    else if (location === 'fill') f.ctx.fill = fail;
    else f.ctx.stroke = fail;
    expect(f.draw).toThrow('Injected splenic error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('renders without optional callbacks and does no work for invalid dimensions', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true); expect(paints(f.ctx)).toHaveLength(2); expect(f.ctx.stack).toEqual([]);
    for (const input of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: .5 }, { width: undefined }]) {
      const invalid = fixture(input), before = invalid.ctx.state(); expect(invalid.draw()).toBe(false);
      expect(invalid.ctx.events).toEqual([]); expect(invalid.ctx.state()).toEqual(before); expect(invalid.ctx.stack).toEqual([]);
    }
    expect(f.rawDraw(null, f.options)).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});

describe('shared frog splenic target registration', () => {
  it('uses production geometry before seed variation or generic view offsets in every presentation', () => {
    const sharedGeometry = vi.fn(geometry);
    for (const [W, H] of dimensions) for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const d = { visualRealism: mode, anatomicalView: view, variationSeed: 19 };
      const bindings = { spec: { bodyShape: 'frog' }, frogSplenicGeometry: sharedGeometry,
        queryDissectionNode: () => ({ _logicalW: W, _logicalH: H, width: W * 3, height: H * 3 }), d, visualRealism: mode,
        specimenVariationValue: () => { throw Error('A registered capsule target must not jitter'); },
        viewSpecificOrganPoint: () => { throw Error('A registered capsule target must not get a generic view offset'); } };
      const point = production('variedOrganPoint', { ...bindings, paintedSmallStructurePoint: production('paintedSmallStructurePoint', bindings) })({ id: 'spleen' });
      expect(point).toEqual(geometry(W, H).target);
    }
    expect(sharedGeometry).toHaveBeenCalledTimes(dimensions.length * 3 * 4);
  });
});
