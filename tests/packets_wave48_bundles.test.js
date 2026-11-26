// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const read = (file) => readFileSync(file, 'utf8');
const WAIT = (ms = 25) => new Promise((r) => setTimeout(r, ms));
const FAKE_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const VOCAB_WORDS = 'habitat, cell, predator, prey';

const SOUND_URLS = [
  'audio_bank/phonemes.json',
  'audio_bank/isolation.json',
  'audio_bank/instructions.json',
  'word_audio_kokoro_bank.json',
  'audio_bank_kokoro.json',
];
const tinyClip = (p) => 'data:audio/webm;base64,' + Buffer.from('clip ' + p).toString('base64');
const shrinkSounds = (v, p) => (typeof v === 'string'
  ? (v.startsWith('data:audio') ? tinyClip(p) : v)
  : (v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, inner]) => [k, shrinkSounds(inner, p + '/' + k)]))
    : v));
const SOUNDS = Object.fromEntries(SOUND_URLS.map((url) => {
  const text = read(url);
  return [url, JSON.stringify(shrinkSounds(JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text), url))];
}));
class FakeOfflineAudioContext {
  constructor(channels, length, rate) { this.length = length; this.sampleRate = rate; this.destination = {}; this.played = null; }
  decodeAudioData(buffer, done) { done({ duration: 0.004, bytes: new Uint8Array(buffer) }); }
  createBufferSource() { const self = this; return { connect() {}, start() {}, set buffer(value) { self.played = value; } }; }
  startRendering() {
    const from = this.played.bytes;
    const samples = new Float32Array(this.length);
    for (let i = 0; i < samples.length; i++) samples[i] = from[from.length - 1 - (i % from.length)] / 128 - 1;
    return Promise.resolve({ getChannelData: () => samples });
  }
}
const installMakerFetch = (w) => {
  const asked = [];
  w.OfflineAudioContext = FakeOfflineAudioContext;
  w.fetch = async (url) => {
    asked.push(String(url));
    const body = SOUNDS[String(url)];
    if (!body) return { ok: false, status: 404, headers: { get: () => null }, text: async () => '' };
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  return asked;
};

const doms = [];
afterEach(() => {
  while (doms.length) {
    try { doms.pop().window.close(); } catch (_) {}
  }
});

// Minimal STORE ZIP reader matching packets_zip.js (local file headers + central directory).
function readZipEntries(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const dec = new TextDecoder('utf-8');
  const entries = Object.create(null);
  let pos = 0;
  while (pos + 30 <= u8.length) {
    const sig = view.getUint32(pos, true);
    if (sig !== 0x04034b50) break;
    const compSize = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const extraLen = view.getUint16(pos + 28, true);
    const nameStart = pos + 30;
    const name = dec.decode(u8.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const data = u8.slice(dataStart, dataStart + compSize);
    entries[name] = data;
    pos = dataStart + compSize;
  }
  return entries;
}

function concatParts(parts) {
  const enc = new TextEncoder();
  const chunks = (parts || []).map((p) => {
    if (p instanceof Uint8Array) return p;
    if (ArrayBuffer.isView(p)) return new Uint8Array(p.buffer, p.byteOffset, p.byteLength);
    if (p instanceof ArrayBuffer) return new Uint8Array(p);
    return enc.encode(String(p));
  });
  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

function captureZipDownload(w) {
  let lastBytes = null;
  let lastFilename = '';
  const OrigBlob = w.Blob;
  const partsByBlob = new WeakMap();
  const blobsByUrl = new Map();
  let seq = 0;

  w.Blob = function CapturedBlob(parts, opts) {
    const b = new OrigBlob(parts, opts);
    partsByBlob.set(b, parts);
    return b;
  };
  w.Blob.prototype = OrigBlob.prototype;

  w.URL.createObjectURL = (blob) => {
    const u = `blob:bundle-${++seq}`;
    blobsByUrl.set(u, blob);
    return u;
  };
  w.URL.revokeObjectURL = () => {};

  const origClick = w.HTMLAnchorElement.prototype.click;
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.download.endsWith('.zip')) {
      lastFilename = this.download;
      const b = blobsByUrl.get(this.href);
      if (b && partsByBlob.has(b)) lastBytes = concatParts(partsByBlob.get(b));
    }
    return origClick ? origClick.call(this) : undefined;
  };

  return {
    get filename() { return lastFilename; },
    get bytes() { return lastBytes; },
  };
}

async function waitFor(pred, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pred()) return true;
    await WAIT(25);
  }
  return false;
}

describe('Wave 48: Upgraded Classroom Bundle (.zip) in Word Sounds and Vocabulary', () => {
  it('documents the full bundle contents near #download-bundle in both HTML pages', () => {
    for (const file of ['packets-make.html', 'packets-vocab.html']) {
      const doc = new JSDOM(read(file)).window.document;
      const hint = doc.getElementById('bundle-hint');
      expect(hint, file).toBeTruthy();
      expect(hint.textContent).toMatch(/interactive file/i);
      expect(hint.textContent).toMatch(/\.docx/i);
      expect(hint.textContent).toMatch(/word cards/i);
      expect(hint.textContent).toMatch(/offline audio player/i);
    }
  });

  it('Word Sounds Classroom Bundle packages HTML sheets, .docx worksheets, Word Cards .docx, and Audio Companion when audio + docx are available', async () => {
    const dom = new JSDOM(read('packets-make.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-make.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.localStorage.setItem('alloflow-packets-maker/1', JSON.stringify({ v: 1, mode: 'pick', shape: 'CVC', stage: '' }));
    const asked = installMakerFetch(w);
    const cap = captureZipDownload(w);

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) w.eval(read(src));
    w.eval(read('packets_docx.js'));

    const $ = (id) => d.getElementById(id);
    const loaded = await waitFor(() => $('loading').hidden && !$('step-1').hidden, 8000);
    expect(loaded).toBe(true);

    $('next-1').click();
    const hasChips = await waitFor(() => d.querySelectorAll('#pick-chips li').length > 0, 5000);
    expect(hasChips).toBe(true);
    $('next-2').click();
    const ready = await waitFor(() => !$('download-bundle').hidden, 3000);
    if (!ready) {
      throw new Error('Bundle button stayed hidden: ' + JSON.stringify({
        step3: $('step-3').hidden,
        summary: $('summary').hidden,
        buildProblem: $('build-problem') && $('build-problem').textContent,
        makingSaid: $('making-said') && $('making-said').textContent,
        asked,
      }));
    }

    $('download-bundle').click();
    const downloaded = await waitFor(() => !!cap.bytes, 5000);
    expect(downloaded).toBe(true);
    expect(cap.filename).toMatch(/-classroom-bundle\.zip$/);
    expect($('download-bundle').disabled).toBe(false);

    const entries = readZipEntries(cap.bytes);
    const names = Object.keys(entries).sort();
    expect(names).toEqual([
      '01-Interactive-Packet.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
      '05-Worksheet-Scaffolded.docx',
      '06-Worksheet-Independent.docx',
      '07-Word-Cards.docx',
      '08-Offline-Audio-Companion.html',
    ]);

    const dec = new TextDecoder('utf-8');
    expect(dec.decode(entries['01-Interactive-Packet.html'])).toContain('<!doctype html>');
    expect(dec.decode(entries['08-Offline-Audio-Companion.html'])).toContain('Worksheet audio player');

    for (const docxName of ['05-Worksheet-Scaffolded.docx', '06-Worksheet-Independent.docx', '07-Word-Cards.docx']) {
      const inner = readZipEntries(entries[docxName]);
      expect(inner['[Content_Types].xml'], docxName).toBeTruthy();
      expect(inner['word/document.xml'], docxName).toBeTruthy();
      const xml = dec.decode(inner['word/document.xml']);
      expect(xml, docxName).toContain('<w:document');
    }
  }, 15000);

  it('Word Sounds Classroom Bundle degrades gracefully when packets_docx.js and audio clips are absent', async () => {
    const dom = new JSDOM(read('packets-make.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-make.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.localStorage.setItem('alloflow-packets-maker/1', JSON.stringify({ v: 1, mode: 'pick', shape: 'CVC', stage: '' }));
    installMakerFetch(w);
    const cap = captureZipDownload(w);

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) w.eval(read(src));

    w.AlloPacketPrintCards.ensureDocx = () => Promise.resolve(null);
    w.AlloPacketPrintCards.buildWordSoundsAudioPlan = () => ({ kind: 'word-sounds', title: 'Word Sounds', sections: [], items: [], audio: {}, clipCount: 0 });

    const $ = (id) => d.getElementById(id);
    const loaded = await waitFor(() => $('loading').hidden && !$('step-1').hidden, 8000);
    expect(loaded).toBe(true);

    $('next-1').click();
    const hasChips = await waitFor(() => d.querySelectorAll('#pick-chips li').length > 0, 5000);
    expect(hasChips).toBe(true);
    $('next-2').click();
    const ready = await waitFor(() => !$('download-bundle').hidden, 8000);
    expect(ready).toBe(true);

    $('download-bundle').click();
    const downloaded = await waitFor(() => !!cap.bytes, 5000);
    expect(downloaded).toBe(true);
    expect($('download-bundle').disabled).toBe(false);

    const entries = readZipEntries(cap.bytes);
    expect(Object.keys(entries).sort()).toEqual([
      '01-Interactive-Packet.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
    ]);
  }, 15000);

  it('Vocabulary Classroom Bundle packages HTML sheets, .docx worksheets, Word Cards .docx, and Audio Companion when audio + docx are available', async () => {
    const dom = new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.scrollTo = () => {};
    const cap = captureZipDownload(w);

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) {
      w.eval(read(src === 'packets_vocab_bank_en.js' ? 'tests/fixtures/packets_vocab_bank_fixture.js' : src));
    }
    w.eval(read('packets_docx.js'));
    await WAIT(40);

    const origVocabAudioPlan = w.AlloPacketPrintCards.buildVocabAudioPlan;
    w.AlloPacketPrintCards.buildVocabAudioPlan = function (st, opts) {
      const plan = origVocabAudioPlan(st, opts);
      plan.audio = Object.assign({}, plan.audio || {}, { habitat: FAKE_WAV });
      plan.clipCount = Math.max(1, plan.clipCount || 0);
      return plan;
    };

    const $ = (id) => d.getElementById(id);
    const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));
    $('f-words').value = VOCAB_WORDS;
    fire($('f-words'), 'input');
    await WAIT(100);
    $('next-1').click();
    await WAIT(60);
    $('next-2').click();
    const ready = await waitFor(() => !$('download-bundle').hidden, 8000);
    expect(ready).toBe(true);

    $('download-bundle').click();
    const downloaded = await waitFor(() => !!cap.bytes, 5000);
    expect(downloaded).toBe(true);
    expect(cap.filename).toMatch(/-classroom-bundle\.zip$/);
    expect($('download-bundle').disabled).toBe(false);

    const entries = readZipEntries(cap.bytes);
    const names = Object.keys(entries).sort();
    expect(names).toEqual([
      '01-Interactive-Packet.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
      '05-Worksheet-Scaffolded.docx',
      '06-Worksheet-Independent.docx',
      '07-Word-Cards.docx',
      '08-Offline-Audio-Companion.html',
    ]);

    const dec = new TextDecoder('utf-8');
    expect(dec.decode(entries['01-Interactive-Packet.html'])).toContain('<!doctype html>');
    expect(dec.decode(entries['08-Offline-Audio-Companion.html'])).toContain('Worksheet audio player');

    for (const docxName of ['05-Worksheet-Scaffolded.docx', '06-Worksheet-Independent.docx', '07-Word-Cards.docx']) {
      const inner = readZipEntries(entries[docxName]);
      expect(inner['[Content_Types].xml'], docxName).toBeTruthy();
      expect(inner['word/document.xml'], docxName).toBeTruthy();
      const xml = dec.decode(inner['word/document.xml']);
      expect(xml, docxName).toContain('<w:document');
    }
  }, 15000);

  it('Vocabulary Classroom Bundle degrades gracefully when packets_docx.js and audio clips are absent', async () => {
    const dom = new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.scrollTo = () => {};
    const cap = captureZipDownload(w);

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) {
      w.eval(read(src === 'packets_vocab_bank_en.js' ? 'tests/fixtures/packets_vocab_bank_fixture.js' : src));
    }
    await WAIT(40);

    w.AlloPacketPrintCards.ensureDocx = () => Promise.resolve(null);

    const $ = (id) => d.getElementById(id);
    const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));
    $('f-words').value = VOCAB_WORDS;
    fire($('f-words'), 'input');
    await WAIT(100);
    $('next-1').click();
    await WAIT(60);
    $('next-2').click();
    const ready = await waitFor(() => !$('download-bundle').hidden, 8000);
    expect(ready).toBe(true);

    $('download-bundle').click();
    const downloaded = await waitFor(() => !!cap.bytes, 5000);
    expect(downloaded).toBe(true);
    expect($('download-bundle').disabled).toBe(false);

    const entries = readZipEntries(cap.bytes);
    expect(Object.keys(entries).sort()).toEqual([
      '01-Interactive-Packet.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
    ]);
  }, 15000);
});
