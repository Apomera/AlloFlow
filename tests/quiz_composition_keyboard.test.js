import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const t = (key, options) => options?.defaultValue || key;
const image = 'data:image/png;base64,aW1hZ2U=';
let host, root, cards;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t;
  window.AlloIcons = {}; window.AlloModules = {};
  const registration = '  window.AlloModules.QuizView = QuizView;';
  const code = readFileSync(process.env.ALLO_QUIZ_COMPOSITION_MODULE || 'view_quiz_module.js', 'utf8');
  expect(code.split(registration)).toHaveLength(2);
  new Function('window', code.replace(registration, registration + '\nwindow.__quizCompositionCards = { NumericResponseCard, FreeformItemCard };'))(window);
  cards = window.__quizCompositionCards;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; vi.restoreAllMocks();
  delete window.__quizCompositionCards;
});
async function render(component, props) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(component, props)));
}
async function change(input, value) {
  const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function key(input, options = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options });
  await act(async () => input.dispatchEvent(event));
  return event;
}
async function compose(input, type) {
  await act(async () => input.dispatchEvent(new CompositionEvent(type, { data: '文字', bubbles: true })));
}
function teacherProps(callback) {
  return {
    t, isTeacherMode: true, isParentMode: false, isIndependentMode: false,
    studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: true,
    escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    generatedContent: { id: 'composition-image', type: 'quiz', data: { title: 'Pictures', reflections: [], questions: [{ type: 'mcq', question: 'Choose a leaf.', imageUrl: image, options: ['Leaf', 'Stone'], correctAnswer: 'Leaf' }] } },
    formatInlineText: value => value, renderFormattedText: value => value,
    getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(),
    handleQuizQuestionAction: vi.fn(), handleQuizChange: vi.fn(), handleFactCheck: vi.fn(),
    handleQuizImageRefine: vi.fn(), callGeminiImageEdit: callback,
    ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null,
    ConfettiExplosion: () => null, Stamp: () => null,
  };
}
async function mount(kind) {
  const callback = vi.fn(async () => image);
  if (kind === 'image instructions') {
    await render(window.AlloModules.QuizView, teacherProps(callback));
    const open = host.querySelector('[data-help-key="quiz_image_refine_btn"]'); expect(open).toBeTruthy();
    await act(async () => open.click());
  } else {
    const q = kind === 'numeric response'
      ? { type: 'numeric-response', question: 'How many?', correctValue: 12 }
      : { type: 'fill-blank', question: 'Name the written word.', correctAnswer: '文字' };
    await render(kind === 'numeric response' ? cards.NumericResponseCard : cards.FreeformItemCard, { q, questionIdx: 0, itemNumber: 1, onSubmitLiveAnswer: callback, modeStrategy: { render: {} } });
  }
  const input = kind === 'image instructions' ? host.querySelector('textarea[aria-label="Image refinement instructions"]') : host.querySelector('input[type="text"]');
  expect(input).toBeTruthy(); input.focus();
  const value = kind === 'numeric response' ? '12' : kind === 'image instructions' ? '文字を消す' : '文字';
  await change(input, value);
  return { input, value, callback };
}

describe('Quiz composition-safe Enter shortcuts', () => {
  const kinds = ['fill-blank answer', 'numeric response', 'image instructions'];
  it.each(kinds)('leaves %s editing for ordinary keys and native composition signals', async kind => {
    const { input, value, callback } = await mount(kind);
    for (const options of [{ key: 'a' }, { isComposing: true }, { keyCode: 229 }]) {
      const event = await key(input, options);
      expect(event.defaultPrevented).toBe(false);
      expect(callback).not.toHaveBeenCalled();
      expect(input.disabled).toBe(false);
      expect(input.value).toBe(value);
    }
  });
  it.each(kinds)('tracks %s composition until compositionend even without native key flags', async kind => {
    const { input, value, callback } = await mount(kind);
    await compose(input, 'compositionstart');
    expect((await key(input)).defaultPrevented).toBe(false);
    expect(callback).not.toHaveBeenCalled(); expect(input.value).toBe(value);
    await compose(input, 'compositionend');
    expect((await key(input)).defaultPrevented).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
  });
  it.each(kinds)('clears interrupted %s composition when focus leaves the field', async kind => {
    const { input, callback } = await mount(kind);
    await compose(input, 'compositionstart');
    await act(async () => input.blur()); input.focus();
    expect((await key(input)).defaultPrevented).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
  });
  it.each(kinds)('keeps ordinary Enter submission for %s', async kind => {
    const { input, callback } = await mount(kind);
    expect((await key(input)).defaultPrevented).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
  });
  it('preserves Shift+Enter for a newline in image instructions', async () => {
    const { input, value, callback } = await mount('image instructions');
    expect((await key(input, { shiftKey: true })).defaultPrevented).toBe(false);
    expect(callback).not.toHaveBeenCalled(); expect(input.value).toBe(value);
  });
  it('keeps composition state scoped to the actual response field', async () => {
    const first = vi.fn(), second = vi.fn();
    function Pair() {
      return React.createElement(React.Fragment, null,
        React.createElement(cards.NumericResponseCard, { q: { type: 'numeric-response', question: 'First', correctValue: 12 }, questionIdx: 0, onSubmitLiveAnswer: first }),
        React.createElement(cards.NumericResponseCard, { q: { type: 'numeric-response', question: 'Second', correctValue: 12 }, questionIdx: 1, onSubmitLiveAnswer: second }));
    }
    await render(Pair, {});
    const inputs = host.querySelectorAll('input[type="text"]');
    await change(inputs[0], '12'); await change(inputs[1], '12'); await compose(inputs[0], 'compositionstart');
    expect((await key(inputs[1])).defaultPrevented).toBe(true);
    expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledOnce();
  });
});
