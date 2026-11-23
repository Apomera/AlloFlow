// Track 4: 6th Input Source Text Pathway ("Dictate or record" Dictation Studio),
// Local Whisper default with first-time download warning + strengths comparison +
// rationale for using both, 240s LargeFileHandler chunking fix, and strictly opt-in
// Gemini audio cross-triangulation.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act;
let V, SpeechSetup, LargeFileHandler, LargeFileTranscriptionModal, QuickStartWizard, PhaseOHandlers, SidebarPanels;
let root, host;

const T = {
  'common.next': 'Next',
  'common.finish': 'Finish',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
};

function flush() {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function click(el) {
  expect(el, 'expected clickable element').toBeTruthy();
  act(() => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

function setTextarea(el, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

function makeFakeAudioBuffer(durationSec, sampleRate = 16000) {
  const length = Math.round(durationSec * sampleRate);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = 0.2 * Math.sin(i / 12);
  return {
    duration: durationSec,
    sampleRate,
    numberOfChannels: 1,
    length,
    getChannelData: () => data,
  };
}

function makeFakeAudioCtx() {
  return {
    createBuffer(channels, length, sampleRate) {
      const ch = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: (idx) => ch[idx],
      };
    },
  };
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: (k) => T[k] || k });
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

  loadAlloModule('voice_module.js');
  loadAlloModule('speech_setup_module.js');
  loadAlloModule('large_file_module.js');
  loadAlloModule('quickstart_module.js');
  loadAlloModule('phase_o_misc_handlers_module.js');
  loadAlloModule('view_sidebar_panels_module.js');

  V = window.AlloFlowVoice;
  SpeechSetup = window.AlloModules.SpeechSetup;
  LargeFileHandler = window.AlloModules.LargeFileHandler;
  LargeFileTranscriptionModal = window.AlloModules.LargeFileTranscriptionModal;
  QuickStartWizard = window.AlloModules.QuickStartWizard;
  PhaseOHandlers = window.AlloModules.PhaseOHandlers;
  SidebarPanels = window.AlloModules.SidebarPanels;
});

beforeEach(() => {
  localStorage.clear();
  delete window.__alloStudentAiDisabled;
  delete window.__alloOfflineOnly;
  delete window.__alloQrStudentMode;
  delete window.__alloAiSecretsLocked;
  delete window.__alloAiUsable;
  delete window.__alloResolveAiCapability;
  delete window.__alloResolveGeminiAudioCapability;
  delete window.__alloOpenSourceDictation;
  delete window.callGeminiAudio;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error('not-called')) },
  });
  window.AudioContext = function AudioContext() {};
  window.URL.createObjectURL = vi.fn(() => 'blob:https://test.local/clip-1');
  window.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

describe('Track 4: Segmented dictation recorder & overlap deduplication', () => {
  it('deduplicates overlapping words cleanly across segment boundaries', () => {
    expect(V.dedupeOverlapText('Plants make their own food', 'their own food through photosynthesis.')).toBe('Plants make their own food through photosynthesis.');
    expect(V.dedupeOverlapText('The river flows north.', 'north toward the ocean.')).toBe('The river flows north. toward the ocean.');
    expect(V.dedupeOverlapText('', 'Hello class.')).toBe('Hello class.');
  });

  it('emits incremental segments locally with 0 network calls, exposes audio slices, and clears all audio blobs on clearAudio()', async () => {
    const fetchSpy = vi.fn();
    window.fetch = fetchSpy;
    const drafts = [];
    const segOutputs = ['Plants use sunlight and water', 'sunlight and water to make glucose.'];
    let callIdx = 0;

    const recorder = V.createSegmentedDictationRecorder({
      segmentSeconds: 25,
      overlapSeconds: 2,
      transcribeSegment: async () => ({ transcript: segOutputs[callIdx++] || '' }),
      onDraft: (d) => drafts.push(d),
    });

    const tone = new Float32Array(16000 * 3);
    for (let i = 0; i < tone.length; i++) tone[i] = 0.25 * Math.sin(i / 10);

    await recorder.pushAudioBufferForTest(tone, 16000);
    await recorder.pushAudioBufferForTest(tone, 16000);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(recorder.getSegments()).toHaveLength(2);
    expect(recorder.getAudioBlobs()).toHaveLength(2);
    expect(recorder.getAudioBytes()).toBeGreaterThan(0);
    expect(recorder.getDraft()).toBe('Plants use sunlight and water to make glucose.');
    expect(drafts.at(-1)).toBe('Plants use sunlight and water to make glucose.');

    const slice = recorder.getAudioSliceUrl(1.0, 5.0);
    expect(slice).toBeTruthy();
    expect(slice.url).toContain('blob:');

    recorder.clearAudio();
    expect(recorder.getAudioBlobs()).toHaveLength(0);
    expect(recorder.getAudioBytes()).toBe(0);
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    // Transcript text stays intact after clearing audio memory.
    expect(recorder.getDraft()).toBe('Plants use sunlight and water to make glucose.');
  });
});

describe('Track 4: LargeFileHandler 240s chunks & Local Whisper default modal', () => {
  it('uses 240s chunks (WAV & base64 strictly < 15 MB) with 2s overlap and supports offline Local Whisper by default', async () => {
    expect(LargeFileHandler.CHUNK_DURATION_SECONDS).toBe(240);
    expect(LargeFileHandler.CHUNK_OVERLAP_SECONDS).toBe(2);

    // 240s * 16000 Hz * 2 bytes = 7,680,044 bytes (~7.32 MB); base64 ~10.24 MB < 15 MB.
    const oneChunkBuf = makeFakeAudioBuffer(240, 16000);
    const wavBlob = LargeFileHandler.audioBufferToWav(oneChunkBuf);
    expect(wavBlob.size).toBeLessThan(8 * 1024 * 1024);
    expect(Math.ceil((wavBlob.size * 4) / 3)).toBeLessThan(LargeFileHandler.MAX_CHUNK_SIZE_BYTES);

    // Local Whisper runs even when student AI is disabled and offline-only is enabled.
    window.__alloStudentAiDisabled = true;
    window.__alloOfflineOnly = true;
    const longBuf = makeFakeAudioBuffer(500, 16000);
    const seenRanges = [];
    const localTexts = ['First chunk ends with cells.', 'ends with cells. Second chunk talks about mitosis.', 'about mitosis. Final thoughts.'];
    const result = await LargeFileHandler.transcribeAudioBuffer(makeFakeAudioCtx(), longBuf, {
      backend: 'whisper',
      transcribeLocalChunk: async (pcm, meta) => {
        seenRanges.push([meta.startSec, meta.endSec, pcm.length]);
        return { transcript: localTexts[meta.index] };
      },
    });
    expect(seenRanges).toHaveLength(3);
    expect(seenRanges[0].slice(0, 2)).toEqual([0, 240]);
    expect(seenRanges[1].slice(0, 2)).toEqual([238, 480]);
    expect(seenRanges[2].slice(0, 2)).toEqual([478, 500]);
    expect(result.backend).toBe('whisper');
    expect(result.transcript).toBe('First chunk ends with cells. Second chunk talks about mitosis. Final thoughts.');

    // Gemini backend MUST refuse when student AI is disabled.
    await expect(
      LargeFileHandler.transcribeAudioBuffer(makeFakeAudioCtx(), oneChunkBuf, {
        backend: 'gemini',
        transcribeChunk: vi.fn(),
      })
    ).rejects.toThrow(/AI transcription is unavailable/);
  });

  it('defaults LargeFileTranscriptionModal to Local Whisper with download warning, strengths comparison, and why-use-both guide', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    await act(async () => {
      root.render(React.createElement(LargeFileTranscriptionModal, {
        isOpen: true,
        file: { name: 'biology-lecture.mp3', size: 28 * 1024 * 1024, type: 'audio/mpeg' },
        onClose: () => {},
        onConfirm: () => {},
        geminiAvailable: false,
        progress: 0,
        totalChunks: 0,
        status: '',
        isProcessing: false,
        t: (k) => T[k] || null,
      }));
    });
    await flush();

    const whisperRadio = host.querySelector('input[type="radio"][value="whisper"]');
    const geminiRadio = host.querySelector('input[type="radio"][value="gemini"]');
    expect(whisperRadio.checked).toBe(true);
    expect(geminiRadio.disabled).toBe(true);
    expect(LargeFileHandler.preferredBackend).toBe('whisper');

    const warning = host.querySelector('[data-testid="large-file-whisper-warning"]');
    expect(warning).toBeTruthy();
    expect(warning.textContent).toMatch(/First-time download notice/i);
    expect(warning.textContent).toMatch(/39–73 MB/);

    const guide = host.querySelector('[data-testid="large-file-engine-guide"]');
    expect(guide).toBeTruthy();
    expect(guide.textContent).toMatch(/Local Whisper/i);
    expect(guide.textContent).toMatch(/Gemini Audio/i);
    expect(guide.textContent).toMatch(/Cross-Triangulation/i);
  });
});

describe('Track 4: 6th Source Pathway in QuickStartWizard & SourceView', () => {
  it('offers Dictate or record as the 6th pathway in QuickStart, renders DictationStudio with Local Whisper warning, and completes cleanly', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const completed = [];

    await act(async () => {
      root.render(React.createElement(QuickStartWizard, {
        isOpen: true,
        onClose: () => {},
        onComplete: (d) => completed.push(d),
        onUpload: () => {},
        onLookupStandards: null,
        onCallGemini: () => Promise.resolve(''),
        onWebSearch: null,
        addToast: () => {},
        isParentMode: false,
        isIndependentMode: false,
        isHelpMode: false,
        setIsHelpMode: () => {},
      }));
    });
    await flush();

    // Step 1 -> Step 2
    const next1 = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Next'));
    click(next1);
    await flush();

    // All 6 source pathways are present
    const dictateCard = host.querySelector('[data-help-key="wizard_dictate_source"]');
    expect(dictateCard).toBeTruthy();
    expect(dictateCard.textContent).toContain('Dictate or record');
    expect(host.querySelector('[data-help-key="wizard_paste_source"]')).toBeTruthy();
    expect(host.querySelector('[data-help-key="wizard_upload_source"]')).toBeTruthy();
    expect(host.querySelector('[data-help-key="wizard_search_source"]')).toBeTruthy();
    expect(host.querySelector('[data-help-key="wizard_storybook_source"]')).toBeTruthy();
    expect(host.querySelector('[data-help-key="wizard_generate_source"]')).toBeTruthy();

    // Click 6th card -> Step 3 Dictation Studio
    click(dictateCard);
    await flush();

    expect(host.querySelector('[data-testid="dictation-source-studio"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="speech-readiness-download-warning"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="dictation-engine-guide"]').textContent).toMatch(/Why use both/i);

    const draftBox = host.querySelector('[data-testid="dictation-draft-textarea"]');
    setTextarea(draftBox, 'Today we study how watersheds carry rain to the bay.');
    await flush();

    const nextStep3 = host.querySelector('[data-help-key="wizard_dictate_next"]');
    expect(nextStep3.disabled).toBe(false);
    click(nextStep3);
    await flush();

    expect(host.textContent).toContain('10 words dictated');
    const finishBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Finish'));
    click(finishBtn);
    await flush();

    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({
      sourceMode: 'dictate',
      pastedText: 'Today we study how watersheds carry rain to the bay.',
    });

    // PhaseOHandlers routes sourceMode === 'dictate' into SourceView cleanly.
    const deps = new Proxy({ inputText: '', t: (k) => k, history: [], fileInputRef: { current: null } }, {
      get: (target, key) => (key in target ? target[key] : (target[key] = vi.fn())),
    });
    PhaseOHandlers.handleWizardComplete(completed[0], deps);
    expect(deps.setInputText).toHaveBeenCalledWith('Today we study how watersheds carry rain to the bay.');
    expect(deps.openSourceView).toHaveBeenCalled();
  });

  it('gates Gemini audio cross-triangulation strictly when offline/student AI is off, and supports Accept/Keep/Cleanup Undo when enabled', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    const tone = new Float32Array(16000 * 2);
    for (let i = 0; i < tone.length; i++) tone[i] = 0.25 * Math.sin(i / 10);

    // 1. Student AI disabled -> cross-check button is disabled and cleanup hidden.
    window.__alloStudentAiDisabled = true;
    await act(async () => {
      root.render(React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: 'Green plants use photo synthesis.',
        onChange: () => {},
      }));
    });
    await flush();
    expect(host.querySelector('[data-testid="dictation-cleanup-section"]')).toBeNull();
    expect(host.querySelector('[data-testid="dictation-crosscheck-btn"]').disabled).toBe(true);

    // 2. Enabled with explicit opt-in callbacks -> cleanup review/apply/undo + cross-check Accept/Keep.
    delete window.__alloStudentAiDisabled;
    let liveRecorder = null;
    const origCreate = V.createSegmentedDictationRecorder;
    V.createSegmentedDictationRecorder = (opts) => {
      liveRecorder = origCreate({
        ...opts,
        transcribeSegment: async () => ({ transcript: 'Green plants use photo synthesis and chlorofill.' }),
      });
      return liveRecorder;
    };

    const cleanupSpy = vi.fn().mockResolvedValue('Green plants use photosynthesis and chlorophyll.');
    const crossCheckSpy = vi.fn().mockResolvedValue([
      { id: 'd1', segmentIndex: 0, startSec: 0, endSec: 5, whisperText: 'photo synthesis', geminiText: 'photosynthesis', reason: 'Compound science term' },
      { id: 'd2', segmentIndex: 0, startSec: 1, endSec: 5, whisperText: 'chlorofill', geminiText: 'chlorophyll', reason: 'Domain spelling' },
    ]);

    function Harness() {
      const [val, setVal] = React.useState('Green plants use photo synthesis and chlorofill.');
      return React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: val,
        onChange: setVal,
        aiTextAvailable: true,
        aiAudioAvailable: true,
        onCleanupText: cleanupSpy,
        onCrossCheckAudio: crossCheckSpy,
      });
    }

    try {
      await act(async () => { root.render(React.createElement(Harness)); });
      await flush();

      // Test opt-in text-only cleanup -> non-destructive preview -> Apply -> Undo.
      click(host.querySelector('[data-testid="dictation-cleanup-punctuation"]'));
      await flush();
      expect(cleanupSpy).toHaveBeenCalledWith('Green plants use photo synthesis and chlorofill.', 'punctuation');
      expect(host.querySelector('[data-testid="dictation-cleanup-review"]')).toBeTruthy();
      expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toBe('Green plants use photo synthesis and chlorofill.');
      click(host.querySelector('[data-testid="dictation-cleanup-apply"]'));
      await flush();
      expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toBe('Green plants use photosynthesis and chlorophyll.');
      click(host.querySelector('[data-testid="dictation-cleanup-undo"]'));
      await flush();
      expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toBe('Green plants use photo synthesis and chlorofill.');

      // Inject a recorded local audio segment via recorder so audio segments exist without requiring real mic hardware.
      // Start creates the recorder instance; mock getUserMedia to succeed once.
      navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop() {} }] });
      window.AudioContext = function FakeAC() {
        this.sampleRate = 16000;
        this.destination = {};
        this.createMediaStreamSource = () => ({ connect() {}, disconnect() {} });
        this.createScriptProcessor = () => ({ connect() {}, disconnect() {}, onaudioprocess: null });
        this.createGain = () => ({ gain: { value: 0 }, connect() {}, disconnect() {} });
        this.resume = () => Promise.resolve();
        this.close = () => Promise.resolve();
      };
      click(host.querySelector('[data-testid="dictation-start-btn"]'));
      await flush();
      expect(liveRecorder).toBeTruthy();
      await act(async () => { await liveRecorder.pushAudioBufferForTest(tone, 16000); });
      await flush();

      // Cross-check has NOT auto-run!
      expect(crossCheckSpy).not.toHaveBeenCalled();

      // Explicitly click Verify against audio with Gemini.
      const checkBtn = host.querySelector('[data-testid="dictation-crosscheck-btn"]');
      expect(checkBtn.disabled).toBe(false);
      click(checkBtn);
      await flush();
      expect(crossCheckSpy).toHaveBeenCalledTimes(1);

      expect(host.querySelector('[data-testid="dictation-diff-d1"]')).toBeTruthy();
      expect(host.querySelector('[data-testid="dictation-diff-d2"]')).toBeTruthy();

      // Accept d1, Keep d2.
      click(host.querySelector('[data-testid="dictation-accept-d1"]'));
      click(host.querySelector('[data-testid="dictation-keep-d2"]'));
      await flush();
      expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toContain('photosynthesis');
      expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toContain('chlorofill');
    } finally {
      V.createSegmentedDictationRecorder = origCreate;
    }
  });

  it('exposes the Dictate trigger in SourceView and applies dictated text into the source editor', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const setInputText = vi.fn();

    await act(async () => {
      root.render(React.createElement(SidebarPanels.SourceView, {
        t: (k) => T[k] || k,
        inputText: '',
        setInputText,
        sourceRecord: null,
        setSourceRecord: vi.fn(),
        history: [],
        aiTextAvailable: false,
      }));
    });
    await flush();

    const dictateBtn = host.querySelector('[data-source-dictate]');
    expect(dictateBtn).toBeTruthy();
    click(dictateBtn);
    await flush();

    expect(host.querySelector('[data-source-dictation-panel]')).toBeTruthy();
    const box = host.querySelector('[data-testid="dictation-draft-textarea"]');
    setTextarea(box, 'Dictated directly inside Source View.');
    await flush();

    click(host.querySelector('[data-testid="dictation-apply-source"]'));
    await flush();
    expect(setInputText).toHaveBeenCalledTimes(1);
    const updater = setInputText.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    expect(updater('')).toBe('Dictated directly inside Source View.');
  });
});
