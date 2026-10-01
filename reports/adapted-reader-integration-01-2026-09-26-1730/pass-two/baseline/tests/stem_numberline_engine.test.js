import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Number Line's challenge engine. genChallenge
// and checkAnswer are render-scope closures, so they are executed from a
// source slice with every dependency passed as a stub parameter; upd() is
// captured to observe the state patches (feedback, score, range).

const src = fs.readFileSync('stem_lab/stem_tool_numberline.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_numberline.js', 'utf8');

function harness(overrides) {
  const start = src.indexOf('var genChallenge = function()');
  const end = src.indexOf('// ═══ AI TUTOR ═══', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const env = Object.assign({
    difficulty: 'medium',
    range: { min: -5, max: 20 },
    challenge: null,
    answer: '',
    streak: 0,
    bestStreak: 0,
    score: { correct: 0, total: 0 },
    roundingSolved: 0, fractionSolved: 0, negativeSolved: 0, placeSolved: 0,
    challengeTypesUsed: {},
    _n: {}
  }, overrides);
  const patches = [];
  const noop = () => {};
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pickFn = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // eslint-disable-next-line no-new-func
  const built = new Function(
    'upd', 't', 'pick', 'randInt',
    'sfxNewChallenge', 'sfxCorrect', 'sfxWrong', 'sfxStreak', 'announceToSR', 'awardXP', 'checkBadges',
    'difficulty', 'range', 'challenge', 'answer',
    'streak', 'bestStreak', 'score',
    'roundingSolved', 'fractionSolved', 'negativeSolved', 'placeSolved',
    'challengeTypesUsed', '_n',
    src.slice(start, end) + '\nreturn { genChallenge: genChallenge, checkAnswer: checkAnswer };'
  )(
    (patch) => patches.push(patch), (k, fb) => fb, pickFn, randInt,
    noop, noop, noop, noop, noop, noop, noop,
    env.difficulty, env.range, env.challenge, env.answer,
    env.streak, env.bestStreak, env.score,
    env.roundingSolved, env.fractionSolved, env.negativeSolved, env.placeSolved,
    env.challengeTypesUsed, env._n
  );
  return { engine: built, patches };
}

const gradeOf = (patches) => {
  const withFeedback = patches.filter((p) => p.feedback);
  expect(withFeedback.length).toBe(1);
  return withFeedback[0];
};

function grade(challenge, answer, range) {
  const { engine, patches } = harness({ challenge, answer: String(answer), range: range || { min: 0, max: 20 } });
  engine.checkAnswer();
  return gradeOf(patches);
}

describe('declarative grading (serialization-safe regression pins)', () => {
  const between = { type: 'between', low: 3, high: 6, answer: 4, question: '' };

  it('between accepts EVERY integer strictly inside the bounds, without _checkFn', () => {
    // Grading previously lived in a function stored in React state; after any
    // state serialization it vanished, and 5 would be marked wrong here.
    expect(between._checkFn).toBeUndefined();
    expect(grade(between, 4).feedback.correct).toBe(true);
    expect(grade(between, 5).feedback.correct).toBe(true);
    expect(grade(between, 3).feedback.correct).toBe(false);
    expect(grade(between, 6).feedback.correct).toBe(false);
    expect(grade(between, 4.5).feedback.correct).toBe(false);
  });

  it('fraction grades against the exact value with tolerance', () => {
    const frac = { type: 'fraction', exact: 1 / 3, answer: 0.3, question: '' };
    expect(grade(frac, 0.3).feedback.correct).toBe(true);
    expect(grade(frac, 0.33).feedback.correct).toBe(true);
    expect(grade(frac, 0.5).feedback.correct).toBe(false);
    // Legacy state without exact still grades against the rounded answer.
    expect(grade({ type: 'fraction', answer: 0.3, question: '' }, 0.31).feedback.correct).toBe(true);
  });

  it('identify is exact; estimate and place use their tolerances', () => {
    expect(grade({ type: 'identify', answer: 7, question: '' }, 7).feedback.correct).toBe(true);
    expect(grade({ type: 'identify', answer: 7, question: '' }, 8).feedback.correct).toBe(false);
    expect(grade({ type: 'estimate', answer: 10, question: '' }, 11, { min: 0, max: 20 }).feedback.correct).toBe(true);
    expect(grade({ type: 'estimate', answer: 10, question: '' }, 13, { min: 0, max: 20 }).feedback.correct).toBe(false);
    expect(grade({ type: 'place', answer: 10, question: '' }, 11, { min: 0, max: 20 }).feedback.correct).toBe(true);
    expect(grade({ type: 'rounding', answer: 40, question: '' }, 40).feedback.correct).toBe(true);
    expect(grade({ type: 'rounding', answer: 40, question: '' }, 30).feedback.correct).toBe(false);
  });

  it('streak, score, and per-type counters update on the same patch', () => {
    const result = grade({ type: 'identify', answer: -3, question: '' }, -3);
    expect(result.score).toEqual({ correct: 1, total: 1 });
    expect(result.streak).toBe(1);
    expect(result.negativeSolved).toBe(1);
  });
});

describe('generated challenges are self-consistent', () => {
  it('every generated challenge is provably answerable from its own data', () => {
    for (let i = 0; i < 300; i++) {
      const { engine, patches } = harness({ difficulty: ['easy', 'medium', 'hard'][i % 3] });
      engine.genChallenge();
      const ch = patches.filter((p) => p.challenge)[0].challenge;
      expect(ch._checkFn, ch.type + ': functions must not be stored in state').toBeUndefined();
      if (ch.type === 'rounding') {
        const m = ch.question.match(/Round (\d+) to the nearest (\d+)\./);
        expect(m, ch.question).toBeTruthy();
        expect(ch.answer).toBe(Math.round(Number(m[1]) / Number(m[2])) * Number(m[2]));
      } else if (ch.type === 'between') {
        expect(ch.answer).toBeGreaterThan(ch.low);
        expect(ch.answer).toBeLessThan(ch.high);
        expect(ch.high - ch.low).toBeGreaterThanOrEqual(2);
      } else if (ch.type === 'fraction') {
        const m = ch.question.match(/points to (\d+)\/(\d+)\./);
        expect(m, ch.question).toBeTruthy();
        expect(ch.exact).toBeCloseTo(Number(m[1]) / Number(m[2]), 9);
        expect(Math.abs(ch.answer - ch.exact)).toBeLessThan(0.06);
      } else if (ch.type === 'identify' || ch.type === 'estimate' || ch.type === 'place') {
        expect(isFinite(ch.answer)).toBe(true);
      }
    }
  });

  it('easy difficulty never serves fraction challenges', () => {
    for (let i = 0; i < 120; i++) {
      const { engine, patches } = harness({ difficulty: 'easy' });
      engine.genChallenge();
      const ch = patches.filter((p) => p.challenge)[0].challenge;
      expect(ch.type).not.toBe('fraction');
    }
  });
});

describe('UI contracts (source pins)', () => {
  it('all five tabs have number-key shortcuts and the hint says 1-5', () => {
    expect(src).toContain("key === '5') { sfxClick(); upd({ tab: 'magCompare' });");
    expect(src).toContain('1-5: tabs');
    expect(src).not.toContain('1-4: tabs');
  });

  it('the slider aria-valuetext only claims a fraction when the value is exact', () => {
    expect(src).toContain("(isExactFrac ? ', which is ' + simpNum + ' over ' + simpDen : ', near '");
  });

  it('the research claim is stated without embellishment', () => {
    expect(src).not.toContain('better than rote facts');
    expect(src).toContain('links number-line estimation precision to later math achievement');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
