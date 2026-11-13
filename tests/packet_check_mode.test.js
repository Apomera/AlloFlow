// @vitest-environment jsdom
// Check packets (2026-11-11): the take-home shell with a lesson in mode 'probe' (an internal name; the results say mode
// "check" since 2026-11-12, "probe" before), the three math check adapters and packet_check_builder.js.
// Format: C:\tmp\packets_build_1111\SPEC.md, "Check packets".
// Every screen test runs a REAL built file in jsdom, with the test holding both clocks (Date.now and performance.now).
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;
delete window.AlloPacketChecks;
new Function(readFileSync('packet_check_builder.js', 'utf8'))();
const PC = window.AlloPacketChecks;
const BANK = JSON.parse(readFileSync('psychometric_math_probes.json', 'utf8'));

const HEADER = '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag"';
const CHECK_HEADER = HEADER + ',"digits_correct","digits_possible"';
const ABOUT_SCRAMBLED = 'The answers are scrambled so they cannot be read by opening the file. This stops casual looking, not a determined person.';
const ABOUT_CODE = "The teacher code keeps the answers screen closed. It is a lock on the screen, not secret writing: someone who knows how to read the file's code could still work the answers out.";
const NOT_GRADED = 'This is a check to see how you are doing. It is not for a grade.';

const form = (measure, grade, id = 'A', extra = {}) => PC.lessonFromMathForm({ bank: BANK, measure, grade, form: id, ...extra });
const pack = (lesson, extra = {}) => PC.buildCheckPacket({ lesson, loader: TH, ...extra });
const QD = form('quantity_discrimination', 'K');
const MN = form('missing_number', '1');
const MC = form('math_computation', '3');
// A small timed set of the teacher's own, and one with no clock and a negative answer.
const OWN = PC.lessonFromMathProblems({ title: 'Facts to 20', problems: PC.parseProblems('7+8,12-5,6x4,20/4'), timeLimitS: 90 });
const CALM = PC.lessonFromMathProblems({ title: 'No clock', problems: [{ a: 3, b: 8, op: 'sub' }, { a: 2, b: 2, op: 'add' }, { display: '3 + 4 + 5', answer: 12 }], timeLimitS: null });
const FILES = { qd: pack(QD), mn: pack(MN), mc: pack(MC), own: pack(OWN), calm: pack(CALM), coded: pack(MC, { teacherCode: 'tulip-47' }) };

const raws = (lesson) => lesson.blocks[0].items;
const scored = (lesson) => raws(lesson).filter((p) => !p.practice);
const expected = (p) => p.answer != null ? Number(p.answer) : p.left != null ? Math.max(p.left, p.right)
  : p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : Math.trunc(p.a / p.b);
const sealedOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const cspOf = (html) => /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)[1];
const scriptOf = (html) => [...new JSDOM(html).window.document.querySelectorAll('script')].find((s) => !s.type).textContent;
const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const until = async (test, ms = 15000) => { const end = Date.now() + ms; while (!test()) { if (Date.now() > end) throw new Error('timed out waiting'); await settle(25); } };

// RFC 4180 reader: every cell quoted, "" for a quote, CRLF between rows.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; } else cell += c;
  }
  return rows;
}
const pairs = (row) => Object.fromEntries(row.slice(2).map((cell) => { const at = cell.indexOf('='); return [cell.slice(0, at), cell.slice(at + 1)]; }));

// Opens a built file with its script running. Both clocks and tab visibility are the test's: tick() moves the two
// clocks together, as real time does.
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
function open(html, { storage = null, clock = null, touch = false, calm = false, subtle = false } = {}) {
  const saved = [];
  const time = clock || { t: 1000, wall: Date.UTC(2026, 10, 12, 14, 0, 0), hidden: false };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/check.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    w.Date.now = () => time.wall;
    Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => !!time.hidden });
    if (touch || calm) w.matchMedia = (query) => ({ matches: (touch && /pointer: coarse/.test(query)) || (calm && /reduced-motion/.test(query)) });
    if (subtle) { Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle }); w.TextEncoder = TextEncoder; }
    if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const q = (selector) => d.querySelector(selector);
  const tick = (ms) => { time.t += ms; time.wall += ms; };
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  const press = (key) => q('[data-key="' + key + '"]').click();
  const type = (text) => String(text).split('').forEach((ch) => press(ch === '-' ? 'minus' : ch));
  const key = (name, target = d.body) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  // A visibility event with the page in view makes the file look at the clock at once.
  const show = (hidden) => { time.hidden = hidden; d.dispatchEvent(new w.Event('visibilitychange')); };
  const answer = (raw, right = true) => {
    tick(300);
    const want = expected(raw);
    if (raw.left != null) q('[data-choice="' + (right ? want : Math.min(raw.left, raw.right)) + '"]').click();
    else { type(right ? want : want + 1); press('next'); }
  };
  const start = (name = 'Ana') => { d.getElementById('learner-name').value = name; button('Next').click(); };
  const practise = (lesson) => raws(lesson).filter((p) => p.practice).forEach((raw) => { answer(raw); q('[data-practice-next]').click(); });
  const begin = () => q('[data-check-begin]').click();
  // To the first scored item, with the clock running.
  const run = (lesson, name) => { start(name); practise(lesson); begin(); };
  // Answers every scored item that is left; `wrong` and `skip` are 0-based numbers among the scored items.
  const playAll = (lesson, { wrong = [], skip = [], from = 0 } = {}) => scored(lesson).forEach((raw, i) => {
    if (i < from) return;
    if (skip.includes(i)) { tick(300); q('[data-skip]').click(); } else answer(raw, !wrong.includes(i));
  });
  const storageDump = () => Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const state = () => JSON.parse(Object.values(storageDump())[0]);
  const saveJson = () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); };
  const saveCsv = () => { q('[data-save-csv]').click(); return saved[saved.length - 1]; };
  const heading = () => q('#app h2').textContent;
  const text = () => d.getElementById('app').textContent;
  const live = () => d.getElementById('live').textContent;
  const left = () => q('[data-time-left]').textContent;
  return { html, w, d, q, time, saved, tick, button, press, type, key, show, answer, start, practise, begin, run, playAll, storageDump, state, saveJson, saveCsv, heading, text, live, left };
}

describe('a check gives one try, no feedback and no way back', () => {
  it('a wrong answer and a right answer look the same: the next item, with no message', () => {
    const t = open(FILES.qd.html);
    t.run(QD);
    expect(t.heading()).toBe('Question 1 of 25');
    t.answer(scored(QD)[0], false);
    expect(t.heading()).toBe('Question 2 of 25');
    t.answer(scored(QD)[1], true);
    expect(t.heading()).toBe('Question 3 of 25');
    expect(t.text()).not.toMatch(/Yes!|Not quite|That is right|correct|The bigger number is/i);
    expect(t.d.querySelectorAll('#app .right, #app .status.ok')).toHaveLength(0);
    expect([...t.d.querySelectorAll('#app .status')].filter((n) => !n.closest('[hidden]') && n.textContent.trim())).toEqual([]);
    // Nothing leads back, and there is no Next to wait for.
    // 2026-11-12: the reading tools ("Aa") sit right after the screen heading on every screen (tests/packets_a11y_static.test.js).
    expect([...t.d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).map((b) => b.textContent)).toEqual(['Aa Reading tools', String(scored(QD)[2].left), String(scored(QD)[2].right), 'Stop the check']);
    // Right and wrong are never written to the saved state: both answers look alike there too.
    const kept = t.state().items.slice(2, 4);
    expect(kept.map((r) => [r.done, r.attempts, r.correct, r.firstTry])).toEqual([[true, 1, false, false], [true, 1, false, false]]);
    expect(kept.map((r) => r.responses)).toEqual([[String(Math.min(scored(QD)[0].left, scored(QD)[0].right))], [String(expected(scored(QD)[1]))]]);
  });

  it('a double tap does not answer the next item too', () => {
    const t = open(FILES.qd.html);
    t.run(QD);
    t.answer(scored(QD)[0]);
    // The tail of a double tap lands on the new item at once: ignored.
    t.q('[data-choice="' + scored(QD)[1].left + '"]').click();
    expect(t.heading()).toBe('Question 2 of 25');
    expect(t.state().items[3]).toMatchObject({ done: false, attempts: 0 });
    t.tick(260);
    t.q('[data-choice="' + scored(QD)[1].left + '"]').click();
    expect(t.heading()).toBe('Question 3 of 25');
  });

  it('Skip is there where the measure allows it, and a skipped item earns nothing', () => {
    const qd = open(FILES.qd.html);
    qd.run(QD);
    expect(qd.q('[data-skip]')).toBeNull();
    const t = open(FILES.mc.html);
    t.run(MC);
    expect(t.q('[data-skip]').textContent).toBe('Skip');
    t.tick(300);
    t.q('[data-skip]').click();
    expect(t.heading()).toBe('Question 2 of 25');
    t.playAll(MC, { from: 1 });
    const file = t.saveJson();
    expect(file.items[1]).toMatchObject({ flag: 'skipped', attempts: 1, responses: [], correct: false, firstTry: false, digitsCorrect: 0, digitsPossible: String(expected(scored(MC)[0])).length });
    expect(file.score).toMatchObject({ itemsAttempted: 25, itemsCorrect: 24 });
  });

  it('the learner can stop: it asks first, and a check ended early has no score', () => {
    const t = open(FILES.mc.html);
    t.run(MC);
    t.answer(scored(MC)[0]);
    t.answer(scored(MC)[1]);
    t.button('Stop the check').click();
    expect(t.q('[data-stop-confirm]').hidden).toBe(false);
    expect(t.text()).toContain('Do you want to stop now? You cannot come back to this check.');
    t.button('Keep going').click();
    expect(t.q('[data-stop-confirm]').hidden).toBe(true);
    expect(t.heading()).toBe('Question 3 of 25');
    t.button('Stop the check').click();
    t.button('Yes, stop').click();
    expect(t.heading()).toBe('You finished. Thank you.');
    expect(t.saveJson().score).toMatchObject({ completion: 'ended_early', score: null, noScoreReason: 'ended_early', itemsAttempted: 2, itemsCorrect: 2, prorated: false });
  });
});

describe('practice items come first, give feedback and are not scored', () => {
  it('shows right or wrong and the answer, then "Get ready", and only Start begins the clock', () => {
    const t = open(FILES.qd.html);
    const [one, two] = raws(QD).filter((p) => p.practice);
    expect(t.text()).toContain(NOT_GRADED);
    t.start('Ana');
    expect(t.heading()).toBe('Practice 1 of 2');
    expect(t.text()).toContain('This one is for practice. It does not count.');
    t.answer(one, false);
    expect(t.q('#app .status').textContent).toBe('Not quite. The bigger number is ' + expected(one) + '.');
    expect(t.q('#app .status').className).toBe('status warn');
    expect(t.q('[data-choice="' + expected(one) + '"]').classList.contains('right')).toBe(true);
    // The item is over: another tap changes nothing.
    t.tick(300);
    t.q('[data-choice="' + expected(one) + '"]').click();
    expect(t.state().items[0].responses).toHaveLength(1);
    t.q('[data-practice-next]').click();
    expect(t.heading()).toBe('Practice 2 of 2');
    t.answer(two, true);
    expect(t.q('#app .status').textContent).toBe('Yes! That is right.');
    t.q('[data-practice-next]').click();
    expect(t.heading()).toBe('Get ready');
    for (const line of ['Tap the bigger number.', 'You have 1 minute. Do as many as you can.', 'You get one try for each one. You cannot go back.']) expect(t.text()).toContain(line);
    // Waiting here costs nothing: there is no deadline yet.
    expect(t.state().check).toMatchObject({ phase: 'ready' });
    expect(t.state().check.deadline).toBeUndefined();
    t.tick(600000);
    t.show(false);
    expect(t.heading()).toBe('Get ready');
    t.begin();
    expect(t.heading()).toBe('Question 1 of 25');
    expect(t.state().check).toMatchObject({ phase: 'run', deadline: t.time.wall + 60000, attempt: 1 });
    t.playAll(QD, { wrong: [4] });
    const file = t.saveJson();
    expect(file.items.slice(0, 2).map((i) => [i.practice, i.itemId])).toEqual([['practice', 'quantity_discrimination-p0'], ['practice', 'quantity_discrimination-p1']]);
    expect(file.score).toMatchObject({ itemsAttempted: 25, itemsCorrect: 24, score: 24 });
    expect(file.summary).toMatchObject({ itemsGiven: 25, attempted: 25, correct: 24, items: 25, done: 25, firstTry: 24, missed: 1, practised: 2 });
    const rows = parseCsv(t.saveCsv().body.slice(1));
    expect(rows.slice(1, 4).map((r) => r[14])).toEqual(['0', '0', '1']);
    expect(rows[28][2]).toBe('items_given=25');
    expect(TH.parseResult(file).result.summary).toEqual({ items: 25, done: 25, firstTry: 24, afterRetry: 0, missed: 1, practised: 2 });
  });

  it('a form can be built with no practice items, or with the caller\'s own', () => {
    const bare = form('quantity_discrimination', 'K', 'A', { practice: false });
    expect(raws(bare).filter((p) => p.practice)).toEqual([]);
    const t = open(pack(bare).html);
    t.start('Ana');
    expect(t.heading()).toBe('Get ready');
    const own = form('missing_number', 'K', 'B', { practice: [{ display: '__ + 1 = 2', answer: 1 }] });
    expect(raws(own).filter((p) => p.practice)).toEqual([{ display: '__ + 1 = 2', answer: 1, id: 'missing_number-p0', practice: true }]);
  });
});

describe('the clock', () => {
  it('starts at Start and a reload finds the time that is truly left', () => {
    const a = open(FILES.qd.html);
    a.run(QD);
    expect(a.left()).toBe('Time left: 1:00');
    const deadline = a.state().check.deadline;
    a.tick(20000);
    a.show(false);
    expect(a.left()).toBe('Time left: 0:40');
    a.answer(scored(QD)[0]);
    a.answer(scored(QD)[1]);
    expect(a.left()).toBe('Time left: 0:40');   // 39.4 s, shown as whole seconds
    // The page goes away for 5 s; a new page has a new performance clock.
    const b = open(FILES.qd.html, { storage: a.storageDump(), clock: { t: 7, wall: a.time.wall + 5000, hidden: false } });
    expect(b.heading()).toBe('Question 3 of 25');   // straight back in: no first screen, no second Start
    expect(b.state().check.deadline).toBe(deadline);
    expect(deadline - b.time.wall).toBe(34400);
    expect(b.left()).toBe('Time left: 0:35');
    expect(b.state().sessionId).toBe(a.state().sessionId);
    b.playAll(QD, { from: 2 });
    const file = b.saveJson();
    // The item on screen at the reload is flagged; the time away counts as time with the page hidden.
    expect(file.items[4].flag).toBe('resumed');
    expect(file.score).toMatchObject({ completion: 'complete', hiddenS: 5, flags: ['left_the_page', 'reloaded'], attempt: 1 });
    expect(file.score.elapsedS).toBeCloseTo((b.state().check.end - b.state().check.t0) / 1000, 1);
  });

  it('never gives time back: not when the device clock is set back, and not across a reload', () => {
    const a = open(FILES.qd.html);
    a.run(QD);
    a.tick(20000);
    a.show(false);
    expect(a.left()).toBe('Time left: 0:40');
    // Someone sets the device clock back half a minute. Time left only goes down.
    a.time.wall -= 30000;
    a.show(false);
    expect(a.left()).toBe('Time left: 0:40');
    a.time.t += 5000; a.time.wall += 5000;
    a.show(false);
    expect(a.left()).toBe('Time left: 0:35');
    // A reload with the clock set back an hour: no more is left than when the check was last seen running.
    const kept = a.state().check;
    const b = open(FILES.qd.html, { storage: a.storageDump(), clock: { t: 3, wall: a.time.wall - 3600000, hidden: false } });
    expect(Number(/0:(\d\d)/.exec(b.left())[1])).toBeLessThanOrEqual(Math.ceil((kept.deadline - kept.seen) / 1000));
    expect(b.left()).toBe('Time left: 0:35');
    b.tick(36000);
    b.show(false);
    expect(b.heading()).toBe('You finished. Thank you.');
    expect(b.saveJson().score).toMatchObject({ completion: 'time', elapsedS: 60 });
    expect(b.saveJson().score.flags).toContain('clock_changed');
  });

  it('time up: the item on screen ends unanswered and the finish screen shows', async () => {
    const t = open(FILES.qd.html);
    t.run(QD);
    t.answer(scored(QD)[0]);
    t.answer(scored(QD)[1], false);
    t.tick(59500);
    t.show(false);
    expect(t.heading()).toBe('You finished. Thank you.');
    expect(t.text()).toContain('Time is up.');
    expect(t.text()).toContain('You answered 2 of 25.');
    expect(t.text()).toContain('Time: 1:00.');
    await settle();
    expect(t.live()).toBe('Time is up.');
    const file = t.saveJson();
    expect(file.score).toMatchObject({ completion: 'time', elapsedS: 60, timeLimitS: 60, itemsAttempted: 2, itemsCorrect: 1, score: 1, prorated: false });
    expect(file.items.slice(2, 6).map((i) => [i.flag, i.attempts, i.done, i.correct])).toEqual([['', 1, true, true], ['', 1, true, false], ['time_up', 0, false, false], ['', 0, false, false]]);
    // An answer that arrives after the deadline is not taken.
    const late = open(FILES.qd.html);
    late.run(QD);
    late.tick(60001);
    late.q('[data-choice="' + scored(QD)[0].left + '"]').click();
    expect(late.heading()).toBe('You finished. Thank you.');
    expect(late.saveJson().items[2]).toMatchObject({ flag: 'time_up', attempts: 0, responses: [] });
    // And with nobody touching the page, the file's own timer ends it.
    const idle = open(FILES.qd.html);
    idle.run(QD);
    idle.tick(60001);
    await until(() => idle.heading() === 'You finished. Thank you.');
    expect(idle.saveJson().score.completion).toBe('time');
  });

  it('opened again after the deadline has passed, it has ended', () => {
    const a = open(FILES.qd.html);
    a.run(QD);
    a.answer(scored(QD)[0]);
    const b = open(FILES.qd.html, { storage: a.storageDump(), clock: { t: 1, wall: a.time.wall + 600000, hidden: false } });
    expect(b.heading()).toBe('You finished. Thank you.');
    const file = b.saveJson();
    // 2026-11-13 (engine fixes): the time ran out while the page was closed, so completion says so and there is no score.
    expect(file.score).toMatchObject({ completion: 'time_up_away', score: null, noScoreReason: 'time_up_away', elapsedS: 60, itemsAttempted: 1 });
    expect(file.score.flags).toContain('time_up_away');
    // Away from the page until the deadline, not beyond it.
    expect(file.score.hiddenS).toBeCloseTo(59.7, 1);
    expect(file.items[3].flag).toBe('time_up');
  });

  it('does not pause when the page is hidden; hidden time is recorded, and flagged over 3 s', () => {
    const t = open(FILES.mc.html);
    t.run(MC);
    t.answer(scored(MC)[0]);
    t.tick(1000);
    t.show(true);
    t.tick(5000);
    t.show(false);
    expect(t.left()).toBe('Time left: 1:54');   // 120 - 0.3 - 1 - 5
    t.tick(700);
    t.type(expected(scored(MC)[1])); t.press('next');
    t.playAll(MC, { from: 2 });
    const file = t.saveJson();
    expect(file.score).toMatchObject({ hiddenS: 5, flags: ['left_the_page'], completion: 'complete' });
    // Time on the item itself leaves the hidden time out; the check's own time does not.
    expect(file.items[2].ms).toBe(1700);
    expect(file.score.elapsedS).toBeCloseTo(0.3 + 6.7 + 23 * 0.3, 1);
    const brief = open(FILES.mc.html);
    brief.run(MC);
    brief.show(true); brief.tick(2000); brief.show(false);
    brief.playAll(MC);
    expect(brief.saveJson().score).toMatchObject({ hiddenS: 2, flags: [] });
    // A phone that suspends the page stops performance.now, not the wall clock: the time still counts,
    // and it is not reported as a changed clock.
    const phone = open(FILES.qd.html);
    phone.run(QD);
    phone.show(true);
    phone.time.wall += 20000;
    phone.show(false);
    expect(phone.left()).toBe('Time left: 0:40');
    phone.playAll(QD);
    expect(phone.saveJson().score).toMatchObject({ hiddenS: 20, flags: ['left_the_page'], completion: 'complete', elapsedS: 27.5 });
  });

  it('is calm: plain text and a bar, heard only at the start, at 10 seconds and at the end', async () => {
    const t = open(FILES.qd.html);
    t.run(QD);
    const timer = t.q('[data-time-left]');
    expect(timer.getAttribute('role')).toBe('timer');
    expect(timer.closest('[aria-live]')).toBeNull();
    expect(t.q('.timebar').getAttribute('aria-hidden')).toBe('true');
    expect(t.q('.timebar span').style.width).toBe('100%');
    await settle();
    expect(t.live()).toBe('The clock has started. You have 1 minute.');
    t.tick(30000); t.show(false);
    expect(t.q('.timebar span').style.width).toBe('50%');
    await settle();
    expect(t.live()).toBe('The clock has started. You have 1 minute.');
    t.tick(20500); t.show(false);
    await settle();
    expect(t.live()).toBe('10 seconds left.');
    t.tick(5000); t.show(false);
    await settle();
    expect(t.live()).toBe('10 seconds left.');
    t.tick(5000); t.show(false);
    await settle();
    expect(t.live()).toBe('Time is up.');
    // No colour change, flashing or movement is styled for it.
    const css = /<style>([\s\S]*?)<\/style>/.exec(FILES.qd.html)[1];
    expect(css).toMatch(/\.timer\{[^}]*color:var\(--muted\)/);
    // 2026-11-13 (Aaron): the one motion in any file is the right-answer tick popping in, guarded by reduced motion.
    expect(css).toContain("@media (prefers-reduced-motion:no-preference){.choice.right::after{animation:lt-pop .25s ease-out}}@keyframes lt-pop{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}");
    expect(css.replace("@media (prefers-reduced-motion:no-preference){.choice.right::after{animation:lt-pop .25s ease-out}}@keyframes lt-pop{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}", '')).not.toMatch(/@keyframes|animation:(?!none)|transition:(?!none)|blink|\bred\b/);
    // Reduced motion: no bar, and the text moves in 5-second steps.
    const still = open(FILES.qd.html, { calm: true });
    still.run(QD);
    expect(still.q('.timebar')).toBeNull();
    still.tick(2800); still.show(false);
    expect(still.left()).toBe('Time left: 1:00');
    still.tick(3000); still.show(false);
    expect(still.left()).toBe('Time left: 0:55');
  });

  it('a check with no time limit has no clock, and still plays to the end', () => {
    const t = open(FILES.calm.html);
    t.start('Ana');
    expect(t.heading()).toBe('Get ready');
    expect(t.text()).toContain('There is no clock. Take your time.');
    t.begin();
    expect(t.q('[data-time-left]')).toBeNull();
    t.tick(3600000); t.show(false);
    expect(t.heading()).toBe('Question 1 of 3');
    t.playAll(CALM, { wrong: [1] });
    expect(t.heading()).toBe('You finished. Thank you.');
    const file = t.saveJson();
    expect(file.score).toMatchObject({ measure: 'math_items', scoreUnit: 'items_correct', score: 2, timeLimitS: null, completion: 'complete', prorated: false, itemsAttempted: 3, digitsCorrect: 3, digitsPossible: 4 });
    expect(pairs(parseCsv(t.saveCsv().body.slice(1))[5])).toMatchObject({ time_limit_s: '', score: '2', score_unit: 'items_correct' });
  });
});

describe('the finish screen', () => {
  it('thanks the learner and shows how many and how long, never right, wrong or a score', () => {
    const t = open(FILES.mc.html);
    t.run(MC);
    t.playAll(MC, { wrong: [1, 2, 3], skip: [5] });
    expect(t.heading()).toBe('You finished. Thank you.');
    // What is on the screen: the hidden panels (About, the Start over question) are left out.
    const view = t.q('#app').cloneNode(true);
    view.querySelectorAll('[hidden]').forEach((node) => node.remove());
    const shown = view.textContent;
    for (const line of ['You answered 24 of 25.', 'Time: 0:08.', NOT_GRADED, 'Save my work as a file', 'Save results as a spreadsheet file (CSV)', 'Copy for a spreadsheet', 'About this file']) expect(shown).toContain(line);
    expect(shown).not.toMatch(/\bright\b|wrong|correct|score|digits|per minute|%/i);
    expect(t.d.querySelectorAll('#app table, #app [data-review]')).toHaveLength(0);
    for (const hook of ['[data-save-json]', '[data-save-csv]', '[data-copy-tsv]', '[data-check-again]', '[data-teacher-open]', '[data-about-open]']) expect(t.q(hook)).not.toBeNull();
    // The practice finish line is not there.
    expect(shown).not.toContain('Right on the first try');
    const blob = t.saveCsv();
    expect(blob.name).toMatch(/^Math-Fluency-check-3A__Ana__\d{4}-\d{2}-\d{2}\.csv$/);
    // 2026-11-13 (engine fixes): a download cannot be seen to finish, so the file says the browser is saving it.
    expect(t.text()).toContain('Your browser is saving ' + blob.name + '.');
  });

  it('a finished check cannot be run again under its session id; Start over asks, mints a new id and counts the try', () => {
    const a = open(FILES.qd.html);
    a.run(QD, 'Ana');
    a.playAll(QD);
    const first = a.saveJson();
    expect(first.score.attempt).toBe(1);
    // Opened again: the finish screen, not a way to play it again.
    const b = open(FILES.qd.html, { storage: a.storageDump() });
    expect(b.heading()).toBe('You finished. Thank you.');
    expect(b.q('[data-check-begin]')).toBeNull();
    expect(b.saveJson().sessionId).toBe(first.sessionId);
    b.button('Start over').click();
    expect(b.q('[data-check-again-confirm]').hidden).toBe(false);
    expect(b.text()).toContain('Do you want to start this check again? It will be saved as a new try. Save your work first.');
    expect(b.heading()).toBe('You finished. Thank you.');
    b.button('Keep my work').click();
    expect(b.q('[data-check-again-confirm]').hidden).toBe(true);
    b.button('Start over').click();
    b.button('Yes, start over').click();
    expect(b.d.getElementById('learner-name').value).toBe('Ana');
    b.run(QD, 'Ana');
    b.playAll(QD, { wrong: [0] });
    const second = b.saveJson();
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(second.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/);
    expect(second.score.attempt).toBe(2);
    const rows = parseCsv(b.saveCsv().body.slice(1));
    expect(rows[28].slice(0, 2).concat(rows[28][7])).toEqual(['#summary', second.sessionId, 'attempt=2']);
    expect(pairs(rows[29]).attempt).toBe('2');
    // Tries are counted for each learner label, and no earlier label stays in the browser's storage.
    b.button('Start over').click();
    b.button('Yes, start over').click();
    b.run(QD, 'Ben');
    b.playAll(QD);
    expect(b.saveJson().score.attempt).toBe(1);
    expect(Object.values(b.storageDump()).join('')).not.toContain('Ana');
    expect(Object.keys(b.storageDump())).toHaveLength(1);
  });
});

describe('for the teacher', () => {
  const NO_CODE_LINE = 'To see each answer, make the check with a teacher code, or open the saved results file.';
  const reviewRows = (t) => [...t.d.querySelectorAll('[data-review] tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent));
  const reviewLines = (t) => [...t.d.querySelectorAll('[data-review] li')].map((li) => li.textContent);
  const unlock = async (t, code) => {
    const message = () => (t.q('[data-teacher] .status') || { textContent: '' }).textContent;
    t.q('#teacher-code').value = code; t.q('[data-teacher-show]').click();
    await until(() => !!t.q('[data-review]') || message() !== 'Checking the code...');
    return message();
  };

  // 2026-11-12: every student with the same grade and version gets the same items, so a screen anyone can open must
  // not show the key. Without a code it shows the score only; the saved results file still has every answer.
  it('with no code, a clearly labelled button shows the score only: no answers and no right or wrong per item', () => {
    const t = open(FILES.mc.html);
    t.run(MC);
    t.playAll(MC, { wrong: [1], skip: [3] });
    expect(t.q('#teacher-code')).toBeNull();
    expect(t.q('[data-teacher-open]').textContent).toBe('For the teacher: show results');
    t.q('[data-teacher-open]').click();
    expect(t.heading()).toBe('Results for the teacher');
    expect(t.q('[data-review]').getAttribute('data-review')).toBe('score-only');
    expect(t.d.querySelectorAll('#app table, #app th, #app td, #app tr')).toHaveLength(0);
    const lines = reviewLines(t);
    expect(lines[0]).toMatch(/^No score: every item was finished in under 20 seconds/);
    expect(lines.slice(1)).toEqual(['Items correct: 23 of 25 attempted (25 given).', lines[2], 'Time used: 7.5 s. Time limit: 120 s.',
      'Time with the page hidden or closed: 0 s.', 'Attempt 1 for this learner label on this device.', 'All times come from the clock of the learner device.', NO_CODE_LINE]);
    expect(lines[2]).toMatch(/^Digits correct: \d+ of \d+ possible on the items attempted\.$/);
    // No item, no answer and no right or wrong anywhere on the screen.
    const screen = t.q('#app').textContent;
    for (const word of ['Expected', 'Response', 'right', 'wrong', 'skipped', 'not reached', 'practice (not scored)']) expect(screen, word).not.toContain(word);
    for (const p of scored(MC).slice(0, 6)) expect(screen).not.toContain(p.a + ' ' + p.symbol + ' ' + p.b);
    t.button('Close the results').click();
    expect(t.heading()).toBe('You finished. Thank you.');
    expect(t.q('[data-review]')).toBeNull();
    // The saved results file is unchanged: it records each expected answer and each right or wrong, for the teacher.
    const file = t.saveJson();
    expect(file.items.map((it) => it.target)).toEqual(raws(MC).map((p) => String(expected(p))));
    expect(file.items.slice(1, 5).map((it) => [it.correct, it.flag || ''])).toEqual([[true, ''], [false, ''], [true, ''], [false, 'skipped']]);
    // A check that ran out of time: the flags and the score, and still no item list.
    const slow = open(FILES.qd.html);
    slow.run(QD);
    slow.answer(scored(QD)[0]);
    slow.tick(60000); slow.show(false);
    slow.q('[data-teacher-open]').click();
    expect(slow.d.querySelectorAll('[data-review] tr')).toHaveLength(0);
    expect(reviewLines(slow)[0]).toBe('Score: 1 items correct.');
    expect(reviewLines(slow)).toContain('Items correct: 1 of 1 attempted (' + scored(QD).length + ' given).');
    expect(reviewLines(slow).pop()).toBe(NO_CODE_LINE);
  });

  it('with a code, the screen asks for it: a wrong code is refused, the right one opens the full review', async () => {
    const t = open(FILES.coded.html);
    t.run(MC);
    t.playAll(MC, { wrong: [1], skip: [3] });
    expect(t.q('[data-teacher-open]')).toBeNull();
    expect(t.q('label[for="teacher-code"]').textContent).toBe('Teacher code');
    expect(t.q('#teacher-code').type).toBe('password');
    expect(await unlock(t, 'tulip-48')).toBe('That code is not correct. Tries left before a 30-second wait: 4.');
    expect(t.q('[data-review]')).toBeNull();
    expect(t.q('#teacher-code').value).toBe('');
    await unlock(t, 'tulip-47');
    expect(t.heading()).toBe('Results for the teacher');
    // As before 2026-11-12: every item with its response, right or wrong, and the expected answer.
    expect(t.q('[data-review]').getAttribute('data-review')).toBe('');
    expect([...t.d.querySelectorAll('[data-review] thead th')].map((th) => th.textContent)).toEqual(['No.', 'Item', 'Response', 'Result', 'Expected', 'Time (s)']);
    const rows = reviewRows(t);
    expect(rows).toHaveLength(26);
    const [s0, s1, s2, s3] = scored(MC);
    // 2026-11-13: the sample is of the form's own operation and size (2 × 3 for grade 3; tests/packets_math_vocab_fixes_2026_11_13b.test.js).
    expect(rows[0]).toEqual(['1', '2 ' + String.fromCharCode(0xD7) + ' 3', '6', 'practice (not scored)', '6', '0.3']);
    expect(rows[1]).toEqual(['2', s0.a + ' ' + s0.symbol + ' ' + s0.b, String(s0.answer), 'right', String(s0.answer), '0.3']);
    expect(rows[2]).toEqual(['3', s1.a + ' ' + s1.symbol + ' ' + s1.b, String(s1.answer + 1), 'wrong', String(s1.answer), '0.3']);
    expect(rows[3].slice(2, 5)).toEqual([String(s2.answer), 'right', String(s2.answer)]);
    expect(rows[4]).toEqual(['5', s3.a + ' ' + s3.symbol + ' ' + s3.b, '', 'skipped', String(s3.answer), '0.3']);
    const lines = reviewLines(t);
    expect(lines[0]).toMatch(/^No score: every item was finished in under 20 seconds/);
    expect(lines).toContain('Items correct: 23 of 25 attempted (25 given).');
    expect(lines).toContain('Time used: 7.5 s. Time limit: 120 s.');
    expect(lines).toContain('Attempt 1 for this learner label on this device.');
    expect(lines).not.toContain(NO_CODE_LINE);
    // Closed again, it asks again.
    t.button('Close the results').click();
    expect(t.q('[data-review]')).toBeNull();
    expect(t.q('#teacher-code').value).toBe('');
  }, 60000);

  it('with a code, a check that ran out of time shows which item it ended on and what was never reached', async () => {
    const slow = open(pack(QD, { teacherCode: 'tulip-47' }).html);
    slow.run(QD);
    slow.answer(scored(QD)[0]);
    slow.tick(60000); slow.show(false);
    await unlock(slow, 'tulip-47');
    const results = reviewRows(slow).map((row) => row[3]);
    expect(results.slice(0, 5)).toEqual(['practice (not scored)', 'practice (not scored)', 'right', 'time ran out', 'not reached']);
    expect(reviewLines(slow)[0]).toBe('Score: 1 items correct.');
  }, 60000);

  it('five wrong codes, then a 30 s wait that a reload does not clear', async () => {
    const t = open(FILES.coded.html);
    t.run(MC);
    t.playAll(MC);
    const message = (page) => (page.q('[data-teacher] .status') || { textContent: '' }).textContent;
    const offer = async (page, code) => { page.q('#teacher-code').value = code; page.q('[data-teacher-show]').click(); await until(() => !!page.q('[data-review]') || message(page) !== 'Checking the code...'); };
    for (let n = 1; n <= 4; n++) { await offer(t, 'wrong-' + n); expect(message(t)).toBe('That code is not correct. Tries left before a 30-second wait: ' + (5 - n) + '.'); }
    await offer(t, 'wrong-5');
    expect(message(t)).toBe('Too many incorrect codes. Wait 30 seconds, then try again.');
    // The right code does not open it during the wait.
    t.tick(10000);
    await offer(t, 'tulip-47');
    expect(message(t)).toBe('Too many incorrect codes. Wait 20 seconds, then try again.');
    expect(t.q('[data-review]')).toBeNull();
    const again = open(FILES.coded.html, { storage: t.storageDump(), clock: { t: 5, wall: t.time.wall + 5000, hidden: false } });
    await offer(again, 'tulip-47');
    expect(message(again)).toBe('Too many incorrect codes. Wait 15 seconds, then try again.');
    again.tick(15001);
    await offer(again, 'tulip-47');
    expect(again.heading()).toBe('Results for the teacher');
  }, 120000);

  it('the file holds the code only as a salted, iterated SHA-256, and says what the lock is', () => {
    const sealed = sealedOf(FILES.coded.html);
    expect(FILES.coded.html).not.toContain('tulip-47');
    expect(sealed.check.lock).toEqual({ salt: expect.stringMatching(/^[0-9a-f]{32}$/), rounds: 20000, hash: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(TH.CHECK_ROUNDS).toBeGreaterThanOrEqual(20000);
    const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
    let h = sha(sealed.check.lock.salt + '|tulip-47');
    for (let i = 1; i < 20000; i++) h = sha(h + sealed.check.lock.salt);
    expect(sealed.check.lock.hash).toBe(h);
    expect(sealedOf(FILES.mc.html).check.lock).toBeNull();
    // The comparison looks at every character.
    const { same } = TH.checkCodec(TH.sha256);
    expect([same('abc', 'abc'), same('abc', 'abd'), same('abc', 'xbc'), same('abc', 'ab'), same('ab', 'abc'), same('', ''), same('a', '')]).toEqual([true, false, false, false, false, true, false]);
    expect(FILES.coded.manifest.check.teacherCode).toBe('set; kept only as a salted SHA-256 hash (20000 rounds); it locks the review screen and is not encryption');
    expect(FILES.mc.manifest.check.teacherCode).toBe('none');
    // A code under 4 characters is refused when the file is built, by the builder and by the loader.
    expect(() => pack(MC, { teacherCode: '123' })).toThrow('The teacher code needs 4 or more characters.');
    expect(() => TH.buildHtml(MC, { teacherCode: '12' })).toThrow(/4 to 64 characters/);
  });
});

describe('scrambled answers', () => {
  const codec = TH.checkCodec(TH.sha256);
  const padded = (answer) => { const b = Buffer.alloc(12); b.write(String(answer), 'utf8'); return b; };

  it.each([['Quantity Discrimination', 'qd', QD], ['Missing Number', 'mn', MN], ['math computation', 'mc', MC]])('%s: no answer is readable in the item data', (_, id, lesson) => {
    const sealed = sealedOf(FILES[id].html);
    const items = sealed.blocks[0].items;
    expect(items).toHaveLength(raws(lesson).length);
    expect(sealed.check.salt).toMatch(/^[0-9a-f]{32}$/);
    items.forEach((item, i) => {
      const answer = String(expected(raws(lesson)[i]));
      // Only what the screen draws, an id and the scrambled answer.
      // 2026-11-13: shown, the problem as the screen shows it (the minus sign), when it differs from the form's text.
      const allowed = { qd: ['id', 'word', 'left', 'right', 'key', 'practice'], mn: ['id', 'word', 'display', 'shown', 'key', 'practice'], mc: ['id', 'word', 'a', 'b', 'symbol', 'key', 'practice'] }[id];
      expect(Object.keys(item).filter((k) => !allowed.includes(k)), item.id).toEqual([]);
      // The same length whatever the answer, and not the answer's own bytes.
      expect(item.key).toMatch(/^[A-Za-z0-9+/]{16}$/);
      expect(Buffer.from(item.key, 'base64').equals(padded(answer))).toBe(false);
      // It comes back only with the file's salt and the item's id.
      expect(codec.unscramble(item.key, sealed.check.salt, item.id)).toBe(answer);
      expect(codec.unscramble(item.key, sealed.check.salt, item.id + 'x')).not.toBe(answer);
      expect(codec.unscramble(item.key, '0'.repeat(32), item.id)).not.toBe(answer);
    });
    // Two items with the same answer do not share a scrambled form.
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
    expect(JSON.stringify(sealed.blocks)).not.toMatch(/"(?:answer|target|correct|bigger|missingPos|op)"/);
    // The builder's own lesson, with its answers, is left as it was.
    expect(raws(lesson).some((p) => p.answer != null)).toBe(true);
  });

  it('Quantity Discrimination: nothing in an item says which number is bigger', () => {
    const items = sealedOf(FILES.qd.html).blocks[0].items;
    const biggerLeft = items.filter((item) => item.left > item.right).length;
    expect(biggerLeft).toBeGreaterThan(3);
    expect(items.length - biggerLeft).toBeGreaterThan(3);
    // The prompt kept for the results file names the two numbers in the order shown.
    items.forEach((item) => expect(item.word).toBe(item.left + ' or ' + item.right));
  });

  it('"About this file" says so, in these words, and names the lock only when there is one', () => {
    const t = open(FILES.qd.html);
    t.q('[data-about-open]').click();
    const plain = t.q('[data-about]').textContent;
    for (const line of ['This is a check in one file. It works with no internet.', NOT_GRADED, ABOUT_SCRAMBLED, 'The clock uses the time on this device. It keeps going when you leave the page.',
      'It also keeps a count of how many times this check was started on this device.', 'It never connects to the internet.', 'License: AGPL-3.0.']) expect(plain).toContain(line);
    expect(plain).not.toContain('practice activity');
    expect(plain).not.toContain('teacher code');
    const coded = open(FILES.coded.html);
    coded.q('[data-about-open]').click();
    expect(coded.q('[data-about]').textContent).toContain(ABOUT_SCRAMBLED);
    expect(coded.q('[data-about]').textContent).toContain(ABOUT_CODE);
    expect(TH.CHECK_LABELS.check_about_scrambled).toBe(ABOUT_SCRAMBLED);
    expect(TH.CHECK_LABELS.check_about_code).toBe(ABOUT_CODE);
    expect(TH.CHECK_LABELS.check_about).toBe(NOT_GRADED);
  });

  it('round-trips any answer text, and the salt comes from the lesson and the code, not the clock', () => {
    for (const text of ['0', '-12', '99999999', 'cat', 'ñandú', 'a longer answer than twelve bytes, for a later kind of check']) {
      const key = codec.scramble(text, 'salt', 'item-1');
      expect(codec.unscramble(key, 'salt', 'item-1')).toBe(text);
      expect(Buffer.from(key, 'base64').length % 12).toBe(0);
    }
    const salt = (file) => sealedOf(file.html).check.salt;
    expect(salt(pack(MC))).toBe(salt(FILES.mc));
    expect(salt(FILES.coded)).not.toBe(salt(FILES.mc));
    expect(salt(pack(form('math_computation', '3', 'B')))).not.toBe(salt(FILES.mc));
  });
});

describe('the number pad', () => {
  it('has digits, delete and Next, large enough to touch; minus only when the check needs it', () => {
    const t = open(FILES.mc.html);
    t.run(MC);
    expect([...t.d.querySelectorAll('.pad button')].map((b) => b.getAttribute('data-key'))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'back', 'next']);
    expect(t.q('[data-key="back"]').getAttribute('aria-label')).toBe('Delete');
    expect(t.q('[data-key="next"]').textContent).toBe('Next');
    const css = /<style>([\s\S]*?)<\/style>/.exec(FILES.mc.html)[1];
    expect(css).toContain('.pad button{min-height:56px');
    expect(css).toMatch(/\.pad\{display:grid;grid-template-columns:repeat\(3,minmax\(64px,96px\)\)/);
    expect(css).toContain('button{font:inherit;min-height:48px;min-width:48px');
    expect(sealedOf(FILES.mc.html).check.minus).toBe(false);
    const signed = open(FILES.calm.html);
    signed.start('Ana'); signed.begin();
    expect(sealedOf(FILES.calm.html).check.minus).toBe(true);
    expect(signed.q('[data-key="minus"]').getAttribute('aria-label')).toBe('Minus');
    signed.tick(300);
    signed.type('5'); signed.press('minus');
    expect(signed.q('[data-pad-input]').value).toBe('-5');
    signed.press('minus');
    expect(signed.q('[data-pad-input]').value).toBe('5');
    signed.press('minus'); signed.press('next');
    signed.playAll(CALM, { from: 1 });
    const file = signed.saveJson();
    expect(file.items[0]).toMatchObject({ word: '3 ' + String.fromCharCode(0x2212) + ' 8', target: '-5', responses: ['-5'], correct: true, digitsCorrect: 1, digitsPossible: 1 });
    // The leading minus of a response is guarded in the spreadsheet file like any other cell.
    expect(parseCsv(signed.saveCsv().body.slice(1))[1].slice(15, 18)).toEqual(['3 ' + String.fromCharCode(0x2212) + ' 8', "'-5", "'-5"]);
  });

  it('types, deletes, stops at 8 digits, and Next waits for a digit', () => {
    const t = open(FILES.mc.html);
    t.run(MC);
    const input = t.q('[data-pad-input]');
    const next = t.q('[data-key="next"]');
    expect(next.getAttribute('aria-disabled')).toBe('true');
    t.tick(300);
    t.press('next');
    expect(t.heading()).toBe('Question 1 of 25');
    t.type('407');
    expect(input.value).toBe('407');
    expect(next.getAttribute('aria-disabled')).toBe('false');
    t.press('back');
    expect(input.value).toBe('40');
    t.press('back'); t.press('back'); t.press('back');
    expect(input.value).toBe('');
    expect(next.getAttribute('aria-disabled')).toBe('true');
    t.type('1234567890');
    expect(input.value).toBe('12345678');
    // No minus key in this check: none can be typed either.
    expect(t.q('[data-key="minus"]')).toBeNull();
    input.value = '-9a 1'; input.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    expect(input.value).toBe('91');
    t.press('next');
    expect(t.heading()).toBe('Question 2 of 25');
    expect(t.state().items[1].responses).toEqual(['91']);
  });

  it('takes a hardware keyboard, wherever the focus is', () => {
    const t = open(FILES.mc.html);
    t.run(MC);
    const input = () => t.q('[data-pad-input]');
    expect(t.d.activeElement).toBe(input());
    expect(input().getAttribute('inputmode')).toBe('numeric');
    expect(input().getAttribute('aria-label')).toBe('9 ' + String.fromCharCode(0xD7) + ' 7. Type the answer.');
    t.tick(300);
    // Focus on the page, not in the box.
    for (const k of ['6', 'x', '4', 'Backspace', '3', '-']) t.key(k);
    expect(input().value).toBe('63');
    t.key('6', t.q('[data-key="1"]'));
    expect(input().value).toBe('636');
    t.key('Backspace', t.q('#app h2'));
    // With Ctrl held it is a shortcut, not an answer; a held-down key does not repeat.
    t.d.body.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: '5', ctrlKey: true, bubbles: true, cancelable: true }));
    t.d.body.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: '5', repeat: true, bubbles: true, cancelable: true }));
    expect(input().value).toBe('63');
    t.key('Enter');
    expect(t.heading()).toBe('Question 2 of 25');
    expect(t.state().items[1].responses).toEqual(['63']);
    // Typing in the box itself: Enter sends it.
    t.tick(300);
    input().value = '3'; input().dispatchEvent(new t.w.Event('input', { bubbles: true }));
    t.key('Enter', input());
    expect(t.heading()).toBe('Question 3 of 25');
    // Quantity Discrimination: keys 1 and 2 pick the first and the second number.
    const qd = open(FILES.qd.html);
    qd.run(QD);
    qd.tick(300); qd.key('2');
    qd.tick(300); qd.key('1');
    qd.tick(300); qd.key('7');
    expect(qd.heading()).toBe('Question 3 of 25');
    expect(qd.state().items.slice(2, 4).map((r) => r.responses[0])).toEqual([String(scored(QD)[0].right), String(scored(QD)[1].left)]);
  });

  it('on a touch screen the box does not call the system keyboard', () => {
    const t = open(FILES.mc.html, { touch: true });
    t.run(MC);
    expect(t.q('[data-pad-input]').getAttribute('inputmode')).toBe('none');
    t.tick(300); t.type('63'); t.press('next');
    expect(t.state().items[1].responses).toEqual(['63']);
  });
});

describe('the results of a check', () => {
  const played = () => {
    const t = open(FILES.mc.html, { subtle: true });
    t.run(MC, 'Ana');
    t.tick(1700);
    t.answer(scored(MC)[0]);
    t.playAll(MC, { from: 1, wrong: [2], skip: [4] });   // 9.2 s in all: too fast for a rate
    t.tick(15000);
    return t;
  };
  // The browser makes the SHA-256 a moment after the finish screen shows.
  const sealed = (t) => until(() => t.saveJson().integrity.method === 'sha256');

  it('the spreadsheet file has the two new columns after "flag" and a #score row', async () => {
    const t = open(FILES.mc.html, { subtle: true });
    t.run(MC, 'Ana');
    scored(MC).forEach((raw, i) => { t.tick(700); if (i === 4) { t.tick(300); t.q('[data-skip]').click(); } else t.answer(raw, i !== 2); });
    await sealed(t);
    const file = t.saveJson();
    const blob = t.saveCsv();
    const lines = blob.body.slice(1).split('\r\n');
    expect(blob.body.charCodeAt(0)).toBe(0xFEFF);
    expect(lines[0]).toBe(CHECK_HEADER);
    const rows = parseCsv(blob.body.slice(1));
    expect(rows).toHaveLength(1 + 26 + 3);
    expect(rows.slice(0, 27).every((r) => r.length === 26)).toBe(true);
    expect(rows[0].slice(23)).toEqual(['flag', 'digits_correct', 'digits_possible']);
    const item = scored(MC);
    // format .. mode, then the item cells.
    expect(rows[2].slice(0, 7)).toEqual(['alloflow-packet-result/1', file.sessionId, 'math-computation-g3', MC.revision, 'A', 'check', 'Ana']);
    // 2026-11-13: the grade 3 sample is 2 × 3.
    expect(rows[1].slice(10)).toEqual(['1', 'math_computation-p0', 'math_computation', 'Math Fluency', '0', '2 ' + String.fromCharCode(0xD7) + ' 3', '6', '6', '1', '1', '1', '300', '', '', '', '']);
    expect(rows[2].slice(10)).toEqual(['2', 'math_computation-0', 'math_computation', 'Math Fluency', '1', '9 ' + String.fromCharCode(0xD7) + ' 7', '63', '63', '1', '1', '1', '1000', '', '', '2', '2']);
    expect(rows[4].slice(16)).toEqual([String(item[2].answer), String(item[2].answer + 1), '0', '0', '1', '1000', '', '', String(appDigits(item[2].answer, item[2].answer + 1)), String(String(item[2].answer).length)]);
    expect(rows[6].slice(16)).toEqual([String(item[4].answer), '', '0', '0', '1', '1000', '', 'skipped', '0', String(String(item[4].answer).length)]);
    // The trailer: summary (with the try), score, integrity last.
    const digits = item.reduce((sum, p, i) => sum + (i === 4 ? 0 : appDigits(p.answer, i === 2 ? p.answer + 1 : p.answer)), 0);
    const possible = item.reduce((sum, p) => sum + String(p.answer).length, 0);
    // 2026-11-13: then the time on the items (activeMs, the items' ms added up), a file saved from then on.
    expect(file.activeMs).toBe(file.items.reduce((n, it) => n + it.ms, 0));
    expect(rows[27]).toEqual(['#summary', file.sessionId, 'items_given=25', 'attempted=25', 'correct=23', 'first_try=23', 'accuracy_pct=92', 'attempt=1', 'title=Math Fluency check (3A)', 'active_s=' + Math.round(file.activeMs / 1000)]);
    expect(file.lessonTitle).toBe('Math Fluency check (3A)');
    expect(rows[28]).toEqual(['#score', file.sessionId, 'measure=math_dcpm', 'score=' + Math.round(digits / (25 / 60)), 'score_unit=digits_correct_per_minute', 'digits_correct=' + digits, 'digits_possible=' + possible,
      'items_correct=23', 'items_attempted=25', 'time_limit_s=120', 'elapsed_s=25', 'hidden_s=0', 'completion=complete', 'prorated=1', 'scoring_version=3', 'form_version=2', 'attempt=1', 'flags=',
      // Re-pinned 2026-11-12: the last cell names the reading tools on during a scored item (none here); the row is outside the integrity value.
      'tools_used=']);
    expect(rows[29]).toEqual(['#integrity', 'sha256', file.integrity.value, 'detects accidental edits, not deliberate ones']);
    // The digit columns add up to the score row.
    expect(rows.slice(1, 27).reduce((sum, r) => sum + Number(r[24]), 0)).toBe(digits);
    expect(rows.slice(1, 27).reduce((sum, r) => sum + Number(r[25]), 0)).toBe(possible);
    // The integrity value covers exactly the item rows as they sit in the file, new cells included.
    const basis = [file.packet.id, file.packet.version, 'A', file.sessionId].join('|') + '\n' + lines.slice(1, 27).join('\n');
    expect(TH.resultsCsv(file).basis).toBe(basis);
    expect(file.integrity).toMatchObject({ method: 'sha256', value: createHash('sha256').update(basis, 'utf8').digest('hex') });
    // The text to paste has the same 26 columns and no trailer.
    const tsv = TH.resultsCsv(file).tsv().split('\n');
    expect(tsv).toHaveLength(27);
    expect(tsv.every((l) => l.split('\t').length === 26)).toBe(true);
  });

  it('the JSON carries the score block, and parseResult reads it back', async () => {
    const t = played();
    await sealed(t);
    const file = t.saveJson();
    expect(file).toMatchObject({ kind: 'alloflow-take-home-result', schemaVersion: 3, learner: 'Ana', packet: { id: 'math-computation-g3', version: MC.revision, engine: 'alloflow-packet/1', form: 'A', mode: 'check' } });
    // Re-pinned 2026-11-12: "tools", the reading tools on during a scored item, comes last.
    expect(Object.keys(file.score)).toEqual(['measure', 'score', 'scoreUnit', 'digitsCorrect', 'digitsPossible', 'itemsCorrect', 'itemsAttempted', 'timeLimitS', 'elapsedS', 'hiddenS', 'completion', 'prorated',
      'noScoreReason', 'scoringVersion', 'formVersion', 'attempt', 'flags', 'tools']);
    expect(file.score).toMatchObject({ measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', itemsCorrect: 23, itemsAttempted: 25, timeLimitS: 120, elapsedS: 9.2, hiddenS: 0, completion: 'complete',
      prorated: false, score: null, noScoreReason: 'too_fast', scoringVersion: 3, formVersion: 2, attempt: 1, flags: [] });
    expect(file.items[1]).toMatchObject({ n: 2, itemId: 'math_computation-0', word: '9 ' + String.fromCharCode(0xD7) + ' 7', target: '63', responses: ['63'], correct: true, firstTry: true, attempts: 1, done: true, ms: 2000,
      practice: null, flag: '', digitsCorrect: 2, digitsPossible: 2 });
    expect(file.items[0]).toMatchObject({ practice: 'practice', digitsCorrect: null, digitsPossible: null });
    expect(JSON.stringify(file)).not.toContain('"shown"');
    const parsed = TH.parseResult(JSON.stringify(file));
    expect([parsed.ok, parsed.integrity]).toEqual([true, 'ok']);
    // parseResult calls every check 'probe', whichever of the two values its file has.
    expect(parsed.result).toMatchObject({ mode: 'probe', form: 'A', sessionId: file.sessionId, learnerName: 'Ana', score: file.score });
    expect(parsed.result.items[1]).toMatchObject({ digitsCorrect: 2, digitsPossible: 2, correct: true, practice: null });
    expect(parsed.result.items[0]).toMatchObject({ digitsCorrect: null, digitsPossible: null, practice: 'practice' });
    expect(parsed.result.items[5]).toMatchObject({ flag: 'skipped', digitsCorrect: 0 });
    // A file saved before 2026-11-12 says mode "probe", and its value was made over rows that say "probe" (SPEC.md:
    // the mode cell is part of each item row). Made here from the CSV rows, not with the loader's own code.
    const csvRows = parseCsv(t.saveCsv().body.slice(1)).slice(1, 27);
    const quoteRow = (cells) => cells.map((c) => '"' + c.replace(/"/g, '""') + '"').join(',');
    const valueOf = (mode) => createHash('sha256').update([file.packet.id, file.packet.version, 'A', file.sessionId].join('|') + '\n'
      + csvRows.map((r) => quoteRow(r.slice(0, 5).concat(mode, r.slice(6)))).join('\n'), 'utf8').digest('hex');
    expect(valueOf('check')).toBe(file.integrity.value);
    const old = JSON.parse(JSON.stringify(file));
    old.packet.mode = 'probe'; old.integrity.value = valueOf('probe');
    expect(TH.parseResult(old)).toMatchObject({ ok: true, integrity: 'ok', result: { mode: 'probe', form: 'A', score: file.score } });
    expect(TH.parseResult(old).result.items[1]).toMatchObject({ digitsCorrect: 2, digitsPossible: 2 });
    expect(TH.resultsCsv(old).text(old.integrity).split('\r\n')[0].slice(1)).toBe(CHECK_HEADER);
    // The mode is covered: the old value does not fit the new mode, nor the new value the old one.
    expect(TH.parseResult({ ...old, packet: { ...old.packet, mode: 'check' } }).integrity).toBe('changed');
    expect(TH.parseResult({ ...file, packet: { ...file.packet, mode: 'probe' } }).integrity).toBe('changed');
    // An edited digit cell or mark shows as "changed". The score block and the #summary row are outside the value.
    for (const edit of [(f) => { f.items[1].digitsCorrect = 1; }, (f) => { f.items[3].digitsPossible += 1; }, (f) => { f.items[3].correct = true; }, (f) => { f.packet.form = 'B'; }, (f) => { f.items[5].flag = ''; }]) {
      const copy = JSON.parse(JSON.stringify(file));
      edit(copy);
      expect(TH.parseResult(copy).integrity).toBe('changed');
    }
    const rescored = JSON.parse(JSON.stringify(file));
    rescored.score.score = 99;
    expect(TH.parseResult(rescored)).toMatchObject({ integrity: 'ok', result: { score: { score: 99 } } });
    // A hostile score block is read as plain values.
    const odd = TH.parseResult({ ...file, score: { measure: {}, score: 'x', completion: 'won', flags: 'no', prorated: 'yes', attempt: -3 } }).result.score;
    expect(odd).toMatchObject({ score: null, completion: '', flags: [], prorated: false, attempt: 1 });
  });

  it('a practice file keeps its 24 columns and two trailer rows', () => {
    const table = TH.resultsCsv({ sessionId: 's', packet: { id: 'P', version: 'r', form: '', mode: 'practice' }, items: [{ activity: 'isolation', digitsCorrect: 2, digitsPossible: 2, correct: true, attempts: 1 }], score: { score: 5 } });
    expect(table.header).toHaveLength(24);
    expect(table.rows[0]).toHaveLength(24);
    const rows = parseCsv(table.text({ method: 'fnv1a', value: 'x' }).slice(1));
    expect(rows.map((r) => r[0])).toEqual(['format', 'alloflow-packet-result/1', '#summary', '#integrity']);
    // No title in the result, no title cell: the summary row of a file saved before 2026-11-11.
    expect(rows[2]).toHaveLength(7);
    const titled = TH.resultsCsv({ sessionId: 's', packet: { id: 'P', version: 'r', form: '', mode: 'practice' }, lessonTitle: 'Short a', items: [{ activity: 'isolation', correct: true, attempts: 1 }] });
    expect(parseCsv(titled.text({ method: 'fnv1a', value: 'x' }).slice(1))[2]).toEqual(['#summary', 's', 'items_given=1', 'attempted=1', 'correct=1', 'first_try=0', 'accuracy_pct=100', 'title=Short a']);
    expect(TH.parseResult({ kind: 'alloflow-take-home-result', schemaVersion: 3, lessonId: 'L', items: [{ activity: 'isolation' }] }).result).not.toHaveProperty('score');
  });
});

// The app's own functions, cut from its source.
const fluency = readFileSync('math_fluency_module.js', 'utf8');
const cut = (source, from, to) => { const a = source.indexOf(from); const b = source.indexOf(to, a); if (a < 0 || b < 0) throw new Error('not found: ' + from); return source.slice(a, b); };
const APP_DIGITS_SOURCE = cut(fluency, '  function countCorrectDigits(expected, actual) {', '\n  // Keeps digits and one leading minus sign');
const appDigits = new Function(APP_DIGITS_SOURCE + '\nreturn countCorrectDigits;')();
const appCountDigits = new Function(cut(fluency, '  function countDigits(n) {', '\n\n') + '\nreturn countDigits;')();

describe('the dashboard reader as it is today (student_analytics_module.js, not changed with check mode)', () => {
  it('reads a check\'s spreadsheet file and finds its integrity value ok: it hashes the rows as saved, new cells included', async () => {
    const analytics = readFileSync('student_analytics_module.js', 'utf8');
    const reader = new Function(cut(analytics, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {')
      + cut(analytics, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(') + '\nreturn _acThReadFile;')();
    const t = open(FILES.mc.html);
    t.run(MC, 'Blue Heron');
    t.playAll(MC, { wrong: [2], skip: [4] });
    const blob = t.saveCsv();
    const fileOf = (body) => new File([body], blob.name, { type: 'text/csv', lastModified: Date.UTC(2026, 10, 20) });
    const read = await reader(fileOf(blob.body));
    expect(read.reason).toBe('');
    expect(read.sessions).toHaveLength(1);
    expect(read.sessions[0]).toMatchObject({ learner: 'Blue Heron', integrity: 'ok' });
    // One digits_correct cell edited by hand: the reader says the file changed.
    const edited = blob.body.replace('"","2","2"\r\n', '"","1","2"\r\n');
    expect(edited).not.toBe(blob.body);
    expect((await reader(fileOf(edited))).sessions[0].integrity).toBe('changed');
  });
});

describe('digits correct: the copy in the file and the app\'s function', () => {
  const score = TH.CHECK_ADAPTERS.math_computation.score;

  it('the copy is the app\'s function, line for line', () => {
    const adapter = readFileSync('word_sounds_take_home/check_adapters/math_computation.js', 'utf8');
    const copy = cut(adapter, '    function countCorrectDigits(expected, actual) {', '\n    // END COPY');
    const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);
    expect(lines(copy)).toEqual(lines(APP_DIGITS_SOURCE));
    expect(lines(APP_DIGITS_SOURCE).length).toBeGreaterThan(10);
    // And it is that copy the built file carries.
    expect(scriptOf(FILES.mc.html)).toContain(score.toString());
  });

  it('gives the same count as the app on generated answers', () => {
    let seed = 20261111;
    const rand = (n) => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed % n; };
    const cases = [[0, 0], [12, -12], [-12, 12], [-12, -12], [0, -0], [5, 15], [15, 5], [100, 1], [1, 100], [63, 36], [99999999, 99999999], [10, 0], [0, 10]];
    while (cases.length < 600) {
      const expectedValue = rand(4) === 0 ? rand(20000) - 5000 : rand(145);
      const kind = rand(6);
      const actual = kind === 0 ? expectedValue : kind === 1 ? -expectedValue : kind === 2 ? expectedValue + rand(21) - 10 : kind === 3 ? Number(String(Math.abs(expectedValue)).split('').reverse().join('')) : kind === 4 ? expectedValue * 10 + rand(10) : rand(20000) - 5000;
      cases.push([expectedValue, actual]);
    }
    let nonZero = 0;
    for (const [want, got] of cases) {
      const mark = score({}, String(want), String(got));
      expect(mark.digitsCorrect, want + ' answered ' + got).toBe(appDigits(want, got));
      expect(mark.digitsPossible, 'digits in ' + want).toBe(appCountDigits(want));
      expect(mark.correct).toBe(Number(want) === Number(got));
      if (mark.digitsCorrect) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(150);
    // What is not a whole number earns nothing.
    for (const junk of ['', ' ', 'abc', '1.5', '--3', '1e3', null, undefined]) expect(score({}, '12', junk)).toEqual({ correct: false, digitsCorrect: 0, digitsPossible: 2 });
  });

  it('the other two measures score right or wrong only', () => {
    const qd = TH.CHECK_ADAPTERS.quantity_discrimination.score, mn = TH.CHECK_ADAPTERS.missing_number.score;
    expect([qd({}, '9', '9'), qd({}, '9', '2'), qd({}, '9', '')]).toEqual([true, false, false].map((correct) => ({ correct, digitsCorrect: null, digitsPossible: null })));
    expect([mn({}, '6', '6'), mn({}, '6', '06'), mn({}, '6', '7'), mn({}, '-2', '-2'), mn({}, '6', ''), mn({}, '6', '6a')].map((m) => m.correct)).toEqual([true, true, false, true, false, false]);
  });
});

describe('the score: the app\'s proration rules', () => {
  const dcpm = { measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: 120, scoringVersion: 3, formVersion: 2 };
  const rows = (digits) => [{ practice: true, attempted: true, correct: true, digitsCorrect: null, digitsPossible: null }, { practice: false, attempted: true, correct: true, digitsCorrect: digits, digitsPossible: digits + 2 },
    { practice: false, attempted: true, correct: false, digitsCorrect: 0, digitsPossible: 2 }, { practice: false, attempted: false, correct: false, digitsCorrect: null, digitsPossible: null }];
  const score = (meta, digits, timing) => TH.checkScore(meta, rows(digits), timing);

  it('time ran out: digits correct over the whole limit, not prorated', () => {
    expect(score(dcpm, 34, { elapsedMs: 120000, completion: 'time' })).toEqual({ measure: 'math_dcpm', score: 17, scoreUnit: 'digits_correct_per_minute', digitsCorrect: 34, digitsPossible: 38, itemsCorrect: 1,
      itemsAttempted: 2, timeLimitS: 120, elapsedS: 120, hiddenS: 0, completion: 'time', prorated: false, noScoreReason: '', scoringVersion: 3, formVersion: 2, attempt: 1, flags: [] });
    // The time used is never more than the limit, even if the clock ran on.
    expect(score(dcpm, 34, { elapsedMs: 126400, completion: 'time' })).toMatchObject({ score: 17, elapsedS: 120 });
    expect(score(dcpm, 34, { elapsedMs: 126400, completion: 'complete' })).toMatchObject({ score: 17, elapsedS: 120, prorated: false });
  });
  it('every item done before the limit: prorated over the time used', () => {
    expect(score(dcpm, 30, { elapsedMs: 60000, completion: 'complete' })).toMatchObject({ score: 30, prorated: true, elapsedS: 60, noScoreReason: '' });
    expect(score(dcpm, 30, { elapsedMs: 90000, completion: 'complete' })).toMatchObject({ score: 20, prorated: true });
    expect(score(dcpm, 30, { elapsedMs: 20000, completion: 'complete' })).toMatchObject({ score: 90, prorated: true });
  });
  it('under 20 seconds: no score', () => {
    expect(score(dcpm, 30, { elapsedMs: 19999, completion: 'complete' })).toMatchObject({ score: null, prorated: false, noScoreReason: 'too_fast', digitsCorrect: 30 });
    expect(score(dcpm, 30, { elapsedMs: 0, completion: 'complete' })).toMatchObject({ score: null, noScoreReason: 'too_fast' });
  });
  it('ended early: no score, in either unit', () => {
    expect(score(dcpm, 30, { elapsedMs: 60000, completion: 'ended_early' })).toMatchObject({ score: null, prorated: false, noScoreReason: 'ended_early', completion: 'ended_early' });
    expect(score({ scoreUnit: 'items_correct', timeLimitS: 60 }, 30, { elapsedMs: 30000, completion: 'ended_early' })).toMatchObject({ score: null, noScoreReason: 'ended_early', itemsCorrect: 1 });
  });
  it('no time limit: a rate has no meaning; a count does', () => {
    expect(score({ ...dcpm, timeLimitS: null }, 30, { elapsedMs: 60000, completion: 'complete' })).toMatchObject({ score: null, noScoreReason: 'untimed', timeLimitS: null, elapsedS: 60 });
    expect(score({ scoreUnit: 'items_correct', timeLimitS: null }, 30, { elapsedMs: 5000, completion: 'complete' })).toMatchObject({ score: 1, prorated: false, digitsCorrect: 30 });
  });
  it('items correct is a count: finishing early or fast changes nothing', () => {
    const qd = { measure: 'quantity_discrimination', scoreUnit: 'items_correct', timeLimitS: 60, scoringVersion: 1, formVersion: 2 };
    const plain = [{ attempted: true, correct: true }, { attempted: true, correct: false }, { attempted: true, correct: true }, { attempted: false, correct: false }];
    expect(TH.checkScore(qd, plain, { elapsedMs: 9000, completion: 'complete', hiddenMs: 4321, attempt: 3, flags: ['left_the_page'] })).toEqual({ measure: 'quantity_discrimination', score: 2, scoreUnit: 'items_correct',
      digitsCorrect: null, digitsPossible: null, itemsCorrect: 2, itemsAttempted: 3, timeLimitS: 60, elapsedS: 9, hiddenS: 4.3, completion: 'complete', prorated: false, noScoreReason: '', scoringVersion: 1, formVersion: 2,
      attempt: 3, flags: ['left_the_page'] });
  });
  it('matches the arithmetic of finishProbe in math_fluency_module.js over a grid', () => {
    // The lines it mirrors are still in the app.
    for (const line of ['var MF_MIN_PRORATED_SECONDS = 20;', 'var MF_SCORING_VERSION = 3;', 'var elapsedMinutes = Math.max(1 / 60, elapsedSeconds / 60);', 'var calculatedDcpm = Math.round(totalDigitsCorrect / elapsedMinutes);',
      "var completedEarly = !isUntimed && finishReason === 'complete' && elapsedSeconds < config.timeLimit;", 'var belowProrationMinimum = formExhausted && elapsedSeconds < MF_MIN_PRORATED_SECONDS;']) expect(fluency).toContain(line);
    for (const limit of [60, 120]) for (const elapsedMs of [1, 5000, 19900, 20000, 20100, 45678, 59999, 60000, 119999, 120000, 150000]) for (const digits of [0, 1, 17, 58]) for (const completion of ['complete', 'time']) {
      // finishProbe, for a fixed form: reason 'complete' or 'time'.
      const elapsedSeconds = Math.min(limit, completion === 'time' ? limit : elapsedMs / 1000);
      const completedEarly = completion === 'complete' && elapsedSeconds < limit;
      const below = completedEarly && elapsedSeconds < 20;
      const want = below ? null : Math.round((digits + 0) / Math.max(1 / 60, elapsedSeconds / 60));
      const got = score({ ...dcpm, timeLimitS: limit }, digits, { elapsedMs, completion });
      expect([got.score, got.prorated], [limit, elapsedMs, digits, completion].join(' ')).toEqual([want, completedEarly && want != null]);
    }
  });
});

describe('each measure plays to a saved file, on a real form', () => {
  it('Quantity Discrimination, kindergarten form A: 60 s, items correct', () => {
    expect([QD.lessonId, QD.form, QD.timeLimitS, QD.title, QD.check]).toEqual(['quantity-discrimination-gk', 'A', 60, 'Quantity Discrimination check (KA)',
      { measure: 'quantity_discrimination', scoreUnit: 'items_correct', scoringVersion: 1, formVersion: BANK.QUANTITY_DISCRIMINATION_PROBES.K.A.version, allowSkip: false, grade: 'K' }]);
    const t = open(FILES.qd.html);
    t.run(QD, 'Blue Heron');
    t.playAll(QD, { wrong: [3, 11] });
    const rows = parseCsv(t.saveCsv().body.slice(1));
    expect(rows).toHaveLength(1 + 27 + 3);
    const given = BANK.QUANTITY_DISCRIMINATION_PROBES.K.A.problems;
    rows.slice(3, 28).forEach((row, i) => {
      const p = given[i], miss = i === 3 || i === 11;
      expect(row.slice(2, 7).concat(row.slice(10)), 'item ' + i).toEqual(['quantity-discrimination-gk', QD.revision, 'A', 'check', 'Blue Heron', String(i + 3), 'quantity_discrimination-' + i, 'quantity_discrimination', 'Quantity Discrimination',
        '1', p.left + ' or ' + p.right, String(p.answer), String(miss ? Math.min(p.left, p.right) : p.answer), miss ? '0' : '1', miss ? '0' : '1', '1', '300', '', '', '', '']);
    });
    expect(pairs(rows[29])).toEqual({ measure: 'quantity_discrimination', score: '23', score_unit: 'items_correct', digits_correct: '', digits_possible: '', items_correct: '23', items_attempted: '25', time_limit_s: '60',
      // Re-pinned 2026-11-12: tools_used, the reading tools on during a scored item (none here).
      elapsed_s: '7.5', hidden_s: '0', completion: 'complete', prorated: '0', scoring_version: '1', form_version: '2', attempt: '1', flags: '', tools_used: '' });
  });

  it('Missing Number, grade 1 form A: 120 s, the typed number shows in the blank', () => {
    expect([MN.lessonId, MN.form, MN.timeLimitS, MN.check.measure, MN.check.allowSkip, MN.activityTitles]).toEqual(['missing-number-g1', 'A', 120, 'missing_number', true, { missing_number: 'Missing Number' }]);
    const t = open(FILES.mn.html);
    t.start('Ana');
    expect(t.heading()).toBe('Practice 1 of 1');
    t.practise(MN);
    expect(t.text()).toContain('Type the missing number.');
    expect(t.text()).toContain('You have 2 minutes. Do as many as you can.');
    t.begin();
    const first = scored(MN)[0];
    expect(t.q('.prompt').textContent).toBe(first.display.replace('__', '?'));
    expect(t.q('[data-pad-input]').getAttribute('aria-label')).toBe(first.display.replace('__', 'blank') + '. Type the missing number.');
    t.tick(300); t.type(first.answer);
    expect(t.q('.prompt').textContent).toBe(first.display.replace('__', String(first.answer)));
    t.press('next');
    t.playAll(MN, { from: 1, wrong: [6], skip: [9] });
    const file = t.saveJson();
    expect(file.score).toMatchObject({ measure: 'missing_number', scoreUnit: 'items_correct', score: 23, itemsCorrect: 23, itemsAttempted: 25, digitsCorrect: null, digitsPossible: null, timeLimitS: 120, completion: 'complete' });
    const rows = parseCsv(t.saveCsv().body.slice(1));
    expect(rows).toHaveLength(1 + 26 + 3);
    BANK.MISSING_NUMBER_PROBES['1'].A.problems.forEach((p, i) => {
      expect(rows[i + 2].slice(15, 19).concat(rows[i + 2].slice(23)), 'item ' + i).toEqual([p.display, String(p.answer), i === 9 ? '' : String(i === 6 ? p.answer + 1 : p.answer), i === 6 || i === 9 ? '0' : '1', i === 9 ? 'skipped' : '', '', '']);
    });
  });

  it('math computation, grade 3 form A: 120 s, digits correct per minute', () => {
    expect([MC.lessonId, MC.form, MC.timeLimitS, MC.check]).toEqual(['math-computation-g3', 'A', 120,
      { measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', scoringVersion: 3, formVersion: BANK.MATH_PROBE_BANKS['3'].A.version, allowSkip: true, grade: '3' }]);
    const t = open(FILES.mc.html);
    t.run(MC);
    expect(t.q('.prompt').textContent).toBe('9 ' + String.fromCharCode(0xD7) + ' 7 =');
    const given = BANK.MATH_PROBE_BANKS['3'].A.problems;
    given.forEach((p, i) => { t.tick(2700); t.answer(p, i !== 7); });
    const file = t.saveJson();
    const digits = given.reduce((sum, p, i) => sum + appDigits(p.answer, i === 7 ? p.answer + 1 : p.answer), 0);
    expect(file.score).toMatchObject({ completion: 'complete', elapsedS: 75, prorated: true, digitsCorrect: digits, digitsPossible: given.reduce((sum, p) => sum + String(p.answer).length, 0),
      score: Math.round(digits / (75 / 60)), itemsCorrect: 24, itemsAttempted: 25 });
    const rows = parseCsv(t.saveCsv().body.slice(1));
    given.forEach((p, i) => expect(rows[i + 2].slice(15, 17).concat(rows[i + 2].slice(24)), 'item ' + i).toEqual([p.a + ' ' + p.symbol + ' ' + p.b, String(p.answer), String(appDigits(p.answer, i === 7 ? p.answer + 1 : p.answer)), String(String(p.answer).length)]));
  });

  it('every form in the bank builds, with its own id, version and time limit', () => {
    const seen = new Set();
    for (const [measure, m] of Object.entries(PC.MEASURES)) for (const grade of Object.keys(BANK[m.bank])) for (const id of Object.keys(BANK[m.bank][grade])) {
      const lesson = form(measure, grade, id);
      const data = BANK[m.bank][grade][id];
      expect([lesson.mode, lesson.form, lesson.timeLimitS, lesson.check.formVersion, scored(lesson).length]).toEqual(['probe', id, data.timeLimit, data.version, data.problems.length]);
      expect(lesson.lessonId).toBe(m.slug + '-g' + grade.toLowerCase());
      seen.add(lesson.lessonId + ':' + lesson.revision);
      // Sealing checks each item against its form: a form whose own answer is wrong would be refused here.
      const sealed = sealedOf(pack(lesson).html);
      expect(sealed.blocks[0].items.every((item) => typeof item.key === 'string' && !('answer' in item))).toBe(true);
    }
    expect(seen.size).toBe(18 + 9 + 6);
    expect(Object.keys(PC.MEASURES)).toEqual(['quantity_discrimination', 'missing_number', 'math_computation']);
    expect([PC.MEASURES.quantity_discrimination.timeLimitS, PC.MEASURES.missing_number.timeLimitS, PC.MEASURES.math_computation.timeLimitS]).toEqual([60, 120, 120]);
    for (const bad of [{ measure: 'spelling', grade: '1' }, { measure: 'quantity_discrimination', grade: '3' }, { measure: 'missing_number', grade: '1', form: 'D' }]) {
      expect(() => PC.lessonFromMathForm({ bank: BANK, form: 'A', ...bad })).toThrow(/Unknown measure|There is no/);
    }
    expect(() => PC.lessonFromMathForm({ bank: {}, measure: 'missing_number', grade: '1' })).toThrow(/form bank has no MISSING_NUMBER_PROBES/);
    // A form whose stated answer is not the bigger number does not get into a file.
    const broken = JSON.parse(JSON.stringify(BANK));
    broken.QUANTITY_DISCRIMINATION_PROBES.K.A.problems[3].answer = Math.min(broken.QUANTITY_DISCRIMINATION_PROBES.K.A.problems[3].left, broken.QUANTITY_DISCRIMINATION_PROBES.K.A.problems[3].right);
    expect(() => pack(PC.lessonFromMathForm({ bank: broken, measure: 'quantity_discrimination', grade: 'K', form: 'A' }))).toThrow(/Check item 6 cannot be used: an answer that is the bigger number/);
  });
});

describe('a teacher\'s own problems', () => {
  it('answers are worked out, the list is fixed, and the check plays to a saved file', () => {
    expect(raws(OWN)).toEqual([{ a: 7, b: 8, op: 'add', id: 'math_computation-0' }, { a: 12, b: 5, op: 'sub', id: 'math_computation-1' }, { a: 6, b: 4, op: 'mul', id: 'math_computation-2' }, { a: 20, b: 4, op: 'div', id: 'math_computation-3' }]);
    expect([OWN.mode, OWN.form, OWN.timeLimitS, OWN.title, OWN.check]).toEqual(['probe', 'custom', 90, 'Facts to 20', { measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', scoringVersion: 3, formVersion: 1, allowSkip: true }]);
    expect(OWN.lessonId).toMatch(/^math-custom-[0-9a-f]{8}$/);
    expect(OWN).not.toHaveProperty('createdAt');
    // The same list gives the same packet id; another list another.
    expect(PC.lessonFromMathProblems({ problems: PC.parseProblems('7 + 8; 12 - 5\n6 x 4, 20 / 4'), timeLimitS: 90, title: 'Facts to 20' })).toEqual(OWN);
    expect(PC.lessonFromMathProblems({ problems: [{ a: 7, b: 8, op: '+' }] }).lessonId).not.toBe(OWN.lessonId);
    const sealed = sealedOf(FILES.own.html).blocks[0].items;
    expect(sealed.map((item) => item.word)).toEqual(['7 + 8', '12 ' + String.fromCharCode(0x2212) + ' 5', '6 ' + String.fromCharCode(0xD7) + ' 4', '20 ' + String.fromCharCode(0xF7) + ' 4']);
    const t = open(FILES.own.html);
    t.start('Ana');
    expect(t.heading()).toBe('Get ready');
    expect(t.text()).toContain('You have 90 seconds. Do as many as you can.');
    t.begin();
    expect(t.q('[data-skip]')).not.toBeNull();
    [15, 7, 23, 5].forEach((typed) => { t.tick(6000); t.type(typed); t.press('next'); });
    expect(t.heading()).toBe('You finished. Thank you.');
    const file = t.saveJson();
    expect(file.items.map((i) => [i.target, i.correct, i.digitsCorrect, i.digitsPossible])).toEqual([['15', true, 2, 2], ['7', true, 1, 1], ['24', false, 1, 2], ['5', true, 1, 1]]);
    expect(file.score).toMatchObject({ measure: 'math_dcpm', score: Math.round(5 / (24 / 60)), prorated: true, elapsedS: 24, digitsCorrect: 5, digitsPossible: 6, itemsCorrect: 3, formVersion: 1 });
    const rows = parseCsv(t.saveCsv().body.slice(1));
    expect(rows[1].slice(2, 6)).toEqual([OWN.lessonId, OWN.revision, 'custom', 'check']);
    expect(rows.map((r) => r[0]).slice(5)).toEqual(['#summary', '#score', '#integrity']);
    expect(TH.parseResult(file)).toMatchObject({ ok: true, integrity: 'ok', result: { mode: 'probe', form: 'custom' } });
  });

  it('refuses what it cannot use, with a plain reason', () => {
    const make = (problems, extra = {}) => () => PC.lessonFromMathProblems({ problems, ...extra });
    expect(make([])).toThrow('A check needs 1 to 60 problems. This list has 0.');
    expect(make(Array.from({ length: 61 }, () => ({ a: 1, b: 1, op: 'add' })))).toThrow('A check needs 1 to 60 problems. This list has 61.');
    expect(PC.lessonFromMathProblems({ problems: Array.from({ length: 60 }, (_, i) => ({ a: i, b: 1, op: 'add' })) }).blocks[0].items).toHaveLength(60);
    expect(make([{ a: 1, b: 1, op: 'add' }, { a: 1.5, b: 2, op: 'add' }])).toThrow('Problem 2: both numbers must be whole numbers from 0 to 9999.');
    for (const bad of [{ a: -1, b: 2, op: 'add' }, { a: '', b: 2, op: 'add' }, { a: 10000, b: 2, op: 'add' }, { a: true, b: 2, op: 'add' }, { b: 2, op: 'add' }, null]) expect(make([bad])).toThrow(/Problem 1: both numbers must be whole numbers/);
    expect(make([{ a: 1, b: 2, op: 'pow' }])).toThrow('Problem 1: the operation must be add, sub, mul or div (or + - x /).');
    expect(make([{ a: 1, b: 2, op: 'constructor' }])).toThrow(/the operation must be/);
    expect(make([{ a: 7, b: 0, op: 'div' }])).toThrow('Problem 1: 7 ' + String.fromCharCode(0xF7) + ' 0 divides by 0.');
    expect(make([{ a: 8, b: 2, op: 'div' }, { a: 7, b: 2, op: 'div' }])).toThrow('Problem 2: 7 ' + String.fromCharCode(0xF7) + ' 2 has a remainder. Use a division that comes out even, or allow remainders.');
    expect(make([{ display: 'x'.repeat(41), answer: 1 }])).toThrow('Problem 1: the problem is longer than 40 characters.');
    expect(make([{ display: '2 + 2', answer: 'four' }])).toThrow('Problem 1: the answer must be a whole number.');
    expect(make([{ display: '  ', answer: 4 }])).toThrow('Problem 1: the problem is empty.');
    for (const bad of [5, 3601, 12.5, 'soon', -60]) expect(make([{ a: 1, b: 1, op: 'add' }], { timeLimitS: bad })).toThrow('The time limit must be a whole number of seconds from 10 to 3600, or empty for no time limit.');
    expect(() => PC.parseProblems('7+8, seven plus eight')).toThrow('Problem 2: "seven plus eight" is not a problem. Write it like 7+8, or like 3 + 4 + 5 = 12.');
    expect(() => pack(null)).toThrow(/needs a lesson/);
    expect(() => PC.buildCheckPacket({ lesson: OWN })).toThrow(/needs loader/);
  });

  it('remainders only when the caller allows them; the answer is then the whole-number part', () => {
    const lesson = PC.lessonFromMathProblems({ problems: [{ a: 7, b: 2, op: 'div' }, { a: 9, b: 3, op: '/' }], allowRemainders: true, allowSkip: false, timeLimitS: 0 });
    // 2026-11-13: every division of such a check is marked, so the student is told on each to leave out the remainder.
    expect(raws(lesson)).toEqual([{ a: 7, b: 2, op: 'div', allowRemainder: true, id: 'math_computation-0' }, { a: 9, b: 3, op: 'div', allowRemainder: true, id: 'math_computation-1' }]);
    expect([lesson.timeLimitS, lesson.check.allowSkip, lesson.check.measure, lesson.check.scoreUnit]).toEqual([null, false, 'math_items', 'items_correct']);
    const sealed = sealedOf(pack(lesson).html);
    const codec = TH.checkCodec(TH.sha256);
    expect(sealed.blocks[0].items.map((item) => codec.unscramble(item.key, sealed.check.salt, item.id))).toEqual(['3', '3']);
    expect(Object.keys(sealed.blocks[0].items[0])).toEqual(['id', 'word', 'a', 'b', 'symbol', 'remainder', 'key']);
    // The loader's own check says the same when it is handed such a problem directly.
    expect(TH.CHECK_ADAPTERS.math_computation.prepare({ a: 7, b: 2, op: 'div' })).toEqual({ missing: ['a division with no remainder'] });
    expect(TH.CHECK_ADAPTERS.math_computation.prepare({ a: 7, b: 8, op: 'add', answer: 16 })).toEqual({ missing: ['an answer that matches the problem'] });
    expect(TH.CHECK_ADAPTERS.missing_number.prepare({ display: '2 + 2 = 4', answer: 4 })).toEqual({ missing: ['a problem with one blank written as __'] });
  });

  it('reads a typed list', () => {
    expect(PC.parseProblems('7+8, 12-5;6x4\n20/4, 3 ' + String.fromCharCode(0xD7) + ' 3, 8 ' + String.fromCharCode(0xF7) + ' 2, 9 ' + String.fromCharCode(0x2212) + ' 1, 3 + 4 + 5 = 12,')).toEqual([{ a: 7, b: 8, op: 'add' },
      { a: 12, b: 5, op: 'sub' }, { a: 6, b: 4, op: 'mul' }, { a: 20, b: 4, op: 'div' }, { a: 3, b: 3, op: 'mul' }, { a: 8, b: 2, op: 'div' }, { a: 9, b: 1, op: 'sub' }, { display: '3 + 4 + 5', answer: 12 }]);
    expect(PC.parseProblems('')).toEqual([]);
  });
});

describe('the same inputs make the same bytes', () => {
  it('twice the same file, with and without a code; the builder reads no clock', () => {
    const again = pack(form('math_computation', '3'), { teacherCode: 'tulip-47' });
    expect(again.html).toBe(FILES.coded.html);
    expect(again.sha256).toBe(FILES.coded.sha256);
    expect(FILES.coded.sha256).toBe(createHash('sha256').update(FILES.coded.html, 'utf8').digest('hex'));
    expect(pack(form('quantity_discrimination', 'K')).html).toBe(FILES.qd.html);
    expect(FILES.coded.html).not.toBe(FILES.mc.html);
    expect(pack(MC, { teacherCode: 'tulip-48' }).sha256).not.toBe(FILES.coded.sha256);
    for (const file of Object.values(FILES)) expect(sealedOf(file.html)).not.toHaveProperty('createdAt');
    expect(readFileSync('packet_check_builder.js', 'utf8')).not.toMatch(/Date\b|Math\.random|performance\b/);
    // A title of the caller's is content: it gives another revision, and so another place in storage.
    const named = pack(MC, { title: 'Friday facts' });
    expect(named.manifest.title).toBe('Friday facts');
    expect(named.manifest.packet).toMatchObject({ id: 'math-computation-g3', form: 'A', mode: 'check' });
    expect(named.manifest.packet.version).not.toBe(FILES.mc.manifest.packet.version);
    expect(MC.title).toBe('Math Fluency check (3A)');
  });
});

// The claim "this file cannot send anything" rests on the CSP PLUS the script holding none of these
// (the list of tests/word_sounds_take_home_packet.test.js).
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (source) => FORBIDDEN.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);

describe('source check: a check file cannot send anything either', () => {
  it('the check itself fires', () => {
    for (const sample of ['see https://x.test', 'window.open(u)', 'win.fetch(u)', 'location.href = u', 'document.cookie', 'new Function(x)']) expect(audit(sample), sample).not.toEqual([]);
  });

  it.each(Object.keys(FILES))('%s: none of them, anywhere in the file; one script, run by its hash; no way out', (id) => {
    const { html, manifest } = FILES[id];
    expect(audit(html)).toEqual([]);
    const doc = new JSDOM(html).window.document;
    expect([...doc.querySelectorAll('*')].flatMap((node) => [...node.attributes]).filter((a) => /^on/i.test(a.name))).toEqual([]);
    expect(html.match(/<script/gi)).toHaveLength(2);
    expect(html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video)\b/i);
    const csp = cspOf(html);
    for (const part of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "object-src 'none'", "frame-src 'none'", "worker-src 'none'"]) expect(csp.split('; ')).toContain(part);
    const script = scriptOf(html);
    expect(csp.split('; ')).toContain("script-src 'sha256-" + createHash('sha256').update(script, 'utf8').digest('base64') + "'");
    expect(script).not.toContain('\r');
    expect(manifest).toMatchObject({ kind: 'alloflow-packet-manifest', engine: 'alloflow-packet/1', network: 'none', never: ['internet connection', 'microphone', 'camera', 'cookies', 'AI'], csp,
      packet: { mode: 'check' }, check: { answers: 'scrambled (XOR with a SHA-256 keystream); this stops casual looking, not a determined person' } });
    expect(manifest.what).toMatch(/^A check in one file: one try for each item/);
    // It keeps one key in the browser, the one the manifest names.
    expect(manifest.stores).toHaveLength(1);
    // Small: no sound, no pictures. Re-pinned 2026-11-12 from 120000: every file carries Hear all and the reading tool
    // "Read the choices" (hearAllIn), and that day's accessibility fixes and Untimed option (another job's); about 120.5 KB now.
    // Re-pinned 2026-11-13 from 130000 (about 129.7 KB): "Stop?" pauses the clock (L5, +1.7 KB with the shell's new
    // lines), on top of that day's other passes.
    // Re-pinned 2026-11-13 (engine fixes) from 135000: two tabs, honest saving, sound notes (+9.3 KB; QD 130.5 -> 139.9 KB).
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(145000);
    expect(sealedOf(html)).toMatchObject({ audio: {}, images: {}, submit: null });
  });

  it('the check code and the check adapters hold none of them', () => {
    expect(Object.keys(TH.CHECK_ADAPTERS).sort()).toEqual(readdirSync('word_sounds_take_home/check_adapters').filter((f) => /^[a-z_]+\.js$/.test(f)).map((f) => f.replace(/\.js$/, '')).sort());
    for (const id of Object.keys(TH.CHECK_ADAPTERS)) {
      const a = TH.CHECK_ADAPTERS[id];
      // 2026-11-12, deliberately: the vocabulary activities (vocab_*) read aloud with the device's own voice
      // (speechSynthesis, a voice that runs on the device only); their files say so in the manifest (speech), and
      // tests/packet_vocab_adapter.test.js covers it. Every other rule holds for them, and every rule for the rest.
      const allowed = /^vocab_/.test(id) ? ['speech engine'] : [];
      expect(audit(a.render.toString() + a.score.toString() + JSON.stringify(a.labels)).filter((name) => !allowed.includes(name)), id).toEqual([]);
      // What is copied into the file stands alone.
      expect(a.render.toString() + a.score.toString()).not.toMatch(/\b(?:document|window|localStorage|globalThis)\b/);
    }
    expect(audit(TH._check.toString() + TH.checkCodec.toString() + TH.checkScore.toString() + JSON.stringify(TH.CHECK_LABELS))).toEqual([]);
    // The visible word is "check".
    const words = Object.values(TH.CHECK_LABELS).concat(...Object.values(TH.CHECK_ADAPTERS).map((a) => Object.values(a.labels))).join('\n');
    expect(words).not.toMatch(/\b(?:test|tests|probe|probes|exam|quiz)\b/i);
  });

  it('stores one key, and names it', () => {
    const t = open(FILES.qd.html);
    t.run(QD);
    t.playAll(QD);
    expect(Object.keys(t.storageDump())).toEqual([FILES.qd.manifest.stores[0].key]);
    expect(FILES.qd.manifest.check).toMatchObject({ measure: 'quantity_discrimination', scoreUnit: 'items_correct', timeLimitS: 60, items: 25, practiceItems: 2, formVersion: 2 });
    expect(FILES.calm.manifest.check).toMatchObject({ timeLimitS: null, clock: 'no time limit', practiceItems: 0, items: 3 });
  });
});

describe('practice files are as they were', () => {
  const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
  const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
  const BANKS = {
    isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
    phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
    instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
  };
  const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } }, activityItems: { isolation: { position, correctSound: correct, options } } });
  const practiceFile = () => {
    const lesson = TH.lessonFromPack([word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])], { core, banks: BANKS, title: 'Short a', lessonId: 'L-baseline' }).lesson;
    lesson.createdAt = '2026-11-11T00:00:00.000Z';
    return TH.buildHtml(lesson, { core });
  };
  // The two places that hold the hash of the script.
  // 2026-11-12: and the line for phones and tablets in the note a preview shows (data-open-here, tests/packets_open_bridge.test.js).
  const level = (html) => html.replace(/'sha256-[A-Za-z0-9+/=]+'/g, "'sha256-X'").replace(/"scriptSha256":"[0-9a-f]{64}"/, '"scriptSha256":"X"').replace(/<p data-no-script data-open-here>[^<]*<\/p>/, '');
  const minus = (from, taken) => { const left = new Map(); taken.forEach((l) => left.set(l, (left.get(l) || 0) + 1)); return from.filter((l) => { const n = left.get(l) || 0; if (n) left.set(l, n - 1); return !n; }); };

  // The file the loader made for these inputs, kept as a fixture. The file made now differs from it in the listed
  // lines and in nothing else. After a deliberate change to the practice player, renew this pin: save what
  // practiceFile() returns as the fixture and empty the two lists.
  // First made before check mode (commit 49465de2af); check mode then changed only lines skipped in a practice file,
  // and packetCsv began to end "#summary" with the title (2026-11-11).
  // Renewed 2026-11-12, deliberately: every file now carries the reading tools (takeHomeTools, their style rules
  // and words), the CSV is the main save button, and "About this file" says what the results record. The file made
  // with the loader before that change differed from this fixture in those additions only (14 lines changed, 237 added).
  // 2026-11-12, deliberately: a check's results now say mode "check" ("probe" before). packetCsv travels in every
  // file, so its test for a check reads both values; a practice file behaves as before. These two lines only.
  // Renewed 2026-11-12 (evening), deliberately, by the recipe above: the fixture is the file the loader makes now, and the
  // two lists are empty. The old fixture differed from it in 16 lines out and 129 in (C:/tmp/packets_build_1111/ux_review/
  // pin_diff.json): the lines the two lists named before (check mode says "check", a file made for one student, Open a
  // practice file); Hear all and the reading tool "Read the choices when a question opens" (hearAllIn,
  // tests/packets_hear_all.test.js), with Hear all in Find Sounds, the "in all" progress line, the phone layout of a
  // choice and the retry line brought into view; and another job's accessibility fixes of that day (focus outline on
  // pressed buttons, the reading tools placed after each heading, the Untimed cells of the CSV).
  // 2026-11-12 (late), deliberately: the reading tools button sits on its own line, right-aligned, instead of floating
  // over the first line of the question and a check's time bar (UX review item 7). One style line.
  // Renewed 2026-11-12 (night), deliberately, by the recipe above, for the look pass (C:/tmp/packets_build_1111/look/NOTES.md):
  // new style rules (helper-button tint, cards, two kinds of button, tick and feedback badges, progress bar, end-screen star
  // and rows, four more colors with their dots), the feedback line's data-feedback/data-missed, the progress bar, the end
  // screen's star and per-activity rows, and the colors group's seven choices. The old fixture differed from the new one in
  // 19 lines out and 45 in (C:/tmp/packets_build_1111/look/pin_diff.json), the one "(late)" line above among them, and
  // with the loader before this pass it differed in that line only. The lesson is unchanged. The two lists are empty.
  // 2026-11-13 (Aaron), deliberately: the right-answer tick pops in once, only without reduced motion. One style line.
  // Renewed 2026-11-13 (Word Sounds polish pass, C:/tmp/packets_build_1111/polish_ws/FINDINGS.md), deliberately, by the
  // recipe above. The old fixture differed from the new one in 7 lines out and 15 in (polish_ws/pin_diff.json): the
  // tick line above; the labels line (one new word, done_practice); the R key plays an
  // activity's own opening again when its render gives replay() (keyItem.handle); the end screen counts practice
  // (Letter Trace) as "Practice, not scored: {done} of {total} done." in its own row, and in place of "0 of 0" in a
  // file of practice only. The lesson is unchanged. The two lists are empty.
  // Renewed 2026-11-13 (second Word Sounds pass, C:/tmp/packets_build_1111/polish_ws2/), deliberately, by the recipe
  // above. The old fixture differed from the new one in 6 lines out and 12 in (polish_ws2/pin_diff.json): Find Sounds
  // names a sound like oo_short with letters on (ctx.sound); the keys 1-9 answer to a choice's data-key when it has one
  // (Sound Counting with fewer numbers); a render's payoff() reads the text back after the praise; clockHold, which a
  // check's "Stop?" uses to hold an item's time. The labels line is unchanged (the sound names travel only in a file
  // that shows letters). The lesson is unchanged. The two lists are empty.
  // Renewed 2026-11-13 (robustness pass, C:/tmp/packets_build_1111/robust/FINDINGS.txt), deliberately, by the recipe
  // above. The old fixture differed from the new one in 6 lines out and 15 in (robust/pin_diff.json), and with the
  // loader before this pass in none: one document key listener stops Hear all (hearStops; one for each Hear all kept
  // every past screen alive), the storage note on every screen while the storage refuses (data-store-off; damaged
  // JSON is not a refusal), activeMs in the results and active_s= last in "#summary" (the title comment no longer
  // says "the last cell"). The labels line and the lesson are unchanged. The two lists are empty.
  // Renewed 2026-11-13 (engine fixes, C:/tmp/packets_build_1111/engine2/STATUS.txt), deliberately, by the recipe above. The
  // old fixture differed from the new one in 16 lines out and 122 in (engine2/pin_diff.json), and with the loader before this
  // pass in none (engine2/repin.cjs): two tabs of one file (state.tab, state.ping, the two_tabs screen, Continue here, the
  // guard before each write; the place read and written in two helpers), "Your browser is saving" after Save (saving_file), a sound that did not play said on the item
  // (sound_failed) and a clip with no progress settling after 5 s, Hear all never left on Stop, #live cleared by screen(),
  // the place read again at Start, primary buttons printed in the text color, and four new words in the labels line.
  // The lesson is unchanged. The two lists are empty.
  const REMOVED = [];
  const ADDED = [];
  it('byte for byte, but for the listed lines', () => {
    const before = level(readFileSync('tests/fixtures/take_home_practice_file_before_check_mode.html', 'utf8')).split('\n');
    const now = level(practiceFile()).split('\n');
    expect(minus(before, now)).toEqual(REMOVED);
    expect(minus(now, before)).toEqual(ADDED);
    expect(now.length - before.length).toBe(ADDED.length - REMOVED.length);
    // Put the old lines back and the old file is there again, line for line.
    const restored = now.filter((l) => !ADDED.includes(l));
    const old = before.filter((l) => !REMOVED.includes(l));
    expect(restored).toEqual(old);
  });

  it('a practice file carries none of the check code, and the app is not offered the check activities', () => {
    const html = practiceFile();
    for (const part of ['kit.check=', 'kit.sha=', 'kit.codec=', 'check_teacher', 'check_about', 'takeHomeCheck', 'Teacher code', '.timebar', '.pad{']) expect(html, part).not.toContain(part);
    expect(html).toContain('mailbox:null};\n(function takeHomeShell(');
    expect(Object.keys(TH.DEFAULT_LABELS).filter((k) => /^check_/.test(k))).toEqual([]);
    for (const id of Object.keys(TH.CHECK_ADAPTERS)) { expect(TH.ADAPTERS[id]).toBeUndefined(); expect(TH.activities().map((a) => a.id)).not.toContain(id); }
    // Without WS_CORE a practice file still cannot be built; a check of check activities can.
    expect(() => TH.buildHtml(TH.lessonFromPack([word('cat', 0, 'k', ['k', 'a', 't', 'm'])], { core, banks: BANKS }).lesson, {})).toThrow('buildHtml needs WS_CORE');
    expect(FILES.mc.html).toContain('var matches=null;');
  });

  it('a played practice file says "practice", with no score block', () => {
    const saved = [];
    const dom = new JSDOM(practiceFile(), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      w.Blob = class { constructor(parts) { this.body = parts.join(''); } };
      w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
    } });
    opened.push(dom.window);
    const d = dom.window.document;
    const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
    expect(d.getElementById('app').textContent).toContain('Listen carefully and answer each question.');
    d.getElementById('learner-name').value = 'Ana';
    button('Start').click();
    for (const [n, last] of [[1, false], [3, true]]) { d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: String(n), bubbles: true, cancelable: true })); button(last ? 'See my results' : 'Next').click(); }
    expect(d.getElementById('app').textContent).toContain('Right on the first try: 2 of 2.');
    d.querySelector('[data-save-json]').click();
    const file = JSON.parse(saved[0].body);
    expect(file.packet).toMatchObject({ form: '', mode: 'practice' });
    expect(file).not.toHaveProperty('score');
    expect(file.summary).toMatchObject({ items: 2, done: 2, firstTry: 2, itemsGiven: 2, correct: 2 });
    d.querySelector('[data-save-csv]').click();
    expect(saved[1].body.slice(1).split('\r\n')[0]).toBe(HEADER);
    // The summary row ends with the heading at the top of the file. It is no part of the integrity value:
    // the value is made from the id line and the two item rows, and the file checks out under any title.
    const lines = saved[1].body.slice(1).split('\r\n');
    expect(d.querySelector('h1').textContent).toBe('Short a');
    // 2026-11-13: then the time on the items (activeMs).
    expect(lines[3]).toBe('"#summary","' + file.sessionId + '","items_given=2","attempted=2","correct=2","first_try=2","accuracy_pct=100","title=Short a","active_s=' + Math.round(file.activeMs / 1000) + '"');
    expect(parseCsv(saved[1].body.slice(1))[4].slice(0, 3)).toEqual(['#integrity', file.integrity.method, file.integrity.value]);
    expect(TH.resultsCsv(file).basis).toBe([file.packet.id, file.packet.version, '', file.sessionId].join('|') + '\n' + lines.slice(1, 3).join('\n'));
    expect([TH.parseResult(file).integrity, TH.parseResult({ ...file, lessonTitle: 'Another title' }).integrity, TH.parseResult({ ...file, lessonTitle: '' }).integrity]).toEqual(['ok', 'ok', 'ok']);
  });
});
