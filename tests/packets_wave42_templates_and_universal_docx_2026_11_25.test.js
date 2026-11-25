// Wave 42 (2026-11-25): End-to-end integration tests for:
// 1. Reopenable HTML Worksheets (<template id="alloflow-worksheet-template"> under script-src 'none' with zero <script> tags),
//    extractWorksheetTemplate() round-tripping (.html, legacy <script type="application/json">, .json, oversized/invalid rejection),
//    device-only Teacher Worksheet Presets (localStorage Save / Apply / Cross-kind / Delete), and .json export/import across
//    Word Sounds, Vocabulary, and Read-Along previews.
// 2. End-to-end JSDOM universal .docx wiring and genuine OOXML ZIP output (AlloPacketZip.readZip(), 5 parts, crcOk=true,
//    DOMParser XML valid) across all 5 newly wired pages:
//    - Math Fact Practice (packets-math-practice.{html,js}) with lazy-loaded packets_docx.js
//    - Math Check (packets-check.{html,js}) with static packets_docx.js
//    - CBM-Maze Reading (packets-maze.{html,js}) with lazy-loaded packets_docx.js + #f-paper-key toggle
//    - Choice, Sort & Write (packets-choice.{html,js}) with lazy-loaded packets_docx.js across all 4 activity modes
//    - Add Up Results (packets-results.{html,js}) with lazy-loaded packets_zip.js + packets_docx.js inside #take-more-exports
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

function attachBrowserMocks(w, prefix = 'dl', opts = {}) {
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

  // Optional auto-loader for dynamic local <script src="packets_zip.js|packets_docx.js"> tags in JSDOM
  const injectedScripts = [];
  if (opts.autoLoadLocalScripts) {
    const origAppend = w.Node.prototype.appendChild;
    w.Node.prototype.appendChild = function (child) {
      const ret = origAppend.call(this, child);
      if (child && child.tagName === 'SCRIPT') {
        const src = child.getAttribute('src') || child.src || '';
        const cleanSrc = src.replace(/^https?:\/\/[^/]+\//, '');
        if (cleanSrc === 'packets_docx.js' || cleanSrc === 'packets_zip.js') {
          injectedScripts.push(cleanSrc);
          setTimeout(() => {
            try {
              w.eval(read(cleanSrc));
              child.dispatchEvent(new w.Event('load'));
            } catch (err) {
              child.dispatchEvent(new w.Event('error'));
            }
          }, 5);
        }
      }
      return ret;
    };
  }

  return { downloads, blobsByUrl, injectedScripts };
}

async function readDocxDownload(dl, win) {
  expect(dl, 'expected a download record').toBeTruthy();
  expect(dl.name.endsWith('.docx'), dl.name).toBe(true);
  expect(dl.blob, 'expected blob for ' + dl.name).toBeTruthy();
  expect(dl.blob.type).toBe(DOCX_MIME);
  const bytes = new Uint8Array(await dl.blob.arrayBuffer());
  expect(bytes[0]).toBe(0x50); // P
  expect(bytes[1]).toBe(0x4B); // K
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

function setInput(win, el, value) {
  el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

function setChange(win, el, value) {
  if (el.type === 'checkbox') el.checked = !!value;
  else el.value = value;
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

function feedFileInput(win, inputEl, filename, text, type = 'text/html') {
  const fakeFile = {
    name: filename,
    size: Buffer.byteLength(text, 'utf8'),
    type,
    text: async () => text,
  };
  Object.defineProperty(inputEl, 'files', { value: [fakeFile], configurable: true });
  inputEl.dispatchEvent(new win.Event('change', { bubbles: true }));
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
    seed: 11,
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
    wordBank: true,
    pictures: true,
  };
}

function makeReadAlongPayload() {
  return {
    title: 'The Fox in the Grass',
    lang: 'en',
    sentences: [
      { text: 'The fox ran to the den.', key: 's1' },
      { text: 'It hid in the tall grass.', key: 's2' },
      { text: 'Then the sun went down.', key: 's3', para: true },
    ],
    clips: {},
    showSyllables: false,
    showBold: true,
    showSupports: true,
    customSupports: [{ line: 0, quote: 'den', text: 'A safe home where a fox rests.' }],
    questions: [
      { kind: 'mc', prompt: 'Where did the fox hide?', choices: ['In the tall grass', 'On the roof'], answer: 0 },
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

function mountPage(htmlFile, opts = {}) {
  const html = read(htmlFile);
  const headScripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1]);
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/' + htmlFile,
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  const mocks = attachBrowserMocks(w, htmlFile.replace(/\W+/g, ''), { autoLoadLocalScripts: true });
  if (opts.beforeScripts) opts.beforeScripts(w, d);
  for (const src of headScripts) {
    w.eval(read(src));
  }
  return { w, d, headScripts, $: (id) => d.getElementById(id), ...mocks };
}

describe('Wave 42A: Reopenable HTML Worksheets, Device Presets & .json Template Export/Import', () => {
  it('embeds inert <template id="alloflow-worksheet-template"> under script-src none with zero <script> tags and round-trips across Word Sounds, Vocab & Read-Along', async () => {
    const lesson = await buildWordSoundsLesson();
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-make.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const { downloads } = attachBrowserMocks(w, 'tpl');
    w.eval(read('packets_zip.js'));
    w.eval(read('packets-print-cards.js'));
    const PC = w.AlloPacketPrintCards;

    // 1. Word Sounds customized HTML export -> passive template metadata -> live preview reopen
    PC.openWorksheet({ title: 'Short Vowel Check', lesson, audio: lesson.audio });
    d.getElementById('pc-ws-customizer').open = true;
    setInput(w, d.getElementById('pc-ws-cust-title'), 'Tuesday Phonics Group A');
    setInput(w, d.getElementById('pc-ws-cust-subtitle'), 'Read directions twice before writing');
    setChange(w, d.getElementById('pc-ws-cust-class'), true);
    setChange(w, d.getElementById('pc-ws-cust-score'), true);
    setChange(w, d.getElementById('pc-ws-cust-density'), 'primary');
    setChange(w, d.querySelector('#pc-ws-customizer input[data-cust-sec-vis="orthography"]'), false);
    setInput(w, d.querySelector('#pc-ws-customizer input[data-cust-sec-heading="isolation"]'), 'Part 1: Target Sound');
    setInput(w, d.querySelector('#pc-ws-customizer input[data-cust-sec-dir="isolation"]'), 'Circle the sound you hear.');
    d.querySelector('#pc-ws-customizer .pc-cust-sec-card[data-cust-section="isolation"] .pc-cust-chip').click();

    const wsHtmlBtn = [...d.querySelectorAll('#print-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    wsHtmlBtn.click();
    const wsHtml = await downloads[downloads.length - 1].blob.text();
    const wsDoc = new JSDOM(wsHtml).window.document;
    expect(wsDoc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("script-src 'none'");
    expect(wsDoc.querySelectorAll('script')).toHaveLength(0);
    expect(wsDoc.querySelector('template#alloflow-worksheet-template')).toBeTruthy();

    const parsedWs = PC.extractWorksheetTemplate(wsHtml);
    expect(parsedWs.ok).toBe(true);
    expect(parsedWs.source).toBe('html');
    expect(parsedWs.kind).toBe('word-sounds');
    expect(parsedWs.title).toBe('Tuesday Phonics Group A');
    expect(parsedWs.subtitle).toBe('Read directions twice before writing');
    expect(parsedWs.density).toBe('primary');
    expect(parsedWs.headerFields).toEqual({ classPeriod: true, score: true });
    expect(parsedWs.hiddenSections.orthography).toBe(true);
    expect(parsedWs.sectionOverrides.isolation.heading).toBe('Part 1: Target Sound');
    expect(Object.keys(parsedWs.hiddenItems).length).toBe(1);

    // Reset live customizer, then reopen exported HTML via file input -> restores every customization!
    d.getElementById('pc-ws-cust-reset').click();
    expect(d.querySelector('#print-worksheet-view .pc-ws-title').textContent).toBe('Short Vowel Check');
    feedFileInput(w, d.getElementById('pc-ws-cust-tpl-file'), 'tuesday-phonics.html', wsHtml, 'text/html');
    await until(() => d.querySelector('#print-worksheet-view .pc-ws-title').textContent === 'Tuesday Phonics Group A', 'WS HTML template reload');
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').classList.contains('pc-density-primary')).toBe(true);
    expect(d.querySelector('#print-worksheet-view .pc-ws-section[data-activity="orthography"]')).toBeNull();
    expect(d.querySelector('#print-worksheet-view .pc-ws-section[data-activity="isolation"] .pc-ws-section-title').textContent).toBe('Part 1: Target Sound');
    expect(d.getElementById('pc-ws-cust-hidden-count').textContent).toContain('1 item hidden');
    expect(d.getElementById('pc-ws-cust-tpl-status').textContent).toMatch(/Loaded|Applied/i);

    // 2. Vocabulary HTML export: script-src none, zero <script>, hidden word never leaks, round-trips via file input!
    PC.closeWorksheet();
    PC.openVocabWorksheet(makeVocabState());
    d.getElementById('pc-vocab-customizer').open = true;
    setInput(w, d.getElementById('pc-vocab-cust-title'), 'Science Vocab Check');
    setChange(w, d.getElementById('pc-vocab-cust-density'), 'primary');
    setChange(w, d.querySelector('#pc-vocab-customizer input[data-cust-sec-vis="pictures"]'), false);
    const predChip = [...d.querySelectorAll('#pc-vocab-customizer .pc-cust-chip')].find((c) => c.textContent.toLowerCase().includes('predator'));
    predChip.click();

    const vocabHtmlBtn = [...d.querySelectorAll('#print-vocab-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    vocabHtmlBtn.click();
    const vocabHtml = await downloads[downloads.length - 1].blob.text();
    const vocabDoc = new JSDOM(vocabHtml).window.document;
    expect(vocabDoc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("script-src 'none'");
    expect(vocabDoc.querySelectorAll('script')).toHaveLength(0);
    expect(vocabHtml).not.toContain('predator');
    const parsedVocab = PC.extractWorksheetTemplate(vocabHtml);
    expect(parsedVocab.ok).toBe(true);
    expect(parsedVocab.kind).toBe('vocab');
    expect(parsedVocab.title).toBe('Science Vocab Check');
    expect(parsedVocab.hiddenSections.pictures).toBe(true);
    expect(parsedVocab.hiddenItems).toEqual({ '1': true });

    d.getElementById('pc-vocab-cust-reset').click();
    expect(d.querySelector('#print-vocab-worksheet-view .pc-ws-title').textContent).toBe('Ecosystem Words');
    feedFileInput(w, d.getElementById('pc-vocab-cust-tpl-file'), 'science-vocab.html', vocabHtml, 'text/html');
    await until(() => d.querySelector('#print-vocab-worksheet-view .pc-ws-title').textContent === 'Science Vocab Check', 'Vocab HTML template reload');
    expect(d.querySelector('#print-vocab-worksheet-view .pc-vocab-pictures')).toBeNull();
    expect(d.querySelector('#print-vocab-worksheet-view .pc-ws-sheet').textContent).not.toContain('predator');

    // 3. Read-Along HTML export: script-src none, zero <script>, round-trips via file input!
    PC.closeVocabWorksheet();
    PC.openReadAlongWorksheet(makeReadAlongPayload());
    d.getElementById('pc-ra-customizer').open = true;
    setInput(w, d.getElementById('pc-ra-cust-title'), 'Fox Reading Sheet');
    setChange(w, d.getElementById('pc-ra-cust-class'), true);
    setChange(w, d.querySelector('#pc-ra-customizer input[data-cust-sec-vis="supports"]'), false);
    setInput(w, d.querySelector('#pc-ra-customizer input[data-cust-sec-dir="passage"]'), 'Whisper read twice.');

    const raHtmlBtn = [...d.querySelectorAll('#print-read-along-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    raHtmlBtn.click();
    const raHtml = await downloads[downloads.length - 1].blob.text();
    const raDoc = new JSDOM(raHtml).window.document;
    expect(raDoc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("script-src 'none'");
    expect(raDoc.querySelectorAll('script')).toHaveLength(0);
    const parsedRa = PC.extractWorksheetTemplate(raHtml);
    expect(parsedRa.ok).toBe(true);
    expect(parsedRa.kind).toBe('read-along');
    expect(parsedRa.title).toBe('Fox Reading Sheet');
    expect(parsedRa.hiddenSections.supports).toBe(true);
    expect(parsedRa.sectionOverrides.passage.directions).toBe('Whisper read twice.');

    d.getElementById('pc-ra-cust-reset').click();
    feedFileInput(w, d.getElementById('pc-ra-cust-tpl-file'), 'fox.html', raHtml, 'text/html');
    await until(() => d.querySelector('#print-read-along-worksheet-view .pc-ws-title').textContent === 'Fox Reading Sheet', 'RA HTML template reload');
    expect(d.querySelector('#print-read-along-worksheet-view [data-ra-part="supports"]')).toBeNull();
    expect(d.querySelector('#print-read-along-worksheet-view .pc-ws-sheet').textContent).toContain('Whisper read twice.');

    // 4. Backwards-compatible parsing of legacy <script type="application/json" id="alloflow-worksheet-template"> + guardrails
    const legacyHtml = '<!doctype html><html><body><script type="application/json" id="alloflow-worksheet-template">{"kind":"vocab","schema":1,"title":"Legacy Sheet","density":"compact"}</script></body></html>';
    const parsedLegacy = PC.extractWorksheetTemplate(legacyHtml);
    expect(parsedLegacy.ok).toBe(true);
    expect(parsedLegacy.title).toBe('Legacy Sheet');
    expect(parsedLegacy.density).toBe('compact');

    expect(PC.extractWorksheetTemplate('not valid json').ok).toBe(false);
    expect(PC.extractWorksheetTemplate('x'.repeat(210 * 1024)).ok).toBe(false);
  }, 30000);

  it('supports Device Presets (Save -> reload -> Apply -> Delete) and .json template export/import', async () => {
    const lesson = await buildWordSoundsLesson();
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-make.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const { downloads } = attachBrowserMocks(w, 'presets');
    w.eval(read('packets_zip.js'));
    w.eval(read('packets-print-cards.js'));
    const PC = w.AlloPacketPrintCards;

    PC.openWorksheet({ title: 'Short Vowel Check', lesson, audio: lesson.audio });
    d.getElementById('pc-ws-customizer').open = true;

    // Configure preset settings & save
    setInput(w, d.getElementById('pc-ws-cust-subtitle'), 'Grade 1 Small Group');
    setChange(w, d.getElementById('pc-ws-cust-class'), true);
    setChange(w, d.getElementById('pc-ws-cust-score'), true);
    setChange(w, d.getElementById('pc-ws-cust-density'), 'primary');
    setInput(w, d.getElementById('pc-ws-cust-preset-name'), 'Grade 1 Primary');
    d.getElementById('pc-ws-cust-preset-save').click();

    const storedRaw = JSON.parse(w.localStorage.getItem('alloflow-packets-ws-presets/1'));
    const stored = Array.isArray(storedRaw) ? storedRaw : storedRaw.presets;
    expect(Array.isArray(stored) && stored.length === 1).toBe(true);
    expect(stored[0].name).toBe('Grade 1 Primary');
    expect(stored[0].density).toBe('primary');

    // Export shareable .json template
    d.getElementById('pc-ws-cust-tpl-export').click();
    const jsonDl = downloads[downloads.length - 1];
    expect(jsonDl.name).toMatch(/-worksheet-template\.json$/);
    const jsonText = await jsonDl.blob.text();
    const jsonParsed = JSON.parse(jsonText);
    expect(jsonParsed.kind).toBe('word-sounds');
    expect(jsonParsed.density).toBe('primary');
    expect(jsonParsed.subtitle).toBe('Grade 1 Small Group');

    // Close and reopen fresh (simulating page reload with persisted localStorage)
    PC.closeWorksheet();
    PC.openWorksheet({ title: 'Short Vowel Check', lesson, audio: lesson.audio });
    d.getElementById('pc-ws-customizer').open = true;
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').classList.contains('pc-density-standard')).toBe(true);

    // Apply saved preset from dropdown
    const sel = d.getElementById('pc-ws-cust-preset-select');
    const delBtn = d.getElementById('pc-ws-cust-preset-delete');
    expect(delBtn.disabled).toBe(true);
    const opt = [...sel.options].find((o) => o.textContent.includes('Grade 1 Primary'));
    expect(opt).toBeTruthy();
    setChange(w, sel, opt.value);
    expect(delBtn.disabled).toBe(false);
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').classList.contains('pc-density-primary')).toBe(true);
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').textContent).toContain('Grade 1 Small Group');
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').textContent).toContain('Class / Period:');

    // Delete preset
    delBtn.click();
    const afterDelRaw = JSON.parse(w.localStorage.getItem('alloflow-packets-ws-presets/1'));
    const afterDel = Array.isArray(afterDelRaw) ? afterDelRaw : afterDelRaw.presets;
    expect(afterDel).toHaveLength(0);
    expect(delBtn.disabled).toBe(true);

    // Reset & import the saved .json template file
    d.getElementById('pc-ws-cust-reset').click();
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').classList.contains('pc-density-standard')).toBe(true);
    feedFileInput(w, d.getElementById('pc-ws-cust-tpl-file'), jsonDl.name, jsonText, 'application/json');
    await until(() => d.querySelector('#print-worksheet-view .pc-ws-sheet').classList.contains('pc-density-primary'), 'JSON template apply');
    expect(d.querySelector('#print-worksheet-view .pc-ws-sheet').textContent).toContain('Grade 1 Small Group');
  }, 30000);
});

describe('Wave 42B: Universal Offline .docx Export Wiring across Math Practice, Math Check, Maze, Choice & Results', () => {
  it('Math Fact Practice lazy-loads packets_docx.js on #download-docx click and exports a valid .docx with Teacher Answer Key', async () => {
    const page = mountPage('packets-math-practice.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');
    expect($('download-docx').hidden).toBe(true);

    // Step 1: pick Multiplication + first set -> Step 2 -> Step 3
    const mulRadio = d.querySelector('input[name="kind"][value="mul"]');
    expect(mulRadio).toBeTruthy();
    mulRadio.checked = true;
    mulRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(20);
    const firstSet = d.querySelector('#sets input[type="radio"]');
    expect(firstSet).toBeTruthy();
    firstSet.checked = true;
    firstSet.dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(20);
    $('next-1').click();
    await wait(25);
    const cccRadio = d.querySelector('input[name="method"][value="ccc"]');
    if (cccRadio && !cccRadio.checked) {
      cccRadio.checked = true;
      cccRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    $('next-2').click();
    await until(() => !$('download-docx').hidden && !$('save').hidden, 'Math Practice Step 3 ready');

    expect(w.AlloPacketDocx).toBeUndefined();
    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'Math Practice .docx download');
    expect(injectedScripts).toEqual(['packets_docx.js']);
    expect(d.querySelectorAll('script[data-allo-docx="1"]').length).toBe(1);

    const { byName } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(byName['word/document.xml']).toContain('Teacher Answer Key');
    expect(byName['word/document.xml']).toContain('<w:br w:type="page"/>');

    // Second click reuses loaded packets_docx.js without injecting a 2nd script tag
    const prevCount = downloads.length;
    $('download-docx').click();
    await until(() => downloads.length > prevCount, 'Math Practice 2nd .docx download');
    expect(d.querySelectorAll('script[data-allo-docx="1"]').length).toBe(1);
  }, 30000);

  it('Math Check statically loads packets_docx.js and exports a valid stacked vertical .docx on #download-docx click', async () => {
    const page = mountPage('packets-check.html');
    const { w, d, $, downloads, headScripts } = page;
    expect(headScripts).toContain('packets_docx.js');
    expect(typeof w.AlloPacketDocx.buildMathWorksheetDocx).toBe('function');
    expect($('download-docx').hidden).toBe(true);

    // Pick Math Computation (vertical stacked problems), advance to Step 2, pick grade & version, then Step 3
    const mcRadio = d.querySelector('input[name="check"][value="math_computation"]');
    expect(mcRadio).toBeTruthy();
    mcRadio.checked = true;
    mcRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(20);
    $('next-1').click();
    await wait(25);
    const firstGrade = d.querySelector('#grades input[type="radio"]');
    expect(firstGrade).toBeTruthy();
    firstGrade.checked = true;
    firstGrade.dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(20);
    const firstVersion = d.querySelector('#versions input[type="radio"]');
    if (firstVersion && !firstVersion.checked) {
      firstVersion.checked = true;
      firstVersion.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    await wait(20);
    $('next-2').click();
    await until(() => !$('download-docx').hidden && !$('print').hidden, 'Math Check Step 3 ready');

    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'Math Check .docx download');

    const { byName } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(byName['word/document.xml']).toContain('Teacher Answer Key');
    expect(byName['word/document.xml']).toContain('<w:br w:type="page"/>');
    expect(byName['word/document.xml']).toContain('<w:jc w:val="right"/>');
  }, 30000);

  it('CBM-Maze Reading lazy-loads packets_docx.js, builds valid .docx with warm-up + triples, and honors #f-paper-key toggle', async () => {
    const page = mountPage('packets-maze.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    // Pick first starter passage -> Step 2 -> Step 3
    const firstTpl = d.querySelector('#template-grid button');
    if (firstTpl) firstTpl.click();
    await wait(20);
    $('next-1').click();
    await wait(25);
    $('next-2').click();
    await until(() => !$('download-docx').hidden && !$('save').hidden, 'Maze Step 3 ready');

    expect(w.AlloPacketDocx).toBeUndefined();
    expect($('f-paper-key').checked).toBe(true);
    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'Maze .docx with key');
    expect(injectedScripts).toEqual(['packets_docx.js']);

    const { byName: withKey } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(withKey['word/document.xml']).toContain('Teacher Answer Key &amp; CBM-Maze Scoring Sheet');
    expect(withKey['word/document.xml']).toContain('Net Maze Score:');
    expect(withKey['word/document.xml']).toContain('<w:br w:type="page"/>');

    // Toggle answer key OFF -> no page break / no scoring sheet
    setChange(w, $('f-paper-key'), false);
    const prev = downloads.length;
    $('download-docx').click();
    await until(() => downloads.length > prev, 'Maze .docx without key');
    expect(d.querySelectorAll('script[data-allo-docx="1"]').length).toBe(1);
    const { byName: noKey } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(noKey['word/document.xml']).not.toContain('Teacher Answer Key &amp; CBM-Maze Scoring Sheet');
    expect(noKey['word/document.xml']).not.toContain('<w:br w:type="page"/>');
  }, 30000);

  it('Choice, Sort & Write lazy-loads packets_docx.js and exports valid .docx across all 4 activity modes', async () => {
    const modes = [
      { kind: 'concept_sort', expectToken: 'Cards to Sort', expectKey: true },
      { kind: 'sequence_order', expectToken: '[ ___ ]', expectKey: true },
      { kind: 'tiered_writing', expectToken: 'Writing Prompt', expectKey: false },
      { kind: 'choice_board', expectToken: '\u2610', expectKey: false },
    ];
    const page = mountPage('packets-choice.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    for (const mode of modes) {
      // Return to Step 1 if currently on Step 3
      if (!$('step-3').hidden) {
        $('back-3').click();
        await wait(15);
      }
      if (!$('step-2').hidden) {
        $('back-2').click();
        await wait(15);
      }
      const radio = d.querySelector(`input[name="activity"][value="${mode.kind}"]`);
      expect(radio, 'radio for ' + mode.kind).toBeTruthy();
      radio.checked = true;
      radio.dispatchEvent(new w.Event('change', { bubbles: true }));
      await wait(15);
      $('next-1').click();
      await wait(20);
      $('next-2').click();
      await until(() => !$('step-3').hidden && !$('download-docx').hidden, `Choice ${mode.kind} Step 3 ready`);

      const before = downloads.length;
      $('download-docx').click();
      await until(() => downloads.length > before, `Choice ${mode.kind} .docx download`);
      const { byName } = await readDocxDownload(downloads[downloads.length - 1], w);
      expect(byName['word/document.xml'], mode.kind).toContain(mode.expectToken);
      if (mode.expectKey) {
        expect(byName['word/document.xml'], mode.kind).toContain('Teacher Answer Key');
      }
    }
    expect(injectedScripts).toEqual(['packets_docx.js']);
    expect(d.querySelectorAll('script[data-allo-docx="1"]').length).toBe(1);
  }, 35000);

  it('Add Up Results keeps #export-docx inside collapsed #take-more-exports, handles empty state, lazy-loads zip+docx, and exports valid progress report .docx', async () => {
    const page = mountPage('packets-results.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');
    expect(headScripts).not.toContain('packets_zip.js');

    const fold = $('take-more-exports');
    expect(fold && !fold.open).toBe(true);
    const btn = $('export-docx');
    expect(btn && btn.closest('#take-more-exports') === fold).toBe(true);

    // Empty state click -> polite status notice, zero downloads
    btn.click();
    await wait(20);
    expect(downloads).toHaveLength(0);
    expect(($('take-said').textContent || '') + ($('said').textContent || '')).toMatch(/Add|Load|sample|nothing|result/i);

    // Load built-in sample results -> expand fold -> export Word progress report (.docx)
    $('samples').click();
    await until(() => !$('state-results').hidden, 'Results sample loaded');
    fold.open = true;
    btn.click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'Results .docx download');

    expect(injectedScripts).toEqual(['packets_zip.js', 'packets_docx.js']);
    const { byName } = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(byName['word/document.xml']).toContain('Class Overview');
    expect(byName['word/document.xml']).toContain('Student Results');
    expect(byName['word/document.xml']).toContain('Teacher Conference Notes');
  }, 30000);
});
