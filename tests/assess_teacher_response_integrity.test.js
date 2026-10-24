import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let aggs;
beforeAll(() => {
  const scope = { AlloModules: {} };
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(scope);
  aggs = scope.AlloModules.QuizLiveAggregators;
});

const question = { type: 'mcq', question: 'Choose the even number.', options: ['2', '3'], correctAnswer: '2' };
function packet(q, answer, extra = {}) {
  return { itemType: q.type, answer, questionSignature: aggs.assessmentItemSignature(q), assessmentActivityId: 'activity', assessmentAttemptId: 'attempt-1', assessmentAttemptStartedAt: 100, timestamp: 120, submitted: true, ...extra };
}
function grade(q, response, override) {
  return aggs.aggregateGradebook({ allResponses: { learner: { 0: response } } }, { data: { questions: [q] } }, {}, null, override ? { learner: { 0: override } } : {}).studentRows[0];
}
function override(q, response, status = 'correct') {
  return { status, ts: 130, responseFingerprint: aggs.assessmentResponseFingerprint(q, response) };
}

describe('teacher overrides belong to the reviewed response', () => {
  it('applies a bound judgment while ignoring timestamp and confidence updates', () => {
    const response = packet(question, { optionIdx: 1 });
    const judged = override(question, response);
    const current = { ...response, timestamp: 900, confidence: 'guessed', answer: { optionIdx: 1, optionText: '3', status: 'incorrect', score: 0 } };
    expect(grade(question, current, judged)).toMatchObject({ totalEarned: 1, scorePercent: 100, byQuestion: [{ status: 'correct', isCorrect: true, teacherOverridden: true }] });
  });

  it('expires a judgment when the learner revises the answer in the same attempt', () => {
    const old = packet(question, { optionIdx: 0 });
    const current = packet(question, { optionIdx: 1 }, { timestamp: 200 });
    expect(grade(question, current, override(question, old))).toMatchObject({ totalEarned: 0, byQuestion: [{ status: 'incorrect', teacherOverrideExpired: true }] });
  });

  it.each([
    { assessmentAttemptId: 'attempt-2' },
    { assessmentAttemptStartedAt: 200 },
    { assessmentActivityId: 'another-activity' },
  ])('expires a judgment when the attempt context changes: %j', change => {
    const response = packet(question, { optionIdx: 1 });
    expect(grade(question, { ...response, ...change }, override(question, response)).byQuestion[0]).toMatchObject({ status: 'incorrect', teacherOverrideExpired: true });
  });

  it('expires a judgment when the key changes even though the public stimulus is unchanged', () => {
    const response = packet(question, { optionIdx: 0 });
    const changed = { ...question, correctAnswer: '3' };
    expect(aggs.assessmentItemSignature(changed)).toBe(aggs.assessmentItemSignature(question));
    expect(grade(changed, response, override(question, response)).byQuestion[0]).toMatchObject({ status: 'incorrect', teacherOverrideExpired: true });
  });

  it('expires a written judgment when its teacher rubric changes', () => {
    const q = { type: 'self-explanation', question: 'Explain.', rubric: 'Describe evidence.' };
    const response = packet(q, { text: 'My explanation.' });
    expect(grade({ ...q, rubric: 'Describe evidence and limitations.' }, response, override(q, response))).toMatchObject({ totalPossible: 0, byQuestion: [{ status: 'submitted', teacherOverrideExpired: true }] });
  });

  it('does not silently apply a legacy judgment with no reviewed-response record', () => {
    expect(grade(question, packet(question, { optionIdx: 1 }), { status: 'correct', ts: 130 }).byQuestion[0]).toMatchObject({ status: 'incorrect', teacherOverrideExpired: true });
  });

  it('treats equivalent immediate and final multi-select schemas as the same answer', () => {
    const q = { type: 'multi-select', question: 'Choose letters.', options: ['Alpha', 'Beta'], correctAnswers: ['Alpha'] };
    const immediate = packet(q, { selectedIndices: [0], selectedTexts: ['Alpha'], status: 'correct', score: 100 });
    const final = packet(q, { selectedIndices: [0], selectedOptions: ['Alpha'] });
    expect(aggs.assessmentResponseFingerprint(q, final)).toBe(aggs.assessmentResponseFingerprint(q, immediate));
    expect(grade(q, final, override(q, immediate)).byQuestion[0].teacherOverridden).toBe(true);
  });

  it('records the actual response fingerprint in the dashboard producer', () => {
    const source = readFileSync('view_quiz_source.jsx', 'utf8');
    const start = source.indexOf('    function setTeacherOverride(uid, qIdx, newStatus)');
    const end = source.indexOf('    var aggResult;', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    const response = packet(question, { optionIdx: 1 });
    const updateDoc = vi.fn();
    const fb = { db: {}, doc: vi.fn(() => 'session-ref'), updateDoc, deleteField: vi.fn() };
    const save = new Function('window', 'appId', 'p', 'aggsMod', 'quizState', 'generatedContent', source.slice(start, end) + ';return setTeacherOverride;')(
      { __alloFirebase: fb }, 'app', { activeSessionCode: 'session' }, aggs,
      { allResponses: { learner: { 0: response } } }, { data: { questions: [question] } }
    );
    save('learner', 0, 'correct');
    expect(updateDoc).toHaveBeenCalledWith('session-ref', { 'quizState.teacherOverrides.learner.0': expect.objectContaining({ status: 'correct', responseFingerprint: aggs.assessmentResponseFingerprint(question, response) }) });
  });
});

describe('teacher summaries preserve the submitted choices', () => {
  it('shows original MCQ text after choices are reordered, in gradebook and heatmap', () => {
    const changed = { ...question, options: ['3', '2'] };
    const response = packet(question, { optionIdx: 0, optionText: '2' });
    const content = { data: { questions: [changed] } };
    const state = { allResponses: { learner: { 0: response } } };
    expect(aggs.aggregateGradebook(state, content, {}).studentRows[0].byQuestion[0]).toMatchObject({ versionMismatch: true, answerSummary: 'A. 2', maxPoints: 0 });
    expect(aggs.aggregateLiveHeatmap(state, content, {}).bars[0].byStudent[0].answerSummary).toBe('A. 2');
  });

  it('does not invent original text when an incompatible packet contains only an index', () => {
    const changed = { ...question, options: ['3', '2'] };
    expect(grade(changed, packet(question, { optionIdx: 0 })).byQuestion[0].answerSummary).toBe('Choice A (original text unavailable)');
  });

  it('retains final multi-select text in gradebook and heatmap', () => {
    const q = { type: 'multi-select', question: 'Choose letters.', options: ['Alpha', 'Beta', 'Gamma'], correctAnswers: ['Alpha', 'Beta'] };
    const response = packet(q, { selectedIndices: [0, 1], selectedOptions: ['Alpha', 'Beta'] });
    const content = { data: { questions: [q] } };
    const state = { allResponses: { learner: { 0: response, 1: { itemType: 'assessment-complete', answer: {} } } } };
    expect(aggs.aggregateGradebook(state, content, {}).studentRows[0].byQuestion[0]).toMatchObject({ status: 'correct', answerSummary: 'Alpha; Beta' });
    expect(aggs.aggregateLiveHeatmap(state, content, {}).bars[0].byStudent[0].answerSummary).toBe('Alpha; Beta');
  });

  it('keeps saved multi-select labels when the authored options change', () => {
    const q = { type: 'multi-select', question: 'Choose letters.', options: ['Alpha', 'Beta'], correctAnswers: ['Alpha'] };
    const response = packet(q, { selectedIndices: [0], selectedOptions: ['Alpha'] });
    expect(grade({ ...q, options: ['Beta', 'Alpha'] }, response).byQuestion[0]).toMatchObject({ versionMismatch: true, answerSummary: 'Alpha' });
  });
});

describe('current-choice distributions exclude incompatible question versions', () => {
  it.each(['fill-blank', 'short-answer', 'self-explanation'])('filters old-prompt %s text and uses the compatible response denominator', type => {
    const old = { type, question: 'Old prompt.', expectedFill: 'water' };
    const current = { ...old, question: 'Current prompt.' };
    const result = aggs.aggregatePresentationResponses(current, {
      oldDifferent: packet(old, { text: 'Old-only answer' }),
      oldSame: packet(old, { text: 'water' }),
      current: packet(current, { text: 'water' }),
    });
    expect(result).toMatchObject({ respondentCount: 3, distributionRespondentCount: 1, versionReviewCount: 2 });
    expect(result.rows).toEqual([expect.objectContaining({ text: 'water', value: 1, percent: 100, isCorrect: type === 'fill-blank' })]);
  });

  it('filters old-prompt numeric buckets and obtains correctness from a compatible response', () => {
    const old = { type: 'numeric-response', question: 'Old measurement.', correctValue: 10, unit: 'cm' };
    const current = { ...old, question: 'Current measurement.' };
    const result = aggs.aggregatePresentationResponses(current, {
      oldDifferent: packet(old, { numericValue: 99, unit: 'cm' }),
      oldSame: packet(old, { numericValue: 10, unit: 'cm' }),
      current: packet(current, { numericValue: 10, unit: 'cm' }),
    });
    expect(result).toMatchObject({ respondentCount: 3, distributionRespondentCount: 1, versionReviewCount: 2 });
    expect(result.rows).toEqual([expect.objectContaining({ text: '10 cm', value: 1, percent: 100, isCorrect: true })]);
  });

  it('keeps version-review outcomes visible while excluding incompatible response distributions', () => {
    const old = { type: 'relation-mismatch', question: 'Original pairs.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water' };
    const current = { ...old, question: 'Revised pairs.' };
    const answer = { clickedPairIdx: 0, partnerAnswer: 'Water' };
    const result = aggs.aggregatePresentationResponses(current, { old: packet(old, answer), current: packet(current, answer) });
    expect(result).toMatchObject({ kind: 'outcomes', respondentCount: 2, distributionRespondentCount: 1, versionReviewCount: 1 });
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: 'Correct', value: 1, percent: 50 }),
      expect.objectContaining({ text: 'Submitted — teacher review', value: 1, percent: 50 }),
    ]));
  });

  it.each(['mcq', 'opinion-mcq', 'likert', 'multi-select'])('filters %s presentation counts without hiding participation', type => {
    const original = { ...question, type, correctAnswers: ['2'] };
    const current = { ...original, options: ['3', '2'] };
    const oldAnswer = type === 'multi-select' ? { selectedIndices: [0], selectedOptions: ['2'] } : { optionIdx: 0, optionText: '2' };
    const currentAnswer = type === 'multi-select' ? { selectedIndices: [1], selectedOptions: ['2'] } : { optionIdx: 1, optionText: '2' };
    const result = aggs.aggregatePresentationResponses(current, { old: packet(original, oldAnswer), current: packet(current, currentAnswer) });
    expect(result).toMatchObject({ respondentCount: 2, distributionRespondentCount: 1, versionReviewCount: 1 });
    expect(result.rows.map(({ value, percent }) => [value, percent])).toEqual([[0, 0], [1, 100]]);
    expect(result.note).toContain('excluded');
  });

  it('does not turn old versions into current distractor selections or a sufficient sample', () => {
    const current = { ...question, options: ['3', '2'] };
    const allResponses = Object.fromEntries(Array.from({ length: 10 }, (_, index) => ['old-' + index, { 0: packet(question, { optionIdx: 0, optionText: '2' }) }]));
    allResponses.current = { 0: packet(current, { optionIdx: 1, optionText: '2' }) };
    const result = aggs.aggregateItemAnalysis({ allResponses }, { data: { questions: [current] } }, {}).items[0];
    expect(result).toMatchObject({ respondents: 11, distributionRespondents: 1, versionReviewCount: 10, smallSample: true });
    expect(result.options.map(({ count }) => count)).toEqual([0, 1]);
    expect(result.signalCodes).toEqual([]);
  });
});

describe('attempt metadata is authoritative for completion summaries', () => {
  const started = { attemptId: 'attempt-2', startedAt: 200, status: 'in-progress' };
  it('shows a started attempt without item responses or a roster entry', () => {
    const row = aggs.aggregateGradebook({ allResponses: { learner: { __assessmentAttempt: started } } }, { data: { questions: [question] } }, {}).studentRows[0];
    expect(row).toMatchObject({ attemptStatus: 'in-progress', totalAnswered: 0, totalPossible: 0 });
  });

  it('ignores another attempt completion and its reflection map', () => {
    const completion = { itemType: 'assessment-complete', assessmentAttemptId: 'attempt-1', assessmentAttemptStartedAt: 100, answer: { reflections: { 0: { draft: 'Old reflection' } } } };
    const state = { allResponses: { learner: { __assessmentAttempt: started, 1: completion } } };
    const content = { data: { questions: [question], reflections: ['Reflect.'] } };
    expect(aggs.aggregateGradebook(state, content, {}).studentRows[0]).toMatchObject({ attemptStatus: 'in-progress', totalPossible: 0 });
    expect(aggs.aggregateReflections(state, content, {})).toBeNull();
  });

  it('recognizes the matching completion and preserves final blank scoring', () => {
    const completion = { itemType: 'assessment-complete', assessmentAttemptId: 'attempt-2', assessmentAttemptStartedAt: 200, answer: {} };
    const state = { allResponses: { learner: { __assessmentAttempt: { ...started, status: 'submitted' }, 1: completion } } };
    expect(aggs.aggregateGradebook(state, { data: { questions: [question] } }, {}).studentRows[0]).toMatchObject({ attemptStatus: 'submitted', totalPossible: 1, totalEarned: 0 });
  });
});
