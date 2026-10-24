import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { transformSync } = require('@babel/core');
const { act } = React;
let api, root, host, serial = 0;
const t = (key, options) => options?.defaultValue || key;

beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {};
  const code = transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, compact: false,
  }).code;
  api = new Function('window', 'React', code + ';return {QuizView, FreeformItemsBlock, signature: _quizAssessmentItemSignature};')(window, React);
}, 120000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers();
});

function props(questions, timing = 'immediate') {
  return {
    t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {},
    activeSessionCode: 'ROOM', sessionData: { quizState: { isActive: true, activityId: 'activity' } }, user: { uid: 'learner' },
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false },
    presentationState: {}, reviewGameState: {}, isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    generatedContent: { id: 'signed-assessment-' + (++serial), type: 'quiz', data: { title: 'Signed responses', questions, deliverySettings: { feedbackTiming: timing } } },
    formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 1,
    playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(),
    onSubmitLiveAnswer: vi.fn().mockResolvedValue({ status: 'received' }), onRecordQuizResponses: vi.fn(),
    ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null,
  };
}
async function render(p) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(api.QuizView, p)));
}
const button = text => Array.from(host.querySelectorAll('button')).find(element => element.textContent.trim() === text);
async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function fill(value) {
  await act(async () => {
    const element = host.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Assess question identity accompanies live and saved responses', () => {
  it('signs immediate MCQ choices with the question context rendered to the learner', async () => {
    const q = { type: 'mcq', question: 'Choose the shape.', options: ['Circle', 'Square'], correctAnswer: 'Circle' };
    const p = props([q]); await render(p);
    await click(Array.from(host.querySelectorAll('[role="button"]')).find(element => element.textContent.includes('Square')));
    expect(p.onSubmitLiveAnswer).toHaveBeenCalledWith(expect.objectContaining({
      questionIdx: 0, answer: { optionIdx: 1, optionText: 'Square' }, questionSignature: api.signature(q),
    }));
  });

  it('keeps a delayed card callback bound to its original context and preserves explicit old signatures', async () => {
    const callbacks = [];
    const createElement = React.createElement;
    vi.spyOn(React, 'createElement').mockImplementation((type, values, ...children) => {
      if (type === api.FreeformItemsBlock && values?.onSubmitLiveAnswer) callbacks.push(values.onSubmitLiveAnswer);
      return createElement(type, values, ...children);
    });
    const q = { type: 'short-answer', question: 'Explain roots.', expectedAnswer: 'They absorb water.' };
    const p = props([q]); await render(p);
    const oldCallback = callbacks.at(-1), oldSignature = api.signature(q);
    expect(oldCallback).toBeTypeOf('function');
    // Even an in-place source change must not resign a callback that is already
    // waiting for an async grade or another delayed result.
    q.question = 'Explain leaves.';
    await oldCallback({ questionIdx: 0, itemType: 'short-answer', answer: { text: 'Old response' } });
    expect(p.onSubmitLiveAnswer.mock.calls.at(-1)[0].questionSignature).toBe(oldSignature);
    await render(p);
    const currentCallback = callbacks.at(-1);
    await currentCallback({ questionIdx: 0, itemType: 'short-answer', answer: { text: 'Current response' } });
    expect(p.onSubmitLiveAnswer.mock.calls.at(-1)[0].questionSignature).toBe(api.signature(q));
    expect(api.signature(q)).not.toBe(oldSignature);
    await currentCallback({ questionIdx: 0, questionSignature: oldSignature, answer: { text: 'Already signed response' } });
    expect(p.onSubmitLiveAnswer.mock.calls.at(-1)[0].questionSignature).toBe(oldSignature);
  });

  it('signs every confirmed final item, including blanks, without assigning a question identity to the completion packet', async () => {
    const questions = [
      { type: 'mcq', question: 'Choose a shape.', options: ['Circle', 'Square'], correctAnswer: 'Circle' },
      { type: 'relation-mismatch', question: 'Repair the pair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }, { left: 'Stem', right: 'Support' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Light'] },
    ];
    const p = props(questions, 'after-submit'); await render(p);
    await click(button('Review & submit')); await click(button('Submit assessment')); await click(button('Submit with unanswered items'));
    const packets = p.onSubmitLiveAnswer.mock.calls.map(call => call[0]);
    expect(packets).toHaveLength(3);
    for (let index = 0; index < questions.length; index++) expect(packets[index]).toMatchObject({
      questionIdx: index, questionSignature: api.signature(questions[index]), requireConfirmation: true, answered: false,
    });
    expect(packets[2]).toMatchObject({ itemType: 'assessment-complete', questionSignature: '' });
    expect(host.querySelector('[data-assessment-delivery-status]').textContent).toContain('Received by teacher');
  });

  it('records the same item signatures for on-device drafts and completed Submit Work snapshots', async () => {
    vi.useFakeTimers();
    const q = { type: 'short-answer', question: 'Explain roots.', expectedAnswer: 'They absorb water.' };
    const p = { ...props([q], 'after-submit'), activeSessionCode: null, sessionData: {} };
    await render(p); await fill('Roots absorb water.');
    await act(async () => vi.advanceTimersByTime(450));
    const draft = p.onRecordQuizResponses.mock.calls.findLast(call => call[1] === 'assessmentDraft' && call[2]);
    expect(draft[2].items[0]).toMatchObject({ questionSignature: api.signature(q), response: 'Roots absorb water.' });
    await click(button('Review & submit')); await click(button('Submit assessment'));
    const completed = p.onRecordQuizResponses.mock.calls.findLast(call => call[1] === 'assessmentSubmitted');
    expect(completed[2].items[0]).toMatchObject({ questionSignature: api.signature(q), response: 'Roots absorb water.' });
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });

  it('announces a fresh live attempt and binds later answers to its new owner', async () => {
    const q = { type: 'mcq', question: 'Choose a shape.', options: ['Circle', 'Square'], correctAnswer: 'Circle' };
    const p = props([q], 'after-submit'); await render(p);
    await click(Array.from(host.querySelectorAll('[role="button"]')).find(element => element.textContent.includes('Circle')));
    const firstChoice = p.onSubmitLiveAnswer.mock.calls.at(-1)[0];
    expect(firstChoice.assessmentAttemptId).toMatch(/^attempt-/);
    await click(button('Review & submit')); await click(button('Submit assessment'));
    const final = p.onSubmitLiveAnswer.mock.calls.map(call => call[0]).find(packet => packet.itemType === 'assessment-complete');
    expect(final.assessmentAttemptId).toBe(firstChoice.assessmentAttemptId);
    await click(button('Start another attempt')); await click(button('Clear and start again'));
    const start = p.onSubmitLiveAnswer.mock.calls.map(call => call[0]).find(packet => packet.itemType === 'assessment-start');
    expect(start).toMatchObject({ questionIdx: 1, answered: false, answer: null, requireConfirmation: true });
    expect(start.assessmentAttemptId).not.toBe(firstChoice.assessmentAttemptId);
    expect(start.assessmentAttemptStartedAt).toBeGreaterThan(firstChoice.assessmentAttemptStartedAt);
    await click(Array.from(host.querySelectorAll('[role="button"]')).find(element => element.textContent.includes('Square')));
    expect(p.onSubmitLiveAnswer.mock.calls.at(-1)[0]).toMatchObject({ assessmentAttemptId: start.assessmentAttemptId, assessmentAttemptStartedAt: start.assessmentAttemptStartedAt });
  });

  it('retries an unconfirmed restart through a reconnect and stops after receipt', async () => {
    vi.useFakeTimers();
    const q = { type: 'mcq', question: 'Choose a shape.', options: ['Circle', 'Square'], correctAnswer: 'Circle' };
    const p = props([q], 'after-submit'); await render(p);
    await click(Array.from(host.querySelectorAll('[role="button"]')).find(element => element.textContent.includes('Circle')));
    await click(button('Review & submit')); await click(button('Submit assessment'));
    let starts = 0;
    p.onSubmitLiveAnswer.mockImplementation(async packet => {
      if (packet.itemType === 'assessment-start') return { status: ++starts < 3 ? 'unavailable' : 'received' };
      return { status: 'received' };
    });
    await click(button('Start another attempt')); await click(button('Clear and start again'));
    expect(starts).toBe(1);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(starts).toBe(2);
    await act(async () => window.dispatchEvent(new Event('online')));
    expect(starts).toBe(3);
    const markers = p.onSubmitLiveAnswer.mock.calls.map(call => call[0]).filter(packet => packet.itemType === 'assessment-start');
    expect(new Set(markers.map(packet => packet.requestId)).size).toBe(1);
    expect(new Set(markers.map(packet => packet.assessmentAttemptId)).size).toBe(1);
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(starts).toBe(3);
    expect(host.querySelector('[data-assessment-submitted]')).toBeNull();
  });

  it('cancels restart retries when the learner leaves the assessment', async () => {
    vi.useFakeTimers();
    const q = { type: 'mcq', question: 'Choose a shape.', options: ['Circle', 'Square'], correctAnswer: 'Circle' };
    const p = props([q], 'after-submit'); await render(p);
    await click(Array.from(host.querySelectorAll('[role="button"]')).find(element => element.textContent.includes('Circle')));
    await click(button('Review & submit')); await click(button('Submit assessment'));
    p.onSubmitLiveAnswer.mockResolvedValue({ status: 'unavailable' });
    await click(button('Start another attempt')); await click(button('Clear and start again'));
    const before = p.onSubmitLiveAnswer.mock.calls.length;
    await act(async () => root.unmount()); root = null;
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); window.dispatchEvent(new Event('online')); });
    expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(before);
  });
});
