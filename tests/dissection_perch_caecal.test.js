import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8'), bodies = new Map();
function production(name, bindings = {}) {
  if (!bodies.has(name)) {
    const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
    if (matches.length !== 1) throw Error('Expected one production function: ' + name);
    const match = matches[0], start = match.index + match[1].length, ending = '\n' + match[1] + '}', end = source.indexOf(ending, start);
    if (end < start) throw Error('Missing function ending: ' + name);
    bodies.set(name, source.slice(start, end + ending.length));
  }
  return new Function(...Object.keys(bindings), 'return (' + bodies.get(name) + ');')(...Object.values(bindings));
}
const dimensions = [[500, 600], [1000, 600], [320, 900]];
function cubic([a, b, c, d], t) { const u = 1 - t; return {
  x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
  y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y,
}; }
function samples(region, count = 48) {
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
function distance(p, points, closed = false) {
  let result = Infinity;
  for (let i = 0; i < (closed ? points.length : points.length - 1); i++) {
    const a = points[i], b = points[(i + 1) % points.length], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    result = Math.min(result, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
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
  getTransform() { const [a, b, c, d, e, f] = this.matrix; return { a, b, c, d, e, f }; }
  point(x, y) { const m = this.matrix; return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }; }
  beginPath() { this.path = []; this.shape = []; this.last = null; }
  moveTo(x, y) { this.path.push(['moveTo', x, y]); this.last = this.point(x, y); this.shape.push(this.last); }
  lineTo(x, y) { this.path.push(['lineTo', x, y]); this.last = this.point(x, y); this.shape.push(this.last); }
  bezierCurveTo(...c) {
    this.path.push(['bezierCurveTo', ...c]); const ps = [this.last, this.point(c[0], c[1]), this.point(c[2], c[3]), this.point(c[4], c[5])];
    for (let i = 1; i <= 100; i++) this.shape.push(cubic(ps, i / 100)); this.last = ps[3];
  }
  ellipse(x, y, rx, ry, rotation, ...rest) { this.path.push(['ellipse', x, y, rx, ry, rotation, ...rest]); }
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
    lightIntensity: 68, condition: 'standard', ...overrides }, ctx = new Context(matrix);
  const geometry = production('perchCaecalGeometry'), trace = production('tracePerchCaecalRegion');
  const draw = production('drawPerchPyloricCaeca', { perchCaecalGeometry: geometry, tracePerchCaecalRegion: trace });
  return { ctx, options, geometry, trace, draw: () => draw(ctx, options), rawDraw: draw };
}
function actualPath(startComment, ending, W, H) {
  const start = source.indexOf(startComment), end = source.indexOf(ending, start), ctx = new Context();
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  new Function('ctx', 'W', 'H', 'cx', 'cy', source.slice(start, end))(ctx, W, H, W * .5, H * .45);
  return ctx;
}

describe('registered perch pyloric caeca', () => {
  it.each(dimensions)('keeps three closed blind pouches within the actual cutaway at %s by %s', (W, H) => {
    const g = production('perchCaecalGeometry')(W, H), ctx = new Context();
    production('tracePerchCoelom', { ctx, W, H, cx: .5 * W, cy: .45 * H })(ctx);
    expect([g.width, g.height]).toEqual([W, H]); expect(g.caeca).toHaveLength(3);
    for (const c of g.caeca) {
      expect(c.curves.length).toBeGreaterThanOrEqual(4); expect(c.curves.length).toBeLessThanOrEqual(8);
      expect(c.curves.at(-1)[2]).toEqual(c.start); expect(c.centerline.curves).toHaveLength(1);
      const ps = samples(c), pixels = ps.map(p => ({ x: p.x * W, y: p.y * H }));
      for (const p of pixels) expect(contains(p, ctx.shape)).toBe(true);
      expect(Math.min(...pixels.map(p => distance(p, ctx.shape, true)))).toBeGreaterThan(2);
      for (const p of ps) {
        expect(p.x).toBeGreaterThanOrEqual(c.bounds.minX); expect(p.x).toBeLessThanOrEqual(c.bounds.maxX);
        expect(p.y).toBeGreaterThanOrEqual(c.bounds.minY); expect(p.y).toBeLessThanOrEqual(c.bounds.maxY);
        expect(p.x).toBeGreaterThan(.495); expect(p.x).toBeLessThan(.565); expect(p.y).toBeGreaterThan(.510); expect(p.y).toBeLessThan(.557);
      }
      expect(contains(c.center, ps)).toBe(true); expect(Math.hypot(c.frame.nx, c.frame.ny)).toBeCloseTo(1, 12);
      expect(c.frame.nx * c.frame.tx + c.frame.ny * c.frame.ty).toBeCloseTo(0, 12);
      expect(c.frame.halfWidthPx).toBeGreaterThan(W * .0025);
      expect(c.frame.lengthPx).toBeGreaterThan(c.frame.halfWidthPx * 3);
      expect(c.frame.lengthPx).toBeLessThan(H * .05);
      const tip = c.centerline.curves[0][2]; expect(contains(tip, ps)).toBe(true);
    }
  });

  it.each(dimensions)('attaches all three origins to the actual intestine and keeps an exposed filled/stroked target at %s by %s', (W, H) => {
    const g = production('perchCaecalGeometry')(W, H), bowel = actualPath('// Intestine loops compactly', 'strokeAnatomicalTube', W, H);
    for (const c of g.caeca) {
      expect(distance({ x: c.centerline.start.x * W, y: c.centerline.start.y * H }, bowel.shape)).toBeLessThan(.01);
    }
    const middle = g.caeca[1], target = { x: g.target.x * W, y: g.target.y * H };
    expect(contains(g.target, samples(middle))).toBe(true);
    expect(distance(target, samples(middle.centerline, 100).map(p => ({ x: p.x * W, y: p.y * H })))).toBeLessThan(.01);
    expect(distance(target, bowel.shape) - W * .0045).toBeGreaterThan(2.5);
    expect(g.target.x).toBeGreaterThan(.52); expect(g.target.y).toBeGreaterThan(.535);
  });

  it.each(dimensions)('joins the stomach to the corrected intestinal origin without exposing a fourth pouch at %s by %s', (W, H) => {
    const g = production('perchCaecalGeometry')(W, H), stomach = actualPath('// J-shaped stomach passes', 'var perchStomachGradient', W, H), cavity = new Context();
    production('tracePerchCoelom', { ctx: cavity, W, H, cx: .5 * W, cy: .45 * H })(cavity);
    expect(contains({ x: g.inlet.start.x * W, y: g.inlet.start.y * H }, stomach.shape)).toBe(true);
    expect(g.inlet.curves.at(-1)[2]).toEqual(g.caeca[0].centerline.start);
    for (const p of samples(g.inlet)) {
      const pixel = { x: p.x * W, y: p.y * H }; expect(contains(pixel, cavity.shape)).toBe(true);
      expect(distance(pixel, cavity.shape, true) - W * .0045).toBeGreaterThan(10);
    }
    expect(g.caeca).toHaveLength(3);
  });

  it('returns independent deterministic anatomy and keeps the target fixed across aspect changes', () => {
    const geometry = production('perchCaecalGeometry'), first = geometry(500, 600), saved = structuredClone(first);
    expect(geometry(500, 600)).toEqual(first);
    first.caeca[0].curves[0][0].x = 100; first.caeca[1].centerline.start.y = 100; first.target.y = 100;
    expect(geometry(500, 600)).toEqual(saved);
    for (const [W, H] of dimensions) expect(geometry(W, H).target).toEqual(saved.target);
    expect(geometry(1000, 600).caeca[1].curves).not.toEqual(saved.caeca[1].curves);
  });

  it('registers the painted target before seed jitter, DPR or independent organ-only view offsets', () => {
    const geometry = production('perchCaecalGeometry'), organ = { id: 'pyloric_ceca', name: 'Pyloric Ceca', x: .50, y: .53 };
    for (const [W, H] of dimensions) {
      const bindings = { spec: { bodyShape: 'fish' }, perchCaecalGeometry: geometry,
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

  it.each(dimensions)('clips all serosal material independently with bounded work at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = f.geometry(width, height); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx), clips = f.ctx.events.filter(event => event.operation === 'clip');
    expect(painting).toHaveLength(21); expect(clips).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      const expected = new Context(); f.trace(expected, g.caeca[i], width, height);
      expect(clips[i].path).toEqual(expected.path);
      const group = painting.slice(i * 7, i * 7 + 7); expect(group[0].operation).toBe('fill'); expect(group[0].path).toEqual(expected.path);
      expect(group[0].clips).toEqual(before.clips);
      expect(group.slice(1).every(event => event.clips.length === before.clips.length + 1 && event.clips.at(-1) === clips[i].path)).toBe(true);
      expect(group[1].operation).toBe('stroke'); expect(group[1].path).toEqual(expected.path);
      expect(group.filter(event => event.path[0]?.[0] === 'ellipse')).toHaveLength(3);
    }
    expect(painting.every(event => event.alpha === before.globalAlpha && event.cap === 'round' && event.join === 'round' &&
      event.composite === 'source-over' && event.dash.length === 0 && event.shadow.every(value => value === 0))).toBe(true);
    expect(painting.every(event => JSON.stringify(event.matrix) === JSON.stringify(before.matrix))).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each([
    ['Guided', { mode: 'guided', sceneDetail: true, highContrastEnabled: false }, 15],
    ['Accessible', { mode: 'accessible', sceneDetail: true, highContrastEnabled: false }, 3],
    ['high contrast', { mode: 'realistic', sceneDetail: true, highContrastEnabled: true }, 3],
    ['detail off', { mode: 'realistic', sceneDetail: false, highContrastEnabled: false }, 3],
  ])('retains the actual shared tube finish on the three corrected centerlines in %s', (_mode, state, count) => {
    const f = fixture({ detailed: false, accessible: state.mode === 'accessible' }), before = f.ctx.state();
    f.options.strokeTeachingTube = production('strokeAnatomicalTube', { ctx: f.ctx, d: { visualRealism: state.mode }, visualRealism: state.mode,
      sceneDetail: state.sceneDetail, highContrastEnabled: state.highContrastEnabled, lightDirection: 'left' });
    expect(f.draw()).toBe(true); const painting = paints(f.ctx), perCaecum = count / 3;
    expect(painting).toHaveLength(count); expect(f.ctx.events.some(event => event.operation === 'clip')).toBe(false);
    for (let i = 0; i < 3; i++) {
      const expected = new Context(); f.trace(expected, f.geometry(500, 600).caeca[i].centerline, 500, 600, false);
      expect(expected.path.at(-1)[0]).toBe('bezierCurveTo');
      expect(painting.slice(i * perCaecum, (i + 1) * perCaecum).every(event => JSON.stringify(event.path) === JSON.stringify(expected.path))).toBe(true);
      const base = painting[i * perCaecum + (perCaecum === 1 ? 0 : 1)];
      expect(base.stroke).toBe(f.options.accessible ? '#fef3c7' : '#dbbb94'); expect(base.width).toBe(500 * .005);
    }
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('provides the same three unclosed fallback centerlines when the optional teaching callback is absent', () => {
    const f = fixture({ detailed: false, accessible: true }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting).toHaveLength(3);
    expect(painting.every(event => event.operation === 'stroke' && event.stroke === '#fef3c7' && event.path.at(-1)[0] === 'bezierCurveTo')).toBe(true);
    expect(f.ctx.state()).toEqual(before);
  });

  it('keeps contour, grain and work stable under DPR, mirroring, shear, pan and lighting changes', () => {
    const a = fixture(), b = fixture(), left = fixture({}, [1, 0, 0, 1, 0, 0]), right = fixture({ lightDirection: 'right', lightIntensity: 100, moisture: 100 }, [-3, .4, .2, 3, 900, -50]);
    for (const f of [a, b, left, right]) f.draw(); expect(a.ctx.events).toEqual(b.ctx.events);
    expect(paints(left.ctx).map(event => event.path)).toEqual(paints(right.ctx).map(event => event.path));
    expect(paints(left.ctx).map(event => event.width)).toEqual(paints(right.ctx).map(event => event.width));
    expect(paints(left.ctx)[0].fill.args).not.toEqual(paints(right.ctx)[0].fill.args);
    expect(paints(left.ctx)[0].fill.stops).toEqual(paints(right.ctx)[0].fill.stops);
  });

  it('changes wet sheen with hydration, lighting and preservation while retaining the gross external surface', () => {
    const wet = fixture({ moisture: 100, lightIntensity: 100 }), dry = fixture({ moisture: 0, lightIntensity: 20, condition: 'dehydrated' }), preserved = fixture({ moisture: 100, lightIntensity: 100, condition: 'preserved' });
    for (const f of [wet, dry, preserved]) f.draw();
    const opacity = f => Number(paints(f.ctx)[3].fill.stops[0][1].split(',').at(-1).slice(0, -1));
    expect(opacity(wet)).toBeGreaterThan(opacity(preserved)); expect(opacity(preserved)).toBeGreaterThan(opacity(dry)); expect(opacity(wet)).toBeLessThanOrEqual(.20);
    expect(paints(wet.ctx).map(event => event.path)).toEqual(paints(dry.ctx).map(event => event.path));
    const invalid = fixture({ moisture: Infinity, lightIntensity: NaN }); expect(invalid.draw()).toBe(true);
    expect(JSON.stringify(invalid.ctx.events)).not.toMatch(/NaN|Infinity/);
  });

  it.each([
    ['Realistic', {}, true], ['Guided', { fishRealistic: false }, false], ['Accessible', { fishAccessible: true }, false],
    ['high contrast', { highContrastEnabled: true }, false], ['detail off', { sceneDetail: false }, false],
  ])('uses the actual production mode gate in %s', (_mode, overrides, detailed) => {
    const match = /drawPerchPyloricCaeca\(ctx,\s*(\{[\s\S]*?\})\);/.exec(source); expect(match).not.toBeNull();
    const bindings = { W: 500, H: 600, fishRealistic: true, sceneDetail: true, fishAccessible: false, highContrastEnabled: false,
      liveTissueState: { moisture: 76 }, d: { lightIntensity: 68 }, lightDirection: 'left', specimenCondition: 'standard',
      strokeAnatomicalTube: () => {}, ...overrides };
    const options = new Function(...Object.keys(bindings), 'return (' + match[1] + ');')(...Object.values(bindings));
    expect(options.detailed).toBe(detailed); expect(options.accessible).toBe(bindings.fishAccessible);
    expect(options.lightIntensity).toBe(68); expect(options.strokeTeachingTube).toBe(bindings.strokeAnatomicalTube);
    const f = fixture(options); expect(f.draw()).toBe(true); expect(f.geometry(500, 600).caeca).toHaveLength(3);
    expect(f.ctx.events.filter(event => event.operation === 'clip')).toHaveLength(detailed ? 3 : 0);
  });

  it.each(['base fill', 'pouch clip', 'axial wash', 'fine grain', 'teaching callback'])('restores the complete context after an injected %s error', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected caecal error'); };
    if (location === 'base fill') f.ctx.fill = fail;
    else if (location === 'pouch clip') f.ctx.clip = fail;
    else if (location === 'fine grain') f.ctx.ellipse = fail;
    else if (location === 'teaching callback') { f.options.detailed = false; f.options.strokeTeachingTube = fail; }
    else { let count = 0; const original = f.ctx.createLinearGradient.bind(f.ctx); f.ctx.createLinearGradient = (...args) => ++count === 2 ? fail() : original(...args); }
    expect(f.draw).toThrow('Injected caecal error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('rejects invalid dimensions before touching the canvas', () => {
    const f = fixture(), before = f.ctx.state();
    for (const [width, height] of [[0, 600], [500, -1], [Infinity, 600], [500, NaN], ['500', 600], [500, '600']]) {
      expect(f.geometry(width, height)).toBeNull(); expect(f.rawDraw(f.ctx, { ...f.options, width, height })).toBe(false);
    }
    expect(f.rawDraw(null, f.options)).toBe(false); expect(f.ctx.events).toEqual([]); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('uses a pouch caption without changing generic overlay geometry or unrelated captions', () => {
    const footprint = production('structureInspectionFootprint', { structureOpticalDepth: () => 'deep', W: 500, H: 600,
      organs: Array.from({ length: 8 }), spec: { bodyShape: 'fish' }, specimen: 'perch' });
    const spleen = footprint({ id: 'spleen_f', name: 'Spleen' }), caeca = footprint({ id: 'pyloric_ceca', name: 'Pyloric Ceca' });
    expect(spleen.morphologyLabel).toBe('COMPACT'); expect(caeca).toEqual({ ...spleen, morphologyLabel: 'POUCHES' });
    expect(footprint({ id: 'liver_f', name: 'Liver' }).morphologyLabel).toBe('LOBED');
    expect(footprint({ id: 'spinal_cord', name: 'Spinal cord' }).morphologyLabel).toBe('TUBE');
    expect(footprint({ id: 'kidneys_f', name: 'Kidneys' }).morphologyLabel).toBe('RENAL');
  });

  it('keeps canonical and packaged source identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});
