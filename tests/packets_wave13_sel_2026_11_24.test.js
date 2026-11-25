// Wave 4C Tests: Private SEL Check-In, Executive Function & "First-Then" Toolkit Packets
// (Visual First-Then & Multi-Step Checklist, Visual Focus & Break Timer, Calm-Down & Self-Regulation
// Strategy Cards, Metacognitive UDL Reflection & Goal Check, Combined Daily Toolkit),
// Strict Student Privacy Controls (opt-in reflection/check-in sharing defaulted OFF across
// localStorage, JSON, CSV, and Sealed QR), Bilingual RTL, Station Mode, Reopen + Batch .zip,
// verifyPacket closed verdict, and all #5 static/CSP/a11y/US-spelling/non-clinical invariants.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const S = require(path.join(ROOT, 'packet_sel_builder.js'));
const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const SITE = require(path.join(ROOT, 'dev-tools/build_packets_site.cjs'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;

const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const DIAGNOSTIC_ACRONYMS = /\b(ADHD|ASD|ODD|PTSD|OCD|DSM-5|DSM)\b/;

function openPacket(html, opts = {}) {
  let clock = 4000;
  const intervals = [];
  let nextId = 1;
  const downloads = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/sel-toolkit.html',
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      if (opts.fakeTimers) {
        w.setInterval = (fn, ms) => {
          const id = nextId++;
          intervals.push({ id, fn, ms, active: true });
          return id;
        };
        w.clearInterval = (id) => {
          const hit = intervals.find((x) => x.id === id);
          if (hit) hit.active = false;
        };
      }
      if (opts.captureDownloads) {
        const blobs = new Map();
        w.URL.createObjectURL = (blob) => {
          const u = 'blob:test-' + (blobs.size + 1);
          blobs.set(u, blob);
          return u;
        };
        w.URL.revokeObjectURL = () => {};
        const origClick = w.HTMLAnchorElement.prototype.click;
        w.HTMLAnchorElement.prototype.click = function () {
          if (this.download && blobs.has(this.href)) {
            downloads.push({ filename: this.download, blob: blobs.get(this.href) });
            return;
          }
          return origClick.call(this);
        };
      }
    },
  });
  const d = dom.window.document;
  const q = (sel) => d.querySelector(sel);
  const qa = (sel) => [...d.querySelectorAll(sel)];
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => qa('#app button').filter(seen).find((b) => b.textContent.trim() === text);
  return {
    dom, w: dom.window, d, q, qa, seen, button, downloads,
    stepIntervals: (times = 1) => {
      for (let i = 0; i < times; i++) {
        intervals.filter((x) => x.active).forEach((x) => x.fn());
      }
    },
    advanceClock: (ms) => { clock += ms; },
  };
}

async function expectClosedVerified(html) {
  const report = await V.verifyPacket(html);
  expect(report.ok).toBe(true);
  expect(report.result).toBe('closed');
  expect(report.counts.look).toBe(0);
  expect(report.counts.notExpected).toBe(0);
  expect(html).toContain("connect-src 'none'");
  expect(html.split('http').length - 1).toBe(html.split('http-equiv').length - 1);
  return report;
}

describe('Wave 4C — Visual First-Then Checklist & Focus/Break Timer', () => {
  it('runs sel_first_then with step toggles, private local-only custom step (never exported), Uncheck all focus fallback, and non-scored completion', async () => {
    const made = S.buildSelPacket({ loader: TH, starterId: 'sel_first_then_routine' });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Maya';
    t.button('Start').click();

    expect(t.q('[data-ft-first]').textContent).toContain('Finish my independent work steps');
    expect(t.q('[data-ft-then]').textContent).toContain('stretch or choice break');

    // Toggle step 1 -> focus retained on rebuilt step button
    t.q('[data-ft-step="s1"]').click();
    expect(t.q('[data-ft-step="s1"]').getAttribute('aria-pressed')).toBe('true');
    expect(t.d.activeElement).toBe(t.q('[data-ft-step="s1"]'));

    // Add a private personal step — verify it renders on screen, NEVER leaks into saved results
    const secretStep = 'Call Aunt Clara after homeroom';
    t.q('[data-ft-add-input]').value = secretStep;
    t.q('[data-ft-add-btn]').click();
    expect(t.q('[data-ft-steps]').textContent).toContain(secretStep);
    expect(t.q('[data-ft-readout]').textContent).toContain('1 of 5 steps done.');

    // Uncheck all disables resetBtn and moves focus safely to first step (not document.body)
    const resetBtn = t.q('[data-ft-reset]');
    resetBtn.focus();
    resetBtn.click();
    expect(resetBtn.disabled).toBe(true);
    expect(t.d.activeElement).toBe(t.q('[data-ft-step="s1"]'));
    expect(t.q('[data-ft-readout]').textContent).toContain('0 of 5 steps done.');

    // Check off two steps and complete checklist
    t.q('[data-ft-step="s1"]').click();
    t.q('[data-ft-step="s2"]').click();
    t.q('[data-sel-done]').click();
    expect(t.q('[data-feedback]').textContent).toContain('2 of 5 steps checked off');
    t.button('See my results').click();

    const storeKey = 'alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision;
    const rawSaved = t.w.localStorage.getItem(storeKey);
    expect(rawSaved).toBeTruthy();
    expect(rawSaved).not.toContain(secretStep);
    const saved = JSON.parse(rawSaved);
    expect(saved.items[0].practice).toBe('traced');
    expect(saved.items[0].supports.efChecklist).toBe(1);
    expect(saved.items[0].notes.summary.t).toContain('2 of 5 steps checked');
    t.dom.window.close();
  });

  it('runs sel_focus_timer with presets, visual countdown, break switching, completion announcement, and Reset focus fallback', async () => {
    const made = S.buildSelPacket({ loader: TH, starterId: 'sel_focus_break_blocks' });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html, { fakeTimers: true });
    t.d.getElementById('learner-name').value = 'Noah';
    t.button('Start').click();

    expect(t.q('[data-tm-clock]').textContent).toBe('05:00');
    // Switch to 1-min preset (60s)
    t.q('[data-tm-preset="1"]').click();
    expect(t.q('[data-tm-clock]').textContent).toBe('01:00');

    // Start, tick 5s, pause, reset -> focus moves to Start button when Reset disables
    t.q('[data-tm-toggle]').click();
    t.stepIntervals(5);
    expect(t.q('[data-tm-clock]').textContent).toBe('00:55');
    t.q('[data-tm-toggle]').click(); // pause
    expect(t.q('[data-tm-toggle]').textContent).toBe('Resume timer');

    const resetBtn = t.q('[data-tm-reset]');
    resetBtn.focus();
    resetBtn.click();
    expect(resetBtn.disabled).toBe(true);
    expect(t.d.activeElement).toBe(t.q('[data-tm-toggle]'));
    expect(t.q('[data-tm-clock]').textContent).toBe('01:00');

    // Run full 1-min focus block to completion
    t.q('[data-tm-toggle]').click();
    t.stepIntervals(60);
    expect(t.q('[data-tm-clock]').textContent).toBe('00:00');
    expect(t.q('[data-tm-readout]').textContent).toContain('Focus block finished');

    // Switch to calm break and log session
    t.q('[data-tm-switch]').click();
    expect(t.q('[data-tm-phase]').textContent).toContain('Calm break (2 min)');
    expect(t.q('[data-tm-clock]').textContent).toBe('02:00');
    t.q('[data-sel-done]').click();
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items[0].practice).toBe('traced');
    expect(saved.items[0].supports.focusTimer).toBeGreaterThanOrEqual(1);
    expect(saved.items[0].notes.summary.t).toContain('1 blocks finished');
    t.dom.window.close();
  });
});

describe('Wave 4C — Strict Student Privacy Controls (Calm-Down Toolkit & UDL Reflection)', () => {
  it('keeps sel_calm_toolkit energy check-in private by default across localStorage, JSON, CSV & Sealed QR, and shares ONLY when opted in', async () => {
    const kp = Q.generateKeyPair();
    const made = S.buildSelPacket({ loader: TH, starterId: 'sel_calm_reset_cards', qrPublicKey: kp.publicKey, qrCrypto: Q });
    await expectClosedVerified(made.html);

    // --- Session A: Opt-in checkbox stays UNCHECKED (default private) ---
    const t1 = openPacket(made.html, { captureDownloads: true, fakeTimers: true });
    t1.d.getElementById('learner-name').value = 'Sam';
    t1.button('Start').click();

    expect(t1.q('[data-sel-share-consent]').checked).toBe(false);
    // Select private energy state "Need a break"
    t1.q('[data-cm-state="break"]').click();
    expect(t1.q('[data-cm-state="break"]').getAttribute('aria-pressed')).toBe('true');

    // Practice breathing auto-pace, then switch away to Grounding -> must stop timer & reset Auto pace label (#50)
    t1.q('[data-cm-breath-auto]').click();
    expect(t1.q('[data-cm-breath-auto]').textContent).toBe('Pause pace');
    t1.q('[data-cm-tab="ground"]').click();
    expect(t1.q('[data-cm-breath-auto]').textContent).toBe('Auto pace');
    t1.stepIntervals(5); // Must NOT keep ticking calmBreath in background
    t1.q('[data-cm-ground-item="0"]').click();
    expect(t1.d.activeElement).toBe(t1.q('[data-cm-ground-item="0"]'));
    t1.q('[data-cm-tab="stretch"]').click();
    t1.q('[data-cm-stretch-item="1"]').click();
    expect(t1.d.activeElement).toBe(t1.q('[data-cm-stretch-item="1"]'));
    t1.q('[data-cm-tab="break_card"]').click();
    t1.q('[data-cm-break-use]').click();

    // Finish with consent UNCHECKED
    t1.q('[data-sel-done]').click();
    t1.button('See my results').click();

    const storeKey = 'alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision;
    const rawStore1 = t1.w.localStorage.getItem(storeKey);
    expect(rawStore1).not.toContain('Need a break');
    expect(rawStore1).not.toContain('Energy check-in');

    // Download JSON + CSV + Seal QR
    t1.q('[data-save-json]').click();
    t1.q('[data-save-csv]').click();
    t1.q('[data-qr-toggle]').click();
    const json1 = await t1.downloads.find((d) => d.filename.endsWith('.json')).blob.text();
    const csv1 = await t1.downloads.find((d) => d.filename.endsWith('.csv')).blob.text();
    const qrCode1 = t1.q('[data-qr-code]').textContent.trim();
    expect(qrCode1.startsWith('AFQR1:')).toBe(true);
    const unsealed1 = Q.unsealResult(qrCode1, kp.secretKey);
    expect(unsealed1.ok).toBe(true);

    expect(json1).not.toContain('Need a break');
    expect(csv1).not.toContain('Need a break');
    expect(JSON.stringify(unsealed1.result)).not.toContain('Need a break');
    // Non-sensitive strategy counts ARE present
    expect(unsealed1.result.summary.items).toBe(0);
    expect(unsealed1.result.summary.practised).toBe(1);
    expect(unsealed1.result.items[0].supports.calmBreath).toBe(1);
    expect(unsealed1.result.items[0].supports.calmGround).toBe(1);
    expect(unsealed1.result.items[0].supports.calmStretch).toBe(1);
    expect(unsealed1.result.items[0].supports.calmBreak).toBe(1);
    t1.dom.window.close();

    // --- Session B: Student EXPLICITLY checks opt-in share box ---
    const t2 = openPacket(made.html, { captureDownloads: true });
    t2.d.getElementById('learner-name').value = 'Sam';
    t2.button('Start').click();
    t2.q('[data-cm-state="break"]').click();
    t2.q('[data-sel-share-consent]').click();
    expect(t2.q('[data-sel-share-consent]').checked).toBe(true);
    t2.q('[data-sel-done]').click();
    t2.button('See my results').click();
    t2.q('[data-save-json]').click();
    t2.q('[data-save-csv]').click();
    t2.q('[data-qr-toggle]').click();
    const json2 = await t2.downloads.find((d) => d.filename.endsWith('.json')).blob.text();
    const csv2 = await t2.downloads.find((d) => d.filename.endsWith('.csv')).blob.text();
    const unsealed2 = Q.unsealResult(t2.q('[data-qr-code]').textContent.trim(), kp.secretKey);
    expect(unsealed2.ok).toBe(true);

    expect(json2).toContain('Energy check-in: Need a break');
    expect(csv2).toContain('Energy check-in: Need a break');
    expect(JSON.stringify(unsealed2.result)).toContain('Energy check-in: Need a break');
    t2.dom.window.close();
  });

  it('enforces opt-in privacy on sel_udl_reflect: private reflection notes NEVER enter localStorage/JSON/CSV/QR when unchecked, and DO flow cleanly when checked', async () => {
    const kp = Q.generateKeyPair();
    const made = S.buildSelPacket({ loader: TH, starterId: 'sel_udl_goal_check', qrPublicKey: kp.publicKey, qrCrypto: Q });
    await expectClosedVerified(made.html);

    const PRIVATE_GOAL = 'I felt overwhelmed during the timed quiz';
    const PRIVATE_NEXT = 'Ask Ms Lin for a quiet corner desk';

    // --- Session 1: UNCHECKED consent (strict privacy) ---
    const t1 = openPacket(made.html, { captureDownloads: true });
    t1.d.getElementById('learner-name').value = 'Alex';
    t1.button('Start').click();

    const consent1 = t1.q('[data-sel-share-consent]');
    expect(consent1.checked).toBe(false);

    const goalEl = t1.q('[data-ur-goal]');
    const nextEl = t1.q('[data-ur-next]');
    goalEl.value = PRIVATE_GOAL;
    goalEl.dispatchEvent(new t1.w.Event('input', { bubbles: true }));
    nextEl.value = PRIVATE_NEXT;
    nextEl.dispatchEvent(new t1.w.Event('input', { bubbles: true }));

    // Toggle non-sensitive UDL support chips
    t1.q('[data-ur-support="udlLargePrint"]').click();
    t1.q('[data-ur-support="udlChecklist"]').click();
    expect(t1.q('[data-ur-readout]').textContent).toContain('Larger print, Step checklist');

    // Toggle consent ON then back OFF to verify unchecking scrubs any staged shared_note immediately
    consent1.click();
    expect(consent1.checked).toBe(true);
    consent1.click();
    expect(consent1.checked).toBe(false);

    t1.q('[data-sel-done]').click();
    expect(t1.q('[data-feedback]').textContent).toContain('private notes stay only on this screen');
    t1.button('See my results').click();

    const storeKey = 'alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision;
    const rawStore1 = t1.w.localStorage.getItem(storeKey);
    expect(rawStore1).not.toContain(PRIVATE_GOAL);
    expect(rawStore1).not.toContain(PRIVATE_NEXT);

    t1.q('[data-save-json]').click();
    t1.q('[data-save-csv]').click();
    t1.q('[data-qr-toggle]').click();
    const json1 = await t1.downloads.find((d) => d.filename.endsWith('.json')).blob.text();
    const csv1 = await t1.downloads.find((d) => d.filename.endsWith('.csv')).blob.text();
    const unsealed1 = Q.unsealResult(t1.q('[data-qr-code]').textContent.trim(), kp.secretKey);
    expect(unsealed1.ok).toBe(true);

    expect(json1).not.toContain(PRIVATE_GOAL);
    expect(json1).not.toContain(PRIVATE_NEXT);
    expect(csv1).not.toContain(PRIVATE_GOAL);
    expect(csv1).not.toContain(PRIVATE_NEXT);
    expect(JSON.stringify(unsealed1.result)).not.toContain(PRIVATE_GOAL);
    expect(JSON.stringify(unsealed1.result)).not.toContain(PRIVATE_NEXT);

    // Non-sensitive UDL supports & completion DO appear cleanly in JSON, CSV reader, and Sealed QR
    const parsedJson1 = JSON.parse(json1);
    expect(parsedJson1.summary.items).toBe(0);
    expect(parsedJson1.summary.practised).toBe(1);
    expect(parsedJson1.items[0].supports.udlLargePrint).toBe(1);
    expect(parsedJson1.items[0].supports.udlChecklist).toBe(1);
    const readCsv1 = await R.read(csv1, { name: 'alex.csv' });
    expect(readCsv1.ok).toBe(true);
    expect(JSON.stringify(readCsv1)).not.toContain(PRIVATE_GOAL);
    expect(unsealed1.result.items[0].supports.udlLargePrint).toBe(1);
    expect(unsealed1.result.items[0].supports.udlChecklist).toBe(1);
    t1.dom.window.close();

    // --- Session 2: EXPLICITLY CHECKED consent ---
    const t2 = openPacket(made.html, { captureDownloads: true });
    t2.d.getElementById('learner-name').value = 'Alex';
    t2.button('Start').click();

    const g2 = t2.q('[data-ur-goal]');
    const n2 = t2.q('[data-ur-next]');
    g2.value = 'Finish reading section 2';
    g2.dispatchEvent(new t2.w.Event('input', { bubbles: true }));
    n2.value = 'Use larger print and take a 2-min break';
    n2.dispatchEvent(new t2.w.Event('input', { bubbles: true }));
    t2.q('[data-ur-support="udlReadAloud"]').click();
    t2.q('[data-sel-share-consent]').click();
    t2.q('[data-sel-done]').click();
    t2.button('See my results').click();

    t2.q('[data-save-json]').click();
    t2.q('[data-save-csv]').click();
    t2.q('[data-qr-toggle]').click();
    const json2 = await t2.downloads.find((d) => d.filename.endsWith('.json')).blob.text();
    const csv2 = await t2.downloads.find((d) => d.filename.endsWith('.csv')).blob.text();
    const unsealed2 = Q.unsealResult(t2.q('[data-qr-code]').textContent.trim(), kp.secretKey);
    expect(unsealed2.ok).toBe(true);

    expect(json2).toContain('Goal: Finish reading section 2');
    expect(json2).toContain('Next: Use larger print and take a 2-min break');
    expect(csv2).toContain('Goal: Finish reading section 2');
    expect(JSON.stringify(unsealed2.result)).toContain('Goal: Finish reading section 2');
    t2.dom.window.close();
  });
});

describe('Wave 4C — Combined Daily Toolkit, Bilingual RTL, Station Mode & Sealed QR Parity', () => {
  it('runs all 4 adapters in Combined Daily Toolkit with Arabic RTL, Station Mode reset, and attachQrKey parity', async () => {
    const kp = Q.generateKeyPair();
    const builtPlain = S.buildSelPacket({
      loader: TH,
      starterId: 'sel_daily_toolkit_mix',
      homeLanguages: ['es', 'ar'],
      bilingualGlossary: { break: { es: 'descanso', ar: 'استراحة' } },
      stationMode: true,
      stationBilingual: SB,
    });
    const attached = TH.attachQrKey(builtPlain.html, kp.publicKey, { qrCrypto: Q, stationMode: true });
    expect(attached.ok).toBe(true);
    const builtDirect = S.buildSelPacket({
      loader: TH,
      starterId: 'sel_daily_toolkit_mix',
      homeLanguages: ['es', 'ar'],
      bilingualGlossary: { break: { es: 'descanso', ar: 'استراحة' } },
      stationMode: true,
      stationBilingual: SB,
      qrPublicKey: kp.publicKey,
      qrCrypto: Q,
    });

    await expectClosedVerified(builtPlain.html);
    await expectClosedVerified(attached.html);
    await expectClosedVerified(builtDirect.html);

    // Run through all 4 tools in sequence + verify Arabic RTL + Station Mode next-student reset
    const t = openPacket(builtDirect.html);
    t.q('[data-bilingual-lang="ar"]').click();
    expect(t.q('[data-bilingual-banner="start"]').getAttribute('dir')).toBe('rtl');

    t.d.getElementById('learner-name').value = 'StudentA';
    t.button('Start').click();

    // 1. First-Then
    expect(t.q('[data-sel="first_then"]')).toBeTruthy();
    t.q('[data-ft-step="s1"]').click();
    t.q('[data-sel-done]').click();
    t.button('Next').click();

    // 2. Focus Timer
    expect(t.q('[data-sel="focus_timer"]')).toBeTruthy();
    t.q('[data-sel-done]').click();
    t.button('Next').click();

    // 3. Calm-Down Cards
    expect(t.q('[data-sel="calm_toolkit"]')).toBeTruthy();
    t.q('[data-cm-breath-step]').click();
    t.q('[data-sel-done]').click();
    t.button('Next').click();

    // 4. UDL Reflection (keep private!)
    expect(t.q('[data-sel="udl_reflect"]')).toBeTruthy();
    t.q('[data-ur-goal]').value = 'Private student note A';
    t.q('[data-ur-support="udlTimer"]').click();
    t.q('[data-sel-done]').click();
    t.button('See my results').click();

    // Seal QR -> pushes into Station Deck without plaintext in localStorage
    t.q('[data-qr-toggle]').click();
    const qrA = t.q('[data-qr-code]').textContent.trim();
    expect(qrA.startsWith('AFQR1:')).toBe(true);
    const unsealedA = Q.unsealResult(qrA, kp.secretKey);
    expect(unsealedA.ok).toBe(true);
    expect(unsealedA.result.summary.items).toBe(0);
    expect(unsealedA.result.summary.practised).toBe(4);
    expect(JSON.stringify(unsealedA.result)).not.toContain('Private student note A');

    // Ready for next student clears session cleanly
    const nextBtn = t.q('[data-station-next]');
    expect(nextBtn).toBeTruthy();
    nextBtn.click();
    expect(t.d.getElementById('learner-name').value).toBe('');
    t.dom.window.close();
  });

  it('passes verifyPacket closed verdict across all 5 starter variants', async () => {
    for (const starter of S.STARTER_SETS) {
      const made = S.buildSelPacket({ loader: TH, starterId: starter.id });
      await expectClosedVerified(made.html);
    }
  });
});

describe('Wave 4C — Maker Page UI, Reopen Round-Trip, Batch .zip & #5 Static/CSP/A11y/Non-Clinical Invariants', () => {
  it('boots packets-sel.html, switches radio titles, updates live print preview, customizes mixed toolkit, reopens .html, and builds batch .zip', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-sel.html'), 'utf8');
    const dom = new JSDOM(html, {
      url: 'https://alloflow.local/packets-sel.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    const downloads = [];
    const blobs = new Map();
    w.URL.createObjectURL = (blob) => { const u = 'blob:maker-' + (blobs.size + 1); blobs.set(u, blob); return u; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      if (this.download && blobs.has(this.href)) downloads.push({ filename: this.download, blob: blobs.get(this.href) });
    };

    w.AlloWordSoundsTakeHome = TH;
    w.AlloPacketSel = S;
    w.AlloPacketStationBilingual = SB;
    w.AlloPacketQrCrypto = Q;
    w.AlloPacketVerify = V;
    w.AlloPacketZip = ZIP;
    w.AlloPacketHandoff = { hostPreview: () => ({ stop() {} }) };

    w.eval(fs.readFileSync(path.join(ROOT, 'packets-page.js'), 'utf8'));
    w.eval(fs.readFileSync(path.join(ROOT, 'packets-sel.js'), 'utf8'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // Radio switch refreshes default title cleanly
    const ftRadio = d.querySelector('input[name="activity"][value="sel_first_then"]');
    ftRadio.checked = true;
    ftRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-1').click();

    // Step 2: First-Then editor + live print preview
    expect(d.getElementById('ed-first-then').hidden).toBe(false);
    expect(d.getElementById('ed-mixed').hidden).toBe(true);
    const fFirst = d.getElementById('f-ft-first');
    const fThen = d.getElementById('f-ft-then');
    fFirst.value = 'Finish 3 reading paragraphs';
    fFirst.dispatchEvent(new w.Event('input', { bubbles: true }));
    fThen.value = 'Draw quietly for 4 minutes';
    fThen.dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(d.getElementById('ft-print-preview').textContent).toContain('Finish 3 reading paragraphs');
    expect(d.getElementById('ft-print-preview').textContent).toContain('Draw quietly for 4 minutes');

    // Also switch back to mixed and confirm all 4 tool panels show & toggle cleanly
    d.getElementById('back-2').click();
    const mixRadio = d.querySelector('input[name="activity"][value="mixed"]');
    mixRadio.checked = true;
    mixRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-1').click();
    expect(d.getElementById('ed-mixed').hidden).toBe(false);
    expect(d.getElementById('ed-first-then').hidden).toBe(false);
    expect(d.getElementById('ed-timer').hidden).toBe(false);
    expect(d.getElementById('ed-calm').hidden).toBe(false);
    expect(d.getElementById('ed-reflect').hidden).toBe(false);

    // Customize timer focus mins, bilingual Spanish + Arabic, and Station Mode
    const fFocus = d.getElementById('f-tm-focus');
    fFocus.value = '7';
    fFocus.dispatchEvent(new w.Event('input', { bubbles: true }));
    const esBox = d.querySelector('#bilingual-langs input[value="es"]');
    esBox.checked = true;
    esBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    const stBox = d.getElementById('f-station-mode');
    stBox.checked = true;
    stBox.dispatchEvent(new w.Event('change', { bubbles: true }));

    // Step 3: build & save
    d.getElementById('next-2').click();
    expect(d.getElementById('summary').hidden).toBe(false);
    d.getElementById('save').click();
    expect(downloads.length).toBe(1);
    const savedHtml = await downloads[0].blob.text();
    await expectClosedVerified(savedHtml);

    // Reopen round-trip via readSelPacket + withCodeName escaping + qrPublicKey preservation (#50)
    const kp = Q.generateKeyPair();
    const sealedNamed = S.buildSelPacket({
      loader: TH,
      starterId: 'sel_first_then_routine',
      qrPublicKey: kp.publicKey,
      qrCrypto: Q,
      learner: 'A&B <1>',
    });
    const reopenedSealed = S.readSelPacket(sealedNamed.html, V);
    expect(reopenedSealed.ok).toBe(true);
    expect(reopenedSealed.qrPublicKey).toBe(kp.publicKey);
    expect(reopenedSealed.learner).toBe('A&B <1>');

    const reopened = S.readSelPacket(savedHtml, V);
    expect(reopened.ok).toBe(true);
    expect(reopened.activity).toBe('mixed');
    expect(reopened.blocks.length).toBe(4);
    expect(reopened.blocks[0].items[0].firstLabel).toBe('Finish 3 reading paragraphs');
    expect(reopened.blocks[1].items[0].focusMinutes).toBe(7);
    expect(reopened.homeLanguages).toEqual(['es']);
    expect(reopened.stationMode).toBe(true);
    expect(reopened.qrPublicKey).toBe('');
    expect(reopened.learner).toBe('');

    // Maker UI Reopen via FileReader clears stale qrPublicKey & learner when loading an unsealed/unnamed file (#50)
    const triggerReopen = (fileHtml) => new Promise((resolve) => {
      const OrigFR = w.FileReader;
      w.FileReader = class {
        readAsArrayBuffer() {
          this.result = new TextEncoder().encode(fileHtml).buffer;
          if (this.onload) this.onload();
          resolve();
        }
      };
      const inp = d.getElementById('reopen-file');
      Object.defineProperty(inp, 'files', { value: [{ size: fileHtml.length }], configurable: true });
      inp.dispatchEvent(new w.Event('change'));
      w.FileReader = OrigFR;
    });
    await triggerReopen(sealedNamed.html);
    expect(d.getElementById('f-qr-key').value).toBe(kp.publicKey);
    expect(d.getElementById('f-batch-names').value).toBe('A&B <1>');
    await triggerReopen(savedHtml);
    expect(d.getElementById('f-qr-key').value).toBe('');
    expect(d.getElementById('f-batch-names').value).toBe('');

    // Batch 1 -> 2+ code names rebuilds built.html so Student 1 is NOT left baked in (#50)
    d.getElementById('next-2').click();
    const batchArea = d.getElementById('f-batch-names');
    batchArea.value = 'SoloOne';
    batchArea.dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('save').click();
    const singleHtml = await downloads[downloads.length - 1].blob.text();
    expect(S.readSelPacket(singleHtml, V).learner).toBe('SoloOne');

    batchArea.value = 'River\nSky\nSage';
    batchArea.dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('save').click();
    const afterMultiHtml = await downloads[downloads.length - 1].blob.text();
    expect(S.readSelPacket(afterMultiHtml, V).learner).toBe('');
    expect(d.getElementById('batch-make').hidden).toBe(false);
    d.getElementById('batch-make').click();
    expect(downloads.some((dl) => dl.filename.endsWith('__3-students.zip'))).toBe(true);
    w.close();
  });

  it('enforces all #5 static, CSP, a11y, US English, non-clinical, High Contrast, print, and siteBuild.plan() invariants', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-sel.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'packets-sel.css'), 'utf8');
    const pageJs = fs.readFileSync(path.join(ROOT, 'packets-sel.js'), 'utf8');
    const builderJs = fs.readFileSync(path.join(ROOT, 'packet_sel_builder.js'), 'utf8');

    // Strict CSP & zero unsafe sinks
    expect(html).toContain("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'");
    for (const [name, src] of [['html', html], ['css', css], ['pageJs', pageJs], ['builderJs', builderJs]]) {
      expect(src, `${name} British spelling`).not.toMatch(BRITISH);
      expect(src, `${name} diagnostic acronyms`).not.toMatch(DIAGNOSTIC_ACRONYMS);
      expect(src, `${name} network URL`).not.toMatch(/https?:\/\//i);
      expect(src, `${name} sel_hub path`).not.toMatch(/sel_hub\//i);
    }
    for (const src of [pageJs, builderJs]) {
      expect(src).not.toMatch(/\b(innerHTML|outerHTML|document\.write|eval\s*\(|new\s+Function)\b/);
    }

    // HTML static DOM & accessibility audit
    const dom = new JSDOM(html);
    const d = dom.window.document;
    expect(d.querySelectorAll('style, form').length).toBe(0);
    expect([...d.querySelectorAll('script')].every((s) => s.hasAttribute('src') && !s.textContent.trim())).toBe(true);
    expect(d.querySelectorAll('[style]').length).toBe(0);
    expect(d.querySelectorAll('h1').length).toBe(1);
    expect(d.getElementById('product-name').textContent.trim()).toBe('AlloFlow Packets');
    expect((d.body.textContent.match(/AlloFlow Packets/g) || []).length).toBe(1);

    // Proof fold & accurate asset count (14 files: html + icon + 3 css + 9 js)
    const proof = d.querySelector('details.proof');
    expect(proof.hasAttribute('open')).toBe(false);
    expect(proof.querySelector('summary').textContent.trim()).toMatch(/^This page runs without AI\. No account\. Nothing you choose leaves your device\./);
    const assetCount = 1 + d.querySelectorAll('link[rel="icon"], link[rel="stylesheet"], script[src]').length;
    expect(assetCount).toBe(14);
    expect(d.getElementById('file-count').textContent.trim()).toBe('fourteen');

    // Footer & Look inside a file naming
    expect(d.querySelector('footer a[href="packets-feedback.html#from-packets-sel"]')).toBeTruthy();
    expect(d.querySelector('footer a[href="./"]')).toBeTruthy();
    const verifyLinks = [...d.querySelectorAll('a[href="packets-verify.html"]')];
    expect(verifyLinks.length).toBeGreaterThanOrEqual(1);
    verifyLinks.forEach((a) => expect(a.textContent.trim()).toBe('Look inside a file'));

    // Calm teacher copy (no !, no promise words)
    expect(d.body.textContent).not.toContain('!');
    expect(d.body.textContent).not.toMatch(/\b(secure|guarantee\w*|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i);

    // Unique IDs, button type="button", no skipped heading levels, labeled controls, valid aria-describedby
    const ids = new Set();
    d.querySelectorAll('[id]').forEach((el) => {
      expect(ids.has(el.id), `duplicate id ${el.id}`).toBe(false);
      ids.add(el.id);
    });
    d.querySelectorAll('button').forEach((b) => expect(b.getAttribute('type')).toBe('button'));
    let prevH = 0;
    d.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      const lvl = Number(h.tagName.slice(1));
      if (prevH) expect(lvl <= prevH + 1, `heading skip ${prevH}->${lvl}`).toBe(true);
      prevH = lvl;
    });
    d.querySelectorAll('input,textarea,select').forEach((ctrl) => {
      const hasLabel = (ctrl.id && d.querySelector(`label[for="${ctrl.id}"]`)) || ctrl.closest('label') || ctrl.getAttribute('aria-label');
      expect(Boolean(hasLabel), `unlabeled control ${ctrl.id || ctrl.name}`).toBe(true);
    });
    d.querySelectorAll('[aria-describedby]').forEach((el) => {
      el.getAttribute('aria-describedby').trim().split(/\s+/).forEach((ref) => {
        expect(d.getElementById(ref), `missing aria-describedby target ${ref}`).toBeTruthy();
      });
    });

    // High Contrast, reduced motion, and printable First-Then strip CSS present in both maker and embedded packet CSS
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');
    expect(S.EXTRA_CSS).toContain('prefers-reduced-motion:reduce');
    expect(S.EXTRA_CSS).toContain('forced-colors:active');
    expect(S.EXTRA_CSS).toContain('.ft-step-btn[aria-pressed=true] .ft-check{background:var(--ok);border-color:var(--ok);color:var(--card)}');
    expect(S.EXTRA_CSS).not.toContain('#ffffff');
    expect(S.EXTRA_CSS).toContain('.cm-state-btn[aria-pressed=true]');
    expect(S.EXTRA_CSS).toContain('.ft-step-btn[aria-pressed=true] .ft-check');
    expect(S.EXTRA_CSS).toContain('@media print');

    // Site build plan stays clean
    const plan = SITE.plan();
    expect(plan.pages.some((p) => p.endsWith('packets-sel.html'))).toBe(true);
    dom.window.close();
  });
});
