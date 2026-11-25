// Wave 41 (2026-11-25): Unit tests for packets_docx.js — offline pure-JS OOXML .docx generator.
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

const decoder = new TextDecoder('utf-8');
const xmlParser = new (new JSDOM().window.DOMParser)();

function inspectDocx(result) {
  expect(result).toBeTruthy();
  expect(Array.isArray(result.parts)).toBe(true);
  expect(result.parts.length).toBeGreaterThan(0);
  expect(ArrayBuffer.isView(result.bytes)).toBe(true);
  expect(result.bytes[0]).toBe(0x50); // 'P'
  expect(result.bytes[1]).toBe(0x4B); // 'K'
  expect(result.size).toBe(result.bytes.length);
  expect(result.filename.endsWith('.docx')).toBe(true);
  expect(result.mime).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  // Verify concat(parts) matches result.bytes and unpacks cleanly via AlloPacketZip.readZip
  const entries = Zip.readZip(result.bytes);
  const names = entries.map((e) => e.name);
  for (const part of REQUIRED_PARTS) {
    expect(names, 'missing OOXML part ' + part).toContain(part);
  }
  const byName = Object.create(null);
  for (const entry of entries) {
    expect(entry.crcOk, 'CRC mismatch on ' + entry.name).toBe(true);
    const xml = decoder.decode(entry.bytes);
    const parsed = xmlParser.parseFromString(xml, 'text/xml');
    const err = parsed.querySelector('parsererror');
    expect(err, 'XML parse error in ' + entry.name + ': ' + (err ? err.textContent : '')).toBeNull();
    byName[entry.name] = xml;
  }
  return { entries, byName };
}

describe('Wave 41: packets_docx.js OOXML .docx generator', () => {
  it('enforces offline zero-network, zero-innerHTML, American spelling, and zero-AI policy', () => {
    const src = readFileSync(resolve(process.cwd(), 'packets_docx.js'), 'utf8');
    expect(src).not.toMatch(/innerHTML|document\.write|\beval\s*\(|new\s+Function|XMLHttpRequest|\bfetch\s*\(|WebSocket/);
    const british = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    expect(british.exec(src)).toBeNull();
    for (const line of src.split('\n')) {
      if (/\bAI\b/.test(line)) {
        expect(line.trim().startsWith('//'), 'Unexpected AI reference: ' + line).toBe(true);
      }
    }
  });

  it('builds valid Word Sounds .docx across activity types, header fields, credits, and answer-key page break toggle', () => {
    const baseModel = {
      title: 'Short Vowel & Digraph Review',
      subtitle: 'Read each prompt aloud with students.',
      headerFields: { classPeriod: true, score: true },
      density: 'standard',
      answerKeyOn: true,
      hintsOn: true,
      credits: ['Symbols: Mulberry Symbols (CC BY-SA).'],
      sections: [
        {
          activity: 'mapping',
          label: 'Sound Mapping',
          directions: 'Write the letters for each sound in the boxes.',
          items: [{ word: 'ship', phonemes: ['sh', 'i', 'p'], graphemes: ['sh', 'i', 'p'], soundCount: 3, bank: ['p', 'sh', 'i'] }],
        },
        {
          activity: 'missing_letter',
          label: 'Missing Letter',
          directions: 'Circle the missing letter.',
          items: [{ word: 'cat', letters: ['c', '', 't'], hiddenIndex: 1, correctLetter: 'a', choices: ['a', 'e', 'i', 'o'] }],
        },
        {
          activity: 'word_scramble',
          label: 'Word Scramble',
          directions: 'Unscramble the tiles and write the word.',
          items: [{ word: 'sun', tiles: ['n', 's', 'u'] }],
        },
        {
          activity: 'letter_tracing',
          label: 'Letter Trace',
          directions: 'Trace each guide letter.',
          items: [{ word: 'sun', letter: 's', parts: [{ letter: 'S', kind: 'capital' }, { letter: 's', kind: 'lowercase' }] }],
        },
        {
          activity: 'word_families',
          label: 'Word Families',
          directions: 'Circle family words and build 3 more.',
          items: [{ word: 'cat', rime: 'at', chips: [{ text: 'hat', member: true }, { text: 'dog', member: false }], members: ['hat'] }],
        },
        {
          activity: 'sound_sort',
          label: 'Sound Sort',
          directions: 'Sort the words into matching columns.',
          items: [
            { word: 'sun', mode: 'first', sound: 's', chips: [{ text: 'sun', member: true }, { text: 'sock', member: true }] },
            { word: 'map', mode: 'first', sound: 'm', chips: [{ text: 'map', member: true }, { text: 'moon', member: true }] },
          ],
        },
        {
          activity: 'orthography',
          label: 'Sight & Spell',
          directions: 'Listen and write each word.',
          items: [{ word: 'frog', phonemes: ['f', 'r', 'o', 'g'], soundCount: 4, letterBank: ['g', 'f', 'o', 'r'] }],
        },
      ],
    };

    const withKey = Docx.buildWordSoundsDocx(baseModel);
    const { byName } = inspectDocx(withKey);
    const docXml = byName['word/document.xml'];

    expect(docXml).toContain('Short Vowel &amp; Digraph Review');
    expect(docXml).toContain('Read each prompt aloud with students.');
    expect(docXml).toContain('Name:');
    expect(docXml).toContain('Date:');
    expect(docXml).toContain('Class / Period:');
    expect(docXml).toContain('Score:');
    expect(docXml).toContain('Sound Mapping');
    expect(docXml).toContain('Letter bank:');
    expect(docXml).toContain('c ___ t');
    expect(docXml).toContain('Word Bank:');
    expect(docXml).toContain('Starts with /s/');
    expect(docXml).toContain('Starts with /m/');
    expect(docXml).toContain('_______at');
    expect(docXml).toContain('S    S    S');
    expect(docXml).toContain('Mulberry Symbols');
    expect(docXml).toContain('<w:br w:type="page"/>');
    expect(docXml).toContain('Teacher Answer Key &amp; Read-Aloud List');
    // Orthography word must appear ONLY in the Teacher Answer Key, not before the page break!
    const [studentPart, keyPart] = docXml.split('<w:br w:type="page"/>');
    expect(studentPart).not.toContain('frog');
    expect(keyPart).toContain('frog');

    // Toggle answerKeyOn: false omits page break & teacher key, and 1-row header when no classPeriod/score
    const noKey = Docx.buildWordSoundsDocx(Object.assign({}, baseModel, {
      answerKeyOn: false,
      headerFields: { classPeriod: false, score: false },
    }));
    const noKeyXml = inspectDocx(noKey).byName['word/document.xml'];
    expect(noKeyXml).not.toContain('<w:br w:type="page"/>');
    expect(noKeyXml).not.toContain('Teacher Answer Key');
    expect(noKeyXml).not.toContain('Class / Period:');
    expect(noKeyXml).not.toContain('Score:');
  });

  it('scales font sizes and writing line heights across compact (10pt), standard (11pt), and primary (13.5pt)', () => {
    const model = {
      title: 'Density Check',
      sections: [
        { activity: 'word_scramble', label: 'Word Scramble', directions: 'Unscramble.', items: [{ word: 'cat', tiles: ['t', 'c', 'a'] }] },
      ],
      answerKeyOn: false,
    };

    const compact = inspectDocx(Docx.buildWordSoundsDocx(model, { density: 'compact' })).byName;
    const standard = inspectDocx(Docx.buildWordSoundsDocx(model, { density: 'standard' })).byName;
    const primary = inspectDocx(Docx.buildWordSoundsDocx(model, { density: 'primary' })).byName;

    // Body font size in half-points: 10pt = 20, 11pt = 22, 13.5pt = 27
    expect(compact['word/styles.xml']).toContain('<w:sz w:val="20"/>');
    expect(standard['word/styles.xml']).toContain('<w:sz w:val="22"/>');
    expect(primary['word/styles.xml']).toContain('<w:sz w:val="27"/>');

    // Writing line spacing grows monotonically compact < standard < primary
    const extractWriteBefore = (xml) => {
      const m = xml.match(/w:val="dashed"[\s\S]*?<w:spacing w:before="(\d+)"/);
      return m ? Number(m[1]) : 0;
    };
    const cLine = extractWriteBefore(compact['word/document.xml']);
    const sLine = extractWriteBefore(standard['word/document.xml']);
    const pLine = extractWriteBefore(primary['word/document.xml']);
    expect(cLine).toBeGreaterThan(0);
    expect(sLine).toBeGreaterThan(cLine);
    expect(pLine).toBeGreaterThan(sLine);
  });

  it('builds valid Vocabulary .docx with Word Bank, Matching table, Cloze sentences, Picture slots, and Answer Key', () => {
    const vocabModel = {
      title: 'Ecosystem Words',
      subtitle: 'Unit 3 Science Vocabulary',
      headerFields: { classPeriod: true, score: false },
      density: 'standard',
      wordBankOn: true,
      wordBank: ['prey', 'habitat', 'predator'],
      matchWords: [
        { num: 1, word: 'habitat', meaning: 'the natural home of a plant or animal', answerLetter: 'B' },
        { num: 2, word: 'predator', meaning: 'an animal that hunts other animals', answerLetter: 'A' },
      ],
      matchDefs: [
        { letter: 'A', word: 'predator', meaning: 'an animal that hunts other animals' },
        { letter: 'B', word: 'habitat', meaning: 'the natural home of a plant or animal' },
      ],
      clozeItems: [
        { num: 1, word: 'habitat', hasCloze: true, before: 'A pond is a frog ', after: '.', answer: 'habitat', completed: 'A pond is a frog habitat.' },
        { num: 2, word: 'prey', hasCloze: false, prompt: 'Write your own sentence using "prey":', answer: 'prey' },
      ],
      pictureItems: [
        { word: 'habitat', uri: 'data:image/svg+xml;charset=utf-8,%3Csvg/%3E' },
        { word: 'predator', uri: 'data:image/svg+xml;charset=utf-8,%3Csvg/%3E' },
      ],
      answerKeyOn: true,
      hiddenParts: {},
      sectionOverrides: {
        cloze: { label: 'Part 2 — Sentence Practice', directions: 'Fill in each science term.' },
      },
      credits: ['Pictures: OpenMoji (CC BY-SA).'],
    };

    const res = Docx.buildVocabDocx(vocabModel);
    const { byName } = inspectDocx(res);
    const xml = byName['word/document.xml'];

    expect(xml).toContain('Ecosystem Words');
    expect(xml).toContain('Word Bank:');
    expect(xml).toContain('Part 1 — Match the Word to Its Meaning');
    expect(xml).toContain('Part 2 — Sentence Practice');
    expect(xml).toContain('Fill in each science term.');
    expect(xml).toContain('Part 3 — Name the Picture');
    expect(xml).toContain('Picture #1');
    expect(xml).toContain('Picture #2');
    // Must not embed raw SVG markup
    expect(xml).not.toContain('data:image/svg+xml');
    expect(xml).not.toContain('<svg');
    expect(xml).toContain('OpenMoji');
    expect(xml).toContain('<w:br w:type="page"/>');
    expect(xml).toContain('Teacher Answer Key');
    expect(xml).toContain('A pond is a frog habitat.');
  });

  it('builds valid Read-Along .docx with RTL <w:bidi/> support, Passage, Notes, Key Words, MC & open questions, and Answer Key', () => {
    const rtlModel = {
      title: 'قصة الثعلب',
      subtitle: 'اقرأ الفقرة ببطء',
      headerFields: { classPeriod: false, score: true },
      density: 'primary',
      lang: 'ar',
      isRtl: true,
      paragraphs: [
        { text: 'الفصل الأول', heading: true },
        { text: 'ركض الثعلب إلى العشب الطويل.' },
      ],
      customSupports: [
        { quote: 'العشب', line: 0, text: 'نبات أخضر قصير.' },
      ],
      matchWords: [
        { num: 1, word: 'العشب', meaning: 'نبات أخضر قصير.', answerLetter: 'A' },
      ],
      matchDefs: [
        { letter: 'A', word: 'العشب', meaning: 'نبات أخضر قصير.' },
      ],
      questions: [
        { kind: 'mc', prompt: 'أين اختبأ الثعلب؟', choices: ['في العشب الطويل', 'في البحر'], answer: 0 },
        { kind: 'open', prompt: 'ماذا تعلمت من القصة؟' },
      ],
      writeLines: 4,
      answerKeyOn: true,
      hiddenParts: {},
      sectionOverrides: {},
    };

    const rtlRes = Docx.buildReadAlongDocx(rtlModel);
    const rtlXml = inspectDocx(rtlRes).byName['word/document.xml'];

    expect(rtlXml).toContain('<w:bidi/>');
    expect(rtlXml).toContain('Part 1 — Read the Passage');
    expect(rtlXml).toContain('Part 2 — Reading Notes &amp; Visual Supports');
    expect(rtlXml).toContain('Part 3 — Match the Key Words');
    expect(rtlXml).toContain('Part 4 — Check Your Understanding');
    expect(rtlXml).toContain('\u2610'); // checkbox square for MC choices
    expect(rtlXml).toContain('<w:br w:type="page"/>');
    expect(rtlXml).toContain('Open response (answers will vary)');

    // LTR mode omits <w:bidi/> and supports empty questions -> Write About What You Read with custom line count
    const ltrRes = Docx.buildReadAlongDocx({
      title: 'Fox Story',
      lang: 'en',
      isRtl: false,
      paragraphs: [{ text: 'The fox ran to the den.' }],
      questions: [],
      writeLines: 6,
      answerKeyOn: false,
    });
    const ltrXml = inspectDocx(ltrRes).byName['word/document.xml'];
    expect(ltrXml).not.toContain('<w:bidi/>');
    expect(ltrXml).toContain('Part 4 — Write About What You Read');
    expect(ltrXml).not.toContain('<w:br w:type="page"/>');
  });

  it('builds clinical CTOPP-style Scoring Sheet .docx with scored vs unscored tables, subtotals, and summary box', () => {
    const plan = {
      kind: 'word-sounds',
      title: 'Short Vowel Check',
      hasSoundGap: true,
      hasDirections: true,
      sections: [
        {
          label: 'Letter Trace',
          scored: false,
          items: [
            { numInSection: 1, script: 'Trace S and s for "sun".', answer: 'Practice only' },
          ],
        },
        {
          label: 'Blend Sounds',
          scored: true,
          items: [
            { numInSection: 1, numLabel: '1', script: 'Say the sounds: /k/ ... /a/ ... /t/', answer: 'cat' },
            { numInSection: 2, numLabel: '2', script: 'Say the sounds: /s/ ... /u/ ... /n/', answer: 'sun' },
          ],
        },
      ],
    };

    const res = Docx.buildScoringSheetDocx(plan, { slow: true, autoSec: 5, gapMs: 1000, dirMode: 'section' });
    const xml = inspectDocx(res).byName['word/document.xml'];

    expect(xml).toContain('Short Vowel Check — Teacher Record &amp; Scoring Sheet');
    expect(xml).toContain('Student / Code Name:');
    expect(xml).toContain('Examiner:');
    expect(xml).toContain('Slow (0.8x)');
    expect(xml).toContain('5s auto-advance');
    expect(xml).toContain('Sound gap: 1.0s');
    expect(xml).toContain('Directions: First item per section');
    // Unscored section table columns & footer
    expect(xml).toContain('Done');
    expect(xml).toContain('[ ]');
    expect(xml).toContain('Practice / listening only (not scored).');
    // Scored section table columns, [1] [0] bubbles, Rep., Notes, and subtotal
    expect(xml).toContain('Expected Answer');
    expect(xml).toContain('[1]  [0]');
    expect(xml).toContain('Rep.');
    expect(xml).toContain('Section subtotal:   ______ / 2');
    // Summary & Observations box
    expect(xml).toContain('Summary &amp; Observations');
    expect(xml).toContain('Total scored:');
    expect(xml).toContain('________ / 2');
    expect(xml).toContain('Used slow playback (0.8x)');
    expect(xml).toContain('Next teaching focus / notes:');
  });

  it('strictly escapes XML 1.0 special characters <&>"\' and strips illegal control characters', () => {
    const nasty = 'A < B & C > D "quoted" \'single\' \x00\x01\x07\x0B\x0C\x1F\x7F clean';
    const res = Docx.buildWordSoundsDocx({
      title: nasty,
      subtitle: 'Note: <tag> & "quotes" \'apostrophe\' \x00\x08',
      sections: [
        {
          activity: 'manipulation',
          label: 'Switch <1> & "2"',
          directions: 'Try \'a\' > \'b\' \x02\x03',
          items: [{ word: 'cat', prompt: nasty, answer: 'at < & > " \'' }],
        },
      ],
      answerKeyOn: true,
    });

    const { byName } = inspectDocx(res);
    const xml = byName['word/document.xml'];
    expect(xml).toContain('A &lt; B &amp; C &gt; D &quot;quoted&quot; &apos;single&apos;  clean');
    expect(xml).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  });

  it('downloads .docx via downloadDocx() with the official OOXML MIME type and .docx filename', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://packets.test/' });
    const w = dom.window;
    const d = w.document;
    let capturedBlob = null;
    let clickedDownload = '';
    w.URL.createObjectURL = (blob) => { capturedBlob = blob; return 'blob:docx-test'; };
    w.URL.revokeObjectURL = () => {};
    const origCreate = d.createElement.bind(d);
    d.createElement = (tag) => {
      const node = origCreate(tag);
      if (tag === 'a') {
        node.click = () => { clickedDownload = node.download; };
      }
      return node;
    };

    const res = Docx.buildVocabDocx({ title: 'My Words', wordBank: ['sun'], answerKeyOn: false });
    const ok = Docx.downloadDocx(res, w, d);
    expect(ok).toBe(true);
    expect(capturedBlob).toBeTruthy();
    expect(capturedBlob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(clickedDownload).toBe('my-words-worksheet.docx');
    dom.window.close();
  });

  it('loads cleanly as browser globals (window.AlloPacketZip + window.AlloPacketDocx) and emits standard OOXML namespaces', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://packets.test/' });
    const w = dom.window;
    w.eval(readFileSync(resolve(process.cwd(), 'packets_zip.js'), 'utf8'));
    w.eval(readFileSync(resolve(process.cwd(), 'packets_docx.js'), 'utf8'));

    expect(typeof w.AlloPacketDocx.buildWordSoundsDocx).toBe('function');
    expect(typeof w.AlloPacketDocx.buildVocabDocx).toBe('function');
    expect(typeof w.AlloPacketDocx.buildReadAlongDocx).toBe('function');
    expect(typeof w.AlloPacketDocx.buildScoringSheetDocx).toBe('function');
    expect(typeof w.AlloPacketDocx.downloadDocx).toBe('function');

    const res = w.AlloPacketDocx.buildWordSoundsDocx({
      title: 'Browser UMD Test',
      hintsOn: false,
      sections: [
        { activity: 'counting', label: 'Sound Counting', directions: 'Count sounds.', items: [{ word: 'cat', phonemes: ['k', 'a', 't'], answer: '3' }] },
        { activity: 'isolation', label: 'Find Sounds', directions: 'Circle sound.', items: [{ word: 'sun', positionName: 'beginning', correctSound: 's', choices: ['s', 'm'] }] },
        { activity: 'segmentation', label: 'Break It Down', directions: 'Tap circles.', items: [{ word: 'dog', sounds: ['d', 'o', 'g'], slotCount: 3, chips: ['d', 'o', 'g'] }] },
        { activity: 'blending', label: 'Blend Sounds', directions: 'Blend.', items: [{ word: 'map', sounds: ['m', 'a', 'p'], choices: [{ text: 'map' }, { text: 'mop' }] }] },
        { activity: 'rhyming', label: 'Rhyme Time', directions: 'Find rhyme.', items: [{ word: 'cat', answer: 'hat', choices: ['hat', 'sun'] }] },
        { activity: 'syllable_counting', label: 'Syllable Counting', directions: 'Count.', items: [{ word: 'table', syllables: ['ta', 'ble'], count: 2 }] },
        { activity: 'syllable_blending', label: 'Syllable Blending', directions: 'Blend.', items: [{ word: 'rabbit', syllables: ['rab', 'bit'], choices: ['rabbit', 'ribbon'] }] },
        { activity: 'decoding', label: 'Word Reading', directions: 'Read.', items: [{ word: 'frog', choices: [{ text: 'frog' }] }] },
        { activity: 'read_sentence', label: 'Read a Sentence', directions: 'Fill blank.', items: [{ word: 'dog', before: 'The ', after: ' ran.', answer: 'dog', options: ['dog', 'log'] }] },
        { activity: 'read_passage', label: 'Read a Story', directions: 'Read 3 times.', items: [{ word: 'fox', lines: [{ text: 'A red fox ran.' }, { before: 'It hid in the ', after: '.' }], options: ['den', 'cup'], answer: 'den' }] },
      ],
      answerKeyOn: true,
    });

    const { byName } = inspectDocx(res);
    expect(byName['[Content_Types].xml']).toContain('http://schemas.openxmlformats.org/package/2006/content-types');
    expect(byName['_rels/.rels']).toContain('http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument');
    expect(byName['word/_rels/document.xml.rels']).toContain('http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles');
    expect(byName['word/document.xml']).toContain('http://schemas.openxmlformats.org/wordprocessingml/2006/main');
    // hintsOn: false suppresses Sound bank in segmentation
    expect(byName['word/document.xml']).not.toContain('Sound bank:');
    expect(byName['word/document.xml']).toContain('Read aloud');
    expect(byName['word/document.xml']).toContain('1st read');
    dom.window.close();
  });

  it('respects hiddenParts, sectionOverrides, sentence fallback, and unscored-only scoring sheets', () => {
    const vocabRes = Docx.buildVocabDocx({
      title: 'Filtered Vocab',
      wordBankOn: true,
      wordBank: ['orbit'],
      entries: [{ word: 'orbit' }],
      matchWords: [],
      clozeItems: [],
      pictureItems: [{ word: 'orbit' }],
      hiddenParts: { pictures: true, wordBank: true },
      answerKeyOn: true,
    });
    const vocabXml = inspectDocx(vocabRes).byName['word/document.xml'];
    expect(vocabXml).toContain('Part 1 — Write Each Meaning');
    expect(vocabXml).not.toContain('Word Bank:');
    expect(vocabXml).not.toContain('Part 3 — Name the Picture');

    const raRes = Docx.buildReadAlongDocx({
      title: 'Hebrew Read-Along',
      lang: 'he',
      sentences: [
        { text: 'שלום עולם.', heading: true },
        { text: 'השמש זורחת.' },
      ],
      customSupports: [{ quote: 'שמש', text: 'כוכב' }],
      hiddenParts: { supports: true },
      sectionOverrides: { passage: { label: 'חלק 1 — קריאה', directions: 'קרא בקול.' } },
      answerKeyOn: false,
    });
    const raXml = inspectDocx(raRes).byName['word/document.xml'];
    expect(raXml).toContain('<w:bidi/>');
    expect(raXml).toContain('חלק 1 — קריאה');
    expect(raXml).not.toContain('Part 2 — Reading Notes');

    const unscoredRes = Docx.buildScoringSheetDocx({
      kind: 'vocab',
      title: 'Meanings Listening',
      hasSoundGap: false,
      hasDirections: false,
      sections: [
        {
          label: 'Part 1B — Meanings Read-Aloud',
          scored: false,
          items: [
            { numInSection: 1, numLabel: 'A', script: 'A. the natural home of a plant or animal', answer: 'Read-aloud reference (A)' },
          ],
        },
      ],
    }, { slow: false, autoSec: 0 });
    const unscoredXml = inspectDocx(unscoredRes).byName['word/document.xml'];
    expect(unscoredXml).toContain('Standard (1.0x)');
    expect(unscoredXml).toContain('Manual');
    expect(unscoredXml).not.toContain('Sound gap:');
    expect(unscoredXml).not.toContain('Directions:');
    expect(unscoredXml).toContain('All items in this sheet are practice or listening only (unscored).');
  });
});
