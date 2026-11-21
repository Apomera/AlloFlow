import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const copy = {
  'common.start_game': 'Games',
  'common.listen': 'Listen',
  'common.reset': 'Reset',
  'a11y.read_aloud': 'Listen to question',
  'quiz.review_game': 'Review Game',
  'escape_room.title': 'Puzzle Challenge',
  'escape_room.launch_live_btn': 'Launch Puzzle Challenge',
};
const t = (key, opts) => (opts && opts.defaultValue) || copy[key] || '';

const allNineQuestions = () => [
  { type: 'mcq', question: 'Which gas do plants absorb?', options: ['Carbon dioxide', 'Helium'], correctAnswer: 'Carbon dioxide', explanation: 'Plants use carbon dioxide during photosynthesis.' },
  { type: 'multi-select', question: 'Select living things.', options: ['Tree', 'Rock', 'Flower'], correctAnswers: ['Tree', 'Flower'] },
  { type: 'fill-blank', question: 'Plants make food via ___.', expectedFill: 'photosynthesis' },
  { type: 'short-answer', question: 'Why do roots grow downward?', expectedAnswer: 'To anchor and absorb water.' },
  { type: 'self-explanation', question: 'Explain transpiration.', rubric: 'Water moves from roots through leaves.' },
  { type: 'numeric-response', question: 'How many petals?', correctValue: 5, unit: 'petals' },
  { type: 'sequence-sense', question: 'Check the life cycle order.', items: ['Seed', 'Sprout', 'Tree'], presentedOrder: [1, 0, 2], orderingPrinciple: 'growth', principleOptions: ['growth', 'size'] },
  { type: 'relation-mismatch', question: 'Fix the wrong pair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Sunlight' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Stone'] },
  { type: 'answer-evidence', question: 'What helps seeds sprout?', answerOptions: ['Water', 'Plastic'], correctAnswer: 'Water', evidencePrompt: 'Choose supporting evidence.', evidenceOptions: ['Moist seeds germinated first', 'Dry plastic stayed solid'], correctEvidence: 'Moist seeds germinated first' },
];

function quizProps(extra = {}) {
  return {
    t,
    isTeacherMode: false,
    isParentMode: false,
    isIndependentMode: false,
    studentProjectSettings: {},
    activeSessionCode: null,
    sessionData: {},
    isPresentationMode: false,
    isReviewGame: false,
    isEditingQuiz: false,
    escapeRoomState: { isActive: false },
    presentationState: {},
    reviewGameState: {},
    isFactChecking: {},
    showQuizAnswers: false,
    leveledTextLanguage: 'English',
    generatedContent: {
      id: 'phase1-test-' + Math.random().toString(36).slice(2),
      type: 'quiz',
      data: {
        title: 'Plant Science Check',
        mode: 'exit-ticket',
        questions: allNineQuestions(),
        deliverySettings: { feedbackTiming: 'immediate', allowFlagging: true, showProgress: true },
      },
    },
    formatInlineText: v => v,
    renderFormattedText: v => v,
    getReviewCategories: () => [],
    getRows: () => 2,
    playSound: vi.fn(),
    addToast: vi.fn(),
    callTTS: vi.fn(),
    handleToggleIsPresentationMode: vi.fn(),
    handleToggleIsReviewGame: vi.fn(),
    handleToggleIsEditingQuiz: vi.fn(),
    handleToggleShowQuizAnswers: vi.fn(),
    ErrorBoundary: ({ children }) => children,
    TeacherLiveQuizControls: () => null,
    ConfettiExplosion: () => null,
    Stamp: () => null,
    ...extra,
  };
}

let root;
let host;

async function mount(element) {
  if (!root) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  }
  await act(async () => {
    root.render(element);
  });
}

async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => {
    el.click();
  });
}

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloT = t;
  window.AlloIcons = {};
  loadAlloModule('quiz_mode_strategies.js');
  loadAlloModule('quiz_live_aggregators.js');
  loadAlloModule('quiz_ai_helpers.js');
  loadAlloModule('view_quiz_module.js');
  loadAlloModule('view_sidebar_panels_module.js');
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = null;
  host = null;
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('Phase 1 Assessment Enhancements', () => {
  it('places MCQ confidence above choices and shows immediate correctness + explanation on tap', async () => {
    const p = quizProps({
      generatedContent: {
        id: 'mcq-immediate',
        type: 'quiz',
        data: {
          mode: 'exit-ticket',
          questions: [allNineQuestions()[0]],
          deliverySettings: { feedbackTiming: 'immediate', allowFlagging: true, showProgress: true },
        },
      },
    });
    await mount(React.createElement(window.AlloModules.QuizView, p));

    const confidenceTop = host.querySelector('[data-assessment-mcq-confidence-top]');
    expect(confidenceTop).toBeTruthy();
    const unsureBtn = [...confidenceTop.querySelectorAll('button')].find(b => b.textContent.includes('I am unsure'));
    expect(unsureBtn.disabled).toBe(false);
    await click(unsureBtn);
    expect(unsureBtn.getAttribute('aria-pressed')).toBe('true');

    // Wrong choice shows gentle Not yet feedback without leaking the correct explanation
    const heliumOpt = [...host.querySelectorAll('[id="assessment-question-0"] [role="button"]')].find(el => el.textContent.includes('Helium'));
    await click(heliumOpt);
    const resultEl = host.querySelector('[data-assessment-mcq-result]');
    expect(resultEl).toBeTruthy();
    expect(resultEl.textContent).toContain('Not yet');
    expect(resultEl.textContent).not.toContain('Plants use carbon dioxide');

    // Right choice shows Correct + authored explanation
    const co2Opt = [...host.querySelectorAll('[id="assessment-question-0"] [role="button"]')].find(el => el.textContent.includes('Carbon dioxide'));
    await click(co2Opt);
    expect(host.querySelector('[data-assessment-mcq-result]').textContent).toContain('Correct');
    expect(host.querySelector('[data-assessment-mcq-result]').textContent).toContain('Plants use carbon dioxide during photosynthesis.');
  });

  it('provides Listen (TTS) and inside-card Flag buttons across all 9 item types in immediate and deferred modes', async () => {
    for (const timing of ['immediate', 'after-submit']) {
      const callTTS = vi.fn();
      const p = quizProps({ callTTS });
      p.generatedContent.data.deliverySettings.feedbackTiming = timing;
      await mount(React.createElement(window.AlloModules.QuizView, p));

      expect(host.querySelectorAll('[data-quiz-listen]')).toHaveLength(9);
      const cards = [...host.querySelectorAll('[id^="assessment-question-"]')];
      expect(cards).toHaveLength(9);
      cards.forEach((card, idx) => {
        expect(card.querySelector(`[data-quiz-listen="${idx}"]`)).toBeTruthy();
        const flagBtn = [...card.querySelectorAll('button')].find(b => b.textContent.includes('Flag for review'));
        expect(flagBtn).toBeTruthy();
        // Flag button lives inside the white question card rather than floating outside
        expect(flagBtn.closest('.bg-white')).toBeTruthy();
      });

      // Click Listen on multi-select (index 1) and verify TTS speaks prompt without private keys
      await click(host.querySelector('[data-quiz-listen="1"]'));
      expect(callTTS).toHaveBeenCalledWith(expect.stringContaining('Select living things.'));
    }
  });

  it('unifies student top chrome into one sticky bar with an interactive question stepper', async () => {
    const p = quizProps();
    await mount(React.createElement(window.AlloModules.QuizView, p));

    const stickyBar = host.querySelector('[data-assessment-student-view]');
    expect(stickyBar).toBeTruthy();
    expect(stickyBar.querySelector('[data-assessment-feedback-note]')).toBeTruthy();
    expect(stickyBar.querySelector('[data-assessment-draft-status]')).toBeTruthy();
    expect(stickyBar.querySelector('[data-assessment-answered-count]').textContent).toBe('0 / 9');

    const stepperButtons = stickyBar.querySelectorAll('[data-assessment-stepper] button');
    expect(stepperButtons).toHaveLength(9);

    // Answer Q1 and check live answered counter + stepper checkmark update
    const co2Opt = [...host.querySelectorAll('[id="assessment-question-0"] [role="button"]')].find(el => el.textContent.includes('Carbon dioxide'));
    await click(co2Opt);
    expect(stickyBar.querySelector('[data-assessment-answered-count]').textContent).toBe('1 / 9');
    expect(stickyBar.querySelectorAll('[data-assessment-stepper] button')[0].getAttribute('aria-label')).toContain('answered');
  });

  it('consolidates the Games drawer into 4 clear archetype cards while preserving all launch controls', async () => {
    const p = quizProps({
      isTeacherMode: true,
      activeSessionCode: 'ROOM1',
      sessionData: { quizState: { isActive: false }, roster: {} },
      launchConceptQuest: vi.fn(),
      launchCollaborativeEscapeRoom: vi.fn(),
    });
    await mount(React.createElement(window.AlloModules.QuizView, p));

    await click(host.querySelector('[data-quiz-games-toggle]'));
    const drawer = host.querySelector('#quiz-games-tools');
    expect(drawer).toBeTruthy();
    const cards = drawer.querySelectorAll('.grid > div');
    expect(cards).toHaveLength(4);
    expect(drawer.querySelector('[data-quiz-game="review"]')).toBeTruthy();
    expect(drawer.querySelector('[data-open-connected-room]')).toBeTruthy();
    expect(drawer.querySelector('[data-open-lesson-board]')).toBeTruthy();
    expect(drawer.querySelector('[data-open-concept-quest-solo]')).toBeTruthy();
    expect(drawer.querySelector('[data-open-concept-quest]')).toBeTruthy();
  });

  it('renders context-aware format rules and steppers in QuizPanel', async () => {
    function Harness() {
      const [quizMode, setQuizMode] = React.useState('exit-ticket');
      const [quizMcqCount, setQuizMcqCount] = React.useState(3);
      const [quizReflectionCount, setQuizReflectionCount] = React.useState(1);
      const [quizItemTypeMix, setQuizItemTypeMix] = React.useState({ mcq: 3 });
      const [mcqVisualMode, setMcqVisualMode] = React.useState('none');
      const [quizCustomInstructions, setQuizCustomInstructions] = React.useState('');
      return React.createElement(window.AlloModules.QuizPanel, {
        InfoTooltip: () => null,
        dokLevel: '',
        expandedTools: ['quiz'],
        generatedContent: null,
        handleGenerate: vi.fn(),
        hasSourceOrAnalysis: true,
        history: [],
        imageStyle: '',
        isProcessing: false,
        mcqVisualMode,
        quizCustomInstructions,
        quizMcqCount,
        quizMode,
        quizReflectionCount,
        quizItemTypeMix,
        setDokLevel: vi.fn(),
        setImageStyle: vi.fn(),
        setMcqVisualMode,
        setQuizCustomInstructions,
        setQuizMcqCount,
        setQuizMode,
        setQuizReflectionCount,
        setQuizItemTypeMix,
        t,
      });
    }

    await mount(React.createElement(Harness));
    // Active mix chips visible immediately without expanding Customize
    const chips = host.querySelector('[data-quiz-active-mix-chips]');
    expect(chips).toBeTruthy();
    expect(chips.textContent).toContain('3 Multiple Choice');

    // Open Customize questions
    await click(host.querySelector('[data-help-key="quiz_item_mix_toggle"]'));
    // With only MCQ > 0, no format-specific options block renders
    expect(host.querySelector('[data-quiz-context-format-options]')).toBeNull();

    // Increment Numeric Response using the + stepper button -> numeric options appear immediately
    const incNumeric = host.querySelector('button[aria-label="Increase Numeric Response"]');
    await click(incNumeric);
    const contextOpts = host.querySelector('[data-quiz-context-format-options]');
    expect(contextOpts).toBeTruthy();
    expect(contextOpts.textContent).toContain('Numeric partial credit');
    expect(contextOpts.textContent).not.toContain('Fill-in-the-blank');
    expect(contextOpts.textContent).not.toContain('Sequence activity');

    // Decrement back to 0 -> options cleanly hide again
    await click(host.querySelector('button[aria-label="Decrease Numeric Response"]'));
    expect(host.querySelector('[data-quiz-context-format-options]')).toBeNull();
  });
});
