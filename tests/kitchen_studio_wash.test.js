import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const W = require('../stem_lab/kitchen_studio/kitchen_studio_wash.js');
const initial = (unit = 1) => W.begin({ x: 150, y: 90 }, { unit });
const at = (trace, dx, dy = 0, overWater = false) => W.move(trace, { x: trace.start.x + dx * trace.unit, y: trace.start.y + dy * trace.unit }, { overWater });
const scrubbed = (unit = 1, direction = 1) => [24, 0, 24].reduce((trace, x) => at(trace, x * direction), initial(unit));
const ready = (unit = 1) => at(scrubbed(unit), 24, -10, true);
const partial = trace => expect(W.finish(trace)).toMatchObject({ complete: false, action: null });

describe('Symbolic handwashing gesture', () => {
  it('exports a browser API without DOM, clock or engine dependencies', () => {
    const context = { window: {} };
    runInNewContext(readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_wash.js'), 'utf8'), context);
    expect(Object.keys(context.window.KitchenStudioWash).sort()).toEqual(['begin', 'finish', 'move', 'progress']);
    expect(context.window.KitchenStudioWash.begin({ x: 0, y: 0 }).phase).toBe('rub');
  });

  it('starts with no completed pass and never accepts a tap', () => {
    const trace = initial();
    expect(trace).toMatchObject({ phase: 'rub', unit: 1, passes: 0, rubDirection: 0, rubEdge: 0, passTravel: 0, invalid: false, rinseStart: null });
    expect(W.progress(trace)).toBe(0);
    partial(trace); partial(at(trace, 0, 0, true));
    expect(W.begin({ x: 0, y: 0 }).unit).toBe(1);
  });

  it.each([1, -1])('counts three alternating passes starting in direction %s', direction => {
    let trace = initial();
    for (const [i, x] of [24, 0, 24].entries()) {
      trace = at(trace, x * direction);
      expect(trace.passes).toBe(i + 1);
      expect(trace.phase).toBe(i === 2 ? 'rinse' : 'rub');
      expect(W.progress(trace)).toBe((i + 1) / 4);
      partial(trace);
    }
    expect(trace.rinseStart).toEqual(trace.current);
    const complete = at(trace, 24 * direction, -10, true);
    expect(complete.phase).toBe('ready');
    expect(W.progress(complete)).toBe(1);
    expect(W.finish(complete)).toEqual({ complete: true, action: 'wash', message: 'Release to model a full soap-and-water wash.' });
  });

  it('counts from the latest extreme, not from small event reversals', () => {
    let trace = at(initial(), 24);
    trace = at(trace, 70);
    trace = at(trace, 60);
    expect(trace.passes).toBe(1); expect(trace.passTravel).toBe(10);
    trace = at(trace, 65);
    expect(trace.passes).toBe(1); expect(trace.passTravel).toBe(5);
    trace = at(trace, 46.01);
    expect(trace.passes).toBe(1);
    trace = at(trace, 46);
    expect(trace.passes).toBe(2); expect(trace.rubEdge).toBe(46);
    trace = at(trace, 22);
    expect(trace.passes).toBe(2); expect(trace.rubEdge).toBe(22);
    expect(at(trace, 46).passes).toBe(3);
  });

  it('does not accumulate tiny jiggles into a pass', () => {
    let trace = initial();
    for (let i = 0; i < 100; i++) trace = at(trace, i % 2 ? 3 : -3);
    expect(trace.passes).toBe(0);
    trace = at(trace, 24);
    for (let i = 0; i < 100; i++) trace = at(trace, i % 2 ? 22 : 24);
    expect(trace.passes).toBe(1); partial(trace);
  });

  it('a long sweep counts once and the exact 24-unit boundary is deliberate', () => {
    expect(at(initial(), 23.99).passes).toBe(0);
    expect(at(initial(), 24).passes).toBe(1);
    const trace = at(initial(), 120);
    expect(trace.passes).toBe(1); expect(trace.invalid).toBe(false);
    expect(at(trace, -120).passes).toBe(2);
  });

  it.each([.1, .5, 1, 2, 8])('uses normalized units with clamping for %s', unit => {
    const trace = scrubbed(unit);
    expect(trace.unit).toBe(Math.max(.5, Math.min(2, unit)));
    expect(trace.passes).toBe(3);
    expect(at(trace, 24, -9.99, true).phase).toBe('rinse');
    expect(at(trace, 24, -10, true).phase).toBe('ready');
  });

  it.each([{ x: 0, y: 0, dx: 120, dy: 40 }, { x: 0, y: 0, dx: -120, dy: -40 }])('permits the rub-band boundary %j', ({ dx, dy }) => {
    expect(at(initial(), dx, dy).invalid).toBe(false);
  });

  it.each([[120.01, 0], [-120.01, 0], [0, 40.01], [0, -40.01]])('permanently cancels a rub outside (%s, %s)', (dx, dy) => {
    const trace = at(initial(), dx, dy);
    expect(trace).toMatchObject({ invalid: true, phase: 'retry' });
    expect(W.progress(trace)).toBe(0); partial(trace);
    const back = at(trace, 24, 0, true);
    expect(back).toEqual(trace); expect(back).not.toBe(trace); partial(back);
  });

  it('requires a separate rinse movement after the third pass', () => {
    const second = at(at(initial(), 24), 0);
    const third = at(second, 24, 0, true);
    expect(third.phase).toBe('rinse'); partial(third);
    expect(at(third, 24, 0, true).phase).toBe('rinse');
    expect(at(third, 24, 9.99, true).phase).toBe('rinse');
    expect(at(third, 30, 8, true).phase).toBe('ready');
  });

  it('allows travelling beyond the rub band to reach water', () => {
    const trace = at(scrubbed(), 400, -200, true);
    expect(trace).toMatchObject({ invalid: false, phase: 'ready', passes: 3 });
    expect(W.finish(trace).action).toBe('wash');
  });

  it.each([undefined, {}, { overWater: false }, { overWater: 1 }, { overWater: 'true' }])('requires a strict current water hit: %j', water => {
    const trace = W.move(scrubbed(), { x: 174, y: 70 }, water);
    expect(trace.phase).toBe('rinse'); expect(W.progress(trace)).toBe(.75); partial(trace);
  });

  it('revokes ready when moved away, and permits returning under water', () => {
    let trace = ready();
    expect(W.finish(trace).complete).toBe(true);
    trace = at(trace, 24, -30, false);
    expect(trace.phase).toBe('rinse'); partial(trace);
    trace = at(trace, 24, -20, true);
    expect(trace.phase).toBe('ready'); expect(trace.passes).toBe(3);
    trace = at(trace, 24, 0, true);
    expect(trace.phase).toBe('rinse'); partial(trace);
  });

  it.each([undefined, null, {}, { x: 1 }, { x: '1', y: 0 }, { x: 0, y: NaN }, { x: Infinity, y: 0 }])('fails closed for invalid points %j', point => {
    expect(W.begin(point)).toBeNull();
    for (const previous of [initial(), scrubbed(), ready()]) {
      const trace = W.move(previous, point, { overWater: true });
      expect(trace).toMatchObject({ invalid: true, phase: 'retry' }); partial(trace);
    }
  });

  it.each([0, -1, NaN, Infinity, '1', null, undefined])('rejects explicit invalid units %s', unit => {
    expect(W.begin({ x: 0, y: 0 }, { unit })).toBeNull();
  });

  it.each([false, true, 1, 'options', []])('rejects malformed options %j', options => {
    expect(W.begin({ x: 0, y: 0 }, options)).toBeNull();
  });

  it('handles an absent trace without offering an action', () => {
    expect(W.move(null, { x: 1, y: 1 })).toBeNull();
    expect(W.progress(null)).toBe(0); partial(null);
    partial({ phase: 'ready', passes: 2, invalid: false });
  });

  it('copies nested input points and never mutates traces or water metadata', () => {
    const point = { x: 150, y: 90 }, options = { unit: 1 };
    const first = W.begin(point, options); point.x = 500;
    expect(first.start.x).toBe(150); expect(first.current.x).toBe(150);
    for (const trace of [first, scrubbed(), ready(), at(initial(), 121)]) {
      const before = structuredClone(trace), water = Object.freeze({ overWater: true });
      Object.freeze(trace.start); Object.freeze(trace.current); if (trace.rinseStart) Object.freeze(trace.rinseStart); Object.freeze(trace);
      const sample = Object.freeze({ x: 174, y: 70 }), next = W.move(trace, sample, water);
      expect(trace).toEqual(before); expect(next).not.toBe(trace);
      expect(next.start).not.toBe(trace.start); expect(next.current).not.toBe(trace.current);
      if (trace.rinseStart) expect(next.rinseStart).not.toBe(trace.rinseStart);
      W.progress(trace); W.finish(trace); expect(trace).toEqual(before);
    }
    expect(options).toEqual({ unit: 1 });
  });
});
