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

  emitTranscript(text) {
    const result = [{ transcript: text, confidence: 0.9 }];
    result.isFinal = true;
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