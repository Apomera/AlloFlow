// Wave 43 (2026-11-25): End-to-end integration tests for:
// 1. Inline item prompt editing & Up/Down item reordering inside Customize worksheet
//    (Word Sounds, Vocabulary, Read-Along), syncing across preview DOM, HTML <template>
//    round-trip, .docx export, and Audio Companion / Scoring Sheet.
// 2. One-click Editable print pack (.zip) (#pc-ws-docx-pack, #pc-vocab-docx-pack, #pc-ra-docx-pack)
//    producing 4 valid OOXML .docx entries (01-Worksheet-Scaffolded.docx .. 04-Teacher-Scoring-Sheet.docx)
//    with real single-pass rasterized PNGs embedded via prepareImagesAsync.
// 3. Lazy-loaded #download-docx across all 6 remaining handout makers (Compile, Life Skills,
//    SEL First-Then/Toolkit, STEM Labs, Visual Math Manipulatives, and AAC Boards with embedded PNGs).
// 4. Per-student Conference Handout (.docx) (#export-student-docx) inside #take-more-exports on Add Up Results.
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
const ZIP_MIME = 'application/zip';
const CORE_OOXML_PARTS = [
  '[Content_Types].xml',
  '_rels/.rels',
  'word/_rels/document.xml.rels',
  'word/document.xml',
  'word/styles.xml',
];
const PACK_NAMES = [
  '01-Worksheet-Scaffolded.docx',
  '02-Worksheet-Independent.docx',
  '03-Teacher-Answer-Key.docx',
  '04-Teacher-Scoring-Sheet.docx',
];
const PNG_1X1_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SVG_CIRCLE_URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#2563eb"/></svg>');

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

function attachBrowserMocks(w, prefix = 'w43', opts = {}) {
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

  if (opts.mockCanvasRasterizer) {
    let drawCalls = 0;
    w.__rasterDrawCalls = () => drawCalls;
    const origCreateEl = w.document.createElement.bind(w.document);
    w.document.createElement = function (tag, options) {
      const node = origCreateEl(tag, options);
      if (String(tag || '').toLowerCase() === 'canvas') {
        node.getContext = function () {
          return {
            clearRect() {},
            drawImage() { drawCalls++; },
          };
        };
        node.toDataURL = function () {
          return PNG_1X1_URI;
        };
      }
      return node;
    };
    w.Image = class MockImage {
      constructor() {
        this.naturalWidth = 120;
        this.naturalHeight = 120;
        this.width = 120;
        this.height = 120;
      }
      set src(val) {
        this._src = val;
        setTimeout(() => {
          if (typeof this.onload === 'function') this.onload();
        }, 0);
      }
      get src() {
        return this._src;
      }
    };
  }

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

function inspectDocxBytes(bytes, label, win) {
  expect(bytes[0], label + ' PK[0]').toBe(0x50);
  expect(bytes[1], label + ' PK[1]').toBe(0x4B);
  const parsed = ZIP.readZip(bytes);
  const byName = Object.create(null);
  const media = Object.create(null);
  for (const entry of parsed) {
    expect(entry.crcOk, `${label} -> ${entry.name} crcOk`).toBe(true);
    if (entry.name.startsWith('word/media/')) {
      media[entry.name] = entry.bytes;
    } else {
      byName[entry.name] = new TextDecoder().decode(entry.bytes);
    }
  }
  for (const part of CORE_OOXML_PARTS) {
    expect(byName[part], `${label} missing ${part}`).toBeTruthy();
    if (win && typeof win.DOMParser === 'function') {
      const xmlDoc = new win.DOMParser().parseFromString(byName[part], 'application/xml');
      expect(xmlDoc.querySelector('parsererror'), `${label} -> ${part} XML valid`).toBeNull();
    }
  }
  return { byName, media, entries: parsed };
}

async function readDocxDownload(dl, win) {
  expect(dl, 'expected a download record').toBeTruthy();
  expect(dl.name.endsWith('.docx'), dl.name).toBe(true);
  expect(dl.blob, 'expected blob for ' + dl.name).toBeTruthy();
  expect(dl.blob.type).toBe(DOCX_MIME);
  const bytes = new Uint8Array(await dl.blob.arrayBuffer());
  return { bytes, ...inspectDocxBytes(bytes, dl.name, win) };
}

function assertHasValidPng(inspected, label) {
  const pngKeys = Object.keys(inspected.media).filter((k) => k.endsWith('.png'));
  expect(pngKeys.length, `${label} expected embedded PNG in word/media/`).toBeGreaterThanOrEqual(1);
  const pngBytes = inspected.media[pngKeys[0]];
  expect([pngBytes[0], pngBytes[1], pngBytes[2], pngBytes[3]], `${label} PNG magic bytes`).toEqual([0x89, 0x50, 0x4E, 0x47]);
  expect(inspected.byName['[Content_Types].xml']).toContain('Extension="png"');
  expect(inspected.byName['word/_rels/document.xml.rels']).toContain('media/image1.png');
  expect(inspected.byName['word/document.xml']).toContain('<w:drawing>');
}

function setInput(win, el, value) {
  el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
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
    activities: ['isolation', 'blending', 'missing_letter'],
    seed: 19,
    title: 'Short Vowel Review',
    core,
    dictionary,
    banks,
    loader,
    wordlist: wl,
    allowUnconverted: true,
  });
  const lesson = res.lesson;
  lesson.images = Object.assign({}, lesson.images || {}, {
    cat: SVG_CIRCLE_URI,
    top: SVG_CIRCLE_URI,
    sun: SVG_CIRCLE_URI,
    hat: SVG_CIRCLE_URI,
  });
  (lesson.blocks || []).forEach((blk) => {
    (blk.items || []).forEach((it) => {
      if (it && it.word && lesson.images[String(it.word).toLowerCase()]) {
        it.wordPicture = String(it.word).toLowerCase();
      }
    });
  });
  return lesson;
}

function makeVocabState() {
  return {
    title: 'Ecosystem Words',
    entries: [
      { word: 'habitat', meaning: 'the natural home of a plant or animal', example: 'A pond is a frog habitat.', blank: 'A pond is a frog ___.', blankAnswer: 'habitat', picture: SVG_CIRCLE_URI },
      { word: 'predator', meaning: 'an animal that hunts other animals for food', example: 'An owl is a quiet predator.', blank: 'An owl is a quiet ___.', blankAnswer: 'predator', picture: SVG_CIRCLE_URI },
      { word: 'prey', meaning: 'an animal that is hunted by another animal', example: 'Rabbits are prey for foxes.', blank: 'Rabbits are ___ for foxes.', blankAnswer: 'prey', picture: SVG_CIRCLE_URI },
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

function makeReadAlongPayload() {
  return {
    title: 'The Fox in the Grass',
    lang: 'en',
    sentences: [
      { text: 'The fox ran to the den.', key: 's1' },
      { text: 'It hid in the tall grass.', key: 's2' },
      { text: 'Then the sun went down.', key: 's3', para: true },
    ],
    clips: {
      s1: { uri: wavUri('s1'), ms: 900, source: 'teacher' },
      s2: { uri: wavUri('s2'), ms: 900, source: 'teacher' },
      s3: { uri: wavUri('s3'), ms: 900, source: 'teacher' },
    },
    showSyllables: false,
    showBold: true,
    showSupports: true,
    customSupports: [
      { line: 0, quote: 'den', text: 'A safe home where a fox rests.', imgUri: SVG_CIRCLE_URI },
    ],
    questions: [
      { kind: 'mc', prompt: 'Where did the fox hide?', choices: ['In the tall grass', 'On the roof'], answer: 0 },
      { kind: 'open', prompt: 'Why did the fox come out after sunset?' },
    ],
    wordMeanings: [
      { word: 'den', meaning: 'a wild animal home' },
      { word: 'grass', meaning: 'short green plants covering the ground' },
    ],
    includeAnswerKey: true,
    writeLines: 4,
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
  const mocks = attachBrowserMocks(w, htmlFile.replace(/\W+/g, ''), {
    autoLoadLocalScripts: true,
    mockCanvasRasterizer: !!opts.mockCanvasRasterizer,
  });
  if (opts.beforeScripts) opts.beforeScripts(w, d);
  for (const src of headScripts) {
    w.eval(read(src));
  }
  if (d.readyState === 'loading') {
    d.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  }
  return { w, d, headScripts, $: (id) => d.getElementById(id), ...mocks };
}

describe('Wave 43A: Inline item prompt editing, Up/Down item reordering & Editable print pack (.zip)', () => {
  it('reorders items & edits wording live across Word Sounds, Vocab & Read-Along (preview, HTML <template> round-trip, .docx & Audio Companion)', async () => {
    const lesson = await buildWordSoundsLesson();
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-make.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const { downloads } = attachBrowserMocks(w, 'inline', {
      autoLoadLocalScripts: true,
      mockCanvasRasterizer: true,
    });
    w.eval(read('packets_zip.js'));
    w.eval(read('packets_docx.js'));
    w.eval(read('packets-print-cards.js'));
    const PC = w.AlloPacketPrintCards;

    // 1. Word Sounds: move item #2 up to #1 in isolation + inline-edit wording -> syncs to preview, HTML template, .docx & Audio Companion
    PC.openWorksheet({
      title: 'Short Vowel Review',
      lesson,
      audio: lesson.audio,
      pictureFor: () => SVG_CIRCLE_URI,
    });
    d.getElementById('pc-ws-customizer').open = true;

    const wsIsoCard = d.querySelector('#pc-ws-customizer .pc-cust-sec-card[data-cust-section="isolation"]');
    const wsOrigRows = [...wsIsoCard.querySelectorAll('.pc-cust-item-row')];
    expect(wsOrigRows.length).toBeGreaterThanOrEqual(2);
    const wsSecondWord = wsOrigRows[1].querySelector('.pc-cust-chip').textContent.trim().replace(/^#\d+\s+/, '');
    const wsSecondOrigIdx = wsOrigRows[1].querySelector('[data-cust-move="up"]').getAttribute('data-cust-orig-idx');

    // Move 2nd item up to 1st position (renumbers cleanly to #1)
    wsOrigRows[1].querySelector('[data-cust-move="up"]').click();
    const wsAfterMoveRows = [...d.querySelectorAll('#pc-ws-customizer .pc-cust-sec-card[data-cust-section="isolation"] .pc-cust-item-row')];
    expect(wsAfterMoveRows[0].querySelector('.pc-cust-chip').textContent.trim()).toBe('#1 ' + wsSecondWord);

    // Inline-edit wording on the newly first item
    const wsEditToggle = wsAfterMoveRows[0].querySelector('[data-cust-edit-toggle]');
    wsEditToggle.click();
    const wsEditInput = wsAfterMoveRows[0].querySelector('[data-cust-edit-input]');
    setInput(w, wsEditInput, 'Listen carefully to the first sound:');

    // Preview shows edited wording on first item
    const wsPreviewItems = [...d.querySelectorAll('#print-worksheet-view .pc-ws-section[data-activity="isolation"] .pc-ws-item')];
    expect(wsPreviewItems[0].textContent).toContain('Listen carefully to the first sound:');

    // Standalone HTML <template> preserves itemOrder + itemTextOverrides and round-trips after reset
    const wsHtmlBtn = [...d.querySelectorAll('#print-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    wsHtmlBtn.click();
    const wsHtml = await downloads[downloads.length - 1].blob.text();
    const wsParsedTpl = PC.extractWorksheetTemplate(wsHtml);
    expect(wsParsedTpl.ok).toBe(true);
    expect(wsParsedTpl.itemOrder.isolation[0]).toBe(Number(wsSecondOrigIdx));
    expect(wsParsedTpl.itemTextOverrides['isolation:' + wsSecondOrigIdx]).toBe('Listen carefully to the first sound:');

    d.getElementById('pc-ws-cust-reset').click();
    expect(d.querySelector('#print-worksheet-view .pc-ws-section[data-activity="isolation"]').textContent).not.toContain('Listen carefully to the first sound:');
    feedFileInput(w, d.getElementById('pc-ws-cust-tpl-file'), 'ws-inline.html', wsHtml, 'text/html');
    await until(() => d.querySelector('#print-worksheet-view .pc-ws-section[data-activity="isolation"]').textContent.includes('Listen carefully to the first sound:'), 'WS inline round-trip');

    // .docx reflects reordered item + custom prompt + embedded PNG thumbnail
    const wsDlBefore = downloads.length;
    d.getElementById('pc-ws-docx').click();
    await until(() => downloads.length > wsDlBefore, 'WS .docx download');
    const wsDocx = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(wsDocx.byName['word/document.xml']).toContain('Listen carefully to the first sound:');
    assertHasValidPng(wsDocx, 'Word Sounds .docx');

    // Audio Companion reflects reordered items & edited wording
    const wsAudioBtn = [...d.querySelectorAll('#print-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Worksheet audio player'));
    wsAudioBtn.click();
    await until(() => d.getElementById('worksheet-audio-view') && !d.getElementById('worksheet-audio-view').hidden, 'WS Audio Companion');
    const wsAudioText = d.getElementById('worksheet-audio-view').textContent;
    expect(wsAudioText).toContain('Listen carefully to the first sound:');
    const wsAudioBack = [...d.querySelectorAll('#worksheet-audio-view button')].find((b) => /back|close/i.test(b.textContent));
    if (wsAudioBack) wsAudioBack.click();
    PC.closeWorksheet();

    // 2. Vocabulary: reorder item #2 ("predator") up to #1 + inline-edit Part 1 meaning & Part 2 cloze
    PC.openVocabWorksheet(makeVocabState());
    d.getElementById('pc-vocab-customizer').open = true;
    const vocabRows = [...d.querySelectorAll('#pc-vocab-customizer .pc-cust-item-row')];
    expect(vocabRows).toHaveLength(3);
    expect(vocabRows[1].textContent.toLowerCase()).toContain('predator');
    vocabRows[1].querySelector('[data-cust-move="up"]').click();

    const vocabAfterRows = [...d.querySelectorAll('#pc-vocab-customizer .pc-cust-item-row')];
    expect(vocabAfterRows[0].textContent.toLowerCase()).toContain('predator');
    vocabAfterRows[0].querySelector('[data-cust-edit-toggle]').click();
    const meaningInp = vocabAfterRows[0].querySelector('[data-cust-edit-input="meaning:1"]');
    const clozeInp = vocabAfterRows[0].querySelector('[data-cust-edit-input="cloze:1"]');
    setInput(w, meaningInp, 'a hunter in a food chain');
    setInput(w, clozeInp, 'The hawk is a fast ___ in the sky.');

    // Preview syncs reordered Part 1 & Part 2 items (after alphabetical Word Bank) and edited meaning/sentence
    const vocabSheet = d.querySelector('#print-vocab-worksheet-view .pc-ws-sheet');
    const vocabPreviewText = vocabSheet.textContent;
    expect(vocabPreviewText).toContain('a hunter in a food chain');
    expect(vocabPreviewText).toContain('The hawk is a fast');
    expect(vocabPreviewText).toContain('in the sky.');
    expect(vocabPreviewText.indexOf('The hawk is a fast')).toBeLessThan(vocabPreviewText.indexOf('A pond is a frog'));
    const part1Text = vocabPreviewText.slice(vocabPreviewText.indexOf('Part 1'));
    expect(part1Text.indexOf('predator')).toBeLessThan(part1Text.indexOf('habitat'));

    // HTML <template> round-trip
    const vocabHtmlBtn = [...d.querySelectorAll('#print-vocab-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    vocabHtmlBtn.click();
    const vocabHtml = await downloads[downloads.length - 1].blob.text();
    const vocabTpl = PC.extractWorksheetTemplate(vocabHtml);
    expect(vocabTpl.ok).toBe(true);
    expect(vocabTpl.itemOrder.words).toEqual([1, 0, 2]);
    expect(vocabTpl.itemTextOverrides['meaning:1']).toBe('a hunter in a food chain');
    expect(vocabTpl.itemTextOverrides['cloze:1']).toBe('The hawk is a fast ___ in the sky.');
    d.getElementById('pc-vocab-cust-reset').click();
    feedFileInput(w, d.getElementById('pc-vocab-cust-tpl-file'), 'vocab-inline.html', vocabHtml, 'text/html');
    await until(() => d.querySelector('#print-vocab-worksheet-view .pc-ws-sheet').textContent.includes('a hunter in a food chain'), 'Vocab inline round-trip');

    // Vocab .docx has reordered words, edited meaning/cloze, AND real embedded PNG in Part 3!
    const vDlBefore = downloads.length;
    d.getElementById('pc-vocab-docx').click();
    await until(() => downloads.length > vDlBefore, 'Vocab .docx download');
    const vDocx = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(vDocx.byName['word/document.xml']).toContain('a hunter in a food chain');
    expect(vDocx.byName['word/document.xml']).toContain('The hawk is a fast');
    expect(vDocx.byName['word/document.xml']).toContain('in the sky.');
    assertHasValidPng(vDocx, 'Vocabulary Part 3 .docx');

    // Vocab Audio Companion reflects reordered words & edited meaning
    const vAudioBtn = [...d.querySelectorAll('#print-vocab-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Worksheet audio player'));
    vAudioBtn.click();
    await until(() => d.getElementById('worksheet-audio-view') && !d.getElementById('worksheet-audio-view').hidden, 'Vocab Audio Companion');
    const vAudioText = d.getElementById('worksheet-audio-view').textContent;
    expect(vAudioText).toContain('a hunter in a food chain');
    expect(vAudioText.indexOf('predator')).toBeLessThan(vAudioText.indexOf('habitat'));
    const vAudioBack = [...d.querySelectorAll('#worksheet-audio-view button')].find((b) => /back|close/i.test(b.textContent));
    if (vAudioBack) vAudioBack.click();
    PC.closeVocabWorksheet();

    // 3. Read-Along: reorder question #2 up to #1 + inline-edit question wording
    PC.openReadAlongWorksheet(makeReadAlongPayload());
    d.getElementById('pc-ra-customizer').open = true;
    const raRows = [...d.querySelectorAll('#pc-ra-customizer .pc-cust-item-row')];
    expect(raRows).toHaveLength(2);
    raRows[1].querySelector('[data-cust-move="up"]').click();
    const raAfterRows = [...d.querySelectorAll('#pc-ra-customizer .pc-cust-item-row')];
    raAfterRows[0].querySelector('[data-cust-edit-toggle]').click();
    setInput(w, raAfterRows[0].querySelector('[data-cust-edit-input="writing:1"]'), 'Explain in your own words why the fox waited until dark.');

    const raPreview = d.querySelector('#print-read-along-worksheet-view .pc-ws-sheet').textContent;
    expect(raPreview.indexOf('Explain in your own words why the fox waited until dark.')).toBeLessThan(raPreview.indexOf('Where did the fox hide?'));

    // Read-Along HTML <template> round-trip
    const raHtmlBtn = [...d.querySelectorAll('#print-read-along-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Download HTML'));
    raHtmlBtn.click();
    const raHtml = await downloads[downloads.length - 1].blob.text();
    const raTpl = PC.extractWorksheetTemplate(raHtml);
    expect(raTpl.ok).toBe(true);
    expect(raTpl.itemOrder.writing).toEqual([1, 0]);
    expect(raTpl.itemTextOverrides['writing:1']).toBe('Explain in your own words why the fox waited until dark.');
    d.getElementById('pc-ra-cust-reset').click();
    feedFileInput(w, d.getElementById('pc-ra-cust-tpl-file'), 'ra-inline.html', raHtml, 'text/html');
    await until(() => d.querySelector('#print-read-along-worksheet-view .pc-ws-sheet').textContent.includes('Explain in your own words why the fox waited until dark.'), 'RA inline round-trip');

    // Read-Along .docx has reordered + edited prompt AND embedded PNG thumbnail in Part 2
    const raDlBefore = downloads.length;
    d.getElementById('pc-ra-docx').click();
    await until(() => downloads.length > raDlBefore, 'RA .docx download');
    const raDocx = await readDocxDownload(downloads[downloads.length - 1], w);
    const raXml = raDocx.byName['word/document.xml'];
    expect(raXml.indexOf('Explain in your own words why the fox waited until dark.')).toBeLessThan(raXml.indexOf('Where did the fox hide?'));
    assertHasValidPng(raDocx, 'Read-Along Part 2 .docx');

    // Read-Along Audio Companion syncs reordered + edited question
    const raAudioBtn = [...d.querySelectorAll('#print-read-along-worksheet-view .pc-actions button')].find((b) => b.textContent.includes('Worksheet audio player'));
    raAudioBtn.click();
    await until(() => d.getElementById('worksheet-audio-view') && !d.getElementById('worksheet-audio-view').hidden, 'RA Audio Companion');
    expect(d.getElementById('worksheet-audio-view').textContent).toContain('Explain in your own words why the fox waited until dark.');
  }, 45000);

  it('builds 1-click Editable print pack (.zip) with 4 valid OOXML .docx entries across Word Sounds, Vocab & Read-Along', async () => {
    const lesson = await buildWordSoundsLesson();
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-make.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const { downloads } = attachBrowserMocks(w, 'pack', {
      autoLoadLocalScripts: true,
      mockCanvasRasterizer: true,
    });
    w.eval(read('packets_zip.js'));
    w.eval(read('packets-print-cards.js'));
    const PC = w.AlloPacketPrintCards;

    async function verifyPack(btnId, label, expectPngInScaffolded) {
      const before = downloads.length;
      const btn = d.getElementById(btnId);
      expect(btn, btnId + ' button').toBeTruthy();
      btn.click();
      await until(() => downloads.length > before, label + ' pack .zip download');
      const dl = downloads[downloads.length - 1];
      expect(dl.name.endsWith('-editable-print-pack.zip'), dl.name).toBe(true);
      expect(dl.blob.type).toBe(ZIP_MIME);
      const zipBytes = new Uint8Array(await dl.blob.arrayBuffer());
      const entries = ZIP.readZip(zipBytes);
      expect(entries.map((e) => e.name)).toEqual(PACK_NAMES);
      for (const entry of entries) {
        expect(entry.crcOk, `${label} outer zip ${entry.name} crcOk`).toBe(true);
        const inner = inspectDocxBytes(entry.bytes, `${label}/${entry.name}`, w);
        if (expectPngInScaffolded && entry.name === '01-Worksheet-Scaffolded.docx') {
          assertHasValidPng(inner, `${label} ${entry.name}`);
        }
      }
    }

    // 1. Word Sounds pack (lazy-loads packets_docx.js)
    PC.openWorksheet({ title: 'Short Vowel Review', lesson, audio: lesson.audio, pictureFor: () => SVG_CIRCLE_URI });
    await verifyPack('pc-ws-docx-pack', 'Word Sounds', true);
    PC.closeWorksheet();

    // 2. Vocabulary pack (embeds rasterized PNG in Part 3)
    PC.openVocabWorksheet(makeVocabState());
    await verifyPack('pc-vocab-docx-pack', 'Vocabulary', true);
    PC.closeVocabWorksheet();

    // 3. Read-Along pack (embeds rasterized PNG in Part 2 supports)
    PC.openReadAlongWorksheet(makeReadAlongPayload());
    await verifyPack('pc-ra-docx-pack', 'Read-Along', true);
    PC.closeReadAlongWorksheet();
  }, 45000);
});

describe('Wave 43B: Lazy-loaded .docx across 6 handout makers & Per-Student Conference Handout on Add Up Results', () => {
  it('Compile Activity lazy-loads zip+docx and exports a valid compiled handout .docx', async () => {
    const page = mountPage('packets-compile.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    const firstSample = d.querySelector('#sample-list button');
    expect(firstSample).toBeTruthy();
    firstSample.click();
    await wait(25);
    $('next-1').click();
    await wait(25);
    $('next-2').click();
    await until(() => !$('step-3').hidden && !$('download-docx').hidden, 'Compile Step 3 ready');

    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'Compile .docx download');
    expect(injectedScripts).toContain('packets_docx.js');
    const res = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(res.byName['word/document.xml']).toContain('Name:');
  }, 30000);

  it('Life Skills lazy-loads packets_docx.js and exports a valid transition handout .docx', async () => {
    const page = mountPage('packets-life-skills.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    const starter = d.querySelector('#starter-list button');
    if (starter) starter.click();
    await wait(20);
    $('next-1').click();
    await wait(20);
    $('next-2').click();
    await until(() => !$('step-3').hidden && !$('download-docx').hidden, 'Life Skills Step 3 ready');

    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'Life Skills .docx download');
    expect(injectedScripts).toContain('packets_docx.js');
    const res = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(res.byName['word/document.xml']).toContain('Name:');
  }, 30000);

  it('Focus & UDL Toolkits (SEL) exports a valid First-Then / toolkit .docx', async () => {
    const page = mountPage('packets-sel.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    // Choose First-Then mode explicitly to verify first_then card section
    const ftRadio = d.querySelector('#activity-radios input[value="sel_first_then"]');
    if (ftRadio) {
      ftRadio.checked = true;
      ftRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    } else {
      const starter = d.querySelector('#starter-list button');
      if (starter) starter.click();
    }
    await wait(20);
    $('next-1').click();
    await wait(20);
    $('next-2').click();
    await until(() => !$('step-3').hidden && !$('download-docx').hidden, 'SEL Step 3 ready');

    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'SEL .docx download');
    expect(injectedScripts).toContain('packets_docx.js');
    const res = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(res.byName['word/document.xml']).toContain('FIRST');
    expect(res.byName['word/document.xml']).toContain('THEN');
  }, 30000);

  it('STEM Labs lazy-loads packets_docx.js and exports a valid lab recording sheet .docx', async () => {
    const page = mountPage('packets-stem-lab.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    const starter = d.querySelector('#starter-list button');
    if (starter) starter.click();
    await wait(20);
    $('next-1').click();
    await wait(20);
    $('next-2').click();
    await until(() => !$('step-3').hidden && !$('download-docx').hidden, 'STEM Lab Step 3 ready');

    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'STEM Lab .docx download');
    expect(injectedScripts).toContain('packets_docx.js');
    const res = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(res.byName['word/document.xml']).toContain('Name:');
  }, 30000);

  it('Visual Math Manipulatives lazy-loads packets_docx.js and exports a valid work mat .docx', async () => {
    const page = mountPage('packets-manipulatives.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    const starter = d.querySelector('#starter-list button');
    if (starter) starter.click();
    await wait(20);
    $('next-1').click();
    await wait(20);
    $('next-2').click();
    await until(() => !$('step-3').hidden && !$('download-docx').hidden, 'Manipulatives Step 3 ready');

    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'Manipulatives .docx download');
    expect(injectedScripts).toContain('packets_docx.js');
    const res = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(res.byName['word/document.xml']).toContain('Name:');
  }, 30000);

  it('AAC Boards lazy-loads packets_docx.js, rasterizes symbol SVGs to PNGs, and embeds word/media/image1.png in .docx', async () => {
    const page = mountPage('packets-aac.html', { mockCanvasRasterizer: true });
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');

    const starter = d.querySelector('#starter-list button');
    if (starter) starter.click();
    await wait(20);
    $('next-1').click();
    await wait(20);
    $('next-2').click();
    await until(() => !$('step-3').hidden && !$('download-docx').hidden, 'AAC Step 3 ready');

    $('download-docx').click();
    await until(() => downloads.some((dl) => dl.name.endsWith('.docx')), 'AAC .docx download');
    expect(injectedScripts).toContain('packets_docx.js');
    const res = await readDocxDownload(downloads[downloads.length - 1], w);
    expect(res.byName['word/document.xml']).toContain('Sentence Strip:');
    assertHasValidPng(res, 'AAC Board .docx');
  }, 30000);

  it('Add Up Results shows #export-student-docx inside #take-more-exports when a student is selected and exports a single-student conference handout .docx', async () => {
    const page = mountPage('packets-results.html');
    const { w, d, $, downloads, headScripts, injectedScripts } = page;
    expect(headScripts).not.toContain('packets_docx.js');
    expect(headScripts).not.toContain('packets_zip.js');

    const fold = $('take-more-exports');
    const btn = $('export-student-docx');
    expect(fold && !fold.open).toBe(true);
    expect(btn && btn.closest('#take-more-exports') === fold).toBe(true);
    expect(btn.hidden).toBe(true);

    // Load sample results -> a learner is selected automatically -> button reveals with student label
    $('samples').click();
    await until(() => !$('state-results').hidden && !btn.hidden, 'Results sample + student button visible');
    const pick = $('pick-learner');
    const studentName = pick && pick.selectedOptions[0]
      ? pick.selectedOptions[0].textContent.trim().replace(/\s*\(\d+\s+results?\)\s*$/i, '')
      : '';
    expect(studentName.length).toBeGreaterThan(0);
    expect(btn.textContent).toBe('Conference handout for ' + studentName + ' (.docx)');

    fold.open = true;
    btn.click();
    await until(() => downloads.some((dl) => dl.name.endsWith('-conference-handout.docx')), 'Conference handout .docx download');
    expect(injectedScripts).toEqual(['packets_zip.js', 'packets_docx.js']);
    const dl = downloads[downloads.length - 1];
    const res = await readDocxDownload(dl, w);
    const xml = res.byName['word/document.xml'];
    expect(xml).toContain('Student Progress &amp; Conference Handout');
    expect(xml).toContain(studentName);
    expect(xml).toContain('Score History');
    expect(xml).toContain('Parent / Teacher Notes');
  }, 30000);
});
