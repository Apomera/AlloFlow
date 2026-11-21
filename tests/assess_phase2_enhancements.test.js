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
  loadAlloModule('view_sidebar_panels_module.js');
  loadAlloModule('escape_room_module.js');
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  vi.restoreAllMocks();
});

const plainT = (key, opts) => (opts && opts.defaultValue) || ({
  'quiz.edit': 'Edit Quiz',
  'common.done_editing': 'Done Editing',
  'review_game.title': 'Review Challenge',
  'review_game.reveal_answer': 'Reveal answer',
  'review_game.no_points': 'No points',
  'review_game.add_team': 'Add Team',
  'review_game.reset': 'Reset',
  'common.close': 'Close',
  'ui_common.i_dont_know': "I don't know",
  'ui_common.try_again': 'Try again',
  'escape_room.play_again': 'Play Again',
  'escape_room.close': 'Close',
}[key] || '');

function baseQuizProps(overrides = {}) {
  return {
    t: plainT,
    isTeacherMode: false,
    isParentMode: false,
    isIndependentMode: false,
    isPresentationMode: false,
    isReviewGame: false,
    isEditingQuiz: false,
    showQuizAnswers: false,
    escapeRoomState: { isActive: false },
    activeSessionCode: '',
    sessionData: null,
    user: { uid: 'student-phase2' },
    formatInlineText: (s) => s,
    renderFormattedText: (s) => s,
    getRows: () => 2,
    playSound: vi.fn(),
    addToast: vi.fn(),
    callTTS: vi.fn(),
    callGemini: vi.fn(async () => 'Here is a helpful plain-language refresher with a concrete example.'),
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

describe('Phase 2 Assessment Enhancements, Poll Mode & Puzzle Challenge Polish', () => {
  it('renders post-submission summary strip, filter pills, confidence calibration, MCQ highlight, and AI refresher', async () => {
    const QuizView = window.AlloModules.QuizView;
    const content = {
      id: 'phase2-post-review-1',
      type: 'quiz',
      data: {
        mode: 'formative',
        deliverySettings: { feedbackTiming: 'after-submission' },
        questions: [
          {
            type: 'mcq',
            question: 'What drives evaporation?',
            options: ['Solar heat', 'Gravity', 'Moonlight', 'Soil'],
            correctAnswer: 'Solar heat',
            conceptLabel: 'water cycle',
          },
          {
            type: 'mcq',
            question: 'Which layer holds ozone?',
            options: ['Troposphere', 'Stratosphere', 'Core', 'Mantle'],
            correctAnswer: 'Stratosphere',
            conceptLabel: 'atmosphere',
          },
          {
            type: 'short-answer',
            question: 'Explain why clouds form.',
            expectedAnswer: 'Water vapor cools and condenses into droplets.',
            conceptLabel: 'condensation',
          },
        ],
      },
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    try {
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({ generatedContent: content })));
      });

      // Answer Q1 correctly with 'knew', Q2 incorrectly with 'knew' (surprise miss), Q3 with text
      const q0Card = host.querySelector('#assessment-question-0');
      const q0Radios = q0Card.querySelectorAll('[role="button"]');
      await act(async () => { q0Radios[0].click(); }); // Solar heat (correct)
      const q0Conf = q0Card.querySelector('select');
      if (q0Conf) await act(async () => { q0Conf.value = 'knew'; q0Conf.dispatchEvent(new Event('change', { bubbles: true })); });

      const q1Card = host.querySelector('#assessment-question-1');
      const q1Radios = q1Card.querySelectorAll('[role="button"]');
      await act(async () => { q1Radios[0].click(); }); // Troposphere (wrong)
      const q1Conf = q1Card.querySelector('select');
      if (q1Conf) await act(async () => { q1Conf.value = 'knew'; q1Conf.dispatchEvent(new Event('change', { bubbles: true })); });

      const q2Input = host.querySelector('#assessment-question-2 textarea');
      await act(async () => { setInputValue(q2Input, 'Vapor rises and cools into droplets.'); });

      // Open Review & submit, then submit
      const reviewBtn = Array.from(host.querySelectorAll('button')).find((b) => /Review & submit/i.test(b.textContent));
      await act(async () => { reviewBtn.click(); });
      const submitBtn = Array.from(host.querySelectorAll('[role="dialog"] button')).find((b) => /Submit assessment/i.test(b.textContent));
      await act(async () => { submitBtn.click(); });

      const feedback = host.querySelector('[data-assessment-attempt-feedback]');
      expect(feedback).toBeTruthy();
      const summary = feedback.querySelector('[data-assessment-feedback-summary]');
      expect(summary).toBeTruthy();
      expect(summary.textContent).toContain('1 matched');
      expect(summary.textContent).toContain('1 to review');
      expect(summary.textContent).toContain('1 teacher review');

      // Default 'all' filter keeps all 3 answer guides mounted
      expect(feedback.querySelectorAll('[data-assessment-answer-guide]').length).toBe(3);

      // Filter to Needs review shows only Q2
      const needsReviewBtn = feedback.querySelector('[data-assessment-feedback-filter="needs-review"]');
      await act(async () => { needsReviewBtn.click(); });
      expect(feedback.querySelectorAll('[data-assessment-answer-guide]').length).toBe(1);

      // AI Concept Explainer button appears on Q2 and fetches explanation
      const explainBtn = feedback.querySelector('[data-assessment-post-explain="1"]');
      expect(explainBtn).toBeTruthy();
      await act(async () => { explainBtn.click(); });
      expect(feedback.textContent).toContain('helpful plain-language refresher');

      // Switch back to All
      const allBtn = feedback.querySelector('[data-assessment-feedback-filter="all"]');
      await act(async () => { allBtn.click(); });
      expect(feedback.querySelectorAll('[data-assessment-answer-guide]').length).toBe(3);

      // Confidence calibration card appears when confidence was recorded
      const calibration = feedback.querySelector('[data-assessment-calibration-insight]');
      if (calibration) {
        expect(calibration.textContent).toContain('Confidence check-in');
      }
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('upgrades Review Challenge with board grouping, think-time timer, discussion pick, and completion banner', async () => {
    const QuizView = window.AlloModules.QuizView;
    const questions = [
      { type: 'mcq', question: 'Q1 cell', options: ['Nucleus', 'Wall'], correctAnswer: 'Nucleus', conceptLabel: 'cells', dok: 1 },
      { type: 'numeric-response', question: 'Q2 mass', correctValue: 5, tolerance: 0, unit: 'g', conceptLabel: 'mass', dok: 2 },
      { type: 'short-answer', question: 'Q3 explain', expectedAnswer: 'Energy transfers.', conceptLabel: 'cells', dok: 3 },
    ];
    const baseCategories = [
      {
        name: 'General',
        questions: questions.map((q, idx) => ({ ...q, originalIndex: idx, points: (idx + 1) * 100 })),
      },
    ];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    let reviewState = { claimed: new Set(), activeQuestion: null, showAnswer: false };
    const rerender = async () => {
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({
          isTeacherMode: true,
          isReviewGame: true,
          generatedContent: { id: 'review-p2', type: 'quiz', data: { questions } },
          getReviewCategories: () => baseCategories,
          reviewGameState: reviewState,
          setReviewGameState: (updater) => {
            reviewState = typeof updater === 'function' ? updater(reviewState) : updater;
          },
          handleReviewTileClick: (q, pts) => {
            reviewState = { ...reviewState, activeQuestion: { ...q, points: pts }, showAnswer: false };
          },
          closeReviewModal: (claim) => {
            const nextClaimed = new Set(reviewState.claimed);
            if (claim && reviewState.activeQuestion) nextClaimed.add(reviewState.activeQuestion.originalIndex);
            reviewState = { claimed: nextClaimed, activeQuestion: null, showAnswer: false };
          },
          handleAwardPoints: vi.fn(),
          gameTeams: [{ id: 1, name: 'Team A', score: 200, color: 'bg-blue-500' }],
          setGameTeams: vi.fn(),
          scoreAnimation: {},
          soundEnabled: false,
          setSoundEnabled: vi.fn(),
          setConfirmDialog: vi.fn(),
        })));
      });
    };

    try {
      await rerender();

      // Switch grouping to By Concept (2 buckets: Cells, Mass)
      await act(async () => { host.querySelector('[data-review-group-btn="concept"]').click(); });
      expect(host.querySelector('[data-review-progress]').textContent).toContain('2 categories');

      // Switch grouping to By Format (3 buckets: Quick Recall, Apply & Connect, Reason & Order)
      await act(async () => { host.querySelector('[data-review-group-btn="format"]').click(); });
      expect(host.querySelector('[data-review-progress]').textContent).toContain('3 categories');

      // Enable 15s think-time timer and open Q1 modal
      await act(async () => { host.querySelector('[data-review-think-btn="15"]').click(); });
      reviewState = { claimed: new Set(), activeQuestion: { ...questions[0], originalIndex: 0, points: 100 }, showAnswer: false };
      await rerender();

      // Modal has Listen button, think-time countdown bar, disabled Reveal until Ready now, and MCQ discussion pick
      expect(host.querySelector('[role="dialog"] [data-quiz-listen="0"]')).toBeTruthy();
      expect(host.querySelector('[data-review-think-bar]')).toBeTruthy();
      const revealBtn = host.querySelector('button[aria-label="Reveal answer"]');
      expect(revealBtn.disabled).toBe(true);

      // Click MCQ option for neutral discussion pick
      const mcqOpt0 = host.querySelector('[data-review-mcq-option="0"]');
      await act(async () => { mcqOpt0.click(); });
      expect(mcqOpt0.getAttribute('aria-pressed')).toBe('true');
      expect(mcqOpt0.textContent).toContain('Discussion pick');

      // Skip think time with Ready now -> Reveal unlocks
      await act(async () => { host.querySelector('[data-review-think-skip]').click(); });
      expect(host.querySelector('[data-review-think-bar]')).toBeNull();
      expect(host.querySelector('button[aria-label="Reveal answer"]').disabled).toBe(false);

      // Complete all tiles -> celebration banner appears
      reviewState = { claimed: new Set([0, 1, 2]), activeQuestion: null, showAnswer: false };
      await rerender();
      const completeBanner = host.querySelector('[data-review-complete-banner]');
      expect(completeBanner).toBeTruthy();
      expect(completeBanner.textContent).toContain('Board Complete');
      expect(completeBanner.textContent).toContain('Team A: 200');
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('polishes Sequence Sense back/in-place, Relation Mismatch back, Numeric live preview, Multi-Select inline badges, and Teacher editor', async () => {
    const QuizView = window.AlloModules.QuizView;
    const questions = [
      {
        type: 'sequence-sense',
        question: 'Check the plant growth order.',
        items: ['Seed', 'Sprout', 'Flower'],
        presentedOrder: [0, 2, 1],
        intentionallyWrongIndex: 1,
        orderingPrinciple: 'process',
        principleOptions: ['chronological', 'process', 'size'],
        conceptLabel: 'plant life cycle',
      },
      {
        type: 'relation-mismatch',
        question: 'Fix the mismatched organ.',
        pairs: [{ left: 'Heart', right: 'Pumps blood' }, { left: 'Lungs', right: 'Digests food' }, { left: 'Brain', right: 'Controls signals' }],
        wrongPairIndex: 1,
        correctPartnerForWrong: 'Exchanges gases',
        candidatePartners: ['Exchanges gases', 'Stores bile'],
        conceptLabel: 'body systems',
      },
      {
        type: 'numeric-response',
        question: 'Find the perimeter.',
        correctValue: 12,
        tolerance: 0.5,
        unit: 'cm',
        acceptableUnits: ['centimeters'],
        conceptLabel: 'perimeter',
      },
      {
        type: 'multi-select',
        question: 'Select all mammals.',
        options: ['Whale', 'Shark', 'Bat'],
        correctAnswers: ['Whale', 'Bat'],
        conceptLabel: 'classification',
      },
    ];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    try {
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({
          generatedContent: { id: 'p2-tactile-1', type: 'quiz', data: { mode: 'formative', questions } },
        })));
      });

      // Sequence Sense: breadcrumb present, Step 1 -> Step 2 -> Back -> Step 1 -> Step 3 hides static <ol>
      const seqCard = host.querySelector('#assessment-question-0');
      expect(seqCard.querySelector('[data-assessment-sequence-steps]')).toBeTruthy();
      expect(seqCard.querySelectorAll('ol').length).toBe(1);
      const noBtn = Array.from(seqCard.querySelectorAll('button')).find((b) => /No, something is off/i.test(b.textContent));
      await act(async () => { noBtn.click(); });
      const backBtn = seqCard.querySelector('[data-assessment-sequence-back]');
      expect(backBtn).toBeTruthy();
      await act(async () => { backBtn.click(); });
      expect(seqCard.textContent).toContain('Step 1 of 4');

      // Advance via Yes to Step 3: only 1 <ol> (the in-place reorderable list) is visible
      const yesBtn = Array.from(seqCard.querySelectorAll('button')).find((b) => /Yes, correct/i.test(b.textContent));
      await act(async () => { yesBtn.click(); });
      expect(seqCard.querySelectorAll('ol').length).toBe(1);
      expect(seqCard.querySelector('ol[aria-label="Your order"]')).toBeTruthy();

      // Relation Mismatch: Step 1 -> Step 2 has Change pair back button
      const relCard = host.querySelector('#assessment-question-1');
      const pairBtns = relCard.querySelectorAll('[role="button"]');
      await act(async () => { pairBtns[1].click(); });
      const changePairBtn = relCard.querySelector('[data-assessment-relation-back]');
      expect(changePairBtn).toBeTruthy();
      await act(async () => { changePairBtn.click(); });
      expect(relCard.textContent).toContain('Step 1 of 2');

      // Numeric Response: live parsed preview chip
      const numCard = host.querySelector('#assessment-question-2');
      const numInput = numCard.querySelector('input[type="text"]');
      await act(async () => { setInputValue(numInput, '12 cm'); });
      const preview = numCard.querySelector('[data-assessment-numeric-preview]');
      expect(preview).toBeTruthy();
      expect(preview.textContent).toContain('Read as: 12');
      expect(preview.textContent).toContain('unit: cm');

      // Multi-Select: inline badges on option cards after checking
      const msCard = host.querySelector('#assessment-question-3');
      const msChoices = msCard.querySelectorAll('[role="group"][aria-label="Answer choices"] button');
      await act(async () => { msChoices[0].click(); msChoices[1].click(); }); // Whale (correct) + Shark (extra), Bat missed
      const checkBtn = Array.from(msCard.querySelectorAll('button')).find((b) => /Check selections/i.test(b.textContent));
      await act(async () => { checkBtn.click(); });
      expect(msCard.querySelector('[data-assessment-multi-option-badge="correct"]')).toBeTruthy();
      expect(msCard.querySelector('[data-assessment-multi-option-badge="extra"]')).toBeTruthy();
      expect(msCard.querySelector('[data-assessment-multi-option-badge="missed"]')).toBeTruthy();

      // Teacher Edit mode: collapsible AssessmentLearningOptions & visual Sequence display order preview
      const patchAction = vi.fn();
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({
          isTeacherMode: true,
          isEditingQuiz: true,
          handleQuizQuestionAction: patchAction,
          generatedContent: { id: 'p2-tactile-1', type: 'quiz', data: { mode: 'formative', questions } },
        })));
      });
      const details = host.querySelector('[data-quiz-learning-options]');
      expect(details).toBeTruthy();
      expect(details.open).toBe(false);
      expect(details.querySelector('[data-quiz-explanation-input]')).toBeTruthy();
      const visualOrder = host.querySelector('[data-quiz-sequence-visual-order]');
      expect(visualOrder).toBeTruthy();
      const swapBtn = Array.from(visualOrder.querySelectorAll('button')).find((b) => /Swap 1 & 2/i.test(b.textContent));
      await act(async () => { swapBtn.click(); });
      expect(patchAction).toHaveBeenCalledWith(0, 'patch', expect.objectContaining({ presentedOrder: [2, 0, 1] }));
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('surfaces Student-Voice Poll mode in QuizPanel and renders non-evaluative PollItemCard in QuizView', async () => {
    const QuizPanel = window.AlloModules.QuizPanel;
    const QuizView = window.AlloModules.QuizView;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    let mode = 'exit-ticket';
    let mcqCount = 3;
    let mix = null;
    const setQuizMode = (m) => { mode = m; };
    const setQuizMcqCount = (c) => { mcqCount = c; };
    const setQuizItemTypeMix = (m) => { mix = m; };

    const renderPanel = async () => {
      await act(async () => {
        root.render(React.createElement(QuizPanel, {
          InfoTooltip: () => null,
          t: plainT,
          expandedTools: ['quiz'],
          quizMode: mode,
          setQuizMode,
          quizMcqCount: mcqCount,
          setQuizMcqCount,
          quizItemTypeMix: mix,
          setQuizItemTypeMix,
          quizReflectionCount: 0,
          setQuizReflectionCount: vi.fn(),
          dokLevel: '',
          setDokLevel: vi.fn(),
          mcqVisualMode: 'none',
          setMcqVisualMode: vi.fn(),
          imageStyle: '',
          setImageStyle: vi.fn(),
          quizCustomInstructions: '',
          setQuizCustomInstructions: vi.fn(),
          handleGenerate: vi.fn(),
          hasSourceOrAnalysis: true,
          isProcessing: false,
          history: [],
        }));
      });
    };

    try {
      await renderPanel();
      const select = host.querySelector('#quiz-mode-select');
      expect(Array.from(select.options).map((o) => o.value)).toContain('poll');
      await act(async () => {
        select.value = 'poll';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await renderPanel();
      expect(host.textContent).toContain('ungraded poll items');
      expect(host.textContent).toContain('Generate Student-Voice Poll');
      expect(host.querySelector('[data-quiz-active-mix-chips]').textContent).toContain('Rating Scale (1–5)');

      // Render Poll items in QuizView
      const pollData = {
        mode: 'poll',
        questions: [
          { type: 'likert', question: 'How ready do you feel for the lab?', scaleMin: 1, scaleMax: 5, lowLabel: 'Need practice', highLabel: 'Ready now', conceptLabel: 'lab readiness' },
          { type: 'opinion-mcq', question: 'Which station excites you most?', options: ['Microscopes', 'Circuits', 'Models'], conceptLabel: 'station choice' },
        ],
      };
      const audit = QuizView.keyQuality.auditAssessment(pollData);
      expect(audit.ready).toBe(true);
      expect(audit.errorCount).toBe(0);

      const onLive = vi.fn();
      await act(async () => {
        root.render(React.createElement(QuizView, baseQuizProps({
          generatedContent: { id: 'poll-run-1', type: 'quiz', data: pollData },
          onSubmitLiveAnswer: onLive,
        })));
      });

      const likertCard = host.querySelector('[data-assessment-poll-card="likert"]');
      const opinionCard = host.querySelector('[data-assessment-poll-card="opinion-mcq"]');
      expect(likertCard).toBeTruthy();
      expect(opinionCard).toBeTruthy();
      expect(likertCard.textContent).toContain('Need practice');
      expect(likertCard.textContent).toContain('Ready now');

      await act(async () => { likertCard.querySelector('[data-poll-likert-option="4"]').click(); });
      expect(likertCard.querySelector('[data-assessment-poll-saved]').textContent).toContain('no right or wrong answer');
      expect(host.querySelector('[data-assessment-answered-count]').textContent).toContain('1 / 2');

      await act(async () => { opinionCard.querySelector('[data-poll-opinion-option="1"]').click(); });
      expect(opinionCard.querySelector('[data-assessment-poll-saved]')).toBeTruthy();
      expect(host.querySelector('[data-assessment-answered-count]').textContent).toContain('2 / 2');
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('renders collapsible What You Solved & Learned debrief and motion-reduce guards in EscapeRoomGameplay', async () => {
    const EscapeRoomGameplay = window.AlloModules.EscapeRoomGameplay;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    try {
      await act(async () => {
        root.render(React.createElement(EscapeRoomGameplay, {
          escapeRoomState: {
            isActive: true,
            isEscaped: true,
            theme: 'Science Lab',
            maxTime: 300,
            totalPuzzles: 1,
            solvedPuzzles: new Set(['p1']),
            puzzles: [
              {
                id: 'p1',
                type: 'mcq',
                question: 'What gas do plants release?',
                options: ['Oxygen', 'Nitrogen'],
                correctIndex: 0,
                explanation: 'Photosynthesis produces oxygen as a byproduct.',
              },
            ],
            wrongAttempts: 0,
            totalHintsUsed: 0,
            xpEarned: 150,
            runScore: 150,
          },
          setEscapeRoomState: vi.fn(),
          escapeTimeLeft: 180,
          isEscapeTimerRunning: false,
          setIsEscapeTimerRunning: vi.fn(),
          handleSetIsEscapeTimerRunningToTrue: vi.fn(),
          handlers: { resetEscapeRoom: vi.fn() },
          t: plainT,
          soundEnabled: false,
          setSoundEnabled: vi.fn(),
          playSound: vi.fn(),
          globalPoints: 150,
          inputText: '',
        }));
      });

      const debrief = host.querySelector('[data-escape-room-debrief="true"]');
      expect(debrief).toBeTruthy();
      expect(debrief.textContent).toContain('What You Solved & Learned (1 puzzle)');
      expect(debrief.textContent).toContain('What gas do plants release?');
      expect(debrief.textContent).toContain('Oxygen');
      expect(debrief.textContent).toContain('Photosynthesis produces oxygen');
      expect(host.innerHTML).toContain('animate-bounce motion-reduce:animate-none');
    } finally {
      await act(async () => { root.unmount(); });
    }
  });
});
