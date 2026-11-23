// Wave 2 — Uploaded MP3/MP4 Cross-Triangulation, Main App/Dictation -> Read-Along
// Handoff, Device Speed Badge, and Dictation i18n registration.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act;
let V, SpeechSetup, LargeFileHandler, SidebarPanels;
let root, host;

const T = {
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

function makeFakeAudioBuffer(durationSec, sampleRate = 16000) {
  const length = Math.round(durationSec * sampleRate);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = 0.2 * Math.sin(i / 14);
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

function makeWavBlob(durationSec = 2, sampleRate = 16000) {
  const pcm = new Float32Array(Math.round(durationSec * sampleRate));
  for (let i = 0; i < pcm.length; i++) pcm[i] = 0.2 * Math.sin(i / 10);
  return V.pcmToWavBlob(pcm, sampleRate);
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
  loadAlloModule('view_sidebar_panels_module.js');

  V = window.AlloFlowVoice;
  SpeechSetup = window.AlloModules.SpeechSetup;
  LargeFileHandler = window.AlloModules.LargeFileHandler;
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
  delete window.__alloSendToReadAlongPacket;
  delete window.__alloUploadedAudioSegments;
  delete window.__alloClearUploadedAudioSegments;
  delete window.callGeminiAudio;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error('not-called')) },
  });
  window.AudioContext = function AudioContext() {};
  let urlSeq = 0;
  window.URL.createObjectURL = vi.fn(() => `blob:https://test.local/upload-clip-${++urlSeq}`);
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
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LargeFileHandler Whisper WAV blob retention (30 MB cap)', () => {
  it('attaches 16 kHz mono WAV blobs onto segments when retainAudioBlobs is true and enforces maxRetainedAudioBytes <= 30 MB', async () => {
    expect(LargeFileHandler.MAX_RETAINED_AUDIO_BYTES).toBe(30 * 1024 * 1024);

    // Offline + student AI disabled MUST still succeed on Local Whisper path.
    window.__alloStudentAiDisabled = true;
    window.__alloOfflineOnly = true;

    // 3 chunks of 10s each (with 2s overlap) = ~320 KB per WAV chunk.
    const buf = makeFakeAudioBuffer(28, 16000);
    const texts = ['Segment one discusses osmosis.', 'Segment two covers mitosis.', 'Segment three concludes.'];
    const full = await LargeFileHandler.transcribeAudioBuffer(makeFakeAudioCtx(), buf, {
      backend: 'whisper',
      chunkDurationSeconds: 10,
      overlapSeconds: 2,
      retainAudioBlobs: true,
      transcribeLocalChunk: async (_pcm, meta) => ({ transcript: texts[meta.index] }),
    });

    expect(full.backend).toBe('whisper');
    expect(full.segments).toHaveLength(3);
    for (let i = 0; i < full.segments.length; i++) {
      const seg = full.segments[i];
      expect(seg.id).toBe(`upload-seg-${i + 1}`);
      expect(seg.index).toBe(i);
      expect(seg.mimeType).toBe('audio/wav');
      expect(seg.blob).toBeInstanceOf(Blob);
      expect(seg.blob.type).toBe('audio/wav');
      expect(seg.blob.size).toBeGreaterThan(44);
    }

    // Verify default 30 MB cap stops retaining blobs once cumulative bytes would exceed cap.
    const singleChunkBytes = full.segments[0].blob.size;
    const capped = await LargeFileHandler.transcribeAudioBuffer(makeFakeAudioCtx(), buf, {
      backend: 'whisper',
      chunkDurationSeconds: 10,
      overlapSeconds: 2,
      retainAudioBlobs: true,
      maxRetainedAudioBytes: singleChunkBytes + 100,
      transcribeLocalChunk: async (_pcm, meta) => ({ transcript: texts[meta.index] }),
    });
    expect(capped.segments).toHaveLength(3);
    expect(capped.segments[0].blob).toBeInstanceOf(Blob);
    expect(capped.segments[1].blob).toBeUndefined();
    expect(capped.segments[2].blob).toBeUndefined();
    const totalRetained = capped.segments.reduce((s, seg) => s + (seg.blob ? seg.blob.size : 0), 0);
    expect(totalRetained).toBeLessThanOrEqual(singleChunkBytes + 100);
    expect(totalRetained).toBeLessThanOrEqual(30 * 1024 * 1024);
    // Transcript text is still complete even when later blobs are skipped past the cap.
    expect(capped.transcript).toBe('Segment one discusses osmosis. Segment two covers mitosis. Segment three concludes.');
  });

  it('defaults retainAudioBlobs to true in processMediaFile when backend is whisper', async () => {
    const fakeBuf = makeFakeAudioBuffer(12, 16000);
    const decodeSpy = vi.spyOn(LargeFileHandler, '_decodeMediaFile').mockResolvedValue({
      audioCtx: makeFakeAudioCtx(),
      audioBuffer: fakeBuf,
    });
    try {
      const res = await LargeFileHandler.processMediaFile(
        { name: 'lecture.mp4', size: 1024 * 1024, type: 'video/mp4' },
        {
          backend: 'whisper',
          chunkDurationSeconds: 10,
          transcribeLocalChunk: async (_pcm, meta) => ({ transcript: `Part ${meta.index + 1}.` }),
        }
      );
      expect(decodeSpy).toHaveBeenCalledTimes(1);
      expect(res.segments.length).toBeGreaterThanOrEqual(2);
      expect(res.segments[0].blob).toBeInstanceOf(Blob);
      expect(res.segments[0].mimeType).toBe('audio/wav');
      expect(res.segments[0].id).toBe('upload-seg-1');
    } finally {
      decodeSpy.mockRestore();
    }
  });
});

describe('DictationSourceStudio uploaded segments, 5s replay, speed badge & Read-Along handoff', () => {
  it('hydrates initialSegments, gates Gemini cross-check off in offline/student AI-off mode, runs cross-check + 5s local replay + Accept/Keep, clears blobs, and fires onSendToReadAlong', async () => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    const uploadedSegments = [
      { id: 'upload-seg-1', index: 0, startSec: 0, endSec: 60, text: 'Plants use photo synthesis and chlorofill.', blob: makeWavBlob(3), mimeType: 'audio/wav' },
      { id: 'upload-seg-2', index: 1, startSec: 58, endSec: 120, text: 'Sunlight powers the cell.', blob: makeWavBlob(3), mimeType: 'audio/wav' },
    ];

    // 1. Offline / Student AI disabled -> cross-check MUST be gated off.
    window.__alloStudentAiDisabled = true;
    await act(async () => {
      root.render(React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: 'Plants use photo synthesis and chlorofill.',
        onChange: () => {},
        initialSegments: uploadedSegments,
      }));
    });
    await flush();
    expect(host.querySelector('[data-testid="dictation-crosscheck-btn"]').disabled).toBe(true);
    expect(host.querySelector('[data-testid="dictation-clear-audio"]')).toBeTruthy();

    delete window.__alloStudentAiDisabled;
    window.__alloOfflineOnly = true;
    await act(async () => {
      root.render(React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: 'Plants use photo synthesis and chlorofill.',
        onChange: () => {},
        initialSegments: uploadedSegments,
      }));
    });
    await flush();
    expect(host.querySelector('[data-testid="dictation-crosscheck-btn"]').disabled).toBe(true);
    delete window.__alloOfflineOnly;

    // 2. Enabled with hydrated uploaded segments (no live recorder started!):
    // mock window.Audio to observe 5-second local slice playback & pause.
    const createdAudios = [];
    const OrigAudio = window.Audio;
    window.Audio = function FakeAudio(src) {
      this.src = src;
      this.duration = 60;
      this.currentTime = 0;
      this.readyState = 1;
      this.play = vi.fn().mockResolvedValue(undefined);
      this.pause = vi.fn();
      createdAudios.push(this);
    };

    const crossCheckSpy = vi.fn().mockResolvedValue([
      { id: 'u1', segmentIndex: 0, startSec: 12, endSec: 17, whisperText: 'photo synthesis', geminiText: 'photosynthesis', reason: 'Compound term' },
      { id: 'u2', segmentIndex: 1, startSec: 70, endSec: 75, whisperText: 'chlorofill', geminiText: 'chlorophyll', reason: 'Biology term' },
    ]);
    const clearSpy = vi.fn();
    const readAlongSpy = vi.fn();

    function Harness() {
      const [val, setVal] = React.useState('Plants use photo synthesis and chlorofill.');
      return React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: val,
        onChange: setVal,
        initialSegments: uploadedSegments,
        onClearInitialSegments: clearSpy,
        onSendToReadAlong: readAlongSpy,
        aiTextAvailable: true,
        aiAudioAvailable: true,
        onCrossCheckAudio: crossCheckSpy,
      });
    }

    try {
      await act(async () => { root.render(React.createElement(Harness)); });
      await flush();

      // Send to Read-Along Packet button is present and passes text + segments.
      const sendBtn = host.querySelector('[data-testid="dictation-send-read-along"]');
      expect(sendBtn).toBeTruthy();
      click(sendBtn);
      expect(readAlongSpy).toHaveBeenCalledTimes(1);
      expect(readAlongSpy.mock.calls[0][0].text).toBe('Plants use photo synthesis and chlorofill.');
      expect(readAlongSpy.mock.calls[0][0].segments).toHaveLength(2);

      // Cross-check button is enabled immediately because initialSegments carry blobs.
      const checkBtn = host.querySelector('[data-testid="dictation-crosscheck-btn"]');
      expect(checkBtn.disabled).toBe(false);
      click(checkBtn);
      await flush();
      expect(crossCheckSpy).toHaveBeenCalledTimes(1);
      expect(crossCheckSpy.mock.calls[0][0]).toHaveLength(2);

      // Play 5s local audio slice from hydrated uploaded segment 1 (offset = 70 - 58 = 12s).
      const playBtns = host.querySelectorAll('[data-testid="dictation-play-slice"]');
      expect(playBtns).toHaveLength(2);
      click(playBtns[1]);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(uploadedSegments[1].blob);
      expect(createdAudios).toHaveLength(1);
      expect(createdAudios[0].src).toContain('blob:');
      expect(createdAudios[0].currentTime).toBe(12);
      expect(createdAudios[0].play).toHaveBeenCalledTimes(1);

      // Auto-pauses after 5 seconds.
      act(() => { vi.advanceTimersByTime(5000); });
      expect(createdAudios[0].pause).toHaveBeenCalled();

      // Accept u1, Keep u2.
      click(host.querySelector('[data-testid="dictation-accept-u1"]'));
      click(host.querySelector('[data-testid="dictation-keep-u2"]'));
      await flush();
      expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toBe('Plants use photosynthesis and chlorofill.');

      // Clear uploaded audio blobs revokes object URLs, invokes onClearInitialSegments, preserves text.
      click(host.querySelector('[data-testid="dictation-clear-audio"]'));
      await flush();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(host.querySelector('[data-testid="dictation-clear-audio"]')).toBeNull();
      expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toBe('Plants use photosynthesis and chlorofill.');
    } finally {
      window.Audio = OrigAudio;
    }
  });

  it('displays the compact Device Speed Badge in SpeechReadinessCard when whisperSpeedByModel is recorded', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    // 2.4x on tiny -> lesson verdict (Good for long dictation).
    V.savePreference({
      whisperTier: 'tiny',
      whisperPreparedModelIds: ['Xenova/whisper-tiny.en'],
      whisperSpeedByModel: { 'Xenova/whisper-tiny.en': 2.4 },
    });

    await act(async () => {
      root.render(React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: 'Hello world.',
        onChange: () => {},
      }));
    });
    await flush();

    const badge = host.querySelector('[data-testid="speech-readiness-speed-badge"]');
    expect(badge).toBeTruthy();
    expect(badge.getAttribute('data-verdict')).toBe('lesson');
    expect(badge.textContent).toContain('2.4x faster than speech');
    expect(badge.textContent).toContain('Good for long dictation');

    // 4.2x on tiny -> suggests Base upgrade as well!
    V.savePreference({
      whisperTier: 'tiny',
      whisperPreparedModelIds: ['Xenova/whisper-tiny.en'],
      whisperSpeedByModel: { 'Xenova/whisper-tiny.en': 4.2 },
    });
    await act(async () => {
      root.render(React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: 'Hello world updated.',
        onChange: () => {},
      }));
    });
    await flush();
    const fastBadge = host.querySelector('[data-testid="speech-readiness-speed-badge"]');
    expect(fastBadge.textContent).toContain('4.2x');
    expect(fastBadge.textContent).toContain('Base');
  });
});

describe('SourceView Read-Along handoff & uploaded-audio verification banner', () => {
  it('renders Send to Read-Along Packet and the Whisper uploaded-audio verification banner that opens inline DictationStudio', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    const uploadedSegments = [
      { id: 'upload-seg-1', index: 0, startSec: 0, endSec: 240, text: 'Watersheds carry rain to rivers.', blob: makeWavBlob(2), mimeType: 'audio/wav' },
      { id: 'upload-seg-2', index: 1, startSec: 238, endSec: 360, text: 'Wetlands filter runoff water.', blob: makeWavBlob(2), mimeType: 'audio/wav' },
    ];
    const sendSpy = vi.fn();
    const clearSpy = vi.fn();

    function SourceHarness() {
      const [txt, setTxt] = React.useState('Watersheds carry rain to rivers. Wetlands filter runoff water.');
      const [segs, setSegs] = React.useState(uploadedSegments);
      return React.createElement(SidebarPanels.SourceView, {
        t: (k) => T[k] || k,
        inputText: txt,
        setInputText: setTxt,
        sourceRecord: null,
        setSourceRecord: vi.fn(),
        history: [],
        aiTextAvailable: true,
        onSendToReadAlongPacket: sendSpy,
        uploadedAudioSegments: segs,
        onClearUploadedAudioSegments: () => { clearSpy(); setSegs([]); },
      });
    }

    await act(async () => {
      root.render(React.createElement(SourceHarness));
    });
    await flush();

    // Send to Read-Along Packet button next to Dictate.
    const sendBtn = host.querySelector('[data-source-send-read-along]');
    expect(sendBtn).toBeTruthy();
    expect(sendBtn.textContent).toContain('Send to Read-Along Packet');
    click(sendBtn);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0].text).toBe('Watersheds carry rain to rivers. Wetlands filter runoff water.');

    // Uploaded-audio verification banner right above the editor.
    const banner = host.querySelector('[data-source-upload-verify-banner]');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Audio/video transcribed locally with Whisper (2 segments kept in memory)');

    // 1-click "Verify against audio with Gemini" opens inline DictationSourceStudio pre-loaded with text & segments.
    const verifyBtn = host.querySelector('[data-source-upload-verify-btn]');
    expect(verifyBtn).toBeTruthy();
    expect(verifyBtn.textContent).toContain('Verify against audio with Gemini');
    click(verifyBtn);
    await flush();

    expect(host.querySelector('[data-source-dictation-panel]')).toBeTruthy();
    expect(host.querySelector('[data-testid="dictation-source-studio"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="dictation-draft-textarea"]').value).toBe('Watersheds carry rain to rivers. Wetlands filter runoff water.');
    expect(host.querySelector('[data-testid="dictation-clear-audio"]')).toBeTruthy();

    // Clear audio button invokes callback and removes banner.
    click(host.querySelector('[data-source-upload-clear-btn]'));
    await flush();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-source-upload-verify-banner]')).toBeNull();
  });
});

describe('Dictation i18n registration & AlloFlowANTI.txt Read-Along handoff contract', () => {
  it('registers every dictation.* key referenced in speech_setup_source.jsx plus input/wizard/source_view/large_file keys in ui_strings.js', () => {
    const raw = readFileSync('ui_strings.js', 'utf8');
    const strings = JSON.parse(raw);
    expect(strings.dictation && typeof strings.dictation).toBe('object');

    const speechSrc = readFileSync('speech_setup_source.jsx', 'utf8');
    const referenced = new Set();
    for (const m of speechSrc.matchAll(/['"]dictation\.([a-z0-9_]+)['"]/g)) {
      referenced.add(m[1]);
    }
    expect(referenced.size).toBeGreaterThan(45);
    const missing = [...referenced].filter((k) => !strings.dictation[k]);
    expect(missing).toEqual([]);

    expect(strings.input.dictate_or_record).toBeTruthy();
    expect(strings.input.actions.dictate_hint).toBeTruthy();
    expect(strings.wizard.dictate_desc).toBeTruthy();
    expect(strings.wizard.dictate_title).toBeTruthy();
    expect(strings.wizard.dictate_helper).toBeTruthy();
    expect(strings.wizard.dictate_loading).toBeTruthy();
    expect(strings.wizard.words_dictated_unit).toBeTruthy();
    expect(strings.source_view.dictate).toBeTruthy();
    expect(strings.source_view.close_dictate).toBeTruthy();
    expect(strings.source_view.send_read_along).toBeTruthy();
    expect(strings.large_file.engine_legend).toBeTruthy();
  });

  it('wires uploadedAudioSegments and the alloflow-packets-handoff draft contract in AlloFlowANTI.txt', () => {
    const hostSrc = readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(hostSrc).toContain("idb.open('alloflow-packets-handoff', 1)");
    expect(hostSrc).toContain("packets-read-along.html#import-draft");
    expect(hostSrc).toContain("kind: 'read_along'");
    expect(hostSrc).toContain('window.__alloSendToReadAlongPacket = handleSendToReadAlongPacket;');
    expect(hostSrc).toContain('retainAudioBlobs: selectedBackend === \'whisper\'');
    expect(hostSrc).toContain('onSendToReadAlongPacket: handleSendToReadAlongPacket, uploadedAudioSegments, onClearUploadedAudioSegments: clearUploadedAudioSegments,');
  });
});
