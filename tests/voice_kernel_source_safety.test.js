import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

let AC;
const unregister = [];

beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (fn) => fn,
  });
  const source = readFileSync(resolve(process.cwd(), 'allo_commands_source.jsx'), 'utf8')
    + '\n;globalThis.__alloVoiceSafetySource = { createCommandKernel, registerCommandScope, routeUtterance, createVoiceLoop };';
  const compiled = execFileSync(process.execPath, ['-e',
    "const fs=require('fs'),e=require('esbuild');process.stdout.write(e.transformSync(fs.readFileSync(0,'utf8'),{loader:'jsx',target:'es2020'}).code)"
  ], {
    input: source, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  new Function(compiled)();
  AC = globalThis.__alloVoiceSafetySource;
});

afterEach(() => {
  while (unregister.length) unregister.pop()();
  vi.useRealTimers();
});
afterAll(() => {
  delete globalThis.__alloVoiceSafetySource;
  vi.unstubAllGlobals();
});

describe('canonical source voice confidence safety', () => {
  it('keeps parser certainty separate and fails safe when voice recognition confidence is missing or low', async () => {
    const execute = vi.fn(() => 'Advanced.');
    unregister.push(AC.registerCommandScope({
      id: 'source-confidence',
      getCommands: () => [{ id: 'advance', risk: 'state-change' }],
      parse: () => ({ commandId: 'advance', confidence: 0.99 }),
      execute,
    }));
    const kernel = AC.createCommandKernel({}, { channel: 'voice', lowConfidenceThreshold: 0.8 });

    expect(await kernel.handleUtterance('next', { allowAi: false })).toMatchObject({ confirmationRequired: true });
    expect(execute).not.toHaveBeenCalled();
    kernel.confirm('no');

    expect(await kernel.handleUtterance('next', { allowAi: false, recognitionConfidence: 0.3 })).toMatchObject({ confirmationRequired: true });
    expect(execute).not.toHaveBeenCalled();
    kernel.confirm('no');

    expect(await kernel.handleUtterance('next', { allowAi: false, recognitionConfidence: 0.95 })).toMatchObject({ narration: 'Advanced.' });
    expect(execute).toHaveBeenCalledWith('advance', {}, {}, expect.objectContaining({
      recognitionConfidence: 0.95,
      parseConfidence: 0.99,
    }));

    expect(kernel.execute('advance', {}, { scopeId: 'source-confidence', channel: 'palette' })).toMatchObject({ narration: 'Advanced.' });
  });

  it('refreshes the exact confirmation deadline when details are repeated', () => {
    let clock = 1000;
    const execute = vi.fn(() => 'Changed.');
    unregister.push(AC.registerCommandScope({
      id: 'source-repeat',
      getCommands: () => [{ id: 'change', risk: 'state-change' }],
      execute,
    }));
    const kernel = AC.createCommandKernel({}, { channel: 'voice', now: () => clock, confirmationMs: 1000 });
    kernel.execute('change', {}, { scopeId: 'source-repeat', recognitionConfidence: 0.2 });
    expect(kernel.getState().pendingConfirmation.expiresAt).toBe(2000);
    clock = 1500;
    expect(kernel.confirm('repeat details')).toMatchObject({ repeated: true, confirmationRequired: true });
    expect(kernel.getState().pendingConfirmation.expiresAt).toBe(2500);
    clock = 2200;
    expect(kernel.confirm('yes')).toMatchObject({ narration: 'Changed.' });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('can resolve a global command without executing it before the kernel policy boundary', async () => {
    const fontBigger = vi.fn(() => 18);
    const routed = await AC.routeUtterance({ fontBigger }, 'make the text bigger', { allowAi: false, routeOnly: true });
    expect(routed).toMatchObject({ routed: true, commandId: 'font_bigger' });
    expect(fontBigger).not.toHaveBeenCalled();
  });
});

describe('canonical source voice output lifecycle', () => {
  it('mute cuts a reply, restores recognition, and cleans up a stale barge-in stream', async () => {
    const previous = {
      SR: window.SpeechRecognition,
      synth: window.speechSynthesis,
      utter: window.SpeechSynthesisUtterance,
      globalUtter: globalThis.SpeechSynthesisUtterance,
      mediaDevices: navigator.mediaDevices,
      audioContext: window.AudioContext,
    };
    const instances = [];
    class FakeRec {
      constructor() { this.start = vi.fn(); this.stop = vi.fn(); instances.push(this); }
    }
    let resolveStream;
    const track = { stop: vi.fn() };
    const getUserMedia = vi.fn(() => new Promise((resolve) => { resolveStream = resolve; }));
    const speak = vi.fn();
    let muted = false;
    try {
      window.SpeechRecognition = FakeRec;
      window.speechSynthesis = { speak, cancel: vi.fn() };
      const Utterance = function (text) { this.text = text; };
      window.SpeechSynthesisUtterance = Utterance;
      globalThis.SpeechSynthesisUtterance = Utterance;
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
      window.AudioContext = vi.fn();
      localStorage.setItem('allo_voice_engine', 'webspeech');

      const loop = AC.createVoiceLoop(() => ({
        globalMuteEnabled: muted,
        voiceSpeakReplies: true,
        fontBigger: vi.fn(() => 18),
        addToast: vi.fn(),
        setVoiceActive: vi.fn(),
      }));
      loop.start();
      const rec = instances[0];
      rec.start.mockClear();
      const result = [{ transcript: 'make the text bigger', confidence: 0.99 }];
      result.isFinal = true;
      rec.onresult({ results: [result] });
      for (let i = 0; i < 8; i++) await Promise.resolve();

      expect(speak).toHaveBeenCalled();
      expect(getUserMedia).toHaveBeenCalled();
      expect(loop.getState().speaking).toBe(true);

      muted = true;
      window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));
      expect(loop.getState().speaking).toBe(false);
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
      expect(rec.start).toHaveBeenCalled();

      resolveStream({ getTracks: () => [track] });
      for (let i = 0; i < 4; i++) await Promise.resolve();
      expect(track.stop).toHaveBeenCalled();
      expect(window.AudioContext).not.toHaveBeenCalled();
      loop.stop();
    } finally {
      localStorage.removeItem('allo_voice_engine');
      window.SpeechRecognition = previous.SR;
      window.speechSynthesis = previous.synth;
      window.SpeechSynthesisUtterance = previous.utter;
      globalThis.SpeechSynthesisUtterance = previous.globalUtter;
      window.AudioContext = previous.audioContext;
      Object.defineProperty(navigator, 'mediaDevices', { value: previous.mediaDevices, configurable: true });
    }
  });
});
