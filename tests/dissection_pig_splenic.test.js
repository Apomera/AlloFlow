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

function actualAnchors(W, H) {
  const anchor = /var pigStomachX = [^;\r\n]+;\s*var pigStomachY = [^;\r\n]+;/.exec(source);
  if (!anchor) throw Error('Missing actual pig visceral anchors');
  return new Function('W', 'H', 'cx', 'cy', anchor[0] + '; return { pigStomachX, pigStomachY };')(W, H, W * .5, H * .45);
}
function executeSection(startMarker, endMarker, W, H, extras = {}, fromMarker = false, includeEnd = false) {
  const marker = source.indexOf(startMarker), begin = fromMarker ? marker : source.indexOf('ctx.beginPath()', marker);
  const end = source.indexOf(endMarker, begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing production path: ' + startMarker);
  const ctx = new Context(), bindings = { ...actualAnchors(W, H), ...(typeof extras === 'function' ? extras(ctx) : extras) };
  const suffix = '; return { pigBladderX: typeof pigBladderX === "number" ? pigBladderX : null, pigBladderY: typeof pigBladderY === "number" ? pigBladderY : null };';
  const variables = new Function('ctx', 'W', 'H', 'cx', 'cy', ...Object.keys(bindings),
    source.slice(begin, end + (includeEnd ? endMarker.length : 0)) + suffix)(ctx, W, H, W * .5, H * .45, ...Object.values(bindings));
  return { ctx, variables };
}
function actualJejunum(W, H) {
  const marker = source.indexOf('// Jejunal loops sit ventrally while the porcine spiral colon forms a watch-spring coil.');
  const begin = source.indexOf('drawEntericBowel(', marker), ending = "'pig-small-intestine');", end = source.indexOf(ending, begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing actual pig jejunum');
  let result;
  new Function('drawEntericBowel', 'W', 'H', 'cx', 'cy', source.slice(begin, end + ending.length))((start, curves, width) => {
    const ctx = new Context(); ctx.beginPath(); ctx.moveTo(...start); for (const curve of curves) ctx.bezierCurveTo(...curve);
    result = { name: 'jejunum', start, curves, width, paths: samplePath(ctx.path) };
  }, W, H, W * .5, H * .45);
  return result;
}
function actualLaterPaths(W, H) {
  const pancreaticGeometry = production('pigPancreaticGeometry'), pancreaticTrace = production('tracePigPancreaticRegion');
  const pancreaticDraw = production('drawPigPancreaticSurface', { pigPancreaticGeometry: pancreaticGeometry, tracePigPancreaticRegion: pancreaticTrace });
  const pancreaticFills = [true, false].map(detailed => {
    const ctx = new Context(); pancreaticDraw(ctx, { width: W, height: H, detailed });
    const fill = ctx.events.find(e => e.operation === 'fill');
    if (!fill || fill.path.at(-1)[0] !== 'closePath') throw Error('Missing actual closed pancreatic fill');
    return { name: detailed ? 'pancreas-detailed' : 'pancreas-fallback', paths: samplePath(fill.path) };
  });
  const membrane = executeSection('// Jejunal loops sit ventrally while the porcine spiral colon forms a watch-spring coil.', 'ctx.fillStyle', W, H);
  const filled = [...pancreaticFills,
    { name: 'mesentery', paths: samplePath(membrane.ctx.path) }];
  let bladderVariables;
  for (const sceneDetail of [true, false]) {
    const tracer = (ctx, ...args) => production('traceVisceralFluidSac', { ctx, sceneDetail,
      highContrastEnabled: false, d: { visualRealism: 'realistic' }, visualRealism: 'realistic' })(...args);
    const bladder = executeSection('var pigBladderX =', 'var pigBladderVolume', W, H,
      ctx => ({ traceVisceralFluidSac: (...args) => tracer(ctx, ...args) }), true);
    filled.push({ name: sceneDetail ? 'bladder-detailed' : 'bladder-fallback', paths: samplePath(bladder.ctx.path) });
    bladder.ctx.restore();
    bladderVariables = bladder.variables;
  }
  const lineEvents = (ctx, name) => ctx.events.filter(e => e.operation === 'stroke').map((e, i) => ({
    name: name + (i ? '-' + i : ''), paths: samplePath(e.path), width: e.width }));
  const strokes = [actualJejunum(W, H)];
  const colonStart = source.indexOf('var colonCx ='), tubeStart = source.indexOf('strokeAnatomicalTube(', colonStart), colonEnd = source.indexOf(');', tubeStart) + 2;
  if (colonStart < 0 || tubeStart < colonStart || colonEnd <= tubeStart) throw Error('Missing actual spiral colon');
  const colon = new Context();
  new Function('ctx', 'W', 'H', 'cx', 'cy', 'strokeAnatomicalTube', source.slice(colonStart, colonEnd))(
    colon, W, H, W * .5, H * .45, width => { colon.lineWidth = width; colon.stroke(); });
  strokes.push(...lineEvents(colon, 'spiral-colon'));
  const urachus = executeSection('ctx.beginPath();ctx.moveTo(pigBladderX-W*0.008', 'ctx.stroke();', W, H, bladderVariables, true, true);
  strokes.push(...lineEvents(urachus.ctx, 'urachus'));
  const vein = executeSection('// Umbilical vein courses to the liver;', 'ctx.stroke();', W, H, {}, false, true);
  strokes.push(...lineEvents(vein.ctx, 'umbilical-vein'));
  const arteries = executeSection('[-1,1].forEach(function (arterySide)', '});', W, H, bladderVariables, true, true);
  strokes.push(...lineEvents(arteries.ctx, 'umbilical-artery'));
  return { filled, strokes };
}

const geometry = production('pigSplenicGeometry'), trace = production('tracePigSplenicRegion');
function tracePath(region, W, H, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function mutatePath(ctx) { ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001); }
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix);
  const contact = vi.fn((...args) => { ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path) }); mutatePath(ctx); });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path) });
    ctx.save(); try { ctx.clip(); mutatePath(ctx); } finally { ctx.restore(); }
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawPigSplenicSurface', { pigSplenicGeometry: geometry, tracePigSplenicRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}
function productionObject(name) {
  const match = new RegExp('^([ \\t]*)var ' + name + ' = \\{', 'm').exec(source);
  if (!match) throw Error('Missing production object: ' + name);
  const start = source.indexOf('{', match.index), ending = new RegExp('^' + match[1] + '};[ \\t]*\\r?$', 'gm');
  ending.lastIndex = start; const end = ending.exec(source);
  if (!end) throw Error('Missing production object ending: ' + name);
  return new Function('return (' + source.slice(start, end.index + match[1].length + 1) + ');')();
}

describe('registered elongated fetal pig spleen', () => {
  it.each(dimensions)('keeps its closed contour in the physical gastric-side frame and actual coelom at %s by %s', (W, H) => {
    const g = geometry(W, H), path = tracePath(g.region, W, H), points = samplePath(path)[0], cavity = new Context();
    production('tracePigCoelom', { ctx: cavity, W, H, cx: W * .5, cy: H * .45 })(cavity);
    const boundary = samplePath(cavity.path)[0];
    expect(g.region.curves).toHaveLength(8); expect(g.region.curves.at(-1)[2]).toEqual(g.region.start);
    expect(path.filter(op => op[0] === 'bezierCurveTo')).toHaveLength(8); expect(path.at(-1)).toEqual(['closePath']);
    const co = Math.cos(g.frame.rotation), si = Math.sin(g.frame.rotation), local = [];
    for (const p of points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(contains(p, boundary)).toBe(true);
      const dx = p.x - g.center.x * W, dy = p.y - g.center.y * H;
      local.push({ x: (dx * co + dy * si) / g.frame.radiusX, y: (-dx * si + dy * co) / g.frame.radiusY });
      expect(p.x / W).toBeGreaterThanOrEqual(g.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.bounds.maxX + 1e-12);
      expect(p.y / H).toBeGreaterThanOrEqual(g.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(g.bounds.maxY + 1e-12);
    }
    expect(Math.min(...local.map(p => p.x))).toBeGreaterThan(-1); expect(Math.max(...local.map(p => p.x))).toBeLessThan(1);
    expect(Math.min(...local.map(p => p.y))).toBeGreaterThan(-1.01); expect(Math.max(...local.map(p => p.y))).toBeLessThan(1.01);
    expect(Math.max(...local.map(p => p.y)) - Math.min(...local.map(p => p.y)))
      .toBeGreaterThan(Math.max(...local.map(p => p.x)) - Math.min(...local.map(p => p.x)));
    expect(contains({ x: g.target.x * W, y: g.target.y * H }, points)).toBe(true);
    expect(distance({ x: g.target.x * W, y: g.target.y * H }, [points])).toBeGreaterThan(1);
    expect(g.extent.x).toBeCloseTo(Math.max(g.center.x - g.bounds.minX, g.bounds.maxX - g.center.x), 12);
    expect(g.extent.y).toBeCloseTo(Math.max(g.center.y - g.bounds.minY, g.bounds.maxY - g.center.y), 12);
  });

  it('retains the same physical profile across aspect changes without stretching its rotated anatomy coordinates', () => {
    const localPoints = dimensions.map(([W, H]) => {
      const g = geometry(W, H), co = Math.cos(g.frame.rotation), si = Math.sin(g.frame.rotation);
      return [g.region.start, ...g.region.curves.flat()].map(p => {
        const dx = (p.x - g.center.x) * W, dy = (p.y - g.center.y) * H;
        return { x: (dx * co + dy * si) / g.frame.radiusX, y: (-dx * si + dy * co) / g.frame.radiusY };
      });
    });
    for (const points of localPoints.slice(1)) points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(localPoints[0][i].x, 10); expect(p.y).toBeCloseTo(localPoints[0][i].y, 10);
    });
  });

  it.each(dimensions)('keeps its target clear of later viscera and fetal vessels at %s by %s', (W, H) => {
    const g = geometry(W, H), p = { x: g.target.x * W, y: g.target.y * H }, later = actualLaterPaths(W, H);
    expect(later.filled.map(e => e.name)).toEqual(['pancreas-detailed', 'pancreas-fallback', 'mesentery', 'bladder-detailed', 'bladder-fallback']);
    expect(later.strokes.map(e => e.name)).toEqual(['jejunum', 'spiral-colon', 'urachus',
      'umbilical-vein', 'umbilical-artery', 'umbilical-artery-1']);
    for (const { paths } of later.filled) {
      expect(paths[0].length).toBeGreaterThan(100); expect(contains(p, paths[0])).toBe(false);
      expect(distance(p, paths)).toBeGreaterThan(2);
    }
    for (const { paths, width } of later.strokes) {
      expect(paths[0].length).toBeGreaterThan(2); expect(width).toBeGreaterThan(0);
      expect(distance(p, paths) - width / 2).toBeGreaterThan(2);
    }
    const profile = samplePath(tracePath(g.region, W, H))[0];
    const target = production('paintedSmallStructurePoint', { spec: { bodyShape: 'pig' }, pigSplenicGeometry: geometry,
      queryDissectionNode: () => ({ _logicalW: W, _logicalH: H }) });
    for (const id of ['stomach_p', 'pancreas_p']) {
      const point = production('paintedSmallStructurePoint', { spec: { bodyShape: 'pig' },
        pigGastricGeometry: production('pigGastricGeometry'), pigPancreaticGeometry: production('pigPancreaticGeometry') })({ id });
      expect(contains({ x: point.x * W, y: point.y * H }, profile)).toBe(false);
      expect(distance({ x: point.x * W, y: point.y * H }, [profile])).toBeGreaterThan(2);
    }
    expect(target({ id: 'spleen_p' })).toEqual(g.target);
  });

  it('creates fresh geometry and rejects dimensions that cannot produce a finite visible organ', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(first);
    first.target.x = 100; first.region.curves[0][0].x = 100; first.bounds.minY = -100; expect(geometry()).toEqual(saved);
    for (const [W, H] of [[0, 600], [.99, 600], [500, .5], [500, -1], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    const ctx = new Context(); for (const region of [null, {}, { start: {} }]) expect(trace(ctx, region, 500, 600)).toBe(false);
    expect(trace(null, geometry().region, 500, 600)).toBe(false); expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });
});

describe('bounded whole splenic capsule rendering', () => {
  it.each(dimensions)('paints one exact closed capsule and re-traces after material callbacks at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height), expected = tracePath(g.region, width, height);
    expect(f.draw()).toBe(true); expect(f.contact).toHaveBeenCalledTimes(1); expect(f.finish).toHaveBeenCalledTimes(1);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke']);
    expect(painting.every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    expect(painting[0].fill.kind).toBe('linear'); expect(painting[0].fill.stops).toHaveLength(4);
    expect(f.ctx.events.find(e => e.operation === 'contact').path).toEqual(expected);
    expect(f.ctx.events.find(e => e.operation === 'finish').path).toEqual(expected);
    expect(f.contact.mock.calls[0]).toEqual([g.extent.x * width, g.extent.y * height]);
    expect(f.finish.mock.calls[0]).toEqual([g.center.x * width, g.center.y * height, g.extent.x * width, g.extent.y * height, 'capsule', 'pig-spleen']);
    const clip = f.ctx.events.filter(e => e.operation === 'clip'); expect(clip).toHaveLength(1);
    expect(clip[0].path).toEqual(expected); expect(clip[0].path.at(-1)).toEqual(['closePath']);
    expect(painting.every(e => e.alpha === before.globalAlpha && e.composite === before.globalCompositeOperation)).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('keeps the same recognizable profile with two flat paints in clarity modes at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(), g = geometry(width, height); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke']);
    expect(typeof painting[0].fill).toBe('string'); expect(painting.every(e => JSON.stringify(e.path) === JSON.stringify(tracePath(g.region, width, height)))).toBe(true);
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'gradient' || e.operation === 'clip')).toBe(false);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('responds to directional illumination without moving anatomy or the registered target', () => {
    const left = fixture({ lightDirection: 'left' }), right = fixture({ lightDirection: 'right' }); left.draw(); right.draw();
    const a = paints(left.ctx), b = paints(right.ctx); expect(a.map(e => e.path)).toEqual(b.map(e => e.path));
    expect(a[0].fill.args[0]).toBeLessThan(a[0].fill.args[2]); expect(b[0].fill.args[0]).toBeGreaterThan(b[0].fill.args[2]);
    expect(a[0].fill.stops).toEqual(b[0].fill.stops);
  });

  it.each([.84, .95])('preserves mirrored affine state, parent clips and inherited tissue opacity %s', alpha => {
    const f = fixture({}, [-2.7, .2, .3, 3, 800, -175]); f.ctx.globalAlpha = alpha; const before = f.ctx.state(); f.draw();
    const expected = tracePath(geometry().region, 500, 600, before.matrix);
    expect(paints(f.ctx).every(e => JSON.stringify(e.path) === JSON.stringify(expected) && e.alpha === alpha)).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['contact', 'gradient', 'fill', 'border', 'finish'])('restores all parent state after an injected %s failure', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected splenic error'); };
    if (location === 'contact') f.options.contact = fail;
    else if (location === 'finish') f.options.finish = fail;
    else if (location === 'gradient') f.ctx.createLinearGradient = fail;
    else if (location === 'fill') f.ctx.fill = fail;
    else f.ctx.stroke = fail;
    expect(f.draw).toThrow('Injected splenic error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('safely renders without optional callbacks and does no work for invalid dimensions', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true); expect(paints(f.ctx)).toHaveLength(2); expect(f.ctx.stack).toEqual([]);
    for (const input of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: .5 }, { width: undefined }]) {
      const invalid = fixture(input), before = invalid.ctx.state(); expect(invalid.draw()).toBe(false);
      expect(invalid.ctx.events).toEqual([]); expect(invalid.ctx.state()).toEqual(before); expect(invalid.ctx.stack).toEqual([]);
    }
    expect(f.rawDraw(null, f.options)).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});

describe('selectable splenic model integration', () => {
  it('appends the new spleen once while retaining every existing pig organ badge', () => {
    const specs = productionObject('SPECIMENS'), organs = specs.pig.organs.organs, ids = organs.map(o => o.id);
    expect(ids.slice(0, -1)).toEqual(['heart_p', 'lungs_p', 'liver_p', 'stomach_p', 'sm_int_p', 'lg_int_p', 'kidneys_p', 'thymus_p', 'pancreas_p', 'bladder_p']);
    expect(ids.at(-1)).toBe('spleen_p'); expect(new Set(ids).size).toBe(ids.length);
    const all = production('allSpecimenStructures', { spec: specs.pig })();
    expect(all.filter(o => o.id === 'spleen_p')).toHaveLength(1);
    const spleen = organs.at(-1); expect(spleen.name).toBe('Spleen'); expect(spleen.fn.length).toBeGreaterThan(20); expect(spleen.clinical.length).toBeGreaterThan(20);
  });

  it('uses a painted target before seed variation or generic view offsets in every presentation', () => {
    const organ = productionObject('SPECIMENS').pig.organs.organs.find(o => o.id === 'spleen_p'); expect(organ).toBeDefined();
    for (const [W, H] of dimensions) for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const d = { visualRealism: mode, anatomicalView: view, variationSeed: 19 };
      const bindings = { spec: { bodyShape: 'pig' }, pigSplenicGeometry: geometry,
        queryDissectionNode: () => ({ _logicalW: W, _logicalH: H, width: W * 3, height: H * 3 }), d, visualRealism: mode,
        specimenVariationValue: () => { throw Error('A registered capsule target must not jitter'); },
        viewSpecificOrganPoint: () => { throw Error('A registered capsule target must not get a generic view offset'); } };
      const point = production('variedOrganPoint', { ...bindings, paintedSmallStructurePoint: production('paintedSmallStructurePoint', bindings) })(organ);
      expect(point).toEqual(geometry(W, H).target);
    }
  });

  it('keeps dorsal occlusion and normal deep exposure semantics for the appended organ', () => {
    const VIEW_OCCLUSIONS = productionObject('VIEW_OCCLUSIONS'), organ = { id: 'spleen_p', name: 'Spleen' };
    for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const d = { anatomicalView: view }, visibility = production('viewOrganVisibility', { VIEW_OCCLUSIONS, spec: { bodyShape: 'pig' }, d, anatomicalView: view });
      expect(visibility(organ)).toBe(view === 'dorsal' ? 'occluded' : 'visible');
      const depth = production('structureOpticalDepth', { viewOrganVisibility: visibility, activeLayer: 'organs', currentLayerIdx: 2 });
      expect(depth(organ)).toBe('deep');
      const exposure = production('structureExposureState', { viewOrganVisibility: visibility, currentLayerIdx: 2,
        structureOpticalDepth: depth, procedureExposureData: () => ({ score: 100 }), dissHash: () => 0, specimen: 'pig', activeLayer: 'organs', currentProcedure: {} });
      expect(exposure(organ, {})).toBe(view === 'dorsal' ? 'occluded' : 'visible');
    }
  });

  it('labels the elongated shape without changing the generic compact inspection footprint', () => {
    const organs = productionObject('SPECIMENS').pig.organs.organs;
    const footprint = production('structureInspectionFootprint', { structureOpticalDepth: () => 'deep', W: 500, H: 600,
      organs, spec: { bodyShape: 'pig' }, specimen: 'pig' });
    const splenic = footprint({ id: 'spleen_p', name: 'Spleen' }), reference = footprint({ id: 'reference', name: 'Compact structure' });
    expect(splenic.morphologyLabel).toBe('ELONGATE'); expect(splenic.morphology).toBe('compact');
    expect({ ...splenic, morphologyLabel: reference.morphologyLabel }).toEqual(reference);
  });
});
