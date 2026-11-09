// Video Studio narration: Gemini first, then the on-device Kokoro voice.
//
// The studio popup asks the app for narration with `allostudio-tts-request`. The handler used to call
// the Gemini-only fetchTTSBytes, so with no key, AI off or a 403 it failed even when the English
// Kokoro voice was saved on the computer. These tests run the REAL receiver code (sliced from
// video_studio_module.js) and the REAL Kokoro WAV encoder (sliced from kokoro_tts_loader.js).
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n');
const moduleText = read('video_studio_module.js');
const loaderText = read('kokoro_tts_loader.js');

const between = (text, startMark, endMark) => {
  const start = text.indexOf(startMark);
  const end = text.indexOf(endMark, start);
  expect(start, 'start marker: ' + startMark).toBeGreaterThan(-1);
  expect(end, 'end marker: ' + endMark).toBeGreaterThan(start);
  return text.slice(start, end);
};

// The encoder Kokoro's worker uses (float32 -> 16-bit mono WAV, and the multi-chunk concatenation).
const encoders = new Function(
  between(loaderText, 'const FADE_IN_MS = 2;', 'async function generateOne')
  + '\nreturn { float32ToWav, concatWavBuffers };'
)();

const HELPERS = between(moduleText, '  var VS_GEMINI_TO_KOKORO', '  // A sender is ours if it is one of the windows WE opened');
const helpers = new Function('window', 'fetch', HELPERS + '\nreturn { vsKokoroVoiceFor, vsWavToPcm, vsDeviceVoicePcm };');

// The receiver, wired exactly as in the module, with fakes for what lives outside the slice.
function makeReceiver({ fetchTTSBytes, callTTS, fetchImpl, win } = {}) {
  const src = between(moduleText, '  var VS_AI_BRIDGE_TYPES = [', "  window.addEventListener('message', vsAiBridgeReceiver);");
  const listeners = [];
  const fakeWindow = { addEventListener: (t, fn) => { if (t === 'message') listeners.push(fn); } };
  if (fetchTTSBytes) fakeWindow.fetchTTSBytes = fetchTTSBytes;
  if (callTTS) fakeWindow.callTTS = callTTS;
  Object.assign(fakeWindow, win || {});
  const posted = [];
  const toasts = [];
  const studioWin = { closed: false };
  const ORIGIN = 'https://alloflow-cdn.example';
  const vsTakeStore = { token: 'tok', studioWin, coachWin: null };
  const factory = new Function(
    'window', 'fetch', 'vsTakeStore', 'STUDIO_ORIGIN', 'vsPostToStudio', 'vsDemoHost', 'makeT',
    src + "\nwindow.addEventListener('message', vsAiBridgeReceiver);"
  );
  // The host's toast and translate come from the live panel props, like the real module.
  const host = { current: { addToast: (message, kind) => toasts.push({ message, kind }), t: (key) => key } };
  factory(fakeWindow, fetchImpl, vsTakeStore, ORIGIN, (target, msg) => { posted.push(msg); return true; }, host, (t) => (key, fallback) => { const v = typeof t === 'function' ? t(key) : key; return v && v !== key ? v : fallback; });
  expect(listeners).toHaveLength(1);
  const send = (data) => listeners[0]({ origin: ORIGIN, source: studioWin, data: Object.assign({ bridge: 'tok' }, data) });
  return { send, posted, toasts, fakeWindow };
}

// The app's real voice catalogs (voice_config_module.js), loaded the way the page loads them.
function realVoiceCatalogs() {
  const w = { AlloModules: {} };
  new Function('window', 'console', read('voice_config_module.js'))(w, { log() {}, warn() {} });
  return { GEMINI_VOICES: w.GEMINI_VOICES, KOKORO_VOICES: w.KOKORO_VOICES };
}

// A real Kokoro-encoded clip: 0.25 s of a 440 Hz tone at 24 kHz.
const toneSamples = () => Float32Array.from({ length: 6000 }, (_, i) => 0.4 * Math.sin(2 * Math.PI * 440 * i / 24000));
const kokoroWav = () => encoders.float32ToWav(toneSamples(), 24000);
const fetchOf = (buffer) => vi.fn(async () => ({ arrayBuffer: async () => buffer }));
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };

describe('device voice for Video Studio narration: helpers', () => {
  const h = helpers({}, undefined);

  it('maps the five popup voices exactly as the app\'s Kokoro loader does', () => {
    const loaderMap = {};
    const body = between(loaderText, 'const GEMINI_TO_KOKORO = {', '};');
    for (const m of body.matchAll(/'(\w+)':\s*'(\w+)'/g)) loaderMap[m[1]] = m[2];
    const moduleMap = {};
    for (const m of between(moduleText, 'var VS_GEMINI_TO_KOKORO = {', '};').matchAll(/(\w+):\s*'(\w+)'/g)) moduleMap[m[1]] = m[2];
    expect(Object.keys(loaderMap).length).toBeGreaterThanOrEqual(9);
    expect(moduleMap).toEqual(loaderMap);
    for (const voice of ['Puck', 'Kore', 'Charon', 'Aoede', 'Leda']) {
      const id = h.vsKokoroVoiceFor(voice);
      expect(loaderText).toContain("id: '" + id + "'");
    }
  });

  it('passes a Kokoro voice id through and defaults an unknown name', () => {
    expect(h.vsKokoroVoiceFor('bf_emma')).toBe('bf_emma');
    expect(h.vsKokoroVoiceFor('AM_Adam')).toBe('am_adam');
    expect(h.vsKokoroVoiceFor('NoSuchVoice')).toBe('af_heart');
    expect(h.vsKokoroVoiceFor('')).toBe('af_heart');
    expect(h.vsKokoroVoiceFor(undefined)).toBe('af_heart');
  });

  it('reads the PCM and sample rate out of a WAV made by the real Kokoro encoder', () => {
    const { pcm, sampleRate } = h.vsWavToPcm(kokoroWav());
    expect(sampleRate).toBe(24000);
    expect(pcm.byteLength).toBe(6000 * 2);
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, 6000);
    expect(samples[0]).toBe(0); // the encoder fades in from silence
    expect(Math.max(...samples.slice(1000, 1200).map(Math.abs))).toBeGreaterThan(1000); // the tone is really in there
  });

  it('reads a multi-chunk clip joined the way the worker joins them', () => {
    const one = kokoroWav();
    const joined = encoders.concatWavBuffers([one, kokoroWav(), kokoroWav()]);
    expect(h.vsWavToPcm(joined).pcm.byteLength).toBe(3 * 6000 * 2);
  });

  it('skips extra chunks, honours chunk padding and clamps an oversized data length', () => {
    const base = new Uint8Array(kokoroWav());
    const list = new Uint8Array([0x4c, 0x49, 0x53, 0x54, 3, 0, 0, 0, 1, 2, 3, 0]); // LIST, 3 bytes + 1 pad
    const withList = new Uint8Array(base.length + list.length);
    withList.set(base.subarray(0, 36), 0); withList.set(list, 36); withList.set(base.subarray(36), 36 + list.length);
    expect(h.vsWavToPcm(withList.buffer).pcm.byteLength).toBe(6000 * 2);
    const streaming = base.slice();
    new DataView(streaming.buffer).setUint32(40, 0xffffffff, true);
    expect(h.vsWavToPcm(streaming.buffer).pcm.byteLength).toBe(6000 * 2);
    const odd = base.slice(0, base.length - 1); // a truncated final sample is dropped, not half-read
    new DataView(odd.buffer).setUint32(40, 0xffffffff, true);
    expect(h.vsWavToPcm(odd.buffer).pcm.byteLength).toBe(6000 * 2 - 2);
  });

  it('rejects anything that is not 16-bit mono PCM instead of playing noise', () => {
    const make = (patch) => { const b = new Uint8Array(kokoroWav()); patch(new DataView(b.buffer)); return b.buffer; };
    expect(() => h.vsWavToPcm(make((v) => v.setUint16(20, 3, true)))).toThrow(/16-bit mono/); // float WAV
    expect(() => h.vsWavToPcm(make((v) => v.setUint16(22, 2, true)))).toThrow(/16-bit mono/); // stereo
    expect(() => h.vsWavToPcm(make((v) => v.setUint16(34, 8, true)))).toThrow(/16-bit mono/); // 8-bit
    expect(() => h.vsWavToPcm(make((v) => v.setUint32(0, 0x12345678, false)))).toThrow(/WAV/);
    expect(() => h.vsWavToPcm(new ArrayBuffer(10))).toThrow(/WAV/);
    expect(() => h.vsWavToPcm(make((v) => v.setUint32(40, 0, true)))).toThrow(/no audio/);
  });
});

describe('device voice for Video Studio narration: the allostudio-tts-request handler', () => {
  it('uses Gemini when it works and never touches the device voice', async () => {
    const fetchTTSBytes = vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3, 4]) }));
    const callTTS = vi.fn();
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS });
    send({ type: 'allostudio-tts-request', id: 'a', text: 'Hello there.', voice: 'Kore' });
    await settle();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: 'allostudio-tts-response', id: 'a', sampleRate: 24000 });
    expect(Array.from(posted[0].pcm)).toEqual([1, 2, 3, 4]);
    expect(posted[0].engine).toBeUndefined();
    expect(callTTS).not.toHaveBeenCalled();
  });

  it('falls back to the saved Kokoro voice when Gemini fails, with the mapped voice, English and no cloud fallback', async () => {
    const fetchTTSBytes = vi.fn(async () => { throw new Error('API Error: 403'); });
    const callTTS = vi.fn(async () => 'blob:kokoro-clip');
    const fetchImpl = fetchOf(kokoroWav());
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS, fetchImpl });
    send({ type: 'allostudio-tts-request', id: 'b', text: 'Click the Save button.', voice: 'Kore' });
    await settle();
    expect(fetchTTSBytes).toHaveBeenCalledTimes(1);
    expect(callTTS).toHaveBeenCalledTimes(1);
    const [text, voice, speed, options] = callTTS.mock.calls[0];
    expect([text, voice, speed]).toEqual(['Click the Save button.', 'af_heart', 1]);
    expect(options).toMatchObject({ allowProviderFallback: false, language: 'English' });
    expect(fetchImpl).toHaveBeenCalledWith('blob:kokoro-clip');
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: 'allostudio-tts-response', id: 'b', sampleRate: 24000, engine: 'device' });
    expect(posted[0].pcm.byteLength).toBe(6000 * 2);
    expect(posted[0].error).toBeUndefined();
  });

  it('falls back when Gemini is not even present (AI off / Canvas without the function)', async () => {
    const callTTS = vi.fn(async () => 'blob:kokoro-clip');
    const { send, posted } = makeReceiver({ callTTS, fetchImpl: fetchOf(kokoroWav()) });
    send({ type: 'allostudio-tts-request', id: 'c', text: 'Open the tool.', voice: 'Puck' });
    await settle();
    expect(callTTS.mock.calls[0][1]).toBe('am_adam');
    expect(posted[0]).toMatchObject({ id: 'c', engine: 'device' });
  });

  it('falls back when Gemini returns no audio', async () => {
    const fetchTTSBytes = vi.fn(async () => ({ bytes: new Uint8Array(0) }));
    const callTTS = vi.fn(async () => 'blob:kokoro-clip');
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS, fetchImpl: fetchOf(kokoroWav()) });
    send({ type: 'allostudio-tts-request', id: 'd', text: 'Done.', voice: 'Leda' });
    await settle();
    expect(callTTS.mock.calls[0][1]).toBe('af_bella');
    expect(posted[0].engine).toBe('device');
  });

  it('skips the cloud entirely when a Kokoro voice is picked by name', async () => {
    const fetchTTSBytes = vi.fn(async () => ({ bytes: new Uint8Array([9, 9]) }));
    const callTTS = vi.fn(async () => 'blob:kokoro-clip');
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS, fetchImpl: fetchOf(kokoroWav()) });
    send({ type: 'allostudio-tts-request', id: 'e', text: 'Hi.', voice: 'bm_george' });
    await settle();
    expect(fetchTTSBytes).not.toHaveBeenCalled();
    expect(callTTS.mock.calls[0][1]).toBe('bm_george');
    expect(posted[0].engine).toBe('device');
  });

  it('reports BOTH reasons when neither voice works, and the device reason says what to do', async () => {
    const fetchTTSBytes = vi.fn(async () => { throw new Error('API Error: 403'); });
    const callTTS = vi.fn(async () => null); // Kokoro model not saved on this computer
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS });
    send({ type: 'allostudio-tts-request', id: 'f', text: 'Hi.', voice: 'Kore' });
    await settle();
    expect(posted).toHaveLength(1);
    expect(posted[0].pcm).toBeUndefined();
    expect(posted[0].error).toContain('API Error: 403');
    expect(posted[0].error).toContain('not downloaded on this computer');
    expect(posted[0].error.length).toBeLessThanOrEqual(200);
  });

  it('does not try the English-only device voice for another language', async () => {
    const fetchTTSBytes = vi.fn(async () => { throw new Error('API Error: 403'); });
    const callTTS = vi.fn(async () => 'blob:kokoro-clip');
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS });
    send({ type: 'allostudio-tts-request', id: 'g', text: 'Hola.', voice: 'Kore', language: 'Spanish' });
    await settle();
    expect(callTTS).not.toHaveBeenCalled();
    expect(posted[0].error).toContain('English only');
  });

  it('says so when the device voice returns something that is not a usable clip', async () => {
    const fetchTTSBytes = vi.fn(async () => { throw new Error('offline'); });
    const callTTS = vi.fn(async () => 'blob:odd');
    const float = new Uint8Array(kokoroWav()); new DataView(float.buffer).setUint16(20, 3, true);
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS, fetchImpl: fetchOf(float.buffer) });
    send({ type: 'allostudio-tts-request', id: 'h', text: 'Hi.', voice: 'Kore' });
    await settle();
    expect(posted[0].error).toContain('offline');
    expect(posted[0].error).toContain('16-bit mono');
  });

  it('stays silent when the popup cancels: no fallback, no reply', async () => {
    let rejectCloud;
    const fetchTTSBytes = vi.fn(() => new Promise((_, reject) => { rejectCloud = reject; }));
    const callTTS = vi.fn(async () => 'blob:kokoro-clip');
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS, fetchImpl: fetchOf(kokoroWav()) });
    send({ type: 'allostudio-tts-request', id: 'i', text: 'Hi.', voice: 'Kore' });
    await settle();
    send({ type: 'allostudio-ai-cancel', requestId: 'i' });
    rejectCloud(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await settle();
    expect(callTTS).not.toHaveBeenCalled();
    expect(posted).toHaveLength(0);
  });

  it('still limits the spoken text to 600 characters', async () => {
    const fetchTTSBytes = vi.fn(async () => ({ bytes: new Uint8Array([1, 2]) }));
    const { send } = makeReceiver({ fetchTTSBytes });
    send({ type: 'allostudio-tts-request', id: 'j', text: 'x'.repeat(2000), voice: 'Kore' });
    await settle();
    expect(fetchTTSBytes.mock.calls[0][0]).toHaveLength(600);
  });
});

describe('Video Studio voice pickers mirror the app: catalog and download messages', () => {
  const h = helpers({}, undefined);
  const real = realVoiceCatalogs();
  const appWindow = (extra) => Object.assign({
    GEMINI_VOICES: real.GEMINI_VOICES, KOKORO_VOICES: real.KOKORO_VOICES, __alloSelectedVoice: 'Fenrir',
    Worker: function () {}, WebAssembly: {}, location: { href: 'https://alloflow-cdn.pages.dev/app/', hostname: 'alloflow-cdn.pages.dev' },
    AlloModules: { AlloCommands: { modelCache: { hasKokoro: async () => true } } },
  }, extra || {});

  it('registers both messages, each handled exactly once', () => {
    for (const type of ['allostudio-voices-request', 'allostudio-kokoro-prepare-request']) {
      expect(moduleText.split("ev.data.type === '" + type + "'")).toHaveLength(2);
      expect(moduleText.split("'" + type + "'").length).toBeGreaterThanOrEqual(3); // the allow-list and the handler
    }
  });

  it("answers with the app's real Gemini and Kokoro catalogs and its current state", async () => {
    const { send, posted } = makeReceiver({ win: appWindow() });
    send({ type: 'allostudio-voices-request', id: 'v1' });
    await settle();
    expect(posted).toHaveLength(1);
    const r = posted[0];
    expect(r).toMatchObject({ type: 'allostudio-voices-response', id: 'v1', selected: 'Fenrir', kokoroCapable: true, kokoroReady: false, kokoroSaved: true, kokoroDownloading: false });
    expect(r.gemini).toEqual(real.GEMINI_VOICES.map((v) => ({ id: v.id, label: v.label })));
    expect(r.kokoro).toEqual(real.KOKORO_VOICES.map((v) => ({ id: v.id, label: v.label })));
    expect(r.gemini.length).toBeGreaterThanOrEqual(30);
    expect(r.kokoro.length).toBeGreaterThanOrEqual(26);
    // Every voice the studio can now offer is one the narration handler passes through.
    for (const v of r.kokoro) expect(h.vsKokoroVoiceFor(v.id)).toBe(v.id);
  });

  it('reads the catalogs from the voice-config module when the page globals are not set', async () => {
    const w = appWindow({ GEMINI_VOICES: undefined, KOKORO_VOICES: undefined });
    w.AlloModules.VoiceConfig = { GEMINI_VOICES: real.GEMINI_VOICES, KOKORO_VOICES: real.KOKORO_VOICES };
    const { send, posted } = makeReceiver({ win: w });
    send({ type: 'allostudio-voices-request', id: 'v2' });
    await settle();
    expect(posted[0].gemini).toHaveLength(real.GEMINI_VOICES.length);
    expect(posted[0].kokoro).toHaveLength(real.KOKORO_VOICES.length);
  });

  it("trims the cloud list to 15 in Gemini Canvas, as the app's picker does", async () => {
    const a = makeReceiver({ win: appWindow({ location: { href: 'https://abc.scf.usercontent.goog/x', hostname: 'abc.scf.usercontent.goog' } }) });
    a.send({ type: 'allostudio-voices-request', id: 'c1' });
    const b = makeReceiver({ win: appWindow({ location: { href: 'blob:https://x/1', hostname: '' } }) });
    b.send({ type: 'allostudio-voices-request', id: 'c2' });
    await settle();
    expect(a.posted[0].gemini).toHaveLength(15);
    expect(b.posted[0].gemini).toHaveLength(15);
  });

  it('never offers the browser device voice, and reports a browser that cannot run Kokoro', async () => {
    const { send, posted } = makeReceiver({ win: appWindow({ __alloSelectedVoice: 'browser', Worker: undefined, AlloModules: {} }) });
    send({ type: 'allostudio-voices-request', id: 'v3' });
    await settle();
    expect(posted[0].selected).toBe('');
    expect(posted[0].kokoroCapable).toBe(false);
    expect(posted[0].kokoroSaved).toBe(false);
    expect(posted[0].gemini.concat(posted[0].kokoro).some((v) => v.id === 'browser')).toBe(false);
  });

  it('starts the Kokoro download once on request, with the same consent flags and toasts as the app picker', async () => {
    let finish;
    const engine = { ready: false };
    const w = appWindow({ _kokoroTTS: engine });
    w.__loadKokoroTTS = vi.fn(() => new Promise((resolve) => { finish = () => { engine.ready = true; resolve(true); }; }));
    const { send, posted, toasts, fakeWindow } = makeReceiver({ win: w });
    send({ type: 'allostudio-kokoro-prepare-request', id: 'k1' });
    await settle();
    expect(w.__loadKokoroTTS).toHaveBeenCalledTimes(1);
    expect(fakeWindow.__kokoroTTSDownloading).toBe(true);
    expect(fakeWindow.__kokoroLoadUserInitiated).toBe(true);
    expect(toasts.at(-1)).toEqual({ message: 'Getting the on-device voice (88 MB, one time). You can keep working.', kind: 'info' });
    // A second pick while it downloads joins the same download.
    send({ type: 'allostudio-kokoro-prepare-request', id: 'k2' });
    await settle();
    expect(w.__loadKokoroTTS).toHaveBeenCalledTimes(1);
    expect(posted).toHaveLength(0);
    finish();
    await new Promise((r) => setTimeout(r, 700));
    expect(posted.map((p) => [p.id, p.ready])).toEqual([['k1', true], ['k2', true]]);
    expect(posted.every((p) => p.type === 'allostudio-kokoro-prepare-response')).toBe(true);
    expect(fakeWindow.__kokoroTTSDownloading).toBe(false);
    expect(fakeWindow.__kokoroLoadUserInitiated).toBe(false);
    expect(toasts.at(-1)).toEqual({ message: 'On-device voice ready. It is saved on this device.', kind: 'success' });
  });

  it('does nothing when Kokoro is already ready, and says so when it cannot run or fails', async () => {
    const ready = appWindow({ _kokoroTTS: { ready: true } });
    ready.__loadKokoroTTS = vi.fn();
    const a = makeReceiver({ win: ready });
    a.send({ type: 'allostudio-kokoro-prepare-request', id: 'r1' });
    const noWorker = makeReceiver({ win: appWindow({ Worker: undefined, __loadKokoroTTS: vi.fn() }) });
    noWorker.send({ type: 'allostudio-kokoro-prepare-request', id: 'r2' });
    const failing = appWindow({ _kokoroTTS: { ready: false } });
    failing.__loadKokoroTTS = vi.fn(async () => false);
    const c = makeReceiver({ win: failing });
    c.send({ type: 'allostudio-kokoro-prepare-request', id: 'r3' });
    await settle();
    expect(a.posted[0]).toMatchObject({ id: 'r1', ready: true });
    expect(ready.__loadKokoroTTS).not.toHaveBeenCalled();
    expect(noWorker.posted[0]).toMatchObject({ id: 'r2', ready: false });
    expect(noWorker.posted[0].error).toContain('cannot run on-device voices');
    expect(c.posted[0]).toMatchObject({ id: 'r3', ready: false });
    expect(c.toasts.at(-1).kind).toBe('error');
    expect(c.fakeWindow.__kokoroTTSDownloading).toBe(false);
  });

  it('speaks a Kokoro voice with the default cloud voice for another language, as callTTS does', async () => {
    const fetchTTSBytes = vi.fn(async () => ({ bytes: new Uint8Array([1, 2]) }));
    const callTTS = vi.fn();
    const { send, posted } = makeReceiver({ fetchTTSBytes, callTTS });
    send({ type: 'allostudio-tts-request', id: 's1', text: 'Hola.', voice: 'af_heart', language: 'Spanish' });
    await settle();
    expect(fetchTTSBytes.mock.calls[0][1]).toBe('Kore');
    expect(callTTS).not.toHaveBeenCalled();
    expect(posted[0]).toMatchObject({ id: 's1', sampleRate: 24000 });
    expect(posted[0].engine).toBeUndefined();
  });

  it('passes a Gemini voice beyond the old five straight through', async () => {
    const fetchTTSBytes = vi.fn(async () => ({ bytes: new Uint8Array([1, 2]) }));
    const { send } = makeReceiver({ fetchTTSBytes });
    send({ type: 'allostudio-tts-request', id: 's2', text: 'Hi.', voice: 'Fenrir' });
    await settle();
    expect(fetchTTSBytes.mock.calls[0][1]).toBe('Fenrir');
  });
});
