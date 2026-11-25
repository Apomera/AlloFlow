// The guessing note on a check (Aaron, 2026-11-23: "note only"; packets_results_reader.js sameAnswerOf).
// A check gets the note "same_answer" when at least 8 answers were given, at least 8 in 10 of them were the same answer,
// and at least half of those were not right. The score is never changed by it.
import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const R = require(path.join(ROOT, 'packets_results_reader.js'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const read = (name) => readFileSync(path.join(ROOT, name), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A Math Fluency check: `answers` is what the child typed for each problem (null = not reached).
function check(answers, opts = {}) {
  const items = answers.map((given, i) => {
    const a = 2 + (i % 7), b = 3 + (i % 5), target = String(a + b);
    const reached = given !== null;
    const right = reached && String(given) === target;
    return { n: i + 1, itemId: 'math_computation-' + i, activity: opts.activity || 'math_computation', word: a + ' + ' + b, target: opts.target ? opts.target(i) : target,
      responses: reached ? [String(given)] : [], attempts: reached ? 1 : 0, firstTry: right, correct: opts.right ? opts.right(i) : right, done: reached, ms: reached ? 3000 : 0,
      supports: {}, practice: null, flag: '', digitsCorrect: reached ? (right ? target.length : 0) : null, digitsPossible: reached ? target.length : null };
  });
  const ok = items.filter((it) => it.correct).length;
  const digits = items.reduce((n, it) => n + (it.digitsCorrect || 0), 0);
  return { kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: opts.sid || 'same-' + answers.join(''), packet: { id: 'math-computation-g1', version: 'r1', form: 'A', mode: 'check' },
    lessonId: 'math-computation-g1', revision: 'r1', lessonTitle: 'Math Fluency, version A', activityTitles: { math_computation: 'Math Fluency' }, learner: opts.learner || 'Ana', learnerName: opts.learner || 'Ana',
    startedLocal: '2026-11-23T09:00:00-05:00', finishedLocal: '2026-11-23T09:02:00-05:00', durationMs: 120000, activeMs: 120000,
    score: { measure: 'math_dcpm', score: Math.round(digits / 2), scoreUnit: 'digits_correct_per_minute', digitsCorrect: digits, digitsPossible: 0, itemsCorrect: ok, itemsAttempted: items.filter((it) => it.done).length,
      timeLimitS: 120, elapsedS: 120, hiddenS: 0, completion: 'time', prorated: false, noScoreReason: '', scoringVersion: 3, formVersion: 2, attempt: 1, flags: [], tools: [] },
    summary: { items: items.length, done: items.filter((it) => it.done).length, firstTry: ok, afterRetry: 0, missed: items.length - ok, practised: 0 }, items };
}
const csvOf = (result) => { const t = TH.resultsCsv(result); return { text: t.text({ method: 'sha256', value: TH.sha256(t.basis).hex }), name: t.stem + '.csv' }; };
const readOne = async (result) => { const c = csvOf(result); const got = await R.read(c.text, { name: c.name }); expect(got.ok).toBe(true); return got.sessions[0]; };

describe('the reader marks a check where most answers were the same, mostly wrong', () => {
  it('"1" to everything: marked, with the answer and how often; the score is as counted', async () => {
    const s = await readOne(check([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
    expect(s.flags).toContain('same_answer');
    expect(s.sameAnswer).toEqual({ answer: '1', count: 10, of: 10, wrong: 10 });
    const plain = await readOne(check([5, 8, 1, 1, 1, 1, 1, 1, 1, 1].map((v, i) => (i < 2 ? v : 9 + i)), { sid: 'plain' }));
    expect(plain.flags).not.toContain('same_answer');
    // The note does not touch the score: it is the same number either way.
    expect(s.score.recounted).toBe(false);
    expect(s.value).toBe(s.score.score);
  });

  it('8 of 10 the same and mostly wrong: marked; 7 of 10: not marked', async () => {
    expect((await readOne(check([4, 4, 4, 4, 4, 4, 4, 4, 9, 12], { sid: 'eight' }))).flags).toContain('same_answer');
    expect((await readOne(check([4, 4, 4, 4, 4, 4, 4, 13, 9, 12], { sid: 'seven' }))).flags).not.toContain('same_answer');
  });

  it('fewer than 8 answers: never marked, however alike', async () => {
    const s = await readOne(check([1, 1, 1, 1, 1, 1, 1, null, null, null, null], { sid: 'short' }));
    expect(s.flags).not.toContain('same_answer');
    expect(s.sameAnswer).toBeNull();
  });

  it('the same answer that was right (four ink colors, mostly red): not marked', async () => {
    const answers = ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'blue', 'red'];
    const s = await readOne(check(answers, { sid: 'ink', activity: 'symbol_runner', target: (i) => answers[i], right: () => true }));
    expect(s.flags).not.toContain('same_answer');
  });

  it('a practice file is never marked', async () => {
    const r = check([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], { sid: 'practice' });
    r.packet.mode = 'practice'; delete r.score;
    expect((await readOne(r)).flags).not.toContain('same_answer');
  });

  it('a copy collected by QR code that left out the words of some answers gets no note (it cannot be judged fairly)', async () => {
    const c = csvOf(check([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], { sid: 'qr-short' }));
    const marked = c.text.replace(/("#summary",[^\r\n]*)/, '$1,"source=sealed_qr","qr_left_out=2"');
    const s = (await R.read(marked, { name: c.name })).sessions[0];
    expect(s.qrShort).toBe(2);
    expect(s.flags).not.toContain('same_answer');
    const timesOnly = (await R.read(c.text.replace(/("#summary",[^\r\n]*)/, '$1,"source=sealed_qr","qr_left_out=1"'), { name: c.name })).sessions[0];
    expect(timesOnly.flags).toContain('same_answer');
  });

  it('"Save all of this as one file" keeps the note: it is counted again from the answers', async () => {
    const s = await readOne(check([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], { sid: 'bundle' }));
    const back = R.readBundle(JSON.parse(JSON.stringify(R.makeBundle({ sessions: [s] }))));
    expect(back.ok).toBe(true);
    expect(back.sessions[0].flags).toContain('same_answer');
    expect(back.sessions[0].sameAnswer).toEqual(s.sameAnswer);
  });
});

describe('the page says it in words, beside the score', () => {
  const opened = [];
  afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) { /* closed */ } }); });
  it('one student\'s result names the answer and how often, and keeps the score', async () => {
    const dom = new JSDOM(read('packets-results.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-results.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
    const $ = (id) => d.getElementById(id);
    const c = csvOf(check([1, 1, 1, 1, 1, 1, 1, 1, 1, 7], { sid: 'page', learner: 'Ana' }));
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files: [new w.File([c.text], c.name, { type: 'text/csv', lastModified: new Date(2026, 10, 23, 9).getTime() })] };
    $('main').dispatchEvent(event);
    for (let i = 0; i < 1500 && !/\bread[,.]/.test($('said').textContent); i++) await sleep(10);
    if (!$('state-check').hidden) $('show-results').click();
    const radio = d.querySelector('input[name="view"][value="learner"]');
    radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true }));
    const select = $('pick-learner');
    select.value = [...select.options].find((o) => o.textContent.startsWith('Ana (')).value;
    select.dispatchEvent(new w.Event('change', { bubbles: true }));
    const text = $('learner-body').textContent;
    expect(text).toContain('some answers may be guesses; the score is as counted');
    expect(text).toContain('9 of 10 answers were "1", 9 of them not right');
  });
});
