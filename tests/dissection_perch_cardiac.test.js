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
const dimensions = [[500, 600], [1000, 600], [320, 900]];
const chambers = ['sinus', 'atrium', 'ventricle', 'bulbus'];
const oldEnvelopes = [
  [.295, .500, .013, .013, -.20], [.312, .506, .018, .018, .20],
  [.335, .518, .022, .024, -.12], [.358, .501, .017, .012, -.38],
];
function samples(shape) {
  const points = [shape.start]; let p = shape.start;
  for (const c of shape.curves) {
    for (let step = 1; step <= 40; step++) {
      const t = step / 40, u = 1 - t;
      points.push({ x: u ** 3 * p.x + 3 * u * u * t * c[0].x + 3 * u * t * t * c[1].x + t ** 3 * c[2].x,
        y: u ** 3 * p.y + 3 * u * u * t * c[0].y + 3 * u * t * t * c[1].y + t ** 3 * c[2].y });
    }
    p = c[2];
  }
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
  constructor(matrix = [-3, .2, .3, 3, 800, -175]) {
    this.matrix = [...matrix]; this.path = []; this.clips = ['coelom']; this.events = []; this.stack = []; this.dash = [3, 2];
    Object.assign(this, { globalAlpha: .93, globalCompositeOperation: 'multiply', fillStyle: '#123456', strokeStyle: '#654321', lineWidth: 3,
      lineCap: 'butt', lineJoin: 'miter', shadowBlur: 5, shadowColor: '#876543', shadowOffsetX: 2, shadowOffsetY: -1 });
  }
  state() { return { matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash], ...Object.fromEntries(stateKeys.map(key => [key, this[key]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced canvas restore'); Object.assign(this, this.stack.pop()); }
  beginPath() { this.path = []; }
  moveTo(...args) { this.path.push(['moveTo', ...args]); }
  bezierCurveTo(...args) { this.path.push(['bezierCurveTo', ...args]); }
  ellipse(...args) { this.path.push(['ellipse', ...args]); }
  closePath() { this.path.push(['closePath']); }
  clip() { const path = this.path.map(op => [...op]); this.clips = [...this.clips, path]; this.events.push({ operation: 'clip', path }); }
  setLineDash(dash) { this.dash = [...dash]; }
  gradient(kind, args) { return { kind, args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } }; }
  createLinearGradient(...args) { return this.gradient('linear', args); }
  createRadialGradient(...args) { return this.gradient('radial', args); }
  color(style) { return typeof style === 'object' ? { kind: style.kind, args: [...style.args], stops: style.stops.map(stop => [...stop]) } : style; }
  paint(operation, args = []) {
    this.events.push({ operation, args, path: this.path.map(op => [...op]), fill: this.color(this.fillStyle), stroke: this.color(this.strokeStyle),
      width: this.lineWidth, alpha: this.globalAlpha, matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash],
      composite: this.globalCompositeOperation, cap: this.lineCap, join: this.lineJoin,
      shadow: [this.shadowBlur, this.shadowOffsetX, this.shadowOffsetY] });
  }
  fill() { this.paint('fill'); }
  stroke() { this.paint('stroke'); }
  fillRect(...args) { this.paint('fillRect', args); }
}
const paints = context => context.events.filter(event => event.operation !== 'clip');
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix), options = { width: 500, height: 600, detailed: true, accessible: false,
    moisture: 76, lightIntensity: 68, condition: 'standard', lightDirection: 'left', ...overrides };
  const geometry = production('perchCardiacGeometry'), trace = production('tracePerchHeartRegion');
  const draw = production('drawPerchCardiacComplex', { perchCardiacGeometry: geometry, tracePerchHeartRegion: trace });
  return { ctx, options, geometry, trace, draw: () => draw(ctx, options), rawDraw: draw };
}
// Pre-refinement geometry/material oracle for the retained teaching stream.
function legacyTeachingStream(ctx, W, H, accessible) {
  const cx = W * .5, cy = H * .45;
  ctx.beginPath(); ctx.ellipse(cx - W * .205, cy + H * .050, W * .013, H * .013, -.20, 0, Math.PI * 2);
  ctx.fillStyle = accessible ? '#7dd3fc' : 'rgba(56,189,248,0.72)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - W * .188, cy + H * .056, W * .018, H * .018, .20, 0, Math.PI * 2);
  ctx.fillStyle = accessible ? '#be123c' : 'rgba(190,24,93,0.90)'; ctx.fill(); ctx.strokeStyle = 'rgba(254,205,211,0.56)'; ctx.lineWidth = .7; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx - W * .165, cy + H * .068, W * .022, H * .024, -.12, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(cx - W * .172, cy + H * .058, 1, cx - W * .165, cy + H * .068, W * .024);
  gradient.addColorStop(0, accessible ? '#fb7185' : 'rgba(244,63,94,0.96)'); gradient.addColorStop(1, accessible ? '#9f1239' : 'rgba(136,19,55,0.98)');
  ctx.fillStyle = gradient; ctx.fill(); ctx.strokeStyle = 'rgba(254,205,211,0.62)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx - W * .142, cy + H * .051, W * .017, H * .012, -.38, 0, Math.PI * 2);
  ctx.fillStyle = accessible ? '#fda4af' : 'rgba(251,113,133,0.84)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - W * .142, cy + H * .049);
  ctx.bezierCurveTo(cx - W * .165, cy + H * .028, cx - W * .178, cy + H * .010, cx - W * .190, cy - H * .005);
  ctx.strokeStyle = accessible ? '#fb7185' : 'rgba(251,113,133,0.86)'; ctx.lineWidth = 1.8; ctx.stroke();
}

describe('registered perch cardiac anatomy', () => {
  it.each(dimensions)('keeps each closed compartment inside its original rotated ellipse at %s by %s logical pixels', (W, H) => {
    const g = production('perchCardiacGeometry')(W, H);
    expect([g.width, g.height]).toEqual([W, H]);
    let curves = 0;
    chambers.forEach((name, i) => {
      const c = g[name], [x, y, rx, ry, rotation] = oldEnvelopes[i];
      expect(c.center).toEqual({ x, y }); expect([c.rx, c.ry, c.rotation]).toEqual([rx, ry, rotation]);
      expect(c.curves.at(-1)[2]).toEqual(c.start);
      expect(c.curves.length).toBeGreaterThanOrEqual(4); expect(c.curves.length).toBeLessThanOrEqual(6);
      for (const p of [c.start, ...c.curves.flat(), ...samples(c)]) {
        const dx = (p.x - x) * W, dy = (p.y - y) * H;
        const u = (dx * Math.cos(rotation) + dy * Math.sin(rotation)) / (rx * W);
        const v = (-dx * Math.sin(rotation) + dy * Math.cos(rotation)) / (ry * H);
        expect(u * u + v * v).toBeLessThanOrEqual(1 + 1e-10);
      }
      expect(contains(c.center, samples(c))).toBe(true);
      curves += c.curves.length;
    });
    expect(curves).toBeLessThanOrEqual(24);
  });

  it.each(dimensions)('keeps the inspection target in the ventricle and all adjacent external surfaces connected at %s by %s', (W, H) => {
    const g = production('perchCardiacGeometry')(W, H), polygons = Object.fromEntries(chambers.map(name => [name, samples(g[name])]));
    expect(g.target).toEqual({ x: .330, y: .505 }); expect(contains(g.target, polygons.ventricle)).toBe(true);
    for (let i = 0; i < chambers.length - 1; i++) {
      const a = polygons[chambers[i]], b = polygons[chambers[i + 1]];
      expect(a.some(point => contains(point, b)) && b.some(point => contains(point, a))).toBe(true);
    }
    expect(contains(g.outflow.start, polygons.bulbus)).toBe(true);
  });

  it.each(dimensions)('keeps the target inside the real coelom and fallback ventricle, clear of the ventral rim at %s by %s', (W, H) => {
    const g = production('perchCardiacGeometry')(W, H);
    let cavity;
    const context = { beginPath() {}, moveTo(x, y) { cavity = { start: { x: x / W, y: y / H }, curves: [] }; },
      bezierCurveTo(...c) { cavity.curves.push([{ x: c[0] / W, y: c[1] / H }, { x: c[2] / W, y: c[3] / H }, { x: c[4] / W, y: c[5] / H }]); }, closePath() {} };
    production('tracePerchCoelom', { ctx: context, W, H, cx: W * .5, cy: H * .45 })(context);
    const boundary = samples(cavity); expect(contains(g.target, boundary)).toBe(true);
    let clearance = Infinity;
    boundary.forEach((a, i) => { const b = boundary[(i + 1) % boundary.length], dx = (b.x - a.x) * W, dy = (b.y - a.y) * H;
      const px = (g.target.x - a.x) * W, py = (g.target.y - a.y) * H;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy) || 0));
      clearance = Math.min(clearance, Math.hypot(px - dx * t, py - dy * t));
    });
    expect(clearance).toBeGreaterThan(5);
    const c = g.ventricle, dx = (g.target.x - c.center.x) * W, dy = (g.target.y - c.center.y) * H;
    const u = (dx * Math.cos(c.rotation) + dy * Math.sin(c.rotation)) / (c.rx * W);
    const v = (-dx * Math.sin(c.rotation) + dy * Math.cos(c.rotation)) / (c.ry * H);
    expect(u * u + v * v).toBeLessThan(1);
  });

  it('registers the whole-heart target to the painted ventricle before seed variation or view offsets', () => {
    const geometry = production('perchCardiacGeometry'), organ = { id: 'heart_f', name: 'Heart (2-chamber)', x: .32, y: .51 };
    for (const [W, H] of dimensions) for (const mode of ['realistic', 'guided', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const bindings = { spec: { bodyShape: 'fish' }, specimen: 'perch', perchCardiacGeometry: geometry,
        queryDissectionNode: () => ({ _logicalW: W, _logicalH: H, width: W * 3, height: H * 3 }),
        d: { visualRealism: mode, anatomicalView: view, variationSeed: 19 }, visualRealism: mode,
        viewSpecificOrganPoint: () => { throw Error('Painted cardiac target must not receive a generic view offset'); },
        specimenVariationValue: () => { throw Error('Painted cardiac target must not receive independent random variation'); } };
      bindings.paintedSmallStructurePoint = production('paintedSmallStructurePoint', bindings);
      expect(production('variedOrganPoint', bindings)(organ)).toEqual(geometry(W, H).target);
    }
  });

  it('preserves the existing outflow cubic rather than inventing a new arterial route', () => {
    const g = production('perchCardiacGeometry')(500, 600);
    expect(g.outflow).toEqual({ start: { x: .358, y: .499 }, curves: [[{ x: .335, y: .478 }, { x: .322, y: .460 }, { x: .310, y: .445 }]] });
  });

  it('returns deterministic independent anatomy without retaining mutations from a previous frame', () => {
    const geometry = production('perchCardiacGeometry'), first = geometry(500, 600), saved = structuredClone(first);
    expect(geometry(500, 600)).toEqual(first);
    first.ventricle.curves[0][0].x = 100; first.bulbus.center.y = 100; first.target.x = 100;
    expect(geometry(500, 600)).toEqual(saved);
  });

  it('rejects nonfinite or empty logical dimensions before building anatomy', () => {
    const geometry = production('perchCardiacGeometry');
    for (const dimensions of [[0, 600], [-1, 600], [500, 0], [Infinity, 600], [500, NaN], ['500', 600], [500, '600']]) expect(geometry(...dimensions)).toBeNull();
  });

  it.each(dimensions)('finishes the four exact closed paths within their own clips and a bounded paint budget at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = f.geometry(width, height);
    expect(f.draw()).toBe(true);
    const painting = paints(f.ctx), clips = f.ctx.events.filter(event => event.operation === 'clip');
    expect(painting).toHaveLength(28); expect(clips).toHaveLength(4);
    chambers.forEach((name, i) => {
      const path = new Context(); f.trace(path, g[name], width, height);
      expect(clips[i].path).toEqual(path.path);
      const finish = painting.filter(event => event.clips.at(-1) === clips[i].path);
      expect(finish.filter(event => event.operation === 'fillRect')).toHaveLength(1);
      expect(finish.every(event => event.clips.length === 2)).toBe(true);
      const base = painting.filter(event => JSON.stringify(event.path) === JSON.stringify(path.path) && event.clips.length === 1);
      expect(base.map(event => event.operation)).toEqual(['stroke', 'fill', 'stroke']);
    });
    const grain = painting.filter(event => event.path[0]?.[0] === 'ellipse');
    expect(grain).toHaveLength(8); expect(grain.every(event => event.clips.at(-1) === clips[2].path && event.path[0][3] < .3 && event.path[0][4] < .3)).toBe(true);
    expect(painting.every(event => event.alpha === before.globalAlpha && event.cap === 'round' && event.join === 'round' &&
      event.composite === 'source-over' && event.dash.length === 0 && event.shadow.every(value => value === 0))).toBe(true);
    expect(painting.every(event => JSON.stringify(event.matrix) === JSON.stringify(before.matrix))).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each([false, true])('preserves all seven teaching paints, ellipse footprints, colors and outflow when accessible=%s', accessible => {
    for (const [width, height] of dimensions) {
      const f = fixture({ width, height, detailed: false, accessible }), legacy = new Context(), before = f.ctx.state();
      legacyTeachingStream(legacy, width, height, accessible); expect(f.draw()).toBe(true);
      const actual = paints(f.ctx), expected = paints(legacy);
      expect(actual).toHaveLength(7); expect(f.ctx.events.some(event => event.operation === 'clip')).toBe(false);
      actual.forEach((event, i) => {
        const old = expected[i]; expect(event.operation).toBe(old.operation);
        expect(event.path.length).toBe(old.path.length);
        event.path.forEach((op, j) => { expect(op[0]).toBe(old.path[j][0]); op.slice(1).forEach((n, k) => expect(n).toBeCloseTo(old.path[j][k + 1], 10)); });
        if (event.operation === 'fill') {
          if (typeof event.fill === 'object') {
            expect(event.fill.kind).toBe(old.fill.kind); expect(event.fill.stops).toEqual(old.fill.stops);
            event.fill.args.forEach((n, k) => expect(n).toBeCloseTo(old.fill.args[k], 10));
          } else expect(event.fill).toBe(old.fill);
        } else { expect(event.stroke).toBe(old.stroke); expect(event.width).toBe(old.width); }
      });
      expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
    }
  });

  it('keeps anatomy deterministic under full affine transforms and directional lamp changes', () => {
    const a = fixture({}, [1, 0, 0, 1, 0, 0]), b = fixture({ lightDirection: 'right', lightIntensity: 100, moisture: 100 }, [-3, .4, .2, 3, 900, -50]);
    const repeat = fixture(), same = fixture(); for (const f of [a, b, repeat, same]) f.draw();
    expect(paints(a.ctx).map(event => event.path)).toEqual(paints(b.ctx).map(event => event.path));
    expect(paints(a.ctx).map(event => event.width)).toEqual(paints(b.ctx).map(event => event.width));
    const aVolume = paints(a.ctx).find(event => event.fill?.kind === 'linear')?.fill;
    const bVolume = paints(b.ctx).find(event => event.fill?.kind === 'linear')?.fill;
    expect(aVolume.args[0]).toBeLessThan(aVolume.args[2]); expect(bVolume.args[0]).toBeGreaterThan(bVolume.args[2]);
    expect(aVolume.stops).toEqual(bVolume.stops); expect(same.ctx.events).toEqual(repeat.ctx.events);
  });

  it('reduces sheen for dry or preserved tissue without moving the organ or fixed surface pattern', () => {
    const wet = fixture({ moisture: 100, lightIntensity: 100 }), dry = fixture({ moisture: 0, lightIntensity: 20, condition: 'dehydrated' }), preserved = fixture({ moisture: 100, lightIntensity: 100, condition: 'preserved' });
    for (const f of [wet, dry, preserved]) f.draw();
    const sheen = f => paints(f.ctx).filter(event => event.operation === 'fillRect').map(event => Number(event.fill.stops[0][1].split(',').at(-1).slice(0, -1)));
    for (const f of [dry, preserved]) expect(paints(f.ctx).map(event => event.path)).toEqual(paints(wet.ctx).map(event => event.path));
    sheen(wet).forEach((opacity, i) => { expect(opacity).toBeGreaterThan(sheen(preserved)[i]); expect(sheen(preserved)[i]).toBeGreaterThan(sheen(dry)[i]); expect(opacity).toBeLessThan(.3); expect(sheen(dry)[i]).toBeGreaterThan(0); });
  });

  it.each(['outer paint', 'clipped sheen', 'ventricular grain', 'material gradient'])('restores the full parent context after an injected %s failure', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected cardiac error'); };
    if (location === 'outer paint') f.ctx.stroke = fail;
    else if (location === 'clipped sheen') f.ctx.fillRect = fail;
    else if (location === 'ventricular grain') f.ctx.ellipse = fail;
    else f.ctx.createRadialGradient = fail;
    expect(f.draw).toThrow('Injected cardiac error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('performs no canvas work for invalid inputs and keeps packaged source identical', () => {
    for (const options of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: -1 }, { width: '500' }]) {
      const f = fixture(options), before = f.ctx.state(); expect(f.draw()).toBe(false);
      expect(f.ctx.state()).toEqual(before); expect(f.ctx.events).toEqual([]); expect(f.ctx.stack).toEqual([]);
    }
    const f = fixture(); expect(f.rawDraw(null, f.options)).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});
