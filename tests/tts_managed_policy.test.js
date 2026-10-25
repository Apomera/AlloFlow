import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let createTTS;
beforeAll(() => { loadAlloModule('tts_module.js'); createTTS = window.AlloModules.createTTS; });
afterEach(() => {
  vi.unstubAllGlobals(); vi.restoreAllMocks();
  for (const name of ['ALLOFLOW_MANAGED_AI_POLICY', '_kokoroTTS', '_piperTTS', '__ttsGeminiAuthFailed', '__ttsGeminiQuotaFailed', '__loadKokoroTTS', '__loadPiperTTS']) delete window[name];
});
function managed(policy = { version: 1, connections: [], allowExternalSearch: false }) { window.ALLOFLOW_MANAGED_AI_POLICY = policy; }
function harness(extra = {}) {
  const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
  const config = extra.config || {};
  const api = createTTS({ state, apiKey: 'synthetic-canvas-key', GEMINI_MODELS: { tts: 'synthetic-model' },
    AVAILABLE_VOICES: ['Kore'], _isCanvasEnv: true, languageToTTSCode: () => 'en', isGlobalMuted: () => false,
    warnLog: vi.fn(), debugLog: vi.fn(), getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => config, getAi: () => extra.ai || null, setShowKokoroOfferModal: vi.fn(), ...extra, state });
  return { api, state };
}
function fakeNetwork() {
  const fetch = vi.fn(async () => { throw Object.assign(new Error('Synthetic network stop'), { name: 'AbortError' }); });
  vi.stubGlobal('fetch', fetch); return fetch;
}
const invoke = fn => Promise.resolve().then(fn);
function gate() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }

describe('managed policy at legacy TTS transport boundaries', () => {
  it('blocks the public byte-fetch API before enqueuing or transmitting text', async () => {
    managed(); const fetch = fakeNetwork(); const { api, state } = harness(); const original = state.queue;
    await expect(invoke(() => api.fetchTTSBytes('Synthetic private reader text', 'Kore'))).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetch).not.toHaveBeenCalled(); expect(state.queue).toBe(original);
  });
  it.each(['callTTS', 'callTTSDirect'])('blocks %s Canvas automatic cloud speech', async method => {
    managed(); const fetch = fakeNetwork(); const { api } = harness();
    await expect(api[method]('Synthetic private speech text', 'Kore', 1, 0)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['callTTS', 'callTTSDirect'])('does not downgrade a managed provider denial in %s', async method => {
    managed(); const fetch = fakeNetwork(); const denial = Object.assign(new Error('Managed operation denied'), { code: 'managed-ai-blocked' });
    const ai = { textToSpeech: vi.fn(async () => { throw denial; }) };
    const { api } = harness({ config: { ttsProvider: 'local' }, ai, _isCanvasEnv: false });
    await expect(api[method]('Synthetic private speech text', 'Kore', 1, 0)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(ai.textToSpeech).toHaveBeenCalledOnce(); expect(fetch).not.toHaveBeenCalled();
  });
  it('rechecks reader policy when a previously unblocked request leaves its queue', async () => {
    const fetch = fakeNetwork(); const { api, state } = harness(); const barrier = gate(); state.queue = barrier.promise;
    const pending = api.fetchTTSBytes('Synthetic queued private text', 'Kore');
    expect(state.queue).not.toBe(barrier.promise);
    managed(); barrier.release();
    await expect(pending).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('rechecks direct speech policy when a previously unblocked request leaves its queue', async () => {
    const fetch = fakeNetwork(); const { api, state } = harness({ _isCanvasEnv: false }); const barrier = gate(); state.botQueue = barrier.promise;
    const pending = api.callTTSDirect('Synthetic queued persona text', 'Kore', 1, 0);
    await vi.waitFor(() => expect(state.botQueue).not.toBe(barrier.promise)); managed(); barrier.release();
    await expect(pending).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{ version: 99 }, {}, 'invalid'])('does not send cloud speech under malformed policy %j', async policy => {
    managed(policy); const fetch = fakeNetwork(); const { api } = harness();
    await expect(invoke(() => api.fetchTTSBytes('Synthetic private text', 'Kore'))).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves unmanaged network routing and keeps the credential in its header', async () => {
    const fetch = fakeNetwork(); const { api } = harness();
    await expect(invoke(() => api.fetchTTSBytes('Synthetic public text', 'Kore'))).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).toHaveBeenCalledOnce(); const [url, options] = fetch.mock.calls[0];
    expect(url).not.toContain('synthetic-canvas-key'); expect(options.headers['x-goog-api-key']).toBe('synthetic-canvas-key');
  });
  it('keeps an already available local Kokoro voice working under managed policy', async () => {
    managed(); const fetch = fakeNetwork(); const speak = vi.fn(async () => 'blob:synthetic-local-speech');
    window._kokoroTTS = { ready: true, speak };
    const { api } = harness();
    await expect(api.callTTS('Synthetic local text', 'af_heart', 1, 0)).resolves.toBe('blob:synthetic-local-speech');
    expect(speak).toHaveBeenCalledOnce(); expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps browser speech routing available without a cloud downgrade', async () => {
    managed(); const fetch = fakeNetwork();
    const ai = { textToSpeech: vi.fn(async () => { throw { useBrowserTts: true }; }) };
    const { api } = harness({ config: { ttsProvider: 'browser' }, ai });
    await expect(api.callTTS('Synthetic browser speech', 'Kore', 1, 0)).resolves.toBeNull(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['fetchTTSBytes', 'callTTS', 'callTTSDirect'])('does not log the spoken canary when %s is blocked', async method => {
    managed(); const fetch = fakeNetwork(); const canary = 'PRIVATE_SPEECH_CANARY_20261024';
    const logs = ['log', 'warn', 'error'].map(name => vi.spyOn(console, name).mockImplementation(() => {}));
    const debugLog = vi.fn(), warnLog = vi.fn(); const { api } = harness({ debugLog, warnLog });
    await expect(invoke(() => api[method](canary, 'Kore', 1, 0))).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(JSON.stringify([...logs.map(log => log.mock.calls), debugLog.mock.calls, warnLog.mock.calls])).not.toContain(canary);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['fetchTTSBytes', 'callTTSDirect'])('keeps a rejected provider body and status text out of %s diagnostics', async method => {
    const canary = 'PRIVATE_PROVIDER_BODY_CANARY';
    const logs = ['log', 'warn', 'error'].map(name => vi.spyOn(console, name).mockImplementation(() => {}));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, statusText: canary, text: async () => canary })));
    const debugLog = vi.fn(), warnLog = vi.fn(); const { api } = harness({ debugLog, warnLog, _isCanvasEnv: false });
    await expect(invoke(() => api[method]('Synthetic public text', 'Kore', 1, 0))).rejects.toMatchObject({ code: 'tts-http-error' });
    expect(JSON.stringify([...logs.map(log => log.mock.calls), debugLog.mock.calls, warnLog.mock.calls, window.__alloTtsTrace])).not.toContain(canary);
  });
  it.each(['callTTS', 'callTTSDirect'])('normalizes a rejected AIProvider error before %s diagnostics', async method => {
    const canary = 'PRIVATE_AIPROVIDER_ERROR_CANARY';
    const logs = ['log', 'warn', 'error'].map(name => vi.spyOn(console, name).mockImplementation(() => {}));
    const debugLog = vi.fn(), warnLog = vi.fn();
    const ai = { textToSpeech: vi.fn(async () => { throw new Error(canary); }) };
    const { api } = harness({ debugLog, warnLog, config: { ttsProvider: 'local' }, ai, _isCanvasEnv: false });
    await expect(api[method]('Synthetic local speech', 'Kore', 1, 0)).resolves.toBeNull();
    expect(ai.textToSpeech).toHaveBeenCalledOnce();
    expect(JSON.stringify([...logs.map(log => log.mock.calls), debugLog.mock.calls, warnLog.mock.calls, window.__alloTtsTrace])).not.toContain(canary);
  });
  it('normalizes a cloud failure in the final Canvas fallback trace', async () => {
    const canary = 'PRIVATE_CANVAS_ERROR_CANARY';
    const logs = ['log', 'warn', 'error'].map(name => vi.spyOn(console, name).mockImplementation(() => {}));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error(canary); }));
    window._kokoroTTS = { ready: true, speak: vi.fn(async () => null) };
    window._piperTTS = { ready: true, supportsLanguage: () => true, speak: vi.fn(async () => null) };
    const debugLog = vi.fn(), warnLog = vi.fn(); const { api } = harness({ debugLog, warnLog });
    await expect(api.callTTS('Synthetic public speech', 'Kore', 1, 0)).resolves.toBeNull();
    expect(JSON.stringify([...logs.map(log => log.mock.calls), debugLog.mock.calls, warnLog.mock.calls, window.__alloTtsTrace])).not.toContain(canary);
  });
  it('does not trust an arbitrary error code in exhausted desktop-reader diagnostics', async () => {
    const canary = 'PRIVATE_ERROR_CODE_CANARY';
    const logs = ['log', 'warn', 'error'].map(name => vi.spyOn(console, name).mockImplementation(() => {}));
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('Synthetic request failed'), { code: canary }); }));
    window._kokoroTTS = { ready: true, speak: vi.fn(async () => null) };
    const debugLog = vi.fn(), warnLog = vi.fn(); const { api } = harness({ debugLog, warnLog, _isCanvasEnv: false });
    await expect(api.callTTS('Synthetic public speech', 'Kore', 1, 0)).rejects.toMatchObject({ code: canary });
    expect(JSON.stringify([...logs.map(log => log.mock.calls), debugLog.mock.calls, warnLog.mock.calls, window.__alloTtsTrace])).not.toContain(canary);
  });
  it('ships the source-generated public transport mirror byte for byte', () => {
    expect(readFileSync('desktop/web-app/public/tts_module.js', 'utf8')).toBe(readFileSync('tts_module.js', 'utf8'));
  });
});
