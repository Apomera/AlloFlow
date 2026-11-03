import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const Plating = require('../stem_lab/kitchen_studio/kitchen_studio_plating.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const plate = { overPlate: true, anchor: { x: 100, y: 100 } };
const active = (unit = 1) => Plating.move(Plating.begin({ x: 0, y: 100 }, { unit }), plate.anchor, plate);
const at = (trace, dx, dy, overPlate = true) => Plating.move(trace, {
  x: trace.anchor.x + dx * trace.unit, y: trace.anchor.y + dy * trace.unit,
}, { overPlate, anchor: plate.anchor });
const tipped = (unit = 1) => at(active(unit), 0, 40);
const ready = (unit = 1) => at(tipped(unit), 0, 0);
const incomplete = trace => expect(Plating.finish(trace)).toMatchObject({ complete: false, action: null });

describe('Controlled pan plating', () => {
  it('loads with the shared browser gesture without DOM, storage or clock access', () => {
    const unavailable = new Proxy({}, { get() { throw new Error('Unexpected environment dependency'); } });
    const context = { window: {}, document: unavailable, localStorage: unavailable,
      Date: class { constructor() { throw new Error('Unexpected clock'); } static now() { throw new Error('Unexpected clock'); } },
      setTimeout() { throw new Error('Unexpected timer'); }, requestAnimationFrame() { throw new Error('Unexpected animation'); } };
    for (const name of ['kitchen_studio_pour.js', 'kitchen_studio_plating.js']) {
      runInNewContext(readFileSync(require.resolve('../stem_lab/kitchen_studio/' + name), 'utf8'), context);
    }
    const api = context.window.KitchenStudioPlating;
    expect(Object.keys(api).sort()).toEqual(['begin', 'finish', 'move', 'progress']);
    let trace = api.move(api.begin({ x: 0, y: 100 }), plate.anchor, plate);
    trace = api.move(trace, { x: 100, y: 140 }, plate);
    trace = api.move(trace, plate.anchor, plate);
    expect(api.finish(trace)).toMatchObject({ complete: true, action: 'plate' });
    expect(api.progress(trace)).toBe(1);
  });

  it('does not plate for a tap, carrying alone, or a partial tip and return', () => {
    const start = Plating.begin(plate.anchor);
    incomplete(start); incomplete(Plating.move(start, plate.anchor, plate));
    incomplete(active()); incomplete(at(at(active(), 0, 39.9), 0, 0));
    expect(Plating.finish(active()).message).toMatch(/Tip the pan/);
  });

  it('requires deliberate carrying and a current plate hit before anchoring', () => {
    const start = Plating.begin({ x: 0, y: 100 });
    for (const target of [undefined, null, {}, { overPlate: false, anchor: plate.anchor }, { overPlate: 1, anchor: plate.anchor }, { over: true, anchor: plate.anchor }, { overPlate: true }]) {
      expect(Plating.move(start, plate.anchor, target).anchor).toBeNull();
    }
    expect(Plating.move(Plating.begin({ x: 90.1, y: 100 }), plate.anchor, plate).phase).toBe('carry');
    expect(Plating.move(Plating.begin({ x: 90, y: 100 }), plate.anchor, plate).phase).toBe('tilt');
    expect(Plating.move(start, { x: 118, y: 100 }, plate).phase).toBe('tilt');
    expect(Plating.move(start, { x: 118.1, y: 100 }, plate).phase).toBe('carry');
  });

  it('offers only the existing plate action after the full tip and level return', () => {
    const down = tipped();
    expect(down).toMatchObject({ phase: 'return', tipped: true, tilt: 1 });
    incomplete(down);
    expect(Plating.finish(down).message).toMatch(/Level the pan/);
    const result = Plating.finish(ready());
    expect(result).toEqual({ complete: true, action: 'plate', message: 'Release to plate the mushrooms and switch off the burner.' });
    expect(result).not.toHaveProperty('view');
    expect(result.action).not.toMatch(/add|advance|cook/);
  });

  it.each([-12, 0, 10])('allows level return boundary %s only over the plate', dy => {
    expect(Plating.finish(at(tipped(), 28, dy)).action).toBe('plate');
    incomplete(at(tipped(), 28, dy, false));
  });

  it.each([[0, -12.1], [0, 10.1], [28.1, 0], [-28.1, 0]])('requires more precise leveling outside (%s, %s)', (dx, dy) => {
    const trace = at(tipped(), dx, dy);
    expect(trace).toMatchObject({ phase: 'return', invalid: false });
    incomplete(trace);
    expect(Plating.finish(at(trace, 0, 0)).action).toBe('plate');
  });

  it('revokes readiness when the pan leaves the plate and allows it to be re-aimed', () => {
    const complete = ready();
    for (const next of [at(complete, 0, 20), at(complete, 35, 0), at(complete, 0, 0, false), Plating.move(complete, complete.current)]) {
      incomplete(next);
      expect(next.phase).toBe('return');
    }
    expect(at(at(complete, 0, 0, false), 0, 0).phase).toBe('ready');
  });

  it.each([[56.1, 0], [-56.1, 0], [0, -28.1]])('keeps contact loss beyond (%s, %s) cancelled', (dx, dy) => {
    const trace = at(active(), dx, dy);
    expect(trace).toMatchObject({ invalid: true, phase: 'invalid' });
    expect(Plating.progress(trace)).toBe(0);
    incomplete(at(at(trace, 0, 40), 0, 0));
    expect(Plating.finish(trace).message).toMatch(/plating path/);
  });

  it.each([.5, 1, 2])('uses the shared normalized gesture at unit %s', unit => {
    const trace = active(unit);
    expect(trace.phase).toBe('tilt');
    const down = at(trace, 0, 40);
    expect(down.tilt).toBe(1); incomplete(down);
    expect(Plating.finish(at(down, -28, 10)).action).toBe('plate');
    expect(at(trace, 56.1, 0).invalid).toBe(true);
    incomplete(at(down, 0, 0, false));
  });

  it('shows carry, tip, return and ready progress without advancing cooking', () => {
    expect(Plating.progress(null)).toBe(0);
    expect(Plating.progress(active())).toBe(0);
    expect(Plating.progress(at(active(), 0, 20))).toBe(.25);
    expect(Plating.progress(tipped())).toBe(.5);
    expect(Plating.progress(at(tipped(), 0, 20))).toBeCloseTo(.725);
    expect(Plating.progress(at(tipped(), 0, 0, false))).toBeCloseTo(.95);
    expect(Plating.progress(ready())).toBe(1);
  });

  it('copies and freezes the original aim while preserving frozen prior input', () => {
    const start = { x: 0, y: 100 }, point = { x: 100, y: 100 }, anchor = { x: 100, y: 100 };
    const first = Plating.begin(start), trace = Plating.move(first, point, { overPlate: true, anchor });
    start.x = point.x = anchor.x = 900;
    expect(first.start).toEqual({ x: 0, y: 100 });
    expect(trace.anchor).toEqual({ x: 100, y: 100 });
    for (const value of [trace.start, trace.current, trace.anchor, trace]) Object.freeze(value);
    const prior = JSON.stringify(trace);
    const next = Plating.move(trace, { x: 100, y: 140 }, { overPlate: true, anchor: { x: 900, y: 900 } });
    expect(JSON.stringify(trace)).toBe(prior);
    expect(next.anchor).toEqual({ x: 100, y: 100 });
    for (const field of ['start', 'current', 'anchor']) expect(next[field]).not.toBe(trace[field]);
    const completed = Object.freeze(ready());
    expect(Plating.finish(completed)).not.toBe(Plating.finish(completed));
  });

  it.each([null, {}, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: '0', y: 0 }])('fails closed for malformed starting point %j', point => {
    expect(Plating.begin(point)).toBeNull(); incomplete(Plating.begin(point));
  });

  it('preserves shared validation for units and movement points', () => {
    for (const unit of [0, -1, NaN, Infinity, null, '1']) expect(Plating.begin({ x: 0, y: 0 }, { unit })).toBeNull();
    for (const point of [null, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: '1', y: 0 }]) {
      const trace = Plating.move(ready(), point, plate);
      expect(trace.invalid).toBe(true); incomplete(trace);
    }
  });

  it('leaves cooking judgments with the engine and never mutates evidence during preview', () => {
    const early = K.start('heat', 'demonstrate');
    const original = JSON.stringify(early);
    const result = Plating.finish(ready());
    expect(JSON.stringify(early)).toBe(original);
    const rejected = K.act(early, result.action);
    expect(rejected.log).toHaveLength(1);
    expect(rejected.log[0]).toMatchObject({ action: 'plate', accepted: false });
    expect(rejected.done).toBe(false);
    let golden = K.start('heat');
    for (const action of ['dry', 'spread', 'medium', 'advance', 'advance', 'advance']) golden = K.act(golden, action);
    const before = JSON.stringify(golden), count = golden.log.length;
    Plating.finish(ready());
    expect(JSON.stringify(golden)).toBe(before);
    const plated = K.act(golden, result.action);
    expect(plated.log).toHaveLength(count + 1);
    expect(plated.log.at(-1)).toMatchObject({ action: 'plate', accepted: true });
    expect(plated.done).toBe(true);
    expect(early.log).toEqual([]);
  });

  it('keeps every instruction specific to the pan and plate', () => {
    for (const trace of [null, Plating.begin({ x: 0, y: 0 }), active(), tipped(), ready(), at(active(), 57, 0)]) {
      expect(Plating.finish(trace).message).not.toMatch(/carton|jug|mL|seconds|timer/i);
    }
  });
});
