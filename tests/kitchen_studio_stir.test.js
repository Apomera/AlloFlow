import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../stem_lab/kitchen_studio/kitchen_studio_stir.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const tau = Math.PI * 2;
const point = (angle = 0, radius = .23) => ({ x: Math.cos(Math.PI + angle) * radius, z: Math.sin(Math.PI + angle) * radius });
const circle = (direction = 1, steps = 32, start = S.begin(point())) => {
  let trace = start;
  for (let i = 1; i <= steps; i++) trace = S.move(trace, point(direction * tau * i / 32));
  return trace;
};

describe('Deliberate pan-local stirring', () => {
  it.each([1, -1])('accepts one complete circle in direction %s, including angle wrap', direction => {
    let trace = S.begin({ x: .7, z: .5 });
    expect(trace.phase).toBe('carry');
    expect(S.finish(trace).action).toBeNull();
    trace = S.move(trace, point());
    expect(trace.phase).toBe('stir');
    const ready = circle(direction, 32, trace);
    expect(ready.travel).toBeCloseTo(direction * tau);
    expect(S.progress(ready)).toBe(1);
    expect(S.finish(ready)).toMatchObject({ complete: true, action: 'advance' });
    expect(S.finish(ready).message).toContain('30 simulated seconds');
  });
  it('does not accept a tap, carry, partial arc, or radial shortcut', () => {
    for (const trace of [S.begin(point()), S.begin({ x: .9, z: .4 }), circle(1, 24), S.move(S.begin(point()), { x: 0, z: 0 })]) {
      expect(S.finish(trace)).toMatchObject({ complete: false, action: null });
    }
  });
  it('requires returning to the start ring and checks the release position', () => {
    const ready = circle();
    const movedAway = S.move(ready, point(tau + .5));
    expect(S.progress(movedAway)).toBe(1);
    expect(S.finish(movedAway).action).toBeNull();
    expect(S.finish(movedAway).message).toContain('Return');
    const penultimate = circle(1, 30);
    expect(S.finish(penultimate).action).toBeNull();
    expect(S.finish(S.move(penultimate, point(tau)))).toMatchObject({ complete: true, action: 'advance' });
  });
  it('allows small hand jitter but subtracts backward movement from progress', () => {
    let trace = S.move(S.begin(point()), point(.3));
    const forward = trace.travel;
    trace = S.move(trace, point(.25));
    expect(trace.invalid).toBe(false);
    expect(trace.travel).toBeLessThan(forward);
    for (let a = .4; a < tau; a += .2) trace = S.move(trace, point(a));
    expect(S.finish(S.move(trace, point(tau))).complete).toBe(true);
  });
  it('rejects substantial reversal and cumulative backward scrubbing', () => {
    const forward = S.move(S.begin(point()), point(.4));
    const reverse = S.move(forward, point(.1));
    expect(reverse.invalid).toBe(true);
    let scrub = forward;
    for (let i = 0; i < 6; i++) {
      scrub = S.move(scrub, point(.35));
      scrub = S.move(scrub, point(.4));
    }
    expect(scrub.invalid).toBe(true);
    expect(S.finish(circle(1, 32, scrub)).action).toBeNull();
  });
  it('supports fine pointer samples without requiring a large first movement', () => {
    let trace = S.begin(point());
    for (let i = 1; i <= 800; i++) trace = S.move(trace, point(tau * i / 800));
    expect(trace.direction).toBe(1);
    expect(S.finish(trace).complete).toBe(true);
  });
  it.each([point(.1, .069), point(.1, .461), point(1), null, { x: NaN, z: 0 }, { x: 0, z: Infinity }])('rejects invalid active movement %j permanently', bad => {
    const trace = S.move(S.begin(point()), bad);
    expect(trace.invalid).toBe(true);
    expect(S.progress(trace)).toBe(0);
    expect(S.finish(circle(1, 32, trace))).toMatchObject({ complete: false, action: null });
  });
  it.each([null, undefined, {}, 'point', [], { x: '0', z: 0 }, { x: 0, z: -Infinity }])('fails closed for invalid starts %j', bad => {
    expect(S.begin(bad)).toBeNull();
    expect(S.finish(S.begin(bad))).toMatchObject({ complete: false, action: null });
  });
  it('does not mutate points, earlier traces, or repeated finish results', () => {
    const start = Object.freeze(point());
    const trace = S.begin(start);
    Object.freeze(trace.current); Object.freeze(trace);
    const before = JSON.stringify(trace), next = S.move(trace, Object.freeze(point(.3)));
    expect(JSON.stringify(trace)).toBe(before);
    expect(next).not.toBe(trace);
    const ready = Object.freeze(circle());
    expect(S.finish(ready)).toEqual(S.finish(ready));
    expect(S.finish(ready)).not.toBe(S.finish(ready));
  });
});

describe('Stirring preserves the cooking model', () => {
  it('offers one existing advance action and cannot bypass moisture, space or heat', () => {
    const action = S.finish(circle()).action;
    const play = actions => actions.reduce((s, a) => K.act(s, a), K.start('heat'));
    for (const actions of [['spread', 'medium'], ['dry', 'medium'], ['dry', 'spread', 'low'], ['dry', 'spread', 'off']]) {
      const state = play([...actions, action]);
      expect(state.values.brown || 0).toBe(0);
      expect(state.log.at(-1).action).toBe('advance');
    }
    const golden = play(['dry', 'spread', 'medium', action, action, action]);
    expect(golden.values.brown).toBe(3);
    expect(golden.values.seconds).toBe(90);
    expect(K.act(golden, 'plate').done).toBe(true);
  });
});
