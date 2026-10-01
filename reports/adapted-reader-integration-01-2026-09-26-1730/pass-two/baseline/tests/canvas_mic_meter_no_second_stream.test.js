// Canvas microphone regression (reported 2026-08-18).
//
// A Gemini Canvas document is a blob:/one-shot URL, so microphone permission
// cannot persist against its origin: every getUserMedia re-prompts, and
// answering the prompt reloads the frame — which on Canvas destroys the
// session rather than restarting it.
//
// Before the shared level meter landed (944237f7c, 2026-08-16) a voice session
// made exactly ONE acquisition — the recognizer's own — so users saw a single
// reload the first time and none after. The meter added a SECOND, independent
// getUserMedia on every start, which is why "it refreshes every time the mic
// is used" came back.
//
// The meter is suppressed on Canvas ONLY where it would open its own stream.
// A caller that already holds one still gets a live meter, because reusing an
// existing stream costs no prompt.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

describe('Canvas: the level meter must not open a second microphone stream', () => {
  let AC, getUserMedia;
  beforeAll(() => {
    const noop = () => {};
    vi.stubGlobal('React', {
      createElement: noop, useState: () => [undefined, noop], useEffect: noop,
      useRef: () => ({ current: null }), useMemo: noop, useCallback: (f) => f,
      memo: (f) => f, forwardRef: (f) => f,
    });
    loadAlloModule('allo_commands_module.js');
    AC = window.AlloModules.AlloCommands;
  });
  afterEach(() => {
    delete window._isIOSCanvasEnv;
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });
  afterAll(() => { vi.unstubAllGlobals(); delete window._isCanvasEnv; });

  function installMediaStack() {
    getUserMedia = vi.fn(() => new Promise(() => {}));
    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true, value: { getUserMedia },
    });
  }

  it('opens no stream of its own on Canvas', () => {
    installMediaStack();
    window._isCanvasEnv = true;
    const release = AC.micLevelMonitor.acquire(null);
    expect(getUserMedia).not.toHaveBeenCalled();
    release();
    expect(AC.micLevelMonitor.isActive()).toBe(false);
  });

  it('still opens its own stream everywhere else', () => {
    installMediaStack();
    window._isCanvasEnv = false;
    const release = AC.micLevelMonitor.acquire(null);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    release();
  });

  it('still meters a caller-provided stream on Canvas, since that costs no prompt', () => {
    installMediaStack();
    window._isCanvasEnv = true;
    // A stream the Whisper engine already owns. No prompt, so the meter runs.
    const provided = { getTracks: () => [] };
    const release = AC.micLevelMonitor.acquire({ stream: provided });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(AC.micLevelMonitor.isActive()).toBe(true);
    release();
  });

  it('does not create an auxiliary audio graph for a provided stream on iPhone Canvas', () => {
    installMediaStack();
    window._isCanvasEnv = true;
    window._isIOSCanvasEnv = true;
    const AudioContext = vi.fn(function () {
      return { createAnalyser: vi.fn(), createMediaStreamSource: vi.fn(), close: vi.fn() };
    });
    window.AudioContext = AudioContext;
    const provided = { getTracks: () => [] };

    const release = AC.micLevelMonitor.acquire({ stream: provided });

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(AudioContext, 'the meter must not add a second Web Audio graph').not.toHaveBeenCalled();
    release();
  });
});
