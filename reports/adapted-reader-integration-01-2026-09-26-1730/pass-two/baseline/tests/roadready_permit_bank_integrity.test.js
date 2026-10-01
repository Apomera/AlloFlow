// RoadReady — permit-bank answer-key integrity.
//
// This is a practice test for a real driving permit. A defect here does not just
// look wrong, it marks a student WRONG for a right answer, or teaches them to pass
// by reading the shape of the options instead of the road rules.
//
// The existing roadready_rules suite pins the CONTENT of Maine statutes very
// thoroughly (~25 tests). What nothing covered is the STRUCTURE of the bank and the
// machinery that presents it.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
let BANK;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) throw new Error('roadready did not populate __RR_TEST_EXPORTS__');
  BANK = RR.PERMIT_BANK;
});

const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

describe('every question is answerable and scorable', () => {
  it('has a bank to check', () => {
    expect(Array.isArray(BANK)).toBe(true);
    expect(BANK.length).toBeGreaterThan(150);
  });

  it('points `correct` at a real option in every question', () => {
    const bad = BANK
      .map((q, i) => ({ i, q }))
      .filter(({ q }) => !Number.isInteger(q.correct) || q.correct < 0 || q.correct >= (q.a || []).length)
      .map(({ i, q }) => `Q${i} correct=${q.correct} of ${(q.a || []).length}`);
    expect(bad).toEqual([]);
  });

  it('offers at least two choices everywhere', () => {
    const thin = BANK.map((q, i) => ({ i, n: (q.a || []).length })).filter((x) => x.n < 2);
    expect(thin).toEqual([]);
  });

  it('never repeats an option inside one question', () => {
    // Two identical choices means two correct answers, and the student is scored
    // wrong for picking the other one.
    const dupes = [];
    BANK.forEach((q, i) => {
      const seen = new Map();
      (q.a || []).forEach((opt, k) => {
        const key = norm(opt);
        if (seen.has(key)) {
          dupes.push(`Q${i} options ${seen.get(key)} & ${k} identical${[seen.get(key), k].includes(q.correct) ? ' (one IS the correct answer)' : ''}`);
        } else seen.set(key, k);
      });
    });
    expect(dupes).toEqual([]);
  });

  it('asks each question only once', () => {
    const seen = new Map();
    const dupes = [];
    BANK.forEach((q, i) => {
      const key = norm(q.q);
      if (seen.has(key)) dupes.push(`Q${i} duplicates Q${seen.get(key)}`);
      else seen.set(key, i);
    });
    expect(dupes).toEqual([]);
  });

  it('explains every answer, so a miss teaches something', () => {
    const silent = BANK.map((q, i) => ({ i, q })).filter(({ q }) => !q.exp || !String(q.exp).trim()).map(({ i }) => `Q${i}`);
    expect(silent).toEqual([]);
  });

  it('files every question under a category, or it can never reach a category test', () => {
    const homeless = BANK.map((q, i) => ({ i, q })).filter(({ q }) => !q.category).map(({ i }) => `Q${i}`);
    expect(homeless).toEqual([]);
  });
});

describe('shuffling keeps the answer key honest', () => {
  it('moves the correct index to follow the correct TEXT', () => {
    const q = { q: 'probe', a: ['alpha', 'bravo', 'charlie', 'delta'], correct: 1, exp: 'e', category: 'general' };
    for (let trial = 0; trial < 200; trial += 1) {
      const s = RR.shuffleAnswers(q);
      expect(s.a[s.correct]).toBe('bravo');
      expect([...s.a].sort()).toEqual([...q.a].sort());
    }
  });

  it('leaves the rest of the question untouched', () => {
    const q = { q: 'probe', a: ['alpha', 'bravo'], correct: 0, exp: 'why', category: 'winter', extra: 7 };
    const s = RR.shuffleAnswers(q);
    expect(s.q).toBe('probe');
    expect(s.exp).toBe('why');
    expect(s.category).toBe('winter');
    expect(s.extra).toBe(7);
  });

  // 77.7% of the bank is authored with correct: 1. Every builder currently runs
  // .map(shuffleAnswers), so students never see that. If a future surface (a
  // "review all questions" view, say) serves the bank raw, a student could pass by
  // always picking B — so pin that what the builders emit is actually shuffled.
  it('does not let the authoring bias reach the student', () => {
    const raw = BANK.filter((q) => q.correct === 1).length / BANK.length;
    expect(raw, 'authoring bias assumed by this test has changed').toBeGreaterThan(0.5);

    const builders = [() => RR.buildRandomTest(), () => RR.buildCategoryTest('general')];
    builders.forEach((build, b) => {
      let ones = 0;
      let total = 0;
      for (let run = 0; run < 40; run += 1) {
        build().forEach((q) => { total += 1; if (q.correct === 1) ones += 1; });
      }
      expect(total).toBeGreaterThan(100);
      // Shuffled ~25% for 4 options; unshuffled would track the 77.7% bias.
      expect(ones / total, `builder ${b} appears not to shuffle (${((ones / total) * 100).toFixed(1)}% on index 1)`).toBeLessThan(0.5);
    });
  });
});

describe('the options should not give the answer away by shape', () => {
  // Measured, not guessed: in 98 of 193 questions the correct answer is more than
  // twice as long as EVERY distractor, because it is the only qualified,
  // multi-clause option among terse ones. Example — "Maine law requires headlights
  // to be on:" offers "Only at night" / "Only in fog" / "Only on highways" against
  // "When windshield wipers are in constant use". A student can score well on half
  // this bank by always choosing the longest option, having learned no road rule.
  //
  // Started as a ratchet at 98 and is now ZERO across all 193 questions, so it is
  // a hard assertion rather than an allowance. Rewritten in four passes: signs,
  // maintenance, emergency, then general/winter/pedestrian/gdl/dui.
  //
  // What made this safe to do without an educator authoring new law:
  //   - a DISTRACTOR is false by construction, so lengthening one asserts nothing
  //     new; it only has to stay plausible and stay wrong. Most length came from
  //     there, and the last two passes changed distractors ONLY.
  //   - correct answers that state a rule were checked against FEDERAL or
  //     near-universal sources: MUTCD 11th ed. (sign shape/colour), NHTSA TireWise
  //     (2/32" tread, door-placard not sidewall pressure), NHTSA Move Over (all 50
  //     states), NHTSA zero-tolerance (<.02 under 21) and .08 per se, NHTSA/IIHS
  //     GDL three-stage structure, FMCSA No-Zones.
  //   - correct answers that restate STATUTE were left byte-identical. That rule
  //     was earned: shortening the parked-car answer dropped Maine §2254's
  //     "conspicuous note ... vehicle registration number" and instantly failed
  //     roadready_rules. The applier for the last two passes preserved the correct
  //     option in place so it could not be retyped at all.
  const lensOf = (q) => (q.a || []).map((s) => String(s).length);

  const tells = () => BANK.filter((q) => {
    const lens = lensOf(q);
    if (lens.length < 3) return false;
    const others = lens.filter((_, k) => k !== q.correct);
    return lens[q.correct] > Math.max(...others) * 2;
  });

  it('has no question where the correct answer is twice every distractor', () => {
    const n = tells();
    expect(
      n.map((q) => q.q.slice(0, 60)),
      `${n.length} of ${BANK.length} questions can be answered on length alone`
    ).toEqual([]);
  });

  it('has not simply inverted the tell by making the answer the shortest', () => {
    // The lazy way to satisfy the check above is to pad every distractor until the
    // correct answer is conspicuously the SHORTEST — same giveaway, other sign.
    const inverse = BANK.filter((q) => {
      const lens = lensOf(q);
      if (lens.length < 3) return false;
      const others = lens.filter((_, k) => k !== q.correct);
      return lens[q.correct] * 2 < Math.min(...others);
    });
    expect(inverse.map((q) => q.q.slice(0, 60))).toEqual([]);
  });
});
