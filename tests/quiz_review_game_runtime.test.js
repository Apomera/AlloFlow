import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const fixtures = [
  { type: 'mcq', question: 'Which phase?', options: ['Liquid', 'Solid'], correctAnswer: 'Solid', guide: 'Answer: Solid' },
  { type: 'multi-select', question: 'Choose two phases.', options: ['Solid', 'Liquid', 'Heat'], correctAnswers: ['Solid', 'Liquid'], guide: 'Correct selections: Solid; Liquid' },
  { type: 'fill-blank', question: 'Water freezes into ___.', expectedFill: 'ice', acceptableAlternatives: ['solid water'], guide: 'Expected fill: iceAlso accept: solid water' },
  { type: 'short-answer', question: 'Explain the change.', expectedAnswer: 'The particles lose energy.', guide: 'Expected answer: The particles lose energy.' },
  { type: 'self-explanation', question: 'Explain your evidence.', rubric: 'Connect particle motion to temperature.', guide: 'Success criteria: Connect particle motion to temperature.' },
  { type: 'sequence-sense', question: 'Order the cycle.', items: ['Evaporation', 'Condensation', 'Precipitation'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0, orderingPrinciple: 'Follow the movement of water.', guide: 'Correct order: Evaporation → Condensation → Precipitation' },
  { type: 'relation-mismatch', question: 'Fix the mismatch.', pairs: [{ left: 'Solid', right: 'Fixed shape' }, { left: 'Liquid', right: 'Fills all space' }], wrongPairIndex: 1, correctPartnerForWrong: 'Takes container shape', candidatePartners: ['Takes container shape', 'Fixed shape'], guide: 'Fix the mismatch: Liquid → Takes container shape' },
  { type: 'answer-evidence', question: 'Which process formed the drops?', answerOptions: ['Condensation', 'Evaporation'], correctAnswer: 'Condensation', evidencePrompt: 'Which observation supports the process?', evidenceOptions: ['The glass is cold.', 'The glass is tall.'], correctEvidence: 'The glass is cold.', guide: 'Answer: CondensationEvidence: The glass is cold.' },
  { type: 'numeric-response', question: 'At what temperature?', correctValue: 0, tolerance: 0.5, unit: '°C', guide: 'Expected value: 0 °C (±0.5)' },
];
const copy = { 'review_game.reveal_answer': 'Reveal answer', 'review_game.no_points': 'No points', 'common.close': 'Close', 'review_game.title': 'Review game' };
const t = key => copy[key] || key;
const app = readFileSync('AlloFlowANTI.txt', 'utf8');
const start = app.indexOf('  const handleReviewTileClick = (question, points) => {');
const handlers = app.slice(start, app.indexOf('  const toggleTheme = () => {', start));
let root, host, awarded;

function Harness({ questions }) {
  const [reviewGameState, setReviewGameState] = React.useState({ claimed: new Set(), activeQuestion: null, showAnswer: false });
  const generatedContent = React.useMemo(() => ({ id: 'mixed-review', type: 'quiz', data: { questions } }), [questions]);
  const methods = new Function('generatedContent', 't', 'setReviewGameState', 'playSound', handlers + '\nreturn { getReviewCategories, handleReviewTileClick, closeReviewModal };')(generatedContent, t, setReviewGameState, () => {});
  return React.createElement(window.AlloModules.QuizView, {
    t, generatedContent, reviewGameState, setReviewGameState, ...methods,
    isTeacherMode: false, isParentMode: false, isIndependentMode: true, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: true, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {},
    soundEnabled: false, globalPoints: 0, inputText: '', isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    gameTeams: [{ id: 1, name: 'Team One', color: 'bg-red-700', score: 0 }], scoreAnimation: {},
    setGameTeams: vi.fn(), setSoundEnabled: vi.fn(), setConfirmDialog: vi.fn(), handleManualScore: vi.fn(), handleAddTeam: vi.fn(),
    handleAwardPoints: (id, points) => { awarded(id, points); methods.closeReviewModal(true); },
    addToast: vi.fn(), getRows: () => 1, formatInlineText: value => value, renderFormattedText: value => value, playSound: () => {},
  });
}
async function mount(questions = fixtures) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, { questions })));
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
const button = name => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === name);

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.__alloT = t;
  loadAlloModule('view_quiz_module.js');
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  window.localStorage.clear(); window.sessionStorage.clear();
});

describe('Review Game mixed-format experience', () => {
  it.each(fixtures)('opens and reveals the $type answer guide, then awards and completes that tile', async question => {
    awarded = vi.fn();
    await mount();
    const index = fixtures.indexOf(question);
    expect(host.querySelectorAll('[data-review-tile]')).toHaveLength(fixtures.length);
    expect(host.querySelector('[data-review-progress]').textContent).toBe('0 of 9 items completed · 3 categories');
    await click(host.querySelector('[data-review-tile="' + index + '"]'));
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.querySelectorAll('h3')).toHaveLength(1);
    expect(dialog.querySelector('[data-review-question-type="' + question.type + '"]')).toBeTruthy();
    expect(dialog.querySelector('[data-review-answer-guide]')).toBeNull();
    expect(dialog.querySelectorAll('button[aria-label="Reveal answer"]')).toHaveLength(1);
    if (question.type === 'sequence-sense') expect([...dialog.querySelectorAll('li')].map(node => node.textContent)).toEqual(['1Condensation', '2Evaporation', '3Precipitation']);
    if (question.type === 'answer-evidence') expect(dialog.textContent).toContain(question.evidencePrompt);
    await click(button('Reveal answer'));
    expect(dialog.querySelector('[data-review-answer-guide]').textContent).toContain(question.guide);
    await click(button('Team One'));
    expect(awarded).toHaveBeenCalledWith(1, (Math.floor(index / 3) + 1) * 100);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector('[data-review-tile="' + index + '"]').disabled).toBe(true);
    expect(host.querySelector('[data-review-progress]').textContent).toBe('1 of 9 items completed · 3 categories');
  });

  it('shows authored imagery and withholds the explanation until reveal', async () => {
    await mount([{ ...fixtures[3], imageUrl: 'https://example.test/particles.png', imageAltText: 'Widely spaced particles', factCheck: 'Less particle motion means less thermal energy.' }]);
    await click(host.querySelector('[data-review-tile]'));
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.querySelector('img').alt).toBe('Widely spaced particles');
    expect(dialog.textContent).not.toContain('Less particle motion');
    await click(button('Reveal answer'));
    expect(dialog.textContent).toContain('Less particle motion means less thermal energy.');
  });

  it('closing a question leaves it available and No points completes it', async () => {
    await mount([fixtures[8]]);
    await click(host.querySelector('[data-review-tile]'));
    await click(host.querySelector('button[aria-label="Close"]'));
    expect(host.querySelector('[data-review-tile]').disabled).toBe(false);
    await click(host.querySelector('[data-review-tile]'));
    await click(button('Reveal answer'));
    await click(button('No points'));
    expect(host.querySelector('[data-review-tile]').disabled).toBe(true);
    expect(host.querySelector('[data-review-progress]').textContent).toBe('1 of 1 items completed · 1 category');
  });
});
