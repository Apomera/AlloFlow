// The maker page (packets-make.html) in jsdom, for tests/packets_make_reopen.test.js and tests/packets_make_batch.test.js.
// The same stand-ins as openMaker in tests/packets_site_pages.test.js and tests/packets_own_words.test.js (small sound
// files with the real keys, a decoder that turns any clip into a short buffer, the store on a stand-in IndexedDB), with a
// Blob that keeps its parts as they are, so a .zip made of bytes can be read back.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { fakeIndexedDB } from './packets_fake_indexeddb.js';

const read = (file) => readFileSync(file, 'utf8');
const SOUND_URLS = ['audio_bank/phonemes.json', 'audio_bank/isolation.json', 'audio_bank/instructions.json', 'word_audio_kokoro_bank.json', 'audio_bank_kokoro.json'];
const tiny = (path) => 'data:audio/webm;base64,' + Buffer.from('clip ' + path).toString('base64');
const shrink = (value, path) => typeof value === 'string' ? (value.startsWith('data:audio') ? tiny(path) : value)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shrink(inner, path + '/' + key)])) : value;
let SOUNDS = null;
const sounds = () => SOUNDS || (SOUNDS = Object.fromEntries(SOUND_URLS.map((url) => {
  const text = read(url);
  return [url, JSON.stringify(shrink(JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text), url))];
})));

// The word store (word_audio_shards/), as tests/packets_site_pages.test.js stands it in: one small file per first letter
// for exactly the words the word list says are in the store, each with a tiny clip of its own.
const require = createRequire(import.meta.url);
let STORE = null;
const store = () => {
  if (STORE) return STORE;
  const wordlist = require('../../word_sounds_wordlist_en.js');
  const words = wordlist.rows().filter((row) => row.shards && !row.kokoro).map((row) => row.word);
  const files = {}, index = { format: 'alloflow-word-audio-index/1', words: {}, shards: {} };
  for (const word of words) { (files[word[0]] = files[word[0]] || { _meta: { format: 'alloflow-word-audio-shard/1', shard: word[0] } })[word] = tiny('store/' + word); index.words[word] = word[0]; }
  STORE = {};
  for (const key of Object.keys(files)) { STORE['word_audio_shards/' + key + '.json'] = JSON.stringify(files[key]); index.shards[key] = { file: key + '.json', words: Object.keys(files[key]).length - 1, bytes: STORE['word_audio_shards/' + key + '.json'].length }; }
  if (words.length) STORE['word_audio_shards/index.json'] = JSON.stringify(index);
  return STORE;
};
// A picture file the picture index names, read from the repository.
const pictureFile = (url) => { try { return read(String(url)); } catch (_) { return null; } };

class FakeOffline {
  constructor(channels, length, rate) { this.length = length; this.sampleRate = rate; this.destination = {}; this.played = null; }
  decodeAudioData(buffer, done) { done({ duration: 0.004, bytes: new Uint8Array(buffer) }); }
  createBufferSource() { const self = this; return { connect() {}, start() {}, set buffer(value) { self.played = value; } }; }
  startRendering() {
    const from = this.played.bytes, samples = new Float32Array(this.length);
    for (let i = 0; i < samples.length; i++) samples[i] = from[from.length - 1 - (i % from.length)] / 128 - 1;
    return Promise.resolve({ getChannelData: () => samples });
  }
}

// A Blob that keeps what it was given: text parts as text (page.built()), byte parts as bytes (page.bytesOf(blob)).
class KeepBlob {
  constructor(parts, opts) {
    this.parts = parts || [];
    this.type = (opts && opts.type) || '';
    this.body = this.parts.every((p) => typeof p === 'string') ? this.parts.join('') : null;
    this.bytes = Buffer.concat(this.parts.map((p) => typeof p === 'string' ? Buffer.from(p, 'utf8') : Buffer.from(p.buffer ? new Uint8Array(p.buffer, p.byteOffset, p.byteLength) : p)));
    this.size = this.bytes.length;
  }
  arrayBuffer() { return Promise.resolve(this.bytes.buffer.slice(this.bytes.byteOffset, this.bytes.byteOffset + this.bytes.length)); }
  text() { return Promise.resolve(this.bytes.toString('utf8')); }
}

export async function openMaker(options = {}) {
  const dom = new JSDOM(read('packets-make.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-make.html' });
  const w = dom.window, d = w.document;
  const page = { dom, w, d, asked: [], files: [], downloads: [], idb: options.idb === undefined ? fakeIndexedDB() : options.idb };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  const SOUNDS_NOW = sounds();
  w.fetch = async (url, init) => {
    page.asked.push(String(url));
    // The picture files (Mulberry Symbols, OpenMoji) only for a page opened with { pictures: true }.
    const body = SOUNDS_NOW[url] || store()[url] || (options.pictures && /^word_sounds_symbols\/[\w-]+\.json$/.test(String(url)) && pictureFile(url)) || null;
    if (init || !body) return { ok: false, status: 404, headers: { get: () => null }, text: async () => '' };
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  if (page.idb) w.indexedDB = page.idb;
  w.OfflineAudioContext = FakeOffline;
  w.Blob = KeepBlob;
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), href: this.getAttribute('href') }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.set = (id, value) => { const node = page.$(id); node.value = value; node.dispatchEvent(new w.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
  page.choose = (name, value) => { const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.until = async (test, what) => {
    for (let i = 0; i < 3000; i++) { if (test()) return; await new Promise((resolve) => setTimeout(resolve, 10)); }
    throw new Error('Timed out waiting for ' + what);
  };
  page.ready = () => page.until(() => page.seen('summary') || page.seen('build-problem'), 'the file or a problem');
  // The last practice file the page made (its Blob holds text).
  page.built = () => [...page.files].reverse().find((blob) => blob.type === 'text/html').body;
  page.store = w.AlloPacketMyWords;
  // Choose a file in "Open a file I made" (the hidden file input), as a browser hands it over.
  page.open = async (name, content) => {
    const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content);
    const file = { name, size: bytes.length, type: 'text/html', arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
    const input = page.$('reopen-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
    await page.until(() => page.seen('reopen-note'), 'the note about the file');
  };
  await page.until(() => !page.seen('loading'), 'the page to open');
  return page;
}
