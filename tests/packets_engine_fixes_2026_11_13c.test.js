// @vitest-environment jsdom
// Owner-approved engine fixes of 2026-11-13 (C:/tmp/packets_build_1111/engine2/STATUS.txt; problems found by the
// robustness pass, robust/FINDINGS.txt 4.2-4.7, 3.1, 5.4-5.5, 7.7, 2.4, 7.9, 8.2). Every screen test runs a REAL built file.
// 1. Two tabs of one file: the copy opened second waits (two_tabs screen, no writes) until Continue here; a check taken
//    over while it ran records the flag two_tabs. Only the one storage item and its 'storage' events are used.
// 2. A timed check whose time ran out while the page was hidden or closed: completion "time_up_away", flag time_up_away,
//    no score. Time away in the pause is not counted. 3. "Your browser is saving <file>" after Save, never "Saved as".
// 4. A sound that did not play is said on the item too; a stalled clip settles, so Hear all goes back from Stop.
// 5. Vocabulary "Hear it" buttons are named "Hear it: choice n". 6. attempt_unknown; #live cleared; print rule.
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, builder } = tool.loadParts();
const TH = loader;
const PC = require('../packet_check_builder.js');

const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
const fake = (name) => new Proxy({}, {
  get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
  getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined),
});
const BANKS = { words: fake('words'), phonemes: fake('phonemes'), isolation: fake('isolation'), instructions: fake('instructions') };
const KNOWN = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top', 'sit', 'fan', 'hop', 'red', 'run', 'mug', 'bat', 'rat', 'man', 'log'];
const CVC = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top'];
const wsFile = async (activities) => (await builder.buildPacket({ words: CVC, activities, title: 'Ten words', seed: 7, core, dictionary, banks: BANKS, loader, knownWords: KNOWN,
  createdAt: '2026-11-13T00:00:00.000Z' })).html;
const checkFile = (timeLimitS = 60) => PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('7+8,12-5,6+4,9-3,2+2,8+1'), timeLimitS }), loader: TH }).html;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const L = TH.DEFAULT_LABELS;

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });

// One device: tabs share one storage, and a write in one tab is a 'storage' event in the others (as in a browser).
function device() {
  const items = new Map(), tabs = [];
  const storageFor = (me) => ({
    getItem: (k) => (items.has(k) ? items.get(k) : null),
    setItem: (k, v) => { items.set(String(k), String(v)); tell(me, String(k), String(v)); },
    removeItem: (k) => { items.delete(String(k)); tell(me, String(k), null); },
    key: (i) => [...items.keys()][i] || null,
    get length() { return items.size; },
  });
  const tell = (me, key, value) => tabs.filter((t) => t !== me).forEach((t) => setTimeout(() => {
    try { const e = new t.Event('storage'); e.key = key; e.newValue = value; t.dispatchEvent(e); } catch (_) {}
  }, 1));
  return { items, tabs, storageFor };
}
// opts: { dev (a shared device), storage: 'blocked', clock: { t, wall, hidden }, audio: 'ok' | 'fail' | 'stall' }
function open(html, opts = {}) {
  const time = opts.clock || null;
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    const how = opts.audio || 'ok';
    w.Audio = class { play() { const me = this; if (how === 'fail') return Promise.reject(new Error('not supported')); if (how === 'ok') setTimeout(() => { if (me.onended) me.onended(); }, 3); return Promise.resolve(); } pause() {} };
    if (opts.dev) { const s = opts.dev.storageFor(w); Object.defineProperty(w, 'localStorage', { configurable: true, get: () => s }); opts.dev.tabs.push(w); }
    if (opts.storage === 'blocked') Object.defineProperty(w, 'localStorage', { configurable: true, get() { throw new w.DOMException('The operation is insecure.', 'SecurityError'); } });
    if (time) {
      Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
      w.Date.now = () => time.wall;
      Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => !!time.hidden });
    }
    w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const seen = (n) => !!n && !n.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  return { w, d, seen, button, time,
    q: (s) => d.querySelector(s),
    heading: () => d.querySelector('#app h2').textContent,
    text: () => d.getElementById('app').textContent,
    start: (label = L.start) => { const input = d.getElementById('learner-name'); if (input) input.value = 'Fox1'; button(label).click(); },
    tick: (ms) => { time.t += ms; time.wall += ms; },
    show: (hidden) => { time.hidden = hidden; d.dispatchEvent(new w.Event('visibilitychange')); },
    answer: async () => {
      for (let k = 0; k < 6 && !seen(d.querySelector('[data-next]')); k++) {
        const pick = [...d.querySelectorAll('#app li.choice button.primary')].find((b) => seen(b) && b.getAttribute('aria-disabled') !== 'true');
        if (!pick) break;
        pick.click(); await wait(1);
      }
      d.querySelector('[data-next]').click(); await wait(1);
    },
  };
}
const keyOf = (html) => { const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]); return 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision; };
const typeAnswer = (t, text) => { String(text).split('').forEach((ch) => t.q('[data-key="' + ch + '"]').click()); t.q('[data-key="next"]').click(); };

describe('two tabs of one file', () => {
  it('practice: the copy opened second waits and writes nothing until Continue here; then the first one waits', async () => {
    const html = await wsFile(['counting']);
    const dev = device(), key = keyOf(html);
    const a = open(html, { dev });
    a.start(); await wait(5);
    await a.answer(); await a.answer();
    expect(a.heading()).toContain('3 of 10');
    const stamp = JSON.parse(dev.items.get(key)).tab;
    expect(stamp).toMatchObject({ n: 1 });
    // The second copy opens on the kept place: it asks, the first answers, and it waits.
    const b = open(html, { dev });
    await wait(60);
    expect(b.q('[data-two-tabs]')).toBeTruthy();
    expect(b.text()).toContain(L.two_tabs);
    expect(b.button(L.continue_here)).toBeTruthy();
    expect(b.d.getElementById('live').textContent).toBe(L.two_tabs);
    // The first copy goes on, and the place stays its own.
    await a.answer();
    const kept = JSON.parse(dev.items.get(key));
    expect([kept.index, kept.tab.id, 'ping' in kept]).toEqual([3, stamp.id, false]);
    // Continue here: a newer claim at once, and the place as the first copy left it.
    b.button(L.continue_here).click();
    const claim = JSON.parse(dev.items.get(key)).tab;
    expect(claim.id).not.toBe(stamp.id);
    expect(claim.n).toBeGreaterThan(stamp.n);
    expect(b.button(L.continue)).toBeTruthy();
    b.button(L.continue).click(); await wait(1);
    expect(b.heading()).toContain('4 of 10');
    // The first copy waits now and writes nothing more.
    await wait(10);
    expect(a.q('[data-two-tabs]')).toBeTruthy();
    const before = dev.items.get(key);
    a.d.querySelectorAll('#app button').forEach((n) => { if (n.textContent !== L.continue_here) n.click(); });
    expect(dev.items.get(key)).toBe(before);
  });

  it('a check taken over while it ran: one clock at a time, and the results say two_tabs', async () => {
    const html = checkFile(60);
    const dev = device();
    const clock = { t: 1000, wall: Date.UTC(2026, 10, 13, 14, 0, 0), hidden: false };
    const a = open(html, { dev, clock });
    a.start(L.next || 'Next');
    a.q('[data-check-begin]').click();
    a.tick(300); typeAnswer(a, 15);
    expect(a.heading()).toBe('Question 2 of 6');
    const b = open(html, { dev, clock });
    await wait(60);
    expect(b.q('[data-two-tabs]')).toBeTruthy();
    b.button(L.continue_here).click();
    expect(b.heading()).toBe('Question 2 of 6');
    await wait(10);
    expect(a.q('[data-two-tabs]')).toBeTruthy();
    // The waiting copy's clock does not end the check, even past the deadline.
    a.tick(70000); a.show(false);
    expect(a.q('[data-two-tabs]')).toBeTruthy();
    b.show(false);
    expect(b.heading()).toBe('You finished. Thank you.');
    b.q('[data-save-json]');
    const json = JSON.parse(dev.items.get(keyOf(html)));
    expect(json.check.flags).toMatchObject({ two_tabs: 1 });
    expect(json.check.flags.reloaded).toBeUndefined();
  });

  it('one tab alone is as before: no wait screen, no question left in the place; storage turned off asks nothing', async () => {
    const html = await wsFile(['counting']);
    const dev = device(), key = keyOf(html);
    const a = open(html, { dev });
    a.start(); await wait(5); await a.answer();
    a.w.close();
    const again = open(html, { dev });
    await wait(450);
    expect(again.q('[data-two-tabs]')).toBeNull();
    expect('ping' in JSON.parse(dev.items.get(key))).toBe(false);
    const off = open(html, { storage: 'blocked' });
    off.start(); await wait(5); await off.answer();
    expect(off.q('[data-two-tabs]')).toBeNull();
  });
});

describe('a timed check whose time ran out while the page was away', () => {
  const run = (clock) => { const t = open(checkFile(60), { clock }); t.start(L.next || 'Next'); t.q('[data-check-begin]').click(); return t; };
  const results = (t) => { let body = ''; t.w.Blob = class { constructor(p) { body = p.join(''); } }; t.w.HTMLAnchorElement.prototype.click = () => {}; t.q('[data-save-json]').click(); return JSON.parse(body); };
  it('hidden past the deadline: completion time_up_away, flag time_up_away, no score in any unit', () => {
    const t = run({ t: 1000, wall: Date.UTC(2026, 10, 13, 14, 0, 0), hidden: false });
    t.tick(300); typeAnswer(t, 15);
    t.tick(2000); t.show(true);
    t.tick(600000); t.show(false);
    expect(t.heading()).toBe('You finished. Thank you.');
    const sc = results(t).score;
    expect(sc).toMatchObject({ completion: 'time_up_away', score: null, noScoreReason: 'time_up_away', elapsedS: 60, scoreUnit: 'digits_correct_per_minute' });
    expect(sc.flags).toEqual(expect.arrayContaining(['left_the_page', 'time_up_away']));
    // Time after the deadline is not counted as time away.
    expect(sc.hiddenS).toBeLessThanOrEqual(58);
    // The teacher's screen and the reader say why; the CSV says completion=time_up_away and score=.
    expect(TH.parseResult(JSON.stringify(results(t))).result.score.completion).toBe('time_up_away');
  });
  it('the time running out on screen is as before; a short glance away at the end is not "away"', () => {
    const t = run({ t: 1000, wall: Date.UTC(2026, 10, 13, 14, 0, 0), hidden: false });
    t.tick(300); typeAnswer(t, 15);
    t.tick(59000); t.show(true); t.tick(2000); t.show(false);
    const sc = results(t).score;
    expect(sc.completion).toBe('time');
    expect(sc.score).not.toBeNull();
    expect(sc.flags).not.toContain('time_up_away');
  });
  it('checkScore: the flag takes the score away in every unit; ended early is still ended early', () => {
    const rows = [{ attempted: true, correct: true, digitsCorrect: 2, digitsPossible: 2 }];
    const away = TH.checkScore({ scoreUnit: 'items_correct', timeLimitS: 60 }, rows, { completion: 'time', elapsedMs: 60000, flags: ['time_up_away'] });
    expect(away).toMatchObject({ score: null, noScoreReason: 'time_up_away', completion: 'time_up_away', scoreUnit: 'items_correct' });
    expect(TH.checkScore({ scoreUnit: 'items_correct', timeLimitS: 60 }, rows, { completion: 'time', elapsedMs: 60000, flags: [] })).toMatchObject({ score: 1, completion: 'time' });
    expect(TH.checkScore({ scoreUnit: 'items_correct', timeLimitS: 60 }, rows, { completion: 'ended_early', flags: ['time_up_away'] })).toMatchObject({ completion: 'ended_early', noScoreReason: 'ended_early' });
  });
  it('time away during "Stop?" (the clock stopped) does not flag left_the_page', () => {
    const t = run({ t: 1000, wall: Date.UTC(2026, 10, 13, 14, 0, 0), hidden: false });
    t.tick(300); typeAnswer(t, 15);
    t.q('[data-stop]').click();
    t.show(true); t.tick(600000); t.show(false);
    t.q('[data-stop-no]').click();
    t.q('[data-stop]').click(); t.q('[data-stop-yes]').click();
    const sc = results(t).score;
    expect(sc.flags).not.toContain('left_the_page');
    expect(sc.hiddenS).toBe(0);
  });
  it('storage refused: the try count cannot be kept, so the check says attempt_unknown', () => {
    const t = open(checkFile(60), { storage: 'blocked', clock: { t: 1000, wall: Date.UTC(2026, 10, 13, 14, 0, 0), hidden: false } });
    t.start(L.next || 'Next'); t.q('[data-check-begin]').click();
    t.q('[data-stop]').click(); t.q('[data-stop-yes]').click();
    expect(results(t).score.flags).toContain('attempt_unknown');
  });
});

describe('saving, sounds, names, the screen-reader line and print', () => {
  it('after Save the file says the browser is saving the file, never that it was saved', async () => {
    const html = await wsFile(['counting']);
    const t = open(html);
    t.w.Blob = class { constructor() {} };
    t.w.HTMLAnchorElement.prototype.click = () => {};
    t.start(); await wait(5);
    for (let n = 0; n < 10; n++) await t.answer();
    t.q('[data-save-csv]').click();
    const line = [...t.d.querySelectorAll('#app [role=status]')].map((n) => n.textContent).find((x) => /saving/.test(x));
    expect(line).toMatch(/^Your browser is saving Ten-words__Fox1__\d{4}-\d{2}-\d{2}\.csv\. If nothing appears, press Save again or use Other ways to save\.$/);
    expect(t.text()).not.toContain('Saved as');
  });

  it('a sound that cannot play is said on the item as well as to screen readers, and goes when a sound plays', async () => {
    const html = await wsFile(['counting']);
    const t = open(html, { audio: 'fail' });
    t.start(); await wait(80);
    const note = t.q('[data-sound-failed]');
    expect(note && note.textContent).toBe(L.sound_failed);
    expect(t.d.querySelectorAll('[data-sound-failed]')).toHaveLength(1);
    expect(t.d.getElementById('live').textContent).toBe(L.audio_missing);
    // A new screen starts without it; a sound that plays takes it away.
    t.w.Audio.prototype.play = function () { const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 2); return Promise.resolve(); };
    [...t.d.querySelectorAll('#app button')].find((b) => /Hear/.test(b.textContent)).click();
    await wait(20);
    expect(t.q('[data-sound-failed]')).toBeNull();
  });

  it('a clip that never ends settles after 5 s with no progress, so Hear all goes back from Stop', async () => {
    const html = await wsFile(['isolation']);
    const t = open(html, { audio: 'stall' });
    t.start(); await wait(5);
    const hear = t.q('[data-hear-all]');
    hear.click();
    expect(hear.textContent).toContain(L.hear_all_stop);
    for (let i = 0; i < 120 && !hear.textContent.includes(L.hear_all); i++) await wait(500);
    expect(hear.textContent).toContain(L.hear_all);
    expect(t.q('[data-sound-failed]')).toBeTruthy();
  }, 90000);

  it('the vocabulary "Hear it" buttons are named with their visible words first (WCAG 2.5.3)', () => {
    for (const id of ['vocab_meaning', 'vocab_word', 'vocab_blank', 'vocab_picture', 'vocab_picture_word']) {
      const labels = TH.CHECK_ADAPTERS[id].labels;
      const name = labels[id + '_read_choice'].replace('{n}', '2');
      expect(name.startsWith(labels[id + '_hear']), id).toBe(true);
      expect(name).toBe('Hear it: choice 2');
    }
  });

  it('screen() clears the screen-reader line; primary buttons print in the text color', async () => {
    const html = await wsFile(['counting']);
    expect(html).toContain('@media print{button.primary{color:inherit;box-shadow:none}}');
    const t = open(html);
    t.d.getElementById('live').textContent = 'Sound 3 is in box 3.';
    t.start(); await wait(5);
    expect(t.d.getElementById('live').textContent).toBe('');
  });
});
