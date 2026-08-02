// Edit-Audio hang regressions (field log 2026-07-20): with the Canvas key
// 401-latched, callTTS kept firing doomed Gemini attempts (a full fetch
// budget each) and then fed the raw Gemini voice name ('Kore') to Kokoro,
// which returned nothing SILENTLY — a ready local engine sat idle while the
// Generate button hung for minutes.
//
// Behaviors under test (real tts_module, network/kokoro faked):
//   1. Latched + cooldown armed → ZERO Gemini fetches; Kokoro serves.
//   2. Latched + cooldown expired → exactly ONE probe attempt, cooldown re-arms.
//   3. A successful probe clears the latch (token rotation recovers).
//   4. Gemini voice names map to a Kokoro voice; silent empty returns trace.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  delete window._kokoroTTS;
  delete window._piperTTS;
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

describe('Canvas auth latch: doomed Gemini calls are skipped', () => {
  it('latched + cooldown armed: no Gemini fetch, Kokoro serves with a MAPPED voice', async () => {
    const state = freshState();
    state.authRetryAt = Date.now() + 300000;
    window.__ttsGeminiAuthFailed = true;
    const fetchMock = vi.fn(async () => { throw new Error('Gemini must not be called'); });
    vi.stubGlobal('fetch', fetchMock);
    const speak = vi.fn(async (text, voice) => 'blob:kokoro-' + voice);
    window._kokoroTTS = { ready: true, speak };

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('The key is dead but the reader is waiting.', 'Kore', 1, 2, 'English');

    expect(url).toBe('blob:kokoro-af_heart');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(speak).toHaveBeenCalledWith(
      expect.any(String), 'af_heart', 1, expect.objectContaining({ signal: expect.anything() }),
    );
    expect(traceEvents()).toContain('calltts:canvas-skip-authfailed');
    expect(traceEvents()).toContain('calltts:kokoro-fallback-ok');
  });

  it('a selected Kokoro voice id passes through unmapped', async () => {
    const state = freshState();
    state.authRetryAt = Date.now() + 300000;
    window.__ttsGeminiAuthFailed = true;
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no Gemini'); }));
    const speak = vi.fn(async (text, voice) => 'blob:kokoro-' + voice);
    window._kokoroTTS = { ready: true, speak };

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('A local voice was chosen on purpose.', 'af_bella', 1, 2, 'English');

    expect(url).toBe('blob:kokoro-af_bella');
    expect(speak).toHaveBeenCalledWith(
      expect.any(String), 'af_bella', 1, expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('latched + cooldown expired: exactly ONE probe attempt, then cooldown re-arms', async () => {
    const state = freshState();
    window.__ttsGeminiAuthFailed = true; // authRetryAt unset → this call probes
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'API key rejected',
      json: async () => ({}),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const speak = vi.fn(async (text, voice) => 'blob:kokoro-' + voice);
    window._kokoroTTS = { ready: true, speak };

    const { callTTS } = makeCanvasTTS(state);
    // maxRetries 2 would normally allow THREE canvas attempts — probe caps at one.
    const url = await callTTS('Probe once, not three times.', 'Kore', 1, 2, 'English');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(url).toBe('blob:kokoro-af_heart');
    expect(state.authRetryAt).toBeGreaterThan(Date.now());
    expect(traceEvents()).toContain('calltts:canvas-auth-probe');
  });

  it('a successful probe clears the latch — token rotation recovers cloud voices', async () => {
    const state = freshState();
    window.__ttsGeminiAuthFailed = true;
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=' } }] } }],
      }),
    })));
    const createObjectURL = vi.fn(() => 'blob:gemini-recovered');
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL: vi.fn() }));

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('The token rotated back to valid.', 'Kore', 1, 2, 'English');

    expect(url).toBe('blob:gemini-recovered');
    expect(window.__ttsGeminiAuthFailed).toBe(false);
    expect(state.authRetryAt).toBe(0);
    expect(traceEvents()).toContain('calltts:auth-recovered');
  });

  it('a silent empty Kokoro return is TRACED, not swallowed', async () => {
    const state = freshState();
    state.authRetryAt = Date.now() + 300000;
    window.__ttsGeminiAuthFailed = true;
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no Gemini'); }));
    window._kokoroTTS = { ready: true, speak: vi.fn(async () => undefined) };

    const { callTTS } = makeCanvasTTS(state);
    const url = await callTTS('The engine said nothing at all.', 'Kore', 1, 2, 'English');

    expect(url).toBe(null);
    expect(traceEvents()).toContain('calltts:kokoro-fallback-empty');
    expect(traceEvents()).toContain('calltts:canvas-null');
  });
});

describe('Edit-Audio regenerate pathway pins (3-host)', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const synthBlock = (source) => {
    const start = source.indexOf('const _synthSentenceForStore');
    const end = source.indexOf('const _persistKaraokeAudioField', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end).replace(/\r\n/g, '\n');
  };


  it('_synthSentenceForStore skips the direct Gemini leg when it cannot succeed', () => {
    expect(anti).toContain("const configuredProvider = String(profile.provider || _aiConfig.ttsProvider || 'auto').toLowerCase();");
    expect(anti).toContain("const _providerAllowsGemini = configuredProvider === 'auto' || configuredProvider === 'gemini';");
    expect(anti).toContain("const _geminiUsable = _providerAllowsGemini && !window.__ttsGeminiAuthFailed && !/^(af_|am_|bf_|bm_)/i.test(String(activeVoice || ''));");
    expect(anti).toContain('if (_geminiUsable && window.lamejs && _ah &&');
  });

  it('the callTTS leg rides the interactive lane with a tight retry ceiling', () => {
    const idx = anti.indexOf('const _synthSentenceForStore');
    const slice = anti.slice(idx, idx + 5000);
    expect(slice).toContain("priority: options.priority || 'interactive',");
    expect(slice).toContain('maxRetries: Number.isFinite(options.maxRetries) ? options.maxRetries : 1,');
    expect(slice).toContain("reason: 'karaoke-store-synth',");
    expect(slice).toContain('signal,');
  });

  it('keeps the synthesis contract identical across the source and both generated hosts', () => {
    const sources = [
      anti,
      readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'desktop/web-app/src/App.jsx'), 'utf8'),
    ];
    const blocks = sources.map(synthBlock);
    expect(blocks).toEqual([blocks[0], blocks[0], blocks[0]]);
  });

  it('the BUILT tts module ships the latch skip + voice mapping', () => {
    const mod = readFileSync(resolve(process.cwd(), 'tts_module.js'), 'utf8');
    expect(mod).toContain('calltts:canvas-skip-authfailed');
    expect(mod).toContain('calltts:canvas-auth-probe');
    expect(mod).toContain('calltts:auth-recovered');
    expect(mod).toContain('calltts:kokoro-fallback-empty');
    expect(mod).toMatch(/kokoroVoice = _kokoroVoicePrefix\.test\(String\(voiceName \|\| ''\)\) \? voiceName : 'af_heart'/);
  });
});
