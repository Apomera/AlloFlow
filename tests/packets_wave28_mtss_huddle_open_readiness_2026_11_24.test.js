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

require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
const MATH = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const PL = require(path.join(ROOT, 'packet_playlist_builder.js'));
const CHOICE = require(path.join(ROOT, 'packet_choice_builder.js'));
const MAZE = require(path.join(ROOT, 'packet_maze_builder.js'));
const MANIP = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const STEM = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const LIFE = require(path.join(ROOT, 'packet_life_skills_builder.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
const FOLLOWUP = require(path.join(ROOT, 'packets_followup.js'));
const READER = require(path.join(ROOT, 'packets_results_reader.js'));

const BRITISH = /\b(practis\w*|standardis\w*|licences?|colours?|marking|marked|tick(?:ed|s)?|USB stick|whilst|maths|favour\w*|behaviour\w*|centres?)\b/i;

function makePracticeResultJson({ id, learner, date, title, items }) {
  const graded = items.filter((i) => !i.practice);
  const practiced = items.filter((i) => !!i.practice).length;
  const firstTry = graded.filter((i) => i.firstTry).length;
  const afterRetry = graded.filter((i) => !i.firstTry && i.correct).length;
  const missed = graded.filter((i) => !i.correct).length;
  return JSON.stringify({
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    sessionId: id,
    packet: { id: 'wave28-lesson', version: '2026-11-24', form: '', mode: 'practice' },
    lessonId: 'wave28-lesson',
    revision: '2026-11-24',
    lessonTitle: title || 'Fraction Practice',
    mode: 'practice',
    learner,
    startedLocal: `${date}T10:00:00-05:00`,
    finishedLocal: `${date}T10:05:00-05:00`,
    durationMs: 300000,
    activeMs: 120000,
    summary: {
      items: graded.length,
      done: items.length,
      firstTry,
      afterRetry,
      missed,
      practised: practiced,
    },
    score: {
      items: graded.length,
      done: items.length,
      firstTry,
      correct: firstTry + afterRetry,
      tools: ['size'],
    },
    items,
  });
}

describe('Wave 28 — In-Page MTSS Small-Group Screening Huddle & Copy on packets-results.html', () => {
  it('enforces static hygiene, zero raw hex before @media print, and print chip preservation', () => {
    const fJs = read('packets_followup.js');
    const rJs = read('packets-results.js');
    const rCss = read('packets-results.css');
    expect(fJs).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b|\blocation\.href\b/);
    expect(fJs).not.toMatch(BRITISH);
    expect(rJs).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b|\blocation\.href\b/);
    expect(rJs).not.toMatch(BRITISH);
    const beforePrint = rCss.split('@media print')[0];
    expect(beforePrint).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const printBlock = rCss.split('@media print')[1] || '';
    expect(printBlock).toContain(':not(.mtss-student-chip)');
    expect(printBlock).toContain('.mtss-huddle-card');
  });

  it('renders MTSS screening bands in Group View, copies huddle notes (clipboard + fallback), jumps to student view, and clears on Start over', async () => {
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
    let clipboardText = '';
    let clipboardReject = false;
    Object.defineProperty(w.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (txt) => {
          if (clipboardReject) return Promise.reject(new Error('denied'));
          clipboardText = txt;
          return Promise.resolve();
        },
      },
    });
    const downloads = [];
    w.URL.createObjectURL = (blob) => {
      downloads.push({ blob });
      return 'blob:w28-' + downloads.length;
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
        // Tier 1 (100% first-try)
        new w.File([makePracticeResultJson({
          id: 's-t1', learner: 'MapleJay1', date: '2026-11-24',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_fact', word: '3 + 4', target: '7', responses: ['7'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'i2', activity: 'math_fact', word: '6 + 5', target: '11', responses: ['11'], attempts: 1, firstTry: true, correct: true, done: true },
          ],
        })], 't1.json', { type: 'application/json' }),
        // Tier 2 (75% first-try: between 50% and 79%)
        new w.File([makePracticeResultJson({
          id: 's-t2', learner: 'CedarFox2', date: '2026-11-24',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_fact', word: '3 + 4', target: '7', responses: ['7'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'i2', activity: 'math_fact', word: '6 + 5', target: '11', responses: ['11'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 3, itemId: 'i3', activity: 'math_fact', word: '7 + 8', target: '15', responses: ['15'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 4, itemId: 'i4', activity: 'math_fact', word: '9 + 6', target: '15', responses: ['14', '15'], attempts: 2, firstTry: false, correct: true, done: true, supports: { hint: 1 } },
          ],
        })], 't2.json', { type: 'application/json' }),
        // Tier 3 (25% first-try: < 50%)
        new w.File([makePracticeResultJson({
          id: 's-t3', learner: 'BirchOwl3', date: '2026-11-24',
          items: [
            { n: 1, itemId: 'i1', activity: 'math_fact', word: '3 + 4', target: '7', responses: ['7'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'i2', activity: 'math_fact', word: '6 + 5', target: '11', responses: ['10'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 3, itemId: 'i3', activity: 'math_fact', word: '7 + 8', target: '15', responses: ['13'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 4, itemId: 'i4', activity: 'math_fact', word: '9 + 6', target: '15', responses: ['12'], attempts: 2, firstTry: false, correct: false, done: true },
          ],
        })], 't3.json', { type: 'application/json' }),
        // Unscored SEL toolkit only
        new w.File([makePracticeResultJson({
          id: 's-sel', learner: 'RiverStar4', date: '2026-11-24', title: 'Calm & Focus Toolkit',
          items: [
            { n: 1, itemId: 'sel1', activity: 'sel_first_then', word: 'First-Then Board', responses: ['done'], attempts: 1, firstTry: false, correct: false, done: true, practice: true, supports: { sel_first_then: 1 } },
          ],
        })], 'sel.json', { type: 'application/json' }),
      ];

      const input = d.getElementById('files');
      Object.defineProperty(input, 'files', { configurable: true, value: files });
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
      for (let i = 0; i < 60 && d.getElementById('state-results').hidden; i++) {
        await new Promise((r) => setTimeout(r, 15));
      }
      expect(d.getElementById('state-results').hidden).toBe(false);

      // Existing #group-table h4 invariant remains untouched
      const groupTableH4s = [...d.getElementById('group-table').querySelectorAll('h4')].map((h) => h.textContent);
      expect(groupTableH4s).toEqual(['Practice: latest first-try percent']);

      // MTSS huddle fold exists, starts collapsed, and summarizes exact counts
      const fold = d.getElementById('group-mtss-fold');
      expect(fold).toBeTruthy();
      expect(fold.open).toBe(false);
      const summaryText = fold.querySelector('summary').textContent;
      expect(summaryText).toContain('Tier 3: 1');
      expect(summaryText).toContain('Tier 2: 1');
      expect(summaryText).toContain('Tier 1: 1');
      expect(summaryText).toContain('Unscored: 1');

      // Open fold and check band placement
      fold.open = true;
      expect(d.querySelector('[data-mtss-band="tier3"]').textContent).toContain('BirchOwl3');
      expect(d.querySelector('[data-mtss-band="tier2"]').textContent).toContain('CedarFox2');
      expect(d.querySelector('[data-mtss-band="tier1"]').textContent).toContain('MapleJay1');
      expect(d.querySelector('[data-mtss-band="unscored"]').textContent).toContain('RiverStar4');

      // Copy huddle notes via clipboard
      d.getElementById('copy-mtss-huddle').click();
      await new Promise((r) => setTimeout(r, 10));
      expect(clipboardText).toContain('MTSS small-group screening summary (4 students)');
      expect(clipboardText).toContain('BirchOwl3');
      expect(clipboardText).toContain('CedarFox2');
      expect(clipboardText).toContain('RiverStar4');
      expect(clipboardText).toContain('never placement decisions');
      expect(clipboardText).not.toContain('!');

      // Manual textarea fallback when clipboard rejects
      clipboardReject = true;
      d.getElementById('copy-mtss-huddle').click();
      await new Promise((r) => setTimeout(r, 10));
      const box = d.getElementById('copy-mtss-huddle-box');
      expect(box.hidden).toBe(false);
      expect(box.querySelector('textarea').value).toContain('BirchOwl3');

      // Shortcut Export MTSS JSON works
      d.getElementById('mtss-huddle-export').click();
      expect(downloads).toHaveLength(1);
      expect(downloads[0].download).toMatch(/^mtss-triage__\d{4}-\d{2}-\d{2}\.json$/);

      // Clicking a student chip jumps straight to One student view for BirchOwl3
      d.querySelector('[data-mtss-student="BirchOwl3"]').click();
      expect(d.getElementById('view-learner').hidden).toBe(false);
      expect(d.getElementById('view-group').hidden).toBe(true);
      expect(d.getElementById('pick-learner').selectedOptions[0].textContent).toContain('BirchOwl3');

      // Start over clears #group-mtss-host cleanly
      d.getElementById('start-over').click();
      d.getElementById('start-over-yes').click();
      expect(d.getElementById('group-mtss-host').hidden).toBe(true);
      expect(d.getElementById('group-mtss-host').textContent).toBe('');
    } finally {
      w.close();
    }
  });
});

describe('Wave 28 — Wave 2-5 Readiness Summary on packets-open.html', () => {
  it('displays home languages, station mode, sealed QR, playlist stage count, and non-scored toolkit notes cleanly', async () => {
    const openJs = read('packets-open.js');
    expect(openJs).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/);
    expect(openJs).not.toMatch(BRITISH);

    const openPacketPage = async (packetHtml, name = 'packet.html') => {
      const dom = new JSDOM(read('packets-open.html'), {
        url: 'https://packets.test/packets-open.html',
        runScripts: 'outside-only',
        pretendToBeVisual: true,
      });
      const w = dom.window;
      const d = w.document;
      w.TextEncoder = TextEncoder;
      w.TextDecoder = TextDecoder;
      Object.defineProperty(w, 'crypto', { configurable: true, value: webcrypto });
      w.eval(read('packets_verify_core.js'));
      w.eval(read('packets_handoff.js'));
      w.eval(openJs);
      const input = d.getElementById('file');
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [new w.File([packetHtml], name, { type: 'text/html' })],
      });
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
      for (let i = 0; i < 80 && d.getElementById('found').hidden && d.getElementById('problem').hidden; i++) {
        await new Promise((r) => setTimeout(r, 15));
      }
      return { w, d };
    };

    // 1. Bilingual + Station Mode + Sealed QR packet
    const kp = Q.generateKeyPair('Room 8');
    const mathLesson = MATH.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'add-doubles', count: 2 });
    mathLesson.homeLanguages = ['es', 'ar'];
    const builtMath = TH.buildHtml(mathLesson, { core: { soundAnswerMatches: () => false }, stationMode: true, qrPublicKey: kp.publicKey });
    const p1 = await openPacketPage(builtMath, 'doubles-bilingual.html');
    try {
      expect(p1.d.getElementById('found').hidden).toBe(false);
      const line1 = p1.d.getElementById('found-line').textContent;
      expect(line1).toContain('Home languages: Spanish, Arabic.');
      expect(line1).toContain('Shared device station mode.');
      expect(line1).toContain('Sealed QR results enabled.');
    } finally {
      p1.w.close();
    }

    // 2. Non-scored SEL toolkit (previously blank #found-line)
    const builtSel = SEL.buildSelPacket({ starterId: SEL.STARTER_SETS[0].id, loader: TH });
    const p2 = await openPacketPage(builtSel.html, 'sel-toolkit.html');
    try {
      expect(p2.d.getElementById('found').hidden).toBe(false);
      expect(p2.d.getElementById('found-line').hidden).toBe(false);
      expect(p2.d.getElementById('found-line').textContent).toContain('Not scored \u2014 support toolkit.');
    } finally {
      p2.w.close();
    }

    // 3. Multi-stage Unit Playlist
    const builtPl = PL.buildPlaylistPacket({
      arcId: PL.STARTER_ARCS[0].id,
      loader: TH,
      builders: {
        choice: CHOICE,
        maze: MAZE,
        manipulatives: MANIP,
        stem: STEM,
        life: LIFE,
        aac: AAC,
        sel: SEL,
        math: MATH,
        sortWrite: SW,
      },
      bilingual: SB,
    });
    const p3 = await openPacketPage(builtPl.html, 'unit-playlist.html');
    try {
      expect(p3.d.getElementById('found').hidden).toBe(false);
      expect(p3.d.getElementById('found-kind').textContent).toBe('Unit playlist');
      expect(p3.d.getElementById('found-line').textContent).toMatch(/\d+ stages\./);
    } finally {
      p3.w.close();
    }
  });
});
