import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// The AlloPack spec (docs/ALLOPACK_FORMAT_SPEC.md) spells short answers `shortAnswer`; the quiz
// runtime uses `short-answer`. ~30 catalog packs used the spec spelling and the in-app assessment
// flagged every such item "Unsupported question type" (verified live 2026-10-26).
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const t = key => key;
let QuizView, api, root, host;

beforeEach(() => {
  localStorage.clear(); global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {}; window.AlloModules = {};
  const registration = '  window.AlloModules.QuizView = QuizView;';
  const source = readFileSync('view_quiz_module.js', 'utf8');
  expect(source.includes(registration)).toBe(true);
  new Function('window', source.replace(registration, registration + '\n window.__quizSpellingTest={compatible:_quizCompatibleFeedbackSignatures,signature:_quizFeedbackSignature,canonical:_quizCanonicalContent};'))(window);
  QuizView = window.AlloModules.QuizView; api = window.__quizSpellingTest;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); });

const quiz = () => ({ id: 'spelling-quiz', type: 'quiz', title: 'Check', data: { title: 'Check', reflections: [], questions: [
  { type: 'mcq', question: 'Pick one.', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', conceptLabel: 'pick' },
  { type: 'shortAnswer', question: 'Explain your reason.', expectedAnswer: 'A reason linked to a fact.', conceptLabel: 'reason' },
] } });
const props = extra => ({ t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {}, isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {}, isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(), handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), handleToggleIsEditingQuiz: vi.fn(), handleToggleShowQuizAnswers: vi.fn(), handlePresentationOptionClick: vi.fn(), togglePresentationAnswer: vi.fn(), togglePresentationExplanation: vi.fn(), resetPresentation: vi.fn(), handleQuizChange: vi.fn(), handleFactCheck: vi.fn(), ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null, generatedContent: quiz(), learnerResponseScope: 'spelling', ...extra });
async function render(p) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => { root.render(React.createElement(QuizView, props(p))); await Promise.resolve(); });
}

describe('shortAnswer (AlloPack spec spelling) works like short-answer', () => {
  it('raises no unsupported-type error in the teacher review', async () => {
    await render({ isTeacherMode: true });
    expect(host.textContent).not.toMatch(/Unsupported question type/);
  });
  it('gives the learner a written-response box for the item', async () => {
    await render({});
    expect(host.textContent).toContain('Explain your reason.');
    expect(host.querySelectorAll('textarea').length).toBeGreaterThan(0);
  });
  it('leaves the authored resource unchanged and other quizzes untouched', () => {
    const content = quiz(), before = JSON.stringify(content);
    expect(api.canonical(content).data.questions[1].type).toBe('short-answer');
    expect(JSON.stringify(content)).toBe(before);
    const already = { data: { questions: [{ type: 'short-answer', question: 'Q' }] } };
    expect(api.canonical(already)).toBe(already);
  });
  it('keeps responses saved under the shortAnswer spelling restorable', () => {
    const raw = quiz().data, canonical = api.canonical(quiz()).data;
    expect(api.compatible(canonical)).toContain(api.signature(raw));
  });
  it('lets live-session tallies treat the spec spelling as short-answer', () => {
    new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
    const normalize = window.AlloModules.QuizLiveAggregators.normalizeItemType;
    expect(normalize({ type: 'shortAnswer' })).toBe('short-answer');
    expect(normalize({ type: 'short-answer' })).toBe('short-answer');
    expect(readFileSync('desktop/web-app/public/quiz_live_aggregators.js', 'utf8')).toBe(readFileSync('quiz_live_aggregators.js', 'utf8'));
    expect(readFileSync('desktop/web-app/public/view_quiz_module.js', 'utf8')).toBe(readFileSync('view_quiz_module.js', 'utf8'));
  });
});
