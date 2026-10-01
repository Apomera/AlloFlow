import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Fractions tool's choice-generating games
// (vocabulary quiz and estimation trainer), complementing the existing
// signed-operations and tab-dispatch suites. The generators are render-scope
// closures, executed here from source slices with their dependencies stubbed.

const src = fs.readFileSync('stem_lab/stem_tool_fractions.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_fractions.js', 'utf8');

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickFn = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fyShuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
};

function slice(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('estimation trainer rounds', () => {
  const newEst = (() => {
    // eslint-disable-next-line no-new-func
    return new Function('pick', 'randInt', 'fyShuffle',
      slice('var newEst = function()', 'var startEst') + '\nreturn newEst;'
    )(pickFn, randInt, fyShuffle);
  })();
  const BENCHMARKS = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  it('never serves an ambiguous tie, and the answer really is the unique closest benchmark', () => {
    // 1/8 is EXACTLY between 0 and 1/4 — before the fix such rounds graded a
    // coin flip as right or wrong depending on an arbitrary sort order.
    for (let i = 0; i < 400; i++) {
      const round = newEst();
      const distances = BENCHMARKS.map((b) => Math.abs(b - round.val)).sort((a, b) => a - b);
      expect(distances[1] - distances[0], round.n + '/' + round.d).toBeGreaterThan(1e-9);
      const best = BENCHMARKS.reduce((acc, b) => (Math.abs(b - round.val) < Math.abs(acc - round.val) ? b : acc));
      expect(round.answer).toBe(best);
      expect(round.choices).toContain(round.answer);
      expect(new Set(round.choices).size).toBe(3);
    }
  });

  it('stores only data — no functions that would vanish on serialization', () => {
    // estRound previously carried labelOf(); a rehydrated round crashed the tab.
    const round = newEst();
    for (const key of Object.keys(round)) {
      expect(typeof round[key], key).not.toBe('function');
    }
  });

  it('places the correct answer across all three slots without bias', () => {
    const slots = [0, 0, 0];
    const N = 900;
    for (let i = 0; i < N; i++) {
      const round = newEst();
      slots[round.choices.indexOf(round.answer)]++;
    }
    expect(slots.filter((c) => c > 0).length).toBe(3);
    expect(Math.max(...slots) / N).toBeLessThan(0.55);
  });
});

describe('vocabulary quiz rounds', () => {
  const newVqRound = (() => {
    const vocab = slice('var FRACTION_VOCAB = [', '];') + '];';
    // eslint-disable-next-line no-new-func
    return new Function('pick', 'fyShuffle',
      vocab + '\n' + slice('var newVqRound = function()', 'var startVq') + '\nreturn newVqRound;'
    )(pickFn, fyShuffle);
  })();

  it('serves four unique choices containing the correct term', () => {
    for (let i = 0; i < 200; i++) {
      const round = newVqRound();
      expect(round.choices.length).toBe(4);
      expect(new Set(round.choices).size).toBe(4);
      expect(round.choices).toContain(round.term);
      expect(round.def.length).toBeGreaterThan(0);
    }
  });

  it('places the correct term across all four slots without bias', () => {
    const slots = [0, 0, 0, 0];
    const N = 800;
    for (let i = 0; i < N; i++) {
      const round = newVqRound();
      slots[round.choices.indexOf(round.term)]++;
    }
    expect(slots.filter((c) => c > 0).length).toBe(4);
    expect(Math.max(...slots) / N).toBeLessThan(0.5);
  });
});

describe('source pins', () => {
  it('the biased comparator shuffle is gone everywhere', () => {
    expect(src).not.toContain('Math.random() - 0.5');
    // One call per former comparator-sort site.
    expect(src.split('fyShuffle(').length - 1).toBe(6);
  });

  it('estimation rounds no longer store labelOf in state', () => {
    expect(src).not.toContain('labelOf: labelOf');
    expect(src).not.toContain('estRound.labelOf');
    expect(src).not.toContain('er.labelOf');
    expect(src.split('estLabelOf(').length - 1).toBeGreaterThanOrEqual(3);
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
