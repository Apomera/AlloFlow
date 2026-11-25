// Wave 41 (2026-11-25): End-to-end integration tests for:
// 1. Live Worksheet Customizer on Word Sounds & Vocabulary (title, subtitle, Class/Score headers,
//    Primary density, section hide/copy overrides, item hide/restore + clean 1..N renumbering,
//    synced across live preview, HTML export, .docx export, and Audio Companion / Scoring Sheet).
// 2. Read-Along interactive Worksheet Preview (#preview-worksheet -> openReadAlongWorksheet,
//    section toggle, custom directions, RTL support, HTML export, .docx export, Jump to Audio).
// 3. Word Sounds Step 3 Item-Level Editor (#ws-item-editor section reorder, remove/restore + last-item
//    guard, audio-backed distractor swap + missing_letter distractor text edit, reset, full sync
//    into rebuilt student HTML, #summary-facts, #print-worksheet, and classroom bundle).
// 4. Genuine offline OOXML .docx exports from all 4 entry points (#pc-ws-docx, #pc-vocab-docx,
//    #pc-ra-docx, #pc-audio-docx-score) plus on-demand ensureDocx() lazy-loading, verified via
//    AlloPacketZip.readZip().
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { resolve } from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const ZIP = require('../packets_zip.js');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { wordlist } = tool.loadParts();

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const OOXML_PARTS = [
  '[Content_Types].xml',
  '_rels/.rels',
  'word/_rels/document.xml.rels',
  'word/document.xml',
  'word/styles.xml',
];

const opened = [];
afterAll(() => {
  while (opened.length) {
    try { opened.pop().close(); } catch (_) {}
  }
});

const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, label, tries = 400) => {
  for (let i = 0; i < tries; i++) {
    if (fn()) return;
    await wait(15);
  }
  throw new Error('Timed out waiting for ' + label);
};

function wavUri(tag = 'clip') {
  const buf = Buffer.alloc(96);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(88, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(24000, 24);
  buf.writeUInt32LE(48000, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(52, 40);
  buf.write(String(tag).slice(0, 12), 44);
  return 'data:audio/wav;base64,' + buf.toString('base64');
}

function attachBrowserMocks(w, prefix = 'dl') {
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  const NodeBlob = globalThis.Blob;
  w.Blob = function MockBlob(parts, options) {
    const normalized = Array.isArray(parts)
      ? parts.map((p) => (ArrayBuffer.isView(p) ? Buffer.from(p.buffer, p.byteOffset, p.byteLength) : p))
      : [];
    return new NodeBlob(normalized, options);
  };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
  const downloads = [];
  const blobsByUrl = new Map();
  let seq = 0;
  w.URL.createObjectURL = (blob) => {
    const u = `blob:https://packets.test/${prefix}-${++seq}`;
    blobsByUrl.set(u, blob);
    return u;
  };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download) {
      downloads.push({
        name: this.download,
        href: this.href,
        blob: blobsByUrl.get(this.href) || null,
      });
    }
  };
  return { downloads, blobsByUrl };
}

async function readDocxDownload(dl, win) {
  expect(dl, 'expected a download record').toBeTruthy();
  expect(dl.name.endsWith('.docx'), dl.name).toBe(true);
  expect(dl.blob, 'expected blob for ' + dl.name).toBeTruthy();
  expect(dl.blob.type).toBe(DOCX_MIME);
  const bytes = new Uint8Array(await dl.blob.arrayBuffer());
  const parsed = ZIP.readZip(bytes);
  expect(parsed.length).toBe(5);
  const byName = Object.create(null);
  for (const entry of parsed) {
    expect(entry.crcOk, `${dl.name} -> ${entry.name} crcOk`).toBe(true);
    byName[entry.name] = new TextDecoder().decode(entry.bytes);
  }
  expect(Object.keys(byName).sort()).toEqual(OOXML_PARTS);
  if (win && typeof win.DOMParser === 'function') {
    for (const part of OOXML_PARTS) {
      const xmlDoc = new win.DOMParser().parseFromString(byName[part], 'application/xml');
      expect(xmlDoc.querySelector('parsererror'), `${dl.name} -> ${part} XML valid`).toBeNull();
    }
  }
  return { bytes, byName };
}

async function buildWordSoundsLesson() {
  const { dictionary, core, loader, wordlist: wl, builder } = tool.loadParts();
  const shrink = (val, p) => (typeof val === 'string'
    ? (val.startsWith('data:audio') ? wavUri(p) : val)
    : (val && typeof val === 'object'
      ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k, shrink(v, p + '/' + k)]))
      : val));
  const banks = shrink(tool.loadBanks({ shards: false }), 'b');
  const res = await builder.buildPacket({
    words: ['cat', 'top', 'sun', 'hat'],
    activities: ['isolation', 'blending', 'missing_letter', 'orthography'],
    seed: 7,
    title: 'Short Vowel Check',
    core,
    dictionary,
    banks,
    loader,
    wordlist: wl,
    allowUnconverted: true,
  });
  return res.lesson;
}

function makeVocabState() {
  const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>');
  return {
    title: 'Ecosystem Words',
    entries: [
      { word: 'habitat', meaning: 'the natural home of a plant or animal', example: 'A pond is a frog habitat.', blank: 'A pond is a frog ___.', blankAnswer: 'habitat', picture: svg },
      { word: 'predator', meaning: 'an animal that hunts other animals for food', example: 'An owl is a quiet predator.', blank: 'An owl is a quiet ___.', blankAnswer: 'predator', picture: svg },
      { word: 'prey', meaning: 'an animal that is hunted by another animal', example: 'Rabbits are prey for foxes.', blank: 'Rabbits are ___ for foxes.', blankAnswer: 'prey', picture: svg },
    ],
    wordClips: {
      habitat: wavUri('w_habitat'),
      predator: wavUri('w_predator'),
      prey: wavUri('w_prey'),
    },
    meaningClips: {
      'the natural home of a plant or animal': wavUri('m_habitat'),
      'an animal that hunts other animals for food': wavUri('m_predator'),
      'an animal that is hunted by another animal': wavUri('m_prey'),
    },
    wordBank: true,
    pictures: true,
  };
}

function makeReadAlongPayload(opts = {}) {
  const isRtl = !!opts.isRtl;
  if (isRtl) {
    return {
      title: 'قصة الصباح',
      lang: 'ar',
      sentences: [
        { text: 'ذهب سامي إلى المدرسة مبكرا.', key: 'ar1' },
        { text: 'قرأ كتابا جميلا مع أصدقائه.', key: 'ar2', para: true },
      ],
      clips: {
        ar1: { uri: wavUri('ar1'), ms: 900, source: 'teacher' },
        ar2: { uri: wavUri('ar2'), ms: 900, source: 'teacher' },
      },
      showSyllables: false,
      showBold: false,
      showSupports: true,
      customSupports: [
        { line: 0, quote: 'مبكرا', text: 'في بداية اليوم.', audioUri: wavUri('ar_sup') },
      ],
      questions: [
        { kind: 'mc', prompt: 'أين ذهب سامي؟', choices: ['إلى المدرسة', 'إلى البحر'], answer: 0 },
      ],
      wordMeanings: [],
      includeAnswerKey: true,
      writeLines: 5,
    };
  }
  return {
    title: 'The Fox in the Grass',
    lang: 'en',
    sentences: [
      { text: 'The fox ran to the den.', key: 'the fox ran to the den.' },
      { text: 'It hid in the tall grass.', key: 'it hid in the tall grass.' },
      { text: 'Then the sun went down.', key: 'then the sun went down.', para: true },
    ],
    clips: {
      'the fox ran to the den.': { uri: wavUri('s1'), ms: 900, source: 'computer' },
      'it hid in the tall grass.': { uri: wavUri('s2'), ms: 950, source: 'computer' },
      'then the sun went down.': { uri: wavUri('s3'), ms: 850, source: 'teacher' },
    },
    showSyllables: false,
    showBold: true,
    showSupports: true,
    customSupports: [
      { line: 0, quote: 'den', text: 'A safe home where a fox rests.', audioUri: wavUri('sup1') },
    ],
    questions: [
      { kind: 'mc', prompt: 'Where did the fox hide?', choices: ['In the tall grass', 'On the roof', 'In the pond'], answer: 0 },
      { kind: 'open', prompt: 'Why did the fox come out after sunset?' },
    ],
    wordMeanings: [
      { word: 'den', meaning: 'a wild animal home' },
      { word: 'grass', meaning: 'short green plants covering the ground' },
    ],
    includeAnswerKey: true,
    writeLines: 5,
  };
}

function setInput(win, el, value) {
  el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

function setChange(win, el, value) {
  if (el.type === 'checkbox') el.checked = !!value;
  else el.value = value;
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

// Lazy sound bank fixtures for mounting full packets-make.html in JSDOM
const SOUND_URLS = [
  'audio_bank/phonemes.json',
  'audio_bank/isolation.json',
  'audio_bank/instructions.json',
  'word_audio_kokoro_bank.json',
  'audio_bank_kokoro.json',
];
const shrinkSounds = (val, p) => (typeof val === 'string'
  ? (val.startsWith('data:audio') ? wavUri(p) : val)
  : (val && typeof val === 'object'
    ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k, shrinkSounds(v, p + '/' + k)]))
    : val));
let cachedSounds = null;
let cachedStore = null;
function getMakeFixtures() {
  if (!cachedSounds) {
    cachedSounds = Object.fromEntries(SOUND_URLS.map((url) => {
      const txt = read(url);
      const parsed = JSON.parse(txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt);
      return [url, JSON.stringify(shrinkSounds(parsed, url))];
    }));
  }
  if (!cachedStore) {
    const words = wordlist.rows().filter((r) => r.shards && !r.kokoro).map((r) => r.word);
    const files = {};
    const index = { format: 'alloflow-word-audio-index/1', words: {}, shards: {} };
    for (const word of words) {
      const s = word[0];
      files[s] = files[s] || { _meta: { format: 'alloflow-word-audio-shard/1', shard: s } };
      files[s][word] = wavUri('store/' + word);
      index.words[word] = s;
    }
    const out = {};
    for (const k of Object.keys(files)) {
      out['word_audio_shards/' + k + '.json'] = JSON.stringify(files[k]);
      index.shards[k] = { file: k + '.json', words: Object.keys(files[k]).length - 1, bytes: out['word_audio_shards/' + k + '.json'].length };
    }
    out['word_audio_shards/index.json'] = JSON.stringify(index);
    cachedStore = out;
  }
  return { SOUNDS: cachedSounds, STORE: cachedStore };
}

async function openWordSoundsMakerPage() {
  const { SOUNDS, STORE } = getMakeFixtures();
  const SCRIPTS = [
    'packets-page.js', 'word_sounds_phonemes_en.js', 'word_sounds_core.js', 'word_sounds_wordlist_en.js',
    'word_sounds_take_home_loader.js', 'word_sounds_packet_builder.js', 'word_sounds_symbols_en.js',
    'packets_my_words.js', 'packets-words.js', 'packets_verify_core.js', 'packets_reopen.js',
    'packets_handoff.js', 'packets_zip.js', 'packets_docx.js', 'packets-print-cards.js', 'packets-make.js',
  ];
  const dom = new JSDOM(read('packets-make.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/packets-make.html',
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  const { downloads, blobsByUrl } = attachBrowserMocks(w, 'make');
  w.OfflineAudioContext = class {
    constructor(channels, length, rate) { this.length = length; this.sampleRate = rate; this.destination = {}; this.played = null; }
    decodeAudioData(buffer, done) { done({ duration: 0.004, bytes: new Uint8Array(buffer) }); }
    createBufferSource() { const self = this; return { connect() {}, start() {}, set buffer(v) { self.played = v; } }; }
    startRendering() {
      const from = this.played.bytes;
      const samples = new Float32Array(this.length);
      for (let i = 0; i < samples.length; i++) samples[i] = from[from.length - 1 - (i % from.length)] / 128 - 1;
      return Promise.resolve({ getChannelData: () => samples });
    }
  };
  w.fetch = async (url) => {
    const u = String(url);
    if (Object.prototype.hasOwnProperty.call(SOUNDS, u)) {
      const body = SOUNDS[u];
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body), headers: { get: () => '' } };
    }
    if (Object.prototype.hasOwnProperty.call(STORE, u)) {
      const body = STORE[u];
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body), headers: { get: () => '' } };
    }
    return { ok: false, status: 404, text: async () => '', json: async () => ({}), headers: { get: () => '' } };
  };
  for (const src of SCRIPTS) w.eval(read(src));
  await wait(20);
  return { w, d, downloads, blobsByUrl, $: (id) => d.getElementById(id) };
}

describe('Wave 41A: Live Worksheet Customizer + .docx + Audio/Scoring Sync (Word Sounds & Vocab)', () => {
  it('customizes Word Sounds worksheet live, syncs HTML + .docx + Audio Companion & Scoring Sheet (.docx), and restores/resets cleanly', async () => {
    const lesson = await buildWordSoundsLesson();
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-make.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const { downloads } = attachBrowserMocks(w, 'ws');
    w.eval(read('packets_zip.js'));
    w.eval(read('packets-print-cards.js'));

    const PC = w.AlloPacketPrintCards;
    PC.openWorksheet({ title: 'Short Vowel Check', lesson, audio: lesson.audio });

    // Customizer starts collapsed by default
    const cust = d.getElementById('pc-ws-customizer');
    expect(cust).toBeTruthy();
    expect(cust.open).toBe(false);
    cust.open = true;

    // 1. Custom title, subtitle, Class/Period + Score headers, Primary density
    setInput(w, d.getElementById('pc-ws-cust-title'), 'Friday Short Vowel Check');
    setInput(w, d.getElementById('pc-ws-cust-subtitle'), 'Small Group B — read each direction aloud');
    setChange(w, d.getElementById('pc-ws-cust-class'), true);
    setChange(w, d.getElementById('pc-ws-cust-score'), true);
    setChange(w, d.getElementById('pc-ws-cust-density'), 'primary');

    let sheet = d.querySelector('#print-worksheet-view .pc-ws-sheet');
    expect(sheet.classList.contains('pc-density-primary')).toBe(true);
    expect(sheet.textContent).toContain('Friday Short Vowel Check');
    expect(sheet.textContent).toContain('Small Group B — read each direction aloud');
    expect(sheet.textContent).toContain('Class / Period:');
    expect(sheet.textContent).toContain('Score:');

    // 2. Hide a section (orthography) and customize heading + directions of isolation
    const hideOrtho = cust.querySelector('input[data-cust-sec-vis="orthography"]');
    expect(hideOrtho).toBeTruthy();
    setChange(w, hideOrtho, false);
    expect(d.querySelector('#print-worksheet-view .pc-ws-section[data-activity="orthography"]')).toBeNull();

    const isoHeadInp = cust.querySelector('input[data-cust-sec-heading="isolation"]');
    const isoDirInp = cust.querySelector('input[data-cust-sec-dir="isolation"]');
    setInput(w, isoHeadInp, 'Part A: Target Sounds');
    setInput(w, isoDirInp, 'Listen carefully and circle the matching sound.');
    const isoSec = d.querySelector('#print-worksheet-view .pc-ws-section[data-activity="isolation"]');
    expect(isoSec.querySelector('.pc-ws-section-title').textContent).toBe('Part A: Target Sounds');
    expect(isoSec.querySelector('.pc-ws-directions').textContent).toBe('Listen carefully and circle the matching sound.');

    // 3. Hide the first item in isolation and verify clean 1..N renumbering + live hidden count
    const isoChips = [...cust.querySelectorAll('.pc-cust-sec-card[data-cust-section="isolation"] .pc-cust-chip')];
    expect(isoChips.length).toBeGreaterThanOrEqual(3);
    const beforeIsoCount = isoSec.querySelectorAll('.pc-ws-item').length;
    isoChips[0].click();
    expect(d.getElementById('pc-ws-cust-hidden-count').textContent).toContain('1 item hidden');
    const afterIsoNums = [...d.querySelectorAll('#print-worksheet-view .pc-ws-section[data-activity="isolation"] .pc-ws-num')].map((n) => n.textContent.trim());
    expect(afterIsoNums.length).toBe(beforeIsoCount - 1);
    expect(afterIsoNums).toEqual(afterIsoNums.map((_, i) => `${i + 1}.`));

    // 4. HTML export reflects all customizations
    const dlHtmlBtn = [...d.querySelectorAll('#print-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    dlHtmlBtn.click();
    const htmlDl = downloads[downloads.length - 1];
    expect(htmlDl.name.endsWith('.html')).toBe(true);
    const exportedHtml = await htmlDl.blob.text();
    expect(exportedHtml).toContain('Friday Short Vowel Check');
    expect(exportedHtml).toContain('Small Group B — read each direction aloud');
    expect(exportedHtml).toContain('Class / Period:');
    expect(exportedHtml).toContain('ws-density-primary');
    expect(exportedHtml).toContain('Part A: Target Sounds');
    expect(exportedHtml).not.toContain('data-activity="orthography"');

    // 5. Lazy-load packets_docx.js via #pc-ws-docx (only 1 script tag ever injected) & verify genuine .docx
    expect(w.AlloPacketDocx).toBeUndefined();
    const docxBtn = d.getElementById('pc-ws-docx');
    docxBtn.click();
    const lazyScripts = d.querySelectorAll('script[data-allo-docx="1"]');
    expect(lazyScripts.length).toBe(1);
    expect(lazyScripts[0].getAttribute('src')).toBe('packets_docx.js');
    w.eval(read('packets_docx.js'));
    lazyScripts[0].dispatchEvent(new w.Event('load'));
    await wait(20);

    const wsDocxDl = downloads[downloads.length - 1];
    const { byName: wsDocxXml } = await readDocxDownload(wsDocxDl, w);
    expect(wsDocxXml['word/document.xml']).toContain('Friday Short Vowel Check');
    expect(wsDocxXml['word/document.xml']).toContain('Small Group B');
    expect(wsDocxXml['word/document.xml']).toContain('Class / Period:');
    expect(wsDocxXml['word/document.xml']).toContain('Score:');
    expect(wsDocxXml['word/document.xml']).toContain('Part A: Target Sounds');
    expect(wsDocxXml['word/document.xml']).toContain('Listen carefully and circle the matching sound.');
    expect(wsDocxXml['word/document.xml']).toContain('<w:br w:type="page"/>');
    // Primary density -> 13.5pt = 27 half-points in styles.xml
    expect(wsDocxXml['word/styles.xml']).toContain('w:sz w:val="27"');
    // Clicking again reuses loaded AlloPacketDocx and never injects a 2nd script tag
    docxBtn.click();
    await wait(15);
    expect(d.querySelectorAll('script[data-allo-docx="1"]').length).toBe(1);

    // 6. Jump to Worksheet Audio Player keeps customized title, visible sections, and visible item count 1-to-1!
    const audioBtn = [...d.querySelectorAll('#print-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Worksheet audio player'));
    expect(audioBtn && !audioBtn.hidden).toBe(true);
    audioBtn.click();
    const audioView = d.getElementById('worksheet-audio-view');
    expect(audioView && !audioView.hidden).toBe(true);
    expect(audioView.textContent).toContain('Friday Short Vowel Check');
    expect(audioView.textContent).toContain('Part A: Target Sounds');
    expect(audioView.textContent).not.toContain('Spell the word');

    // Download scoring sheet (.docx) from Audio Companion -> genuine .docx matching customized plan!
    const scoreDocxBtn = d.getElementById('pc-audio-docx-score');
    expect(scoreDocxBtn).toBeTruthy();
    scoreDocxBtn.click();
    await wait(20);
    const scoreDl = downloads[downloads.length - 1];
    const { byName: scoreXml } = await readDocxDownload(scoreDl, w);
    expect(scoreXml['word/document.xml']).toContain('Friday Short Vowel Check');
    expect(scoreXml['word/document.xml']).toContain('Teacher Record &amp; Scoring Sheet');
    expect(scoreXml['word/document.xml']).toContain('Part A: Target Sounds');
    expect(scoreXml['word/document.xml']).toContain('[1]  [0]');

    // 7. Restore all items & Reset customizations on Word Sounds preview
    PC.closeWorksheetAudio();
    PC.openWorksheet({ title: 'Short Vowel Check', lesson, audio: lesson.audio });
    d.getElementById('pc-ws-customizer').open = true;
    const chip2 = d.querySelector('#pc-ws-customizer .pc-cust-chip');
    chip2.click();
    expect(d.getElementById('pc-ws-cust-hidden-count').textContent).toContain('1 item hidden');
    d.getElementById('pc-ws-cust-restore').click();
    expect(d.getElementById('pc-ws-cust-hidden-count').textContent).toContain('All items shown');
    setInput(w, d.getElementById('pc-ws-cust-title'), 'Temporary Title');
    d.getElementById('pc-ws-cust-reset').click();
    expect(d.querySelector('#print-worksheet-view .pc-ws-title').textContent).toBe('Short Vowel Check');
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').classList.contains('pc-density-standard')).toBe(true);
  }, 30000);

  it('customizes Vocabulary worksheet live, renumbers hidden words, exports HTML & .docx, and syncs Vocab Audio', async () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-vocab.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const { downloads } = attachBrowserMocks(w, 'voc');
    w.eval(read('packets_zip.js'));
    w.eval(read('packets_docx.js'));
    w.eval(read('packets-print-cards.js'));

    const PC = w.AlloPacketPrintCards;
    PC.openVocabWorksheet(makeVocabState());

    const cust = d.getElementById('pc-vocab-customizer');
    expect(cust && !cust.open).toBe(true);
    cust.open = true;

    setInput(w, d.getElementById('pc-vocab-cust-title'), 'Unit 3 Science Vocab');
    setInput(w, d.getElementById('pc-vocab-cust-subtitle'), 'Use complete spelling');
    setChange(w, d.getElementById('pc-vocab-cust-class'), true);
    setChange(w, d.getElementById('pc-vocab-cust-score'), true);
    setChange(w, d.getElementById('pc-vocab-cust-density'), 'primary');

    // Hide Part 3 (pictures) and hide 1 word chip ('predator')
    const hidePics = cust.querySelector('input[data-cust-sec-vis="pictures"]');
    expect(hidePics).toBeTruthy();
    setChange(w, hidePics, false);
    expect(d.querySelector('#print-vocab-worksheet-view .pc-vocab-pictures')).toBeNull();

    const chips = [...cust.querySelectorAll('.pc-cust-chip')];
    expect(chips.length).toBe(3);
    const predChip = chips.find((c) => c.textContent.toLowerCase().includes('predator'));
    expect(predChip).toBeTruthy();
    predChip.click();
    expect(d.getElementById('pc-vocab-cust-hidden-count').textContent).toContain('1 item hidden');

    // Remaining 2 matching words renumber cleanly 1., 2.
    const matchNums = [...d.querySelectorAll('#print-vocab-worksheet-view .pc-vocab-match-words .pc-ws-num')].map((n) => n.textContent.trim());
    expect(matchNums).toEqual(['1.', '2.']);
    const sheet = d.querySelector('#print-vocab-worksheet-view .pc-ws-sheet');
    expect(sheet.classList.contains('pc-density-primary')).toBe(true);
    expect(sheet.textContent).not.toContain('predator');

    // HTML export sync
    const htmlBtn = [...d.querySelectorAll('#print-vocab-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    htmlBtn.click();
    const htmlOut = await downloads[downloads.length - 1].blob.text();
    expect(htmlOut).toContain('Unit 3 Science Vocab');
    expect(htmlOut).toContain('Use complete spelling');
    expect(htmlOut).toContain('ws-density-primary');
    expect(htmlOut).not.toContain('predator');

    // .docx export sync (#pc-vocab-docx)
    d.getElementById('pc-vocab-docx').click();
    await wait(20);
    const { byName } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(byName['word/document.xml']).toContain('Unit 3 Science Vocab');
    expect(byName['word/document.xml']).toContain('Use complete spelling');
    expect(byName['word/document.xml']).toContain('Class / Period:');
    expect(byName['word/document.xml']).toContain('habitat');
    expect(byName['word/document.xml']).not.toContain('predator');
    expect(byName['word/styles.xml']).toContain('w:sz w:val="27"');

    // Jump to Audio syncs customized vocab title & filtered entries
    const audioBtn = [...d.querySelectorAll('#print-vocab-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Worksheet audio player'));
    expect(audioBtn && !audioBtn.hidden).toBe(true);
    audioBtn.click();
    const audioView = d.getElementById('worksheet-audio-view');
    expect(audioView && !audioView.hidden).toBe(true);
    expect(audioView.textContent).toContain('Unit 3 Science Vocab');
    expect(audioView.textContent).not.toContain('predator');
  });
});

describe('Wave 41B: Read-Along Interactive Worksheet Preview, Customizer, RTL .docx & Audio Handoff', () => {
  it('wires #preview-worksheet in packets-read-along.html, customizes sections/directions, exports HTML & RTL .docx, and jumps to Audio Player', async () => {
    const dom = new JSDOM(read('packets-read-along.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-read-along.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const { downloads } = attachBrowserMocks(w, 'ra');

    // Exact 15 initial head assets + proof disclosure for packets_docx.js
    const headAssets = [...d.querySelectorAll('link[rel="stylesheet"][href], script[src]')];
    expect(headAssets).toHaveLength(15);
    expect(d.querySelector('details.proof').textContent).toContain('packets_docx.js');

    for (const src of [
      'word_sounds_take_home_loader.js',
      'packet_read_along_builder.js',
      'syllable_table_en.js',
      'packets_voice_engine.js',
      'packets_verify_core.js',
      'packets_reopen.js',
      'packets_handoff.js',
      'packets_zip.js',
      'packets_docx.js',
      'packets-print-cards.js',
      'packets-read-along.js',
    ]) {
      w.eval(read(src));
    }
    await wait(25);

    // Typing a passage reveals #preview-worksheet right beside #download-worksheet
    const previewBtn = d.getElementById('preview-worksheet');
    expect(previewBtn).toBeTruthy();
    expect(previewBtn.hidden).toBe(true);

    setInput(w, d.getElementById('f-title'), 'The Fox in the Grass');
    setInput(w, d.getElementById('f-text'), 'The fox ran to the den. It hid in the tall grass.');
    await until(() => !previewBtn.hidden, '#preview-worksheet visible');
    expect(previewBtn.hidden).toBe(false);

    // Click #preview-worksheet -> opens #print-read-along-worksheet-view
    previewBtn.click();
    await wait(25);
    const raView = d.getElementById('print-read-along-worksheet-view');
    expect(raView && !raView.hidden).toBe(true);

    // Now open rich Read-Along payload (with notes, key words, questions, clips) to verify every part
    const PC = w.AlloPacketPrintCards;
    PC.openReadAlongWorksheet(makeReadAlongPayload());
    const cust = d.getElementById('pc-ra-customizer');
    expect(cust && !cust.open).toBe(true);
    cust.open = true;

    // Toggle Reading Notes section off & customize Part 1 directions + title + subtitle + Primary density
    const supToggle = cust.querySelector('input[data-cust-sec-vis="supports"]');
    expect(supToggle).toBeTruthy();
    setChange(w, supToggle, false);
    expect(d.querySelector('#print-read-along-worksheet-view [data-ra-part="supports"]')).toBeNull();

    setInput(w, d.getElementById('pc-ra-cust-title'), 'Fox Passage Check');
    setInput(w, d.getElementById('pc-ra-cust-subtitle'), 'Read twice before answering');
    setChange(w, d.getElementById('pc-ra-cust-density'), 'primary');
    const p1Dir = cust.querySelector('input[data-cust-sec-dir="passage"]');
    setInput(w, p1Dir, 'Whisper-read each sentence twice.');

    const sheet = d.querySelector('#print-read-along-worksheet-view .pc-ws-sheet');
    expect(sheet.classList.contains('pc-density-primary')).toBe(true);
    expect(sheet.textContent).toContain('Fox Passage Check');
    expect(sheet.textContent).toContain('Whisper-read each sentence twice.');

    // HTML export sync
    const htmlBtn = [...d.querySelectorAll('#print-read-along-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    htmlBtn.click();
    const htmlText = await downloads[downloads.length - 1].blob.text();
    expect(htmlText).toContain('Fox Passage Check');
    expect(htmlText).toContain('Whisper-read each sentence twice.');
    expect(htmlText).toContain('ws-density-primary');
    expect(htmlText).not.toContain('Reading Notes &amp; Visual Supports');

    // .docx export (#pc-ra-docx)
    d.getElementById('pc-ra-docx').click();
    await wait(20);
    const { byName: ltrXml } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(ltrXml['word/document.xml']).toContain('Fox Passage Check');
    expect(ltrXml['word/document.xml']).toContain('Whisper-read each sentence twice.');
    expect(ltrXml['word/document.xml']).toContain('Where did the fox hide?');
    expect(ltrXml['word/document.xml']).toContain('<w:br w:type="page"/>');
    expect(ltrXml['word/styles.xml']).toContain('w:sz w:val="27"');

    // Jump to Audio Player
    const audioBtn = [...d.querySelectorAll('#print-read-along-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Worksheet audio player'));
    expect(audioBtn && !audioBtn.hidden).toBe(true);
    audioBtn.click();
    const audioView = d.getElementById('worksheet-audio-view');
    expect(audioView && !audioView.hidden).toBe(true);
    expect(audioView.textContent).toContain('Fox Passage Check');
    PC.closeWorksheetAudio();

    // RTL (Arabic) Read-Along preview sets dir="rtl" and emits <w:bidi/> in .docx!
    PC.openReadAlongWorksheet(makeReadAlongPayload({ isRtl: true }));
    expect(d.querySelector('#print-read-along-worksheet-view .pc-ws-sheet').getAttribute('dir')).toBe('rtl');
    d.getElementById('pc-ra-docx').click();
    await wait(20);
    const { byName: rtlXml } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(rtlXml['word/document.xml']).toContain('<w:bidi/>');
    expect(rtlXml['word/document.xml']).toContain('قصة الصباح');
  });
});

describe('Wave 41C: Word Sounds Step 3 Item-Level Editor (#ws-item-editor)', () => {
  it('reorders sections, removes/restores items with last-item guard, swaps & edits distractors, syncs built HTML + worksheet, and resets cleanly', async () => {
    const page = await openWordSoundsMakerPage();
    const { w, d, $, blobsByUrl } = page;

    // Step 1: Select 3 activities including missing_letter (editable letter distractors) & isolation (audio-backed swap)
    const wanted = ['isolation', 'missing_letter', 'blending'];
    for (const box of [...d.querySelectorAll('#strands input[type="checkbox"]')]) {
      const shouldCheck = wanted.includes(box.value);
      if (box.checked !== shouldCheck) {
        box.checked = shouldCheck;
        box.dispatchEvent(new w.Event('change', { bubbles: true }));
      }
    }
    $('next-1').click();
    await wait(25);

    // Step 2: Type our own short vowel words so items are deterministic and fast
    const ownRadio = d.querySelector('input[name="mode"][value="own"]');
    ownRadio.checked = true;
    ownRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    setInput(w, $('f-own'), 'cat top sun hat');
    await wait(30);
    $('next-2').click();

    // Wait for Step 3 build to complete and reveal #ws-item-editor
    await until(() => $('save') && !$('save').hidden && $('ws-item-editor') && !$('ws-item-editor').hidden, 'Step 3 build and #ws-item-editor');

    const editor = $('ws-item-editor');
    expect(editor.open).toBe(false);
    editor.open = true;

    const getSectionOrder = () => [...d.querySelectorAll('#ws-item-list [data-ie-section]')].map((el) => el.getAttribute('data-ie-section'));
    const origOrder = getSectionOrder();
    expect(origOrder.length).toBe(3);

    const getBuiltHtml = async () => {
      const href = $('try').getAttribute('href') || '';
      const blobUrl = href.split('#')[1];
      const blob = blobsByUrl.get(blobUrl);
      expect(blob).toBeTruthy();
      return blob.text();
    };
    const origFacts = $('summary-facts').textContent;
    const origHtml = await getBuiltHtml();
    expect($('ws-item-editor-now').textContent).toMatch(/^All \d+ items active$/);

    // 1. Reorder: move first section down
    const firstAct = origOrder[0];
    const moveDownBtn = d.querySelector(`#ws-item-list [data-ie-move="down"][data-ie-activity="${firstAct}"]`);
    expect(moveDownBtn && !moveDownBtn.disabled).toBe(true);
    moveDownBtn.click();
    await wait(25);
    const reordered = getSectionOrder();
    expect(reordered[0]).toBe(origOrder[1]);
    expect(reordered[1]).toBe(origOrder[0]);
    expect($('ws-item-editor-now').textContent).toContain('reordered');

    // Verify Word Sounds Worksheet Preview reflects the reordered section sequence!
    $('print-worksheet').click();
    await wait(20);
    const wsOrder = [...d.querySelectorAll('#print-worksheet-view .pc-ws-section')].map((s) => s.getAttribute('data-activity'));
    expect(wsOrder.slice(0, 2)).toEqual([origOrder[1], origOrder[0]]);
    w.AlloPacketPrintCards.closeWorksheet();

    // 2. Remove an item, verify #summary-facts & rebuilt HTML & worksheet update, then Restore
    const firstToggle = d.querySelector('#ws-item-list [data-ie-toggle]');
    const removedKey = firstToggle.getAttribute('data-ie-toggle');
    firstToggle.click();
    await wait(25);
    expect($('ws-item-editor-now').textContent).toContain('1 removed');
    expect($('summary-facts').textContent).not.toBe(origFacts);
    const removedRow = d.querySelector(`#ws-item-list [data-ie-item="${removedKey}"]`);
    expect(removedRow.classList.contains('is-omitted')).toBe(true);
    const afterRemoveHtml = await getBuiltHtml();
    expect(afterRemoveHtml).not.toBe(origHtml);

    // Restore the item
    d.querySelector(`#ws-item-list [data-ie-toggle="${removedKey}"]`).click();
    await wait(25);
    expect($('ws-item-editor-now').textContent).not.toContain('removed');

    // 3. Swap an audio-backed distractor (isolation or blending)
    const swapBtn = [...d.querySelectorAll('#ws-item-list [data-ie-swap]')].find((b) => !b.disabled);
    expect(swapBtn).toBeTruthy();
    const beforeSwapText = swapBtn.closest('.ws-ie-dist-chip').textContent;
    swapBtn.click();
    await wait(25);
    expect($('ws-item-editor-said').textContent).toContain('Swapped wrong choice');
    expect($('ws-item-editor-now').textContent).toContain('1 choice edited');
    const swappedChip = d.querySelector(`#ws-item-list [data-ie-swap="${swapBtn.getAttribute('data-ie-swap')}"][data-ie-choice-idx="${swapBtn.getAttribute('data-ie-choice-idx')}"]`).closest('.ws-ie-dist-chip');
    expect(swappedChip.textContent).not.toBe(beforeSwapText);

    // 4. Edit a text distractor input on missing_letter and verify rebuilt packet HTML & worksheet pick it up!
    const editInp = d.querySelector('#ws-item-list [data-ie-section="missing_letter"] input[data-ie-edit]');
    expect(editInp).toBeTruthy();
    const existingLetters = [...editInp.closest('.ws-ie-item').querySelectorAll('input[data-ie-edit]')].map((i) => i.value.toLowerCase());
    const itemWord = editInp.closest('.ws-ie-item').querySelector('.ws-ie-target').textContent.toLowerCase();
    const freshLetter = 'zxqjvkw'.split('').find((ch) => !existingLetters.includes(ch) && !itemWord.includes(ch)) || 'z';
    setChange(w, editInp, freshLetter);
    await wait(25);
    expect($('ws-item-editor-said').textContent).toContain('Updated wrong choice');

    // Confirm rebuilt HTML contains updated choice and worksheet preview shows it
    const editedHtml = await getBuiltHtml();
    expect(editedHtml).not.toBe(origHtml);
    $('print-worksheet').click();
    await wait(20);
    const mlSecText = d.querySelector('#print-worksheet-view .pc-ws-section[data-activity="missing_letter"]').textContent.toLowerCase();
    expect(mlSecText).toContain(freshLetter);
    w.AlloPacketPrintCards.closeWorksheet();

    // 5. Reset all item edits restores exact original order, counts, and HTML
    const resetBtn = $('ws-item-reset');
    expect(resetBtn && !resetBtn.hidden).toBe(true);
    resetBtn.click();
    await wait(25);
    expect(getSectionOrder()).toEqual(origOrder);
    expect($('summary-facts').textContent).toBe(origFacts);
    expect($('ws-item-editor-now').textContent).toMatch(/^All \d+ items active$/);
    expect(resetBtn.hidden).toBe(true);
    expect(await getBuiltHtml()).toBe(origHtml);
  }, 45000);
});
