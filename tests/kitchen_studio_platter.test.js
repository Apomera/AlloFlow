import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../stem_lab/kitchen_studio/kitchen_studio_platter.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const start = Object.freeze({ x: 100, y: 120 });
const end = Object.freeze({ x: 140, y: 180 });
const drop = (state, hit) => K.act(state, P.destination(end, start, hit).action);

describe('Platter delivery decisions', () => {
  it.each([['oven', 'cook'], ['serve', 'serve']])('routes a deliberate drop on %s to %s', (target, action) => {
    expect(P.destination(end, start, target)).toMatchObject({ target, action });
  });
  it('requires ten pixels of deliberate travel, including diagonal movement', () => {
    for (const point of [start, { x: 109.999, y: 120 }, { x: 105, y: 125 }]) {
      expect(P.destination(point, start, 'oven')).toMatchObject({ action: null, target: 'oven' });
    }
    expect(P.destination({ x: 106, y: 128 }, start, 'oven').action).toBe('cook');
    expect(P.destination({ x: 90, y: 120 }, start, 'serve').action).toBe('serve');
  });
  it('drops no action when the platter leaves its target or returns to its starting point', () => {
    expect(P.destination(end, start, 'oven').action).toBe('cook');
    expect(P.destination(end, start, null)).toMatchObject({ action: null, target: null });
    expect(P.destination(start, start, 'serve').action).toBeNull();
  });
  it.each([null, undefined, {}, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: '100', y: 120 }])('rejects invalid point or start %j', invalid => {
    expect(P.destination(invalid, start, 'oven')).toMatchObject({ action: null, target: null });
    expect(P.destination(end, invalid, 'serve')).toMatchObject({ action: null, target: null });
  });
  it('accepts only exact known raycast targets and never mutates inputs or retained results', () => {
    const before = JSON.stringify([start, end]);
    const selected = Object.freeze(P.destination(end, start, 'oven'));
    for (const hit of ['OVEN', 'cook', '', {}, 1, undefined]) expect(P.destination(end, start, hit).action).toBeNull();
    P.destination(end, start, 'serve');
    expect(selected).toMatchObject({ action: 'cook', target: 'oven' });
    expect(JSON.stringify([start, end])).toBe(before);
  });
});

describe('Existing temperature evidence is required for serving', () => {
  it('cooking invalidates a reading; three modeled steps still require a fresh internal measurement', () => {
    let state = K.act(K.act(K.start('probe'), 'thick'), 'read');
    expect(state.values.reading).toBe(150);
    const before = JSON.stringify(state);
    const original = state;
    for (let i = 0; i < 3; i++) {
      state = drop(state, 'oven');
      expect(state.values.reading).toBeNull();
      expect(state.done).toBe(false);
    }
    expect(state.values.temp).toBe(165);
    expect(JSON.stringify(original)).toBe(before);
    const noReading = drop(state, 'serve');
    expect(noReading.done).toBe(false);
    expect(noReading.log.at(-1).accepted).toBe(false);
    const measured = K.act(state, 'read');
    expect(measured.values.reading).toBe(165);
    const served = drop(measured, 'serve');
    expect(served.done).toBe(true);
    expect(served.log.at(-1)).toMatchObject({ action: 'serve', accepted: true });
  });
  it('does not treat a hot surface reading as internal evidence', () => {
    const state = K.act(K.act(K.start('probe'), 'surface'), 'read');
    expect(state.values.reading).toBe(180);
    const delivered = drop(state, 'serve');
    expect(delivered.done).toBe(false);
    expect(delivered.log.at(-1).accepted).toBe(false);
    expect(state.log).toHaveLength(2);
  });
  it('allows already-ready food to be checked and served without automatically cooking it', () => {
    const ready = K.start('probe', 'demonstrate', 'ready');
    const measured = K.act(K.act(ready, 'thick'), 'read');
    const served = drop(measured, 'serve');
    expect(served.done).toBe(true);
    expect(served.values.temp).toBe(165);
    expect(served.log.map(entry => entry.action)).toEqual(['thick', 'read', 'serve']);
    expect(ready.log).toHaveLength(0);
  });
});
