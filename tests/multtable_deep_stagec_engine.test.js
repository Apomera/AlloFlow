import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Multiplication Table stage C (2026-11-03): the "Start here" path and the
// band tab order, run from the engine slice (as multtable_deep_engine does).
// MULTTABLE_DEEP_SRC points the suite at another copy (the stage-B copy has
// neither and must turn this red).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
const src = fs.readFileSync(FILE, 'utf8');
const E = (() => {
  const start = src.indexOf('var DIFFICULTY = {');
  const end = src.indexOf("window.StemLab.registerTool('multtable'", start);
  // eslint-disable-next-line no-new-func
  return new Function('window', src.slice(start, end) + `
    return { factPool,
      learningPath: typeof learningPath === 'function' ? learningPath : null,
      TAB_ORDER: typeof TAB_ORDER !== 'undefined' ? TAB_ORDER : null };`)({});
})();

const ALL_TABS = ['practice', 'visual', 'patterns', 'factors', 'words', 'fluency'];
const firstTry = (keys) => Object.fromEntries(keys.map((k) => [k, { attempts: 1, correct: 1 }]));

describe('band tab order', () => {
  it('puts each band\'s core activities first and keeps every tab', () => {
    expect(E.TAB_ORDER).toBeTruthy();
    for (const band of ['early', 'core', 'extend']) expect([...E.TAB_ORDER[band]].sort()).toEqual([...ALL_TABS].sort());
    expect(E.TAB_ORDER.early.slice(0, 2)).toEqual(['visual', 'practice']);
    expect(E.TAB_ORDER.core.slice(0, 4)).toEqual(['practice', 'patterns', 'words', 'fluency']);
    expect(E.TAB_ORDER.extend.slice(0, 2)).toEqual(['practice', 'factors']);
  });
});

describe('learning path per band', () => {
  it('K-2: arrays, the 2s/5s/10s patterns, 2s/5s/10s facts, then a climb', () => {
    const lp = E.learningPath('early', {});
    expect(lp.steps.map((s) => s.id)).toEqual(['arrays', 'skipPatterns', 'foundations', 'climb']);
    expect(lp.steps.map((s) => s.tab)).toEqual(['visual', 'patterns', 'practice', 'fluency']);
    expect(lp.steps.find((s) => s.id === 'foundations').setup).toEqual({ quizMode: 'mult', difficulty: 'foundations' });
    expect(lp.next).toBe(0);
  });

  it('grades 3-4: strategies, all facts, word problems, the fluency climb', () => {
    const lp = E.learningPath('core', {});
    expect(lp.steps.map((s) => s.id)).toEqual(['strategies', 'allFacts', 'words', 'climb']);
    expect(lp.steps[0].setup).toEqual({ quizMode: 'derive', difficulty: 'tens' });
  });

  it('grade 5+: division, missing numbers, factors and primes', () => {
    const lp = E.learningPath('extend', {});
    expect(lp.steps.map((s) => s.id)).toEqual(['division', 'missing', 'primes', 'sieve']);
    expect(lp.steps.map((s) => s.tab)).toEqual(['practice', 'practice', 'factors', 'factors']);
    expect(lp.steps[1].setup.quizMode).toBe('equations');
  });

  it('ticks come from the saved progress keys and the next step moves on', () => {
    const ext = { visualExplored: { '3x4': true, '2x5': true, '5x5': true }, patternsExplored: { doubles: true, fives: true }, fluencyRounds: 1 };
    const lp = E.learningPath('early', ext);
    expect(lp.steps.map((s) => s.done)).toEqual([true, false, false, true]);
    expect(lp.steps[1]).toMatchObject({ have: 2, need: 3 });
    expect(lp.next).toBe(1);
    const core = E.learningPath('core', { modeCorrect: { derive: 5 }, factScores: firstTry(E.factPool('tens').slice(0, 20)), wordSolved: 9, fluencyRounds: 2 });
    expect(core.steps.every((s) => s.done)).toBe(true);
    expect(core.next).toBe(-1);
    expect(core.steps[2]).toMatchObject({ have: 5, need: 5 });
    const ext5 = E.learningPath('extend', { modeCorrect: { div: 10, missing: 3, divmiss: 5 }, primeCorrect: 4, sieveDone: 0 });
    expect(ext5.steps.map((s) => s.done)).toEqual([true, true, false, false]);
  });

  it('counts a fact only when it was right on a first try, and only facts from the set', () => {
    const scores = { '2x7': { attempts: 3, correct: 0 }, '5x6': { attempts: 1, correct: 1 }, '7x8': { attempts: 1, correct: 1 } };
    expect(E.learningPath('early', { factScores: scores }).steps[2].have).toBe(1); // 7x8 is not a 2s/5s/10s fact
  });

  it('survives hostile saved shapes', () => {
    for (const bad of [null, 7, 'x', { modeCorrect: 'lots', factScores: [1, 2], visualExplored: 'all', patternsExplored: null, fluencyRounds: -4, primeCorrect: NaN, sieveDone: Infinity }]) {
      for (const band of ['early', 'core', 'extend', 'nope']) {
        const lp = E.learningPath(band, bad);
        expect(lp.steps).toHaveLength(4);
        for (const s of lp.steps) { expect(Number.isFinite(s.have)).toBe(true); expect(s.have).toBeGreaterThanOrEqual(0); expect(s.have).toBeLessThanOrEqual(s.need); }
      }
    }
  });
});
