import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

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
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('tts_module.js');
  loadAlloModule('audio_helpers_module.js');
  loadAlloModule('read_aloud_audio_service_module.js');
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('live_aac_module.js');
  loadAlloModule('view_student_join_panel_module.js');
  loadAlloModule('view_sentence_frames_module.js');
  loadAlloModule('view_timeline_module.js');
  loadAlloModule('view_faq_module.js');
  loadAlloModule('view_dbq_module.js');
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  delete window._kokoroTTS;
  delete window._piperTTS;
  delete window.__loadKokoroTTS;
  delete window.__alloActiveAudioDownloadController;
  delete window.__alloCancelAudioDownload;
  delete window.__alloStudentAiDisabled;
  delete window.AlloSpeechPlayer;
  delete window.__alloFocusTrapStack;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Batch 1: Audio, Speech, and Read-Aloud Runtime (#1-#10)', () => {
  it('#1 toggleFluencyRecording invokes startFluencyRecording from deps and resets fluencyStatus to idle on error', async () => {
    const startFluencyRecording = vi.fn(async () => {});
    const stopFluencyRecording = vi.fn(async () => { throw new Error('mic failed'); });
    const setFluencyStatus = vi.fn();
    const baseDeps = {
      fluencyStatus: 'idle',
      fluencyTimeLimit: 0,
      fluencyStartTimeRef: { current: 0 },
      startFluencyRecording,
      stopFluencyRecording,
      setFluencyTranscript: vi.fn(),
      setFluencyResult: vi.fn(),
      setFluencyFeedback: vi.fn(),
      setShowFluencyConfetti: vi.fn(),
      setFluencyTimeRemaining: vi.fn(),
      setFluencyStatus,
      t: (k) => k,
      warnLog: vi.fn(),
    };
    await window.AlloModules.PhaseKHelpers.toggleFluencyRecording(baseDeps);
    expect(startFluencyRecording).toHaveBeenCalledTimes(1);
    expect(setFluencyStatus).toHaveBeenCalledWith('listening');

    setFluencyStatus.mockClear();
    await window.AlloModules.PhaseKHelpers.toggleFluencyRecording({ ...baseDeps, fluencyStatus: 'listening' });
    expect(stopFluencyRecording).toHaveBeenCalledTimes(1);
    expect(setFluencyStatus).toHaveBeenLastCalledWith('idle');

    for (const hostPath of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const host = readFileSync(hostPath, 'utf8');
      expect(host).toContain('startFluencyRecording,');
      expect(host).toContain('stopFluencyRecording,');
    }
  });

  it('#2 playSequence watchdog ignores paused audio and pauses/resumes timer on pause/play events', () => {
    const src = readFileSync('phase_k_helpers_source.jsx', 'utf8');
    expect(src).toContain('if (audio.paused || audio.ended) return;');
    expect(src).toContain("audio.addEventListener('pause', () => {");
    expect(src).toContain("audio.addEventListener('play', () => {");
  });

  it('#3 & #4 callTTSDirect routes non-English Gemini prompt with language profile and calls Piper fallback with (text, langCode, speed, options)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'fail' }));
    vi.stubGlobal('fetch', fetchMock);
    const kokoroSpeak = vi.fn(async () => 'blob:kokoro');
    const piperSupports = vi.fn((code) => code === 'es');
    const piperSpeak = vi.fn(async () => 'blob:piper-es');
    window._kokoroTTS = { ready: true, speak: kokoroSpeak };
    window._piperTTS = { ready: true, supportsLanguage: piperSupports, speak: piperSpeak };

    const tts = window.AlloModules.createTTS({
      state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 },
      apiKey: 'test-key',
      getApiKey: () => 'test-key',
      GEMINI_MODELS: { tts: 'gemini-2.5-flash-preview-tts' },
      AVAILABLE_VOICES: [{ id: 'Kore' }],
      _isCanvasEnv: false,
      languageToTTSCode: (lang) => (String(lang).toLowerCase().startsWith('span') ? 'es' : 'en'),
      isGlobalMuted: () => false,
      warnLog: vi.fn(),
      debugLog: vi.fn(),
      getLeveledTextLanguage: () => 'Spanish',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({ ttsProvider: 'auto' }),
      getAi: () => ({}),
      getSelectedVoice: () => 'Kore',
      getAvailableVoices: () => ['Kore'],
      setShowKokoroOfferModal: vi.fn(),
    });

    const url = await tts.callTTSDirect('Hola mundo, buenos dias.', 'Kore', 1, { maxRetries: 0, language: 'Spanish' });
    expect(url).toBe('blob:piper-es');
    // Non-Canvas Gemini payload used Spanish pronunciation prompt (not English-only instruction)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toContain('Pronounce the following Spanish text');
    expect(body.contents[0].parts[0].text).not.toContain('Read the following text aloud naturally');
    // Post-retry fallback skipped English-only Kokoro and called Piper with 2-letter code + positional args
    expect(kokoroSpeak).not.toHaveBeenCalled();
    expect(piperSupports).toHaveBeenCalledWith('es');
    expect(piperSpeak).toHaveBeenCalledWith('Hola mundo, buenos dias.', 'es', 1, { signal: null });
  });

  it('#5 & #6 fetchTTSBytes rejects browser voice with BROWSER_TTS_REQUIRED; handleDownloadAudio respects browser voice, passes word:false for Kokoro, and skips Kokoro for non-English', async () => {
    const tts = window.AlloModules.createTTS({
      state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 },
      apiKey: 'test-key',
      getApiKey: () => 'test-key',
      GEMINI_MODELS: { tts: 'gemini-2.5-flash-preview-tts' },
      AVAILABLE_VOICES: [{ id: 'Kore' }],
      _isCanvasEnv: false,
      languageToTTSCode: () => 'en',
      isGlobalMuted: () => false,
      warnLog: vi.fn(),
      debugLog: vi.fn(),
      getLeveledTextLanguage: () => 'English',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({ ttsProvider: 'auto' }),
      getAi: () => ({}),
      getSelectedVoice: () => 'browser',
      getAvailableVoices: () => ['Kore'],
      setShowKokoroOfferModal: vi.fn(),
    });
    expect(() => tts.fetchTTSBytes('Hello', 'browser')).toThrow(/Browser device voice/);
    try {
      tts.fetchTTSBytes('Hello', 'browser');
    } catch (err) {
      expect(err.code).toBe('BROWSER_TTS_REQUIRED');
      expect(err.useBrowserTts).toBe(true);
    }

    // Dialogue Script with selectedVoice === 'browser' shows device-voice info toast without calling fetchTTSBytes
    const addToast = vi.fn();
    const fetchTTSBytes = vi.fn();
    await window.AlloModules.AudioHelpers.handleDownloadAudio(
      'Alex: Hello there.\nSam: Hi Alex!\nAlex: How are you?',
      'dialogue',
      'dl-1',
      {
        AVAILABLE_VOICES: ['Kore', 'Fenrir'],
        fetchTTSBytes,
        callTTS: vi.fn(),
        downloadingContentId: null,
        selectedVoice: 'browser',
        textFormat: 'Dialogue Script',
        setDownloadingContentId: vi.fn(),
        persistentVoiceMapRef: { current: null },
        addToast,
        t: (k) => k,
        warnLog: vi.fn(),
        pcmToMp3: vi.fn(),
        pcmToWav: vi.fn(),
      }
    );
    expect(fetchTTSBytes).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('audio_device_voice_no_file'), 'info');

    // Non-English download with af_heart bypasses Kokoro and routes to fetchTTSBytes
    const loadKokoro = vi.fn();
    window.__loadKokoroTTS = loadKokoro;
    const callTTS = vi.fn();
    const fetchBytesEs = vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3, 4]) }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:es-dl');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await window.AlloModules.AudioHelpers.handleDownloadAudio('Hola mundo', 'es-audio', 'dl-es', {
      language: 'Spanish',
      AVAILABLE_VOICES: ['Kore'],
      fetchTTSBytes: fetchBytesEs,
      callTTS,
      downloadingContentId: null,
      selectedVoice: 'af_heart',
      textFormat: 'Standard',
      setDownloadingContentId: vi.fn(),
      persistentVoiceMapRef: { current: null },
      addToast: vi.fn(),
      t: (k) => k,
      warnLog: vi.fn(),
      pcmToMp3: null,
      pcmToWav: () => new ArrayBuffer(44),
    });
    expect(loadKokoro).not.toHaveBeenCalled();
    expect(callTTS).not.toHaveBeenCalled();
    expect(fetchBytesEs).toHaveBeenCalledTimes(1);

    const ahSrc = readFileSync('audio_helpers_source.jsx', 'utf8');
    expect(ahSrc).toContain('word: false,');
  });

  it('#7 handleCardAudioSequence stops instead of restarting when clicked a second time', async () => {
    const stopPlayback = vi.fn();
    const setIsPlaying = vi.fn();
    const setPlayingContentId = vi.fn();
    let resolvePending;
    const callTTS = vi.fn(() => new Promise((resolve) => { resolvePending = resolve; }));
    const deps = {
      generatedContent: { data: [{ term: 'Leaf', def: 'Part of a plant.' }] },
      selectedVoice: 'Kore',
      setIsPlaying,
      setPlayingContentId,
      audioRef: { current: null },
      isPlayingRef: { current: false },
      playbackSessionRef: { current: 1 },
      playbackRateRef: { current: 1 },
      flashcardIndex: 0,
      flashcardLang: 'English',
      flashcardMode: 'standard',
      standardDeckLang: 'English Only',
      addBlobUrl: vi.fn(),
      callTTS,
      stopPlayback,
      t: (k) => k,
      warnLog: vi.fn(),
    };
    const firstRun = window.AlloModules.AudioHelpers.handleCardAudioSequence(null, deps);
    // Let first run start playing and reach callTTS
    await Promise.resolve();
    expect(setPlayingContentId).toHaveBeenCalledWith('flashcard-sequence');
    // Second click while active should STOP, not restart a second sequence
    setPlayingContentId.mockClear();
    await window.AlloModules.AudioHelpers.handleCardAudioSequence(null, deps);
    expect(stopPlayback).toHaveBeenCalledTimes(2);
    expect(setPlayingContentId).toHaveBeenLastCalledWith(null);
    expect(setIsPlaying).toHaveBeenLastCalledWith(false);
    if (resolvePending) resolvePending(null);
    await firstRun;
  });

  it('#8, #9, #10 read_aloud_audio_service provenance lookup, captureProfile inspection, and dynamicSignal event methods', () => {
    const svcSrc = readFileSync('read_aloud_audio_service_source.jsx', 'utf8');
    const ttsSrc = readFileSync('tts_source.jsx', 'utf8');
    expect(svcSrc).toContain("const fullBinding = bindingFor(null, 'reference');");
    expect(svcSrc).toContain('const captureProfile = options.profile || (provenance && provenance.profile) || undefined;');
    expect(svcSrc).toContain('binding.controller.inspect(segment, { profile: captureProfile }).status');
    expect(svcSrc).toContain('addEventListener: (type, listener, listenerOptions) => {');
    expect(svcSrc).toContain('signal: dynamicSignal,');
    expect(ttsSrc).toContain("_signal.addEventListener?.('abort', relayKokoroAbort, { once: true })");
  });
});

describe('Batch 2: Live Sessions, Sync, and Student Join (#11-#20)', () => {
  it('#11 & #15 sanitizeHistoryForCloud preserves adventure snapshot.inventory and handles null/non-object entries safely', () => {
    expect(window.sanitizeHistoryForCloud(null)).toEqual([]);
    const result = window.sanitizeHistoryForCloud([
      null,
      'bad-entry',
      {
        id: 'adv-1',
        type: 'adventure',
        data: {
          sceneImage: 'data:image/png;base64,BBB',
          snapshot: {
            xp: 42,
            inventory: [{ name: 'Compass', image: 'data:image/png;base64,AAA' }, null],
          },
        },
      },
      {
        id: 'gl-1',
        type: 'glossary',
        data: [null, { term: 'Leaf', image: 'data:image/png;base64,CCC' }],
      },
      {
        id: 'per-1',
        type: 'persona',
        data: [null, { name: 'Ada', avatarUrl: 'x', chatHistory: ['secret'] }],
      },
    ]);
    expect(result).toHaveLength(3);
    expect(result[0].data.snapshot.inventory).toEqual([{ name: 'Compass' }, null]);
    expect(result[1].data).toEqual([null, { term: 'Leaf' }]);
    expect(result[2].data).toEqual([null, { name: 'Ada' }]);
  });

  it('#12, #13, #14 Firestore & LiveAAC strip applied-challenge teacher fields, extra graded key fields, and itemType sequence-sense order', () => {
    const applied = {
      id: 'ac-1',
      type: 'applied-challenge',
      data: {
        brief: { prompt: 'Design a bridge' },
        sourceExcerpt: 'Teacher-only source excerpt text',
        qualityReview: { notes: 'Teacher critique' },
      },
    };
    const strippedApplied = window.stripTeacherOnlyResourceFields(applied);
    expect(strippedApplied.data.brief.prompt).toBe('Design a bridge');
    expect(strippedApplied.data.sourceExcerpt).toBeUndefined();
    expect(strippedApplied.data.qualityReview).toBeUndefined();

    const quiz = {
      id: 'qz-1',
      type: 'quiz',
      data: {
        deliverySettings: { feedbackTiming: 'teacher-graded' },
        questions: [
          {
            type: 'mcq',
            question: 'Q1',
            options: ['A', 'B'],
            correct: 'B',
            correctIndices: [1],
            expectedEvidence: 'Line 4',
          },
          {
            itemType: 'sequence-sense',
            question: 'Order steps',
            items: ['First', 'Second', 'Third'],
            presentedOrder: [2, 0, 1],
          },
        ],
      },
    };
    const withheldFs = window.withholdGradedQuizKeys(quiz);
    expect(withheldFs.data.questions[0].correct).toBeUndefined();
    expect(withheldFs.data.questions[0].correctIndices).toBeUndefined();
    expect(withheldFs.data.questions[0].expectedEvidence).toBeUndefined();
    expect(withheldFs.data.questions[1].items).toEqual(['Third', 'First', 'Second']);
    expect(withheldFs.data.questions[1].presentedOrder).toEqual([0, 1, 2]);
  });

  it('#16, #17, #18 LiveAacBoardDialog aligns shortcut labels with interactiveCells, keeps focus trap stable, and cancels speech fallback on unmount', async () => {
    const LiveAacBoardDialog = window.AlloModules.LiveAac.LiveAacBoardDialog;
    let resolveSpeak;
    const onSpeak = vi.fn(() => new Promise((resolve) => { resolveSpeak = resolve; }));
    const speakSynthSpy = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak: speakSynthSpy, cancel: vi.fn(), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
    window.__alloStudentAiDisabled = true;

    const payload = {
      payloadId: 'aac-1',
      package: {
        board: { title: 'Classroom Board', locale: 'en-US', direction: 'ltr' },
        pages: [{
          title: 'Page 1',
          cols: 2,
          cells: [
            { id: 'blank-0', displayLabel: '' },
            { id: 'cell-1', displayLabel: 'Water', vocalLabel: 'I want water' },
          ],
        }],
      },
    };
    const container = mountComponent(LiveAacBoardDialog, { payload, onSpeak, onDismiss: vi.fn(), t: (k) => k });
    // #18: Water is the 1st interactive cell (index 1 in grid after blank), so shortcut must be 1
    const waterBtn = [...container.querySelectorAll('button[role="gridcell"]')].find((b) => b.textContent.includes('Water'));
    expect(waterBtn.getAttribute('aria-label')).toBe('Water, shortcut 1');

    // #17: Focus trap pushed once and not re-pushed when clicking a cell (state update)
    const initialTrap = window.__alloFocusTrapStack[window.__alloFocusTrapStack.length - 1];
    await act(async () => { waterBtn.click(); });
    expect(window.__alloFocusTrapStack[window.__alloFocusTrapStack.length - 1]).toBe(initialTrap);

    // #16: Unmount before onSpeak resolves false -> device voice must NOT speak after unmount
    const unmount = cleanups.pop();
    unmount();
    resolveSpeak(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(speakSynthSpy).not.toHaveBeenCalled();
  });

  it('#19 LiveSessionDock Word Sounds audio buttons fall back to targetId and guard history', () => {
    const src = readFileSync('view_live_session_dock_source.jsx', 'utf8');
    const matches = src.match(/entry\.viewingResourceId \|\| targetId \|\| sessionData\?\.currentResourceId \|\| null/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(src).toContain('(history || []).find(item => item && item.id === resourceId)');
  });

  it('#20 StudentJoinPanel strips punctuation and en-dashes before slicing 5-character join code', () => {
    const StudentJoinPanel = window.AlloModules.StudentJoinPanel?.StudentJoinPanel || window.AlloModules.StudentJoinPanel;
    const setJoinCodeInput = vi.fn();
    const container = mountComponent(StudentJoinPanel, {
      t: (k) => k,
      appId: 'alloflow',
      isJoinPanelExpanded: true,
      joinAppIdInput: '',
      setJoinAppIdInput: vi.fn(),
      joinCodeInput: '',
      setJoinCodeInput,
      joinClassSession: vi.fn(),
      handleSetIsJoinPanelExpandedToFalse: vi.fn(),
      handleSetIsJoinPanelExpandedToTrue: vi.fn(),
    });
    const codeInput = container.querySelector('#student-join-code');
    expect(codeInput).toBeTruthy();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(codeInput, '#ab–12c');
      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(setJoinCodeInput).toHaveBeenCalledWith('AB12C');
  });
});

describe('Batch 3: Core Classroom Views (#21-#28)', () => {
  it('#21 & #22 SentenceFramesView keeps empty textareas mounted in edit mode and renders non-English RTL companion translations on English scaffolds', () => {
    const SentenceFramesView = window.AlloModules.SentenceFramesView;
    const baseProps = {
      t: (k) => k,
      isTeacherMode: true,
      isIndependentMode: false,
      isParentMode: false,
      isEditingScaffolds: true,
      leveledTextLanguage: 'English',
      studentResponses: {},
      activeFieldRef: { current: null },
      gradingSession: { isOpen: false },
      gradingTriggerRef: { current: null },
      getRows: () => 2,
      handleScaffoldChange: vi.fn(),
      handleScaffoldTextChange: vi.fn(),
      handleStudentInput: vi.fn(),
      handleToggleIsEditingScaffolds: vi.fn(),
    };

    // #21: Empty item text in edit mode stays mounted
    const editListContainer = mountComponent(SentenceFramesView, {
      ...baseProps,
      generatedContent: {
        id: 'sf-1',
        type: 'sentence-frames',
        data: { mode: 'list', items: [{ text: '', text_en: '' }] },
      },
    });
    expect(editListContainer.querySelectorAll('textarea').length).toBeGreaterThanOrEqual(2);

    // #21: Empty paragraph frame in edit mode stays mounted (not replaced by empty banner)
    const editParaContainer = mountComponent(SentenceFramesView, {
      ...baseProps,
      generatedContent: {
        id: 'sf-2',
        type: 'sentence-frames',
        data: { mode: 'paragraph', text: '', text_en: '' },
      },
    });
    expect(editParaContainer.querySelectorAll('textarea').length).toBeGreaterThanOrEqual(2);

    // #22: English list scaffold with Arabic companion translation renders visible in read mode with RTL dir
    const readContainer = mountComponent(SentenceFramesView, {
      ...baseProps,
      isEditingScaffolds: false,
      generatedContent: {
        id: 'sf-3',
        type: 'sentence-frames',
        config: { language: 'English', translationPolicy: { enabled: true, target: 'Arabic' } },
        data: { mode: 'list', items: [{ text: 'First, I noticed...', text_en: 'أولاً، لاحظت...' }] },
      },
    });
    expect(readContainer.textContent).toContain('أولاً، لاحظت...');
    const compNode = [...readContainer.querySelectorAll('p')].find((p) => p.textContent.includes('أولاً'));
    expect(compNode.getAttribute('lang')).toMatch(/^ar/i);
    expect(compNode.getAttribute('dir')).toBe('rtl');
  });

  it('#23 TimelineView keeps companion translation inputs mounted when event_en is cleared in edit mode', () => {
    const TimelineView = window.AlloModules.TimelineView;
    const container = mountComponent(TimelineView, {
      t: (k) => k,
      isTeacherMode: true,
      isIndependentMode: false,
      isEditingTimeline: true,
      leveledTextLanguage: 'English',
      generatedContent: {
        id: 'tl-1',
        type: 'timeline',
        data: [{ date: '1776', event: 'Declaration', date_en: '1776', event_en: '' }],
      },
      timelineImageSize: 120,
      isGeneratingTimelineImage: {},
      timelineRefinementInputs: {},
      setTimelineRefinementInputs: vi.fn(),
      handleTimelineChange: vi.fn(),
      handleAddTimelineStep: vi.fn(),
      handleDeleteTimelineStep: vi.fn(),
      handleTimelineMove: vi.fn(),
      handleToggleIsEditingTimeline: vi.fn(),
      handleSetIsTimelineGameToTrue: vi.fn(),
      setTimelineImageSize: vi.fn(),
    });
    const transInputs = [...container.querySelectorAll('input[placeholder*="Companion translation"]')];
    expect(transInputs.length).toBe(2);
  });

  it('#24 FaqView aligns student Listen sentence indices with unfiltered handleSpeak queue when earlier FAQs are deselected', () => {
    const FaqView = window.AlloModules.FaqView;
    const handleSpeak = vi.fn();
    const container = mountComponent(FaqView, {
      t: (k) => k,
      isTeacherMode: false,
      isEditingFaq: false,
      leveledTextLanguage: 'English',
      generatedContent: {
        id: 'faq-1',
        type: 'faq',
        data: [
          { question: 'Hidden Q1?', answer: 'Hidden A1.', isSelected: false },
          { question: 'Visible Q2?', answer: 'Visible A2.', isSelected: true },
        ],
      },
      splitTextToSentences: (s) => String(s || '').split(/(?<=[.!?])\s+/).filter(Boolean),
      formatInteractiveText: (s) => s,
      handleSpeak,
      isPlaying: false,
      playingContentId: null,
      playbackState: { currentIdx: -1 },
      voiceSpeed: 1,
      setVoiceSpeed: vi.fn(),
      audioRef: { current: null },
      playbackSessionRef: { current: null },
      setIsPlaying: vi.fn(),
      setPlayingContentId: vi.fn(),
    });
    const listenBtn = container.querySelector('button[data-faq-listen-question]');
    expect(listenBtn).toBeTruthy();
    act(() => { listenBtn.click(); });
    // FAQ 0 occupied indices 0 (question) and 1 (answer), so FAQ 1 starts at index 2
    expect(handleSpeak).toHaveBeenCalledWith('Visible Q2?', 'faq-active', 2);
  });

  it('#25-#28 DbqView hides empty sentenceStarters, ignores error feedback in progress, passes saved language to Listen, and prints corroboration table', () => {
    const DbqView = window.AlloModules.DbqView;
    const speakMock = vi.fn(() => Promise.resolve(null));
    window.AlloSpeechPlayer = { speak: speakMock, stop: vi.fn() };
    const container = mountComponent(DbqView, {
      t: (k) => k,
      isTeacherMode: false,
      gradeLevel: '8th Grade',
      selectedVoice: 'Kore',
      callGemini: vi.fn(),
      studentResponses: {
        'dbq-1': {
          '_docFeedback_A': { error: 'Network error' },
          '_corrobFeedback': { error: 'Network error' },
        },
      },
      handleStudentInput: vi.fn(),
      handleScoreUpdate: vi.fn(),
      generatedContent: {
        id: 'dbq-1',
        type: 'dbq',
        config: { language: 'Spanish' },
        data: {
          title: 'DBQ Test',
          prompt: 'Analyze the documents.',
          documents: [{
            id: 'A',
            title: 'Documento A',
            source: 'Archivo',
            excerpt: 'Texto de prueba en espanol.',
            sourcingQuestions: ['Who wrote this?'],
            sentenceStarters: [],
          }],
          corroborationClaims: [],
          rubric: [],
        },
      },
    });

    // #28: Empty sentenceStarters does not render broken "Try starting with:"
    expect(container.textContent).not.toContain('Try starting with:');

    // #27: Error feedback objects do not falsely mark Feedback or Corroborate steps complete
    const fbStep = [...container.querySelectorAll('span, div')].find((el) => el.textContent.trim().endsWith('Feedback') && el.textContent.includes('✓'));
    expect(fbStep).toBeFalsy();

    // #26: Listen passes DBQ saved language 'Spanish'
    const listenBtn = container.querySelector('button[data-dbq-listen]');
    expect(listenBtn).toBeTruthy();
    act(() => { listenBtn.click(); });
    expect(speakMock).toHaveBeenCalledWith(expect.stringContaining('Texto de prueba'), expect.objectContaining({ language: 'Spanish' }));

    // #25: Print DBQ Packet includes the 4-column Corroboration Matrix table when claims.length === 0
    const dbqSrc = readFileSync('view_dbq_source.jsx', 'utf8');
    expect(dbqSrc).toContain('r[`corrob-claim-${d.id}`]');
    expect(dbqSrc).toContain('r[`corrob-agree-${d.id}`]');
    expect(dbqSrc).toContain('r[`corrob-disagree-${d.id}`]');
    expect(dbqSrc).toContain('u.onerror = finished;');
  });
});
