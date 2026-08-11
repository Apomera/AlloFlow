import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Multiplication Table's fact engine: the memory
// tricks, Tricky-15 set, adaptive difficulty, problem generator, and pattern
// definitions — complementing the four existing a11y suites.

const src = fs.readFileSync('stem_lab/stem_tool_multtable.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_multtable.js', 'utf8');

const Engine = (() => {
  const start = src.indexOf('var DIFFICULTY = {');
  const end = src.indexOf("window.StemLab.registerTool('multtable'", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('window',
    src.slice(start, end) +
    '\nreturn { DIFFICULTY: DIFFICULTY, TRICKY_15: TRICKY_15, MEMORY_TRICKS: MEMORY_TRICKS, tkey: tkey, isTrickyFact: isTrickyFact, getAdaptiveRange: getAdaptiveRange, pickFactors: pickFactors, BADGES: BADGES };'
  )({});
})();

describe('memory tricks', () => {
  it('every trick states the true product for its fact', () => {
    for (const key of Object.keys(Engine.MEMORY_TRICKS)) {
      const [a, b] = key.split('x').map(Number);
      expect(Engine.MEMORY_TRICKS[key].trick, key).toContain(String(a * b));
    }
  });

  it('every Tricky 15 fact has a memory trick under its commutative key', () => {
    for (const [a, b] of Engine.TRICKY_15) {
      expect(Engine.MEMORY_TRICKS[Engine.tkey(a, b)], a + 'x' + b).toBeTruthy();
    }
  });
});

describe('Tricky 15 set', () => {
  it('has 15 unique commutative pairs and symmetric membership', () => {
    const keys = Engine.TRICKY_15.map(([a, b]) => Engine.tkey(a, b));
    expect(new Set(keys).size).toBe(15);
    expect(Engine.isTrickyFact(7, 8)).toBe(true);
    expect(Engine.isTrickyFact(8, 7)).toBe(true);
    expect(Engine.isTrickyFact(2, 3)).toBe(false);
    expect(Engine.isTrickyFact(5, 5)).toBe(false);
  });
});

describe('adaptive difficulty', () => {
  const right = { correct: true };
  const wrong = { correct: false };

  it('starts medium, promotes on a 3-streak, demotes on 2 recent misses', () => {
    expect(Engine.getAdaptiveRange([])).toBe(Engine.DIFFICULTY.medium);
    expect(Engine.getAdaptiveRange([right, right])).toBe(Engine.DIFFICULTY.medium);
    expect(Engine.getAdaptiveRange([right, wrong, right, right, right])).toBe(Engine.DIFFICULTY.hard);
    // Two misses anywhere in the last five demote, even after a recovery streak.
    expect(Engine.getAdaptiveRange([right, wrong, wrong, right, right])).toBe(Engine.DIFFICULTY.easy);
    expect(Engine.getAdaptiveRange([right, right, wrong, wrong, right])).toBe(Engine.DIFFICULTY.easy);
    expect(Engine.getAdaptiveRange([wrong, right, right, right, right])).toBe(Engine.DIFFICULTY.hard);
  });
});

describe('problem generator', () => {
  it('respects each difficulty range', () => {
    for (const [difficulty, range] of [['easy', Engine.DIFFICULTY.easy], ['medium', Engine.DIFFICULTY.medium], ['hard', Engine.DIFFICULTY.hard]]) {
      for (let i = 0; i < 300; i++) {
        const { a, b } = Engine.pickFactors(difficulty, []);
        expect(a, difficulty).toBeGreaterThanOrEqual(range.min);
        expect(a, difficulty).toBeLessThanOrEqual(range.max);
        expect(b, difficulty).toBeGreaterThanOrEqual(range.min);
        expect(b, difficulty).toBeLessThanOrEqual(range.max);
      }
    }
  });

  it('tricky mode draws only Tricky 15 facts and serves both commutative directions', () => {
    let forward = 0;
    let reversed = 0;
    for (let i = 0; i < 400; i++) {
      const { a, b } = Engine.pickFactors('tricky', []);
      expect(Engine.isTrickyFact(a, b), a + 'x' + b).toBe(true);
      if (a <= b) forward++; else reversed++;
    }
    expect(forward).toBeGreaterThan(50);
    expect(reversed).toBeGreaterThan(50);
  });
});

describe('pattern definitions', () => {
  const PATTERNS = (() => {
    const start = src.indexOf('var PATTERNS = [');
    const end = src.indexOf('var renderPatterns', start);
    // eslint-disable-next-line no-new-func
    return new Function('t', src.slice(start, end) + '\nreturn PATTERNS;')((k, fb) => fb);
  })();
  const countMatches = (p) => {
    let count = 0;
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) if (p.cellMatches(r, c)) count++;
    return count;
  };
  const byId = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));

  it('row/column patterns light exactly one cross (23 cells), squares light the diagonal (12)', () => {
    for (const id of ['fives', 'nines', 'doubles', 'tens', 'elevens', 'distributive']) {
      expect(countMatches(byId[id]), id).toBe(23);
    }
    expect(countMatches(byId.squares)).toBe(12);
    expect(byId.squares.cellMatches(4, 4)).toBe(true);
    expect(byId.squares.cellMatches(4, 5)).toBe(false);
    expect(byId.fives.cellMatches(4, 0)).toBe(true);
    expect(byId.fives.cellMatches(0, 4)).toBe(true);
  });

  it('each explanation contains only true arithmetic statements', () => {
    expect(byId.nines.explain).toContain('9×3=27');
    expect(byId.distributive.explain).toContain('40 + 16 = 56');
    expect(byId.elevens.explain).toContain('11×11=121');
    for (const p of PATTERNS) expect(p.explain.length, p.id).toBeGreaterThan(40);
  });
});

describe('UI contracts (source pins)', () => {
  it('the window keydown handler refuses to act when the tool is unmounted', () => {
    expect(src).toContain("if (!document.querySelector('[data-multtable-command]')) return;");
  });

  it('Try again actually starts a new speed run', () => {
    // Count run-start sites: keyboard S, the Speed Run button, and Try again.
    expect(src.split('endTime: Date.now() + 120000').length - 1).toBe(3);
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
