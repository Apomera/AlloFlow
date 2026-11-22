import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let GeminiBridgeView;
let SavedMathAssessmentView;
let StemArtworkHandoffView;
let SessionStartOptionsView;
let TranslateModalView;
let LmsAuditBannerView;
let ReadThisPagePanelView;
let ClozeInput;
let WordSoundsReviewPanel;
let UDLGuideModal;
let AIBackendModal;
let GroupSessionModal;
let FluencyModePanel;
let TourOverlay;
let VolumeBuilderView;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function unmountAll() {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
}

function setFieldValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

async function runAxe(container) {
  const result = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

const NullIcon = () => null;
const emptyT = () => '';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  window.AlloLanguageContext = React.createContext({ t: emptyT });
  window.AlloIcons = new Proxy({}, { get: () => NullIcon });
  window.__alloHooks = { useFocusTrap: () => {} };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  for (const name of ['Volume2', 'RefreshCw', 'ImageIcon', 'ChevronDown', 'ChevronLeft', 'Play', 'CheckCircle2', 'Ban', 'Send', 'X']) {
    if (!globalThis[name]) globalThis[name] = NullIcon;
  }

  loadAlloModule('view_cold_path_screens_module.js');
  loadAlloModule('view_cold_path_surfaces_module.js');
  loadAlloModule('misc_components_module.js');
  loadAlloModule('view_misc_modals_module.js');
  loadAlloModule('fluency_module.js');
  loadAlloModule('view_misc_panels_module.js');

  GeminiBridgeView = window.AlloModules.GeminiBridgeView;
  SavedMathAssessmentView = window.AlloModules.SavedMathAssessmentView;
  StemArtworkHandoffView = window.AlloModules.StemArtworkHandoffView;
  SessionStartOptionsView = window.AlloModules.SessionStartOptionsView;
  TranslateModalView = window.AlloModules.TranslateModalView;
  LmsAuditBannerView = window.AlloModules.LmsAuditBannerView;
  ReadThisPagePanelView = window.AlloModules.ReadThisPagePanelView;
  ClozeInput = window.AlloModules.ClozeInput;
  WordSoundsReviewPanel = window.AlloModules.WordSoundsReviewPanel;
  UDLGuideModal = window.AlloModules.UDLGuideModal;
  AIBackendModal = window.AlloModules.AIBackendModal;
  GroupSessionModal = window.AlloModules.GroupSessionModal;
  FluencyModePanel = window.AlloModules.FluencyModePanel;
  TourOverlay = window.AlloModules.TourOverlay;
  VolumeBuilderView = window.AlloModules.VolumeBuilderView;
});

afterEach(() => {
  unmountAll();
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
  delete window.__alloAiUsable;
  delete window.__alloStudentAiDisabled;
  document.body.style.overflow = '';
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('Wave 21 polish — ColdPathScreens/Surfaces, MiscComponents, MiscModals, MiscPanels', () => {
  it('ColdPathScreens & ColdPathSurfaces render bridge copy-all, saved math verdicts/progressbar, handoff counter, read-this-page progressbar, and pass axe', async () => {
    const copyToClipboard = vi.fn();

    const bridgeHost = mountEl(React.createElement(GeminiBridgeView, {
      t: emptyT,
      Copy: NullIcon,
      Terminal: NullIcon,
      copyToClipboard,
      generatedContent: {
        data: ['Explain chlorophyll.', 'Simplify for grade 4.'],
      },
    }));
    const copyAllBtn = bridgeHost.querySelector('[data-bridge-copy-all]');
    expect(copyAllBtn).toBeTruthy();
    await act(async () => { copyAllBtn.click(); });
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    expect(bridgeHost.querySelector('[data-bridge-step-copied]').textContent).toContain('Copied all prompt steps');
    await runAxe(bridgeHost);
    unmountAll();

    const mathHost = mountEl(React.createElement(SavedMathAssessmentView, {
      t: emptyT,
      formatInlineText: (v) => v,
      generatedContent: {
        title: 'Fractions Check',
        data: {
          score: 1,
          total: 2,
          results: [
            { question: '1/2 = ?', response: '2/4', correct: true },
            { question: '2/3 = ?', response: '3/6', correct: false },
          ],
        },
      },
    }));
    const mathBar = mathHost.querySelector('[role="progressbar"]');
    expect(mathBar).toBeTruthy();
    expect(mathBar.getAttribute('aria-valuetext')).toContain('1 of 2');
    expect(mathHost.querySelector('[data-saved-math-verdict="correct"]')).toBeTruthy();
    expect(mathHost.querySelector('[data-saved-math-verdict="incorrect"]')).toBeTruthy();
    await runAxe(mathHost);
    unmountAll();

    const handoffSubmit = vi.fn();
    const handoffHost = mountEl(React.createElement(StemArtworkHandoffView, {
      t: emptyT,
      _alloReadVisualSupportCollection: () => [],
      stemArtworkHandoff: { src: 'data:image/png;base64,iVBORw0KGgo=', title: 'Solar Cell' },
      stemArtworkLabel: 'Solar Cell',
      setStemArtworkLabel: vi.fn(),
      stemArtworkDestination: 'board:new',
      setStemArtworkDestination: vi.fn(),
      stemArtworkHandoffRef: { current: null },
      setStemArtworkHandoff: vi.fn(),
      saveStemArtworkAsVisualSupport: handoffSubmit,
      history: [],
    }));
    expect(handoffHost.querySelector('[data-stem-artwork-label-count]').textContent).toContain('10 / 80');
    await runAxe(handoffHost);
    unmountAll();

    const sessionHost = mountEl(React.createElement(SessionStartOptionsView, {
      t: emptyT,
      X: NullIcon,
      setShowSessionStartOptions: vi.fn(),
      setShowLiveLessonPrep: vi.fn(),
      startClassSession: vi.fn(),
      setMbPanelOpen: vi.fn(),
    }));
    expect(sessionHost.querySelector('[role="dialog"]').getAttribute('aria-describedby')).toBe('session-start-options-desc');
    expect(sessionHost.querySelectorAll('button')).toHaveLength(4);
    await runAxe(sessionHost);
    unmountAll();

    const clearLang = vi.fn();
    const translateHost = mountEl(React.createElement(TranslateModalView, {
      t: emptyT,
      Languages: NullIcon,
      X: NullIcon,
      _alloHostHandlersOptional: () => ({
        getTranslationBatchItems: () => ({ items: [{ id: 'doc-1' }], kind: 'pack' }),
      }),
      currentUiLanguage: 'en',
      generatedContent: { id: 'doc-1', type: 'simplified', title: 'Water Cycle' },
      handleSetIsTranslateModalOpenToFalse: vi.fn(),
      handleTranslateAction: vi.fn(),
      headerTranslationMode: 'direct',
      isProcessing: false,
      resolveTranslationPolicy: () => ({ mode: 'direct', allowedModes: ['direct'], reason: '' }),
      selectedLanguages: ['Spanish'],
      setHeaderTranslationMode: vi.fn(),
      setTargetTranslationLang: clearLang,
      setTranslateScope: vi.fn(),
      targetTranslationLang: 'Spanish',
      translationMode: 'direct',
      translationTargetChoices: () => ['Spanish'],
    }));
    const clearBtn = translateHost.querySelector('[data-translate-clear-lang]');
    expect(clearBtn).toBeTruthy();
    act(() => { clearBtn.click(); });
    expect(clearLang).toHaveBeenCalledWith('');
    await runAxe(translateHost);
    unmountAll();

    const rtpHost = mountEl(React.createElement(ReadThisPagePanelView, {
      t: emptyT,
      Ear: NullIcon,
      _readThisPageItemAt: vi.fn(),
      closeReadThisPage: vi.fn(),
      focusNarrationEnabled: true,
      getReadableContent: () => [
        { type: 'heading', text: 'Chapter 1: Ecosystems' },
        { type: 'paragraph', text: 'Producers convert sunlight into energy.' },
      ],
      readAllReadThisPage: vi.fn(),
      rtpCurrentIndex: 0,
      rtpPanelRef: { current: null },
      rtpPlaybackState: 'playing',
      setFocusNarrationEnabled: vi.fn(),
      stopReadThisPage: vi.fn(),
      theme: 'light',
    }));
    const rtpProgress = rtpHost.querySelector('[role="progressbar"]');
    expect(rtpProgress).toBeTruthy();
    expect(rtpProgress.getAttribute('aria-valuetext')).toContain('1 of 2');
    expect(rtpHost.querySelector('[data-rtp-active-badge]')).toBeTruthy();
    await runAxe(rtpHost);
    unmountAll();

    const lmsHost = mountEl(React.createElement(LmsAuditBannerView, {
      t: emptyT,
      addToast: vi.fn(),
      beginPdfDocumentIntake: vi.fn(() => 1),
      isPdfDocumentIntakeCurrent: vi.fn(() => true),
      lmsAuditFetchControllerRef: { current: null },
      lmsAuditUrls: ['https://school.edu/files/syllabus.pdf'],
      setGenerationStep: vi.fn(),
      setIsExtracting: vi.fn(),
      setLmsAuditUrls: vi.fn(),
      setPdfAuditResult: vi.fn(),
      setPendingPdfBase64: vi.fn(),
      setPendingPdfFile: vi.fn(),
    }));
    expect(lmsHost.querySelector('[role="region"]')).toBeTruthy();
    await runAxe(lmsHost);
  });

  it('MiscComponents ClozeInput and WordSoundsReviewPanel expose readiness progressbar, progressive filter, accessible fallbacks, and pass axe', async () => {
    const clozeHost = mountEl(React.createElement(ClozeInput, {
      targetWord: 'chlorophyll',
      acceptedAnswers: ['chlorophyll'],
      passageWord: 'chlorophyll',
      isSolved: false,
      onCorrect: vi.fn(),
    }));
    expect(clozeHost.querySelector('input').getAttribute('aria-label')).toBe('Fill in the blank');
    await runAxe(clozeHost);
    unmountAll();

    const words = ['cat', 'sun', 'map', 'frog', 'ship', 'star'].map((w, i) => ({
      id: `w-${i}`,
      word: w,
      targetWord: w,
      phonemes: w.split(''),
      ttsReady: i < 4,
      rhymeWord: 'hat',
      rhymeDistractors: ['dog'],
    }));
    const reviewHost = mountEl(React.createElement(WordSoundsReviewPanel, {
      preloadedWords: words,
      t: emptyT,
      onClose: vi.fn(),
      onStartActivity: vi.fn(),
      onUpdateWord: vi.fn(),
      onPlayAudio: vi.fn(async () => {}),
      onDeleteWord: vi.fn(),
      onReorderWords: vi.fn(),
      activitySequence: ['rhyming', 'blending'],
    }));

    const readinessBar = reviewHost.querySelector('[data-ws-review-readiness-bar="true"]');
    expect(readinessBar).toBeTruthy();
    expect(readinessBar.getAttribute('role')).toBe('progressbar');
    expect(readinessBar.getAttribute('aria-valuenow')).toBe('4');
    expect(readinessBar.getAttribute('aria-valuemax')).toBe('6');

    const filterInput = reviewHost.querySelector('[data-ws-review-filter="true"]');
    expect(filterInput).toBeTruthy();
    setFieldValue(filterInput, 'frog');
    expect(reviewHost.textContent).toContain('1 / 6');
    const clearBtn = reviewHost.querySelector('[data-ws-review-filter-clear="true"]');
    expect(clearBtn).toBeTruthy();
    act(() => { clearBtn.click(); });
    expect(reviewHost.textContent).toContain('6 / 6');

    await runAxe(reviewHost);
  });

  it('MiscModals UDLGuideModal and AIBackendModal preserve accessible semantics, 44px controls, zero focus traps issues, and pass axe', async () => {
    const chatStyles = {
      container: 'bg-white', header: 'bg-indigo-700 text-white', body: 'bg-white',
      inputArea: 'bg-white', userBubble: 'bg-indigo-700 text-white', modelBubble: 'bg-slate-100 text-slate-900',
      button: 'bg-indigo-700 text-white', secondaryButton: 'bg-white text-slate-800 border border-slate-300',
      input: 'bg-white text-slate-900', text: 'text-slate-900', subText: 'text-slate-700',
    };
    const udlHost = mountEl(React.createElement(UDLGuideModal, {
      showUDLGuide: true,
      udlMessages: [{ role: 'model', text: 'How can I help adapt this lesson?' }],
      udlInput: '',
      udlInputRef: { current: null },
      udlScrollRef: { current: null },
      chatStyles,
      theme: 'light',
      t: (k, f) => (typeof f === 'string' ? f : ''),
      renderFormattedText: (txt) => txt,
      handleSendUDLMessage: vi.fn(),
      setUdlInput: vi.fn(),
      setUdlMessages: vi.fn(),
      isChatProcessing: false,
      isAutoFillMode: false,
      hasUsedAutoFill: false,
      activeBlueprint: null,
      InteractiveBlueprintCard: () => null,
      suggestedStandards: [],
      aiStandardQuery: '',
      aiStandardRegion: '',
      udlStandardFramework: 'Common Core ELA',
      udlStandardGrade: '5th Grade',
      addToast: vi.fn(),
      handleAutoFillToggle: vi.fn(),
      handleBlueprintUIUpdate: vi.fn(),
      handleExecuteBlueprint: vi.fn(),
      handleFindStandards: vi.fn(),
      handleSetShowUDLGuideToFalse: vi.fn(),
      handleToggleAutoSendVoice: vi.fn(),
      handleToggleIsShowMeMode: vi.fn(),
      handleToggleIsUDLGuideExpanded: vi.fn(),
      saveFullChat: vi.fn(),
      saveUDLAdvice: vi.fn(),
      setActiveBlueprint: vi.fn(),
      setAiStandardQuery: vi.fn(),
      setAiStandardRegion: vi.fn(),
      setIsBotVisible: vi.fn(),
      setIsConversationMode: vi.fn(),
      setIsDictationMode: vi.fn(),
      setStandardsInput: vi.fn(),
      setUdlStandardFramework: vi.fn(),
      setUdlStandardGrade: vi.fn(),
    }));
    expect(udlHost.querySelector('[data-help-key="chat_send"]').className).toContain('min-h-11');
    await runAxe(udlHost);
    unmountAll();

    const aiHost = mountEl(React.createElement(AIBackendModal, {
      _isCanvasEnv: false,
      ai: null,
      showAIBackendModal: true,
      setShowAIBackendModal: vi.fn(),
      t: emptyT,
      GEMINI_MODELS: {},
    }));
    const advToggle = aiHost.querySelector('[data-help-key="ai_backend_advanced_toggle"]');
    expect(advToggle.className).toContain('min-h-11');
    await runAxe(aiHost);
  });

  it('MiscPanels GroupSessionModal, FluencyModePanel, TourOverlay, and VolumeBuilderView expose progressbars, aria-valuetext, 44px controls, and pass axe', async () => {
    const createGroup = vi.fn();
    const groupHost = mountEl(React.createElement(GroupSessionModal, {
      showGroupModal: true,
      activeSessionCode: 'ROOM42',
      sessionData: {
        resources: [{ id: 'r1', title: 'Fraction Lab', type: 'quiz' }],
        groups: { g1: { name: 'Blue Team', resourceId: 'r1' } },
        roster: { s1: { name: 'Avery', connected: true, groupId: 'g1' } },
      },
      newGroupName: 'Green Team',
      setNewGroupName: vi.fn(),
      handleCreateGroup: createGroup,
      handleDeleteGroup: vi.fn(),
      handleSetGroupResource: vi.fn(),
      handleAssignStudent: vi.fn(),
      handleReorderResources: vi.fn(),
      handleSetShowGroupModalToFalse: vi.fn(),
      isPushingResource: {},
      t: emptyT,
    }));
    const groupInput = groupHost.querySelector('[data-help-key="group_create_input"]');
    act(() => {
      groupInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(createGroup).toHaveBeenCalledTimes(1);
    expect(groupHost.textContent).toContain('Connected:');
    await runAxe(groupHost);
    unmountAll();

    const F = window.AlloModules.Fluency;
    const fluencyHost = mountEl(React.createElement(FluencyModePanel, {
      ConfettiExplosion: () => null,
      FLUENCY_BENCHMARKS: { 3: { fall: 71, winter: 92, spring: 107 } },
      calculateRunningRecordMetrics: F.calculateRunningRecordMetrics,
      exportFluencyCSV: vi.fn(),
      generateFluencyScoreSheet: vi.fn(),
      getBenchmarkComparison: () => ({ level: 'at', target: 92 }),
      fluencyBenchmarkGrade: '3',
      fluencyBenchmarkSeason: 'winter',
      fluencyCustomNorms: { fall: 0, winter: 0, spring: 0 },
      fluencyFeedback: 'Great expressive phrasing!',
      fluencyModalRef: { current: null },
      fluencyStatus: 'complete',
      fluencyResult: {
        wcpm: 95,
        accuracy: 96,
        correctWords: 48,
        totalReferenceWordCount: 50,
        errorCount: 2,
        durationSeconds: 30,
        prosody: { pacing: 4, expression: 5, phrasing: 4 },
        confidence: { overall: 8, audioQuality: 9, speakerClarity: 8 },
        wordData: [{ word: 'Ecosystems', status: 'correct' }],
        review: { status: 'reviewed', revision: 1, reviewer: 'Ms. Rivera' },
      },
      fluencyTimeLimit: 60,
      fluencyTimeRemaining: 30,
      fluencyTimerVisibility: 'visible',
      fluencyTranscript: 'Ecosystems',
      generatedContent: { id: 'f1', title: 'Ecosystems', data: 'Ecosystems thrive with sunlight.' },
      isFluencyMode: true,
      setFluencyBenchmarkGrade: vi.fn(),
      setFluencyBenchmarkSeason: vi.fn(),
      setFluencyCustomNorms: vi.fn(),
      setFluencyFeedback: vi.fn(),
      setFluencyResult: vi.fn(),
      setFluencyStatus: vi.fn(),
      setFluencyTimeLimit: vi.fn(),
      setFluencyTimeRemaining: vi.fn(),
      setFluencyTimerVisibility: vi.fn(),
      setFluencyTranscript: vi.fn(),
      setIsFluencyMode: vi.fn(),
      showFluencyConfetti: false,
      t: emptyT,
      toggleFluencyRecording: vi.fn(),
      applyFluencyReview: F.applyFluencyReview,
      fluencyAssessments: [],
      isTeacherMode: true,
      saveFluencyReview: null,
      summarizeFluencyEvidence: F.summarizeFluencyEvidence,
    }));
    const prosodyBars = fluencyHost.querySelectorAll('[role="progressbar"]');
    expect(prosodyBars.length).toBe(3);
    expect(prosodyBars[0].getAttribute('aria-valuetext')).toContain('4 of 5');
    await runAxe(fluencyHost);
    unmountAll();

    const tourHost = mountEl(React.createElement(TourOverlay, {
      runTour: true,
      tourRect: { top: 80, left: 20, right: 200, bottom: 180, width: 180, height: 100 },
      tourStep: 0,
      tourSteps: [
        { title: 'Welcome', text: 'Explore AlloFlow.' },
        { title: 'Build Lessons', text: 'Create UDL resources.' },
      ],
      t: emptyT,
      handleNextTourStep: vi.fn(),
      handlePrevTourStep: vi.fn(),
      handleSetRunTourToFalse: vi.fn(),
      setRunTour: vi.fn(),
      setIsSpotlightMode: vi.fn(),
      setSpotlightMessage: vi.fn(),
    }));
    const tourBar = tourHost.querySelector('[data-tour-progress-bar="true"]');
    expect(tourBar).toBeTruthy();
    expect(tourBar.getAttribute('aria-valuetext')).toContain('Step 1 of 2');
    await runAxe(tourHost);
    unmountAll();

    const volumeHost = mountEl(React.createElement(VolumeBuilderView, {
      mathMode: 'Volume Builder',
      cubeAnswer: '24',
      setCubeAnswer: vi.fn(),
      cubeFeedback: null,
      setCubeFeedback: vi.fn(),
      cubeChallenge: { l: 4, w: 3, h: 2, shape: 'rect', answer: 24 },
      setCubeChallenge: vi.fn(),
      cubeDims: { l: 4, w: 3, h: 2 },
      cubeDragRef: { current: null },
      cubeNotch: { l: 1, w: 1, h: 1 },
      cubeRotation: { x: -25, y: -35 },
      cubeScale: 1,
      cubeShape: 'rect',
      cubeShowLayers: null,
      exploreDifficulty: 'medium',
      getAdaptiveDifficulty: () => 'medium',
      setCubeDims: vi.fn(),
      setCubeNotch: vi.fn(),
      setCubeRotation: vi.fn(),
      setCubeScale: vi.fn(),
      setCubeShape: vi.fn(),
      setCubeShowLayers: vi.fn(),
      setExploreDifficulty: vi.fn(),
      t: emptyT,
    }));
    const lengthSlider = volumeHost.querySelector('input[aria-label="Length"]');
    expect(lengthSlider.getAttribute('aria-valuetext')).toBe('Length: 4 units');
    const zoomInBtn = volumeHost.querySelector('button[aria-label="Zoom in"]');
    expect(zoomInBtn.className).toContain('min-h-11');
    await runAxe(volumeHost);
  });
});
