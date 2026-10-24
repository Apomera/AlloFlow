import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let api, grader, inbox, root, host, serial = 0;
const tr = (key, fallback) => ({ 'ui_common.i_dont_know': "I don't know", 'ui_common.try_again': 'Try again' }[key] || (typeof fallback === 'string' ? fallback : key));
const questions = [
  { type: 'mcq', question: 'Choose a shape.', options: ['Circle', 'Square'], correctAnswer: 'Circle' },
  { type: 'multi-select', question: 'Select circles.', options: ['Circle', 'Square'], correctAnswers: ['Circle'] },
  { type: 'answer-evidence', question: 'Explain the choice.', answerOptions: ['A', 'B'], evidenceOptions: ['Reason A', 'Reason B'], correctAnswer: 'A', correctEvidence: 'Reason A' },
  { type: 'numeric-response', question: 'Find the length.', correctValue: 10, unit: 'cm' },
  { type: 'fill-blank', question: 'A plant needs ___.', expectedFill: 'water' },
  { type: 'short-answer', question: 'Explain roots.', expectedAnswer: 'Roots absorb water.' },
  { type: 'self-explanation', question: 'Explain the process.', rubric: 'Use a cause and an effect.' },
  { type: 'sequence-sense', question: 'Order the stages.', items: ['Seed', 'Seedling', 'Plant'], presentedOrder: [1, 0, 2], orderingPrinciple: 'chronological', principleOptions: ['chronological', 'size'] },
  { type: 'relation-mismatch', question: 'Repair the pair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }, { left: 'Stem', right: 'Support' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Light'] },
];
const cardName = type => ({ mcq: 'McqEnhancements', 'multi-select': 'MultiSelectCard', 'answer-evidence': 'AnswerEvidenceCard', 'numeric-response': 'NumericResponseCard', 'sequence-sense': 'SequenceSenseCard', 'relation-mismatch': 'RelationMismatchCard' }[type] || 'FreeformItemCard');

beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.__alloT = tr; window.AlloIcons = {}; window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  grader = window.AlloModules.QuizLiveAggregators;
  const compiled = babel.transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  api = new Function('React', 'window', 'sequenceSenseTruth', 'describeSequenceMisplaced', compiled + ';return {McqEnhancements,MultiSelectCard,AnswerEvidenceCard,NumericResponseCard,FreeformItemCard,SequenceSenseCard,RelationMismatchCard,DeferredAssessmentItem,read:_quizReadWorkingDraft,write:_quizWriteDraftField,answer:_quizAttemptAnswer,snapshot:_quizResponseSnapshot,confidence:_quizAttemptConfidence,answered:_quizQuestionAnswered,withLock:_quizWithDraftLock,finalize:_quizFinalizeAttempt,receipt:_quizReadAttemptReceipt,persisted:_quizReadDraft,notify:_quizNotifyDraftSync};')(React, window, grader.sequenceSenseTruth, grader.describeSequenceMisplaced);
  const source = readFileSync('view_submission_inbox_source.jsx', 'utf8');
  inbox = new Function('window', 'siResponseText', source.slice(source.indexOf('var SI_ASSESSMENT_KIND'), source.indexOf('var SI_ASSESSMENT_VERDICT_STYLE')) + ';return siAssessmentReport;')(window, (value, max) => typeof value === 'string' ? value.slice(0, max) : '');
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; localStorage.clear(); vi.restoreAllMocks();
});
async function render(Component, props) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(Component, props)));
}
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text || el.textContent.trim().endsWith(text));
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
function cardProps(q) { return { q, questionIdx: 0, itemNumber: 1, draftNamespace: 'alloflow_assess_draft_v1:consistency-' + (++serial), modeStrategy: { render: { allowIDontKnow: true, allowConfidenceRating: true } }, onSubmitLiveAnswer: vi.fn(), allowDictation: false }; }

describe('explicit Assess skips remain explicit after navigation and submission', () => {
  it.each(questions)('persists and restores an immediate $type skip, and excludes it from inbox scoring', async q => {
    const p = cardProps(q), Card = api[cardName(q.type)];
    // Previously entered content must not replace a later deliberate skip.
    if (q.type === 'mcq') api.write(p.draftNamespace, 'root', 'mcqAnswers', { 0: 1 });
    else if (q.type === 'multi-select') api.write(p.draftNamespace, 'q-0', 'selected', [1]);
    else if (q.type === 'answer-evidence') api.write(p.draftNamespace, 'q-0', 'answerIdx', 1);
    else if (q.type === 'sequence-sense') api.write(p.draftNamespace, 'q-0', 'verifyAnswer', 'no');
    else if (q.type === 'relation-mismatch') api.write(p.draftNamespace, 'q-0', 'clickedPairIdx', 1);
    else api.write(p.draftNamespace, 'q-0', 'response', 'Earlier response');
    await render(Card, p); await click(button("I don't know"));
    expect(p.onSubmitLiveAnswer).toHaveBeenCalledWith(expect.objectContaining({ itemType: q.type, answer: { idk: true } }));
    expect(api.read(p.draftNamespace).items['q-0'].idk).toBe(true);
    await render(() => null, {}); await render(Card, p);
    expect(button("I don't know")).toBeUndefined();
    const items = api.read(p.draftNamespace).items;
    expect(api.answer(q, 0, items)).toEqual({ idk: true });
    const snapshot = api.snapshot({ questions: [q] }, items, { status: 'submitted' });
    expect(snapshot).toMatchObject({ answered: 1, responded: 1, items: [{ answered: true, hasResponse: true, answer: { idk: true } }] });
    const report = inbox(snapshot, 'quiz', [{ id: 'quiz', type: 'quiz', data: { questions: [q] } }], []);
    expect(report).toMatchObject({ possible: 0, points: 0, percent: null, items: [{ verdict: 'skipped' }] });
    if (q.type === 'mcq') await act(async () => api.write(p.draftNamespace, 'q-0', 'idk', false));
    else await click(button('Try again'));
    expect(api.read(p.draftNamespace).items['q-0'].idk).toBe(false);
    expect(button("I don't know")).toBeTruthy();
  });

  it('saves a deferred skip, locks responses until Try again, and restores it after navigation', async () => {
    const p = { ...cardProps(questions[2]), feedbackTiming: 'after-submit' };
    await render(api.DeferredAssessmentItem, p); await click(button("I don't know"));
    expect(host.querySelector('fieldset[disabled]')).toBeTruthy();
    await render(() => null, {}); await render(api.DeferredAssessmentItem, p);
    expect(api.answer(p.q, 0, api.read(p.draftNamespace).items)).toEqual({ idk: true });
    await click(button('Try again')); expect(host.querySelector('fieldset[disabled]')).toBeNull();
  });
});

describe('partial work and confidence survive teacher snapshots', () => {
  it.each([
    [questions[2], { answerIdx: 0, confidence: 'guessed' }, { answerText: 'A' }],
    [questions[7], { verifyAnswer: 'no', clickedIdx: 0, orderAnswer: [0, 1, 2], confidence: 'no-idea' }, { verifyAnswer: 'no', clickedIdx: 0, orderAnswer: [0, 1, 2] }],
    [questions[8], { clickedPairIdx: 0 }, { clickedPairIdx: 0 }],
  ])('keeps the unfinished parts of $0.type without claiming completion', (q, item, answer) => {
    const snapshot = api.snapshot({ questions: [q] }, { 'q-0': item }, { status: 'submitted' });
    expect(snapshot).toMatchObject({ answered: 0, responded: 1, items: [{ answered: false, hasResponse: true, answer, confidence: item.confidence || null }] });
    expect(snapshot.items[0].response).not.toBe('');
    const report = inbox(snapshot, 'quiz', [{ id: 'quiz', type: 'quiz', data: { questions: [q] } }], []);
    expect(report).toMatchObject({ possible: 0, needsReview: 1, items: [{ verdict: 'incomplete', hasResponse: true, confidence: item.confidence || null }] });
    expect(report.items[0].response).toBe(snapshot.items[0].response);
  });

  it('preserves valid confidence for complete, partial, and unanswered rows, without inventing responses', () => {
    const snapshot = api.snapshot({ questions: [questions[0], questions[2], questions[3]] }, {
      root: { mcqAnswers: { 0: 0 }, mcqConfidence: { 0: 'knew' } },
      'q-1': { confidence: 'guessed' }, 'q-2': { confidence: 'untrusted' },
    }, {});
    expect(snapshot.items.map(row => row.confidence)).toEqual(['knew', 'guessed', null]);
    expect(snapshot.items[1]).toMatchObject({ answered: false, hasResponse: false, answer: null, response: '' });
  });
});

describe('confirmed final delivery preserves confidence', () => {
  it('sends saved confidence, explicit skips and partial choices in the final packets', async () => {
    const source = readFileSync('view_quiz_source.jsx', 'utf8');
    const start = source.indexOf('async function deliverAssessmentReceipt(');
    const end = source.indexOf('function downloadAssessmentAttempt(', start);
    const onSubmitLiveAnswer = vi.fn().mockResolvedValue({ status: 'received' });
    const namespace = 'alloflow_assess_draft_v1:delivery-' + (++serial);
    expect(await api.write(namespace, 'root', 'attemptMeta', { attemptId: 'attempt', status: 'in-progress' })).toBe(true);
    const env = {
      props: {}, submissionLockRef: { current: false }, activeSessionCode: 'ROOM', sessionData: { quizState: { activityId: 'active' } },
      setDeliveryBusy: vi.fn(), submissionContext: 'scope', learnerBaseDraftNamespace: namespace, submissionMountedRef: { current: true }, submissionContextRef: { current: 'scope' },
      _quizWithDraftLock: api.withLock, _quizFinalizeAttempt: api.finalize, _quizReadAttemptReceipt: api.receipt, _quizReadDraft: api.persisted, _quizNotifyDraftSync: api.notify,
      setAttemptReceipt: vi.fn(), onSubmitLiveAnswer,
      assessmentData: { questions: [questions[0], questions[2]] }, reportAssessmentCompletion: vi.fn(),
      liveQuestionSignatures: [questions[0], questions[2]].map(grader.assessmentItemSignature),
      _quizAttemptAnswer: api.answer, _quizAttemptConfidence: api.confidence, _quizQuestionAnswered: api.answered,
    };
    const deliver = new Function('env', 'const {' + Object.keys(env).join(',') + '}=env;\n' + source.slice(start, end) + ';return deliverAssessmentReceipt;')(env);
    await deliver({ sessionCode: 'ROOM', activityId: 'active', attemptId: 'attempt', submittedAt: 100, summary: { answered: 1, total: 2 }, responses: {
      root: { mcqAnswers: { 0: 1 }, mcqConfidence: { 0: 'no-idea' } }, 'q-0': { idk: true }, 'q-1': { answerIdx: 0, confidence: 'guessed' },
    } });
    expect(onSubmitLiveAnswer.mock.calls[0][0]).toMatchObject({ questionIdx: 0, questionSignature: env.liveQuestionSignatures[0], answer: { idk: true }, confidence: 'no-idea', answered: true });
    expect(onSubmitLiveAnswer.mock.calls[1][0]).toMatchObject({ questionIdx: 1, questionSignature: env.liveQuestionSignatures[1], answer: { answerIdx: 0, answerText: 'A' }, confidence: 'guessed', answered: false });
    expect(onSubmitLiveAnswer.mock.calls[2][0]).toMatchObject({ itemType: 'assessment-complete', confidence: null });
    expect(env.reportAssessmentCompletion).toHaveBeenCalledWith(expect.objectContaining({ delivery: expect.objectContaining({ status: 'received' }) }));
    expect(api.receipt(namespace)).toMatchObject({ attemptId: 'attempt', delivery: { status: 'received' } });
  });

  it.each(['knew', 'guessed', 'no-idea', 'unexpected'])('bounds and forwards %s on the confirmed transport', async confidence => {
    const source = readFileSync('host_handlers_source.jsx', 'utf8');
    const start = source.indexOf('const handleSubmitLiveAnswer = async (payload) => {');
    const end = source.indexOf('      if (!__d.activeSessionCode || !__d.user || !__d.user.uid) return;', start);
    const sendConfirmedResponse = vi.fn().mockResolvedValue({ status: 'received' });
    const handle = new Function('__d', source.slice(start, end) + '};return handleSubmitLiveAnswer;')({ activeSessionCode: 'ROOM', user: { uid: 'learner' }, sessionData: { quizState: { activityId: 'active', isActive: true } }, quizGuestRef: { current: { sendConfirmedResponse } } });
    await handle({ requireConfirmation: true, activityId: 'active', questionIdx: 0, itemType: 'mcq', answer: { optionIdx: 0 }, questionSignature: 'assess-item-v1:original', confidence, requestId: 'attempt-q0' });
    expect(sendConfirmedResponse).toHaveBeenCalledWith(0, expect.objectContaining({ questionSignature: 'assess-item-v1:original', confidence: confidence === 'unexpected' ? null : confidence }), 'attempt-q0');
  });

  it('preserves the question version through immediate live transport too', () => {
    const source = readFileSync('host_handlers_source.jsx', 'utf8');
    const start = source.indexOf('const STRUCTURED_ITEM_TYPES = new Set(');
    const end = source.indexOf('// FERPA-first transport:', start);
    const packet = new Function('payload', '__d', source.slice(start, end) + ';return responsePayload;')(
      { questionIdx: 0, itemType: 'relation-mismatch', answer: { clickedPairIdx: 1, partnerAnswer: 'Water' }, questionSignature: 'assess-item-v1:original', assessmentAttemptId: 'attempt-current', assessmentAttemptStartedAt: 123 },
      { sessionData: { quizState: { activityId: 'activity-current' } } }
    );
    expect(packet).toMatchObject({ questionSignature: 'assess-item-v1:original', answer: { clickedPairIdx: 1, partnerAnswer: 'Water' }, assessmentActivityId: 'activity-current', assessmentAttemptId: 'attempt-current', assessmentAttemptStartedAt: 123 });
  });
});
