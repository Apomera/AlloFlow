// One voice per passage (2026-10-29).
//
// Read-aloud asks callTTS for one sentence at a time. When Kokoro was not ready
// for the first sentence, that sentence used a cloud voice, the engine finished
// loading in the background, and a later sentence switched to Kokoro: one
// passage read in two voices. In Word Sounds a child compares sounds, so the
// voice must not change under them. playSequence now passes one kokoroLock per
// playback session, and callTTS keeps whichever engine the passage started on.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let createTTS;
beforeAll(() => {
  new Function(readFileSync(resolve('tts_module.js'), 'utf8'))();
  createTTS = window.AlloModules.createTTS;
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of ['_kokoroTTS', '__loadKokoroTTS', '_isDesktopBundledApp', '__kokoroTTSDownloading']) delete window[key];
  delete window.AlloModules.AlloCommands;
});
function makeTTS(canvas) {
  return createTTS({
    state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 },
    apiKey: 'mock-test-credential', GEMINI_MODELS: { tts: 'test-tts-model' },
    AVAILABLE_VOICES: ['Kore', 'Puck'], _isCanvasEnv: canvas,
    languageToTTSCode: () => 'en', isGlobalMuted: () => false, warnLog: () => {}, debugLog: () => {},
    getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => ({}), getAi: () => null, getSelectedVoice: () => 'af_heart',
    setShowKokoroOfferModal: () => {},
  });
}
function cloudVoice() {
  vi.stubGlobal('URL', class MockUrl extends URL { static createObjectURL() { return 'blob:cloud-audio'; } static revokeObjectURL() {} });
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=', mimeType: 'audio/pcm' } }] } }] }) }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const kokoroBecomesReady = () => { const speak = vi.fn(async () => 'blob:kokoro'); window._kokoroTTS = { ready: true, resolveVoice: v => v, speak }; return speak; };

// Canvas: a Kokoro voice skips Gemini, so the fallback is the device voice (callTTS
// returns null and the reader speaks it). Elsewhere the fallback is a cloud voice.
describe.each([
  ['Canvas', true, null],
  ['hosted', false, 'blob:cloud-audio'],
])('one engine per passage (%s)', (_label, canvas, fallbackAudio) => {
  it('a passage that began on the fallback voice keeps it after Kokoro finishes loading', async () => {
    cloudVoice();
    window.AlloModules.AlloCommands = { modelCache: { hasKokoro: vi.fn(async () => false) } };
    const tts = makeTTS(canvas);
    const kokoroLock = { sessionId: 1, engine: null };
    expect(await tts.callTTS('The first sentence.', 'af_heart', 1, { maxRetries: 0, kokoroLock })).toBe(fallbackAudio);
    expect(kokoroLock.engine).toBe('fallback');
    const speak = kokoroBecomesReady();
    expect(await tts.callTTS('The second sentence.', 'af_heart', 1, { maxRetries: 0, kokoroLock })).toBe(fallbackAudio);
    expect(speak, 'no mid-passage switch to Kokoro').not.toHaveBeenCalled();
    expect(await tts.callTTS('A new passage starts here.', 'af_heart', 1, { maxRetries: 0, kokoroLock: { sessionId: 2, engine: null } })).toBe('blob:kokoro');
    expect(speak, 'the next passage uses the now-ready engine').toHaveBeenCalledTimes(1);
  });
  it('a passage that began on Kokoro records it, and calls without a lock route as before', async () => {
    const fetchMock = cloudVoice();
    const speak = kokoroBecomesReady();
    const tts = makeTTS(canvas);
    const kokoroLock = { sessionId: 3, engine: null };
    expect(await tts.callTTS('The first sentence.', 'af_heart', 1, { maxRetries: 0, kokoroLock })).toBe('blob:kokoro');
    expect(kokoroLock.engine).toBe('kokoro');
    expect(await tts.callTTS('No passage at all.', 'af_heart', 1, { maxRetries: 0 })).toBe('blob:kokoro');
    expect(speak).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('a non-English sentence neither uses Kokoro nor locks the passage', async () => {
    cloudVoice();
    const speak = kokoroBecomesReady();
    const kokoroLock = { sessionId: 4, engine: null };
    expect(await makeTTS(canvas).callTTS('Hola, estudiante.', 'af_heart', 1, { maxRetries: 0, language: 'Spanish', kokoroLock })).toBe('blob:cloud-audio');
    expect(speak).not.toHaveBeenCalled();
    expect(kokoroLock.engine).toBe(null);
  });
});

describe('playSequence passes the lock', () => {
  it('the active sentence and the look-ahead share one lock per playback session', () => {
    const src = readFileSync(resolve('phase_k_helpers_module.js'), 'utf8');
    expect(src.includes('playbackRuntime.kokoroLock = { sessionId, engine: null }'), 'one lock per session').toBe(true);
    expect((src.match(/\bkokoroLock\n/g) || []).length, 'requestOptions and preloadOptions both carry it').toBe(2);
  });
});
