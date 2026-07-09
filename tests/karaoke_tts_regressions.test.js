// Focused regressions for on-demand Karaoke TTS.
//
// These tests deliberately use the real window-registering runtime modules while
// replacing browser audio and the network boundary with deterministic fakes. They
// guard the two races that made Karaoke appear to require "Save TTS" first:
//   1. Canvas synthesized a URL into its cache but did not read it on the next call.
//   2. Karaoke warmed future sentences while paused, and a new resolver identity
//      from a parent status render restarted an in-flight/current sentence.

// No speech provider or network access is used here.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');

let React;
let ReactDOMClient;
let act;
let KaraokeReaderOverlay;
let createTTS;
let root;
let host;
let audioInstances;

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.duration = 1;
    this.playbackRate = 1;
    this.listeners = new Map();
    this.play = vi.fn(() => Promise.resolve());
    this.pause = vi.fn();
    audioInstances.push(this);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  global.requestAnimationFrame = window.requestAnimationFrame = () => 0;
  global.cancelAnimationFrame = window.cancelAnimationFrame = () => {};

  loadAlloModule('immersive_reader_module.js');
  loadAlloModule('tts_module.js');
  KaraokeReaderOverlay = window.AlloModules.KaraokeReaderOverlay;
  createTTS = window.AlloModules.createTTS;
  if (!KaraokeReaderOverlay) throw new Error('KaraokeReaderOverlay did not register');
  if (!createTTS) throw new Error('createTTS did not register');
});

afterEach(() => {
  if (root) {
    try { act(() => root.unmount()); } catch (_) {}
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem('allo_save_karaoke_audio');
  delete window.__alloCaptureKaraokeAudio;
  delete window._kokoroTTS;
  delete window._piperTTS;
  delete window.__ttsGeminiAuthFailed;
  delete window.__ttsGeminiQuotaFailed;
});

function renderKaraoke(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const render = (nextProps) => {
    act(() => {
      root.render(React.createElement(KaraokeReaderOverlay, nextProps));
    });
  };
  render(props);
  return { render };
}

function karaokeProps(overrides = {}) {
  return {
    text: 'First sentence. Second sentence. Third sentence. Fourth sentence.',
    onClose: () => {},
    isOpen: true,
    isTeacher: false,
    getAudioUrl: null,
    ...overrides,
  };
}

describe('KaraokeReaderOverlay on-demand lifecycle', () => {
  it('does not request look-ahead audio while the reader is paused', async () => {
    vi.useFakeTimers();
    const getAudioUrl = vi.fn(() => Promise.resolve('blob:warmed'));

    renderKaraoke(karaokeProps({ getAudioUrl }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(getAudioUrl).not.toHaveBeenCalled();
  });

  it('does not restart an in-flight sentence when the parent supplies an equivalent new resolver', async () => {
    // This mirrors SimplifiedView rerendering for an audio-capture status update.
    // Before the fix, getAudioUrl was a playSentence dependency; changing only
    // its identity invalidated the first request and immediately launched another.
    localStorage.setItem('allo_save_karaoke_audio', '0');
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;

    let resolveAudio;
    const pendingAudio = new Promise((resolvePending) => { resolveAudio = resolvePending; });
    const underlyingResolver = vi.fn(() => pendingAudio);
    const resolverA = (sentence) => underlyingResolver(sentence);
    const resolverB = (sentence) => underlyingResolver(sentence);
    const initialProps = karaokeProps({
      text: 'Generate this sentence on demand.',
      getAudioUrl: resolverA,
    });
    const view = renderKaraoke(initialProps);

    const play = host.querySelector('button[aria-label="Play"]');
    expect(play).toBeTruthy();
    await act(async () => { play.click(); });
    expect(underlyingResolver).toHaveBeenCalledTimes(1);

    // Only the callback identity changes, as happens when a parent status event
    // rerenders an inline function while TTS is still resolving.
    view.render({ ...initialProps, getAudioUrl: resolverB });
    expect(underlyingResolver).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAudio('blob:on-demand-sentence');
      await pendingAudio;
      await Promise.resolve();
    });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].src).toBe('blob:on-demand-sentence');
    expect(audioInstances[0].play).toHaveBeenCalledTimes(1);
  });
});

describe('Canvas callTTS URL cache', () => {
  it('reuses the first synthesized URL and avoids a second fetch', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=' } }] } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn(() => 'blob:canvas-tts');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });

    const state = {
      queue: Promise.resolve(),
      botQueue: Promise.resolve(),
      urlCache: new Map(),
      rateLimitedUntil: 0,
    };
    const { callTTS } = createTTS({
      state,
      apiKey: 'test-key',
      GEMINI_MODELS: { tts: 'test-tts-model' },
      AVAILABLE_VOICES: ['Puck'],
      _isCanvasEnv: true,
      languageToTTSCode: () => 'en',
      isGlobalMuted: () => false,
      warnLog: () => {},
      debugLog: () => {},
      getLeveledTextLanguage: () => 'English',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({}),
      getAi: () => null,
      setShowKokoroOfferModal: () => {},
    });

    const first = await callTTS('Cache this sentence.', 'Puck', 1, 0, 'English');
    const second = await callTTS('Cache this sentence.', 'Puck', 1, 0, 'English');

    expect(first).toBe('blob:canvas-tts');
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
