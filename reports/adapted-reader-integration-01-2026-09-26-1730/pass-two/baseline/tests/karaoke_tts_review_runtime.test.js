import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let M, AIProvider;
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
beforeAll(() => {
  for (const file of ['tts_module.js', 'read_aloud_audio_service_module.js', 'karaoke_audio_store_module.js', 'ai_backend_module.js']) loadAlloModule(file);
  M = window.AlloModules; AIProvider = window.AIProvider;
});
beforeEach(() => {
  let count = 0;
  vi.stubGlobal('URL', Object.assign(Object.create(URL), {
    createObjectURL: vi.fn(() => 'blob:review-' + ++count), revokeObjectURL: vi.fn(),
  }));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  for (const name of ['_kokoroTTS', '_piperTTS', '__ttsGeminiAuthFailed', '__ttsGeminiQuotaFailed', '__loadKokoroTTS', 'lamejs']) delete window[name];
});
const state = () => ({ queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 });
const audioResponse = () => ({
  ok: true, status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=', mimeType: 'audio/L16;rate=24000' } }] } }] }),
});
function tts(options = {}) {
  return M.createTTS({
    state: state(), apiKey: 'valid-review-cloud-key', GEMINI_MODELS: { tts: 'model-a' },
    AVAILABLE_VOICES: ['Kore'], _isCanvasEnv: false, languageToTTSCode: () => 'en',
    isGlobalMuted: () => false, warnLog: () => {}, debugLog: () => {},
    getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => ({}), getAi: () => null, setShowKokoroOfferModal: () => {}, ...options,
  });
}
function wav({ rate = 22050, channels = 1, extra = true } = {}) {
  const offset = extra ? 58 : 44;
  const bytes = Buffer.alloc(offset + 32);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channels, 22); bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * channels * 2, 28); bytes.writeUInt16LE(channels * 2, 32); bytes.writeUInt16LE(16, 34);
  if (extra) { bytes.write('JUNK', 36); bytes.writeUInt32LE(5, 40); bytes.write('notes', 44); }
  bytes.write('data', offset - 8); bytes.writeUInt32LE(32, offset - 4);
  for (let i = 0; i < 16; i++) bytes.writeInt16LE(i * 50 - 300, offset + i * 2);
  return bytes;
}
function hostHelper(name, next, dependencies) {
  const start = hostSource.indexOf('  const ' + name + ' =');
  const end = hostSource.indexOf('  const ' + next, start);
  if (start < 0 || end < 0) throw Error('Host extraction failed: ' + name);
  return new Function(...Object.keys(dependencies), hostSource.slice(start, end) + '\nreturn ' + name + ';')(...Object.values(dependencies));
}

describe('Gemini model identity and response reliability', () => {
  it.each([false, true])('separates model caches with Canvas=%s', async canvas => {
    const models = { tts: 'model-a' }, shared = state();
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal('fetch', fetchMock);
    const api = tts({ state: shared, GEMINI_MODELS: models, _isCanvasEnv: canvas });
    const first = await api.callTTS('Same sentence.', 'Kore', 1, 0);
    models.tts = 'model-b';
    const second = await api.callTTS('Same sentence.', 'Kore', 1, 0);
    expect(second).not.toBe(first); expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('/model-b:');
    expect(await api.callTTS('Same sentence.', 'Kore', 1, 0)).toBe(second);
  });
  it('snapshots a model before waiting in the cloud queue', async () => {
    let release; const models = { tts: 'model-a' }, shared = state();
    shared.queue = new Promise(resolve => { release = resolve; });
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal('fetch', fetchMock);
    const pending = tts({ state: shared, GEMINI_MODELS: models }).fetchTTSBytes('Queued.', 'Kore');
    models.tts = 'model-b'; release(); await pending;
    expect(fetchMock.mock.calls[0][0]).toContain('/model-a:');
  });
  it('finds audio after a text response part', async () => {
    const response = audioResponse();
    response.json = async () => ({ candidates: [{ content: { parts: [{ text: 'Speech follows.' }, { inlineData: { data: 'AQI=', mimeType: 'audio/L16' } }] } }] });
    vi.stubGlobal('fetch', vi.fn(async () => response));
    expect((await tts().fetchTTSBytes('Hello.', 'Kore')).bytes.length).toBe(2);
  });
  it('rejects incomplete PCM samples before caching a WAV', async () => {
    const response = audioResponse();
    response.json = async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQ==' } }] } }] });
    vi.stubGlobal('fetch', vi.fn(async () => response));
    await expect(tts().fetchTTSBytes('Broken.', 'Kore')).rejects.toThrow('Invalid Gemini PCM');
  });
  it('releases the queue when headers arrive but the response body never settles', async () => {
    vi.useFakeTimers();
    const shared = state(), fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => new Promise(() => {}) })
      .mockResolvedValueOnce(audioResponse());
    vi.stubGlobal('fetch', fetchMock);
    const api = tts({ state: shared });
    const first = api.fetchTTSBytes('Hanging body.', 'Kore');
    const rejected = expect(first).rejects.toThrow(/timeout/i);
    await vi.advanceTimersByTimeAsync(30000); await rejected;
    const next = api.fetchTTSBytes('Next sentence.', 'Kore');
    await vi.advanceTimersByTimeAsync(200);
    expect((await next).bytes.length).toBe(2);
  });
  it('plays an existing cached cloud clip during quota cooldown', async () => {
    const shared = state(), fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal('fetch', fetchMock);
    const api = tts({ state: shared });
    const first = await api.callTTS('Already prepared.', 'Kore', 1, 0);
    shared.rateLimitedUntil = Date.now() + 60000;
    expect(await api.callTTS('Already prepared.', 'Kore', 1, 0)).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])('uses ready Kokoro after cloud failure, including active cooldown=%s', async cooldown => {
    const shared = state(); if (cooldown) shared.rateLimitedUntil = Date.now() + 60000;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429 })));
    const speak = vi.fn(async () => 'blob:local-fallback');
    window._kokoroTTS = { ready: true, speak };
    expect(await tts({ state: shared }).callTTS('Cloud unavailable.', 'Kore', 1, { maxRetries: 0, force: true })).toBe('blob:local-fallback');
    expect(speak.mock.calls[0][3].force).toBe(true);
  });
  it.each([false, true])('forwards explicit local regeneration with Canvas=%s', async canvas => {
    const speak = vi.fn(async () => 'blob:regenerated-local');
    window._kokoroTTS = { ready: true, speak };
    expect(await tts({ _isCanvasEnv: canvas }).callTTS('Fresh local voice.', 'af_heart', 1, { force: true })).toBe('blob:regenerated-local');
    expect(speak.mock.calls[0][3].force).toBe(true);
  });
});

describe('secondary provider routing and timeout isolation', () => {
  it.each(['ollama', 'localai', 'lmstudio', 'alloflow-local', 'openai', 'claude', 'custom'])('respects the configured %s speech route in Auto mode', async backend => {
    const textToSpeech = vi.fn(async () => 'blob:configured-backend');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const api = tts({ getAiUserConfig: () => ({ backend, ttsProvider: 'auto' }), getAi: () => ({ textToSpeech, models: { tts: 'local-model' } }) });
    expect(await api.callTTS('Configured speech.', 'Kore', 1, { force: true })).toBe('blob:configured-backend');
    expect(textToSpeech.mock.calls[0][1].force).toBe(true); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('keeps Piper available during a Gemini quota cooldown for non-English reading', async () => {
    const shared = state(); shared.rateLimitedUntil = Date.now() + 60000;
    window._piperTTS = { supportsLanguage: () => true, speak: vi.fn(async () => 'blob:piper-fr') };
    expect(await tts({state: shared, languageToTTSCode: () => 'fr'}).callTTS('Bonjour.', 'Kore', 1, {language: 'French', maxRetries: 0})).toBe('blob:piper-fr');
  });

  const provider = () => new AIProvider({ backend: 'gemini', apiKey: 'test', models: { tts: 'model-a' }, warnLog: () => {}, debugLog: () => {} });
  it('separates provider, model, and endpoint identities in its audio cache', () => {
    const api = provider();
    const first = api._ttsCacheKey('Hello', 'Kore', 1, 'English', 'gemini');
    expect(api._ttsCacheKey('Hello', 'Kore', 2, 'English', 'gemini')).toBe(first);
    expect(api._ttsCacheKey('Hello', 'Kore', 1, 'English', 'local-endpoints')).not.toBe(first);
    api.models.tts = 'model-b';
    expect(api._ttsCacheKey('Hello', 'Kore', 1, 'English', 'gemini')).not.toBe(first);
    const changed = api._ttsCacheKey('Hello', 'Kore', 1, 'English', 'gemini'); api.baseUrl += '/different';
    expect(api._ttsCacheKey('Hello', 'Kore', 1, 'English', 'gemini')).not.toBe(changed);
  });
  it('sends the content language to the bundled Edge fallback only', async () => {
    const api = provider(), fetchMock = vi.fn().mockRejectedValueOnce(new Error('no Kokoro server')).mockRejectedValueOnce(new Error('no secondary server'))
      .mockResolvedValueOnce({ok: true, blob: async () => new Blob([wav()], {type: 'audio/wav'})});
    vi.stubGlobal('fetch', fetchMock);
    await api._openaiTTS('Bonjour.', 'Kore', 1, api._normalizeTtsSpeechProfile('French', 'fr-CA'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('language');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).language).toBe('fr-CA');
  });
  it('advances to another local server when an adapter ignores abort while reading a body', async () => {
    vi.useFakeTimers();
    const api = provider(), fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, blob: () => new Promise(() => {}) })
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob([wav()], { type: 'audio/wav' }) });
    vi.stubGlobal('fetch', fetchMock);
    const pending = api._openaiTTS('Hello.', 'Kore', 1, api._normalizeTtsSpeechProfile('English'));
    await vi.advanceTimersByTimeAsync(5100);
    expect(await pending).toMatch(/^blob:/); expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
});

describe('portable audio encoding and requested model provenance', () => {
  it('reads the actual WAV rate and samples after padded metadata chunks', () => {
    const bytes = wav(), result = M.inspectReadAloudAudioBytes(bytes);
    expect(result.mime).toBe('audio/wav'); expect(result.sampleRate).toBe(22050);
    expect([...result.pcm]).toEqual([...bytes.subarray(58)]);
    const padded = Buffer.concat([Buffer.alloc(7), bytes]);
    expect([...M.inspectReadAloudAudioBytes(padded.subarray(7)).pcm]).toEqual([...result.pcm]);
  });
  it('keeps stereo and truncated WAV out of the mono PCM fast path', () => {
    expect(M.inspectReadAloudAudioBytes(wav({ channels: 2 })).pcm).toBeNull();
    expect(M.inspectReadAloudAudioBytes(wav().subarray(0, 65)).pcm).toBeNull();
  });
  it.each([['OggS', 'audio/ogg'], ['fLaC', 'audio/flac'], ['ID3', 'audio/mpeg']])('preserves the %s container MIME', (signature, mime) => {
    expect(M.inspectReadAloudAudioBytes(Buffer.from(signature + 'payload')).mime).toBe(mime);
  });
  it('encodes played Piper-rate WAV with the correct rate and data, using the real host helper', async () => {
    window.lamejs = {}; M.AudioHelpers = { pcmToMp3Async: () => {} };
    const bytes = wav(), encodeMp3 = vi.fn(async () => new Blob(['mp3']));
    const encode = hostHelper('_encodeReadAloudBridgeAudio', '_getReadAloudBridge', {
      _fetchKaraokeCaptureBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      _encodeKaraokeMp3: encodeMp3, _blobToBase64: async () => 'encoded', _normalizeRecordedAudioForStore: vi.fn(),
    });
    expect(await encode('blob:piper')).toEqual({ b64: 'encoded', mime: 'audio/mpeg' });
    expect(encodeMp3.mock.calls[0][1]).toBe(22050);
    expect([...encodeMp3.mock.calls[0][0]]).toEqual([...bytes.subarray(58)]);
  });
  it('passes regeneration and actual provider provenance through the real host save helper', async () => {
    const resolved = { provider: 'local', engine: 'kokoro-browser', model: 'kokoro-model' };
    const callTTS = vi.fn(async (_text, _voice, _speed, options) => { options.onResolvedProfile(resolved); return 'blob:fresh'; });
    const synthesize = hostHelper('_synthSentenceForStore', '_persistKaraokeAudioField', {
      _aiConfig: { ttsProvider: 'local' }, selectedVoice: 'af_heart', leveledTextLanguage: 'English', currentUiLanguage: 'English', voiceSpeed: 1,
      callTTS, _encodeReadAloudBridgeAudio: async () => ({ b64: 'encoded', mime: 'audio/mpeg' }), warnLog: () => {},
    });
    const result = await synthesize('Generate again.', { operation: 'regenerate' });
    expect(callTTS.mock.calls[0][3].force).toBe(true); expect(result.provenance).toEqual(resolved);
  });
  it('preserves older offline clips while rejecting a known legacy Gemini model mismatch', () => {
    const store = M.KaraokeAudioStore.createStore();
    const metadata = {voice: 'Kore', speed: 1, language: 'English', voiceResolverVersion: 2};
    store.put('Legacy clip.', wav().toString('base64'), 'audio/wav', 'ai-played', metadata);
    const requested = {...metadata, requestedProvider: 'auto:gemini', requestedModel: 'model-a'};
    expect(store.getCompatible('Legacy clip.', requested)).toBeTruthy();
    expect(store.getCompatible('Legacy clip.', {...requested, requestedProvider: 'off'})).toBeNull();
    store.put('Known model.', wav().toString('base64'), 'audio/wav', 'ai-played', {...metadata, provider: 'gemini', model: 'model-a'});
    expect(store.getCompatible('Known model.', requested)).toBeTruthy();
    expect(store.getCompatible('Known model.', {...requested, requestedModel: 'model-b'})).toBeNull();
  });
  it('round-trips a fallback clip, forces regeneration, and marks it stale when the requested model changes', async () => {
    let profile = { voice: 'Kore', language: 'English', synthesisRate: 1, voiceResolverVersion: 2, requestedProvider: 'gemini', requestedModel: 'model-a' };
    const resource = { id: 'review-resource', parts: [{ id: 'one', text: 'Read this.' }] };
    const storeModule = { createStore: M.KaraokeAudioStore.createStore, current: M.KaraokeAudioStore.createStore() };
    const synthesize = vi.fn(async () => ({ b64: wav().toString('base64'), mime: 'audio/wav', provenance: { provider: 'local', engine: 'kokoro-browser' } }));
    const service = M.createReadAloudAudioService({ getStoreModule: () => storeModule, getResource: () => resource, getSynthesisProfile: () => profile, synthesize });
    const bound = service.forResource({ resourceId: resource.id, resourceType: 'review', adapter: {
      enumerate: r => r.parts, spokenText: part => part.text, fields: part => ({ segmentId: part.id, storageKey: part.text }),
    }, lane: 'current' });
    await bound.regenerate(resource.parts[0]);
    expect(synthesize.mock.calls[0][0].force).toBe(true);
    expect(bound.inspect(resource.parts[0]).status).toBe('ready');
    const serialized = JSON.parse(JSON.stringify(storeModule.current.serialize()));
    const restored = M.KaraokeAudioStore.createStore(); restored.hydrate(serialized); storeModule.current = restored;
    expect(bound.inspect(resource.parts[0]).status).toBe('ready');
    profile = { ...profile, requestedModel: 'model-b' };
    expect(bound.inspect(resource.parts[0]).status).toBe('stale');
  });
});

