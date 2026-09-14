// Sequence Sense grading: the misplaced position is derived from the displayed
// order, not from the single index the generator happened to write. An
// adjacent swap leaves BOTH items out of place, so pointing at either one must
// count, and every grader (live aggregators, solo engine, the quiz card) must
// agree. Also pins the new "arrange the correct order" step.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const solo = require('../concept_quest_solo_engine.js');
let aggregators;

beforeAll(() => {
  loadAlloModule('quiz_live_aggregators.js');
  aggregators = window.AlloModules.QuizLiveAggregators;
});

const items = ['Evaporation', 'Condensation', 'Precipitation', 'Collection'];
const question = (presentedOrder, intentionallyWrongIndex) => ({
  type: 'sequence-sense', question: 'Check the water cycle order.', items, presentedOrder, intentionallyWrongIndex,
  orderingPrinciple: 'process', principleOptions: ['process', 'size'],
});
const truth = (order, authored) => aggregators.sequenceSenseTruth(order, authored, items.length);

describe('sequenceSenseTruth derives the misplaced set from the displayed order', () => {
  it('accepts both halves of an adjacent swap whichever index the author wrote', () => {
    expect(truth([0, 2, 1, 3], 1)).toEqual({ orderIsCorrect: false, misplaced: [1, 2] });
    expect(truth([0, 2, 1, 3], 2)).toEqual({ orderIsCorrect: false, misplaced: [1, 2] });
    expect(truth([1, 0, 2, 3], 0)).toEqual({ orderIsCorrect: false, misplaced: [0, 1] });
  });
  it('accepts only the moved item when one item jumped more than one place', () => {
    expect(truth([0, 2, 3, 1], 3)).toEqual({ orderIsCorrect: false, misplaced: [3] });
    expect(truth([3, 0, 1, 2], 0)).toEqual({ orderIsCorrect: false, misplaced: [0] });
    // The author's index is irrelevant: the display decides.
    expect(truth([0, 2, 3, 1], 1)).toEqual({ orderIsCorrect: false, misplaced: [3] });
  });
  it('treats the canonical or a missing order as correct regardless of the authored index', () => {
    expect(truth([0, 1, 2, 3], 2)).toEqual({ orderIsCorrect: true, misplaced: [] });
    expect(truth(undefined, 2)).toEqual({ orderIsCorrect: true, misplaced: [] });
    expect(truth([0, 0, 1, 2], 2)).toEqual({ orderIsCorrect: true, misplaced: [] });
  });
  it('falls back to the authored index, then to every position, for a scramble no single move explains', () => {
    expect(truth([1, 0, 3, 2], 2)).toEqual({ orderIsCorrect: false, misplaced: [2] });
    expect(truth([1, 0, 3, 2], null)).toEqual({ orderIsCorrect: false, misplaced: [0, 1, 2, 3] });
  });
  it('describes the mistake in words a student can check against the list', () => {
    expect(aggregators.describeSequenceMisplaced([1, 2])).toBe('items 2 and 3 were swapped');
    expect(aggregators.describeSequenceMisplaced([3])).toBe('item 4 was misplaced');
    expect(aggregators.describeSequenceMisplaced([0, 2, 3])).toBe('items 1, 3 and 4 were out of place');
    expect(aggregators.describeSequenceMisplaced([])).toBe('the order was correct');
  });
});

describe('live aggregators grade Sequence Sense against the derived set', () => {
  const swapped = question([0, 2, 1, 3], 1);
  const grade = (answer) => aggregators.gradePresentationResponse({ itemType: 'sequence-sense', answer }, swapped);

  it('scores either swapped position as a correct diagnosis', () => {
    expect(grade({ verifyAnswer: 'no', clickedIdx: 1, principleAnswer: 'process' })).toMatchObject({ status: 'correct', score: 3 });
    expect(grade({ verifyAnswer: 'no', clickedIdx: 2, principleAnswer: 'process' })).toMatchObject({ status: 'correct', score: 3 });
    expect(grade({ verifyAnswer: 'no', clickedIdx: 0, principleAnswer: 'process' })).toMatchObject({ status: 'partially-correct', score: 2 });
  });
  it('keeps legacy three-step payloads out of four and scores the arrange step when it was sent', () => {
    const legacy = grade({ verifyAnswer: 'no', clickedIdx: 2, principleAnswer: 'process' });
    expect(legacy.scoreFraction).toBe(1);
    const arranged = grade({ verifyAnswer: 'no', clickedIdx: 2, orderAnswer: [0, 1, 2, 3], principleAnswer: 'process' });
    expect(arranged).toMatchObject({ status: 'correct', score: 4, arrangeCorrect: true, scoreFraction: 1 });
    const leftAsShown = grade({ verifyAnswer: 'no', clickedIdx: 2, orderAnswer: [0, 2, 1, 3], principleAnswer: 'process' });
    expect(leftAsShown).toMatchObject({ status: 'partially-correct', score: 3, arrangeCorrect: false, scoreFraction: 0.75 });
  });
  it('does not let a forged status outrank the derived key', () => {
    expect(grade({ verifyAnswer: 'yes', clickedIdx: 1, principleAnswer: 'size', status: 'correct', score: 4 })).toMatchObject({ status: 'incorrect', score: 0 });
  });
  it('grades a correct display as correct only when the student says so, and gives the arrange point for leaving it', () => {
    const canonical = question([0, 1, 2, 3], 1); // authored index is stale: the display is already right
    const gradeCanonical = (answer) => aggregators.gradePresentationResponse({ itemType: 'sequence-sense', answer }, canonical);
    expect(gradeCanonical({ verifyAnswer: 'yes', orderAnswer: [0, 1, 2, 3], principleAnswer: 'process' })).toMatchObject({ status: 'correct', score: 4 });
    expect(gradeCanonical({ verifyAnswer: 'no', clickedIdx: 1, orderAnswer: [0, 1, 2, 3], principleAnswer: 'process' })).toMatchObject({ status: 'partially-correct', score: 2 });
  });
  it('tells the teacher which positions count and the correct order', () => {
    expect(aggregators.describePresentationCorrectAnswer(swapped)).toBe('Items 2 and 3 were swapped · Correct order: Evaporation → Condensation → Precipitation → Collection · Principle: process');
    expect(aggregators.describePresentationCorrectAnswer(question([0, 1, 2, 3], null))).toBe('Sequence is valid · Principle: process');
  });
});

describe('solo engine grades Sequence Sense the same way', () => {
  const normalize = (authored) => solo.normalizeItems({ id: 'source', data: { questions: [authored] } })[0];
  const swapped = normalize(question([0, 2, 1, 3], 1));

  it('accepts either swapped position and requires the arranged order for full marks', () => {
    for (const wrongIndex of [1, 2]) {
      expect(solo.grade(swapped, { verifyAnswer: 'no', wrongIndex, order: [0, 1, 2, 3], principleAnswer: 'process' })).toMatchObject({ correct: true, status: 'correct', score: 4, maxScore: 4 });
    }
    expect(solo.grade(swapped, { verifyAnswer: 'no', wrongIndex: 0, order: [0, 1, 2, 3], principleAnswer: 'process' })).toMatchObject({ correct: false, status: 'partially-correct', score: 3 });
    // order: null means "left as displayed", which is wrong here.
    expect(solo.grade(swapped, { verifyAnswer: 'no', wrongIndex: 2, order: null, principleAnswer: 'process' })).toMatchObject({ status: 'partially-correct', score: 3, arrangeCorrect: false });
  });
  it('starts with no arrangement and explains the swap in the answer guide', () => {
    expect(solo.initialResponse(swapped)).toEqual({ verifyAnswer: '', wrongIndex: null, order: null, principleAnswer: '' });
    expect(solo.answerGuide(swapped)).toContain('Displayed items 2 and 3 were swapped.');
    expect(solo.answerGuide(normalize(question([0, 1, 2, 3], null)))).toContain('The displayed order is correct.');
  });
});
