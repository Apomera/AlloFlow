// Wave 1B Tests: Shared-Device Station Kiosk Mode (Multi-Student Encrypted QR Deck),
// Rule-Based Mastery Scaffolding (Adaptive Without AI), Bilingual / Home-Language Bridge (6 curated languages + RTL),
// and Pluggable extraAdapters / extraCss hook in word_sounds_take_home_loader.js.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;

const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;

function makePracticeLesson() {
  const lesson = MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'add-doubles', count: 2 });
  lesson.lessonId = 'w1b-math-doubles';
  lesson.revision = '2026-11-24';
  lesson.title = 'Doubles Practice';
  lesson.blocks[0].items = lesson.blocks[0].items.slice(0, 2);
  return lesson;
}

function makeCheckLesson() {
  return {
    schema: TH.LESSON_SCHEMA,
    lessonId: 'w1b-chk-add-1',
    revision: '2026-11-24',
    title: 'Addition Check',
    mode: 'probe',
    form: 'A',
    timeLimitS: 120,
    check: { measure: 'math_computation', scoreUnit: 'digits_correct_per_minute', scoringVersion: 3, formVersion: 2 },
    blocks: [{
      activity: 'math_computation',
      items: [
        { id: 'c1', a: 4, op: 'add', b: 3 },
        { id: 'c2', a: 6, op: 'add', b: 5 },
      ],
    }],
  };
}

// Reusable deterministic multiple-choice extra adapter for Wave 1B tests (zero innerHTML, zero open(, zero http).
function renderQuickChoice(item, ctx) {
  const prompt = ctx.el('p', { class: 'letters', 'data-qc-prompt': '', text: item.prompt || item.word });
  const list = ctx.el('ul', { class: 'choices' });
  const buttons = [];
  (item.choices || []).forEach(function (ch) {
    const btn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-qc-choice': ch,
      on: {
        click: function () {
          if (ctx.isDone()) return;
          ctx.answer(ch, ch === item.target, {
            correctText: 'Right!',
            retryText: 'Try again.',
            missedText: 'The answer is ' + item.target + '.',
          });
        },
      },
      text: ch,
    });
    buttons.push({ btn: btn, val: ch });
    list.appendChild(ctx.el('li', { class: 'choice' }, [btn]));
  });
  ctx.root.appendChild(prompt);
  ctx.root.appendChild(list);
  return {
    reveal: function () {
      buttons.forEach(function (b) {
        b.btn.disabled = true;
        if (b.val === item.target) b.btn.parentNode.classList.add('right');
      });
    },
  };
}

function openPacket(html) {
  let clock = 1000;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/packet.html',
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    },
  });
  const d = dom.window.document;
  const q = (sel) => d.querySelector(sel);
  const qa = (sel) => [...d.querySelectorAll(sel)];
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => qa('#app button').filter(seen).find((b) => b.textContent.trim() === text);
  const press = (key) => q('[data-key="' + key + '"]').click();
  return {
    dom, w: dom.window, d, q, qa, seen, button, press,
    tick: (ms) => { clock += ms; },
    type: (digits) => { String(digits).split('').forEach(press); press('next'); },
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

describe('Wave 1B — Standard packet parity and zero-bloat guarantees', () => {
  it('keeps standard packets untouched and preserves byte-for-byte parity between buildHtml and attachQrKey (with and without stationMode)', async () => {
    const kp1 = Q.generateKeyPair('Room 12');
    const kp2 = Q.generateKeyPair('Room 14');
    const core = { soundAnswerMatches: () => false };
    const lesson = makePracticeLesson();

    const plain = TH.buildHtml(lesson, { core });
    expect(plain).not.toContain('kit.station=');
    expect(plain).not.toContain('kit.adaptive=');
    expect(plain).not.toContain('kit.bilingual=');
    expect(plain).not.toContain('afstation-start');
    expect(plain).not.toContain('afextra-css');
    expect(plain).not.toContain('station_next_student');
    expect(plain).not.toContain('adaptive_hint_title');
    await expectClosedVerified(plain);

    const builtQr = TH.buildHtml(lesson, { core, qrPublicKey: kp1.publicKey });
    const attachedQr = TH.attachQrKey(plain, kp1.publicKey);
    expect(attachedQr.ok).toBe(true);
    expect(attachedQr.html).toBe(builtQr);
    await expectClosedVerified(attachedQr.html);

    const builtStation = TH.buildHtml(lesson, { core, qrPublicKey: kp1.publicKey, stationMode: true });
    const attachedStation = TH.attachQrKey(plain, kp1.publicKey, { stationMode: true });
    expect(attachedStation.ok).toBe(true);
    expect(attachedStation.stationMode).toBe(true);
    expect(attachedStation.html).toBe(builtStation);
    await expectClosedVerified(attachedStation.html);

    // Re-sealing a station-mode packet replaces the key cleanly without duplicating markers
    const resealed = TH.attachQrKey(attachedStation.html, kp2.publicKey);
    expect(resealed.ok).toBe(true);
    expect(resealed.stationMode).toBe(true);
    expect(resealed.fingerprint).toBe(kp2.fingerprint);
    expect(resealed.html.match(/\/\*afqr-start\*\//g)).toHaveLength(1);
    expect(resealed.html.match(/\/\*afstation-start\*\//g)).toHaveLength(1);
    expect(resealed.html.match(/\/\*afstation-css\*\//g)).toHaveLength(1);
    await expectClosedVerified(resealed.html);

    // Explicitly passing stationMode: false removes station mode cleanly
    const stripped = TH.attachQrKey(resealed.html, kp2.publicKey, { stationMode: false });
    expect(stripped.ok).toBe(true);
    expect(stripped.stationMode).toBe(false);
    expect(stripped.html).not.toContain('afstation-start');
    expect(stripped.html).not.toContain('afstation-css');
    await expectClosedVerified(stripped.html);

    // Standard math practice packets stay strictly under the 176,000-byte ceiling
    const ccc = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' }), loader: TH });
    const reh = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'rehearsal', factSet: 'mul-7' }), loader: TH });
    expect(Buffer.byteLength(ccc.html, 'utf8')).toBeLessThan(176000);
    expect(Buffer.byteLength(reh.html, 'utf8')).toBeLessThan(176000);
    await expectClosedVerified(ccc.html);
    await expectClosedVerified(reh.html);
  });
});

describe('Wave 1B — Shared-Device Station Kiosk Mode & Multi-Student Encrypted QR Deck', () => {
  it('resets session and clears localStorage without reloading on practice packets without QR key', async () => {
    const core = { soundAnswerMatches: () => false };
    const lesson = makePracticeLesson();
    const ans = lesson.blocks[0].items.map((it) => String(it.answer));
    const html = TH.buildHtml(lesson, { core, stationMode: true });
    await expectClosedVerified(html);

    const t = openPacket(html);
    const storageKey = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
    t.d.getElementById('learner-name').value = 'Samira Khan';
    t.button('Start').click();
    expect(t.w.localStorage.getItem(storageKey)).toBeTruthy();

    for (let i = 0; i < ans.length; i++) {
      t.tick(600);
      t.q('[data-cover]').click();
      t.tick(600);
      t.type(ans[i]);
      (t.button('Next') || t.button('See my results')).click();
    }

    const nextStudentBtn = t.q('[data-station-next]');
    expect(nextStudentBtn).toBeTruthy();
    expect(nextStudentBtn.textContent).toContain('Ready for next student');
    nextStudentBtn.click();

    // localStorage cleared cleanly, back on Start screen with blank learner field
    expect(t.w.localStorage.getItem(storageKey)).toBeNull();
    expect(t.d.getElementById('learner-name')).toBeTruthy();
    expect(t.d.getElementById('learner-name').value).toBe('');
    t.dom.window.close();
  });

  it('resets Reading Tools (text size, colors, ruler, magnifier, bold, custom sliders, panel) on Ready for next student so Student 1 tools never leak to Student 2', async () => {
    const lesson = {
      schema: TH.LESSON_SCHEMA,
      lessonId: 'station-tools-reset',
      revision: '2026-11-24',
      title: 'Tools Reset Check',
      blocks: [{
        activity: 'quick_choice',
        items: [{ id: 't1', word: 'cat', target: 'cat', choices: ['cat', 'dog', 'sun'] }],
      }],
    };
    const html = TH.buildHtml(lesson, { extraAdapters: { quick_choice: renderQuickChoice }, stationMode: true });
    await expectClosedVerified(html);
    const t = openPacket(html);
    const storageKey = 'alloflow-take-home:station-tools-reset:2026-11-24';

    // Student 1 opens Reading Tools and enables multiple accommodations
    t.q('[data-tools-open]').click();
    t.q('[data-tool="size-3"]').click();
    t.q('[data-tool="colors-1"]').click();
    t.q('[data-tool="focus-3"]').click();
    t.q('[data-tool="lens-1"]').click();
    t.q('[data-tool="bold-1"]').click();
    const customSize = t.q('[data-tool-custom-size]');
    customSize.value = '26';
    customSize.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    const customBg = t.q('[data-tool-custom-bg]');
    customBg.value = '#102030';
    customBg.dispatchEvent(new t.w.Event('input', { bubbles: true }));

    expect(t.d.documentElement.getAttribute('data-lt-size')).toBe('3');
    expect(t.d.documentElement.getAttribute('data-lt-colors')).toBe('1');
    expect(t.d.documentElement.getAttribute('data-lt-bold')).toBe('1');
    expect(t.d.documentElement.style.fontSize).toBe('26px');
    expect(t.q('[data-reading-ruler]').hidden).toBe(false);
    expect(t.q('[data-lens]').hidden).toBe(false);

    // Student 1 completes and clicks Ready for next student
    t.d.getElementById('learner-name').value = 'Student One';
    t.button('Start').click();
    t.q('[data-qc-choice="cat"]').click();
    t.button('See my results').click();
    t.q('[data-station-next]').click();

    // Immediately verify all Reading Tools and panel state reset cleanly
    expect(t.w.localStorage.getItem(storageKey)).toBeNull();
    expect(t.d.documentElement.getAttribute('data-lt-size')).toBeNull();
    expect(t.d.documentElement.getAttribute('data-lt-colors')).toBeNull();
    expect(t.d.documentElement.getAttribute('data-lt-bold')).toBeNull();
    expect(t.d.documentElement.style.fontSize).toBe('');
    expect(t.d.documentElement.style.getPropertyValue('--bg')).toBe('');
    expect(t.q('#lt-panel').hidden).toBe(true);
    expect(t.q('[data-tools-open]').getAttribute('aria-expanded')).toBe('false');
    expect(t.q('[data-reading-ruler]').hidden).toBe(true);
    expect(t.q('[data-lens]').hidden).toBe(true);
    expect(t.q('[data-lens-grip]').hidden).toBe(true);

    // Student 2 completes with default tools: zero Student 1 tools leak into state.tools or supports
    t.d.getElementById('learner-name').value = 'Student Two';
    t.button('Start').click();
    t.q('[data-qc-choice="cat"]').click();
    t.button('See my results').click();
    const s2 = JSON.parse(t.w.localStorage.getItem(storageKey));
    expect(s2.tools).toBeUndefined();
    expect(s2.items[0].supports).toEqual({});
    t.dom.window.close();

    // Also verify defaultTools are restored instead of wiped when packet specifies defaultTools
    const defLesson = Object.assign({}, lesson, { lessonId: 'station-tools-default', defaultTools: { size: 1 } });
    const htmlDef = TH.buildHtml(defLesson, { extraAdapters: { quick_choice: renderQuickChoice }, stationMode: true });
    const td = openPacket(htmlDef);
    expect(td.d.documentElement.getAttribute('data-lt-size')).toBe('1');
    td.q('[data-tools-open]').click();
    td.q('[data-tool="size-3"]').click();
    td.q('[data-tool="colors-2"]').click();
    td.d.getElementById('learner-name').value = 'First';
    td.button('Start').click();
    td.q('[data-qc-choice="cat"]').click();
    td.button('See my results').click();
    td.q('[data-station-next]').click();
    expect(td.d.documentElement.getAttribute('data-lt-size')).toBe('1');
    expect(td.d.documentElement.getAttribute('data-lt-colors')).toBeNull();
    td.dom.window.close();
  });

  it('auto-queues encrypted AFQR1 codes in tab memory only (never localStorage), masks labels, cycles Previous/Next/Clear, and caps at 15 students', async () => {
    const kp = Q.generateKeyPair('Station Room 4');
    const lesson = {
      schema: TH.LESSON_SCHEMA,
      lessonId: 'station-deck-demo',
      revision: '2026-11-24',
      title: 'Station Demo',
      blocks: [{
        activity: 'quick_choice',
        items: [{ id: 'q1', word: 'cat', target: 'cat', choices: ['cat', 'dog', 'sun'] }],
      }],
    };
    const html = TH.buildHtml(lesson, {
      extraAdapters: { quick_choice: renderQuickChoice },
      qrPublicKey: kp.publicKey,
      stationMode: true,
    });
    await expectClosedVerified(html);

    const t = openPacket(html);
    const storageKey = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;

    function runStudent(name, choices) {
      const clicks = Array.isArray(choices) ? choices : [choices];
      t.d.getElementById('learner-name').value = name;
      t.button('Start').click();
      clicks.forEach((choice) => {
        t.tick(500);
        t.q('[data-qc-choice="' + choice + '"]').click();
      });
      t.button('See my results').click();
    }

    // Student 1: Maya Patel
    runStudent('Maya Patel', ['cat']);
    expect(t.q('[data-station-status="queued"]').textContent).toContain('1 ready');
    // Reset for Student 2
    t.q('[data-station-next]').click();
    expect(t.w.localStorage.getItem(storageKey)).toBeNull();
    // Start screen collapsed teacher fold holds the deck (1 ready)
    const startDeckBtn = t.q('[data-station-start-teacher] [data-station-deck-open]');
    expect(startDeckBtn).toBeTruthy();
    expect(startDeckBtn.textContent).toContain('Teacher Station Deck (1 ready)');

    // Student 2: Leo Chen (wrong first, right on retry)
    runStudent('Leo Chen', ['dog', 'cat']);
    expect(t.q('[data-station-status="queued"]').textContent).toContain('2 ready');

    // Verify localStorage does NOT contain Maya Patel or AFQR1 plaintext queue
    const lsVal = t.w.localStorage.getItem(storageKey) || '';
    expect(lsVal).not.toContain('Maya Patel');
    expect(lsVal).not.toContain('AFQR1:');

    // Open Teacher Station Deck inside Show my teacher fold
    const confer = t.q('[data-teacher-confer]');
    const deckBtn = confer.querySelector('[data-station-deck-open]');
    expect(deckBtn.textContent).toContain('Teacher Station Deck (2 ready)');
    deckBtn.click();

    const panel = confer.querySelector('[data-station-deck-panel]');
    expect(panel.hidden).toBe(false);
    // Slide 2 (or 1) check — opens on latest (Student 2 of 2) or 1 of 2; let's navigate to Student 1 then Student 2
    const prevBtn = panel.querySelector('[data-station-deck-prev]');
    const nextBtn = panel.querySelector('[data-station-deck-next]');
    while (!prevBtn.disabled) prevBtn.click();

    // Student 1 slide: masked label (never full name!), real PNG QR, decryptable AFQR1
    expect(panel.querySelector('[data-station-deck-meta]').textContent).toContain('Student 1 of 2');
    expect(panel.querySelector('[data-station-deck-meta]').textContent).toContain('M*** P***');
    expect(panel.querySelector('[data-station-deck-meta]').textContent).not.toContain('Maya Patel');
    const img1 = panel.querySelector('.qr-img');
    expect(img1 && img1.src.startsWith('data:image/png;base64,')).toBe(true);
    const code1 = panel.querySelector('[data-station-deck-code]').textContent.trim();
    const dec1 = Q.unsealResult(code1, kp.secretKey);
    expect(dec1.ok).toBe(true);
    expect(dec1.result.learnerName).toBe('Maya Patel');
    expect(dec1.result.summary.firstTry).toBe(1);

    // Cycle to Student 2
    expect(nextBtn.disabled).toBe(false);
    nextBtn.click();
    expect(panel.querySelector('[data-station-deck-meta]').textContent).toContain('Student 2 of 2');
    expect(panel.querySelector('[data-station-deck-meta]').textContent).toContain('L*** C***');
    const code2 = panel.querySelector('[data-station-deck-code]').textContent.trim();
    const dec2 = Q.unsealResult(code2, kp.secretKey);
    expect(dec2.ok).toBe(true);
    expect(dec2.result.learnerName).toBe('Leo Chen');
    expect(dec2.result.summary.afterRetry).toBe(1);

    // Escape closes deck and clears QR DOM
    panel.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hidden).toBe(true);
    expect(panel.querySelector('.qr-img')).toBeNull();
    expect(panel.querySelector('[data-station-deck-code]').textContent).toBe('');

    // Reopen and Clear deck
    deckBtn.click();
    panel.querySelector('[data-station-deck-clear]').click();
    expect(deckBtn.textContent).toContain('Teacher Station Deck (0 ready)');
    expect(panel.querySelector('[data-station-deck-empty]').hidden).toBe(false);

    // Verify 15-student cap cleanly warns on student 16 without overflowing
    t.q('[data-station-next]').click();
    for (let s = 1; s <= 15; s++) {
      runStudent('Learner ' + s, 'cat');
      expect(t.q('[data-station-status="queued"]').textContent).toContain(s + ' ready');
      t.q('[data-station-next]').click();
    }
    runStudent('Learner 16', 'cat');
    expect(t.q('[data-station-status="full"]')).toBeTruthy();
    expect(t.q('[data-teacher-confer] [data-station-deck-open]').textContent).toContain('15 ready');
    t.dom.window.close();
  });

  it('supports Station Mode on Check packets with Teacher Station Deck inside For the teacher card', async () => {
    const kp = Q.generateKeyPair('Check Station');
    const html = TH.buildHtml(makeCheckLesson(), { teacherCode: '7421', qrPublicKey: kp.publicKey, stationMode: true });
    await expectClosedVerified(html);

    const t = openPacket(html);
    t.d.getElementById('learner-name').value = 'Noah Brooks';
    (t.button('Next') || t.q('#app button.primary')).click();
    t.tick(500);
    t.button('Start').click();
    t.tick(1000);
    t.type('7');
    t.tick(1000);
    t.type('11');

    const deckBtn = t.q('[data-teacher] [data-station-deck-open]');
    expect(deckBtn).toBeTruthy();
    expect(deckBtn.textContent).toContain('Teacher Station Deck (1 ready)');
    deckBtn.click();
    const code = t.q('[data-teacher] [data-station-deck-code]').textContent.trim();
    const dec = Q.unsealResult(code, kp.secretKey);
    expect(dec.ok).toBe(true);
    expect(dec.result.learnerName).toBe('Noah Brooks');
    expect(dec.result.score.itemsCorrect).toBe(2);

    t.q('[data-station-next]').click();
    expect(t.w.localStorage.getItem('alloflow-take-home:w1b-chk-add-1:2026-11-24')).toBeNull();
    expect(t.d.getElementById('learner-name').value).toBe('');
    t.dom.window.close();
  });

  it('wires the Step 2 Station Mode checkbox in packets-qr.html and preserves strict page hygiene', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-qr.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'packets-qr.js'), 'utf8');
    const sbJs = fs.readFileSync(path.join(ROOT, 'packets_station_bilingual.js'), 'utf8');

    expect(BRITISH.exec(html)).toBeNull();
    // Ignore the legacy JSON result schema key "practised" already present in packets-qr.js
    expect(BRITISH.exec(js.replace(/\bpractised\b/g, 'doneCount'))).toBeNull();
    expect(BRITISH.exec(sbJs)).toBeNull();
    expect(sbJs).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b|\blocalStorage\b|\bsessionStorage\b/);

    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://alloflow.local/packets-qr.html' });
    const win = dom.window;
    const doc = win.document;
    if (doc.readyState === 'loading') {
      await new Promise((resolve) => doc.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    expect(doc.querySelector('details.proof').textContent).toContain('eleven files');
    expect(doc.querySelectorAll('script:not([src])')).toHaveLength(0);
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
    const chk = doc.getElementById('seal-station-mode');
    expect(chk).toBeTruthy();
    expect(chk.closest('label').textContent).toContain('Shared device / station mode');

    Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true });
    win.AlloPacketQrCrypto = Q;
    win.AlloWordSoundsTakeHome = TH;
    win.AlloPacketZip = ZIP;
    const downloads = [];
    win.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:station-' + downloads.length; };
    win.URL.revokeObjectURL = () => {};
    win.eval(js);

    doc.getElementById('make-key').click();
    chk.checked = true;
    const plain = TH.buildHtml(makePracticeLesson(), { core: { soundAnswerMatches: () => false } });
    const sealFilesEl = doc.getElementById('seal-files');
    Object.defineProperty(sealFilesEl, 'files', { value: [{ name: 'Doubles.html', text: () => Promise.resolve(plain) }], configurable: true });
    sealFilesEl.dispatchEvent(new win.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(doc.getElementById('seal-list').textContent).toContain('Station mode');
    doc.getElementById('seal-download').click();
    expect(downloads).toHaveLength(1);
    const downloadedHtml = await downloads[0].text();
    expect(downloadedHtml).toContain('afstation-start');
    await expectClosedVerified(downloadedHtml);
    dom.window.close();
  });
});

describe('Wave 1B — Rule-Based Mastery Scaffolding (Adaptive Without AI)', () => {
  const makeAdaptiveLesson = () => ({
    schema: TH.LESSON_SCHEMA,
    lessonId: 'adaptive-fractions-1',
    revision: '2026-11-24',
    title: 'Fraction Concepts',
    adaptiveScaffold: {
      missThreshold: 2,
      streakThreshold: 4,
      hints: { equiv: 'Multiply top and bottom by the same number.' },
      workedExamples: { equiv: 'Worked example: 1/2 = (1x2)/(2x2) = 2/4.' },
    },
    stretchItems: [
      { id: 'stretch-1', word: '3/4 = ?/12', target: '9', choices: ['6', '9', '10'], maxAttempts: 1 },
    ],
    blocks: [{
      activity: 'quick_choice',
      items: [
        { id: 'i1', skill: 'equiv', word: '1/2 = ?/4', target: '2', choices: ['1', '2', '3'], maxAttempts: 1 },
        { id: 'i2', skill: 'equiv', word: '1/3 = ?/6', target: '2', choices: ['1', '2', '3'], maxAttempts: 1 },
        { id: 'i3', skill: 'equiv', word: '2/3 = ?/6', target: '4', choices: ['2', '4', '5'], maxAttempts: 1 },
        { id: 'i4', skill: 'equiv', word: '2/5 = ?/10', target: '4', choices: ['3', '4', '6'], maxAttempts: 1 },
      ],
    }],
  });

  it('reveals deterministic hint/worked-example card on 2 consecutive misses, schedules 1 reinforcement item, and logs transparently in CSV & JSON', async () => {
    const html = TH.buildHtml(makeAdaptiveLesson(), { extraAdapters: { quick_choice: renderQuickChoice } });
    await expectClosedVerified(html);

    const t = openPacket(html);
    t.d.getElementById('learner-name').value = 'Elena Cruz';
    t.button('Start').click();

    // Miss #1 on skill 'equiv' -> no scaffold yet
    t.q('[data-qc-choice="1"]').click();
    expect(t.q('[data-adaptive-card="scaffold"]')).toBeNull();
    t.button('Next').click();

    // Miss #2 on skill 'equiv' -> scaffold card immediately revealed + reinforcement scheduled at end of block
    t.q('[data-qc-choice="1"]').click();
    const card = t.q('[data-adaptive-card="scaffold"]');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Multiply top and bottom by the same number.');
    expect(card.textContent).toContain('Worked example: 1/2 = (1x2)/(2x2) = 2/4.');
    expect(card.querySelector('[data-adaptive-queued]')).toBeTruthy();
    t.button('Next').click();

    // Answer items 3 and 4 right
    t.q('[data-qc-choice="4"]').click();
    t.button('Next').click();
    t.q('[data-qc-choice="4"]').click();
    // Because 1 reinforcement item was scheduled at end of block, Next appears instead of See my results
    expect(t.button('Next')).toBeTruthy();
    t.button('Next').click();

    // Now on scheduled reinforcement retry item
    const banner = t.q('[data-adaptive-banner="reinforce"]');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Multiply top and bottom by the same number.');
    // Adaptive banner paragraphs use CSS classes (no inline style attributes)
    banner.querySelectorAll('p').forEach((p) => expect(p.getAttribute('style')).toBeNull());
    // Student gets reinforcement right!
    t.q('[data-qc-choice="2"]').click();
    t.button('See my results').click();

    // Inspect saved state + result JSON + CSV + packets_results_reader
    const savedRaw = t.w.localStorage.getItem('alloflow-take-home:adaptive-fractions-1:2026-11-24');
    const saved = JSON.parse(savedRaw);
    expect(saved.items).toHaveLength(5);
    expect(saved.items[1].flag).toBe('adaptive_scaffold');
    expect(saved.items[1].supports.adaptiveScaffold).toBe(1);
    expect(saved.items[1].adaptiveReason).toBe('consecutive_misses_equiv');
    expect(saved.items[4].flag).toBe('adaptive_reinforce');
    expect(saved.items[4].supports.adaptiveReinforce).toBe(1);
    expect(saved.items[4].adaptiveReason).toBe('consecutive_misses_equiv');
    expect(saved.items[4].correct).toBe(true);

    // Check CSV & results reader round-trip
    const jsonResult = {
      kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: saved.sessionId,
      packet: { id: 'adaptive-fractions-1', version: '2026-11-24', mode: 'practice' },
      lessonId: 'adaptive-fractions-1', revision: '2026-11-24', lessonTitle: 'Fraction Concepts',
      learner: 'Elena Cruz', startedLocal: saved.startedLocal, finishedLocal: saved.finishedLocal, durationMs: 30000,
      items: saved.items.map((r, idx) => ({ n: idx + 1, itemId: r.itemId, activity: r.activity, word: 'w' + idx, target: '2', responses: r.responses, attempts: r.attempts, firstTry: r.firstTry, correct: r.correct, done: r.done, ms: 1000, supports: r.supports, practice: r.practice || null, flag: r.flag || '' })),
    };
    const csvTable = TH.resultsCsv(jsonResult);
    const dig = TH.sha256(csvTable.basis);
    const csvText = csvTable.text({ method: 'sha256', value: dig.hex });
    expect(csvText).toContain('adaptive_scaffold');
    expect(csvText).toContain('adaptive_reinforce');
    expect(csvText).toContain('adaptiveScaffold:1');
    expect(csvText).toContain('adaptiveReinforce:1');
    const parsed = await R.read(csvText, { name: 'adaptive.csv' });
    expect(parsed.ok).toBe(true);
    expect(parsed.sessions[0].integrity).toBe('ok');
    expect(parsed.sessions[0].items[4].flag).toBe('adaptive_reinforce');
    t.dom.window.close();
  });

  it('unlocks optional Stretch Challenge button after >= 4 consecutive first-try correct answers', async () => {
    const html = TH.buildHtml(makeAdaptiveLesson(), { extraAdapters: { quick_choice: renderQuickChoice } });
    const t = openPacket(html);
    t.d.getElementById('learner-name').value = 'Devon Park';
    t.button('Start').click();

    // Answer all 4 base items right on first try
    const answers = ['2', '2', '4', '4'];
    for (let i = 0; i < 4; i++) {
      t.q('[data-qc-choice="' + answers[i] + '"]').click();
      if (i < 3) {
        expect(t.q('[data-adaptive-stretch]')).toBeNull();
        t.button('Next').click();
      }
    }

    // End of block: Stretch Challenge unlocked!
    const stretchBtn = t.q('[data-adaptive-stretch]');
    expect(stretchBtn).toBeTruthy();
    expect(stretchBtn.textContent).toBe('Try a Stretch Challenge');
    stretchBtn.click();

    // Now on Stretch item
    expect(t.q('[data-adaptive-banner="stretch"]')).toBeTruthy();
    expect(t.q('[data-qc-prompt]').textContent).toBe('3/4 = ?/12');
    t.q('[data-qc-choice="9"]').click();
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:adaptive-fractions-1:2026-11-24'));
    expect(saved.items).toHaveLength(5);
    expect(saved.items[4].flag).toBe('adaptive_stretch');
    expect(saved.items[4].supports.adaptiveStretch).toBe(1);
    expect(saved.items[4].adaptiveReason).toBe('first_try_streak_4');
    expect(saved.items[4].correct).toBe(true);

    // parseResult preserves adaptiveReason when present and omits it on non-adaptive items
    const parsedJson = TH.parseResult({
      kind: TH.RESULT_KIND, schemaVersion: 3, lessonId: 'adaptive-fractions-1', revision: '2026-11-24',
      lessonTitle: 'Fraction Concepts', learnerName: 'Devon Park',
      items: saved.items.map((r, i) => ({ ...r, word: 'w' + i, target: '2', ms: 1000 })),
    });
    expect(parsedJson.ok).toBe(true);
    expect(parsedJson.result.items[0]).not.toHaveProperty('adaptiveReason');
    expect(parsedJson.result.items[4].adaptiveReason).toBe('first_try_streak_4');
    t.dom.window.close();
  });

  it('does not unlock Stretch on < 4 consecutive first-try answers and restores scheduled reinforcement items across reload', async () => {
    const html = TH.buildHtml(makeAdaptiveLesson(), { extraAdapters: { quick_choice: renderQuickChoice } });
    // Case 1: 3 right + 1 miss -> streak broken, no Stretch Challenge button
    const t1 = openPacket(html);
    t1.d.getElementById('learner-name').value = 'Noa';
    t1.button('Start').click();
    t1.q('[data-qc-choice="2"]').click(); t1.button('Next').click();
    t1.q('[data-qc-choice="2"]').click(); t1.button('Next').click();
    t1.q('[data-qc-choice="4"]').click(); t1.button('Next').click();
    t1.q('[data-qc-choice="3"]').click(); // wrong on item 4
    expect(t1.q('[data-adaptive-stretch]')).toBeNull();
    t1.dom.window.close();

    // Case 2: 2 consecutive misses schedule a reinforcement item; reloading mid-session restores it
    const t2 = openPacket(html);
    t2.d.getElementById('learner-name').value = 'Rami';
    t2.button('Start').click();
    t2.q('[data-qc-choice="1"]').click(); t2.button('Next').click();
    t2.q('[data-qc-choice="1"]').click(); // schedules reinforcement item #5
    t2.button('Next').click();
    const persisted = t2.w.localStorage.getItem('alloflow-take-home:adaptive-fractions-1:2026-11-24');
    t2.dom.window.close();

    // Reopen fresh DOM with saved localStorage
    const dom3 = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://alloflow.local/packet.html',
      beforeParse(w) {
        Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.localStorage.setItem('alloflow-take-home:adaptive-fractions-1:2026-11-24', persisted);
      },
    });
    const d3 = dom3.window.document;
    const btn3 = (txt) => [...d3.querySelectorAll('#app button')].find((b) => !b.hidden && b.textContent.trim() === txt);
    const contBtn = d3.querySelector('[data-continue]');
    expect(contBtn).toBeTruthy();
    contBtn.click();
    d3.querySelector('[data-qc-choice="4"]').click(); btn3('Next').click();
    d3.querySelector('[data-qc-choice="4"]').click(); btn3('Next').click();
    expect(d3.querySelector('[data-adaptive-banner="reinforce"]')).toBeTruthy();
    dom3.window.close();
  });

  it('preserves progress on reload when adaptiveScaffold inserts a reinforcement item AND repeatMissed references an item at index >= baseCount', async () => {
    const comboLesson = {
      schema: TH.LESSON_SCHEMA,
      lessonId: 'adaptive-repeat-combo',
      revision: '2026-11-24',
      title: 'Adaptive + Repeat Missed',
      repeatMissed: true,
      adaptiveScaffold: { missThreshold: 2 },
      blocks: [
        {
          activity: 'quick_choice',
          items: [
            { id: 'b0-1', skill: 'a', word: '1+1', target: '2', choices: ['1', '2'], maxAttempts: 1 },
            { id: 'b0-2', skill: 'a', word: '2+2', target: '4', choices: ['3', '4'], maxAttempts: 1 },
          ],
        },
        {
          activity: 'quick_choice',
          items: [
            { id: 'b1-1', skill: 'b', word: '3+3', target: '6', choices: ['5', '6'], maxAttempts: 1 },
            { id: 'b1-2', skill: 'b', word: '4+4', target: '8', choices: ['7', '8'], maxAttempts: 1 },
          ],
        },
      ],
    };
    const html = TH.buildHtml(comboLesson, { extraAdapters: { quick_choice: renderQuickChoice } });
    await expectClosedVerified(html);
    const key = 'alloflow-take-home:adaptive-repeat-combo:2026-11-24';

    const t = openPacket(html);
    t.d.getElementById('learner-name').value = 'Maya';
    t.button('Start').click();
    // Miss both Block 0 items -> reinforcement inserted at index 2 (items.length becomes 5, baseCount was 4)
    t.q('[data-qc-choice="1"]').click(); t.button('Next').click();
    t.q('[data-qc-choice="3"]').click(); t.button('Next').click();
    // Complete reinforcement item (index 2)
    expect(t.q('[data-adaptive-banner="reinforce"]')).toBeTruthy();
    t.q('[data-qc-choice="4"]').click(); t.button('Next').click();
    // Block 1 item 1 (index 3): right; Block 1 item 2 (index 4 >= baseCount!): miss
    t.q('[data-qc-choice="6"]').click(); t.button('Next').click();
    t.q('[data-qc-choice="7"]').click(); t.button('See my results').click();

    // repeatMissed appends missed indices [0, 1, 4] -> state.items has 8 entries, sitting on index 5
    const persisted = t.w.localStorage.getItem(key);
    const saved = JSON.parse(persisted);
    expect(saved.again).toEqual([0, 1, 4]);
    expect(saved.items).toHaveLength(8);
    expect(saved.index).toBe(5);
    t.dom.window.close();

    // Reload in fresh DOM -> load() must NOT wipe progress when parsed.again contains index 4 >= baseCount
    const dom2 = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://alloflow.local/packet.html',
      beforeParse(w) {
        Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.localStorage.setItem(key, persisted);
      },
    });
    const d2 = dom2.window.document;
    const btn2 = (txt) => [...d2.querySelectorAll('#app button')].find((b) => !b.hidden && b.textContent.trim() === txt);
    const cont = d2.querySelector('[data-continue]');
    expect(cont).toBeTruthy();
    cont.click();
    // Finish the 3 repeated missed items (indices 5, 6, 7)
    d2.querySelector('[data-qc-choice="2"]').click(); btn2('Next').click();
    d2.querySelector('[data-qc-choice="4"]').click(); btn2('Next').click();
    d2.querySelector('[data-qc-choice="8"]').click(); btn2('See my results').click();
    const finalState = JSON.parse(dom2.window.localStorage.getItem(key));
    expect(finalState.items).toHaveLength(8);
    expect(finalState.finishedAt).toBeTruthy();
    dom2.window.close();
  });
});

describe('Wave 1B — Bilingual / Home-Language Bridge (Zero-AI Curated Lexicons + RTL)', () => {
  it('provides curated static directions and Family Note in all 6 languages with Arabic RTL and allowlisted bundling', () => {
    expect(SB.SUPPORTED_LANGUAGES).toEqual(['es', 'pt', 'fr', 'ar', 'vi', 'zh']);
    for (const code of SB.SUPPORTED_LANGUAGES) {
      const pack = SB.LANGUAGES[code];
      expect(pack.nativeName.length).toBeGreaterThan(0);
      expect(pack.dir).toBe(code === 'ar' ? 'rtl' : 'ltr');
      expect(pack.strings.intro.length).toBeGreaterThan(10);
      expect(pack.strings.family_note.length).toBeGreaterThan(20);
      expect(pack.strings.save_work.length).toBeGreaterThan(1);
      expect(pack.strings.station_next.length).toBeGreaterThan(1);
    }
    // Allowlist: Spanish + Arabic bundle does NOT embed fr/pt/vi/zh
    const bundle = SB.bilingualBundle(['es', 'ar'], { volcano: { es: 'volc\u00e1n', ar: '\u0628\u0631\u0643\u0627\u0646', fr: 'volcan' } });
    expect(bundle.codes).toEqual(['es', 'ar', 'fr']);
    expect(Object.keys(bundle.packs)).toEqual(['es', 'ar', 'fr']);
    expect(bundle.packs.pt).toBeUndefined();
    expect(bundle.packs.zh).toBeUndefined();
  });

  it('embeds compact header toggle inside .lt-bar, renders side-by-side directions, glossary, Family Note, and dir="rtl" for Arabic, and passes verifyPacket', async () => {
    const lesson = {
      schema: TH.LESSON_SCHEMA,
      lessonId: 'bilingual-earth-1',
      revision: '2026-11-24',
      title: 'Earth Science Words',
      homeLanguages: ['es', 'ar', 'zh'],
      bilingualGlossary: {
        volcano: { es: 'volc\u00e1n', ar: '\u0628\u0631\u0643\u0627\u0646', zh: '\u706b\u5c71' },
      },
      blocks: [{
        activity: 'quick_choice',
        items: [{ id: 'v1', word: 'volcano', prompt: 'Which word names a mountain that erupts lava?', target: 'volcano', choices: ['volcano', 'river', 'cloud'] }],
      }],
    };
    const html = TH.buildHtml(lesson, { extraAdapters: { quick_choice: renderQuickChoice } });
    await expectClosedVerified(html);
    // Unused languages (pt, fr, vi) are NOT embedded
    expect(html).not.toContain('Portugu\u00eas');
    expect(html).not.toContain('Ti\u1ebfng Vi\u1ec7t');

    const t = openPacket(html);
    // Compact toggle sits inside .lt-bar preserving #app > h2 + .lt-bar + #lt-panel contract
    const bar = t.q('.lt-bar');
    expect(bar.querySelector('[data-bilingual-bar]')).toBeTruthy();
    expect(t.q('#app > h2').nextElementSibling).toBe(bar);

    // Switch to Arabic -> dir="rtl" on localized banners & Family Note, accessible names on <section>, global <html dir> stays untouched
    t.q('[data-bilingual-lang="ar"]').click();
    const startBanner = t.q('[data-bilingual-banner="start"]');
    expect(startBanner).toBeTruthy();
    expect(startBanner.getAttribute('dir')).toBe('rtl');
    expect(startBanner.getAttribute('lang')).toBe('ar');
    expect(startBanner.getAttribute('aria-label')).toBeTruthy();
    expect(SB.BILINGUAL_CSS).toContain('.bi-btn{min-height:44px;min-width:44px');
    expect(t.q('[data-bilingual-family]').getAttribute('dir')).toBe('rtl');
    expect(t.d.documentElement.getAttribute('dir')).toBeNull();

    // Start practice -> item screen shows Arabic directions + glossary entry for 'volcano'
    t.d.getElementById('learner-name').value = 'Layla';
    t.button('Start').click();
    const itemGloss = t.q('[data-bilingual-glossary="item"]');
    expect(itemGloss).toBeTruthy();
    expect(itemGloss.getAttribute('dir')).toBe('rtl');
    expect(itemGloss.textContent).toContain('volcano');
    expect(itemGloss.textContent).toContain('\u0628\u0631\u0643\u0627\u0646');

    // Switch to Spanish mid-item -> updates live and logs bilingualBridge support
    t.q('[data-bilingual-lang="es"]').click();
    expect(t.q('[data-bilingual-banner="item"]').getAttribute('dir')).toBe('ltr');
    expect(t.q('[data-bilingual-glossary="item"]').textContent).toContain('volc\u00e1n');

    // Switch back to EN -> hides bilingual region
    t.q('[data-bilingual-lang=""]').click();
    expect(t.q('[data-bilingual-region="item"]').hidden).toBe(true);

    // Finish -> switch to Simplified Chinese on finish screen
    t.q('[data-qc-choice="volcano"]').click();
    t.button('See my results').click();
    t.q('[data-bilingual-lang="zh"]').click();
    const finishBanner = t.q('[data-bilingual-banner="finish"]');
    expect(finishBanner.getAttribute('lang')).toBe('zh');
    expect(finishBanner.getAttribute('aria-label')).toBeTruthy();
    expect(t.q('[data-bilingual-family]').textContent).toContain('\u79bb\u7ebf');

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:bilingual-earth-1:2026-11-24'));
    expect(saved.items[0].supports.bilingualBridge).toBeGreaterThanOrEqual(1);
    t.dom.window.close();
  });

  it('supports single-language compact toggle and reusable maker DOM helpers (createStationConfigControl, createBilingualPickerControl)', async () => {
    const singleLesson = {
      schema: TH.LESSON_SCHEMA, lessonId: 'bi-single-es', revision: '2026-11-24', title: 'Single Lang',
      homeLanguages: ['es'],
      blocks: [{ activity: 'quick_choice', items: [{ id: 's1', word: 'sun', target: 'sun', choices: ['sun', 'moon'] }] }],
    };
    const html = TH.buildHtml(singleLesson, { extraAdapters: { quick_choice: renderQuickChoice } });
    await expectClosedVerified(html);
    const t = openPacket(html);
    const btns = t.qa('[data-bilingual-bar] button');
    expect(btns).toHaveLength(1);
    expect(btns[0].getAttribute('data-bilingual-lang')).toBe('es');
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
    btns[0].click();
    expect(btns[0].getAttribute('aria-pressed')).toBe('true');
    expect(t.q('[data-bilingual-banner="start"]').getAttribute('lang')).toBe('es');
    btns[0].click();
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
    expect(t.q('[data-bilingual-region="start"]').hidden).toBe(true);
    t.dom.window.close();

    // Reusable maker DOM helpers
    const host = new JSDOM('<!doctype html><html><body></body></html>');
    const doc = host.window.document;
    let stVal = false, langsVal = [];
    const stCtrl = SB.createStationConfigControl(doc, { id: 'm-st', onChange: (v) => { stVal = v; } });
    doc.body.appendChild(stCtrl.node);
    expect(stCtrl.isEnabled()).toBe(false);
    stCtrl.input.checked = true;
    stCtrl.input.dispatchEvent(new host.window.Event('change'));
    expect(stVal).toBe(true);
    expect(stCtrl.isEnabled()).toBe(true);

    const biCtrl = SB.createBilingualPickerControl(doc, { selected: ['es'], onChange: (v) => { langsVal = v; } });
    doc.body.appendChild(biCtrl.node);
    expect(biCtrl.getSelected()).toEqual(['es']);
    const arBox = biCtrl.node.querySelector('input[value="ar"]');
    arBox.checked = true;
    arBox.dispatchEvent(new host.window.Event('change'));
    expect(langsVal).toEqual(['es', 'ar']);
    host.window.close();
  });
});

describe('Wave 1B — Pluggable extraAdapters & extraCss hook (combined Wave 1B stress check)', () => {
  it('builds a full-stack packet (extraAdapters + extraCss + Sealed QR + Station Mode + Adaptive + Bilingual) with zero WS_CORE and closed verifyPacket', async () => {
    const kp = Q.generateKeyPair('Wave 2-4 Proof');
    const lesson = {
      schema: TH.LESSON_SCHEMA,
      lessonId: 'extra-adapter-full',
      revision: '2026-11-24',
      title: 'Concept Sort Preview',
      homeLanguages: ['es', 'ar'],
      bilingualGlossary: { mammal: { es: 'mam\u00edfero', ar: '\u062b\u062f\u064a\u064a' } },
      adaptiveScaffold: true,
      blocks: [{
        activity: 'concept_sort_demo',
        items: [{ id: 'cs1', word: 'mammal', target: 'warm-blooded', choices: ['warm-blooded', 'cold-blooded'] }],
      }],
    };
    const html = TH.buildHtml(lesson, {
      extraAdapters: {
        concept_sort_demo: {
          title: 'Concept Sort Demo',
          render: renderQuickChoice,
          css: '.cs-pill{border-radius:999px}',
        },
      },
      extraCss: '.cs-card{padding:8px}',
      qrPublicKey: kp.publicKey,
      stationMode: true,
    });
    expect(html).toContain('/*afextra-css*/');
    expect(html).toContain('.cs-pill{border-radius:999px}');
    expect(html).toContain('.cs-card{padding:8px}');
    await expectClosedVerified(html);

    const t = openPacket(html);
    t.d.getElementById('learner-name').value = 'Aria Lin';
    t.button('Start').click();
    t.q('[data-qc-choice="warm-blooded"]').click();
    t.button('See my results').click();

    // Sealed QR unlocks cleanly and preserves extra adapter activity title
    t.q('[data-teacher-confer] [data-qr-toggle]').click();
    const code = t.q('[data-teacher-confer] [data-qr-code]').textContent.trim();
    const dec = Q.unsealResult(code, kp.secretKey);
    expect(dec.ok).toBe(true);
    expect(dec.result.learnerName).toBe('Aria Lin');
    expect(dec.result.activityTitles.concept_sort_demo).toBe('Concept Sort Demo');
    expect(dec.result.items[0].correct).toBe(true);
    t.dom.window.close();
  });

  it('rejects unsafe extraAdapters keys, non-serializable renderers, and unsafe extraCss', () => {
    const base = {
      schema: TH.LESSON_SCHEMA, lessonId: 'x', revision: '1', title: 'Bad',
      blocks: [{ activity: 'ok_act', items: [{ id: '1', word: 'a', target: 'a' }] }],
    };
    expect(() => TH.buildHtml(base, { extraAdapters: { 'Bad-Name!': renderQuickChoice } })).toThrow(/Invalid extraAdapters/);
    expect(() => TH.buildHtml(base, { extraAdapters: { ok_act: Math.max } })).toThrow(/plain serializable/);
    expect(() => TH.buildHtml(base, { extraAdapters: { ok_act: renderQuickChoice }, extraCss: 'a{}</style><script>' })).toThrow(/closing style tag/);
    expect(() => TH.buildHtml(base, { extraAdapters: { ok_act: renderQuickChoice }, extraCss: '@import "evil.css";' })).toThrow(/extraCss cannot reference/);
    expect(() => TH.buildHtml(base, { extraAdapters: { ok_act: renderQuickChoice }, extraCss: 'body{background:url(https://evil.test/x)}' })).toThrow(/extraCss cannot reference/);
  });

  it('wires ctx.keypad when extraAdapters entry requests keypad:true and preserves extraAdapters/Bilingual/Adaptive through attachQrKey', async () => {
    function renderKeypadProbe(item, ctx) {
      const pad = ctx.keypad({ onNext: function (v) { ctx.answer(v, v === item.target); } });
      ctx.root.appendChild(ctx.el('p', { class: 'letters', text: item.word }));
      ctx.root.appendChild(pad.node);
    }
    const lesson = {
      schema: TH.LESSON_SCHEMA, lessonId: 'extra-keypad-1', revision: '2026-11-24', title: 'Number Line',
      homeLanguages: ['es'], adaptiveScaffold: true,
      blocks: [{ activity: 'number_line_demo', items: [{ id: 'nl1', word: '3 + 4 = ?', target: '7' }] }],
    };
    const plain = TH.buildHtml(lesson, {
      extraAdapters: { number_line_demo: { title: 'Number Line', render: renderKeypadProbe, keypad: true, css: '.nl-box{padding:4px}' } },
    });
    const kp = Q.generateKeyPair('Math Lab');
    const sealed = TH.attachQrKey(plain, kp.publicKey, { stationMode: true });
    expect(sealed.ok).toBe(true);
    expect(sealed.html).toContain('/*afextra-css*/');
    expect(sealed.html).toContain('.nl-box{padding:4px}');
    expect(sealed.html).toContain('kit.bilingual=');
    expect(sealed.html).toContain('kit.adaptive=');
    await expectClosedVerified(sealed.html);

    const t = openPacket(sealed.html);
    t.d.getElementById('learner-name').value = 'Sam';
    t.button('Start').click();
    t.type('7');
    t.button('See my results').click();
    expect(t.q('[data-station-next]')).toBeTruthy();
    t.dom.window.close();
  });
});
