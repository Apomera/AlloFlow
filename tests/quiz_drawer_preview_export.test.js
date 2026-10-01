// A teacher's Preview as student and Export QTI live in the settings drawer.
//
// WHY (2026-09-28, cleanup item 8): above the first question a teacher met a
// full-width "Preview as student" row, the settings drawer, and a tool row that
// also held Export QTI (named "Canvas Quiz (QTI)" for screen readers while it
// showed "Export QTI"). Both now sit in the drawer, now titled "Settings, preview
// and export". The preview banner appears only while previewing, to leave it;
// focus moves to its Exit button and back to the drawer button afterwards.
// Parents have no drawer and keep the banner with its Preview button.
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
function props(extra = {}) {
  return { t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {}, isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {}, isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', generatedContent: { id: 'tools-' + (++serial), type: 'quiz', data: { title: 'Quiz ' + serial, questions: questions(), deliverySettings: { feedbackTiming: 'after-submit' } } }, formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(), handleToggleIsPresentationMode: vi.fn(), handleExportQTI: vi.fn(), ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null, ...extra };
}
const node = s => host.querySelector(s);
const all = s => [...host.querySelectorAll(s)];
async function render(p) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(React.createElement(window.AlloModules.QuizView, p))); }
const click = async el => act(async () => el.click());
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {}; new Function('window', readFileSync('quiz_mode_strategies.js', 'utf8'))(window); new Function('window', readFileSync(process.env.ALLO_ASSESS_CANDIDATE || 'view_quiz_module.js', 'utf8'))(window); });
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); sessionStorage.clear(); });

describe('a teacher', () => {
  it('finds Preview and Export QTI in the drawer, and nowhere else', async () => {
    await render(props({ isTeacherMode: true }));
    const panel = node('#assessment-settings-panel');
    expect(node('[data-assessment-settings-toggle]').textContent).toContain('Settings, preview and export');
    expect(node('[data-assessment-preview-controls]')).toBeNull();
    expect(all('[data-assessment-preview-toggle]').map(b => panel.contains(b))).toEqual([true]);
    expect(all('button').filter(b => b.textContent.includes('quiz.export_qti_btn')).map(b => panel.contains(b))).toEqual([true]);
  });

  it('exports with a button named by its visible text', async () => {
    const p = props({ isTeacherMode: true });
    await render(p);
    const button = node('[data-assessment-export-qti]');
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.textContent.trim()).toBe('quiz.export_qti_btn');
    await click(button);
    expect(p.handleExportQTI).toHaveBeenCalledTimes(1);
  });

  it('gets no Export button when the host cannot export, and none in independent mode', async () => {
    await render(props({ isTeacherMode: true, handleExportQTI: undefined }));
    expect(node('[data-assessment-export-qti]')).toBeNull();
    expect(node('#assessment-settings-panel [data-assessment-preview-toggle]')).not.toBeNull();
    await act(async () => root.unmount()); host.remove(); root = null;
    await render(props({ isTeacherMode: true, isIndependentMode: true }));
    expect(node('[data-assessment-export-qti]')).toBeNull();
  });

  it('keeps the drawer during a live quiz, when it holds only Preview and Export', async () => {
    await render(props({ isTeacherMode: true, activeSessionCode: 'ABCDE', sessionData: { quizState: { isActive: true } } }));
    const panel = node('#assessment-settings-panel');
    expect(panel.querySelector('[data-assessment-feedback-timing]')).toBeNull();
    expect(panel.querySelector('[data-assessment-export-qti]')).not.toBeNull();
    expect(panel.querySelector('[data-assessment-preview-toggle]')).not.toBeNull();
  });

  it('moves focus to Exit when preview opens and back to the drawer button when it closes', async () => {
    await render(props({ isTeacherMode: true }));
    await click(node('#assessment-settings-panel [data-assessment-preview-toggle]'));
    const exit = node('[data-assessment-preview-controls] [data-assessment-preview-toggle]');
    expect(exit.textContent).toBe('Exit student preview');
    expect(node('[data-assessment-preview-controls]').textContent).toContain('Student preview.');
    expect(document.activeElement).toBe(exit);
    expect(node('[data-assessment-settings-drawer]')).toBeNull();
    await click(exit);
    expect(node('[data-assessment-preview-controls]')).toBeNull();
    expect(document.activeElement).toBe(node('[data-assessment-settings-toggle]'));
  });
});

describe('others', () => {
  it('a parent keeps the banner with its Preview button, and has no drawer', async () => {
    await render(props({ isParentMode: true }));
    const banner = node('[data-assessment-preview-controls]');
    expect(banner.textContent).toContain("from the learner's perspective");
    expect(banner.querySelector('[data-assessment-preview-toggle]').textContent).toBe('Preview as student');
    expect(node('[data-assessment-settings-drawer]')).toBeNull();
    await click(banner.querySelector('[data-assessment-preview-toggle]'));
    expect(node('[data-assessment-preview-controls] [data-assessment-preview-toggle]').textContent).toBe('Exit student preview');
  });

  it('a student sees neither', async () => {
    await render(props());
    expect(node('[data-assessment-preview-controls]')).toBeNull();
    expect(node('[data-assessment-preview-toggle]')).toBeNull();
    expect(node('[data-assessment-export-qti]')).toBeNull();
  });
});

it('registers the banner and button text in both string tables', () => {
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const text = readFileSync(file, 'utf8');
    const quiz = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).quiz;
    expect(quiz.settings_drawer, file).toBe('Settings, preview and export');
    for (const key of ['preview_as_student', 'exit_preview', 'preview_banner_title', 'preview_banner_body', 'preview_parent_hint']) expect(typeof quiz[key], file + ' ' + key).toBe('string');
  }
});
