// Arc City — Gauntlet (L9) STATEFUL render/interaction tests.
//
// Covers the behaviour the pure-core golden master can't: the tier-lock UI swap,
// the Next / Restart / Fire handlers, the Grand Tour award (+ its no-re-award
// guard), and level-switch persistence. Driven through the mock-React harness so
// real onClick handlers run and their setToolData reducers are folded into state.

import { describe, it, expect } from 'vitest';
import { render, click } from './helpers/arc_harness.js';

const ORDER = ['L1', 'L3', 'L4', 'L5', 'L7', 'L8'];

describe('Arc City render — Gauntlet tier lock (proving ground)', () => {
  it('LOCKS the tier in the gauntlet: tier picker is swapped for a lock notice, preview hidden even if saved tier is practice', () => {
    const r = render({ levelId: 'L9', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.find('tier-guided')).toBeNull();      // tier picker gone
    expect(r.find('tier-practice')).toBeNull();
    expect(r.find('gtierlock')).not.toBeNull();     // lock notice present
    expect(r.text).toMatch(/Preview hidden/);       // forced 'independent' → hidden until Fire
  });

  it('a NORMAL level keeps the tier picker and shows the live preview', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.find('tier-guided')).not.toBeNull();
    expect(r.text).not.toMatch(/Preview hidden/);
  });
});

describe('Arc City render — Gauntlet Next / Restart handlers', () => {
  it('Next challenge advances idx by one and freezes the run order', () => {
    const next = click(
      { levelId: 'L9', byLevel: { 'L9-L1': { solved: true, params: {} } }, gauntlet: { order: ORDER, idx: 0 }, tier: 'independent', fired: true, badges: [] },
      'gnext'
    );
    expect(next.gauntlet.idx).toBe(1);
    expect(next.gauntlet.order).toEqual(ORDER);
    expect(next.fired).toBe(false);
  });

  it('Restart clears ALL L9-* clone state, resets idx to 0, and re-derives the order from standalone history (clones never skew it)', () => {
    const before = {
      levelId: 'L9',
      byLevel: {
        // a genuine completed run: every stage clone solved (so the Restart control,
        // which shows only at completion, is present) ...
        'L9-L1': { solved: true, params: {} }, 'L9-L3': { solved: true, params: {} },
        'L9-L4': { solved: true, params: {} }, 'L9-L5': { solved: true, params: {} },
        'L9-L7': { solved: true, params: {} }, 'L9-L8': { solved: true, params: {} },
        // ... plus standalone history that should survive the restart and drive re-ranking
        L1: { solved: true }, L3: { solved: true, independent: true }, L8: { solved: true }
      },
      gauntlet: { order: ORDER, idx: 5 }, tier: 'independent', fired: true, badges: ['grand-tour']
    };
    const after = click(before, 'grestart');
    expect(Object.keys(after.byLevel).some(k => k.indexOf('L9-') === 0)).toBe(false); // clones cleared
    expect(after.gauntlet.idx).toBe(0);
    expect(after.byLevel.L3).toBeDefined();                 // standalone history untouched
    expect(after.gauntlet.order[after.gauntlet.order.length - 1]).toBe('L3'); // parabola mastered → last
    expect(after.fired).toBe(false);
  });
});

describe('Arc City render — Grand Tour award through the Fire handler', () => {
  it('awards Grand Tour by FIRING a solving shot on the LAST stage, and does NOT re-award it on a re-fire', () => {
    // last stage = L8 (log); solving params a=2,c=1,k=1
    const atLast = {
      levelId: 'L9',
      byLevel: { 'L9-L8': { params: { a: 2, c: 1, k: 1 }, shots: 0, solved: false, misses: 0 } },
      gauntlet: { order: ORDER, idx: 5 }, tier: 'independent', fired: false, badges: []
    };
    const fired = click(atLast, 'fire');
    expect(fired.badges).toContain('grand-tour');

    const refired = click(Object.assign({}, fired, { fired: false }), 'fire');
    expect(refired.badges.filter(b => b === 'grand-tour').length).toBe(1); // earned once, never duplicated
  });

  it('does NOT award Grand Tour on a non-final stage solve', () => {
    const atFirst = {
      levelId: 'L9',
      byLevel: { 'L9-L1': { params: { m: 0.5, b: 0 }, shots: 0, solved: false, misses: 0 } },
      gauntlet: { order: ORDER, idx: 0 }, tier: 'independent', fired: false, badges: []
    };
    const fired = click(atFirst, 'fire');
    expect(fired.badges).not.toContain('grand-tour');
  });
});

describe('Arc City render — leaving/returning preserves the run (no silent data loss)', () => {
  it('switching to a normal level mid-run keeps the gauntlet state; returning resumes at the same stage', () => {
    const mid = {
      levelId: 'L9',
      byLevel: { 'L9-L1': { solved: true, params: {} }, L8: { solved: true } }, // L8 solved ⇒ L9 unlocked
      gauntlet: { order: ORDER, idx: 1 }, tier: 'independent', fired: false, badges: []
    };
    const left = click(mid, 'lvl-L1');
    expect(left.levelId).toBe('L1');
    expect(left.gauntlet.idx).toBe(1);           // gauntlet untouched while away
    expect(left.gauntlet.order).toEqual(ORDER);

    const back = click(left, 'lvl-L9');
    expect(back.levelId).toBe('L9');
    expect(back.gauntlet.idx).toBe(1);           // resumes, does not restart
  });
});
