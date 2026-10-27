import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const React = require('../desktop/web-app/node_modules/react');
let aggs, quiz, inbox;
const mcq = { type: 'mcq', question: 'Choose A.', options: ['A', 'B'], correctAnswer: 'A' };
const cases = [
  ['MCQ blank', mcq, {}, false],
  ['multi-select partial credit', { type: 'multi-select', question: 'Select letters.', options: ['A', 'B', 'C'], correctAnswers: ['A', 'B'] }, { selected: [0] }, false],
  ['multi-select blank', { type: 'multi-select', question: 'Select letters.', options: ['A', 'B'], correctAnswers: ['A'] }, {}, false],
  ['answer-evidence partial credit', { type: 'answer-evidence', question: 'Choose evidence.', answerOptions: ['A', 'B'], evidenceOptions: ['E1', 'E2'], correctAnswer: 'A', correctEvidence: 'E1' }, { answerIdx: 0, evidenceIdx: 1 }, false],
  ['answer-evidence unfinished', { type: 'answer-evidence', question: 'Choose evidence.', answerOptions: ['A', 'B'], evidenceOptions: ['E1', 'E2'], correctAnswer: 'A', correctEvidence: 'E1' }, { answerIdx: 0 }, false],
  ['numeric partial credit', { type: 'numeric-response', question: 'Measure.', correctValue: 10, unit: 'cm' }, { response: '10 m' }, false],
  ['numeric blank', { type: 'numeric-response', question: 'Measure.', correctValue: 10, unit: 'cm' }, {}, false],
  ['fill blank', { type: 'fill-blank', question: 'Plants need ___.', expectedFill: 'water' }, {}, false],
  ['short written response', { type: 'short-answer', question: 'Explain roots.', expectedAnswer: 'Absorb water.' }, { response: 'Roots absorb water.' }, false],
  ['short written blank', { type: 'short-answer', question: 'Explain roots.', expectedAnswer: 'Absorb water.' }, {}, false],
  ['explanation response', { type: 'self-explanation', question: 'Explain.', rubric: 'Use evidence.' }, { response: 'My explanation.' }, false],
  ['sequence complete', { type: 'sequence-sense', question: 'Order.', items: ['Seed', 'Sprout', 'Plant'], presentedOrder: [1, 0, 2], orderingPrinciple: 'time', principleOptions: ['time', 'size'] }, { verifyAnswer: 'no', clickedIdx: 0, orderAnswer: [0, 1, 2], principleAnswer: 'time' }, false],
  ['sequence unfinished', { type: 'sequence-sense', question: 'Order.', items: ['Seed', 'Sprout', 'Plant'], presentedOrder: [1, 0, 2], orderingPrinciple: 'time', principleOptions: ['time', 'size'] }, { verifyAnswer: 'no', principleAnswer: 'time' }, false],
  ['sequence blank', { type: 'sequence-sense', question: 'Order.', items: ['Seed', 'Sprout', 'Plant'], presentedOrder: [1, 0, 2], orderingPrinciple: 'time', principleOptions: ['time', 'size'] }, {}, false],
  ['relation complete', { type: 'relation-mismatch', question: 'Repair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Light'] }, { clickedPairIdx: 0, partnerAnswer: 'Water' }, false],
  ['relation unfinished', { type: 'relation-mismatch', question: 'Repair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Light'] }, { clickedPairIdx: 0 }, false],
  ['intentional IDK', mcq, { idk: true }, false],
  ['disputed blank', { ...mcq, keyCheck: { status: 'disputed' } }, {}, false],
  ['ungradable numeric blank', { type: 'numeric-response', question: 'Measure.', correctValue: null }, {}, false],
  ['active draft blank', mcq, {}, true],
];
beforeAll(() => {
  const fakeWindow = { AlloModules: {} };
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(fakeWindow);
  aggs = fakeWindow.AlloModules.QuizLiveAggregators;
  const compiled = babel.transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  quiz = new Function('React', 'window', compiled + ';return { snapshot:_quizResponseSnapshot, answer:_quizAttemptAnswer };')({ createContext: () => ({}) }, fakeWindow);
  const source = readFileSync('view_submission_inbox_source.jsx', 'utf8');
  inbox = new Function('window', 'siResponseText', source.slice(source.indexOf('var SI_ASSESSMENT_KIND'), source.indexOf('var SI_ASSESSMENT_VERDICT_STYLE')) + ';return siAssessmentReport;')(fakeWindow, (value, max) => typeof value === 'string' ? value.slice(0, max) : '');
});

function compare(question, item, draft = false, partialCredit = true) {
  const data = { questions: [mcq, question], scoringPolicy: { partialCredit, writtenResponseMode: 'teacher-review' } };
  const content = { id: 'assessment', type: 'quiz', data };
  const items = { root: { mcqAnswers: { 0: 0 } }, 'q-1': item };
  const snapshot = quiz.snapshot(data, items, { status: draft ? 'in-progress' : 'submitted' });
  snapshot.items.forEach((row, index) => { expect(row.questionSignature).toBe(aggs.assessmentItemSignature(data.questions[index])); });
  const responses = {};
  snapshot.items.forEach((row, index) => { responses[index] = { itemType: row.type, answer: quiz.answer(data.questions[index], index, items), submitted: row.answered, questionSignature: row.questionSignature, assessmentActivityId: 'active' }; });
  if (!draft) responses[data.questions.length] = { itemType: 'assessment-complete', answer: { answered: snapshot.answered, total: snapshot.total } };
  const state = { allResponses: { learner: responses } };
  const live = aggs.aggregateGradebook(state, content, { learner: { displayName: 'Learner' } }).studentRows[0];
  const report = inbox(snapshot, content.id, [content], []);
  return { live, report, state, content, snapshot };
}

describe('final live packets and inbox snapshots use the same scoring and completion rules', () => {
  it.each(cases)('%s', (_, question, item, draft) => {
    const { live, report } = compare(question, item, draft);
    expect(live.totalAnswered).toBe(report.answered);
    expect(live.totalEarned).toBe(report.points);
    expect(live.totalPossible).toBe(report.possible);
    expect(live.scorePercent).toBe(report.percent);
  });
  it('counts a final blank as zero without claiming a response, in every teacher aggregate', () => {
    const { live, state, content } = compare(mcq, {});
    expect(live).toMatchObject({ totalAnswered: 1, totalEvaluated: 2, totalEarned: 1, totalPossible: 2, scorePercent: 50, attemptStatus: 'submitted' });
    expect(live.byQuestion[1]).toMatchObject({ status: 'no-response', omitted: true, answerSummary: '' });
    const roster = { learner: {} };
    expect(aggs.aggregateLiveHeatmap(state, content, roster).bars[1]).toMatchObject({ total: 0, totalPossible: 1, scorePercent: 0 });
    expect(aggs.aggregatePreLessonGap(state, content, roster).conceptCards.find(row => row.questionIdx === 1)).toMatchObject({ totalAnswered: 0, totalPossible: 1, scorePercent: 0 });
    expect(aggs.aggregateItemAnalysis(state, content, roster).items[1]).toMatchObject({ respondents: 0, omittedCount: 1, totalPossible: 1 });
  });
  it('also scores an entirely missing final item packet as omitted', () => {
    const { state, content } = compare(mcq, {}); delete state.allResponses.learner[1];
    expect(aggs.aggregateGradebook(state, content, {}).studentRows[0]).toMatchObject({ totalAnswered: 1, totalPossible: 2, scorePercent: 50 });
  });
  it('keeps all-or-nothing partial credit consistent', () => {
    const { live, report } = compare(cases[1][1], cases[1][2], false, false);
    expect(live.totalEarned).toBe(1); expect(live.totalPossible).toBe(2); expect(live.scorePercent).toBe(report.percent);
  });
  it('retains participation in unscored Likert responses, including zero', () => {
    const content = { data: { questions: [{ type: 'likert', options: ['0', '1', '2'] }] } };
    const state = { allResponses: { learner: { 0: { itemType: 'likert', answer: { optionIdx: 0 } } } } };
    expect(aggs.aggregateGradebook(state, content, {}).studentRows[0]).toMatchObject({ totalAnswered: 1, totalUnscored: 1, totalPossible: 0, scorePercent: null });
  });
});

describe('inbox only interprets positional responses against the original stimulus', () => {
  const original = { type: 'relation-mismatch', question: 'Find the incorrect pair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Light'] };
  function reportFor(teacher, signature = aggs.assessmentItemSignature(original)) {
    const snapshot = { kind: 'assessment-attempt', status: 'submitted', items: [{ number: 1, type: original.type, question: original.question, answered: true, hasResponse: true, response: 'Pair 1: Root → Light; Water', answer: { clickedPairIdx: 0, partnerAnswer: 'Water' }, ...(signature ? { questionSignature: signature } : {}) }] };
    // Obtain the actual snapshot kind rather than duplicating the wire schema.
    snapshot.kind = quiz.snapshot({ questions: [] }, {}, {}).kind;
    return inbox(snapshot, 'assessment', [{ id: 'assessment', type: 'quiz', data: { questions: [teacher] } }], []);
  }
  it('grades the same stimulus while ignoring keys, alt text and translations in its signature', () => {
    const supports = { ...original, question_en: 'A translation', pairs_en: [{ left: 'A gloss' }], imageAltText: 'Description', keyCheck: { status: 'verified' }, rubric: 'Private reference' };
    expect(aggs.assessmentItemSignature(supports)).toBe(aggs.assessmentItemSignature(original));
    expect(aggs.assessmentItemSignature({ ...original, wrongPairIndex: undefined, correctPartnerForWrong: undefined })).toBe(aggs.assessmentItemSignature(original));
    expect(reportFor(supports)).toMatchObject({ percent: 100, needsReview: 0, items: [{ changed: false }] });
  });
  it('does not silently regrade a saved pair index after pairs are reordered', () => {
    const changed = { ...original, pairs: [...original.pairs].reverse(), wrongPairIndex: 1 };
    expect(reportFor(changed)).toMatchObject({ possible: 0, percent: null, needsReview: 1, items: [{ verdict: 'review', changed: true }] });
  });
  it('keeps legacy positional answers available for review without assuming their version', () => {
    expect(reportFor(original, '')).toMatchObject({ possible: 0, needsReview: 1, items: [{ verdict: 'review', changed: false, versionUnverified: true }] });
  });
  it('also blocks live grading, stale AI grades, and old overrides for a reordered stimulus', () => {
    const { state, content } = compare(original, { clickedPairIdx: 0, partnerAnswer: 'Water' });
    content.data.questions[1] = { ...original, pairs: [...original.pairs].reverse(), wrongPairIndex: 1 };
    const row = aggs.aggregateGradebook(state, content, {}, { 'learner:1': { status: 'correct' } }, { learner: { 1: { status: 'correct' } } }).studentRows[0];
    expect(row).toMatchObject({ totalAnswered: 2, totalEarned: 1, totalPossible: 1 });
    expect(row.byQuestion[1]).toMatchObject({ status: 'submitted', versionMismatch: true, maxPoints: 0 });
  });
  it('requires review for unsigned legacy final compound packets but keeps legacy practice compatible', () => {
    const response = { itemType: original.type, answer: { clickedPairIdx: 0, partnerAnswer: 'Water' }, submitted: true, assessmentActivityId: 'active' };
    expect(aggs.gradeResponseForItem(response, original)).toMatchObject({ status: 'submitted', versionUnverified: true });
    delete response.assessmentActivityId;
    expect(aggs.gradeResponseForItem(response, original)).toMatchObject({ status: 'correct' });
  });
  it('does not assign zero to a blank packet for an older stimulus', () => {
    const { state, content } = compare(mcq, {});
    content.data.questions[1] = { ...mcq, imageUrl: 'new-diagram.png' };
    state.allResponses.learner[1].answer = null;
    expect(aggs.aggregateGradebook(state, content, {}).studentRows[0]).toMatchObject({ totalPossible: 1, scorePercent: 100 });
  });
  it.each(['imageUrl', 'contextSentence', 'evidencePrompt'])('detects a changed public %s', field => {
    expect(aggs.assessmentItemSignature({ ...original, [field]: 'Changed stimulus' })).not.toBe(aggs.assessmentItemSignature(original));
  });
});
