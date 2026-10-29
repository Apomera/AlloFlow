import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const origin = { x: 100, y: 100 };
const at = (x, y) => ({ x: origin.x + x, y: origin.y + y });

describe('Skills Studio knife movement', () => {
  it('commits only a full downward pass followed by lifting back', () => {
    const start = G.begin('cut', origin, { action: 'largeDice' });
    const partial = G.move(start, at(0, 44));
    const down = G.move(partial, at(0, 45));
    const almostUp = G.move(down, at(0, 15));
    const up = G.move(almostUp, at(0, 14));
    for (const frame of [start, partial, down, almostUp]) expect(G.finish(frame).complete).toBe(false);
    expect(G.finish(up)).toMatchObject({ complete: true, action: 'largeDice' });
    expect(G.progress(start)).toBe(0);
    expect(G.progress(down)).toBe(.5);
    expect(G.progress(up)).toBe(1);
  });
  it('never accepts sideways scrubbing, including a return to the start', () => {
    const start = G.begin('cut', origin);
    const sideways = G.move(start, at(46, 60));
    expect(sideways.invalid).toBe(true);
    expect(G.finish(G.move(sideways, origin))).toMatchObject({ complete: false, action: null });
    const tolerant = G.move(G.move(start, at(12, 60)), at(-10, 2));
    expect(G.finish(tolerant).complete).toBe(true);
  });
  it('does not bypass the board and hand position requirements of the engine', () => {
    const trace = G.move(G.move(G.begin('cut', origin), at(0, 50)), origin);
    const result = G.finish(trace);
    const unsafe = K.act(K.start('knife'), result.action);
    expect(unsafe.done).toBe(false);
    expect(unsafe.log.at(-1).accepted).toBe(false);
    const prepared = K.act(K.act(K.start('knife'), 'secure'), 'claw');
    expect(K.act(prepared, result.action).done).toBe(true);
  });
});

describe('Measured stock and heat controls', () => {
  it('transfers one 50 mL measure on release and permits returning to cancel', () => {
    const start = G.begin('pour', origin);
    expect(G.finish(G.move(start, at(0, -29))).action).toBeNull();
    expect(G.finish(G.move(start, at(0, -30))).action).toBe('add50');
    expect(G.finish(G.move(start, at(0, -300))).action).toBe('add50');
    expect(G.finish(G.move(start, at(0, 30))).action).toBe('remove50');
    const returned = G.move(G.move(start, at(0, -100)), origin);
    expect(G.finish(returned).complete).toBe(false);
    expect(G.finish(G.move(start, at(300, 0))).complete).toBe(false);
    expect(K.act(K.start('measure'), G.finish(G.move(start, at(0, -100))).action).values.ml).toBe(50);
  });
  it('allows deliberate heat adjustments and clamps them to the three settings', () => {
    const start = G.begin('dial', origin, { level: 2 });
    expect(G.finish(G.move(start, at(0, -11))).complete).toBe(false);
    expect(G.finish(G.move(start, at(0, -12))).action).toBe('high');
    expect(G.finish(G.move(start, at(0, 20))).action).toBe('low');
    expect(G.move(start, at(0, 1000)).level).toBe(1);
    expect(G.move(start, at(0, -1000)).level).toBe(3);
    const fromLow = G.begin('dial', origin, { level: 1 });
    expect(G.finish(G.move(fromLow, at(0, -20))).action).toBe('medium');
    expect(G.finish(G.move(fromLow, at(0, -40))).action).toBe('high');
    expect(G.finish(G.move(G.move(start, at(0, -30)), origin)).complete).toBe(false);
  });
});

describe('Gesture input and preview isolation', () => {
  it.each(['cut', 'pour', 'dial', 'dry', 'grip'])('ignores clicks and invalid coordinates for %s', kind => {
    expect(G.begin(kind, null)).toBeNull();
    expect(G.begin(kind, { x: NaN, y: 10 })).toBeNull();
    const start = G.begin(kind, origin);
    expect(G.finish(start)).toMatchObject({ complete: false, action: null });
    const invalid = G.move(start, { x: 100, y: Infinity });
    expect(G.finish(invalid)).toMatchObject({ complete: false, action: null });
    expect(G.progress(invalid)).toBe(0);
  });
  it('scales movement thresholds with the rendered scene', () => {
    const start = G.begin('cut', origin, { unit: .5 });
    expect(G.move(start, at(0, 22)).phase).toBe('down');
    expect(G.move(start, at(0, 22.5)).phase).toBe('up');
    expect(G.finish(G.move(G.move(start, at(0, 23)), at(0, 7))).complete).toBe(true);
    expect(G.finish(G.move(G.begin('pour', origin, { unit: 2 }), at(0, -59))).complete).toBe(false);
    expect(G.finish(G.move(G.begin('pour', origin, { unit: 2 }), at(0, -60))).complete).toBe(true);
    expect(G.begin('pour', origin, { unit: .01 }).unit).toBe(.5);
    expect(G.begin('pour', origin, { unit: Infinity }).unit).toBe(1);
  });
  it('keeps earlier frames and input objects unchanged', () => {
    const input = Object.freeze({ x: 100, y: 100 });
    const start = G.begin('cut', input);
    Object.freeze(start.start); Object.freeze(start.current); Object.freeze(start);
    const down = G.move(start, at(0, 70));
    Object.freeze(down.current); Object.freeze(down);
    const up = G.move(down, origin);
    expect(start.phase).toBe('down');
    expect(start.depth).toBe(0);
    expect(down.phase).toBe('up');
    expect(up.phase).toBe('ready');
    expect(input).toEqual(origin);
    expect(G.begin('unknown', origin)).toBeNull();
    expect(G.move(null, origin)).toBeNull();
    expect(G.finish(null).action).toBeNull();
  });
});

describe('Guiding-hand grip movement', () => {
  it('requires a deliberate vertical movement before selecting either grip', () => {
    const flat = G.begin('grip', origin, { claw: false });
    expect(flat.curl).toBe(0);
    expect(G.finish(G.move(flat, at(0, -27))).complete).toBe(false);
    const tucked = G.move(flat, at(0, -28));
    expect(tucked.curl).toBeCloseTo(.7);
    expect(tucked.phase).toBe('ready');
    expect(G.finish(tucked)).toMatchObject({ complete: true, action: 'claw' });
    expect(G.progress(tucked)).toBe(1);
    expect(G.move(flat, at(0, -400)).curl).toBe(1);
    const claw = G.begin('grip', origin, { claw: true });
    expect(claw.curl).toBe(1);
    expect(G.finish(G.move(claw, at(0, 27))).complete).toBe(false);
    const extended = G.move(claw, at(0, 28));
    expect(extended.curl).toBeCloseTo(.3);
    expect(G.finish(extended)).toMatchObject({ complete: true, action: 'flat' });
    expect(G.move(claw, at(0, 400)).curl).toBe(0);
  });

  it('does not accumulate jitter and cancels a choice when returned to the origin', () => {
    let trace = G.begin('grip', origin, { claw: true });
    for (let i = 0; i < 50; i++) trace = G.move(trace, at(i % 2 ? 5 : -5, i % 2 ? 6 : -6));
    expect(G.finish(trace).complete).toBe(false);
    expect(G.progress(trace)).toBeLessThan(1);
    const ready = G.move(trace, at(0, 45));
    expect(G.finish(ready).action).toBe('flat');
    const returned = G.move(ready, origin);
    expect(G.finish(returned)).toMatchObject({ complete: false, action: null });
    expect(returned.curl).toBe(1);
    expect(G.progress(returned)).toBe(0);
  });

  it('rejects sideways movement even if a valid vertical movement follows', () => {
    const start = G.begin('grip', origin);
    expect(G.finish(G.move(start, at(35, -28))).action).toBe('claw');
    const away = G.move(start, at(36, -40));
    expect(away.invalid).toBe(true);
    expect(away.phase).toBe('retry');
    expect(G.finish(G.move(away, at(0, -40)))).toMatchObject({ complete: false, action: null });
    expect(G.progress(away)).toBe(0);
  });

  it('scales the grip thresholds and preserves earlier preview frames', () => {
    const input = Object.freeze({ x: 100, y: 100 });
    const start = G.begin('grip', input, { unit: .5 });
    Object.freeze(start.start); Object.freeze(start.current); Object.freeze(start);
    const partial = G.move(start, at(0, -13));
    Object.freeze(partial.current); Object.freeze(partial);
    const ready = G.move(partial, at(0, -14));
    expect(G.finish(partial).complete).toBe(false);
    expect(G.finish(ready).action).toBe('claw');
    expect(start.curl).toBe(0);
    expect(partial.curl).toBeCloseTo(.65);
    expect(G.move(start, at(18, -14)).invalid).toBe(true);
    const large = G.begin('grip', origin, { unit: 2 });
    expect(G.finish(G.move(large, at(0, -55))).complete).toBe(false);
    expect(G.finish(G.move(large, at(0, -56))).action).toBe('claw');
    expect(input).toEqual(origin);
  });

  it('shares engine grip decisions without cutting automatically or bypassing board setup', () => {
    const source = K.start('knife');
    const clawAction = G.finish(G.move(G.begin('grip', origin), at(0, -40))).action;
    const tucked = K.act(source, clawAction);
    expect(source.values.claw).toBeUndefined();
    expect(tucked.values.claw).toBe(true);
    expect(tucked.values.cut).toBeUndefined();
    expect(tucked.done).toBe(false);
    expect(tucked.log).toHaveLength(1);
    expect(K.act(tucked, 'dice').log.at(-1).accepted).toBe(false);
    const prepared = K.act(tucked, 'secure');
    const flatAction = G.finish(G.move(G.begin('grip', origin, { claw: true }), at(0, 40))).action;
    const extended = K.act(prepared, flatAction);
    expect(extended.values.claw).toBe(false);
    expect(extended.log.at(-1).accepted).toBe(false);
    expect(K.act(extended, 'dice').done).toBe(false);
    expect(K.act(prepared, 'dice').done).toBe(true);
  });
});

describe('Paper towel drying movement', () => {
  it('requires three deliberate alternating passes before recording drying', () => {
    const start = G.begin('dry', origin);
    const partial = G.move(start, at(23, 0));
    const right = G.move(partial, at(24, 0));
    const left = G.move(right, at(0, 0));
    const done = G.move(left, at(24, 0));
    expect([start, partial, right, left].map(t => G.finish(t).complete)).toEqual([false, false, false, false]);
    expect([right.passes, left.passes, done.passes]).toEqual([1, 2, 3]);
    expect(G.progress(right)).toBeCloseTo(1 / 3);
    expect(G.progress(left)).toBeCloseTo(2 / 3);
    expect(G.progress(done)).toBe(1);
    expect(G.finish(done)).toMatchObject({ action: 'dry', complete: true });
    const source = K.start('heat');
    const result = K.act(source, G.finish(done).action);
    expect(source.values.dry).toBeUndefined();
    expect(result.values.dry).toBe(true);
    expect(result.values.seconds).toBeUndefined();
    expect(result.log).toHaveLength(1);
  });

  it('cannot finish by holding still, moving one way, or accumulating tiny jitter', () => {
    let still = G.begin('dry', origin);
    for (let i = 0; i < 50; i++) still = G.move(still, origin);
    expect(still.passes).toBe(0);
    let oneWay = G.begin('dry', origin);
    for (let x = 10; x <= 200; x += 10) oneWay = G.move(oneWay, at(x, 0));
    expect(oneWay.passes).toBe(1);
    let jitter = oneWay;
    for (let i = 0; i < 50; i++) jitter = G.move(jitter, at(i % 2 ? 200 : 195, 0));
    expect(jitter.passes).toBe(1);
    for (const trace of [still, oneWay, jitter]) expect(G.finish(trace).complete).toBe(false);
    // Reversal is measured from the extreme (200), not the first threshold (30).
    const reversed = G.move(oneWay, at(176, 0));
    expect(reversed.passes).toBe(2);
    expect(G.move(reversed, at(200, 0)).passes).toBe(3);
  });

  it('accepts either starting direction but rejects leaving the contact band', () => {
    const start = G.begin('dry', origin);
    const left = G.move(start, at(-24, 40));
    const right = G.move(left, at(0, -40));
    const done = G.move(right, at(-24, 0));
    expect(G.finish(done).complete).toBe(true);
    for (const frame of [start, done]) {
      const away = G.move(frame, at(25, 41));
      expect(away.phase).toBe('retry');
      expect(G.finish(G.move(away, origin))).toMatchObject({ complete: false, action: null });
      expect(G.progress(away)).toBe(0);
    }
  });

  it('scales thresholds and keeps earlier frames unchanged', () => {
    const input = Object.freeze({ x: 100, y: 100 });
    const start = G.begin('dry', input, { unit: .5 });
    Object.freeze(start.start); Object.freeze(start.current); Object.freeze(start);
    const partial = G.move(start, at(11, 0));
    expect(partial.passes).toBe(0);
    const first = G.move(partial, at(12, 20));
    Object.freeze(first.current); Object.freeze(first);
    const second = G.move(first, at(0, 0));
    const third = G.move(second, at(12, 0));
    expect(G.finish(third).complete).toBe(true);
    expect(start.passes).toBe(0);
    expect(first.passes).toBe(1);
    expect(first.rubEdge).toBe(24);
    expect(input).toEqual(origin);
    expect(G.move(third, at(12, 21)).invalid).toBe(true);
    expect(G.move(G.begin('dry', origin, { unit: 2 }), at(47, 0)).passes).toBe(0);
    expect(G.move(G.begin('dry', origin, { unit: 2 }), at(48, 0)).passes).toBe(1);
  });
});
