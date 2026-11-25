// Wave 3A Tests: Interactive Visual Math Manipulative Packets
// (Base-Ten Blocks, Fraction Bars, Interactive Number Line, Balance-Scale Equations),
// Practice & Check modes, Wave 1B Adaptive/Bilingual/Station/Sealed QR integration,
// packets-manipulatives.html maker + Reopen + Batch .zip, verifyPacket closed verdict, and #5 invariants.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const M = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const SITE = require(path.join(ROOT, 'dev-tools/build_packets_site.cjs'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;

const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;

function openPacket(html) {
  let clock = 2000;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/manipulative.html',
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
  return {
    dom, w: dom.window, d, q, qa, seen, button,
    tick: (ms) => { clock += ms; },
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

describe('Wave 3A — Base-Ten Blocks (manip_base_ten)', () => {
  it('supports adding/removing blocks, trading 10 ones <-> 1 ten and 10 tens <-> 1 hundred, exact regrouping validation, and focus retention', async () => {
    const made = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_base_ten',
      starterId: 'b10_regroup_add_g3',
      items: [
        { id: 'reg-1', word: 'Regroup 2T 14O', prompt: 'Regroup 2 tens and 14 ones.', start: { hundreds: 0, tens: 2, ones: 14 }, targetValue: 34, target: '34', match: 'exact', hint: 'Trade 10 ones for 1 ten.' },
        { id: 'val-2', word: '124', prompt: 'Build 124.', targetValue: 124, target: '124', match: 'value' },
      ],
    });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Leo';
    t.button('Start').click();

    // Item 1 starts with 2 tens and 14 ones (total 34, unregrouped)
    expect(t.q('[data-b10-readout]').textContent).toContain('34');
    // Submitting unregrouped triggers retry guidance in exact mode
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Trade');

    // Open hint
    t.q('[data-mn-hint-btn]').click();
    expect(t.q('[data-mn-hint]').hidden).toBe(false);

    // Focus Trade 10 ones -> 1 ten and press click: button disables (only 4 ones left), focus must NOT drop to body
    const tradeBtn = t.q('[data-b10-trade="o2t"]');
    tradeBtn.focus();
    tradeBtn.click();
    expect(tradeBtn.disabled).toBe(true);
    expect(t.d.activeElement).not.toBe(t.d.body);
    expect(t.q('[data-b10-count="t"]').textContent).toBe('3');
    expect(t.q('[data-b10-count="o"]').textContent).toBe('4');

    // Check regrouped answer -> correct!
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('Next').click();

    // Item 2: build 124 (value mode -> 1H 2T 4O, also test Break 1 ten -> 10 ones and trade back)
    t.q('[data-b10-inc="h"]').click();
    for (let i = 0; i < 2; i++) t.q('[data-b10-inc="t"]').click();
    for (let i = 0; i < 4; i++) t.q('[data-b10-inc="o"]').click();
    t.q('[data-b10-trade="t2o"]').click();
    expect(t.q('[data-b10-count="t"]').textContent).toBe('1');
    expect(t.q('[data-b10-count="o"]').textContent).toBe('14');
    // Total is still 124 -> accepted in value mode!
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items[0].correct).toBe(true);
    expect(saved.items[0].supports.regroup).toBe(1);
    expect(saved.items[0].supports.hint).toBe(1);
    expect(saved.items[1].firstTry).toBe(true);
    t.dom.window.close();
  });
});

describe('Wave 3A — Fraction Bars (manip_fraction_bars)', () => {
  it('supports equivalent shading, forbidDenom check, keyboard ArrowRight navigation, compare (< = >), and fraction addition', async () => {
    const made = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_fraction_bars',
      items: [
        { id: 'f1', word: 'Equiv 1/2', prompt: 'Build equivalent to 1/2 using a new bar.', task: 'build', match: 'equivalent', forbidDenom: 2, targetNum: 1, targetDen: 2, denominators: [2, 4, 6, 8], startDenom: 2, referenceBars: [{ label: 'Ref 1/2', num: 1, den: 2 }] },
        { id: 'f2', word: '2/3 ? 3/6', prompt: 'Compare 2/3 and 3/6.', task: 'compare', targetSymbol: '>', referenceBars: [{ label: '2/3', num: 2, den: 3 }, { label: '3/6', num: 3, den: 6 }] },
        { id: 'f3', word: '1/2 + 1/4', prompt: 'Shade 1/2 + 1/4.', task: 'add', match: 'equivalent', targetNum: 3, targetDen: 4, denominators: [4, 8], startDenom: 8, referenceBars: [{ label: '1/2', num: 1, den: 2 }, { label: '1/4', num: 1, den: 4 }] },
      ],
    });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Maya';
    t.button('Start').click();

    // Item 1: shading 1/2 on forbidden denominator 2 prompts retry
    t.q('[data-fb-part="0"]').click();
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('different bar size');

    // Switch to sixths (1/6), shade 3 parts (3/6 = 1/2), verify ArrowRight moves focus
    t.q('[data-fb-denom="6"]').click();
    const p0 = t.q('[data-fb-part="0"]');
    p0.focus();
    p0.click();
    expect(t.d.activeElement.getAttribute('data-fb-part')).toBe('0');
    t.d.activeElement.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(t.d.activeElement.getAttribute('data-fb-part')).toBe('1');
    t.q('[data-fb-part="1"]').click();
    t.q('[data-fb-part="2"]').click();
    expect(t.q('[data-fb-readout]').textContent).toContain('3/6');
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('Next').click();

    // Item 2: compare 2/3 > 3/6
    t.q('[data-fb-cmp=">"]').click();
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('Next').click();

    // Item 3: add 1/2 + 1/4 = 6/8 (equivalent to 3/4)
    for (let i = 0; i < 6; i++) t.q('[data-fb-part="' + i + '"]').click();
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items.every((r) => r.correct)).toBe(true);
    expect(saved.items[0].responses).toEqual(['1/2', '3/6']);
    expect(saved.items[1].responses).toEqual(['>']);
    expect(saved.items[2].responses).toEqual(['6/8']);
    t.dom.window.close();
  });
});

describe('Wave 3A — Interactive Number Line (manip_number_line)', () => {
  it('supports signed integer hops, fractional fourths steps, direct stop clicks, ArrowRight stepping, undo, and reset', async () => {
    const made = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_number_line',
      starterId: 'nl_integers_fracs_g6',
    });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Noah';
    t.button('Start').click();

    // Item 1: 3 + (-5) = -2 on -6..6
    t.q('[data-nl-hop="-5"]').click();
    expect(t.q('[data-nl-readout]').textContent).toContain('-2');
    // Test undo + redo via hops
    t.q('[data-nl-undo]').click();
    expect(t.q('[data-nl-readout]').textContent).toContain('Point at 3');
    t.q('[data-nl-hop="-5"]').click();
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('Next').click();

    // Item 2: -4 + 7 = 3 using +5 then +1 twice
    t.q('[data-nl-hop="+5"]').click();
    t.q('[data-nl-hop="+1"]').click();
    t.q('[data-nl-hop="+1"]').click();
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('Next').click();

    // Item 3: 1/4 + 1/2 = 3/4 on fourths line
    t.q('[data-nl-hop="+1/2"]').click();
    expect(t.q('[data-nl-readout]').textContent).toContain('3/4');
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('Next').click();

    // Item 4: plot 5/4 via direct stop click + ArrowRight check
    const stop1 = t.q('[data-nl-stop="1"]');
    stop1.focus();
    stop1.click();
    stop1.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(t.q('[data-nl-readout]').textContent).toContain('5/4');
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Right');
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items.every((r) => r.firstTry)).toBe(true);
    expect(saved.items.map((r) => r.responses[0])).toEqual(['-2', '3', '3/4', '5/4']);
    t.dom.window.close();

    // Regression (#25): 0..20 renders all 21 stops (stride 1) and wide 0..100 keeps ArrowRight cur & focus synced
    const wideMade = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_number_line',
      items: [
        { id: 'w1', word: '10', min: 0, max: 20, step: 1, denom: 1, start: 0, targetValue: 10 },
        { id: 'w2', word: '15', min: 0, max: 100, step: 1, denom: 1, start: 0, targetValue: 15 },
      ],
    });
    const tw = openPacket(wideMade.html);
    tw.d.getElementById('learner-name').value = 'Lin';
    tw.button('Start').click();
    expect(tw.qa('[data-nl-stop]')).toHaveLength(21);
    tw.q('[data-nl-stop="10"]').click();
    tw.q('[data-mn-submit]').click();
    tw.button('Next').click();
    const s0 = tw.q('[data-nl-stop="0"]');
    s0.focus();
    s0.dispatchEvent(new tw.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const focusedVal = tw.d.activeElement.getAttribute('data-nl-stop');
    expect(tw.q('[data-nl-readout]').textContent).toContain('Point at ' + focusedVal);
    tw.dom.window.close();
  });
});

describe('Wave 3A — Balance-Scale Equations (manip_balance_scale)', () => {
  it('solves 1-step and 2-step equations via matching pan operations, tilts on wrong check, splits equal groups, and logs equation steps', async () => {
    const made = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_balance_scale',
      items: [
        { id: 'eq1', word: '2x + 2 = 10', prompt: 'Solve 2x + 2 = 10.', a: 2, b: 2, c: 10, targetX: 4, target: 'x=4' },
        { id: 'eq2', word: '2x - 4 = 6', prompt: 'Solve 2x - 4 = 6.', a: 2, b: -4, c: 6, targetX: 5, target: 'x=5' },
      ],
    });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Zoe';
    t.button('Start').click();

    // Wrong guess tilts the beam
    t.q('[data-bal-x]').value = '6';
    t.q('[data-mn-submit]').click();
    expect(t.q('.bal-beam').getAttribute('data-tilt')).toBe('left');
    expect(t.q('[data-feedback]').textContent).toContain('left pan weighs 14');

    // Remove 1 from both sides twice -> 2x = 8
    expect(t.q('[data-bal-op="div"]').disabled).toBe(true);
    t.q('[data-bal-op="sub1"]').click();
    t.q('[data-bal-op="sub1"]').click();
    expect(t.q('[data-bal-eq]').textContent).toBe('2x = 8');

    // Split into 2 equal groups -> x = 4 (div button disables, focus moves cleanly to submit)
    const divBtn = t.q('[data-bal-op="div"]');
    expect(divBtn.disabled).toBe(false);
    divBtn.focus();
    divBtn.click();
    expect(t.q('[data-bal-eq]').textContent).toBe('x = 4');
    expect(t.q('[data-bal-x]').value).toBe('4');
    expect(t.d.activeElement).toBe(t.q('[data-mn-submit]'));
    expect(t.qa('[data-bal-log] li')).toHaveLength(4);

    t.q('[data-mn-submit]').click();
    expect(t.q('.bal-beam').getAttribute('data-tilt')).toBe('level');
    expect(t.q('[data-feedback]').textContent).toContain('Balanced');
    t.button('Next').click();

    // Item 2: 2x - 4 = 6 -> add 1 four times to both sides -> 2x = 10 -> divide by 2 -> x = 5
    for (let i = 0; i < 4; i++) t.q('[data-bal-op="add1"]').click();
    expect(t.q('[data-bal-eq]').textContent).toBe('2x = 10');
    t.q('[data-bal-op="div"]').click();
    expect(t.q('[data-bal-eq]').textContent).toBe('x = 5');
    t.q('[data-mn-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Balanced');
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items[0].correct).toBe(true);
    expect(saved.items[0].supports.balanceStep).toBe(3);
    expect(saved.items[1].firstTry).toBe(true);
    expect(saved.items[1].responses).toEqual(['x=5']);
    t.dom.window.close();
  });
});

describe('Wave 3A — Check mode, Adaptive Scaffolding, Bilingual RTL, Station Mode & Sealed QR', () => {
  it('runs Check mode with scoreUnit=items_correct, zero plaintext answer leakage, deterministic scoring, and Sealed QR + CSV round-trip', async () => {
    const kp = Q.generateKeyPair('Math Check');
    for (const act of M.ACTIVITIES) {
      const made = M.buildManipulativePacket({
        loader: TH,
        activity: act,
        mode: 'probe',
        form: 'Form B',
        teacherCode: 'maple-42',
        qrPublicKey: kp.publicKey,
        qrCrypto: Q,
        stationMode: true,
        homeLanguages: ['es', 'ar'],
        stationBilingual: SB,
      });
      expect(made.lesson.check.scoreUnit).toBe('items_correct');
      await expectClosedVerified(made.html);
      // Verify check answers are scrambled (no targetValue/targetNum/targetX/targetSymbol in embedded lesson)
      const lessonJson = /var lesson=(.*);\nvar labels=/.exec(made.html)[1];
      expect(lessonJson).not.toContain('"targetValue"');
      expect(lessonJson).not.toContain('"targetNum"');
      expect(lessonJson).not.toContain('"targetX"');
      expect(lessonJson).not.toContain('"targetSymbol"');
    }

    // Full JSDOM Check run on Balance Scale + Sealed QR unseal + CSV reader
    const checkMade = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_balance_scale',
      mode: 'probe',
      items: [
        { id: 'ck1', word: 'x + 3 = 7', a: 1, b: 3, c: 7, targetX: 4 },
        { id: 'ck2', word: '2x = 8', a: 2, b: 0, c: 8, targetX: 4 },
      ],
      qrPublicKey: kp.publicKey,
      qrCrypto: Q,
    });
    const t = openPacket(checkMade.html);
    t.d.getElementById('learner-name').value = 'Samira';
    t.button('Next').click();
    t.q('[data-check-begin]').click();
    // Regression (#25): empty Submit in Check mode must NOT throw when ctx.feedback is absent
    t.tick(500);
    expect(() => t.q('[data-mn-submit]').click()).not.toThrow();
    expect(t.q('[data-bal-readout]').textContent).toContain('type a number for x first');
    // Item 1: right (x=4)
    t.tick(500);
    t.q('[data-bal-x]').value = '4';
    t.q('[data-mn-submit]').click();
    // Item 2: wrong (x=3)
    t.tick(500);
    t.q('[data-bal-x]').value = '3';
    t.q('[data-mn-submit]').click();

    // Sealed QR inside For the teacher card
    t.q('[data-teacher] [data-qr-toggle]').click();
    const code = t.q('[data-teacher] [data-qr-code]').textContent.trim();
    const dec = Q.unsealResult(code, kp.secretKey);
    expect(dec.ok).toBe(true);
    expect(dec.result.learnerName).toBe('Samira');
    expect(dec.result.packet.mode).toBe('check');
    expect(TH.parseResult(dec.result).result.mode).toBe('probe');
    expect(dec.result.score.itemsCorrect).toBe(1);
    expect(dec.result.score.itemsAttempted).toBe(2);
    expect(dec.result.score.scoreUnit).toBe('items_correct');

    // CSV round-trip through packets_results_reader
    const csvTable = TH.resultsCsv(dec.result);
    const dig = TH.sha256(csvTable.basis);
    const parsed = await R.read(csvTable.text({ method: 'sha256', value: dig.hex }), { name: 'check.csv' });
    expect(parsed.ok).toBe(true);
    expect(parsed.sessions[0].integrity).toBe('ok');
    expect(parsed.sessions[0].score.itemsCorrect).toBe(1);
    t.dom.window.close();

    // Regression (#25): empty Submit on Fraction Bars compare Check mode does NOT throw
    const cmpCheck = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_fraction_bars',
      mode: 'probe',
      items: [{ id: 'cc1', word: '2/3 ? 3/6', task: 'compare', targetSymbol: '>', referenceBars: [{ label: '2/3', num: 2, den: 3 }, { label: '3/6', num: 3, den: 6 }] }],
    });
    const tc = openPacket(cmpCheck.html);
    tc.d.getElementById('learner-name').value = 'Omar';
    tc.button('Next').click();
    tc.q('[data-check-begin]').click();
    tc.tick(500);
    expect(() => tc.q('[data-mn-submit]').click()).not.toThrow();
    expect(tc.q('[data-fb-readout]').textContent).toContain('Choose <, =, or > first.');
    tc.q('[data-fb-cmp=">"]').click();
    tc.q('[data-mn-submit]').click();
    expect(tc.q('[data-teacher]')).toBeTruthy();
    tc.dom.window.close();
  });

  it('integrates Wave 1B Adaptive Scaffolding (2-miss hint+reinforcement and 4-streak Stretch Challenge), Bilingual Arabic RTL, and attachQrKey parity', async () => {
    const kp = Q.generateKeyPair('Adaptive Room');
    const plain = M.buildManipulativePacket({
      loader: TH,
      activity: 'manip_base_ten',
      starterId: 'b10_place_value_g2',
      adaptiveScaffold: true,
      homeLanguages: ['es', 'ar'],
      bilingualGlossary: { blocks: { es: 'bloques', ar: '\u0645\u0643\u0639\u0628\u0627\u062a' } },
      stationBilingual: SB,
    });
    const attached = TH.attachQrKey(plain.html, kp.publicKey, { stationMode: true });
    expect(attached.ok).toBe(true);
    await expectClosedVerified(attached.html);

    // 4 consecutive first-try right answers unlock Stretch Challenge!
    const t = openPacket(attached.html);
    t.q('[data-bilingual-lang="ar"]').click();
    expect(t.q('[data-bilingual-banner="start"]').getAttribute('dir')).toBe('rtl');
    t.d.getElementById('learner-name').value = 'Tariq';
    t.button('Start').click();

    const buildNum = (h, tens, o) => {
      for (let i = 0; i < h; i++) t.q('[data-b10-inc="h"]').click();
      for (let i = 0; i < tens; i++) t.q('[data-b10-inc="t"]').click();
      for (let i = 0; i < o; i++) t.q('[data-b10-inc="o"]').click();
      t.q('[data-mn-submit]').click();
    };
    buildNum(0, 3, 4); t.button('Next').click(); // 34
    buildNum(0, 5, 7); t.button('Next').click(); // 57
    buildNum(1, 2, 6); t.button('Next').click(); // 126
    buildNum(2, 0, 5);                           // 205
    const stretchBtn = t.q('[data-adaptive-stretch]');
    expect(stretchBtn).toBeTruthy();
    stretchBtn.click();
    expect(t.q('[data-adaptive-banner="stretch"]')).toBeTruthy();
    buildNum(3, 4, 2); // Stretch: 342
    t.button('See my results').click();
    expect(t.q('[data-station-next]')).toBeTruthy();
    t.dom.window.close();
  });
});

describe('Wave 3A — Maker page (packets-manipulatives.html), Reopen, Batch .zip & #5 invariants', () => {
  it('passes all #5 static, CSP, US spelling, footer, proof fold, and build_packets_site.cjs plan checks', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-manipulatives.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'packets-manipulatives.css'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'packets-manipulatives.js'), 'utf8');
    const builderJs = fs.readFileSync(path.join(ROOT, 'packet_manipulative_builder.js'), 'utf8');

    // CSP & zero inline script/style/handlers/form
    expect(html).toContain("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'");
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/<form\b/i);

    // Proof fold, product name once, feedback footer, Look inside a file (never Check a file)
    expect(html.match(/AlloFlow Packets/g)).toHaveLength(1);
    expect(html).toContain('<details class="proof">');
    expect(html).toContain('This page runs without AI. No account. Nothing you choose leaves your device.');
    expect(html).toContain('<span id="file-count">fourteen</span>');
    expect(html).toContain('href="packets-verify.html">Look inside a file</a>');
    expect(html).toContain('<a href="packets-feedback.html#from-packets-manipulatives">Send feedback</a> <a href="./">More from AlloFlow</a>');
    expect(html + '\n' + js + '\n' + builderJs).not.toMatch(/Check a file/i);

    // Zero innerHTML / outerHTML / document.write / eval / new Function / external URLs
    for (const src of [js, builderJs]) {
      expect(src).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function|https?:\/\//i);
    }
    expect(css).not.toMatch(/@import|url\(|@font-face/i);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');

    // US English spelling everywhere + calm copy (no promise words or exclamation marks in visible maker text)
    for (const src of [html, css, js, builderJs]) {
      expect(src).not.toMatch(BRITISH);
    }
    const staticDom = new JSDOM(html);
    const sDoc = staticDom.window.document;
    expect(sDoc.body.textContent).not.toMatch(/!/);
    expect(js).not.toMatch(/\b(?:safe|secure|guarantee|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i);

    // #5 A11y static DOM checks: single h1, no skipped heading levels, unique ids, button type=button, valid aria-describedby
    expect(sDoc.querySelectorAll('h1')).toHaveLength(1);
    const levels = [...sDoc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName.slice(1)));
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    const ids = [...sDoc.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const btn of sDoc.querySelectorAll('button')) expect(btn.getAttribute('type')).toBe('button');
    for (const refNode of sDoc.querySelectorAll('[aria-describedby]')) {
      for (const refId of refNode.getAttribute('aria-describedby').split(/\s+/).filter(Boolean)) {
        expect(sDoc.getElementById(refId), refId).toBeTruthy();
      }
    }
    staticDom.window.close();

    // Direct Check-mode adapter.score(item, expected, given) contract verification across all 4 manipulatives
    expect(M.ADAPTERS.manip_base_ten.score({}, '34', '34 (0H 3T 4O)').correct).toBe(true);
    expect(M.ADAPTERS.manip_base_ten.score({}, '34:0H3T4O', '34 (0H 2T 14O)').correct).toBe(false);
    expect(M.ADAPTERS.manip_base_ten.score({}, '34:0H3T4O', '34 (0H 3T 4O)').correct).toBe(true);
    expect(M.ADAPTERS.manip_fraction_bars.score({}, 'eq:1/2!2', '1/2').correct).toBe(false);
    expect(M.ADAPTERS.manip_fraction_bars.score({}, 'eq:1/2!2', '3/6').correct).toBe(true);
    expect(M.ADAPTERS.manip_fraction_bars.score({}, '>', '>').correct).toBe(true);
    expect(M.ADAPTERS.manip_number_line.score({}, '0.75', '3/4').correct).toBe(true);
    expect(M.ADAPTERS.manip_number_line.score({}, '-2', '-2').correct).toBe(true);
    expect(M.ADAPTERS.manip_balance_scale.score({}, 'x=4', 'x=4').correct).toBe(true);

    // Regression (#25): parseItemsText handles negative fractions on Number Line and avoids forbidden startDenom on Fraction Bars
    const nlParsed = M.parseItemsText('manip_number_line', '-1/2 | 1/2 | -2..2/2 | Hop from -1/2 to 1/2');
    expect(nlParsed).toHaveLength(1);
    expect(nlParsed[0].start).toBe(-0.5);
    expect(nlParsed[0].targetValue).toBe(0.5);
    const fbParsed = M.parseItemsText('manip_fraction_bars', 'equiv | 1/8 | Equivalent to 1/8 | 1/8');
    expect(fbParsed).toHaveLength(1);
    expect(fbParsed[0].forbidDenom).toBe(8);
    expect(fbParsed[0].startDenom).not.toBe(8);

    // All local script/link targets exist on disk
    const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((m) => m[1]).filter((r) => r !== './');
    for (const ref of refs) {
      expect(fs.existsSync(path.join(ROOT, ref)), ref).toBe(true);
    }

    // Site build drift check passes cleanly
    const plan = SITE.plan();
    expect(plan.pages.some((p) => p.endsWith('packets-manipulatives.html'))).toBe(true);
  });

  it('builds a packet from packets-manipulatives.html UI, supports custom editing, batch .zip, and Reopen .html round-trip', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-manipulatives.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'packets-manipulatives.js'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://alloflow.local/packets-manipulatives.html', runScripts: 'outside-only' });
    const win = dom.window;
    const doc = win.document;
    win.AlloPacketManipulatives = M;
    win.AlloWordSoundsTakeHome = TH;
    win.AlloPacketStationBilingual = SB;
    win.AlloPacketQrCrypto = Q;
    win.AlloPacketVerify = V;
    win.AlloPacketZip = ZIP;
    const blobs = [];
    win.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:m-' + blobs.length; };
    win.URL.revokeObjectURL = () => {};
    win.eval(js);
    if (doc.readyState === 'loading') doc.dispatchEvent(new win.Event('DOMContentLoaded'));

    // Regression (#25): switching activity radio updates untouched starter title instead of keeping Base-Ten title
    const fbRadio = doc.querySelector('input[name="activity"][value="manip_fraction_bars"]');
    fbRadio.checked = true;
    fbRadio.dispatchEvent(new win.Event('change'));
    doc.getElementById('next-1').click();
    doc.getElementById('next-2').click();
    expect(doc.getElementById('f-title').value).toBe('Equivalent Fraction Bars');
    doc.getElementById('back-3').click();
    doc.getElementById('back-2').click();

    // Select Balance Scale starter set in Step 1
    const balCard = doc.querySelector('[data-starter-id="bal_two_step_g7"]');
    expect(balCard).toBeTruthy();
    balCard.click();
    doc.getElementById('f-adaptive').checked = true;
    doc.getElementById('f-adaptive').dispatchEvent(new win.Event('change'));

    // Move to Step 2, edit custom equation, enable Spanish + Station Mode
    doc.getElementById('next-1').click();
    const itemsArea = doc.getElementById('f-items');
    itemsArea.value = 'x + 4 = 9 | Solve x + 4 = 9. | Subtract 4 from both pans.\n2x + 2 = 12 | Solve 2x + 2 = 12.';
    itemsArea.dispatchEvent(new win.Event('input'));
    expect(doc.getElementById('items-parse-note').textContent).toContain('2 problems ready');

    const esBox = doc.querySelector('#bilingual-langs input[value="es"]');
    esBox.checked = true;
    esBox.dispatchEvent(new win.Event('change'));
    const stBox = doc.getElementById('f-station-mode');
    stBox.checked = true;
    stBox.dispatchEvent(new win.Event('change'));

    // Move to Step 3 and Save the file
    doc.getElementById('next-2').click();
    expect(doc.getElementById('summary').hidden).toBe(false);
    const beforeSave = blobs.length;
    doc.getElementById('save').click();
    expect(blobs.length).toBeGreaterThan(beforeSave);
    const savedHtml = await blobs[blobs.length - 1].text();
    await expectClosedVerified(savedHtml);

    // Reopen round-trip via readManipulativePacket
    const reopened = M.readManipulativePacket(savedHtml, V);
    expect(reopened.ok).toBe(true);
    expect(reopened.activity).toBe('manip_balance_scale');
    expect(reopened.items).toHaveLength(2);
    expect(reopened.adaptiveScaffold).toBe(true);
    expect(reopened.homeLanguages).toEqual(['es']);
    expect(reopened.stationMode).toBe(true);

    // Batch .zip for 2 students
    const batchArea = doc.getElementById('f-batch-names');
    batchArea.value = 'BlueFox1\nRedOwl2';
    batchArea.dispatchEvent(new win.Event('input'));
    const zipBtn = doc.getElementById('batch-make');
    expect(zipBtn.hidden).toBe(false);
    const beforeZip = blobs.length;
    zipBtn.click();
    expect(blobs.length).toBe(beforeZip + 1);
    expect(doc.getElementById('batch-said').textContent).toContain('.zip');

    dom.window.close();
  });
});
