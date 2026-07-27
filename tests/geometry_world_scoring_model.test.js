// Geometry World RTI scoring model — main question, first attempt.
//
// THE DECISION (Aaron, 2026-07-27)
// Accuracy previously counted every ANSWER ATTEMPT, and answer_correct fires once per
// follow-up STEP. Follow-ups are only reachable AFTER the preceding step was answered
// correctly, and are by design the gentlest items in the lesson. So a student who got
// the main question right banked extra easy corrects, while a student who kept missing
// it never reached them at all — the metric widened the gap rather than measuring it,
// inside a number printed as an RTI tier suggestion. Across the shipped lessons that
// is 35 questions but 83 steps, a 2.37x inflation.
//
// Follow-ups are now instructional scaffolding and are not scored. Each NPC's main
// question (step 0) is scored on the student's FIRST attempt, which makes it
// probe-like rather than a persistence measure.
//
// The attempt-level totals are still reported under answerAttempts* so nothing is
// lost, and every export carries a scoringModel stamp — a longitudinal file whose
// meaning changed silently is worse than no file.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_geometryworld.js',
  'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js',
];
const SOURCE = readFileSync(PATHS[0], 'utf8');

/** Extract the scoring block and expose what it computes. */
function loadScoring() {
  const start = SOURCE.indexOf('          var mainAttempts = log.filter(function(e) {');
  const end = SOURCE.indexOf('          var totalAttempts = correct.length + wrong.length;');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const body = SOURCE.slice(start, end);
  // eslint-disable-next-line no-new-func
  const fn = new Function('log',
    body + '\nreturn { questionsScored, questionsRightFirstTry, accuracy };');
  return (log) => fn(log);
}

const score = loadScoring();

// Helpers mirroring what the tool logs.
const right = (npc, question, step = 0) =>
  ({ type: 'answer_correct', data: { npc, question, step, isFinalStep: step > 0 } });
const wrong = (npc, question, step = 0) =>
  ({ type: 'answer_wrong', data: { npc, question, step, isFinalStep: step > 0 } });

describe('main-question-first-attempt scoring', () => {
  it('scores one question per NPC, not one per step', () => {
    // Ada's question carries two scaffolded follow-ups. Under the old model this was
    // 3 corrects; it is one question.
    const r = score([right('Ada', 'Q1', 0), right('Ada', 'Q1', 1), right('Ada', 'Q1', 2)]);
    expect(r.questionsScored).toBe(1);
    expect(r.questionsRightFirstTry).toBe(1);
    expect(r.accuracy).toBe(100);
  });

  it('does not let scaffolding inflate a struggling student away from a peer', () => {
    // The exact unfairness that prompted the change. Both students answered one main
    // question; one got it, one did not. Under attempt-counting the first student's
    // two easy follow-ups pushed them to 100% while the second sat at 0% — the same
    // 1-of-1 outcome rendered as a far wider gap.
    const strong = score([right('Ada', 'Q1', 0), right('Ada', 'Q1', 1), right('Ada', 'Q1', 2)]);
    const struggling = score([wrong('Ada', 'Q1', 0)]);

    expect(strong.questionsScored).toBe(1);
    expect(struggling.questionsScored).toBe(1);
    expect(strong.accuracy).toBe(100);
    expect(struggling.accuracy).toBe(0);
    // Both are measured against the same denominator — one question each.
    expect(strong.questionsScored).toBe(struggling.questionsScored);
  });

  it('takes the FIRST attempt, so a retry does not become mastery', () => {
    // Wrong, then right on the retry. Persistence is real and worth crediting, but
    // not as first-attempt accuracy on a probe.
    const r = score([wrong('Ada', 'Q1', 0), right('Ada', 'Q1', 0)]);
    expect(r.questionsScored).toBe(1);
    expect(r.questionsRightFirstTry).toBe(0);
    expect(r.accuracy).toBe(0);
  });

  it('is not fooled by repeated wrong attempts on one question', () => {
    const r = score([wrong('Ada', 'Q1', 0), wrong('Ada', 'Q1', 0), wrong('Ada', 'Q1', 0)]);
    expect(r.questionsScored).toBe(1);
    expect(r.accuracy).toBe(0);
  });

  it('ignores follow-up steps entirely, right or wrong', () => {
    // A student who nails the main question but fumbles the scaffolding still knew
    // the thing being measured.
    const r = score([right('Ada', 'Q1', 0), wrong('Ada', 'Q1', 1), wrong('Ada', 'Q1', 1), right('Ada', 'Q1', 1)]);
    expect(r.questionsScored).toBe(1);
    expect(r.accuracy).toBe(100);
  });

  it('counts each NPC separately', () => {
    const r = score([
      right('Ada', 'Q1', 0), right('Ada', 'Q1', 1),
      wrong('Ben', 'Q2', 0),
      right('Cy', 'Q3', 0),
      wrong('Dee', 'Q4', 0), right('Dee', 'Q4', 0),
    ]);
    expect(r.questionsScored).toBe(4);
    expect(r.questionsRightFirstTry).toBe(2); // Ada + Cy
    expect(r.accuracy).toBe(50);
  });

  it('does not double-count one NPC re-asked after a reload', () => {
    // Keyed by npc + question text, so restoring progress and meeting the same
    // question again does not add a second denominator entry.
    const r = score([right('Ada', 'Q1', 0), right('Ada', 'Q1', 0)]);
    expect(r.questionsScored).toBe(1);
  });

  it('separates two different questions from the same NPC', () => {
    const r = score([right('Ada', 'Q1', 0), wrong('Ada', 'Q2', 0)]);
    expect(r.questionsScored).toBe(2);
    expect(r.accuracy).toBe(50);
  });

  it('reports 0% rather than NaN when nothing was attempted', () => {
    // A division-by-zero here would print "NaN%" on a clinical report.
    const r = score([]);
    expect(r.questionsScored).toBe(0);
    expect(r.accuracy).toBe(0);
    expect(Number.isNaN(r.accuracy)).toBe(false);
  });

  it('ignores unrelated log events', () => {
    const r = score([
      { type: 'measurement', data: { L: 2 } },
      { type: 'block_place', data: { x: 1 } },
      right('Ada', 'Q1', 0),
    ]);
    expect(r.questionsScored).toBe(1);
  });

  it('survives events with missing data without throwing', () => {
    expect(() => score([{ type: 'answer_correct' }, { type: 'answer_wrong', data: {} }])).not.toThrow();
  });
});

describe('RTI tier boundaries under the new model', () => {
  // The thresholds are unchanged; what feeds them is not.
  const tier = (acc) => (acc >= 80 ? 'Tier 1 (Benchmark)' : acc >= 50 ? 'Tier 2 (Strategic)' : 'Tier 3 (Intensive)');

  it('places a student by questions right first try', () => {
    const four = ['Q1', 'Q2', 'Q3', 'Q4'];
    const allRight = score(four.map((q) => right('N' + q, q, 0)));
    expect(tier(allRight.accuracy)).toBe('Tier 1 (Benchmark)');

    const half = score([right('A', 'Q1', 0), right('B', 'Q2', 0), wrong('C', 'Q3', 0), wrong('D', 'Q4', 0)]);
    expect(half.accuracy).toBe(50);
    expect(tier(half.accuracy)).toBe('Tier 2 (Strategic)');

    const oneOfFour = score([right('A', 'Q1', 0), wrong('B', 'Q2', 0), wrong('C', 'Q3', 0), wrong('D', 'Q4', 0)]);
    expect(oneOfFour.accuracy).toBe(25);
    expect(tier(oneOfFour.accuracy)).toBe('Tier 3 (Intensive)');
  });

  it('no longer lets scaffolding lift a student a whole tier', () => {
    // One right, three wrong = Tier 3. Under attempt-counting, two follow-ups behind
    // the single correct answer made it 3 correct / 6 attempts = 50% = Tier 2.
    const log = [
      right('A', 'Q1', 0), right('A', 'Q1', 1), right('A', 'Q1', 2),
      wrong('B', 'Q2', 0), wrong('C', 'Q3', 0), wrong('D', 'Q4', 0),
    ];
    const r = score(log);
    expect(r.accuracy).toBe(25);
    expect(tier(r.accuracy)).toBe('Tier 3 (Intensive)');

    const oldModel = Math.round((3 / 6) * 100);
    expect(tier(oldModel)).toBe('Tier 2 (Strategic)');
  });
});

describe('the report is self-describing and loses nothing', () => {
  PATHS.forEach((p) => {
    const src = readFileSync(p, 'utf8');

    it(`stamps the scoring model into every export — ${p}`, () => {
      // Exports written before this change carry no scoringModel, which is how a
      // reviewer tells the two definitions apart in a longitudinal file.
      expect(src).toContain("scoringModel: 'main-question-first-attempt',");
    });

    it(`still reports the attempt-level totals — ${p}`, () => {
      expect(src).toContain('answerAttemptsCorrect: correct.length,');
      expect(src).toContain('answerAttemptsWrong: wrong.length,');
      expect(src).toContain('totalAttempts: totalAttempts,');
    });

    it(`keeps the printed fraction on one model — ${p}`, () => {
      // questionsCorrect over totalAttempts would mix models and could exceed 100%.
      expect(src).toContain("r.questionsCorrect + '/' + r.questionsScored");
      expect(src).not.toContain("r.questionsCorrect + '/' + r.totalAttempts");
    });

    it(`operationally defines accuracy in the IEP goal draft — ${p}`, () => {
      // "80% accuracy" is not a measurable goal unless it says accuracy of what.
      expect(src).toContain('accuracy = main questions answered correctly on the first attempt');
      expect(src).toContain('are not scored');
    });
  });
});
