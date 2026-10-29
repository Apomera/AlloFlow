// Assess reflections by hand (2026-10-29), so a blank Assess can be finished without AI:
// the Reflections section shows while editing even with none yet, "+ Add reflection"
// and "Remove reflection" work, and an empty reflection no longer shows raw JSON.
// Renders the SHIPPED view_quiz_module.js; ALLO_QUIZ_CANDIDATE points at a mutated copy.
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const _en = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const t = (key, params = {}) => { const v = key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), _en); return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (m, n) => (params[n] ?? m)) : key; };
let QuizView;
beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloT = t;
  window.AlloIcons = {};
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync(process.env.ALLO_QUIZ_CANDIDATE || 'view_quiz_module.js', 'utf8'))(window);
  QuizView = window.AlloModules.QuizView;
  if (!QuizView) throw new Error('QuizView did not register');
});

let root, host;
async function render(element) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(element));
}
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); });

const props = (data, extra) => ({
  t, isTeacherMode: true, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
  isPresentationMode: false, isReviewGame: false, isEditingQuiz: true, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
  isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', inputText: '', gradeLevel: '7th Grade',
  formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(),
  handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), handleToggleIsEditingQuiz: vi.fn(), handleToggleShowQuizAnswers: vi.fn(),
  handlePresentationOptionClick: vi.fn(), togglePresentationAnswer: vi.fn(), togglePresentationExplanation: vi.fn(), resetPresentation: vi.fn(),
  handleQuizChange: vi.fn(), handleFactCheck: vi.fn(), handleQuizQuestionAction: vi.fn(),
  handleReflectionChange: vi.fn(), handleRemoveQuizReflection: vi.fn(),
  ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null,
  generatedContent: { id: 'quiz-blank', type: 'quiz', title: 'Quiz', data },
  ...extra,
});
const q = sel => host.querySelector(sel);

describe('reflections by hand', () => {
  it('a blank Assess shows "+ Add reflection" while editing, which adds one at the end', async () => {
    const p = props({ questions: [], reflections: [] });
    await render(React.createElement(QuizView, p));
    const add = q('[data-quiz-add-reflection]');
    expect(add, 'add button in an empty quiz').not.toBe(null);
    expect(add.textContent).toContain('Add reflection');
    await act(async () => add.click());
    expect(p.handleReflectionChange).toHaveBeenCalledWith(0, '');
  });

  it('an empty reflection is an empty box, not raw JSON, and can be removed', async () => {
    const p = props({ questions: [], reflections: ['Keep this one', { text: '' }] });
    await render(React.createElement(QuizView, p));
    const boxes = [...host.querySelectorAll('textarea')].filter(el => /reflection/i.test(el.getAttribute('aria-label') || ''));
    expect(boxes.map(el => el.value)).toEqual(['Keep this one', '']);
    const remove = [...host.querySelectorAll('[data-quiz-remove-reflection]')];
    expect(remove).toHaveLength(2);
    await act(async () => remove[1].click());
    expect(p.handleRemoveQuizReflection).toHaveBeenCalledWith(1);
    await act(async () => q('[data-quiz-add-reflection]').click());
    expect(p.handleReflectionChange).toHaveBeenCalledWith(2, '');
  });

  it('outside editing, and on hosts without the remove handler, the new controls stay hidden', async () => {
    await render(React.createElement(QuizView, props({ questions: [], reflections: [] }, { isEditingQuiz: false })));
    expect(q('[data-quiz-add-reflection]')).toBe(null);
    await render(React.createElement(QuizView, props({ questions: [], reflections: ['One'] }, { handleRemoveQuizReflection: undefined })));
    expect(q('[data-quiz-remove-reflection]')).toBe(null);
    expect(q('[data-quiz-add-reflection]'), 'adding uses the existing handler, so it still works').not.toBe(null);
  });
});
