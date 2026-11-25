import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const loader = globalThis.AlloWordSoundsTakeHome;
const choiceAdapters = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const choiceBuilder = require(path.join(ROOT, 'packet_choice_builder.js'));
const compiler = require(path.join(ROOT, 'packets_main_app_compiler.js'));
const verifyCore = require(path.join(ROOT, 'packets_verify_core.js'));
const stationBilingual = require(path.join(ROOT, 'packets_station_bilingual.js'));
const qrCrypto = require(path.join(ROOT, 'packets_qr_crypto.js'));
const siteBuild = require(path.join(ROOT, 'dev-tools', 'build_packets_site.cjs'));

function readRoot(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

const SAMPLE_PNG_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function bootPacket(html) {
  const saved = [];
  const dom = new JSDOM(html, {
    url: 'https://packets.local/compiled-student.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(win) {
      let nextUrl = 1;
      const blobs = new Map();
      win.URL.createObjectURL = (blob) => {
        const u = 'blob:cmp-' + (nextUrl++);
        blobs.set(u, blob);
        return u;
      };
      win.URL.revokeObjectURL = () => {};
      win.Audio = class { play() { return Promise.resolve(); } pause() {} };
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
    start(learner = 'Cedar4') {
      const inp = doc.getElementById('learner-name');
      if (inp) inp.value = learner;
      const btn = doc.querySelector('button.primary');
      if (!btn) throw new Error('Start button not found');
      btn.click();
    },
  };
}

function makeClock(win, startShift = 600) {
  const origNow = win.Date.now.bind(win.Date);
  const origPerf = win.performance.now.bind(win.performance);
  let shift = startShift;
  win.Date.now = () => origNow() + shift;
  win.performance.now = () => origPerf() + shift;
  return { bump(ms = 600) { shift += ms; } };
}

describe('Wave 14 Activity Compiler static invariants, CSP, a11y, US spelling, and site build drift', () => {
  const html = readRoot('packets-compile.html');
  const css = readRoot('packets-compile.css');
  const jsFiles = ['packets_main_app_compiler.js', 'packets-compile.js'];

  it('enforces strict CSP, landmarks, exact file count & MB estimate, footer feedback link, password teacher code, and Look inside wording on packets-compile.html', () => {
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

    // Exact file count (16) and MB estimate
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
    const loadedFiles = ['packets-compile.html', ...refs];
    expect(loadedFiles.length).toBe(16);
    expect(html).toContain('<span id="file-count">sixteen</span>');
    const totalBytes = loadedFiles.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
    const actualMb = totalBytes / (1024 * 1024);
    const mbMatch = html.match(/about\s+([0-9.]+)\s+MB/i);
    expect(mbMatch).toBeTruthy();
    expect(Math.abs(Number(mbMatch[1]) - actualMb)).toBeLessThan(0.15);

    const fbIdx = html.indexOf('<a href="packets-feedback.html#from-packets-compile">Send feedback</a>');
    const moreIdx = html.indexOf('<a href="./">More from AlloFlow</a>');
    expect(fbIdx).toBeGreaterThan(0);
    expect(moreIdx).toBeGreaterThan(fbIdx);

    expect(html).toContain('<a href="packets-verify.html">Look inside a file</a>');
    expect(html).not.toMatch(/Check a file/i);

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    expect(doc.querySelectorAll('h1').length).toBe(1);
    expect(doc.getElementById('f-teacher-code').getAttribute('type')).toBe('password');
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

  it('keeps CSS token-driven without hex before @media print, keeps JS/HTML free of innerHTML/URLs/promise words/UK spelling, and passes siteBuild.plan() with zero drift', () => {
    expect(css).not.toMatch(/:root\b/);
    expect(css).not.toMatch(/--[a-z0-9-]+\s*:/i);
    expect(css).not.toMatch(/@import\b|url\s*\(|@font-face\b|@keyframes\b|\banimation\b/i);
    const beforePrint = css.split(/@media\s+print/i)[0];
    expect(beforePrint).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');

    const british = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    const promise = /\b(safe|secure|guarantee|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i;

    for (const f of jsFiles) {
      const src = readRoot(f);
      expect(src, f).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/);
      expect(src, f).not.toMatch(/https?:\/\//i);
      expect(src, f).not.toMatch(/AlloFlow Packets/);
      expect(src, f).not.toMatch(/\bAI\b/);
      expect(src, f).not.toMatch(british);
      expect(src, f).not.toMatch(promise);
    }
    const visibleText = new JSDOM(html).window.document.body.textContent;
    expect(visibleText).not.toMatch(british);
    expect(visibleText).not.toMatch(promise);
    expect(visibleText).not.toContain('!');

    const plan = siteBuild.plan();
    for (const f of ['packets-compile.html', 'packets-compile.css', 'packets-compile.js', 'packets_main_app_compiler.js', 'packet_choice_builder.js', 'packet_sort_write_adapters.js']) {
      expect(plan.files.has(f), `plan includes ${f}`).toBe(true);
    }
  });
});

describe('Wave 14 Hostile Input Sanitizer & verifyPacket Parity Across All 7 Activity Kinds', () => {
  it('strips external URLs, prompt/API key metadata, emails, XSS tags, active SVGs, and __proto__ pollution while keeping safe raster data URIs', () => {
    const hostileJson = `{
      "__proto__": { "polluted": true },
      "kind": "quiz",
      "title": "Clean <script>alert(1)</script> Science Quiz",
      "systemPrompt": "Secret system prompt",
      "apiKey": "sk-secret-key-9999",
      "model": "cloud-llm",
      "teacherEmail": "admin@district.edu",
      "questions": [
        {
          "id": "hq1",
          "question": "Visit https://evil.example/track?x=1 and //cdn.evil.org/p.js or javascript:alert(2) <img src=x onerror=alert(3)> What is H2O?",
          "options": ["Water", "Salt"],
          "correctIndex": 0,
          "image": "https://evil.example/img.png",
          "imageAlt": "Glass of clear water",
          "explanation": "Contact help@district.edu for info."
        },
        {
          "id": "hq2",
          "question": "Safe PNG check",
          "options": ["Yes", "No"],
          "correctIndex": 0,
          "image": "${SAMPLE_PNG_URI}",
          "imageAlt": "Tiny dot"
        },
        {
          "id": "hq3",
          "question": "SVG stripped check",
          "options": ["A", "B"],
          "correctIndex": 1,
          "image": "data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+",
          "imageAlt": "Blocked svg"
        }
      ]
    }`;

    const compiled = compiler.compileActivityPacket({
      artifact: hostileJson,
      loader,
      choiceBuilder,
      choiceAdapters,
    });

    expect(({}).polluted).toBeUndefined();
    expect(compiled.stripReport.unsafeKeysDropped).toBeGreaterThanOrEqual(1);
    expect(compiled.stripReport.promptFieldsStripped).toEqual(expect.arrayContaining(['systemPrompt', 'apiKey', 'model', 'teacherEmail']));
    expect(compiled.stripReport.urlsStripped).toBeGreaterThanOrEqual(4);
    expect(compiled.stripReport.externalImagesConverted).toBe(2); // remote PNG + active SVG both blocked/converted!
    expect(compiled.stripReport.emailsStripped).toBeGreaterThanOrEqual(1);
    expect(compiled.stripReport.htmlTagsStripped).toBeGreaterThanOrEqual(2);

    // Compiled HTML must NOT contain any leaked hostile strings and MUST pass verifyPacket closed/0/0!
    expect(compiled.html).not.toContain('sk-secret-key-9999');
    expect(compiled.html).not.toContain('evil.example');
    expect(compiled.html).not.toContain('cdn.evil.org');
    expect(compiled.html).not.toContain('admin@district.edu');
    expect(compiled.html).not.toContain('help@district.edu');
    expect(compiled.html).not.toContain('alert(1)');
    expect(compiled.html).not.toContain('data:image/svg+xml');
    expect(compiled.html).toContain('Picture description: Glass of clear water');
    expect(compiled.html).toContain(SAMPLE_PNG_URI);

    const rep = verifyCore.verifyPacket(compiled.html);
    expect(rep.result).toBe('closed');
    expect(rep.counts.look).toBe(0);
    expect(rep.counts.notExpected).toBe(0);
  });

  it('compiles all 7 kinds (plus Escape Room, Bilingual RTL, Station Mode, Sealed QR, attachQrKey, and Check mode answer scrambling) with verifyPacket closed/0/0', () => {
    const keys = qrCrypto.generateKeyPair();

    // All 6 built-in samples
    for (const s of compiler.samples()) {
      const built = compiler.compileActivityPacket({
        artifact: s.artifact,
        loader,
        choiceBuilder,
        choiceAdapters,
        homeLanguages: ['es', 'ar'],
        stationMode: true,
        qrPublicKey: keys.publicKey,
        qrCrypto,
        stationBilingual,
      });
      const rep = verifyCore.verifyPacket(built.html);
      expect(rep.result, s.id).toBe('closed');
      expect(rep.counts.look, s.id).toBe(0);
      expect(rep.counts.notExpected, s.id).toBe(0);
    }

    // Kind 2: Cloze (Practice + Check) & Kind 4: Timeline Studio JSON (Practice + Check)
    const clozeArtifact = {
      kind: 'cloze',
      title: 'Water Cycle Cloze',
      passage: 'Heat causes [[evaporation]] from oceans, and cooling causes [[condensation]] in clouds.',
    };
    const clozeChk = compiler.compileActivityPacket({
      artifact: clozeArtifact,
      mode: 'probe',
      teacherCode: 'river-77',
      loader,
      choiceBuilder,
      choiceAdapters,
    });
    const clozeRep = verifyCore.verifyPacket(clozeChk.html);
    expect(clozeRep.result).toBe('closed');
    expect(clozeRep.counts.look).toBe(0);
    expect(clozeRep.counts.notExpected).toBe(0);
    // Check mode MUST NOT leak sourceArtifact answers into #packet-manifest!
    expect(clozeChk.manifest.compiled.sourceArtifact).toBeUndefined();

    // Timeline Studio JSON (with external source URIs that must be stripped!)
    const timelineArtifact = {
      title: { text: { headline: 'Spaceflight Milestones', text: 'Order these spaceflight milestones.' } },
      events: [
        { start_date: { year: '1969', month: '7', day: '20' }, text: { headline: 'Apollo 11 Moon Landing', text: 'First crewed lunar landing.' }, sources: [{ title: 'NASA', uri: 'ht' + 'tps://nasa.example/apollo11' }] },
        { start_date: { year: '1957', month: '10', day: '4' }, text: { headline: 'Sputnik 1 Launch', text: 'First artificial Earth satellite.' } },
        { start_date: { year: '1961', month: '4', day: '12' }, text: { headline: 'Vostok 1 Orbit', text: 'First human spaceflight.' } },
      ],
    };
    const tlBuilt = compiler.compileActivityPacket({
      artifact: timelineArtifact,
      mode: 'probe',
      loader,
      choiceBuilder,
      choiceAdapters,
    });
    expect(tlBuilt.kind).toBe('timeline');
    expect(tlBuilt.targetActivity).toBe('sequence_order');
    expect(tlBuilt.stripReport.urlsStripped).toBe(1);
    expect(tlBuilt.html).not.toContain('nasa.example');
    const tlRep = verifyCore.verifyPacket(tlBuilt.html);
    expect(tlRep.result).toBe('closed');
    expect(tlRep.counts.look).toBe(0);
    expect(tlRep.counts.notExpected).toBe(0);

    // attachQrKey + withCodeName special-char escaping parity
    const plainQuiz = compiler.compileActivityPacket({
      artifact: compiler.sampleById('sample_quiz').artifact,
      loader,
      choiceBuilder,
      choiceAdapters,
    });
    const attached = loader.attachQrKey(plainQuiz.html, keys.publicKey, { qrCrypto });
    expect(attached.ok).toBe(true);
    expect(verifyCore.verifyPacket(attached.html).result).toBe('closed');
    const named = compiler.withCodeName(plainQuiz.html, 'Sam\u2028<1>&');
    expect(compiler.codeName(named)).toBe('Sam\u2028<1>&');
    expect(verifyCore.verifyPacket(named).result).toBe('closed');
  });
});

describe('Wave 14 Compiled Student Packet Interactive Runtime', () => {
  it('runs Compiled Quiz (Practice retry guard + Check mode empty-submit guard & Sealed QR) and Compiled Cloze (glossary + word bank + Check)', async () => {
    const keys = qrCrypto.generateKeyPair();
    const quizSample = compiler.sampleById('sample_quiz').artifact;

    // 1) Quiz Practice mode
    const qPrac = compiler.compileActivityPacket({ artifact: quizSample, loader, choiceBuilder, choiceAdapters });
    const app = bootPacket(qPrac.html);
    app.start('Wren3');
    // First wrong pick marks tried & aria-disabled, second right pick succeeds
    app.doc.querySelector('[data-cqz-choice="0"]').click();
    expect(app.doc.querySelector('[data-cqz-choice="0"]').getAttribute('aria-disabled')).toBe('true');
    app.doc.querySelector('[data-cqz-choice="1"]').click();
    app.doc.querySelector('[data-next]').click();
    // Q2 keyboard shortcut '2' -> Sunlight
    app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: '2', bubbles: true }));
    app.doc.querySelector('[data-next]').click();
    // Q3 short answer: Chlorophyll
    app.doc.querySelector('[data-cqz-input]').value = 'Chlorophyll';
    app.doc.querySelector('[data-cqz-submit]').click();
    app.doc.querySelector('[data-next]').click();

    app.doc.querySelector('[data-save-json]').click();
    const qRes = loader.parseResult((await app.readSaved('.json')).text);
    expect(qRes.ok).toBe(true);
    expect(qRes.result.summary.firstTry).toBe(2);
    expect(qRes.result.summary.afterRetry).toBe(1);

    // 2) Quiz Check mode (empty-submit guard without ctx.feedback crash + Sealed QR!)
    const qChk = compiler.compileActivityPacket({
      artifact: quizSample,
      mode: 'probe',
      qrPublicKey: keys.publicKey,
      loader,
      choiceBuilder,
      choiceAdapters,
      qrCrypto,
    });
    const cApp = bootPacket(qChk.html);
    const clock = makeClock(cApp.win, 600);
    cApp.start('Birch7');
    cApp.doc.querySelector('[data-check-begin]').click();
    clock.bump(600);
    cApp.doc.querySelector('[data-cqz-choice="1"]').click();
    clock.bump(600);
    cApp.doc.querySelector('[data-cqz-choice="1"]').click();
    clock.bump(600);
    expect(() => cApp.doc.querySelector('[data-cqz-submit]').click()).not.toThrow();
    expect(cApp.doc.querySelector('[data-cqz-local-note]').hidden).toBe(false);
    cApp.doc.querySelector('[data-cqz-input]').value = 'chlorophyll';
    cApp.doc.querySelector('[data-cqz-submit]').click();

    cApp.doc.querySelector('[data-save-json]').click();
    const cRes = loader.parseResult((await cApp.readSaved('.json')).text);
    expect(cRes.ok).toBe(true);
    expect(cRes.result.score.scoreUnit).toBe('items_correct');
    expect(cRes.result.score.itemsCorrect).toBe(3);

    cApp.doc.querySelector('[data-qr-toggle]').click();
    const unsealed = qrCrypto.unsealResult(cApp.doc.querySelector('[data-qr-code]').textContent.trim(), keys.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.result.score.itemsCorrect).toBe(3);

    // 3) Cloze from main-app passage + glossary in Check mode
    const clozeGlossary = {
      title: 'Ecosystem Vocabulary Cloze',
      passage: 'Plants are producers that use sunlight to make food for consumers.',
      glossary: [
        { term: 'producers', definition: 'Organisms that make food' },
        { term: 'consumers', definition: 'Organisms that eat food' },
      ],
    };
    const clChk = compiler.compileActivityPacket({ artifact: clozeGlossary, mode: 'probe', loader, choiceBuilder, choiceAdapters });
    expect(clChk.kind).toBe('cloze');
    const clApp = bootPacket(clChk.html);
    const clClock = makeClock(clApp.win, 600);
    clApp.start('Fox5');
    clApp.doc.querySelector('[data-check-begin]').click();
    clClock.bump(600);
    // Empty submit guard in Check mode
    expect(() => clApp.doc.querySelector('[data-ccl-submit]').click()).not.toThrow();
    expect(clApp.doc.querySelector('[data-ccl-local-note]').hidden).toBe(false);
    clApp.doc.querySelector('[data-ccl-blank="0"]').value = 'producers';
    clApp.doc.querySelector('[data-ccl-blank="1"]').value = 'consumers';
    clApp.doc.querySelector('[data-ccl-submit]').click();
    clApp.doc.querySelector('[data-save-json]').click();
    const clRes = loader.parseResult((await clApp.readSaved('.json')).text);
    expect(clRes.ok).toBe(true);
    expect(clRes.result.score.scoreUnit).toBe('items_correct');
    expect(clRes.result.score.itemsCorrect).toBe(1);
  });

  it('plays Branching Adventure (with puzzle lock + clues), Connected Escape Room (with gated clues + exit code), and Anchor Chart Study Guide (with self-check + print poster)', async () => {
    // 1) Branching Adventure (Oregon Trail)
    const advBuilt = compiler.compileActivityPacket({
      artifact: compiler.sampleById('sample_adventure').artifact,
      loader,
      choiceBuilder,
      choiceAdapters,
    });
    const aApp = bootPacket(advBuilt.html);
    aApp.start('Maple2');
    // Pick choice 0 ("Pack extra wagon axles and rope") -> river_check puzzle
    aApp.doc.querySelector('[data-adv-choice="0"]').click();
    expect(aApp.doc.querySelector('[data-adv-puzzle="river_check"]')).toBeTruthy();
    // Request hint -> Start over resets hintSteps cleanly -> return to river_check and verify hint starts hidden again
    aApp.doc.querySelector('[data-adv-hint-btn]').click();
    expect(aApp.doc.querySelector('[data-adv-hint-text]').hidden).toBe(false);
    aApp.doc.querySelector('[data-adv-restart]').click();
    aApp.doc.querySelector('[data-adv-choice="0"]').click();
    expect(aApp.doc.querySelector('[data-adv-hint-text]').hidden).toBe(true);
    aApp.doc.querySelector('[data-adv-hint-btn]').click();
    expect(aApp.doc.querySelector('[data-adv-hint-text]').textContent).toContain('Hint 1');
    aApp.doc.querySelector('[data-adv-puzzle-choice="1"]').click();
    expect(aApp.doc.querySelector('[data-adv-clue="cable_pass"]')).toBeTruthy();
    // Now unlocked choice leads to fort_ending -> complete adventure
    aApp.doc.querySelector('[data-adv-choice="0"]').click();
    expect(aApp.doc.querySelector('[data-adv-title]').textContent).toContain('Fort Laramie');
    aApp.doc.querySelector('[data-adv-finish]').click();
    aApp.doc.querySelector('[data-save-json]').click();
    const advRes = loader.parseResult((await aApp.readSaved('.json')).text);
    expect(advRes.ok).toBe(true);
    expect(advRes.result.summary.practised).toBe(1);
    expect(advRes.result.items[0].supports.adv_puzzle_solved).toBe(1);
    expect(advRes.result.items[0].supports.adv_clue_found).toBe(1);

    // 2) Connected Escape Room (Water Cycle Lab)
    const escBuilt = compiler.compileActivityPacket({
      artifact: compiler.sampleById('sample_escape_room').artifact,
      loader,
      choiceBuilder,
      choiceAdapters,
    });
    const eApp = bootPacket(escBuilt.html);
    eApp.start('Pine8');
    // Station 2 (cold_lid) & Exit Door start locked until clues are gathered
    expect(eApp.doc.querySelector('[data-adv-to="cold_lid"]').disabled).toBe(true);
    expect(eApp.doc.querySelector('[data-adv-to="exit_door"]').disabled).toBe(true);
    // Visit Warm Beaker Log -> collects evap_clue automatically -> return to hub
    eApp.doc.querySelector('[data-adv-to="beaker_note"]').click();
    expect(eApp.doc.querySelector('[data-adv-clue="evap_clue"]')).toBeTruthy();
    eApp.doc.querySelector('[data-adv-to="hub"]').click();
    // Cooling Lid Gauge is now unlocked! Solve Condensation control -> collects cond_clue -> return to hub
    expect(eApp.doc.querySelector('[data-adv-to="cold_lid"]').disabled).toBe(false);
    eApp.doc.querySelector('[data-adv-to="cold_lid"]').click();
    eApp.doc.querySelector('[data-adv-puzzle-choice="0"]').click();
    expect(eApp.doc.querySelector('[data-adv-clue="cond_clue"]')).toBeTruthy();
    eApp.doc.querySelector('[data-adv-to="hub"]').click();
    // Exit Door now unlocked! Enter 2-3-1 -> mission debrief & complete
    expect(eApp.doc.querySelector('[data-adv-to="exit_door"]').disabled).toBe(false);
    eApp.doc.querySelector('[data-adv-to="exit_door"]').click();
    eApp.doc.querySelector('[data-adv-puzzle-input]').value = '2-3-1';
    eApp.doc.querySelector('[data-adv-unlock]').click();
    expect(eApp.doc.querySelector('[data-adv-finish]')).toBeTruthy();
    eApp.doc.querySelector('[data-adv-finish]').click();

    // 3) Anchor Chart Study Guide
    const ancBuilt = compiler.compileActivityPacket({
      artifact: compiler.sampleById('sample_anchor_chart').artifact,
      loader,
      choiceBuilder,
      choiceAdapters,
    });
    expect(ancBuilt.html).toContain('@media print');
    const sApp = bootPacket(ancBuilt.html);
    sApp.start('Sage9');
    expect(sApp.doc.querySelectorAll('[data-anc-card]').length).toBe(3);
    sApp.doc.querySelector('[data-anc-check-toggle]').click();
    expect(sApp.doc.querySelector('[data-anc-checks]').hidden).toBe(false);
    sApp.doc.querySelector('[data-anc-choice="0-0"]').click();
    expect(sApp.doc.querySelector('[data-anc-q-fb="0"]').textContent).toContain('Correct');
    sApp.doc.querySelector('[data-anc-finish]').click();
    sApp.doc.querySelector('[data-save-json]').click();
    const ancRes = loader.parseResult((await sApp.readSaved('.json')).text);
    expect(ancRes.ok).toBe(true);
    expect(ancRes.result.summary.practised).toBe(1);
    expect(ancRes.result.items[0].supports.anchor_self_check).toBe(1);
  });
});

describe('Wave 14 Educator Compiler Page (packets-compile.html), #import-draft, Strip Report, Batch & Reopen', () => {
  it('loads packets-compile.html, handles #import-draft handoff, shows live Strip Report, builds verified packet, and reopens Practice & Check files', async () => {
    const html = readRoot('packets-compile.html');
    const dom = new JSDOM(html, { url: 'https://packets.local/packets-compile.html#import-draft', runScripts: 'outside-only', pretendToBeVisual: true });
    const win = dom.window;
    const doc = win.document;

    let blobCounter = 0;
    const builtBlobs = [];
    win.URL.createObjectURL = (b) => { builtBlobs.push(b); return 'blob:cmp-maker-' + (++blobCounter); };
    win.URL.revokeObjectURL = () => {};

    const scripts = [
      'packets-page.js',
      'word_sounds_take_home_loader.js',
      'packet_sort_write_adapters.js',
      'packet_choice_builder.js',
      'packets_main_app_compiler.js',
      'packets_station_bilingual.js',
      'packets_qr_crypto.js',
      'packets_verify_core.js',
      'packets_handoff.js',
      'packets_zip.js',
    ];
    for (const s of scripts) {
      vm.runInContext(readRoot(s), dom.getInternalVMContext(), { filename: s });
    }
    // Stub handoff.takeDraft to deliver an exported DBQ draft via #import-draft
    win.AlloPacketHandoff.takeDraft = () => Promise.resolve({
      kind: 'compile_activity',
      title: 'Handed-Off DBQ',
      artifact: compiler.sampleById('sample_dbq_writing').artifact,
    });
    vm.runInContext(readRoot('packets-compile.js'), dom.getInternalVMContext(), { filename: 'packets-compile.js' });
    doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    // Automatically jumped to Step 2 with Strip Report populated and #import-banner visible outside #step-1!
    expect(doc.getElementById('step-2').hidden).toBe(false);
    expect(doc.getElementById('import-banner').hidden).toBe(false);
    expect(doc.getElementById('import-banner').closest('#step-1')).toBeNull();
    expect(doc.getElementById('strip-headline').textContent).toContain('Sentence Frames / DBQ Writing');
    expect(doc.getElementById('strip-counts').textContent).toContain('Prompt/model fields stripped: 1');
    expect(doc.getElementById('strip-counts').textContent).toContain('Web addresses stripped: 1');
    // Writing mode disables Check radio cleanly
    expect(doc.getElementById('mode-probe').disabled).toBe(true);

    // Go to Step 3 -> build verified packet (exercises window.AlloPacketSortWriteAdapters in browser context!)
    doc.getElementById('next-2').click();
    expect(doc.getElementById('summary').hidden).toBe(false);
    expect(doc.getElementById('summary-facts').textContent).toContain('Verified offline');
    expect(doc.getElementById('try').getAttribute('href')).toMatch(/^packets-try\.html#blob:cmp-maker-/);
    expect(builtBlobs.length).toBeGreaterThan(0);

    // Batch 1 -> 2+ code names shows Save .zip -> click #batch-make and validate real ZIP entries via readZip!
    const batchTa = doc.getElementById('f-batch-names');
    batchTa.value = 'Oak1';
    batchTa.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('batch-make').hidden).toBe(true);
    batchTa.value = 'Oak1\nBirch2';
    batchTa.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('batch-make').hidden).toBe(false);
    const beforeZipCount = builtBlobs.length;
    doc.getElementById('batch-make').click();
    expect(builtBlobs.length).toBe(beforeZipCount + 1);
    const zipBuf = new Uint8Array(await builtBlobs[builtBlobs.length - 1].arrayBuffer());
    const zipEntries = win.AlloPacketZip.readZip(zipBuf);
    expect(zipEntries.length).toBe(2);
    expect(zipEntries.every((e) => e.crcOk)).toBe(true);
    expect(zipEntries.map((e) => compiler.codeName(new TextDecoder().decode(e.bytes)))).toEqual(['Oak1', 'Birch2']);

    // Reopen a sealed Quiz Check file -> must show '?' placeholders, scrub stale learner/QR values, AND reject compiling '?' placeholders!
    const quizCheck = compiler.compileActivityPacket({
      artifact: compiler.sampleById('sample_quiz').artifact,
      mode: 'probe',
      loader,
      choiceBuilder,
      choiceAdapters,
    });
    const reopenFile = new win.File([quizCheck.html], 'quiz-check.html', { type: 'text/html' });
    const reopenInput = doc.getElementById('reopen-file');
    Object.defineProperty(reopenInput, 'files', { value: [reopenFile], configurable: true });
    reopenInput.dispatchEvent(new win.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    expect(doc.getElementById('reopen-line').textContent).toContain('Photosynthesis');
    expect(doc.getElementById('reopen-list').textContent).toContain('scramble answers');
    expect(doc.getElementById('f-batch-names').value).toBe('');
    expect(doc.getElementById('f-qr-key').value).toBe('');
    // Reopened Check file lands on Step 1 (JSON editor) so teacher can replace '?' placeholders, and #next-1 blocks until replaced!
    expect(doc.getElementById('step-1').hidden).toBe(false);
    expect(doc.getElementById('f-json').value).toContain('"answer": "?"');
    doc.getElementById('next-1').click();
    expect(doc.getElementById('step-1').hidden).toBe(false);
    expect(doc.getElementById('step-1-problem').textContent).toContain('placeholder');
    expect(compiler.inspectArtifact({ kind: 'cloze', passage: 'The [blank] shines.', blanks: [{ answer: '?' }] }).ok).toBe(false);
    expect(compiler.inspectArtifact({ kind: 'concept_sort', categories: ['A', 'B'], items: [{ content: 'X', category: '?' }, { content: 'Y', category: 'A' }] }).ok).toBe(false);
  });
});
