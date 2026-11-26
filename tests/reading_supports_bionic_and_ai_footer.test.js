import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

let root, host;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: (k, o) => o?.defaultValue || k });
  window.__alloT = (k, o) => o?.defaultValue || k;
  window.AlloIcons = {};
  loadAlloModule('ui_font_library_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  loadAlloModule('view_quiz_module.js');
  loadAlloModule('view_simplified_module.js');
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  document.documentElement.removeAttribute('data-allo-bionic');
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

async function renderNode(element) {
  if (!root) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  }
  await act(async () => root.render(element));
}

describe('AI document notice exclusion from word-support glossing', () => {
  it('generateReadingSupports stops before the trailing *About this document:* AI notice', async () => {
    const contract = window.AlloModules.InstructionalContext;
    const body = 'Photosynthesis converts sunlight into chemical energy inside chloroplasts.';
    const footer = '\n\n---\n\n*About this document: drafted with AI assistance without web source citations enabled. Facts, figures, and quotations have not been verified against cited sources — review for accuracy before classroom use.*\n';
    const fullText = body + footer;
    const snapshot = contract.createSourceSnapshot(fullText, { language: 'English' });

    const seenPrompts = [];
    const callGemini = vi.fn(async (prompt) => {
      seenPrompts.push(prompt);
      return JSON.stringify({
        sourceFingerprint: snapshot.fingerprint,
        annotations: [
          { id: 'word-0', endId: 'word-0', text: 'the process plants use to make food from light', priority: 'essential' },
        ],
      });
    });

    const result = await window.AlloModules.GenDispatcher.generateReadingSupports(snapshot, {
      callGemini,
      contextModule: contract,
      gradeLevel: 'Grade 6',
      language: 'English',
    });

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(seenPrompts[0]).toContain('Photosynthesis');
    expect(seenPrompts[0]).not.toContain('About this document');
    expect(seenPrompts[0]).not.toContain('drafted with AI assistance');
    expect(result.status).toBe('complete');
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].quote).toBe('Photosynthesis');
  });
});

describe('Comprehensive Bionic Reading across Assess and Adapted/Original with Supports', () => {
  it('applies Bionic Reading to Assess MCQ and Sequence Sense text via _quizRich', async () => {
    localStorage.setItem('allo_bionic_reading', '1');
    document.documentElement.setAttribute('data-allo-bionic', '1');
    const t = (k, o) => o?.defaultValue || k;
    const questions = [
      {
        type: 'mcq',
        question: 'Photosynthesis happens in which organelle?',
        options: ['Chloroplast', 'Mitochondria'],
        correctAnswer: 'Chloroplast',
      },
      {
        type: 'sequence-sense',
        question: 'Order the evaporation cycle.',
        items: ['Evaporation', 'Condensation', 'Precipitation'],
        presentedOrder: [0, 1, 2],
        intentionallyWrongIndex: null,
        orderingPrinciple: 'process',
        principleOptions: ['process', 'size'],
      },
    ];
    await renderNode(React.createElement(window.AlloModules.QuizView, {
      t,
      ErrorBoundary: ({ children }) => children,
      TeacherLiveQuizControls: () => null,
      ConfettiExplosion: () => null,
      isTeacherMode: false,
      isParentMode: false,
      isIndependentMode: true,
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
      generatedContent: { id: 'bionic-quiz-1', data: { questions } },
      formatInlineText: (v) => v,
      renderFormattedText: (v) => v,
      getReviewCategories: () => [],
      getRows: () => 1,
      playSound: () => {},
      handleToggleIsPresentationMode: vi.fn(),
      handleToggleIsReviewGame: vi.fn(),
      resetPresentation: vi.fn(),
    }));

    const bionicSpans = host.querySelectorAll('[data-allo-bionic-word="1"]');
    expect(bionicSpans.length).toBeGreaterThan(5);
    expect(host.textContent).toContain('Photosynthesis happens in which organelle?');
    expect(host.textContent).toContain('Chloroplast');
    expect(host.textContent).toContain('Evaporation');
  });

  it('applies Bionic Reading, hides AI footer glosses, and triggers read-aloud when clicking a word-help chip in Original with Supports', async () => {
    localStorage.setItem('allo_bionic_reading', '1');
    document.documentElement.setAttribute('data-allo-bionic', '1');
    const contract = window.AlloModules.InstructionalContext;
    const t = (k, o) => o?.defaultValue || k;
    const body = 'Chloroplasts absorb sunlight during photosynthesis.';
    const footer = '\n\n---\n\n*About this document: drafted with AI assistance without web source citations enabled.*\n';
    const fullText = body + footer;
    const snapshot = contract.createSourceSnapshot(fullText, { language: 'English' });
    const footerWordStart = fullText.indexOf('drafted');
    const supports = {
      sourceFingerprint: snapshot.fingerprint,
      annotations: [
        {
          id: 'gloss-body',
          kind: 'gloss',
          start: 0,
          end: 'Chloroplasts'.length,
          quote: 'Chloroplasts',
          text: 'tiny green parts in plant cells',
          language: 'English',
          priority: 'essential',
        },
        {
          id: 'gloss-footer',
          kind: 'gloss',
          start: footerWordStart,
          end: footerWordStart + 'drafted'.length,
          quote: 'drafted',
          text: 'written in an early version',
          language: 'English',
          priority: 'helpful',
        },
      ],
    };

    const handleSpeak = vi.fn();
    const stopPlayback = vi.fn();
    const generatedContent = {
      id: 'orig-bionic-1',
      type: 'simplified',
      data: fullText,
      sourceSnapshot: snapshot,
      readingSupports: supports,
      instructionalText: {
        form: 'same-text-supported',
        sourceSnapshot: snapshot,
        readingSupports: supports,
      },
      config: { language: 'English' },
    };

    await renderNode(React.createElement(window.AlloModules.SimplifiedView, {
      t,
      generatedContent,
      history: [generatedContent],
      inputText: fullText,
      isTeacherMode: true,
      isParentMode: false,
      isIndependentMode: false,
      isEditingLeveledText: false,
      isCompareMode: false,
      isZenMode: false,
      isImmersiveReaderActive: false,
      isProcessing: false,
      isPlaying: false,
      interactionMode: 'read',
      playbackState: { currentIdx: -1 },
      playingContentId: null,
      leveledTextLanguage: 'English',
      formatInteractiveText: (v) => v,
      renderFormattedText: (v) => v,
      getSideBySideContent: () => null,
      splitTextToSentences: (text) => String(text || '').split(/(?<=[.!?])\s+/).filter(Boolean),
      getContentDirection: () => 'ltr',
      handleSpeak,
      stopPlayback,
      ErrorBoundary: ({ children }) => children,
      ComplexityGauge: () => null,
      SourceReferencesPanel: () => null,
      FocusReaderOverlay: () => null,
      PerspectiveCrawlOverlay: () => null,
      KaraokeReaderOverlay: () => null,
    }));

    // 1. Bionic reading spans are rendered inside the Original with Supports passage & gloss chip
    const passage = host.querySelector('[data-reading-passage="true"]');
    expect(passage).toBeTruthy();
    expect(passage.querySelectorAll('[data-allo-bionic-word="1"]').length).toBeGreaterThan(3);

    // 2. Body gloss is shown, AI footer gloss is filtered out
    const glossChips = [...host.querySelectorAll('[data-reading-gloss]')];
    expect(glossChips).toHaveLength(1);
    expect(glossChips[0].textContent).toContain('tiny green parts in plant cells');
    expect(host.textContent).not.toContain('written in an early version');

    // 3. Clicking the word-help chip starts in-place karaoke/read-aloud from that support unit
    await act(async () => glossChips[0].click());
    expect(handleSpeak).toHaveBeenCalledTimes(1);
    const [spokenText, contentId, startIndex] = handleSpeak.mock.calls[0];
    expect(spokenText).toContain('tiny green parts in plant cells');
    expect(contentId).toBe('simplified-main');
    expect(startIndex).toBeGreaterThanOrEqual(1);
  });
});
