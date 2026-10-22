import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8'), bodies = new Map();
function production(name, bindings = {}) {
  if (!bodies.has(name)) {
    const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
    if (matches.length !== 1) throw Error('Expected one production function: ' + name);
    const match = matches[0], start = match.index + match[1].length, ending = '\n' + match[1] + '}';
    const end = source.indexOf(ending, start);
    if (end < start) throw Error('Missing function ending: ' + name);
    bodies.set(name, source.slice(start, end + ending.length));
  }
  return new Function(...Object.keys(bindings), 'return (' + bodies.get(name) + ');')(...Object.values(bindings));
}
const dimensions = [[500, 600], [1000, 600], [320, 900]];
const legacy = { start: { x: .355, y: .362 }, curves: [
  [{ x: .445, y: .344 }, { x: .605, y: .350 }, { x: .690, y: .378 }],
  [{ x: .615, y: .381 }, { x: .455, y: .379 }, { x: .355, y: .389 }],
] };
function cubic([a, b, c, d], t) { const u = 1 - t; return {
  x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
  y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y,
}; }
function samples(region, count = 64) {
  const points = [region.start]; let p = region.start;
  for (const c of region.curves) { for (let i = 1; i <= count; i++) points.push(cubic([p, ...c], i / count)); p = c[2]; }
  return points;
}
function contains(p, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin',
  'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class Context {
  constructor(matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = [...matrix]; this.path = []; this.shape = []; this.clips = ['coelom']; this.events = []; this.stack = []; this.dash = [3, 2];
    Object.assign(this, { globalAlpha: .93, globalCompositeOperation: 'multiply', fillStyle: '#123456', strokeStyle: '#654321', lineWidth: 3,
      lineCap: 'butt', lineJoin: 'miter', shadowBlur: 5, shadowColor: '#876543', shadowOffsetX: 2, shadowOffsetY: -1 });
  }
  state() { return { matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash], ...Object.fromEntries(stateKeys.map(key => [key, this[key]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced canvas restore'); Object.assign(this, this.stack.pop()); }
  translate(x, y) { const m = this.matrix; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  rotate(t) { const m = this.matrix, c = Math.cos(t), s = Math.sin(t); this.matrix = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, -m[0] * s + m[2] * c, -m[1] * s + m[3] * c, m[4], m[5]]; }
  scale(x, y) { const m = this.matrix; this.matrix = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]]; }
  point(x, y) { const m = this.matrix; return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }; }
  beginPath() { this.path = []; this.shape = []; this.last = null; }
  moveTo(x, y) { this.path.push(['moveTo', x, y]); this.last = this.point(x, y); this.shape.push(this.last); }
  bezierCurveTo(...c) {
    this.path.push(['bezierCurveTo', ...c]); const ps = [this.last, this.point(c[0], c[1]), this.point(c[2], c[3]), this.point(c[4], c[5])];
    for (let i = 1; i <= 128; i++) this.shape.push(cubic(ps, i / 128)); this.last = ps[3];
  }
  ellipse(x, y, rx, ry, rotation, ...rest) {
    this.path.push(['ellipse', x, y, rx, ry, rotation, ...rest]);
    for (let i = 0; i < 256; i++) { const t = i / 256 * Math.PI * 2, u = rx * Math.cos(t), v = ry * Math.sin(t);
      this.shape.push(this.point(x + u * Math.cos(rotation) - v * Math.sin(rotation), y + u * Math.sin(rotation) + v * Math.cos(rotation))); }
  }
  closePath() { this.path.push(['closePath']); }
  clip() { const path = this.path.map(op => [...op]); this.clips = [...this.clips, path]; this.events.push({ operation: 'clip', path }); }
  setLineDash(dash) { this.dash = [...dash]; }
  createLinearGradient(...args) { return { kind: 'linear', args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } }; }
  color(style) { return typeof style === 'object' ? { kind: style.kind, args: [...style.args], stops: style.stops.map(stop => [...stop]) } : style; }
  paint(operation, args = []) { this.events.push({ operation, args, path: this.path.map(op => [...op]), fill: this.color(this.fillStyle),
    stroke: this.color(this.strokeStyle), width: this.lineWidth, alpha: this.globalAlpha, matrix: [...this.matrix], clips: [...this.clips],
    dash: [...this.dash], composite: this.globalCompositeOperation, cap: this.lineCap, join: this.lineJoin,
    shadow: [this.shadowBlur, this.shadowOffsetX, this.shadowOffsetY] }); }
  fill() { this.paint('fill'); } stroke() { this.paint('stroke'); } fillRect(...args) { this.paint('fillRect', args); }
}
const paints = ctx => ctx.events.filter(event => event.operation !== 'clip');
function fixture(overrides = {}, matrix = [-3, .2, .3, 3, 800, -175]) {
  const options = { width: 500, height: 600, detailed: true, accessible: false, lightDirection: 'left', moisture: 76,
    intensity: 68, condition: 'standard', ...overrides }, ctx = new Context(matrix);
  const geometry = production('perchRenalGeometry'), trace = production('tracePerchRenalRegion');
  const draw = production('drawPerchRenalTissue', { perchRenalGeometry: geometry, tracePerchRenalRegion: trace });
  return { ctx, options, geometry, trace, draw: () => draw(ctx, options), rawDraw: draw };
}

describe('registered perch renal tissue', () => {
  it.each(dimensions)('keeps the detailed ribbon within the old renal footprint and actual coelom at %s by %s', (W, H) => {
    const g = production('perchRenalGeometry')(W, H), ctx = new Context();
    expect(g.fallback).toEqual(legacy); expect([g.width, g.height]).toEqual([W, H]);
    expect(g.detailed.curves.length).toBeLessThanOrEqual(16); expect(g.detailed.curves.at(-1)[2]).toEqual(g.detailed.start);
    production('tracePerchCoelom', { ctx, W, H, cx: W * .5, cy: H * .45 })(ctx);
    const cavity = ctx.shape.map(p => ({ x: p.x / W, y: p.y / H })), old = samples(legacy, 256);
    for (const p of samples(g.detailed)) { expect(contains(p, old)).toBe(true); expect(contains(p, cavity)).toBe(true); }
    expect(g.target).toEqual({ x: .515, y: .366 });
    expect(contains(g.target, samples(g.detailed))).toBe(true); expect(contains(g.target, old)).toBe(true); expect(contains(g.target, cavity)).toBe(true);
    expect(g.detailed.start.x).toBeGreaterThan(legacy.start.x);
  });

  it.each(dimensions)('keeps the target visible above actual detailed and fallback swim bladders throughout their pulse at %s by %s', (W, H) => {
    const g = production('perchRenalGeometry')(W, H), ctx = new Context(), point = { x: g.target.x * W, y: g.target.y * H };
    for (const detailed of [true, false]) for (const pulse of [-.0018, 0, .0018]) {
      const trace = production('tracePerchThinSac', { ctx, fishRealistic: detailed, sceneDetail: true, fishAccessible: false, highContrastEnabled: false });
      expect(trace(W * .515, H * .407, W * .120, H * (.032 + pulse), -.025, 'bladder')).toBe(true);
      expect(contains(point, ctx.shape)).toBe(false);
      expect(Math.min(...ctx.shape.map(p => Math.hypot(p.x - point.x, p.y - point.y)))).toBeGreaterThan(4);
    }
    expect(ctx.stack).toEqual([]); expect(ctx.matrix).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('registers the renal target before seed variation or organ-only view offsets', () => {
    const geometry = production('perchRenalGeometry'), organ = { id: 'kidneys_f', name: 'Kidneys', x: .52, y: .37 };
    for (const [W, H] of dimensions) {
      const bindings = { spec: { bodyShape: 'fish' }, perchRenalGeometry: geometry,
        queryDissectionNode: () => ({ _logicalW: W, _logicalH: H, width: W * 3, height: H * 3 }),
        d: { visualRealism: 'realistic', anatomicalView: 'dorsal', variationSeed: 1 },
        viewSpecificOrganPoint: () => { throw Error('Painted target must not receive an independent view offset'); },
        specimenVariationValue: () => { throw Error('Painted target must not receive independent jitter'); } };
      bindings.paintedSmallStructurePoint = production('paintedSmallStructurePoint', bindings);
      const varied = production('variedOrganPoint', bindings);
      for (const mode of ['realistic', 'guided', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) for (const seed of [1, 3, 19]) {
        Object.assign(bindings.d, { visualRealism: mode, anatomicalView: view, variationSeed: seed });
        expect(varied(organ)).toEqual(geometry(W, H).target);
      }
    }
  });

  it('returns deterministic independent contours without retaining edits across frames', () => {
    const geometry = production('perchRenalGeometry'), first = geometry(500, 600), saved = structuredClone(first);
    expect(geometry(500, 600)).toEqual(first);
    first.detailed.curves[0][0].x = 100; first.fallback.start.x = 100; first.target.y = 100;
    expect(geometry(500, 600)).toEqual(saved);
  });

  it.each(dimensions)('clips all surface material to the actual renal contour with bounded paint work at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), expected = new Context();
    f.trace(expected, f.geometry(width, height).detailed, width, height); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx), clips = f.ctx.events.filter(event => event.operation === 'clip');
    expect(painting).toHaveLength(17); expect(clips).toHaveLength(1); expect(clips[0].path).toEqual(expected.path);
    expect(painting[0].operation).toBe('fill'); expect(painting[0].path).toEqual(expected.path);
    expect(painting[0].clips).toEqual(before.clips);
    expect(painting.slice(1).every(event => event.clips.length === before.clips.length + 1 && event.clips.at(-1) === clips[0].path)).toBe(true);
    expect(painting[1].operation).toBe('stroke'); expect(painting[1].path).toEqual(expected.path);
    const grain = painting.filter(event => event.path[0]?.[0] === 'ellipse' && event.path[0][3] < 1);
    expect(grain).toHaveLength(6);
    expect(painting.every(event => event.alpha === before.globalAlpha && event.cap === 'round' && event.join === 'round' &&
      event.composite === 'source-over' && event.dash.length === 0 && event.shadow.every(value => value === 0))).toBe(true);
    expect(painting.every(event => JSON.stringify(event.matrix) === JSON.stringify(before.matrix))).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each([false, true])('retains the original two fallback paints, exact contour and gradient when accessible=%s', accessible => {
    for (const [width, height] of dimensions) {
      const f = fixture({ width, height, detailed: false, accessible }), before = f.ctx.state(), expected = new Context();
      f.trace(expected, legacy, width, height); expect(f.draw()).toBe(true);
      const painting = paints(f.ctx); expect(painting).toHaveLength(2); expect(f.ctx.events.some(event => event.operation === 'clip')).toBe(false);
      expect(painting.map(event => event.operation)).toEqual(['fill', 'stroke']);
      expect(painting.every(event => JSON.stringify(event.path) === JSON.stringify(expected.path))).toBe(true);
      expect(painting[0].fill).toEqual({ kind: 'linear', args: [width * .5, height * .45 - height * .102, width * .5, height * .45 - height * .060],
        stops: [[0, accessible ? '#7f1d1d' : 'rgba(69,26,31,0.98)'], [1, accessible ? '#991b1b' : 'rgba(103,35,39,0.94)']] });
      expect(painting[1].stroke).toBe('rgba(254,202,202,0.30)'); expect(painting[1].width).toBe(.7);
      expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
    }
  });

  it('keeps contours and fixed texture stable under DPR, mirroring, shear, pan and lamp changes', () => {
    const left = fixture({}, [1, 0, 0, 1, 0, 0]), right = fixture({ lightDirection: 'right', intensity: 100, moisture: 100 }, [-3, .4, .2, 3, 900, -50]);
    const a = fixture(), b = fixture(); for (const f of [left, right, a, b]) f.draw();
    expect(paints(left.ctx).map(event => event.path)).toEqual(paints(right.ctx).map(event => event.path));
    expect(paints(left.ctx).map(event => event.width)).toEqual(paints(right.ctx).map(event => event.width));
    const leftVolume = paints(left.ctx)[0].fill, rightVolume = paints(right.ctx)[0].fill;
    expect(leftVolume.args[0]).toBeLessThan(leftVolume.args[2]); expect(rightVolume.args[0]).toBeGreaterThan(rightVolume.args[2]);
    expect(leftVolume.stops).toEqual(rightVolume.stops); expect(a.ctx.events).toEqual(b.ctx.events);
  });

  it.each([
    ['Realistic', {}, true], ['Guided', { fishRealistic: false }, false],
    ['Accessible', { fishAccessible: true }, false], ['high contrast', { highContrastEnabled: true }, false],
    ['detail off', { sceneDetail: false }, false],
  ])('uses the production mode gate and retained fallback in %s', (_mode, overrides, detailed) => {
    const match = /drawPerchRenalTissue\(ctx,\s*(\{[\s\S]*?\})\);/.exec(source);
    expect(match).not.toBeNull();
    const bindings = { W: 500, H: 600, fishRealistic: true, sceneDetail: true, fishAccessible: false,
      highContrastEnabled: false, liveTissueState: { moisture: 76 }, d: { lightIntensity: 68 },
      lightDirection: 'left', specimenCondition: 'standard', ...overrides };
    const options = new Function(...Object.keys(bindings), 'return (' + match[1] + ');')(...Object.values(bindings));
    expect(options.detailed).toBe(detailed); expect(options.intensity).toBe(bindings.d.lightIntensity);
    expect(options.accessible).toBe(bindings.fishAccessible);
    const f = fixture(options), expected = new Context(), region = f.geometry(500, 600)[detailed ? 'detailed' : 'fallback'];
    f.trace(expected, region, 500, 600); expect(f.draw()).toBe(true);
    expect(paints(f.ctx)).toHaveLength(detailed ? 17 : 2); expect(paints(f.ctx)[0].path).toEqual(expected.path);
  });

  it('responds to lamp intensity, hydration and preservation through restrained wash opacity rather than changing anatomy', () => {
    const wet = fixture({ moisture: 100, intensity: 100 }), dry = fixture({ moisture: 0, intensity: 20, condition: 'dehydrated' }), preserved = fixture({ moisture: 100, intensity: 100, condition: 'preserved' });
    for (const f of [wet, dry, preserved]) f.draw();
    const opacity = f => Number(paints(f.ctx).find(event => event.operation === 'fillRect').fill.stops[1][1].split(',').at(-1).slice(0, -1));
    for (const f of [dry, preserved]) expect(paints(f.ctx).map(event => event.path)).toEqual(paints(wet.ctx).map(event => event.path));
    expect(opacity(wet)).toBeGreaterThan(opacity(preserved)); expect(opacity(preserved)).toBeGreaterThan(opacity(dry));
    expect(opacity(dry)).toBeGreaterThan(0); expect(opacity(wet)).toBeLessThan(.1);
    const invalid = fixture({ moisture: Infinity, intensity: NaN }); expect(invalid.draw()).toBe(true);
    expect(JSON.stringify(invalid.ctx.events)).not.toMatch(/NaN|Infinity/);
  });

  it.each(['base fill', 'contour clip', 'broad patch', 'fine grain', 'surface wash'])('restores the full parent context after an injected %s error', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected renal error'); };
    if (location === 'base fill') f.ctx.fill = fail;
    else if (location === 'contour clip') f.ctx.clip = fail;
    else if (location === 'surface wash') { let gradients = 0; const original = f.ctx.createLinearGradient.bind(f.ctx); f.ctx.createLinearGradient = (...args) => ++gradients === 2 ? fail() : original(...args); }
    else { const original = f.ctx.ellipse.bind(f.ctx); f.ctx.ellipse = (...args) => (location === 'broad patch' || args[2] < 1) ? fail() : original(...args); }
    expect(f.draw).toThrow('Injected renal error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('rejects invalid dimensions before touching the canvas', () => {
    const f = fixture(), before = f.ctx.state();
    for (const [width, height] of [[0, 600], [500, -1], [Infinity, 600], [500, NaN], ['500', 600], [500, '600']]) {
      expect(f.geometry(width, height)).toBeNull(); expect(f.rawDraw(f.ctx, { ...f.options, width, height })).toBe(false);
    }
    expect(f.rawDraw(null, f.options)).toBe(false); expect(f.ctx.events).toEqual([]);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('uses a renal caption without changing the existing generic morphology overlay or unrelated labels', () => {
    const footprint = production('structureInspectionFootprint', { structureOpticalDepth: () => 'deep', W: 500, H: 600,
      organs: Array.from({ length: 8 }), spec: { bodyShape: 'fish' }, specimen: 'perch' });
    const liver = footprint({ id: 'liver_f', name: 'Liver' }), kidney = footprint({ id: 'kidneys_f', name: 'Kidneys' });
    expect(liver.morphologyLabel).toBe('LOBED'); expect(kidney).toEqual({ ...liver, morphologyLabel: 'RENAL' });
    expect(footprint({ id: 'spinal_cord', name: 'Spinal cord' }).morphologyLabel).toBe('TUBE');
  });

  it('keeps canonical and packaged source identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});
