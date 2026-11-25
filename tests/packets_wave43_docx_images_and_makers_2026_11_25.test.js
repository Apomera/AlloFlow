// Wave 43 (2026-11-25): Unit tests for embedded PNG/JPEG pictures, prepareImagesAsync,
// buildAacBoardDocx, buildGeneralHandoutDocx, and single-student conference mode in packets_docx.js.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const Zip = require('../packets_zip.js');
const Docx = require('../packets_docx.js');

const REQUIRED_PARTS = [
  '[Content_Types].xml',
  '_rels/.rels',
  'word/_rels/document.xml.rels',
  'word/styles.xml',
  'word/document.xml',
];

// Genuine 1x1 RGBA PNG (67 bytes)
const PNG_1X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_1X1_URI = 'data:image/png;base64,' + PNG_1X1_B64;

// Minimal valid 2x1 PNG header (magic + IHDR width=2, height=1) for aspect-preserving EMU check
function makePngUri(width, height) {
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 0xFF, (width >>> 16) & 0xFF, (width >>> 8) & 0xFF, width & 0xFF,
    (height >>> 24) & 0xFF, (height >>> 16) & 0xFF, (height >>> 8) & 0xFF, height & 0xFF,
    0x08, 0x06, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
  return 'data:image/png;base64,' + Buffer.from(bytes).toString('base64');
}

// Minimal valid JPEG SOI + SOF0 (width=4, height=2) + EOI
const JPEG_4X2_BYTES = new Uint8Array([
  0xFF, 0xD8,
  0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x02, 0x00, 0x04, 0x01, 0x01, 0x11, 0x00,
  0xFF, 0xD9,
]);
const JPEG_4X2_URI = 'data:image/jpeg;base64,' + Buffer.from(JPEG_4X2_BYTES).toString('base64');

const SVG_SAMPLE_URI = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2224%22%2F%3E%3C%2Fsvg%3E';

const decoder = new TextDecoder('utf-8');
const xmlParser = new (new JSDOM().window.DOMParser)();

function inspectDocx(result) {
  expect(result).toBeTruthy();
  expect(Array.isArray(result.parts)).toBe(true);
  expect(ArrayBuffer.isView(result.bytes)).toBe(true);
  expect(result.bytes[0]).toBe(0x50);
  expect(result.bytes[1]).toBe(0x4B);
  expect(result.size).toBe(result.bytes.length);
  expect(result.filename.endsWith('.docx')).toBe(true);
  expect(result.mime).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  const entries = Zip.readZip(result.bytes);
  const names = entries.map((e) => e.name);
  for (const part of REQUIRED_PARTS) {
    expect(names, 'missing OOXML part ' + part).toContain(part);
  }
  const xmlByName = Object.create(null);
  const binByName = Object.create(null);
  for (const entry of entries) {
    expect(entry.crcOk, 'CRC mismatch on ' + entry.name).toBe(true);
    if (entry.name.startsWith('word/media/')) {
      binByName[entry.name] = entry.bytes;
    } else {
      const xml = decoder.decode(entry.bytes);
      const parsed = xmlParser.parseFromString(xml, 'text/xml');
      const err = parsed.querySelector('parsererror');
      expect(err, 'XML parse error in ' + entry.name + ': ' + (err ? err.textContent : '')).toBeNull();
      xmlByName[entry.name] = xml;
    }
  }
  return { entries, xmlByName, binByName };
}

function assertEmbeddedPng(inspected, mediaPath = 'word/media/image1.png') {
  const relTarget = mediaPath.replace(/^word\//, '');
  const pngBytes = inspected.binByName[mediaPath];
  expect(pngBytes, 'missing media file ' + mediaPath).toBeTruthy();
  expect(pngBytes[0]).toBe(0x89);
  expect(pngBytes[1]).toBe(0x50);
  expect(pngBytes[2]).toBe(0x4E);
  expect(pngBytes[3]).toBe(0x47);
  expect(inspected.xmlByName['[Content_Types].xml']).toContain('<Default Extension="png" ContentType="image/png"/>');
  expect(inspected.xmlByName['word/_rels/document.xml.rels']).toContain('Target="' + relTarget + '"');
  expect(inspected.xmlByName['word/_rels/document.xml.rels']).toContain('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
  expect(inspected.xmlByName['word/document.xml']).toContain('<w:drawing>');
  expect(inspected.xmlByName['word/document.xml']).toContain('r:embed="rId2"');
}

describe('Wave 43: packets_docx.js embedded PNG/JPEG pictures, AAC, General Handout, and Conference mode', () => {
  it('enforces offline zero-network, zero-innerHTML, American spelling, zero non-comment AI, and exports all Wave 43 APIs', () => {
    const src = readFileSync(resolve(process.cwd(), 'packets_docx.js'), 'utf8');
    expect(src).not.toMatch(/innerHTML|document\.write|\beval\s*\(|new\s+Function|XMLHttpRequest|\bfetch\s*\(|WebSocket/);
    expect(src).not.toMatch(/https?:\/\//i);
    const british = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    expect(british.exec(src)).toBeNull();
    for (const line of src.split('\n')) {
      if (/\bAI\b/.test(line)) {
        expect(line.trim().startsWith('//'), 'Unexpected AI reference: ' + line).toBe(true);
      }
    }

    const expectedFns = [
      'prepareImagesAsync',
      'buildWordSoundsDocx',
      'buildVocabDocx',
      'buildReadAlongDocx',
      'buildScoringSheetDocx',
      'buildMathWorksheetDocx',
      'buildMazeWorksheetDocx',
      'buildChoiceWorksheetDocx',
      'buildProgressReportDocx',
      'buildAacBoardDocx',
      'buildGeneralHandoutDocx',
      'downloadDocx',
    ];
    for (const fn of expectedFns) {
      expect(typeof Docx[fn], 'module.exports.' + fn).toBe('function');
    }

    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://packets.test/' });
    const w = dom.window;
    w.eval(readFileSync(resolve(process.cwd(), 'packets_zip.js'), 'utf8'));
    w.eval(src);
    for (const fn of expectedFns) {
      expect(typeof w.AlloPacketDocx[fn], 'window.AlloPacketDocx.' + fn).toBe('function');
    }
    dom.window.close();
  });

  it('embeds real PNG & JPEG pictures in buildVocabDocx Part 3 while falling back cleanly when non-raster', () => {
    const res = Docx.buildVocabDocx({
      title: 'Animal Habitats',
      wordBank: ['frog', 'desert', 'forest'],
      pictureItems: [
        { word: 'frog', uri: PNG_1X1_URI },
        { word: 'desert', uri: JPEG_4X2_URI },
        { word: 'forest', uri: SVG_SAMPLE_URI },
      ],
      answerKeyOn: true,
    });
    const inspected = inspectDocx(res);
    assertEmbeddedPng(inspected, 'word/media/image1.png');

    // Second image is a 4x2 JPEG -> aspect-preserving 1.05" x 0.525" (960120 x 480060 EMU)
    expect(inspected.binByName['word/media/image2.jpg']).toBeTruthy();
    expect(inspected.xmlByName['[Content_Types].xml']).toContain('<Default Extension="jpg" ContentType="image/jpeg"/>');
    expect(inspected.xmlByName['word/_rels/document.xml.rels']).toContain('Target="media/image2.jpg"');
    const docXml = inspected.xmlByName['word/document.xml'];
    expect(docXml).toContain('cx="960120" cy="960120"'); // 1.05" x 1.05" for 1x1 PNG
    expect(docXml).toContain('cx="960120" cy="480060"'); // 1.05" x 0.525" for 4x2 JPEG
    // Slot 1 & 2 have real drawings (no placeholder); slot 3 (SVG) falls back to [ Picture #3 ]
    expect(docXml).not.toContain('[ Picture #1 ]');
    expect(docXml).not.toContain('[ Picture #2 ]');
    expect(docXml).toContain('[ Picture #3 ]');
    // Does not leak picture answer words in student section before answer key
    const [studentPart, keyPart] = docXml.split('<w:br w:type="page"/>');
    expect(studentPart).not.toContain('descr="frog"');
    expect(keyPart).toContain('Picture #1 \u2014 frog');
  });

  it('embeds real 0.65" PNG thumbnails in buildWordSoundsDocx via item.pictureUri and model.pictureFor', () => {
    const widePng = makePngUri(200, 100);
    const res = Docx.buildWordSoundsDocx({
      title: 'Phonics Pictures',
      pictureFor: (word) => (word === 'sun' ? widePng : ''),
      sections: [
        {
          activity: 'counting',
          label: 'Sound Counting',
          items: [
            { word: 'cat', phonemes: ['k', 'a', 't'], pictureUri: PNG_1X1_URI, customPrompt: 'Tap each sound in:' },
            { word: 'sun', phonemes: ['s', 'u', 'n'] },
          ],
        },
        {
          activity: 'orthography',
          label: 'Sight & Spell',
          items: [{ word: 'frog', phonemes: ['f', 'r', 'o', 'g'], pictureUri: PNG_1X1_URI, customPrompt: 'Spell mystery word #1:' }],
        },
      ],
      answerKeyOn: true,
    });
    const inspected = inspectDocx(res);
    assertEmbeddedPng(inspected, 'word/media/image1.png');
    expect(inspected.binByName['word/media/image2.png']).toBeTruthy();

    const docXml = inspected.xmlByName['word/document.xml'];
    expect(docXml).toContain('cx="594360" cy="594360"'); // 0.65" x 0.65"
    expect(docXml).toContain('cx="594360" cy="297180"'); // 0.65" x 0.325"
    expect(docXml).toContain('Tap each sound in:');
    expect(docXml).toContain('Spell mystery word #1:');
    // Repeated PNG_1X1_URI is deduplicated in word/media but gets unique wp:docPr ids
    expect(Object.keys(inspected.binByName)).toHaveLength(2);
    expect(docXml).toContain('<wp:docPr id="1"');
    expect(docXml).toContain('<wp:docPr id="2"');
    expect(docXml).toContain('<wp:docPr id="3"');
    // Orthography hidden word still never leaks before page break
    const [studentPart, keyPart] = docXml.split('<w:br w:type="page"/>');
    expect(studentPart).not.toContain('frog');
    expect(keyPart).toContain('frog');
  });

  it('embeds real 0.7" PNG thumbnail in buildReadAlongDocx Part 2 Reading Notes & Visual Supports', () => {
    const res = Docx.buildReadAlongDocx({
      title: 'Pond Ecosystem',
      paragraphs: [{ text: 'Frogs live in wetlands near clear water.' }],
      customSupports: [
        { quote: 'wetlands', line: 0, text: 'Land that stays wet most of the year.', imgUri: PNG_1X1_URI },
        { quote: 'clear', line: 0, text: 'Easy to see through.' },
      ],
      answerKeyOn: false,
    });
    const inspected = inspectDocx(res);
    assertEmbeddedPng(inspected, 'word/media/image1.png');
    const docXml = inspected.xmlByName['word/document.xml'];
    expect(docXml).toContain('cx="640080" cy="640080"'); // 0.7" x 0.7"
    expect(docXml).toContain('wetlands (sentence 1)');
    expect(docXml).toContain('Easy to see through.');
  });

  it('rasterizes SVG data URIs via prepareImagesAsync when canvas+Image exist and falls back gracefully in Node/JSDOM', async () => {
    const origModel = {
      title: 'Raster Test',
      pictureItems: [{ word: 'sun', uri: SVG_SAMPLE_URI }],
      customSupports: [{ quote: 'sun', text: 'A star', imgUri: SVG_SAMPLE_URI }],
      cells: [{ label: 'More', picture: SVG_SAMPLE_URI }],
      pictureFor: () => SVG_SAMPLE_URI,
      sections: [{ activity: 'counting', items: [{ word: 'sun' }] }],
    };

    // 1. Node fallback (no canvas): resolves cleanly without mutating original
    const fallbackOut = await Docx.prepareImagesAsync(origModel, null, null);
    expect(fallbackOut).not.toBe(origModel);
    expect(fallbackOut.pictureItems[0].uri).toBe(SVG_SAMPLE_URI);
    expect(fallbackOut.cells[0].picture).toBe(SVG_SAMPLE_URI);

    // 2. Mocked browser canvas + Image: rasterizes SVG URIs to PNG data URIs
    class MockImage {
      constructor() {
        this.naturalWidth = 120;
        this.naturalHeight = 120;
      }
      set src(val) {
        this._src = val;
        queueMicrotask(() => {
          if (typeof this.onload === 'function') this.onload();
        });
      }
    }
    const mockWin = { Image: MockImage, setTimeout, clearTimeout };
    const mockDoc = {
      createElement: (tag) => {
        if (tag !== 'canvas') return {};
        return {
          width: 0,
          height: 0,
          getContext: () => ({ clearRect: () => {}, drawImage: () => {} }),
          toDataURL: () => PNG_1X1_URI,
        };
      },
    };

    const prepared = await Docx.prepareImagesAsync(origModel, mockWin, mockDoc);
    expect(prepared.pictureItems[0].uri).toBe(PNG_1X1_URI);
    expect(prepared.customSupports[0].imgUri).toBe(PNG_1X1_URI);
    expect(prepared.cells[0].picture).toBe(PNG_1X1_URI);
    expect(prepared.sections[0].items[0].pictureUri).toBe(PNG_1X1_URI);
    expect(prepared.pictureFor('sun')).toBe(PNG_1X1_URI);
    // Original model remains untouched
    expect(origModel.pictureItems[0].uri).toBe(SVG_SAMPLE_URI);
    expect(origModel.cells[0].picture).toBe(SVG_SAMPLE_URI);
  });

  it('builds AAC Communication Board .docx with Sentence Strip, Fitzgerald Key tints, mono toggle, and embedded PNGs', () => {
    const fitzRes = Docx.buildAacBoardDocx({
      title: 'Core Classroom Board',
      subtitle: '12-cell starter communication board',
      columns: 4,
      rows: 2,
      colorMode: 'fitzgerald',
      includeSentenceStrip: true,
      cells: [
        { label: 'I', category: 'pronoun', picture: PNG_1X1_URI, core: true },
        { label: 'want', category: 'verb', imgUri: PNG_1X1_URI, core: true },
        { label: 'more', category: 'descriptor', colorHex: '#DBEAFE' },
        { label: 'help', category: 'social' },
        { label: 'break', category: 'noun' },
      ],
      credits: ['Symbols: Mulberry Symbols (CC BY-SA).'],
    });

    expect(fitzRes.filename).toBe('core-classroom-board-aac-board.docx');
    const fitzInsp = inspectDocx(fitzRes);
    assertEmbeddedPng(fitzInsp, 'word/media/image1.png');
    const fitzXml = fitzInsp.xmlByName['word/document.xml'];
    expect(fitzXml).toContain('Core Classroom Board');
    expect(fitzXml).toContain('Sentence Strip:');
    expect(fitzXml).toContain('cx="777240" cy="777240"'); // 0.85" x 0.85"
    expect(fitzXml).toContain('w:fill="FFF9C4"'); // pronoun soft yellow
    expect(fitzXml).toContain('w:fill="DCFCE7"'); // verb soft green
    expect(fitzXml).toContain('w:fill="DBEAFE"'); // explicit descriptor blue
    expect(fitzXml).toContain('w:fill="FCE7F3"'); // social soft pink
    expect(fitzXml).toContain('w:fill="FFEDD5"'); // noun soft orange
    expect(fitzXml).toContain('Mulberry Symbols');

    // Monochrome mode removes tints and can omit sentence strip
    const monoRes = Docx.buildAacBoardDocx({
      title: 'Mono Core Board',
      columns: 3,
      rows: 1,
      colorMode: 'mono',
      includeSentenceStrip: false,
      cells: [
        { label: 'yes', category: 'verb' },
        { label: 'no', category: 'negation' },
        { label: 'stop', colorHex: '#FEE2E2' },
      ],
    });
    const monoXml = inspectDocx(monoRes).xmlByName['word/document.xml'];
    expect(monoXml).not.toContain('Sentence Strip:');
    expect(monoXml).not.toContain('w:fill="DCFCE7"');
    expect(monoXml).not.toContain('w:fill="FEE2E2"');
    expect(monoXml).toContain('w:fill="FFFFFF"');
  });

  it('builds General Handout .docx across checklist, questions, table, first_then, cards, cloze, lines, and Teacher Answer Key', () => {
    const res = Docx.buildGeneralHandoutDocx({
      title: 'Morning Routine & Science Lab',
      subtitle: 'Universal Handout Verification',
      headerFields: { classPeriod: true, score: true },
      density: 'standard',
      directions: 'Follow each section carefully.',
      sections: [
        {
          heading: 'Step 1 — Life Skills Checklist',
          type: 'checklist',
          items: [
            { label: 'Wash hands', detail: 'Use soap for 20 seconds', imgUri: PNG_1X1_URI },
            'Gather lab notebook',
          ],
        },
        {
          heading: 'Step 2 — First / Then Support',
          type: 'first_then',
          first: { label: 'Finish Lab Observation', detail: 'Record 3 measurements' },
          then: { label: 'Choice Time', detail: '5 minutes drawing or reading' },
        },
        {
          heading: 'Step 3 — Observation Table',
          type: 'table',
          columns: ['Trial', 'Water Temp', 'Observation'],
          rows: [
            ['Trial 1', '22 C', ''],
            ['Trial 2', '45 C', ''],
          ],
        },
        {
          heading: 'Step 4 — Check Your Thinking',
          type: 'questions',
          items: [
            { prompt: 'Which cup warmed fastest?', choices: ['Cold cup', 'Warm cup'], answer: 1 },
            { prompt: 'Explain what you noticed.', writeLines: 2 },
          ],
        },
        {
          heading: 'Step 5 — Word Bank Cloze',
          type: 'cloze',
          wordBank: ['heat', 'dissolve', 'liquid'],
          items: [
            { before: 'Sugar will ', after: ' faster in warm water.', answer: 'dissolve' },
          ],
        },
        {
          heading: 'Step 6 — Strategy Cards',
          type: 'cards',
          items: [
            { title: 'Deep Breaths', detail: 'Breathe in 4, hold 4, out 4.', checkbox: true },
            { title: 'Ask for Help', detail: 'Raise hand or tap help card.', checkbox: true },
          ],
        },
        {
          heading: 'Step 7 — Reflection Lines',
          type: 'lines',
          writeLines: 3,
        },
      ],
      answerKey: [
        { heading: 'Lab Key', lines: ['Warm cup', 'dissolve'] },
      ],
      answerKeyOn: true,
    });

    expect(res.filename).toBe('morning-routine-science-lab-handout.docx');
    const inspected = inspectDocx(res);
    assertEmbeddedPng(inspected, 'word/media/image1.png');
    const xml = inspected.xmlByName['word/document.xml'];

    expect(xml).toContain('Morning Routine &amp; Science Lab');
    expect(xml).toContain('Step 1 \u2014 Life Skills Checklist');
    expect(xml).toContain('\u2610  ');
    expect(xml).toContain('Wash hands');
    expect(xml).toContain('FIRST');
    expect(xml).toContain('THEN');
    expect(xml).toContain('Finish Lab Observation');
    expect(xml).toContain('Choice Time');
    expect(xml).toContain('Water Temp');
    expect(xml).toContain('Trial 1');
    expect(xml).toContain('Which cup warmed fastest?');
    expect(xml).toContain('A.  ');
    expect(xml).toContain('Word Bank:');
    expect(xml).toContain('dissolve');
    expect(xml).toContain('Deep Breaths');
    expect(xml).toContain('<w:br w:type="page"/>');
    const [studentPart, keyPart] = xml.split('<w:br w:type="page"/>');
    expect(studentPart).not.toContain('Teacher Answer Key');
    expect(keyPart).toContain('Teacher Answer Key');
    expect(keyPart).toContain('Lab Key');
    expect(keyPart).toContain('Warm cup');

    // answerKeyOn: false omits page break and answer key
    const noKey = Docx.buildGeneralHandoutDocx({
      title: 'No Key Handout',
      sections: [{ heading: 'Notes', type: 'lines', writeLines: 2 }],
      answerKey: [{ heading: 'Key', lines: ['Secret'] }],
      answerKeyOn: false,
    });
    const noKeyXml = inspectDocx(noKey).xmlByName['word/document.xml'];
    expect(noKeyXml).not.toContain('<w:br w:type="page"/>');
    expect(noKeyXml).not.toContain('Teacher Answer Key');
  });

  it('builds Single-Student Conference Handout mode on buildProgressReportDocx', () => {
    const confRes = Docx.buildProgressReportDocx({
      studentName: 'BlueHeron7',
      conferenceDate: '2026-11-25',
      teacher: 'Ms. Rivera',
      summary: { avgPercent: 88, files: 2 },
      rows: [
        {
          learner: 'BlueHeron7',
          title: 'The Red Fox (Form A)',
          activity: 'CBM-Maze Reading',
          date: '2026-11-20',
          scoreText: '20 net (87%)',
          timeText: '3 min',
          supports: ['larger text', 'reading focus line'],
        },
        {
          learner: 'BlueHeron7',
          title: 'Multiplication 7s & 8s',
          activity: 'Math Practice',
          date: '2026-11-24',
          percent: 90,
          correct: 18,
          total: 20,
          supports: ['visual array'],
        },
      ],
      strengths: ['Strong reading accuracy on grade-level passages', 'Self-corrects using context clues'],
      missedItems: ['7 x 8', { item: '8 x 9', count: 2, wrong: '74' }],
      goals: ['Reach 24 net correct on CBM-Maze Form B by December 18'],
      notesLines: 4,
    }, { singleStudent: true });

    expect(confRes.filename).toBe('blueheron7-conference-handout.docx');
    const xml = inspectDocx(confRes).xmlByName['word/document.xml'];
    expect(xml).toContain('BlueHeron7 \u2014 Student Progress &amp; Conference Handout');
    expect(xml).toContain('Student / Code Name:');
    expect(xml).toContain('Conference Date:');
    expect(xml).toContain('2026-11-25');
    expect(xml).toContain('Teacher / Specialist:');
    expect(xml).toContain('Ms. Rivera');
    expect(xml).toContain('Score History');
    expect(xml).toContain('20 net (87%)');
    expect(xml).toContain('90% (18/20)');
    expect(xml).toContain('Strengths &amp; Helpful Supports');
    expect(xml).toContain('Strong reading accuracy on grade-level passages');
    expect(xml).toContain('larger text, reading focus line, visual array');
    expect(xml).toContain('Skills to Practice Next');
    expect(xml).toContain('8 x 9 (2x) [common: 74]');
    expect(xml).toContain('Learning Goals');
    expect(xml).toContain('Reach 24 net correct on CBM-Maze Form B');
    expect(xml).toContain('Parent / Teacher Notes');

    // Also works when singleStudent: true is set on the model itself
    const viaModel = Docx.buildProgressReportDocx({
      singleStudent: true,
      rows: [{ learner: 'PineOwl4', title: 'Word Sounds Check', date: '2026-11-25', percent: 85 }],
      notesPrompt: false,
    });
    expect(viaModel.filename).toBe('pineowl4-conference-handout.docx');
    const viaModelXml = inspectDocx(viaModel).xmlByName['word/document.xml'];
    expect(viaModelXml).toContain('PineOwl4 \u2014 Student Progress &amp; Conference Handout');
    expect(viaModelXml).not.toContain('Parent / Teacher Notes');
  });
});
