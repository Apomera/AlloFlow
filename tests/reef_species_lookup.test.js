import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, census, POP, runtime, site } from './helpers/reef_dive_harness.js';

vi.setConfig({ testTimeout: 60000 });
afterEach(cleanup);

describe('read-only reef species lookup', () => {
  it('finds the nearest actual organism across the whole reef without mutating focus, position or population', () => {
    const t = runtime({ paused: true });
    const before = t.state(), population = census(t), candidates = [];
    for (const organism of population.filter(o => o.speciesId === 'clownfish')) {
      t.controller.focus(organism.uid);
      candidates.push(t.state().focused);
    }
    candidates.sort((a, b) => a.distanceM - b.distanceM || Number(a.uid.slice(1)) - Number(b.uid.slice(1)));
    t.controller.clearFocus();
    const observed = t.state(), notifications = t.states.length, result = t.controller.findSpecies('clownfish');
    expect(result).toMatchObject({ uid: candidates[0].uid, speciesId: 'clownfish', distanceM: candidates[0].distanceM });
    expect(Object.keys(result).sort()).toEqual(['bearingDeg', 'distanceM', 'health', 'inView', 'riseM', 'speciesId', 'uid']);
    expect(typeof result.inView).toBe('boolean');
    expect(Number.isFinite(result.bearingDeg) && Number.isFinite(result.riseM)).toBe(true);
    expect(t.state()).toEqual(observed);
    expect(t.states).toHaveLength(notifications);
    expect(census(t)).toEqual(population);
    expect(t.state().diver).toEqual(before.diver);
    const outside = POP.map(p => t.controller.findSpecies(p.id)).filter(Boolean).find(o => o.distanceM > 8);
    expect(outside).toBeTruthy();
    expect(t.state().nearby.some(o => o.uid === outside.uid)).toBe(false);
    expect(t.controller.findSpecies(outside.speciesId).uid).toBe(outside.uid);
    // Returned descriptors are fresh values, never mutable scene records.
    result.uid = 'corrupted';
    expect(t.controller.findSpecies('clownfish').uid).toBe(candidates[0].uid);
  });

  it('rejects malformed, unknown, absent and restoration IDs even when structures are present', () => {
    const t = runtime({ paused: true, site: site({ population: [{ id: 'clownfish', count: 2 }], restoration: { kind: 'reef_star', units: 3, yearsSince: 2 } }) });
    expect(census(t).some(o => o.speciesId === 'reef_star')).toBe(true);
    for (const id of [null, undefined, {}, [], 3, true, '', 'toString', '__proto__', 'not_a_species', ' Clownfish ', 'green_turtle', 'reef_star', 'reef_ball', 'coral_tree_nursery']) {
      expect(t.controller.findSpecies(id), String(id)).toBeNull();
    }
    expect(t.controller.findSpecies('clownfish')).toBeTruthy();
  });

  it('returns null before loading and after disposal instead of exposing stale scene UIDs', () => {
    const t = runtime({ paused: true, staged: true, site: site({ population: [{ id: 'clownfish', count: 1 }] }) });
    expect(t.state().ready).toBe(false);
    expect(t.controller.findSpecies('clownfish')).toBeNull();
    for (let i = 0; i < 1000 && !t.state().ready; i++) t.step(50);
    expect(t.state().ready).toBe(true);
    expect(t.controller.findSpecies('clownfish')).toBeTruthy();
    t.controller.dispose();
    expect(t.controller.findSpecies('clownfish')).toBeNull();
  });
});
