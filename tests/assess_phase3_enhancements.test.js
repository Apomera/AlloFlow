import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;

beforeAll(() => {
  React = require(path.join(modulesDir, 'react'));
  ReactDOMClient = require(path.join(modulesDir, 'react-dom/client'));
  ({ act } = require(path.join(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('quiz_mode_strategies.js');
  loadAlloModule('quiz_live_aggregators.js');
  loadAlloModule('quiz_ai_helpers.js');
  loadAlloModule('view_quiz_module.js');
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  delete window.__alloFirebase;
  vi.restoreAllMocks();
});

const plainT = (key, opts) => (opts && opts.defaultValue) || ({
  'quiz.presentation_board': 'Presentation board',
  'quiz.reset_board': 'Reset Board',
  'quiz.reveal_answer': 'Reveal answer',
  'quiz.hide_answer': 'Hide answer',
  'quiz.show_explanation': 'Show explanation',
  'quiz.hide_explanation': 'Hide explanation',
  'ui_common.explain_to_class': 'Explain to class',
  'ui_common.close': 'Close',
  'ui_common.try_again': 'Try again',
  'ui_common.i_dont_know': "I don't know",
  'a11y.live_results_dashboard': 'Live results dashboard',
  'a11y.close_concept_explainer': 'Close concept explainer',
}[key] || '');

function baseQuizProps(overrides = {}) {
  return {
    t: plainT,
    isTeacherMode: true,
    isParentMode: false,
    isIndependentMode: false,
    isPresentationMode: false,
    isReviewGame: false,
    isEditingQuiz: false,
    showQuizAnswers: false,
    escapeRoomState: { isActive: false },
    activeSessionCode: '',
    sessionData: {},
    user: { uid: 'teacher-p3' },
    formatInlineText: (s) => s,
    renderFormattedText: (s) => s,
    getRows: () => 2,
    playSound: vi.fn(),
    addToast: vi.fn(),
    callTTS: vi.fn(),
    callGemini: vi.fn(async () => 'A clear 70-word class refresher with one concrete example.'),
    ErrorBoundary: ({ children }) => children,
    TeacherLiveQuizControls: () => null,
    ConfettiExplosion: () => null,
    Stamp: () => null,
    ...overrides,
  };
}

function setInputValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Phase 3 — Presentation Stage, Live Action Bridge & Final Parity', () => {
  it('supports keyboard shortcuts, think timer, Projector Clean View, Listen, and interactive discussion across non-MCQ presentation slides', async () => {
    const QuizView = window.AlloModules.QuizView;
    const questions = [
      {
        type: 'mcq',
        question: 'Which gas drives photosynthesis?',
        options: ['Carbon dioxide', 'Argon'],
        correctAnswer: 'Carbon dioxide',
        factCheck: '[[KEY:CONFIRMED]]\nPlants absorb carbon dioxide through stomata.',
      },
      {
        type: 'multi-select',
        question: 'Select all liquids at room temperature.',
        options: ['Water', 'Iron', 'Mercury'],
        correctAnswers: ['Water', 'Mercury'],
      },
      {
        type: 'sequence-sense',
        question: 'Order the water cycle steps.',
        items: ['Evaporation', 'Condensation', 'Precipitation'],
        presentedOrder: [1, 0, 2],
        intentionallyWrongIndex: 0,
        orderingPrinciple: 'process',
        principleOptions: ['process', 'size', 'hierarchy'],
      },
      {
        type: 'relation-mismatch',
        question: 'Spot the mismatched pair.',
        pairs: [{ left: 'Heart', right: 'Blood' }, { left: 'Lungs', right: 'Digestion' }, { left: 'Brain', right: 'Signals' }],
        wrongPairIndex: 1,
        correctPartnerForWrong: 'Breathing',
        candidatePartners: ['Breathing', 'Digestion'],
      },
      {
        type: 'short-answer',
        question: 'Why do roots grow downward?',
        expectedAnswer: 'Gravity guides root growth toward water and nutrients.',
      },
    ];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    try {
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({
          isPresentationMode: true,
          generatedContent: { id: 'p3-present-1', type: 'quiz', data: { questions } },
        })));
      });

      // Slide 1 (MCQ): Listen button present, keyboard R reveals answer, E reveals explanation
      expect(host.querySelector('[data-quiz-listen="0"]')).toBeTruthy();
      expect(host.querySelector('[data-presentation-visibility]').textContent).toContain('are hidden');
      await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true })); });
      expect(host.querySelector('[data-presentation-visibility]').textContent).toContain('1');
      await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); });
      expect(host.textContent).toContain('Plants absorb carbon dioxide');

      // Think-time timer & Projector Clean View toggle
      await act(async () => { host.querySelector('[data-presentation-think-btn="15"]').click(); });
      expect(host.querySelector('[data-presentation-think-bar]')).toBeTruthy();
      await act(async () => { host.querySelector('[data-presentation-think-skip]').click(); });
      expect(host.querySelector('[data-presentation-think-bar]')).toBeNull();

      const cleanBtn = host.querySelector('[data-presentation-clean-toggle]');
      await act(async () => { cleanBtn.click(); });
      expect(host.querySelector('[data-assessment-presentation]').getAttribute('data-presentation-clean-view')).toBe('true');

      // ArrowRight advances to Slide 2 (Multi-select): interactive discussion picks work neutrally
      await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
      expect(host.querySelector('[data-presentation-question-type="multi-select"]')).toBeTruthy();
      expect(host.querySelector('[data-quiz-listen="1"]')).toBeTruthy();
      const msOpt0 = host.querySelector('[data-presentation-multi-opt="0"]');
      await act(async () => { msOpt0.click(); });
      expect(msOpt0.getAttribute('aria-pressed')).toBe('true');
      expect(msOpt0.textContent).toContain('Discussion');

      // ArrowRight advances to Slide 3 (Sequence Sense): interactive reorder works
      await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
      const seqListBefore = Array.from(host.querySelectorAll('[data-presentation-question-type="sequence-sense"] ol li')).map((li) => li.textContent);
      expect(seqListBefore[0]).toContain('Condensation');
      await act(async () => { host.querySelector('[data-presentation-seq-down="0"]').click(); });
      const seqListAfter = Array.from(host.querySelectorAll('[data-presentation-question-type="sequence-sense"] ol li')).map((li) => li.textContent);
      expect(seqListAfter[0]).toContain('Evaporation');

      // Slide dot 3 jumps directly to Slide 4 (Relation Mismatch): pair button marks discussion pick
      await act(async () => { host.querySelector('[data-presentation-slide-dot="3"]').click(); });
      const pair1 = host.querySelector('[data-presentation-pair="1"]');
      await act(async () => { pair1.click(); });
      expect(pair1.getAttribute('aria-pressed')).toBe('true');

      // ArrowRight advances to Slide 5 (Short Answer): class discussion scratchpad note works and does NOT trigger keyboard reveal when typing 'r'
      await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
      const noteInput = host.querySelector('[data-presentation-class-note]');
      expect(noteInput).toBeTruthy();
      await act(async () => { setInputValue(noteInput, 'Roots sense gravity'); });
      noteInput.focus();
      await act(async () => { noteInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true })); });
      expect(host.textContent).not.toContain('Gravity guides root growth');
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('surfaces KPI strip with High-Confidence Misses filter and Explain/Group action bridge in LiveResultsDashboard', async () => {
    const QuizView = window.AlloModules.QuizView;
    const onCreateGroup = vi.fn(async () => 'grp_review_1');
    const onAssignStudent = vi.fn(async () => {});
    const callGemini = vi.fn(async () => 'Water vapor cools when it rises, forming tiny cloud droplets.');
    const questions = [
      {
        type: 'mcq',
        question: 'What causes clouds to form?',
        options: ['Condensation', 'Erosion'],
        correctAnswer: 'Condensation',
        conceptLabel: 'condensation',
      },
      {
        type: 'mcq',
        question: 'What is the solid form of water?',
        options: ['Ice', 'Steam'],
        correctAnswer: 'Ice',
        conceptLabel: 'states of matter',
      },
    ];
    const sessionData = {
      roster: {
        s1: { name: 'Maya' },
        s2: { name: 'Leo' },
      },
      quizState: {
        isActive: true,
        activityId: 'act-p3',
        allResponses: {
          s1: {
            0: { itemType: 'mcq', answer: { optionIdx: 1, optionText: 'Erosion' }, confidence: 'knew', timestamp: Date.now() },
            1: { itemType: 'mcq', answer: { optionIdx: 0, optionText: 'Ice' }, confidence: 'knew', timestamp: Date.now() },
          },
          s2: {
            0: { itemType: 'mcq', answer: { optionIdx: 1, optionText: 'Erosion' }, confidence: 'guessed', timestamp: Date.now() },
            1: { itemType: 'mcq', answer: { optionIdx: 0, optionText: 'Ice' }, confidence: 'knew', timestamp: Date.now() },
          },
        },
      },
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    try {
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({
          isTeacherMode: true,
          activeSessionCode: 'ROOM99',
          appId: 'app-test',
          sessionData,
          generatedContent: { id: 'p3-live-1', type: 'quiz', data: { mode: 'formative', modeLabel: 'Formative Check', questions } },
          callGemini,
          handleCreateGroup: onCreateGroup,
          handleAssignStudent: onAssignStudent,
        })));
      });

      // KPI Strip shows Responded 2/2 and High-Confidence Misses = 1
      const kpi = host.querySelector('[data-live-kpi-strip]');
      expect(kpi).toBeTruthy();
      expect(kpi.textContent).toContain('2 / 2');
      const hcBtn = host.querySelector('[data-live-kpi-high-conf-misses]');
      expect(hcBtn).toBeTruthy();
      expect(hcBtn.textContent).toContain('1');

      // Clicking High-Conf. Misses opens the focused misconception panel
      await act(async () => { hcBtn.click(); });
      const hcPanel = host.querySelector('[data-live-high-conf-panel]');
      expect(hcPanel).toBeTruthy();
      expect(hcPanel.textContent).toContain('What causes clouds to form?');

      // Heatmap bar exposes Explain to class and Group 2 to revisit
      const groupBtn = host.querySelector('[data-live-group-revisit="0"]');
      expect(groupBtn).toBeTruthy();
      expect(groupBtn.textContent).toContain('Group 2 to revisit');
      await act(async () => { groupBtn.click(); });
      expect(onCreateGroup).toHaveBeenCalledWith('Review: condensation', expect.arrayContaining(['s1', 's2']));
      expect(onAssignStudent).toHaveBeenCalledWith('s1', 'grp_review_1');
      expect(onAssignStudent).toHaveBeenCalledWith('s2', 'grp_review_1');

      // Heatmap Explain to class triggers modal via callGemini
      const explainBtn = host.querySelector('[data-live-heatmap-explain="0"]');
      expect(explainBtn).toBeTruthy();
      await act(async () => { explainBtn.click(); });
      expect(callGemini).toHaveBeenCalled();
      expect(host.textContent).toContain('Water vapor cools when it rises');
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('adds claim-to-evidence visual connector and transfer practice parity on Answer + Evidence and Fill-Blank cards', async () => {
    const QuizView = window.AlloModules.QuizView;
    const questions = [
      {
        type: 'answer-evidence',
        question: 'Which process moves water into clouds?',
        answerOptions: ['Evaporation', 'Freezing'],
        correctAnswer: 'Evaporation',
        evidencePrompt: 'Which observation supports this?',
        evidenceOptions: ['Puddles shrink in warm sun', 'Ice cubes float'],
        correctEvidence: 'Puddles shrink in warm sun',
        conceptLabel: 'evaporation',
      },
      {
        type: 'fill-blank',
        question: 'Plants use ___ to make sugar.',
        expectedFill: 'sunlight',
        acceptableAlternatives: ['light'],
        conceptLabel: 'photosynthesis',
      },
    ];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    try {
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({
          isTeacherMode: false,
          generatedContent: { id: 'p3-parity-1', type: 'quiz', data: { mode: 'formative', questions } },
        })));
      });

      // Answer + Evidence: selecting Part 1 shows the Selected answer claim connector above Part 2
      const aeCard = host.querySelector('#assessment-question-0');
      const part1Btns = aeCard.querySelectorAll('fieldset button');
      await act(async () => { part1Btns[0].click(); });
      const claimPill = aeCard.querySelector('[data-assessment-selected-claim]');
      expect(claimPill).toBeTruthy();
      expect(claimPill.textContent).toContain('A. Evaporation');

      // Select Part 2 and check both parts -> AssessmentTransferPractice appears
      const fieldsets = aeCard.querySelectorAll('fieldset');
      await act(async () => { fieldsets[1].querySelectorAll('button')[0].click(); });
      const checkBoth = Array.from(aeCard.querySelectorAll('button')).find((b) => /Check both parts/i.test(b.textContent));
      await act(async () => { checkBoth.click(); });
      expect(aeCard.textContent).toContain('Apply this idea to a new example');

      // Fill-Blank: exact match shows AssessmentTransferPractice too
      const fbCard = host.querySelector('#assessment-question-1');
      const fbInput = fbCard.querySelector('input[type="text"]');
      await act(async () => { setInputValue(fbInput, 'sunlight'); });
      const gradeBtn = Array.from(fbCard.querySelectorAll('button')).find((b) => /Grade my answer|Check my answer/i.test(b.textContent));
      await act(async () => { gradeBtn.click(); });
      expect(fbCard.textContent).toContain('Apply this idea to a new example');
    } finally {
      await act(async () => { root.unmount(); });
    }
  });
});
