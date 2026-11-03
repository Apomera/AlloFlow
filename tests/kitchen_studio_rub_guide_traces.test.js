import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const G = require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const W = require('../stem_lab/kitchen_studio/kitchen_studio_wash.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const Guide = require('../stem_lab/kitchen_studio/kitchen_studio_rub_guide.js');
const origin = { x: 150, y: 90 };
const clone = value => JSON.parse(JSON.stringify(value));
const models = [
  { kind: 'dry', begin: unit => G.begin('dry', origin, { unit }), move: (trace, point) => G.move(trace, point), finish: G.finish },
  { kind: 'handwash', begin: unit => W.begin(origin, { unit }), move: (trace, point, overWater = false) => W.move(trace, point, { overWater }), finish: W.finish }
];
const normalized = (model, trace, x, y = 0, overWater = false) => model.move(trace, {
  x: origin.x + x * trace.unit, y: origin.y + y * trace.unit
}, overWater);
const client = (model, trace, x) => model.move(trace, { x, y: origin.y });
const query = (model, trace) => {
  const before = clone(trace), decision = clone(model.finish(trace));
  const view = Guide.describe(model.kind, trace);
  expect(trace).toEqual(before);
  expect(model.finish(trace)).toEqual(decision);
  return view;
};
const scrub = (model, unit = 1, direction = 1) => [24, 0, 24].reduce(
  (trace, x) => normalized(model, trace, x * direction), model.begin(unit)
);
const freeze = value => {
  Object.freeze(value);
  Object.values(value).forEach(child => { if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child); });
  return value;
};

describe.each(models)('Movement display follows actual $kind traces', model => {
  it.each([.5, 1, 2].flatMap(unit => [1, -1].map(direction => [unit, direction])))('tracks both directions at unit %s, initial sign %s', (unit, direction) => {
    let trace = model.begin(unit);
    expect(query(model, trace)).toMatchObject({ stage: 'rub', completed: 0, total: 3, direction: 'either', progress: 0, puck: .5, nextX: null });
    trace = normalized(model, trace, 12 * direction);
    const halfway = query(model, trace);
    expect(halfway).toMatchObject({ completed: 0, direction: 'either', progress: .5, nextX: null });
    expect(halfway.puck).toBeCloseTo(.5 + direction * .25, 12);
    expect(model.finish(trace)).toMatchObject({ complete: false, action: null });

    trace = normalized(model, trace, 24 * direction);
    const first = query(model, trace);
    expect(first).toMatchObject({ stage: 'rub', completed: 1, direction: direction > 0 ? 'left' : 'right', progress: 0 });
    expect(first.puck).toBe(direction > 0 ? 1 : 0);
    expect(first.nextX).toBe(origin.x);

    const almostSecond = client(model, trace, first.nextX + direction * .01 * unit);
    expect(almostSecond.passes).toBe(1);
    expect(query(model, almostSecond).completed).toBe(1);
    const second = client(model, almostSecond, first.nextX);
    expect(second.passes).toBe(2);
    expect(query(model, second)).toMatchObject({ completed: 2, direction: direction > 0 ? 'right' : 'left', progress: 0 });

    const thirdTarget = query(model, second).nextX;
    const almostThird = client(model, second, thirdTarget - direction * .01 * unit);
    expect(almostThird.passes).toBe(2);
    expect(query(model, almostThird).completed).toBe(2);
    trace = client(model, almostThird, thirdTarget);
    expect(trace.passes).toBe(3);
    expect(query(model, trace)).toMatchObject({ stage: model.kind === 'dry' ? 'ready' : 'rinse', completed: 3, total: 3, direction: 'none', progress: 1, nextX: null });
    expect(query(model, trace).puck).toBe(direction > 0 ? 1 : 0);
  });

  it.each([1, -1])('moves the next threshold with the latest extreme, starting sign %s', direction => {
    let trace = normalized(model, model.begin(1), 24 * direction);
    trace = normalized(model, trace, 70 * direction);
    const overshoot = query(model, trace);
    expect(overshoot.completed).toBe(1);
    expect(overshoot.nextX).toBe(origin.x + 46 * direction);
    expect(overshoot.progress).toBe(0);

    trace = normalized(model, trace, 60 * direction);
    expect(query(model, trace).progress).toBeCloseTo(10 / 24, 12);
    trace = normalized(model, trace, 65 * direction);
    const smallReturn = query(model, trace);
    expect(smallReturn.progress).toBeCloseTo(5 / 24, 12);
    expect(smallReturn.nextX).toBe(overshoot.nextX);
    expect(smallReturn.completed).toBe(1);

    trace = normalized(model, trace, 90 * direction);
    const extended = query(model, trace);
    expect(extended.nextX).toBe(origin.x + 66 * direction);
    expect(extended.progress).toBe(0);
    trace = client(model, trace, extended.nextX + direction * .01);
    expect(trace.passes).toBe(1);
    trace = client(model, trace, extended.nextX);
    expect(trace.passes).toBe(2);
    expect(query(model, trace).completed).toBe(2);
  });

  it('does not turn accumulated small reversals into a display pass', () => {
    let trace = model.begin(1);
    for (let i = 0; i < 80; i++) {
      trace = normalized(model, trace, i % 2 ? 3 : -3);
      const view = query(model, trace);
      expect(view.completed).toBe(0);
      expect(view.direction).toBe('either');
      expect(view.progress).toBeCloseTo(3 / 24, 12);
    }
    trace = normalized(model, trace, 24);
    for (const x of [20, 22, 19, 23, 20, 21]) {
      trace = normalized(model, trace, x);
      expect(query(model, trace).completed).toBe(1);
      expect(query(model, trace).nextX).toBe(origin.x);
    }
    trace = normalized(model, trace, 0);
    expect(trace.passes).toBe(2);
    expect(query(model, trace).completed).toBe(2);
  });

  it('hides after actual vertical contact loss and stays hidden after returning', () => {
    let trace = normalized(model, model.begin(1), 24);
    trace = normalized(model, trace, 0, 40.01);
    expect(trace.invalid).toBe(true);
    expect(query(model, trace)).toBeNull();
    trace = normalized(model, trace, 0, 0);
    expect(trace.invalid).toBe(true);
    expect(query(model, trace)).toBeNull();
    expect(model.finish(trace)).toMatchObject({ complete: false, action: null });
  });

  it('is a read-only projection even when every trace field is frozen', () => {
    for (const trace of [model.begin(1), normalized(model, model.begin(1), 24), scrub(model)]) {
      const frozen = freeze(trace), before = clone(frozen), decision = model.finish(frozen);
      const first = Guide.describe(model.kind, frozen), second = Guide.describe(model.kind, frozen);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(frozen).toEqual(before);
      expect(model.finish(frozen)).toEqual(decision);
    }
  });
});

describe('Rinsing remains a separate real handwash-model movement', () => {
  const wash = models[1];
  it.each([.5, 1, 2])('withholds release-ready until the water movement at unit %s', unit => {
    let trace = scrub(wash, unit);
    const scrubbed = query(wash, trace);
    expect(scrubbed).toMatchObject({ stage: 'rinse', completed: 3, direction: 'none', nextX: null });
    expect(scrubbed.instruction).toMatch(/water/i);
    expect(W.finish(trace)).toMatchObject({ complete: false, action: null });
    trace = normalized(wash, trace, 24, 0, true);
    expect(query(wash, trace).stage).toBe('rinse');
    trace = normalized(wash, trace, 24, -9.99, true);
    expect(query(wash, trace).stage).toBe('rinse');
    expect(W.finish(trace).complete).toBe(false);
    trace = normalized(wash, trace, 24, -10, true);
    const ready = query(wash, trace);
    expect(ready).toMatchObject({ stage: 'ready', completed: 3, direction: 'none', nextX: null });
    expect(ready.instruction).toMatch(/release/i);
    expect(W.finish(trace)).toMatchObject({ complete: true, action: 'wash' });
    trace = normalized(wash, trace, 24, -12, false);
    expect(query(wash, trace)).toMatchObject({ stage: 'rinse', completed: 3, direction: 'none', nextX: null });
    expect(W.finish(trace)).toMatchObject({ complete: false, action: null });
  });

  it('respects the actual handwash horizontal contact limit before rinsing', () => {
    const trace = normalized(wash, normalized(wash, wash.begin(1), 24), 120.01);
    expect(trace.invalid).toBe(true);
    expect(query(wash, trace)).toBeNull();
    expect(query(wash, normalized(wash, trace, 0))).toBeNull();
  });

  it('does not reuse the scrub movement limit after the model switches to rinsing', () => {
    const trace = normalized(wash, scrub(wash), 160, -80, false);
    expect(trace.invalid).toBe(false);
    expect(query(wash, trace)).toMatchObject({ stage: 'rinse', completed: 3, direction: 'none', nextX: null });
    expect(W.finish(trace)).toMatchObject({ complete: false, action: null });
  });
});

describe('The guide never commits engine evidence', () => {
  it.each(models)('leaves the $kind decision pending until the caller applies the existing action', model => {
    let trace = scrub(model);
    if (model.kind === 'handwash') trace = normalized(model, trace, 24, -10, true);
    const station = model.kind === 'dry' ? 'heat' : 'prep', action = model.kind === 'dry' ? 'dry' : 'wash';
    const state = K.start(station, 'demonstrate'), before = clone(state);
    for (let i = 0; i < 5; i++) expect(query(model, trace)).toMatchObject({ stage: 'ready', completed: 3, direction: 'none' });
    expect(state).toEqual(before);
    expect(state.log).toEqual([]);
    expect(model.finish(trace)).toMatchObject({ complete: true, action });
    const applied = K.act(state, action);
    expect(applied.log).toHaveLength(1);
    expect(applied.log[0]).toMatchObject({ action, accepted: true });
    expect(state).toEqual(before);
  });
});
