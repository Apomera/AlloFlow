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
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const HANDOFF = require(path.join(ROOT, 'packets_handoff.js'));
const CHOICE = require(path.join(ROOT, 'packet_choice_builder.js'));
const MAZE = require(path.join(ROOT, 'packet_maze_builder.js'));
const MANIP = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const STEM = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const LIFE = require(path.join(ROOT, 'packet_life_skills_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const PL = require(path.join(ROOT, 'packet_playlist_builder.js'));
const MATH = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
const SP = require(path.join(ROOT, 'packets_starter_packs.js'));
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
    packet: { id: 'wave30-' + id, version: '2026-11-24', form: '', mode: 'practice' },
    lessonId: 'wave30-' + id,
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

describe('Wave 30 — MTSS Tier Code-Name Copy & .txt Export for Maker Batching', () => {
  it('copies and exports tier-scoped student code lists (.txt) even for Wave 2-4 STEM/Choice domains and round-trips through parseBatchListText', async () => {
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

    let copied = '';
    Object.defineProperty(w.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (t) => { copied = t; return Promise.resolve(); } },
    });
    const downloads = [];
    w.URL.createObjectURL = (blob) => {
      downloads.push({ blob });
      return 'blob:w30-codes-' + downloads.length;
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

      // Two Tier 3 students on a STEM Lab (no Word Sounds / Math / Vocab follow-up target) + one Tier 1 student
      const files = [
        new w.File([makeResultJson({
          id: 'stem-a', learner: 'BirchOwl3', date: '2026-11-24', title: 'Series Circuit Lab',
          items: [
            { n: 1, itemId: 'c1', activity: 'stem_circuit', word: 'Current', target: '2', responses: ['4'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 2, itemId: 'c2', activity: 'stem_circuit', word: 'Resistance', target: '6', responses: ['3'], attempts: 2, firstTry: false, correct: false, done: true },
          ],
        })], 'a.json', { type: 'application/json' }),
        new w.File([makeResultJson({
          id: 'stem-b', learner: 'OakLeaf4', date: '2026-11-24', title: 'Series Circuit Lab',
          items: [
            { n: 1, itemId: 'c1', activity: 'stem_circuit', word: 'Current', target: '2', responses: ['5'], attempts: 2, firstTry: false, correct: false, done: true },
            { n: 2, itemId: 'c2', activity: 'stem_circuit', word: 'Resistance', target: '6', responses: ['6'], attempts: 2, firstTry: false, correct: true, done: true },
          ],
        })], 'b.json', { type: 'application/json' }),
        new w.File([makeResultJson({
          id: 'stem-c', learner: 'MapleJay1', date: '2026-11-24', title: 'Series Circuit Lab',
          items: [
            { n: 1, itemId: 'c1', activity: 'stem_circuit', word: 'Current', target: '2', responses: ['2'], attempts: 1, firstTry: true, correct: true, done: true },
            { n: 2, itemId: 'c2', activity: 'stem_circuit', word: 'Resistance', target: '6', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true },
          ],
        })], 'c.json', { type: 'application/json' }),
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

      const copyCodesBtn = d.querySelector('[data-mtss-copy-codes]');
      const saveCodesBtn = d.querySelector('[data-mtss-save-codes]');
      expect(copyCodesBtn).toBeTruthy();
      expect(saveCodesBtn).toBeTruthy();

      // Copy code names -> strictly Tier 3 students (BirchOwl3 + OakLeaf4), NOT Tier 1 MapleJay1
      copyCodesBtn.click();
      await new Promise((r) => setTimeout(r, 15));
      expect(copied).toBe('BirchOwl3\nOakLeaf4');
      expect(d.getElementById('mtss-followup-status').textContent).toContain('Copied 2 code names');

      // Save code list (.txt) -> round-trips cleanly through AlloPacketHandoff.parseBatchListText
      saveCodesBtn.click();
      expect(downloads).toHaveLength(1);
      expect(downloads[0].download).toMatch(/^tier-3-review-group-codes__\d{4}-\d{2}-\d{2}\.txt$/);
      const txtContent = await downloads[0].blob.text();
      expect(HANDOFF.parseBatchListText(txtContent, 40).names).toEqual(['BirchOwl3', 'OakLeaf4']);
    } finally {
      w.close();
    }
  });
});

describe('Wave 30 — 1-Click Starter Packs to Sealed QR Bulk-Seal Handoff (#seal-batch)', () => {
  it('hands a filtered Starter Pack .zip straight into packets-qr.html#seal-batch, ignores sample keys, and auto-seals on real teacher key creation', async () => {
    const qrJs = read('packets-qr.js');
    expect(qrJs).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b|\blocalStorage\b|\bsessionStorage\b/);
    expect(BRITISH.exec(qrJs.replace(/\bpractised\b/g, 'doneCount'))).toBeNull();

    // Step 1: Filter packets-packs.html to STEM + 6-8 and click "Seal N packs with QR"
    const packsDom = new JSDOM(read('packets-packs.html'), {
      url: 'https://packets.test/packets-packs.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const pw = packsDom.window;
    const pd = pw.document;
    if (pd.readyState === 'loading') {
      await new Promise((r) => pd.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    const handedOff = [];
    pw.TextEncoder = TextEncoder;
    pw.TextDecoder = TextDecoder;
    pw.AlloWordSoundsTakeHome = TH;
    pw.AlloPacketMathPractice = MATH;
    pw.AlloPacketSortWrite = SW;
    pw.AlloPacketChoice = CHOICE;
    pw.AlloPacketMaze = MAZE;
    pw.AlloPacketManipulatives = MANIP;
    pw.AlloPacketStemLab = STEM;
    pw.AlloPacketLifeSkills = LIFE;
    pw.AlloPacketAac = AAC;
    pw.AlloPacketSel = SEL;
    pw.AlloPacketPlaylist = PL;
    pw.AlloPacketStationBilingual = SB;
    pw.AlloPacketZip = ZIP;
    pw.AlloPacketStarterPacks = SP;
    pw.AlloPacketHandoff = {
      redirect: (file, href, hash) => {
        handedOff.push({ file, href, hash });
        return Promise.resolve(true);
      },
    };
    pw.eval(read('packets-packs.js'));

    try {
      pd.getElementById('f-subject').value = 'STEM';
      pd.getElementById('f-subject').dispatchEvent(new pw.Event('change', { bubbles: true }));
      pd.getElementById('f-grade').value = '6-8';
      pd.getElementById('f-grade').dispatchEvent(new pw.Event('change', { bubbles: true }));

      const expectedCount = SP.filterPacks({ subject: 'STEM', gradeBand: '6-8', features: [], query: '' }).filter((p) => p.directDownload).length;
      const sealBtn = pd.getElementById('btn-seal-zip');
      expect(sealBtn.disabled).toBe(false);
      expect(sealBtn.textContent).toBe(`Seal ${expectedCount} packs with QR`);

      sealBtn.click();
      await new Promise((r) => setTimeout(r, 15));
      expect(handedOff).toHaveLength(1);
      expect(handedOff[0].href).toBe('packets-qr.html');
      expect(handedOff[0].hash).toBe('#seal-batch');
      expect(handedOff[0].file.name).toBe('alloflow-starter-packs__stem__6-8.zip');
    } finally {
      pw.close();
    }

    // Step 2: Receive the bundle on packets-qr.html#seal-batch
    const qrDom = new JSDOM(read('packets-qr.html'), {
      url: 'https://packets.test/packets-qr.html#seal-batch',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const qw = qrDom.window;
    const qd = qw.document;
    if (qd.readyState === 'loading') {
      await new Promise((r) => qd.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    qw.TextEncoder = TextEncoder;
    qw.TextDecoder = TextDecoder;
    Object.defineProperty(qw, 'crypto', { value: webcrypto, configurable: true });
    qw.AlloPacketQrCrypto = Q;
    qw.AlloWordSoundsTakeHome = TH;
    qw.AlloPacketZip = ZIP;
    let taken = false;
    qw.AlloPacketHandoff = {
      take: () => {
        taken = true;
        return Promise.resolve(handedOff[0].file);
      },
    };
    const qrDownloads = [];
    qw.URL.createObjectURL = (blob) => {
      qrDownloads.push({ blob });
      return 'blob:w30-qr-' + qrDownloads.length;
    };
    qw.URL.revokeObjectURL = () => {};
    qw.HTMLAnchorElement.prototype.click = function () {
      if (qrDownloads.length) qrDownloads[qrDownloads.length - 1].download = this.download;
    };

    try {
      qw.eval(qrJs);
      await new Promise((r) => setTimeout(r, 25));

      expect(taken).toBe(true);
      expect(qd.getElementById('seal-status').textContent).toContain('Received alloflow-starter-packs__stem__6-8.zip');

      // Sample key must NOT consume or seal real student packets
      qd.getElementById('demo-start').click();
      await new Promise((r) => setTimeout(r, 20));
      expect(qd.getElementById('seal-results').hidden).toBe(true);

      // Clear sample key -> create real teacher key -> pending bundle seals automatically!
      qd.getElementById('clear-key').click();
      qd.getElementById('make-key').click();
      for (let i = 0; i < 60 && qd.getElementById('seal-results').hidden; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }

      expect(qd.getElementById('seal-results').hidden).toBe(false);
      const fp = qd.getElementById('key-fp').textContent.trim();
      expect(fp.length).toBeGreaterThanOrEqual(6);
      const sealedRows = [...qd.querySelectorAll('#seal-list li')];
      expect(sealedRows.length).toBeGreaterThanOrEqual(2);
      sealedRows.forEach((li) => expect(li.textContent).toContain('Sealed for Key ID ' + fp));

      // Download sealed .zip and verify every sealed HTML inside passes offline verifier
      qd.getElementById('seal-download').click();
      expect(qrDownloads).toHaveLength(1);
      expect(qrDownloads[0].download).toBe(`sealed-packets__${fp}.zip`);
      const sealedAb = await qrDownloads[0].blob.arrayBuffer();
      const entries = ZIP.readZip(new Uint8Array(sealedAb));
      expect(entries.length).toBe(sealedRows.length);
      for (const entry of entries) {
        expect(entry.crcOk).toBe(true);
        const sealedHtml = new TextDecoder('utf-8').decode(entry.bytes);
        const report = V.verifyPacket(sealedHtml);
        expect(report.ok).toBe(true);
        expect(report.result).toBe('closed');
        expect(report.counts.look).toBe(0);
        expect(report.counts.notExpected).toBe(0);
        expect(sealedHtml).toContain(fp);
      }
    } finally {
      qw.close();
    }
  });
});
