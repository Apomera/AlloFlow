// Math review 2026-10-18: practice sets must never serve the same fact twice in a row.
//
// generatePracticeProblems fills a long set (the default is 120 problems) from a
// small fact pool (within 10 has 66 addition facts, facts through 5 has 36
// multiplication facts). Once the unique pool ran out it appended random repeats
// with no check against the problem just answered, so a default Kindergarten
// addition set served about one back-to-back repeat per session and a facts-5
// division set about four. The repeat's answer is still in working memory, which
// inflates timed-practice DCPM. buildSmartReviewProblems already de-duplicates
// adjacent facts; this pins the same rule for the practice generator.
//
// MF_REVIEW_MODULE lets the mutation check load a copy with the fix reverted.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let M;
let randomSpy;

// Seeded PRNG so the check is deterministic (mulberry32).
function seeded(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeAll(() => {
  loadAlloModule(process.env.MF_REVIEW_MODULE || 'math_fluency_module.js');
  M = window.AlloModules.MathFluencyInternals;
  randomSpy = vi.spyOn(Math, 'random').mockImplementation(seeded(20261018));
});
afterAll(() => { if (randomSpy) randomSpy.mockRestore(); });

function trueAnswer(p) {
  return p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : p.a / p.b;
}

// Small-pool settings a teacher reaches from the setup screen with the default count.
const CASES = [
  ['add', 'recommended', 'K', 120],
  ['add', 'within10', '1', 150],
  ['sub', 'within10', '2', 150],
  ['mul', 'facts5', '3', 120],
  ['div', 'facts5', '3', 150],
  ['mul', 'facts10', '4', 150],
  ['mixed', 'recommended', 'K', 150],
];

describe('generatePracticeProblems never repeats a fact back to back', () => {
  for (const [op, set, grade, count] of CASES) {
    it(`${op} / ${set} / grade ${grade} / ${count} problems`, () => {
      const adjacent = [];
      for (let run = 0; run < 25; run++) {
        const problems = M.generatePracticeProblems(op, set, grade, count);
        // The fix must not shorten the set or bend the facts.
        expect(problems.length).toBe(count);
        for (let i = 0; i < problems.length; i++) {
          const p = problems[i];
          if (trueAnswer(p) !== p.answer) adjacent.push(`run ${run} #${i}: wrong answer ${p.a}${p.symbol}${p.b}=${p.answer}`);
          if (i > 0 && M.getFactKey(p) === M.getFactKey(problems[i - 1])) {
            adjacent.push(`run ${run} #${i}: ${problems[i - 1].a}${p.symbol}${problems[i - 1].b} then ${p.a}${p.symbol}${p.b}`);
          }
        }
      }
      expect(adjacent.slice(0, 5), adjacent.length + ' back-to-back repeats').toEqual([]);
    });
  }
});
