import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');

const cleanups = [];

function mountComponent(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(Component, props));
  });
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}

beforeAll(() => {
  global.React = window.React = React;
  window.AlloIcons = new Proxy({}, {
    get: () => (props) => React.createElement('span', { 'data-icon': true, ...props }),
  });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  loadAlloModule('view_simplified_module.js');
  loadAlloModule('view_glossary_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('view_quiz_module.js');
  loadAlloModule('live_aac_module.js');
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('applied_challenge_module.js');
  loadAlloModule('view_submission_inbox_module.js');
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  delete window.__alloResolveGlossaryAudio;
  vi.restoreAllMocks();
});

describe('Wave 1 bug sweep (Studios & Submission Inbox)', () => {
  it('#1 memory_aid refineVisual passes { signal } as 6th options arg instead of referenceBase64', () => {
    const src = readFileSync('memory_aid_source.jsx', 'utf8');
    expect(src).toMatch(/callGeminiImageEdit\(\s*token\.input\.text,\s*rawBase64,\s*640,\s*0\.82,\s*null,\s*\{\s*signal:\s*_maTokenSignal\(token\)\s*\}\s*\)/);
  });

  it('#2 & #3 appliedChallengeFromSubmission restores self-check ratings and sorts 10+ evidence rows numerically', () => {
    const src = readFileSync('applied_challenge_source.jsx', 'utf8');
    expect(src).toContain('const selfCheckMatch = /^selfcheck-(.+?)(:rating)?$/.exec(field);');
    expect(src).toContain('Object.prototype.hasOwnProperty.call(APPLIED_CHALLENGE_SELF_CHECK_RATINGS, value.trim())');
    expect(src).toContain('appliedChallengeSelfCheckItems(data.brief)');
    expect(src).toContain('Object.keys(ledgerRows).sort((a, b) => Number(a) - Number(b))');
    // Live behavioral verification via exported AppliedChallengeHelpers if registered
    const fromSub = window.AlloModules?.AppliedChallenge?.fromSubmission
      || window.AlloModules?.AppliedChallengeHelpers?.fromSubmission;
    if (typeof fromSub === 'function') {
      const baseData = {
        brief: {
          criteria: ['Cite two sources', 'Address tradeoffs'],
          constraints: ['Stay within budget'],
        },
        workspace: {},
        criteriaCheck: {},
        evidenceLedger: [],
      };
      const map = {
        'ac-1:applied:selfcheck-criterion-0:rating': 'met',
        'ac-1:applied:selfcheck-criterion-0': 'Cited both graphs.',
        'ac-1:applied:ledger-2-claim': 'Claim 2',
        'ac-1:applied:ledger-10-claim': 'Claim 10',
        'ac-1:applied:ledger-1-claim': 'Claim 1',
      };
      const restored = fromSub(baseData, map, 'ac-1');
      expect(restored.matched).toBe(5);
      const checks = Object.values(restored.data.criteriaCheck);
      expect(checks).toHaveLength(1);
      expect(checks[0].rating).toBe('met');
      expect(checks[0].note).toBe('Cited both graphs.');
      expect(restored.data.evidenceLedger.map((r) => r.id)).toEqual(['submitted-1', 'submitted-2', 'submitted-10']);
    }
  });

  it('#4 submission inbox accepts and resolves live-app :memory: keys', () => {
    const src = readFileSync('view_submission_inbox_source.jsx', 'utf8');
    expect(src).toContain('var maLiveMatch = bare.match(/^(.+):memory:(.+)$/);');
    expect(src).toContain('if (/:memory:[^:]+$/.test(key)) return true;');
  });

  it('#5-#13 StoryForge fixes: audio store scope, dictation ref safety, scaffold persistence, prompt guard, illustration undo/alt-text, comic vocab, stop button', () => {
    const src = readFileSync('story_forge_source.jsx', 'utf8');
    expect(src).toContain("const storeModule = window.AlloModules?.KaraokeAudioStore || null;");
    expect(src).toContain('const onTranscriptRef = useRef(onTranscript);');
    expect(src).toContain('dictatingParagraphIdxRef.current = idx;');
    expect(src).toContain('const dictationRef = useRef(null);');
    expect(src).toContain('const recorderRef = useRef(null);');
    expect(src).toContain('paragraphIds: paragraphs.map(p => p.id)');
    expect(src).toContain('setScaffoldsGenerated(true);');
    expect(src).toContain("Could not draft image prompt. Please try again.");
    expect(src).toContain('...prev[paragraphId],');
    expect(src).toContain('illustrations[p.id]?.altText || panelThumbnails[p.id]?.altText');
    expect(src).toContain('coverArtwork?.altText');
    expect(src).toContain('const unused = vocabTerms.filter(v => !termUsed(authoredText, v.term));');
    expect(src).toContain('audioRef.current?.pause();');
  });
});

describe('Wave 2 bug sweep (Core Views)', () => {
  it('#14 bilingual SimplifiedView read-aloud does not pass primary readingLanguage as companion speechLanguageOverride', () => {
    const src = readFileSync('view_simplified_source.jsx', 'utf8');
    expect(src).toContain("handleSpeak(simplifiedReadAloudText, 'simplified-main', currentGlobalIdx, true, parts ? undefined : readingLanguage)");
    expect(src).toContain("handleSpeak(interactionMode === 'cloze' ? maskClozeTerms(simplifiedReadAloudText) : simplifiedReadAloudText, 'simplified-main', 0, false, parts ? undefined : readingLanguage)");
  });

  it('#15 rigor regeneration accepts monolingual non-English rewrite with citations when translationMode is off', async () => {
    const pipeline = window.AlloModules.TextPipelineHelpers;
    const regenerateWithRigor = window.AlloModules.SimplifiedView.regenerateWithRigor;
    const FIRST = '[\u207d\u00b9\u207e](https://example.org/one)';
    const references = '### Source Text References\n\n1. [Source](https://example.org/one)';
    const originalData = `Las plantas usan luz solar. ${FIRST}\n\n${references}`;
    const candidate = `Las plantas convierten la luz solar en energia quimica. ${FIRST}`;
    const setGeneratedContent = vi.fn();
    const setHistory = vi.fn();
    const addToast = vi.fn();

    await regenerateWithRigor({
      generatedContent: {
        id: 'leveled-es-1',
        type: 'simplified',
        title: 'Fotosintesis',
        data: originalData,
        alignmentCheck: { improvement: 'Add precision.' },
        config: { language: 'Spanish' },
      },
      setIsProcessing: vi.fn(),
      splitReferencesFromBody: pipeline.splitReferencesFromBody,
      extractSourceTextForProcessing: pipeline.extractSourceTextForProcessing,
      gradeLevel: 'Grade 7',
      leveledTextLanguage: 'Spanish',
      translationMode: 'off',
      resolveTranslationPolicy: () => ({ enabled: false, target: 'English', mode: 'off' }),
      generateBilingualText: vi.fn(async () => candidate),
      callGemini: vi.fn(),
      setGeneratedContent,
      setHistory,
      addToast,
      t: (k) => k,
      warnLog: vi.fn(),
      setError: vi.fn(),
    });

    expect(setGeneratedContent).toHaveBeenCalledTimes(1);
    expect(setGeneratedContent.mock.calls[0][0].data).toContain('energia quimica');
    expect(setGeneratedContent.mock.calls[0][0].data).toContain(references);
  });

  it('#16 handleGlossaryChange syncs etymologyByLang when editing etymology and Flashcard drawer displays currentFlashcardOrigin', () => {
    let saved = {
      id: 'gl-1',
      type: 'glossary',
      baseLanguage: 'English',
      data: [{
        term: 'Photosynthesis',
        def: 'Making food with light.',
        etymology: 'Old flat origin',
        etymologyByLang: { English: 'Greek photo + synthesis', Spanish: 'Griego foto + sintesis' },
        translations: {},
      }],
    };
    const setGeneratedContent = vi.fn((next) => { saved = next; });
    const setHistory = vi.fn();
    const handlers = window.AlloModules.createHostHandlers({
      generatedContent: saved,
      setGeneratedContent,
      setHistory,
    });

    handlers.handleGlossaryChange(0, 'etymology', 'Updated English word root');
    expect(setGeneratedContent).toHaveBeenCalledTimes(1);
    expect(saved.data[0].etymology).toBe('Updated English word root');
    expect(saved.data[0].etymologyByLang.English).toBe('Updated English word root');
    expect(saved.data[0].etymologyByLang.Spanish).toBe('Griego foto + sintesis');

    const src = readFileSync('view_glossary_source.jsx', 'utf8');
    expect(src).toContain("value={currentFlashcardOrigin.text || currentFlashcardItem.etymology || ''}");
  });

  it('#17 standard legacy glossary without baseLanguage still passes explicit translation language to TTS and downloads', async () => {
    const GlossaryView = window.AlloModules.GlossaryView;
    const saved = {
      id: 'legacy-gl',
      type: 'glossary',
      title: 'Legacy Vocab',
      config: { language: 'Spanish' },
      data: [{
        entryId: 'leaf',
        term: 'Leaf',
        def: 'Part of a plant.',
        translations: { Spanish: 'Hoja: Parte de una planta.' },
      }],
    };
    const handleSpeak = vi.fn();
    const handleDownloadAudio = vi.fn();
    const props = glossaryMediaProps({
      generatedContent: saved,
      filteredGlossaryData: saved.data.map((item, index) => ({ ...item, _originalIdx: index })),
      displayLanguages: ['Spanish'],
      selectedLanguages: ['Spanish'],
      currentUiLanguage: 'English',
      leveledTextLanguage: 'English',
      handleSpeak,
      handleDownloadAudio,
    });
    const container = mountComponent(GlossaryView, props);
    const transReadBtn = [...container.querySelectorAll('button')].find((b) =>
      (b.getAttribute('aria-label') || '').includes('Spanish') && (b.getAttribute('aria-label') || '').toLowerCase().includes('read')
    );
    expect(transReadBtn).toBeTruthy();
    await act(async () => { transReadBtn.click(); });
    expect(handleSpeak).toHaveBeenCalledWith('Hoja: Parte de una planta.', 'trans-0-Spanish', 0, false, 'Spanish');

    const transDlBtn = [...container.querySelectorAll('button')].find((b) =>
      (b.getAttribute('aria-label') || '').includes('Spanish') && (b.getAttribute('aria-label') || '').toLowerCase().includes('download')
    );
    expect(transDlBtn).toBeTruthy();
    await act(async () => { transDlBtn.click(); });
    expect(handleDownloadAudio).toHaveBeenCalledWith('Hoja: Parte de una planta.', 'trans-0-Spanish-audio', 'dl-trans-0-Spanish', 'Spanish');

    const src = readFileSync('view_glossary_source.jsx', 'utf8');
    expect(src).toContain('handleUncachedGlossarySpeak(term, `fc-front-${standardDeckLang}`, standardDeckLang)');
    expect(src).toContain("handleUncachedGlossarySpeak(transTerm, 'fc-back-term', flashcardLang)");
    expect(src).toContain('`root-${idx}-${lang}-${ri}`, lang)');
  });

  it('#18 GlossaryView renders safely when generatedContent.data is { terms: [] } instead of an array', () => {
    const GlossaryView = window.AlloModules.GlossaryView;
    const saved = { id: 'wrapped-gl', type: 'glossary', title: 'Wrapped', data: { terms: [] } };
    const props = glossaryMediaProps({
      generatedContent: saved,
      filteredGlossaryData: [],
      displayLanguages: [],
      selectedLanguages: [],
    });
    const container = mountComponent(GlossaryView, props);
    expect(container.textContent).toBeTruthy();
  });

  it('#19, #25, #26 QuizView handles missing options, null reflection, object legacy reflection, graded/quick-check feedback banners, and correctIndex resolution + withholding', () => {
    const QuizView = window.AlloModules.QuizView;
    const baseProps = {
      t: (k) => k,
      formatInlineText: (v) => v,
      renderFormattedText: (v) => v,
      getRows: () => 2,
      isTeacherMode: false,
      isParentMode: false,
      isIndependentMode: false,
      isEditingQuiz: false,
      isPresentationMode: false,
      isReviewGame: false,
      showQuizAnswers: false,
      escapeRoomState: { isActive: false },
      sessionData: {},
      isFactChecking: {},
      studentMcqAnswers: {},
      studentMcqConfidence: {},
      reflectionAnswers: {},
      setReflectionDraft: vi.fn(),
      submitReflection: vi.fn(),
      reopenReflection: vi.fn(),
      selectMcqOption: vi.fn(),
      handleToggleShowQuizAnswers: vi.fn(),
    };

    // #19: missing options + null reflection + object legacy reflection
    const malformedContainer = mountComponent(QuizView, {
      ...baseProps,
      generatedContent: {
        id: 'q-malformed',
        type: 'quiz',
        data: {
          questions: [{ type: 'mcq', question: 'Broken MCQ without options' }],
          reflections: [null, { text: 'Valid reflection prompt' }],
        },
      },
    });
    expect(malformedContainer.textContent).toContain('Broken MCQ without options');
    expect(malformedContainer.textContent).toContain('Valid reflection prompt');

    const legacyObjContainer = mountComponent(QuizView, {
      ...baseProps,
      generatedContent: {
        id: 'q-legacy-ref',
        type: 'quiz',
        data: {
          questions: [],
          reflection: { text: 'Legacy object reflection text', text_en: 'English translation' },
        },
      },
    });
    expect(legacyObjContainer.textContent).toContain('Legacy object reflection text');

    // #25: gradedMode & quickCheckMode banners
    const gradedContainer = mountComponent(QuizView, {
      ...baseProps,
      generatedContent: {
        id: 'q-graded',
        type: 'quiz',
        data: {
          deliverySettings: { feedbackTiming: 'teacher-graded' },
          questions: [{ type: 'mcq', question: 'Q1', options: ['A', 'B'] }],
        },
      },
    });
    expect(gradedContainer.querySelector('[data-assessment-feedback-note]')?.textContent).toContain('Graded: answer feedback is withheld until your teacher checks your work.');

    const quickCheckContainer = mountComponent(QuizView, {
      ...baseProps,
      generatedContent: {
        id: 'q-quick',
        type: 'quiz',
        data: {
          deliverySettings: { feedbackTiming: 'immediate', quickCheckMode: true },
          questions: [{ type: 'mcq', question: 'Q1', options: ['A', 'B'] }],
        },
      },
    });
    expect(quickCheckContainer.querySelector('[data-assessment-feedback-note]')?.textContent).toContain('Quick check mode: answer feedback stays hidden until you submit.');

    // #26: withholdGradedQuizKeys strips correctIndex and referenceAnswer
    const quizWithIndex = {
      id: 'q-withhold',
      type: 'quiz',
      data: {
        deliverySettings: { feedbackTiming: 'teacher-graded' },
        questions: [{
          type: 'mcq',
          question: 'Pick two',
          options: ['One', 'Two'],
          correctIndex: 1,
          referenceAnswer: 'Two is the answer',
        }],
      },
    };
    const withheldFs = window.withholdGradedQuizKeys(quizWithIndex);
    expect(withheldFs.data.questions[0].correctIndex).toBeUndefined();
    expect(withheldFs.data.questions[0].referenceAnswer).toBeUndefined();

    // #26: Teacher view highlights correct option when only correctIndex is set
    const teacherContainer = mountComponent(QuizView, {
      ...baseProps,
      isTeacherMode: true,
      showQuizAnswers: true,
      generatedContent: {
        id: 'q-correct-index',
        type: 'quiz',
        data: {
          questions: [{
            type: 'mcq',
            question: 'Which is B?',
            options: ['Alpha', 'Beta'],
            correctIndex: 1,
          }],
        },
      },
    });
    expect(teacherContainer.innerHTML).toContain('bg-green-50');
  });

  it('#20, #21, #22 Quiz authoring & voice fixes', () => {
    const src = readFileSync('view_quiz_source.jsx', 'utf8');
    // #20 Sequence Sense empty/trailing comma filter
    expect(src).toContain(".filter(function (value) { return value !== ''; }).map(function (value) { return Number(value) - 1; }).filter(function (value) { return Number.isInteger(value) && value >= 0; })");
    // #21 DeferredAssessmentItem voice choose-answer / choose-evidence
    expect(src).toContain("type === 'answer-evidence' ? ['enter-response', 'choose', 'choose-answer', 'choose-evidence', 'check'] : ['enter-response', 'choose', 'check']");
    expect(src).toContain("var effectivePart = action === 'choose-evidence' ? 'evidence' : action === 'choose-answer' ? 'answer' : request.part;");
    // #22 Untyped legacy MCQ authoring controls
    expect(src).toContain("{currentType === 'mcq' && Array.isArray(q.options)");
  });

  it('#23 & #24 SimplifiedView cloze structured translation + fullwidth colon and saved-standards rigor button', () => {
    const src = readFileSync('view_simplified_source.jsx', 'utf8');
    expect(src).toContain("String(translated.term || translated.word || translated.text || '').split(/[:：]/)[0].trim()");
    expect(src).toContain("const hasRigorStandards = Boolean(generatedContent?.config?.standardsContext || generatedContent?.config?.standards || standardsInput);");
  });
});
