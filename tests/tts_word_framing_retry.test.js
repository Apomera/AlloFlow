// Gemini TTS sometimes reads the short-word framing aloud ("please say the word theme"). A 3-5 letter word
// whose clip runs past 1.45 s is asked for again as the bare word, and that clip is used (2026-11-08).
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let M;
beforeAll(() => { loadAlloModule('tts_module.js'); M = window.AlloModules; });
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
// seconds of 16-bit mono PCM at 24 kHz, as base64
const pcm = (seconds) => Buffer.alloc(Math.round(seconds * 24000) * 2, 1).toString('base64');
const reply = (seconds) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: pcm(seconds), mimeType: 'audio/L16;rate=24000' } }] } }] }) });
const tts = () => M.createTTS({
  state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 },
  apiKey: 'valid-cloud-key', GEMINI_MODELS: { tts: 'model-a' }, AVAILABLE_VOICES: ['Kore'], _isCanvasEnv: false,
  languageToTTSCode: () => 'en', isGlobalMuted: () => false, warnLog: () => {}, debugLog: () => {},
  getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English', getAiUserConfig: () => ({}), getAi: () => null, setShowKokoroOfferModal: () => {},
});
const promptOf = (call) => JSON.parse(call[1].body).contents[0].parts[0].text;

describe('short words', () => {
  it('asks again with the bare word when the framing was read aloud', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply(2.1)).mockResolvedValueOnce(reply(0.7));
    vi.stubGlobal('fetch', fetchMock);
    const result = await tts().fetchTTSBytes('theme', 'Kore');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(promptOf(fetchMock.mock.calls[0])).toBe('Please say the word: theme');
    expect(promptOf(fetchMock.mock.calls[1])).toBe('theme');
    expect(result.bytes.length).toBe(Math.round(0.7 * 24000) * 2);
  });
  it('keeps a normal short-word clip without asking again', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(0.8));
    vi.stubGlobal('fetch', fetchMock);
    await tts().fetchTTSBytes('theme', 'Kore');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('never second-guesses longer text or single sounds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(2.5));
    vi.stubGlobal('fetch', fetchMock);
    await tts().fetchTTSBytes('butterfly', 'Kore');
    await tts().fetchTTSBytes('sh', 'Kore');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
