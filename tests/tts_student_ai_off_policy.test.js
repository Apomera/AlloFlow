import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Owner decision 2026-11-04: when student AI is off (window.__alloStudentAiDisabled),
// learners get no cloud voice (Gemini TTS, AIProvider/Edge/OpenAI speech, Google
// Cloud TTS). Prepared clips play first; otherwise the device voice reads aloud.
// Teachers keep cloud voices. Word Sounds never synthesizes isolated phonemes.

let createTTS;
beforeAll(() => { loadAlloModule('tts_module.js'); createTTS = window.AlloModules.createTTS; });
afterEach(() => {
  vi.unstubAllGlobals(); vi.restoreAllMocks();
  for (const name of ['__alloStudentAiDisabled', '_kokoroTTS', '_piperTTS', '__ttsGeminiAuthFailed', '__ttsGeminiQuotaFailed', '__ttsLastRoute']) delete window[name];
});
function harness(extra = {}) {
  const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
  const config = extra.config || {};
  const api = createTTS({ state, apiKey: 'synthetic-key', GEMINI_MODELS: { tts: 'synthetic-tts-model' },
    AVAILABLE_VOICES: ['Kore'], _isCanvasEnv: true, languageToTTSCode: () => 'en', isGlobalMuted: () => false,
    warnLog: vi.fn(), debugLog: vi.fn(), getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => config, getAi: () => extra.ai || null, setShowKokoroOfferModal: vi.fn(), ...extra, state });
  return { api, state };
}
function pcmResponse() {
  const data = Buffer.from(new Uint8Array(64)).toString('base64');
  return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data, mimeType: 'audio/L16;rate=24000' } }] }, finishReason: 'STOP' }] }) };
}
function network() { const fetch = vi.fn(async () => pcmResponse()); vi.stubGlobal('fetch', fetch); return fetch; }
const studentOff = () => { window.__alloStudentAiDisabled = true; };
const ttsUrls = fetch => fetch.mock.calls.map(c => String(c[0])).filter(u => /generativelanguage|texttospeech/i.test(u));

describe('student AI off: no cloud TTS at the tts module choke points', () => {
  it.each([true, false])('callTTS returns no URL and sends nothing (Canvas=%s)', async canvas => {
    studentOff(); const fetch = network();
    const speak = vi.fn(async () => 'blob:local'); window._kokoroTTS = { ready: true, speak };
    const ai = { textToSpeech: vi.fn(async () => 'blob:provider') };
    const { api } = harness({ _isCanvasEnv: canvas, ai });
    await expect(api.callTTS('The cat sat.', 'Kore', 1, { language: 'English' })).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled(); expect(speak).not.toHaveBeenCalled(); expect(ai.textToSpeech).not.toHaveBeenCalled();
    expect(window.__ttsLastRoute).toMatchObject({ route: 'student-device-voice' });
  });
  it('callTTS skips a configured cloud provider and a Kokoro-only prepared request', async () => {
    studentOff(); const fetch = network();
    const ai = { textToSpeech: vi.fn(async () => 'blob:provider') };
    const { api } = harness({ _isCanvasEnv: false, ai, config: { ttsProvider: 'local', backend: 'openai' } });
    await expect(api.callTTS('Hello', 'Kore', 1, 0)).resolves.toBeNull();
    await expect(api.callTTS('cat', 'af_heart', 1, { allowProviderFallback: false })).resolves.toBeNull();
    expect(ai.textToSpeech).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([true, false])('callTTSDirect returns no URL and sends nothing (Canvas=%s)', async canvas => {
    studentOff(); const fetch = network();
    const { api } = harness({ _isCanvasEnv: canvas });
    await expect(api.callTTSDirect('Hi there', 'Kore', 1, 0)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('fetchTTSBytes refuses with the device-voice contract before any request', async () => {
    studentOff(); const fetch = network(); const { api, state } = harness(); const queue = state.queue;
    await expect(Promise.resolve().then(() => api.fetchTTSBytes('Private text', 'Kore')))
      .rejects.toMatchObject({ code: 'BROWSER_TTS_REQUIRED', useBrowserTts: true, studentAiOff: true });
    expect(fetch).not.toHaveBeenCalled(); expect(state.queue).toBe(queue);
  });
  it('rechecks the student flag when a queued cloud request leaves its queue', async () => {
    const fetch = network(); const { api, state } = harness();
    let release; state.queue = new Promise(r => { release = r; });
    const pending = api.fetchTTSBytes('Queued text', 'Kore');
    studentOff(); release();
    await expect(pending).rejects.toMatchObject({ code: 'BROWSER_TTS_REQUIRED' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('teachers (flag unset) still reach the cloud voice', async () => {
    const fetch = network(); const previous = URL.createObjectURL; URL.createObjectURL = () => 'blob:cloud';
    try {
      const { api } = harness();
      const url = await api.callTTS('Teacher text', 'Kore', 1, 0);
      expect(ttsUrls(fetch).length).toBeGreaterThan(0);
      expect(url).toBe('blob:cloud');
    } finally { URL.createObjectURL = previous; }
  });
  it('ships the rebuilt module to the public mirror byte for byte', () => {
    expect(readFileSync('desktop/web-app/public/tts_module.js', 'utf8')).toBe(readFileSync('tts_module.js', 'utf8'));
  });
});

// Owner decision 2026-11-04 (follow-up): Kokoro/Piper run on the device, so a
// student-off learner may use one that is ALREADY here. Never download a model.
describe('student AI off: an on-device voice already on this device may read', () => {
  afterEach(() => { for (const name of ['__loadKokoroTTS', '__loadPiperTTS', '_isDesktopBundledApp', '__kokoroTTSDownloading']) delete window[name]; });
  const withModelCache = (has) => {
    window.AlloModules.AlloCommands = { modelCache: { hasKokoro: vi.fn(async () => has) } };
    return () => { delete window.AlloModules.AlloCommands; };
  };
  it('a loaded Kokoro engine reads a chosen Kokoro voice with no request leaving the device', async () => {
    studentOff(); const fetch = network();
    const speak = vi.fn(async () => 'blob:kokoro'); window._kokoroTTS = { ready: true, speak };
    const { api } = harness();
    await expect(api.callTTS('The cat sat.', 'af_heart', 1, { language: 'English' })).resolves.toBe('blob:kokoro');
    expect(speak).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
    expect(window.__ttsLastRoute).toMatchObject({ route: 'student-on-device-kokoro' });
  });
  it('callTTSDirect uses the loaded Kokoro engine too', async () => {
    studentOff(); const fetch = network();
    const speakStreaming = vi.fn(async () => 'blob:kokoro-bot'); window._kokoroTTS = { ready: true, speak: vi.fn(), speakStreaming };
    const { api } = harness({ _isCanvasEnv: false });
    await expect(api.callTTSDirect('Hi there', 'am_adam', 1, 0)).resolves.toBe('blob:kokoro-bot');
    expect(speakStreaming).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([true, false])('a Kokoro model NOT on this device is never downloaded (desktop=%s)', async desktop => {
    studentOff(); const fetch = network(); const restore = withModelCache(false);
    try {
      window._isDesktopBundledApp = desktop;
      const load = vi.fn(async () => { window._kokoroTTS = { ready: true, speak: vi.fn(async () => 'blob:x') }; return true; });
      window.__loadKokoroTTS = load;
      const { api } = harness();
      await expect(api.callTTS('The cat sat.', 'af_heart', 1, { language: 'English' })).resolves.toBeNull();
      expect(load).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
      expect(window.__kokoroTTSDownloading).toBeFalsy();
      expect(window.__ttsLastRoute).toMatchObject({ route: 'student-device-voice' });
    } finally { restore(); }
  });
  it('a Kokoro model saved on this device wakes and reads', async () => {
    studentOff(); const fetch = network(); const restore = withModelCache(true);
    try {
      const speak = vi.fn(async () => 'blob:woken');
      window.__loadKokoroTTS = vi.fn(async () => { window._kokoroTTS = { ready: true, speak }; return true; });
      const { api } = harness();
      await expect(api.callTTS('The cat sat.', 'af_heart', 1, { language: 'English' })).resolves.toBe('blob:woken');
      expect(window.__loadKokoroTTS).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
    } finally { restore(); }
  });
  it('the device voice choice and a cloud voice name stay on the device voice', async () => {
    studentOff();
    const speak = vi.fn(async () => 'blob:kokoro'); window._kokoroTTS = { ready: true, speak };
    const { api } = harness();
    await expect(api.callTTS('Hello', 'browser', 1, 0)).resolves.toBeNull();
    await expect(api.callTTS('Hello', 'Kore', 1, 0)).resolves.toBeNull();
    expect(speak).not.toHaveBeenCalled();
  });
  it('Piper reads a language whose model is already loaded, and never fetches one that is not', async () => {
    studentOff(); const fetch = network();
    const speak = vi.fn(async () => 'blob:piper');
    const ready = new Set(['es']);
    window._piperTTS = { speak, isLanguageReady: (l) => ready.has(l), supportsLanguage: () => true, preloadLanguage: vi.fn() };
    window.__loadPiperTTS = vi.fn();
    const toCode = (l) => ({ Spanish: 'es', French: 'fr' }[l] || 'en');
    const { api } = harness({ languageToTTSCode: toCode, getLeveledTextLanguage: () => 'Spanish' });
    await expect(api.callTTS('Hola', 'Kore', 1, { language: 'Spanish' })).resolves.toBe('blob:piper');
    await expect(api.callTTS('Bonjour', 'Kore', 1, { language: 'French' })).resolves.toBeNull();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(window._piperTTS.preloadLanguage).not.toHaveBeenCalled(); expect(window.__loadPiperTTS).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('the Word Sounds whole-word call shape reads on the device and never retries into the cloud', async () => {
    studentOff(); const fetch = network();
    const speak = vi.fn(async () => 'blob:kokoro-word'); window._kokoroTTS = { ready: true, speak };
    const { api } = harness();
    await expect(api.callTTS('ship', 'af_heart', 1, { language: 'English', maxRetries: 0 })).resolves.toBe('blob:kokoro-word');
    expect(speak).toHaveBeenCalledTimes(1);
    delete window._kokoroTTS;
    await expect(api.callTTS('ship', 'af_heart', 1, { language: 'English', maxRetries: 0 })).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.__ttsLastRoute).toMatchObject({ route: 'student-device-voice' });
  });
  it('teachers keep the Kokoro voice they chose (flag unset)', async () => {
    const speak = vi.fn(async () => 'blob:teacher-kokoro'); window._kokoroTTS = { ready: true, speak };
    const { api } = harness({ _isCanvasEnv: false });
    await expect(api.callTTS('Teacher text', 'af_heart', 1, { language: 'English' })).resolves.toBe('blob:teacher-kokoro');
  });
});

describe('student AI off: device voice is never switched off for learners', () => {
  const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = anti.indexOf('    const _browserFallbackAllowed = () => {');
  const end = anti.indexOf('    let _attemptCleanup = null;', start);
  const body = start >= 0 && end > start ? anti.slice(start, end) : '';
  const allowed = new Function('localStorage', 'window', body + '\nreturn _browserFallbackAllowed;');
  const store = cfg => ({ getItem: () => JSON.stringify(cfg) });
  it('host shared player overrides an unticked fallback box for a student-off learner', () => {
    expect(body.length).toBeGreaterThan(50);
    expect(allowed(store({ browserTtsFallback: false }), {})()).toBe(false);
    expect(allowed(store({ browserTtsFallback: false }), { __alloStudentAiDisabled: true })()).toBe(true);
    expect(allowed(store({ ttsProvider: 'off' }), { __alloStudentAiDisabled: true })()).toBe(false);
  });
  it('phase K read-aloud helpers apply the same override', () => {
    const src = readFileSync('phase_k_helpers_module.js', 'utf8');
    const s = src.indexOf('const _pkReadTtsConfig = () => {');
    const e = src.indexOf('const _pkBrowserLanguageTag', s);
    const read = new Function('localStorage', 'window', src.slice(s, e) + '\nreturn _pkReadTtsConfig;');
    expect(read(store({ browserTtsFallback: false }), {})().browserFallback).toBe(false);
    expect(read(store({ browserTtsFallback: false }), { __alloStudentAiDisabled: true })().browserFallback).toBe(true);
  });
  it('STEM ctx.callTTS falls back to the device voice instead of silence for a student-off learner', () => {
    const stem = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const s = stem.indexOf('      function _stemStudentDeviceVoice(text, rate) {');
    const fnSrc = stem.slice(s, stem.indexOf('\n      }\n', s) + 8);
    const spoken = [];
    const win = { speechSynthesis: { cancel() {}, speak(u) { spoken.push(u); } } };
    const run = w => new Function('window', 'SpeechSynthesisUtterance', fnSrc + '\nreturn _stemStudentDeviceVoice;')(w, function (t) { this.text = t; });
    expect(run(win)('Velocity is 4 m/s', 1)).toBe(false);
    win.__alloStudentAiDisabled = true;
    expect(run(win)('Velocity is 4 m/s', 1)).toBe(true);
    expect(spoken.map(u => u.text)).toEqual(['Velocity is 4 m/s']);
    win._alloGlobalMute = true;
    expect(run(win)('Muted', 1)).toBe(false);
    expect(stem).toContain("if (url) { var a = new Audio(url); a.play().catch(function() {}); }\n                else _stemStudentDeviceVoice(text, speed);");
  });
  it('host AI usability answers the tts kind as cloud-voice availability', () => {
    const s = anti.indexOf('function _alloAiUsable(kind, fn) {');
    const fnSrc = anti.slice(s, anti.indexOf('\n}\n', s) + 2);
    const make = (win, cap) => new Function('window', 'resolveAiCapability', '_alloResolveGeminiAudioCapability', '_alloHasAnyStudentEntry', '_alloStudentAiCapabilities', '_readAlloAiUserConfig',
      fnSrc + '\nreturn _alloAiUsable;')(win, () => cap, () => ({ available: false }), () => false, () => ({}), () => null);
    expect(make({ __alloStudentAiDisabled: true }, { text: true, tts: 'full' })('tts')).toBe(false);
    expect(make({}, { text: true, tts: 'full' })('tts')).toBe(true);
    expect(make({}, { text: false, tts: 'local' })('tts')).toBe(false);
    expect(make({ ALLOFLOW_MANAGED_AI_POLICY: {} }, { text: true, tts: 'full' })('tts')).toBe(false);
  });
});
