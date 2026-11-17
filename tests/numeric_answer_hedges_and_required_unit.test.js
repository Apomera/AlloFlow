// Number answers: a hedge is not a unit, and a required unit cannot be left blank for full credit.
//
// WHY (2026-11-16): two scoring gaps from a review of the Submission Inbox, and
// the first also applies to live quizzes, which use their own copy of the
// number parser (quiz_live_aggregators.js).
//   1. Text after the number was taken as its unit, so "3 or 4", "3 to 5" and
//      "3x" all scored 100 against a key of 3.
//   2. With a required unit (m/s) and the unit left blank, the number scored 100
//      and the unit was not graded, so leaving it out cost nothing. The pack's
//      own self-check marks that answer wrong, and the live grader gives half.
// An answer the parser cannot read as one number is left for the teacher; it
// is never scored 0 by the machine.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let meta, live;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('quiz_live_aggregators.js');
  loadAlloModule('view_submission_inbox_module.js');
  meta = window.AlloModules.SubmissionInbox._meta;
  live = window.AlloModules.QuizLiveAggregators || window.QuizLiveAggregators;
}, 60000);

const HOW_MANY = { type: 'numeric-response', question: 'How many?', correctValue: 3, tolerance: 0 };
const SPEED = { type: 'numeric-response', question: 'Speed?', correctValue: 5, tolerance: 0, unit: 'm/s', requireUnit: true };
const inbox = (q, number, unit) => {
  const responses = { 'allo-response:quiz:q0:number': number };
  if (unit !== undefined) responses['allo-response:quiz:q0:unit'] = unit;
  return meta.exportedQuizAutoGrades({ responses, content: [] }, [{ id: 'quiz', type: 'quiz', data: { questions: [q] } }]);
};
const inboxNumber = (q, number, unit) => inbox(q, number, unit)['allo-response:quiz:q0:number'];
const liveScore = (q, answer) => live.gradePresentationResponse({ answer }, q);

const HEDGES = ['3 or 4', '3 to 5', '3 and 4', '3x', '3 or more', '3 through 5'];
const PLAIN = [['3', 100], ['3 apples', 100], ['3.0', 100], ['6/2', 100], ['2 2/2', 100], ['3,0', 100], ['4', 0], ['-3', 0]];

describe('a hedged answer is not taken as a number with a unit', () => {
  it.each(HEDGES)('inbox: "%s" is left for the teacher', (answer) => {
    expect(inboxNumber(HOW_MANY, answer)).toBeUndefined();
  });

  it.each(HEDGES)('live quiz: "%s" is not marked correct', (answer) => {
    const result = liveScore(HOW_MANY, answer);
    expect(result.status).not.toBe('correct');
    expect(result.score || 0).toBe(0);
  });

  it.each(PLAIN)('inbox: "%s" still scores %i', (answer, score) => {
    expect(inboxNumber(HOW_MANY, answer).score).toBe(score);
  });

  it.each(PLAIN)('live quiz: "%s" still scores %i', (answer, score) => {
    expect(liveScore(HOW_MANY, answer).score).toBe(score);
  });

  it('a real unit written after the number still counts as the unit', () => {
    expect(inboxNumber(SPEED, '5 m/s')).toMatchObject({ score: 100 });
    expect(inboxNumber(SPEED, '5m/s')).toMatchObject({ score: 100 });
    expect(inboxNumber(SPEED, '5 mph')).toMatchObject({ score: 50 });
  });
});

describe('a required unit left blank', () => {
  it('costs the unit half of the credit, as a wrong unit does and as the live grader does', () => {
    expect(inboxNumber(SPEED, '5', '')).toMatchObject({ score: 50, status: 'partially-correct' });
    expect(inboxNumber(SPEED, '5')).toMatchObject({ score: 50, status: 'partially-correct' });
    expect(inboxNumber(SPEED, '5').feedback).toMatch(/unit .*missing|missing .*unit/i);
    expect(liveScore(SPEED, '5').score).toBe(50);
  });

  it('a unit that is given still decides it', () => {
    expect(inboxNumber(SPEED, '5', 'm/s')).toMatchObject({ score: 100 });
    expect(inboxNumber(SPEED, '5', 'M/S')).toMatchObject({ score: 100 });
    expect(inboxNumber(SPEED, '5', 'mph')).toMatchObject({ score: 50 });
    expect(inboxNumber(SPEED, '7', '')).toMatchObject({ score: 0 });
  });

  it('a unit that is not required can still be left out', () => {
    const optional = { ...SPEED, requireUnit: false };
    expect(inboxNumber(optional, '5')).toMatchObject({ score: 100 });
  });
});
