import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_quiz_source.jsx', 'utf8');
const start = source.indexOf('function _quizQuestionAnswered(');
const end = source.indexOf('function _quizAttemptStorageKey(', start);
if (start < 0 || end < 0) throw new Error('Assess progress helpers not found');
const { answered, progress, hasResponse } = new Function(source.slice(start, end) + '\nreturn { answered: _quizQuestionAnswered, progress: _quizBuildAttemptProgress, hasResponse: _quizQuestionHasResponse };')();
const answerStart = source.indexOf('function _quizAttemptAnswer(');
const answerEnd = source.indexOf('function AssessmentAttemptFeedback(', answerStart);
if (answerStart < 0 || answerEnd < 0) throw new Error('Assess attempt response helpers not found');
const { attemptAnswer, snapshot } = new Function('_quizQuestionAnswered', '_quizQuestionHasResponse', '_quizGradedCopy', source.slice(answerStart, answerEnd) + '\nreturn { attemptAnswer: _quizAttemptAnswer, snapshot: _quizResponseSnapshot };')(answered, hasResponse, (key, fallback) => fallback);
const gradingWindow = { AlloModules: {} };
new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(gradingWindow);
const aggregators = gradingWindow.AlloModules.QuizLiveAggregators;

const mcq = { type: 'mcq', question: 'Pick one.', options: ['Water', 'Light', 'Soil'] };
const multi = { type: 'multi-select', question: 'Pick any that apply.', options: ['Water', 'Light', 'Soil'] };
const evidence = { type: 'answer-evidence', question: 'Choose and support.', answerOptions: ['A', 'B'], evidenceOptions: ['Reason A', 'Reason B'] };
const sequence = { type: 'sequence-sense', question: 'Check these stages.', items: ['Seed', 'Seedling', 'Plant'], presentedOrder: [1, 0, 2], principleOptions: ['chronological', 'size'], orderingPrinciple: 'chronological' };
const relation = { type: 'relation-mismatch', question: 'Repair a pair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Water' }, { left: 'Stem', right: 'Support' }], candidatePartners: ['Water', 'Light'] };
const draft = item => ({ items: { 'q-0': item } });

describe('Assess answered state uses real choices rather than truthy cached data', () => {
  it.each([-1, 3, 0.5, NaN, Infinity, '0', null, undefined])('rejects an unavailable MCQ choice %s', choice => {
    expect(answered(mcq, 0, { items: { root: { mcqAnswers: { 0: choice } } } })).toBe(false);
  });

  it('accepts the first and last available choices and legacy questions without a type', () => {
    expect(answered(mcq, 0, { items: { root: { mcqAnswers: { 0: 0 } } } })).toBe(true);
    expect(answered({ ...mcq, type: undefined }, 0, { items: { root: { mcqAnswers: { 0: 2 } } } })).toBe(true);
    expect(answered(mcq, 0, { items: { root: { mcqAnswers: Object.create({ 0: 0 }) } } })).toBe(false);
  });

  it.each([[], [-1], [3], [0, 3], [0, 0], [NaN], ['0']])('rejects invalid multi-select choices %j', selected => {
    expect(answered(multi, 0, draft({ selected }))).toBe(false);
  });

  it('counts a valid but potentially incomplete/correctness-unknown multi-select response as attempted', () => {
    expect(answered(multi, 0, draft({ selected: [0] }))).toBe(true);
    expect(answered(multi, 0, draft({ selected: [2, 0] }))).toBe(true);
  });

  it('requires an available choice in both answer/evidence parts', () => {
    expect(answered(evidence, 0, draft({ answerIdx: 0, evidenceIdx: 1 }))).toBe(true);
    for (const invalid of [-1, 2, NaN, 0.5, null, '0']) {
      expect(answered(evidence, 0, draft({ answerIdx: invalid, evidenceIdx: 0 }))).toBe(false);
      expect(answered(evidence, 0, draft({ answerIdx: 0, evidenceIdx: invalid }))).toBe(false);
    }
    expect(answered({ ...evidence, answerOptions: undefined, options: ['A', 'B'] }, 0, draft({ answerIdx: 1, evidenceIdx: 0 }))).toBe(true);
  });

  it.each(['numeric-response', 'fill-blank', 'short-answer', 'self-explanation'])('counts only actual text for %s without grading its correctness', type => {
    expect(answered({ type }, 0, draft({ response: '0' }))).toBe(true);
    expect(answered({ type }, 0, draft({ response: 'A possibly incorrect answer' }))).toBe(true);
    for (const value of ['', '  \n ', {}, [], false, 0, null]) expect(answered({ type }, 0, draft({ response: value }))).toBe(false);
  });
});

describe('Assess compound-item completion includes every required part', () => {
  it('requires a misplaced item after choosing No, without requiring the correct item', () => {
    const partial = { verifyAnswer: 'no', principleAnswer: 'chronological' };
    expect(answered(sequence, 0, draft(partial))).toBe(false);
    expect(answered(sequence, 0, draft({ ...partial, clickedIdx: 0 }))).toBe(true);
    expect(answered(sequence, 0, draft({ ...partial, clickedIdx: 2 }))).toBe(true);
    for (const clickedIdx of [-1, 3, NaN, '0']) expect(answered(sequence, 0, draft({ ...partial, clickedIdx }))).toBe(false);
  });

  it('accepts Yes with an unchanged order and supports both immediate and deferred draft schemas', () => {
    const immediate = { verifyAnswer: 'yes', principleAnswer: 'size', orderAnswer: null, presentedOrder: [1, 0, 2], step: 'done', grade: { status: 'incorrect', score: 0 } };
    const deferred = { verifyAnswer: 'yes', principleAnswer: 'size', orderAnswer: [1, 0, 2] };
    expect(answered(sequence, 0, draft(immediate))).toBe(true);
    expect(answered(sequence, 0, draft(deferred))).toBe(true);
    expect(answered({ ...sequence, principleOptions: undefined }, 0, draft({ verifyAnswer: 'yes', principleAnswer: 'chronological' }))).toBe(true);
  });

  it('rejects missing steps, nonexistent principles, and damaged saved arrangements even with a cached grade', () => {
    expect(answered(sequence, 0, draft({ verifyAnswer: '', principleAnswer: 'size' }))).toBe(false);
    expect(answered(sequence, 0, draft({ verifyAnswer: 'yes', principleAnswer: 'no longer offered' }))).toBe(false);
    for (const orderAnswer of [[], [0, 0, 2], [0, 1], [0, 1, 3], ['0', 1, 2]]) {
      expect(answered(sequence, 0, draft({ verifyAnswer: 'yes', principleAnswer: 'size', orderAnswer, grade: { status: 'correct' } }))).toBe(false);
    }
    for (const grade of [{}, true, 'done', { status: 'error' }, { status: 'correct' }, { status: 'partially-correct' }]) {
      expect(answered(sequence, 0, draft({ grade }))).toBe(false);
      expect(answered(relation, 0, draft({ grade }))).toBe(false);
    }
  });

  it('preserves deliberately skipped sequence and relation items', () => {
    expect(answered(sequence, 0, draft({ step: 'done', grade: { status: 'idk', score: 0 } }))).toBe(true);
    expect(answered(relation, 0, draft({ step: 'done', grade: { status: 'idk', score: 0 } }))).toBe(true);
  });

  it.each([sequence, relation])('preserves an explicit $type skip in the submitted response and teacher grading', question => {
    const responses = { 'q-0': {
      step: 'done', grade: { status: 'idk', score: 0 },
      // A learner can skip after partially responding; stale choices must not
      // turn that deliberate skip into an incorrect scored attempt.
      verifyAnswer: 'no', clickedIdx: 0, clickedPairIdx: 0,
    } };
    const answer = attemptAnswer(question, 0, responses);
    expect(answer).toEqual({ idk: true });
    const recorded = snapshot({ questions: [question] }, responses, { status: 'submitted' });
    expect(recorded).toMatchObject({ answered: 1, total: 1, status: 'submitted', items: [{ answered: true, answer: { idk: true } }] });
    expect(recorded.items[0].response.toLowerCase()).toContain('know');
    const response = { itemType: question.type, answer };
    expect(aggregators.gradePresentationResponse(response, question).status).toBe('idk');
    const row = aggregators.aggregateGradebook({ allResponses: { learner: { 0: response } } }, { data: { questions: [question] } }, { learner: {} }).studentRows[0];
    expect(row).toMatchObject({ totalIdk: 1, totalEvaluated: 1, totalPossible: 0, totalEarned: 0, scorePercent: null });
  });

  it('keeps unchanged immediate and rearranged deferred sequence responses intact through submission', () => {
    for (const [orderAnswer, expectedOrder, status] of [[null, [1, 0, 2], 'partially-correct'], [[0, 1, 2], [0, 1, 2], 'correct']]) {
      const responses = { 'q-0': { verifyAnswer: 'no', clickedIdx: 0, orderAnswer, principleAnswer: 'chronological', grade: { status } } };
      const answer = attemptAnswer(sequence, 0, responses);
      expect(answer).toEqual({ verifyAnswer: 'no', clickedIdx: 0, orderAnswer: expectedOrder, principleAnswer: 'chronological' });
      expect(snapshot({ questions: [sequence] }, responses, {}).items[0]).toMatchObject({ answered: true, answer });
      expect(aggregators.gradePresentationResponse({ itemType: sequence.type, answer }, sequence).status).toBe(status);
    }
  });

  it('requires a real pair plus an available replacement, or text when the item uses free entry', () => {
    expect(answered(relation, 0, draft({ clickedPairIdx: 0, partnerAnswer: 'Light' }))).toBe(true);
    expect(answered(relation, 0, draft({ clickedPairIdx: 3, partnerAnswer: 'Light' }))).toBe(false);
    expect(answered(relation, 0, draft({ clickedPairIdx: 0, partnerAnswer: 'Missing option' }))).toBe(false);
    expect(answered(relation, 0, draft({ clickedPairIdx: 0, partnerAnswer: {} }))).toBe(false);
    expect(answered({ ...relation, candidatePartners: [] }, 0, draft({ clickedPairIdx: 1, partnerAnswer: 'An entered replacement' }))).toBe(true);
  });
});

describe('Assess review counts preserve real answers and reflections', () => {
  it('reports all nine supported response formats in authored order', () => {
    const questions = [mcq, multi, evidence, sequence, relation, ...['numeric-response', 'fill-blank', 'short-answer', 'self-explanation'].map(type => ({ type, question: type }))];
    const data = { questions, reflections: ['One', 'Two', 'Three', 'Four'] };
    const saved = { items: {
      root: { mcqAnswers: { 0: 0 }, flaggedQuestions: { 1: true, 2: 'false', 8: true }, reflectionAnswers: {
        0: { draft: 'Draft reflection' }, 1: { submitted: true, submittedText: 'Saved reflection', draft: '' },
        2: { submitted: true, draft: '' }, 3: { submitted: false, submittedText: 'Old text', draft: '' },
      } },
      'q-1': { selected: [0] }, 'q-2': { answerIdx: 1, evidenceIdx: 0 },
      'q-3': { verifyAnswer: 'no', clickedIdx: 0, principleAnswer: 'size', orderAnswer: [2, 1, 0] },
      'q-4': { clickedPairIdx: 0, partnerAnswer: 'Water' },
      'q-5': { response: '0' }, 'q-6': { response: 'water' }, 'q-7': { response: 'Short answer.' }, 'q-8': { response: 'My reasoning.' },
    } };
    expect(progress(data, saved)).toMatchObject({ total: 9, answered: 9, unanswered: 0, flagged: 2, reflectionTotal: 4, reflectionAnswered: 2 });
    expect(progress(data, saved).items.map(item => item.questionIdx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    delete saved.items['q-3'].clickedIdx;
    saved.items['q-2'].evidenceIdx = -1;
    expect(progress(data, saved)).toMatchObject({ answered: 7, unanswered: 2 });
  });

  it('does not count unsupported/missing questions or malformed reflection values as complete', () => {
    const result = progress({ questions: [null, { type: 'unsupported', question: { bad: true } }], reflection: 'Reflect.' }, { items: {
      root: { reflectionAnswers: { 0: { submitted: true, draft: {}, submittedText: {} } } },
      'q-1': { response: 'There is no matching response control.' },
    } });
    expect(result).toMatchObject({ total: 2, answered: 0, unanswered: 2, reflectionTotal: 1, reflectionAnswered: 0 });
    expect(result.items.map(item => item.label)).toEqual(['Question 1', 'Question 2']);
  });
});
