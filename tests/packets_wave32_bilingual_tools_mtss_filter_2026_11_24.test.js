import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.cwd());
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const MATH = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));

const BRITISH = /\b(practis\w*|standardis\w*|licences?|colours?|marking|marked|tick(?:ed|s)?|USB stick|whilst|maths|favour\w*|behaviour\w*|centres?)\b/i;

function makeResultJson({ id, learner, date, title, items }) {
  const graded = items.filter((i) => !i.practice);
  const firstTry = graded.filter((i) => i.firstTry).length;
  const afterRetry = graded.filter((i) => !i.firstTry && i.correct).length;
  const missed = graded.filter((i) => !i.correct).length;
  return JSON.stringify({
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    sessionId: id,
    packet: { id: 'wave32-' + id, version: '2026-11-24', form: '', mode: 'practice' },
    lessonId: 'wave32-' + id,
    revision: '2026-11-24',
    lessonTitle: title,
    mode: 'practice',
    learner,
    startedLocal: `${date}T10:00:00-05:00`,
    finishedLocal: `${date}T10:05:00-05:00`,
    durationMs: 300000,
    activeMs: 120000,
    summary: { items: graded.length, done: items.length, firstTry, afterRetry, missed, practised: 0 },
    score: { items: graded.length, done: items.length, firstTry, correct: firstTry + afterRetry },
    items,
  });
}

describe('Wave 32 — Dual-Language Reading Tools Drawer across all 6 Home Languages', () => {
  it('ships complete Reading Tools translations across all 6 languages with zero storage or unsafe sinks', () => {
    const src = read('packets_station_bilingual.js');
    expect(src).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b|\blocalStorage\b|\bsessionStorage\b/);
    expect(src).not.toMatch(BRITISH);
    expect(SB.BILINGUAL_CSS).toContain('.lt-l[data-bi-label]::after');
    expect(SB.BILINGUAL_CSS).toContain('.lt-h[data-bi-label]::after');

    const toolKeys = [
      'tools_size', 'tools_colors', 'tools_spacing', 'tools_font',
      'tools_focus', 'tools_lens', 'tools_speed', 'tools_motion',
      'tools_normal', 'tools_larger', 'tools_largest', 'tools_high_contrast',
      'tools_soft', 'tools_dark', 'tools_wider', 'tools_off', 'tools_on',
      'tools_ruler', 'tools_slower', 'tools_faster', 'about_file', 'keep_results',
    ];
    for (const code of SB.SUPPORTED_LANGUAGES) {
      for (const k of toolKeys) {
        expect(typeof SB.LANGUAGES[code].strings[k], `${code}.${k}`).toBe('string');
        expect(SB.LANGUAGES[code].strings[k].trim().length, `${code}.${k} non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it('localizes the Reading Tools drawer labels and buttons (Spanish LTR + Arabic RTL) without mutating English textContent', () => {
    const lesson = MATH.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'add-doubles', count: 1 });
    lesson.homeLanguages = ['es', 'ar'];
    const html = TH.buildHtml(lesson, { core: { soundAnswerMatches: () => false } });
    const report = V.verifyPacket(html);
    expect(report.ok).toBe(true);
    expect(report.result).toBe('closed');
    expect(report.counts.look).toBe(0);
    expect(report.counts.notExpected).toBe(0);

    const dom = new JSDOM(html, {
      url: 'https://packets.test/bilingual-tools.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    try {
      // Open Reading Tools panel and toggle Arabic (RTL)
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-bilingual-lang="ar"]').click();

      const ltTitle = d.getElementById('lt-title');
      const ltSize = d.getElementById('lt-size');
      const ltColors = d.getElementById('lt-colors');
      const hcBtn = [...d.querySelectorAll('#lt-panel button')].find((b) => b.textContent.trim() === 'High contrast');
      const resetBtn = d.querySelector('[data-tools-reset]');

      expect(ltTitle.textContent.trim()).toBe('Reading tools');
      expect(ltTitle.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.reading_tools);
      expect(ltTitle.getAttribute('data-bi-dir')).toBe('rtl');

      expect(ltSize.textContent.trim()).toBe('Text size');
      expect(ltSize.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.tools_size);
      expect(ltColors.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.tools_colors);

      expect(hcBtn).toBeTruthy();
      expect(hcBtn.textContent.trim()).toBe('High contrast');
      expect(hcBtn.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.tools_high_contrast);
      expect(hcBtn.getAttribute('data-bi-dir')).toBe('rtl');

      expect(resetBtn.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.reset);

      // Switch to Spanish (LTR)
      d.querySelector('[data-bilingual-lang="es"]').click();
      expect(ltSize.getAttribute('data-bi-label')).toBe('Tamaño de texto');
      expect(ltSize.getAttribute('data-bi-dir')).toBe('ltr');
      expect(hcBtn.getAttribute('data-bi-label')).toBe('Alto contraste');

      // Switch back to English -> cleanly clears all data-bi-label attributes
      d.querySelector('[data-bilingual-lang=""]').click();
      expect(d.querySelectorAll('[data-bi-label]').length).toBe(0);
    } finally {
      w.close();
    }
  });
});

describe('Wave 32 — Live MTSS Tier Table Filtering on packets-results.html', () => {
  it('filters #group-table, #group-udl, and #group-followup to a single MTSS tier and restores cleanly', async () => {
    const css = read('packets-results.css');
    expect(css.split('@media print')[0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);

    const dom = new JSDOM(read('packets-results.html'), {
      url: 'https://packets.test/packets-results.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });

    try {
      w.eval(read('packets_results_reader.js'));
      w.eval(read('packets_handoff.js'));
      w.eval(read('packets_followup.js'));
      w.eval(read('packets-results.js'));

      const files = [
        // Tier 3 student (25% first try, missed '7 x 8', '6 x 7', '8 x 9')
        new w.File([makeResultJson({
          id: 't3', learner: 'BirchOwl3', date: '2026-11-24', title: 'Facts',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_ccc', word: '2 x 3', target: '6', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'i2', activity: 'math_ccc', word: '7 x 8', target: '56', responses: ['54'], attempts: 2, firstTry: false, correct: false, done: true, supports: { hint: 1 } },
            { n: 3, itemId: 'i3', activity: 'math_ccc', word: '6 x 7', target: '42', responses: ['36'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 4, itemId: 'i4', activity: 'math_ccc', word: '8 x 9', target: '72', responses: ['64'], attempts: 2, firstTry: false, correct: false, done: true },
          ],
        })], 't3.json', { type: 'application/json' }),
        // Tier 2 student (75% first try)
        new w.File([makeResultJson({
          id: 't2', learner: 'CedarFox2', date: '2026-11-24', title: 'Facts',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_ccc', word: '2 x 3', target: '6', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'i2', activity: 'math_ccc', word: '3 x 4', target: '12', responses: ['12'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 3, itemId: 'i3', activity: 'math_ccc', word: '4 x 5', target: '20', responses: ['20'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 4, itemId: 'i4', activity: 'math_ccc', word: '9 x 6', target: '54', responses: ['56', '54'], attempts: 2, firstTry: false, correct: true, done: true },
          ],
        })], 't2.json', { type: 'application/json' }),
        // Tier 1 student (100% first try)
        new w.File([makeResultJson({
          id: 't1', learner: 'MapleJay1', date: '2026-11-24', title: 'Facts',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_ccc', word: '2 x 3', target: '6', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true },
          ],
        })], 't1.json', { type: 'application/json' }),
      ];

      const input = d.getElementById('files');
      Object.defineProperty(input, 'files', { configurable: true, value: files });
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
      for (let i = 0; i < 60 && d.getElementById('state-results').hidden; i++) {
        await new Promise((r) => setTimeout(r, 15));
      }
      expect(d.getElementById('state-results').hidden).toBe(false);

      // Initially all 3 students appear in #group-table and #group-tier-bar does not exist
      expect(d.querySelectorAll('#group-table tbody tr')).toHaveLength(3);
      expect(d.getElementById('group-tier-bar')).toBeNull();

      // Open MTSS fold and click Filter group table on Tier 3
      d.getElementById('group-mtss-fold').open = true;
      const t3Filter = d.querySelector('[data-mtss-filter="tier3"]');
      expect(t3Filter).toBeTruthy();
      expect(t3Filter.getAttribute('aria-pressed')).toBe('false');
      t3Filter.click();

      // #group-table now shows ONLY BirchOwl3, #group-tier-bar appears, and Tier 3 filter button is pressed
      const rowsAfter = [...d.querySelectorAll('#group-table tbody tr')];
      expect(rowsAfter).toHaveLength(1);
      expect(rowsAfter[0].textContent).toContain('BirchOwl3');
      expect(d.getElementById('group-tier-bar')).toBeTruthy();
      expect(d.getElementById('group-tier-bar').textContent).toContain('1 of 3 students');
      expect(d.querySelector('[data-mtss-filter="tier3"]').getAttribute('aria-pressed')).toBe('true');

      // Group follow-up card is scoped strictly to BirchOwl3 (does NOT include CedarFox2's '9 x 6')
      const followupText = d.getElementById('group-followup').textContent;
      expect(followupText).toContain('7 x 8');
      expect(followupText).not.toContain('9 x 6');

      // Click Show all students -> restores all 3 rows and removes #group-tier-bar
      d.getElementById('group-tier-clear').click();
      expect(d.querySelectorAll('#group-table tbody tr')).toHaveLength(3);
      expect(d.getElementById('group-tier-bar')).toBeNull();
    } finally {
      w.close();
    }
  });
});
