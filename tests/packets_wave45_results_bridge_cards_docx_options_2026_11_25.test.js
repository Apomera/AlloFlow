// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const cards = require('../packets-print-cards.js');
const docx = require('../packets_docx.js');
const zipLib = require('../packets_zip.js');
const resultsReader = require('../packets_results_reader.js');

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function parseStoreZip(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dec = new TextDecoder('utf-8');
  const entries = {};
  let off = 0;
  while (off + 30 <= buf.length && view.getUint32(off, true) === 0x04034b50) {
    const compSize = view.getUint32(off + 18, true);
    const nameLen = view.getUint16(off + 26, true);
    const extraLen = view.getUint16(off + 28, true);
    const name = dec.decode(buf.subarray(off + 30, off + 30 + nameLen));
    const dataStart = off + 30 + nameLen + extraLen;
    entries[name] = buf.subarray(dataStart, dataStart + compSize);
    off = dataStart + compSize;
  }
  return entries;
}

const doms = [];
afterEach(() => {
  while (doms.length) {
    try { doms.pop().window.close(); } catch (_) {}
  }
  vi.restoreAllMocks();
});

describe('Wave 45 Pillar 1: Audio Companion -> Add Up Results (.json) Round-Trip', () => {
  it('exports standard alloflow-take-home-result JSON across Word Sounds, Vocab, and Read-Along that parses cleanly in packets_results_reader.js', async () => {
    const wsPlan = cards.buildWordSoundsAudioPlan({
      title: 'CTOPP Blending Check-In',
      words: ['cat', 'sun', 'dog'],
      activities: ['blending', 'letter_tracing'],
    });
    const wsJson = cards.buildAudioResultsJson(wsPlan, {
      studentName: 'BlueHeron7',
      examiner: 'Ms. Rivera',
      date: '2026-11-25',
      items: {
        '0': { score: 1, repeats: 0, note: '' },
        '1': { score: 1, repeats: 1, note: 'needed replay' },
        '2': { score: 0, repeats: 2, note: 'said dot' },
        '3': { done: true, note: 'neat S' },
      },
    }, { slow: true });

    const parsedWs = await resultsReader.read(JSON.stringify(wsJson), 'blending-results.json');
    expect(parsedWs.ok).toBe(true);
    expect(parsedWs.sessions).toHaveLength(1);
    const s = parsedWs.sessions[0];
    expect(s.learner).toBe('BlueHeron7');
    expect(s.title).toBe('CTOPP Blending Check-In');
    expect(s.summary.given).toBe(3);
    expect(s.summary.attempted).toBe(3);
    expect(s.summary.correct).toBe(2);
    expect(s.summary.firstTry).toBe(1);
    expect(s.summary.accuracyPct).toBe(67);
    expect(s.byStrand.some((st) => st.strand === 'hearing_sounds')).toBe(true);

    const vocabPlan = cards.buildVocabAudioPlan({
      title: 'Earth Science Vocab',
      entries: [
        { word: 'erosion', meaning: 'wearing away of rock', example: 'Water causes erosion.' },
        { word: 'sediment', meaning: 'small bits of rock', example: 'Rivers carry sediment.' },
      ],
    });
    const vocabJson = cards.buildAudioResultsJson(vocabPlan, {
      studentName: 'RedFox3',
      date: '2026-11-25',
      items: { '0': { score: 1, repeats: 0 }, '1': { score: 0, repeats: 1 } },
    });
    const parsedVocab = await resultsReader.read(JSON.stringify(vocabJson), 'vocab-results.json');
    expect(parsedVocab.ok).toBe(true);
    expect(parsedVocab.sessions[0].byStrand.some((st) => st.strand === 'vocabulary')).toBe(true);
    expect(parsedVocab.sessions[0].summary.correct).toBe(1);

    const raPlan = cards.buildReadAlongAudioPlan({
      title: 'Solar System Passage',
      sentences: ['The sun is a star.', 'Planets orbit the sun.'],
      questions: [{ prompt: 'What is the sun?', answer: 'A star' }],
    });
    const raJson = cards.buildAudioResultsJson(raPlan, {
      studentName: 'GreenOwl5',
      date: '2026-11-25',
      items: { '0': { done: true }, '1': { done: true }, '2': { score: 1, repeats: 0 } },
    });
    const parsedRa = await resultsReader.read(JSON.stringify(raJson), 'ra-results.json');
    expect(parsedRa.ok).toBe(true);
    expect(parsedRa.sessions[0].byStrand.some((st) => st.strand === 'read_along')).toBe(true);
  });

  it('downloads valid Add Up Results JSON from the standalone offline Audio Companion HTML', async () => {
    const html = cards.buildWordSoundsAudioCompanionHtml({
      title: 'Offline Bridge Pack',
      words: ['cat', 'sun'],
      activities: ['blending'],
    });
    const blobs = [];
    const downloads = [];
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'https://packets.test/audio.html',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
        w.URL.createObjectURL = (b) => { blobs.push(b); return 'blob:json'; };
        w.URL.revokeObjectURL = () => {};
        w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.getAttribute('download')); };
      },
    });
    doms.push(dom);
    const d = dom.window.document;
    const stu = d.querySelector('input[aria-label="Student or code name"]');
    stu.value = 'SilverJay4';
    stu.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    d.getElementById('download-results-json').click();

    expect(downloads[0]).toBe('offline-bridge-pack-results.json');
    const parsed = await resultsReader.read(blobs[0].body, downloads[0]);
    expect(parsed.ok).toBe(true);
    expect(parsed.sessions[0].learner).toBe('SilverJay4');
    expect(parsed.sessions[0].summary.correct).toBe(1);
  });
});

describe('Wave 45 Pillar 2: Editable Word Cards (.docx) with Embedded Pictures & Dashed Cut Lines', () => {
  it('builds 4/6/12-per-page dashed cut-line Word Cards .docx with embedded PNGs, syllable words, and Word List', () => {
    const res = docx.buildWordCardsDocx({
      title: 'Short A Deck',
      size: 6,
      shows: 'both',
      lines: true,
      pages: 'both',
      cards: [
        { word: 'cat', displayWord: 'cat', pictureUri: PNG_1X1 },
        { word: 'rabbit', displayWord: 'rab\u00b7bit', pictureUri: PNG_1X1 },
        { word: 'sun', displayWord: 'sun', pictureUri: '' },
      ],
      credits: ['Pictures: Mulberry Symbols (CC BY-SA 4.0).'],
    }, { zip: zipLib });

    const files = parseStoreZip(res.bytes);
    expect(files['word/media/image1.png']).toBeDefined();
    const xml = new TextDecoder().decode(files['word/document.xml']);
    expect(xml).toContain('<w:drawing>');
    expect(xml).toContain('w:val="dashed"');
    expect(xml).toContain('rab\u00b7bit');
    expect(xml).toContain('Short A Deck \u2014 Word List');
    expect(xml).toContain('Mulberry Symbols');

    const resListOnly = docx.buildWordCardsDocx({
      title: 'List Only',
      size: 12,
      shows: 'word',
      lines: false,
      pages: 'list',
      cards: [{ word: 'dog', displayWord: 'dog', pictureUri: PNG_1X1 }],
    }, { zip: zipLib });
    const listFiles = parseStoreZip(resListOnly.bytes);
    expect(listFiles['word/media/image1.png']).toBeUndefined();
    const listXml = new TextDecoder().decode(listFiles['word/document.xml']);
    expect(listXml).toContain('List Only \u2014 Word List');
    expect(listXml).not.toContain('cut along dashed lines');
  });

  it('wires #pc-cards-docx inside the Print word cards overlay', async () => {
    const dom = new JSDOM('<!doctype html><html><body><button id="open">Cards</button></body></html>', {
      url: 'https://packets.test/packets-make.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    const blobs = [];
    const downloads = [];
    w.Blob = class { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } };
    w.URL.createObjectURL = (b) => { blobs.push(b); return 'blob:docx'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.getAttribute('download')); };
    w.AlloPacketZip = zipLib;
    w.AlloPacketDocx = docx;

    const inst = cards.create(d, w);
    await inst.open({
      title: 'CVC Cards',
      words: ['cat', 'sun'],
      pictures: true,
      own: () => Promise.resolve({ cat: { picture: { dataUri: PNG_1X1 } } }),
    });
    const btn = d.getElementById('pc-cards-docx');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(false);
    btn.click();
    for (let i = 0; i < 40 && !downloads.length; i++) await new Promise((r) => setTimeout(r, 15));
    expect(downloads[0]).toBe('cvc-cards-word-cards.docx');
    const bytes = Buffer.concat(blobs[0].parts.map((p) => Buffer.from(p)));
    const files = parseStoreZip(bytes);
    expect(files['word/media/image1.png']).toBeDefined();
    expect(new TextDecoder().decode(files['word/document.xml'])).toContain('CVC Cards');
  });
});

describe('Wave 45 Pillar 3: Print-Size & Word Options on Math Check, CBM-Maze, and Choice/Sort/Write', () => {
  it('exposes #check-docx-options, #f-docx-density, and #f-docx-key in packets-check.html and honors them in .docx export', async () => {
    const html = read('packets-check.html');
    const blobs = [];
    const downloads = [];
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'https://packets.test/packets-check.html',
      beforeParse(w) {
        w.Blob = class { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } };
        w.URL.createObjectURL = (b) => { blobs.push(b); return 'blob:' + blobs.length; };
        w.URL.revokeObjectURL = () => {};
        w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.getAttribute('download')); };
        w.HTMLElement.prototype.scrollIntoView = function () {};
      },
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    for (const sc of d.querySelectorAll('script[src]')) w.eval(read(sc.getAttribute('src')));

    const radComp = d.querySelector('input[name="check"][value="math_computation"]');
    radComp.checked = true;
    radComp.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-1').click();
    const firstGrade = d.querySelector('input[name="grade"]');
    if (firstGrade) {
      firstGrade.checked = true;
      firstGrade.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    d.getElementById('next-2').click();
    for (let i = 0; i < 80 && d.getElementById('download-docx').hidden; i++) await new Promise((r) => setTimeout(r, 20));

    expect(d.getElementById('check-docx-options').hidden).toBe(false);
    d.getElementById('f-docx-density').value = 'primary';
    d.getElementById('f-docx-key').checked = false;
    d.getElementById('download-docx').click();
    for (let i = 0; i < 40 && !downloads.some((n) => n && n.endsWith('.docx')); i++) await new Promise((r) => setTimeout(r, 15));

    const docxBlob = blobs[blobs.length - 1];
    const bytes = Buffer.concat(docxBlob.parts.map((p) => Buffer.from(p)));
    const xml = new TextDecoder().decode(parseStoreZip(bytes)['word/document.xml']);
    expect(xml).not.toContain('Teacher Answer Key');
    expect(xml).toContain('w:top="1080"'); // primary density margin (0.75in = 1080 twips)
    expect(xml).toContain('<w:sz w:val="42"/>'); // primary density title size (21pt = 42 half-points)
  });

  it('wires #f-docx-density in packets-maze.html and packets-choice.html', () => {
    const mazeDoc = new JSDOM(read('packets-maze.html')).window.document;
    const mazeSel = mazeDoc.getElementById('f-docx-density');
    expect(mazeSel).not.toBeNull();
    expect([...mazeSel.options].map((o) => o.value)).toEqual(['standard', 'primary', 'compact']);

    const choiceDoc = new JSDOM(read('packets-choice.html')).window.document;
    const choiceSel = choiceDoc.getElementById('f-docx-density');
    expect(choiceSel).not.toBeNull();
    expect([...choiceSel.options].map((o) => o.value)).toEqual(['standard', 'primary', 'compact']);
  });
});
