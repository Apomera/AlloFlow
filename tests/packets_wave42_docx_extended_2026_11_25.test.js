// Wave 42 (2026-11-25): Unit tests for extended offline OOXML .docx builders in packets_docx.js
// Covers buildMathWorksheetDocx, buildMazeWorksheetDocx, buildChoiceWorksheetDocx, buildProgressReportDocx.
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

describe('Wave 42: Extended offline OOXML .docx builders (packets_docx.js)', () => {
  it('enforces offline zero-network, zero-innerHTML, American spelling, zero raw URLs, and exports all 8 builders on Node and browser globals', () => {
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
      'buildWordSoundsDocx',
      'buildVocabDocx',
      'buildReadAlongDocx',
      'buildScoringSheetDocx',
      'buildMathWorksheetDocx',
      'buildMazeWorksheetDocx',
      'buildChoiceWorksheetDocx',
      'buildProgressReportDocx',
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

  it('builds Math Worksheet .docx in both horizontal and vertical layouts, with time limit, missing-number & pair items, and Teacher Answer Key table', () => {
    const horizRes = Docx.buildMathWorksheetDocx({
      title: 'Multiplication Facts 7s & 8s',
      subtitle: 'Unit 4 Fact Fluency',
      headerFields: { classPeriod: true, score: true },
      density: 'standard',
      layout: 'horizontal',
      timeLimitSeconds: 120,
      directions: 'Write each product on the line.',
      facts: [
        { a: 7, b: 8, op: 'mul', answer: '56', hint: 'Think 7 x 4 doubled' },
        { a: 8, b: 6, op: 'mul' }, // auto-computed 48
        { prompt: '___ + 8 = 14', answer: '6' },
        { left: 19, right: 27, answer: '27' },
        { a: 54, b: 9, op: 'div' }, // auto-computed 6
        { text: '15 - 7' }, // parsed and auto-computed 8
      ],
      answerKeyOn: true,
    });

    expect(horizRes.filename).toBe('multiplication-facts-7s-8s-math-worksheet.docx');
    const horizXml = inspectDocx(horizRes).byName['word/document.xml'];
    expect(horizXml).toContain('Multiplication Facts 7s &amp; 8s');
    expect(horizXml).toContain('Time limit: 2 minutes');
    expect(horizXml).toContain('Class / Period:');
    expect(horizXml).toContain('Score:');
    expect(horizXml).toContain('Write each product on the line.');
    expect(horizXml).toContain('7 \u00D7 8 = ');
    expect(horizXml).toContain('______');
    expect(horizXml).toContain('Hint: Think 7 x 4 doubled');
    expect(horizXml).toContain('______ + 8 = 14');
    expect(horizXml).toContain('<w:br w:type="page"/>');
    const [studentPart, keyPart] = horizXml.split('<w:br w:type="page"/>');
    expect(studentPart).not.toContain('Teacher Answer Key');
    expect(keyPart).toContain('Teacher Answer Key');
    expect(keyPart).toContain('#1');
    expect(keyPart).toContain('56');
    expect(keyPart).toContain('48');
    expect(keyPart).toContain('27');

    // Vertical stacked layout with 20 facts (triggers 4-column problem grid + 2-up 6-column key table)
    const manyFacts = Array.from({ length: 20 }, (_, i) => ({ a: i + 3, b: 4, op: 'add' }));
    const vertRes = Docx.buildMathWorksheetDocx({
      title: 'Addition Vertical Drill',
      layout: 'vertical',
      density: 'compact',
      facts: manyFacts,
      answerKeyOn: true,
    });
    const vertXml = inspectDocx(vertRes).byName['word/document.xml'];
    expect(vertXml).toContain('<w:jc w:val="right"/>');
    expect(vertXml).toContain('+  4');
    expect(vertXml).toContain('w:val="single" w:sz="10" w:space="2" w:color="000000"');
    expect(vertXml).toContain('#20');
    expect(vertXml).toContain('26');

    // answerKeyOn: false omits page break and answer key
    const noKeyRes = Docx.buildMathWorksheetDocx({
      title: 'No Key Math',
      layout: 'vertical',
      facts: [{ a: 9, b: 3, op: 'sub' }],
      answerKeyOn: false,
    });
    const noKeyXml = inspectDocx(noKeyRes).byName['word/document.xml'];
    expect(noKeyXml).not.toContain('<w:br w:type="page"/>');
    expect(noKeyXml).not.toContain('Teacher Answer Key');
  });

  it('builds CBM-Maze Reading Worksheet .docx with Warm-up box, bold inline choice triples, and Teacher Answer Key & Scoring Sheet', () => {
    const mazeRes = Docx.buildMazeWorksheetDocx({
      title: 'The Red Fox',
      formLabel: 'Form A',
      timeLimitLabel: '3 minutes',
      wordCount: 165,
      warmup: {
        before: 'The small dog ',
        choices: ['ran', 'run', 'red'],
        after: ' across the green yard.',
        answer: 'ran',
      },
      paragraphs: [
        [
          { type: 'text', text: 'A bright red fox lived near the pine woods. Early each morning the fox ' },
          { type: 'blank', num: 1, choices: ['walked', 'window', 'water'], answer: 'walked' },
          { type: 'text', text: ' down to the clear stream to ' },
          { type: 'blank', num: 2, choices: ['drink', 'chair', 'paper'], answer: 'drink' },
          { type: 'text', text: ' cool water.' },
        ],
        [
          { type: 'text', text: 'Then it listened carefully for ' },
          { type: 'blank', num: 3, choices: ['quiet', 'purple', 'pencil'], answer: 'quiet' },
          { type: 'text', text: ' sounds in the tall grass.' },
        ],
      ],
      answerKeyOn: true,
    });

    expect(mazeRes.filename).toBe('the-red-fox-maze-worksheet.docx');
    const xml = inspectDocx(mazeRes).byName['word/document.xml'];
    expect(xml).toContain('The Red Fox');
    expect(xml).toContain('Form: A');
    expect(xml).toContain('Time Limit: 3 minutes');
    expect(xml).toContain('165 words');
    expect(xml).toContain('Blanks: 3');
    expect(xml).toContain('Warm-up practice \u2014 does not count');
    expect(xml).toContain('[ ran / run / red ]');
    expect(xml).toContain('[ walked / window / water ]');
    expect(xml).toContain('[ drink / chair / paper ]');
    expect(xml).toContain('[ quiet / purple / pencil ]');
    expect(xml).toContain('<w:br w:type="page"/>');

    const [studentPart, keyPart] = xml.split('<w:br w:type="page"/>');
    expect(studentPart).toContain('Score:');
    expect(keyPart).toContain('Teacher Answer Key &amp; CBM-Maze Scoring Sheet');
    expect(keyPart).toContain('Correct:');
    expect(keyPart).toContain('Errors:');
    expect(keyPart).toContain('Net Maze Score:');
    expect(keyPart).toContain('#1');
    expect(keyPart).toContain('walked');
    expect(keyPart).toContain('walked / window / water');

    // Graceful fallback: packets-maze.js items shape (before/after/blankNum) + array warmup + 20 blanks + answerKeyOn toggle
    const mazeItems = Array.from({ length: 20 }, (_, idx) => ({
      blankNum: idx + 1,
      before: idx === 0 ? 'Sentence one stays intact. Next we see ' : ' and then ',
      choices: ['word' + (idx + 1), 'rock' + (idx + 1), 'tree' + (idx + 1)],
      answer: 'word' + (idx + 1),
      after: idx === 19 ? ' at the end.' : '',
    }));
    const fromItemsRes = Docx.buildMazeWorksheetDocx({
      title: 'Benchmark Probe B',
      formLabel: 'Form B',
      timeLimitLabel: '3 minutes',
      warmup: [
        { before: 'Birds ', choices: ['fly', 'cup', 'hat'], after: ' in the sky.' },
      ],
      items: mazeItems,
      answerKeyOn: true,
    });
    const fromItemsXml = inspectDocx(fromItemsRes).byName['word/document.xml'];
    expect(fromItemsXml).toContain('Sentence one stays intact.');
    expect(fromItemsXml).toContain('[ fly / cup / hat ]');
    expect(fromItemsXml).toContain('#20');
    expect(fromItemsXml).toContain('word20');

    // Simple passageTokens fallback with answerKeyOn: false
    const simpleRes = Docx.buildMazeWorksheetDocx({
      title: 'Simple Tokens Maze',
      passageTokens: ['The cat ', { type: 'blank', num: 1, choices: ['sat', 'sun', 'six'], answer: 'sat' }, ' on the mat.'],
      answerKeyOn: false,
    });
    const simpleXml = inspectDocx(simpleRes).byName['word/document.xml'];
    expect(simpleXml).toContain('[ sat / sun / six ]');
    expect(simpleXml).not.toContain('<w:br w:type="page"/>');
  });

  it('builds Choice, Sort & Write .docx across all 4 activity modes (choice_board, concept_sort, sequence_order, tiered_writing)', () => {
    // 1. Choice Board (simple cards + rich pathways)
    const cbRes = Docx.buildChoiceWorksheetDocx({
      title: 'Ecosystems Choice Board',
      activity: 'choice_board',
      goal: 'Explain how energy moves through an ecosystem.',
      items: [
        { title: 'Sort Producers & Consumers', description: 'Classify 6 organisms by role.' },
        { title: 'Order a Food Chain', description: 'Put 4 energy steps in sequence.' },
        { title: 'Write an Explanation', description: 'Use academic words to explain energy flow.' },
      ],
    });
    expect(cbRes.filename).toBe('ecosystems-choice-board-choice-board-worksheet.docx');
    const cbXml = inspectDocx(cbRes).byName['word/document.xml'];
    expect(cbXml).toContain('Learning Goal:');
    expect(cbXml).toContain('\u2610');
    expect(cbXml).toContain('Sort Producers &amp; Consumers');
    expect(cbXml).toContain('Order a Food Chain');
    expect(cbXml).toContain('Write an Explanation');

    // 2. Concept Sort (categories + mixed cards + answer key)
    const sortRes = Docx.buildChoiceWorksheetDocx({
      title: 'States of Matter',
      activity: 'concept_sort',
      prompt: 'Sort each example into the correct state of matter.',
      categories: [
        { id: 'solid', label: 'Solid', description: 'Keeps its own shape' },
        { id: 'liquid', label: 'Liquid', description: 'Takes container shape' },
        { id: 'gas', label: 'Gas', description: 'Spreads out to fill space' },
      ],
      cards: [
        { text: 'Steam', category: 'gas' },
        { text: 'Ice cube', category: 'solid' },
        { text: 'Juice', category: 'liquid' },
        { text: 'Oxygen', category: 'gas' },
      ],
      answerKeyOn: true,
    });
    expect(sortRes.filename).toBe('states-of-matter-concept-sort-worksheet.docx');
    const sortXml = inspectDocx(sortRes).byName['word/document.xml'];
    expect(sortXml).toContain('Solid');
    expect(sortXml).toContain('Keeps its own shape');
    expect(sortXml).toContain('Cards to Sort');
    expect(sortXml).toContain('Steam');
    expect(sortXml).toContain('<w:br w:type="page"/>');
    const [sortStudent, sortKey] = sortXml.split('<w:br w:type="page"/>');
    expect(sortStudent).not.toContain('Teacher Answer Key');
    expect(sortKey).toContain('Teacher Answer Key');
    expect(sortKey).toContain('Ice cube');
    expect(sortKey).toContain('Solid');

    // 3. Sequence Order (mixed steps with [ ___ ] boxes + ordered Teacher Answer Key)
    const seqRes = Docx.buildChoiceWorksheetDocx({
      title: 'Water Cycle Steps',
      activity: 'sequence_order',
      prompt: 'Put the water cycle stages in order from first to last.',
      steps: [
        { label: 'Step C', text: 'Rain falls back to Earth.', order: 3 },
        { label: 'Step A', text: 'Sun warms ocean water so it evaporates.', order: 1 },
        { label: 'Step B', text: 'Water vapor cools and forms clouds.', order: 2 },
      ],
      answerKeyOn: true,
    });
    expect(seqRes.filename).toBe('water-cycle-steps-sequence-order-worksheet.docx');
    const seqXml = inspectDocx(seqRes).byName['word/document.xml'];
    expect(seqXml).toContain('[ ___ ]');
    expect(seqXml).toContain('Write the steps in order:');
    expect(seqXml).toContain('<w:br w:type="page"/>');
    const [, seqKey] = seqXml.split('<w:br w:type="page"/>');
    const pos1 = seqKey.indexOf('Sun warms ocean water');
    const pos2 = seqKey.indexOf('Water vapor cools');
    const pos3 = seqKey.indexOf('Rain falls back');
    expect(pos1).toBeGreaterThan(0);
    expect(pos2).toBeGreaterThan(pos1);
    expect(pos3).toBeGreaterThan(pos2);

    // 4. Tiered Writing (passage + prompt + frames/starters + word bank + ruled lines + rubric)
    const writeRes = Docx.buildChoiceWorksheetDocx({
      title: 'Claim and Evidence',
      activity: 'tiered_writing',
      passageTitle: 'Solar Panels on Schools',
      passage: 'Many schools install solar panels to lower electricity bills and teach renewable energy.',
      prompt: 'Should our school add solar panels? Support your claim with evidence.',
      minWords: 25,
      frames: ['I believe our school should _____ because _____.'],
      starters: ['According to the passage, ...', 'One piece of evidence is ...'],
      wordBank: ['solar', 'renewable', 'evidence', 'electricity'],
      writeLines: 8,
      rubric: ['State a clear claim', 'Include two pieces of evidence', 'Use at least two Word Bank terms'],
    });
    expect(writeRes.filename).toBe('claim-and-evidence-tiered-writing-worksheet.docx');
    const writeXml = inspectDocx(writeRes).byName['word/document.xml'];
    expect(writeXml).toContain('Solar Panels on Schools');
    expect(writeXml).toContain('Writing Prompt');
    expect(writeXml).toContain('Sentence Frames &amp; Sentence Starters');
    expect(writeXml).toContain('Word Bank:');
    expect(writeXml).toContain('Self-Check Rubric');
    expect(writeXml).toContain('\u2610');
    const dashedCount = (writeXml.match(/w:val="dashed"/g) || []).length;
    expect(dashedCount).toBe(8);
  });

  it('builds Class & Student Progress Report .docx with summary box, Student Results table, Student Focus cards, and Conference Notes', () => {
    const reportRes = Docx.buildProgressReportDocx({
      title: 'Grade 3 MTSS Progress Report',
      generatedDate: '2026-11-25',
      summary: {
        students: 3,
        files: 4,
        avgPercent: 84,
        measures: [
          'CBM-Maze (Form A): median 19 net correct (3 students)',
          { label: 'Math Fluency Grade 3', median: 28, unit: 'dcpm', count: 3 },
        ],
      },
      rows: [
        {
          learner: 'BlueHeron7',
          title: 'The Red Fox (Form A)',
          activity: 'CBM-Maze Reading',
          date: '2026-11-24',
          scoreText: '22 net (92%)',
          timeText: '3 min',
          supports: ['larger text', 'reading focus line'],
          notes: 'Steady pace throughout.',
        },
        {
          learner: 'PineOwl4',
          title: 'Multiplication 7s & 8s',
          activity: 'Math Practice',
          date: '2026-11-24',
          percent: 75,
          correct: 15,
          total: 20,
          timeText: '4 min 10 s',
          supports: 'hints used',
        },
      ],
      studentFocus: [
        {
          learner: 'PineOwl4',
          tier: 'Tier 2 — Targeted Review',
          missedItems: ['7 x 8', '8 x 9', { item: '6 x 7', count: 2, wrong: '48' }],
          goals: ['Reach 30 dcpm on Grade 3 Math Fluency by Dec 15'],
          paperScores: [{ measure: 'CBM-Maze Form A', value: '16 net', date: '2026-11-20', note: 'Paper copy' }],
          notes: 'Responds well to visual array models.',
        },
      ],
      notesPrompt: true,
      notesLines: 4,
    });

    expect(reportRes.filename).toBe('grade-3-mtss-progress-report-progress-report.docx');
    const xml = inspectDocx(reportRes).byName['word/document.xml'];
    expect(xml).toContain('Grade 3 MTSS Progress Report');
    expect(xml).toContain('Generated: 2026-11-25');
    expect(xml).toContain('Class Overview');
    expect(xml).toContain('Students: 3');
    expect(xml).toContain('Results / Files: 4');
    expect(xml).toContain('Class Average: 84%');
    expect(xml).toContain('Math Fluency Grade 3');
    expect(xml).toContain('Student Results');
    expect(xml).toContain('BlueHeron7');
    expect(xml).toContain('22 net (92%)');
    expect(xml).toContain('Supports: larger text, reading focus line');
    expect(xml).toContain('PineOwl4');
    expect(xml).toContain('75% (15/20)');
    expect(xml).toContain('Student Focus &amp; Goals');
    expect(xml).toContain('Missed items to reteach:');
    expect(xml).toContain('6 x 7 (2x) [common: 48]');
    expect(xml).toContain('Progress goals:');
    expect(xml).toContain('Paper scores:');
    expect(xml).toContain('Teacher Conference Notes');

    // Auto-summary fallback + notesPrompt: false
    const minimalRes = Docx.buildProgressReportDocx({
      title: 'Quick Summary',
      rows: [
        { learner: 'StudentA', title: 'Sort Check', date: '2026-11-25', percent: 80 },
        { learner: 'StudentB', title: 'Sort Check', date: '2026-11-25', percent: 100 },
      ],
      notesPrompt: false,
    });
    const minXml = inspectDocx(minimalRes).byName['word/document.xml'];
    expect(minXml).toContain('Students: 2');
    expect(minXml).toContain('Class Average: 90%');
    expect(minXml).not.toContain('Teacher Conference Notes');
  });

  it('strictly escapes XML 1.0 special characters and strips control chars across all 4 new builders', () => {
    const nasty = 'X < Y & Z > W "q" \'a\' \x00\x01\x07\x0B\x0C\x1F\x7F ok';
    const expected = 'X &lt; Y &amp; Z &gt; W &quot;q&quot; &apos;a&apos;  ok';

    const results = [
      Docx.buildMathWorksheetDocx({ title: nasty, directions: nasty, facts: [{ prompt: nasty, answer: nasty }] }),
      Docx.buildMazeWorksheetDocx({
        title: nasty,
        warmup: { before: nasty, choices: ['a<b', 'c&d', 'e>f'], after: '' },
        paragraphs: [[{ type: 'text', text: nasty }, { type: 'blank', num: 1, choices: ['<1>', '&2', '"3"'], answer: '<1>' }]],
      }),
      Docx.buildChoiceWorksheetDocx({
        title: nasty,
        activity: 'concept_sort',
        categories: [{ label: nasty, description: nasty }],
        cards: [{ text: nasty, category: nasty }],
      }),
      Docx.buildProgressReportDocx({
        title: nasty,
        rows: [{ learner: nasty, title: nasty, scoreText: nasty, supports: [nasty], notes: nasty }],
        studentFocus: [{ learner: nasty, missedItems: [nasty], goals: [nasty] }],
      }),
    ];

    for (const res of results) {
      const xml = inspectDocx(res).byName['word/document.xml'];
      expect(xml).toContain(expected);
      expect(xml).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
    }
  });
});
