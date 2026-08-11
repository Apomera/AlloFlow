import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { transformSync } = require(resolve(modulesDir, '@babel/core'));
const transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

function loadSourceModule(file) {
  const compiled = transformSync(read(file), {
    babelrc: false,
    configFile: false,
    sourceType: 'script',
    plugins: [transformReactJsx],
  }).code;
  const ReactStub = { createElement: () => null };
  new Function('window', 'React', 'SpeechSynthesisUtterance', compiled)(
    window,
    ReactStub,
    window.SpeechSynthesisUtterance,
  );
}

let PhaseK;
let Pure;
let createTTS;
let AIProvider;
let originalCreateObjectURL;
let originalRevokeObjectURL;

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  loadSourceModule('phase_k_helpers_source.jsx');
  loadSourceModule('pure_helpers_source.jsx');
  PhaseK = window.AlloModules.PhaseKHelpers;
  Pure = window.AlloModules.PureHelpers;
  loadSourceModule('tts_source.jsx');
  loadAlloModule('ai_backend_module.js');
  createTTS = window.AlloModules.createTTS;
  AIProvider = window.AIProvider;
  originalCreateObjectURL = URL.createObjectURL;
  originalRevokeObjectURL = URL.revokeObjectURL;
  if (!createTTS || !AIProvider) throw new Error('TTS providers failed to register');
}, 30000);
afterEach(() => {  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true, writable: true, value: originalCreateObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true, writable: true, value: originalRevokeObjectURL,
  });
  delete window._piperTTS;
  delete window.__ttsGeminiQuotaFailed;
  delete window.__ttsGeminiAuthFailed;
});

describe('ordinary Leveled Text TTS identity', () => {
  it('tracks duplicate occurrences across bilingual lanes without losing lane language', () => {
    const occurrenceByText = new Map();
    const source = PhaseK.createReadAloudDescriptors(
      ['Repeated sentence.', 'Different sentence.', 'Repeated sentence.'],
      { language: 'Spanish', scope: 'source', occurrenceByText },
    );
    const target = PhaseK.createReadAloudDescriptors(
      ['Repeated sentence.', 'repeated sentence.'],
      { language: 'English', scope: 'target', occurrenceByText },
    );

    expect(source.map(({ occurrence, language }) => ({ occurrence, language }))).toEqual([
      { occurrence: 0, language: 'Spanish' },
      { occurrence: 0, language: 'Spanish' },
      { occurrence: 1, language: 'Spanish' },
    ]);
    expect(target.map(({ occurrence, language }) => ({ occurrence, language }))).toEqual([
      { occurrence: 2, language: 'English' },
      { occurrence: 0, language: 'English' },
    ]);
  });

  it('includes language in sequence-buffer identity and maps browser speech language', () => {
    expect(PhaseK.sequenceBufferKey(0, 'Kore', 'Hola.', '1\u241fSpanish'))
      .not.toBe(PhaseK.sequenceBufferKey(0, 'Kore', 'Hola.', '1\u241fEnglish'));
    expect(PhaseK.browserLanguageTag('Spanish')).toBe('es-ES');
    expect(PhaseK.browserLanguageTag('fr-CA')).toBe('fr-CA');
  });
});

describe('citation-safe sentence boundaries', () => {
  it('keeps abbreviations intact and attaches comma-separated trailing citations to the claim', () => {
    const units = Pure.splitTextToSentences(
      'The U.S. team uses e.g. one method. Evidence. ' +
      '[⁽¹⁾](https://example.org/Function_(mathematics)), ' +
      '[⁽²⁾](https://example.org/evidence) Next claim.',
    );

    expect(units).toEqual([
      'The U.S. team uses e.g. one method.',
      'Evidence. [⁽¹⁾](https://example.org/Function_(mathematics)) [⁽²⁾](https://example.org/evidence)',
      'Next claim.',
    ]);
  });
});
describe('provider-level multilingual TTS resilience', () => {
  function installObjectUrls(prefix) {
    let next = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:' + prefix + '-' + (++next)),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  }

  function makeSourceTts(state, languageToTTSCode = () => 'en') {
    return createTTS({
      state,
      apiKey: 'fixture-key',
      GEMINI_MODELS: { tts: 'fixture-tts' },
      AVAILABLE_VOICES: ['Kore', 'Puck'],
      _isCanvasEnv: true,
      languageToTTSCode,
      isGlobalMuted: () => false,
      warnLog: () => {},
      debugLog: () => {},
      getLeveledTextLanguage: () => 'English',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({}),
      getAi: () => null,
      setShowKokoroOfferModal: null,
    });
  }

  function geminiAudioResponse() {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('pcm').toString('base64') } }] } }],
      }),
    };
  }

  it('normalizes locale/dialect for cloud prompts and cache keys while keeping Piper on the base language', async () => {
    installObjectUrls('source');
    const fetchMock = vi.fn(async () => geminiAudioResponse());
    vi.stubGlobal('fetch', fetchMock);
    const state = {
      queue: Promise.resolve(), interactiveQueue: Promise.resolve(), botQueue: Promise.resolve(),
      urlCache: new Map(), rateLimitedUntil: 0,
    };
    const { callTTS } = makeSourceTts(state);

    const first = await callTTS('Bonjour tout le monde.', 'Kore', 1, {
      language: 'French', locale: 'fr_ca', dialect: '  Canada / Quebec  ',
      maxRetries: 0, priority: 'interactive',
    });
    const equivalent = await callTTS('Bonjour tout le monde.', 'Kore', 1, {
      language: 'French', locale: 'fr-CA', dialect: 'Canada / Quebec',
      maxRetries: 0, priority: 'interactive',
    });
    const france = await callTTS('Bonjour tout le monde.', 'Kore', 1, {
      language: 'French', locale: 'fr-FR', dialect: 'France',
      maxRetries: 0, priority: 'interactive',
    });

    expect(equivalent).toBe(first);
    expect(france).not.toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstPrompt = JSON.parse(fetchMock.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(firstPrompt).toContain('French text using locale fr-CA and the Canada / Quebec dialect or regional variety');
    expect(Array.from(state.urlCache.keys())).toEqual(expect.arrayContaining([
      JSON.stringify(['Bonjour tout le monde.', 'Kore', 'french\u241ffr-ca\u241fcanada / quebec', 'natural-rate-v1']),
      JSON.stringify(['Bonjour tout le monde.', 'Kore', 'french\u241ffr-fr\u241ffrance', 'natural-rate-v1']),
    ]));

    const piperLanguage = vi.fn(() => 'fr');
    const piperSpeak = vi.fn(async () => 'blob:piper-fr');
    window._piperTTS = { supportsLanguage: () => true, speak: piperSpeak };
    fetchMock.mockImplementationOnce(async () => ({
      ok: false, status: 429, statusText: 'Too Many Requests', text: async () => '',
    }));
    const fallbackState = {
      queue: Promise.resolve(), interactiveQueue: Promise.resolve(), botQueue: Promise.resolve(),
      urlCache: new Map(), rateLimitedUntil: 0,
    };
    const fallback = makeSourceTts(fallbackState, piperLanguage);
    await expect(fallback.callTTS('Encore une fois.', 'Kore', 1, {
      language: 'French (Canada / Quebec)', locale: 'fr_ca',
      maxRetries: 0, priority: 'interactive',
    })).resolves.toBe('blob:piper-fr');
    expect(piperLanguage).toHaveBeenCalledWith('French');
    expect(piperSpeak).toHaveBeenCalledWith('Encore une fois.', 'fr', 1, expect.any(Object));
  });

  it('reports the actual resolver route without changing the URL return contract', async () => {
    installObjectUrls('resolved-profile');
    const fetchMock = vi.fn(async () => geminiAudioResponse());
    vi.stubGlobal('fetch', fetchMock);
    const state = {
      queue: Promise.resolve(), interactiveQueue: Promise.resolve(), botQueue: Promise.resolve(),
      urlCache: new Map(), rateLimitedUntil: 0,
    };
    const { callTTS } = makeSourceTts(state);
    const generatedProfile = vi.fn();
    const generatedUrl = await callTTS('Save this sentence.', 'Kore', 0.9, {
      language: 'English',
      maxRetries: 0,
      priority: 'interactive',
      onResolvedProfile: generatedProfile,
    });

    expect(generatedUrl).toBe('blob:resolved-profile-1');
    expect(generatedProfile).toHaveBeenCalledTimes(1);
    expect(generatedProfile).toHaveBeenCalledWith(expect.objectContaining({
      provenanceVersion: 1,
      provider: 'gemini',
      engine: 'gemini-tts',
      model: 'fixture-tts',
      voice: 'Kore',
      resolvedVoice: 'Kore',
      synthesisRate: 0.9,
      effectiveSynthesisRate: 1,
      cacheHit: false,
    }));

    const cachedProfile = vi.fn();
    await expect(callTTS('Save this sentence.', 'Kore', 0.9, {
      language: 'English',
      maxRetries: 0,
      priority: 'interactive',
      onResolvedProfile: cachedProfile,
    })).resolves.toBe(generatedUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cachedProfile).toHaveBeenCalledWith(expect.objectContaining({
      provenanceVersion: 1,
      provider: 'gemini',
      engine: 'gemini-tts',
      cacheHit: true,
    }));

    const fallbackFetch = vi.fn(async () => ({
      ok: false, status: 429, statusText: 'Too Many Requests', text: async () => '',
    }));
    vi.stubGlobal('fetch', fallbackFetch);
    window._piperTTS = {
      voiceMap: { fr: { voiceId: 'fr_FR-siwis-medium' } },
      supportsLanguage: () => true,
      speak: vi.fn(async () => 'blob:piper-fr'),
    };
    const fallbackState = {
      queue: Promise.resolve(), interactiveQueue: Promise.resolve(), botQueue: Promise.resolve(),
      urlCache: new Map(), rateLimitedUntil: 0,
    };
    const fallbackProfile = vi.fn();
    const fallbackTts = makeSourceTts(fallbackState, () => 'fr');
    await expect(fallbackTts.callTTS('Bonjour.', 'Kore', 1, {
      language: 'French',
      maxRetries: 0,
      priority: 'interactive',
      onResolvedProfile: fallbackProfile,
    })).resolves.toBe('blob:piper-fr');
    expect(fallbackProfile).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'local',
      engine: 'piper-browser',
      voice: 'Kore',
      resolvedVoice: 'fr_FR-siwis-medium',
      languageCode: 'fr',
      effectiveSynthesisRate: 1,
      fallbackFrom: 'gemini',
    }));
    expect(fallbackProfile.mock.calls[0][0]).not.toHaveProperty('model');

    await expect(callTTS('Save this sentence.', 'Kore', 0.9, {
      language: 'English',
      maxRetries: 0,
      onResolvedProfile: () => { throw new Error('observer failure'); },
    })).resolves.toBe(generatedUrl);
  });
  it('strictly bypasses configured AIProvider Gemini and OpenAI caches only when force is true', async () => {
    installObjectUrls('provider');
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('generateContent')) return geminiAudioResponse();
      return { ok: true, status: 200, blob: async () => new Blob(['wav'], { type: 'audio/wav' }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const providerConfig = {
      apiKey: 'fixture-key',
      baseUrl: 'https://fixture.invalid',
      models: { tts: 'fixture-tts' },
      debugLog: () => {},
      warnLog: () => {},
    };
    const profile = {
      voice: 'Kore', language: 'French', locale: 'fr_ca', dialect: ' Canada / Quebec ',
    };

    const gemini = new AIProvider({ ...providerConfig, backend: 'gemini' });
    const geminiFirst = await gemini.textToSpeech('Bonjour.', profile);
    expect(await gemini.textToSpeech('Bonjour.', { ...profile, locale: 'fr-CA', force: 'true' })).toBe(geminiFirst);
    const geminiForced = await gemini.textToSpeech('Bonjour.', { ...profile, force: true });
    expect(geminiForced).not.toBe(geminiFirst);

    const openai = new AIProvider({ ...providerConfig, backend: 'openai' });
    const openaiFirst = await openai.textToSpeech('Bonjour.', profile);
    expect(await openai.textToSpeech('Bonjour.', { ...profile, force: 'true' })).toBe(openaiFirst);
    const openaiForced = await openai.textToSpeech('Bonjour.', { ...profile, force: true });
    expect(openaiForced).not.toBe(openaiFirst);

    const geminiCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('generateContent'));
    const openaiCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/v1/audio/speech'));
    expect(geminiCalls).toHaveLength(2);
    expect(openaiCalls).toHaveLength(2);
    const cloudPrompt = JSON.parse(geminiCalls[0][1].body).contents[0].parts[0].text;
    expect(cloudPrompt).toContain('locale fr-CA');
    expect(cloudPrompt).toContain('Canada / Quebec dialect or regional variety');
    expect(Array.from(gemini._ttsCache.keys())).toEqual([
      JSON.stringify(['Bonjour.', 'Kore', 'french\u241ffr-ca\u241fcanada / quebec', 'natural-rate-v1']),
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(geminiFirst);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(openaiFirst);
  });
});

describe('source resilience contracts', () => {
  it('owns cancellation, typed browser fallback, stored corruption, volume, and monotonic tokens', () => {
    const phase = read('phase_k_helpers_source.jsx');
    expect(phase).toContain("signal: sessionSignal");
    expect(phase).toContain("errorCode === 'browser-tts-required'");
    expect(phase).toContain('err && err.useBrowserTts');
    expect(phase).toContain('playbackRuntime.corruptStoredKeys.add(corruptKey)');
    expect(phase).toContain('audio.volume = _pkClampVolume(voiceVolume)');
    expect(phase).toContain('Math.max(playbackRuntime.sessionCounter, Number(playbackSessionRef.current) || 0) + 1');
  });

  it('pins the multilingual resilience contracts (2026-08-03 hard deadline + promotion)', () => {
    const tts = read('tts_source.jsx');
    // Both cloud fetch sites race the request against a REAL rejecting
    // deadline: a host fetch that ignores AbortSignal cannot hold a lane.
    expect(tts).toContain('const awaitTtsHardDeadline');
    expect(tts.match(/awaitTtsHardDeadline\(fetch\(url, \{/g) || []).toHaveLength(2);
    expect(tts).toContain('TTS_FETCH_TIMEOUT_INTERACTIVE_MS = 12000');
    expect(tts).toContain('TTS_FETCH_TIMEOUT_MS = 25000');
    // A hard deadline falls back once and briefly bypasses the cloud path,
    // rather than imposing the same wait for every retry and sentence.
    expect(tts).toContain('TTS_TIMEOUT_COOLDOWN_MS = 60000');
    expect(tts).toContain("calltts:canvas-timeout-fallback");
    expect(tts).toContain("calltts:canvas-skip-timeout");
    // Handled local fallback is diagnostic warning, not an app error report.
    expect(tts).not.toContain("console.error('[Canvas TTS]");

    const phase = read('phase_k_helpers_source.jsx');
    expect(phase).toContain('READ_ALOUD_PRELOAD_PROMOTION_MS = 2000');
    // The active fresh request must outlast callTTS's interactive retry
    // ladder even when a host/user config supplies a shorter audio wait.
    expect(phase).toContain('READ_ALOUD_FRESH_SYNTHESIS_WAIT_MS = 30000');
    expect(phase).toContain('Math.max(_pkAudioLoadTimeoutMs(), READ_ALOUD_FRESH_SYNTHESIS_WAIT_MS)');
    expect(phase).toContain("'pk:preload-promoted'");
    // Caller cancellation terminates; it must never masquerade as a promotion.
    expect(phase).toContain("String(e && e.name || '') !== 'AbortError'");
    // Speculative look-aheads carry no retry budget.
    expect(phase).toMatch(/reason: 'read-aloud-preload',[\s\S]{0,120}maxRetries: 0,/);
    // Terminal no-audio failure stops playback instead of silently advancing.
    expect(phase).toContain("terminatePlayback('tts-refused', err)");
    expect(phase).toContain("terminatePlayback('tts-unavailable', err)");

    const service = read('read_aloud_audio_service_source.jsx');
    // The legacy bridge honors the caller's per-entry descriptors.
    expect(service).toContain('Array.isArray(options.entries) && options.entries.length');
    expect(service).toContain('function descriptorSynthesisProfile');

    const host = read('AlloFlowANTI.txt');
    // Host enumerator labels lanes: adapted language for source/body/FAQ,
    // explicit English for the side-by-side translation lane.
    expect(host).toContain("leveledTextLanguage || currentUiLanguage || 'English'");
    expect(host).toContain("addPart(part, 'target/' + paragraphIndex, 'English')");
    // Host default must match the fresh-path floor; 15000 stranded playback
    // mid-retry (field log 2026-08-03, French).
    expect(host).toContain('audioLoadMs: 30000');
  });

  it('keeps Leveled Text download cancellation and sentence accessibility available', () => {
    const view = read('view_simplified_source.jsx');
    expect(view).toContain('window.__alloCancelAudioDownload?.()');
    expect(view).toContain("role=\"status\" aria-live=\"polite\"");
    expect(view.match(/aria-current=\{isActive \? \"true\" : undefined\}/g) || []).toHaveLength(3);
    expect(view).toContain('EDIT_AUDIO_MAX_RECORDING_MS = 120000');
    expect(view).toContain('{ durationMs: durationMs }');
    expect(view).toContain('occurrence: entry && Number.isInteger');
  });
});
