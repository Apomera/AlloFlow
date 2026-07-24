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
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

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
  loadAlloModule('karaoke_audio_store_module.js');
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
  if (window.AlloModules && window.AlloModules.KaraokeAudioStore) {
    window.AlloModules.KaraokeAudioStore.current = null;
    window.AlloModules.KaraokeAudioStore.currentResourceId = null;
  }
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

    expect(getAudioUrl).toHaveBeenCalledTimes(1);
    expect(getAudioUrl).toHaveBeenCalledWith('First sentence.', expect.objectContaining({
      priority: 'interactive',
      reason: 'karaoke-open-warm',
    }));
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

  it('shows a prominent accessible spinner through generation and audio startup', async () => {
    localStorage.setItem('allo_save_karaoke_audio', '0');
    audioInstances = [];
    let resolveStart;
    const pendingStart = new Promise((resolvePending) => { resolveStart = resolvePending; });
    class DeferredStartAudio extends FakeAudio {
      constructor(src) {
        super(src);
        this.play = vi.fn(() => pendingStart);
      }
    }
    global.Audio = window.Audio = DeferredStartAudio;
    window.AlloIcons = window.AlloIcons || {};
    window.AlloIcons.Loader2 = (props) => React.createElement('svg', props);

    let resolveAudio;
    const pendingAudio = new Promise((resolvePending) => { resolveAudio = resolvePending; });
    renderKaraoke(karaokeProps({
      text: 'Show a loading spinner for this sentence.',
      sentenceList: ['Show a loading spinner for this sentence.'],
      getAudioUrl: () => pendingAudio,
    }));

    const preparingStatus = host.querySelector('#karaoke-audio-loading-status');
    expect(preparingStatus).toBeTruthy();
    expect(preparingStatus.textContent).toContain('Preparing first sentence...');

    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => { play.click(); });

    const status = host.querySelector('#karaoke-audio-loading-status');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('Generating audio...');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    const spinner = status.querySelector('svg');
    expect(spinner).toBeTruthy();
    expect(spinner.getAttribute('aria-hidden')).toBe('true');
    expect(spinner.classList.contains('animate-spin')).toBe(true);
    expect(spinner.classList.contains('motion-reduce:animate-none')).toBe(true);
    expect(play.getAttribute('aria-busy')).toBe('true');
    expect(play.getAttribute('aria-describedby')).toBe('karaoke-audio-loading-status');
    expect(play.textContent).toContain('Loading');
    expect(play.querySelector('svg.animate-spin')).toBeTruthy();

    await act(async () => {
      resolveAudio('blob:spinner-test');
      await pendingAudio;
      await Promise.resolve();
    });
    const startingStatus = host.querySelector('#karaoke-audio-loading-status');
    expect(startingStatus).toBeTruthy();
    expect(startingStatus.textContent).toContain('Starting audio...');
    expect(audioInstances[0].play).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStart();
      await pendingStart;
      await Promise.resolve();
    });
    expect(host.querySelector('#karaoke-audio-loading-status')).toBeNull();
    expect(play.getAttribute('aria-busy')).toBe('false');
  });

  it('captures the actively played sentence into durable karaoke storage', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    const capture = vi.fn(async () => true);
    window.__alloCaptureKaraokeAudio = capture;
    const getAudioUrl = vi.fn(sentence => Promise.resolve('blob:' + sentence));

    renderKaraoke(karaokeProps({
      text: 'Capture this sentence.',
      getAudioUrl,
      captureOn: true,
    }));

    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => {
      play.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(capture).toHaveBeenCalledWith('Capture this sentence.', 'blob:Capture this sentence.', { occurrence: 0 });
  });

  it('warms one look-ahead sentence but persists only audio that actually plays', async () => {
    vi.useFakeTimers();
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    const capture = vi.fn(async () => true);
    window.__alloCaptureKaraokeAudio = capture;
    const getAudioUrl = vi.fn(sentence => Promise.resolve('blob:' + sentence));

    renderKaraoke(karaokeProps({ getAudioUrl, captureOn: true }));
    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => {
      play.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
    });

    expect(capture).toHaveBeenCalledWith('First sentence.', 'blob:First sentence.', { occurrence: 0 });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(getAudioUrl).toHaveBeenCalledWith('Second sentence.', expect.objectContaining({
      priority: 'background',
      maxRetries: 0,
    }));
    expect(getAudioUrl.mock.calls.map((call) => call[0])).not.toContain('Third sentence.');
    expect(getAudioUrl.mock.calls.map((call) => call[0])).not.toContain('Fourth sentence.');
  });

  it('replaces a pending background look-ahead with a fresh interactive request when its sentence becomes active', async () => {
    vi.useFakeTimers();
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    // The background look-ahead stays PENDING for the whole test: joining it
    // would strand active playback on a zero-retry, non-abortable request.
    const getAudioUrl = vi.fn((sentence, opts) => {
      if (opts && opts.priority === 'background') return new Promise(() => {});
      return Promise.resolve('blob:' + sentence);
    });

    renderKaraoke(karaokeProps({ getAudioUrl, captureOn: false }));
    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => {
      play.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
    });

    // Finish the first clip; auto-advance makes the warmed sentence active.
    await act(async () => {
      const ended = audioInstances[0].listeners.get('ended');
      if (ended) ended();
      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    const secondCalls = getAudioUrl.mock.calls.filter((call) => call[0] === 'Second sentence.');
    expect(secondCalls).toHaveLength(2);
    expect(secondCalls[0][1]).toMatchObject({ priority: 'background', maxRetries: 0 });
    expect(secondCalls[1][1]).toMatchObject({
      priority: 'interactive',
      maxRetries: 1,
      reason: 'karaoke-play',
    });
    expect(secondCalls[1][1].signal).toBeTruthy();
    expect(audioInstances[1].src).toBe('blob:Second sentence.');
  });

  it('times out a hung resolution, clears the spinner, and recovers with a fresh request', async () => {
    vi.useFakeTimers();
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    // The FIRST request never settles — a wedged cloud queue or stalled
    // plugin load. Without the watchdog this spun the overlay forever, and
    // every later Play re-joined the same hung warm promise.
    let resolverCalls = 0;
    const getAudioUrl = vi.fn(() => {
      resolverCalls += 1;
      return resolverCalls === 1 ? new Promise(() => {}) : Promise.resolve('blob:recovered');
    });

    renderKaraoke(karaokeProps({ text: 'Only sentence here.', getAudioUrl, captureOn: false }));
    await act(async () => { await Promise.resolve(); });
    expect(getAudioUrl).toHaveBeenCalledTimes(1); // overlay-open warm (hung)

    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => {
      play.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(host.querySelector('#karaoke-audio-loading-status')).toBeTruthy();

    // Cross the watchdog window (hung promise still pending), then let the
    // no-TTS tail stop playback and the overlay re-warm with a FRESH request.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(45100);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getAudioUrl.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(host.querySelector('#karaoke-audio-loading-status')).toBeNull();

    // The fresh warm resolved — pressing Play now ACTUALLY plays audio.
    await act(async () => {
      host.querySelector('button[aria-label="Play"]').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(audioInstances[0].src).toBe('blob:recovered');
  });

  it('uses the canonical leveled-text sentence list when supplied', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    const getAudioUrl = vi.fn(sentence => Promise.resolve('blob:' + sentence));

    renderKaraoke(karaokeProps({
      text: 'Heading First sentence.',
      sentenceList: ['Heading', 'First sentence.'],
      getAudioUrl,
      captureOn: false,
    }));
    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => {
      play.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getAudioUrl).toHaveBeenCalledWith('Heading', expect.objectContaining({
      priority: 'interactive',
    }));
    expect(getAudioUrl).not.toHaveBeenCalledWith('Heading First sentence.');
  });

  it('offers a bounded retry when a played clip fails to save', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    const capture = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    window.__alloCaptureKaraokeAudio = capture;
    const getAudioUrl = vi.fn(() => Promise.resolve('blob:retryable-clip'));

    renderKaraoke(karaokeProps({
      text: 'Retry this save.',
      sentenceList: ['Retry this save.'],
      getAudioUrl,
      isTeacher: true,
      captureOn: true,
    }));
    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => {
      play.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const retryButton = Array.from(host.querySelectorAll('button')).find((candidate) =>
      candidate.textContent.includes('Retry failed saves'));
    expect(retryButton).toBeTruthy();

    await act(async () => {
      retryButton.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(capture).toHaveBeenCalledTimes(2);
    expect(getAudioUrl).toHaveBeenCalledTimes(2);
    expect(Array.from(host.querySelectorAll('button')).some((candidate) =>
      candidate.textContent.includes('Retry failed saves'))).toBe(false);
  });
  it('plays a serialized and rehydrated clip without invoking TTS generation', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:rehydrated-read-aloud'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    const KS = window.AlloModules.KaraokeAudioStore;
    const writer = KS.createStore();
    writer.put('Already saved.', Buffer.from('saved audio').toString('base64'), 'audio/mpeg', 'ai-played', {
      voice: 'Kore',
      speed: 1,
      language: 'English',
      provider: 'played-tts-mp3',
    });
    const transferred = JSON.parse(JSON.stringify({ karaokeAudio: writer.serialize() }));
    const reader = KS.createStore();
    reader.hydrate(transferred.karaokeAudio);
    KS.current = reader;

    const synthesize = vi.fn(() => Promise.resolve('blob:unexpected-new-tts'));
    const getAudioUrl = vi.fn((sentence) => {
      const stored = reader.get(sentence);
      return stored ? Promise.resolve(stored) : synthesize(sentence);
    });

    renderKaraoke(karaokeProps({
      text: 'Already saved.',
      sentenceList: ['Already saved.'],
      getAudioUrl,
      captureOn: false,
    }));
    const play = host.querySelector('button[aria-label="Play"]');
    await act(async () => {
      play.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getAudioUrl).toHaveBeenCalledWith('Already saved.', expect.objectContaining({
      priority: 'interactive',
    }));
    expect(synthesize).not.toHaveBeenCalled();
    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].src).toBe('blob:rehydrated-read-aloud');
  });
});

describe('complete clip and shared-request contracts', () => {
  it('uses a complete Kokoro clip for generic read-aloud callers', async () => {
    const speak = vi.fn(() => Promise.resolve('blob:complete-kokoro-sentence'));
    const speakStreaming = vi.fn(() => Promise.resolve('blob:first-chunk-only'));
    window._kokoroTTS = { ready: true, speak, speakStreaming };
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
      _isCanvasEnv: false,
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

    const sentence = 'This deliberately long sentence exceeds the local streaming threshold, but karaoke must receive every word in one playable clip.';
    const url = await callTTS(sentence, 'af_bella', 1, 0, 'English');

    expect(url).toBe('blob:complete-kokoro-sentence');
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speakStreaming).not.toHaveBeenCalled();
  });

  it('deduplicates a non-Canvas warm/current race before the URL cache is populated', async () => {
    let releaseFetch;
    const fetchGate = new Promise((resolveGate) => { releaseFetch = resolveGate; });
    const fetchMock = vi.fn(async () => {
      await fetchGate;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=' } }] } }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:shared-non-canvas-tts'),
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
      _isCanvasEnv: false,
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

    const warmed = callTTS('Share this in-flight request.', 'Puck', 1, 0, 'English');
    const current = callTTS('Share this in-flight request.', 'Puck', 1, 0, 'English');
    await Promise.resolve();
    await Promise.resolve();
    releaseFetch();
    const [warmedUrl, currentUrl] = await Promise.all([warmed, current]);

    expect(warmedUrl).toBe('blob:shared-non-canvas-tts');
    expect(currentUrl).toBe(warmedUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
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
