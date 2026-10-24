import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function production(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const m = matches[0], start = m.index + m[1].length, ending = '\n' + m[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}
const styleKeys = ['globalAlpha', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class Context {
  constructor() {
    this.path = []; this.clips = []; this.events = []; this.stack = []; this.dash = [4, 4]; this.matrix = [-2, .1, .2, 2, 720, -130];
    Object.assign(this, { globalAlpha: .7, strokeStyle: '#765432', lineWidth: 2, lineCap: 'butt', lineJoin: 'miter',
      shadowBlur: 7, shadowColor: '#443322', shadowOffsetX: 1, shadowOffsetY: -2 });
  }
  state() { return { matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash], ...Object.fromEntries(styleKeys.map(key => [key, this[key]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced restore'); Object.assign(this, this.stack.pop()); }
  beginPath() { this.path = []; }
  moveTo(...args) { this.path.push(['moveTo', ...args]); }
  lineTo(...args) { this.path.push(['lineTo', ...args]); }
  bezierCurveTo(...args) { this.path.push(['bezierCurveTo', ...args]); }
  closePath() { this.path.push(['closePath']); }
  clip() { this.clips = [...this.clips, this.path.map(op => [...op])]; }
  setLineDash(dash) { this.dash = [...dash]; }
  stroke() { this.events.push({ path: this.path.map(op => [...op]), clips: [...this.clips], matrix: [...this.matrix],
    color: this.strokeStyle, width: this.lineWidth, alpha: this.globalAlpha, dash: [...this.dash] }); }
}
function fixture(W = 500, H = 600, overrides = {}) {
  const ctx = new Context(), bindings = { ctx, W, H, d: { visualRealism: 'realistic', variationSeed: 7, lightIntensity: 68 },
    visualRealism: 'guided', sceneDetail: true, highContrastEnabled: false, specimenCondition: 'standard', liveTissueState: { moisture: 76 }, ...overrides };
  bindings.earthwormCenterlinePoint = production('earthwormCenterlinePoint');
  bindings.earthwormAnatomyFrame = production('earthwormAnatomyFrame', bindings);
  bindings.earthwormNephridialGeometry = production('earthwormNephridialGeometry', bindings);
  bindings.traceEarthwormNephridialField = production('traceEarthwormNephridialField', bindings);
  bindings.traceEarthwormNephridialTubule = production('traceEarthwormNephridialTubule', bindings);
  return { ctx, bindings, draw: production('drawEarthwormNephridia', bindings), geometry: bindings.earthwormNephridialGeometry, frame: bindings.earthwormAnatomyFrame };
}
function samples(geometry, detailed) {
  const points = [geometry.start]; let p = geometry.start;
  for (const c of detailed ? geometry.detailed : geometry.simple) {
    for (let i = 1; i <= 24; i++) { const t = i / 24, u = 1 - t;
      points.push({ x: u ** 3 * p.x + 3 * u * u * t * c[0].x + 3 * u * t * t * c[1].x + t ** 3 * c[2].x,
        y: u ** 3 * p.y + 3 * u * u * t * c[0].y + 3 * u * t * t * c[1].y + t ** 3 * c[2].y });
    } p = c[2];
  } return points;
}
function contains(point, path) {
  const ps = path.filter(op => ['moveTo', 'lineTo'].includes(op[0])).map(op => ({ x: op[1], y: op[2] })); let inside = false;
  for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
    const a = ps[i], b = ps[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  } return inside;
}

describe('registered earthworm nephridia', () => {
  it.each([[500, 600], [1000, 600], [320, 900]])('shares the exact existing worm frame and cavity at %s by %s logical pixels', (W, H) => {
    const f = fixture(W, H), bindings = { W, H, wormBaseWidth: W * .047, earthwormCenterlinePoint: f.bindings.earthwormCenterlinePoint };
    bindings.earthwormPoint = production('earthwormPoint', bindings);
    bindings.earthwormWidth = production('earthwormWidth', bindings);
    const existingFrame = production('earthwormFrame', bindings);
    for (const t of [0, .03, .1375, .25, .315, .4, .5875, .9, 1]) {
      const shared = f.frame(t, W, H), old = existingFrame(t);
      expect(shared.point).toEqual(old.point); expect(shared.width).toBe(old.width);
      for (const key of ['tx', 'ty', 'nx', 'ny']) expect(shared[key]).toBe(old[key]);
    }
    const oldCtx = new Context();
    production('traceEarthwormBand', { ctx: oldCtx, earthwormFrame: existingFrame })(.065, .945, .84);
    f.bindings.traceEarthwormNephridialField(f.ctx, W, H);
    expect(f.ctx.path).toEqual(oldCtx.path);
  });

  it.each([[500, 600], [1000, 600], [320, 900]])('contains all sixteen representative pairs inside the real cavity and segment envelopes at %s by %s', (W, H) => {
    const f = fixture(W, H); f.bindings.traceEarthwormNephridialField(f.ctx, W, H); const cavity = [...f.ctx.path];
    let count = 0;
    for (let segment = 5; segment <= 35; segment += 2) for (const side of [-1, 1]) {
      const g = f.geometry(segment, side, W, H), frame = g.frame;
      expect(g.t).toBe((segment + .5) / 40);
      expect(g.halfWidth).toBeCloseTo(frame.width * .13, 12);
      expect(g.halfLength).toBeLessThanOrEqual(frame.segmentPitch * .30);
      expect(g.halfLength).toBeLessThanOrEqual(H * .0075);
      const cx = g.center.x * W, cy = g.center.y * H;
      expect((cx - frame.point.x) * frame.nx + (cy - frame.point.y) * frame.ny).toBeCloseTo(side * frame.width * .60, 10);
      for (const detail of [true, false]) for (const p of samples(g, detail)) {
        const x = p.x * W, y = p.y * H;
        expect(Math.abs((x - cx) * frame.nx + (y - cy) * frame.ny)).toBeLessThanOrEqual(g.halfWidth + 1e-8);
        expect(Math.abs((x - cx) * frame.tx + (y - cy) * frame.ty)).toBeLessThanOrEqual(g.halfLength + 1e-8);
        expect(contains({ x, y }, cavity)).toBe(true);
      }
      expect(contains({ x: g.outlet[1].x * W, y: g.outlet[1].y * H }, cavity)).toBe(true);
      count++;
    }
    expect(count).toBe(32);
  });

  it('paints pale paired gross tubules before tracing the same paths, within a bounded paint budget', () => {
    const body = fixture(), before = body.ctx.state(); body.draw(false);
    expect(body.ctx.events).toHaveLength(96);
    expect(body.ctx.events.every(event => event.clips.length === 1 && event.width > 0 && event.width < 2)).toBe(true);
    const primaryPaths = body.ctx.events.filter((_event, index) => index % 3 === 1).map(event => event.path);
    expect(primaryPaths).toHaveLength(32);
    const overlay = fixture(); overlay.draw(true);
    expect(overlay.ctx.events).toHaveLength(3);
    const batched = overlay.ctx.events[0].path, split = [];
    for (const op of batched) { if (op[0] === 'moveTo') split.push([]); split.at(-1).push(op); }
    expect(split).toEqual(primaryPaths);
    expect(overlay.ctx.events[2].path.filter(op => op[0] === 'lineTo')).toHaveLength(32);
    expect(body.ctx.events.length + overlay.ctx.events.length).toBeLessThanOrEqual(130);
    expect(body.ctx.state()).toEqual(before); expect(body.ctx.stack).toEqual([]);
    expect(overlay.ctx.state()).toEqual(before); expect(overlay.ctx.stack).toEqual([]);
  });

  it.each([
    ['Guided', { d: { visualRealism: 'guided' } }], ['Accessible', { d: { visualRealism: 'accessible' } }],
    ['high contrast', { highContrastEnabled: true }], ['detail off', { sceneDetail: false }],
  ])('retains simplified same-center tubules and the same overlay route in %s', (_mode, overrides) => {
    const normal = fixture(), simple = fixture(500, 600, overrides), overlay = fixture(500, 600, overrides);
    normal.draw(false); simple.draw(false); overlay.draw(true);
    expect(simple.ctx.events).toHaveLength(64);
    const simplePaths = simple.ctx.events.filter((_event, index) => index % 2 === 1).map(event => event.path);
    expect(simplePaths.map(path => path[0])).toEqual(normal.ctx.events.filter((_event, index) => index % 3 === 1).map(event => event.path[0]));
    expect(simplePaths.every(path => path.filter(op => op[0] === 'bezierCurveTo').length === 3)).toBe(true);
    const tracedStarts = overlay.ctx.events[0].path.filter(op => op[0] === 'moveTo');
    expect(tracedStarts).toEqual(simplePaths.map(path => path[0]));
    expect(simple.ctx.stack).toEqual([]); expect(overlay.ctx.stack).toEqual([]);
  });

  it.each([[500, 600], [1000, 600], [320, 900]])('places the s23 right-side target on the actual detailed and simplified tubule at %s by %s', (W, H) => {
    const f = fixture(W, H), target = production('paintedSmallStructurePoint', { ...f.bindings,
      spec: { bodyShape: 'worm' }, queryDissectionNode: () => ({ _logicalW: W, _logicalH: H, width: W * 3, height: H * 3, clientWidth: 246 }) })({ id: 'nephridia' });
    const g = f.geometry(23, -1, W, H);
    expect(target).toEqual(g.start); expect(target.x * W).toBeGreaterThan(g.frame.point.x);
    for (const detail of [true, false]) {
      f.bindings.traceEarthwormNephridialTubule(f.ctx, g, detail, false);
      expect(f.ctx.path[0]).toEqual(['moveTo', target.x * W, target.y * H]);
    }
  });

  it('keeps anatomy deterministic under seed, lamp and hydration changes while modulating only the wet material', () => {
    const first = fixture(), same = fixture(), relit = fixture(500, 600, { d: { visualRealism: 'realistic', variationSeed: 19, lightIntensity: 100 }, liveTissueState: { moisture: 100 } });
    const dry = fixture(500, 600, { d: { visualRealism: 'realistic', specimenCondition: 'dehydrated', lightIntensity: 100 }, liveTissueState: { moisture: 0 } });
    for (const f of [first, same, relit, dry]) f.draw(false);
    expect(same.ctx.events).toEqual(first.ctx.events);
    expect(relit.ctx.events.map(event => event.path)).toEqual(first.ctx.events.map(event => event.path));
    expect(dry.ctx.events.map(event => event.path)).toEqual(first.ctx.events.map(event => event.path));
    const wetColor = relit.ctx.events[2].color, dryColor = dry.ctx.events[2].color;
    expect(Number(wetColor.split(',').at(-1).slice(0, -1))).toBeGreaterThan(Number(dryColor.split(',').at(-1).slice(0, -1)));
  });

  it.each([false, true])('restores clip, styles, dash and full affine state after an injected overlay=%s paint failure', overlay => {
    const f = fixture(), before = f.ctx.state();
    f.ctx.stroke = () => { throw Error('Injected nephridial paint failure'); };
    expect(() => f.draw(overlay)).toThrow('Injected nephridial paint failure');
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('rejects invalid geometry and dimensions without canvas work', () => {
    const f = fixture();
    for (const args of [[4, -1, 500, 600], [36, -1, 500, 600], [23, 0, 500, 600], [23, -1, 0, 600], [23, -1, 500, Infinity]]) expect(f.geometry(...args)).toBeNull();
    for (const t of [NaN, Infinity]) expect(f.frame(t, 500, 600)).toBeNull();
    const invalid = fixture(NaN, 600), before = invalid.ctx.state();
    expect(invalid.draw(false)).toBe(false); expect(invalid.ctx.events).toEqual([]); expect(invalid.ctx.state()).toEqual(before);
  });
});
