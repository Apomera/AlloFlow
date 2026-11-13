import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// Review of the results side of AlloFlow Packets, 2026-11-13 (findings: C:\tmp\packets_build_1111\results_review\FINDINGS.txt).
// Every results file here is saved by a REAL built file (the packet builder, the check builder, the vocabulary builder)
// played in jsdom, then read by Add up results (packets_results_reader.js, packets-results.html), by the Class Analytics
// importer (student_analytics_module.js) and by "Look inside a file" (packets_verify_core.js).
// Fixed in this review: a check's time is its own clock; a file finished on another day says when it was started and
// names hours and days; "form custom" is not shown; Letter Trace alone reads "N done (practice, not scored)"; a copy that
// was changed says which copy is counted; Look inside a file says in plain words that a vocabulary file reads aloud with
// the device's voice and that a file hands its results to the "Open a practice file" page (postMessage).
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const reader = require('../packets_results_reader.js');
const verify = require('../packets_verify_core.js');
const PC = require('../packet_check_builder.js');
const V = require('../packet_vocab_builder.js');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const BANK = JSON.parse(read('psychometric_math_probes.json'));
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
const analytics = read('student_analytics_module.js');
const cut = (start, end) => { const a = analytics.indexOf(start), b = analytics.indexOf(end, a + start.length); if (a < 0 || b < 0) throw new Error('not found: ' + start); return analytics.slice(a, b); };
const AC = new Function(cut('  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') + cut('  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(')
  + '\nreturn {readFile: _acThReadFile};')();

const opened = [];
afterAll(() => opened.forEach((w) => { try { w.close(); } catch (_) {} }));

// A built file, played in jsdom. The test holds both clocks: wall (Date) and t (performance.now).
function open(html, { at, storage = null } = {}) {
  const saved = [];
  const time = { t: 1000, wall: Date.parse(at), hidden: false };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    w.HTMLMediaElement.prototype.pause = function () {};
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    const Real = w.Date;
    w.Date = class extends Real { constructor(...a) { if (a.length) super(...a); else super(time.wall); } static now() { return time.wall; } };
    Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => !!time.hidden });
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    w.TextEncoder = TextEncoder;
    w.speechSynthesis = { getVoices: () => [{ lang: 'en-US', localService: true, name: 'On device' }], cancel() {}, speak() {}, addEventListener() {} };
    w.SpeechSynthesisUtterance = function (text) { this.text = text; };
    if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
  } });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  const q = (s) => d.querySelector(s);
  const seen = (n) => !!n && !n.hidden && !n.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const tick = (ms) => { time.t += ms; time.wall += ms; };
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  const settle = () => new Promise((r) => setTimeout(r, 30));
  return { w, d, q, seen, button, tick, time, lesson, settle,
    dump: () => Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)])),
    csv: () => { q('[data-save-csv]').click(); return saved[saved.length - 1]; },
    json: () => { q('[data-save-json]').click(); return saved[saved.length - 1]; } };
}
// Word Sounds practice: a choice item by its number key (item 1 wrong first), Letter Trace by "Skip (not traced)".
function practise(t, { name, from = 0, upTo = Infinity, resume = false }) {
  const items = t.lesson.blocks.flatMap((b) => b.items.map((it) => ({ ...it, activity: b.activity })));
  if (name) t.d.getElementById('learner-name').value = name;
  (resume ? t.button('Continue where I left off') : t.button('Start')).click();
  for (let i = from; i < items.length && i < upTo; i++) {
    const it = items[i];
    t.tick(3000);
    if (it.activity === 'letter_tracing') t.button('Skip (not traced)').click();
    else {
      const at = it.choices.map((c) => c.label != null ? c.label : c.text).indexOf(it.target);
      const key = (n) => t.d.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: String(n + 1), bubbles: true, cancelable: true }));
      if (i === 1) key(at === 0 ? 1 : 0);
      key(at);
    }
    t.tick(500);
    t.q('[data-next]').click();
  }
}
const expected = (p) => p.answer != null ? Number(p.answer) : p.left != null ? Math.max(p.left, p.right) : p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : Math.trunc(p.a / p.b);
// A check: the sample question, Start, then `answer` scored items at `ms` each; timeUp leaves the tab for `away` ms after that.
function checkRun(t, lesson, { name, answer = Infinity, ms = 3000, away = 0, stop = false }) {
  // The lesson as built: the one inside the file has its answers scrambled.
  const raws = lesson.blocks[0].items;
  const press = (k) => t.q('[data-key="' + k + '"]').click();
  const one = (raw) => { t.tick(ms); if (raw.left != null) t.q('[data-choice="' + expected(raw) + '"]').click(); else { String(expected(raw)).split('').forEach((ch) => press(ch === '-' ? 'minus' : ch)); press('next'); } };
  t.d.getElementById('learner-name').value = name;
  t.button('Next').click();
  raws.filter((p) => p.practice).forEach((raw) => { one(raw); t.q('[data-practice-next]').click(); });
  t.q('[data-check-begin]').click();
  raws.filter((p) => !p.practice).slice(0, answer).forEach(one);
  if (stop) { t.button('Stop the check').click(); t.button('Yes, stop').click(); }
  if (away) { t.time.hidden = true; t.d.dispatchEvent(new t.w.Event('visibilitychange')); t.tick(away); t.time.hidden = false; t.d.dispatchEvent(new t.w.Event('visibilitychange')); }
}

// The files, made once.
const files = {};
const make = async () => {
  if (files.done) return files;
  const ws = await builder.buildPacket({ words: ['cat', 'map', 'sun'], activities: ['isolation', 'letter_tracing'], seed: 3, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav, title: 'Short vowels' });
  const trace = await builder.buildPacket({ words: ['cat', 'map', 'sun'], activities: ['letter_tracing'], seed: 3, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav, title: 'Trace letters' });
  files.wsHtml = ws.html;
  // Started Monday evening (3 items), finished Wednesday afternoon, Eastern time on this test's clock.
  let t = open(ws.html, { at: '2026-11-09T23:30:00Z' });
  practise(t, { name: 'RedFox3', upTo: 3 });
  const kept = t.dump();
  t = open(ws.html, { at: '2026-11-11T19:00:00Z', storage: kept });
  practise(t, { from: 3, resume: true });
  await t.settle();
  files.resumed = { csv: t.csv(), json: t.json() };
  t = open(trace.html, { at: '2026-11-11T20:30:00Z' });
  practise(t, { name: 'GreenTurtle2' });
  await t.settle();
  files.trace = { csv: t.csv() };
  // Math Fluency 2A: time ran out while the learner was away for 8 minutes; the file was finished on their return.
  const mcLesson = PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '2', form: 'A' });
  const mc = PC.buildCheckPacket({ lesson: mcLesson, loader });
  t = open(mc.html, { at: '2026-11-16T14:10:00Z' });
  checkRun(t, mcLesson, { name: 'BlueHeron7', answer: 10, ms: 4000, away: 480000 });
  await t.settle();
  files.timeUp = { csv: t.csv() };
  // A teacher's own problems, and a vocabulary check (form "custom" in both files).
  const ownLesson = PC.lessonFromMathProblems({ title: 'Facts to 20', problems: PC.parseProblems('7+8,12-5,6x4,20/4'), timeLimitS: 90 });
  const own = PC.buildCheckPacket({ lesson: ownLesson, loader });
  t = open(own.html, { at: '2026-11-16T14:35:00Z' });
  checkRun(t, ownLesson, { name: 'BlueHeron7', ms: 6000 });
  await t.settle();
  files.own = { csv: t.csv() };
  const bank = require('./fixtures/packets_vocab_bank_fixture.js');
  await bank.load();
  const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell').words, bank });
  const vocabLesson = V.lessonFromVocab({ loader, rows, types: ['meaning', 'word'], mode: 'check', title: 'Unit 3 check' });
  files.vocabHtml = V.buildVocabPacket({ lesson: vocabLesson, loader, rows, bank }).html;
  t = open(files.vocabHtml, { at: '2026-11-12T19:00:00Z' });
  t.d.getElementById('learner-name').value = 'BlueHeron7';
  t.button('Next').click();
  const pick = (it) => { t.tick(2000); const want = it.answer.slice(0, 80); const at = it.choices.map((c) => (typeof c === 'string' ? c : c.text).slice(0, 80)).indexOf(want); t.q('[data-choice="' + (at + 1) + '"]').click(); };
  const vItems = vocabLesson.blocks.flatMap((b) => b.items);
  pick(vItems[0]); t.q('[data-practice-next]').click();
  t.q('[data-check-begin]').click();
  vItems.slice(1).forEach(pick);
  await t.settle();
  files.vocab = { csv: t.csv() };
  files.done = true;
  return files;
};

// Add up results in jsdom.
function openPage() {
  const dom = new JSDOM(read('packets-results.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-results.html' });
  const w = dom.window, d = w.document;
  opened.push(w);
  const page = { w, d, downloads: [] };
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  const blobs = [];
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
  w.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:x'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), body: blobs[blobs.length - 1].body }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.drop = async (list) => {
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files: list.map(([text, name]) => new w.File([text], name, { type: 'text/csv', lastModified: new Date(2026, 10, 20, 8).getTime() })) };
    page.$('main').dispatchEvent(event);
    for (let i = 0; i < 1500 && !/\bread[,.]/.test(page.$('said').textContent); i++) await new Promise((r) => setTimeout(r, 10));
  };
  page.learner = (label) => {
    const radio = d.querySelector('input[name="view"][value="learner"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true }));
    const sel = page.$('pick-learner');
    sel.value = [...sel.options].find((o) => o.textContent.startsWith(label + ' (')).value;
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  page.rows = (table) => [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => [...cell.childNodes].map((n) => n.textContent).join(' / ')));
  return page;
}

describe('real files, read by both readers', () => {
  it('a resumed practice file, a time-up check, an own set and a vocabulary check read the same in Add up results and in Class Analytics, and each untouched file checks out', async () => {
    const f = await make();
    for (const [name, text] of [['resumed.csv', f.resumed.csv.body], ['resumed.json', f.resumed.json.body], ['trace.csv', f.trace.csv.body], ['timeup.csv', f.timeUp.csv.body], ['own.csv', f.own.csv.body], ['vocab.csv', f.vocab.csv.body]]) {
      const mine = (await reader.read(text, { name, lastModified: 1 })).sessions[0];
      const theirs = (await AC.readFile(new File([text], name, { lastModified: 1 }))).sessions[0];
      expect([mine.integrity, theirs.integrity, mine.date, mine.learner], name).toEqual(['ok', 'ok', theirs.date, theirs.learner]);
      // One answer edited: both readers see it.
      const edited = text.replace(/"1","1","1"/, '"0","1","1"');
      if (edited !== text) {
        const a = (await reader.read(edited, { name, lastModified: 1 })).sessions[0], b = (await AC.readFile(new File([edited], name, { lastModified: 1 }))).sessions[0];
        expect([a.integrity, b.integrity], name + ' edited').toEqual(['changed', 'changed']);
      }
    }
    // The resumed file: the date of record is the day it was finished; its start is two days before, and the file's duration spans both.
    const s = (await reader.read(f.resumed.csv.body, { name: 'r.csv' })).sessions[0];
    expect([s.date, s.startedLocal.slice(0, 10), s.durationS > 86400]).toEqual(['2026-11-11', '2026-11-09', true]);
    expect(s.items.map((it) => it.flag)).toContain('resumed');
  });
});

describe('Add up results: what a teacher reads', () => {
  it('a check takes the time on its own clock, a file finished on another day says when it was started, and nothing reads "2610 min"', async () => {
    const f = await make();
    const page = openPage();
    await page.drop([[f.resumed.csv.body, f.resumed.csv.name], [f.timeUp.csv.body, f.timeUp.csv.name]]);
    page.$('show-results').click();
    page.learner('RedFox3');
    const every = [...page.$('learner-body').querySelectorAll('table')].pop();
    const [row] = page.rows(every);
    expect(row[0]).toBe('Nov 11, 2026');
    // 2026-11-13 (results fixes): files saved from today carry the time on the items (activeMs); practice shows it first, then how long the file was open.
    expect(row[4]).toMatch(/^\d+ (?:min \d+ )?s on the items \/ open 1 day 19 h: started Nov 9, 2026, finished Nov 11, 2026$/);
    page.learner('BlueHeron7');
    const check = page.rows([...page.$('learner-body').querySelectorAll('table')].pop())[0];
    // Time ran out after 2 minutes; the file was open for more than 10 (the learner came back 8 minutes later).
    expect(check[4]).toBe('2 min');
    // Also a note: the learner was away from the page during the check.
    expect(check[5]).toMatch(/^Left the page for more than 3 seconds/);
    page.learner('RedFox3');
    expect([...page.d.querySelectorAll('td, th, span')].map((n) => n.textContent).filter((text) => /^\d{3,} min/.test(text))).toEqual([]);
  });

  it('a teacher\'s own set and a vocabulary check never show "form custom"; Letter Trace alone says how much was done', async () => {
    const f = await make();
    const page = openPage();
    await page.drop([[f.own.csv.body, f.own.csv.name], [f.vocab.csv.body, f.vocab.csv.name], [f.trace.csv.body, f.trace.csv.name]]);
    page.$('show-results').click();
    expect(page.$('group-table').textContent).not.toContain('custom');
    page.learner('BlueHeron7');
    const body = page.$('learner-body').textContent;
    expect(body).not.toMatch(/custom/i);
    expect(body).toContain('Vocabulary check, try 1');
    expect(body).toContain('Try 1. ');
    page.learner('GreenTurtle2');
    const trace = page.rows([...page.$('learner-body').querySelectorAll('table')].pop())[0];
    expect([trace[2], trace[3]]).toEqual(['Not scored', '3 done (practice, not scored)']);
  });

  it('of two copies of one result, the list says which copy is counted when one was changed', async () => {
    const f = await make();
    const text = f.timeUp.csv.body;
    const changed = text.replace(/"1","1","1"/, '"0","1","1"');
    for (const [order, says] of [[[[text, 'a.csv'], [changed, 'b.csv']], 'The same result as a.csv. This copy was changed after it was saved; the one that was not is counted.'],
      [[[changed, 'b.csv'], [text, 'a.csv']], 'The same result as b.csv. That copy was changed after it was saved, so this one is counted.']]) {
      const page = openPage();
      await page.drop(order);
      const group = [...page.$('check-body').querySelectorAll('.check-group')].find((g) => g.querySelector('h3').textContent === 'The same result more than once');
      expect(group.querySelector('.check-why').textContent).toBe(says);
      page.$('show-results').click();
      expect(page.$('results-line').textContent).toMatch(/^1 result from 1 student/);
    }
  });
});

describe('Look inside a file: what a file does, in plain words', () => {
  it('a file says it hands its results to the "Open a practice file" page, and the one postMessage is expected there', async () => {
    const f = await make();
    for (const html of [f.wsHtml, f.vocabHtml]) {
      const r = verify.verifyPacket(html);
      expect([r.result, r.counts.notExpected, r.counts.look]).toEqual(['closed', 0, 0]);
      const post = r.findings.filter((x) => x.id === 'post-message');
      expect(post.map((x) => [x.cls, x.where])).toEqual([['expected in this kind of file', 'the code']]);
      expect(post[0].why).toContain('The file cannot see which page holds the frame.');
      expect(r.plain.saves).toContain('Opened on the "Open a practice file" page (for phones and tablets), it hands its place and its results files to that page, which keeps them and saves them on this device. Opened any other way, it keeps its own place and saves its own files.');
    }
    // A message sent anywhere else is for a person to look at, and the plain line is not given.
    const odd = verify.verifyPacket(f.wsHtml.replace("win.parent.postMessage(message, '*')", "win.top.postMessage(message, '*')"));
    expect(odd.findings.filter((x) => x.id === 'post-message').map((x) => x.cls)).toEqual(['needs a person to look']);
    expect(odd.plain.saves.join(' ')).not.toContain('Open a practice file');
  });

  it('a vocabulary file says in plain words that it reads aloud with the voice of the device; a Word Sounds file does not', async () => {
    const f = await make();
    const LINE = 'It can read the words aloud with the voice built into the device, when the student presses Read aloud. It uses only a voice that runs on the device, so this needs no connection. A scan cannot tell how that voice was made.';
    expect(verify.verifyPacket(f.vocabHtml).plain.reach).toContain(LINE);
    expect(verify.verifyPacket(f.wsHtml).plain.reach).not.toContain(LINE);
    expect(verify.reportText(verify.verifyPacket(f.vocabHtml), {})).toContain('- ' + LINE);
  });
});
