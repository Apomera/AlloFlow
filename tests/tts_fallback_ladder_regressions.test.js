// Why the browser voice was winning too often (field report 2026-08-14), and
// why tapping a sentence in Adapted Text sometimes did nothing at all.
//
// Three independent defects, one symptom set:
//   1. The Canvas retry ladder only treated 401/403/503/"Transient Error" as
//      retryable. fetchTTSBytes throws a BARE `API Error: 500 …` for every 5xx
//      that is not 503, and a dropped connection surfaces as the browser's own
//      TypeError. Neither was retried, so one blip on a school network sent the
//      whole passage to speechSynthesis.
//   2. A single hard deadline armed a 60s cooldown with ZERO retries — a full
//      minute of reading handed to the browser voice by one slow response.
//   3. Kokoro was only ever used if the engine happened to be live. A refresh
//      clears window._kokoroTTS while the ~88MB model stays in device storage,
//      so a learner who downloaded the local voice still got the browser voice
//      for the rest of the session. Waking a cached model is not a download and
//      must not be confused with one: an off-desktop device WITHOUT the model
//      must still never fetch it (QR students on phones).
//
// Real tts_module throughout; only the network and the Kokoro engine are faked.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let createTTS;

beforeAll(() => {
  loadAlloModule('tts_module.js');
  createTTS = window.AlloModules.createTTS;
  if (!createTTS) throw new Error('createTTS did not register');
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.__ttsGeminiAuthFailed;
  delete window.__ttsGeminiQuotaFailed;
  delete window.__kokoroOfferShown;
  delete window.__kokoroTTSDownloading;
  delete window._kokoroTTS;
  delete window._piperTTS;
  delete window.__loadKokoroTTS;
  delete window._isDesktopBundledApp;
  delete window.AlloModules.AlloCommands;
  window.__alloTtsTrace = [];
});

const makeCanvasTTS = (state) => createTTS({
  state,
  apiKey: 'canvas-injected-key',
  GEMINI_MODELS: { tts: 'test-tts-model' },
  AVAILABLE_VOICES: ['Kore'],
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

const freshState = () => ({ queue: [], botQueue: [], urlCache: new Map(), rateLimitedUntil: 0 });
const traceEvents = () => (window.__alloTtsTrace || []).map((e) => e.event);

// A response carrying real audio, so a retry can actually succeed.
const okAudio = () => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=' } }] } }] }),
});
const httpError = (status, statusText) => ({
  ok: false,
  status,
  statusText,
  text: async () => statusText,
  json: async () => ({}),
});
const stubBlobUrl = (value) => {
  vi.stubGlobal('URL', Object.assign(Object.create(URL), {
    createObjectURL: vi.fn(() => value),
    revokeObjectURL: vi.fn(),
  }));
};

describe('Gemini TTS is retried on the failures that are actually transient', () => {
  it('a 500 is retried and the second attempt serves cloud audio', async () => {
    const state = freshState();
    stubBlobUrl('blob:gemini-after-500');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(httpError(500, 'Internal Server Error'))
      .mockResolvedValueOnce(okAudio());
    vi.stubGlobal('fetch', fetchMock);
    // A ready local engine would mask the bug by answering instead.
    const speak = vi.fn(async () => 'blob:kokoro-should-not-be-needed');
    window._kokoroTTS = { ready: true, speak };

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('A 500 is the server having a moment.', 'Kore', 1, 2, 'English');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(url).toBe('blob:gemini-after-500');
    expect(speak).not.toHaveBeenCalled();
  });

  it('a dropped connection (TypeError) is retried rather than dumped on the browser voice', async () => {
    const state = freshState();
    stubBlobUrl('blob:gemini-after-network-blip');
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okAudio());
    vi.stubGlobal('fetch', fetchMock);
    window._kokoroTTS = { ready: true, speak: vi.fn(async () => 'blob:kokoro') };

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('The wifi hiccupped for one request.', 'Kore', 1, 2, 'English');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(url).toBe('blob:gemini-after-network-blip');
  });

  it('a 429 is still NOT retried — it is an answer, not a flake', async () => {
    const state = freshState();
    const fetchMock = vi.fn(async () => httpError(429, 'Too Many Requests'));
    vi.stubGlobal('fetch', fetchMock);
    const speak = vi.fn(async (text, voice) => 'blob:kokoro-' + voice);
    window._kokoroTTS = { ready: true, speak };

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('Quota is exhausted; retrying only wastes time.', 'Kore', 1, 2, 'English');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(url).toBe('blob:kokoro-af_heart');
  });

  it('the FIRST hard deadline spends a retry before arming the 60s cooldown', async () => {
    const state = freshState();
    stubBlobUrl('blob:gemini-after-slow-first-response');
    // A never-settling fetch trips the module's own deadline watchdog; the
    // second call answers immediately.
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce(okAudio());
    vi.stubGlobal('fetch', fetchMock);
    window._kokoroTTS = { ready: true, speak: vi.fn(async () => 'blob:kokoro') };

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('One slow response is not a slow path.', 'Kore', 1, 2, 'English');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(url).toBe('blob:gemini-after-slow-first-response');
    expect(traceEvents()).toContain('calltts:canvas-timeout-retry');
    // The retry succeeded, so the cloud path is NOT benched.
    expect(state.timeoutRetryAt || 0).toBe(0);
  }, 40000);
});

describe('Kokoro serves English when the model is already on the device', () => {
  const installModelCache = (present) => {
    window.AlloModules.AlloCommands = { modelCache: { hasKokoro: vi.fn(async () => present) } };
  };
  // __loadKokoroTTS is what the app shell exposes; it publishes window._kokoroTTS.
  const installLoader = (onLoad) => {
    window.__loadKokoroTTS = vi.fn(async () => { onLoad(); return true; });
    return window.__loadKokoroTTS;
  };

  it('a cached-but-cold engine is woken instead of falling through to the browser voice', async () => {
    const state = freshState();
    state.rateLimitedUntil = Date.now() + 300000; // cloud unavailable this call
    installModelCache(true);
    const speak = vi.fn(async (text, voice) => 'blob:kokoro-woken-' + voice);
    const loader = installLoader(() => { window._kokoroTTS = { ready: true, speak }; });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('cloud is benched'); }));

    const { callTTS } = makeCanvasTTS(state);
    // Before the fix this resolved to null and the caller spoke via
    // speechSynthesis, even though the model was sitting in device storage.
    const url = await callTTS('The downloaded voice should read this.', 'Kore', 1, 2, 'English');

    expect(loader).toHaveBeenCalled();
    expect(url).toBe('blob:kokoro-woken-af_heart');
  }, 30000);

  it('an off-desktop device WITHOUT the model never triggers a download', async () => {
    const state = freshState();
    state.rateLimitedUntil = Date.now() + 300000;
    installModelCache(false);
    const loader = installLoader(() => { window._kokoroTTS = { ready: true, speak: vi.fn() }; });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('cloud is benched'); }));

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('A phone on a QR link must not pull 88MB.', 'Kore', 1, 2, 'English');

    expect(loader).not.toHaveBeenCalled();
    expect(url).toBeNull(); // caller falls back to the browser voice, as designed
    expect(traceEvents()).toContain('calltts:kokoro-not-on-device');
  }, 30000);

  it('a live engine is used directly, with no redundant loader call', async () => {
    const state = freshState();
    state.rateLimitedUntil = Date.now() + 300000;
    installModelCache(true);
    const loader = installLoader(() => {});
    window._kokoroTTS = { ready: true, speak: vi.fn(async (text, voice) => 'blob:kokoro-live-' + voice) };
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('cloud is benched'); }));

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('The engine is already warm.', 'Kore', 1, 2, 'English');

    expect(url).toBe('blob:kokoro-live-af_heart');
    expect(loader).not.toHaveBeenCalled();
  }, 30000);
});
