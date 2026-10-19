import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let root, host, serial = 0;
const t = (key, options) => options?.defaultValue || key;
const draftPrefix = 'alloflow_assess_draft_v1:';
const receiptPrefix = 'alloflow_assess_attempt_v1:';
function props() {
  return {
    t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    generatedContent: { id: 'multitab-ui-' + (++serial), type: 'quiz', data: { title: 'Saved work', questions: [
      { type: 'short-answer', question: 'Explain roots.', expectedAnswer: 'Roots absorb water.' },
      { type: 'short-answer', question: 'Explain leaves.', expectedAnswer: 'Leaves absorb light.' },
    ], deliverySettings: { feedbackTiming: 'after-submit', pacing: 'all-at-once' } } },
    formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 1,
    playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(),
    ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null,
  };
}
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {};
  new Function('window', readFileSync('view_quiz_module.js', 'utf8'))(window);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear();
});
async function render(p) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(window.AlloModules.QuizView, p)));
}
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
const input = index => host.querySelectorAll('textarea')[index];
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function fill(index, value) {
  await act(async () => {
    const el = input(index);
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function flush() { await act(async () => vi.advanceTimersByTime(400)); }
function currentDraftKey() { return Object.keys(localStorage).find(key => key.startsWith(draftPrefix)); }
function savedDraft(key = currentDraftKey()) { return JSON.parse(localStorage.getItem(key)); }
async function remoteSave(key, value) {
  const oldValue = localStorage.getItem(key), newValue = JSON.stringify(value);
  localStorage.setItem(key, newValue);
  await act(async () => window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue, storageArea: localStorage })));
}
async function submit() {
  await click(button('Review & submit')); await click(button('Submit assessment'));
  if (button('Submit with unanswered items')) await click(button('Submit with unanswered items'));
}
const withQuestion = (p, update) => ({ ...p, generatedContent: { ...p.generatedContent, data: { ...p.generatedContent.data, questions: p.generatedContent.data.questions.map((q, i) => i === 0 ? update(q) : q) } } });

describe('Assess version continuity in the learner view', () => {
  it('preserves draft and submitted receipt through alternative text and gloss edits', async () => {
    vi.useFakeTimers(); const p = props(); await render(p);
    await fill(0, 'Keep my root explanation.'); await flush();
    const key = currentDraftKey(), attemptId = savedDraft(key).items.root.attemptMeta.attemptId;
    expect(savedDraft(key).items['q-0']?.response).toBe('Keep my root explanation.');
    expect(button('Use saved answers')).toBeUndefined();
    const withSupports = withQuestion(p, q => ({ ...q, imageAltText: 'Roots below a plant', question_en: 'Explain the roots in the diagram.' }));
    await render(withSupports);
    expect(input(0).value).toBe('Keep my root explanation.');
    expect(currentDraftKey()).toBe(key);
    expect(savedDraft(key).items.root.attemptMeta.attemptId).toBe(attemptId);
    await submit(); expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    await render(withQuestion(withSupports, q => ({ ...q, imageAltText: 'Roots extending into moist soil', question_en: 'Describe how these roots help.' })));
    expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    expect(host.textContent).toContain('Keep my root explanation.');
    expect(Object.keys(localStorage).filter(key => key.startsWith(receiptPrefix))).toHaveLength(1);
  });

  it('keeps substantive revisions separate and downloads the earlier version of the work', async () => {
    vi.useFakeTimers(); const p = props(); await render(p);
    await fill(0, 'This belongs to the original question.'); await flush();
    let blob;
    vi.stubGlobal('URL', { createObjectURL: value => { blob = value; return 'blob:earlier'; }, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await render(withQuestion(p, q => ({ ...q, question: 'Explain how seeds spread.', expectedAnswer: 'Wind carries seeds.' })));
    expect(input(0).value).toBe('');
    expect(host.querySelector('[data-assessment-earlier-work]')).toBeTruthy();
    await click(button('Download earlier work'));
    vi.useRealTimers();
    const json = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob); });
    const downloaded = JSON.parse(json);
    expect(downloaded).toMatchObject({ assignmentIdentity: 'same-assignment-earlier-version', savedWork: { items: { 'q-0': { response: 'This belongs to the original question.' } } } });
  });
});

describe('Assess recovery after another tab saves or submits', () => {
  it('stops a pending live submission after another tab starts a new attempt', async () => {
    vi.useFakeTimers();
    let acknowledge;
    const pending = new Promise(resolve => { acknowledge = resolve; });
    const send = vi.fn().mockReturnValueOnce(pending).mockResolvedValue({ status: 'received' });
    const p = { ...props(), activeSessionCode: 'CLASS', sessionData: { quizState: { activityId: 'live-assessment', isActive: true } }, onSubmitLiveAnswer: send };
    await render(p); await fill(0, 'The previous attempt response.'); await flush();
    const key = currentDraftKey(), draft = savedDraft(key), receiptKey = receiptPrefix + key.slice(draftPrefix.length);
    await submit();
    expect(send).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-assessment-delivery-status]').textContent).toBe('Sending to teacher...');
    const oldReceipt = localStorage.getItem(receiptKey);
    expect(JSON.parse(oldReceipt).attemptId).toBe(draft.items.root.attemptMeta.attemptId);
    const fresh = { version: 1, createdAt: Date.now(), updatedAt: Date.now(), assessmentIdentity: draft.assessmentIdentity,
      items: { root: { attemptMeta: { attemptId: 'new-attempt-from-other-tab', startedAt: Date.now(), status: 'in-progress' } } } };
    await remoteSave(key, fresh);
    localStorage.removeItem(receiptKey);
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: receiptKey, oldValue: oldReceipt, newValue: null, storageArea: localStorage })));
    await act(async () => acknowledge({ status: 'received' }));
    expect(send).toHaveBeenCalledTimes(1);
    expect(p.onResourceComplete).not.toHaveBeenCalled();
    expect(localStorage.getItem(receiptKey)).toBeNull();
    expect(savedDraft(key).items.root.attemptMeta.attemptId).toBe('new-attempt-from-other-tab');
    expect(host.querySelector('[data-assessment-external-change]')).toBeTruthy();
    await click(button('Open latest attempt'));
    expect(host.querySelector('[data-assessment-submitted]')).toBeNull();
    expect(input(0).value).toBe('');
    await flush();
    expect(localStorage.getItem(receiptKey)).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('opens the latest committed receipt through the external-change pane', async () => {
    vi.useFakeTimers(); const p = props(); await render(p);
    await fill(0, 'Local draft before the other tab submitted.'); await flush();
    const key = currentDraftKey(), draft = savedDraft(key);
    const receiptKey = receiptPrefix + key.slice(draftPrefix.length);
    const receipt = { version: 1, submittedAt: Date.now(), attemptId: draft.items.root.attemptMeta.attemptId, signature: draft.assessmentIdentity.signature,
      resourceId: p.generatedContent.id, assessmentIdentity: draft.assessmentIdentity, summary: { total: 2, answered: 1, unanswered: 1, flagged: 0 },
      responses: { ...draft.items, 'q-0': { response: 'The response committed in the other tab.' } }, feedbackTiming: 'after-submit', sessionCode: '', activityId: '', delivery: { status: 'local' } };
    localStorage.removeItem(key); await remoteSave(receiptKey, receipt);
    expect(host.querySelector('[data-assessment-external-change]')).toBeTruthy();
    expect(button('Download draft')).toBeTruthy();
    await click(button('Open latest attempt'));
    expect(host.querySelector('[data-assessment-external-change]')).toBeNull();
    expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    expect(host.textContent).toContain('The response committed in the other tab.');
    expect(host.textContent).not.toContain('Local draft before the other tab submitted.');
  });

  it('Use saved answers preserves independent local answers while replacing the conflicting answer', async () => {
    vi.useFakeTimers(); await render(props());
    await fill(0, 'Shared original'); await flush();
    const key = currentDraftKey(), remote = savedDraft(key);
    await fill(0, 'Conflicting local edit'); await fill(1, 'Unsaved local-only answer');
    remote.items['q-0'].response = 'Saved answer from the other tab'; remote.updatedAt = Date.now() + 1;
    await remoteSave(key, remote); await flush();
    expect(button('Use saved answers')).toBeTruthy();
    await click(button('Use saved answers'));
    expect(input(0).value).toBe('Saved answer from the other tab');
    expect(input(1).value).toBe('Unsaved local-only answer');
    await flush(); expect(savedDraft(key).items['q-1']?.response).toBe('Unsaved local-only answer');
  });

  it('Save my changes refreshes independent answers received while the conflict was open', async () => {
    vi.useFakeTimers(); await render(props());
    await fill(0, 'Shared Q1'); await fill(1, 'Shared Q2'); await flush();
    const key = currentDraftKey(), remote = savedDraft(key);
    await fill(0, 'My Q1 change');
    remote.items['q-0'].response = 'Other Q1 change'; remote.updatedAt = Date.now() + 1;
    await remoteSave(key, remote); await flush();
    expect(button('Save my changes')).toBeTruthy();
    remote.items['q-1'].response = 'Other tab updated Q2 during conflict'; remote.updatedAt = Date.now() + 2;
    await remoteSave(key, remote);
    await click(button('Save my changes'));
    expect(input(0).value).toBe('My Q1 change');
    expect(input(1).value).toBe('Other tab updated Q2 during conflict');
    expect(savedDraft(key).items).toMatchObject({ 'q-0': { response: 'My Q1 change' }, 'q-1': { response: 'Other tab updated Q2 during conflict' } });
  });
});
