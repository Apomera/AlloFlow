import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../stem_lab/kitchen_studio/kitchen_studio_storage.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const container = Object.freeze({ x: 3.35, z: -.37 });
const targets = [
  ['store', 'fridge', { x: 3.65, z: -.98 }, .36, 'chill'],
  ['store', 'shallowTray', { x: 2.78, z: .28 }, .30, 'shallow'],
  ['store', 'wasteBin', { x: 4.14, z: .45 }, .28, 'discard'],
  ['label', 'container', container, .30, 'label']
];
const labelStart = Object.freeze({ x: 3.9, z: -.37 });
const startFor = kind => kind === 'label' ? labelStart : container;

describe('Physical storage choices', () => {
  it.each(targets)('maps %s onto %s without changing the source position', (kind, target, point, radius, action) => {
    const frozen = Object.freeze({ ...point });
    const start = startFor(kind);
    const before = JSON.stringify([frozen, start]);
    expect(S.destination(kind, frozen, start)).toMatchObject({ target, action });
    expect(JSON.stringify([frozen, start])).toBe(before);
  });
  it.each(targets)('accepts the %s/%s edge but not a drop outside it', (kind, target, point, radius, action) => {
    const edge = { x: point.x + radius, z: point.z };
    const distantStart = { x: point.x - 1, z: point.z };
    expect(S.destination(kind, edge, distantStart)).toMatchObject({ target, action });
    expect(S.destination(kind, { ...edge, x: edge.x + .0001 }, distantStart)).toMatchObject({ target: null, action: null });
  });
  it('requires deliberate travel even when the pointer is already on a target', () => {
    const point = { x: 3.65, z: -.98 };
    expect(S.destination('store', point, point)).toMatchObject({ target: 'fridge', action: null });
    expect(S.destination('store', point, { x: point.x - .119, z: point.z })).toMatchObject({ target: 'fridge', action: null });
    expect(S.destination('store', point, { x: point.x - .12, z: point.z })).toMatchObject({ target: 'fridge', action: 'chill' });
    expect(S.destination('label', container, container)).toMatchObject({ target: 'container', action: null });
  });
  it('does not invent an action for empty space, unknown tools, or invalid input', () => {
    expect(S.destination('store', { x: 0, z: 0 }, container)).toMatchObject({ target: null, action: null });
    expect(S.destination('label', { x: 4.14, z: .45 }, labelStart)).toMatchObject({ target: null, action: null });
    expect(S.destination('unknown', container, labelStart)).toMatchObject({ target: null, action: null });
    for (const bad of [null, undefined, {}, { x: NaN, z: 0 }, { x: 3.65, z: Infinity }, { x: '3.65', z: -.98 }]) {
      expect(S.destination('store', bad, container)).toMatchObject({ target: null, action: null });
      expect(S.destination('store', { x: 3.65, z: -.98 }, bad)).toMatchObject({ target: null, action: null });
    }
  });
});

describe('Storage gestures preserve the engine decisions', () => {
  const fridge = () => S.destination('store', { x: 3.65, z: -.98 }, container).action;
  const shallow = () => S.destination('store', { x: 2.78, z: .28 }, container).action;
  const label = () => S.destination('label', container, labelStart).action;
  const discard = () => S.destination('store', { x: 4.14, z: .45 }, container).action;

  it('records an early refrigerator attempt as a correction without completing the station', () => {
    const original = K.start('chill', 'demonstrate');
    const state = K.act(original, fridge());
    expect(state.log.at(-1)).toMatchObject({ action: 'chill', accepted: false });
    expect(state.done).toBe(false);
    expect(state.values.chilled).not.toBe(true);
    expect(original.log).toHaveLength(0);
  });
  it('completes storage only after dividing, labeling, and refrigerating', () => {
    let state = K.start('chill', 'demonstrate');
    state = K.act(state, shallow());
    expect(state.values.shallow).toBe(true);
    expect(state.done).toBe(false);
    state = K.act(state, label());
    expect(state.values.label).toBe(true);
    expect(state.done).toBe(false);
    state = K.act(state, fridge());
    expect(state.done).toBe(true);
    expect(state.values.chilled).toBe(true);
    expect(state.log.map(entry => entry.action)).toEqual(['shallow', 'label', 'chill']);
  });
  it('allows discarding unsafe picnic leftovers without silently refrigerating them', () => {
    const state = K.act(K.start('chill', 'demonstrate', 'picnic'), discard());
    expect(state.done).toBe(true);
    expect(state.values.discarded).toBe(true);
    expect(state.values.chilled).not.toBe(true);
    expect(state.log.at(-1)).toMatchObject({ action: 'discard', accepted: true });
  });
  it('keeps fresh leftovers when the engine rejects a discard choice', () => {
    const state = K.act(K.start('chill', 'demonstrate'), discard());
    expect(state.done).toBe(false);
    expect(state.values.discarded).not.toBe(true);
    expect(state.log.at(-1)).toMatchObject({ action: 'discard', accepted: false });
  });
});
