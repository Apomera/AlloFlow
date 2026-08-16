// W5 (wave 2): the A4 input meter reaches dictation.
//
// L7 shipped AlloCommands.micLevelMonitor (one reference-counted analyser, one
// published RMS level) and asked L6 to have the dictation controller acquire it.
// The requirement that shapes the wiring is "no second getUserMedia": a recorded
// engine already owns a stream and hands it over, and the browser speech service,
// which does NOT expose its stream, only piggybacks on a monitor that is already
// live rather than opening a capture of its own beside the recogniser's.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let recognitionInstances = [];
let getUserMediaCalls = 0;

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
  stop() { if (this.onend) this.onend(); }
  abort() { if (this.onend) this.onend(); }
}

class FakeMediaRecorder {
  constructor(_stream, options = {}) { this.mimeType = options.mimeType || 'audio/webm'; }
  start() {}
  stop() {
    if (this.ondataavailable) this.ondataavailable({ data: new Blob(['voice'], { type: this.mimeType }) });
    if (this.onstop) this.onstop();
  }
}
FakeMediaRecorder.isTypeSupported = () => true;

// Stand-in for AlloCommands.micLevelMonitor with the same contract, so this test
// exercises the WIRING rather than re-testing L7's analyser (which
// tests/allobot_disable_and_mic_feedback.test.js already covers).
function makeFakeMonitor() {
  const monitor = {
    acquisitions: [],
    refs: 0,
    acquire(opts) {
      monitor.acquisitions.push(opts);
      monitor.refs += 1;
      let released = false;
      return () => { if (released) return; released = true; monitor.refs -= 1; };
    },
    isActive: () => monitor.refs > 0,
  };
  return monitor;
}

beforeAll(() => { loadAlloModule('voice_module.js'); });

beforeEach(() => {
  recognitionInstances = [];
  getUserMediaCalls = 0;
  localStorage.removeItem('alloflow_voice_pref');
  window.SpeechRecognition = FakeRecognition;
  delete window.webkitSpeechRecognition;
  delete window.__alloLocalSRShim;
  delete window.__alloMicLevelMonitor;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.AlloCommands;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        getUserMediaCalls += 1;
        return { getTracks: () => [{ stop: () => {} }] };
      }),
    },
  });
});

afterEach(() => {
  delete window.SpeechRecognition;
  delete window.MediaRecorder;
  delete globalThis.MediaRecorder;
  delete window.__alloMicLevelMonitor;
  if (window.AlloModules) delete window.AlloModules.AlloCommands;
  vi.restoreAllMocks();
});

describe('recorded engine hands its own stream to the meter', () => {
  it('acquires with the existing stream and opens NO second getUserMedia', async () => {
    const monitor = makeFakeMonitor();
    window.AlloModules.AlloCommands = { micLevelMonitor: monitor };
    window.MediaRecorder = FakeMediaRecorder;
    globalThis.MediaRecorder = FakeMediaRecorder;

    const controller = window.AlloFlowVoice.createDictationController({
      engine: 'gemini',
      callGeminiAudio: vi.fn(async () => 'hola'),
      onTranscript: () => {},
    });
    expect(controller.start()).toBe(true);
    await new Promise((r) => setTimeout(r, 0));

    expect(monitor.acquisitions.length).toBe(1);
    expect(monitor.acquisitions[0]).toBeTruthy();
    expect(monitor.acquisitions[0].stream).toBeTruthy(); // handed over, not re-opened
    expect(monitor.isActive()).toBe(true);
    // The ONLY capture is recordAudioBlob's own.
    expect(getUserMediaCalls).toBe(1);

    controller.abort('test');
    expect(monitor.isActive()).toBe(false);
  });

  it('releases the meter when the microphone closes, not when transcription ends', async () => {
    const monitor = makeFakeMonitor();
    window.AlloModules.AlloCommands = { micLevelMonitor: monitor };
    window.MediaRecorder = FakeMediaRecorder;
    globalThis.MediaRecorder = FakeMediaRecorder;

    // The blob -> base64 hop inside recordAudioBlob is genuinely asynchronous
    // (FileReader), so "has the meter been released yet" has to be sampled at a
    // point with a defined ordering. The moment the transcription call is made
    // is exactly that point, and it is the one that matters: by then the mic is
    // shut, and bars still running would read as "still listening".
    let activeAtTranscribe = null;
    const controller = window.AlloFlowVoice.createDictationController({
      engine: 'gemini',
      callGeminiAudio: vi.fn(async () => { activeAtTranscribe = monitor.isActive(); return 'hola'; }),
      onTranscript: () => {},
    });
    controller.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(monitor.isActive()).toBe(true);

    controller.stop();
    for (let i = 0; i < 10 && activeAtTranscribe === null; i++) await new Promise((r) => setTimeout(r, 5));

    expect(activeAtTranscribe, 'transcription started while the meter was still held').toBe(false);
    expect(monitor.isActive()).toBe(false);
  });
});

describe('browser speech engine never opens a second capture', () => {
  it('piggybacks when the monitor is ALREADY live', () => {
    const monitor = makeFakeMonitor();
    window.AlloModules.AlloCommands = { micLevelMonitor: monitor };
    const held = monitor.acquire(null); // e.g. AlloBot already showing its meter

    const controller = window.AlloFlowVoice.createDictationController({ onTranscript: () => {} });
    expect(controller.start()).toBe(true);
    expect(monitor.acquisitions.length).toBe(2);
    expect(getUserMediaCalls).toBe(0);

    controller.abort('test');
    expect(monitor.isActive()).toBe(true); // the original holder still has it
    held();
    expect(monitor.isActive()).toBe(false);
  });

  it('does NOT acquire when nothing else is holding the monitor', () => {
    const monitor = makeFakeMonitor();
    window.AlloModules.AlloCommands = { micLevelMonitor: monitor };

    const controller = window.AlloFlowVoice.createDictationController({ onTranscript: () => {} });
    expect(controller.start()).toBe(true);
    // Acquiring with null here would call getUserMedia inside the monitor, which
    // is a second microphone stream and a second recording indicator beside the
    // one the browser recogniser is already running.
    expect(monitor.acquisitions.length).toBe(0);
    expect(getUserMediaCalls).toBe(0);
    controller.abort('test');
  });
});

describe('dictation still works with no monitor present at all', () => {
  it('starts and stops cleanly when AlloCommands has not loaded', () => {
    const controller = window.AlloFlowVoice.createDictationController({ onTranscript: () => {} });
    expect(controller.start()).toBe(true);
    expect(controller.getStatus().state).toBe('listening');
    controller.abort('test');
    expect(controller.getStatus().state).toBe('idle');
  });
});
