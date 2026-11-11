// The 50-question quiz could be passed without knowing any aviation (review 2026-11-09):
// the key sat at position (question number mod 4), so the answers read A, B, C, D, A, B,
// C, D to the end; the key was the second-longest option in 35 of 50 questions because
// one distractor had been padded past it; and several items had a second correct option.
// These scan the whole bank, so a new question cannot bring any of that back.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS, bank;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool(process.env.SKYSCHOOL_QUIZ_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  bank = FS.FLIGHT_QUIZ_BANK;
});

describe('quiz bank: every item is well formed', () => {
  it('has 50 questions, each with four different options, exactly one of them the key', () => {
    expect(bank).toHaveLength(50);
    const bad = bank.filter((q) => !Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4
      || q.options.filter((o) => o === q.correct).length !== 1 || !q.explanation || !q.question.trim().endsWith('?') && !q.question.trim().endsWith(':'));
    expect(bad.map((q) => q.question)).toEqual([]);
    expect(new Set(bank.map((q) => q.question)).size).toBe(50);
  });

  it('keeps out the options that were also correct, and the wording that was wrong', () => {
    const everyOption = bank.flatMap((q) => q.options);
    // Each of these was a "wrong" option that is true, or a key that taught something false.
    for (const banned of ['The maximum lift angle', 'You\'re in trouble', 'Speed and wing area',
      'Looks out the window and listens to the radio for position reports',
      'How much the plane weighs compared with its maximum takeoff weight', 'Apply more power and pitch down']) {
      expect(everyOption, banned).not.toContain(banned);
    }
    const lift = bank.find((q) => /make a wing produce more lift/.test(q.question));
    expect(lift.correct).toMatch(/angle of attack/);
    expect(lift.explanation).toMatch(/angle of attack/);
    const stall = bank.find((q) => /recover from a stall/.test(q.question));
    expect(stall.correct).toMatch(/^Lower the nose.*then add power$/);
    expect(bank.some((q) => q.question === 'How many engines does a Boeing 747 have?')).toBe(true);
    expect(bank.some((q) => /Concorde.*maximum cruising altitude/.test(q.question))).toBe(true);
    // The critical angle question no longer offers a second true answer.
    const critical = bank.find((q) => q.question === 'What is the critical angle of attack?');
    expect(critical.options.filter((o) => /lift/i.test(o))).toEqual([]);
  });
});

describe('quiz bank: the key cannot be guessed from where it sits', () => {
  const keyPositions = (seed) => FS.getQuizDeck(seed).map((q) => q.options.indexOf(q.correct));

  it('keeps every option and the key through a shuffle, and is repeatable for one attempt', () => {
    const a = FS.getQuizDeck(3), b = FS.getQuizDeck('3');
    expect(a).toBe(b);
    a.forEach((q, i) => {
      expect(q.options.slice().sort()).toEqual(bank[i].options.slice().sort());
      expect(q.correct).toBe(bank[i].correct);
    });
    expect(FS.shuffleFlightQuizOptions(['a', 'b', 'c', 'd'], 'seed')).toEqual(FS.shuffleFlightQuizOptions(['a', 'b', 'c', 'd'], 'seed'));
  });

  it('does not follow the old A-B-C-D cycle, or any fixed position, in any of 40 attempts', () => {
    for (let seed = 0; seed < 40; seed++) {
      const positions = keyPositions(seed);
      const cycle = positions.filter((p, i) => p === i % 4).length;
      expect(cycle, 'attempt ' + seed + ' follows the old cycle').toBeLessThan(25);
      for (let slot = 0; slot < 4; slot++) {
        const share = positions.filter((p) => p === slot).length / positions.length;
        expect(share, 'attempt ' + seed + ' slot ' + slot).toBeLessThan(0.5);
      }
    }
  });

  it('spreads the key evenly over the four positions across attempts, and moves it between attempts', () => {
    const counts = [0, 0, 0, 0];
    let moved = 0;
    const first = keyPositions(0);
    for (let seed = 0; seed < 40; seed++) keyPositions(seed).forEach((p) => { counts[p]++; });
    const total = counts.reduce((a, b) => a + b, 0);
    counts.forEach((n) => { expect(n / total).toBeGreaterThan(0.2); expect(n / total).toBeLessThan(0.3); });
    keyPositions(1).forEach((p, i) => { if (p !== first[i]) moved++; });
    expect(moved).toBeGreaterThan(25);
  });

  it('decodes an old saved index against the old arrangement, where the key sat at question number mod 4', () => {
    bank.forEach((q, i) => {
      const legacy = FS.flightQuizLegacyOptions(i);
      expect(legacy[i % 4]).toBe(q.correct);
      expect(legacy.slice().sort()).toEqual(q.options.slice().sort());
    });
    expect(FS.flightQuizLegacyOptions(999)).toEqual([]);
  });

  it('reads the seed from the saved attempt number', () => {
    expect(FS.flightQuizSeedOf({ quizAttemptSequence: 7 })).toBe('7');
    expect(FS.flightQuizSeedOf({})).toBe('0');
    expect(FS.flightQuizSeedOf({ quizAttemptSequence: -1 })).toBe('0');
    expect(FS.flightQuizSeedOf(null)).toBe('0');
  });
});

describe('quiz bank: the key cannot be guessed from its length', () => {
  // Rank 0 = the longest option, 1 = second longest, ... among the distinct lengths.
  const rank = (q) => [...new Set(q.options.map((o) => o.length))].sort((a, b) => b - a).indexOf(q.correct.length);
  const distinct = (q) => new Set(q.options.map((o) => o.length)).size;

  it('is not the second-longest option far more often than chance (it was 35 of 50)', () => {
    const second = bank.filter((q) => rank(q) === 1).length;
    expect(second / bank.length).toBeLessThan(0.42);
  });

  it('is not the single longest option far more often than chance either', () => {
    const longest = bank.filter((q) => distinct(q) > 1 && rank(q) === 0 && q.options.filter((o) => o.length === q.correct.length).length === 1).length;
    expect(longest / bank.length).toBeLessThan(0.35);
  });

  it('uses at least three of the four length ranks at least ten percent of the time', () => {
    const used = [0, 1, 2, 3].filter((r) => bank.filter((q) => rank(q) === r).length >= 5);
    expect(used.length).toBeGreaterThanOrEqual(3);
  });
});
