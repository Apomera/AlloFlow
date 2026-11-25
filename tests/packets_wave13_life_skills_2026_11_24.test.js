// Wave 4A Tests: Life Skills & Transition Simulation Packets
// (Making Change & Budgeting, Transit & Schedule Reading, Kitchen & Home Safety,
// Laundry & Care Sorting, Community & Emergency Signs, and Community Transition Mix),
// Practice & Check modes, Adaptive/Bilingual RTL/Station/Sealed QR, maker UI + Reopen + Batch .zip,
// verifyPacket closed verdict, and all #5 static/CSP/a11y/US-spelling invariants.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const L = require(path.join(ROOT, 'packet_life_skills_builder.js'));
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
  let clock = 3000;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/life-skills.html',
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

describe('Wave 4A — Making Change & Budgeting (life_money)', () => {
  it('supports cents-exact US bills & coins tray (exact pay + making change), focus retention on disable, and $12 grocery budget builder', async () => {
    const made = L.buildLifeSkillsPacket({ loader: TH, starterId: 'ls_money_change' });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Jordan';
    t.button('Start').click();

    // Item 1: exact pay $2.75 (2x$1 + 3x25c), test add/remove focus retention when dec disables
    t.q('[data-lm-inc="b1"]').click();
    const decB1 = t.q('[data-lm-dec="b1"]');
    decB1.focus();
    decB1.click();
    expect(decB1.disabled).toBe(true);
    expect(t.d.activeElement).not.toBe(t.d.body);
    t.q('[data-lm-inc="b1"]').click();
    t.q('[data-lm-inc="b1"]').click();
    for (let i = 0; i < 3; i++) t.q('[data-lm-inc="c25"]').click();
    expect(t.q('[data-lm-readout]').textContent).toContain('$2.75 (275 cents)');
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Exact match');
    t.button('Next').click();

    // Item 2: make change $10 - $6.35 = $3.65 (3x$1 + 2x25c + 1x10c + 1x5c)
    for (let i = 0; i < 3; i++) t.q('[data-lm-inc="b1"]').click();
    t.q('[data-lm-inc="c25"]').click();
    t.q('[data-lm-inc="c25"]').click();
    t.q('[data-lm-inc="c10"]').click();
    t.q('[data-lm-inc="c5"]').click();
    expect(t.q('[data-lm-readout]').textContent).toContain('$3.65 (365 cents)');
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('Exact match');
    t.button('Next').click();

    // Item 3: make change $20 - $13.40 = $6.60 ($5 + $1 + 2x25c + 1x10c)
    t.q('[data-lm-inc="b5"]').click();
    t.q('[data-lm-inc="b1"]').click();
    t.q('[data-lm-inc="c25"]').click();
    t.q('[data-lm-inc="c25"]').click();
    t.q('[data-lm-inc="c10"]').click();
    t.q('[data-ls-submit]').click();
    t.button('Next').click();

    // Item 4: $12 budget -> picking Bread ($3.50) + Milk ($3.25) + Steak ($7.50) = $14.25 warns over budget!
    t.q('[data-lm-item="bread"]').click();
    t.q('[data-lm-item="milk"]').click();
    t.q('[data-lm-item="steak"]').click();
    expect(t.q('[data-lm-readout]').textContent).toContain('over $12.00');
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('over the $12.00 budget');
    // Swap Steak for Bananas ($2.00) -> $8.75 <= $12.00 -> right!
    t.q('[data-lm-item="steak"]').click();
    t.q('[data-lm-item="bananas"]').click();
    expect(t.q('[data-lm-readout]').textContent).toContain('$8.75');
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('$3.25 remaining');
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items.every((r) => r.correct)).toBe(true);
    expect(saved.items[0].responses).toEqual(['$2.75']);
    expect(saved.items[1].responses).toEqual(['$3.65']);
    expect(saved.items[2].responses).toEqual(['$6.60']);
    t.dom.window.close();
  });
});

describe('Wave 4A — Transit Schedules, Kitchen Safety, Laundry Sorting & Community Signs', () => {
  it('runs Transit Schedule table reading (life_transit) with accessible headers and choice feedback', async () => {
    const made = L.buildLifeSkillsPacket({ loader: TH, starterId: 'ls_transit_routes' });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Devon';
    t.button('Start').click();

    const tbl = t.q('[data-lt-schedule]');
    expect(tbl).toBeTruthy();
    expect(tbl.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThanOrEqual(4);
    expect(tbl.querySelectorAll('tbody th[scope="row"]').length).toBe(3);

    t.q('[data-ls-choice="b"]').click();
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('9:05 AM');
    t.button('Next').click();

    t.q('[data-ls-choice="b2"]').click(); t.q('[data-ls-submit]').click(); t.button('Next').click();
    t.q('[data-ls-choice="t102"]').click(); t.q('[data-ls-submit]').click(); t.button('Next').click();
    t.q('[data-ls-choice="25"]').click(); t.q('[data-ls-submit]').click(); t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items.every((r) => r.firstTry)).toBe(true);
    t.dom.window.close();
  });

  it('runs Kitchen Safety decisions and step-ordering sequences (life_kitchen) with boundary focus preservation', async () => {
    const made = L.buildLifeSkillsPacket({ loader: TH, starterId: 'ls_kitchen_safety' });
    await expectClosedVerified(made.html);

    const t = openPacket(made.html);
    t.d.getElementById('learner-name').value = 'Avery';
    t.button('Start').click();

    // Item 1: microwave foil decision
    t.q('[data-ls-choice="transfer"]').click();
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('glass or ceramic');
    t.button('Next').click();

    // Item 2: raw chicken prep sequence (shuffled deterministically) -> move steps into exact order & verify boundary focus
    const targetIds = ['wash_hands', 'cut_salad', 'prep_chicken', 'sanitize'];
    for (let pos = 0; pos < targetIds.length; pos++) {
      const id = targetIds[pos];
      while (true) {
        const rows = t.qa('[data-lk-step]').map((el) => el.getAttribute('data-lk-step'));
        const curIdx = rows.indexOf(id);
        if (curIdx <= pos) break;
        const upBtn = t.q('[data-lk-up="' + id + '"]');
        upBtn.focus();
        upBtn.click();
        expect(t.d.activeElement).not.toBe(t.d.body);
      }
    }
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-feedback]').textContent).toContain('cross-contamination');
    t.button('Next').click();

    // Item 3: stove grease flare-up decision
    t.q('[data-ls-choice="lid"]').click();
    t.q('[data-ls-submit]').click();
    t.button('Next').click();

    // Item 4: refrigerator leftovers sequence
    const seq2 = ['cool', 'label', 'chill', 'reheat'];
    for (let pos = 0; pos < seq2.length; pos++) {
      const id = seq2[pos];
      while (true) {
        const rows = t.qa('[data-lk-step]').map((el) => el.getAttribute('data-lk-step'));
        const curIdx = rows.indexOf(id);
        if (curIdx <= pos) break;
        t.q('[data-lk-up="' + id + '"]').click();
      }
    }
    t.q('[data-ls-submit]').click();
    t.button('See my results').click();

    const saved = JSON.parse(t.w.localStorage.getItem('alloflow-take-home:' + made.lesson.lessonId + ':' + made.lesson.revision));
    expect(saved.items.every((r) => r.firstTry)).toBe(true);
    t.dom.window.close();
  });

  it('runs Laundry load sorting & care-tag setting selection (life_laundry) and Community Signs (life_signs)', async () => {
    const madeL = L.buildLifeSkillsPacket({ loader: TH, starterId: 'ls_laundry_care' });
    await expectClosedVerified(madeL.html);

    const tl = openPacket(madeL.html);
    tl.d.getElementById('learner-name').value = 'Riley';
    tl.button('Start').click();

    // Item 1: sort 3 garments
    tl.q('[data-ll-assign="g1:lights"]').click();
    tl.q('[data-ll-assign="g2:darks"]').click();
    tl.q('[data-ll-assign="g3:delicates"]').click();
    tl.q('[data-ls-submit]').click();
    expect(tl.q('[data-feedback]').textContent).toContain('Whites & Lights');
    tl.button('Next').click();

    // Item 2: wool sweater care tag setting
    tl.q('[data-ls-choice="cold_air"]').click();
    tl.q('[data-ls-submit]').click();
    tl.button('Next').click();

    // Item 3: sort gym & work clothes
    tl.q('[data-ll-assign="g4:darks"]').click();
    tl.q('[data-ll-assign="g5:lights"]').click();
    tl.q('[data-ll-assign="g6:delicates"]').click();
    tl.q('[data-ls-submit]').click();
    tl.button('Next').click();

    // Item 4: cotton towels setting
    tl.q('[data-ls-choice="warm_med"]').click();
    tl.q('[data-ls-submit]').click();
    tl.button('See my results').click();
    const savedL = JSON.parse(tl.w.localStorage.getItem('alloflow-take-home:' + madeL.lesson.lessonId + ':' + madeL.lesson.revision));
    expect(savedL.items.every((r) => r.firstTry)).toBe(true);
    tl.dom.window.close();

    // Community & Emergency Signs
    const madeS = L.buildLifeSkillsPacket({ loader: TH, starterId: 'ls_community_signs' });
    await expectClosedVerified(madeS.html);
    const ts = openPacket(madeS.html);
    ts.d.getElementById('learner-name').value = 'Casey';
    ts.button('Start').click();
    expect(ts.q('[data-lg-sign="exit"]')).toBeTruthy();
    ts.q('[data-ls-choice="leave"]').click(); ts.q('[data-ls-submit]').click(); ts.button('Next').click();
    expect(ts.q('[data-lg-sign="danger"]')).toBeTruthy();
    ts.q('[data-ls-choice="leave_closed"]').click(); ts.q('[data-ls-submit]').click(); ts.button('Next').click();
    expect(ts.q('[data-lg-sign="caution"]')).toBeTruthy();
    ts.q('[data-ls-choice="slow"]').click(); ts.q('[data-ls-submit]').click(); ts.button('Next').click();
    expect(ts.q('[data-lg-sign="emergency"]')).toBeTruthy();
    ts.q('[data-ls-choice="collapse"]').click(); ts.q('[data-ls-submit]').click(); ts.button('See my results').click();
    const savedS = JSON.parse(ts.w.localStorage.getItem('alloflow-take-home:' + madeS.lesson.lessonId + ':' + madeS.lesson.revision));
    expect(savedS.items.every((r) => r.firstTry)).toBe(true);
    ts.dom.window.close();
  });
});

describe('Wave 4A — Mixed Transition Pack, Check mode, Bilingual RTL, Station Mode & Sealed QR', () => {
  it('runs Check mode across all 5 domains + mixed pack with scoreUnit=items_correct, empty-submit safety, zero answer leakage, and Sealed QR + CSV round-trip', async () => {
    const kp = Q.generateKeyPair('Transition Check');
    for (const act of [...L.ACTIVITIES, 'mixed']) {
      const made = L.buildLifeSkillsPacket({
        loader: TH,
        activity: act,
        mode: 'probe',
        teacherCode: 'oak-2026',
        qrPublicKey: kp.publicKey,
        qrCrypto: Q,
        stationMode: true,
        homeLanguages: ['es', 'ar'],
        stationBilingual: SB,
      });
      expect(made.lesson.check.scoreUnit).toBe('items_correct');
      await expectClosedVerified(made.html);
      const lessonJson = /var lesson=(.*);\nvar labels=/.exec(made.html)[1];
      expect(lessonJson).not.toContain('"targetCents"');
      expect(lessonJson).not.toContain('"targetId"');
      expect(lessonJson).not.toContain('"targetOrder"');
    }

    // End-to-end JSDOM Check run on a 2-item Transit + Signs mixed check, including empty-submit guard
    const mixCheck = L.buildLifeSkillsPacket({
      loader: TH,
      activity: 'mixed',
      mode: 'probe',
      blocks: [
        { activity: 'life_transit', items: [L.defaultStarterFor('life_transit').items[0]] },
        { activity: 'life_signs', items: [L.defaultStarterFor('life_signs').items[0]] },
      ],
      qrPublicKey: kp.publicKey,
      qrCrypto: Q,
      homeLanguages: ['es', 'ar'],
      stationBilingual: SB,
    });
    const t = openPacket(mixCheck.html);
    t.q('[data-bilingual-lang="ar"]').click();
    expect(t.q('[data-bilingual-banner="start"]').getAttribute('dir')).toBe('rtl');
    t.d.getElementById('learner-name').value = 'Nadia';
    t.button('Next').click();
    t.q('[data-check-begin]').click();

    // Empty submit in Check mode must NOT throw when ctx.feedback is absent
    t.tick(500);
    expect(() => t.q('[data-ls-submit]').click()).not.toThrow();
    expect(t.q('[data-lt-readout]').textContent).toContain('Choose an option');
    t.q('[data-ls-choice="b"]').click();
    t.q('[data-ls-submit]').click();

    // Item 2: Signs empty submit guard then wrong answer
    t.tick(500);
    expect(() => t.q('[data-ls-submit]').click()).not.toThrow();
    t.q('[data-ls-choice="wait"]').click();
    t.q('[data-ls-submit]').click();

    // Unseal QR & verify score + CSV reader
    t.q('[data-teacher] [data-qr-toggle]').click();
    const code = t.q('[data-teacher] [data-qr-code]').textContent.trim();
    const dec = Q.unsealResult(code, kp.secretKey);
    expect(dec.ok).toBe(true);
    expect(dec.result.learnerName).toBe('Nadia');
    expect(dec.result.packet.mode).toBe('check');
    expect(dec.result.score.itemsCorrect).toBe(1);
    expect(dec.result.score.itemsAttempted).toBe(2);
    expect(dec.result.score.scoreUnit).toBe('items_correct');

    const csvTable = TH.resultsCsv(dec.result);
    const dig = TH.sha256(csvTable.basis);
    const parsed = await R.read(csvTable.text({ method: 'sha256', value: dig.hex }), { name: 'transition-check.csv' });
    expect(parsed.ok).toBe(true);
    expect(parsed.sessions[0].integrity).toBe('ok');
    expect(parsed.sessions[0].score.itemsCorrect).toBe(1);
    t.dom.window.close();
  });

  it('integrates Wave 1B Adaptive Scaffolding (2-miss reinforcement + 4-streak Stretch), Station Mode, and attachQrKey parity', async () => {
    const kp = Q.generateKeyPair('Family Home');
    const plain = L.buildLifeSkillsPacket({
      loader: TH,
      starterId: 'ls_community_signs',
      adaptiveScaffold: true,
      homeLanguages: ['es'],
      bilingualGlossary: { EXIT: { es: 'SALIDA' } },
      stationBilingual: SB,
    });
    const attached = TH.attachQrKey(plain.html, kp.publicKey, { stationMode: true });
    expect(attached.ok).toBe(true);
    await expectClosedVerified(attached.html);

    const t = openPacket(attached.html);
    t.d.getElementById('learner-name').value = 'Luis';
    t.button('Start').click();
    // 4 consecutive first-try correct answers unlock Stretch Challenge (Accessible Entrance)
    ['leave', 'leave_closed', 'slow', 'collapse'].forEach((ans, idx) => {
      t.q('[data-ls-choice="' + ans + '"]').click();
      t.q('[data-ls-submit]').click();
      if (idx < 3) t.button('Next').click();
    });
    const stretchBtn = t.q('[data-adaptive-stretch]');
    expect(stretchBtn).toBeTruthy();
    stretchBtn.click();
    expect(t.q('[data-lg-sign="info"]')).toBeTruthy();
    t.q('[data-ls-choice="ramp"]').click();
    t.q('[data-ls-submit]').click();
    t.button('See my results').click();
    expect(t.q('[data-station-next]')).toBeTruthy();
    t.dom.window.close();
  });
});

describe('Wave 4A — Maker page (packets-life-skills.html), Reopen, Batch .zip & #5 invariants', () => {
  it('passes all #5 static, CSP, US spelling, footer, proof fold, a11y, and build_packets_site.cjs plan checks', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-life-skills.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'packets-life-skills.css'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'packets-life-skills.js'), 'utf8');
    const builderJs = fs.readFileSync(path.join(ROOT, 'packet_life_skills_builder.js'), 'utf8');

    expect(html).toContain("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'");
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/<form\b/i);

    expect(html.match(/AlloFlow Packets/g)).toHaveLength(1);
    expect(html).toContain('<details class="proof">');
    expect(html).toContain('This page runs without AI. No account. Nothing you choose leaves your device.');
    expect(html).toContain('<span id="file-count">fourteen</span>');
    expect(html).toContain('href="packets-verify.html">Look inside a file</a>');
    expect(html).toContain('<a href="packets-feedback.html#from-packets-life-skills">Send feedback</a> <a href="./">More from AlloFlow</a>');
    expect(html + '\n' + js + '\n' + builderJs).not.toMatch(/Check a file/i);
    expect(html).toContain('id="f-check-code"');
    expect(html).toMatch(/type="password"[^>]*id="f-check-code"/);

    for (const src of [js, builderJs]) {
      expect(src).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function|speechSynthesis|https?:\/\//i);
      expect(src).not.toMatch(BRITISH);
    }
    expect(html).not.toMatch(BRITISH);
    expect(css).not.toMatch(BRITISH);
    expect(css).not.toMatch(/@import|url\(|@font-face/i);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');

    const sDom = new JSDOM(html);
    const sDoc = sDom.window.document;
    expect(sDoc.body.textContent).not.toMatch(/!/);
    expect(sDoc.body.textContent).not.toMatch(/\b(?:secure|guarantee|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i);
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
    sDom.window.close();

    const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((m) => m[1]).filter((r) => r !== './');
    for (const ref of refs) expect(fs.existsSync(path.join(ROOT, ref)), ref).toBe(true);

    const plan = SITE.plan();
    expect(plan.pages.some((p) => p.endsWith('packets-life-skills.html'))).toBe(true);
  });

  it('builds single-domain & mixed packets from packets-life-skills.html UI, refreshes default title on radio change, supports custom editing, batch .zip, and Reopen round-trip', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-life-skills.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'packets-life-skills.js'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://alloflow.local/packets-life-skills.html', runScripts: 'outside-only' });
    const win = dom.window;
    const doc = win.document;
    win.AlloPacketLifeSkills = L;
    win.AlloWordSoundsTakeHome = TH;
    win.AlloPacketStationBilingual = SB;
    win.AlloPacketQrCrypto = Q;
    win.AlloPacketVerify = V;
    win.AlloPacketZip = ZIP;
    const blobs = [];
    win.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:ls-' + blobs.length; };
    win.URL.revokeObjectURL = () => {};
    win.eval(js);
    if (doc.readyState === 'loading') doc.dispatchEvent(new win.Event('DOMContentLoaded'));

    // Switching activity radio updates default title cleanly
    const signRadio = doc.querySelector('input[name="activity"][value="life_signs"]');
    signRadio.checked = true;
    signRadio.dispatchEvent(new win.Event('change'));
    doc.getElementById('next-1').click();
    doc.getElementById('next-2').click();
    expect(doc.getElementById('f-title').value).toBe('Community & Emergency Signs');
    doc.getElementById('back-3').click();
    doc.getElementById('back-2').click();

    // Select Making Change starter set, edit custom scenarios, enable Spanish + Station Mode
    doc.querySelector('[data-starter-id="ls_money_change"]').click();
    doc.getElementById('next-1').click();
    const itemsArea = doc.getElementById('f-items');
    itemsArea.value = 'pay | 4.25 | Pay $4.25 for a sandwich.\nchange | 7.50 | 10.00 | Give change from $10.00 for a $7.50 ticket.';
    itemsArea.dispatchEvent(new win.Event('input'));
    expect(doc.getElementById('items-parse-note').textContent).toContain('2 scenarios ready');

    const esBox = doc.querySelector('#bilingual-langs input[value="es"]');
    esBox.checked = true;
    esBox.dispatchEvent(new win.Event('change'));
    const stBox = doc.getElementById('f-station-mode');
    stBox.checked = true;
    stBox.dispatchEvent(new win.Event('change'));

    doc.getElementById('next-2').click();
    expect(doc.getElementById('summary').hidden).toBe(false);
    const beforeSave = blobs.length;
    doc.getElementById('save').click();
    expect(blobs.length).toBeGreaterThan(beforeSave);
    const savedHtml = await blobs[blobs.length - 1].text();
    await expectClosedVerified(savedHtml);

    // Reopen round-trip via readLifeSkillsPacket
    const reopened = L.readLifeSkillsPacket(savedHtml, V);
    expect(reopened.ok).toBe(true);
    expect(reopened.activity).toBe('life_money');
    expect(reopened.items).toHaveLength(2);
    expect(reopened.homeLanguages).toEqual(['es']);
    expect(reopened.stationMode).toBe(true);

    // Batch .zip for 2 students
    const batchArea = doc.getElementById('f-batch-names');
    batchArea.value = 'Cedar1\nMaple2';
    batchArea.dispatchEvent(new win.Event('input'));
    const beforeZip = blobs.length;
    doc.getElementById('batch-make').click();
    expect(blobs.length).toBe(beforeZip + 1);
    expect(doc.getElementById('batch-said').textContent).toContain('.zip');

    // Mixed transition pack build & reopen
    doc.getElementById('back-3').click();
    doc.getElementById('back-2').click();
    doc.querySelector('[data-starter-id="ls_community_mix"]').click();
    doc.getElementById('next-1').click();
    expect(doc.getElementById('mixed-editor').hidden).toBe(false);
    doc.getElementById('next-2').click();
    const beforeMix = blobs.length;
    doc.getElementById('save').click();
    const mixHtml = await blobs[blobs.length - 1].text();
    expect(blobs.length).toBeGreaterThan(beforeMix);
    const mixReopened = L.readLifeSkillsPacket(mixHtml, V);
    expect(mixReopened.ok).toBe(true);
    expect(mixReopened.activity).toBe('mixed');
    expect(mixReopened.blocks).toHaveLength(5);

    // Check-mode reopen formatting never emits NaN or undefined
    for (const act of L.ACTIVITIES) {
      const ckMade = L.buildLifeSkillsPacket({ loader: TH, activity: act, mode: 'probe' });
      const ckRead = L.readLifeSkillsPacket(ckMade.html, V);
      expect(ckRead.ok).toBe(true);
      const formatted = L.formatItemsText(act, ckRead.items);
      expect(formatted).not.toContain('undefined');
      expect(formatted).not.toContain('NaN');
    }

    // Regression (#43): Laundry formatItemsText -> parseItemsText preserves garment color & care badges and rejects '?' baskets
    const laundryStarter = L.findStarter('ls_laundry_care');
    const laundryText = L.formatItemsText('life_laundry', laundryStarter.items);
    const laundryReparsed = L.parseItemsText('life_laundry', laundryText);
    expect(laundryReparsed).toHaveLength(4);
    expect(laundryReparsed[0].garments[2].color).toBe('Cream');
    expect(laundryReparsed[0].garments[2].badges).toEqual(['Cold Delicate', 'Lay Flat to Dry', 'No Bleach']);
    expect(laundryReparsed[1].garment.color).toBe('Navy');
    expect(L.parseItemsText('life_laundry', 'sort | Sort garments | White Shirt (White: Warm Wash)=?')).toEqual([]);
    expect(L.EXTRA_CSS).toContain('.lm-budget-item[aria-pressed=true],.ls-choice-btn[aria-pressed=true],.ll-bin-btn[aria-pressed=true]{forced-color-adjust:none;background:Highlight;color:HighlightText;border:2px solid Highlight}');

    dom.window.close();
  });
});
