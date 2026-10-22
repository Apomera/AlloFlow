import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const productionBodies = new Map();
function production(name, bindings = {}) {
  if (!productionBodies.has(name)) {
    const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
    if (matches.length !== 1) throw Error('Expected one production function: ' + name);
    const match = matches[0], start = match.index + match[1].length, ending = '\n' + match[1] + '}';
    const end = source.indexOf(ending, start);
    if (end < start) throw Error('Missing function ending: ' + name);
    productionBodies.set(name, source.slice(start, end + ending.length));
  }
  return new Function(...Object.keys(bindings), 'return (' + productionBodies.get(name) + ');')(...Object.values(bindings));
}
const dimensions = [[500, 600], [1000, 600], [320, 900]];
function cubic([a, b, c, d], t) {
  const u = 1 - t;
  return { x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y };
}
function samples(start, curves) {
  const points = [start]; let p = start;
  for (const c of curves) { for (let step = 1; step <= 32; step++) points.push(cubic([p, ...c], step / 32)); p = c[2]; }
  return points;
}
function contains(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin',
  'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class Context {
  constructor(matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = [...matrix]; this.path = []; this.shape = []; this.clips = ['parent']; this.events = []; this.stack = []; this.dash = [4, 2];
    Object.assign(this, { globalAlpha: .83, globalCompositeOperation: 'multiply', fillStyle: '#123456', strokeStyle: '#654321', lineWidth: 3,
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
  lineTo(x, y) { this.path.push(['lineTo', x, y]); this.last = this.point(x, y); this.shape.push(this.last); }
  bezierCurveTo(...c) {
    this.path.push(['bezierCurveTo', ...c]); const ps = [this.last, this.point(c[0], c[1]), this.point(c[2], c[3]), this.point(c[4], c[5])];
    for (let i = 1; i <= 48; i++) this.shape.push(cubic(ps, i / 48)); this.last = ps[3];
  }
  ellipse(x, y, rx, ry, rotation, ...rest) {
    this.path.push(['ellipse', x, y, rx, ry, rotation, ...rest]);
    for (let i = 0; i < 128; i++) { const a = i / 128 * Math.PI * 2, u = rx * Math.cos(a), v = ry * Math.sin(a);
      this.shape.push(this.point(x + u * Math.cos(rotation) - v * Math.sin(rotation), y + u * Math.sin(rotation) + v * Math.cos(rotation))); }
  }
  closePath() { this.path.push(['closePath']); }
  clip() { const path = this.path.map(op => [...op]); this.clips = [...this.clips, path]; this.events.push({ operation: 'clip', path }); }
  setLineDash(dash) { this.dash = [...dash]; }
  gradient(kind, args) { return { kind, args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } }; }
  createLinearGradient(...args) { return this.gradient('linear', args); }
  createRadialGradient(...args) { return this.gradient('radial', args); }
  color(style) { return typeof style === 'object' ? { kind: style.kind, args: [...style.args], stops: style.stops.map(stop => [...stop]) } : style; }
  stroke() { this.events.push({ operation: 'stroke', path: this.path.map(op => [...op]), color: this.color(this.strokeStyle), width: this.lineWidth,
    alpha: this.globalAlpha, matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash], composite: this.globalCompositeOperation,
    cap: this.lineCap, join: this.lineJoin, shadow: [this.shadowBlur, this.shadowOffsetX, this.shadowOffsetY] }); }
}
function anatomy(W, H) {
  const centerline = production('earthwormCenterlinePoint'), frame = production('earthwormAnatomyFrame', { earthwormCenterlinePoint: centerline });
  const geometry = production('earthwormAorticGeometry', { earthwormAnatomyFrame: frame }), ctx = new Context();
  const bindings = { ctx, W, H, wormBaseWidth: W * .047, earthwormFrame: t => frame(t, W, H) };
  production('traceEarthwormBand', bindings)(.065, .945, .84, ctx);
  return { ctx, centerline, frame, geometry, cavity: [...ctx.shape], g: geometry(W, H) };
}
const paints = ctx => ctx.events.filter(event => event.operation === 'stroke');
function fixture(overrides = {}, matrix = [-3, .2, .3, 3, 800, -175]) {
  const options = { width: 500, height: 600, detailed: true, accessible: false, highContrast: false,
    moisture: 76, lightIntensity: 68, condition: 'standard', lightDirection: 'left', ...overrides };
  const f = anatomy(options.width, options.height), ctx = new Context(matrix);
  const trace = production('traceEarthwormAorticVessel');
  const field = production('traceEarthwormNephridialField', { earthwormAnatomyFrame: f.frame });
  const draw = production('drawEarthwormAorticArches', { earthwormAorticGeometry: f.geometry,
    traceEarthwormAorticVessel: trace, traceEarthwormNephridialField: field });
  return { ...f, ctx, options, trace, rawDraw: draw, draw(stage) { return draw(ctx, { ...options, stage }); } };
}
function pairPath(f, pair, stage) {
  const ctx = new Context(); ctx.beginPath();
  for (const arm of pair.arms) f.trace(ctx, stage === 'rear' ? arm.junction : arm.start,
    stage === 'rear' ? arm.rear : arm.front, f.options.width, f.options.height, true);
  return ctx.path;
}

describe('paired registered earthworm aortic arches', () => {
  it.each(dimensions)('keeps ten curved vessel arms inside the actual cavity and existing local envelopes at %s by %s', (W, H) => {
    const { g, cavity } = anatomy(W, H);
    expect(g.pairs).toHaveLength(5); expect([g.width, g.height]).toEqual([W, H]);
    let arms = 0;
    g.pairs.forEach((pair, index) => {
      expect(pair.t).toBe(.16 + index * .026); expect(pair.arms.map(arm => arm.side)).toEqual([-1, 1]);
      expect(pair.arms[0].start).toEqual(pair.arms[1].start);
      expect(pair.arms[0].rear.at(-1)[2]).toEqual(pair.arms[1].rear.at(-1)[2]);
      for (const arm of pair.arms) {
        expect(arm.front.at(-1)[2]).toEqual(arm.junction);
        for (const p of [...samples(arm.start, arm.front), ...samples(arm.junction, arm.rear)]) {
          const dx = p.x * W - pair.frame.point.x, dy = p.y * H - pair.frame.point.y;
          expect(Math.abs(dx * pair.frame.nx + dy * pair.frame.ny)).toBeLessThanOrEqual(pair.frame.width * .72 + 1e-9);
          expect(Math.abs(dx * pair.frame.tx + dy * pair.frame.ty)).toBeLessThanOrEqual(H * .009 + 1e-9);
          expect(contains({ x: p.x * W, y: p.y * H }, cavity)).toBe(true);
        }
        expect(arm.front.length + arm.rear.length).toBeLessThanOrEqual(4); arms++;
      }
    });
    expect(arms).toBe(10);
    for (const p of samples(g.dorsal.start, g.dorsal.curves)) expect(contains({ x: p.x * W, y: p.y * H }, cavity)).toBe(true);
  });

  it.each(dimensions)('uses the common aspect-aware body frame and exact shared dorsal attachments at %s by %s', (W, H) => {
    const { g, frame } = anatomy(W, H);
    expect(g.dorsal.curves).toHaveLength(6);
    const first = frame(.14, W, H), last = frame(.28, W, H);
    expect(g.dorsal.start).toEqual({ x: first.point.x / W, y: first.point.y / H });
    expect(g.dorsal.curves.at(-1)[2]).toEqual({ x: last.point.x / W, y: last.point.y / H });
    g.pairs.forEach((pair, i) => {
      expect(pair.frame).toEqual(frame(pair.t, W, H)); expect(g.dorsal.curves[i][2]).toEqual(pair.arms[0].start);
      const start = pair.arms[0].start, end = pair.arms[0].rear.at(-1)[2];
      for (const [p, sign] of [[start, -1], [end, 1]]) {
        const dx = p.x * W - pair.frame.point.x, dy = p.y * H - pair.frame.point.y;
        expect(dx * pair.frame.tx + dy * pair.frame.ty).toBeCloseTo(sign * H * .009, 9);
        expect(dx * pair.frame.nx + dy * pair.frame.ny).toBeCloseTo(0, 9);
      }
    });
  });

  it.each(dimensions)('puts the target on the exposed first right arm and clear of actual seminal vesicles at %s by %s', (W, H) => {
    const { g, frame, ctx, cavity } = anatomy(W, H), target = { x: g.target.x * W, y: g.target.y * H };
    const arm = g.pairs[0].arms.find(arm => arm.side === -1);
    expect(g.target).toEqual(arm.front.at(-1)[2]); expect(target.x).toBeGreaterThan(g.pairs[0].frame.point.x);
    expect(contains(target, cavity)).toBe(true);
    const traceVesicle = production('traceEarthwormSeminalVesicle', { ctx });
    [.205, .235, .265].forEach((t, i) => {
      const f = frame(t, W, H), size = [.85, 1, 1.25][i], rotation = Math.atan2(f.ty, f.tx) - Math.PI / 2;
      for (const side of [-1, 1]) for (const detailed of [true, false]) {
        traceVesicle(f.point.x + f.nx * f.width * .46 * side, f.point.y + f.ny * f.width * .46 * side,
          W * .007 * size, H * .008 * size, rotation, detailed);
        expect(contains(target, ctx.shape)).toBe(false);
        expect(Math.min(...ctx.shape.map(p => Math.hypot(p.x - target.x, p.y - target.y)))).toBeGreaterThan(15);
      }
    });
    expect(ctx.stack).toEqual([]); expect(ctx.matrix).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('registers the arch inspection target to anatomy before independent seed or view offsets', () => {
    for (const [W, H] of dimensions) {
      const f = anatomy(W, H), organ = { id: 'aortic_arches', name: 'Aortic Arches (5 pairs)', x: .52, y: .23 };
      const bindings = { spec: { bodyShape: 'worm' }, earthwormAorticGeometry: f.geometry, earthwormAnatomyFrame: f.frame,
        earthwormCenterlinePoint: f.centerline, queryDissectionNode: () => ({ _logicalW: W, _logicalH: H, width: W * 3, height: H * 3 }),
        d: { visualRealism: 'realistic', anatomicalView: 'dorsal', variationSeed: 19 },
        viewSpecificOrganPoint: () => { throw Error('Target must not receive an independent view offset'); },
        specimenVariationValue: () => { throw Error('Target must not receive independent random variation'); } };
      bindings.paintedSmallStructurePoint = production('paintedSmallStructurePoint', bindings);
      const varied = production('variedOrganPoint', bindings);
      for (const mode of ['realistic', 'guided', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
        bindings.d.visualRealism = mode; bindings.d.anatomicalView = view;
        expect(varied(organ)).toEqual(f.g.target);
      }
    }
  });

  it('returns deterministic independent geometry without retaining mutations across frames', () => {
    const { geometry } = anatomy(500, 600), first = geometry(500, 600), saved = structuredClone(first);
    expect(geometry(500, 600)).toEqual(first);
    first.pairs[0].arms[0].front[0][0].x = 100; first.target.x = 100; first.dorsal.curves[0][0].y = 100;
    expect(geometry(500, 600)).toEqual(saved);
  });

  it('rejects nonfinite, empty or nonnumeric logical dimensions', () => {
    const { geometry } = anatomy(500, 600);
    for (const args of [[0, 600], [500, -1], [NaN, 600], [500, Infinity], ['500', 600], [500, '600']]) expect(geometry(...args)).toBeNull();
  });

  it.each(dimensions)('paints rear returns and exposed front arms on their actual shared paths, within the real cavity at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state();
    expect(f.draw('rear')).toBe(true); expect(f.draw('front')).toBe(true);
    const painting = paints(f.ctx), clips = f.ctx.events.filter(event => event.operation === 'clip');
    expect(painting).toHaveLength(28); expect(clips).toHaveLength(2);
    const band = new Context();
    production('traceEarthwormBand', { ctx: band, W: width, H: height, earthwormFrame: t => f.frame(t, width, height) })(.065, .945, .84, band);
    expect(clips[0].path).toEqual(band.path); expect(clips[1].path).toEqual(band.path);
    f.g.pairs.forEach((pair, i) => {
      const rear = painting.slice(i * 2, i * 2 + 2), front = painting.slice(10 + i * 3, 10 + i * 3 + 3);
      expect(rear.every(event => JSON.stringify(event.path) === JSON.stringify(pairPath(f, pair, 'rear')))).toBe(true);
      expect(front.every(event => JSON.stringify(event.path) === JSON.stringify(pairPath(f, pair, 'front')))).toBe(true);
      expect(front[0].path.filter(op => op[0] === 'moveTo')).toHaveLength(2);
    });
    const dorsal = new Context(); f.trace(dorsal, f.g.dorsal.start, f.g.dorsal.curves, width, height, false);
    expect(painting.slice(-3).every(event => JSON.stringify(event.path) === JSON.stringify(dorsal.path))).toBe(true);
    expect(painting.every(event => event.clips.length === 2 && event.alpha === before.globalAlpha && event.cap === 'round' &&
      event.join === 'round' && event.composite === 'source-over' && event.dash.length === 0 && event.shadow.every(value => value === 0))).toBe(true);
    expect(painting.every(event => JSON.stringify(event.matrix) === JSON.stringify(before.matrix))).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each([
    ['Guided', { detailed: false }], ['Accessible', { detailed: false, accessible: true }],
    ['high contrast', { detailed: false, highContrast: true }], ['detail off', { detailed: false }],
  ])('retains all ten corrected vessel arms, attachments and target in %s', (_mode, options) => {
    const detailed = fixture(), simple = fixture(options), before = simple.ctx.state();
    for (const f of [detailed, simple]) { f.draw('rear'); f.draw('front'); }
    const rich = paints(detailed.ctx), plain = paints(simple.ctx);
    expect(plain).toHaveLength(11);
    const expected = [...Array.from({ length: 5 }, (_, i) => rich[i * 2].path),
      ...Array.from({ length: 5 }, (_, i) => rich[10 + i * 3].path), rich.at(-1).path];
    expect(plain.map(event => event.path)).toEqual(expected);
    expect(plain.every(event => typeof event.color === 'string')).toBe(true);
    const rightFront = plain[5].path[1];
    expect(rightFront[0]).toBe('bezierCurveTo');
    expect(rightFront.slice(-2)).toEqual([simple.g.target.x * simple.options.width, simple.g.target.y * simple.options.height]);
    expect(simple.ctx.state()).toEqual(before); expect(simple.ctx.stack).toEqual([]);
  });

  it('executes the production rear pass before the intact gut and the exposed pass before seminal vesicles in every clarity mode', () => {
    const first = source.indexOf('var wormArchOptions ='), call = 'drawEarthwormAorticArches(ctx, wormArchOptions);';
    const rear = source.indexOf(call, first), front = source.indexOf(call, rear + call.length);
    expect(first).toBeGreaterThan(0); expect(front).toBeGreaterThan(rear);
    expect(source.indexOf('drawEarthwormSeminalVesicles();', front)).toBeGreaterThan(front);
    const integration = source.slice(first, front + call.length);
    for (const overrides of [{}, { wormRealistic: false }, { wormAccessible: true }, { highContrastEnabled: true }, { sceneDetail: false }]) {
      const events = [], values = { W: 500, H: 600, ctx: {}, wormBaseWidth: 500 * .047,
        wormRealistic: true, sceneDetail: true, wormAccessible: false, highContrastEnabled: false,
        liveTissueState: { moisture: 76 }, d: { lightIntensity: 68 }, lightDirection: 'left', specimenCondition: 'standard',
        earthwormFrame: () => ({}), traceEarthwormLine: () => events.push('gut'), strokeAnatomicalTube: () => {},
        drawEarthwormDigestiveBulb: () => events.push('bulb'),
        drawEarthwormAorticArches: (_context, options) => events.push({ ...options }), ...overrides };
      new Function(...Object.keys(values), integration)(...Object.values(values));
      expect(events[0].stage).toBe('rear'); expect(events.at(-1).stage).toBe('front');
      expect(events.slice(1, -1).filter(event => event === 'bulb')).toHaveLength(3);
      expect(events.slice(1, -1).includes('gut')).toBe(true);
      expect(events[0].detailed).toBe(values.wormRealistic && values.sceneDetail && !values.wormAccessible && !values.highContrastEnabled);
      expect(events.at(-1).detailed).toBe(events[0].detailed);
    }
  });

  it('keeps anatomy stable under DPR, shear, mirroring, panning and directional lighting', () => {
    const left = fixture({}, [1, 0, 0, 1, 0, 0]), right = fixture({ lightDirection: 'right', moisture: 100, lightIntensity: 100 }, [-3, .4, .2, 3, 900, -50]);
    const a = fixture(), b = fixture(); for (const f of [left, right, a, b]) { f.draw('rear'); f.draw('front'); }
    expect(paints(left.ctx).map(event => event.path)).toEqual(paints(right.ctx).map(event => event.path));
    expect(paints(left.ctx).map(event => event.width)).toEqual(paints(right.ctx).map(event => event.width));
    const leftVolume = paints(left.ctx).find(event => event.color?.kind === 'linear').color;
    const rightVolume = paints(right.ctx).find(event => event.color?.kind === 'linear').color;
    expect(leftVolume.args[0]).toBeLessThan(leftVolume.args[2]); expect(rightVolume.args[0]).toBeGreaterThan(rightVolume.args[2]);
    expect(leftVolume.stops).toEqual(rightVolume.stops); expect(a.ctx.events).toEqual(b.ctx.events);
  });

  it('reduces exposed-vessel sheen for dry or preserved tissue without changing paired paths', () => {
    const wet = fixture({ moisture: 100, lightIntensity: 100 }), dry = fixture({ moisture: 0, lightIntensity: 20, condition: 'dehydrated' }), preserved = fixture({ moisture: 100, lightIntensity: 100, condition: 'preserved' });
    for (const f of [wet, dry, preserved]) f.draw('front');
    const opacity = event => Number(event.color.split(',').at(-1).slice(0, -1));
    for (const f of [dry, preserved]) expect(paints(f.ctx).map(event => event.path)).toEqual(paints(wet.ctx).map(event => event.path));
    for (const i of [2, 5, 8, 11, 14, 17]) {
      expect(opacity(paints(wet.ctx)[i])).toBeGreaterThan(opacity(paints(preserved.ctx)[i]));
      expect(opacity(paints(preserved.ctx)[i])).toBeGreaterThan(opacity(paints(dry.ctx)[i]));
      expect(opacity(paints(wet.ctx)[i])).toBeLessThan(.4); expect(opacity(paints(dry.ctx)[i])).toBeGreaterThan(0);
    }
  });

  it.each(['rear paint', 'front paint', 'cavity clip', 'surface gradient'])('restores full parent state after an injected %s error', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected arch error'); };
    if (location === 'rear paint' || location === 'front paint') f.ctx.stroke = fail;
    else if (location === 'cavity clip') f.ctx.clip = fail;
    else f.ctx.createLinearGradient = fail;
    expect(() => f.draw(location === 'rear paint' ? 'rear' : 'front')).toThrow('Injected arch error');
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('skips invalid dimensions or stages without any canvas mutation', () => {
    const f = fixture(), before = f.ctx.state();
    for (const options of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: -1 }, { width: '500' }, { stage: 'outside' }])
      expect(f.rawDraw(f.ctx, { ...f.options, stage: 'front', ...options })).toBe(false);
    expect(f.rawDraw(null, { ...f.options, stage: 'front' })).toBe(false);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.events).toEqual([]); expect(f.ctx.stack).toEqual([]);
  });

  it('labels the inspection as vessels while retaining the existing generic capsule geometry and other organ labels', () => {
    const footprint = production('structureInspectionFootprint', { structureOpticalDepth: () => 'deep', W: 500, H: 600,
      organs: Array.from({ length: 7 }), spec: { bodyShape: 'worm' }, specimen: 'earthworm' });
    const compact = footprint({ id: 'brain', name: 'Brain' }), arch = footprint({ id: 'aortic_arches', name: 'Aortic Arches (5 pairs)' });
    expect(compact.morphologyLabel).toBe('COMPACT'); expect(arch).toEqual({ ...compact, morphologyLabel: 'VESSELS' });
    expect(footprint({ id: 'ventral_cord', name: 'Ventral nerve cord' }).morphologyLabel).toBe('TUBE');
  });

  it('keeps packaged and canonical source identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});
