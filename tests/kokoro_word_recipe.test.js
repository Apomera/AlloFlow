// THE APP'S LIVE WORD VOICING: "say the word in a sentence and cut it out".
//
// kokoro_tts_loader.js carries a port of the Packets word recipe of
// dev-tools/build_word_sounds_word_audio.cjs (--recipe sentence, owner-approved
// 2026-11-13): "Here is the word... {word}.", cut at the pause, gentle trim,
// -20 LUFS. This file holds the port to the generator's own functions on the
// same input (identical results, identical bytes), runs the worker's word path
// with a pretend voice (a refused cut falls back to exactly today's clip), and
// checks the loader and callTTS route only single words asked for as words.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/build_word_sounds_word_audio.cjs');
const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const LOADER = read('kokoro_tts_loader.js');
const TTS_MODULE = read('tts_module.js');

const RECIPE_SOURCE = (() => {
  const from = LOADER.indexOf('function kokoroWordRecipe()');
  const to = LOADER.indexOf('// ─── Worker Source', from);
  if (from < 0 || to < 0) throw new Error('kokoroWordRecipe not found in the loader');
  return LOADER.slice(from, to);
})();
// eslint-disable-next-line no-new-func
const factory = new Function(RECIPE_SOURCE + '\nreturn kokoroWordRecipe;')();
const port = factory();

const RATE = 24000;
const wavOf = (samples) => tool.pcmToWav(Float32Array.from(samples), RATE).wav;
// Made-up takes, as in tests/word_sounds_word_audio_recipe.test.js.
function take(total, pieces) {
  const out = new Float32Array(Math.round(total * RATE));
  let seed = 7;
  const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
  for (const { at, seconds, level, kind = 'tone' } of pieces) {
    const from = Math.round(at * RATE), count = Math.round(seconds * RATE), ramp = Math.round(0.01 * RATE);
    for (let i = 0; i < count && from + i < out.length; i++) {
      const edge = Math.min(1, i / ramp, (count - 1 - i) / ramp);
      out[from + i] += level * edge * (kind === 'noise' ? noise() : Math.sin(2 * Math.PI * 220 * i / RATE));
    }
  }
  return out;
}
const sentenceFloat = ({ gap = 0.2, word = 0.45, bridge = 0 } = {}) => take(0.9 + gap + word + 0.4, [
  { at: 0.2, seconds: 0.7, level: 0.24 },
  ...(bridge ? [{ at: 0.9, seconds: gap, level: bridge, kind: 'noise' }] : []),
  { at: 0.9 + gap, seconds: 0.05, level: 0.012, kind: 'noise' },
  { at: 0.95 + gap, seconds: word - 0.05, level: 0.22 },
]);
const sentence = (options) => wavOf(sentenceFloat(options));
const bytes = (value) => Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
// Everything but the typed arrays and WAV bytes (compared separately).
const plain = (value) => JSON.parse(JSON.stringify(value, (key, v) => (key === 'wav' || key === 'samples' || key === 'float' ? undefined : v)));

describe('the port is the generator, function for function', () => {
  it('has the same constants', () => {
    for (const name of ['GENTLE', 'CUT', 'LOUDNESS', 'GATES', 'RECIPE_GATES']) expect(port[name]).toEqual(tool[name]);
    expect(port.CARRIERS[0]).toBe(tool.RECIPES.sentence.carrier);
    expect(port.CARRIERS[1]).toBe(tool.RECIPES.sentence['carrier-retry']);
  });

  it('reads and writes WAV byte for byte', () => {
    const raw = sentence();
    const a = tool.readPcm(raw), b = port.readPcm(new Uint8Array(raw));
    expect(b.rate).toBe(a.rate);
    expect(Buffer.from(b.samples.buffer).equals(Buffer.from(a.samples.buffer))).toBe(true);
    const float = Float32Array.from({ length: 4801 }, (_, i) => Math.sin(i / 7) * 1.2);
    expect(bytes(port.pcmToWav(float, RATE).wav).equals(tool.pcmToWav(float, RATE).wav)).toBe(true);
  });

  it.each([
    ['a clean cut', {}, { bareSeconds: 0.5 }],
    ['no clear pause', { gap: 0.04 }, { bareSeconds: 0.5 }],
    ['a pause where the sentence does not put it', {}, { bareSeconds: 0.5, prefixSeconds: 1.3 }],
    ['a cut far longer than the bare word', {}, { bareSeconds: 0.2 }],
    ['the sentence running into the word', { bridge: 0.001 }, { bareSeconds: 0.5 }],
    ['no bare length at all', {}, {}],
  ])('cuts the same way: %s', (_name, shape, options) => {
    const raw = sentence(shape);
    const a = tool.cutCarrier(raw, options), b = port.cutCarrier(new Uint8Array(raw), options);
    expect(plain(b)).toEqual(plain(a));
    if (a.ok) {
      expect(bytes(b.clip.wav).equals(a.clip.wav)).toBe(true);
      expect(plain(port.checkClip(b.clip, 3, port.RECIPE_GATES))).toEqual(plain(tool.checkClip(a.clip, 3, tool.RECIPE_GATES)));
    }
  });

  it('refuses two pauses that look alike, as the generator does', () => {
    const raw = wavOf(take(2.4, [{ at: 0.2, seconds: 0.5, level: 0.2 }, { at: 0.88, seconds: 0.35, level: 0.2 }, { at: 1.4, seconds: 0.45, level: 0.18 }]));
    const b = port.cutCarrier(new Uint8Array(raw), { bareSeconds: 0.45 });
    expect(plain(b)).toEqual(plain(tool.cutCarrier(raw, { bareSeconds: 0.45 })));
    expect(b.failures.join('; ')).toMatch(/two pauses look alike/);
  });

  it('measures loudness and true peak to the same bits', () => {
    const sine = (seconds, amplitude, hz, rate, phase = 0) => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amplitude * Math.sin(2 * Math.PI * hz * i / rate + phase));
    for (const [signal, rate] of [[sine(2, 1, 997, 48000), 48000], [sine(2, 1, 997, 24000), 24000], [sine(0.3, 0.1, 997, 48000), 48000], [sentenceFloat(), RATE]]) {
      expect(port.loudnessOf(signal, rate)).toBe(tool.loudnessOf(signal, rate));
    }
    expect(port.loudnessOf(sine(2, 1, 997, 24000), 24000)).toBeCloseTo(-3.01, 1);
    const tone = sine(0.1, 1, 6000, 24000, Math.PI / 4);
    expect(port.truePeakDb(tone)).toBe(tool.truePeakDb(tone));
  });

  it('brings a clip to -20 LUFS the same way, ceiling included', () => {
    for (const pieces of [[{ at: 0.3, seconds: 0.4, level: 0.1 }], [{ at: 0.3, seconds: 0.4, level: 0.05 }, { at: 0.5, seconds: 0.02, level: 0.9 }]]) {
      const trimmed = tool.gentleTrim(wavOf(take(1, pieces)));
      const a = tool.normalizeLoudness(trimmed, { target: -20 }), b = port.normalizeLoudness(trimmed, { target: -20 });
      expect(plain(b)).toEqual(plain(a));
      expect(bytes(b.wav).equals(a.wav)).toBe(true);
    }
    const cut = port.cutCarrier(new Uint8Array(sentence()), { bareSeconds: 0.5 });
    const done = port.normalizeLoudness(cut.clip, { target: -20 });
    expect(done.loudnessAfter).toBeCloseTo(-20, 6);
    expect(done.truePeakAfter).toBeLessThanOrEqual(-1.5 + 1e-9);
  });

  it('reads the word out of the sentence\'s phonemes the same way', () => {
    for (const [text, prefix] of [['hˈɪɹ ɪz ðə wˈɜːd... hˈæt.', 'hˈɪɹ ɪz ðə wˈɜːd...'], ['ðə wˈɜːd ɪz... ɹˈæbɪt.', 'ðə wˈɜːd ɪz...'], ['hˈæt', null]]) {
      expect(port.wordPhonemes(text, prefix)).toBe(tool.wordPhonemes(text, prefix));
    }
    expect(port.carrierText('Here is the word... {word}.', 'map')).toBe(tool.carrierText('Here is the word... {word}.', 'map'));
  });

  it('finishTake is cut + checks + loudness in the generator\'s order', () => {
    const raw = sentence();
    const done = port.finishTake({ wav: new Uint8Array(raw), phonemes: 'hˈɪɹ ɪz ðə wˈɜːd... hˈæt.' },
      { bareSeconds: 0.5, sounds: 3, prefixPhonemes: 'hˈɪɹ ɪz ðə wˈɜːd...', barePhonemes: 'hˈæt', target: -20, ceiling: -1.5 });
    const cut = tool.cutCarrier(raw, { bareSeconds: 0.5 });
    expect(tool.checkClip(cut.clip, 3, tool.RECIPE_GATES).ok).toBe(true);
    expect(done.ok).toBe(true);
    expect(bytes(done.wav).equals(tool.normalizeLoudness(cut.clip, { target: -20, ceiling: -1.5 }).wav)).toBe(true);
    expect(port.finishTake({ wav: new Uint8Array(raw), phonemes: 'hˈɪɹ ɪz ðə wˈɜːd... hˈeɪt.' },
      { bareSeconds: 0.5, sounds: 3, prefixPhonemes: 'hˈɪɹ ɪz ðə wˈɜːd...', barePhonemes: 'hˈæt' }).failures.join('; ')).toMatch(/read as \/hˈeɪt\/ in the sentence, \/hˈæt\/ alone/);
  });
});

describe('the app-only parts (no bare take to measure)', () => {
  it('counts sounds in a phonemizer reading', () => {
    expect(port.soundCount('hˈæt')).toBe(3);
    expect(port.soundCount('tʃˈɪp')).toBe(3);
    expect(port.soundCount('ɹˈæbɪt')).toBe(5);
    expect(port.soundCount('hˈaʊs')).toBe(3);
    expect(port.soundCount(null)).toBe(0);
  });
  it('estimates the bare word from the generator\'s own duration line, less its margins', () => {
    expect(port.bareSecondsFor(3)).toBeCloseTo(tool.expectedSeconds(3) - 0.09, 9);
    expect(port.bareSecondsFor(0)).toBe(0);
  });
  it('finds the carrier\'s own phonemes as calibrateCarriers does', () => {
    expect(port.commonPrefixPhonemes(['hˈɪɹ ɪz ðə wˈɜːd... mˈæn.', 'hˈɪɹ ɪz ðə wˈɜːd... sˈʌn.', 'hˈɪɹ ɪz ðə wˈɜːd... tˈɑːp.'])).toBe('hˈɪɹ ɪz ðə wˈɜːd...');
  });
});

// ── The worker's word path, with a pretend voice ─────────────────────────
function workerBody(src) {
  const marker = 'const WORKER_SOURCE = `';
  const open = src.indexOf(marker) + marker.length - 1;
  let i = open + 1;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') return src.slice(open + 1, i);
    i++;
  }
  throw new Error('unterminated WORKER_SOURCE');
}
function loadWorker() {
  // The template literal doubles each regex backslash; undo that, then copy the recipe in as the loader does.
  const body = workerBody(LOADER)
    .replace(/\\\\/g, '\\')
    .replace('${kokoroWordRecipe.toString()}', () => RECIPE_SOURCE.trim())
    .replace(/\$\{[^}]*\}/g, '0');
  const posted = [];
  const harness = `
    const self = { addEventListener() {}, postMessage(message) { posted.push(message); }, onmessage: null, fetch() { return Promise.reject(new Error('no fetch')); } };
    ${body}
    ;return { generateWord, generateOne, float32ToWav, setTts(value) { _tts = value; }, onmessage: (data) => self.onmessage({ data }) };`;
  // eslint-disable-next-line no-new-func
  const worker = new Function('posted', 'performance', harness)(posted, { now: () => Date.now() });
  return Object.assign(worker, { posted });
}
// kokoro-js shape: generate() phonemizes, calls this.tokenizer(phonemes), then the model.
function pretendVoice(takes, phonemes) {
  const calls = [];
  const voice = {
    tokenizer: () => ({ input_ids: [] }),
    async generate(text) {
      const read = phonemes[text] || 'ʔ';
      this.tokenizer(read, { truncation: true });
      calls.push(text);
      const got = takes[text];
      if (typeof got === 'function') return got();
      if (!got) throw new Error('no take for ' + text);
      return { audio: got, sampling_rate: RATE };
    },
  };
  return { voice, calls };
}
const bareHat = take(1.1, [{ at: 0.25, seconds: 0.05, level: 0.012, kind: 'noise' }, { at: 0.3, seconds: 0.45, level: 0.22 }]);
const PHONEMES = {
  hat: 'hˈæt',
  'Here is the word... hat.': 'hˈɪɹ ɪz ðə wˈɜːd... hˈæt.',
  'Here is the word... man.': 'hˈɪɹ ɪz ðə wˈɜːd... mˈæn.',
  'Here is the word... sun.': 'hˈɪɹ ɪz ðə wˈɜːd... sˈʌn.',
  'Here is the word... top.': 'hˈɪɹ ɪz ðə wˈɜːd... tˈɑːp.',
  'The word is... hat.': 'ðə wˈɜːd ɪz... hˈæt.',
  'The word is... man.': 'ðə wˈɜːd ɪz... mˈæn.',
  'The word is... sun.': 'ðə wˈɜːd ɪz... sˈʌn.',
  'The word is... top.': 'ðə wˈɜːd ɪz... tˈɑːp.',
};
const RECIPE = { id: 'sentence-cut-v1', carriers: ['Here is the word... {word}.'], target: -20, ceiling: -1.5 };

describe('the worker voices one word in the sentence, or exactly as before', () => {
  it('parses with the recipe copied in', () => {
    expect(() => loadWorker()).not.toThrow();
  });

  it('takes the word from the sentence when every check passes: -20 LUFS, no bare take', async () => {
    const w = loadWorker();
    const { voice, calls } = pretendVoice({ 'Here is the word... hat.': sentenceFloat() }, PHONEMES);
    w.setTts(voice);
    const done = await w.generateWord('hat', 'af_heart', 1, RECIPE);
    expect(done.failures).toEqual([]);
    expect(done.form).toBe('carrier');
    expect(calls).toEqual(['Here is the word... hat.']);
    expect(done.measures.readingChecked).toBe(true);
    expect(done.measures.loudness).toBeCloseTo(-20, 6);
    const { rate, samples } = port.readPcm(done.buffer);
    expect(rate).toBe(RATE);
    expect(port.loudnessOf(samples, rate, Math.round(0.06 * RATE), samples.length - Math.round(0.12 * RATE))).toBeCloseTo(-20, 0);
    // Exactly the generator's chain on the same take.
    const raw = w.float32ToWav(sentenceFloat(), RATE);
    const cut = tool.cutCarrier(Buffer.from(raw), { bareSeconds: port.bareSecondsFor(3) });
    expect(bytes(done.buffer).equals(tool.normalizeLoudness(cut.clip, { target: -20, ceiling: -1.5 }).wav)).toBe(true);
  });

  it.each([
    ['no pause to cut at', { 'Here is the word... hat.': sentenceFloat({ gap: 0.03 }) }, PHONEMES, /no clear pause/],
    ['another reading of the word', { 'Here is the word... hat.': sentenceFloat() }, { ...PHONEMES, 'Here is the word... hat.': 'hˈɪɹ ɪz ðə wˈɜːd... hˈeɪt.' }, /read as \/hˈeɪt\//],
    ['a voice error on the sentence', { 'Here is the word... hat.': () => { throw new Error('model failed'); } }, PHONEMES, /model failed/],
  ])('falls back to the word alone, byte for byte today\'s clip: %s', async (_name, takes, phonemes, reason) => {
    const w = loadWorker();
    const { voice, calls } = pretendVoice({ ...takes, hat: bareHat }, phonemes);
    w.setTts(voice);
    const done = await w.generateWord('hat', 'af_heart', 1, RECIPE);
    expect(done.form).toBe('bare');
    expect(done.failures.join(' | ')).toMatch(reason);
    expect(calls[calls.length - 1]).toBe('hat');
    const today = await w.generateOne('hat', 'af_heart', 1);
    expect(bytes(done.buffer).equals(bytes(today))).toBe(true);
  });

  it('tries the retry sentence when the recipe asks for it', async () => {
    const w = loadWorker();
    const { voice, calls } = pretendVoice({ 'Here is the word... hat.': sentenceFloat({ gap: 0.03 }), 'The word is... hat.': sentenceFloat(), hat: bareHat }, PHONEMES);
    w.setTts(voice);
    const done = await w.generateWord('hat', 'af_heart', 1, { ...RECIPE, carriers: port.CARRIERS.slice() });
    expect(done.form).toBe('carrier2');
    expect(calls).toEqual(['Here is the word... hat.', 'The word is... hat.']);
  });

  it('answers a generate_word message as one complete clip with the word report', async () => {
    const w = loadWorker();
    w.setTts(pretendVoice({ 'Here is the word... hat.': sentenceFloat() }, PHONEMES).voice);
    await w.onmessage({ type: 'generate_word', id: 'm1', text: 'hat', voice: 'af_heart', speed: 1, recipe: RECIPE });
    const reply = w.posted.find((message) => message.id === 'm1');
    expect(reply).toMatchObject({ type: 'audio', chunks: 1, expectedChunks: 1, word: { recipe: 'sentence-cut-v1', form: 'carrier', failures: [] } });
    expect(reply.buffer.byteLength).toBeGreaterThan(44);
  });
});

// ── The loader: who gets the word recipe ─────────────────────────────────
class FakeWorker {
  static instances = [];
  constructor() { this.messages = []; FakeWorker.instances.push(this); }
  postMessage(message) {
    this.messages.push(message);
    if (message.type === 'init') { queueMicrotask(() => this.onmessage && this.onmessage({ data: { type: 'ready' } })); return; }
    if (message.type === 'generate' || message.type === 'generate_batch' || message.type === 'generate_word') {
      if (FakeWorker.hold) return;
      queueMicrotask(() => this.onmessage && this.onmessage({ data: {
        type: 'audio', id: message.id, buffer: new ArrayBuffer(8), elapsed: 1, chunks: 1, expectedChunks: 1,
        word: message.type === 'generate_word' ? { recipe: message.recipe.id, form: 'carrier', failures: [], measures: { loudness: -20 } } : undefined,
      } }));
    }
  }
  terminate() {}
}
describe('the loader routes only single words asked for as words', () => {
  let urls = 0;
  const original = {};
  beforeEach(() => {
    FakeWorker.instances = []; FakeWorker.hold = false;
    original.create = URL.createObjectURL; original.revoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:word-' + (++urls);
    URL.revokeObjectURL = () => {};
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    delete window._kokoroTTS; delete window.__kokoroTTSLoading; delete window.__alloKokoroWordRecipe;
    try { window.localStorage.removeItem('alloflow_kokoro_word_recipe'); } catch (_) {}
    window.__alloCreateVerifiedWorker = async () => new FakeWorker();
    // eslint-disable-next-line no-new-func
    new Function(LOADER)();
  });
  afterEach(() => {
    try { window._kokoroTTS.dispose(); } catch (_) {}
    delete window._kokoroTTS; delete window.__kokoroTTSLoading; delete window.__alloCreateVerifiedWorker; delete window.__alloKokoroWordRecipe;
    try { window.localStorage.removeItem('alloflow_kokoro_word_recipe'); } catch (_) {}
    URL.createObjectURL = original.create; URL.revokeObjectURL = original.revoke;
    vi.restoreAllMocks();
  });
  const sent = () => FakeWorker.instances[0].messages.filter((m) => m.type === 'generate_word' || m.type === 'generate_batch').map((m) => m.type + ':' + m.text);

  it('a single word with word: true goes to the word recipe; everything else as before', async () => {
    const k = window._kokoroTTS;
    expect(k.wordRecipe).toMatchObject({ id: 'sentence-cut-v1', enabled: true });
    await k.speak(' cat ', 'af_heart', 1, { word: true });
    await k.speak("don't", 'af_heart', 1, { word: true });
    await k.speak('cat', 'af_heart', 1);
    await k.speak('the cat sat', 'af_heart', 1, { word: true });
    await k.speak('cat.', 'af_heart', 1, { word: true });
    expect(sent()).toEqual(['generate_word:cat', "generate_word:don't", 'generate_batch:cat', 'generate_batch:the cat sat', 'generate_batch:cat.']);
    const word = FakeWorker.instances[0].messages.find((m) => m.type === 'generate_word');
    expect(word.recipe).toEqual({ id: 'sentence-cut-v1', carriers: ['Here is the word... {word}.'], target: -20, ceiling: -1.5 });
    expect(k.wordRecipe.last).toMatchObject({ text: "don't", form: 'carrier', recipe: 'sentence-cut-v1' });
  });

  it('keeps word clips and old clips apart in the cache, and reuses each', async () => {
    const k = window._kokoroTTS;
    const a = await k.speak('cat', 'af_heart', 1, { word: true });
    const b = await k.speak('cat', 'af_heart', 1, { word: true });
    const c = await k.speak('cat', 'af_heart', 1);
    const d = await k.speak('cat', 'af_heart', 1);
    expect(a).toBe(b);
    expect(c).toBe(d);
    expect(c).not.toBe(a);
    expect(sent()).toEqual(['generate_word:cat', 'generate_batch:cat']);
  });

  it('can be turned off for debugging, by a window flag or localStorage', async () => {
    const k = window._kokoroTTS;
    window.__alloKokoroWordRecipe = false;
    expect(k.wordRecipe.enabled).toBe(false);
    await k.speak('cat', 'af_heart', 1, { word: true });
    delete window.__alloKokoroWordRecipe;
    window.localStorage.setItem('alloflow_kokoro_word_recipe', 'off');
    await k.speak('dog', 'af_heart', 1, { word: true });
    window.localStorage.removeItem('alloflow_kokoro_word_recipe');
    await k.speak('pig', 'af_heart', 1, { word: true });
    expect(sent()).toEqual(['generate_batch:cat', 'generate_batch:dog', 'generate_word:pig']);
  });

  it('a short streaming request for a word, and stop(), behave like speak()', async () => {
    const k = window._kokoroTTS;
    await k.speakStreaming('fish', 'af_heart', 1, { word: true });
    expect(sent()).toEqual(['generate_word:fish']);
    FakeWorker.hold = true;
    const pending = k.speak('frog', 'af_heart', 1, { word: true, signal: new AbortController().signal });
    await new Promise((r) => setTimeout(r, 0));
    expect(k.stop()).toBe(true);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('voiceWordClean returns the WAV and the report, and refuses what is not one word', async () => {
    const k = window._kokoroTTS;
    expect(await k.voiceWordClean('two words', 'af_heart')).toBe(null);
    const done = await k.voiceWordClean('hat', 'af_heart');
    expect(done).toMatchObject({ form: 'carrier', recipe: 'sentence-cut-v1', failures: [] });
    expect(done.buffer.byteLength).toBe(8);
  });
});

// ── callTTS passes the word hint to Kokoro, and only when asked ──────────
function makeTts() {
  const localRequests = [];
  const localWindow = {
    AlloModules: {}, atob, btoa,
    _kokoroTTS: { ready: true, resolveVoice: (voice) => voice, speak: async (...args) => { localRequests.push(args); return 'blob:kokoro-word'; } },
  };
  runInNewContext(TTS_MODULE, {
    window: localWindow, console: { log() {}, warn() {}, error() {}, debug() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, Blob, AbortController, atob, btoa, TextEncoder, TextDecoder,
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    fetch: async () => { throw new Error('no network in this test'); },
  });
  const api = localWindow.AlloModules.createTTS({
    state: { queue: [], botQueue: [], urlCache: new Map(), rateLimitedUntil: 0 },
    apiKey: 'test-key', GEMINI_MODELS: { tts: 'test-tts-model' }, AVAILABLE_VOICES: ['Kore'], _isCanvasEnv: false,
    languageToTTSCode: () => 'en', isGlobalMuted: () => false, warnLog() {}, debugLog() {},
    getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => ({ backend: 'gemini', ttsProvider: 'auto' }), getAi: () => null, getSelectedVoice: () => 'af_heart', setShowKokoroOfferModal() {},
  });
  return { api, localRequests };
}
describe('callTTS', () => {
  it('asks Kokoro for the word recipe when the caller says word: true (Word Sounds\' prepared-clip path and the selected-voice path)', async () => {
    const h = makeTts();
    await h.api.callTTS('corn', 'af_heart', 1, { language: 'English', maxRetries: 0, allowProviderFallback: false, word: true });
    await h.api.callTTS('corn', 'af_heart', 1, { language: 'English', maxRetries: 0, word: true });
    expect(h.localRequests.map((args) => args[3] && args[3].word)).toEqual([true, true]);
  });
  it('treats Word Sounds\' language codes (en, en-US) as English, so a Kokoro lesson voice reaches Kokoro at all', async () => {
    const h = makeTts();
    expect(await h.api.callTTS('zorbit', 'af_heart', 1, { language: 'en', allowProviderFallback: false, word: true })).toBe('blob:kokoro-word');
    expect(await h.api.callTTS('zorbit', 'af_heart', 1, { language: 'en-US', allowProviderFallback: false, word: true })).toBe('blob:kokoro-word');
    expect(await h.api.callTTS('zorbit', 'af_heart', 1, { language: 'es', allowProviderFallback: false, word: true })).toBe(null);
    expect(await h.api.callTTS('zorbit', 'af_heart', 1, { language: 'Spanish', allowProviderFallback: false, word: true })).toBe(null);
    expect(h.localRequests).toHaveLength(2);
  });
  it('leaves every other request as it was', async () => {
    const h = makeTts();
    await h.api.callTTS('corn', 'af_heart', 1, { language: 'English', maxRetries: 0, allowProviderFallback: false });
    await h.api.callTTS('The cat sat on the mat.', 'af_heart', 1, { language: 'English', maxRetries: 0 });
    expect(h.localRequests.every((args) => !(args[3] && args[3].word))).toBe(true);
  });
});

describe('the single-word call sites ask for it', () => {
  it('Word Sounds playback, prefetch, heard clips, repair; setup preview + generation; word practice; reader word help', () => {
    const ws = read('word_sounds_module.js');
    expect(ws.match(/language: wordSoundsLanguage \|\| "English", (?:maxRetries: 0, )?word: true/g)).toHaveLength(4);
    expect(ws.includes("{ force: true, language: language || 'English', signal, word: true,")).toBe(true);
    const setup = read('word_sounds_setup_source.jsx');
    expect(setup.includes('{ signal: options.signal, force: true, word: true,')).toBe(true);
    expect(setup.includes('word: !notWordTasks.has(text),')).toBe(true);
    expect(read('word_practice_media.js').includes('language, word: true,')).toBe(true);
    expect(read('view_simplified_source.jsx').includes('{ maxRetries: 2, language: helpLanguage, word: true }')).toBe(true);
    expect(read('content_engine_source.jsx').includes('{ maxRetries: 2, language: request.language, word: true }')).toBe(true);
    // includes(), not toContain(): a failing toContain diffs the whole module.
    for (const [module, source] of [['word_sounds_setup_module.js', 'word: !notWordTasks.has(text)'], ['word_practice_module.js', 'language, word: true,'],
      ['view_simplified_module.js', '{maxRetries:2,language:helpLanguage,word:true}'], ['content_engine_module.js', '{ maxRetries: 2, language: request.language, word: true }']]) {
      expect(read(module).includes(source), module).toBe(true);
    }
    expect(read('desktop/web-app/public/kokoro_tts_loader.js') === LOADER, 'public loader mirror').toBe(true);
  });
});
