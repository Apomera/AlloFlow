import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const loader = globalThis.AlloWordSoundsTakeHome;
const maze = require(path.join(ROOT, 'packet_maze_builder.js'));
const verifyCore = require(path.join(ROOT, 'packets_verify_core.js'));
const stationBilingual = require(path.join(ROOT, 'packets_station_bilingual.js'));
const qrCrypto = require(path.join(ROOT, 'packets_qr_crypto.js'));
const siteBuild = require(path.join(ROOT, 'dev-tools', 'build_packets_site.cjs'));

function readRoot(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

function loadWordlist() {
  const ctx = { window: {} };
  vm.runInNewContext(readRoot('word_sounds_wordlist_en.js'), ctx, { filename: 'word_sounds_wordlist_en.js' });
  return ctx.createWordSoundsWordlist();
}

function bootPacket(html) {
  const saved = [];
  const dom = new JSDOM(html, {
    url: 'https://packets.local/maze-student.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(win) {
      let nextUrl = 1;
      const blobs = new Map();
      win.URL.createObjectURL = (blob) => {
        const u = 'blob:maze-' + (nextUrl++);
        blobs.set(u, blob);
        return u;
      };
      win.URL.revokeObjectURL = () => {};
      const origClick = win.HTMLAnchorElement.prototype.click;
      win.HTMLAnchorElement.prototype.click = function () {
        const dl = this.getAttribute('download');
        const href = this.getAttribute('href');
        if (dl && href && blobs.has(href)) {
          saved.push({ name: dl, blob: blobs.get(href) });
          return;
        }
        return origClick.apply(this, arguments);
      };
    },
  });
  const doc = dom.window.document;
  return {
    dom,
    win: dom.window,
    doc,
    saved,
    async readSaved(ext) {
      const hit = saved.filter((s) => s.name.endsWith(ext)).pop();
      if (!hit) return null;
      return { name: hit.name, text: await hit.blob.text() };
    },
    start(learner = 'Heron9') {
      const inp = doc.getElementById('learner-name');
      if (inp) inp.value = learner;
      const btn = doc.querySelector('button.primary');
      if (!btn) throw new Error('Start button not found');
      btn.click();
    },
  };
}

function makeClock(win, startShift = 500) {
  const origNow = win.Date.now.bind(win.Date);
  const origPerf = win.performance.now.bind(win.performance);
  let shift = startShift;
  win.Date.now = () => origNow() + shift;
  win.performance.now = () => origPerf() + shift;
  return {
    bump(ms = 500) { shift += ms; },
  };
}

describe('Wave 11 CBM-Maze static invariants, CSP, a11y, US spelling, and site build drift', () => {
  const html = readRoot('packets-maze.html');
  const css = readRoot('packets-maze.css');
  const jsFiles = ['packet_maze_builder.js', 'packets-maze.js'];

  it('enforces strict CSP, landmarks, proof fold, footer feedback link, and Look inside wording on packets-maze.html', () => {
    expect(html).toMatch(/^<!doctype html>\s*<html lang="en">/i);
    const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    expect(cspMatch).toBeTruthy();
    const csp = cspMatch[1];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("base-uri 'none'");
    const beforeCsp = html.slice(0, cspMatch.index).replace(/^[\s\S]*?<head>/i, '');
    expect(beforeCsp).not.toMatch(/<(?!meta\b)[a-z]/i);

    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<form\b/i);
    expect(html).not.toMatch(/type="email"/i);

    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="packets-mark.svg">');
    expect(html).toContain('<a class="skip" href="#main">');
    expect(html).toContain('<main id="main" tabindex="-1"');
    expect((html.match(/AlloFlow Packets/g) || []).length).toBe(1);
    expect(html).toContain('<span id="product-name">AlloFlow Packets</span>');
    expect(html).toMatch(/<details class="proof">/);
    expect(html).not.toMatch(/<details class="proof"[^>]*\bopen\b/);
    expect(html).toContain('This page runs without AI. No account. Nothing you choose leaves your device.');

    const fbIdx = html.indexOf('<a href="packets-feedback.html#from-packets-maze">Send feedback</a>');
    const moreIdx = html.indexOf('<a href="./">More from AlloFlow</a>');
    expect(fbIdx).toBeGreaterThan(0);
    expect(moreIdx).toBeGreaterThan(fbIdx);

    expect(html).toContain('<a href="packets-verify.html">Look inside a file</a>');
    expect(html).not.toMatch(/Check a file/i);

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    expect(doc.querySelectorAll('h1').length).toBe(1);
    const levels = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) => Number(h.tagName.slice(1)));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
    const ids = Array.from(doc.querySelectorAll('[id]')).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const btn of doc.querySelectorAll('button')) {
      expect(btn.getAttribute('type')).toBe('button');
    }
    for (const el of doc.querySelectorAll('[aria-describedby]')) {
      for (const ref of el.getAttribute('aria-describedby').trim().split(/\s+/)) {
        expect(doc.getElementById(ref)).toBeTruthy();
      }
    }
    for (const ctrl of doc.querySelectorAll('input,select,textarea')) {
      const hasLabel = (ctrl.id && doc.querySelector(`label[for="${ctrl.id}"]`)) || ctrl.closest('label') || ctrl.getAttribute('aria-label');
      expect(Boolean(hasLabel)).toBe(true);
    }
  });

  it('enforces CSS invariants on packets-maze.css', () => {
    expect(css).not.toMatch(/:root\b/);
    expect(css).not.toMatch(/--[a-z0-9-]+\s*:/i);
    const prePrint = css.split('@media print')[0];
    expect(prePrint).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/@import|url\s*\(|@font-face|@keyframes|\banimation\b/i);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');
    expect(css).not.toContain('AlloFlow Packets');
  });

  it('enforces zero markup sinks, zero third-party URLs, zero promise/British words, and zero site-build drift', () => {
    const british = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    const promise = /\b(safe|secure|guarantee|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i;
    const sinks = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/;
    const urls = /https?:\/\//i;

    expect(html).not.toMatch(british);
    expect(html).not.toMatch(promise);
    expect(html).not.toMatch(urls);
    expect(css).not.toMatch(british);
    expect(css).not.toMatch(urls);

    for (const name of jsFiles) {
      const src = readRoot(name);
      expect(src, `${name} sinks`).not.toMatch(sinks);
      expect(src, `${name} urls`).not.toMatch(urls);
      expect(src, `${name} product name`).not.toContain('AlloFlow Packets');
      expect(src, `${name} british`).not.toMatch(british);
      expect(src, `${name} promise`).not.toMatch(promise);
    }

    const plan = siteBuild.plan();
    for (const f of [
      'packets-maze.html',
      'packets-maze.css',
      'packets-maze.js',
      'packet_maze_builder.js',
      'word_sounds_wordlist_en.js',
      'packets_station_bilingual.js',
    ]) {
      expect(plan.files.has(f), `plan includes ${f}`).toBe(true);
    }
  });
});

describe('Wave 11 deterministic CBM-Maze generator', () => {
  it('generates identical items deterministically, keeps sentence 1 intact, skips proper nouns/numbers/short words, and honors overrides', () => {
    const wl = loadWordlist();
    const customPassage = [
      'The first sentence stays completely intact from beginning to end.',
      'In 2026, scientist Elena Rivera traveled to Chicago with 42 brass compasses to measure wind speeds across wide green valleys during brisk autumn mornings.',
      'Her careful measurements helped nearby farmers schedule harvest wagons before frost settled across open fields at dawn.',
    ].join(' ');

    const run1 = maze.generateMaze(customPassage, { everyN: 7, wordlist: wl });
    const run2 = maze.generateMaze(customPassage, { everyN: 7, wordlist: wl });
    expect(run1.items).toEqual(run2.items);
    expect(run1.items.length).toBeGreaterThanOrEqual(4);

    // Sentence 1 is intact at the start of item 0's `before`
    expect(run1.items[0].before.startsWith('The first sentence stays completely intact from beginning to end.')).toBe(true);

    // None of the selected answers are proper nouns, numbers, or < 3 chars
    for (const it of run1.items) {
      expect(it.answer.length).toBeGreaterThanOrEqual(3);
      expect(it.answer).not.toMatch(/\d/);
      expect(['Elena', 'Rivera', 'Chicago']).not.toContain(it.answer);
      expect(it.choices.length).toBe(3);
      expect(new Set(it.choices.map((c) => c.toLowerCase())).size).toBe(3);
      expect(it.choices).toContain(it.answer);
    }

    // Configurable spacing: everyN=5 yields more items than everyN=10 on graded passage
    const starter = maze.passageById('g6_8_tidal_clocks');
    const dense = maze.generateMaze(starter.passage, { everyN: 5 });
    const sparse = maze.generateMaze(starter.passage, { everyN: 10 });
    expect(dense.items.length).toBeGreaterThan(sparse.items.length);

    // Manual override replaces choices on blank 0 cleanly
    const overridden = maze.generateMaze(customPassage, {
      everyN: 7,
      overrides: { 0: { choices: ['lantern', run1.items[0].answer, 'pebble'], answer: run1.items[0].answer } },
    });
    expect(overridden.items[0].choices).toEqual(['lantern', run1.items[0].answer, 'pebble']);

    // Net score floor at 0
    expect(maze.computeMazeNetScore(12, 3)).toBe(9);
    expect(maze.computeMazeNetScore(2, 7)).toBe(0);
  });
});

describe('Wave 11 verifyPacket (closed, look=0, notExpected=0) across Maze variants', () => {
  it('passes verifyPacket cleanly for Practice, Timed Check, Untimed Check, Bilingual RTL, Station Mode, Sealed QR, and attachQrKey', () => {
    const keys = qrCrypto.generateKeyPair('Maze Teacher');
    const p1 = maze.passageById('g2_3_pond_helpers');
    const p2 = maze.passageById('g9_12_urban_canopy');
    const variants = [
      { label: 'Maze practice', opts: { title: p1.title, passage: p1.passage, mode: 'practice' } },
      { label: 'Maze 3-minute Check + teacher code', opts: { title: p1.title, passage: p1.passage, mode: 'probe', form: 'Form A', timeLimitS: 180, teacherCode: '2468' } },
      { label: 'Maze Untimed Check', opts: { title: p2.title, passage: p2.passage, mode: 'probe', untimed: true } },
      {
        label: 'Maze Check + Bilingual RTL + Station + Sealed QR',
        opts: {
          title: p2.title,
          passage: p2.passage,
          mode: 'probe',
          homeLanguages: ['es', 'ar'],
          bilingualGlossary: { canopy: { es: 'dosel', ar: 'مظلة شجرية' } },
          stationMode: true,
          qrPublicKey: keys.publicKey,
        },
      },
    ];

    for (const v of variants) {
      const built = maze.buildMazePacket({ ...v.opts, loader, stationBilingual, qrCrypto });
      const report = verifyCore.verifyPacket(built.html);
      expect(report.result, `${v.label} result`).toBe('closed');
      expect(report.counts.look, `${v.label} look`).toBe(0);
      expect(report.counts.notExpected, `${v.label} notExpected`).toBe(0);
    }

    // Verify attachQrKey parity on a Practice Maze packet
    const basePractice = maze.buildMazePacket({ title: p1.title, passage: p1.passage, mode: 'practice', loader });
    const attached = loader.attachQrKey(basePractice.html, keys.publicKey, { qrCrypto });
    expect(attached.ok).toBe(true);
    const attachedRep = verifyCore.verifyPacket(attached.html);
    expect(attachedRep.result).toBe('closed');
    expect(attachedRep.counts.look).toBe(0);
    expect(attachedRep.counts.notExpected).toBe(0);
  });
});

describe('Wave 11 student JSDOM runs: Timed Check, Untimed Check, Practice, CSV/JSON/Sealed QR', () => {
  const shortPassage = [
    'Morning dew sparkles on the meadow grass before sunrise.',
    'Small rabbits hop quietly across the damp clover while birds sing from wooden fence posts.',
    'Soon warm sunlight dries the soft leaves and bright butterflies drift between tall yellow flowers near the garden gate.',
  ].join(' ');

  it('Timed 3-minute Check: completes 2-item warm-up, runs timed probe with keyboard shortcut, scores net CBM-Maze across JSON, CSV, and Sealed QR', async () => {
    const keys = qrCrypto.generateKeyPair('CBM Teacher');
    const gen = maze.generateMaze(shortPassage, { everyN: 6 });
    expect(gen.items.length).toBeGreaterThanOrEqual(4);

    const built = maze.buildMazePacket({
      title: 'Meadow Maze Probe',
      passage: shortPassage,
      generated: gen,
      mode: 'probe',
      timeLimitS: 180,
      includeWarmup: true,
      qrPublicKey: keys.publicKey,
      loader,
      qrCrypto,
    });
    expect(built.warmupCount).toBe(2);

    const app = bootPacket(built.html);
    const clock = makeClock(app.win, 600);
    app.start('Wren14');

    // Warm-up 1 & 2 (practice items before the clock!)
    expect(app.doc.querySelector('[data-time-left]')).toBeNull();
    app.doc.querySelector('[data-mz-word="room"]').click();
    app.doc.querySelector('[data-practice-next]').click();
    clock.bump(600);
    app.doc.querySelector('[data-mz-word="buy"]').click();
    app.doc.querySelector('[data-practice-next]').click();

    // Ready screen -> Begin 3-minute countdown
    const beginBtn = app.doc.querySelector('[data-check-begin]');
    expect(beginBtn).toBeTruthy();
    beginBtn.click();
    expect(app.doc.querySelector('[data-time-left]')).toBeTruthy();

    // Verify Check-mode sealing: scored items carry scrambled key, never plain-text answer in word/contextLead
    const parts = verifyCore.readParts(built.html);
    const sealedScored = parts.lesson.blocks[0].items.filter((it) => !it.practice);
    for (const sit of sealedScored) {
      expect(sit.answer).toBeUndefined();
      expect(sit.key).toBeTruthy();
      expect(sit.word).toMatch(/^Blank \d+$/);
      expect(sit.contextLead).toBe('');
    }

    // Verify ArrowRight/ArrowLeft keyboard traversal across the 3 inline choice buttons
    const c0 = app.doc.querySelector('[data-mz-choice="0"]');
    c0.focus();
    c0.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(app.doc.activeElement.getAttribute('data-mz-choice')).toBe('1');
    app.doc.activeElement.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(app.doc.activeElement.getAttribute('data-mz-choice')).toBe('0');

    // Answer scored items: miss item 0 intentionally (first test rapid-tap <250ms guard so trail does NOT duplicate!),
    // verify Blank 2 renders .mz-lead with Blank 1 context + chosen word (without duplicating), then answer rest right!
    for (let i = 0; i < gen.items.length; i++) {
      const target = gen.items[i];
      if (i === 0) {
        const wrong = target.choices.find((c) => c !== target.answer);
        // Rapid tap within <250ms of Blank 1 appearing -> ignored by takeHomeCheck, must NOT corrupt trail!
        app.doc.querySelector(`[data-mz-word="${wrong}"]`).click();
        clock.bump(600);
        app.doc.querySelector(`[data-mz-word="${wrong}"]`).click();
        // Now on Blank 2: verify .mz-lead shows Blank 1 passage trail containing chosen word ONCE!
        const leadEl = app.doc.querySelector('.mz-lead');
        expect(leadEl).toBeTruthy();
        expect(leadEl.textContent).toContain(wrong);
        const firstWord = 'Morning dew';
        expect(leadEl.textContent.split(firstWord).length - 1).toBe(1);
      } else if (i === 1) {
        clock.bump(600);
        const rightIdx = target.choices.indexOf(target.answer);
        app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: String(rightIdx + 1), bubbles: true }));
      } else {
        clock.bump(600);
        app.doc.querySelector(`[data-mz-word="${target.answer}"]`).click();
      }
    }

    const wantCorrect = gen.items.length - 1;
    const wantIncorrect = 1;
    const wantNet = Math.max(0, wantCorrect - wantIncorrect);

    // 1. JSON check
    app.doc.querySelector('[data-save-json]').click();
    const jsonFile = await app.readSaved('.json');
    const parsed = loader.parseResult(jsonFile.text);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.mode).toBe('probe');
    expect(parsed.result.score.measure).toBe('maze_correct_3m');
    expect(parsed.result.score.scoreUnit).toBe('items_correct');
    expect(parsed.result.score.timeLimitS).toBe(180);
    expect(parsed.result.score.itemsCorrect).toBe(wantCorrect);
    expect(parsed.result.score.itemsAttempted).toBe(gen.items.length);

    const netFromJson = maze.scoreMazeResult(parsed.result);
    expect(netFromJson.correct).toBe(wantCorrect);
    expect(netFromJson.incorrect).toBe(wantIncorrect);
    expect(netFromJson.netScore).toBe(wantNet);

    // 2. CSV check
    app.doc.querySelector('[data-save-csv]').click();
    const csvFile = await app.readSaved('.csv');
    expect(csvFile.text).toContain('maze_correct_3m');
    expect(csvFile.text).toContain('items_correct');

    // 3. Sealed QR round-trip check
    app.doc.querySelector('[data-qr-toggle]').click();
    const qrCode = app.doc.querySelector('[data-qr-code]').textContent.trim();
    expect(qrCode.startsWith('AFQR1:')).toBe(true);
    const unsealed = qrCrypto.unsealResult(qrCode, keys.secretKey);
    expect(unsealed.ok).toBe(true);
    const netFromQr = maze.scoreMazeResult(unsealed.result);
    expect(netFromQr.correct).toBe(wantCorrect);
    expect(netFromQr.incorrect).toBe(wantIncorrect);
    expect(netFromQr.netScore).toBe(wantNet);
  });

  it('Untimed Check accommodation: omits timer and records untimed + usualTimeLimitS=180 in results', async () => {
    const gen = maze.generateMaze(shortPassage, { everyN: 7 });
    const built = maze.buildMazePacket({
      title: 'Meadow Untimed Maze',
      passage: shortPassage,
      generated: gen,
      mode: 'probe',
      untimed: true,
      includeWarmup: false,
      loader,
    });
    const app = bootPacket(built.html);
    const clock = makeClock(app.win, 600);
    app.start('Finch3');
    app.doc.querySelector('[data-check-begin]').click();
    expect(app.doc.querySelector('[data-time-left]')).toBeNull();

    for (const target of gen.items) {
      clock.bump(600);
      app.doc.querySelector(`[data-mz-word="${target.answer}"]`).click();
    }
    app.doc.querySelector('[data-save-json]').click();
    const parsed = loader.parseResult((await app.readSaved('.json')).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.score.untimed).toBe(true);
    expect(parsed.result.score.timeLimitS).toBeNull();
    expect(parsed.result.score.usualTimeLimitS).toBe(180);
    expect(parsed.result.score.itemsCorrect).toBe(gen.items.length);
  });

  it('Practice mode: gives immediate retry feedback, keeps focus on untried choice, and records afterRetry', async () => {
    const gen = maze.generateMaze(shortPassage, { everyN: 7 });
    const built = maze.buildMazePacket({
      title: 'Meadow Maze Practice',
      passage: shortPassage,
      generated: gen,
      mode: 'practice',
      loader,
    });
    const app = bootPacket(built.html);
    app.start('Robin5');

    for (let i = 0; i < gen.items.length; i++) {
      const target = gen.items[i];
      if (i === 0) {
        const wrong = target.choices.find((c) => c !== target.answer);
        app.doc.querySelector(`[data-mz-word="${wrong}"]`).click();
        expect(app.doc.activeElement).not.toBe(app.doc.body);
        expect(app.doc.activeElement.getAttribute('data-mz-word')).not.toBe(wrong);
      }
      app.doc.querySelector(`[data-mz-word="${target.answer}"]`).click();
      app.doc.querySelector('[data-next]').click();
    }
    app.doc.querySelector('[data-save-json]').click();
    const parsed = loader.parseResult((await app.readSaved('.json')).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.summary.afterRetry).toBe(1);
    expect(parsed.result.summary.firstTry).toBe(gen.items.length - 1);
  });
});

describe('Wave 11 educator maker page (packets-maze.html) & reopen round-trip', () => {
  it('loads packets-maze.html, selects a passage, edits a blank choice inline, builds a verified packet, and reopens Practice & Check files', () => {
    const html = readRoot('packets-maze.html');
    const dom = new JSDOM(html, { url: 'https://packets.local/packets-maze.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const win = dom.window;
    const doc = win.document;

    let blobCounter = 0;
    const builtBlobs = [];
    win.URL.createObjectURL = (b) => { builtBlobs.push(b); return 'blob:maze-maker-' + (++blobCounter); };
    win.URL.revokeObjectURL = () => {};

    const scripts = [
      'packets-page.js',
      'word_sounds_wordlist_en.js',
      'word_sounds_take_home_loader.js',
      'packet_maze_builder.js',
      'packets_station_bilingual.js',
      'packets_qr_crypto.js',
      'packets_verify_core.js',
      'packets_handoff.js',
      'packets_zip.js',
      'packets-maze.js',
    ];
    for (const s of scripts) {
      vm.runInContext(readRoot(s), dom.getInternalVMContext(), { filename: s });
    }
    doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true }));

    // Verify teacher code input is type="password" for classroom projector privacy
    expect(doc.getElementById('f-teacher-code').getAttribute('type')).toBe('password');

    // Step 1: pick Monarch Butterfly starter passage (Grades 4-5)
    const monarchBtn = doc.querySelector('[data-passage-id="g4_5_monarch_journey"]');
    expect(monarchBtn).toBeTruthy();
    monarchBtn.click();
    doc.getElementById('next-1').click();

    // Step 2: verify live preview pills + Step 2 validation blocks duplicate choices on Next!
    const pill0 = doc.querySelector('[data-preview-blank="0"]');
    expect(pill0).toBeTruthy();
    const d0Input = doc.getElementById('mz-edit-0-0');
    const d1Input = doc.getElementById('mz-edit-0-1');
    expect(d1Input).toBeTruthy();
    d1Input.value = d0Input.value;
    d1Input.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('step-2-problem').textContent).toContain('3 distinct words');
    doc.getElementById('next-2').click();
    expect(doc.getElementById('step-2').hidden).toBe(false);
    expect(doc.getElementById('step-3').hidden).toBe(true);

    // Fix duplicate distractor with a valid distinct word -> Next succeeds!
    d1Input.value = 'lantern';
    d1Input.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('step-2-problem').textContent).toBe('');
    expect(pill0.textContent).toContain('lantern');

    const esCb = doc.querySelector('input[data-lang-code="es"]');
    expect(esCb).toBeTruthy();
    esCb.checked = true;
    esCb.dispatchEvent(new win.Event('change', { bubbles: true }));

    // Step 3: build packet + check Try it link & batch .zip UI
    doc.getElementById('next-2').click();
    expect(doc.getElementById('summary').hidden).toBe(false);
    expect(doc.getElementById('save').hidden).toBe(false);
    expect(doc.getElementById('try').getAttribute('href')).toMatch(/^packets-try\.html#blob:maze-maker-/);
    expect(builtBlobs.length).toBeGreaterThan(0);

    const batchTa = doc.getElementById('f-batch-names');
    batchTa.value = 'Oak1\nBirch2';
    batchTa.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('batch-make').hidden).toBe(false);

    // Reopen round-trip for Practice mode (preserves full passage + custom override)
    const p = maze.passageById('g4_5_monarch_journey');
    const practiceBuilt = maze.buildMazePacket({
      title: 'Monarch Practice',
      passage: p.passage,
      mode: 'practice',
      everyN: 6,
      homeLanguages: ['es'],
      learner: 'Oak1',
      loader,
      stationBilingual,
    });
    const reopenedPractice = maze.readMazePacket(practiceBuilt.html, verifyCore);
    expect(reopenedPractice.ok).toBe(true);
    expect(reopenedPractice.title).toBe('Monarch Practice');
    expect(reopenedPractice.mode).toBe('practice');
    expect(reopenedPractice.everyN).toBe(6);
    expect(reopenedPractice.passage).toBe(p.passage);
    expect(reopenedPractice.homeLanguages).toEqual(['es']);
    expect(reopenedPractice.learner).toBe('Oak1');

    // Reopen round-trip for Check mode (hides plain-text answers cleanly, keeps metadata)
    const checkBuilt = maze.buildMazePacket({
      title: 'Monarch Check A',
      passage: p.passage,
      mode: 'probe',
      form: 'Form B',
      untimed: true,
      loader,
    });
    const reopenedCheck = maze.readMazePacket(checkBuilt.html, verifyCore);
    expect(reopenedCheck.ok).toBe(true);
    expect(reopenedCheck.mode).toBe('probe');
    expect(reopenedCheck.form).toBe('Form B');
    expect(reopenedCheck.untimed).toBe(true);
    expect(reopenedCheck.notes.length).toBeGreaterThan(0);
  });
});
