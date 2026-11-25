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

const SP = require(path.join(ROOT, 'packets_starter_packs.js'));
const ZIP = require(path.join(ROOT, 'packets_zip.js'));

function makeResultJson({ id, learner, date, title, items }) {
  const graded = items.filter((i) => !i.practice);
  const firstTry = graded.filter((i) => i.firstTry).length;
  const afterRetry = graded.filter((i) => !i.firstTry && i.correct).length;
  const missed = graded.filter((i) => !i.correct).length;
  return JSON.stringify({
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    sessionId: id,
    packet: { id: 'wave31-' + id, version: '2026-11-24', form: '', mode: 'practice' },
    lessonId: 'wave31-' + id,
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

describe('Wave 31 — 1-Page MTSS Huddle Print & Spreadsheet CSV Export on packets-results.html', () => {
  it('prints a dedicated 1-page MTSS huddle sheet and exports formula-safe UTF-8 BOM MTSS CSV', async () => {
    const css = read('packets-results.css');
    const beforePrint = css.split('@media print')[0];
    expect(beforePrint).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).toContain('body.print-mtss-huddle');

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

    const printEvents = [];
    w.print = () => {
      printEvents.push({
        hasClass: d.body.classList.contains('print-mtss-huddle'),
        foldOpen: !!d.getElementById('group-mtss-fold')?.open,
      });
    };
    const downloads = [];
    w.URL.createObjectURL = (blob) => {
      downloads.push({ blob });
      return 'blob:w31-' + downloads.length;
    };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      if (downloads.length) downloads[downloads.length - 1].download = this.download;
    };

    try {
      w.eval(read('packets_results_reader.js'));
      w.eval(read('packets_handoff.js'));
      w.eval(read('packets_followup.js'));
      w.eval(read('packets-results.js'));

      const files = [
        // Formula-injection candidate code name (=CMD) + Tier 3
        new w.File([makeResultJson({
          id: 'r1', learner: '=BirchOwl3', date: '2026-11-24', title: 'Facts',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_ccc', word: '6 x 7', target: '42', responses: ['36'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 2, itemId: 'i2', activity: 'math_ccc', word: '7 x 8', target: '56', responses: ['54'], attempts: 2, firstTry: false, correct: false, done: true },
          ],
        })], 'r1.json', { type: 'application/json' }),
        // Tier 1 student
        new w.File([makeResultJson({
          id: 'r2', learner: 'MapleJay1', date: '2026-11-24', title: 'Facts',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_ccc', word: '6 x 7', target: '42', responses: ['42'], attempts: 1, firstTry: true, correct: true, done: true },
          ],
        })], 'r2.json', { type: 'application/json' }),
      ];

      const input = d.getElementById('files');
      Object.defineProperty(input, 'files', { configurable: true, value: files });
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
      for (let i = 0; i < 60 && d.getElementById('state-results').hidden; i++) {
        await new Promise((r) => setTimeout(r, 15));
      }
      expect(d.getElementById('state-results').hidden).toBe(false);

      const fold = d.getElementById('group-mtss-fold');
      expect(fold.open).toBe(false);

      // Click Print 1-page MTSS huddle -> auto-opens fold, applies body.print-mtss-huddle, restores on afterprint
      d.getElementById('print-mtss-huddle').click();
      expect(printEvents).toEqual([{ hasClass: true, foldOpen: true }]);
      w.dispatchEvent(new w.Event('afterprint'));
      expect(d.body.classList.contains('print-mtss-huddle')).toBe(false);
      expect(fold.open).toBe(false);

      // Click Save MTSS table (CSV) -> UTF-8 BOM + CRLF + formula neutralization + expected columns
      d.getElementById('mtss-huddle-csv').click();
      expect(downloads).toHaveLength(1);
      expect(downloads[0].download).toMatch(/^mtss-screening__\d{4}-\d{2}-\d{2}\.csv$/);
      const bytes = new Uint8Array(await downloads[0].blob.arrayBuffer());
      expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
      const csvText = new TextDecoder('utf-8').decode(bytes.slice(3));
      expect(csvText).toContain('\r\n');
      expect(csvText).toContain('student_code,suggested_tier,tier_label,sessions,date_range,trend_direction,primary_reason,next_focus,choice_pathways,udl_supports');
      expect(csvText).toContain("'=BirchOwl3,Tier 3");
      expect(csvText).toContain('MapleJay1,Tier 1');
    } finally {
      w.close();
    }
  });
});

describe('Wave 31 — Starter Pack Direct Link (#pack=<id>) & Copy Link on packets-packs.html', () => {
  it('copies a direct #pack=<id> link from any card and highlights that card when opened', async () => {
    const css = read('packets-packs.css');
    const beforePrint = css.split('@media print')[0];
    expect(beforePrint).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).toContain('.pack-card.is-highlighted');

    // Step 1: Copy direct link from oer_civics_branches_g68
    const dom1 = new JSDOM(read('packets-packs.html'), {
      url: 'https://packets.test/packets-packs.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w1 = dom1.window;
    const d1 = w1.document;
    if (d1.readyState === 'loading') {
      await new Promise((r) => d1.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    let copiedUrl = '';
    Object.defineProperty(w1.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (txt) => { copiedUrl = txt; return Promise.resolve(); } },
    });
    w1.AlloPacketStarterPacks = SP;
    w1.AlloPacketZip = ZIP;
    w1.eval(read('packets-packs.js'));

    try {
      const copyBtn = d1.querySelector('[data-pack-copy-link="oer_civics_branches_g68"]');
      expect(copyBtn).toBeTruthy();
      copyBtn.click();
      await new Promise((r) => setTimeout(r, 10));
      expect(copiedUrl).toBe('https://packets.test/packets-packs.html#pack=oer_civics_branches_g68');
      expect(d1.getElementById('pack-action-status').textContent).toContain('Copied direct link');
    } finally {
      w1.close();
    }

    // Step 2: Open copied URL -> highlights exact card and shows calm status, then clears highlight on filter change
    const dom2 = new JSDOM(read('packets-packs.html'), {
      url: copiedUrl,
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w2 = dom2.window;
    const d2 = w2.document;
    if (d2.readyState === 'loading') {
      await new Promise((r) => d2.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    w2.HTMLElement.prototype.scrollIntoView = () => {};
    w2.AlloPacketStarterPacks = SP;
    w2.AlloPacketZip = ZIP;
    w2.eval(read('packets-packs.js'));

    try {
      const card = d2.querySelector('[data-pack-id="oer_civics_branches_g68"]');
      expect(card).toBeTruthy();
      expect(card.getAttribute('data-pack-highlighted')).toBe('true');
      expect(card.classList.contains('is-highlighted')).toBe(true);
      expect(d2.getElementById('pack-action-status').textContent).toContain('Linked starter pack:');

      // Changing a filter clears highlight cleanly
      d2.getElementById('f-subject').value = 'STEM';
      d2.getElementById('f-subject').dispatchEvent(new w2.Event('change', { bubbles: true }));
      expect(d2.querySelector('[data-pack-highlighted="true"]')).toBeNull();
    } finally {
      w2.close();
    }
  });
});
