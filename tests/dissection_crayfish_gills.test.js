import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function production(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length, ending = '\n' + match[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}
function pointAt(points, t) {
  const [p0, p1, p2, p3] = points, u = 1 - t;
  return { x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y };
}
const dimensions = [[500, 600], [1000, 600], [320, 900]];
const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin',
  'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class Context {
  constructor(matrix = [-3, .2, .3, 3, 800, -175]) {
    this.matrix = [...matrix]; this.path = []; this.clips = ['parent anatomy']; this.events = []; this.stack = []; this.dash = [4, 2];
    Object.assign(this, { globalAlpha: .76, globalCompositeOperation: 'multiply', strokeStyle: '#123456', lineWidth: 3,
      lineCap: 'butt', lineJoin: 'miter', shadowBlur: 5, shadowColor: '#876543', shadowOffsetX: 2, shadowOffsetY: -1 });
  }
  state() { return { matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash], ...Object.fromEntries(stateKeys.map(key => [key, this[key]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced canvas restore'); Object.assign(this, this.stack.pop()); }
  beginPath() { this.path = []; }
  moveTo(...args) { this.path.push(['moveTo', ...args]); }
  lineTo(...args) { this.path.push(['lineTo', ...args]); }
  quadraticCurveTo(...args) { this.path.push(['quadraticCurveTo', ...args]); }
  bezierCurveTo(...args) { this.path.push(['bezierCurveTo', ...args]); }
  setLineDash(dash) { this.dash = [...dash]; }
  createLinearGradient(...args) { return { kind: 'linear', args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } }; }
  stroke() {
    const style = this.strokeStyle;
    this.events.push({ path: this.path.map(op => [...op]), color: typeof style === 'object' ? { kind: style.kind, args: [...style.args], stops: style.stops.map(stop => [...stop]) } : style,
      width: this.lineWidth, alpha: this.globalAlpha, matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash],
      composite: this.globalCompositeOperation, cap: this.lineCap, join: this.lineJoin,
      shadow: [this.shadowBlur, this.shadowOffsetX, this.shadowOffsetY] });
  }
}
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix), options = { width: 500, height: 600, detailed: true, moisture: 76,
    lightIntensity: 68, condition: 'standard', lightDirection: 'left', ...overrides };
  const geometry = production('crayfishGillGeometry'), draw = production('drawCrayfishGillPlumes', { crayfishGillGeometry: geometry });
  return { ctx, options, geometry, draw: () => draw(ctx, options), rawDraw: draw };
}
function splitCurves(path) {
  const groups = [];
  for (const op of path) { if (op[0] === 'moveTo') groups.push([]); groups.at(-1).push(op); }
  return groups;
}
function recordedCurve(start, controls, W, H) {
  return [['moveTo', start.x * W, start.y * H], ['bezierCurveTo', ...controls.flatMap(p => [p.x * W, p.y * H])]];
}
// The pre-refinement teaching stream is a geometry/color oracle for the fallback.
function legacyTeachingStream(ctx, W, H) {
  const cx = W * .5, cy = H * .45;
  [-1, 1].forEach(side => {
    for (let gill = 0; gill < 4; gill++) {
      const x = cx - W * .015 + gill * W * .033;
      ctx.beginPath(); ctx.moveTo(x, cy + side * H * .072); ctx.lineTo(x + W * .012, cy + side * H * .112);
      ctx.strokeStyle = '#fda4af'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = .65;
      for (let filament = 1; filament <= 7; filament++) {
        const t = filament / 8, y = cy + side * H * (.072 + t * .040), fx = x + W * .012 * t, span = W * .010 * Math.sin(t * Math.PI);
        ctx.beginPath(); ctx.moveTo(fx - span, y - side * H * .003);
        ctx.quadraticCurveTo(fx, y + side * H * .001, fx + span, y - side * H * .002);
        ctx.strokeStyle = filament % 2 ? '#dcb9ac' : '#b5827c'; ctx.stroke();
      }
    }
  });
}

describe('registered crayfish branchial plumes', () => {
  it.each(dimensions)('keeps the four representative pairs and old shafts registered at %s by %s logical pixels', (W, H) => {
    const geometry = production('crayfishGillGeometry');
    let plumes = 0;
    for (const side of [-1, 1]) for (let index = 0; index < 4; index++) {
      const g = geometry(index, side, W, H);
      expect([g.width, g.height]).toEqual([W, H]);
      for (const t of [0, .25, .5, .75, 1]) {
        const p = pointAt(g.shaft, t);
        expect(p.x).toBeCloseTo(.485 + index * .033 + .012 * t, 12);
        expect(p.y).toBeCloseTo(.45 + side * (.072 + .040 * t), 12);
      }
      plumes++;
    }
    expect(plumes).toBe(8);
  });

  it.each(dimensions)('keeps all rounded filament curves inside the existing plume envelope at %s by %s', (W, H) => {
    const geometry = production('crayfishGillGeometry');
    for (const side of [-1, 1]) for (let index = 0; index < 4; index++) {
      const g = geometry(index, side, W, H);
      expect(g.filaments.length).toBeGreaterThan(28);
      expect(g.filaments.length).toBeLessThanOrEqual(40);
      const fronts = g.filaments.filter(f => f.depth === 'front'), rears = g.filaments.filter(f => f.depth === 'rear');
      expect(new Set(fronts.map(f => f.tier)).size).toBe(14);
      expect(fronts.filter(f => f.edge === -1).length).toBe(14);
      expect(fronts.filter(f => f.edge === 1).length).toBe(14);
      expect(rears.length).toBeLessThan(fronts.length / 2);
      for (const f of g.filaments) {
        expect(f.widthScale).toBeGreaterThan(0); expect(f.widthScale).toBeLessThanOrEqual(1);
        const startT = ((f.start.y - .45) / side - .072) / .040;
        expect(f.start.x).toBeCloseTo(.485 + index * .033 + .012 * startT, 12);
        for (let step = 0; step <= 40; step++) {
          const p = pointAt([f.start, ...f.curve], step / 40);
          const t = ((p.y - .45) / side - .072) / .040;
          expect(t).toBeGreaterThanOrEqual(0); expect(t).toBeLessThanOrEqual(1);
          expect(Math.abs(p.x - (.485 + index * .033 + .012 * t))).toBeLessThanOrEqual(.010 * Math.sin(Math.PI * t) + 1e-12);
        }
      }
    }
  });

  it('retains the painted gill inspection target on the exact upper third-plume shaft', () => {
    const geometry = production('crayfishGillGeometry'), target = production('paintedSmallStructurePoint', { spec: { bodyShape: 'crayfish' } })({ id: 'gills_c' });
    for (const [W, H] of dimensions) {
      const g = geometry(2, -1, W, H), middle = pointAt(g.shaft, .5);
      for (const key of ['x', 'y']) { expect(g.anchor[key]).toBeCloseTo(target[key], 12); expect(middle[key]).toBeCloseTo(target[key], 12); }
    }
  });

  it('keeps normalized anatomy identical across aspect ratios and repeated calls, without shared mutable arrays', () => {
    const geometry = production('crayfishGillGeometry');
    const first = geometry(1, -1, 500, 600), second = geometry(1, -1, 1000, 600), third = geometry(1, -1, 320, 900);
    for (const g of [second, third]) { expect(g.shaft).toEqual(first.shaft); expect(g.filaments).toEqual(first.filaments); expect(g.anchor).toEqual(first.anchor); }
    const saved = structuredClone(first);
    first.filaments[0].curve[0].x = 100; first.shaft[0].x = 100;
    expect(geometry(1, -1, 500, 600)).toEqual(saved);
  });

  it('uses opposite branchial sides with identical attachment and taper rather than a new anatomical layout', () => {
    const geometry = production('crayfishGillGeometry'), upper = geometry(3, -1, 500, 600), lower = geometry(3, 1, 500, 600);
    const upperPoints = [...upper.shaft, ...upper.filaments.flatMap(f => [f.start, ...f.curve])];
    const lowerPoints = [...lower.shaft, ...lower.filaments.flatMap(f => [f.start, ...f.curve])];
    upperPoints.forEach((p, i) => { expect(p.x).toBe(lowerPoints[i].x); expect(p.y + lowerPoints[i].y).toBeCloseTo(.9, 12); });
  });

  it('rejects invalid plume identity and nonfinite or empty logical dimensions', () => {
    const geometry = production('crayfishGillGeometry');
    for (const args of [[-1, -1, 500, 600], [4, -1, 500, 600], [.5, -1, 500, 600], [NaN, -1, 500, 600],
      [0, 0, 500, 600], [0, -1, 0, 600], [0, -1, 500, -1], [0, -1, Infinity, 600], [0, -1, 500, NaN],
      [0, -1, '500', 600], [0, -1, 500, '600']]) expect(geometry(...args)).toBeNull();
  });

  it.each(dimensions)('paints all actual shafts and filament curves at %s by %s with rounded open strokes and bounded work', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state();
    expect(f.draw()).toBe(true); expect(f.ctx.events).toHaveLength(64);
    let plume = 0;
    for (const side of [-1, 1]) for (let index = 0; index < 4; index++) {
      const g = f.geometry(index, side, width, height), paints = f.ctx.events.slice(plume * 8, ++plume * 8);
      const shaft = recordedCurve(g.shaft[0], g.shaft.slice(1), width, height);
      expect(paints[1].path).toEqual(shaft); expect(paints[2].path).toEqual(shaft);
      const painted = [...splitCurves(paints[0].path), ...splitCurves(paints[3].path), ...splitCurves(paints[5].path)];
      const expected = g.filaments.map(filament => recordedCurve(filament.start, filament.curve, width, height));
      expect(painted).toHaveLength(expected.length);
      expect(new Set(painted.map(path => JSON.stringify(path)))).toEqual(new Set(expected.map(path => JSON.stringify(path))));
      expect(paints[3].path).toEqual(paints[4].path); expect(paints[5].path).toEqual(paints[6].path);
      expect(splitCurves(paints[7].path).length).toBeLessThan(g.filaments.filter(filament => filament.depth === 'front').length);
    }
    expect(f.ctx.events.every(event => event.width > 0 && event.width <= Math.max(width * .004, 1) && event.alpha === before.globalAlpha &&
      event.cap === 'round' && event.join === 'round' && event.composite === 'source-over' && event.dash.length === 0 && event.shadow.every(value => value === 0))).toBe(true);
    expect(f.ctx.events.every(event => JSON.stringify(event.matrix) === JSON.stringify(before.matrix) && JSON.stringify(event.clips) === JSON.stringify(before.clips))).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('preserves the seven-crossbar teaching fallback and its target at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), legacy = new Context(), before = f.ctx.state();
    legacyTeachingStream(legacy, width, height); expect(f.draw()).toBe(true);
    expect(f.ctx.events).toHaveLength(64);
    f.ctx.events.forEach((event, i) => {
      expect(event.color).toBe(legacy.events[i].color); expect(event.width).toBe(legacy.events[i].width);
      expect(event.path.length).toBe(legacy.events[i].path.length);
      event.path.forEach((op, j) => { const old = legacy.events[i].path[j]; expect(op[0]).toBe(old[0]); op.slice(1).forEach((v, k) => expect(v).toBeCloseTo(old[k + 1], 10)); });
    });
    const target = production('paintedSmallStructurePoint', { spec: { bodyShape: 'crayfish' } })({ id: 'gills_c' });
    const [start, end] = f.ctx.events[2 * 8].path;
    expect((start[1] + end[1]) / 2).toBeCloseTo(target.x * width, 10);
    expect((start[2] + end[2]) / 2).toBeCloseTo(target.y * height, 10);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('keeps normalized drawing independent of DPR, mirroring, shear, pan, lamp and hydration', () => {
    const normal = fixture({}, [1, 0, 0, 1, 0, 0]), transformed = fixture({ moisture: 100, lightIntensity: 100, lightDirection: 'right' }, [-3, .4, .2, 3, 900, -50]);
    const repeat = fixture(); normal.draw(); transformed.draw(); repeat.draw();
    expect(transformed.ctx.events.map(event => event.path)).toEqual(normal.ctx.events.map(event => event.path));
    expect(transformed.ctx.events.map(event => event.width)).toEqual(normal.ctx.events.map(event => event.width));
    const leftGradient = normal.ctx.events[4].color, rightGradient = transformed.ctx.events[4].color;
    expect(leftGradient.args[0]).toBeLessThan(leftGradient.args[2]); expect(rightGradient.args[0]).toBeGreaterThan(rightGradient.args[2]);
    expect(leftGradient.stops).toEqual(rightGradient.stops);
    const same = fixture(); same.draw(); expect(same.ctx.events).toEqual(repeat.ctx.events);
  });

  it('responds to water, light and dehydration through bounded sheen opacity rather than moving or obscuring the anatomy', () => {
    const wet = fixture({ moisture: 100, lightIntensity: 100 }), dry = fixture({ moisture: 0, lightIntensity: 20, condition: 'dehydrated' }), preserved = fixture({ moisture: 100, lightIntensity: 100, condition: 'preserved' });
    const opacity = event => Number(event.color.split(',').at(-1).slice(0, -1));
    for (const f of [wet, dry, preserved]) f.draw();
    for (const f of [dry, preserved]) expect(f.ctx.events.map(event => event.path)).toEqual(wet.ctx.events.map(event => event.path));
    for (let i = 7; i < 64; i += 8) {
      expect(opacity(wet.ctx.events[i])).toBeGreaterThan(opacity(preserved.ctx.events[i]));
      expect(opacity(preserved.ctx.events[i])).toBeGreaterThan(opacity(dry.ctx.events[i]));
      expect(opacity(dry.ctx.events[i])).toBeGreaterThan(0); expect(opacity(wet.ctx.events[i])).toBeLessThan(.5);
    }
  });

  it.each([true, false])('restores full canvas state after detailed=%s paint failure', detailed => {
    const f = fixture({ detailed }), before = f.ctx.state();
    let paints = 0; f.ctx.stroke = () => { if (++paints === 4) throw Error('Injected gill paint error'); };
    expect(f.draw).toThrow('Injected gill paint error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('restores the parent canvas state if material gradient creation fails', () => {
    const f = fixture(), before = f.ctx.state(); f.ctx.createLinearGradient = () => { throw Error('Injected gradient error'); };
    expect(f.draw).toThrow('Injected gradient error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('skips invalid canvases before touching state or starting any paint', () => {
    for (const options of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: -1 }, { width: '500' }]) {
      const f = fixture(options), before = f.ctx.state(); expect(f.draw()).toBe(false);
      expect(f.ctx.state()).toEqual(before); expect(f.ctx.events).toEqual([]); expect(f.ctx.stack).toEqual([]);
    }
    const f = fixture(); expect(f.rawDraw(null, f.options)).toBe(false);
  });

  it('keeps packaged and canonical renderers identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });

  it('labels fish and crayfish gill inspection as filaments while retaining the existing depth capsule geometry and other organ labels', () => {
    const footprint = production('structureInspectionFootprint', { structureOpticalDepth: () => 'deep', W: 500, H: 600,
      organs: Array.from({ length: 12 }), spec: { bodyShape: 'crayfish' }, specimen: 'crayfish' });
    const liver = footprint({ id: 'liver', name: 'Liver' });
    expect(liver).toEqual({ rx: 16.875, ry: 10, rotation: .18, morphology: 'lobed', morphologyLabel: 'LOBED', depth: 'deep', depthOffset: 12 });
    for (const id of ['gills', 'gills_c']) {
      const gill = footprint({ id, name: 'Gills' });
      expect(gill).toEqual({ ...liver, morphologyLabel: 'FILAMENTS' });
    }
    expect(footprint({ id: 'optic_nerve', name: 'Optic nerve' }).morphologyLabel).toBe('TUBE');
  });
});
