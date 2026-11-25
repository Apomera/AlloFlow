// @vitest-environment jsdom
// Wave 18 checks (2026-11-24):
// 1. Printable Paper CBM-Maze Student Worksheet + Page 2 Teacher Scoring Key in packets-maze.html/css/js.
// 2. Updated packets.html front-door OER Starter Pack discovery strip, IT builder list, and Available today copy.
// 3. Group-level UDL Choice Board pathway & supports summary in packets-results.js/css.
// 4. Read-only --plan & inspectMeaningAudio() validation in dev-tools/build_packets_site.cjs.
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');

describe('Wave 18 Paper CBM-Maze, Hub Discovery, Group UDL Insights, and Meaning-Audio Plan', () => {
  it('renders a grade-free Student Paper CBM-Maze Sheet and toggleable Page 2 Teacher Scoring Key in Step 3', async () => {
    const dom = new JSDOM(read('packets-maze.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-maze.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_maze_builder.js'));
    w.eval(read('packets-maze.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));
    // Go Step 1 -> Step 2 -> Step 3
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();

    const sheet = d.getElementById('paper-maze-sheet');
    expect(sheet.getAttribute('data-ready')).toBe('1');
    // Hidden on screen while fold is closed, visible when opened
    expect(sheet.hidden).toBe(true);
    const fold = d.getElementById('paper-maze-fold');
    fold.open = true;
    fold.dispatchEvent(new w.Event('toggle'));
    expect(sheet.hidden).toBe(false);

    const student = sheet.querySelector('.paper-maze-student');
    expect(student).toBeTruthy();
    expect(student.textContent).toContain('The Busy Pond Behind the School');
    expect(student.textContent).not.toMatch(/Grades?\s*2-3/i);
    expect(student.textContent).toContain('Warm-up practice');
    expect(student.querySelectorAll('.paper-maze-body .paper-maze-blank').length).toBeGreaterThanOrEqual(15);

    const key = sheet.querySelector('.paper-maze-key');
    expect(key).toBeTruthy();
    expect(key.textContent).toContain('Teacher scoring key');
    expect(key.textContent).toContain('Maze net');
    expect(key.querySelectorAll('.paper-maze-key-list li').length).toBe(student.querySelectorAll('.paper-maze-body .paper-maze-blank').length);

    // Toggle teacher scoring key off
    const cb = d.getElementById('f-paper-key');
    cb.checked = false;
    cb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-maze-key')).toBeNull();

    // Print button calls window.print
    d.getElementById('print-paper-maze').click();
    expect(printCalls).toBe(1);

    // Screen CSS before @media print remains 100% token-driven (zero raw hex)
    const mazeCss = read('packets-maze.css');
    const beforePrint = mazeCss.split('@media print')[0];
    expect(beforePrint).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('keeps packets.html starter pack spotlight, IT verify builder list, and packets-about.html accurate and calm', () => {
    const html = read('packets.html');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const spotlight = doc.querySelector('.starter-door');
    expect(spotlight).toBeTruthy();
    expect(spotlight.querySelector('a').getAttribute('href')).toBe('packets-packs.html');

    const verifyText = doc.querySelector('.verify').textContent;
    for (const builder of [
      'word_sounds_packet_builder.js', 'packet_math_practice_builder.js', 'packet_check_builder.js',
      'packet_vocab_builder.js', 'packet_symbol_runner_builder.js', 'packet_read_along_builder.js',
      'packet_choice_builder.js', 'packet_maze_builder.js', 'packet_manipulative_builder.js',
      'packet_stem_lab_builder.js', 'packet_life_skills_builder.js', 'packet_aac_builder.js',
      'packet_sel_builder.js', 'packet_playlist_builder.js', 'packets_main_app_compiler.js',
      'word_sounds_take_home_loader.js',
    ]) {
      expect(verifyText).toContain(builder);
      expect(existsSync(builder), builder).toBe(true);
    }

    expect(doc.getElementById('check').textContent).toContain('AAC communication boards');
    expect(doc.getElementById('today').textContent).toContain('Maze reading probes');
    expect(doc.getElementById('today').textContent).toContain('ready-made starter packs');
    expect(doc.body.textContent).not.toMatch(/zero network|\bseal|encrypt|teacher key|100%|three steps|\bsecure\b/i);
    dom.window.close();
  });

  it('aggregates Group-level UDL Choice Board pathways, reading tools, and supports in packets-results.html', async () => {
    const dom = new JSDOM(read('packets-results.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    });
    const w = dom.window;
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_results_reader.js'));
    w.eval(read('packets_followup.js'));
    w.eval(read('packets-results.js'));
    const loader = w.AlloWordSoundsTakeHome;

    const d = w.document;
    const makeRes = (sid, who, pathway, supportsObj, tools) => {
      const r = {
        kind: 'alloflow-take-home-result',
        schemaVersion: 3,
        sessionId: sid,
        packet: { id: 'eco-choice', version: 'r1', form: '', mode: 'practice' },
        lessonId: 'eco-choice',
        revision: 'r1',
        lessonTitle: 'Ecosystems Choice Board',
        activityTitles: { choice_board: 'UDL Choice Board' },
        learner: who,
        startedLocal: '2026-11-24T09:00:00-05:00',
        finishedLocal: '2026-11-24T09:04:00-05:00',
        durationMs: 240000,
        activeMs: 220000,
        score: { tools: tools },
        summary: { items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 0 },
        items: [{
          n: 1,
          itemId: 'cb-1',
          activity: 'choice_board',
          word: 'Ecosystems',
          target: 'done',
          responses: ['mod:' + pathway],
          attempts: 1,
          firstTry: true,
          correct: true,
          done: true,
          ms: 8000,
          supports: Object.assign({ ['modality_' + pathway]: 1 }, supportsObj || {}),
          practice: null,
          flag: '',
        }],
      };
      const table = loader.resultsCsv(r);
      return table.text({ method: 'sha256', value: loader.sha256(table.basis).hex });
    };

    const makeCheckRes = (sid, who, untimed, tools) => {
      const r = {
        kind: 'alloflow-take-home-result',
        schemaVersion: 3,
        sessionId: sid,
        packet: { id: 'maze-reading-g4-5', version: 'r1', form: 'A', mode: 'probe' },
        lessonId: 'maze-reading-g4-5',
        revision: 'r1',
        lessonTitle: 'How Monarch Butterflies Cross a Continent',
        activityTitles: { maze_reading: 'Maze Reading' },
        learner: who,
        startedLocal: '2026-11-24T09:10:00-05:00',
        finishedLocal: '2026-11-24T09:13:00-05:00',
        durationMs: 180000,
        activeMs: 175000,
        score: {
          measure: 'maze_correct_3m',
          score: 14,
          scoreUnit: 'items_correct',
          itemsCorrect: 15,
          itemsAttempted: 16,
          timeLimitS: untimed ? null : 180,
          elapsedS: 175,
          completion: 'completed',
          untimed: !!untimed,
          tools: tools,
        },
        summary: { items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 0 },
        items: [{
          n: 1, itemId: 'mz-1', activity: 'maze_reading', word: 'along', target: 'along',
          responses: ['along'], attempts: 1, firstTry: true, correct: true, done: true, ms: 4000, supports: {}, practice: null, flag: '',
        }],
      };
      return JSON.stringify(r);
    };

    const files = [
      new w.File([makeRes('s1', 'Maya', 'concept_sort', { bilingual_es: 1, hint_shown: 1 }, ['textLarger', 'readingFocus'])], 'maya.csv', { type: 'text/csv' }),
      new w.File([makeRes('s2', 'Leo', 'concept_sort', { modality_switch: 1 }, ['contrastHigh'])], 'leo.csv', { type: 'text/csv' }),
      new w.File([makeRes('s3', 'Nora', 'tiered_writing', { tier_high: 1, stretch_1: 1 }, ['textLarger'])], 'nora.csv', { type: 'text/csv' }),
      new w.File([makeCheckRes('c1', 'Maya', true, ['textLarger', 'readingFocus'])], 'maya-check.json', { type: 'application/json' }),
      new w.File([makeCheckRes('c2', 'Nora', false, ['textLarger'])], 'nora-check.json', { type: 'application/json' }),
    ];

    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files };
    d.getElementById('main').dispatchEvent(ev);

    for (let i = 0; i < 150 && !/\bread[,.]/.test(d.getElementById('said').textContent); i++) {
      await new Promise((r) => setTimeout(r, 15));
    }
    const showBtn = d.getElementById('show-results');
    if (showBtn && !d.getElementById('state-check').hidden) showBtn.click();

    const udl = d.getElementById('group-udl');
    expect(udl).toBeTruthy();
    expect(udl.hidden).toBe(false);
    expect(udl.textContent).toContain('UDL pathways and supports used across this group');
    expect(udl.textContent).toContain('Concept Sort: 2 students');
    expect(udl.textContent).toContain('Tiered Writing: 1 student');
    expect(udl.textContent).toContain('1 student tried more than one pathway before finishing.');
    expect(udl.textContent).toContain('Bilingual home-language support: 1 student');
    expect(udl.textContent).toContain('Hints & adaptive scaffolds: 2 students');
    expect(udl.textContent).toContain('Stretch challenge items: 1 student');
    expect(udl.textContent).toContain('Reading tool (larger text): 2 students');
    expect(udl.textContent).toContain('Untimed check accommodation: 1 student');
    dom.window.close();
  });

  it('validates meaning-audio stores via inspectMeaningAudio() without copying files', () => {
    const site = require('../dev-tools/build_packets_site.cjs');
    const dir = mkdtempSync(join(tmpdir(), 'meaning-plan-test-'));
    try {
      writeFileSync(join(dir, 'm-0001.json'), JSON.stringify({ format: 'alloflow-meaning-audio-shard/1', bucket: 'm-0001', clips: { abcdef0123456789: { text: 'a small cat', audio: 'data:audio/mpeg;base64,AA==' } } }));
      writeFileSync(join(dir, 'index.json'), JSON.stringify({ format: 'alloflow-meaning-audio-index/1', buckets: { 'm-0001': 1 } }));
      const info = site.inspectMeaningAudio(dir);
      expect(info.clips).toBe(1);
      expect(info.files).toBe(2);
      expect(info.shards).toBe(1);
      expect(info.maxBytes).toBeGreaterThan(0);

      writeFileSync(join(dir, 'index.json'), JSON.stringify({ format: 'alloflow-meaning-audio-index/1', buckets: { '../bad': 1 } }));
      expect(() => site.inspectMeaningAudio(dir)).toThrow(/odd file/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
