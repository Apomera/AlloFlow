import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const gradingWindow = {};
new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(gradingWindow);
const isAnswerKeyDisputed = gradingWindow.AlloModules.QuizLiveAggregators.isAnswerKeyDisputed;
let root, host, serial = 0;
const t = (key, options) => options?.defaultValue || key;
const questions = () => [
  { type: 'short-answer', question: 'Explain how roots help.', expectedAnswer: 'They absorb water.' },
  { type: 'mcq', question: 'What do leaves need?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight' },
];
function props(extra = {}) {
  return { t, isTeacherMode: false, isParentMode: false, isIndependentMode: false,
    studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false,
    escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    generatedContent: { id: 'continuity-' + (++serial), type: 'quiz', data: { title: 'Plant check ' + serial, questions: questions(), deliverySettings: { feedbackTiming: 'after-submit', pacing: 'one-at-a-time' } } },
    formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 1,
    playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(),
    ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null, ...extra };
}
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {};
  new Function('window', readFileSync('view_quiz_module.js', 'utf8'))(window);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers();
});
async function render(p) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(window.AlloModules.QuizView, p)));
}
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function fill(el, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await click(button('Review & submit')); await click(button('Submit assessment'));
  if (button('Submit with unanswered items')) await click(button('Submit with unanswered items'));
}

describe('Assess answer and attempt continuity', () => {
  it('keeps the latest answer during navigation before the autosave delay', async () => {
    vi.useFakeTimers(); await render(props());
    await fill(host.querySelector('textarea'), 'My latest response');
    await click(button('Next')); await click(button('Previous'));
    expect(host.querySelector('textarea').value).toBe('My latest response');
    const saved = [...Array(localStorage.length)].map((_, i) => localStorage.getItem(localStorage.key(i)));
    expect(saved.join('')).toContain('My latest response');
    await fill(host.querySelector('textarea'), 'An updated response');
    await click(button('Next')); await click(button('Previous'));
    expect(host.querySelector('textarea').value).toBe('An updated response');
    await submit();
    expect(host.querySelector('[data-assessment-attempt-feedback]').textContent).toContain('An updated response');
  });

  it('flushes pending work when the page is hidden', async () => {
    vi.useFakeTimers(); await render(props());
    await fill(host.querySelector('textarea'), 'Keep this across reloads');
    await act(async () => window.dispatchEvent(new Event('pagehide')));
    const draftKey = Object.keys(localStorage).find(key => key.startsWith('alloflow_assess_draft'));
    expect(JSON.parse(localStorage.getItem(draftKey)).items['q-0'].response).toBe('Keep this across reloads');
  });

  it('isolates drafts in separately assigned copies without losing the original', async () => {
    vi.useFakeTimers(); const a = props(); const b = { ...a, generatedContent: { ...a.generatedContent, id: a.generatedContent.id + '-copy' } };
    await render(a); await fill(host.querySelector('textarea'), 'Only for assignment A');
    await render(b); expect(host.querySelector('textarea').value).toBe('');
    await fill(host.querySelector('textarea'), 'Only for assignment B');
    await render(a); expect(host.querySelector('textarea').value).toBe('Only for assignment A');
    await render(b); expect(host.querySelector('textarea').value).toBe('Only for assignment B');
  });

  it('does not restore a completed attempt for a different resource with identical questions', async () => {
    const a = props(); const b = { ...a, generatedContent: { ...a.generatedContent, id: a.generatedContent.id + '-copy' } };
    await render(a); await fill(host.querySelector('textarea'), 'Assignment A completed'); await submit();
    await render(b); expect(host.querySelector('[data-assessment-submitted]')).toBeNull();
    expect(host.querySelector('textarea').value).toBe('');
    await render(a); expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    expect(host.textContent).toContain('Assignment A completed');
  });

  it('keeps the same attempt when only its display title changes', async () => {
    const p = props(); await render(p); await fill(host.querySelector('textarea'), 'Keep my answer'); await submit();
    const renamed = { ...p, generatedContent: { ...p.generatedContent, data: { ...p.generatedContent.data, title: 'Renamed assessment' } } };
    await act(async () => root.unmount()); root = null; host.remove(); host = null;
    await render(renamed);
    expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    expect(host.textContent).toContain('Keep my answer');
  });

  it('starts fresh when only the evidence options and evidence key change', async () => {
    const a = props();
    a.generatedContent.data.questions = [{ type: 'answer-evidence', question: 'What do roots absorb?', answerOptions: ['Water', 'Stone'], correctAnswer: 'Water', evidenceOptions: ['Roots take in water', 'Roots eat rocks'], correctEvidence: 'Roots take in water' }];
    await render(a); await submit();
    const revised = { ...a, generatedContent: { ...a.generatedContent, data: { ...a.generatedContent.data, questions: [{ ...a.generatedContent.data.questions[0], evidenceOptions: ['Soil supplies moisture', 'Leaves eat rocks'], correctEvidence: 'Soil supplies moisture' }] } } };
    await render(revised);
    expect(host.querySelector('[data-assessment-submitted]')).toBeNull();
    expect(host.textContent).toContain('Soil supplies moisture');
    expect(host.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it('offers review below the questions and uses the same review dialog', async () => {
    const p = props(); p.generatedContent.data.deliverySettings.pacing = 'all-at-once'; await render(p);
    const footer = host.querySelector('[data-assessment-submit-footer]');
    const lastQuestion = host.querySelector('#assessment-question-1');
    expect(lastQuestion.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await click(footer.querySelector('button'));
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();
    expect(button('Submit assessment')).toBeTruthy();
  });

  it('rejects a receipt with a different assessment signature', () => {
    const source = readFileSync('view_quiz_source.jsx', 'utf8');
    const start = source.indexOf('var _QUIZ_DRAFT_STORAGE_PREFIX');
    const end = source.indexOf('function _quizUseDraftField', start);
    const helpers = new Function('_quizIsAnswerKeyDisputed', source.slice(start, end) + ';return {_quizDraftNamespace,_quizFinalizeAttempt,_quizReadAttemptReceipt};')(isAnswerKeyDisputed);
    const namespace = helpers._quizDraftNamespace({ questions: questions() }, '', 'receipt-test');
    helpers._quizFinalizeAttempt(namespace, { signature: 'original-signature' });
    expect(helpers._quizReadAttemptReceipt(namespace, 'revised-signature')).toBeNull();
    expect(helpers._quizReadAttemptReceipt(namespace, 'original-signature')).toMatchObject({ signature: 'original-signature' });
  });

  it('keeps legacy work available without assigning its ambiguous answers to this resource', async () => {
    const p = props();
    const source = readFileSync('view_quiz_source.jsx', 'utf8');
    const start = source.indexOf('var _QUIZ_DRAFT_STORAGE_PREFIX');
    const end = source.indexOf('function _quizUseDraftField', start);
    const legacyKey = new Function('_quizIsAnswerKeyDisputed', source.slice(start, end) + ';return _quizLegacyDraftNamespace;')(isAnswerKeyDisputed)(p.generatedContent.data, '');
    localStorage.setItem(legacyKey, JSON.stringify({ version: 1, updatedAt: Date.now(), items: { 'q-0': { response: 'Older saved answer' } } }));
    await render(p);
    expect(host.querySelector('textarea').value).toBe('');
    expect(host.querySelector('[data-assessment-earlier-work]').textContent).toContain('another assignment');
    expect(button('Download earlier work')).toBeTruthy();
    await click(button('Dismiss'));
    expect(host.querySelector('[data-assessment-earlier-work]')).toBeNull();
    expect(localStorage.getItem(legacyKey)).toContain('Older saved answer');
  });
});
