import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const NUMBERLINE_FILE = 'stem_lab/stem_tool_numberline.js';
const FRACTIONS_FILE = 'stem_lab/stem_tool_fractions.js';
const numberlineSource = fs.readFileSync(NUMBERLINE_FILE, 'utf8');
const fractionsSource = fs.readFileSync(FRACTIONS_FILE, 'utf8');

function numberlineChecker(answer, challenge) {
  const start = numberlineSource.indexOf('var rLen = range.max - range.min;');
  const end = numberlineSource.indexOf('// ═══ AI TUTOR ═══', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const patches = [];
  const awardXP = vi.fn();
  const noop = () => {};
  // eslint-disable-next-line no-new-func
  const checker = new Function(
    'range', 'challenge', 'answer', 'streak', 'bestStreak', 'score',
    'roundingSolved', 'fractionSolved', 'negativeSolved', 'placeSolved',
    'challengeTypesUsed', '_n', 'upd', 'sfxCorrect', 'sfxWrong', 'sfxStreak',
    'announceToSR', 'awardXP', 'checkBadges',
    numberlineSource.slice(start, end) + '\nreturn checkAnswer;'
  )(
    { min: 0, max: 20 }, challenge, answer, 0, 0, { correct: 0, total: 0 },
    0, 0, 0, 0, { identify: true }, {}, (patch) => patches.push(patch),
    noop, noop, noop, noop, awardXP, noop
  );
  return { checker, patches, awardXP };
}

function fractionChecker(answer, challenge) {
  const start = fractionsSource.indexOf('var challengeSubmissionPending = false;');
  const end = fractionsSource.indexOf('// ═══ COMPARE QUIZ ═══', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const patches = [];
  const awardXP = vi.fn();
  const noop = () => {};
  // eslint-disable-next-line no-new-func
  const checker = new Function(
    'challenge', 'answer', 'streak', 'bestStreak', 'score', '_f',
    'challengeTypesUsed', 'tabsVisited', 'upd', 'sfxCorrect', 'sfxWrong',
    'sfxStreak', 'announceToSR', 'awardXP', 'checkBadges',
    fractionsSource.slice(start, end) + '\nreturn checkChallenge;'
  )(
    challenge, answer, 0, 0, { correct: 0, total: 0 }, {},
    { percentage: true }, {}, (patch) => patches.push(patch),
    noop, noop, noop, noop, awardXP, noop
  );
  return { checker, patches, awardXP };
}

beforeEach(() => resetStemLab());

describe('Number Line challenge grading', () => {
  const challenge = { type: 'identify', answer: 7, question: 'Which number?', solved: false };

  it('rejects numeric prefixes and makes a correct submission idempotent', () => {
    for (const malformed of ['7cats', '7.2.1', 'Infinity']) {
      const run = numberlineChecker(malformed, challenge);
      run.checker();
      expect(run.patches, malformed).toEqual([]);
      expect(run.awardXP, malformed).not.toHaveBeenCalled();
    }

    const run = numberlineChecker('7', challenge);
    run.checker();
    run.checker();
    expect(run.awardXP).toHaveBeenCalledTimes(1);
    expect(run.patches).toHaveLength(1);
    expect(run.patches[0]).toMatchObject({
      challenge: { solved: true },
      feedback: { correct: true },
      score: { correct: 1, total: 1 },
    });

    const rerender = numberlineChecker('7', run.patches[0].challenge);
    rerender.checker();
    expect(rerender.awardXP).not.toHaveBeenCalled();
    expect(rerender.patches).toEqual([]);
  });
});

describe('Fractions whole-answer challenge grading', () => {
  const challenge = { type: 'percentage', answer: 50, question: 'Convert to a percent.', answered: false };

  it('rejects fractional/prefix answers and awards a solved challenge once', () => {
    for (const malformed of ['50.9', '50percent', '50.0.0']) {
      const run = fractionChecker(malformed, challenge);
      run.checker();
      expect(run.patches, malformed).toEqual([]);
      expect(run.awardXP, malformed).not.toHaveBeenCalled();
    }

    // A decimal spelling with only zero fractional digits is still the whole number 50.
    const run = fractionChecker('50.0', challenge);
    run.checker();
    run.checker();
    expect(run.awardXP).toHaveBeenCalledTimes(1);
    expect(run.patches).toHaveLength(1);
    expect(run.patches[0]).toMatchObject({
      challenge: { answered: true },
      feedback: { correct: true },
      score: { correct: 1, total: 1 },
    });

    const rerender = fractionChecker('50', run.patches[0].challenge);
    rerender.checker();
    expect(rerender.awardXP).not.toHaveBeenCalled();
    expect(rerender.patches).toEqual([]);
  });
});

describe('solved challenge controls', () => {
  it('disables Number Line and Fractions answer controls after success', () => {
    loadTool(NUMBERLINE_FILE, 'numberline');
    let html = renderTool('numberline', {
      _numberline: {
        tab: 'challenges', answer: '7',
        challenge: { type: 'identify', answer: 7, question: 'Which number?', solved: true },
        feedback: { correct: true, msg: 'Correct!' },
      },
    });
    document.body.innerHTML = html;
    expect(document.querySelector('input[aria-label="Challenge answer"]').disabled).toBe(true);
    expect(document.querySelector('button[aria-label="Check Answer"]').disabled).toBe(true);

    resetStemLab();
    loadTool(FRACTIONS_FILE, 'fractions');
    html = renderTool('fractions', {
      _fractions: {
        tab: 'practice', answer: '50',
        challenge: { type: 'percentage', answer: 50, question: 'Convert to a percent.', answered: true },
        feedback: { correct: true, msg: 'Correct!' },
      },
    });
    document.body.innerHTML = html;
    expect(document.querySelector('input[aria-label="Your answer"]').disabled).toBe(true);
    expect(document.querySelector('button[aria-label="Check"]').disabled).toBe(true);
  });
});
