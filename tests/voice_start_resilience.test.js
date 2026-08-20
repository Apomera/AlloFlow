// Voice must open the mic even when the on-device probe never answers.
//
// The default engine pref is "auto", so start() routes through
// modelCache.hasWhisper(), which awaits _deviceStorage(). That loader sets
// script onload/onerror but had NO timeout, so if the script neither loaded nor
// errored (offline, a CSP block, a stalled CDN, or a test environment that does
// not fetch external scripts) the promise never settled, beginWebSpeech was
// never reached, and the mic never opened. start() had ALREADY returned true,
// so the UI showed voice as ON while nothing was listening.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});

afterEach(() => { vi.useRealTimers(); });

function fakeRecognition() {
  const instances = [];
  class FakeSpeechRecognition {
    constructor() { this.start = vi.fn(); this.stop = vi.fn(); instances.push(this); }
  }
  const prev = window.SpeechRecognition;
  window.SpeechRecognition = FakeSpeechRecognition;
  // Leave the engine pref UNSET so this exercises the real "auto" path that
  // probes for the on-device model first.
  try { localStorage.removeItem('allo_voice_engine'); } catch (_) {}
  return { instances, restore: () => { window.SpeechRecognition = prev; } };
}

describe('a hanging on-device probe cannot leave the mic closed', () => {
  it('falls back to browser speech instead of waiting forever', async () => {
    vi.useFakeTimers();
    const fake = fakeRecognition();
    try {
      const addToast = vi.fn();
      const loop = AC.createVoiceLoop(() => ({ t: (k, fb) => fb, addToast, setVoiceActive: vi.fn() }));

      expect(loop.start(), 'start() reports success to the caller').toBe(true);
      // Nothing is listening yet: the probe owns the decision at this point.
      expect(fake.instances.length, 'no recognizer while probing').toBe(0);

      // jsdom does not fetch the device-storage script, so onload/onerror never
      // fire. This is exactly the stalled-CDN case.
      await vi.advanceTimersByTimeAsync(3000);

      expect(fake.instances.length, 'mic opened on browser speech').toBeGreaterThan(0);
      expect(loop.isActive(), 'loop still active').toBe(true);
      loop.stop();
    } finally { fake.restore(); }
  });

  it('says which engine it settled on rather than failing silently', async () => {
    vi.useFakeTimers();
    const fake = fakeRecognition();
    try {
      const addToast = vi.fn();
      const loop = AC.createVoiceLoop(() => ({ t: (k, fb) => fb, addToast, setVoiceActive: vi.fn() }));
      loop.start();
      await vi.advanceTimersByTimeAsync(3000);
      const said = addToast.mock.calls.map((c) => String(c[0])).join(' | ');
      expect(said, 'the fallback is announced').toMatch(/browser speech/i);
      loop.stop();
    } finally { fake.restore(); }
  });

  it('does not open a second recognizer if the probe answers late', async () => {
    // A late resolution must not restart or double-announce over the engine the
    // timeout already chose.
    vi.useFakeTimers();
    const fake = fakeRecognition();
    try {
      const loop = AC.createVoiceLoop(() => ({ t: (k, fb) => fb, addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      await vi.advanceTimersByTimeAsync(3000);
      const afterTimeout = fake.instances.length;
      // Let the 15s device-storage timeout fire and the probe reject.
      await vi.advanceTimersByTimeAsync(20000);
      expect(fake.instances.length, 'no duplicate recognizer').toBe(afterTimeout);
      loop.stop();
    } finally { fake.restore(); }
  });
});

describe('desktop Whisper continuous-turn parity', () => {
  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('%s finalizes speech on a natural pause', (file) => {
    const source = readFileSync(file, 'utf8');
    const shimStart = source.indexOf('class AlloLocalSpeechRecognition');
    const shimEnd = source.indexOf('window.__loadPiperTTS', shimStart);
    const shim = source.slice(shimStart, shimEnd);
    expect(shimStart).toBeGreaterThan(-1);
    expect(shim).toContain('_startTurnDetection()');
    expect(shim).toContain('now - this._lastVoiceAt >= 750');
    expect(shim).toContain('this.onspeechstart');
    expect(shim).toContain('this.onspeechend');
    expect(shim).toContain('if (naturalPause || turnLimit)');
    expect(shim).not.toContain('confidence: 0.9');
  });
});

describe('AlloBot output state matches audible playback', () => {
  it('waits for actual generated or browser playback before notifying the host', () => {
    const source = readFileSync('allobot_source.jsx', 'utf8');
    const speak = source.slice(source.indexOf('const speak = useCallback'), source.indexOf('const handleTypingState'));
    expect(speak).toContain('audio.onplaying = () =>');
    expect(speak).toContain('utter.onstart = () =>');
    expect(speak).toContain('if (onSpeechStart) onSpeechStart();');
    expect(speak.indexOf('if (onSpeechStart) onSpeechStart();')).toBeGreaterThan(speak.indexOf('const markSpeechStarted'));
    expect(speak).toContain('if (speechStarted && onSpeechEnd) onSpeechEnd();');
  });

  it('recovers from zero volume and accepted playback that never starts', () => {
    const source = readFileSync('allobot_source.jsx', 'utf8');
    const speak = source.slice(source.indexOf('const speak = useCallback'), source.indexOf('const handleTypingState'));
    expect(speak).toContain('configuredVolume <= 0');
    expect(speak).toContain('voice volume is set to zero');
    expect(speak).toContain("AlloBot's device voice did not start");
    expect(speak).toContain("Generated AlloBot audio accepted play() but never started");
    expect(speak).toContain('cancelAlloBotBrowserSpeech();');
  });
});
