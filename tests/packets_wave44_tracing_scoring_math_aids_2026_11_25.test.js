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

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_200X40 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAAoAQMAAACq5z9fAAAAA1BMVEX///+nxBvIAAAAEklEQVR42mNgGAWjYBSMglEAAAPoAAH6s4uKAAAAAElFTkSuQmCC';

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

describe('Wave 44 Pillar 1: Stroke-Guided Letter Tracing Strips (HTML, Live DOM, DOCX)', () => {
  it('generates monochrome primary handwriting SVG strips with start dots, directional arrows, descenders, and scaffolded vs independent modes', () => {
    const capS = cards.buildLetterTracingStripSvg('S', { scaffolded: true });
    expect(capS).toContain('<svg');
    expect(capS).not.toContain('http://');
    expect(capS).toContain('<title>Trace letter S (1 stroke)</title>');
    expect(capS).toContain('<polygon ');
    expect(capS).toContain('stroke-dasharray="6 5"');

    const capE = cards.buildLetterTracingStripSvg('E', { scaffolded: true, standalone: true });
    expect(capE).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(capE).toContain('<title>Trace letter E (4 strokes)</title>');
    expect(capE).toContain('>4</text>');

    const descG = cards.buildLetterTracingStripSvg('g', { scaffolded: true });
    expect(descG).toContain('viewBox="0 0 600 174"');
    expect(descG).toContain('y1="160"');

    const indepA = cards.buildLetterTracingStripSvg('a', { scaffolded: false });
    expect(indepA).not.toContain('<polygon ');
    expect(indepA).toContain('stroke-dasharray="6 5"');

    const fallback = cards.buildLetterTracingStripSvg('7', { scaffolded: true });
    expect(fallback).toContain('>7</text>');

    expect(cards.wsLetterStrokeCue('S')).toContain('1 stroke');
    expect(cards.wsLetterStrokeCue('A')).toContain('3 strokes');
  });

  it('embeds inline stroke-guided SVG strips + stroke cues in standalone HTML with zero http:// URLs and embeds real PNG strips in DOCX', () => {
    const html = cards.buildWordSoundsWorksheetHtml({
      title: 'Tracing Pack',
      words: ['sun', 'goat'],
      activities: ['letter_tracing'],
    }, { pictures: false, hints: true, answerKey: true });

    expect(html).not.toMatch(/https?:\/\//i);
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelectorAll('img')).toHaveLength(0);
    const rows = doc.querySelectorAll('section[data-activity="letter_tracing"] .ws-trace-row');
    expect(rows.length).toBe(4); // S, s, G, g
    expect(rows[0].querySelector('svg.ws-trace-svg')).not.toBeNull();
    expect(rows[0].querySelector('.ws-trace-cue').textContent).toContain('stroke');
    expect(rows[0].textContent).toContain('S');

    // DOCX with raster PNG traceStripUri embeds real image bytes + w:drawing + strokeCue
    const docxRes = docx.buildWordSoundsDocx({
      title: 'Tracing DOCX',
      sections: [{
        activity: 'letter_tracing',
        label: 'Letter Trace',
        directions: 'Trace each letter.',
        items: [{
          word: 'sun',
          parts: [
            { letter: 'S', kind: 'capital', traceStripUri: PNG_200X40, strokeCue: '1 stroke: Start at dot 1 and curve left and around.' },
            { letter: 's', kind: 'lowercase', traceStripUri: '', strokeCue: '1 stroke: Start at dot 1 and curve left and around.' },
          ],
        }],
      }],
      answerKeyOn: false,
    }, { zip: zipLib });

    const files = parseStoreZip(docxRes.bytes);
    expect(files['word/media/image1.png']).toBeDefined();
    expect(files['word/media/image1.png'][0]).toBe(0x89);
    expect(files['word/media/image1.png'][1]).toBe(0x50);
    const docXml = new TextDecoder().decode(files['word/document.xml']);
    expect(docXml).toContain('<w:drawing>');
    expect(docXml).toContain('1 stroke: Start at dot 1 and curve left and around.');
  });
});

describe('Wave 44 Pillar 2: CTOPP-2 Audio Companion Live Scoring, Pre-Filled Record Sheets & CSV Export', () => {
  const samplePlan = cards.buildWordSoundsAudioPlan({
    title: 'CTOPP Blend & Trace',
    words: ['cat', 'sun'],
    activities: ['blending', 'letter_tracing'],
  }, { pictures: false });

  it('pre-fills HTML and DOCX Teacher Record & Scoring Sheets when scoreState is provided and stays blank when omitted', () => {
    const scoreState = {
      studentName: 'BlueHeron7',
      examiner: 'Ms. Rivera',
      date: '2026-11-25',
      items: {
        '0': { score: 1, repeats: 1, note: 'blended smoothly' },
        '1': { score: 0, repeats: 2, note: 'missed final /n/' },
        '2': { done: true, note: 'good grip' },
      },
      notes: 'Focus on final consonant blending next.',
    };

    const filledHtml = cards.buildAudioScoringSheetHtml(samplePlan, { slow: true, scoreState });
    const fDoc = new JSDOM(filledHtml).window.document;
    expect(filledHtml).toContain('BlueHeron7');
    expect(filledHtml).toContain('Ms. Rivera');
    expect(filledHtml).toContain('blended smoothly');
    expect(filledHtml).toContain('missed final /n/');
    expect(fDoc.body.textContent).toContain('1 / 2');
    expect(fDoc.body.textContent).toContain('50');
    expect(fDoc.querySelectorAll('.sc-bub.is-picked')).toHaveLength(2);
    expect(fDoc.querySelectorAll('.sc-box.is-checked').length).toBeGreaterThanOrEqual(2);

    const blankHtml = cards.buildAudioScoringSheetHtml(samplePlan, { slow: false });
    const bDoc = new JSDOM(blankHtml).window.document;
    expect(bDoc.querySelectorAll('.sc-bub.is-picked')).toHaveLength(0);
    expect(bDoc.querySelectorAll('.sc-box.is-checked')).toHaveLength(0);

    const filledDocx = docx.buildScoringSheetDocx(samplePlan, { zip: zipLib, slow: true, scoreState });
    const xml = new TextDecoder().decode(parseStoreZip(filledDocx.bytes)['word/document.xml']);
    expect(xml).toContain('BlueHeron7');
    expect(xml).toContain('Ms. Rivera');
    expect(xml).toContain('[1] \u2713');
    expect(xml).toContain('[0] \u2717');
    expect(xml).toContain('missed final /n/');
    expect(xml).toContain('1 / 2');
    expect(xml).toContain('50');
    expect(xml).toContain('\u2611 Used slow playback');
    expect(xml).toContain('\u2611 Repeated items');
    expect(xml).toContain('Focus on final consonant blending next.');

    const blankDocx = docx.buildScoringSheetDocx(samplePlan, { zip: zipLib, slow: false });
    const blankXml = new TextDecoder().decode(parseStoreZip(blankDocx.bytes)['word/document.xml']);
    expect(blankXml).toContain('________ / 2');
    expect(blankXml).not.toContain('\u2611');
  });

  it('builds formula-injection-safe UTF-8 BOM CSV with item scores, repeats, and summary row', () => {
    const csv = cards.buildAudioScoresCsv(samplePlan, {
      studentName: '=CMD()',
      examiner: 'Ms. Rivera',
      date: '2026-11-25',
      items: {
        '0': { score: 1, repeats: 0, note: '+fast, clean' },
        '1': { score: 0, repeats: 2, note: 'said "sat"' },
      },
    }, { slow: false });

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain("'=CMD()");
    expect(csv).toContain('"\'+fast, clean"');
    expect(csv).toContain('"said ""sat"""');
    expect(csv).toContain('SUMMARY,2/2 scored');
    expect(csv).toContain('50%');
    expect(csv).toContain('1/2');
  });

  it('supports interactive live scoring, keyboard shortcuts (1/0/P), pre-filled print sheet, and offline CSV download inside standalone Audio Companion HTML', () => {
    const html = cards.buildWordSoundsAudioCompanionHtml({
      title: 'Live Scoring Companion',
      words: ['cat', 'sun'],
      activities: ['blending'],
    });
    const downloads = [];
    const blobs = [];
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'https://packets.test/audio.html',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
        w.URL.createObjectURL = (b) => { blobs.push(b); return 'blob:csv'; };
        w.URL.revokeObjectURL = () => {};
        w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.getAttribute('download')); };
      },
    });
    doms.push(dom);
    const d = dom.window.document;
    const stu = d.querySelector('input[aria-label="Student or code name"]');
    stu.value = 'RedFox3';
    stu.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    // Score item 1 correct via keyboard shortcut '1' and bump repeat via 'p'
    d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    const noteInp = d.querySelector('input[aria-label="Item note"]');
    noteInp.value = 'good blending';
    noteInp.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    // Advance to item 2 and score 0
    d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '0', bubbles: true }));

    expect(d.querySelector('.score-pill').textContent).toContain('1 / 2 (50%)');
    const pr = d.getElementById('print-record');
    expect(pr.textContent).toContain('RedFox3');
    expect(pr.textContent).toContain('good blending');
    expect(pr.querySelectorAll('.pr-b.is-picked')).toHaveLength(2);

    d.getElementById('download-csv').click();
    expect(downloads[0]).toBe('live-scoring-companion-scores.csv');
    expect(blobs[0].body).toContain('RedFox3');
    expect(blobs[0].body).toContain('good blending');
    expect(blobs[0].body).toContain('1/2');
  });
});

describe('Wave 44 Pillar 3: Embedded Math Visual Aids in DOCX & Step 3 Options', () => {
  it('embeds visual model PNGs in 2-column card layout with Workspace boxes inside buildMathWorksheetDocx', () => {
    const res = docx.buildMathWorksheetDocx({
      title: 'Scaffolded Addition',
      scaffolded: true,
      layout: 'horizontal',
      density: 'primary',
      facts: [
        { a: 4, b: 3, op: 'add', aidUri: PNG_200X40, aidLabel: 'Ten-frame for 4 + 3' },
        { a: 6, b: 5, op: 'add', aidUri: PNG_1X1, aidLabel: 'Ten-frame for 6 + 5' },
      ],
      answerKeyOn: true,
    }, { zip: zipLib });

    const files = parseStoreZip(res.bytes);
    expect(files['word/media/image1.png']).toBeDefined();
    expect(files['word/media/image2.png']).toBeDefined();
    const xml = new TextDecoder().decode(files['word/document.xml']);
    expect(xml).toContain('<w:drawing>');
    expect(xml).toContain('Workspace');
    expect(xml).toContain('Teacher Answer Key');
  });

  it('wires Step 3 Worksheet & Word (.docx) options and adds Scaffolded + Independent .docx files inside the Classroom Bundle .zip', async () => {
    const html = read('packets-math-practice.html');
    const blobs = [];
    const downloads = [];
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'https://packets.test/packets-math-practice.html',
      beforeParse(w) {
        w.Blob = class {
          constructor(parts, opts) {
            this.parts = parts;
            this.type = opts && opts.type;
          }
        };
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
    // Pre-load packets_docx.js on window so ensureDocx() resolves immediately in JSDOM
    w.eval(read('packets_docx.js'));

    // Step 1 -> Step 2 -> Step 3
    const radAdd = d.querySelector('input[name="kind"][value="add"]');
    radAdd.checked = true;
    radAdd.dispatchEvent(new w.Event('change', { bubbles: true }));
    const firstSet = d.querySelector('input[name="set"]');
    firstSet.checked = true;
    firstSet.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-1').click();
    const radCcc = d.querySelector('input[name="method"][value="ccc"]');
    radCcc.checked = true;
    radCcc.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-2').click();

    for (let i = 0; i < 60 && d.getElementById('download-docx').hidden; i++) {
      await new Promise((r) => setTimeout(r, 15));
    }
    expect(d.getElementById('math-ws-options').hidden).toBe(false);

    // Switch layout to stacked vertical & size to primary & download .docx
    d.getElementById('f-ws-layout').value = 'vertical';
    d.getElementById('f-ws-density').value = 'primary';
    d.getElementById('f-ws-key').checked = false;
    d.getElementById('download-docx').click();
    for (let i = 0; i < 60 && !downloads.some((n) => n && n.endsWith('.docx')); i++) {
      await new Promise((r) => setTimeout(r, 15));
    }
    expect(downloads.some((n) => n && n.endsWith('-math-worksheet.docx'))).toBe(true);
    const docxBlob = blobs[blobs.length - 1];
    const docxBytes = Buffer.concat(docxBlob.parts.map((p) => Buffer.from(p)));
    const docxXml = new TextDecoder().decode(parseStoreZip(docxBytes)['word/document.xml']);
    expect(docxXml).not.toContain('Teacher Answer Key');

    // Download classroom bundle (.zip) and verify all 6 files (4 HTML + 2 DOCX)
    d.getElementById('f-ws-key').checked = true;
    d.getElementById('download-bundle').click();
    for (let i = 0; i < 60 && !downloads.some((n) => n && n.endsWith('-math-classroom-bundle.zip')); i++) {
      await new Promise((r) => setTimeout(r, 15));
    }
    const zipBlob = blobs[blobs.length - 1];
    const zipBytes = Buffer.concat(zipBlob.parts.map((p) => Buffer.from(p)));
    const entries = parseStoreZip(zipBytes);
    expect(Object.keys(entries).sort()).toEqual([
      '01-Interactive-Math-Practice.html',
      '02-Worksheet-Scaffolded.html',
      '03-Worksheet-Independent.html',
      '04-Teacher-Answer-Key.html',
      '05-Worksheet-Scaffolded.docx',
      '06-Worksheet-Independent.docx',
    ]);
    expect(parseStoreZip(entries['05-Worksheet-Scaffolded.docx'])['word/document.xml']).toBeDefined();
    expect(parseStoreZip(entries['06-Worksheet-Independent.docx'])['word/document.xml']).toBeDefined();
  });
});
