// Fewer controls before the first question.
//
// WHY (2026-09-24 audit): a teacher met 14 controls before question 1 (quality
// review, five delivery controls, a student's concept explainer, the preview and
// the facilitator row); a student met a two-control explainer before the
// "Your assessment" heading, no way to skip to the questions, and, when timed,
// two "Review & submit" buttons one above the other. Now the teacher's settings
// share one drawer whose button names what is set (a failed quality check stays
// in view), the explainer is a collapsed learner support, the heading comes
// first, and a skip button leads to the questions.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let root, host, serial = 0;
const t = (key, opts) => opts?.defaultValue || key;
const questions = () => [
  { type: 'mcq', question: 'Choose sunlight.', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight', factCheck: 'Plants use light.' },
  { type: 'short-answer', question: 'Explain root growth.', expectedAnswer: 'Roots grow toward water.' },
];
function props(extra = {}, data = {}) {
  return { t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {}, isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {}, isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', generatedContent: { id: 'drawer-' + (++serial), type: 'quiz', data: { title: 'Quiz ' + serial, questions: questions(), deliverySettings: { feedbackTiming: 'after-submit' }, ...data } }, formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(), handleToggleIsPresentationMode: vi.fn(), ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null, ...extra };
}
const node = s => host.querySelector(s);
async function render(p) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(React.createElement(window.AlloModules.QuizView, p))); }
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {}; new Function('window', readFileSync('quiz_mode_strategies.js', 'utf8'))(window); new Function('window', readFileSync(process.env.ALLO_ASSESS_CANDIDATE || 'view_quiz_module.js', 'utf8'))(window); });
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); sessionStorage.clear(); });

describe('the teacher settings drawer', () => {
  it('holds the delivery settings, closed, and its button names what is set', async () => {
    await render(props({ isTeacherMode: true }));
    const toggle = node('[data-assessment-settings-toggle]');
    const panel = node('#assessment-settings-panel');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(panel.querySelector('[data-assessment-feedback-timing]')).not.toBeNull();
    expect(toggle.textContent).toContain('Feedback after submission');
    await act(async () => toggle.click());
    expect(panel.hidden).toBe(false);
  });
  it('keeps a failed quality check in view, and puts a passing one in the drawer', async () => {
    await render(props({ isTeacherMode: true }, { questions: [{ type: 'mcq', question: 'Pick one.', options: ['A', 'B'], correctAnswer: 'Z' }] }));
    const failed = node('[aria-label="Assessment quality review"]');
    expect(failed).not.toBeNull();
    expect(node('#assessment-settings-panel').contains(failed)).toBe(false);
    await act(async () => root.unmount()); host.remove(); root = null;
    await render(props({ isTeacherMode: true }));
    const passing = node('[aria-label="Assessment quality review"]');
    expect(passing).not.toBeNull();
    expect(node('#assessment-settings-panel').contains(passing)).toBe(true);
  });
  it('is not there for a student', async () => {
    await render(props());
    expect(node('[data-assessment-settings-drawer]')).toBeNull();
  });
});

describe('the concept explainer', () => {
  it('is a collapsed support for a student, asking its question', async () => {
    await render(props({ callGemini: vi.fn() }, { mode: 'exit-ticket', deliverySettings: { feedbackTiming: 'immediate' } }));
    const explainer = node('[data-quiz-explainer]');
    expect(explainer.tagName).toBe('DETAILS');
    expect(explainer.open).toBe(false);
    expect(explainer.querySelector('summary').textContent).toContain("Don't know a concept?");
    expect(explainer.querySelector('input[aria-label="Concept to explain"]')).not.toBeNull();
  });
  it('is not shown to teachers or parents', async () => {
    await render(props({ isTeacherMode: true, callGemini: vi.fn() }, { mode: 'exit-ticket', deliverySettings: { feedbackTiming: 'immediate' } }));
    expect(node('[data-quiz-explainer]')).toBeNull();
    await act(async () => root.unmount()); host.remove(); root = null;
    await render(props({ isParentMode: true, callGemini: vi.fn() }, { mode: 'exit-ticket', deliverySettings: { feedbackTiming: 'immediate' } }));
    expect(node('[data-quiz-explainer]')).toBeNull();
  });
});

describe('a student', () => {
  it('meets the "Your assessment" heading before the explainer', async () => {
    await render(props({ callGemini: vi.fn() }, { mode: 'exit-ticket', deliverySettings: { feedbackTiming: 'immediate' } }));
    const heading = node('[data-assessment-student-view]');
    const explainer = node('[data-quiz-explainer]');
    expect(heading.compareDocumentPosition(explainer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('can skip straight to the first question, first thing', async () => {
    await render(props({ callGemini: vi.fn() }, { mode: 'exit-ticket', deliverySettings: { feedbackTiming: 'immediate' } }));
    const first = host.querySelector('button, input, select, textarea, a[href], summary');
    expect(first.hasAttribute('data-assessment-skip')).toBe(true);
    await act(async () => first.click());
    expect(document.activeElement.id).toMatch(/^assessment-question-/);
  });
  it('has one "Review & submit" in a timed attempt', async () => {
    await render(props({}, { deliverySettings: { feedbackTiming: 'after-submit', timeLimitMinutes: 10, pacing: 'all-at-once' } }));
    expect(node('[aria-label="Assessment timer"]')).not.toBeNull();
    expect([...host.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Review & submit')).toHaveLength(1);
  });
});
