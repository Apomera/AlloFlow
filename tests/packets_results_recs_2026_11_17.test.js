import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// "Add up results" (packets-results.html), the owner-approved changes of 2026-11-17 (reports/packets_review_2026-11-16.md, D5, D11, 2.4):
// 1 the "Practice missed ..." buttons open the maker in a new tab and say so; 2 a practice cell in the group names its file, and one
// sentence says when a column's latest results come from different files; 3 a goal date draws an aim line from the first score, and
// from 6 scores growth per week is shown with a caution, in words and in the table too; 4 "Add a paper score", kept apart from the
// scores in the files and saved the way goals are; 5 the students' names under "Most missed across the group"; 6 once in a visit, a quiet
// line offers to save it all for next week; 7 "Math fact practice" and the top link "Make a file"; 8 the read-along sentence stays.
// Also, from the coordinator: a check can be paused (flag "paused", paused_s, pauses), and an item set aside at a pause or left when
// the time ran out is never counted as an answer.
// Files are made by the take-home loader's own writer (resultsCsv) from result objects shaped as a file saves them.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const reader = require('../packets_results_reader.js');
const lender = { crypto: webcrypto };
lender.window = lender;
new Function('window', read('word_sounds_take_home_loader.js')).call(lender, lender);
const loader = lender.AlloWordSoundsTakeHome;
const MP = require('../packet_math_practice_builder.js');

const STORE_KEY = 'alloflow-packets-results/1';
const LAST_CHANGED = new Date(2026, 10, 20, 8).getTime();
const opened = [];
afterAll(() => opened.forEach((w) => { try { w.close(); } catch (_) { /* closed */ } }));

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------
const wall = (day, time, plus = 0) => new Date(Date.parse(day + 'T' + time + 'Z') + plus * 1000).toISOString().slice(0, 19) + '-05:00';
const utc = (local) => (local ? new Date(Date.parse(local)).toISOString() : '');
const TITLES = { isolation: 'Find Sounds', blending: 'Blend Sounds', missing_letter: 'Missing Letter', letter_tracing: 'Letter Trace' };
const pick = (activity, word, target, picks, missed = false) => ({ activity, word, target, picks, missed });
const USUAL = [pick('isolation', 'cat', 'k', ['k']), pick('isolation', 'dog', 'o', ['d', 'o']), pick('isolation', 'bed', 'd', ['b', 'e'], true), pick('blending', 'cup', 'cup', ['cup']), pick('missing_letter', 'pig', 'i', ['i'])];
function practice(over = {}) {
  const o = { sid: 'p-1', learner: 'BlueHeron7', day: '2026-11-03', time: '16:00:05', seconds: 300, packetId: 'ws-short-vowels', version: 'r91b7d204', title: 'Short vowels', answers: USUAL, ...over };
  const counts = {};
  const startedLocal = wall(o.day, o.time), finishedLocal = wall(o.day, o.time, o.seconds);
  return { kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2', sessionId: o.sid,
    packet: { id: o.packetId, version: o.version, engine: 'alloflow-packet/1', form: '', mode: 'practice' }, lessonId: o.packetId, revision: o.version, lessonTitle: o.title, activityTitles: TITLES,
    learner: o.learner, learnerName: o.learner, startedAt: utc(startedLocal), finishedAt: utc(finishedLocal), startedLocal, finishedLocal, durationMs: o.seconds * 1000, timesAreFromTheLearnerDevice: true,
    items: o.answers.map((a, i) => {
      const k = counts[a.activity] = (counts[a.activity] || 0) + 1;
      return { n: i + 1, itemId: a.activity + '-' + (k - 1), activity: a.activity, word: a.word, target: a.target, responses: a.picks, attempts: a.picks.length, firstTry: a.picks.length === 1 && !a.missed,
        correct: !a.missed, done: true, ms: 2400, supports: {}, practice: a.activity === 'letter_tracing' ? 'traced' : null, flag: '' };
    }) };
}
// A Math Fluency check of eight problems (digits possible 2 1 2 1 2 1 2 2), scored by the loader's own checkScore.
// set: items set aside, by index: { 2: 'paused' } or { 7: ['time_up', '3'] } (time ran out with "3" typed, not counted).
const PROBLEMS = [[7, '+', 8], [12, '-', 5], [9, '+', 6], [15, '-', 7], [8, '+', 8], [14, '-', 6], [23, '+', 14], [36, '-', 12]];
function check(over = {}) {
  const o = { sid: 'c-1', learner: 'BlueHeron7', day: '2026-11-17', time: '09:12:05', form: 'A', done: 8, elapsedS: 120, hiddenS: 0, flags: [], set: {}, pausedS: 0, pauses: 0,
    packetId: 'math-computation-g2', title: 'Math Fluency check (2A)', ...over };
  const adapter = loader.CHECK_ADAPTERS.math_computation;
  const completion = o.done < PROBLEMS.length || Object.keys(o.set).length ? 'time' : 'complete';
  const rows = [];
  const items = PROBLEMS.map(([a, op, b], i) => {
    const right = String(op === '+' ? a + b : a - b);
    const aside = o.set[i] ? [].concat(o.set[i]) : null;
    const attempted = !aside && i < o.done;
    const mark = attempted ? adapter.score({}, right, right) : null;
    rows.push({ practice: false, attempted, correct: !!(mark && mark.correct), digitsCorrect: mark ? mark.digitsCorrect : null, digitsPossible: mark ? mark.digitsPossible : null });
    const item = { n: i + 1, itemId: 'math_computation-' + i, activity: 'math_computation', word: a + ' ' + op + ' ' + b, target: right, responses: attempted ? [right] : [], attempts: attempted ? 1 : 0,
      firstTry: attempted, correct: attempted, done: attempted, ms: attempted ? 4000 : 0, supports: {}, practice: null, flag: '',
      digitsCorrect: mark ? mark.digitsCorrect : null, digitsPossible: mark ? mark.digitsPossible : null };
    // As the check writes them: a problem set aside at a pause is done, with no tries; one left at time up keeps what was typed.
    if (aside && aside[0] === 'paused') Object.assign(item, { done: true, attempts: 0, flag: 'paused' });
    if (aside && aside[0] === 'time_up') Object.assign(item, { done: false, flag: 'time_up', responses: aside[1] ? [aside[1]] : [] });
    return item;
  });
  const startedLocal = wall(o.day, o.time), finishedLocal = wall(o.day, o.time, o.elapsedS + 12);
  const out = { kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2', sessionId: o.sid,
    packet: { id: o.packetId, version: 'r5a3c2e10', engine: 'alloflow-packet/1', form: o.form, mode: 'check' }, lessonId: o.packetId, revision: 'r5a3c2e10',
    lessonTitle: o.title, activityTitles: { math_computation: 'Math Fluency' }, learner: o.learner, learnerName: o.learner,
    startedAt: utc(startedLocal), finishedAt: utc(finishedLocal), startedLocal, finishedLocal, durationMs: (o.elapsedS + 12) * 1000, timesAreFromTheLearnerDevice: true, items };
  out.score = loader.checkScore({ measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: 120, scoringVersion: 3, formVersion: 2 },
    rows, { elapsedMs: o.elapsedS * 1000, hiddenMs: o.hiddenS * 1000, completion, attempt: 1, flags: o.flags, pausedMs: o.pausedS * 1000, pauses: o.pauses });
  return out;
}
function mathPractice(misses, over = {}) {
  const lesson = MP.lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' });
  const o = { sid: 'mf-1', learner: 'BlueHeron7', day: '2026-11-12', time: '16:00:05', seconds: 120, ...over };
  const startedLocal = wall(o.day, o.time), finishedLocal = wall(o.day, o.time, o.seconds);
  const block = lesson.blocks[0];
  return { kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2', sessionId: o.sid,
    packet: { id: lesson.lessonId, version: lesson.revision, engine: 'alloflow-packet/1', form: '', mode: 'practice' }, lessonId: lesson.lessonId, revision: lesson.revision, lessonTitle: lesson.title,
    activityTitles: lesson.activityTitles, learner: o.learner, learnerName: o.learner, startedAt: utc(startedLocal), finishedAt: utc(finishedLocal), startedLocal, finishedLocal,
    durationMs: o.seconds * 1000, timesAreFromTheLearnerDevice: true,
    items: block.items.map((it, i) => {
      const missed = misses.includes(i);
      return { n: i + 1, itemId: it.id, activity: block.activity, word: it.word, target: it.target, responses: missed ? [String(Number(it.answer) + 1), it.answer] : [it.answer],
        attempts: missed ? 2 : 1, firstTry: !missed, correct: true, done: true, ms: 2400, supports: {}, practice: null, flag: '' };
    }) };
}
const sealed = (result) => { const table = loader.resultsCsv(result); return { table, integrity: { method: 'sha256', value: loader.sha256(table.basis).hex } }; };
const csvOf = (result) => { const { table, integrity } = sealed(result); return table.text(integrity); };
const jsonOf = (result) => JSON.stringify({ ...result, integrity: { ...sealed(result).integrity, note: 'detects accidental edits, not deliberate ones' } });
const one = async (text, name = 'results.csv') => { const got = await reader.read(text, { name, lastModified: LAST_CHANGED }); expect(got.why, name).toBe(''); return got.sessions[0]; };
// Six weekly checks: 1, 3, 5, 6 ... problems done in the two minutes. Scores (digits correct per minute): 1, 2, 3, 3, 4, 5.
const WEEKS = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
const weekly = (learner = 'BlueHeron7', n = 6) => WEEKS.slice(0, n).map((day, i) => check({ sid: 'w-' + learner + '-' + i, learner, day, done: i + 1 }));

// ---------------------------------------------------------------------------
// The page in jsdom (as tests/packets_results_page.test.js opens it)
// ---------------------------------------------------------------------------
function openPage(options = {}) {
  const dom = new JSDOM(read('packets-results.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: options.url || 'https://packets.test/site/packets-results.html' });
  const w = dom.window, d = w.document;
  opened.push(w);
  const page = { w, d, files: [], downloads: [], reached: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  if (typeof globalThis.DecompressionStream === 'function') w.DecompressionStream = globalThis.DecompressionStream;
  if (typeof globalThis.ReadableStream === 'function') w.ReadableStream = globalThis.ReadableStream;
  Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) w[name] = function () { page.reached.push(name); throw new Error(name + ' was called'); };
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), body: page.files[page.files.length - 1].body }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  if (options.before) options.before(w);
  for (const script of d.querySelectorAll('script[src]')) {
    if (options.stubHandoff && script.getAttribute('src') === 'packets_handoff.js') {
      w.AlloPacketHandoff = options.stubHandoff;
      continue;
    }
    w.eval(read(script.getAttribute('src')));
  }
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.state = () => ['state-empty', 'state-check', 'state-results'].filter((id) => page.seen(id)).join(' ');
  page.file = (text, name) => new w.File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified: LAST_CHANGED });
  page.drop = async (files) => {
    page.$('said').textContent = '';
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files };
    page.$('main').dispatchEvent(event);
    for (let i = 0; i < 1500 && !/\bread[,.]/.test(page.$('said').textContent); i++) await new Promise((r) => setTimeout(r, 10));
    return page.$('said').textContent;
  };
  // Drop result objects as their CSV files, and show the results.
  page.add = async (results) => {
    const said = await page.drop(results.map((r, i) => page.file(csvOf(r), 'f-' + r.sessionId + '-' + i + '.csv')));
    if (page.seen('show-results') && page.state() === 'state-check') page.$('show-results').click();
    return said;
  };
  page.view = (name) => { const radio = d.querySelector('input[name="view"][value="' + name + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.learner = (label) => {
    page.view('learner');
    const select = page.$('pick-learner');
    select.value = [...select.options].find((o) => o.textContent.startsWith(label + ' (')).value;
    select.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  page.type = (input, value) => { input.value = value; input.dispatchEvent(new w.Event('input', { bubbles: true })); };
  page.choose = (select, value) => { select.value = value; select.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.table = (table) => [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => cell.textContent));
  page.measure = (name) => [...d.querySelectorAll('.measure')].find((card) => card.querySelector('h4').textContent === name);
  page.links = () => [...d.querySelectorAll('#state-results a.nav-new-tab')];
  return page;
}
const MATH = 'Math Fluency (grade 2)';

// ---------------------------------------------------------------------------
// 1. "Practice missed ..." opens the maker in a new tab, and says so
// ---------------------------------------------------------------------------
describe('1. the practice buttons open the maker in a new tab', () => {
  it('are links with target _blank and rel noopener, "opens in a new tab" in their name, and a line under them that says it', async () => {
    const page = openPage();
    await page.add([practice({ sid: 'a-1' }), practice({ sid: 'b-1', learner: 'RedFox3' })]);
    // The group, then one student: every link of both views.
    for (const view of ['group', 'learner']) {
      page.view(view);
      const links = page.links();
      expect(links.length, view).toBeGreaterThan(0);
      for (const link of links) {
        expect([link.tagName, link.getAttribute('target'), link.getAttribute('rel')], link.textContent).toEqual(['A', '_blank', 'noopener']);
        expect(link.textContent, view).toMatch(/ \(opens in a new tab\)$/);
        expect(link.querySelector('.sr-only').textContent).toBe(' (opens in a new tab)');
        expect(link.getAttribute('href')).toMatch(/^packets-[a-z-]+\.html#/);
      }
      const hint = page.$(view === 'group' ? 'group-missed' : 'learner-body').querySelector('.new-tab-hint');
      expect(hint && hint.textContent, view).toBe('These buttons open the maker in a new tab. This page stays open as it is.');
    }
    expect(page.links().map((a) => a.firstChild.textContent)).toContain('Practice missed words in Word Sounds');
    // Nothing on the page still leaves it in the same tab.
    expect(page.d.querySelectorAll('[data-href]')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. A practice cell names its file; one sentence when a column mixes files
// ---------------------------------------------------------------------------
describe('2. the group\'s practice columns say which file each result came from', () => {
  const practiceTable = (page) => [...page.$('group-table').querySelectorAll('table')].find((t) => t.querySelector('.sort[data-table="practice"]'));
  it('shows the file under each practice cell, and says so in one sentence above the table when the latest results come from different files', async () => {
    const page = openPage();
    await page.add([practice({ sid: 'a-1', title: 'Short vowels' }), practice({ sid: 'b-1', learner: 'RedFox3', packetId: 'ws-long-vowels', title: 'Long vowels' }), check({ sid: 'c-1' })]);
    const table = practiceTable(page);
    expect(page.table(table)).toEqual([['BlueHeron7', '50%2 of 4from Short vowels', '100%1 of 1from Short vowels'], ['RedFox3', '50%2 of 4from Long vowels', '100%1 of 1from Long vowels']]);
    const subs = [...table.querySelectorAll('tbody td')].map((td) => td.lastElementChild);
    expect(subs.every((node) => node.className === 'cell-sub')).toBe(true);
    const warn = page.$('group-table').querySelector('.mixed-files');
    expect(warn.textContent).toBe('In Hearing sounds and Spelling, the students\' latest results come from different files, so compare them with care.');
    // It sits above the practice table, under its heading.
    expect(warn.previousElementSibling.textContent).toBe('Practice: latest first-try percent');
    expect(warn.nextElementSibling.contains(table)).toBe(true);
    // Checks are kept apart by packet already: their cells are as they were, with no file line.
    const checks = page.$('group-table').querySelector('table');
    expect(page.table(checks).map((row) => row[3])).toEqual(['7version A', 'No result']);
  });

  it('says nothing when every latest result in a column comes from the same file', async () => {
    const page = openPage();
    await page.add([practice({ sid: 'a-1' }), practice({ sid: 'b-1', learner: 'RedFox3' })]);
    expect(page.$('group-table').querySelector('.mixed-files')).toBeNull();
    // Practice only: the one table also has Results and Last date, so Hearing sounds is the fourth column.
    expect(page.table(practiceTable(page)).map((row) => row[3])).toEqual(['50%2 of 4from Short vowels', '50%2 of 4from Short vowels']);
  });
});

// ---------------------------------------------------------------------------
// 3. Goal date, aim line, growth per week
// ---------------------------------------------------------------------------
describe('3. progress monitoring: an aim line to a goal date, and growth per week from 6 scores', () => {
  it('draws an aim line from the first score to the goal on the goal date, says it in words, and adds it to the table', async () => {
    const page = openPage();
    await page.add(weekly());
    page.learner('BlueHeron7');
    const card = page.measure(MATH);
    const goal = card.querySelector('input.goal-input:not(.goal-date)');
    const date = card.querySelector('input.goal-date');
    // Both fields are named, can be reached with the keyboard, and are left out of print.
    expect(page.d.querySelector('label[for="' + date.id + '"]').textContent).toBe('Goal date for ' + MATH + ' (optional)');
    expect([date.type, date.tabIndex >= 0, date.closest('.goal').classList.contains('no-print')]).toEqual(['date', true, true]);
    expect(page.d.getElementById(date.getAttribute('aria-describedby')).textContent).toBe('With a goal and a goal date, an aim line is drawn from the first score to the goal.');
    // A goal alone: the flat line, as before, and no aim line.
    page.type(goal, '10');
    expect(card.querySelector('.chart-goal')).toBeTruthy();
    expect(card.querySelector('.chart-aim')).toBeNull();
    expect(card.querySelector('.aim-line').hidden).toBe(true);
    page.type(date, '2026-12-21');
    const aim = card.querySelector('.chart-aim');
    const first = card.querySelector('.chart-point[data-date="2026-10-05"]');
    expect([aim.getAttribute('x1'), aim.getAttribute('y1')]).toEqual([first.getAttribute('cx'), first.getAttribute('cy')]);
    // It ends at the goal, on the goal date, right of the last score: the chart now reaches the goal date.
    const end = card.querySelector('.chart-aim-end');
    expect([end.getAttribute('data-date'), end.getAttribute('data-value'), aim.getAttribute('x2'), aim.getAttribute('y2')]).toEqual(['2026-12-21', '10', end.getAttribute('cx'), end.getAttribute('cy')]);
    expect(Number(aim.getAttribute('x2'))).toBeGreaterThan(Number(card.querySelector('.chart-point[data-date="2026-11-09"]').getAttribute('cx')));
    expect(Number(aim.getAttribute('y2'))).toBeLessThan(Number(aim.getAttribute('y1')));
    expect([...card.querySelectorAll('.chart-scale')].map((t) => t.textContent)).toContain('Dec 21');
    // In words: on the card, in the chart's description and key, and in the table.
    expect(card.querySelector('.goal-line').textContent).toBe('Goal typed by the teacher: 10 digits correct per minute, by Dec 21, 2026.');
    expect(card.querySelector('.aim-line').textContent).toBe('Aim line: from 1 digit correct per minute on Oct 5, 2026 (the first score) to the goal of 10 digits correct per minute on Dec 21, 2026. To get there: +0.8 digits correct per minute a week.');
    expect(card.querySelector('desc').textContent).toContain('Aim line from 1 on Oct 5, 2026 to 10 on Dec 21, 2026.');
    expect(card.querySelector('figcaption').textContent).toContain('Thin line: the aim line, from the first score to the goal on the goal date.');
    const rows = page.table(card.querySelector('table'));
    expect(rows.find((row) => row[0].startsWith('Goal'))).toEqual(['Goal, Dec 21, 2026', '10', 'Goal typed by the teacher.' + card.querySelector('.aim-line').textContent, '']);
    // A date that is not after the first score draws no aim line, and says why.
    page.type(date, '2026-10-01');
    expect(card.querySelector('.chart-aim')).toBeNull();
    expect(card.querySelector('.aim-line').textContent).toBe('The goal date is not after the first score (Oct 5, 2026), so no aim line is drawn.');
    // Taking the date away goes back to the flat goal line.
    page.type(date, '');
    expect([card.querySelector('.chart-aim'), card.querySelector('.aim-line').hidden, !!card.querySelector('.chart-goal')]).toEqual([null, true, true]);
  });

  it('shows growth per week from 6 scores, with its caution, and in the table; with fewer, says how many there are', async () => {
    const page = openPage();
    await page.add(weekly());
    page.learner('BlueHeron7');
    const card = page.measure(MATH);
    expect([...card.querySelectorAll('.chart-point')].map((dot) => dot.getAttribute('data-value'))).toEqual(['1', '2', '3', '3', '4', '5']);
    // The least-squares slope through (0, 1) (1, 2) (2, 3) (3, 3) (4, 4) (5, 5), in weeks: 13 / 17.5 = 0.74.
    expect(card.querySelector('.growth-line').textContent).toBe('Growth per week (6 or more scores): +0.7 digits correct per minute.');
    expect(card.querySelector('.growth-caution').textContent).toBe('A rough guide only: it is a straight line through these 6 scores, and a few unusual days can change it a lot.');
    expect(page.table(card.querySelector('table')).pop()).toEqual(['Growth per week (6 or more scores)', '+0.7 digits correct per minute', 'A straight line fitted through 6 scores.', 'A rough guide only']);

    const five = openPage();
    await five.add(weekly('BlueHeron7', 5));
    five.learner('BlueHeron7');
    const card5 = five.measure(MATH);
    expect(card5.querySelector('.growth-line').textContent).toBe('Growth per week is shown from 6 scores on (5 so far).');
    expect(card5.querySelector('.growth-caution').hidden).toBe(true);
    expect(card5.textContent).not.toContain('Growth per week (6 or more scores)');
  });
});

// ---------------------------------------------------------------------------
// 4. Paper scores
// ---------------------------------------------------------------------------
describe('4. "Add a paper score": kept apart from the scores in the files, saved the way goals are', () => {
  const addPaper = (page, { date = '2026-11-12', check = null, name = null, score, note = '' }) => {
    const box = page.d.querySelector('.paper-add');
    page.$('paper-date').value = date;
    if (check !== null) page.choose(page.$('paper-check'), check);
    if (name !== null) page.$('paper-name').value = name;
    page.$('paper-score').value = score;
    page.$('paper-note').value = note;
    page.$('paper-go').click();
    return box;
  };
  it('adds a paper score to a check the student has: its own row, its own square labeled "paper", never in the growth or the group', async () => {
    const page = openPage();
    await page.add(weekly());
    page.learner('BlueHeron7');
    const form = page.d.querySelector('.paper-add');
    expect([form.querySelector('h4').textContent, form.classList.contains('no-print')]).toEqual(['Add a paper score', true]);
    // Every field has a label; the check is chosen from the student's checks, or typed.
    for (const id of ['paper-date', 'paper-check', 'paper-name', 'paper-score', 'paper-note']) expect(page.d.querySelector('label[for="' + id + '"]').textContent.length, id).toBeGreaterThan(3);
    const select = page.$('paper-check');
    expect([...select.options].map((o) => o.textContent)).toEqual([MATH, 'Another check (type its name)']);
    expect(page.$('paper-name').closest('.paper-field').hidden).toBe(true);
    const growthBefore = page.measure(MATH).querySelector('.growth-line').textContent;
    // A score that is not a number is refused, with a message, and nothing is added.
    addPaper(page, { check: select.options[0].value, score: 'lots' });
    expect([page.$('paper-score').getAttribute('aria-invalid'), page.$('paper-said').textContent, page.d.activeElement]).toEqual(['true', 'Type the score as a number, such as 12.', page.$('paper-score')]);
    expect(page.d.querySelectorAll('.chart-paper')).toHaveLength(0);
    addPaper(page, { check: page.$('paper-check').options[0].value, score: '9', note: 'Printed version A, read aloud' });
    expect(page.$('paper-said').textContent).toBe('Added a paper score of 9 on Nov 12, 2026 for ' + MATH + '.');
    expect(page.$('said').textContent).toBe(page.$('paper-said').textContent);
    expect(page.d.activeElement).toBe(page.$('paper-go'));
    const card = page.measure(MATH);
    // Its own mark on the chart: a square with the word "paper", not a dot and not on the line.
    const square = card.querySelector('rect.chart-paper');
    expect([square.getAttribute('data-date'), square.getAttribute('data-value')]).toEqual(['2026-11-12', '9']);
    expect([...card.querySelectorAll('.chart-paper-label')].map((t) => t.textContent)).toEqual(['paper']);
    expect(card.querySelectorAll('.chart-point')).toHaveLength(6);
    expect(card.querySelector('.chart-line').getAttribute('points').split(' ')).toHaveLength(6);
    expect(card.querySelector('figcaption').textContent).toContain('Each square labeled "paper" is a paper score. Paper scores are not joined to the line.');
    expect(card.querySelector('desc').textContent).toContain('1 paper score, drawn as squares: 9 on Nov 12, 2026.');
    // Its own row in the table, labeled paper; the growth per week is the screen scores' alone.
    const rows = page.table(card.querySelector('table'));
    expect(rows.filter((row) => /paper/.test(row[0]))).toEqual([['Nov 12, 2026, paper', '9', 'Paper score, typed on this page. Never averaged with the scores in the files. Note: Printed version A, read aloud', '']]);
    expect(card.querySelector('.growth-line').textContent).toBe(growthBefore);
    expect(card.querySelector('.measure-latest').textContent).toBe('Latest: 5, Nov 9, 2026.');
    expect(card.querySelector('.measure-paper').textContent).toBe('Latest paper score: 9 digits correct per minute, Nov 12, 2026. Paper scores are kept apart from the scores in the files.');
    // Listed under the form with a button to remove it.
    expect([...form.ownerDocument.querySelectorAll('.paper-list li span')].map((s) => s.textContent)).toEqual(['Nov 12, 2026: 9, ' + MATH + ' (Printed version A, read aloud).']);
    // The group and the summary never see it.
    page.view('group');
    expect(page.$('group-table').textContent).not.toContain('9version');
    page.$('save-csv').click();
    expect(page.downloads[0].body.split('\r\n').filter((line) => line.includes('"9"'))).toEqual([]);
    page.learner('BlueHeron7');
    const remove = page.d.querySelector('.paper-list button');
    expect(remove.getAttribute('aria-label')).toBe('Remove the paper score Nov 12, 2026: 9, ' + MATH + ' (Printed version A, read aloud).');
    remove.click();
    expect([page.d.querySelectorAll('.chart-paper').length, page.d.querySelector('.paper-list'), page.d.activeElement]).toEqual([0, null, page.$('paper-go')]);
  });

  it('a check typed by name that no results file has gets its own card of paper scores, with its own chart', async () => {
    const page = openPage();
    await page.add([practice({ sid: 'a-1' })]);
    page.learner('BlueHeron7');
    // No check in the files: there is nothing to choose, and the name is typed.
    expect(page.$('paper-check')).toBeNull();
    expect(page.$('paper-name').closest('.paper-field').hidden).toBe(false);
    addPaper(page, { name: '', score: '40' });
    expect([page.$('paper-name').getAttribute('aria-invalid'), page.$('paper-said').textContent]).toEqual(['true', 'Type the name of the check.']);
    addPaper(page, { name: 'Oral reading', score: '40', date: '2026-11-03' });
    addPaper(page, { name: 'oral reading', score: '46', date: '2026-11-10' });
    const card = page.measure('Oral reading');
    expect([card.querySelector('.measure-unit').textContent, card.querySelector('.measure-latest').textContent]).toEqual(['Paper scores', 'Paper scores only. No results file has this check.']);
    expect([...card.querySelectorAll('rect.chart-paper')].map((r) => r.getAttribute('data-value'))).toEqual(['40', '46']);
    expect(card.querySelector('.chart-line')).toBeNull();
    expect(page.table(card.querySelector('table')).map((row) => row.slice(0, 2))).toEqual([['Nov 3, 2026, paper', '40'], ['Nov 10, 2026, paper', '46']]);
    // The second, typed the same way, is a choice now.
    expect([...page.$('paper-check').options].map((o) => o.textContent)).toEqual(['Oral reading', 'Another check (type its name)']);
  });

  it('is saved with "Save all of this as one file" and "Keep these results on this device", as goals are, and comes back', async () => {
    const page = openPage();
    await page.add(weekly());
    page.learner('BlueHeron7');
    page.type(page.measure(MATH).querySelector('input.goal-input:not(.goal-date)'), '10');
    page.type(page.measure(MATH).querySelector('input.goal-date'), '2026-12-21');
    addPaper(page, { check: page.$('paper-check').options[0].value, score: '9', note: 'paper form A' });
    page.$('save-bundle').click();
    const bundle = JSON.parse(page.downloads[page.downloads.length - 1].body);
    const seriesKey = 'check\tmath_dcpm\tmath-computation-g2';
    expect([bundle.goals, bundle.goalDates, bundle.paper]).toEqual([[{ learner: 'blueheron7', measure: seriesKey, value: 10 }], [{ learner: 'blueheron7', measure: seriesKey, date: '2026-12-21' }],
      [{ learner: 'blueheron7', measure: seriesKey, name: MATH, date: '2026-11-12', value: 9, note: 'paper form A' }]]);
    // The reader reads them again as untrusted: a bad date, a value that is not a number, a row that is not an object are dropped.
    const edited = { ...bundle, goalDates: bundle.goalDates.concat([{ learner: 'x', measure: 'm', date: '2026-02-30' }, null]), paper: bundle.paper.concat([{ learner: 'x', measure: 'm', name: 'n', date: '2026-11-12', value: '<b>' }, 7]) };
    const back = reader.readBundle(edited);
    expect([back.goalDates, back.paper]).toEqual([bundle.goalDates, bundle.paper]);
    // The same file dropped on a fresh page: the goal date, its aim line and the paper score are back.
    const again = openPage();
    expect(await again.drop([again.file(JSON.stringify(bundle), 'results-all.json')])).toBe('1 file read.');
    again.learner('BlueHeron7');
    const card = again.measure(MATH);
    expect([card.querySelector('input.goal-date').value, !!card.querySelector('.chart-aim'), card.querySelectorAll('rect.chart-paper').length]).toEqual(['2026-12-21', true, 1]);
    // Dropping it twice adds the paper score once.
    await again.drop([again.file(JSON.stringify(bundle), 'results-all.json')]);
    if (again.state() === 'state-check') again.$('show-results').click();
    again.learner('BlueHeron7');
    expect(again.measure(MATH).querySelectorAll('rect.chart-paper')).toHaveLength(1);

    // Kept on this device: the same three, and a page that finds them opens them.
    page.$('keep').click();
    const kept = JSON.parse(page.w.localStorage.getItem(STORE_KEY));
    expect([kept.goalDates, kept.paper]).toEqual([bundle.goalDates, bundle.paper]);
    // A paper score added while it is on is kept at once.
    addPaper(page, { check: page.$('paper-check').options[0].value, score: '11', date: '2026-11-19' });
    const stored = page.w.localStorage.getItem(STORE_KEY);
    expect(JSON.parse(stored).paper.map((p) => p.value)).toEqual([9, 11]);
    const later = openPage({ before: (w) => w.localStorage.setItem(STORE_KEY, stored) });
    later.learner('BlueHeron7');
    expect([...later.measure(MATH).querySelectorAll('rect.chart-paper')].map((r) => r.getAttribute('data-value'))).toEqual(['9', '11']);
    expect(later.reached).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. Names under "Most missed across the group"
// ---------------------------------------------------------------------------
describe('5. the students who missed each item, by name', () => {
  const missedRow = (page, item) => [...page.d.querySelectorAll('#group-missed tbody tr')].find((tr) => tr.firstElementChild.textContent === item);
  it('lists up to 6 names under the count, and more than 6 in a closed fold', async () => {
    const page = openPage();
    const names = ['RedFox3', 'BlueHeron7', 'GoldFinch5'];
    await page.add(names.map((learner, i) => practice({ sid: 's-' + i, learner })));
    const cell = missedRow(page, 'bed').children[1];
    expect(cell.firstChild.textContent).toBe('3 of 3');
    expect(cell.querySelector('.missed-names').textContent).toBe('BlueHeron7, GoldFinch5, RedFox3');
    expect(cell.querySelector('details')).toBeNull();
    expect(page.d.querySelector('#group-missed > .hint').textContent).toBe('Under each count are the students who missed it, by the names in their files. Use them to form a small group.');

    const big = openPage();
    const many = ['Ant1', 'Bee2', 'Cat3', 'Dog4', 'Elk5', 'Fox6', 'Gnu7'];
    // Gnu7 got "bed" right on the first try: 6 of 7 missed it; all 7 missed "dog".
    await big.add(many.map((learner, i) => practice({ sid: 'm-' + i, learner, answers: i === 6 ? [pick('isolation', 'dog', 'o', ['d', 'o']), pick('isolation', 'bed', 'd', ['d'])] : USUAL })));
    const dog = missedRow(big, 'dog').children[1];
    const fold = dog.querySelector('details');
    expect([fold.open, fold.querySelector('summary').textContent, fold.querySelector('.missed-names').textContent]).toEqual([false, 'Show the 7 names', many.join(', ')]);
    const bed = missedRow(big, 'bed').children[1];
    expect([bed.firstChild.textContent, bed.querySelector('details'), bed.querySelector('.missed-names').textContent]).toEqual(['6 of 7', null, many.slice(0, 6).join(', ')]);
  });
});

// ---------------------------------------------------------------------------
// 6. Once in a visit: "To pick up here next week, save all of this as one file."
// ---------------------------------------------------------------------------
describe('6. the quiet offer to save it all, once', () => {
  it('appears after a goal is typed, saves with the Save all action, and does not come back in that visit', async () => {
    const page = openPage();
    await page.add(weekly());
    // Not on the first files.
    expect(page.seen('save-nudge')).toBe(false);
    page.learner('BlueHeron7');
    page.type(page.measure(MATH).querySelector('input.goal-input:not(.goal-date)'), '10');
    expect(page.seen('save-nudge')).toBe(true);
    // Near the top: right under the results heading's block, before the views.
    const nudge = page.$('save-nudge');
    expect(nudge.compareDocumentPosition(page.$('view-group')) & page.w.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([page.$('save-nudge-text').textContent, page.$('save-nudge-go').textContent, nudge.classList.contains('no-print')])
      .toEqual(['To pick up here next week, save all of this as one file.', 'Save all of this as one file', true]);
    page.$('save-nudge-go').click();
    expect(page.downloads).toHaveLength(1);
    expect(JSON.parse(page.downloads[0].body).goals).toHaveLength(1);
    expect(page.downloads[0].name).toMatch(/^results-all__\d{4}-\d{2}-\d{2}\.json$/);
    expect([page.seen('save-nudge'), page.d.activeElement]).toEqual([false, page.$('results-title')]);
    expect(page.$('said').textContent).toMatch(/^Saved results-all__.*\. Drop it on this page later to open where you left off\.$/);
    // Never again in this visit: not for another goal, not for more files.
    page.type(page.measure(MATH).querySelector('input.goal-input:not(.goal-date)'), '12');
    await page.add([check({ sid: 'late', day: '2026-11-16', done: 7 })]);
    expect(page.seen('save-nudge')).toBe(false);
  });

  it('appears when more files are added to results already on the page; never for the sample results; goes when Save all is used below', async () => {
    const page = openPage();
    await page.add([practice({ sid: 'a-1' })]);
    expect(page.seen('save-nudge')).toBe(false);
    await page.add([practice({ sid: 'a-2', day: '2026-11-10' })]);
    expect(page.seen('save-nudge')).toBe(true);
    page.$('save-bundle').click();
    expect(page.seen('save-nudge')).toBe(false);

    const sample = openPage();
    sample.$('samples').click();
    for (let i = 0; i < 500 && sample.state() !== 'state-results'; i++) await new Promise((r) => setTimeout(r, 10));
    sample.learner('BlueHeron7');
    sample.type(sample.measure(MATH).querySelector('input.goal-input:not(.goal-date)'), '12');
    expect(sample.seen('save-nudge')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7 and 8. Words; the read-along sentence stays
// ---------------------------------------------------------------------------
describe('7 and 8. words, and the read-along sentence', () => {
  it('says "Math fact practice", the maker\'s name, and the top link is "Make a file" to all the makers', async () => {
    const script = read('packets-results.js');
    expect(script).not.toContain('in Math Facts');
    const page = openPage();
    await page.add([mathPractice([1, 3], { sid: 'mf-a' }), mathPractice([1], { sid: 'mf-b', learner: 'RedFox3' })]);
    expect(page.links().map((a) => a.firstChild.textContent)).toContain('Practice group missed facts in Math fact practice');
    page.learner('BlueHeron7');
    expect(page.links().map((a) => a.firstChild.textContent)).toContain('Practice missed facts in Math fact practice');
    const link = page.d.querySelector('header .top-link');
    expect([link.textContent, link.getAttribute('href')]).toEqual(['Make a file', 'packets.html']);
  });

  it('a file in which nothing is scored still shows its sentence in the group view', async () => {
    const page = openPage();
    await page.add([practice({ sid: 't-1', answers: [pick('letter_tracing', 'cat', 'c', ['traced'])] })]);
    expect(page.$('group-table').querySelector('.group-none').textContent)
      .toBe('Nothing in these results is scored: they are practice that is never scored, such as a read-along. Choose One student to see what each student did.');
  });
});

// ---------------------------------------------------------------------------
// From the coordinator: a paused check, and problems set aside
// ---------------------------------------------------------------------------
describe('a paused check: its seconds paused, and problems set aside are never counted', () => {
  const paused = () => check({ sid: 'pz-1', done: 8, flags: ['paused'], pausedS: 12.4, pauses: 2, set: { 2: 'paused', 7: ['time_up', '3'] } });
  it('reads paused_s and pauses from the CSV and the JSON alike, and counts neither set-aside problem as an answer', async () => {
    const result = paused();
    expect(result.score.pauses).toBe(2);
    const text = csvOf(result);
    expect(text).toMatch(/"paused_s=12\.4","pauses=2"/);
    const fromCsv = await one(text, 'p.csv');
    const fromJson = await one(jsonOf(result), 'p.json');
    for (const s of [fromCsv, fromJson]) {
      expect([s.integrity, s.score.pausedS, s.score.pauses, s.flags.includes('paused'), s.flags.includes('score_differs')], s.source).toEqual(['ok', 12.4, 2, true, false]);
      // Eight problems given; the one paused and the one left at time up (with "3" typed) are not attempted, not right, not a wrong answer.
      expect([s.summary.given, s.summary.attempted, s.summary.correct], s.source).toEqual([8, 6, 6]);
      expect(s.items.filter((it) => it.flag).map((it) => [it.flag, it.attempted, it.correct]), s.source).toEqual([['paused', false, false], ['time_up', false, false]]);
      expect(s.score.itemsAttempted, s.source).toBe(result.score.itemsAttempted);
    }
    expect(fromJson.summary).toEqual(fromCsv.summary);
    // A check that was not paused has no pause fields at all.
    const plain = await one(csvOf(check({ sid: 'pz-2' })));
    expect(['pausedS' in plain.score, 'pauses' in plain.score]).toEqual([false, false]);
  });

  it('says "paused" in plain words, with the seconds paused, where the page shows the seconds away', async () => {
    const page = openPage();
    await page.add([paused(), check({ sid: 'pz-3', day: '2026-11-10', done: 6 })]);
    page.learner('BlueHeron7');
    const notes = page.table(page.measure(MATH).querySelector('table')).map((row) => row[3]);
    expect(notes[1]).toBe('Paused; the problem on screen at each pause was set aside and not counted (12 seconds paused in all)');
    // A pause is a note that changes how to read the score: its dot has a ring.
    expect(page.measure(MATH).querySelectorAll('.chart-ring')).toHaveLength(1);
    expect(read('packets-results.js')).toContain("paused: 'paused; the problem on screen at each pause was set aside and not counted',");
  });

  it('registers read_along cleanly, guards drawLearner against unknown activities, and keeps Word Sounds Present-Export link beside Vocab misses', async () => {
    const readAlongResult = practice({ sid: 'ra-1', answers: [{ activity: 'read_along', word: 'The fox ran.', target: 'read', picks: ['read'], missed: false }] });
    readAlongResult.items[0].practice = 'read';
    const parsedRa = await one(jsonOf(readAlongResult), 'ra.json');
    expect(parsedRa.byActivity[0]).toMatchObject({ activity: 'read_along', name: 'Read along', strand: 'read_along' });

    const page = openPage();
    const vocabMiss = practice({ sid: 'vm-1', learner: 'BlueHeron7', answers: [{ activity: 'vocab_meaning', word: 'habitat', target: 'home', picks: ['cloud'], missed: true }] });
    const wsMiss = practice({ sid: 'wm-1', learner: 'BlueHeron7', answers: [{ activity: 'isolation', word: 'ship', target: 'sh', picks: ['s'], missed: true }] });
    const wsMiss2 = practice({ sid: 'wm-2', learner: 'RedFox4', answers: [{ activity: 'isolation', word: 'ship', target: 'sh', picks: ['s'], missed: true }] });
    const unknownMiss = practice({ sid: 'um-1', learner: 'BlueHeron7', answers: [{ activity: 'custom_other_activity', word: 'alpha', target: 'a', picks: ['b'], missed: true }] });
    await page.add([vocabMiss, wsMiss, wsMiss2, unknownMiss]);
    const groupHrefs = [...page.d.querySelectorAll('#group-missed a')].map((a) => a.getAttribute('href'));
    expect(groupHrefs).toContain('packets-present-export.html#words=habitat');
    expect(groupHrefs).toContain('packets-present-export.html#words=ship');
    expect(groupHrefs.some((h) => /alpha/.test(h))).toBe(false);
    page.learner('BlueHeron7');
    const learnerHrefs = page.links().map((a) => a.getAttribute('href'));
    expect(learnerHrefs).toContain('packets-present-export.html#words=habitat');
    expect(learnerHrefs).toContain('packets-present-export.html#words=ship');
    expect(learnerHrefs.some((h) => /rehearse=.*alpha/.test(h))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Wave 2B: .zip ingestion, #import-results handoff, progressive folds, remove+undo, manual merge, beforeunload
// ---------------------------------------------------------------------------
function makeZip(entries) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const raw = typeof entry.data === 'string' ? enc.encode(entry.data) : new Uint8Array(entry.data);
    const method = entry.method === 8 ? 8 : 0;
    const body = method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;
    const declaredSize = entry.fakeSize != null ? entry.fakeSize : raw.length;
    const local = new Uint8Array(30 + nameBytes.length + body.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, method, true);
    lv.setUint32(18, body.length, true);
    lv.setUint32(22, declaredSize, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(body, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, method, true);
    cv.setUint32(20, body.length, true);
    cv.setUint32(24, declaredSize, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of centrals) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  const total = offset + cdSize + 22;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const l of locals) { out.set(l, pos); pos += l.length; }
  for (const c of centrals) { out.set(c, pos); pos += c.length; }
  out.set(eocd, pos);
  return out;
}

describe('Wave 2B: direct .zip ingestion, #import-results handoff, folds, remove+undo, manual merge, and beforeunload', () => {
  it('unpackZip reads STORE and DEFLATE CSV/JSON entries, skips macOS metadata, and blocks nested zips and forged zip-bombs', async () => {
    const csvA = csvOf(practice({ sid: 'z-1', learner: 'BlueHeron7', day: '2026-11-03' }));
    const jsonB = jsonOf(practice({ sid: 'z-2', learner: 'RedFox3', day: '2026-11-10' }));
    const archive = makeZip([
      { name: '__MACOSX/._a.csv', data: 'junk' },
      { name: 'class/.DS_Store', data: 'junk' },
      { name: 'class/a.csv', data: csvA, method: 0 },
      { name: 'class/b.json', data: jsonB, method: 8 },
      { name: 'class/nested.zip', data: 'PK\x03\x04' },
    ]);
    const unpacked = await reader.unpackZip(archive, { name: 'class-results.zip' });
    expect(unpacked.why).toBe('');
    expect(unpacked.entries.map((e) => e.name)).toEqual(['class/a.csv', 'class/b.json']);
    expect(unpacked.skipped.some((r) => r.name === 'class/nested.zip' && /nested \.zip/i.test(r.why))).toBe(true);

    // Forged header claiming 100 bytes for a 2.5 MB DEFLATE payload is aborted mid-stream.
    const bombPayload = new Uint8Array(reader.MAX_BYTES + 1024);
    const bombZip = makeZip([{ name: 'bomb.csv', data: bombPayload, method: 8, fakeSize: 100 }]);
    const bombOut = await reader.unpackZip(bombZip, { name: 'bomb.zip' });
    expect(bombOut.entries).toHaveLength(0);
    expect(bombOut.skipped[0].why).toMatch(/larger than 2 MB/i);

    // Dropping the .zip directly onto packets-results.html reads both student files seamlessly.
    const page = openPage();
    const zipFile = new page.w.File([archive], 'class-results.zip', { type: 'application/zip', lastModified: LAST_CHANGED });
    await page.drop([zipFile]);
    if (page.state() === 'state-check') page.$('show-results').click();
    expect(page.state()).toBe('state-results');
    expect(page.$('results-line').textContent).toContain('2 results from 2 students');
  });

  it('auto-ingests a handed-off results file via #import-results and clears the hash cleanly', async () => {
    const csvA = csvOf(practice({ sid: 'ho-1', learner: 'BlueHeron7', day: '2026-11-12' }));
    const page = openPage({
      url: 'https://packets.test/site/packets-results.html#import-results',
      stubHandoff: {
        RESULTS_HASH: '#import-results',
        take: async () => ({ name: 'handed.csv', bytes: new TextEncoder().encode(csvA).buffer, type: 'text/csv', lastModified: LAST_CHANGED }),
      },
    });
    for (let i = 0; i < 400 && page.state() !== 'state-results'; i++) await new Promise((r) => setTimeout(r, 10));
    expect(page.state()).toBe('state-results');
    expect(page.$('results-line').textContent).toContain('1 result from 1 student');
    expect(page.w.location.hash).toBe('');
  });

  it('folds Goal & aim line and Add a paper score by default, supports Remove + Undo, manual merge, and beforeunload only on unsaved edits', async () => {
    const page = openPage();
    await page.add([
      practice({ sid: 'u-1', learner: 'BlueHeron7', day: '2026-11-03' }),
      practice({ sid: 'u-2', learner: 'BlueHeron7', day: '2026-11-10' }),
      practice({ sid: 'u-3', learner: 'SilverFox9', day: '2026-11-10' }),
    ]);

    // Before any edit, beforeunload does not trigger.
    const evClean = new page.w.Event('beforeunload', { cancelable: true });
    page.w.dispatchEvent(evClean);
    expect(evClean.defaultPrevented).toBe(false);

    page.learner('BlueHeron7');
    const card = page.measure('Hearing sounds');
    expect(card.querySelector('details.goal-fold').open).toBe(false);
    expect(page.d.querySelector('details.paper-fold').open).toBe(false);

    // Setting a goal marks unsavedEdits -> beforeunload prompts when keep is off.
    page.type(card.querySelector('input.goal-input:not(.goal-date)'), '80');
    const evDirty = new page.w.Event('beforeunload', { cancelable: true });
    page.w.dispatchEvent(evDirty);
    expect(evDirty.defaultPrevented).toBe(true);

    // Saving the bundle clears unsavedEdits -> beforeunload stays quiet.
    page.$('save-bundle').click();
    const evSaved = new page.w.Event('beforeunload', { cancelable: true });
    page.w.dispatchEvent(evSaved);
    expect(evSaved.defaultPrevented).toBe(false);

    // Row Remove + Undo restores the exact removed session.
    const every = [...page.$('learner-body').querySelectorAll(':scope > .table-scroll table')].pop();
    const removeBtn = every.querySelector('button.row-remove');
    removeBtn.click();
    expect(page.$('results-line').textContent).toContain('2 results');
    expect(page.seen('results-undo')).toBe(true);
    page.$('results-undo-btn').click();
    expect(page.$('results-line').textContent).toContain('3 results');
    expect(page.seen('results-undo')).toBe(false);

    // Manual "Combine with another name" merges two distinct names (BlueHeron7 + SilverFox9).
    page.$('open-check').click();
    const fold = page.$('manual-merge');
    expect(fold.hidden).toBe(false);
    fold.open = true;
    page.choose(page.$('merge-from'), 'silverfox9');
    page.choose(page.$('merge-into'), 'blueheron7');
    page.$('merge-go').click();
    expect(page.$('said').textContent).toContain('counted as one student');
    page.$('show-results').click();
    expect(page.$('results-line').textContent).toContain('3 results from 1 student');
  });

  it('Wave 3B: guards Symbol Runner #rehearse= links for Stroop/subitize/flanker/math modes and non-alphanumeric tokens', async () => {
    const stroopMiss = practice({
      sid: 'sr-stroop-1',
      learner: 'BlueHeron7',
      packetId: 'symbol-runner-color_word_stroop-12345678',
      title: 'Color Stroop',
      answers: [pick('symbol_runner', 'RED', 'blue', ['red'], true)],
    });
    const invalidTokMiss = practice({
      sid: 'sr-badtok-1',
      learner: 'BlueHeron7',
      packetId: 'symbol-runner-custom-12345678',
      title: 'Arrows',
      answers: [pick('symbol_runner', '←', '←', ['→'], true)],
    });
    const plainMiss = practice({
      sid: 'sr-plain-1',
      learner: 'RedFox3',
      packetId: 'symbol-runner-confusable_letters-12345678',
      title: 'Confusable letters',
      answers: [pick('symbol_runner', 'b', 'b', ['d'], true), pick('symbol_runner', '13', '13', ['31'], true)],
    });

    const page = openPage();
    await page.add([stroopMiss, invalidTokMiss, plainMiss]);

    // Group view: Stroop routes to #mode=color_word_stroop (NOT #rehearse=blue), arrow token is omitted, plain b/13 emit #rehearse=13,b.
    const groupHrefs = [...page.d.querySelectorAll('#group-missed a')].map((a) => a.getAttribute('href'));
    expect(groupHrefs).toContain('packets-symbol-runner.html#mode=color_word_stroop');
    expect(groupHrefs.some((h) => /#rehearse=.*blue/i.test(h))).toBe(false);
    expect(groupHrefs.some((h) => /#rehearse=.*%E2%86%90/i.test(h))).toBe(false);
    expect(groupHrefs.some((h) => /^packets-symbol-runner\.html#rehearse=/.test(h) && /b/.test(h) && /13/.test(h))).toBe(true);

    // Individual learner (BlueHeron7 has only Stroop + invalid arrow token): emits #mode=color_word_stroop and ZERO #rehearse=.
    page.learner('BlueHeron7');
    const blueHrefs = [...page.$('learner-body').querySelectorAll('a.nav-new-tab')].map((a) => a.getAttribute('href'));
    expect(blueHrefs).toContain('packets-symbol-runner.html#mode=color_word_stroop');
    expect(blueHrefs.some((h) => /packets-symbol-runner\.html#rehearse=/.test(h))).toBe(false);

    // Individual learner (RedFox3 has plain valid symbols): emits #rehearse=b,13.
    page.learner('RedFox3');
    const foxHrefs = [...page.$('learner-body').querySelectorAll('a.nav-new-tab')].map((a) => a.getAttribute('href'));
    expect(foxHrefs).toContain('packets-symbol-runner.html#rehearse=b%2C13');
  });
});
