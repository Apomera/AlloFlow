// Sealed QR results, payload version 2 (2026-11-23).
//
// Why: version 1 kept only the missed items of a long result and the teacher page filled the rest in. The results
// reader counts every score from the items, so a real 25-question math check that scored 13 digits a minute from its
// own results file read as 2 through the QR, with the check value "ok". The rule now: EVERY question is always in the
// code with what is counted from it; only detail (times, wording) may be left out to fit, and the result says so.
//
// These tests compare what the results reader counts from a QR-carried result with what it counts from the student's
// own results file. They do not pin source text.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const PC = require(path.join(ROOT, 'packet_check_builder.js'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const BANK = JSON.parse(fs.readFileSync(path.join(ROOT, 'psychometric_math_probes.json'), 'utf8'));

const settle = (ms) => new Promise((r) => setTimeout(r, ms));
// The results file a student's own Save button writes, from a result object.
const ownCsv = (result) => { const t = TH.resultsCsv(result); return { text: t.text({ method: 'sha256', value: TH.sha256(t.basis).hex }), lines: t.lines, stem: t.stem }; };
// Everything the reader counts from a result. Times are left out of this on purpose: a code may leave them out.
const counted = (s) => ({ given: s.summary.given, done: s.summary.done, attempted: s.summary.attempted, correct: s.summary.correct, firstTry: s.summary.firstTry,
  accuracyPct: s.summary.accuracyPct, firstTryPct: s.summary.firstTryPct, value: s.value, integrity: s.integrity,
  score: s.score && { score: s.score.score, stated: s.score.stated, digitsCorrect: s.score.digitsCorrect, digitsPossible: s.score.digitsPossible, itemsCorrect: s.score.itemsCorrect,
    itemsAttempted: s.score.itemsAttempted, recounted: s.score.recounted, noScore: s.score.noScore, attempt: s.score.attempt },
  newFacts: s.newFacts && { items: s.newFacts.items, firstTry: s.newFacts.firstTry, knownItems: s.newFacts.knownItems, knownFirstTry: s.newFacts.knownFirstTry },
  recall: s.recall, conflict: s.conflict && { matchItems: s.conflict.matchItems, matchFirstTry: s.conflict.matchFirstTry, conflictItems: s.conflict.conflictItems, conflictFirstTry: s.conflict.conflictFirstTry },
  byActivity: s.byActivity.map((a) => [a.activity, a.items, a.graded, a.correct, a.firstTry]),
  flags: s.flags.filter((f) => f !== 'qr_short') });
const readOne = async (csv) => { const got = await R.read(csv.text, { name: csv.stem + '.csv' }); expect(got.ok).toBe(true); return got.sessions[0]; };

// A practice result of n questions over three activities; every "missEvery"-th is missed, the next is right at the second try.
function practice(n, missEvery, opts = {}) {
  const acts = ['rhyming', 'blending', 'spelling_bee'];
  const items = [];
  for (let i = 0; i < n; i++) {
    const act = acts[i % acts.length];
    const word = (opts.sentences ? 'the quick brown fox jumps ' : '') + 'word' + i;
    const miss = !!missEvery && i % missEvery === 0, retry = !miss && !!missEvery && i % missEvery === 1;
    items.push({ n: i + 1, itemId: act + '-' + word, activity: act, word, target: word, responses: miss ? ['x' + i, 'y' + i] : retry ? ['z' + i, word] : [word],
      attempts: miss || retry ? 2 : 1, firstTry: !miss && !retry, correct: !miss, done: true, ms: 1000 + i * 7, supports: i % 4 === 0 ? { listen: 2 } : {}, practice: null, flag: '' });
  }
  return { kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'syn-' + n + '-' + missEvery + (opts.sentences ? 's' : ''), packet: { id: 'ws-syn', version: 'r1', form: '', mode: 'practice' },
    lessonId: 'ws-syn', revision: 'r1', lessonTitle: 'Synthetic ' + n, activityTitles: { rhyming: 'Rhyme Time', blending: 'Blend It', spelling_bee: 'Spelling Bee' }, learner: 'Fox1', learnerName: 'Fox1',
    startedLocal: '2026-11-23T09:00:00-05:00', finishedLocal: '2026-11-23T09:12:30-05:00', durationMs: 750000, activeMs: 612000,
    summary: { items: n, done: n, firstTry: items.filter((x) => x.firstTry).length, afterRetry: items.filter((x) => x.correct && !x.firstTry).length, missed: items.filter((x) => !x.correct).length, practised: 0 }, items };
}
// A Symbol Runner check: matching and conflicting cards, a score that is a count of items.
function runner(n) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const right = i % 5 !== 0;
    items.push({ n: i + 1, itemId: 'symbol_runner-' + String(i).padStart(2, '0') + '-' + (i % 2 ? 'conflict' : 'match'), activity: 'symbol_runner', word: 'RED', target: 'red', responses: [right ? 'red' : 'blue'],
      attempts: 1, firstTry: right, correct: right, done: true, ms: 600 + i * 11, supports: {}, practice: null, flag: '', digitsCorrect: null, digitsPossible: null });
  }
  const ok = items.filter((x) => x.correct).length;
  return { kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'sr-' + n, packet: { id: 'sr-check', version: 'r2', form: 'A', mode: 'check' }, lessonId: 'sr-check', revision: 'r2', lessonTitle: 'Name the ink color',
    activityTitles: { symbol_runner: 'Symbol Runner' }, learner: 'Owl2', learnerName: 'Owl2', startedLocal: '2026-11-23T10:00:00-05:00', finishedLocal: '2026-11-23T10:01:05-05:00', durationMs: 65000, activeMs: 60000,
    score: { measure: 'symbol_runner_stroop', score: ok, scoreUnit: 'items_correct', digitsCorrect: null, digitsPossible: null, itemsCorrect: ok, itemsAttempted: n, timeLimitS: 60, elapsedS: 60, hiddenS: 0,
      completion: 'time', prorated: false, noScoreReason: '', scoringVersion: 3, formVersion: 2, attempt: 2, flags: ['tab_hidden'], tools: ['bigText'] },
    summary: { items: n, done: n, firstTry: ok, afterRetry: 0, missed: n - ok, practised: 0 }, items };
}
// A rehearsal result: new and known facts, a recall time, a help on some cards.
function rehearsal() {
  const items = [];
  for (let i = 0; i < 12; i++) {
    const again = i % 3 === 1;
    items.push({ n: i + 1, itemId: 'math_rehearsal-' + String(i + 1).padStart(2, '0') + (i % 3 === 0 ? '-new' : '-known'), activity: 'math_rehearsal', word: '7 × ' + (3 + i), target: String(7 * (3 + i)),
      responses: again ? [String(7 * (3 + i) + 1), String(7 * (3 + i))] : [String(7 * (3 + i))], attempts: again ? 2 : 1, firstTry: !again, correct: true, done: true, ms: again ? 4500 : 1500 + i,
      supports: again ? { copied: 1 } : {}, practice: null, flag: '', recallMs: 1400 + i * 10 });
  }
  return { kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'reh-1', packet: { id: 'math-facts-mul-7-rehearsal', version: 'r9', form: '', mode: 'practice' }, lessonId: 'math-facts-mul-7-rehearsal', revision: 'r9',
    lessonTitle: '× 7 facts: new and known facts', activityTitles: { math_rehearsal: 'Fact rehearsal' }, learner: 'OakLeaf4', learnerName: 'OakLeaf4', startedLocal: '2026-11-23T07:59:01-05:00', finishedLocal: '2026-11-23T08:01:40-05:00',
    durationMs: 159000, activeMs: 30800, summary: { items: 12, done: 12, firstTry: 8, afterRetry: 4, missed: 0, practised: 0 }, items };
}

async function throughQr(result, kp) {
  const sealed = Q.sealResult(result, kp.publicKey);
  const opened = Q.unsealResult(sealed.code, kp.secretKey);
  expect(opened.ok).toBe(true);
  const own = ownCsv(result), qr = ownCsv(opened.result);
  // As packets-qr.js buildCsvEntry writes it: the summary row says where the copy came from and how much was left out.
  qr.text = qr.text.replace(/("#summary",[^\r\n]*)/, '$1,"source=sealed_qr","qr_left_out=' + (opened.leftOut.level || 0) + '"');
  return { sealed, opened, own, qr, a: await readOne(own), b: await readOne(qr) };
}

describe('every question is counted through the QR, whatever is left out to fit', () => {
  const kp = Q.generateKeyPair('payload');
  const cases = [
    ['a short practice, nothing missed', () => practice(10, 0)],
    ['30 questions, 1 in 5 missed', () => practice(30, 5)],
    ['60 questions, half missed', () => practice(60, 2)],
    ['60 questions, all missed', () => practice(60, 1)],
    ['120 questions, 1 in 4 missed', () => practice(120, 4)],
    ['200 questions, 1 in 4 missed', () => practice(200, 4)],
    ['60 questions whose words are sentences, half missed', () => practice(60, 2, { sentences: true })],
    ['a rehearsal with new and known facts and a recall time', rehearsal],
    ['a Symbol Runner check of 40 cards', () => runner(40)],
    ['a Symbol Runner check of 90 cards', () => runner(90)],
  ];
  for (const [name, make] of cases) {
    it(name + ': the reader counts the same from the code as from the results file', async () => {
      const result = make();
      const { sealed, opened, own, qr, a, b } = await throughQr(result, kp);
      expect(counted(b)).toEqual(counted(a));
      // Every question came back, each one once.
      expect(opened.result.items).toHaveLength(result.items.length);
      expect(opened.result.items.map((it) => [it.firstTry, it.correct, it.done, it.attempts, it.activity])).toEqual(result.items.map((it) => [it.firstTry, it.correct, it.done, it.attempts, it.activity]));
      // One QR code of a size the page can draw.
      expect(Buffer.byteLength(JSON.stringify(opened.compact))).toBeLessThanOrEqual(Q.MAX_QR_PLAINTEXT);
      expect(Q.qrMatrix(sealed.code).version).toBeLessThanOrEqual(30);
      // With nothing left out, the rebuilt rows are the rows of the student's own file, cell for cell.
      if (sealed.level === 0) { expect(qr.lines).toEqual(own.lines); expect(opened.truncated).toBe(false); expect(b.flags).not.toContain('qr_short'); }
      else { expect(opened.truncated).toBe(true); expect(opened.leftOut.level).toBe(sealed.level); expect(opened.leftOut.times).toBe(true); }
      // What is said to be left out is what is left out.
      const noWords = opened.result.items.filter((it) => it.qrNoWording).length;
      expect(opened.leftOut.noWording).toBe(noWords);
      // A missed question never loses its wording before the questions right at the first try have.
      if (sealed.level === 2) expect(opened.result.items.filter((it) => it.qrNoWording && !(it.done && it.correct && it.firstTry)).length).toBe(0);
    });
  }

  it('a short result leaves nothing out, and a long one says exactly how much', async () => {
    expect(Q.sealResult(practice(10, 0), kp.publicKey).level).toBe(0);
    expect(Q.sealResult(rehearsal(), kp.publicKey).level).toBe(0);
    const long = await throughQr(practice(200, 4), kp);
    expect(long.sealed.level).toBe(3);
    expect(long.opened.leftOut.missedNoWording).toBeGreaterThan(0);
    expect(long.opened.leftOut.noWording).toBeGreaterThan(long.opened.leftOut.missedNoWording);
  });

  it('a result too long for one code is refused, not cut down', () => {
    let error = null;
    try { Q.sealResult(practice(520, 4), kp.publicKey); } catch (e) { error = e; }
    expect(error).toBeTruthy();
    expect(error.code).toBe('too_long');
  });

  it('the item ids the reader counts from survive: new and known, matching and conflicting', async () => {
    const reh = await throughQr(rehearsal(), kp);
    expect(reh.b.newFacts).toEqual(reh.a.newFacts);
    expect(reh.a.newFacts.items).toBe(4);
    expect(reh.b.recall).toEqual(reh.a.recall);
    const sr = await throughQr(runner(90), kp);
    expect(sr.sealed.level).toBeGreaterThanOrEqual(2);
    expect(sr.a.conflict.conflictItems).toBe(45);
    expect(sr.b.conflict.conflictItems).toBe(45);
    expect(sr.b.conflict.matchFirstTry).toBe(sr.a.conflict.matchFirstTry);
  });
});

describe('a real math check, played in the student file, read on the teacher page', () => {
  it('the score in Add up results is the score of the student\'s own results file (it read 13 from the file and 2 through the QR)', async () => {
    const kp = Q.generateKeyPair('real check');
    const lesson = PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'A' });
    const sealedFile = TH.attachQrKey(PC.buildCheckPacket({ lesson, loader: TH }).html, kp.publicKey);
    expect(sealedFile.ok).toBe(true);
    // Play it: answer 22 of the 25 problems, every third one wrong, then let the clock run out.
    const saved = [];
    const time = { t: 1000, wall: Date.UTC(2026, 10, 23, 14, 0, 0) };
    const dom = new JSDOM(sealedFile.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/check.html', beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
      w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
      w.Date.now = () => time.wall;
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
    } });
    const d = dom.window.document;
    const q = (s) => d.querySelector(s);
    const tick = (ms) => { time.t += ms; time.wall += ms; };
    const press = (key) => q('[data-key="' + key + '"]').click();
    const type = (text) => String(text).split('').forEach((ch) => press(ch === '-' ? 'minus' : ch));
    const answerOf = (p) => p.answer != null ? Number(p.answer) : p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : Math.trunc(p.a / p.b);
    const raws = lesson.blocks[0].items;
    d.getElementById('learner-name').value = 'BlueHeron7';
    [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent.trim() === 'Next').click();
    raws.filter((p) => p.practice).forEach((raw) => { tick(300); type(answerOf(raw)); press('next'); q('[data-practice-next]').click(); });
    q('[data-check-begin]').click();
    let i = 0;
    for (const raw of raws.filter((p) => !p.practice)) {
      tick(4000);
      type(i % 3 === 1 ? answerOf(raw) + 1 : answerOf(raw)); press('next');
      if (++i >= 22) break;
    }
    tick(lesson.timeLimitS * 1000); d.dispatchEvent(new dom.window.Event('visibilitychange'));
    await settle(1300);
    q('[data-save-csv]').click();
    const studentCsv = saved[saved.length - 1].body;
    (q('[data-teacher] [data-qr-toggle]') || q('[data-qr-toggle]')).click();
    const code = q('[data-qr-code]').textContent.trim();
    expect(code).toMatch(/^AFQR1:[A-Z2-7]+$/);
    dom.window.close();

    // The teacher page: load the key, paste the code, take the results file it writes.
    const page = new JSDOM(fs.readFileSync(path.join(ROOT, 'packets-qr.html'), 'utf8'), { runScripts: 'outside-only', url: 'https://alloflow.local/packets-qr.html' });
    const win = page.window, doc = win.document;
    // The page starts itself when the document is ready: wait for that before using it.
    if (doc.readyState === 'loading') await new Promise((resolve) => doc.addEventListener('DOMContentLoaded', resolve, { once: true }));
    Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true });
    win.AlloPacketQrCrypto = Q; win.AlloWordSoundsTakeHome = TH; win.AlloPacketZip = ZIP;
    const downloads = [];
    win.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:t' + downloads.length; };
    win.URL.revokeObjectURL = () => {};
    win.eval(fs.readFileSync(path.join(ROOT, 'packets-qr.js'), 'utf8'));
    const keyFile = doc.getElementById('load-key-file');
    Object.defineProperty(keyFile, 'files', { value: [{ name: 'key.json', text: () => Promise.resolve(JSON.stringify(kp)) }], configurable: true });
    keyFile.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle(20);
    doc.getElementById('code-input').value = code;
    doc.getElementById('code-add').click();
    expect(doc.querySelectorAll('#collected-body tr')).toHaveLength(1);
    doc.querySelector('[data-csv-row="0"]').click();
    const qrCsv = await downloads[downloads.length - 1].text();
    page.window.close();

    const fromFile = (await R.read(studentCsv, { name: 'own.csv' })).sessions[0];
    const fromQr = (await R.read(qrCsv, { name: 'qr.csv' })).sessions[0];
    expect(fromFile.score.score).toBeGreaterThan(5);
    expect(fromQr.score.score).toBe(fromFile.score.score);
    expect(fromQr.score.recounted).toBe(false);
    expect(fromQr.flags).not.toContain('score_differs');
    expect(counted(fromQr)).toEqual(counted(fromFile));
    expect(fromQr.summary.given).toBe(25);
    // The file the page writes says where it came from, outside the check value, and the reader says so when detail is missing.
    expect(qrCsv).toMatch(/"#summary",[^\r\n]*"source=sealed_qr","qr_left_out=[0-3]"/);
    expect(fromQr.integrity).toBe('ok');
    expect(fromQr.flags.includes('qr_short')).toBe(fromQr.qrShort > 0);
  }, 60000);
});

describe('old codes, and a browser that cannot make one', () => {
  // A version 1 code, sealed with the library's own parts, as a file sealed before 2026-11-23 writes it.
  function sealPayload(payload, kp) {
    const pk = Q.parsePublicKey(kp.publicKey);
    const eph = globalThis.crypto.getRandomValues(new Uint8Array(32)); eph[0] &= 248; eph[31] &= 127; eph[31] |= 64;
    const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ephPk = Q.x25519Public(eph);
    const salt = new Uint8Array([...ephPk, ...pk.bytes, ...nonce]);
    const key = Q.hkdfSha256(Q.x25519(eph, pk.bytes), salt, new TextEncoder().encode('alloflow-packet-qr-v1'), 32);
    const body = Q.aeadSeal(key, nonce, new TextEncoder().encode(JSON.stringify(payload)), new TextEncoder().encode('AFQR1|' + pk.fingerprint));
    const fp = Uint8Array.from(pk.fingerprint.match(/../g).map((h) => parseInt(h, 16)));
    return Q.QR_PREFIX + Q.toBase32(new Uint8Array([1, ...fp, ...ephPk, ...nonce, ...body]));
  }
  const v1 = (tr) => ({ v: 1, sid: 'old-1', pid: 'p', rev: 'r', t: 'Old file', m: 'practice', f: '', l: 'Ana', s: '', e: '', a: 5, sum: [20, 20, 12, 0, 8, 0], at: {},
    it: [[1, 'rhyming', 'cat', 'hat', ['bat'], 1, 0, 0]], ...(tr ? { tr: 1 } : {}) });

  it('a condensed version 1 code is refused, because no right score can be counted from it; a whole one still opens', () => {
    const kp = Q.generateKeyPair('old');
    const refused = Q.unsealResult(sealPayload(v1(true), kp), kp.secretKey);
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe('old_condensed');
    const whole = Q.unsealResult(sealPayload(v1(false), kp), kp.secretKey);
    expect(whole.ok).toBe(true);
    expect(whole.result.items).toHaveLength(1);
  });

  it('with no BigInt the code that goes into the file still loads, and only asking for a QR fails', () => {
    const kp = Q.generateKeyPair('old ipad');
    const source = Q.studentEmbedSource();
    const lib = new Function('window', 'BigInt', 'return ' + source)({ crypto: globalThis.crypto }, undefined);
    expect(typeof lib.sealResult).toBe('function');
    expect(() => lib.sealResult(practice(10, 0), kp.publicKey)).toThrow();
    // The same source, where BigInt exists, seals a code the teacher side opens.
    const works = new Function('window', 'return ' + source)({ crypto: globalThis.crypto });
    expect(Q.unsealResult(works.sealResult(practice(10, 0), kp.publicKey).code, kp.secretKey).ok).toBe(true);
  });
});

describe('the teacher page (packets-qr.html)', () => {
  async function openPage() {
    const page = new JSDOM(fs.readFileSync(path.join(ROOT, 'packets-qr.html'), 'utf8'), { runScripts: 'outside-only', url: 'https://alloflow.local/packets-qr.html' });
    const win = page.window, doc = win.document;
    if (doc.readyState === 'loading') await new Promise((resolve) => doc.addEventListener('DOMContentLoaded', resolve, { once: true }));
    Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true });
    win.AlloPacketQrCrypto = Q; win.AlloWordSoundsTakeHome = TH; win.AlloPacketZip = ZIP;
    const downloads = [];
    win.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:t' + downloads.length; };
    win.URL.revokeObjectURL = () => {};
    win.eval(fs.readFileSync(path.join(ROOT, 'packets-qr.js'), 'utf8'));
    const $ = (id) => doc.getElementById(id);
    const dropFile = async (html) => {
      Object.defineProperty($('seal-files'), 'files', { value: [{ name: 'Plus-2.html', text: () => Promise.resolve(html) }], configurable: true });
      $('seal-files').dispatchEvent(new win.Event('change', { bubbles: true }));
      await settle(20);
    };
    const leaveAsks = () => { const e = new win.Event('beforeunload', { cancelable: true }); win.dispatchEvent(e); return e.defaultPrevented; };
    return { page, win, doc, $, downloads, dropFile, leaveAsks };
  }
  const plainFile = () => PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Small check', problems: PC.parseProblems('2+3, 7-4, 6x7'), timeLimitS: 60 }), loader: TH }).html;

  it('the sample key cannot be put into a file for students, and is never shown as saved', async () => {
    const p = await openPage();
    p.$('demo-start').click();
    expect(p.$('key-active').hidden).toBe(false);
    expect(p.$('save-key').hidden).toBe(true);
    expect(p.$('key-unsaved-tag').hidden).toBe(false);
    expect(p.$('key-unsaved-tag').textContent).toMatch(/sample/i);
    p.$('demo-close').click();
    await p.dropFile(plainFile());
    expect(p.$('seal-results').hidden).toBe(true);
    expect(p.$('seal-status').textContent).toMatch(/sample key/i);
    // The sample still does its own job: its three codes unlock.
    p.$('demo-start').click();
    p.$('demo-unlock').click();
    expect(p.doc.querySelectorAll('#collected-body tr')).toHaveLength(3);
    p.page.window.close();
  });

  it('a private key that was never saved is not dropped on one press, and leaving asks once the public key has been copied', async () => {
    const p = await openPage();
    p.$('make-key').click();
    const fp = p.$('key-fp').textContent.trim();
    expect(p.leaveAsks()).toBe(false);
    // Copy the public key (no clipboard here: the page selects the text instead). A colleague may now make files with it.
    p.$('copy-pub').click();
    expect(p.leaveAsks()).toBe(true);
    // Clear: the first press only warns, and the key is still there.
    p.$('clear-key').click();
    expect(p.$('key-active').hidden).toBe(false);
    expect(p.$('key-fp').textContent.trim()).toBe(fp);
    expect(p.$('key-status').textContent).toMatch(/has not been saved/);
    // Saving it makes Clear a single press again, and leaving quiet.
    p.$('save-key').click();
    expect(p.downloads).toHaveLength(1);
    expect(p.leaveAsks()).toBe(false);
    p.$('clear-key').click();
    expect(p.$('key-active').hidden).toBe(true);
    // An unsaved key again: a second press does clear it.
    p.$('make-key').click();
    p.$('clear-key').click();
    expect(p.$('key-active').hidden).toBe(false);
    p.$('clear-key').click();
    expect(p.$('key-active').hidden).toBe(true);
    p.page.window.close();
  });

  it('a code wrapped over several lines is read, and so is a code followed by other words', async () => {
    const p = await openPage();
    p.$('make-key').click();
    const pub = p.$('key-pub').value.trim();
    const one = Q.sealResult(practice(10, 0), pub).code;
    const two = Q.sealResult({ ...practice(10, 5), sessionId: 'second' }, pub).code;
    p.$('code-input').value = one.match(/.{1,60}/g).join('\n') + '\n\n' + two + ' thanks';
    p.$('code-add').click();
    expect(p.doc.querySelectorAll('#collected-body tr')).toHaveLength(2);
    expect(p.$('collect-status').textContent).toMatch(/Added 2/);
    p.page.window.close();
  });

  it('a long result is shown with what did not fit, and its results file carries the same', async () => {
    const p = await openPage();
    p.$('make-key').click();
    p.$('code-input').value = Q.sealResult(practice(120, 4), p.$('key-pub').value.trim()).code;
    p.$('code-add').click();
    const row = p.doc.querySelector('#collected-body tr');
    expect(row.textContent).toContain('Some details did not fit');
    expect(row.textContent).toMatch(/Every question is counted\. Left out to fit in one code:/);
    p.doc.querySelector('[data-csv-row="0"]').click();
    const csv = await p.downloads[p.downloads.length - 1].text();
    expect(csv).toContain('"qr_left_out=3"');
    const session = (await R.read(csv, { name: 'long.csv' })).sessions[0];
    expect(session.integrity).toBe('ok');
    expect(session.qrShort).toBe(3);
    expect(session.flags).toContain('qr_short');
    expect(session.summary.given).toBe(120);
    p.page.window.close();
  });

  it('with no QR reader at all (neither the browser\'s nor jsQR), the buttons are off and the page says to paste', async () => {
    const p = await openPage();
    expect(p.$('cam-toggle').disabled).toBe(true);
    expect(p.$('qr-img-btn').disabled).toBe(true);
    expect(p.$('cam-hint').textContent).toMatch(/did not load/);
    expect(p.$('cam-hint').textContent).toMatch(/Paste sealed code/);
    expect(p.$('cam-hint').textContent).not.toMatch(/supported in Chrome and Edge/);
    p.page.window.close();
  });

  it('with jsQR and no reader of the browser\'s own (Windows Chrome and Edge, iPad Safari, Firefox), both buttons work', async () => {
    const page = new JSDOM(fs.readFileSync(path.join(ROOT, 'packets-qr.html'), 'utf8'), { runScripts: 'outside-only', url: 'https://alloflow.local/packets-qr.html' });
    const win = page.window, doc = win.document;
    if (doc.readyState === 'loading') await new Promise((resolve) => doc.addEventListener('DOMContentLoaded', resolve, { once: true }));
    Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true });
    win.AlloPacketQrCrypto = Q; win.AlloWordSoundsTakeHome = TH; win.AlloPacketZip = ZIP;
    Object.defineProperty(win.navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('no camera here')) }, configurable: true });
    win.eval(fs.readFileSync(path.join(ROOT, 'vendor/jsqr-1.4.0.js'), 'utf8'));
    expect(typeof win.jsQR).toBe('function');
    expect(win.BarcodeDetector).toBeUndefined();
    win.eval(fs.readFileSync(path.join(ROOT, 'packets-qr.js'), 'utf8'));
    expect(doc.getElementById('cam-toggle').disabled).toBe(false);
    expect(doc.getElementById('qr-img-btn').disabled).toBe(false);
    // The page loads the reader from this site, before its own script.
    const srcs = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    expect(srcs.indexOf('vendor/jsqr-1.4.0.js')).toBeGreaterThan(-1);
    expect(srcs.indexOf('vendor/jsqr-1.4.0.js')).toBeLessThan(srcs.indexOf('packets-qr.js'));
    page.window.close();
  });
});

describe('the QR codes a sealed file draws can be read by jsQR (vendor/jsqr-1.4.0.js)', () => {
  // jsQR 1.4.0 cannot read QR version 23 (from this encoder or from qrcode.js, tested 2026-11-23), so the encoder skips it.
  const jsQR = require(path.join(ROOT, 'vendor/jsqr-1.4.0.js'));
  const zlib = require('node:zlib');
  const rgbaOf = (bytes) => {
    const png = Buffer.from(bytes);
    let at = 8, w = 0, h = 0; const idat = [];
    while (at < png.length) { const len = png.readUInt32BE(at), type = png.toString('latin1', at + 4, at + 8), data = png.subarray(at + 8, at + 8 + len); if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } if (type === 'IDAT') idat.push(data); at += 12 + len; }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = 1 + Math.ceil(w / 8), out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((raw[y * stride + 1 + (x >> 3)] >> (7 - (x & 7))) & 1) ? 255 : 0; const o = (y * w + x) * 4; out[o] = out[o + 1] = out[o + 2] = v; out[o + 3] = 255; }
    return { data: out, width: w, height: h };
  };
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const codeOf = (n, seed) => { let s = 'AFQR1:'; for (let i = 0; i < n; i++) s += B32[(i * 7 + seed * 13 + (i >> 3)) % 32]; return s; };

  it('never uses version 23, and steps to 24 where 23 would have fitted', () => {
    const versions = new Set();
    for (let n = 10; n <= 2200; n += 9) { try { versions.add(Q.qrMatrix(codeOf(n, 1)).version); } catch (_) { break; } }
    expect(versions.has(23)).toBe(false);
    expect(versions.has(22)).toBe(true);
    expect(versions.has(24)).toBe(true);
  });

  it('jsQR reads a code of every version the encoder uses, exactly as the file draws it', () => {
    const seen = {};
    const missed = [];
    for (let n = 10; n <= 2600; n += 3) {
      let m; const code = codeOf(n, 2);
      try { m = Q.qrMatrix(code); } catch (_) { break; }
      if (seen[m.version]) continue;
      seen[m.version] = true;
      const img = rgbaOf(Q.qrPngDataUrl(code).bytes);
      const got = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (!got || got.data !== code) missed.push(m.version);
    }
    // Versions 1 to 30 but 23 (the last ones hold up to the code's longest length).
    expect(Object.keys(seen).length).toBeGreaterThanOrEqual(28);
    expect(missed).toEqual([]);
  }, 120000);

  it('a real sealed result is read back to the same code', () => {
    const kp = Q.generateKeyPair('jsqr');
    for (const n of [10, 60, 120]) {
      const sealed = Q.sealResult(practice(n, 4), kp.publicKey);
      const img = rgbaOf(Q.qrPngDataUrl(sealed.code).bytes);
      const got = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      expect(got && got.data).toBe(sealed.code);
      expect(Q.unsealResult(got.data, kp.secretKey).ok).toBe(true);
    }
  }, 120000);
});

describe('the results reader', () => {
  it('a student\'s own results file never carries the QR note', async () => {
    const own = await readOne(ownCsv(practice(30, 5)));
    expect(own.qrShort).toBe(0);
    expect(own.flags).not.toContain('qr_short');
  });
  it('a results bundle keeps the note with the result', async () => {
    const kp = Q.generateKeyPair('bundle');
    const { b } = await throughQr(practice(120, 4), kp);
    // The file the QR page writes adds the marker; here it is added the same way.
    const marked = ownCsv(Q.unsealResult(Q.sealResult(practice(120, 4), kp.publicKey).code, kp.secretKey).result);
    marked.text = marked.text.replace(/("#summary",[^\r\n]*)/, '$1,"source=sealed_qr","qr_left_out=3"');
    const session = await readOne(marked);
    expect(session.flags).toContain('qr_short');
    const bundle = R.readBundle(JSON.parse(JSON.stringify(R.makeBundle({ sessions: [session] }))));
    expect(bundle.ok).toBe(true);
    expect(bundle.sessions[0].qrShort).toBe(3);
    expect(counted(bundle.sessions[0])).toEqual(counted(b));
  });
});
