import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const P = require('../stem_lab/kitchen_studio/kitchen_studio_pour.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const mouth = { over: true, anchor: { x: 100, y: 100 } };
const active = (unit = 1) => P.move(P.begin({ x: 0, y: 100 }, { unit }), mouth.anchor, mouth);
const at = (trace, dx, dy, over = true) => P.move(trace, {
  x: trace.anchor.x + dx * trace.unit, y: trace.anchor.y + dy * trace.unit,
}, { over, anchor: mouth.anchor });
const tipped = (unit = 1) => at(active(unit), 0, 40);
const ready = (unit = 1) => at(tipped(unit), 0, 0);
const partial = trace => expect(P.finish(trace)).toMatchObject({ complete: false, action: null });

describe('Controlled carton pour', () => {
  it('exports the same browser API without engine or DOM dependencies', () => {
    const context = { window: {} };
    runInNewContext(readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_pour.js'), 'utf8'), context);
    expect(Object.keys(context.window.KitchenStudioPour).sort()).toEqual(['begin', 'finish', 'move', 'progress']);
    expect(context.window.KitchenStudioPour.begin({ x: 0, y: 0 }).phase).toBe('carry');
  });

  it('starts in carry and never accepts a tap or carrying alone', () => {
    const trace = P.begin(mouth.anchor);
    expect(trace).toMatchObject({ phase: 'carry', anchor: null, unit: 1, tilt: 0, tipped: false, invalid: false });
    expect(P.progress(trace)).toBe(0);
    partial(trace);
    partial(P.move(trace, mouth.anchor, mouth));
    partial(P.move(trace, { x: 400, y: 400 }, mouth));
  });

  it('requires a true mouth hit, canonical anchor proximity, and deliberate carry travel', () => {
    const trace = P.begin({ x: 0, y: 100 });
    for (const target of [undefined, {}, { over: false, anchor: mouth.anchor }, { over: 1, anchor: mouth.anchor }, { over: true }, { over: true, anchor: { x: Infinity, y: 100 } }]) {
      expect(P.move(trace, mouth.anchor, target).phase).toBe('carry');
    }
    expect(P.move(trace, { x: 118.01, y: 100 }, mouth).phase).toBe('carry');
    expect(P.move(trace, { x: 118, y: 100 }, mouth).phase).toBe('tilt');
    expect(P.move(P.begin({ x: 90.1, y: 100 }), mouth.anchor, mouth).phase).toBe('carry');
    expect(P.move(P.begin({ x: 90, y: 100 }), mouth.anchor, mouth).phase).toBe('tilt');
  });

  it('requires the full 40-unit tip before returning upright', () => {
    const almost = at(active(), 0, 39.9);
    expect(almost).toMatchObject({ phase: 'tilt', tipped: false, invalid: false });
    expect(almost.tilt).toBeCloseTo(39.9 / 40);
    partial(at(almost, 0, 0));
    const full = at(almost, 0, 40);
    expect(full).toMatchObject({ phase: 'return', tipped: true, tilt: 1, invalid: false });
    partial(full);
    expect(P.finish(at(full, 0, 0))).toEqual({ complete: true, action: 'add50', message: 'Release to add one 50 mL measure.' });
  });

  it.each([-12, 0, 10])('accepts return height %s over the mouth', dy => {
    const trace = at(tipped(), 0, dy);
    expect(trace.phase).toBe('ready');
    expect(P.finish(trace).action).toBe('add50');
    expect(P.progress(trace)).toBe(1);
  });

  it.each([-12.1, 10.1, 20])('does not accept return height %s', dy => {
    const trace = at(tipped(), 0, dy);
    expect(trace).toMatchObject({ phase: 'return', invalid: false, tipped: true });
    partial(trace);
  });

  it('allows the ready lateral boundary but requires better aim beyond it', () => {
    expect(at(tipped(), 28, 0).phase).toBe('ready');
    expect(at(tipped(), -28, 0).phase).toBe('ready');
    const wide = at(tipped(), 28.1, 0);
    expect(wide).toMatchObject({ phase: 'return', invalid: false });
    partial(wide);
    expect(at(wide, 0, 0).phase).toBe('ready');
  });

  it('revokes ready when moved away or released outside the mouth', () => {
    const trace = ready();
    for (const next of [at(trace, 0, 20), at(trace, 35, 0), at(trace, 0, 0, false), P.move(trace, trace.current)]) {
      expect(next.phase).toBe('return');
      partial(next);
    }
    expect(at(at(trace, 0, 0, false), 0, 0).phase).toBe('ready');
  });

  it.each([[56, 0], [-56, 0], [0, -28]])('allows active path boundary (%s, %s)', (dx, dy) => {
    expect(at(active(), dx, dy).invalid).toBe(false);
  });

  it.each([[56.1, 0], [-56.1, 0], [0, -28.1]])('permanently rejects movement beyond (%s, %s)', (dx, dy) => {
    const trace = at(active(), dx, dy);
    expect(trace).toMatchObject({ phase: 'invalid', invalid: true });
    expect(P.progress(trace)).toBe(0);
    partial(at(at(trace, 0, 40), 0, 0));
  });

  it('clamps tilt while allowing a deeper downward tip', () => {
    const deep = at(active(), 0, 600);
    expect(deep).toMatchObject({ phase: 'return', tipped: true, invalid: false, tilt: 1 });
    expect(at(deep, 0, -20).tilt).toBe(0);
    expect(at(deep, 0, 0).phase).toBe('ready');
  });

  it('shows separate carry, tip, and return progress', () => {
    expect(P.progress(null)).toBe(0);
    expect(P.progress(active())).toBe(0);
    expect(P.progress(at(active(), 0, 20))).toBe(.25);
    expect(P.progress(tipped())).toBe(.5);
    expect(P.progress(at(tipped(), 0, 20))).toBeCloseTo(.725);
    expect(P.progress(at(tipped(), 0, 0, false))).toBeCloseTo(.95);
    expect(P.progress(ready())).toBe(1);
  });

  it.each([.5, 1, 2])('scales every carry, tip, aim and invalid boundary by unit %s', unit => {
    const anchor = { x: 250, y: 200 }, target = { over: true, anchor };
    const start = P.begin({ x: anchor.x - 10 * unit, y: anchor.y }, { unit });
    let trace = P.move(start, anchor, target);
    expect(trace.phase).toBe('tilt');
    trace = at(trace, 0, 40);
    expect(trace).toMatchObject({ tipped: true, tilt: 1 });
    expect(at(trace, 28, 10).phase).toBe('ready');
    expect(at(trace, 56.1, 0).invalid).toBe(true);
    expect(at(trace, 0, -28.1).invalid).toBe(true);
    expect(P.move(P.begin({ x: 0, y: 200 }, { unit }), { x: anchor.x + 18 * unit, y: 200 }, target).phase).toBe('tilt');
    expect(P.move(P.begin({ x: 0, y: 200 }, { unit }), { x: anchor.x + 18.1 * unit, y: 200 }, target).phase).toBe('carry');
  });

  it.each([null, undefined, {}, [], 'point', { x: '1', y: 0 }, { x: 0, y: NaN }, { x: Infinity, y: 0 }, { x: 0, y: -Infinity }])('fails closed for invalid starting point %j', point => {
    expect(P.begin(point)).toBeNull();
    partial(P.begin(point));
  });

  it.each([0, -1, NaN, Infinity, -Infinity, '1', null, undefined])('fails closed for invalid explicit unit %s', unit => {
    expect(P.begin({ x: 0, y: 0 }, { unit })).toBeNull();
  });

  it.each([null, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: '1', y: 0 }])('permanently rejects nonfinite movement %j during carry and pouring', point => {
    for (const before of [P.begin({ x: 0, y: 0 }), active(), ready()]) {
      const trace = P.move(before, point, mouth);
      expect(trace).toMatchObject({ phase: 'invalid', invalid: true });
      expect(P.progress(trace)).toBe(0);
      partial(P.move(trace, mouth.anchor, mouth));
    }
  });

  it('copies points and freezes the acquired canonical anchor across subsequent mouth updates', () => {
    const start = { x: 0, y: 100 }, point = { x: 100, y: 110 }, anchor = { x: 100, y: 100 };
    const first = P.begin(start), trace = P.move(first, point, { over: true, anchor });
    start.x = 900; point.y = 900; anchor.x = 900;
    expect(first.start).toEqual({ x: 0, y: 100 });
    expect(trace.current).toEqual({ x: 100, y: 110 });
    expect(trace.anchor).toEqual({ x: 100, y: 100 });
    expect(trace.tilt).toBe(.25);
    const next = P.move(trace, { x: 100, y: 140 }, { over: true, anchor: { x: 900, y: 900 } });
    expect(next.anchor).toEqual({ x: 100, y: 100 });
    expect(next.tipped).toBe(true);
  });

  it('never mutates frozen input points, earlier traces or finish results', () => {
    const trace = active();
    for (const point of [trace.start, trace.current, trace.anchor]) Object.freeze(point);
    Object.freeze(trace);
    const before = JSON.stringify(trace), next = at(trace, 0, 40);
    expect(JSON.stringify(trace)).toBe(before);
    expect(next).not.toBe(trace);
    for (const key of ['start', 'current', 'anchor']) expect(next[key]).not.toBe(trace[key]);
    const completed = Object.freeze(ready());
    expect(P.finish(completed)).toEqual(P.finish(completed));
    expect(P.finish(completed)).not.toBe(P.finish(completed));
    expect(P.move(null, mouth.anchor, mouth)).toBeNull();
  });
});

describe('Pouring preserves the measurement engine', () => {
  it('offers only one 50 mL action after repeated tip and return cycles', () => {
    let trace = active(), state = K.start('measure');
    const initial = JSON.stringify(state);
    for (let i = 0; i < 8; i++) trace = at(at(trace, 0, 40), 0, 0);
    expect(JSON.stringify(state)).toBe(initial);
    const result = P.finish(trace);
    expect(result).toEqual({ complete: true, action: 'add50', message: 'Release to add one 50 mL measure.' });
    state = K.act(state, result.action);
    expect(state.values.ml).toBe(50);
    expect(state.log).toHaveLength(1);
    expect(state.done).toBe(false);
  });

  it('uses existing capacity and measurement checking with no clock or volume side effects', () => {
    const action = P.finish(ready()).action;
    let state = K.start('measure');
    for (let i = 0; i < 9; i++) state = K.act(state, action);
    expect(state.values.ml).toBe(450);
    expect(state.done).toBe(false);
    expect(K.act(state, 'check').done).toBe(true);
    for (let i = 0; i < 20; i++) state = K.act(state, action);
    expect(state.values.ml).toBe(1000);
    expect(state.values.seconds).toBeUndefined();
    expect(state.log.every(entry => entry.action === 'add50')).toBe(true);
    expect(K.act(state, 'check').done).toBe(false);
  });
});
