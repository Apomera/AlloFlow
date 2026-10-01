import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let createTTS;
beforeAll(() => {
  new Function(readFileSync(resolve('tts_source.jsx'), 'utf8'))();
  createTTS = window.AlloModules.createTTS;
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of ['_kokoroTTS', '_piperTTS', '__ttsGeminiAuthFailed', '__ttsGeminiQuotaFailed',
    '__loadKokoroTTS', '_isDesktopBundledApp', '__kokoroTTSDownloading']) delete window[key];
  delete window.AlloModules.AlloCommands;
});
function makeTTS(extra = {}) {
  return createTTS({
    state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 },
    apiKey: 'mock-test-credential', GEMINI_MODELS: { tts: 'test-tts-model' },
    AVAILABLE_VOICES: ['Kore', 'Puck'], _isCanvasEnv: true,
    languageToTTSCode: language => language === 'Spanish' ? 'es' : 'en',
    isGlobalMuted: () => false, warnLog: () => {}, debugLog: () => {},
    getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => ({}), getAi: () => null, getSelectedVoice: () => 'af_heart',
    setShowKokoroOfferModal: () => {}, ...extra,
  });
}
const audioResponse = () => ({ ok: true, status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=', mimeType: 'audio/pcm' } }] } }] }),
});
function stubUrls() {
  vi.stubGlobal('URL', class MockUrl extends URL {
    static createObjectURL() { return 'blob:cloud-audio'; }
    static revokeObjectURL() {}
  });
}

describe('selected TTS engine and voice parity', () => {
  it('uses selected Kokoro in both ordinary and direct Canvas speech without a cloud attempt', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    window._kokoroTTS = { ready: true, resolveVoice: voice => voice,
      speak: vi.fn(async () => 'blob:whole-kokoro'), speakStreaming: vi.fn(async () => 'blob:stream-kokoro') };
    const tts = makeTTS();
    expect(await tts.callTTS('The selected voice.', 'af_heart', 1, { maxRetries: 0 })).toBe('blob:whole-kokoro');
    expect(await tts.callTTSDirect('The selected voice.', 'af_heart', 1, { maxRetries: 0 })).toBe('blob:stream-kokoro');
    expect(window._kokoroTTS.speak.mock.calls[0][1]).toBe('af_heart');
    expect(window._kokoroTTS.speakStreaming.mock.calls[0][1]).toBe('af_heart');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('wakes an already downloaded device engine for direct speech without cloud substitution', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    window.AlloModules.AlloCommands = { modelCache: { hasKokoro: vi.fn(async () => true) } };
    const speakStreaming = vi.fn(async () => 'blob:woken-kokoro');
    window.__loadKokoroTTS = vi.fn(async () => { window._kokoroTTS = { ready: true, speakStreaming }; });
    const tts = makeTTS({ _isCanvasEnv: false });
    expect(await tts.callTTSDirect('A cached local voice.', 'af_heart', 1, { maxRetries: 0 })).toBe('blob:woken-kokoro');
    expect(window.__loadKokoroTTS).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('preserves the multilingual cloud fallback for a non-English Kokoro request', async () => {
    stubUrls(); const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal('fetch', fetchMock);
    window._kokoroTTS = { ready: true, speakStreaming: vi.fn() };
    expect(await makeTTS().callTTSDirect('Hola, estudiante.', 'af_heart', 1, { language: 'Spanish', maxRetries: 0 })).toBe('blob:cloud-audio');
    expect(window._kokoroTTS.speakStreaming).not.toHaveBeenCalled();
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Kore');
  });
  it.each(['ordinary', 'direct'])('cancels %s cold-model waiting without starting stale speech after the model becomes ready', async mode => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    window.AlloModules.AlloCommands = { modelCache: { hasKokoro: vi.fn(async () => true) } };
    const speak = vi.fn(async () => 'blob:too-late');
    let finishLoading;
    window.__loadKokoroTTS = vi.fn(() => new Promise(resolveLoad => { finishLoading = resolveLoad; }));
    const controller = new AbortController();
    const tts = makeTTS();
    const pending = mode === 'ordinary'
      ? tts.callTTS('Cancelled during model wake.', 'af_heart', 1, { signal: controller.signal, maxRetries: 0 })
      : tts.callTTSDirect('Cancelled during model wake.', 'af_heart', 1, { signal: controller.signal, maxRetries: 0 });
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(window.__loadKokoroTTS).toHaveBeenCalledTimes(1));
    controller.abort(); await rejection;
    window._kokoroTTS = { ready: true, speak, speakStreaming: speak };
    finishLoading(true);
    await Promise.resolve(); await Promise.resolve();
    expect(speak).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not map a selected device/browser voice to a cloud voice', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await makeTTS().callTTSDirect('A device voice.', 'browser', 1, { maxRetries: 0 })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('honors pre-cancellation and propagates local cancellation without falling through to cloud', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const stopped = new AbortController(); stopped.abort();
    await expect(makeTTS().callTTSDirect('Cancelled before start.', 'af_heart', 1, { signal: stopped.signal })).rejects.toMatchObject({ name: 'AbortError' });
    window._kokoroTTS = { ready: true, speakStreaming: vi.fn(async () => { throw Object.assign(new Error('Stopped locally.'), { name: 'AbortError' }); }) };
    await expect(makeTTS({ _isCanvasEnv: false }).callTTSDirect('Stopped during synthesis.', 'af_heart', 1, { maxRetries: 0 })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('skips a latched auth failure during its cooldown while local speech remains available', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    window.__ttsGeminiAuthFailed = true;
    window._kokoroTTS = { ready: true, speakStreaming: vi.fn(async () => 'blob:local-fallback') };
    const tts = makeTTS({ state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0, authRetryAt: Date.now() + 300000 } });
    expect(await tts.callTTSDirect('A recovered local response.', 'Kore', 1, { maxRetries: 0 })).toBe('blob:local-fallback');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('TTS credential transport', () => {
  it.each(['bytes', 'direct'])('keeps the API key out of the %s URL and sends the supported header', async mode => {
    stubUrls(); const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal('fetch', fetchMock);
    const tts = makeTTS({ _isCanvasEnv: false, getSelectedVoice: () => 'Kore' });
    if (mode === 'bytes') await tts.fetchTTSBytes('Read this text.', 'Kore', 1, 'English');
    else await tts.callTTSDirect('Read this text.', 'Kore', 1, { maxRetries: 0 });
    const [url, request] = fetchMock.mock.calls[0];
    expect(new URL(url).search).toBe('');
    expect(url).not.toContain('mock-test-credential');
    expect(request.headers['x-goog-api-key']).toBe('mock-test-credential');
    expect(request.headers['Content-Type']).toBe('application/json');
  });
});
