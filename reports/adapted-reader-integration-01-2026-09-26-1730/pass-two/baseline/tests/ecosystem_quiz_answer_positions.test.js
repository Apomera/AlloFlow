// ecosystem — the quiz must not reward always picking the same letter.
//
// The bank shipped with answers at A/B/C/D = 1/3/2/0 across six questions: B was correct
// half the time and D never. Nothing shuffles the options at render, so the order in this
// file is the order a student sees, and "always answer B" scored 50% against a 25%
// baseline. The repo-wide scanner did not catch it because six questions is below its
// threshold for a measurable bank, so this guard is local and static.
//
// The bank was fixed by ROTATING each question's options rather than shuffling, which
// keeps `choices` and `wrongFeedback` index-parallel — wrongFeedback[answer] is the
// "Correct!" message and has to travel with the option it belongs to.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_ecosystem.js';
let bank;

beforeAll(() => {
  const src = fs.readFileSync(SRC_PATH, 'utf8');
  const m = src.match(/var QUIZ_QUESTIONS = (\[[\s\S]*?\n {2}\];)/);
  expect(m, 'QUIZ_QUESTIONS block not found — the bank was renamed or reformatted').toBeTruthy();
  // eslint-disable-next-line no-eval
  bank = eval(m[1].replace(/;$/, ''));
});

describe('ecosystem quiz answer positions', () => {
  it('exposes a bank this guard can actually measure', () => {
    expect(bank.length).toBeGreaterThanOrEqual(6);
    bank.forEach((q, i) => {
      expect(Array.isArray(q.choices), `q${i + 1} choices`).toBe(true);
      expect(q.choices.length, `q${i + 1} should offer four options`).toBe(4);
      expect(Number.isInteger(q.answer), `q${i + 1} answer index`).toBe(true);
      expect(q.answer, `q${i + 1} answer out of range`).toBeGreaterThanOrEqual(0);
      expect(q.answer, `q${i + 1} answer out of range`).toBeLessThan(q.choices.length);
    });
  });

  it('spreads the correct answer across positions', () => {
    const counts = [0, 0, 0, 0];
    bank.forEach((q) => { counts[q.answer] += 1; });
    const summary = counts.map((n, i) => 'ABCD'[i] + '=' + n).join(' ');

    // No position may carry more than 40% of the answers, and none may be unused —
    // "D is never right" is exploitable in exactly the same way as "B usually is".
    const max = Math.max(...counts);
    expect(max / bank.length, `one position dominates (${summary})`).toBeLessThanOrEqual(0.4);
    counts.forEach((n, i) => {
      expect(n, `position ${'ABCD'[i]} is never the answer (${summary})`).toBeGreaterThan(0);
    });
  });

  it('keeps each question feedback aligned with its options', () => {
    bank.forEach((q, i) => {
      expect(q.wrongFeedback.length, `q${i + 1} feedback must be index-parallel to choices`)
        .toBe(q.choices.length);
      // The entry at the answer index is the confirming one; the others are corrections.
      expect(q.wrongFeedback[q.answer], `q${i + 1} feedback at the answer index should confirm`)
        .toMatch(/^Correct/);
      q.wrongFeedback.forEach((f, k) => {
        if (k !== q.answer) {
          expect(f, `q${i + 1} option ${'ABCD'[k]} should read as a correction`).not.toMatch(/^Correct/);
        }
      });
    });
  });
});
