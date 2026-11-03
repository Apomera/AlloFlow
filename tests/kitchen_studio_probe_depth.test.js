import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const D = require('../stem_lab/kitchen_studio/kitchen_studio_probe_depth.js');
const initial = (depth = 0, unit = 1) => D.begin({ x: 150, y: 90 }, { depth, unit });
const at = (trace, dx = 0, dy = 0) => D.move(trace, { x: trace.start.x + dx * trace.unit, y: trace.start.y + dy * trace.unit });
const incomplete = trace => expect(D.finish(trace)).toMatchObject({ complete: false, action: null });
const normalizedChicken = p => (p.x / (.27 * 1.15)) ** 2 + ((p.y - 1.56) / (.27 * .65)) ** 2 + (p.z / (.27 * .8)) ** 2;

describe('Illustrated sensing-tip insertion', () => {
  it('exports the same pure API in a browser and CommonJS host', () => {
    const source = readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_probe_depth.js'), 'utf8');
    const browser = { window: {} }; runInNewContext(source, browser);
    expect(Object.keys(browser.window.KitchenStudioProbeDepth).sort()).toEqual(['begin', 'finish', 'move', 'placement', 'pose', 'progress']);
    const hybrid = { window: {}, module: { exports: {} } }; runInNewContext(source, hybrid);
    expect(hybrid.window.KitchenStudioProbeDepth).toBe(hybrid.module.exports);
  });

  it('starts at surface depth with no placement or tap action', () => {
    const trace = D.begin({ x: 10, y: 20 });
    expect(trace).toEqual({ start: { x: 10, y: 20 }, current: { x: 10, y: 20 }, unit: 1, initialDepth: 0, depth: 0, travel: 0, phase: 'adjust', invalid: false });
    incomplete(trace); incomplete(D.move(trace, { x: 10, y: 20 }));
    expect(D.progress(trace)).toBe(0);
    expect(D.begin({ x: 0, y: 0 }, null).unit).toBe(1);
  });

  it.each([.1, .5, 1, 2, 100])('scales insertion and withdrawal consistently at unit %s', requested => {
    const trace = initial(0, requested), unit = Math.max(.5, Math.min(2, requested));
    expect(trace.unit).toBe(unit);
    const inserted = at(trace, 0, 40);
    expect(inserted.depth).toBe(1); expect(inserted.phase).toBe('thick');
    expect(D.finish(inserted)).toMatchObject({ complete: true, action: 'thick' });
    const withdrawn = at(initial(1, requested), 0, -40);
    expect(withdrawn.depth).toBe(0); expect(withdrawn.phase).toBe('surface');
    expect(D.finish(withdrawn)).toMatchObject({ complete: true, action: 'surface' });
  });

  it('does not complete at an endpoint before twelve units of deliberate movement', () => {
    incomplete(at(initial(1), 0, 11.999));
    expect(D.finish(at(initial(1), 0, 12))).toMatchObject({ complete: true, action: 'thick' });
    incomplete(at(initial(0), 0, -11.999));
    expect(D.finish(at(initial(0), 0, -12))).toMatchObject({ complete: true, action: 'surface' });
  });

  it.each([.080001, .25, .5, .75, .919999])('never labels intermediate depth %s as surface or centre', depth => {
    expect(D.placement(depth)).toBeNull();
    const trace = at(initial(), 0, depth * 40);
    expect(trace.phase).toBe('adjust'); incomplete(trace);
  });

  it('uses inclusive explicit surface and centre zones', () => {
    expect(D.placement(0)).toBe('surface'); expect(D.placement(.08)).toBe('surface');
    expect(D.placement(.92)).toBe('thick'); expect(D.placement(1)).toBe('thick');
    expect(D.finish(at(initial(.5), 0, 17))).toMatchObject({ complete: true, action: 'thick' });
    expect(D.finish(at(initial(.5), 0, -17))).toMatchObject({ complete: true, action: 'surface' });
  });

  it('uses current depth after reversal while retaining deliberate travel', () => {
    const start = initial(), deep = at(start, 0, 40), middle = at(deep, 0, 20), surface = at(middle, 0, 0);
    expect(middle.travel).toBe(40); expect(middle.depth).toBe(.5); incomplete(middle);
    expect(surface.travel).toBe(40); expect(surface.depth).toBe(0);
    expect(D.finish(surface)).toMatchObject({ complete: true, action: 'surface' });
  });

  it('stops the illustrated tip at the skin and centre instead of passing below the food', () => {
    expect(at(initial(), 0, 120).depth).toBe(1);
    expect(at(initial(1), 0, -120).depth).toBe(0);
    expect(D.pose(at(initial(), 0, 90).depth).tip.y).toBe(1.56);
    expect(D.pose(at(initial(1), 0, -90).depth).tip.y).toBe(1.7355);
  });

  it('allows exact sideways and vertical contact boundaries but rejects exceeding them', () => {
    expect(at(initial(), 45, 0).invalid).toBe(false);
    expect(at(initial(), -45, 0).invalid).toBe(false);
    expect(at(initial(), 0, 120).invalid).toBe(false);
    expect(at(initial(), 0, -120).invalid).toBe(false);
    for (const [dx, dy] of [[45.001, 0], [-45.001, 0], [0, 120.001], [0, -120.001]]) {
      const trace = at(initial(), dx, dy);
      expect(trace.invalid).toBe(true); expect(trace.phase).toBe('retry'); incomplete(trace);
      const retry = at(trace, 0, 40); expect(retry.invalid).toBe(true); incomplete(retry);
    }
  });

  it('reports bounded progress without treating partial insertion as completion', () => {
    expect(D.progress(at(initial(), 0, 20))).toBe(.5);
    expect(D.progress(at(initial(), 0, 40))).toBe(1);
    expect(D.progress(at(initial(1), 0, -40))).toBe(1);
    expect(D.progress(at(initial(), 46, 0))).toBe(0);
    expect(D.progress(null)).toBe(0);
  });

  it('never returns a read or cooking action, even after repeated completion checks', () => {
    for (const trace of [initial(), at(initial(), 0, 20), at(initial(), 0, 40), at(initial(1), 0, -40), at(initial(), 46, 0)]) {
      const result = D.finish(trace);
      expect([null, 'surface', 'thick']).toContain(result.action);
      expect(result.action).not.toBe('read'); expect(D.finish(trace)).toEqual(result);
    }
  });

  it('does not mutate input options, points or nested trace points', () => {
    const point = Object.freeze({ x: 10, y: 20 }), options = Object.freeze({ depth: .5, unit: 1 });
    const start = D.begin(point, options), snapshot = JSON.stringify(start);
    Object.freeze(start.start); Object.freeze(start.current); Object.freeze(start);
    const sample = Object.freeze({ x: 10, y: 40 }), next = D.move(start, sample);
    expect(JSON.stringify(start)).toBe(snapshot); expect(options).toEqual({ depth: .5, unit: 1 });
    expect(next).not.toBe(start); expect(next.start).not.toBe(start.start); expect(next.current).not.toBe(sample);
    const invalid = D.move(next, { x: 100, y: 40 }), again = D.move(invalid, { x: 10, y: 20 });
    expect(again).not.toBe(invalid); expect(again.start).not.toBe(invalid.start); expect(again.current).not.toBe(invalid.current);
  });

  it.each([undefined, null, {}, [], { x: 0 }, { x: '0', y: 0 }, { x: NaN, y: 0 }, { x: 0, y: Infinity }])('fails closed for invalid pointer %j', point => {
    expect(D.begin(point)).toBeNull();
    const trace = D.move(initial(), point); expect(trace.invalid).toBe(true); expect(trace.phase).toBe('retry'); incomplete(trace);
  });

  it.each([0, -1, NaN, Infinity, '1', null, undefined])('rejects explicitly invalid unit %j', unit => {
    expect(D.begin({ x: 0, y: 0 }, { unit })).toBeNull();
  });

  it.each([-1, 1.0001, NaN, Infinity, '0', null, undefined, {}, []])('rejects unsupported depth %j throughout the API', depth => {
    expect(D.begin({ x: 0, y: 0 }, { depth })).toBeNull();
    expect(D.pose(depth)).toBeNull(); expect(D.placement(depth)).toBeNull();
  });

  it.each([[], 'settings', false, 1, () => {}])('rejects non-object option shapes %j', options => {
    expect(D.begin({ x: 0, y: 0 }, options)).toBeNull();
  });

  it('rejects arithmetic overflow and malformed traces without allowing forged completion', () => {
    const trace = D.begin({ x: -1e308, y: -1e308 });
    const overflow = D.move(trace, { x: 1e308, y: 1e308 }); expect(overflow.invalid).toBe(true); incomplete(overflow);
    for (const bad of [null, {}, { ...initial(), unit: 0 }, { ...initial(), travel: Infinity }, { ...initial(), depth: 2 }, { ...initial(), phase: 'read' }]) {
      expect(D.move(bad, { x: 0, y: 0 })).toBeNull(); expect(D.progress(bad)).toBe(0); incomplete(bad);
    }
    incomplete({ ...initial(.5), phase: 'thick', travel: 40 });
  });

  it('places the zero-depth sensing tip on the exact ellipsoid skin', () => {
    const pose = D.pose(0);
    expect(pose.tip).toEqual({ x: 0, y: 1.7355, z: 0 });
    expect(normalizedChicken(pose.tip)).toBeCloseTo(1, 13);
    expect(normalizedChicken(pose.shaft)).toBeGreaterThan(1);
  });

  it('places full insertion at the chicken centre', () => {
    expect(D.pose(1).tip).toEqual({ x: 0, y: 1.56, z: 0 });
    expect(normalizedChicken(D.pose(1).tip)).toBe(0);
  });

  it.each([0, .08, .25, .5, .92, 1])('keeps the true shaft endpoint and display aligned at depth %s', depth => {
    const pose = D.pose(depth);
    expect(pose.rotationZ).toBe(0);
    expect(pose.tip.y).toBeCloseTo(1.7355 - .1755 * depth, 14);
    expect(pose.shaft.y - .22).toBeCloseTo(pose.tip.y, 14);
    expect(pose.shaft.y + .22 - pose.tip.y).toBeCloseTo(.44, 14);
    expect(pose.display.y - pose.tip.y).toBeCloseTo(.47, 14);
    for (const field of ['tip', 'shaft', 'display']) expect([pose[field].x, pose[field].z]).toEqual([0, 0]);
    if (depth > 0 && depth < 1) expect(normalizedChicken(pose.tip)).toBeLessThan(1);
  });

  it('returns independent deeply immutable geometry without renderer or clock access', () => {
    const first = D.pose(.5), second = D.pose(.5);
    expect(first).toEqual(second); expect(first).not.toBe(second); expect(Object.isFrozen(first)).toBe(true);
    for (const field of ['shaft', 'display', 'tip']) {
      expect(Object.isFrozen(first[field])).toBe(true); expect(first[field]).not.toBe(second[field]);
      expect(Reflect.set(first[field], 'y', 999)).toBe(false);
    }
    const source = readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_probe_depth.js'), 'utf8');
    const forbidden = new Proxy({}, { get() { throw new Error('Unexpected host access'); } });
    const context = { window: {}, document: forbidden, performance: forbidden, Date: forbidden };
    runInNewContext(source, context);
    const api = context.window.KitchenStudioProbeDepth, trace = api.move(api.begin({ x: 0, y: 0 }), { x: 0, y: 40 });
    expect(api.finish(trace).action).toBe('thick'); expect(api.progress(trace)).toBe(1); expect(api.pose(1).tip.y).toBe(1.56);
  });
});
