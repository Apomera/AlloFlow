import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Multiplication Table deep rebuild (2026-11-03): the pure fact engine, run
// rather than grepped. The engine sits between `var DIFFICULTY = {` and the
// registerTool call; it is evaluated the same way stem_multtable_engine.test.js
// does. MULTTABLE_DEEP_SRC points the suite at another copy (mutation check:
// the pre-rebuild copy has none of these functions and must turn this red).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
const src = fs.readFileSync(FILE, 'utf8');
const E = (() => {
  const start = src.indexOf('var DIFFICULTY = {');
  const end = src.indexOf("window.StemLab.registerTool('multtable'", start);
  // eslint-disable-next-line no-new-func
  return new Function('window', src.slice(start, end) + `
    return { DIFFICULTY, TRICKY_15, MEMORY_TRICKS, tkey,
      diagnoseMistake: typeof diagnoseMistake === 'function' ? diagnoseMistake : null,
      factAnswer: typeof factAnswer === 'function' ? factAnswer : null,
      pickAdaptiveFact: typeof pickAdaptiveFact === 'function' ? pickAdaptiveFact : null,
      factPool: typeof factPool === 'function' ? factPool : null,
      pickFactors, resolveBand: typeof resolveBand === 'function' ? resolveBand : null,
      deriveAnchor: typeof deriveAnchor === 'function' ? deriveAnchor : null,
      derivedFacts: typeof derivedFacts === 'function' ? derivedFacts : null,
      strategyFor: typeof strategyFor === 'function' ? strategyFor : null,
      formatMissedFact, missedFactIdentity,
      PATTERN_CLAIMS: typeof PATTERN_CLAIMS !== 'undefined' ? PATTERN_CLAIMS : null };`)({});
})();

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

describe('named mistakes', () => {
  const kind = (ch, given) => (E.diagnoseMistake(ch, given) || {}).kind || null;
  it('names the classic multiplication slips on 7 × 8', () => {
    const ch = { a: 7, b: 8, mode: 'mult' };
    expect(kind(ch, 56)).toBeNull();
    expect(kind(ch, 15)).toBe('added');
    expect(kind(ch, 65)).toBe('swapped');
    expect(E.diagnoseMistake(ch, 63)).toMatchObject({ kind: 'neighbour', x: 7, y: 9, g: 7 });
    expect(E.diagnoseMistake(ch, 48)).toMatchObject({ kind: 'neighbour', x: 6, y: 8, g: 8 });
    expect(kind(ch, 54)).toBe('close');
    expect(kind(ch, 30)).toBe('other');
  });

  it('names product-for-division, the divisor echo, one subtraction and an off-by-one quotient', () => {
    const div = { a: 7, b: 8, mode: 'div', divisor: 7 };
    expect(E.factAnswer(div)).toBe(8);
    expect(kind(div, 8)).toBeNull();
    expect(kind(div, 56)).toBe('product');
    expect(kind(div, 7)).toBe('divisorEcho');
    expect(kind(div, 49)).toBe('subtracted');
    expect(kind(div, 9)).toBe('offByOne');
    const missing = { a: 7, b: 8, mode: 'missing', known: 8 };
    expect(E.factAnswer(missing)).toBe(7);
    expect(kind(missing, 56)).toBe('product');
    expect(kind(missing, 8)).toBe('divisorEcho');
  });

  it('names an answer that repeats the known fact in "use a fact I know"', () => {
    expect(kind({ a: 7, b: 6, mode: 'derive', anchor: 5 }, 35)).toBe('anchorEcho');
  });

  it('never diagnoses a right answer, for every fact in every direction', () => {
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
      for (const ch of [{ a, b, mode: 'mult' }, { a, b, mode: 'div', divisor: a }, { a, b, mode: 'div', divisor: b }, { a, b, mode: 'missing', known: a }]) {
        expect(E.diagnoseMistake(ch, E.factAnswer(ch)), JSON.stringify(ch)).toBeNull();
        expect(E.diagnoseMistake(ch, E.factAnswer(ch) + 100), JSON.stringify(ch)).not.toBeNull();
      }
    }
  });
});

describe('smart practice', () => {
  it('draws weak, untried and missed facts far more often than mastered ones, and holds back the last fact', () => {
    const pool = E.factPool('medium');
    const scores = {};
    pool.forEach((k) => { scores[k] = { attempts: 4, correct: 4 }; });
    scores['7x8'] = { attempts: 4, correct: 1 };
    const focus = { '6x9': true };
    const rng = seeded(7);
    const counts = {};
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const f = E.pickAdaptiveFact(pool, scores, focus, ['3x3'], rng);
      counts[f.key] = (counts[f.key] || 0) + 1;
      expect(f.a * f.b).toBe(f.key.split('x').map(Number).reduce((x, y) => x * y));
    }
    // A mastered fact (weight 0.5) vs the weak one (4) and the missed one (4.5).
    const mastered = (counts['4x4'] + counts['5x6'] + counts['2x9']) / 3;
    expect(mastered).toBeGreaterThan(30);
    expect(counts['7x8']).toBeGreaterThan(mastered * 5);
    expect(counts['6x9']).toBeGreaterThan(mastered * 5);
    expect(counts['3x3'] || 0).toBeLessThan(mastered / 3);
  });

  it('serves both commutative directions', () => {
    const rng = seeded(3);
    let fwd = 0, rev = 0;
    for (let i = 0; i < 400; i++) { const f = E.pickAdaptiveFact(['3x7'], {}, {}, [], rng); if (f.a === 3) fwd++; else rev++; }
    expect(fwd).toBeGreaterThan(100);
    expect(rev).toBeGreaterThan(100);
  });
});

describe('grade-band fact sets', () => {
  it('maps grade levels and host bands to the three fact sets', () => {
    expect(E.resolveBand(undefined, 'Kindergarten')).toBe('early');
    expect(E.resolveBand(undefined, '2nd Grade')).toBe('early');
    expect(E.resolveBand(undefined, '3rd Grade')).toBe('core');
    expect(E.resolveBand(undefined, '4th Grade')).toBe('core');
    expect(E.resolveBand(undefined, '5th Grade')).toBe('extend');
    expect(E.resolveBand('k2', '')).toBe('early');
    expect(E.resolveBand('g35', '')).toBe('core');
    expect(E.resolveBand('g68', '')).toBe('extend');
  });

  it('2s, 5s and 10s only ever uses an anchor factor', () => {
    for (let i = 0; i < 400; i++) {
      const { a, b } = E.pickFactors('foundations', []);
      expect([a, b].some((x) => x === 2 || x === 5 || x === 10), a + 'x' + b).toBe(true);
      expect(Math.max(a, b)).toBeLessThanOrEqual(10);
    }
    const pool = E.factPool('foundations');
    expect(pool).toContain('1x2');
    expect(pool).toContain('10x10');
    expect(pool.every((k) => k.split('x').map(Number).some((x) => x === 2 || x === 5 || x === 10))).toBe(true);
    expect(E.factPool('tens').every((k) => k.split('x').map(Number).every((x) => x >= 2 && x <= 10))).toBe(true);
  });
});

describe('derived facts and anchors are true arithmetic', () => {
  it('every "fact I can use" is true', () => {
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
      for (const f of E.derivedFacts(a, b)) {
        expect(f.p, JSON.stringify(f)).toBe(a * b);
        if (f.id === 'addGroup') { expect(f.k).toBe(a * f.b1); expect(f.k + a).toBe(f.p); }
        if (f.id === 'removeGroup') { expect(f.k).toBe(a * f.b1); expect(f.k - a).toBe(f.p); }
        if (f.id === 'split') { expect(f.s1 + f.s2).toBe(b); expect(f.k1 + f.k2).toBe(f.p); }
        if (f.id === 'double') { expect(f.k * 2).toBe(f.p); }
      }
    }
  });

  it('a "use a fact I know" anchor is a different, nearby fact', () => {
    const rng = seeded(11);
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
      const d = E.deriveAnchor(a, b, rng);
      expect([a, b].sort()).toEqual([d.keep, d.vary].sort());
      expect(d.anchor).not.toBe(d.vary);
      expect(Math.abs(d.anchor - d.vary)).toBeLessThanOrEqual(2);
      expect(d.anchor).toBeGreaterThanOrEqual(1);
    }
  });

  it('has a strategy for every fact', () => {
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
      const s = E.strategyFor(a, b);
      expect([a, b]).toContain(s.f);
      expect(s.f * s.n).toBe(a * b);
    }
  });
});

describe('missed-fact records and memory tricks', () => {
  it('keeps missing-factor facts distinct and true', () => {
    const m = { a: 7, b: 8, mode: 'missing', known: 7, answer: 8 };
    expect(E.formatMissedFact(m)).toBe('7 × 8 = 56');
    expect(E.missedFactIdentity(m)).toBe('missing:7x8:known-7');
    expect(E.missedFactIdentity({ ...m, known: 8 })).not.toBe(E.missedFactIdentity(m));
  });

  it('says 11s write the digit twice, not "doubled" (review item I)', () => {
    for (const k of ['6x11', '7x11', '8x11']) {
      expect(E.MEMORY_TRICKS[k].trick).not.toMatch(/doubl/i);
      expect(E.MEMORY_TRICKS[k].trick).toMatch(/twice/);
    }
  });
});

describe('pattern claims', () => {
  it('each false claim has a counterexample and each true claim holds everywhere in its group', () => {
    for (const cl of E.PATTERN_CLAIMS) {
      let counter = null;
      for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) if (cl.inGroup(a, b) && !cl.holds(a, b) && !counter) counter = [a, b];
      if (cl.isTrue) expect(counter, cl.id).toBeNull();
      else expect(counter, cl.id).not.toBeNull();
    }
  });
});
