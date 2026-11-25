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

const HANDOFF = require(path.join(ROOT, 'packets_handoff.js'));
const FOLLOWUP = require(path.join(ROOT, 'packets_followup.js'));
const READER = require(path.join(ROOT, 'packets_results_reader.js'));

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
    packet: { id: 'wave29-' + id, version: '2026-11-24', form: '', mode: 'practice' },
    lessonId: 'wave29-' + id,
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

describe('Wave 29 — Tier-Scoped MTSS Small-Group Follow-Up Packet Launches', () => {
  it('computes distinct tier-scoped focus areas and launches isolated Tier 3 vs Tier 2 intervention drafts from packets-results.html', async () => {
    const html = read('packets-results.html');
    const dom = new JSDOM(html, {
      url: 'https://packets.test/packets-results.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });

    const launchedDrafts = [];
    try {
      w.eval(read('packets_results_reader.js'));
      w.eval(read('packets_handoff.js'));
      w.AlloPacketHandoff = Object.assign({}, w.AlloPacketHandoff, {
        redirectDraft: (draft, href, openNewTab) => {
          launchedDrafts.push({ draft, href, openNewTab });
          return Promise.resolve(true);
        },
      });
      w.eval(read('packets_followup.js'));
      w.eval(read('packets-results.js'));

      const files = [
        // Tier 3 student: missed Word Sounds ('ship', 'chat', 'thin') -> 25% first try
        new w.File([makeResultJson({
          id: 't3-ws', learner: 'BirchOwl3', date: '2026-11-24', title: 'Digraph Practice',
          items: [
            { n: 1, itemId: 'w1', activity: 'blending', word: 'cat', target: 'cat', responses: ['cat'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'w2', activity: 'blending', word: 'ship', target: 'ship', responses: ['sip'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 3, itemId: 'w3', activity: 'blending', word: 'chat', target: 'chat', responses: ['cat'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 4, itemId: 'w4', activity: 'blending', word: 'thin', target: 'thin', responses: ['tin'], attempts: 2, firstTry: false, correct: false, done: true },
          ],
        })], 't3.json', { type: 'application/json' }),
        // Tier 2 student: missed Math Facts ('7 x 8') -> 75% first try
        new w.File([makeResultJson({
          id: 't2-math', learner: 'CedarFox2', date: '2026-11-24', title: 'Multiplication Practice',
          items: [
            { n: 1, itemId: 'm1', activity: 'math_ccc', word: '2 x 3', target: '6', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'm2', activity: 'math_ccc', word: '3 x 4', target: '12', responses: ['12'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 3, itemId: 'm3', activity: 'math_ccc', word: '4 x 5', target: '20', responses: ['20'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 4, itemId: 'm4', activity: 'math_ccc', word: '7 x 8', target: '56', responses: ['54', '56'], attempts: 2, firstTry: false, correct: true, done: true },
          ],
        })], 't2.json', { type: 'application/json' }),
        // Tier 1 student: 100% first try on Vocabulary
        new w.File([makeResultJson({
          id: 't1-voc', learner: 'MapleJay1', date: '2026-11-24', title: 'Science Words',
          items: [
            { n: 1, itemId: 'v1', activity: 'vocab_meaning', word: 'erosion', target: 'wearing away', responses: ['wearing away'], attempts: 1, firstTry: true, correct: true, done: true },
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

      const fold = d.getElementById('group-mtss-fold');
      fold.open = true;

      // Tier 3 button targets ONLY Word Sounds (BirchOwl3's misses), NOT CedarFox2's math misses
      const t3Btn = [...d.querySelectorAll('.mtss-followup-btn')].find((b) => b.textContent.includes('Tier 3 review group'));
      expect(t3Btn).toBeTruthy();
      expect(t3Btn.getAttribute('data-followup-target')).toBe('word_sounds');

      // Tier 2 button targets ONLY Math Facts (CedarFox2's misses), NOT BirchOwl3's phonics misses
      const t2Btn = [...d.querySelectorAll('.mtss-followup-btn')].find((b) => b.textContent.includes('Tier 2 review group'));
      expect(t2Btn).toBeTruthy();
      expect(t2Btn.getAttribute('data-followup-target')).toBe('math_practice');

      // Click Tier 3 follow-up -> hands off Word Sounds draft scoped to Tier 3
      t3Btn.click();
      await new Promise((r) => setTimeout(r, 15));
      expect(launchedDrafts).toHaveLength(1);
      expect(launchedDrafts[0].href).toBe('packets-make.html');
      expect(launchedDrafts[0].openNewTab).toBe(true);
      expect(launchedDrafts[0].draft.title).toContain('Tier 3 review group:');
      expect(launchedDrafts[0].draft.words).toContain('ship');
      expect(launchedDrafts[0].draft.words).toContain('chat');
      expect(launchedDrafts[0].draft.words).toContain('thin');

      // Click Tier 2 follow-up -> hands off Math Facts draft scoped to Tier 2
      t2Btn.click();
      await new Promise((r) => setTimeout(r, 15));
      expect(launchedDrafts).toHaveLength(2);
      expect(launchedDrafts[1].href).toBe('packets-math-practice.html');
      expect(launchedDrafts[1].draft.title).toContain('Tier 2 review group:');
      expect(launchedDrafts[1].draft.facts).toContain('7 x 8');
      expect(d.getElementById('mtss-followup-status').textContent).toContain('Tier 2 review group');
    } finally {
      w.close();
    }
  });
});

describe('Wave 29 — Universal .txt / .csv Batch Code-Name Loader across all 9 Wave 2-5 Makers', () => {
  it('parses .txt and .csv code-name files cleanly (BOM, header skip, quoted CSV first column, dedup, cap)', () => {
    const handoffSrc = read('packets_handoff.js');
    expect(handoffSrc).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/);
    expect(handoffSrc).not.toMatch(BRITISH);

    const csvRaw = '\uFEFF"student_code","score"\r\n"BlueHeron7",92\r\n"RedFox3",84\r\n"blueheron7",95\r\nOakLeaf4,78\r\n';
    const parsedCsv = HANDOFF.parseBatchListText(csvRaw, 40);
    expect(parsedCsv.names).toEqual(['BlueHeron7', 'RedFox3', 'OakLeaf4']);
    expect(parsedCsv.skippedDuplicates).toBe(1);
    expect(parsedCsv.trimmedCount).toBe(0);

    const txtLines = Array.from({ length: 45 }, (_, i) => 'Student' + (i + 1)).join('\n');
    const parsedTxt = HANDOFF.parseBatchListText(txtLines, 40);
    expect(parsedTxt.names).toHaveLength(40);
    expect(parsedTxt.trimmedCount).toBe(5);
  });

  it('mounts mountBatchListHelper across all 9 Wave 2-5 makers and loads + clears code names cleanly in packets-choice.html', async () => {
    const nineMakers = [
      'packets-choice.js',
      'packets-maze.js',
      'packets-manipulatives.js',
      'packets-stem-lab.js',
      'packets-life-skills.js',
      'packets-aac.js',
      'packets-sel.js',
      'packets-playlist.js',
      'packets-compile.js',
    ];
    for (const file of nineMakers) {
      const src = read(file);
      expect(src, `${file} mounts batch helper`).toContain('mountBatchListHelper');
      expect(src, `${file} no innerHTML`).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/);
      expect(src, `${file} US spelling`).not.toMatch(BRITISH);
    }

    // Boot packets-choice.html and test live .csv load -> textarea + batch UI update -> Clear list
    const dom = new JSDOM(read('packets-choice.html'), {
      url: 'https://packets.test/packets-choice.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    if (d.readyState === 'loading') {
      await new Promise((resolve) => d.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });
    try {
      for (const s of [
        'packets-page.js',
        'word_sounds_take_home_loader.js',
        'packet_sort_write_adapters.js',
        'packet_choice_builder.js',
        'packets_station_bilingual.js',
        'packets_qr_crypto.js',
        'packets_verify_core.js',
        'packets_handoff.js',
        'packets_zip.js',
        'packets-choice.js',
      ]) {
        w.eval(read(s));
      }

      const helper = d.querySelector('[data-batch-helper="1"]');
      expect(helper).toBeTruthy();
      const fileInput = helper.querySelector('[data-batch-file="1"]');
      const clearBtn = helper.querySelector('[data-batch-clear="1"]');
      const ta = d.getElementById('f-batch-names');
      expect(clearBtn.hidden).toBe(true);

      const roster = new w.File(['student_code,group\nBlueHeron7,A\nCedarFox2,A\nMapleJay1,B\n'], 'room12.csv', { type: 'text/csv' });
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [roster] });
      fileInput.dispatchEvent(new w.Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 25));

      expect(ta.value).toBe('BlueHeron7\nCedarFox2\nMapleJay1');
      expect(clearBtn.hidden).toBe(false);
      expect(helper.querySelector('[data-batch-helper-said="1"]').textContent).toContain('Loaded 3 code names from room12.csv.');
      expect(d.getElementById('batch-said').textContent).toContain('3');

      // Clear list button resets textarea and restores focus
      clearBtn.click();
      expect(ta.value).toBe('');
      expect(clearBtn.hidden).toBe(true);
      expect(d.activeElement).toBe(ta);
    } finally {
      w.close();
    }
  });
});
