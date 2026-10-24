import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let root, host, serial = 0;
const t = (key, options) => options?.defaultValue || key;
function props() {
  return { t, isTeacherMode: false, isParentMode: false, isIndependentMode: false,
    studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false,
    escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    generatedContent: { id: 'storage-' + (++serial), type: 'quiz', data: { title: 'Draft recovery', questions: [
      { type: 'short-answer', question: 'Explain the diagram.', expectedAnswer: 'This key must not be exported.' },
      { type: 'mcq', question: 'Pick a shape.', options: ['Circle', 'Square'], correctAnswer: 'Circle' },
    ], deliverySettings: { feedbackTiming: 'after-submit', pacing: 'one-at-a-time' } } },
    formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 1,
    playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(),
    ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null };
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
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function fill(value) {
  await act(async () => {
    const el = host.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function helpers() {
  const source = readFileSync('view_quiz_source.jsx', 'utf8');
  return new Function(source.slice(source.indexOf('var _QUIZ_DRAFT_STORAGE_PREFIX'), source.indexOf('function _quizUseDraftField')) + ';return {_quizWriteDraftField,_quizReadWorkingDraft,_quizSaveWorkingDraft,_quizFinalizeAttempt,_quizReadAttemptReceipt,_quizClearAttemptReceipt};')();
}

describe('Assess local save recovery', () => {
  it('reports blocked storage, preserves rapid navigation, and retries the complete working draft', async () => {
    vi.useFakeTimers();
    const access = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    const p = props(); await render(p);
    expect(host.querySelector('[data-assessment-draft-status]').textContent).toContain('not saved');
    await fill('My newest explanation'); await click(button('Next'));
    await click([...host.querySelectorAll('[role="button"]')].find(el => el.textContent.includes('Square')));
    await click(button('Previous')); expect(host.querySelector('textarea').value).toBe('My newest explanation');
    await act(async () => vi.advanceTimersByTime(400));
    const leave = new Event('beforeunload', { cancelable: true });
    await act(async () => window.dispatchEvent(leave)); expect(leave.defaultPrevented).toBe(true);
    access.mockRestore(); await click(button('Retry save'));
    expect(host.querySelector('[data-assessment-draft-status]').textContent).toContain('Saved locally');
    const saved = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('alloflow_assess_draft'))));
    expect(saved.items['q-0'].response).toBe('My newest explanation');
    expect(saved.items.root.mcqAnswers[1]).toBe(1);
    expect(saved.items.root.attemptMeta.attemptId).toBeTruthy();
    const safeLeave = new Event('beforeunload', { cancelable: true });
    await act(async () => window.dispatchEvent(safeLeave)); expect(safeLeave.defaultPrevented).toBe(false);
  });

  it('downloads the latest unsaved responses without leaking keys or claiming submission', async () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    let exportedBlob;
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { exportedBlob = blob; return 'blob:draft'; }), revokeObjectURL: vi.fn() });
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download); });
    const p = props(); await render(p); await fill('An unsaved response just typed');
    await click(button('Download draft'));
    vi.useRealTimers();
    const text = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(exportedBlob); });
    const exported = JSON.parse(text);
    expect(downloads).toEqual(['assessment-draft.json']);
    expect(exported).toMatchObject({ status: 'in-progress', resourceId: p.generatedContent.id });
    expect(exported.responses[0].response.text).toBe('An unsaved response just typed');
    expect(text).not.toContain('This key must not be exported.');
    expect(p.onResourceComplete).not.toHaveBeenCalled();
  });

  it('keeps failed submission review open with recovery controls and allows a successful retry', async () => {
    const saving = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const p = props(); await render(p); await fill('Do not lose this answer');
    await click(button('Review & submit')); await click(button('Submit assessment')); await click(button('Submit with unanswered items'));
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();
    expect(host.querySelector('[data-assessment-submit-error]').textContent).toContain('has not been submitted');
    expect([...host.querySelector('[role="dialog"]').querySelectorAll('button')].some(el => el.textContent === 'Download draft')).toBe(true);
    expect(p.onResourceComplete).not.toHaveBeenCalled();
    saving.mockRestore(); await click(button('Submit with unanswered items') || button('Submit assessment'));
    if (button('Submit with unanswered items')) await click(button('Submit with unanswered items'));
    expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    expect(host.textContent).toContain('Do not lose this answer');
    expect(p.onResourceComplete).toHaveBeenCalledTimes(1);
  });

  it('does not reject a saved receipt when obsolete-draft cleanup fails', () => {
    const api = helpers(); const ns = 'alloflow_assess_draft_v1:cleanup';
    api._quizWriteDraftField(ns, 'q-0', 'response', 'Completed answer');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('Cleanup blocked', 'SecurityError'); });
    const receipt = api._quizFinalizeAttempt(ns, { signature: 'v1', responses: api._quizReadWorkingDraft(ns).items });
    expect(receipt).toBeTruthy();
    expect(api._quizReadAttemptReceipt(ns, 'v1').responses['q-0'].response).toBe('Completed answer');
    expect(api._quizWriteDraftField(ns, 'q-0', 'response', 'Late debounce')).toBe(false);
  });

  it('retains saved and newly staged fields when storage becomes unreadable', () => {
    const api = helpers(); const ns = 'alloflow_assess_draft_v1:transient';
    api._quizWriteDraftField(ns, 'q-0', 'response', 'First answer');
    const access = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    expect(api._quizWriteDraftField(ns, 'q-1', 'response', 'Second answer')).toBe(false);
    expect(api._quizReadWorkingDraft(ns).items).toMatchObject({ 'q-0': { response: 'First answer' }, 'q-1': { response: 'Second answer' } });
    access.mockRestore(); expect(api._quizSaveWorkingDraft(ns)).toBe(true);
    expect(JSON.parse(localStorage.getItem(ns)).items['q-0'].response).toBe('First answer');
  });

  it('keeps a completed receipt when clearing the previous draft fails on restart', () => {
    const api = helpers(); const ns = 'alloflow_assess_draft_v1:restart';
    api._quizWriteDraftField(ns, 'q-0', 'response', 'Completed answer');
    const removeItem = Storage.prototype.removeItem;
    const cleanup = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (key) {
      if (key === ns) throw new DOMException('Cleanup blocked', 'SecurityError');
      return removeItem.call(this, key);
    });
    api._quizFinalizeAttempt(ns, { signature: 'v1', responses: api._quizReadWorkingDraft(ns).items });
    expect(api._quizClearAttemptReceipt(ns)).toBe(false);
    expect(api._quizReadAttemptReceipt(ns, 'v1').responses['q-0'].response).toBe('Completed answer');
    cleanup.mockRestore(); expect(api._quizClearAttemptReceipt(ns)).toBe(true);
    expect(api._quizReadAttemptReceipt(ns, 'v1')).toBeNull();
    const restarted = JSON.parse(localStorage.getItem(ns));
    expect(restarted.items.root.attemptMeta).toMatchObject({ status: 'in-progress', attemptId: expect.any(String) });
    expect(restarted.items['q-0']).toBeUndefined();
  });

  it('merges a new edit without overwriting unrelated answers saved by another tab', () => {
    const first = helpers(), second = helpers(), ns = 'alloflow_assess_draft_v1:two-tabs';
    first._quizWriteDraftField(ns, 'q-0', 'response', 'First answer');
    first._quizWriteDraftField(ns, 'q-1', 'response', 'Original second answer');
    second._quizWriteDraftField(ns, 'q-1', 'response', 'Updated in another tab');
    first._quizWriteDraftField(ns, 'q-0', 'response', 'Updated in this tab');
    expect(JSON.parse(localStorage.getItem(ns)).items).toMatchObject({
      'q-0': { response: 'Updated in this tab' },
      'q-1': { response: 'Updated in another tab' },
    });
  });
});
