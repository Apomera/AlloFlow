import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { loadAlloModule } from './setup.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const WAV_URI = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const WAV_EE_URI = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + 'E'.repeat(40)).toString('base64');
const SHARD_CLIP_URI = 'data:audio/webm;base64,' + Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibQ==').toString('base64');

function loadRealShardIndex() {
  return JSON.parse(readFileSync(path.join(ROOT, 'word_audio_shards/index.json'), 'utf8'));
}

function makeRealShardFetch() {
  const indexRaw = readFileSync(path.join(ROOT, 'word_audio_shards/index.json'), 'utf8');
  return vi.fn(async (url) => {
    const clean = String(url).split('?')[0];
    if (clean.endsWith('word_audio_shards/index.json')) {
      return { ok: true, status: 200, text: async () => indexRaw, json: async () => JSON.parse(indexRaw) };
    }
    const match = clean.match(/word_audio_shards\/([a-z0-9_][a-z0-9_-]*\.json)$/);
    if (match) {
      const body = readFileSync(path.join(ROOT, 'word_audio_shards', match[1]), 'utf8');
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) };
    }
    return { ok: false, status: 404, text: async () => 'Not Found', json: async () => ({}) };
  });
}

function createHostBridgeSandbox(fetchImpl) {
  const hostSource = readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const start = hostSource.indexOf('const _CACHE_WORD_SHARD_CLIPS = Object.create(null);');
  const end = hostSource.indexOf('window.prefetchWordShardAudio = prefetchWordShardAudio;', start);
  if (start < 0 || end < 0) throw new Error('Shard bridge anchor missing in AlloFlowANTI.txt');
  const bridgeSource = hostSource.slice(start, end + 'window.prefetchWordShardAudio = prefetchWordShardAudio;'.length);

  const windowObj = {
    location: { href: 'https://alloflow.example/app/', hostname: 'alloflow.example' },
    fetch: fetchImpl,
  };
  const sandbox = {
    window: windowObj,
    fetch: fetchImpl,
    _CACHE_WORD_AUDIO_BANK: null,
    _AUDIO_BANK_URLS: ['https://alloflow-cdn.pages.dev/audio_bank.json'],
    loadWordAudioBank: vi.fn(async () => null),
    URL,
    Blob,
    Promise,
    Map,
    Set,
    ArrayBuffer,
    Uint8Array,
    DataView,
    Float32Array,
    atob,
    btoa,
    Buffer,
    Date,
    Math,
  };
  vm.runInNewContext(bridgeSource, sandbox);
  return { sandbox, windowObj };
}

describe('AlloFlowANTI shard bridge integration', () => {
  it('loads real shards on demand, keeps _CACHE_WORD_AUDIO_BANK null, coalesces per-shard fetches, and converts to WAV when WebM is unsupported', async () => {
    const idx = loadRealShardIndex();
    const sharedShardId = Object.keys(idx.shards).find((k) => idx.shards[k].words >= 2);
    const sharedFile = idx.shards[sharedShardId].file;
    const pairWords = Object.keys(idx.words).filter((w) => idx.words[w] === sharedShardId).slice(0, 2);
    expect(pairWords).toHaveLength(2);

    const fetchMock = makeRealShardFetch();
    const { sandbox, windowObj } = createHostBridgeSandbox(fetchMock);

    expect(sandbox._CACHE_WORD_AUDIO_BANK).toBeNull();
    const loadedIndex = await windowObj.loadWordShardIndex();
    expect(loadedIndex.format).toBe('alloflow-word-audio-index/1');
    expect(sandbox._CACHE_WORD_AUDIO_BANK).toBeNull();
    expect(sandbox.loadWordAudioBank).not.toHaveBeenCalled();

    const clip = await windowObj.getWordShardAudio('photosynthesis');
    expect(typeof clip).toBe('string');
    expect(clip).toMatch(/^data:audio\/(?:webm|ogg|mp4|mpeg|wav);base64,/i);
    expect(windowObj._CACHE_WORD_SHARD_CLIPS.photosynthesis).toBe(clip);
    expect(sandbox._CACHE_WORD_AUDIO_BANK).toBeNull();

    const beforePrefetchCalls = fetchMock.mock.calls.length;
    const prefetched = await windowObj.prefetchWordShardAudio(pairWords);
    expect(prefetched).toMatchObject({ ok: true, loaded: 2, missing: 0, totalShardsNeeded: 1 });
    const newCalls = fetchMock.mock.calls.slice(beforePrefetchCalls).map((c) => String(c[0]));
    expect(newCalls).toEqual([`word_audio_shards/${sharedFile}`]);
    expect(windowObj._CACHE_WORD_SHARD_CLIPS[pairWords[0]]).toMatch(/^data:audio\//);
    expect(windowObj._CACHE_WORD_SHARD_CLIPS[pairWords[1]]).toMatch(/^data:audio\//);
    expect(sandbox._CACHE_WORD_AUDIO_BANK).toBeNull();

    // Safari/no-WebM path converts via decodeAudioData to portable WAV without touching the eager bank
    const decodeAudioData = vi.fn(async () => ({
      sampleRate: 24000,
      numberOfChannels: 1,
      length: 120,
      getChannelData: () => new Float32Array(120).fill(0.1),
    }));
    const wavClip = await windowObj.getWordShardAudio('photosynthesis', {
      force: true,
      canPlayWebmOpus: () => false,
      decodeAudioData,
    });
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
    expect(wavClip).toMatch(/^data:audio\/wav;base64,/);
    const decoded = Buffer.from(wavClip.split(',')[1], 'base64');
    expect(decoded.subarray(0, 4).toString()).toBe('RIFF');
    expect(decoded.subarray(8, 12).toString()).toBe('WAVE');
  });

  it('falls back to ../word_audio_shards/ from /app/ even when word_audio_shards/ returns SPA HTML or 404 and external CDN is disabled (offlineOnly)', async () => {
    const idx = loadRealShardIndex();
    const firstWord = Object.keys(idx.words)[0];
    const shardId = idx.words[firstWord];
    const shardFile = idx.shards[shardId].file;
    const testIdx = { ...idx, words: { ...idx.words, "don't": shardId } };
    const realIndexRaw = JSON.stringify(testIdx);
    const realShardRaw = JSON.stringify({ format: 'alloflow-word-audio-shard/1', [firstWord]: SHARD_CLIP_URI, "don't": SHARD_CLIP_URI });

    const fetchMock = vi.fn(async (url) => {
      const clean = String(url).split('?')[0];
      if (clean.startsWith('word_audio_shards/')) {
        return { ok: true, status: 200, text: async () => '<!doctype html><html><body>SPA</body></html>' };
      }
      if (clean === '../word_audio_shards/index.json') {
        return { ok: true, status: 200, text: async () => realIndexRaw };
      }
      if (clean === `../word_audio_shards/${shardFile}`) {
        return { ok: true, status: 200, text: async () => realShardRaw };
      }
      if (clean.startsWith('../word_audio_shards/')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ format: 'alloflow-word-audio-shard/1', "don't": SHARD_CLIP_URI }) };
      }
      return { ok: false, status: 404, text: async () => 'Not Found' };
    });

    const { sandbox, windowObj } = createHostBridgeSandbox(fetchMock);
    windowObj.__ALLO_LOCAL_BOX = true;
    const clip = await windowObj.getWordShardAudio(firstWord, { offlineOnly: true });
    expect(clip).toBe(SHARD_CLIP_URI);
    expect(fetchMock.mock.calls.every(([u]) => !String(u).startsWith('https://'))).toBe(true);

    const curlyClip = await windowObj.getWordShardAudio('don’t', { offlineOnly: true });
    expect(curlyClip).toBe(SHARD_CLIP_URI);
    expect(sandbox._CACHE_WORD_AUDIO_BANK).toBeNull();
  });
});

describe('word_practice_module shard lookup integration', () => {
  const coreSource = readFileSync(path.join(ROOT, 'word_practice_core.js'), 'utf8');
  const mediaSource = readFileSync(path.join(ROOT, 'word_practice_media.js'), 'utf8');
  let root, media, core;

  beforeEach(() => {
    const decodeAudioData = vi.fn(async () => ({
      sampleRate: 8000,
      length: 80,
      duration: 0.01,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(80).fill(0.2),
    }));
    root = {
      AudioContext: class {
        decodeAudioData = decodeAudioData;
        close = vi.fn(async () => {});
      },
      _CACHE_WORD_AUDIO_BANK: null,
      _CACHE_WORD_SHARD_CLIPS: Object.create(null),
      getWordShardAudio: vi.fn(async (w) => (w === 'photosynthesis' ? WAV_URI : null)),
      prefetchWordShardAudio: vi.fn(async (words) => {
        for (const w of words) {
          if (w === 'photosynthesis' || w === 'rain') root._CACHE_WORD_SHARD_CLIPS[w] = WAV_URI;
        }
        return { ok: true, loaded: words.length, missing: 0 };
      }),
    };
    vm.runInNewContext(
      `${coreSource}\n${mediaSource}`,
      { window: root, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView, Float32Array },
    );
    core = root.AlloWordPracticeCore;
    media = root.AlloWordPracticeMedia;
  });

  it('serves US-English single words from shards for default/af_heart/Kore voices without callTTS, and bypasses for af_bella or Spanish', async () => {
    for (const selectedVoice of [undefined, 'af_heart', 'Kore']) {
      root._CACHE_WORD_SHARD_CLIPS = Object.create(null);
      root.prefetchWordShardAudio.mockClear();
      root.getWordShardAudio.mockClear();
      const callTTS = vi.fn(async () => WAV_EE_URI);
      const pack = core.normalizeInput({ words: ['photosynthesis'] });
      const res = await media.prepareAudio(pack, { callTTS, selectedVoice });
      expect(res.items[0].wordAudio, `voice=${String(selectedVoice)}`).toBe(WAV_URI);
      expect(callTTS).not.toHaveBeenCalled();
      expect(root.prefetchWordShardAudio).toHaveBeenCalledTimes(1);
    }

    // Non-heart Kokoro voice must NOT silently substitute af_heart shards
    root._CACHE_WORD_SHARD_CLIPS = Object.create(null);
    root.prefetchWordShardAudio.mockClear();
    root.getWordShardAudio.mockClear();
    const bellaCalls = vi.fn(async () => WAV_EE_URI);
    const bellaRes = await media.prepareAudio(core.normalizeInput({ words: ['photosynthesis'] }), { callTTS: bellaCalls, selectedVoice: 'af_bella' });
    expect(bellaRes.items[0].wordAudio).toBe(WAV_EE_URI);
    expect(root.prefetchWordShardAudio).not.toHaveBeenCalled();
    expect(root.getWordShardAudio).not.toHaveBeenCalled();
    expect(bellaCalls).toHaveBeenCalledTimes(1);

    // Spanish word practice must NEVER use US-English shards
    root._CACHE_WORD_SHARD_CLIPS = { pan: WAV_URI };
    root.prefetchWordShardAudio.mockClear();
    root.getWordShardAudio.mockClear();
    const spanishCalls = vi.fn(async () => WAV_EE_URI);
    const spanishRes = await media.prepareAudio(core.normalizeInput({ language: 'Spanish', words: ['pan'] }), { callTTS: spanishCalls, selectedVoice: 'af_heart' });
    expect(spanishRes.items[0].wordAudio).toBe(WAV_EE_URI);
    expect(root.prefetchWordShardAudio).not.toHaveBeenCalled();
    expect(root.getWordShardAudio).not.toHaveBeenCalled();
    expect(spanishCalls).toHaveBeenCalledTimes(1);
    expect(spanishCalls.mock.calls[0][3].language).toBe('Spanish');
  });
});

describe('tts_module { word: true } shard fast-path integration', () => {
  let createTTS;
  beforeAll(() => {
    loadAlloModule('tts_module.js');
    createTTS = window.AlloModules.createTTS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const name of [
      'getWordShardAudio', '__alloStudentAiDisabled', '_kokoroTTS', '_piperTTS',
      '__ttsGeminiAuthFailed', '__ttsGeminiQuotaFailed', '__ttsLastRoute', '__kokoroOfferShown',
    ]) delete window[name];
  });

  function makeTtsHarness(extra = {}) {
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    const config = extra.config || {};
    const api = createTTS({
      state,
      apiKey: extra.apiKey !== undefined ? extra.apiKey : 'synthetic-key',
      GEMINI_MODELS: { tts: 'synthetic-tts-model' },
      AVAILABLE_VOICES: ['Kore'],
      _isCanvasEnv: extra._isCanvasEnv !== undefined ? extra._isCanvasEnv : false,
      languageToTTSCode: (lang) => (/spanish/i.test(String(lang)) ? 'es' : 'en'),
      isGlobalMuted: () => false,
      warnLog: vi.fn(),
      debugLog: vi.fn(),
      getLeveledTextLanguage: () => 'English',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => config,
      getAi: () => extra.ai || null,
      setShowKokoroOfferModal: vi.fn(),
      ...extra,
      state,
    });
    return { api, state };
  }

  it('uses getWordShardAudio across strict Kokoro, Desktop/keyless, Canvas fallback, and student-AI-off modes', async () => {
    const shardMock = vi.fn(async (token) => (token === 'photosynthesis' ? SHARD_CLIP_URI : null));
    window.getWordShardAudio = shardMock;
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    // 1. Strict Kokoro (allowProviderFallback: false) with af_heart
    {
      const { api } = makeTtsHarness({ _isCanvasEnv: true });
      const profiles = [];
      const res = await api.callTTS('photosynthesis', 'af_heart', 1, {
        word: true,
        allowProviderFallback: false,
        language: 'English',
        onResolvedProfile: (p) => profiles.push(p),
      });
      expect(res).toBe(SHARD_CLIP_URI);
      expect(shardMock).toHaveBeenCalledTimes(1);
      expect(profiles[0]).toMatchObject({ engine: 'kokoro-word-shard', resolvedVoice: 'af_heart' });
      expect(fetchSpy).not.toHaveBeenCalled();
    }

    // 2. Desktop / keyless reroute with Kore (no API key, _isCanvasEnv: false)
    {
      shardMock.mockClear();
      const { api } = makeTtsHarness({ _isCanvasEnv: false, apiKey: '' });
      const res = await api.callTTS('photosynthesis', 'Kore', 1, { word: true, language: 'en-US' });
      expect(res).toBe(SHARD_CLIP_URI);
      expect(shardMock).toHaveBeenCalledTimes(1);
      expect(window.__ttsLastRoute).toMatchObject({ route: 'kokoro-word-shard' });
    }

    // 3. Canvas fallback when Gemini is auth-latched (Kore -> af_heart shard)
    {
      shardMock.mockClear();
      window.__ttsGeminiAuthFailed = true;
      const { api, state } = makeTtsHarness({ _isCanvasEnv: true });
      state.authRetryAt = Date.now() + 60_000;
      const res = await api.callTTS('photosynthesis', 'Kore', 1, { word: true, language: 'English' });
      expect(res).toBe(SHARD_CLIP_URI);
      expect(shardMock).toHaveBeenCalledTimes(1);
    }

    // 4. Student AI off on-device path serves af_heart and Kore with { word: true }
    {
      window.__alloStudentAiDisabled = true;
      const { api } = makeTtsHarness({ _isCanvasEnv: false });
      shardMock.mockClear();
      expect(await api.callTTS('photosynthesis', 'af_heart', 1, { word: true })).toBe(SHARD_CLIP_URI);
      expect(window.__ttsLastRoute).toMatchObject({ route: 'student-on-device-word-shard' });
      shardMock.mockClear();
      expect(await api.callTTS('photosynthesis', 'Kore', 1, { word: true })).toBe(SHARD_CLIP_URI);
      expect(shardMock).toHaveBeenCalledTimes(1);
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  });

  it('bypasses shards for af_bella, browser voice, force: true, speed: 0.8, multi-word, Spanish, en-GB, and locale: en-GB', async () => {
    const shardMock = vi.fn(async () => SHARD_CLIP_URI);
    window.getWordShardAudio = shardMock;
    const kokoroSpeak = vi.fn(async () => 'blob:kokoro-fallback');
    window._kokoroTTS = { ready: true, speak: kokoroSpeak };
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: Buffer.alloc(64).toString('base64'), mimeType: 'audio/L16;rate=24000' } }] }, finishReason: 'STOP' }],
      }),
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const prevCreateObj = URL.createObjectURL;
    URL.createObjectURL = () => 'blob:cloud-wav';

    try {
      const { api } = makeTtsHarness({ _isCanvasEnv: false, apiKey: 'synthetic-key' });

      // af_bella
      await expect(api.callTTS('photosynthesis', 'af_bella', 1, { word: true, language: 'English' })).resolves.toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);

      // browser voice
      await expect(api.callTTS('photosynthesis', 'browser', 1, { word: true, language: 'English' })).rejects.toMatchObject({ code: 'BROWSER_TTS_REQUIRED' });
      expect(shardMock).not.toHaveBeenCalled();

      // force: true
      kokoroSpeak.mockClear();
      await expect(api.callTTS('photosynthesis', 'af_heart', 1, { word: true, force: true, language: 'English' })).resolves.toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);

      // speed: 0.8
      kokoroSpeak.mockClear();
      await expect(api.callTTS('photosynthesis', 'af_heart', 0.8, { word: true, language: 'English' })).resolves.toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);

      // multi-word
      kokoroSpeak.mockClear();
      await expect(api.callTTS('hello world', 'af_heart', 1, { word: true, language: 'English' })).resolves.toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);

      // Spanish
      await expect(api.callTTS('fotosintesis', 'af_heart', 1, { word: true, language: 'Spanish' })).resolves.toBe('blob:cloud-wav');
      expect(shardMock).not.toHaveBeenCalled();

      // en-GB language arg
      kokoroSpeak.mockClear();
      await expect(api.callTTS('photosynthesis', 'af_heart', 1, { word: true, language: 'en-GB' })).resolves.toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);

      // English + { locale: 'en-GB' }
      kokoroSpeak.mockClear();
      await expect(api.callTTS('photosynthesis', 'af_heart', 1, { word: true, language: 'English', locale: 'en-GB' })).resolves.toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);
    } finally {
      URL.createObjectURL = prevCreateObj;
    }
  });

  it('uses getWordShardAudio inside localAfterGemini before waking _kokoroTTS when cloud Gemini is rate-limited', async () => {
    const shardMock = vi.fn(async (token) => (token === 'photosynthesis' ? SHARD_CLIP_URI : null));
    window.getWordShardAudio = shardMock;
    const kokoroSpeak = vi.fn(async () => 'blob:kokoro-fallback');
    window._kokoroTTS = { ready: false, speak: kokoroSpeak };
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    const { api, state } = makeTtsHarness({ _isCanvasEnv: false, apiKey: 'synthetic-key' });
    state.rateLimitedUntil = Date.now() + 60_000;
    const profiles = [];
    const res = await api.callTTS('photosynthesis', 'Kore', 1, {
      word: true,
      language: 'English',
      onResolvedProfile: (p) => profiles.push(p),
    });
    expect(res).toBe(SHARD_CLIP_URI);
    expect(shardMock).toHaveBeenCalledTimes(1);
    expect(kokoroSpeak).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(profiles[0]).toMatchObject({
      engine: 'kokoro-word-shard',
      resolvedVoice: 'af_heart',
      fallbackFrom: 'gemini',
    });
  });

  it('implicitly uses word shards for single English words without { word: true }, respects { word: false }, and skips sentence punctuation', async () => {
    const shardMock = vi.fn(async (token) => (token === 'photosynthesis' || token === "don't" ? SHARD_CLIP_URI : null));
    window.getWordShardAudio = shardMock;
    const kokoroSpeak = vi.fn(async () => 'blob:kokoro-fallback');
    window._kokoroTTS = { ready: false, speak: kokoroSpeak };
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    // Numeric maxRetries (legacy signature) in Desktop / keyless mode
    {
      const { api } = makeTtsHarness({ _isCanvasEnv: false, apiKey: '' });
      expect(await api.callTTS('photosynthesis', 'Kore', 1, 2, 'English')).toBe(SHARD_CLIP_URI);
      expect(shardMock).toHaveBeenCalledWith('photosynthesis', undefined);
      expect(await api.callTTS('don’t', 'Kore', 1, 2, 'English')).toBe(SHARD_CLIP_URI);
      expect(shardMock).toHaveBeenCalledWith("don't", undefined);
    }

    // Student AI off without { word: true }
    {
      shardMock.mockClear();
      window.__alloStudentAiDisabled = true;
      const { api } = makeTtsHarness({ _isCanvasEnv: false });
      expect(await api.callTTS('photosynthesis', 'Kore')).toBe(SHARD_CLIP_URI);
      expect(shardMock).toHaveBeenCalledTimes(1);
      delete window.__alloStudentAiDisabled;
    }

    // { word: false } opts out even for af_heart, and single-word sentences ('Stop.') do not implicitly use shards
    {
      shardMock.mockClear();
      kokoroSpeak.mockClear();
      window._kokoroTTS = { ready: true, speak: kokoroSpeak };
      const { api } = makeTtsHarness({ _isCanvasEnv: false, apiKey: '' });

      expect(await api.callTTS('photosynthesis', 'af_heart', 1, { word: false, language: 'English' })).toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);
      expect(kokoroSpeak.mock.calls[0][3]).not.toHaveProperty('word');

      kokoroSpeak.mockClear();
      expect(await api.callTTS('Stop.', 'af_heart', 1, 2, 'English')).toBe('blob:kokoro-fallback');
      expect(shardMock).not.toHaveBeenCalled();
      expect(kokoroSpeak).toHaveBeenCalledTimes(1);
      expect(kokoroSpeak.mock.calls[0][3]).not.toHaveProperty('word');

      // Non-sharded implicit single word still omits { word: true } recipe flag on live Kokoro
      kokoroSpeak.mockClear();
      await api.callTTS('unlistedword', 'af_heart', 1, 2, 'English');
      expect(shardMock).toHaveBeenCalledWith('unlistedword', undefined);
      expect(kokoroSpeak.mock.calls[0][3]).not.toHaveProperty('word');
    }
  });
});

describe('phase_k_helpers_module direct handleSpeak single-word shard tagging', () => {
  it('passes { word: true } for single English tokens on direct read-aloud and omits it for multi-word strings', async () => {
    const React = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react'));
    global.React = window.React = React;
    window.matchMedia ||= () => ({ matches: false });
    global.requestAnimationFrame ||= () => 0;
    window.speechSynthesis = { cancel: () => {}, speak: () => {}, getVoices: () => [] };
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    global.Audio = window.Audio = function (src) {
      this.src = src; this.volume = 1; this.playbackRate = 1;
      this.play = () => Promise.resolve(); this.pause = () => {};
    };
    loadAlloModule('phase_k_helpers_module.js');
    const PhaseK = window.AlloModules.PhaseKHelpers;

    const ref = (v = null) => ({ current: v });
    const callTTS = vi.fn(async () => 'blob:direct-word');
    const deps = {
      isPlaying: false, isPaused: false, selectedVoice: 'Kore', voiceSpeed: 1, voiceVolume: 1,
      currentUiLanguage: 'English', leveledTextLanguage: 'English', playingContentId: null,
      adventureState: {}, personaState: {}, _ttsState: {}, glossaryAudioCache: ref(new Map()),
      audioRef: ref(), isPlayingRef: ref(false), isSystemAudioActiveRef: ref(false),
      playbackRateRef: ref(1), persistentVoiceMapRef: ref({}), lastReadTurnRef: ref(),
      lastHandleSpeakRef: ref(), playbackTimeoutRef: ref(), recognitionRef: ref(),
      playbackSessionRef: ref(0), alloBotRef: ref(), audioBufferRef: ref({}), activeBlobUrlsRef: ref([]),
      setIsPlaying: vi.fn(), setIsPaused: vi.fn(), setPlayingContentId: vi.fn(),
      setError: vi.fn(), setIsGeneratingAudio: vi.fn(), setPlaybackState: vi.fn(),
      addToast: vi.fn(), t: () => undefined, warnLog() {}, debugLog() {},
      callTTS, stopPlayback: vi.fn(), splitTextToSentences: (s) => [String(s)],
      getSideBySideContent: () => null, playSequence: vi.fn(), addBlobUrl: vi.fn(), releaseBlob: vi.fn(),
      _isCanvasEnv: false, AVAILABLE_VOICES: ['Kore'],
    };

    await PhaseK.handleSpeak('photosynthesis', 'glossary-term', 0, deps, true);
    expect(callTTS).toHaveBeenLastCalledWith('photosynthesis', 'Kore', 1, expect.objectContaining({ word: true, reason: 'direct-read-aloud' }));

    await PhaseK.handleSpeak("don't", 'term-1', 0, deps, true);
    expect(callTTS).toHaveBeenLastCalledWith("don't", 'Kore', 1, expect.objectContaining({ word: true }));

    callTTS.mockClear();
    await PhaseK.handleSpeak('Saved text.', 'term-2', 0, deps, true);
    const phraseOpts = callTTS.mock.calls[0][3];
    expect(phraseOpts.word).toBeUndefined();
  });
});

describe('word_sounds_module /y/ phoneme and shard handleAudio integration', () => {
  const wsSource = readFileSync(path.join(ROOT, 'word_sounds_module.js'), 'utf8').replace(/\r\n/g, '\n');
  const core = new Function(readFileSync(path.join(ROOT, 'word_sounds_core.js'), 'utf8') + '\nreturn createWordSoundsCore;')()();

  function buildHandleAudioHarness({ language = 'en-US', voice = 'af_heart', shardClip = WAV_URI, cachedShards = null } = {}) {
    const start = wsSource.indexOf('      const latestAudioRequestRef = React.useRef(null);');
    const end = wsSource.indexOf('      // Manual isolation playback replaces an old stimulus', start);
    if (start < 0 || end < 0) throw new Error('handleAudio boundary missing');
    const callbackSource = wsSource.slice(start, end);
    const helpersSource = wsSource.slice(wsSource.indexOf('    const syllableCountWordKey ='), wsSource.indexOf('    // SyllableCountingView'));

    const modules = path.resolve(ROOT, 'desktop/web-app/node_modules');
    const React = require(path.resolve(modules, 'react'));
    const played = [];
    class ControlledAudio {
      constructor(src) { this.src = src; this.paused = true; this.ended = false; this.currentTime = 0; }
      play = vi.fn(async () => {
        this.paused = false;
        this.ended = true;
        played.push(this.src);
        Promise.resolve().then(() => this.onended?.());
      });
      pause = vi.fn(() => { this.paused = true; this.onpause?.(); });
    }
    const envWindow = {
      __ALLO_PHONEME_AUDIO_BANK: { y: WAV_URI, ee: WAV_EE_URI },
      _CACHE_WORD_SHARD_CLIPS: cachedShards || Object.create(null),
      getWordShardAudio: vi.fn(async () => shardClip),
    };
    const helpers = new Function('WS_CORE', 'window', `${helpersSource}\nreturn { syllableCountWordKey, syllableCountContextKey, syllableCountDeliveryReady, wsAllowsWordShardAudio };`)(core, envWindow);

    const hooks = [];
    let hookCursor = 0;
    const FakeReact = {
      ...React,
      useCallback: (fn) => fn,
      useRef: (init) => {
        const idx = hookCursor++;
        if (!hooks[idx]) hooks[idx] = { current: init };
        return hooks[idx];
      },
      useEffect: () => {},
    };
    const env = {
      React: FakeReact,
      WS_CORE: core,
      Audio: ControlledAudio,
      window: envWindow,
      _CACHE_WORD_AUDIO_BANK: null,
      wsAllowsWordShardAudio: helpers.wsAllowsWordShardAudio,
      syllableCountWordKey: helpers.syllableCountWordKey,
      syllableCountContextKey: helpers.syllableCountContextKey,
      syllableCountAudioRef: { current: { asset: null, source: null, context: null } },
      syllableCountContextRef: { current: null },
      syllableCountDeliveryRef: { current: null },
      syllableCountAttemptRef: { current: 0 },
      advanceEpochRef: { current: 1 },
      setSyllableCountDelivery: vi.fn(),
      setIsPlayingAudio: vi.fn(),
      setAudioNotice: vi.fn(),
      clearAudioNotice: vi.fn(),
      wordSoundsSyllableEditorPlayback: null,
      cancelMicInput: vi.fn(),
      audioRunIdRef: { current: 1 },
      audioCancelledRef: { current: false },
      isMountedRef: { current: true },
      wordSoundsLanguage: language,
      selectedVoice: voice,
      wordSoundsVoiceRef: { current: voice },
      preloadedWords: [],
      ttsSpeed: 1,
      wordSoundsAudioLibrary: {},
      wordSoundsAudioLibraryRef: { current: {} },
      feedbackPlaybackRef: { current: null },
      currentActiveAudio: { current: null },
      activePlaybackRef: { current: null },
      lastAudioRef: { current: null },
      audioNotice: null,
      audioInstances: { current: new Map() },
      preparedAudioInstances: { current: new Set() },
      audioCache: { current: new Map() },
      ttsInflight: { current: new Map() },
      reportPreparedRuntimePlayback: vi.fn(),
      notifyAudioUnavailable: vi.fn(),
      portableTtsSrcFor: vi.fn(() => null),
      loadAudioFromStorage: vi.fn(() => null),
      saveAudioToStorage: vi.fn(),
      callTTS: vi.fn(async () => 'blob:cloud-fallback'),
      speakWord: vi.fn(),
      wsStudentDeviceVoiceOnly: () => false,
      wsSpeakDeviceVoice: vi.fn(async () => false),
      setWsPreloadedWords: vi.fn(),
      warnLog: vi.fn(),
      debugLog: vi.fn(),
      ts: () => '',
    };
    const runner = new Function(...Object.keys(env), `return function build(props) {
      const { wordSoundsActivity, currentWordSoundsWord, wordSoundsPhonemes } = props;
      ${callbackSource}
      return { handleAudio };
    };`)(...Object.values(env));

    hookCursor = 0;
    const { handleAudio } = runner({ wordSoundsActivity: 'blending', currentWordSoundsWord: 'yes', wordSoundsPhonemes: { word: 'yes' } });
    return { handleAudio, envWindow, env, played };
  }

  it('keeps specialMap literal y: "ee" intact while playing __ALLO_PHONEME_AUDIO_BANK.y for isolated /y/', async () => {
    const mapBlock = sliceBetween(wsSource, '          const specialMap = {', '          };\n          if (specialMap[normalizedKey])');
    expect(mapBlock).toMatch(/\by:\s*["']ee["']/);

    // Check both runtime bankKey precedence in runAudioRequest and direct handleAudio("/y/")
    const bankKeyBlock = sliceBetween(wsSource, '          const bankKey =', '          if (\n            englishPhonemeAudio && typeof window.__ALLO_PHONEME_AUDIO_BANK');
    expect(bankKeyBlock).toContain('isPhoneme && lower.trim() === "y"');
    const resolved = new Function(
      'isPhoneme', 'lower', 'normalizedKey', 'window',
      `${bankKeyBlock}\nreturn bankKey;`
    )(true, 'y', 'ee', { __ALLO_PHONEME_AUDIO_BANK: { y: WAV_URI, ee: WAV_EE_URI } });
    expect(resolved).toBe('y');

    const h = buildHandleAudioHarness();
    const res = await h.handleAudio('/y/');
    expect(res).toMatchObject({ ok: true });
    expect(h.played).toEqual([WAV_URI]);
    expect(h.env.callTTS).not.toHaveBeenCalled();
  });

  it('plays US-English non-phoneme words from shards without callTTS and skips shards for af_bella or Spanish', async () => {
    const h = buildHandleAudioHarness({ shardClip: SHARD_CLIP_URI });
    const req = h.handleAudio('photosynthesis');
    await Promise.resolve();
    const loadedAudio = h.envWindow.getWordShardAudio;
    expect(loadedAudio).toHaveBeenCalledWith('photosynthesis', { retry: false });
    // Flush loadAndPlay's oncanplaythrough / microtasks or await timer
    await req;
    expect(h.played).toContain(SHARD_CLIP_URI);
    expect(h.env.callTTS).not.toHaveBeenCalled();

    const bella = buildHandleAudioHarness({ voice: 'af_bella', cachedShards: { photosynthesis: SHARD_CLIP_URI } });
    await bella.handleAudio('photosynthesis');
    expect(bella.envWindow.getWordShardAudio).not.toHaveBeenCalled();
    expect(bella.env.callTTS).toHaveBeenCalledTimes(1);

    const spanish = buildHandleAudioHarness({ language: 'Spanish', cachedShards: { pan: SHARD_CLIP_URI } });
    await spanish.handleAudio('pan');
    expect(spanish.envWindow.getWordShardAudio).not.toHaveBeenCalled();
    expect(spanish.env.callTTS).toHaveBeenCalledTimes(1);
  }, 15000);
});

describe('AlloFlowANTI handleAudio and warmUpGlossaryAudio shard integration', () => {
  const hostSource = readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8').replace(/\r\n/g, '\n');

  function extractHostHandleAudio({ voice = 'Kore', shardMap = { photosynthesis: SHARD_CLIP_URI, water: WAV_URI } } = {}) {
    const start = hostSource.indexOf('  const handleAudio = useCallback(async (text, language) => {');
    const end = hostSource.indexOf('  const stopAacPlayback =', start);
    if (start < 0 || end < 0) throw new Error('Host handleAudio boundary missing');
    const block = hostSource.slice(start, end);
    const callTTS = vi.fn(async () => 'blob:host-tts');
    const getWordShardAudio = vi.fn(async (w) => {
      const k = String(w || '').trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(shardMap, k) ? shardMap[k] : null;
    });
    const envWindow = { __alloSelectedVoice: voice };
    const handleAudio = new Function(
      'useCallback', 'window', 'callTTS', 'getWordShardAudio', 'warnLog',
      `${block}\nreturn handleAudio;`
    )((fn) => fn, envWindow, callTTS, getWordShardAudio, vi.fn());
    return { handleAudio, callTTS, getWordShardAudio, envWindow };
  }

  function extractWarmUpGlossaryAudio({
    items = [],
    language = 'English',
    selectedVoice = 'Kore',
    activeView = 'glossary',
    cachedShards = {},
    prefetchedShards = { water: WAV_URI, photosynthesis: SHARD_CLIP_URI },
    phonemeBank = { a: WAV_URI },
  } = {}) {
    const fnStart = hostSource.indexOf('        const warmUpGlossaryAudio = async () => {');
    const fnEnd = hostSource.indexOf('        const timeoutId = setTimeout(warmUpGlossaryAudio, 2000);', fnStart);
    if (fnStart < 0 || fnEnd < 0) throw new Error('warmUpGlossaryAudio boundary missing');
    const block = hostSource.slice(fnStart, fnEnd);
    const glossaryAudioCache = { current: new Map() };
    const shardCache = Object.assign({}, cachedShards);
    const prefetchWordShardAudio = vi.fn(async (words) => {
      for (const w of words) {
        if (Object.prototype.hasOwnProperty.call(prefetchedShards, w)) shardCache[w] = prefetchedShards[w];
      }
      return { ok: true, loaded: words.length };
    });
    const getWordShardAudio = vi.fn(async () => null);
    const callTTS = vi.fn(async (term) => `blob:tts-${term}`);
    const run = new Function(
      'filteredGlossaryData', 'activeView', 'isEditingGlossary', 'selectedVoice',
      'generatedContent', 'window', 'getSavedResourceLanguage', 'PHONEME_AUDIO_BANK',
      'glossaryAudioCache', '_CACHE_WORD_SHARD_CLIPS', 'prefetchWordShardAudio',
      'getWordShardAudio', 'callTTS', 'debugLog', 'warnLog',
      `let cancelled = false;\n${block}\nreturn warmUpGlossaryAudio;`
    )(
      items,
      activeView,
      false,
      selectedVoice,
      { type: 'glossary', language, data: items },
      { AlloModules: { TextPipelineHelpers: { getGlossaryBaseLanguage: (_doc, it) => it.language || language, getGlossaryAudioCacheKey: (t, l) => `${l}\u241f${t}` } } },
      () => language,
      phonemeBank,
      glossaryAudioCache,
      shardCache,
      prefetchWordShardAudio,
      getWordShardAudio,
      callTTS,
      vi.fn(),
      vi.fn(),
    );
    return { run, glossaryAudioCache, prefetchWordShardAudio, getWordShardAudio, callTTS };
  }

  it('removes legacy unscoped executeGlossaryWarmup duplicate from AlloFlowANTI.txt', () => {
    expect(hostSource).not.toContain('executeGlossaryWarmup');
  });

  it('routes single US-English words in host handleAudio to getWordShardAudio and passes { word: true } only for single ASCII tokens', async () => {
    const h = extractHostHandleAudio({ voice: 'Kore' });
    expect(await h.handleAudio('photosynthesis')).toBe(SHARD_CLIP_URI);
    expect(h.getWordShardAudio).toHaveBeenCalledWith('photosynthesis');
    expect(h.callTTS).not.toHaveBeenCalled();

    h.envWindow.__alloSelectedVoice = 'af_heart';
    expect(await h.handleAudio('water', 'en-US')).toBe(WAV_URI);
    expect(h.callTTS).not.toHaveBeenCalled();

    // Shard miss falls back to callTTS with { maxRetries: 2, word: true }
    h.envWindow.__alloSelectedVoice = 'Kore';
    expect(await h.handleAudio('unlistedword')).toBe('blob:host-tts');
    expect(h.callTTS).toHaveBeenCalledWith('unlistedword', 'Kore', 1, { maxRetries: 2, word: true });

    // Multi-word AAC utterance preserves legacy options and never touches shards
    h.getWordShardAudio.mockClear();
    h.callTTS.mockClear();
    await h.handleAudio('I need help');
    expect(h.getWordShardAudio).not.toHaveBeenCalled();
    expect(h.callTTS).toHaveBeenCalledWith('I need help', 'Kore', 1, 2);

    await h.handleAudio('I need help', 'Spanish');
    expect(h.getWordShardAudio).not.toHaveBeenCalled();
    expect(h.callTTS).toHaveBeenLastCalledWith('I need help', 'Kore', 1, { maxRetries: 2, language: 'Spanish' });

    // Spanish, en-GB, af_bella, and browser voices must bypass US-English af_heart shards
    for (const [lang, voice] of [['Spanish', 'Kore'], ['en-GB', 'Kore'], ['en-US', 'af_bella'], ['en-US', 'browser']]) {
      h.getWordShardAudio.mockClear();
      h.callTTS.mockClear();
      h.envWindow.__alloSelectedVoice = voice;
      await h.handleAudio('water', lang);
      expect(h.getWordShardAudio, `${lang}/${voice}`).not.toHaveBeenCalled();
      expect(h.callTTS, `${lang}/${voice}`).toHaveBeenCalledWith('water', voice, 1, { maxRetries: 2, language: lang, word: true });
    }
  });

  it('batch-prefetches US-English single-word glossary terms via shards and keeps non-English / en-GB / af_bella isolated', async () => {
    const h = extractWarmUpGlossaryAudio({
      items: [
        { term: 'a' },
        { term: 'water' },
        { term: 'photosynthesis' },
        { term: 'constructor' },
        { term: 'water cycle' },
      ],
    });
    await h.run();

    expect(h.prefetchWordShardAudio).toHaveBeenCalledTimes(1);
    expect(h.prefetchWordShardAudio).toHaveBeenCalledWith(['water', 'photosynthesis', 'constructor']);
    expect(h.glossaryAudioCache.current.get('English\u241fwater')).toBe(WAV_URI);
    expect(h.glossaryAudioCache.current.get('water')).toBe(WAV_URI);
    expect(h.glossaryAudioCache.current.get('English\u241fphotosynthesis')).toBe(SHARD_CLIP_URI);
    // Out-of-shard single word ('constructor' must not collide with Object.prototype.constructor) & phrase fallback
    expect(h.callTTS).toHaveBeenCalledWith('constructor', 'Kore', 1, { language: 'English', word: true });
    expect(h.callTTS).toHaveBeenCalledWith('water cycle', 'Kore', 1, { language: 'English' });
    expect(h.callTTS).not.toHaveBeenCalledWith('water', expect.anything(), expect.anything(), expect.anything());
    expect(h.callTTS).not.toHaveBeenCalledWith('photosynthesis', expect.anything(), expect.anything(), expect.anything());

    for (const [language, voice] of [['Spanish', 'Kore'], ['en-GB', 'af_heart'], ['English', 'af_bella'], ['English', 'browser']]) {
      const guarded = extractWarmUpGlossaryAudio({
        items: [{ term: 'water' }],
        language,
        selectedVoice: voice,
      });
      await guarded.run();
      expect(guarded.prefetchWordShardAudio, `${language}/${voice}`).not.toHaveBeenCalled();
      expect(guarded.getWordShardAudio, `${language}/${voice}`).not.toHaveBeenCalled();
      expect(guarded.callTTS, `${language}/${voice}`).toHaveBeenCalledWith('water', voice, 1, { language, word: true });
    }
  });
});
