import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// Fixes on the results side of AlloFlow Packets, 2026-11-13 (owner-approved, from C:\tmp\packets_build_1111\results_review\FINDINGS.txt
// "LEFT FOR THE OWNER" 1 to 10, robust\REQUESTS.txt 1 and journey\REQUESTS.txt R4):
// 1 the group is two tables (checks, then practice) with the name column held in view, a cue when a table scrolls sideways, and on a
//   phone "Every result" and a measure's table as one card per row; 2 the summary CSV gains title, measure_name,
//   accuracy_of_attempted_pct and active_s (append only); 3 one rule for "latest": the latest result with a score, in the table as in the
//   middle of the group, a later one with no score noted; 4 Class Analytics adds an untimed check by default; 5 dates a spreadsheet
//   rewrote (11/16/2026 9:10) are read when the order of day and month is not in doubt; 6 the time on the items is shown; 7 the "needs a
//   look" count, the reader's done, the top link, Class Analytics file names on the local date, and the 50 kept screening records with the
//   ones a teacher gave first. Also the two flags a check writes from today, time_up_away and two_tabs.
// Files are made by the take-home loader's own writer (resultsCsv) from result objects shaped as a file saves them.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const reader = require('../packets_results_reader.js');
const lender = { crypto: webcrypto };
lender.window = lender;
new Function('window', read('word_sounds_take_home_loader.js')).call(lender, lender);
const loader = lender.AlloWordSoundsTakeHome;
const analytics = read('student_analytics_module.js');
const cut = (start, end) => { const a = analytics.indexOf(start), b = analytics.indexOf(end, a + start.length); if (a < 0 || b < 0) throw new Error('not found: ' + start); return analytics.slice(a, b); };
const AC = new Function(cut('  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') + cut('  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(')
  + '\nreturn {readFile: _acThReadFile, preview: _acThPreview, ready: _acThReady, panel: _acThPreviewPanel, persistable: _acPersistableStudent, kept: _acKeptScreening,'
  + ' localDate: _acLocalDate, sheetStamp: _acThSheetStamp, scoreText: _acCkScoreText, notes: _acCkNotes, record: _acCkRecord, overTime: _acCkOverTime, activeText: _acThActiveText};')();
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(md, 'react'));
const { renderToStaticMarkup } = require(resolve(md, 'react-dom/server'));

const opened = [];
afterAll(() => opened.forEach((w) => { try { w.close(); } catch (_) {} }));

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------
const wall = (day, time, plus = 0) => new Date(Date.parse(day + 'T' + time + 'Z') + plus * 1000).toISOString().slice(0, 19) + '-05:00';
const utc = (local) => (local ? new Date(Date.parse(local)).toISOString() : '');
const TITLES = { isolation: 'Find Sounds', blending: 'Blend Sounds', missing_letter: 'Missing Letter', rhyming: 'Rhyme Time', mapping: 'Sound Mapping', decoding: 'Read & Match', read_sentence: 'Finish the Sentence' };
function practice(o = {}) {
  o = { sid: 'p-1', learner: 'BlueHeron7', day: '2026-11-03', time: '16:00:05', seconds: 300, title: 'Short vowels', activities: ['isolation', 'isolation', 'blending', 'missing_letter'], ...o };
  const startedLocal = wall(o.day, o.time), finishedLocal = wall(o.finishDay || o.day, o.time, o.seconds);
  const out = { kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2', sessionId: o.sid,
    packet: { id: 'ws-short-vowels', version: 'r91b7d204', engine: 'alloflow-packet/1', form: '', mode: 'practice' }, lessonId: 'ws-short-vowels', revision: 'r91b7d204', lessonTitle: o.title,
    activityTitles: TITLES, learner: o.learner, learnerName: o.learner, startedAt: utc(startedLocal), finishedAt: utc(finishedLocal), startedLocal, finishedLocal,
    durationMs: (o.durationS != null ? o.durationS : o.seconds) * 1000, timesAreFromTheLearnerDevice: true,
    items: o.activities.map((activity, i) => ({ n: i + 1, itemId: activity + '-' + i, activity, word: 'cat', target: 'k', responses: i === 1 ? ['d', 'k'] : ['k'], attempts: i === 1 ? 2 : 1,
      firstTry: i !== 1, correct: true, done: true, ms: 2400, supports: {}, practice: null, flag: '' })) };
  if (o.activeMs != null) out.activeMs = o.activeMs;
  return out;
}
// A Math Fluency check of eight problems (digits possible 2 1 2 1 2 1 2 2), scored by the loader's own checkScore. sample: the sample
// question first (practice, never scored). untimed: no clock (an accommodation).
const PROBLEMS = [[7, '+', 8], [12, '-', 5], [9, '+', 6], [15, '-', 7], [8, '+', 8], [14, '-', 6], [23, '+', 14], [36, '-', 12]];
function check(o = {}) {
  o = { sid: 'c-1', learner: 'BlueHeron7', day: '2026-11-17', time: '09:12:05', form: 'A', done: 8, elapsedS: 96, hiddenS: 0, flags: [], completion: '', sample: false, untimed: false, ...o };
  const adapter = loader.CHECK_ADAPTERS.math_computation;
  const completion = o.completion || (o.done < PROBLEMS.length ? 'time' : 'complete');
  const rows = [];
  const items = PROBLEMS.map(([a, op, b], i) => {
    const right = String(op === '+' ? a + b : a - b), attempted = i < o.done;
    const mark = attempted ? adapter.score({}, right, right) : null;
    rows.push({ practice: false, attempted, correct: !!(mark && mark.correct), digitsCorrect: mark ? mark.digitsCorrect : null, digitsPossible: mark ? mark.digitsPossible : null });
    return { n: i + 1, itemId: 'math_computation-' + i, activity: 'math_computation', word: a + ' ' + op + ' ' + b, target: right, responses: attempted ? [right] : [], attempts: attempted ? 1 : 0,
      firstTry: attempted, correct: attempted, done: attempted, ms: attempted ? 4000 : 0, supports: {}, practice: null, flag: '',
      digitsCorrect: mark ? mark.digitsCorrect : null, digitsPossible: mark ? mark.digitsPossible : null };
  });
  if (o.sample) items.unshift({ n: 0, itemId: 'math_computation-p0', activity: 'math_computation', word: '10 + 10', target: '20', responses: ['20'], attempts: 1, firstTry: true, correct: true,
    done: true, ms: 2500, supports: {}, practice: 'practice', flag: '', digitsCorrect: null, digitsPossible: null });
  items.forEach((it, i) => { it.n = i + 1; });
  const startedLocal = wall(o.day, o.time), finishedLocal = wall(o.day, o.time, o.elapsedS + 12);
  const out = { kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2', sessionId: o.sid,
    packet: { id: 'math-computation-g2', version: 'r5a3c2e10', engine: 'alloflow-packet/1', form: o.form, mode: 'check' }, lessonId: 'math-computation-g2', revision: 'r5a3c2e10',
    lessonTitle: 'Math Fluency check (2' + o.form + (o.untimed ? ', untimed' : '') + ')', activityTitles: { math_computation: 'Math Fluency' }, learner: o.learner, learnerName: o.learner,
    startedAt: utc(startedLocal), finishedAt: utc(finishedLocal), startedLocal, finishedLocal, durationMs: (o.elapsedS + 12) * 1000, timesAreFromTheLearnerDevice: true, items };
  out.score = loader.checkScore({ measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: o.untimed ? null : 120, untimed: o.untimed, usualTimeLimitS: 120, scoringVersion: 3, formVersion: 2 },
    rows, { elapsedMs: o.elapsedS * 1000, hiddenMs: o.hiddenS * 1000, completion, attempt: 1, flags: o.flags });
  if (o.activeMs != null) out.activeMs = o.activeMs;
  return out;
}
const sealed = (result) => { const table = loader.resultsCsv(result); return { table, integrity: { method: 'sha256', value: loader.sha256(table.basis).hex } }; };
const csvOf = (result) => { const { table, integrity } = sealed(result); return table.text(integrity); };
const jsonOf = (result) => JSON.stringify({ ...result, integrity: { ...sealed(result).integrity, note: 'detects accidental edits, not deliberate ones' } });
const nameOf = (result, ext = 'csv') => loader.resultsCsv(result).stem + '.' + ext;
const LAST_CHANGED = new Date(2026, 10, 20, 8).getTime();
const one = async (text, name = 'results.csv') => { const got = await reader.read(text, { name, lastModified: LAST_CHANGED }); expect(got.why, name).toBe(''); return got.sessions[0]; };
const theirs = async (text, name = 'results.csv') => { const got = await AC.readFile(new File([text], name, { lastModified: LAST_CHANGED })); expect(got.reason, name).toBe(''); return got.sessions[0]; };
// The cells of a file as saved, and the same cells as a spreadsheet saves them again.
const cellsOf = (csv) => csv.slice(1, -2).split('\r\n').map((line) => line.slice(1, -1).split('","').map((cell) => cell.replace(/""/g, '"')));
const resave = (rows, separator) => rows.map((row) => row.map((cell) => (cell.includes(separator) || /["\r\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell)).join(separator)).join('\n') + '\n';
// A spreadsheet that rewrites the two date cells (started_local, finished_local) its own way.
const redate = (csv, separator, started, finished) => resave(cellsOf(csv).map((row, r) => (r && !row[0].startsWith('#') ? row.map((cell, i) => (i === 7 ? started : i === 8 ? finished : cell)) : row)), separator);

// ---------------------------------------------------------------------------
// Add up results in jsdom
// ---------------------------------------------------------------------------
function openPage({ wide = null } = {}) {
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
  // jsdom lays nothing out: a box is as wide as the test says (wide(box) returns [clientWidth, scrollWidth]).
  if (wide) {
    Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return wide(this)[0]; } });
    Object.defineProperty(w.HTMLElement.prototype, 'scrollWidth', { configurable: true, get() { return wide(this)[1]; } });
  }
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.file = (text, name) => new w.File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified: LAST_CHANGED });
  page.drop = async (files) => {
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files };
    page.$('main').dispatchEvent(event);
    for (let i = 0; i < 1500 && !/\bread[,.]/.test(page.$('said').textContent); i++) await new Promise((r) => setTimeout(r, 10));
    return page.$('said').textContent;
  };
  page.view = (name) => { const radio = d.querySelector('input[name="view"][value="' + name + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.learner = (label) => {
    page.view('learner');
    const pick = page.$('pick-learner');
    pick.value = [...pick.options].find((o) => o.textContent.startsWith(label + ' (')).value;
    pick.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  page.table = (table) => [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => [...cell.childNodes].map((n) => n.textContent).filter(Boolean).join(' / ')));
  page.tables = () => [...page.$('group-table').querySelectorAll('table')];
  page.every = () => [...page.$('learner-body').querySelectorAll(':scope > .table-scroll table')].pop();
  return page;
}

// ---------------------------------------------------------------------------
// 1. The group: two tables, the names held in view, a cue when a table is wider than its box, cards on a phone
// ---------------------------------------------------------------------------
describe('1. the group in two tables', () => {
  // Six skills of practice and six series of checks: one table was 2524 px wide, its check scores off a 1280 px laptop's screen.
  const STRANDS = ['rhyming', 'isolation', 'mapping', 'missing_letter', 'decoding', 'read_sentence'];
  const classFiles = (page) => {
    const files = [];
    ['AmberLynx9', 'BlueHeron7', 'CopperElk4', 'GoldFinch5', 'GrayOwl4', 'RedFox3'].forEach((learner, i) => {
      files.push(page.file(csvOf(practice({ sid: 'p-' + i, learner, activities: STRANDS })), 'p-' + i + '.csv'));
      ['A', 'B', 'C'].forEach((form, k) => files.push(page.file(csvOf(check({ sid: 'c-' + i + form, learner, form, day: '2026-11-1' + (4 + k), elapsedS: 96 })), 'c-' + i + form + '.csv')));
    });
    return files;
  };
  it('shows the checks first and the practice second, each table with the student\'s name first, sorted on its own', async () => {
    const page = openPage();
    await page.drop(classFiles(page));
    page.$('show-results').click();
    const [checks, practiceTable] = page.tables();
    expect([...page.$('group-table').querySelectorAll('h4')].map((h) => h.textContent)).toEqual(['Checks: latest score', 'Practice: latest first-try percent']);
    expect([...checks.querySelectorAll('thead th')].map((th) => th.querySelector('.sort-name').textContent)).toEqual(['Student', 'Results', 'Last date', 'Math Fluency (grade 2)']);
    expect([...practiceTable.querySelectorAll('thead th')].map((th) => th.querySelector('.sort-name').textContent))
      .toEqual(['Student', 'Syllables and rhyme', 'Hearing sounds', 'Letters and sounds', 'Spelling', 'Reading words', 'Reading sentences']);
    // No heading row inside a table any more: each table is named by its heading, and each region by that heading.
    expect(page.$('group-table').querySelectorAll('th[scope="colgroup"]')).toHaveLength(0);
    for (const table of page.tables()) {
      const box = table.parentNode;
      expect([box.className.split(' ')[0], box.getAttribute('role'), page.$(box.getAttribute('aria-labelledby')).tagName]).toEqual(['table-scroll', 'region', 'H4']);
      expect(table.querySelector('tbody tr').firstElementChild.tagName).toBe('TH');
    }
    // Every row of a check shows its score: "8" and its form.
    expect(page.table(checks).map((row) => row[3])).toEqual(Array(6).fill('8 / form C'));
  });

  it('holds the name column in view, and shows a cue only on a table wider than its box', async () => {
    // A 1022 px box; the checks table fits, the practice table is 1400 px wide.
    const page = openPage({ wide: (node) => (!node.classList || !node.classList.contains('table-scroll') ? [0, 0] : node.querySelector('.sort[data-table="practice"]') ? [1022, 1400] : [1022, 900]) });
    await page.drop(classFiles(page));
    page.$('show-results').click();
    const cues = page.tables().map((table) => table.parentNode.querySelector('.scroll-cue'));
    expect(cues.map((cue) => [cue.hidden, cue.getAttribute('aria-hidden'), cue.textContent])).toEqual([[true, 'true', 'More columns to the right: scroll this table sideways.'],
      [false, 'true', 'More columns to the right: scroll this table sideways.']]);
    expect(page.tables().map((table) => table.parentNode.classList.contains('is-wide'))).toEqual([false, true]);
    // The cue sits in the box, above its table, so the table is still the box's table (the region holds it).
    expect(page.tables().every((table) => table.parentNode.firstElementChild.classList.contains('scroll-cue'))).toBe(true);
    const css = read('packets-results.css');
    expect(css).toContain('#group-table .data tbody th { position: sticky; left: 0;');
    expect(css).toContain('#group-table .data thead th:first-child { position: sticky; left: 0; z-index: 2;');
    expect(css).toMatch(/\.scroll-cue \{ position: sticky; left: 0;/);
    expect(css).toMatch(/\.table-scroll\.is-wide \{ background: linear-gradient\([^;]*local,[^;]*scroll, var\(--surface\); \}/);
  });

  it('on a phone, Every result and a measure\'s table read as cards: each cell carries its column, so Time taken and Notes are in view', async () => {
    const page = openPage();
    await page.drop([page.file(csvOf(practice({ sid: 'p-1' })), 'p.csv'), page.file(csvOf(check({ sid: 'c-1', flags: ['left_the_page'], hiddenS: 6 })), 'c.csv')]);
    page.$('show-results').click();
    page.learner('BlueHeron7');
    const every = page.every();
    expect(every.className).toContain('data-cards');
    expect([every.getAttribute('role'), every.querySelector('thead').getAttribute('role'), every.querySelector('tbody').getAttribute('role'), every.querySelector('tbody tr').getAttribute('role')])
      .toEqual(['table', 'rowgroup', 'rowgroup', 'row']);
    const row = every.querySelector('tbody tr');
    expect([row.children[0].getAttribute('role'), ...[...row.children].slice(1).map((td) => [td.getAttribute('role'), td.getAttribute('data-label')])])
      .toEqual(['rowheader', ['cell', 'What'], ['cell', 'Result'], ['cell', 'Answered'], ['cell', 'Time taken'], ['cell', 'Notes']]);
    for (const th of every.querySelectorAll('thead th')) expect([th.getAttribute('role'), th.getAttribute('scope')]).toEqual(['columnheader', 'col']);
    const measure = page.$('learner-body').querySelector('.measure table');
    expect(measure.className).toContain('data-cards');
    // The wrong-answers table stays a table.
    const css = read('packets-results.css');
    const phone = css.slice(css.indexOf('@media screen and (max-width: 39.99rem) {'));
    expect(phone).toMatch(/^@media screen and \(max-width: 39\.99rem\) \{\n {2}\.data-cards\.data-wide \{ min-width: 0; \}\n {2}\.data-cards, \.data-cards tbody, \.data-cards tr, \.data-cards th, \.data-cards td \{ display: block; \}/);
    expect(phone).toContain('.data-cards td[data-label]::before { content: attr(data-label) ": "; content: attr(data-label) ": " / "";');
    // The column names are hidden from sight only, never from a screen reader (which reads the roles, not the generated label).
    expect(phone).toMatch(/\.data-cards thead \{ position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect\(0 0 0 0\); clip-path: inset\(50%\);/);
  });
});

// ---------------------------------------------------------------------------
// 2. The summary CSV
// ---------------------------------------------------------------------------
describe('2. the summary CSV', () => {
  const OLD = ['learner', 'date', 'measure', 'form', 'score', 'score_unit', 'accuracy_pct', 'first_try_pct', 'items_given', 'items_attempted', 'duration_s', 'flags', 'session_id', 'packet_id',
    'packet_version', 'integrity', 'source_file'];
  it('keeps every earlier column in its place and appends title, measure_name, accuracy_of_attempted_pct and active_s', async () => {
    expect(reader.SUMMARY_COLUMNS.slice(0, OLD.length)).toEqual(OLD);
    expect(reader.SUMMARY_COLUMNS.slice(OLD.length)).toEqual(['title', 'measure_name', 'accuracy_of_attempted_pct', 'active_s']);
    // A timed check where time ran out at 6 of 8, all 6 right: accuracy_pct is 75 (the 2 not reached count), accuracy_of_attempted_pct 100.
    const timeUp = await one(csvOf(check({ sid: 'c-t', done: 6, elapsedS: 120, activeMs: 24400 })), 'timeup.csv');
    const p = await one(csvOf(practice({ sid: 'p-a', activeMs: 9600 })), 'p.csv');
    const old = await one(csvOf(practice({ sid: 'p-o' })), 'older.csv');
    const rows = reader.parseCsv(reader.summaryCsv([{ learner: 'BlueHeron7', session: timeUp }, { learner: 'BlueHeron7', session: p }, { learner: 'BlueHeron7', session: old }]));
    const byName = rows.slice(1).map((row) => Object.fromEntries(rows[0].map((name, i) => [name, row[i]])));
    expect(byName.map((r) => [r.measure, r.accuracy_pct, r.accuracy_of_attempted_pct, r.items_given, r.items_attempted, r.title, r.measure_name, r.active_s, r.duration_s])).toEqual([
      ['math_dcpm', '75', '100', '8', '6', 'Math Fluency check (2A)', 'Math Fluency', '24', '132'],
      ['practice', '100', '100', '4', '4', 'Short vowels', 'Practice', '10', '300'],
      // Saved before 2026-11-13: no time on the items, an empty cell.
      ['practice', '100', '100', '4', '4', 'Short vowels', 'Practice', '', '300']]);
    // The page says what the new column is.
    expect(new JSDOM(read('packets-results.html')).window.document.querySelector('#take > .hint').textContent)
      .toContain('For a timed check, the column accuracy_of_attempted_pct is the share right of the questions the student reached (accuracy_pct also counts the ones not reached).');
  });
  it('a title or a name that a spreadsheet would run as a formula is written guarded', async () => {
    const s = await one(csvOf(practice({ sid: 'p-f', title: '=HYPERLINK("x")' })), 'f.csv');
    expect(reader.summaryCsv([{ learner: 'x', session: s }]).split('\r\n')[1]).toContain(',"\'=HYPERLINK(""x"")","Practice","100",""');
  });
});

// ---------------------------------------------------------------------------
// 3. One rule for "latest"
// ---------------------------------------------------------------------------
describe('3. "latest" is the latest result with a score, in the table and in the middle of the group', () => {
  it('a check stopped early after a scored one: the table shows the scored one, the middle counts it, and the stopped one is a note', async () => {
    const page = openPage();
    const files = ['AmberLynx9', 'BlueHeron7', 'CopperElk4', 'GoldFinch5', 'GrayOwl4'].map((learner, i) => page.file(csvOf(check({ sid: 's-' + i, learner, elapsedS: 60 + i * 12, day: '2026-11-16' })), 's-' + i + '.csv'));
    // Scores 13, 11, 9, 8, 7. BlueHeron7 then stops a check early (no score); SilverBear1 has only a stopped one.
    files.push(page.file(csvOf(check({ sid: 'late-1', learner: 'BlueHeron7', done: 3, elapsedS: 40, completion: 'ended_early', day: '2026-11-24' })), 'late-1.csv'));
    files.push(page.file(csvOf(check({ sid: 'late-2', learner: 'SilverBear1', done: 2, elapsedS: 30, completion: 'ended_early', day: '2026-11-24' })), 'late-2.csv'));
    await page.drop(files);
    page.$('show-results').click();
    const rows = page.table(page.tables()[0]);
    const cell = (name) => rows.find((row) => row[0] === name)[3];
    expect(cell('BlueHeron7')).toBe('11 / form A / Later, Nov 24: no score (stopped early)');
    expect(cell('SilverBear1')).toBe('No score / form A / stopped early');
    expect(cell('AmberLynx9')).toBe('13 / form A');
    // The middle of the group counts the same results: one for each student, the scored one.
    const values = ['AmberLynx9', 'BlueHeron7', 'CopperElk4', 'GoldFinch5', 'GrayOwl4'].map((name) => Number(cell(name).split(' / ')[0]));
    const middle = page.$('middles').querySelector('.middle');
    expect(middle.querySelector('.middle-label').textContent).toBe('Middle of this group (n = 5)');
    expect(Number(middle.querySelector('.middle-number').textContent)).toBe(reader.middle(values).median);
    // Sorted by the check, a student with no score goes last, and the stopped try does not move BlueHeron7.
    [...page.tables()[0].querySelectorAll('.sort')].find((b) => b.getAttribute('data-sort').startsWith('c:')).click();
    const sorted = page.table(page.tables()[0]).map((row) => row[0]);
    expect(sorted[sorted.length - 1]).toBe('SilverBear1');
    // The student's own card says the same latest score.
    page.learner('BlueHeron7');
    expect(page.$('learner-body').querySelector('.measure-latest').textContent).toBe('Latest: 11, Nov 16, 2026.');
    expect(read('packets-results.js')).toContain("hint: 'Each check shows the latest result with a score, the one the middle of the group counts. A later result with no score is noted under it.' }");
  });
  it('an untimed Math Fluency check (no rate) shows its items right in the table', async () => {
    const model = reader.addUp([await one(csvOf(check({ sid: 'u-1', untimed: true, elapsedS: 300, done: 8 })), 'u.csv')], {});
    const page = openPage();
    await page.drop([page.file(csvOf(check({ sid: 'u-1', untimed: true, elapsedS: 300, done: 8 })), 'u.csv')]);
    page.$('show-results').click();
    expect(model.checks.map((c) => c.label)).toEqual(['Math Fluency (grade 2), untimed']);
    expect(page.table(page.tables()[0])[0][3]).toBe('No score / form A / no clock: 8 of 8 right');
  });
});

// ---------------------------------------------------------------------------
// 4. Class Analytics: an untimed check is added by default
// ---------------------------------------------------------------------------
describe('4. Class Analytics adds an untimed check by default', () => {
  const panel = (preview) => new JSDOM(renderToStaticMarkup(AC.panel(React.createElement, (k) => k, { busy: false, done: null, ...preview }, { onFiles() {}, onChoice() {}, onSkip() {}, onAddAll() {}, onClose() {} }))).window.document;
  it('untimed: not skipped, ready, with its items right; a check stopped early or timed out while away is still skipped', async () => {
    const files = [['u.csv', csvOf(check({ sid: 'u-1', untimed: true, elapsedS: 300 }))], ['stop.csv', csvOf(check({ sid: 'st-1', done: 3, elapsedS: 40, completion: 'ended_early' }))],
      ['away.csv', csvOf(check({ sid: 'aw-1', done: 5, elapsedS: 120, completion: 'time', flags: ['time_up_away'] }))]];
    const preview = await AC.preview(files.map(([name, text]) => new File([text], name, { lastModified: LAST_CHANGED })), [{ id: 's1', name: 'BlueHeron7', stats: {}, screeningHistory: [], data: {} }], null, {}, {});
    expect(preview.rows.map((r) => [r.file, r.session.check.noScore, r.session.check.untimed, r.skip, AC.ready(r)])).toEqual([
      ['u.csv', 'untimed', true, false, true], ['stop.csv', 'ended_early', false, true, false], ['away.csv', 'time_up_away', false, true, false]]);
    const doc = panel(preview);
    const [untimed, stopped, away] = [...doc.querySelectorAll('tbody tr')];
    expect(untimed.querySelector('[data-th-ck-untimed-items]').textContent).toBe('8 items correct (8 tried)');
    expect(untimed.querySelector('[data-th-ck-skipped]')).toBeNull();
    expect(untimed.querySelector('input[data-th-skip]').hasAttribute('checked')).toBe(false);
    expect(stopped.querySelector('[data-th-ck-skipped]').textContent).toBe('It has no score, so it is skipped. Clear Skip to add it anyway.');
    // time_up_away (2026-11-13, the engine): no score, said in plain words, and its flag too.
    expect(away.querySelector('[data-th-ck-score]').textContent).toBe('No score: the time ran out while the page was hidden or closed.');
    expect([...away.querySelectorAll('[data-th-ck-note]')].map((n) => n.textContent)).toEqual(['⚠ The time ran out while the page was hidden or closed.']);
    expect(doc.querySelector('[data-th-add-all]').textContent).toBe('Add all (1)');
    expect(AC.notes((k) => k, { flags: ['two_tabs'], attempt: 1 })).toEqual(['The check was open in two tabs or windows while it ran.']);
  });
});

// ---------------------------------------------------------------------------
// 5. Dates a spreadsheet rewrote
// ---------------------------------------------------------------------------
describe('5. dates a spreadsheet rewrote are read when the order of day and month is not in doubt', () => {
  const both = async (text, name) => {
    const mine = await one(text, name), t = await theirs(text, name);
    expect([mine.date, mine.dateFromFile, mine.start], name).toEqual([t.date, t.dateFromFile, t.start]);
    return mine;
  };
  const base = check({ sid: 'd-1', day: '2026-11-16', time: '14:10:05' });
  const named = nameOf(base);
  it('reads US, European and dotted forms, with the saved name or a day above 12 to tell them apart', async () => {
    expect(named).toBe('Math-Fluency-check-2A__BlueHeron7__2026-11-16.csv');
    const csv = csvOf(base);
    // Excel, US: month first, no seconds. The name the file was saved under carries the finish date.
    const us = await both(redate(csv, ',', '11/16/2026 9:12', '11/16/2026 9:14'), named);
    expect([us.date, us.dateFromFile, us.integrity, new Date(us.start).getHours(), new Date(us.start).getMinutes()]).toEqual(['2026-11-16', false, 'changed', 9, 14]);
    // A day above 12 says it on its own, under any name; so do dots (day first).
    expect((await both(redate(csv, ';', '16/11/2026 09:12', '16/11/2026 09:14'), 'renamed.csv')).date).toBe('2026-11-16');
    expect((await both(redate(csv, ';', '05.11.2026 09:12', '05.11.2026 09:14'), 'renamed.csv')).date).toBe('2026-11-05');
    expect((await both(redate(csv, ',', '11/16/26 9:12 AM', '11/16/26 9:14 PM'), 'renamed.csv')).date).toBe('2026-11-16');
    // 11/12/2026 under the saved name of Nov 12 is month first; under a name of Dec 11, day first.
    expect((await both(redate(csv, ',', '11/12/2026 9:12', '11/12/2026 9:14'), 'Math-Fluency-check-2A__BlueHeron7__2026-11-12.csv')).date).toBe('2026-11-12');
    expect((await both(redate(csv, ',', '11/12/2026 9:12', '11/12/2026 9:14'), 'Math-Fluency-check-2A__BlueHeron7__2026-12-11 (1).csv')).date).toBe('2026-12-11');
  });
  it('the file\'s own duration tells a resumed file\'s order; when nothing does, the file\'s date stands in with its note, as before', async () => {
    // Started Nov 9 at 23:30, finished Nov 11 at 19:00: 156600 s. Read day first, Sep 11 to Nov 11 would be 61 days.
    const resumed = practice({ sid: 'r-1', day: '2026-11-09', time: '23:30:00', finishDay: '2026-11-09', seconds: 156600 });
    const m = await both(redate(csvOf(resumed), ',', '11/9/2026 23:30', '11/11/2026 19:00'), 'renamed.csv');
    expect([m.date, m.dateFromFile]).toEqual(['2026-11-11', false]);
    // Same day, both numbers 12 or less, a name with no date: in doubt.
    const doubt = await both(redate(csvOf(base), ',', '5/11/2026 9:12', '5/11/2026 9:14'), 'renamed.csv');
    expect([doubt.date, doubt.dateFromFile, doubt.flags.includes('date_from_file')]).toEqual(['2026-11-20', true, true]);
    // 3/3/2026 reads the same either way.
    expect((await both(redate(csvOf(base), ',', '3/3/2026 9:12', '3/3/2026 9:14'), 'renamed.csv')).date).toBe('2026-03-03');
    // Not dates at all, a day that does not exist, a time past 23:59: as before.
    for (const [a, b] of [['soon', 'later'], ['2/30/2026 9:00', '2/30/2026 9:02'], ['11/16/2026 25:10', '11/16/2026 25:12'], ['16.13.2026 9:00', '16.13.2026 9:02']]) {
      expect((await both(redate(csvOf(base), ',', a, b), named)).dateFromFile, a).toBe(true);
    }
    // The two readers' rule is the same function, word for word apart from the names.
    for (const values of [['11/16/2026 9:14', '11/16/2026 9:12'], ['16/11/2026 9:14'], ['11/12/2026 9:14'], ['11/11/2026 19:00', '11/9/2026 23:30'], ['x', '11/16/2026 9:12'], []]) {
      for (const [name, seconds] of [['a__2026-11-12.csv', 108], ['b.csv', 156600], ['c.csv', null]]) expect(reader.sheetStamp(values, name, seconds), values + name).toBe(AC.sheetStamp(values, name, seconds));
    }
  });
});

// ---------------------------------------------------------------------------
// 6. The time on the items
// ---------------------------------------------------------------------------
describe('6. the time on the items is shown', () => {
  it('both readers read active_s from the CSV and activeMs from the JSON, the same; an older file has none', async () => {
    const r = practice({ sid: 'a-1', activeMs: 252400 });
    const fromCsv = await one(csvOf(r), 'a.csv'), fromJson = await one(jsonOf(r), 'a.json');
    expect([fromCsv.activeS, fromJson.activeS, (await theirs(csvOf(r))).activeSeconds, (await theirs(jsonOf(r), 'a.json')).activeSeconds]).toEqual([252, 252, 252, 252]);
    expect(csvOf(r)).toContain('"title=Short vowels","active_s=252"');
    const older = practice({ sid: 'a-2' });
    expect([(await one(csvOf(older))).activeS, 'activeSeconds' in (await theirs(csvOf(older)))]).toEqual([null, false]);
    // Kept in "Save all of this as one file" and read back.
    expect(reader.readBundle(JSON.parse(JSON.stringify(reader.makeBundle({ sessions: [fromCsv] })))).sessions[0].activeS).toBe(252);
  });
  it('Every result: practice says its time on the items first, start to finish under it; a check keeps its own clock', async () => {
    const page = openPage();
    await page.drop([page.file(csvOf(practice({ sid: 'a-1', activeMs: 252400, seconds: 900 })), 'a.csv'),
      page.file(csvOf(practice({ sid: 'a-2', day: '2026-11-09', time: '23:30:00', seconds: 156600, finishDay: '2026-11-09', activeMs: 610000 })), 'b.csv'),
      page.file(csvOf(practice({ sid: 'a-3', day: '2026-11-04', activeMs: 290000 })), 'c.csv'),
      page.file(csvOf(check({ sid: 'a-4', activeMs: 40000 })), 'd.csv')]);
    page.$('show-results').click();
    page.learner('BlueHeron7');
    const times = page.table(page.every()).map((row) => [row[0], row[4]]);
    expect(times).toEqual([['Nov 3, 2026', '4 min 12 s on the items / 15 min start to finish'], ['Nov 4, 2026', '4 min 50 s on the items'],
      ['Nov 11, 2026', '10 min 10 s on the items / open 1 day 19 h: started Nov 9, 2026, finished Nov 11, 2026'], ['Nov 17, 2026', '1 min 36 s']]);
  });
  it('Class Analytics shows it under the date in the preview, for practice', async () => {
    const preview = await AC.preview([new File([csvOf(practice({ sid: 'a-1', activeMs: 252400 }))], 'a.csv', { lastModified: LAST_CHANGED })], [], null, {}, {});
    const doc = new JSDOM(renderToStaticMarkup(AC.panel(React.createElement, (k) => k, { busy: false, done: null, ...preview }, { onFiles() {}, onChoice() {}, onSkip() {}, onAddAll() {}, onClose() {} }))).window.document;
    expect(doc.querySelector('[data-th-active]').textContent).toBe('4 min 12 s on the items');
    expect([AC.activeText(null, 45), AC.activeText(null, 240), AC.activeText(null, 252)]).toEqual(['45 s on the items', '4 min on the items', '4 min 12 s on the items']);
  });
});

// ---------------------------------------------------------------------------
// 7. Smaller fixes
// ---------------------------------------------------------------------------
describe('7. smaller fixes', () => {
  it('a changed copy swapped for a clean one is one look, not two', async () => {
    const text = csvOf(check({ sid: 'x-1' }));
    const changed = text.replace('"4000"', '"4001"');
    for (const order of [[[changed, 'b.csv'], [text, 'a.csv']], [[text, 'a.csv'], [changed, 'b.csv']]]) {
      const page = openPage();
      expect(await page.drop(order.map(([body, name]) => page.file(body, name)))).toBe('2 files read, 1 needs a look.');
      page.$('show-results').click();
      expect(page.$('open-check').textContent).toBe('Check what was read (1)');
    }
  });
  it('the reader\'s done leaves a check\'s sample question out, as Class Analytics does', async () => {
    const s = await one(csvOf(check({ sid: 'q-1', sample: true, done: 5, elapsedS: 120 })), 'q.csv');
    const t = await theirs(csvOf(check({ sid: 'q-1', sample: true, done: 5, elapsedS: 120 })), 'q.csv');
    expect([s.summary.itemsInFile, s.summary.done, s.summary.given, t.done, t.given]).toEqual([9, 5, 8, 5, 8]);
    // A practice file still counts everything done, Letter Trace included.
    expect((await one(csvOf(practice({ sid: 'q-2', activities: ['isolation', 'letter_tracing'] })))).summary.done).toBe(2);
  });
  it('the top link names the makers and leads to all of them', () => {
    const link = new JSDOM(read('packets-results.html')).window.document.querySelector('.top-link');
    expect([link.textContent, link.getAttribute('href')]).toEqual(['Make Word Sounds, math or vocabulary files', 'packets.html']);
  });
  it('Class Analytics names its files with the local date, not the UTC one', () => {
    const named = analytics.split('\n').filter((line) => /\.download = /.test(line));
    expect(named.filter((line) => /toISOString/.test(line))).toEqual([]);
    expect(named.filter((line) => line.includes('_acLocalDate(new Date())'))).toHaveLength(9);
    // 23:30 on the 13th is the 13th here, whatever UTC says.
    expect(AC.localDate(new Date(2026, 10, 13, 23, 30))).toBe('2026-11-13');
  });
  it('the 50 screening records kept with a student: the ones a teacher gave first, then the newest from home, in their order', () => {
    const r = (n, home) => ({ type: 'missing_number', correct: n, date: new Date(2026, 0, 1 + n).toISOString(), ...(home ? { home: true, source: 'take_home_file' } : {}) });
    const many = [...Array(30).keys()].map((n) => r(n, false)).concat([...Array(40).keys()].map((n) => r(100 + n, true)));
    const kept = AC.persistable({ name: 'Ana', screeningHistory: many }).screeningHistory;
    expect([kept.length, kept.filter((x) => !x.home).length, kept.filter((x) => x.home).length]).toEqual([50, 30, 20]);
    expect(kept.filter((x) => x.home).map((x) => x.correct)).toEqual([...Array(20).keys()].map((n) => 120 + n));
    // Before, home results pushed the oldest supervised ones out: the last 50 of all 70 held only 10 of the 30.
    expect(many.slice(-50).filter((x) => !x.home)).toHaveLength(10);
    const sixty = [...Array(60).keys()].map((n) => r(n, false)).concat([r(200, true)]);
    expect(AC.kept(sixty).map((x) => x.correct)).toEqual([...Array(50).keys()].map((n) => n + 10));
    const few = [r(1, true), r(2, false)];
    expect(AC.kept(few)).toEqual(few);
    expect(AC.kept(null)).toEqual([]);
  });
  it('the two flags a check writes from today read in plain words, and time_up_away has no score', async () => {
    const away = await one(csvOf(check({ sid: 'f-1', done: 5, elapsedS: 120, completion: 'time', flags: ['time_up_away'] })), 'away.csv');
    expect([away.score.completion, away.score.noScore, away.value, away.flags]).toEqual(['time_up_away', 'time_up_away', null, ['time_up_away']]);
    const tabs = await one(csvOf(check({ sid: 'f-2', flags: ['two_tabs'] })), 'tabs.csv');
    expect([tabs.value, tabs.flags]).toEqual([8, ['two_tabs', 'finished_early']]);
    const page = openPage();
    await page.drop([page.file(csvOf(check({ sid: 'f-1', done: 5, elapsedS: 120, completion: 'time', flags: ['time_up_away'] })), 'away.csv'), page.file(csvOf(check({ sid: 'f-2', day: '2026-11-18', flags: ['two_tabs'] })), 'tabs.csv')]);
    page.$('show-results').click();
    page.learner('BlueHeron7');
    expect(page.table(page.every()).map((row) => row[5])).toEqual(['The time ran out while the page was hidden or closed, so there is no score',
      'The check was open in two tabs or windows while it ran; finished before the time was up, so the score is for the time used']);
    // Both readers agree.
    expect((await theirs(csvOf(check({ sid: 'f-1', done: 5, elapsedS: 120, completion: 'time', flags: ['time_up_away'] })))).check).toMatchObject({ noScore: 'time_up_away', completion: 'time_up_away', score: null });
  });
});
