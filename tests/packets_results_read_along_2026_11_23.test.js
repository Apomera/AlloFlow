// "Add up results" shows what a read-along results file holds (2026-11-23, owner-approved).
// A REAL read-along file is built with packet_read_along_builder.js and the loader, and played in jsdom the way
// tests/packets_read_along_fixes_2026_11_23.test.js plays one: page 1 is the child's own page ("read"), page 2 is turned
// to and read aloud by the file ("played"), and on page 3 two "Check your understanding" questions are answered.
// Its saved CSV and JSON are read with packets_results_reader.js (part 1), then dropped on the real page (part 2).
// Everything is checked by what the reader returns and what the page shows, never by matching source text.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const reader = require('../packets_results_reader.js');
const RA = require('../packet_read_along_builder.js');
const lender = { crypto: webcrypto };
lender.window = lender;
new Function('window', read('word_sounds_take_home_loader.js')).call(lender, lender);
const loader = lender.AlloWordSoundsTakeHome;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (test, what, tries = 1200) => { for (let i = 0; i < tries; i++) { if (test()) return; await sleep(15); } throw new Error('Timed out waiting for ' + what); };
const mp3 = (text) => 'data:audio/mpeg;base64,' + Buffer.from('ID3' + text).toString('base64');
const THREE_PAGES = 'The kite sailed over the trees. Mia smiled all afternoon.\n---\nThen she went home. She ate soup.\n---\nShe slept well. The end came soon.';
const QUESTIONS = [
  { prompt: 'Who smiled?', kind: 'mc', choices: ['Mia', 'The kite', 'Soup'], answer: 0 },
  { prompt: 'What did you like?', kind: 'open' },
];
// What the child types: markup and a quote, so the page must show it as words, never as a tag.
const TYPED = '<b>I liked</b> the "kite" part';

function buildFile() {
  const sentences = RA.splitPassage(THREE_PAGES);
  const clips = Object.fromEntries(sentences.map((row) => [RA.clipKey(row.text), mp3(row.text)]));
  const made = RA.lessonFromReadAlong({ loader, title: 'Kite Story', sentences, clips, pageMode: 'custom', questions: QUESTIONS });
  return RA.buildReadAlongPacket({ made, loader });
}

// The student file, opened as a child opens it (the approach of the read-along fixes test). clock.t stands in for the page clock.
function openFile(html, clock) {
  const log = { downloads: [] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html',
    beforeParse(w) {
      w.Audio = class {
        constructor(src) { this.src = src || ''; this.playbackRate = 1; this.defaultPlaybackRate = 1; this.currentTime = 0; this.duration = 1; this.paused = true; }
        play() {
          this.paused = false;
          const me = this, src = this.src;
          setTimeout(() => { if (!me.paused && me.src === src && me.onended) { me.paused = true; me.onended(); } }, 3);
          return Promise.resolve();
        }
        pause() { this.paused = true; }
      };
      w.URL.createObjectURL = (blob) => { log.downloads.push(blob); return 'blob:x/' + log.downloads.length; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      w.Element.prototype.scrollIntoView = function () {};
      w.performance.now = () => clock.t;
    },
  });
  const w = dom.window, d = w.document;
  const q = (s) => d.querySelector(s);
  const click = (s) => { const n = typeof s === 'string' ? q(s) : s; if (!n) throw new Error('no node ' + s); n.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); return n; };
  const state = () => { const k = w.localStorage.key(0); return k ? JSON.parse(w.localStorage.getItem(k)) : null; };
  const last = async () => (await log.downloads[log.downloads.length - 1].text());
  return {
    q, click, state,
    start: async (name) => { q('#learner-name').value = name; click(Array.from(d.querySelectorAll('.card button.primary')).find((b) => !b.hidden)); await sleep(10); },
    type: (sel, text) => { const n = q(sel); n.value = text; n.dispatchEvent(new w.Event('input', { bubbles: true })); },
    page: () => (q('[data-read-along-page]') ? q('[data-read-along-page]').textContent : ''),
    savedJson: async () => { click('[data-save-json]'); await sleep(10); return last(); },
    savedCsv: async () => { click('[data-save-csv]'); await sleep(10); return last(); },
    close: () => w.close(),
  };
}

// Ana: one press of Read to me on page 1 (61 s on it), the file turns to pages 2 and 3 by itself, and on page 3
// (30 s) she picks a wrong choice, then the right one, and types an answer. Ben: turns every page himself, answers nothing.
const files = {};
beforeAll(async () => {
  const built = buildFile();
  const clock = { t: 1000 };
  const ana = openFile(built.html, clock);
  try {
    await ana.start('Ana');
    clock.t += 61000;
    ana.click('[data-read-along-play]');
    await until(() => ana.state().index === 2 && ana.page() === 'Page 3 of 3', 'the file to turn to page 3 by itself');
    clock.t += 30000;
    ana.click(ana.q('[data-check-q="q1"] [data-check-choice="2"]'));
    ana.click(ana.q('[data-check-q="q1"] [data-check-choice="0"]'));
    ana.type('[data-check-open="q2"]', TYPED);
    ana.click('[data-read-along-done]');
    await sleep(20);
    files.anaJson = await ana.savedJson();
    files.anaCsv = await ana.savedCsv();
  } finally { ana.close(); }
  const clock2 = { t: 500 };
  const ben = openFile(built.html, clock2);
  try {
    await ben.start('Ben');
    for (let i = 0; i < 3; i++) { clock2.t += 20000; ben.click('[data-read-along-done]'); await sleep(15); }
    files.benJson = await ben.savedJson();
    files.benCsv = await ben.savedCsv();
  } finally { ben.close(); }
}, 120000);

const one = async (text, name) => {
  const got = await reader.read(text, { name, lastModified: new Date(2026, 10, 23, 9).getTime() });
  expect(got.why, name).toBe('');
  expect(got.sessions, name).toHaveLength(1);
  return got.sessions[0];
};
// The saved CSV with one page's responses cell replaced (a hand edit in a spreadsheet, or another version of the writer).
const withResponses = (csv, from, to) => { const out = csv.replace('"' + from.replace(/"/g, '""') + '"', '"' + to.replace(/"/g, '""') + '"'); expect(out).not.toBe(csv); return out; };

// ---------------------------------------------------------------------------
// Part 1: the reader
// ---------------------------------------------------------------------------
describe('the reader: what a read-along results file holds', () => {
  const ANA_PAGE_3 = 'played | 1: Mia (right, try 2) | 2: ' + TYPED;

  it('the file itself says read, played, and the two answers (the ground the rest stands on)', () => {
    const file = JSON.parse(files.anaJson);
    expect(file.items.map((it) => [it.activity, it.practice, it.responses, it.ms])).toEqual([
      ['read_along', 'read', ['read'], 61000],
      ['read_along', 'played', ['played'], 0],
      ['read_along', 'played', ['played', '1: Mia (right, try 2)', '2: ' + TYPED], 30000]]);
    expect(files.anaCsv).toContain('"' + ANA_PAGE_3.replace(/"/g, '""') + '"');
  });

  it('counts the pages, the pages read, the pages only played, the time, and lists the answers by page: from the CSV and from the JSON alike', async () => {
    const fromCsv = await one(files.anaCsv, 'ana.csv'), fromJson = await one(files.anaJson, 'ana.json');
    for (const s of [fromCsv, fromJson]) {
      expect([s.integrity, s.mode, s.summary.given, s.summary.firstTryPct, s.value], s.source).toEqual(['ok', 'practice', 0, null, null]);
      expect(s.readAlong, s.source).toEqual({ pages: 3, read: 1, played: 2, timeMs: 91000, answers: 2, byPage: [
        { page: 3, word: 'She slept well.', answers: [
          { question: 1, text: 'Mia', result: 'right', tries: 2 },
          { question: 2, text: TYPED, result: '', tries: null }] }] });
    }
    // The time is the pages' own time, added up.
    expect(fromCsv.readAlong.timeMs).toBe(JSON.parse(files.anaJson).items.reduce((n, it) => n + it.ms, 0));
    // Ben turned every page himself and answered nothing: no answers, an empty list.
    const ben = await one(files.benCsv, 'ben.csv');
    expect(ben.readAlong).toEqual({ pages: 3, read: 3, played: 0, timeMs: 60000, answers: 0, byPage: [] });
    expect((await one(files.benJson, 'ben.json')).readAlong).toEqual(ben.readAlong);
  });

  it('reads each way an answer is written, and keeps anything else as plain text', async () => {
    const edited = withResponses(files.anaCsv, ANA_PAGE_3,
      'read | 1: Mia (right) | 2: Soup (not right) | 3: Soup (not right, 3 tries) | 4: Tired | no number here | 6: I like (right) answers best | 7: ' + 'y'.repeat(400));
    const s = await one(edited, 'edited.csv');
    // Changed after saving: the page says so on the result, and still shows what the file holds.
    expect(s.integrity).toBe('changed');
    expect([s.readAlong.read, s.readAlong.played, s.readAlong.answers]).toEqual([2, 1, 7]);
    expect(s.readAlong.byPage[0].answers).toEqual([
      { question: 1, text: 'Mia', result: 'right', tries: 1 },
      { question: 2, text: 'Soup', result: 'not_right', tries: 1 },
      { question: 3, text: 'Soup', result: 'not_right', tries: 3 },
      // A choice with no keyed answer, or words typed: no right or not right.
      { question: 4, text: 'Tired', result: '', tries: null },
      { question: null, text: 'no number here', result: '', tries: null },
      { question: 6, text: 'I like (right) answers best', result: '', tries: null },
      // An answer longer than the file writes: 240 characters at most are kept for showing.
      { question: 7, text: 'y'.repeat(240), result: '', tries: null }]);
    // A page with neither word first: not read, not played; what is there is still listed.
    const odd = await one(withResponses(files.anaCsv, ANA_PAGE_3, 'something else | 2: words'), 'odd.csv');
    expect([odd.readAlong.pages, odd.readAlong.read, odd.readAlong.played]).toEqual([3, 1, 1]);
    expect(odd.readAlong.byPage[0].answers.map((a) => [a.question, a.text])).toEqual([[null, 'something else'], [2, 'words']]);
  });

  it('is null for a result with no read-along page, and nothing about a read-along becomes a score', async () => {
    const s = await one(files.anaCsv, 'ana.csv');
    // The right answer to question 1 moved no count.
    expect(s.summary).toEqual({ itemsInFile: 3, done: 3, given: 0, attempted: 0, correct: 0, firstTry: 0, accuracyPct: null, firstTryPct: null });
    expect(s.byStrand).toEqual([]);
    const sample = await reader.read(read('tests/fixtures/packets_results/sample_results.csv'), { name: 'sample_results.csv' });
    expect(sample.sessions.length).toBeGreaterThan(0);
    for (const row of sample.sessions) expect(row.readAlong).toBe(null);
  });

  it('"Save all of this as one file": the answers are not written twice, and are counted again from the items on reading', async () => {
    const sessions = [await one(files.anaCsv, 'ana.csv'), await one(files.benJson, 'ben.json')];
    const text = JSON.stringify(reader.makeBundle({ sessions, savedLocal: '2026-11-23T10:00:00-05:00' }));
    expect(text).not.toContain('readAlong');
    // The typed answer is in the file once: in its page's responses.
    expect(text.split(JSON.stringify(TYPED).slice(1, -1)).length - 1).toBe(1);
    // The sessions on the page are not changed by saving.
    expect(sessions[0].readAlong.answers).toBe(2);
    const got = await reader.read(text, { name: 'all.json' });
    expect(got.bundle.sessions.map((s) => s.readAlong)).toEqual(sessions.map((s) => s.readAlong));
    // A bundle edited by hand: what it says about the read-along is ignored; the items are counted.
    const edited = JSON.parse(text);
    edited.sessions[0].readAlong = { pages: 99, read: 99, played: 0, timeMs: 1, answers: 1, byPage: [{ page: 1, word: 'x', answers: [{ question: 1, text: '<img src=x>', result: 'right', tries: 1 }] }] };
    expect(reader.readBundle(edited).sessions[0].readAlong).toEqual(sessions[0].readAlong);
    // The summary CSV has the columns it had: a read-along adds none.
    const summary = reader.summaryCsv(sessions.map((session) => ({ learner: session.learner, session }))).replace(/^﻿/, '').split('\r\n');
    expect(summary[0]).toBe('"learner","date","measure","form","score","score_unit","accuracy_pct","first_try_pct","items_given","items_attempted","duration_s","flags","session_id","packet_id","packet_version","integrity","source_file","title","measure_name","accuracy_of_attempted_pct","active_s"');
    expect(summary[1].split('","').length).toBe(21);
    expect(summary.join('\n')).not.toContain('Mia');
  });
});

// ---------------------------------------------------------------------------
// Part 2: the page, run in jsdom (as tests/packets_results_page.test.js runs it)
// ---------------------------------------------------------------------------
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) { /* closed */ } }); });
function openPage(options = {}) {
  const dom = new JSDOM(read('packets-results.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-results.html' });
  const w = dom.window, d = w.document;
  opened.push(w);
  const page = { w, d, files: [], downloads: [], reached: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) w[name] = function () { page.reached.push(name); throw new Error(name + ' was called'); };
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), body: page.files[page.files.length - 1].body }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  if (options.before) options.before(w);
  // The page's own scripts, in the order the page names them.
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.state = () => ['state-empty', 'state-check', 'state-results'].filter((id) => page.seen(id)).join(' ');
  page.file = (text, name) => new w.File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified: new Date(2026, 10, 23, 9).getTime() });
  // Drop files, and show the results.
  page.add = async (list) => {
    page.$('said').textContent = '';
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files: list.map(([text, name]) => page.file(text, name)) };
    page.$('main').dispatchEvent(event);
    for (let i = 0; i < 1500 && !/\bread[,.]/.test(page.$('said').textContent); i++) await sleep(10);
    if (page.state() === 'state-check') page.$('show-results').click();
    expect(page.state()).toBe('state-results');
  };
  page.learner = (label) => {
    const radio = d.querySelector('input[name="view"][value="learner"]');
    radio.checked = true;
    radio.dispatchEvent(new w.Event('change', { bubbles: true }));
    const select = page.$('pick-learner');
    select.value = [...select.options].find((o) => o.textContent.startsWith(label + ' (')).value;
    select.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  // "Every result, in date order": each row as { cells: [text], row }.
  page.every = () => {
    const tables = [...page.$('learner-body').querySelectorAll('table')];
    const table = tables.find((t) => t.querySelector('caption').textContent.startsWith('Every result for '));
    return [...table.querySelectorAll('tbody tr')].map((row) => ({ row, cells: [...row.children].map((cell) => cell.textContent) }));
  };
  return page;
}

const ANA_LINE = 'Read 1 of 3 pages. 2 pages were only played: the file read them aloud by itself. 1 min 31 s on the pages.';
const FOLD_NAME = 'Answers to Check your understanding (2)';
// What the page shows for Ana's read-along, read from the page.
function shownFor(page) {
  const rows = page.every();
  expect(rows).toHaveLength(1);
  const [, what, , answered] = rows[0].cells;
  const result = rows[0].row.children[2];
  const fold = result.querySelector('details');
  return { what, answered, result, lines: [...result.childNodes].filter((n) => n.nodeName !== 'DETAILS').map((n) => n.textContent), fold };
}

describe('the page: one student, a read-along result', () => {
  it('says in one line the pages read, the pages only played and the time; the answers are in one closed fold, right and not right in words', async () => {
    const page = openPage();
    await page.add([[files.anaCsv, 'Kite-Story__Ana__2026-11-23.csv']]);
    page.learner('Ana');
    const shown = shownFor(page);
    expect(shown.what).toBe('Practice: Kite Story');
    // Not scored: no percent, no "0 of 0".
    expect(shown.lines).toEqual(['Not scored', ANA_LINE]);
    expect(shown.answered).toBe('1 of 3 pages read (practice, not scored)');
    expect(shown.result.textContent).not.toMatch(/%|\b0 of 0\b/);
    // One fold, closed, named with the number of answers.
    expect(shown.result.querySelectorAll('details')).toHaveLength(1);
    expect(shown.fold.open).toBe(false);
    expect(shown.fold.querySelector('summary').textContent).toBe(FOLD_NAME);
    // Each answer under its page.
    expect([...shown.fold.querySelectorAll('.ra-page')].map((n) => n.textContent)).toEqual(['Page 3: She slept well.']);
    const answers = [...shown.fold.querySelectorAll('li')];
    expect(answers.map((li) => li.textContent)).toEqual(['Question 1: Mia (right, on try 2)', 'Question 2: ' + TYPED]);
    // The child's words are text: no tag was made from them, and nothing in the fold says right or not right by color alone.
    expect(shown.fold.querySelectorAll('b, img, script, a, [style]')).toHaveLength(0);
    expect(answers[1].querySelector('.ra-said').textContent).toBe(TYPED);
    expect(answers[1].querySelector('.ra-said').children).toHaveLength(0);
    // The words: a check, never a test; "played" is explained once; no total of right answers.
    const said = shown.result.textContent;
    expect(said).not.toMatch(/\btest|\bquiz|assessment|comprehension score|\bnorm/i);
    expect(said.split('the file read').length - 1).toBe(1);
    expect(page.reached).toEqual([]);
  });

  it('shows the same from the JSON file; with no answers there is the line and no fold', async () => {
    const page = openPage();
    await page.add([[files.anaJson, 'Kite-Story__Ana__2026-11-23.json'], [files.benCsv, 'Kite-Story__Ben__2026-11-23.csv']]);
    page.learner('Ana');
    const ana = shownFor(page);
    expect(ana.lines).toEqual(['Not scored', ANA_LINE]);
    expect([...ana.fold.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Question 1: Mia (right, on try 2)', 'Question 2: ' + TYPED]);
    page.learner('Ben');
    const ben = shownFor(page);
    expect(ben.lines).toEqual(['Not scored', 'Read 3 of 3 pages. 1 min on the pages.']);
    expect(ben.answered).toBe('3 of 3 pages read (practice, not scored)');
    expect(ben.fold).toBe(null);
    expect(page.$('learner-body').querySelectorAll('.ra-fold')).toHaveLength(0);
  });

  it('says not right in words, one played page in the singular, and shows at most 240 characters of an answer', async () => {
    const page = openPage();
    const edited = files.anaCsv
      .replace('"played | 1: Mia (right, try 2) | 2: ' + TYPED.replace(/"/g, '""') + '"', '"read | 1: Soup (not right, 3 tries) | 2: The kite (not right) | 3: ' + 'z'.repeat(400) + '"');
    expect(edited).not.toBe(files.anaCsv);
    await page.add([[edited, 'edited.csv']]);
    page.learner('Ana');
    const shown = shownFor(page);
    expect(shown.lines[1]).toBe('Read 2 of 3 pages. 1 page was only played: the file read it aloud by itself. 1 min 31 s on the pages.');
    expect(shown.fold.querySelector('summary').textContent).toBe('Answers to Check your understanding (3)');
    const answers = [...shown.fold.querySelectorAll('li')].map((li) => li.textContent);
    expect(answers.slice(0, 2)).toEqual(['Question 1: Soup (not right, after 3 tries)', 'Question 2: The kite (not right)']);
    expect(answers[2]).toBe('Question 3: ' + 'z'.repeat(240));
  });
});

describe('the page: the group view, and what is saved', () => {
  it('read-alongs alone: the group view keeps its sentence, with no percent and no "0 of 0"', async () => {
    const page = openPage();
    await page.add([[files.anaCsv, 'ana.csv'], [files.benCsv, 'ben.csv']]);
    const group = page.$('group-table');
    expect(group.querySelectorAll('table')).toHaveLength(0);
    expect(group.querySelector('.group-none').textContent).toBe('Nothing in these results is scored: they are practice that is never scored, such as a read-along. Choose One student to see what each student did.');
    expect(page.$('view-group').textContent).not.toMatch(/\d%|\b0 of 0\b/);
    expect(group.querySelector('.group-read-along')).toBe(null);
  });

  it('read-alongs beside scored results: no read-along column, no percent for it, and one sentence says where it is shown', async () => {
    const page = openPage();
    await page.add([[files.anaCsv, 'ana.csv'], [read('tests/fixtures/packets_results/sample_results.csv'), 'sample_results.csv']]);
    const group = page.$('group-table');
    expect(group.querySelectorAll('table').length).toBeGreaterThan(0);
    const heads = [...group.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(heads.join(' | ')).not.toMatch(/read.along/i);
    const anaRows = [...group.querySelectorAll('tbody tr')].filter((row) => row.children[0].textContent.startsWith('Ana'));
    expect(anaRows.length).toBeGreaterThan(0);
    for (const row of anaRows) expect(row.textContent).not.toMatch(/%|\b0 of 0\b/);
    expect([...group.querySelectorAll('.group-read-along')].map((n) => n.textContent))
      .toEqual(['A read-along is not scored, so it is not in these tables. Choose a name to see what that student read and answered.']);
    // Without a read-along the sentence is not there.
    const plain = openPage();
    await plain.add([[read('tests/fixtures/packets_results/sample_results.csv'), 'sample_results.csv']]);
    expect(plain.$('group-table').querySelector('.group-read-along')).toBe(null);
  });

  it('"Save all of this as one file" and "Keep these results" bring the line and the fold back, and the summary CSV has no new column', async () => {
    const page = openPage();
    await page.add([[files.anaCsv, 'ana.csv']]);
    page.$('save-bundle').click();
    const bundle = page.downloads[page.downloads.length - 1];
    expect(bundle.name).toMatch(/^results-all__\d{4}-\d{2}-\d{2}\.json$/);
    expect(bundle.body).not.toContain('readAlong');
    page.$('save-csv').click();
    const summary = page.downloads[page.downloads.length - 1].body.replace(/^﻿/, '').split('\r\n');
    expect(summary[0].split(',')).toHaveLength(21);
    expect(summary[0].endsWith('"measure_name","accuracy_of_attempted_pct","active_s"')).toBe(true);
    // The saved file, dropped on a page that has nothing.
    const later = openPage();
    await later.add([[bundle.body, bundle.name]]);
    later.learner('Ana');
    const again = shownFor(later);
    expect(again.lines).toEqual(['Not scored', ANA_LINE]);
    expect(again.fold.open).toBe(false);
    expect([...again.fold.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Question 1: Mia (right, on try 2)', 'Question 2: ' + TYPED]);
    // Keep these results on this device: what the browser holds has the answers once, and a new opening shows them.
    page.$('keep').checked = true;
    page.$('keep').dispatchEvent(new page.w.Event('change', { bubbles: true }));
    const kept = page.w.localStorage.getItem('alloflow-packets-results/1');
    expect(kept).toContain('1: Mia (right, try 2)');
    expect(kept).not.toContain('readAlong');
    const reopened = openPage({ before: (w) => w.localStorage.setItem('alloflow-packets-results/1', kept) });
    for (let i = 0; i < 500 && reopened.state() !== 'state-results'; i++) await sleep(10);
    expect(reopened.state()).toBe('state-results');
    reopened.learner('Ana');
    const back = shownFor(reopened);
    expect(back.lines).toEqual(['Not scored', ANA_LINE]);
    expect(back.fold.querySelector('summary').textContent).toBe(FOLD_NAME);
  });
});
