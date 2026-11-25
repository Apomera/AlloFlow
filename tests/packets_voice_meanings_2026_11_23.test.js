// Meanings from the vocabulary maker, made on the computer-voice page (2026-11-23): packets_voice_meanings.js and the
// meaning helpers of packets_my_words.js. A meaning the bank has no recording for (a teacher's own or changed meaning,
// a wrong answer written by the teacher, or every meaning where the site has none) is handed over after the #, said by
// the voice of the recordings made ahead of time (Heart, whatever voice is chosen), set to their loudness, kept in My
// words under the same key as those recordings, and the maker uses it by itself.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { fakeIndexedDB } from './helpers/packets_fake_indexeddb.js';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const M = require('../dev-tools/build_packets_meaning_audio.cjs');
const myWords = require('../packets_my_words.js');
const HTML = read('packets-voice.html');

function wav(samples, rate = 24000) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(v, 44 + i * 2));
  return new Uint8Array(buf);
}
function moduleWindow() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://packets.test/packets-voice.html' });
  dom.window.eval(read('packets_audio_kit.js'));
  dom.window.eval(read('packets_voice_meanings.js'));
  return dom.window;
}

describe('the text, the loudness and the hand-over', () => {
  const V = moduleWindow().AlloPacketVoiceMeanings;
  it('says a meaning exactly as the recordings made ahead of time say it, for every bank meaning with a blank', () => {
    const { meanings } = M.collectMeanings();
    const sample = meanings.filter((m) => /_{2,}/.test(m.text)).concat(meanings.slice(0, 300));
    // About 3,900 blank meanings since the blank pass (5,394 before it) plus 300 others.
    expect(sample.length).toBeGreaterThan(3500);
    for (const m of sample) expect(V.spokenText(m.text), m.text).toBe(M.spokenText(m.text));
  });
  it('trims to the speech and sets it to the loudness of the recordings made ahead of time', () => {
    const rate = 24000, tone = [];
    for (let i = 0; i < rate / 2; i++) tone.push(0);
    for (let i = 0; i < rate; i++) tone.push(Math.round(650 * Math.sin(2 * Math.PI * 440 * i / rate)));
    for (let i = 0; i < rate / 2; i++) tone.push(0);
    const out = V.levelWav(wav(tone));
    const samples = new Int16Array(out.buffer.slice(44));
    expect(samples.length / rate).toBeCloseTo(1 + 0.06 + 0.12, 1);
    expect(20 * Math.log10(V.gatedRms(samples, rate) / V.TARGET_RMS)).toBeCloseTo(0, 0);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(Math.round(32768 * 0.84) + 1);
    // Silence, or not 16-bit mono: given back as it was.
    const silent = wav(new Array(2400).fill(0));
    expect(V.levelWav(silent)).toBe(silent);
  });
  it('reads the meanings handed over: a JSON list, each once, at most 120, at most 300 characters, no control characters', () => {
    const list = ['A small animal', 'A small  animal', 'x'.repeat(301), 'Bad\u0007one', 'To run fast'];
    expect(V.handed('#meanings=' + encodeURIComponent(JSON.stringify(list)))).toEqual(['A small animal', 'To run fast']);
    expect(V.handed('#meanings=' + encodeURIComponent(JSON.stringify(Array.from({ length: 200 }, (_, i) => 'Meaning ' + i)))).length).toBe(120);
    expect(V.handed('#meanings=not-json')).toEqual([]);
    expect(V.handed('#words=cat')).toEqual([]);
  });
});

describe('My words keeps a meaning recording under the key of the recordings made ahead of time', () => {
  it('meaningKey, putMeaningClip and getMeaningClips; null removes it; no crypto means no key', async () => {
    const store = myWords.create({ indexedDB: fakeIndexedDB(), crypto: webcrypto, TextEncoder });
    const text = 'If something is ___, it is on fire';
    expect(await store.meaningKey(' If something  is ___, it is on fire ')).toBe('meaning ' + M.keyOf(text));
    const clip = { dataUri: 'data:audio/mpeg;base64,SUQzAwAAAAAA', source: 'computer-voice', made: '2026-11-23T00:00:00.000Z', ms: 2000 };
    await store.putMeaningClip(text, clip);
    const got = await store.getMeaningClips([text, 'Not kept']);
    expect(Object.keys(got)).toEqual([text]);
    expect(got[text]).toMatchObject({ dataUri: clip.dataUri, source: 'computer-voice', ms: 2000 });
    // It is a custom item: a My words file takes it along.
    expect((await store.exportAll()).media.map((m) => m.key)).toEqual(['meaning ' + M.keyOf(text)]);
    await store.putMeaningClip(text, null);
    expect(await store.getMeaningClips([text])).toEqual({});
    const bare = myWords.create({ indexedDB: fakeIndexedDB() });
    expect(await bare.meaningKey(text)).toBe('');
    await expect(bare.putMeaningClip(text, clip)).rejects.toMatchObject({ code: 'bad_word' });
  });
});

async function openPage(hash) {
  const dom = new JSDOM(HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-voice.html' + hash });
  const w = dom.window, d = w.document;
  const page = { w, d, spoken: [] };
  w.indexedDB = fakeIndexedDB();
  Object.defineProperty(w, 'crypto', { configurable: true, value: webcrypto });
  w.TextEncoder = TextEncoder;
  const tone = [];
  for (let i = 0; i < 24000; i++) tone.push(i < 2400 ? 0 : Math.round(900 * Math.sin(2 * Math.PI * 300 * i / 24000)));
  const voiced = wav(tone);
  w.fetch = async (url) => {
    if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
    if (String(url).startsWith('blob:voice/')) return { ok: true, arrayBuffer: async () => voiced.buffer.slice(voiced.byteOffset, voiced.byteOffset + voiced.byteLength) };
    return { ok: false, json: async () => ({}) };
  };
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'lame.min.js') w.eval(read('lame.min.js'));
      if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (catalog, target) => { target.__alloCreateVerifiedWorker = () => {}; };
      if (src === 'kokoro_tts_loader.js') w._kokoroTTS = { init: async () => true, speak: async (text, voice) => { page.spoken.push({ text, voice }); return 'blob:voice/' + page.spoken.length; } };
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  w.eval(read('packets_my_words.js'));
  w.eval(read('packets_voice_engine.js'));
  w.eval(read('packets-voice.js'));
  w.eval(read('packets_voice_meanings.js'));
  page.$ = (id) => d.getElementById(id);
  page.until = async (test, what) => { for (let i = 0; i < 400; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 15)); } throw new Error('Timed out waiting for ' + what); };
  return page;
}

describe('the computer-voice page with meanings handed over, run with a stand-in voice', () => {
  const meanings = ['A plant that grows in the shade of tall trees', 'If something is ___, it is on fire'];
  const hash = '#meanings=' + encodeURIComponent(JSON.stringify(meanings));

  it('shows only the voice and the meanings, makes each with Heart whatever voice is chosen, and keeps them as MP3 in My words', async () => {
    const page = await openPage(hash);
    await page.until(() => page.d.querySelectorAll('.voice-row-meaning').length === 2, 'the meanings');
    expect(page.$('meanings').hidden).toBe(false);
    expect(page.$('words-step').hidden).toBe(true);
    expect(page.$('make-step').hidden).toBe(true);
    expect(page.$('voice-title').previousElementSibling.textContent).toBe('Step 1');
    expect(page.$('meanings-kicker').textContent).toBe('Step 2');
    expect(page.$('meanings-count').textContent).toBe('2 meanings from the vocabulary maker.');
    expect(page.$('make-meanings').disabled).toBe(true);
    expect(page.$('make-meanings').textContent).toBe('Make recordings for the 2 meanings that have none');
    page.$('get-voice').click();
    await page.until(() => !page.$('make-meanings').disabled, 'the voice');
    page.$('f-voice').value = 'am_adam';
    page.$('make-meanings').click();
    await page.until(() => /made and kept in My words/.test(page.$('meanings-said').textContent), 'the recordings');
    expect(page.spoken).toEqual([
      { text: 'A plant that grows in the shade of tall trees.', voice: 'af_heart' },
      { text: 'If something is... blank... it is on fire.', voice: 'af_heart' },
    ]);
    expect(page.$('meanings-said').textContent).toBe('2 recordings made and kept in My words on this device. The vocabulary maker uses them the next time it makes the file, by itself.');
    const kept = await page.w.AlloPacketMyWords.getMeaningClips(meanings);
    for (const t of meanings) {
      expect(kept[t].dataUri.startsWith('data:audio/mpeg;base64,')).toBe(true);
      expect(kept[t].source).toBe('computer-voice');
    }
    const rows = [...page.d.querySelectorAll('.voice-row-meaning')].map((r) => [...r.querySelectorAll('button')].map((b) => b.textContent));
    expect(rows).toEqual([['Play', 'Make again', 'Remove'], ['Play', 'Make again', 'Remove']]);
    expect(page.$('make-meanings').disabled).toBe(true);
  }, 60000);

  it('keeps the word steps when words are handed over too, and the page loads the meanings part last', async () => {
    const page = await openPage('#words=zib&' + hash.slice(1));
    await page.until(() => page.d.querySelectorAll('.voice-row-meaning').length === 2, 'the meanings');
    expect(page.$('words-step').hidden).toBe(false);
    expect(page.$('make-step').hidden).toBe(false);
    const scripts = [...new JSDOM(HTML).window.document.querySelectorAll('script')].map((s) => s.getAttribute('src'));
    expect(scripts[scripts.length - 1]).toBe('packets_voice_meanings.js');
    expect(read('packets_voice_meanings.js')).not.toMatch(/https?:\/\//);
  }, 60000);

  it('shows nothing of it when no meanings are handed over', async () => {
    const page = await openPage('#words=zib');
    await new Promise((r) => setTimeout(r, 50));
    expect(page.$('meanings').hidden).toBe(true);
    expect(page.$('words-step').hidden).toBe(false);
  }, 60000);
});
