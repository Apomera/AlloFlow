import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const ZIP = require('../packets_zip.js');
const RA = require('../packet_read_along_builder.js');
const TABLE = require('../syllable_table_en.js');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { wordlist } = tool.loadParts();

const opened = [];
afterAll(() => {
  opened.forEach((w) => { try { w.close(); } catch (_) {} });
});

const wait = (ms = 10) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, label, tries = 400) => {
  for (let i = 0; i < tries; i++) {
    if (fn()) return;
    await wait(15);
  }
  throw new Error('Timed out waiting for ' + label);
};

async function blobBytes(blob) {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  if (typeof blob.text === 'function') return new TextEncoder().encode(await blob.text());
  return new Uint8Array(0);
}

async function openReadAlongPage() {
  const dom = new JSDOM(read('packets-read-along.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/site/packets-read-along.html',
  });
  const w = dom.window, d = w.document;
  opened.push(w);
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
  const downloads = [];
  const blobsByUrl = new Map();
  let urlSeq = 0;
  w.URL.createObjectURL = (blob) => {
    const u = 'blob:https://packets.test/' + (++urlSeq);
    blobsByUrl.set(u, blob);
    return u;
  };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.push({ name: this.download, href: this.href, blob: blobsByUrl.get(this.href) || null });
  };
  const scripts = [
    'word_sounds_take_home_loader.js',
    'packet_read_along_builder.js',
    'syllable_table_en.js',
    'packets_voice_engine.js',
    'packets_verify_core.js',
    'packets_reopen.js',
    'packets_handoff.js',
    'packets_zip.js',
    'packets-read-along.js',
  ];
  for (const src of scripts) w.eval(read(src));
  return {
    w, d, downloads,
    $: (id) => d.getElementById(id),
    type: (id, text) => {
      d.getElementById(id).value = text;
      d.getElementById(id).dispatchEvent(new w.Event('input', { bubbles: true }));
    },
  };
}

async function openVocabPage() {
  const SCRIPTS = [
    'packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js',
    'packets_reopen.js', 'packets_zip.js', 'packets_handoff.js', 'packets_my_words.js',
    'tests/fixtures/packets_vocab_bank_fixture.js', 'word_sounds_symbols_en.js',
    'word_picture_matcher.js', 'word_sounds_packet_builder.js', 'packets_vocab_media.js',
    'packet_vocab_builder.js', 'packets-print-cards.js', 'packets_word_starters.js',
    'packets-vocab.js',
  ];
  const dom = new JSDOM(read('packets-vocab.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/packets-vocab.html',
  });
  const w = dom.window, d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  const downloads = [];
  const blobsByUrl = new Map();
  let urlSeq = 0;
  w.URL.createObjectURL = (blob) => {
    const u = 'blob:https://packets.test/v-' + (++urlSeq);
    blobsByUrl.set(u, blob);
    return u;
  };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.push({ name: this.download, href: this.href, blob: blobsByUrl.get(this.href) || null });
  };
  for (const src of SCRIPTS) w.eval(read(src));
  await wait(10);
  return {
    w, d, downloads,
    $: (id) => d.getElementById(id),
    fire: (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true })),
  };
}

const SOUND_URLS = ['audio_bank/phonemes.json', 'audio_bank/isolation.json', 'audio_bank/instructions.json', 'word_audio_kokoro_bank.json', 'audio_bank_kokoro.json'];
const tinyAudio = (path) => 'data:audio/webm;base64,' + Buffer.from('clip ' + path).toString('base64');
const shrinkSounds = (val, path) => typeof val === 'string'
  ? (val.startsWith('data:audio') ? tinyAudio(path) : val)
  : (val && typeof val === 'object' ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k, shrinkSounds(v, path + '/' + k)])) : val);
const SOUNDS = Object.fromEntries(SOUND_URLS.map((url) => {
  const txt = read(url);
  return [url, JSON.stringify(shrinkSounds(JSON.parse(txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt), url))];
}));
const STORE_INDEX = 'word_audio_shards/index.json';
const STAND_IN_STORE = (() => {
  const words = wordlist.rows().filter((row) => row.shards && !row.kokoro).map((row) => row.word);
  if (!words.length) return {};
  const files = {}, index = { format: 'alloflow-word-audio-index/1', words: {}, shards: {} };
  for (const word of words) {
    (files[word[0]] = files[word[0]] || { _meta: { format: 'alloflow-word-audio-shard/1', shard: word[0] } })[word] = tinyAudio('store/' + word);
    index.words[word] = word[0];
  }
  const out = {};
  for (const k of Object.keys(files)) {
    out['word_audio_shards/' + k + '.json'] = JSON.stringify(files[k]);
    index.shards[k] = { file: k + '.json', words: Object.keys(files[k]).length - 1, bytes: out['word_audio_shards/' + k + '.json'].length };
  }
  out[STORE_INDEX] = JSON.stringify(index);
  return out;
})();

async function openWordSoundsPage() {
  const SCRIPTS = [
    'packets-page.js', 'word_sounds_phonemes_en.js', 'word_sounds_core.js', 'word_sounds_wordlist_en.js',
    'word_sounds_take_home_loader.js', 'word_sounds_packet_builder.js', 'word_sounds_symbols_en.js',
    'packets_my_words.js', 'packets-words.js', 'packets_verify_core.js', 'packets_reopen.js',
    'packets_handoff.js', 'packets_zip.js', 'packets-print-cards.js', 'packets-make.js',
  ];
  const dom = new JSDOM(read('packets-make.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/packets-make.html',
  });
  const w = dom.window, d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.OfflineAudioContext = class {
    constructor(channels, length, rate) { this.length = length; this.sampleRate = rate; this.destination = {}; this.played = null; }
    decodeAudioData(buffer, done) { done({ duration: 0.004, bytes: new Uint8Array(buffer) }); }
    createBufferSource() { const self = this; return { connect() {}, start() {}, set buffer(v) { self.played = v; } }; }
    startRendering() {
      const from = this.played.bytes, samples = new Float32Array(this.length);
      for (let i = 0; i < samples.length; i++) samples[i] = from[from.length - 1 - (i % from.length)] / 128 - 1;
      return Promise.resolve({ getChannelData: () => samples });
    }
  };
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const downloads = [];
  const blobsByUrl = new Map();
  let urlSeq = 0;
  w.URL.createObjectURL = (blob) => {
    const u = 'blob:https://packets.test/ws-' + (++urlSeq);
    blobsByUrl.set(u, blob);
    return u;
  };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.push({ name: this.download, href: this.href, blob: blobsByUrl.get(this.href) || null });
  };
  w.fetch = async (url) => {
    const u = String(url);
    if (Object.prototype.hasOwnProperty.call(SOUNDS, u)) {
      const body = SOUNDS[u];
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body), headers: { get: () => '' } };
    }
    if (Object.prototype.hasOwnProperty.call(STAND_IN_STORE, u)) {
      const body = STAND_IN_STORE[u];
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body), headers: { get: () => '' } };
    }
    return { ok: false, status: 404, text: async () => '', json: async () => ({}), headers: { get: () => '' } };
  };
  for (const src of SCRIPTS) w.eval(read(src));
  await wait(15);
  return {
    w, d, downloads,
    $: (id) => d.getElementById(id),
    fire: (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true })),
  };
}

describe('Wave 5: Read-Along Printable Student Worksheet (buildReadAlongWorksheetHtml)', () => {
  it('renders strictly monochrome zero-network HTML with Parts 1-4, syllable dots, bold starts, custom supports + SVG, and separate-page Teacher Answer Key', async () => {
    const page = await openReadAlongPage();
    const api = page.w.AlloReadAlongWorksheet;
    expect(api && typeof api.buildReadAlongWorksheetHtml === 'function').toBe(true);

    const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>');
    const sentences = RA.splitPassage('# The Afternoon Hike\nMia walked slowly over the tall bridge. She saw a butterfly near the waterfall.');
    const sureSyl = (word) => {
      const f = TABLE.lookup(word);
      return f && !f.check ? f.parts : null;
    };

    const opts = {
      title: 'Afternoon Hike <Grade 3>',
      sentences,
      lang: 'en',
      showSyllables: true,
      showBold: true,
      showSupports: true,
      syllableLookup: sureSyl,
      customSupports: [
        { line: 1, quote: 'bridge', text: 'A structure built over water or a road.', imgUri: svgUri, alt: 'Bridge diagram' },
        { line: 2, quote: 'waterfall', text: 'Water falling down over steep rocks.', imgUri: 'https://evil.example/track.png', alt: 'Blocked URL' },
      ],
      wordMeanings: {
        butterfly: { w: 'butterfly', d: 'An insect with large colorful wings.' },
      },
      includeAnswerKey: true,
    };

    const teacherHtml = api.buildReadAlongWorksheetHtml(opts);
    // Strict zero-network CSP & monochrome CSS
    expect(teacherHtml).toContain('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; script-src \'none\'">');
    expect(teacherHtml).toContain('@page{margin:12mm}');
    const styleMatch = /<style>([\s\S]*?)<\/style>/.exec(teacherHtml);
    expect(styleMatch).toBeTruthy();
    const hexColors = styleMatch[1].match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    expect(hexColors.length).toBeGreaterThan(0);
    for (const hex of hexColors) expect(['#000000', '#ffffff', '#808080']).toContain(hex.toLowerCase());
    // Escaped title, Name/Date header
    expect(teacherHtml).toContain('Afternoon Hike &lt;Grade 3&gt;');
    expect(teacherHtml).toContain('Name:');
    expect(teacherHtml).toContain('Date:');
    // Parts 1-4 present
    const doc = new JSDOM(teacherHtml).window.document;
    expect(doc.querySelector('[data-ra-part="passage"]')).toBeTruthy();
    expect(doc.querySelector('[data-ra-part="supports"]')).toBeTruthy();
    expect(doc.querySelector('[data-ra-part="matching"]')).toBeTruthy();
    expect(doc.querySelector('[data-ra-part="writing"]')).toBeTruthy();
    // Syllable dots & bold word starts in Part 1
    const passageText = doc.querySelector('[data-ra-part="passage"]').textContent;
    expect(passageText).toContain('Af·ter·noon');
    expect(passageText).toContain('o·ver');
    expect(doc.querySelectorAll('[data-ra-part="passage"] strong').length).toBeGreaterThan(3);
    // Part 2 includes safe data:image/svg+xml and strips https:// URL
    const supImgs = [...doc.querySelectorAll('[data-ra-part="supports"] img')];
    expect(supImgs).toHaveLength(1);
    expect(supImgs[0].getAttribute('src')).toBe(svgUri);
    expect(teacherHtml).not.toContain('evil.example');
    // Part 3 matching: 3 key words (bridge, waterfall, butterfly) with lettered meanings
    expect(doc.querySelectorAll('.ws-match-word')).toHaveLength(3);
    expect(doc.querySelectorAll('.ws-match-def')).toHaveLength(3);
    expect([...doc.querySelectorAll('.ws-match-letter')].map((n) => n.textContent)).toEqual(['A.', 'B.', 'C.']);
    // Part 4 writing: 5 writing lines
    expect(doc.querySelectorAll('.ws-write-line')).toHaveLength(5);
    // Teacher Answer Key on separate page mapping every Part 3 word
    expect(styleMatch[1]).toContain('break-before:page');
    const keySec = doc.querySelector('[data-answer-key="true"]');
    expect(keySec).toBeTruthy();
    const keyItems = [...keySec.querySelectorAll('li')].map((li) => li.textContent);
    expect(keyItems).toHaveLength(3);
    expect(keyItems.join('\n')).toContain('bridge');
    expect(keyItems.join('\n')).toContain('waterfall');
    expect(keyItems.join('\n')).toContain('butterfly');

    // Student copy omits Teacher Answer Key
    const studentHtml = api.buildReadAlongWorksheetHtml({ ...opts, includeAnswerKey: false });
    const sDoc = new JSDOM(studentHtml).window.document;
    expect(sDoc.querySelector('[data-answer-key="true"]')).toBeNull();
    expect(sDoc.querySelector('[data-ra-part="matching"]')).toBeTruthy();
  });

  it('downloads standalone worksheet and 3-file classroom bundle (.zip) from packets-read-along.html', async () => {
    const page = await openReadAlongPage();
    page.type('f-title', 'The Fox');
    page.type('f-text', 'The fox ran to the den. It hid in the tall grass all afternoon.');
    await until(() => !page.$('download-worksheet').hidden && !page.$('download-bundle').hidden, 'read-along buttons shown');

    // Add 2 custom quoted supports so Part 3 + Teacher Answer Key render in the worksheet & bundle.
    page.$('sup-quote').value = 'den';
    page.$('sup-text').value = 'A small wild animal home.';
    page.$('sup-add').click();
    page.$('sup-quote').value = 'tall grass';
    page.$('sup-text').value = 'Long grass where animals can hide.';
    page.$('sup-add').click();
    await until(() => !page.$('download-bundle').hidden, 'rebuilt with supports');

    // 1. Standalone worksheet download
    page.$('download-worksheet').click();
    expect(page.downloads.length).toBe(1);
    expect(page.downloads[0].name).toBe('The-Fox-read-along-worksheet.html');
    const wsText = new TextDecoder('utf-8').decode(await blobBytes(page.downloads[0].blob));
    expect(wsText).toContain('Part 1 \u2014 Read the Passage');
    expect(wsText).toContain('data-answer-key="true"');

    // 2. Classroom bundle (.zip) download
    page.$('download-bundle').click();
    expect(page.downloads.length).toBe(2);
    expect(page.downloads[1].name).toBe('The-Fox-classroom-bundle.zip');
    const zBytes = await blobBytes(page.downloads[1].blob);
    expect(Array.from(zBytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const entries = ZIP.readZip(zBytes);
    expect(entries.map((e) => e.name)).toEqual([
      '01-Interactive-Read-Along.html',
      '02-Student-Worksheet.html',
      '03-Teacher-Answer-Key.html',
    ]);
    expect(entries.every((e) => e.crcOk)).toBe(true);
    const dec = new TextDecoder('utf-8');
    const interactive = dec.decode(entries[0].bytes);
    const studentWs = dec.decode(entries[1].bytes);
    const teacherKey = dec.decode(entries[2].bytes);
    expect(interactive).toContain("connect-src 'none'");
    expect(studentWs).toContain("script-src 'none'");
    expect(studentWs).not.toContain('data-answer-key="true"');
    expect(teacherKey).toContain("script-src 'none'");
    expect(teacherKey).toContain('data-answer-key="true"');
  }, 60000);
});

describe('Wave 5: 1-Click Classroom Bundle (.zip) on Word Sounds and Vocabulary makers', () => {
  it('downloads 4-file classroom bundle (.zip) from packets-vocab.html', async () => {
    const p = await openVocabPage();
    p.$('f-words').value = 'habitat, predator, prey, cell, bat';
    p.fire(p.$('f-words'), 'input');
    await wait(300);
    p.$('next-1').click();
    p.$('next-2').click();
    await until(() => !p.$('download-bundle').hidden, 'vocab download-bundle visible');

    p.$('download-bundle').click();
    const dl = p.downloads.find((d) => d.name.endsWith('-classroom-bundle.zip'));
    expect(dl).toBeTruthy();
    const zBytes = await blobBytes(dl.blob);
    expect(Array.from(zBytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const entries = ZIP.readZip(zBytes);
    expect(entries.map((e) => e.name)).toEqual([
      '01-Interactive-Packet.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
    ]);
    expect(entries.every((e) => e.crcOk)).toBe(true);
    const dec = new TextDecoder('utf-8');
    const interactive = dec.decode(entries[0].bytes);
    const scaffolded = dec.decode(entries[1].bytes);
    const independent = dec.decode(entries[2].bytes);
    const teacherKey = dec.decode(entries[3].bytes);
    expect(interactive).toContain("connect-src 'none'");
    expect(scaffolded).toContain("script-src 'none'");
    expect(scaffolded).toContain('data-vocab-word-bank="true"');
    expect(scaffolded).not.toContain('For the teacher');
    expect(independent).toContain("script-src 'none'");
    expect(independent).not.toContain('data-vocab-word-bank="true"');
    expect(independent).not.toContain('For the teacher');
    expect(teacherKey).toContain("script-src 'none'");
    expect(teacherKey).toContain('For the teacher');
  }, 60000);

  it('downloads 4-file classroom bundle (.zip) from packets-make.html (Word Sounds)', async () => {
    const p = await openWordSoundsPage();
    await until(() => !p.$('step-1').hidden, 'word sounds step 1 ready');
    p.$('quick-make').click();
    await until(() => !p.$('save').hidden && !p.$('download-bundle').hidden, 'word sounds bundle button visible');

    p.$('download-bundle').click();
    const dl = p.downloads.find((d) => d.name.endsWith('-classroom-bundle.zip'));
    expect(dl).toBeTruthy();
    const zBytes = await blobBytes(dl.blob);
    expect(Array.from(zBytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const entries = ZIP.readZip(zBytes);
    expect(entries.map((e) => e.name)).toEqual([
      '01-Interactive-Packet.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
    ]);
    expect(entries.every((e) => e.crcOk)).toBe(true);
    const dec = new TextDecoder('utf-8');
    const interactive = dec.decode(entries[0].bytes);
    const scaffolded = dec.decode(entries[1].bytes);
    const independent = dec.decode(entries[2].bytes);
    const teacherKey = dec.decode(entries[3].bytes);
    expect(interactive).toContain("connect-src 'none'");
    expect(scaffolded).toContain("script-src 'none'");
    expect(scaffolded).not.toContain('For the teacher');
    expect(independent).toContain("script-src 'none'");
    expect(independent).not.toContain('For the teacher');
    expect(teacherKey).toContain("script-src 'none'");
    expect(teacherKey).toContain('For the teacher');
  }, 60000);
});
