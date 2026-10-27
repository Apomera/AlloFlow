import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let QuizView, root, host;
const t = (key, opts) => opts?.defaultValue || ({ 'review_game.reveal_answer': 'Reveal answer', 'review_game.no_points': 'No points', 'common.close': 'Close', 'review_game.title': 'Review game' }[key] || key);
const questions = [
  { type: 'mcq', question: 'What supports plant growth?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight' },
  { type: 'mcq', question: 'What do roots absorb?', options: ['Water', 'Stone'], correctAnswer: 'Water' }
];
const common = {
  t, isTeacherMode: true, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
  isPresentationMode: false, isReviewGame: true, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {},
  isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', scoreAnimation: {},
  formatInlineText: v => v, renderFormattedText: v => v, getRows: () => 1, playSound: () => {}, addToast: () => {},
  handleManualScore: () => {}, handleAddTeam: () => {}, handleRemoveTeam: () => {}, setConfirmDialog: () => {},
  ErrorBoundary: p => p.children, TeacherLiveQuizControls: () => null
};
function Harness({ mode = 'review', count = 2 }) {
  const [game, setGame] = React.useState({ claimed: new Set(), activeQuestion: null, showAnswer: false });
  const [sound, setSound] = React.useState(false);
  const [teams, setTeams] = React.useState([{ id: 1, name: 'Red team', color: 'bg-red-500', score: 0 }]);
  const content = React.useMemo(() => ({ id: 'wcag-review-' + mode, type: 'quiz', data: { questions: questions.slice(0, count), deliverySettings: { feedbackTiming: 'immediate' } } }), [mode, count]);
  const close = completed => setGame(prev => ({ ...prev, claimed: completed ? new Set([...prev.claimed, prev.activeQuestion.originalIndex]) : prev.claimed, activeQuestion: null, showAnswer: false }));
  return React.createElement(QuizView, { ...common, generatedContent: content,
    isTeacherMode: mode !== 'student', isReviewGame: mode === 'review', isPresentationMode: mode === 'presentation',
    reviewGameState: game, setReviewGameState: setGame, soundEnabled: sound, setSoundEnabled: setSound,
    gameTeams: teams, setGameTeams: setTeams,
    getReviewCategories: () => [{ name: 'Plants', questions: content.data.questions.map((q, originalIndex) => ({ ...q, originalIndex, points: 100 })) }],
    handleReviewTileClick: q => setGame(prev => ({ ...prev, activeQuestion: q, showAnswer: false })),
    closeReviewModal: close, handleAwardPoints: () => close(true)
  });
}
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {}; window.AlloIcons = {}; window.__alloT = t;
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, compact: false }).code;
  QuizView = new Function('React', 'window', code + ';return QuizView;')(React, window);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); sessionStorage.clear(); });
async function mount(props) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(React.createElement(Harness, props))); }
async function click(el) { expect(el).toBeTruthy(); el.focus(); await act(async () => el.click()); }
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
async function openTile(index) { await click(host.querySelector('[data-review-tile="' + index + '"]')); await act(async () => new Promise(resolve => setTimeout(resolve, 40))); }

describe('Review Game keyboard continuation', () => {
  it('isolates the dialog background and restores it on close', async () => {
    await mount(); const board = host.querySelector('[data-review-board]'); await openTile(0);
    expect(board.getAttribute('aria-hidden')).toBe('true'); expect(board.inert).toBe(true);
    await click(host.querySelector('[role="dialog"] button[aria-label="Close"]'));
    expect(board.hasAttribute('aria-hidden')).toBe(false); expect(board.inert).toBe(false);
  });
  it('restores the same unanswered tile after closing the dialog', async () => {
    await mount(); await openTile(0); await click(host.querySelector('[role="dialog"] button[aria-label="Close"]'));
    expect(document.activeElement).toBe(host.querySelector('[data-review-tile="0"]'));
  });
  it('moves focus to the award instructions after revealing', async () => {
    await mount(); await openTile(0); await click(button('Reveal answer'));
    expect(document.activeElement).toBe(host.querySelector('[data-review-award-help]'));
  });
  it.each(['Red team', 'No points'])('continues on the next tile after %s', async action => {
    await mount(); await openTile(0); await click(button('Reveal answer')); await click(button(action));
    expect(host.querySelector('[data-review-tile="0"]').disabled).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('[data-review-tile="1"]'));
  });
  it('wraps to an earlier unfinished tile and focuses the board heading when complete', async () => {
    await mount(); await openTile(1); await click(button('Reveal answer')); await click(button('Red team'));
    expect(document.activeElement).toBe(host.querySelector('[data-review-tile="0"]'));
    await openTile(0); await click(button('Reveal answer')); await click(button('Red team'));
    expect(document.activeElement).toBe(host.querySelector('[data-review-board-heading]'));
  });
  it('exposes sound state under a stable accessible name', async () => {
    await mount(); const sound = host.querySelector('button[aria-label="Sound effects"]');
    expect(sound.getAttribute('aria-pressed')).toBe('false'); await click(sound);
    expect(sound.getAttribute('aria-pressed')).toBe('true'); await click(sound);
    expect(sound.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('MCQ state survives loss of color styling', () => {
  it('marks only the currently selected answer with visible text', async () => {
    await mount({ mode: 'student' }); const choices = host.querySelectorAll('#assessment-question-0 [role="button"]');
    await click(choices[0]); expect(choices[0].querySelector('[data-assessment-selected-choice]').textContent).toContain('Selected');
    expect(choices[0].getAttribute('aria-pressed')).toBe('true'); await click(choices[1]);
    expect(choices[0].querySelector('[data-assessment-selected-choice]')).toBeNull();
    expect(choices[1].querySelector('[data-assessment-selected-choice]').textContent).toContain('Selected');
  });
  it('marks the presentation choice before the answer is revealed', async () => {
    await mount({ mode: 'presentation' });
    const choice = [...host.querySelectorAll('[data-presentation-question-type="mcq"] button')].find(el => el.textContent.includes('Sunlight'));
    await click(choice); expect(choice.querySelector('[data-assessment-selected-choice]').textContent).toBe('✓');
    expect(choice.getAttribute('aria-pressed')).toBe('true');
  });
});
