import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let recognitionInstances = [];

class FakeRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = '';
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    recognitionInstances.push(this);
  }

  start() {}

  stop() {
    if (this.onend) this.onend();
  }

  abort() {
    if (this.onend) this.onend();
  }

  emitTranscript(text, confidence, isFinal = true) {
    const alternative = { transcript: text };
    if (arguments.length >= 2) alternative.confidence = confidence;
    const result = [alternative];
    result.isFinal = isFinal;
    if (this.onresult) this.onresult({ resultIndex: 0, results: [result] });
  }
}

beforeAll(() => {
  loadAlloModule('voice_module.js');
});

beforeEach(() => {
  recognitionInstances = [];
  localStorage.removeItem('alloflow_voice_pref');
  window.SpeechRecognition = FakeRecognition;
  delete window.webkitSpeechRecognition;
  delete window.__alloLocalSRShim;
});

afterEach(() => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  delete window.__alloLocalSRShim;
  delete window.MediaRecorder;
  delete globalThis.MediaRecorder;
  vi.restoreAllMocks();
});

describe('shared dictation controller', () => {
  it('routes a live transcript and publishes honest browser-engine status', () => {
    const transcripts = [];
    const states = [];
    const controller = window.AlloFlowVoice.createDictationController({
      continuous: false,
      onTranscript: (text) => transcripts.push(text),
      onStateChange: (status) => states.push(status),
    });

    expect(controller.start()).toBe(true);
    expect(controller.getStatus()).toMatchObject({
      state: 'listening',
      engine: 'web-speech',
      engineLabel: 'Browser speech service',
    });

    recognitionInstances[0].emitTranscript('  a clear response  ');
    expect(transcripts).toEqual(['a clear response']);
    expect(states.some((status) => status.privacy.includes('speech provider'))).toBe(true);
  });

  it('forwards only actual nullable Web Speech confidence through sanitized metadata', () => {
    const transcripts = [];
    const resultEvents = [];
    const controller = window.AlloFlowVoice.createDictationController({
      continuous: false,
      onTranscript: (text, isFinal, metadata) => transcripts.push({ text, isFinal, metadata }),
    });
    controller.addEventListener('result', (event) => resultEvents.push(event));

    controller.start();
    recognitionInstances[0].emitTranscript('bonjour', 0.42);

    expect(transcripts[0]).toMatchObject({
      text: 'bonjour',
      isFinal: true,
      metadata: {
        engine: 'web-speech',
        engineLabel: 'Browser speech service',
        confidence: 0.42,
        confidenceSource: 'web-speech',
        segments: [{ isFinal: true, confidence: 0.42 }],
      },
    });
    expect(transcripts[0].metadata.privacy).toContain('speech provider');
    expect(transcripts[0].metadata).not.toHaveProperty('fullEvent');
    expect(resultEvents[0].results[0][0].confidence).toBe(0.42);
    expect(resultEvents[0].metadata).toEqual(transcripts[0].metadata);
    expect(resultEvents[0].metadata).not.toHaveProperty('fullEvent');

    recognitionInstances[0].emitTranscript('zero confidence', 0);
    expect(transcripts[1].metadata.confidence).toBe(0);
    expect(resultEvents[1].results[0][0].confidence).toBe(0);

    recognitionInstances[0].emitTranscript('confidence unavailable');
    expect(transcripts[2].metadata).toMatchObject({
      engine: 'web-speech',
      confidence: null,
      confidenceSource: 'web-speech',
      segments: [{ isFinal: true, confidence: null }],
    });
    expect(resultEvents[2].results[0][0].confidence).toBeNull();
  });

  it('keeps recorded Gemini transcript confidence explicitly null', async () => {
    const previousMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    const stopTrack = vi.fn();
    let recorderInstance = null;
    class FakeMediaRecorder {
      constructor(_stream, options = {}) {
        this.mimeType = options.mimeType || 'audio/webm';
        recorderInstance = this;
      }
      start() {}
      stop() {
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(['voice'], { type: this.mimeType }) });
        }
        if (this.onstop) this.onstop();
      }
    }
    FakeMediaRecorder.isTypeSupported = () => true;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
    });
    window.MediaRecorder = FakeMediaRecorder;
    globalThis.MediaRecorder = FakeMediaRecorder;

    const transcripts = [];
    const resultEvents = [];
    const callGeminiAudio = vi.fn(async () => 'bonjour du nuage');
    try {
      const controller = window.AlloFlowVoice.createDictationController({
        engine: 'gemini',
        continuous: false,
        callGeminiAudio,
        onTranscript: (text, isFinal, metadata) => transcripts.push({ text, isFinal, metadata }),
      });
      controller.addEventListener('result', (event) => resultEvents.push(event));

      expect(controller.start()).toBe(true);
      await vi.waitFor(() => expect(recorderInstance).toBeTruthy());
      controller.stop();
      await vi.waitFor(() => expect(transcripts).toHaveLength(1));

      expect(transcripts[0]).toMatchObject({
        text: 'bonjour du nuage',
        isFinal: true,
        metadata: {
          engine: 'gemini-audio',
          confidence: null,
          confidenceSource: null,
          segments: [],
        },
      });
      expect(transcripts[0].metadata).not.toHaveProperty('fullEvent');
      expect(resultEvents[0].results[0][0].confidence).toBeNull();
      expect(callGeminiAudio).toHaveBeenCalledOnce();
      expect(stopTrack).toHaveBeenCalledOnce();
    } finally {
      if (previousMediaDevices) Object.defineProperty(navigator, 'mediaDevices', previousMediaDevices);
      else delete navigator.mediaDevices;
    }
  });

  it('identifies the desktop SpeechRecognition shim as on-device Whisper', () => {
    window.__alloLocalSRShim = true;
    const controller = window.AlloFlowVoice.createDictationController({ continuous: false });

    controller.start();

    expect(controller.getStatus()).toMatchObject({
      state: 'listening',
      engine: 'local-whisper',
      engineLabel: 'On-device Whisper',
      privacy: 'Audio stays on this device.',
    });
  });

  it('keeps only one microphone session active across surfaces', () => {
    const firstStates = [];
    const first = window.AlloFlowVoice.createDictationController({
      onStateChange: (status) => firstStates.push(status),
    });
    const second = window.AlloFlowVoice.createDictationController();

    first.start();
    second.start();

    expect(first.isActive()).toBe(false);
    expect(second.isActive()).toBe(true);
    expect(firstStates.at(-1)).toMatchObject({ state: 'idle', reason: 'replaced' });
    expect(recognitionInstances).toHaveLength(2);
  });

  it('publishes an announced stopped state for a user-ended session', () => {
    const states = [];
    const controller = window.AlloFlowVoice.createDictationController({
      onStateChange: (status) => states.push(status),
    });

    controller.start();
    controller.stop();

    expect(states.at(-1)).toMatchObject({
      state: 'idle',
      reason: 'stopped',
      message: 'Dictation stopped.',
    });
  });

  it('preserves no-speech feedback when the browser emits a trailing end event', () => {
    const states = [];
    const controller = window.AlloFlowVoice.createDictationController({
      continuous: false,
      onStateChange: (status) => states.push(status),
    });

    controller.start();
    recognitionInstances[0].onerror({ error: 'no-speech' });
    recognitionInstances[0].onend();

    expect(states.at(-1)).toMatchObject({
      state: 'idle',
      reason: 'no-speech',
      message: 'No speech detected.',
    });
  });

  it('respects the shared Off preference', () => {
    window.AlloFlowVoice.savePreference({ engine: 'off' });
    const states = [];
    const controller = window.AlloFlowVoice.createDictationController({
      onStateChange: (status) => states.push(status),
    });

    expect(window.AlloFlowVoice.isDictationSupported()).toBe(false);
    expect(controller.start()).toBe(false);
    expect(states.at(-1)).toMatchObject({ state: 'error', message: 'Voice input is turned off in settings.' });
    expect(recognitionInstances).toHaveLength(0);
  });

  it('cancels safely while microphone permission is still pending', async () => {
    let resolvePermission;
    const stopTrack = vi.fn();
    const permission = new Promise((resolve) => { resolvePermission = resolve; });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(() => permission) },
    });
    class FakeMediaRecorder {}
    FakeMediaRecorder.isTypeSupported = () => true;
    window.MediaRecorder = FakeMediaRecorder;
    globalThis.MediaRecorder = FakeMediaRecorder;

    const capture = window.AlloFlowVoice.recordAudioBlob();
    const rejected = expect(capture.result).rejects.toThrow('cancelled');
    capture.cancel();
    resolvePermission({ getTracks: () => [{ stop: stopTrack }] });

    await rejected;
    await Promise.resolve();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });
});