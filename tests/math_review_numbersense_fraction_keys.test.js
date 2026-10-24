import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sliceBetween } from './helpers/anchored_slice.js';

// Answer keys produced by the Fraction Lab's generators, checked against an
// independent computation. Each generator is a render-scope closure, so it is
// executed from a source slice with the tool's OWN fraction helpers (also
// sliced from the source) and a seeded random stream.
//
// MR_NUMBERSENSE_FRACTIONS_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR_NUMBERSENSE_FRACTIONS_SRC || 'stem_lab/stem_tool_fractions.js';
const src = fs.readFileSync(FILE, 'utf8');
const cut = (a, b) => sliceBetween(src, a, b, { file: FILE });

// The tool's own helpers.
// eslint-disable-next-line no-new-func
const normalizeFractionPair = new Function(cut('function normalizeFractionPair(n, d) {', 'function fractionAnswerGcd') + '\nreturn normalizeFractionPair;')();
// eslint-disable-next-line no-new-func
const toolMath = new Function('normalizeFractionPair',
  cut('var gcd = function(a, b) { a = Math.abs(a);', 'var val1 = ') + '\nreturn { gcd: gcd, lcm: lcm, simplify: simplify };'
)(normalizeFractionPair);
const { lcm, simplify } = toolMath;

// Independent reference arithmetic.
const refGcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % t; a = t; } return a; };
const lowest = (n, d) => { const g = refGcd(n, d) || 1; return [n / g, d / g]; };
const parseFrac = (s) => { const m = /^(-?\d+)\/(\d+)$/.exec(String(s)); return m ? [Number(m[1]), Number(m[2])] : null; };
const sameValue = (a, b) => a && b && a[0] * b[1] === b[0] * a[1];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seeded(seed) {
  const rng = mulberry32(seed);
  vi.spyOn(Math, 'random').mockImplementation(rng);
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const fyShuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  return { randInt, pick, fyShuffle };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('practice challenge generator', () => {
  function challenges(count) {
    const r = seeded(20261018);
    const patches = [];
    // eslint-disable-next-line no-new-func
    const generateChallenge = new Function(
      'pick', 'randInt', 'fyShuffle', 'upd', '__alloT', 'sfxNewChallenge', 'challengeTypesUsed', 'dpool', 'simplify',
      cut('var generateChallenge = function() {', 'var challengeSubmissionPending = false;') + '\nreturn generateChallenge;'
    )(r.pick, r.randInt, r.fyShuffle, (p) => patches.push(p), (k, fb) => fb, () => {}, {}, [2, 3, 4, 5, 6, 8, 10, 12], simplify);
    const out = [];
    for (let i = 0; i < count; i++) {
      patches.length = 0;
      generateChallenge();
      const withChallenge = patches.filter((p) => p.challenge);
      expect(withChallenge.length).toBe(1);
      out.push(withChallenge[0].challenge);
    }
    return out;
  }

  it('"Simplify a/b" keys the numerator of the LOWEST-terms fraction, with the true GCD in the hint', () => {
    // Before the fix the base fraction could itself be reducible:
    // "Simplify 6/12. What is the simplified numerator?" was keyed 2 (2/4), hint "GCD(6, 12) = 3".
    const items = challenges(3000).filter((c) => c.type === 'simplify');
    expect(items.length).toBeGreaterThan(200);
    const bad = [];
    for (const c of items) {
      const m = /Simplify (\d+)\/(\d+)\./.exec(c.question);
      expect(m, c.question).not.toBeNull();
      const n = Number(m[1]), d = Number(m[2]);
      const want = lowest(n, d);
      const hint = /GCD\((\d+), (\d+)\) = (\d+)/.exec(c.hint || '');
      if (c.answer !== want[0] || !hint || Number(hint[3]) !== refGcd(n, d)) bad.push(c.question + ' key=' + c.answer + ' hint=' + c.hint);
    }
    expect(bad.slice(0, 5), bad.length + ' wrong simplify keys').toEqual([]);
  });

  it('"as a percentage? (whole number)" only asks for fractions whose percentage IS a whole number', () => {
    // 5/8 = 62.5% was keyed 63, and the whole-number-only input refused 62.5.
    const items = challenges(3000).filter((c) => c.type === 'toDecimal');
    expect(items.length).toBeGreaterThan(200);
    const bad = [];
    for (const c of items) {
      const m = /What is (\d+)\/(\d+) as a percentage/.exec(c.question);
      const exact = Number(m[1]) * 100 / Number(m[2]);
      if (!Number.isInteger(exact) || exact !== c.answer) bad.push(c.question + ' key=' + c.answer + ' exact=' + exact);
    }
    expect(bad.slice(0, 5), bad.length + ' non-whole percentages').toEqual([]);
  });
});

describe('worksheet generator', () => {
  it('the Simplify answer key is in lowest terms', () => {
    // "Simplify 15/30" was keyed 3/6.
    const r = seeded(7);
    const out = [];
    // eslint-disable-next-line no-new-func
    const generateWorksheet = new Function(
      'ws', 'pick', 'randInt', 'simplify', 'lcm', 'upd', 'sfxComplete', 'announceToSR',
      cut('var generateWorksheet = function() {', 'var printWorksheet') + '\nreturn generateWorksheet;'
    )({ topic: 'simplify', count: 400 }, r.pick, r.randInt, simplify, lcm, (p) => out.push(p), () => {}, () => {});
    generateWorksheet();
    const probs = out[0].generatedWorksheet;
    expect(probs.length).toBe(400);
    const bad = probs.filter((p) => {
      const q = /Simplify (\d+)\/(\d+)/.exec(p.q);
      const want = lowest(Number(q[1]), Number(q[2]));
      return p.answer !== want[0] + '/' + want[1];
    }).map((p) => p.q + ' -> ' + p.answer);
    expect(bad.slice(0, 5), bad.length + ' wrong worksheet keys').toEqual([]);
  });
});

describe('exam prep generator', () => {
  function exams(grade, rounds) {
    const r = seeded(grade * 1000 + 3);
    const out = [];
    // eslint-disable-next-line no-new-func
    const generateExam = new Function(
      'pick', 'randInt', 'simplify', 'lcm', 'fyShuffle', 'upd', 'sfxNewChallenge',
      cut('var generateExam = function(grade) {', 'var submitExam') + '\nreturn generateExam;'
    )(r.pick, r.randInt, simplify, lcm, r.fyShuffle, (p) => out.push(p), () => {});
    const items = [];
    for (let i = 0; i < rounds; i++) { out.length = 0; generateExam(grade); items.push(...out[0].examQs); }
    return items;
  }

  for (const grade of [3, 5]) {
    it('grade ' + grade + ': every item has unique choices and exactly ONE choice equal in value to the key', () => {
      // "Which is equivalent to 5/5?" offered 6/6 AND 15/15 (one graded wrong);
      // "1/2 - 1/4 = ?" listed 1/4 twice; "2/4 x 1/2" listed 2/4 twice.
      const bad = [];
      for (const it of exams(grade, 400)) {
        const issues = [];
        if (!it.choices.includes(it.answer)) issues.push('key missing');
        if (new Set(it.choices).size !== it.choices.length) issues.push('duplicate choices');
        const key = it.type === 'equivalent' ? parseFrac(/to (\d+\/\d+)\?/.exec(it.q)[1]) : parseFrac(it.answer);
        if (key) {
          const correct = it.choices.filter((c) => sameValue(parseFrac(c), key));
          if (correct.length !== 1) issues.push(correct.length + ' choices equal the key');
        }
        if (issues.length) bad.push(it.q + ' ' + JSON.stringify(it.choices) + ' key=' + it.answer + ': ' + issues.join(', '));
      }
      expect(bad.slice(0, 5), bad.length + ' flawed items').toEqual([]);
    });
  }
});

describe('Equivalent Match deck', () => {
  it('no two pairs share a value, so every equivalent flip is the graded pair', () => {
    // 1/2 + 3/6 and 2/4 + 4/8 could share a deck: flipping 1/2 then 4/8 (equal)
    // was graded "not a pair".
    const r = seeded(99);
    // eslint-disable-next-line no-new-func
    const makeEquivalentPairs = new Function(
      'pick', 'randInt', 'fyShuffle', 'simplify',
      cut('var makeEquivalentPairs = function(count) {', 'var startEMGame') + '\nreturn makeEquivalentPairs;'
    )(r.pick, r.randInt, r.fyShuffle, simplify);
    const bad = [];
    for (let deck = 0; deck < 500; deck++) {
      const cards = makeEquivalentPairs(6);
      expect(cards.length).toBe(12);
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const equal = sameValue([cards[i].n, cards[i].d], [cards[j].n, cards[j].d]);
          const paired = cards[i].pairId === cards[j].pairId;
          if (equal !== paired) bad.push(cards[i].n + '/' + cards[i].d + ' vs ' + cards[j].n + '/' + cards[j].d + (paired ? ' paired but unequal' : ' equal but not paired'));
        }
      }
    }
    expect(bad.slice(0, 5), bad.length + ' mis-paired cards').toEqual([]);
  });
});

describe('converter repeating decimals', () => {
  // eslint-disable-next-line no-new-func
  const fracToDecimal = new Function('simplify',
    cut('var fracToDecimal = function(num, den) {', '// Decimal to fraction approximation') + '\nreturn fracToDecimal;'
  )(simplify);

  it('truncates (never rounds) the digits shown before the ellipsis', () => {
    // toFixed(8) printed 2/3 as 0.66666667... - a digit the expansion never has.
    expect(fracToDecimal(2, 3)).toBe('0.66666666...');
    expect(fracToDecimal(1, 6)).toBe('0.16666666...');
    expect(fracToDecimal(5, 6)).toBe('0.83333333...');
    expect(fracToDecimal(1, 7)).toBe('0.14285714...');
    expect(fracToDecimal(22, 7)).toBe('3.14285714...');
    expect(fracToDecimal(1, 3)).toBe('0.33333333...');
  });

  it('leaves terminating decimals exact', () => {
    expect(fracToDecimal(3, 4)).toBe('0.75');
    expect(fracToDecimal(1, 64)).toBe('0.015625');
    expect(fracToDecimal(6, 3)).toBe('2');
    expect(fracToDecimal(0, 9)).toBe('0');
  });
});
