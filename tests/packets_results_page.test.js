import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { core } from './helpers/word_sounds_core.js';

// "Add up results" (packets-results.html): the page that reads the results files students hand back.
// Part 1 runs the reader (packets_results_reader.js) on files made by the real writer, the take-home
// loader's packetCsv, and on the real samples in tests/fixtures/packets_results.
// Part 2 runs the reader and the dashboard's importer on the same files and compares every field both produce.
// Part 3 reads the new files as text. Part 4 runs the page in jsdom.
const require = createRequire(import.meta.url);
const reader = require('../packets_results_reader.js');
const checks = require('../packet_check_builder.js');
const read = (file) => readFileSync(file, 'utf8');
const lender = { crypto: webcrypto };
lender.window = lender;
new Function('window', read('word_sounds_take_home_loader.js')).call(lender, lender);
const loader = lender.AlloWordSoundsTakeHome;

const PAGE = 'packets-results.html';
const SCRIPTS = ['packets_results_reader.js', 'packets-results.js'];
const NEW_FILES = [PAGE, ...SCRIPTS, 'packets-results.css'];
const NAME = 'AlloFlow Packets';
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
const PROOF_LINE = 'This page runs without AI. No account. Your files are read in this browser and are not uploaded.';
const HONEST = 'This compares learners in these files with each other. It is not a published benchmark. Compare only results gathered the same way.';
const STORE_KEY = 'alloflow-packets-results/1';
const SAMPLES = 'tests/fixtures/packets_results/';
const BOM = String.fromCharCode(0xFEFF);
// British spellings and usages that must not reach a US teacher (the list tests/packets_site_pages.test.js uses).
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
// Words that would turn a description into a judgment, or claim a published comparison.
const JUDGING = /at grade level|at[- ]risk|\bnormal\b|below benchmark|\bnorms?\b|\bnormed\b|\bnational(?:ly)?\b|percentile|\bproficien|\bdeficit|\bfailing\b/i;

// ---------------------------------------------------------------------------
// Fixtures: result objects in the shape the practice file builds, written out by its own writer
// ---------------------------------------------------------------------------
const TITLES = { isolation: 'Find Sounds', blending: 'Blend Sounds', missing_letter: 'Missing Letter', letter_tracing: 'Letter Trace' };
const fnv = (text) => { let h = 2166136261 >>> 0; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
// The learner's wall clock, five hours behind UTC.
const wall = (day, time, plus = 0) => new Date(Date.parse(day + 'T' + time + 'Z') + plus * 1000).toISOString().slice(0, 19) + '-05:00';
const utc = (local) => (local ? new Date(Date.parse(local)).toISOString() : '');
// One answer: the picks in order. The last pick is right unless the answer was missed.
const pick = (activity, word, target, picks, missed = false) => ({ activity, word, target, picks, missed });
const USUAL = [pick('isolation', 'cat', 'k', ['k']), pick('isolation', 'dog', 'o', ['d', 'o']), pick('isolation', 'bed', 'd', ['b', 'e'], true), pick('blending', 'cup', 'cup', ['cup']), pick('missing_letter', 'pig', 'i', ['i'])];
function practice(over = {}) {
  const o = { sid: 'b3f1c2f0-7a55-4d0e-9c0b-0d0f6d1e52aa', learner: 'BlueHeron7', day: '2026-11-03', time: '16:00:05', seconds: 300, packetId: 'ws-short-vowels', version: 'r91b7d204',
    title: 'Short vowels', answers: USUAL, dated: true, ...over };
  const counts = {};
  const startedLocal = o.dated ? wall(o.day, o.time) : '', finishedLocal = o.dated ? wall(o.day, o.time, o.seconds) : '';
  return { kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2', sessionId: o.sid,
    packet: { id: o.packetId, version: o.version, engine: 'alloflow-packet/1', form: '', mode: 'practice' }, lessonId: o.packetId, revision: o.version, lessonTitle: o.title, activityTitles: TITLES,
    learner: o.learner, learnerName: o.learner, startedAt: utc(startedLocal), finishedAt: utc(finishedLocal), startedLocal, finishedLocal, durationMs: o.seconds * 1000, timesAreFromTheLearnerDevice: true,
    items: o.answers.map((a, i) => {
      const k = counts[a.activity] = (counts[a.activity] || 0) + 1;
      return { n: i + 1, itemId: a.activity + '-' + (k - 1), activity: a.activity, word: a.word, target: a.target, responses: a.picks, attempts: a.picks.length, firstTry: a.picks.length === 1 && !a.missed,
        correct: !a.missed, done: true, ms: 2400, supports: { wordReplays: 1 }, practice: a.activity === 'letter_tracing' ? 'traced' : null, flag: '' };
    }) };
}
// A math check of eight problems, scored by the check's own adapter and checkScore. Digits possible: 2 1 2 1 2 1 2 2.
const PROBLEMS = [[7, '+', 8], [12, '-', 5], [9, '+', 6], [15, '-', 7], [8, '+', 8], [14, '-', 6], [23, '+', 14], [36, '-', 12]];
function check(over = {}) {
  const o = { sid: 'c7d2a9e4-1b60-4f3a-8e55-9a0c1d2e3f40', learner: 'BlueHeron7', day: '2026-11-17', time: '09:12:05', form: 'A', packetId: 'math-computation-g2', version: 'r5a3c2e10',
    title: 'Math Fluency check (2A)', done: 8, wrong: {}, elapsedS: 96, hiddenS: 0, flags: [], attempt: 1, completion: '', ...over };
  const adapter = loader.CHECK_ADAPTERS.math_computation;
  const completion = o.completion || (o.done < PROBLEMS.length ? 'time' : 'complete');
  const rows = [];
  const items = PROBLEMS.map(([a, op, b], i) => {
    const right = String(op === '+' ? a + b : a - b), attempted = i < o.done;
    const typed = attempted ? String(o.wrong[i] != null ? o.wrong[i] : right) : null;
    const mark = attempted ? adapter.score({}, right, typed) : null;
    const item = { n: i + 1, itemId: 'math_computation-' + i, activity: 'math_computation', word: a + ' ' + op + ' ' + b, target: right, responses: attempted ? [typed] : [], attempts: attempted ? 1 : 0,
      firstTry: !!(mark && mark.correct), correct: !!(mark && mark.correct), done: attempted, ms: attempted ? Math.floor(o.elapsedS * 1000 / o.done) : 0, supports: {}, practice: null, flag: '',
      digitsCorrect: attempted ? mark.digitsCorrect : null, digitsPossible: attempted ? mark.digitsPossible : null };
    rows.push({ practice: false, attempted, correct: item.correct, digitsCorrect: item.digitsCorrect, digitsPossible: item.digitsPossible });
    return item;
  });
  const startedLocal = wall(o.day, o.time), finishedLocal = wall(o.day, o.time, o.elapsedS + 12);
  const out = { kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2', sessionId: o.sid,
    packet: { id: o.packetId, version: o.version, engine: 'alloflow-packet/1', form: o.form, mode: 'probe' }, lessonId: o.packetId, revision: o.version, lessonTitle: o.title,
    activityTitles: { math_computation: 'Math Fluency' }, learner: o.learner, learnerName: o.learner, startedAt: utc(startedLocal), finishedAt: utc(finishedLocal), startedLocal, finishedLocal,
    durationMs: (o.elapsedS + 12) * 1000, timesAreFromTheLearnerDevice: true, items };
  out.score = loader.checkScore({ measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: 120, scoringVersion: 3, formVersion: 2 }, rows,
    { elapsedMs: o.elapsedS * 1000, hiddenMs: o.hiddenS * 1000, completion, attempt: o.attempt, flags: o.flags });
  return out;
}
const seal = (result, method) => { const table = loader.resultsCsv(result); return { table, integrity: method === 'none' ? null : { method, value: method === 'fnv1a' ? fnv(table.basis) : loader.sha256(table.basis).hex } }; };
const csvOf = (result, method = 'sha256') => { const { table, integrity } = seal(result, method); return table.text(integrity); };
const jsonOf = (result, method = 'sha256') => {
  const { integrity } = seal(result, method);
  return JSON.stringify({ ...result, ...(integrity ? { integrity: { ...integrity, note: 'detects accidental edits, not deliberate ones' } } : {}) });
};
const nameOf = (result, ext = 'csv') => loader.resultsCsv(result).stem + '.' + ext;
// The cells of a file as saved (every cell quoted, no cell in these fixtures holds the three characters ","), and a spreadsheet's re-save of them.
const cellsOf = (csv) => csv.slice(1, -2).split('\r\n').map((line) => line.slice(1, -1).split('","').map((cell) => cell.replace(/""/g, '"')));
const resave = (rows, separator, lineEnd = '\n') => rows.map((row) => row.map((cell) => (cell.includes(separator) || /["\r\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell)).join(separator)).join(lineEnd) + lineEnd;
const LAST_CHANGED = new Date(2026, 10, 20, 8).getTime();
const one = async (text, name = 'results.csv', lastModified = LAST_CHANGED) => {
  const got = await reader.read(text, { name, lastModified });
  expect(got.why, name).toBe('');
  expect(got.sessions, name).toHaveLength(1);
  return got.sessions[0];
};
const refused = async (text, name = 'file.csv') => { const got = await reader.read(text, { name, lastModified: LAST_CHANGED }); expect(got.ok, name).toBe(false); expect(got.sessions).toEqual([]); return got; };

// ---------------------------------------------------------------------------
// Part 1: the reader
// ---------------------------------------------------------------------------
describe('the reader: a practice results file', () => {
  it('reads the file as it is saved: BOM, CRLF, every cell quoted', async () => {
    const result = practice();
    const text = csvOf(result);
    expect(text.charCodeAt(0)).toBe(0xFEFF);
    expect(text.split('\r\n')).toHaveLength(9);
    const s = await one(text, nameOf(result));
    expect([s.sessionId, s.learner, s.packetId, s.packetVersion, s.title, s.mode, s.form, s.measure, s.source, s.sourceFile])
      .toEqual(['b3f1c2f0-7a55-4d0e-9c0b-0d0f6d1e52aa', 'BlueHeron7', 'ws-short-vowels', 'r91b7d204', 'ws-short-vowels', 'practice', '', 'practice', 'csv', 'Short-vowels__BlueHeron7__2026-11-03.csv']);
    expect([s.startedLocal, s.finishedLocal, s.date, s.dateFromFile, s.durationS]).toEqual(['2026-11-03T16:00:05-05:00', '2026-11-03T16:05:05-05:00', '2026-11-03', false, 300]);
    expect(s.summary).toEqual({ itemsInFile: 5, done: 5, given: 5, attempted: 5, correct: 4, firstTry: 3, accuracyPct: 80, firstTryPct: 60 });
    expect(s.byActivity).toEqual([
      { activity: 'isolation', name: 'Find Sounds', strand: 'hearing_sounds', items: 3, graded: 3, correct: 2, firstTry: 1 },
      { activity: 'blending', name: 'Blend Sounds', strand: 'hearing_sounds', items: 1, graded: 1, correct: 1, firstTry: 1 },
      { activity: 'missing_letter', name: 'Missing Letter', strand: 'spelling', items: 1, graded: 1, correct: 1, firstTry: 1 }]);
    expect(s.byStrand).toEqual([
      { strand: 'hearing_sounds', name: 'Hearing sounds', graded: 4, correct: 3, firstTry: 2, firstTryPct: 50 },
      { strand: 'spelling', name: 'Spelling', graded: 1, correct: 1, firstTry: 1, firstTryPct: 100 }]);
    expect(s.wrong).toEqual([{ word: 'dog', answer: 'd', times: 1 }, { word: 'bed', answer: 'b', times: 1 }, { word: 'bed', answer: 'e', times: 1 }]);
    expect(s.items[1]).toEqual({ n: 2, itemId: 'isolation-1', activity: 'isolation', activityTitle: 'Find Sounds', word: 'dog', target: 'o', responses: ['d', 'o'], correct: true, firstTry: false, tries: 2,
      practice: false, attempted: true, timeMs: 2400, supports: 'wordReplays:1', flag: '', digitsCorrect: null, digitsPossible: null });
    expect([s.value, s.unitName, s.score, s.attempt, s.integrity, s.flags]).toEqual([60, 'first-try percent', null, null, 'ok', []]);
  });

  it('reads the JSON of the same piece of work to the same result', async () => {
    const result = practice();
    const fromCsv = await one(csvOf(result), 'a.csv'), fromJson = await one(jsonOf(result), 'a.json');
    expect(fromJson.title).toBe('Short vowels');
    expect({ ...fromJson, title: '', source: '', sourceFile: '' }).toEqual({ ...fromCsv, title: '', source: '', sourceFile: '' });
    expect(fromJson.integrity).toBe('ok');
    // A class mailbox copy wraps the same result.
    const wrapped = await one(JSON.stringify({ kind: 'alloflow-take-home-submission', schemaVersion: 1, takeHomeResult: JSON.parse(jsonOf(result)) }), 'sent.json');
    expect(wrapped.sessionId).toBe(fromCsv.sessionId);
  });

  it('reads a spreadsheet re-save: LF, ; or tab between cells, quotes dropped, a sep= line, columns moved, columns added, rows it does not know', async () => {
    const result = practice();
    const rows = cellsOf(csvOf(result));
    const usual = await one(csvOf(result));
    const same = (s) => expect([s.summary, s.byStrand, s.wrong, s.integrity, s.date]).toEqual([usual.summary, usual.byStrand, usual.wrong, 'ok', usual.date]);
    same(await one(resave(rows, ',')));
    same(await one(resave(rows, ';')));
    same(await one(resave(rows, '\t')));
    same(await one('sep=;\r\n' + resave(rows, ';', '\r\n')));
    same(await one(BOM + resave(rows, ';')));
    // Columns found by name, in any order, with one this version does not know.
    const order = rows[0].map((_, i) => i).reverse();
    const moved = rows.map((row, r) => (row[0].startsWith('#') ? row : order.map((i) => row[i]).concat(r ? 'seen' : 'teacher_note')));
    same(await one(resave(moved, ',')));
    // Rows that start with # and are not known are skipped, wherever they are.
    const more = rows.slice(0, 3).concat([['#future', 'x=1', 'y=2']], rows.slice(3), [['#another row', '']]);
    same(await one(resave(more, ',')));
    // The header row deleted: the columns are in the saved order.
    same(await one(resave(rows.slice(1), ',')));
  });

  it('reads quoted cells that hold commas, line breaks and doubled quotes', async () => {
    expect(reader.parseCsv('a,"b, c","d\ne","say ""hi"""\n1,2,3,4\n')).toEqual([['a', 'b, c', 'd\ne', 'say "hi"'], ['1', '2', '3', '4']]);
    expect(reader.parseCsv(BOM + '"x","y"\r\n"1",""\r\n\r\n')).toEqual([['x', 'y'], ['1', '']]);
    expect(reader.parseCsv('sep=;\r\na;b\r\n"1;2";3\r\n')).toEqual([['a', 'b'], ['1;2', '3']]);
    expect(reader.parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(reader.parseCsv('')).toEqual([]);
    const s = await one(csvOf(practice({ learner: 'Heron, "Blue"\n7', answers: [pick('blending', 'a,b', 'a,b', ['x "y"', 'a,b'])] })));
    expect(s.learner).toBe('Heron, "Blue" 7');
    expect(s.wrong).toEqual([{ word: 'a,b', answer: 'x "y"', times: 1 }]);
    expect(s.integrity).toBe('ok');
  });

  it('takes the leading apostrophe off cells that were guarded against formulas', async () => {
    const result = practice({ learner: '=SUM(A1)', answers: [pick('blending', '-tion', '-tion', ['+ing', '-tion']), pick('blending', '@home', '@home', ['@home'])] });
    const text = csvOf(result);
    expect(text).toContain('"\'=SUM(A1)"');
    expect(text).toContain('"\'-tion"');
    const s = await one(text);
    expect(s.learner).toBe('=SUM(A1)');
    expect(s.items.map((it) => it.word)).toEqual(['-tion', '@home']);
    expect(s.wrong).toEqual([{ word: '-tion', answer: '+ing', times: 1 }]);
    expect(s.integrity).toBe('ok');
    expect((await one(jsonOf(result), 'a.json')).integrity).toBe('ok');
  });

  it('counts Letter Trace and unscored items as done, never as graded', async () => {
    const s = await one(csvOf(practice({ answers: [pick('letter_tracing', 'cat', 'c', ['traced']), pick('isolation', 'cat', 'k', ['k'])] })));
    expect(s.summary).toEqual({ itemsInFile: 2, done: 2, given: 1, attempted: 1, correct: 1, firstTry: 1, accuracyPct: 100, firstTryPct: 100 });
    expect(s.byActivity.map((a) => [a.activity, a.items, a.graded])).toEqual([['letter_tracing', 1, 0], ['isolation', 1, 1]]);
    expect(s.byStrand.map((row) => row.strand)).toEqual(['hearing_sounds']);
  });

  it('files an activity it does not know under "Other activities", with the name the file gives it', async () => {
    const rows = cellsOf(csvOf(practice({ answers: [pick('blending', 'cup', 'cup', ['cup'])] })));
    const at = (name) => rows[0].indexOf(name);
    rows[1][at('activity')] = 'new_game';
    rows[1][at('activity_title')] = 'New Game';
    const s = await one(resave(rows, ','));
    expect(s.byActivity).toEqual([{ activity: 'new_game', name: 'New Game', strand: 'other', items: 1, graded: 1, correct: 1, firstTry: 1 }]);
    expect(s.byStrand).toEqual([{ strand: 'other', name: 'Other activities', graded: 1, correct: 1, firstTry: 1, firstTryPct: 100 }]);
    expect(s.integrity).toBe('changed');
  });
});

describe('the reader: the check value of a file', () => {
  it('says ok for an untouched file, with either kind of value, in CSV and in JSON', async () => {
    for (const make of [practice, check]) {
      for (const method of ['sha256', 'fnv1a']) {
        expect((await one(csvOf(make(), method))).integrity, method).toBe('ok');
        expect((await one(jsonOf(make(), method), 'a.json')).integrity, method).toBe('ok');
      }
    }
  });

  it('says changed when an answer was edited, and still reads the file', async () => {
    const text = csvOf(practice());
    const edited = text.replace('"d | o","1","0","2"', '"o","1","1","1"');
    expect(edited).not.toBe(text);
    const s = await one(edited);
    expect(s.integrity).toBe('changed');
    expect(s.flags).toEqual(['file_changed']);
    expect(s.summary.firstTry).toBe(4);
    const json = JSON.parse(jsonOf(practice()));
    json.items[2].correct = true;
    expect((await one(JSON.stringify(json), 'a.json')).integrity).toBe('changed');
  });

  it('covers the two digit cells of a check', async () => {
    const text = csvOf(check({ wrong: { 3: 9 } }));
    const row = text.split('\r\n')[4];
    expect(row.endsWith('"","","0","1"')).toBe(true);
    const edited = text.replace(row, row.slice(0, -'"0","1"'.length) + '"1","1"');
    const s = await one(edited);
    expect(s.integrity).toBe('changed');
    expect(s.flags).toContain('file_changed');
    const json = JSON.parse(jsonOf(check({ wrong: { 3: 9 } })));
    json.items[3].digitsCorrect = 1;
    expect((await one(JSON.stringify(json), 'a.json')).integrity).toBe('changed');
  });

  it('says absent when the file has no value, and unchecked when it cannot make one', async () => {
    const none = await one(csvOf(practice(), 'none'));
    expect([none.integrity, none.flags]).toEqual(['absent', ['no_check_value']]);
    expect((await one(csvOf(practice()).split('\r\n').filter((line) => !line.startsWith('"#integrity"')).join('\r\n'))).integrity).toBe('absent');
    expect((await one(jsonOf(practice(), 'none'), 'a.json')).integrity).toBe('absent');
    const other = await one(csvOf(practice()).replace('"#integrity","sha256"', '"#integrity","sha512"'));
    expect([other.integrity, other.flags]).toEqual(['unchecked', ['not_checked']]);
    // A value is never a reason to refuse a file.
    expect(other.summary.done).toBe(5);
  });

  it('makes the same short hash as the practice file does', () => {
    expect(reader.fnv1a('')).toBe('811c9dc5');
    expect(reader.fnv1a('a|b|c\n"x"')).toBe(fnv('a|b|c\n"x"'));
  });
});

describe('the reader: a check', () => {
  it('reads the score block, and counts the score again from the answers', async () => {
    const result = check({ wrong: { 3: 9 }, hiddenS: 14, flags: ['left_the_page'], attempt: 2 });
    expect(result.score.score).toBe(8);
    const s = await one(csvOf(result), nameOf(result));
    expect([s.mode, s.form, s.measure, s.measureName, s.unit, s.unitName, s.value, s.attempt]).toEqual(['probe', 'A', 'math_dcpm', 'Math Fluency', 'digits_correct_per_minute', 'digits correct per minute', 8, 2]);
    expect(s.score).toEqual({ measure: 'math_dcpm', score: 8, stated: 8, unit: 'digits_correct_per_minute', digitsCorrect: 12, digitsPossible: 13, itemsCorrect: 7, itemsAttempted: 8, timeLimitS: 120,
      elapsedS: 96, hiddenS: 14, completion: 'complete', prorated: true, noScore: '', recounted: false, scoringVersion: 3, formVersion: '2', attempt: 2, flags: ['left_the_page'] });
    expect(s.flags).toEqual(['left_the_page', 'finished_early']);
    expect(s.summary).toEqual({ itemsInFile: 8, done: 8, given: 8, attempted: 8, correct: 7, firstTry: 7, accuracyPct: 88, firstTryPct: 88 });
    expect(s.items[3]).toMatchObject({ word: '15 - 7', target: '8', responses: ['9'], correct: false, digitsCorrect: 0, digitsPossible: 1 });
    const fromJson = await one(jsonOf(result), 'a.json');
    expect(fromJson.score).toEqual(s.score);
    expect([fromJson.value, fromJson.summary, fromJson.flags, fromJson.integrity]).toEqual([s.value, s.summary, s.flags, 'ok']);
  });

  it('when the time ran out, counts what was reached', async () => {
    const result = check({ done: 6, elapsedS: 120 });
    const s = await one(csvOf(result));
    expect([s.score.completion, s.score.score, s.score.prorated, s.score.digitsCorrect, s.summary.given, s.summary.attempted, s.flags]).toEqual(['time', 5, false, 9, 8, 6, []]);
    expect(s.value).toBe(result.score.score);
  });

  it('a check that was stopped early, or done in under 20 seconds, has no score and says why', async () => {
    const stopped = await one(csvOf(check({ done: 3, elapsedS: 40, completion: 'ended_early' })));
    expect([stopped.value, stopped.score.noScore, stopped.flags]).toEqual([null, 'stopped_early', ['stopped_early']]);
    const fast = await one(csvOf(check({ elapsedS: 12 })));
    expect([fast.value, fast.score.noScore, fast.flags]).toEqual([null, 'too_fast', ['too_fast']]);
  });

  it('shows the score the answers give when the score line was edited, and says so', async () => {
    const text = csvOf(check({ wrong: { 3: 9 } }));
    expect(text).toContain('"score=8"');
    const s = await one(text.replace('"score=8"', '"score=38"'));
    expect([s.value, s.score.stated, s.score.recounted, s.integrity]).toEqual([8, 38, true, 'ok']);
    expect(s.flags).toEqual(['finished_early', 'score_differs']);
    const noLine = await one(text.split('\r\n').filter((line) => !line.startsWith('"#score"')).join('\r\n'));
    expect([noLine.value, noLine.measure, noLine.score.noScore, noLine.flags, noLine.integrity]).toEqual([null, 'math_dcpm', 'no_score_line', ['no_score_line'], 'ok']);
  });

  it('keeps the number a file states for a unit it does not know', async () => {
    const text = csvOf(check()).replace('"measure=math_dcpm"', '"measure=words_read"').replace('"score_unit=digits_correct_per_minute"', '"score_unit=words_correct_per_minute"').replace(/"score=\d+"/, '"score=41"');
    const s = await one(text);
    expect([s.measure, s.measureName, s.unit, s.unitName, s.value, s.score.recounted]).toEqual(['words_read', 'Math Fluency', 'words_correct_per_minute', 'words correct per minute', 41, false]);
  });

  it('names a fixed form by its grade and a teacher\'s own set by its title', async () => {
    const fixed = await one(csvOf(check()), 'Math-Fluency-check-2A__BlueHeron7__2026-11-17.csv');
    const own = check({ packetId: 'math-custom-291e3aa6', form: 'custom', title: 'Facts to 20', sid: 'own-1' });
    const ownCsv = await one(csvOf(own), nameOf(own)), ownJson = await one(jsonOf(own), 'x.json');
    expect([fixed.title, ownCsv.title, ownJson.title]).toEqual(['math-computation-g2', 'Facts to 20', 'Facts to 20']);
    const model = reader.addUp([fixed, ownCsv], {});
    expect(model.checks.map((row) => [row.label, row.unitName, row.forms])).toEqual([['Math Fluency (grade 2)', 'digits correct per minute', ['A']], ['Math Fluency (Facts to 20)', 'digits correct per minute', ['custom']]]);
    // The grade is read from the packet id the check builder gives a fixed form.
    const bank = JSON.parse(read('psychometric_math_probes.json'));
    expect(checks.lessonFromMathForm({ bank, measure: 'math_computation', grade: '3', form: 'A' }).lessonId).toBe('math-computation-g3');
    expect(checks.lessonFromMathForm({ bank, measure: 'quantity_discrimination', grade: 'K', form: 'A' }).lessonId).toBe('quantity-discrimination-gk');
  });
});

describe('the reader: the date of record', () => {
  it('is the finish date on the learner\'s own clock, whatever time zone reads it', async () => {
    const late = await one(csvOf(practice({ time: '23:30:05', seconds: 60 })));
    expect([late.date, late.dateFromFile]).toEqual(['2026-11-03', false]);
    const overMidnight = await one(csvOf(practice({ time: '23:58:00', seconds: 300 })));
    expect(overMidnight.date).toBe('2026-11-04');
    expect(new Date(overMidnight.start).getHours()).toBe(0);
  });

  it('falls back to the start, then to the file\'s own date, and says when it did', async () => {
    const rows = cellsOf(csvOf(practice()));
    const at = rows[0].indexOf('finished_local');
    rows.forEach((row, r) => { if (r && !row[0].startsWith('#')) row[at] = ''; });
    const started = await one(resave(rows, ','));
    expect([started.date, started.dateFromFile]).toEqual(['2026-11-03', false]);
    const undated = await one(csvOf(practice({ dated: false })));
    expect([undated.date, undated.dateFromFile, undated.start, undated.flags]).toEqual(['2026-11-20', true, LAST_CHANGED, ['date_from_file']]);
    const nothing = await reader.read(csvOf(practice({ dated: false })), { name: 'x.csv' });
    expect([nothing.sessions[0].date, nothing.sessions[0].start, nothing.sessions[0].flags]).toEqual(['', 0, ['no_date']]);
    expect(reader.stamp('2026-02-30T10:00:00-05:00')).toBe(0);
    expect(reader.stamp('1999-01-01')).toBe(0);
  });
});

describe('the reader: files that are not results files', () => {
  it('gives each a plain reason, and never throws', async () => {
    const cases = [
      ['', 'empty'], ['   \r\n  ', 'empty'], ['<!doctype html><html><body>practice file</body></html>', 'web_page'],
      ['name,score\nAda,3\n', 'not_results'], ['just some words', 'not_results'], ['{"hello":1}', 'not_results'], ['[1,2,3]', 'not_results'], ['{not json', 'not_results'],
      [JSON.stringify({ studentNickname: 'Ada', wordSoundsState: {} }), 'save_file'],
      [JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 4, items: [] }), 'newer'],
      [JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 3 }), 'no_items'],
      [csvOf(practice()).replace(/alloflow-packet-result\/1/g, 'alloflow-packet-result/2'), 'newer'],
      [csvOf(practice()).split('\r\n').filter((line, i) => !i || line.startsWith('"#')).join('\r\n'), 'no_items'],
      [JSON.stringify({ ...practice(), items: practice().items.map((it) => ({ ...it, responses: [], attempts: 0, correct: false, firstTry: false, done: false })) }), 'nothing_done'],
      [JSON.stringify({ kind: 'alloflow-packet-results-bundle', version: 2, sessions: [] }), 'newer'],
    ];
    for (const [text, reason] of cases) {
      const got = await refused(text, 'case-' + reason);
      expect(got.reason, text.slice(0, 40)).toBe(reason);
      expect(got.why, reason).toBe(reader.REASONS[reason]);
      expect(got.why, reason).toMatch(/^[A-Z][^<>{}]+\.$/);
    }
    for (const value of [null, undefined, 5, {}, []]) expect((await reader.read(value, {})).reason).toBe('unreadable');
    expect((await reader.read('x')).name).toBe('file');
    expect(Object.keys(reader.REASONS).sort()).toEqual(['empty', 'newer', 'no_items', 'not_results', 'nothing_done', 'save_file', 'too_big', 'unreadable', 'web_page']);
  });

  it('refuses a 5 MB file by its size, without reading into it', async () => {
    const big = csvOf(practice()) + 'x'.repeat(5 * 1024 * 1024);
    const began = Date.now();
    const got = await refused(big, 'big.csv');
    expect([got.reason, got.why]).toEqual(['too_big', 'This file is larger than 2 MB. A results file is much smaller.']);
    expect(Date.now() - began).toBeLessThan(500);
    expect([reader.MAX_BYTES, reader.MAX_FILES]).toEqual([2 * 1024 * 1024, 500]);
  });
});

describe('the reader: hostile files', () => {
  it('keeps markup as text and names every object has as plain text', async () => {
    const result = practice({ learner: '<img src=x onerror=alert(1)>', title: '<script>alert(2)</script>', answers: [pick('__proto__', 'constructor', 'toString', ['__proto__', 'toString']), pick('constructor', '<b>x</b>', 'y', ['y'])] });
    const s = await one(csvOf(result), '<svg onload=alert(3)>.csv');
    expect(s.learner).toBe('<img src=x onerror=alert(1)>');
    expect(s.sourceFile).toBe('<svg onload=alert(3)>.csv');
    expect(s.byActivity.map((a) => [a.activity, a.strand])).toEqual([['proto', 'other'], ['unknown', 'other']]);
    expect(s.wrong).toEqual([{ word: 'constructor', answer: '__proto__', times: 1 }]);
    expect((await one(jsonOf(result), 'a.json')).title).toBe('<script>alert(2)</script>');
    for (const label of ['__proto__', 'constructor', 'hasOwnProperty', 'toString']) {
      const got = await one(csvOf(practice({ learner: label, sid: label })));
      const model = reader.addUp([got, s], {});
      expect(model.learners.map((row) => row.label).sort()).toEqual([label, '<img src=x onerror=alert(1)>'].sort());
      expect(reader.learnerSeries(model.learners[0], model).length).toBeGreaterThan(0);
    }
    expect(({}).polluted).toBeUndefined();
    expect(Object.keys(Object.prototype)).toEqual([]);
  });

  it('reads trailer rows and JSON that try to reach object internals, and stays whole', async () => {
    const text = csvOf(check()).replace('"flags="', '"flags=__proto__;constructor;left_the_page","__proto__=1","constructor=2","polluted=yes"');
    const s = await one(text);
    expect(s.score.flags).toEqual(['proto', 'left_the_page']);
    const json = '{"kind":"alloflow-take-home-result","schemaVersion":3,"__proto__":{"polluted":1},"sessionId":{"toString":1},"learner":["a"],"packet":{"__proto__":{"mode":"probe"}},'
      + '"items":[{"__proto__":{"correct":true},"activity":{"x":1},"word":["w"],"responses":"abc","attempts":"1e9","supports":{"__proto__":{"a":1}}},null,7,"x"]}';
    const odd = await one(json, 'odd.json');
    expect([odd.learner, odd.mode, odd.summary.done, odd.items[0].tries, odd.items[0].responses, odd.items[0].activity]).toEqual(['', 'practice', 1, 99, [], 'unknown']);
    expect(odd.sessionId).toMatch(/^old-[0-9a-f]{8}$/);
    expect(({}).polluted).toBeUndefined();
    // Very long cells are clipped, and a file with a great many rows is cut off at a limit.
    const long = await one(csvOf(practice({ learner: 'L'.repeat(5000), title: 'T'.repeat(5000), answers: [pick('blending', 'w'.repeat(900), 'w', ['x'.repeat(900), 'w'])] })));
    expect([long.learner.length, long.items[0].word.length, long.wrong[0].answer.length]).toEqual([60, 40, 24]);
    const many = await one(csvOf(practice({ answers: Array.from({ length: 700 }, (_, i) => pick('blending', 'w' + i, 'w' + i, ['w' + i])) })));
    expect([many.items.length, many.summary.done]).toEqual([reader.MAX_ITEMS, reader.MAX_ITEMS]);
  });

  it('writes formula-like text back out guarded', async () => {
    const s = await one(csvOf(practice({ learner: '=HYPERLINK("x")', sid: '+1', packetId: '@pkt' })), '-file.csv');
    const lines = reader.summaryCsv([{ learner: s.learner, session: s }]).split('\r\n');
    expect(lines[1]).toBe('"\'=HYPERLINK(""x"")","2026-11-03","practice","","","","80","60","5","5","300","","\'+1","\'@pkt","r91b7d204","ok","\'-file.csv"');
  });
});

describe('the reader: adding up', () => {
  it('uses the app\'s six skill strands and its activity names', () => {
    expect(reader.STRANDS).toEqual(core.SKILL_STRANDS.map((row) => [row.key, row.name]));
    expect(reader.ACTIVITIES).toEqual(Object.fromEntries(Object.entries(core.ACTIVITY_SKILLS).map(([id, row]) => [id, [row.name, row.strand]])));
    expect(reader.STRANDS).toHaveLength(6);
    expect(reader.COLUMNS).toEqual(loader.resultsCsv(practice()).header);
    expect(reader.COLUMNS.concat(reader.PROBE_COLUMNS)).toEqual(loader.resultsCsv(check()).header);
  });

  it('names the check measures and units as the check files do', () => {
    for (const measure of Object.values(checks.MEASURES)) {
      expect(reader.MEASURES[measure.code], measure.code).toBe(measure.name);
      expect(reader.UNITS[measure.unit], measure.unit).toBe(loader.CHECK_LABELS['check_unit_' + measure.unit]);
      expect(reader.MEASURE_UNITS[measure.code], measure.code).toBe(measure.unit);
    }
    expect(Object.keys(reader.MEASURES).sort()).toEqual(Object.values(checks.MEASURES).map((m) => m.code).sort());
  });

  it('treats labels that differ only in case, spaces and punctuation as one learner, and nothing else', async () => {
    expect(['BlueHeron7', 'blue heron 7', 'Blue-Heron_7!', ' BLUE  HERON 7 '].map(reader.labelKey)).toEqual(['blueheron7', 'blueheron7', 'blueheron7', 'blueheron7']);
    expect(reader.labelKey('Zoë 3')).toBe('zoë3');
    const like = (a, b) => reader.looksAlike(reader.labelKey(a), reader.labelKey(b));
    // Offered as a question: one letter off, a number written another way, a number left off.
    expect([like('BlueHeron7', 'BlueHeren7'), like('BlueHeron7', 'BlueHerno7'), like('BlueHeron7', 'BluHeron7'), like('BlueHeron7', 'BlueHeron07'), like('BlueHeron7', 'Blue Heron')]).toEqual([true, true, true, true, true]);
    // Never offered: another number, another name, a short name, the same name.
    expect([like('BlueHeron7', 'BlueHeron8'), like('BlueHeron7', 'BlueHeron17'), like('RedFox3', 'RedBox3x'), like('Ann', 'Anne'), like('Fox1', 'Box1'), like('', 'a'), like('same', 'same')]).toEqual([false, false, false, false, false, false, false]);
    const sessions = [];
    for (const [learner, sid] of [['BlueHeron7', 'a'], ['blue heron 7', 'b'], ['BlueHeron7', 'c'], ['BlueHeren7', 'd'], ['BlueHeron8', 'e'], ['', 'f']]) sessions.push(await one(csvOf(practice({ learner, sid }))));
    const model = reader.addUp(sessions, {});
    expect(model.learners.map((row) => [row.label, row.count, row.labels])).toEqual([['BlueHeren7', 1, ['BlueHeren7']], ['BlueHeron7', 3, ['BlueHeron7', 'blue heron 7']], ['BlueHeron8', 1, ['BlueHeron8']], [reader.NO_NAME, 1, []]]);
    expect(model.suggestions.map((row) => [row.a.label, row.b.label])).toEqual([['BlueHeren7', 'BlueHeron7']]);
    const merged = reader.addUp(sessions, { merges: { blueheren7: 'blueheron7' } });
    expect(merged.learners.map((row) => [row.label, row.count])).toEqual([['BlueHeron7', 4], ['BlueHeron8', 1], [reader.NO_NAME, 1]]);
    expect(merged.suggestions).toEqual([]);
    expect(reader.addUp(sessions, { apart: { [reader.pairKey('blueheren7', 'blueheron7')]: true } }).suggestions).toEqual([]);
    // A merge that points at itself, or in a circle, does not hang.
    expect(reader.addUp(sessions, { merges: { blueheron7: 'blueheron8', blueheron8: 'blueheron7' } }).count).toBe(6);
  });

  it('finds the middle of a group the way a spreadsheet does', () => {
    expect(reader.middle([12, 8, 16, 5, 9])).toEqual({ n: 5, median: 9, q1: 8, q3: 12, min: 5, max: 16 });
    expect(reader.middle([4, 1, 3, 2])).toEqual({ n: 4, median: 2.5, q1: 1.8, q3: 3.3, min: 1, max: 4 });
    expect(reader.middle([7])).toEqual({ n: 1, median: 7, q1: 7, q3: 7, min: 7, max: 7 });
    expect(reader.middle([3, null, NaN, '4', 5])).toEqual({ n: 2, median: 4, q1: 3.5, q3: 4.5, min: 3, max: 5 });
    expect(reader.middle([])).toBeNull();
  });

  it('gives a middle only for a form that 5 or more learners have a score on, one score for each learner', async () => {
    const sessions = [];
    const scores = { RedFox3: [96, {}], BlueHeron7: [120, { 3: 9 }], GreenTurtle2: [75, {}], GoldFinch5: [110, { 0: 14, 6: 12 }] };
    for (const [learner, [elapsedS, wrong]] of Object.entries(scores)) sessions.push(await one(csvOf(check({ learner, sid: 'm-' + learner, elapsedS, wrong, day: '2026-11-10' }))));
    // A second, later result for one learner replaces the first; a result with no score does not count.
    sessions.push(await one(csvOf(check({ learner: 'RedFox3', sid: 'm-later', elapsedS: 78, day: '2026-11-17' }))));
    sessions.push(await one(csvOf(check({ learner: 'GrayOwl4', sid: 'm-stopped', done: 2, elapsedS: 30, completion: 'ended_early' }))));
    sessions.push(await one(csvOf(check({ learner: 'GrayOwl4', sid: 'm-other-form', form: 'B', elapsedS: 100 }))));
    expect(reader.addUp(sessions, {}).middles).toEqual([]);
    sessions.push(await one(csvOf(check({ learner: 'GrayOwl4', sid: 'm-fifth', elapsedS: 100 }))));
    const model = reader.addUp(sessions, {});
    const values = model.learners.map((row) => row.forms['check\tmath_dcpm\tmath-computation-g2\tA']).sort((a, b) => a - b);
    expect(values).toEqual([5, 6, 8, 10, 10]);
    expect(model.middles).toEqual([{ key: 'check\tmath_dcpm\tmath-computation-g2\tA', seriesKey: 'check\tmath_dcpm\tmath-computation-g2', label: 'Math Fluency (grade 2)', form: 'A',
      unitName: 'digits correct per minute', n: 5, median: 8, q1: 6, q3: 10, min: 5, max: 10 }]);
    expect(reader.MIN_GROUP).toBe(5);
  });

  it('writes the summary with the stated columns, one row for each result, quoted as the results files are', async () => {
    const a = await one(csvOf(practice()), 'p.csv'), b = await one(csvOf(check({ wrong: { 3: 9 }, hiddenS: 14, flags: ['left_the_page'] })), 'c.csv');
    const text = reader.summaryCsv([{ learner: 'BlueHeron7', session: a }, { learner: 'BlueHeron7', session: b }]);
    expect(text.charCodeAt(0)).toBe(0xFEFF);
    expect(text.slice(1).split('\r\n')).toEqual([
      '"learner","date","measure","form","score","score_unit","accuracy_pct","first_try_pct","items_given","items_attempted","duration_s","flags","session_id","packet_id","packet_version","integrity","source_file"',
      '"BlueHeron7","2026-11-03","practice","","","","80","60","5","5","300","","b3f1c2f0-7a55-4d0e-9c0b-0d0f6d1e52aa","ws-short-vowels","r91b7d204","ok","p.csv"',
      '"BlueHeron7","2026-11-17","math_dcpm","A","8","digits_correct_per_minute","88","88","8","8","108","left_the_page;finished_early","c7d2a9e4-1b60-4f3a-8e55-9a0c1d2e3f40","math-computation-g2","r5a3c2e10","ok","c.csv"',
      '']);
  });

  it('saves everything as one file and reads it back the same, trusting nothing in it', async () => {
    const sessions = [await one(csvOf(practice()), 'p.csv'), await one(csvOf(check({ wrong: { 3: 9 } })), 'c.csv')];
    const bundle = reader.makeBundle({ sessions, savedLocal: '2026-11-20T08:00:00-05:00', merges: [{ from: 'blueheren7', into: 'blueheron7' }], apart: [['a', 'b']],
      goals: [{ learner: 'blueheron7', measure: 'strand\thearing_sounds', value: 80 }] });
    expect([bundle.kind, bundle.version]).toEqual(['alloflow-packet-results-bundle', 1]);
    const text = JSON.stringify(bundle);
    const got = await reader.read(text, { name: 'all.json' });
    expect(got.ok && got.sessions).toEqual([]);
    expect(JSON.parse(JSON.stringify(got.bundle.sessions))).toEqual(JSON.parse(JSON.stringify(sessions)));
    expect([got.bundle.merges, got.bundle.apart, got.bundle.goals]).toEqual([[{ from: 'blueheren7', into: 'blueheron7' }], [['a', 'b']], [{ learner: 'blueheron7', measure: 'strand\thearing_sounds', value: 80 }]]);
    // A bundle that was edited by hand: the counts come from its answers, never from its own totals.
    const edited = JSON.parse(text);
    edited.sessions[0].summary.firstTryPct = 100;
    edited.sessions[0].byStrand = [];
    edited.sessions[0].flags = ['<b>'];
    edited.sessions[1].score.score = 99;
    edited.sessions.push(null, 5, { sessionId: 'x' }, { ...edited.sessions[0] }, { sessionId: { a: 1 }, items: [{}] });
    edited.merges.push(null, { from: 'a', into: 'a' }, { from: {}, into: 'b' });
    edited.goals.push({ learner: 'x', measure: 'm', value: '<img>' }, { learner: 'x', measure: 'm', value: -4 });
    const back = reader.readBundle(edited);
    expect(back.sessions.map((s) => [s.sessionId, s.summary.firstTryPct, s.value, s.flags])).toEqual([[sessions[0].sessionId, 60, 60, []], [sessions[1].sessionId, 88, 8, ['finished_early']]]);
    expect([back.merges.length, back.goals.length]).toEqual([1, 1]);
  });
});

describe('the reader: the real sample files', () => {
  const files = readdirSync(SAMPLES).sort();
  it('reads each one, with its check value in order', async () => {
    expect(files).toEqual(['custom-facts-to-20__results.csv', 'math-computation-g3-A_code2468__results.csv', 'missing-number-g1-A__results.csv', 'quantity-discrimination-gK-A__results.csv',
      'sample_results.csv', 'sample_results.json']);
    const got = {};
    for (const file of files) got[file] = await one(read(SAMPLES + file), file);
    const brief = (s) => [s.learner, s.mode, s.form, s.measureName, s.value, s.unitName, s.date, s.summary.given, s.summary.attempted, s.summary.correct, s.attempt, s.integrity, s.flags.join(' ')];
    expect(brief(got['sample_results.csv'])).toEqual(['Blue Heron7', 'practice', '', 'Practice', 50, 'first-try percent', '2026-11-11', 2, 2, 2, null, 'ok', '']);
    expect(brief(got['sample_results.json'])).toEqual(brief(got['sample_results.csv']));
    expect(got['sample_results.json'].sessionId).toBe(got['sample_results.csv'].sessionId);
    expect(brief(got['quantity-discrimination-gK-A__results.csv'])).toEqual(['BlueHeron7', 'probe', 'A', 'Quantity Discrimination', 23, 'items correct', '2026-11-12', 25, 25, 23, 1, 'ok', '']);
    expect(brief(got['missing-number-g1-A__results.csv'])).toEqual(['BlueHeron7', 'probe', 'A', 'Missing Number', 17, 'items correct', '2026-11-12', 25, 19, 17, 1, 'ok', '']);
    expect(brief(got['math-computation-g3-A_code2468__results.csv'])).toEqual(['BlueHeron7', 'probe', 'A', 'Math Fluency', 21, 'digits correct per minute', '2026-11-12', 25, 25, 22, 1, 'ok', 'finished_early']);
    expect(brief(got['custom-facts-to-20__results.csv'])).toEqual(['BlueHeron7', 'probe', 'custom', 'Math Fluency', 15, 'digits correct per minute', '2026-11-12', 8, 8, 7, 1, 'ok', 'finished_early']);
    // The score each file states is the score its answers give.
    for (const s of Object.values(got)) if (s.score) expect([s.score.stated, s.score.recounted], s.sourceFile).toEqual([s.score.score, false]);
    expect(got['math-computation-g3-A_code2468__results.csv'].score).toMatchObject({ digitsCorrect: 35, digitsPossible: 38, itemsCorrect: 22, itemsAttempted: 25, timeLimitS: 120, elapsedS: 100, completion: 'complete', prorated: true });
    // One learner, written two ways in these files: counted as one.
    const model = reader.addUp(Object.values(got).filter((s) => s.sourceFile !== 'sample_results.json'), {});
    expect(model.learners.map((row) => [row.label, row.count, row.labels])).toEqual([['BlueHeron7', 5, ['Blue Heron7', 'BlueHeron7']]]);
    expect(model.checks.map((row) => row.label).sort()).toEqual(['Math Fluency (custom facts to 20)', 'Math Fluency (grade 3)', 'Missing Number (grade 1)', 'Quantity Discrimination (grade K)']);
  });
});

// ---------------------------------------------------------------------------
// Part 2: the same files through the dashboard's importer
// ---------------------------------------------------------------------------
describe('parity with the dashboard importer (student_analytics_module.js)', () => {
  let AC = null;
  beforeAll(() => {
    const analytics = read('student_analytics_module.js');
    const cut = (start, end) => {
      const a = analytics.indexOf(start), b = analytics.indexOf(end, a + start.length);
      if (a < 0 || b < 0) throw new Error('not found in the dashboard module: ' + start);
      return analytics.slice(a, b);
    };
    // The module's own functions, evaluated as they are written (the slice tests/class_analytics_take_home_import.test.js takes).
    AC = new Function(cut('  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') + cut('  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(')
      + '\nreturn {readFile: _acThReadFile, parseCsv: _acThParseCsv, norm: _acThNorm, fnv: _acThFnv1a, stamp: _acThStamp, columns: _AC_TH_COLUMNS, strands: _AC_WS_STRANDS, activities: _AC_WS_ACTIVITIES, cell: _acCsvCell};')();
  });
  const NO_SCORE = { '': '', ended_early: 'stopped_early', untimed: 'no_time_limit', too_fast: 'too_fast', unknown: 'score_unreadable', no_score_line: 'no_score_line' };
  // Every field both readers produce, side by side. Returns the importer's session.
  const both = async (text, name, lastModified = LAST_CHANGED) => {
    const theirs = await AC.readFile(new File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified }));
    const mine = await reader.read(text, { name, lastModified });
    expect(mine.reason, name).toBe(theirs.reason);
    expect(mine.sessions.length, name).toBe(theirs.sessions.length);
    mine.sessions.forEach((s, i) => {
      const t = theirs.sessions[i];
      expect({ id: 'th:' + s.sessionId, learner: s.learner, title: s.title, start: s.start, date: s.date, dateFromFile: s.dateFromFile, given: s.summary.itemsInFile, done: s.summary.done, integrity: s.integrity }, name)
        .toEqual({ id: t.id, learner: t.learner, title: t.title, start: t.start, date: t.date, dateFromFile: t.dateFromFile, given: t.given, done: t.done, integrity: t.integrity });
      if (!t.check) {
        expect(s.mode, name).toBe('practice');
        expect({ firstTryItems: s.summary.attempted, firstTryCorrect: s.summary.firstTry, percent: s.summary.firstTryPct }, name)
          .toEqual({ firstTryItems: t.firstTryItems, firstTryCorrect: t.firstTryCorrect, percent: t.percent });
        const acts = Object.fromEntries(s.byActivity.map((a) => [a.activity, Object.fromEntries(Object.entries({ n: a.items, g: a.graded, f: a.graded, fc: a.firstTry, c: a.correct }).filter(([, n]) => n))]));
        expect(acts, name).toEqual(t.acts);
        expect(Object.fromEntries(s.wrong.map((row) => [row.word + '\t' + row.answer, row.times])), name).toEqual(t.wrong);
        return;
      }
      const c = t.check;
      expect(s.mode, name).toBe('probe');
      expect({ measure: s.score.measure, packetId: s.packetId, form: s.form === 'custom' || /^math-custom-/.test(s.packetId) ? 'custom' : s.form.slice(0, 8).toUpperCase(), given: s.summary.given,
        attempted: s.summary.attempted, correct: s.summary.correct, digitsCorrect: s.score.digitsCorrect, digitsPossible: s.score.digitsPossible, score: s.score.score, unit: s.score.unit,
        noScore: s.score.noScore, prorated: s.score.prorated, completion: s.score.completion, elapsedSeconds: s.score.elapsedS, timeLimitSeconds: s.score.timeLimitS, hiddenSeconds: s.score.hiddenS,
        flags: s.score.flags, attempt: s.score.attempt, recounted: s.score.recounted, stated: s.score.stated, scoringVersion: s.score.scoringVersion, formVersion: Number(s.score.formVersion) || 1 }, name)
        .toEqual({ measure: c.measure, packetId: c.packetId, form: c.form, given: c.given, attempted: c.attempted, correct: c.correct, digitsCorrect: c.digitsCorrect, digitsPossible: c.digitsPossible,
          score: c.score, unit: c.unit, noScore: NO_SCORE[c.noScore], prorated: c.prorated, completion: c.completion, elapsedSeconds: c.elapsedSeconds, timeLimitSeconds: c.timeLimitSeconds,
          hiddenSeconds: c.hiddenSeconds, flags: c.flags, attempt: c.attempt, recounted: c.recounted, stated: c.stated, scoringVersion: c.scoringVersion, formVersion: c.formVersion });
    });
    return { mine, theirs };
  };

  it('the two copies of the tables and helpers are the same', () => {
    expect(reader.COLUMNS).toEqual(AC.columns);
    expect(reader.STRANDS).toEqual(AC.strands);
    expect(reader.ACTIVITIES).toEqual(AC.activities);
    for (const label of ['BlueHeron7', 'blue heron 7', 'Zoë-3', '__proto__', '', 'ÅNGSTRÖM 12']) expect(reader.labelKey(label), label).toBe(AC.norm(label));
    for (const text of ['', 'abc', 'a|b\n"c"']) expect(reader.fnv1a(text)).toBe(AC.fnv(text));
    for (const value of ['2026-11-12T23:30:05-05:00', '2026-11-12', '2026-11-12T21:00:05.000Z', '2026-02-30', 'soon', '1999-01-01', '']) expect(reader.stamp(value), value).toBe(AC.stamp(value));
    for (const value of ['plain', '=1+1', '-x', '+x', '@x', 'say "hi"', 5, -5, null, '']) expect(reader.csvCell(value), String(value)).toBe(AC.cell(value));
    const csv = csvOf(practice({ learner: 'Heron, "Blue"\n7' }));
    for (const text of [csv, resave(cellsOf(csv), ';'), resave(cellsOf(csv), '\t'), 'sep=;\r\na;b\r\n"1;2";3\r\n', '']) expect(reader.parseCsv(text)).toEqual(AC.parseCsv(text));
  });

  it('the real samples read the same', async () => {
    for (const file of readdirSync(SAMPLES).sort()) await both(read(SAMPLES + file), file);
    for (const file of ['take_home_result_schema2_sample.json', 'take_home_result_v2_sample.json']) await both(read('tests/fixtures/' + file), file);
  });

  it('practice files read the same: CSV and JSON, either check value, edited, undated, re-saved', async () => {
    const result = practice();
    for (const method of ['sha256', 'fnv1a', 'none']) {
      await both(csvOf(result, method), 'p-' + method + '.csv');
      await both(jsonOf(result, method), 'p-' + method + '.json');
    }
    await both(csvOf(result).replace('"d | o","1","0","2"', '"o","1","1","1"'), 'edited.csv');
    await both(csvOf(practice({ dated: false })), 'undated.csv');
    await both(jsonOf(practice({ dated: false })), 'undated.json');
    await both(csvOf(practice({ learner: '=SUM(A1)', answers: [pick('blending', '-tion', '-tion', ['+ing', '-tion']), pick('letter_tracing', 'cat', 'c', ['traced'])] })), 'guarded.csv');
    await both(resave(cellsOf(csvOf(result)), ';'), 'semicolons.csv');
    await both(resave(cellsOf(csvOf(result)), '\t'), 'tabs.csv');
    await both(resave(cellsOf(csvOf(result)).slice(1), ','), 'no-header.csv');
    await both(csvOf(practice({ sid: '' })), 'no-session-id.csv');
    await both(JSON.stringify({ kind: 'alloflow-take-home-submission', schemaVersion: 1, takeHomeResult: JSON.parse(jsonOf(result)) }), 'sent.json');
  });

  it('check files read the same: the score, the digits, the flags, a stopped check, an edited score line', async () => {
    const full = check({ wrong: { 3: 9 }, hiddenS: 14, flags: ['left_the_page'], attempt: 2 });
    await both(csvOf(full), nameOf(full));
    await both(jsonOf(full), nameOf(full, 'json'));
    await both(csvOf(check({ done: 6, elapsedS: 120 })), 'time.csv');
    await both(csvOf(check({ done: 3, elapsedS: 40, completion: 'ended_early' })), 'stopped.csv');
    await both(csvOf(check({ elapsedS: 12 })), 'fast.csv');
    await both(csvOf(full).replace('"score=8"', '"score=38"'), 'score-edited.csv');
    await both(csvOf(check()).split('\r\n').filter((line) => !line.startsWith('"#score"')).join('\r\n'), 'no-score-line.csv');
    const own = check({ packetId: 'math-custom-291e3aa6', form: 'custom', title: 'Facts to 20', sid: 'own-1' });
    await both(csvOf(own), nameOf(own));
    await both(jsonOf(own), nameOf(own, 'json'));
    const row = csvOf(full).split('\r\n')[4];
    await both(csvOf(full).replace(row, row.slice(0, -'"0","1"'.length) + '"1","1"'), 'digit-edited.csv');
  });

  it('files that are not results files are refused for the same reason', async () => {
    for (const [text, name] of [['', 'empty.csv'], ['<!doctype html><html></html>', 'page.html'], ['name,score\nAda,3\n', 'other.csv'], ['{"hello":1}', 'other.json'],
      [JSON.stringify({ studentNickname: 'Ada', wordSoundsState: {} }), 'save.json'], [JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 4, items: [] }), 'newer.json'],
      [csvOf(practice()).replace(/alloflow-packet-result\/1/g, 'alloflow-packet-result/2'), 'newer.csv']]) {
      const { mine } = await both(text, name);
      expect(mine.ok, name).toBe(false);
    }
  });

  // Where the two differ on purpose. Each is checked here so that it stays a decision and not an accident.
  it('the intended differences', async () => {
    const result = practice();
    // 1. A column added in a spreadsheet: the reader checks the 24 saved columns (the practice file's rule) and says ok; the importer counts the new column in and says changed.
    const rows = cellsOf(csvOf(result));
    const added = resave(rows.map((row, r) => (row[0].startsWith('#') ? row : row.concat(r ? 'seen' : 'teacher_note'))), ',');
    expect((await reader.read(added, { name: 'a.csv' })).sessions[0].integrity).toBe('ok');
    expect((await AC.readFile(new File([added], 'a.csv'))).sessions[0].integrity).toBe('changed');
    // 2. A check of a kind the dashboard does not keep: the importer refuses it; the reader shows the number the file states.
    const other = csvOf(check()).replace('"measure=math_dcpm"', '"measure=words_read"');
    expect((await AC.readFile(new File([other], 'o.csv'))).reason).toBe('unknown_check');
    expect((await reader.read(other, { name: 'o.csv' })).sessions[0].measure).toBe('words_read');
    // 3. No date in the results and no date on the file: the importer uses the time of the import; the reader leaves the date empty and says so.
    const undated = await reader.read(csvOf(practice({ dated: false })), { name: 'u.csv' });
    expect([undated.sessions[0].date, undated.sessions[0].flags]).toEqual(['', ['no_date']]);
    // 4. The form of a check: the reader keeps the file's text; the importer writes it in capitals, at most 8 characters.
    expect((await reader.read(csvOf(check({ form: 'b' })), { name: 'f.csv' })).sessions[0].form).toBe('b');
    expect((await AC.readFile(new File([csvOf(check({ form: 'b' }))], 'f.csv'))).sessions[0].check.form).toBe('B');
    // 5. For a check the importer blanks the Word Sounds counts (it is a math result there); the reader keeps the answer counts.
    const mine = (await reader.read(csvOf(check()), { name: 'c.csv' })).sessions[0], theirs = (await AC.readFile(new File([csvOf(check())], 'c.csv'))).sessions[0];
    expect([theirs.percent, theirs.acts, mine.summary.firstTryPct]).toEqual([null, {}, 100]);
    // 6. A check that lost its score line: the reader takes the try number from the summary row; the importer says 1.
    const second = csvOf(check({ attempt: 2 })).split('\r\n').filter((line) => !line.startsWith('"#score"')).join('\r\n');
    expect((await reader.read(second, { name: 's.csv' })).sessions[0].attempt).toBe(2);
    expect((await AC.readFile(new File([second], 's.csv'))).sessions[0].check.attempt).toBe(1);
    // 7. Limits: 500 files in one drop here, 200 on the dashboard.
    expect(reader.MAX_FILES).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Part 3: the new files as text
// ---------------------------------------------------------------------------
const parse = () => new JSDOM(read(PAGE)).window.document;

describe('the page as files', () => {
  it('carries the rule that refuses every connection, before anything is loaded', () => {
    const doc = parse();
    const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta.getAttribute('content')).toBe(CSP);
    expect(CSP).toContain("connect-src 'none'");
    expect(CSP).not.toMatch(/unsafe|\*|blob:|https?:/);
    const head = [...doc.head.children];
    expect(head.slice(0, head.indexOf(meta)).every((node) => node.tagName === 'META')).toBe(true);
    expect(doc.querySelector('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
  });

  it('has no inline script, no inline style and no inline handler', () => {
    const doc = parse();
    expect(doc.querySelectorAll('style').length).toBe(0);
    for (const script of doc.querySelectorAll('script')) {
      expect(script.getAttribute('src')).toMatch(/^[\w.-]+\.js$/);
      expect(script.textContent.trim()).toBe('');
    }
    for (const node of doc.querySelectorAll('*')) {
      for (const attribute of node.attributes) {
        expect(/^on|^style$/i.test(attribute.name), node.tagName + ' ' + attribute.name).toBe(false);
        expect(/^\s*javascript:/i.test(attribute.value)).toBe(false);
      }
    }
    expect(read('packets-results.css')).not.toMatch(/@import|url\(|@font-face|expression\(/i);
    // The page script never writes a style attribute or markup: a chart is made of elements and classes.
    for (const file of SCRIPTS) expect(read(file), file).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\.cssText|setAttribute\(\s*'style'/);
  });

  it('calls nothing that could reach a network, and names no web address', () => {
    for (const file of SCRIPTS) {
      expect(read(file), file).not.toMatch(/\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\beval\s*\(|new\s+Function|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker|RTCPeerConnection|indexedDB|\.src\s*=|window\.open|location\s*\.\s*(?:href|assign|replace)|postMessage|importScripts/);
    }
    for (const file of NEW_FILES) expect(read(file).match(/(?:https?:|wss?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [], file).toEqual([]);
    expect(read(PAGE)).not.toMatch(/shared\.css|site\.js|lucide|fonts\.g|unpkg|promo/i);
    // The reader stands alone: no imports, and the page script reaches storage through one key only.
    expect(read('packets_results_reader.js')).not.toMatch(/\brequire\s*\(|^\s*import\s|localStorage|sessionStorage|document\b/m);
    expect(read('packets-results.js').match(/'alloflow-packets-results\/1'/g)).toHaveLength(1);
    expect(read('packets-results.js')).not.toMatch(/sessionStorage/);
    expect(read('packets-results.js').match(/\.(?:setItem|getItem|removeItem)\(([A-Z_a-z]+)/g)).toEqual(['.removeItem(STORE_KEY', '.setItem(STORE_KEY', '.getItem(STORE_KEY']);
  });

  it('refers only to local files that exist, and says exactly which files it loads', () => {
    const doc = parse();
    const loaded = [];
    for (const node of doc.querySelectorAll('[href], [src]')) {
      const address = node.getAttribute('href') || node.getAttribute('src');
      expect(address).toMatch(/^(?:#[\w-]+|\.\/|[\w.-]+(?:#[\w-]+)?)$/);
      if (address.startsWith('#')) expect(doc.getElementById(address.slice(1)), address).toBeTruthy();
      else expect(existsSync(address === './' ? 'index.html' : address.replace(/#.*$/, '')), address).toBe(true);
      if (node.tagName !== 'A') loaded.push(address);
    }
    expect(loaded).toEqual(['packets-mark.svg', 'packets.css', 'packets-results.css', 'packets-page.js', 'packets_results_reader.js', 'packets-results.js']);
    const said = [...doc.querySelectorAll('details.proof li')].find((item) => item.textContent.startsWith('This page loads'));
    expect(said.textContent).toContain('This page loads seven files, all from this site');
    expect([...said.querySelectorAll('code')].map((node) => node.textContent)).toEqual(loaded.filter((file) => /\.(?:css|js)$/.test(file)));
    for (const file of SCRIPTS) for (const quoted of read(file).match(/'[\w./-]+\.(?:json|html|js|css|svg)'/g) || []) expect(existsSync(quoted.slice(1, -1)), file + ' -> ' + quoted).toBe(true);
  });

  it('states what is read, sent, kept and loaded, and shows its own rule', () => {
    const doc = parse();
    const proof = doc.querySelector('details.proof');
    expect(proof.hasAttribute('open')).toBe(false);
    expect([...proof.querySelectorAll('summary span')].map((node) => node.textContent)).toEqual([PROOF_LINE, 'See the details', 'Hide the details']);
    const items = [...proof.querySelectorAll('li')].map((item) => item.textContent);
    expect(items.slice(0, 5)).toEqual([
      'Your files are read with the browser\'s own file reader. What is in them stays in this tab.',
      'Nothing is sent. This page cannot connect to anything: the rule below tells the browser to refuse every connection, and the browser enforces it.',
      'This page runs without AI. It counts, sorts and draws what is in your files, and nothing else.',
      'Nothing is kept on this device unless you turn on Keep these results on this device. When it is on, the results shown on this page are kept in this browser\'s storage for this site (local storage), on this device only. Remove them from this device deletes them. On a shared computer, leave it off.',
      'The files you save from this page are made in this tab and saved to this device by your browser.']);
    expect(items).toContain('There are no cookies and nothing to sign in to.');
    expect(proof.querySelector('[data-show-rule]')).toBeTruthy();
    // The switch and the button are named in the details exactly as they are on the page.
    expect(doc.querySelector('label.keep-switch').textContent.trim()).toBe('Keep these results on this device');
    expect(doc.getElementById('forget').textContent).toBe('Remove them from this device');
    expect(doc.getElementById('keep').checked).toBe(false);
    expect(read('packets-results.js')).toMatch(/new FileReader\(\)/);
  });

  it('says "AI" only to say that none runs here', () => {
    // The claim is about what RUNS: the sounds in a practice file were recorded ahead of time with computer voices.
    const allowed = ['This page runs without AI.', 'Runs without AI.'];
    const doc = parse();
    const sentences = (text) => text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter((sentence) => /\bAI\b/.test(sentence));
    const BLOCK = 'title, h1, h2, h3, p, li, span, legend, label, button, option';
    const blocks = [...doc.querySelectorAll(BLOCK)].filter((node) => !node.querySelector(BLOCK));
    const found = blocks.flatMap((node) => sentences(node.textContent)).concat(sentences(doc.querySelector('meta[name="description"]').getAttribute('content')));
    expect(found).toEqual(['This page runs without AI.', 'This page runs without AI.', 'Runs without AI.']);
    for (const sentence of found) expect(allowed).toContain(sentence);
    // Nothing outside those blocks, and no attribute, mentions it.
    expect((doc.documentElement.textContent.match(/\bAI\b/g) || []).length).toBe(2);
    for (const node of doc.querySelectorAll('*')) for (const attribute of node.attributes) if (node.tagName !== 'META') expect(/\bAI\b/.test(attribute.value)).toBe(false);
    for (const file of [...SCRIPTS, 'packets-results.css']) expect(read(file), file).not.toMatch(/\bAI\b/);
    expect(NEW_FILES.map(read).join('\n')).not.toMatch(/no AI\b|Gemini|ChatGPT|chatbot|generat(?:es|ive)|\bLLM\b/i);
  });

  it('describes, and never judges: no published benchmark, no labels for children', () => {
    for (const file of NEW_FILES) expect(JUDGING.exec(read(file)), file).toBeNull();
    const script = read('packets-results.js');
    expect(script).toContain("var HONEST = '" + HONEST + "';");
    expect(script.match(/benchmark/gi)).toHaveLength(1);
    expect(NEW_FILES.filter((file) => file !== 'packets-results.js').map(read).join('\n')).not.toMatch(/benchmark/i);
    expect(script).toContain("var GOAL_NOTE = 'Goal typed by the teacher';");
    for (const file of NEW_FILES) expect(BRITISH.exec(read(file)), file).toBeNull();
    expect(parse().body.textContent).not.toContain('!');
  });

  it('keeps the product name in one place, and the look of the other pages', () => {
    expect(read(PAGE).split(NAME).length - 1).toBe(1);
    const doc = parse();
    expect(doc.getElementById('product-name').textContent).toBe(NAME);
    for (const file of [...SCRIPTS, 'packets-results.css']) expect(read(file), file).not.toContain(NAME);
    expect(doc.title).toBe('Add up results');
    expect([...doc.querySelectorAll('link[rel="icon"]')].map((link) => link.getAttribute('href'))).toEqual(['packets-mark.svg']);
    expect(doc.querySelector('a.skip').getAttribute('href')).toBe('#main');
    expect(doc.querySelector('header') && doc.querySelector('main#main') && doc.querySelector('footer')).toBeTruthy();
    expect([...doc.querySelectorAll('footer a')].map((link) => link.textContent)).toEqual(['More from AlloFlow']);
    expect(doc.querySelector('.brand').getAttribute('href')).toBe('packets.html');
    // Only what packets.css lacks: the colors and the font are its own, used by name. Outside the print sheet no color is written out.
    const css = read('packets-results.css');
    expect(css).not.toMatch(/:root|--[\w-]+\s*:/);
    expect(css.match(/font-family:[^;]+;/g).every((rule) => rule === 'font-family: var(--font);')).toBe(true);
    const screen = css.slice(0, css.indexOf('@media print'));
    expect(screen.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
    for (const name of new Set(css.match(/var\(--[\w-]+\)/g))) expect(read('packets.css'), name).toContain(name.slice(4, -1) + ':');
    // The classes the page borrows from packets.css exist there.
    for (const name of ['wrap', 'top', 'brand', 'proof', 'sheet', 'actions', 'btn', 'btn-primary', 'btn-small', 'btn-text', 'switch', 'field', 'hint', 'note', 'sr-only', 'skip', 'foot']) {
      expect(read('packets.css'), name).toMatch(new RegExp('\\.' + name + '[ ,.:{>\\[]'));
      expect(read(PAGE) + read('packets-results.js'), name).toMatch(new RegExp('[\'" ]' + name + '[\'" ]'));
    }
  });

  it('has one h1, ordered headings, named controls and a live region', () => {
    const doc = parse();
    const levels = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) => Number(node.tagName[1]));
    expect(levels.filter((level) => level === 1)).toEqual([1]);
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
    const named = (node) => {
      if ((node.getAttribute('aria-label') || '').trim()) return true;
      if (node.id && doc.querySelector('label[for="' + node.id + '"]')?.textContent.trim()) return true;
      return !!node.closest('label')?.textContent.trim();
    };
    for (const node of doc.querySelectorAll('input, select, textarea')) expect(named(node), node.outerHTML.slice(0, 80)).toBe(true);
    for (const node of doc.querySelectorAll('button, a[href]')) expect((node.textContent.trim() || node.getAttribute('aria-label') || '').length, node.outerHTML.slice(0, 80)).toBeGreaterThan(0);
    for (const node of doc.querySelectorAll('button')) expect(node.getAttribute('type')).toBe('button');
    for (const node of doc.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
      for (const id of (node.getAttribute('aria-describedby') || node.getAttribute('aria-labelledby')).split(/\s+/)) expect(doc.getElementById(id), '#' + id).toBeTruthy();
    }
    for (const group of doc.querySelectorAll('fieldset')) expect(group.querySelector('legend')?.textContent.trim()).toBeTruthy();
    expect(new Set([...doc.querySelectorAll('[id]')].map((node) => node.id)).size).toBe(doc.querySelectorAll('[id]').length);
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.querySelectorAll('main').length).toBe(1);
    expect(doc.querySelector('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable|maximum-scale/);
    const said = doc.getElementById('said');
    expect([said.getAttribute('role'), said.getAttribute('aria-live'), said.className]).toEqual(['status', 'polite', 'sr-only']);
    for (const node of doc.querySelectorAll('[tabindex="-1"]')) expect(node.matches('h2, h3')).toBe(true);
    // On first sight: one drop area, one primary button, the sample link, and nothing else to decide.
    expect(doc.getElementById('state-empty').hidden).toBe(false);
    expect(doc.getElementById('state-check').hidden && doc.getElementById('state-results').hidden).toBe(true);
    expect([...doc.querySelectorAll('#state-empty button')].map((node) => node.textContent)).toEqual(['Choose files', 'Try with sample results']);
    expect(doc.getElementById('files').getAttribute('accept')).toBe('.csv,.json,text/csv,application/json');
    const css = read('packets-results.css');
    // A table scrolls inside its own box. The box is the frame for the hidden screen-reader text in its cells:
    // without position: relative that text escaped the box and made a phone-width page scroll sideways (seen in a real browser).
    expect(css).toMatch(/\.table-scroll \{ position: relative;[^}]*overflow-x: auto/);
    expect(css).toMatch(/@media print \{/);
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/forced-colors: active/);
    expect(css).not.toMatch(/animation|@keyframes/);
  });

  it('ships eight sample files that are real results files with made-up code names', async () => {
    const script = read('packets-results.js');
    const block = script.slice(script.indexOf('// BEGIN SAMPLE FILES'), script.indexOf('// END SAMPLE FILES'));
    const files = new Function(block.replace(/^.*\n/, '') + '\nreturn SAMPLE_FILES;')();
    expect(files).toHaveLength(8);
    const sessions = [];
    for (const file of files) {
      const s = await one(BOM + file.lines.join('\r\n') + '\r\n', file.name);
      expect([s.integrity, s.sessionId.startsWith('sample-')], file.name).toEqual(['ok', true]);
      expect(s.flags.includes('score_differs'), file.name).toBe(false);
      sessions.push(s);
    }
    const model = reader.addUp(sessions, {});
    expect(model.learners.map((row) => [row.label, row.count])).toEqual([['BlueHeron7', 4], ['GoldFinch5', 1], ['GrayOwl4', 1], ['GreenTurtle2', 1], ['RedFox3', 1]]);
    expect(model.middles.map((row) => [row.label, row.form, row.n, row.median, row.q1, row.q3])).toEqual([['Math Fluency (grade 2)', 'A', 5, 9, 8, 12]]);
    expect(model.suggestions).toEqual([]);
    expect(block).not.toMatch(/[^\x20-\x7E\r\n]/);
  });
});

// ---------------------------------------------------------------------------
// Part 4: the page, run in jsdom
// ---------------------------------------------------------------------------
function openPage(options = {}) {
  const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-results.html' });
  const w = dom.window, d = w.document;
  const page = { dom, w, d, files: [], downloads: [], printed: [], reached: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  // A browser makes the SHA-256 value; jsdom is lent node's.
  Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  // Anything that could reach a network is a trap here: the page must never touch one.
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) w[name] = function () { page.reached.push(name); throw new Error(name + ' was called'); };
  w.navigator.sendBeacon = () => { page.reached.push('sendBeacon'); return false; };
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), body: page.files[page.files.length - 1].body, type: page.files[page.files.length - 1].type }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.print = () => { page.printed.push(d.getElementById('view-group').hidden ? 'learner' : 'group'); };
  if (options.before) options.before(w);
  // The page's own scripts, in the order the page names them: what the page does not load, the test does not have.
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.state = () => ['state-empty', 'state-check', 'state-results'].filter((id) => page.seen(id)).join(' ');
  page.until = async (test, what) => {
    for (let i = 0; i < 1500; i++) { if (test()) return; await new Promise((resolve) => setTimeout(resolve, 10)); }
    throw new Error('Timed out waiting for ' + what);
  };
  page.file = (text, name, lastModified = LAST_CHANGED) => new w.File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified });
  page.drop = async (files) => {
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files };
    page.$('main').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await page.until(() => /\bread[,.]/.test(page.$('said').textContent), 'the files to be read');
    return page.$('said').textContent;
  };
  page.view = (name) => { const radio = d.querySelector('input[name="view"][value="' + name + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.learner = (label) => {
    const pick = page.$('pick-learner');
    pick.value = [...pick.options].find((option) => option.textContent.startsWith(label + ' (')).value;
    pick.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  page.type = (input, value) => { input.value = value; input.dispatchEvent(new w.Event('input', { bubbles: true })); };
  page.table = (table) => [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => cell.textContent));
  page.measure = (name) => [...d.querySelectorAll('.measure')].find((card) => card.querySelector('h4').textContent === name);
  page.rows = () => page.table(page.$('group-table').querySelector('table'));
  page.stored = () => ({ local: w.localStorage.length, session: w.sessionStorage.length, cookie: d.cookie });
  return page;
}
const ask = (list, text) => list.find((node) => node.textContent === text);

// Two learners, three dates each, practice and checks: six results in eight files.
const A1 = practice({ sid: 'a-1', learner: 'BlueHeron7', day: '2026-11-03' });
const A2 = practice({ sid: 'a-2', learner: 'BlueHeron7', day: '2026-11-10', seconds: 240, answers: [pick('isolation', 'cat', 'k', ['k']), pick('isolation', 'dog', 'o', ['o']), pick('isolation', 'bed', 'd', ['b', 'd']), pick('blending', 'cup', 'cup', ['cup']), pick('missing_letter', 'pig', 'i', ['i'])] });
const A3 = check({ sid: 'a-3', learner: 'BlueHeron7', day: '2026-11-17', wrong: { 3: 9 }, elapsedS: 96 });
const B1 = practice({ sid: 'b-1', learner: 'RedFox3', day: '2026-11-03', answers: [pick('isolation', 'cat', 'k', ['k']), pick('isolation', 'dog', 'o', ['d', 'o']), pick('isolation', 'bed', 'd', ['b', 'e'], true), pick('blending', 'cup', 'cup', ['cap', 'cup']), pick('missing_letter', 'pig', 'i', ['e', 'i'])] });
const B2 = check({ sid: 'b-2', learner: 'RedFox3', day: '2026-11-10', done: 6, elapsedS: 120 });
const B3 = check({ sid: 'b-3', learner: 'RedFox3', day: '2026-11-17', elapsedS: 120, hiddenS: 9, flags: ['left_the_page'] });
const EIGHT = (page) => [
  page.file(csvOf(A1), nameOf(A1)), page.file(csvOf(A2), nameOf(A2)), page.file(csvOf(A3), nameOf(A3)), page.file(csvOf(B1), nameOf(B1)), page.file(csvOf(B2), nameOf(B2)),
  // Changed after it was saved: one time cell.
  page.file(csvOf(B3).replace('"15000"', '"15001"'), nameOf(B3)),
  // The JSON of a result whose CSV is also here.
  page.file(jsonOf(A1), nameOf(A1, 'json')),
  page.file('<!doctype html><html><body><h1>Short vowels</h1></body></html>', 'Short-vowels.html'),
];

describe('the page: from files to results', () => {
  it('starts empty, keeps nothing, and reads eight dropped files into "check what was read", then the results', async () => {
    const page = openPage();
    expect(page.state()).toBe('state-empty');
    expect(page.w.document.title).toBe(NAME + ': Add up results');
    expect(page.d.querySelector('[data-show-rule]').textContent).toBe(CSP);
    expect(csvOf(B3)).toContain('"15000"');
    const said = await page.drop(EIGHT(page));
    expect(said).toBe('8 files read, 3 need a look.');
    expect(page.state()).toBe('state-check');
    expect(page.d.activeElement).toBe(page.$('check-title'));
    expect(page.$('check-line').textContent).toBe('6 results counted, from 2 learners. Look through the points below, then show the results.');
    const groups = [...page.$('check-body').querySelectorAll('.check-group')].map((group) => [group.querySelector('h3').textContent, [...group.querySelectorAll('li')].map((item) => [...item.children].map((part) => part.textContent))]);
    expect(groups).toEqual([
      ['Not results files', [['Short-vowels.html', 'This is a web page, not a results file. It may be the practice file itself. The results file is the one a student saves at the end.']]],
      ['The same result more than once', [['Short-vowels__BlueHeron7__2026-11-03.json', 'The same result as Short-vowels__BlueHeron7__2026-11-03.csv.']]],
      ['Changed after saving', [['Math-Fluency-check-2A__RedFox3__2026-11-17.csv', 'RedFox3, Nov 17, 2026.']]]]);
    page.$('show-results').click();
    expect(page.state()).toBe('state-results');
    expect(page.d.activeElement).toBe(page.$('results-title'));
    expect(page.$('results-line').textContent).toBe('6 results from 2 learners. Nov 3 to Nov 17, 2026.');
    expect(page.$('open-check').textContent).toBe('Check what was read (3)');
    expect(page.seen('sample-note')).toBe(false);
    // The group: one row for each learner, the latest value of each measure.
    expect(page.seen('view-group') && !page.seen('view-learner')).toBe(true);
    const head = [...page.$('group-table').querySelectorAll('thead tr')].map((row) => [...row.children].map((cell) => cell.textContent));
    expect(head).toEqual([['Learner', 'Results', 'Last date', 'Practice: latest first-try percent', 'Checks: latest score'], ['Hearing sounds', 'Spelling', 'Math Fluency (grade 2)digits correct per minute']]);
    expect(page.rows()).toEqual([['BlueHeron7', '3', 'Nov 17, 2026', '75%3 of 4', '100%1 of 1', '8form A'], ['RedFox3', '3', 'Nov 17, 2026', '25%1 of 4', '0%0 of 1', '7form A']]);
    // Two learners: nothing is said about the middle of a group.
    expect(page.$('middles').textContent).toBe('');
    expect(page.d.body.textContent).not.toContain('Middle of this group');
    // Nothing reached a network, and nothing was kept.
    expect(page.reached).toEqual([]);
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    page.dom.window.close();
  });

  it('sorts the group by any column, and says which way', async () => {
    const page = openPage();
    await page.drop(EIGHT(page));
    page.$('show-results').click();
    const sorter = (label) => [...page.$('group-table').querySelectorAll('.sort')].find((node) => node.querySelector('.sort-name').textContent === label);
    const names = () => page.rows().map((row) => row[0]);
    const sortOf = (label) => sorter(label).closest('th').getAttribute('aria-sort');
    expect([names(), sortOf('Learner'), sortOf('Spelling')]).toEqual([['BlueHeron7', 'RedFox3'], 'ascending', 'none']);
    sorter('Learner').click();
    expect([names(), sortOf('Learner')]).toEqual([['RedFox3', 'BlueHeron7'], 'descending']);
    expect(page.d.activeElement).toBe(sorter('Learner'));
    sorter('Hearing sounds').click();
    expect([names(), sortOf('Hearing sounds'), sortOf('Learner')]).toEqual([['BlueHeron7', 'RedFox3'], 'descending', 'none']);
    sorter('Hearing sounds').click();
    expect([names(), sortOf('Hearing sounds')]).toEqual([['RedFox3', 'BlueHeron7'], 'ascending']);
    expect(page.$('said').textContent).toBe('Sorted by Hearing sounds, low to high.');
    sorter('Math Fluency (grade 2)').click();
    expect(names()).toEqual(['BlueHeron7', 'RedFox3']);
    for (const th of page.$('group-table').querySelectorAll('th')) expect(['col', 'colgroup', 'row']).toContain(th.getAttribute('scope'));
    page.dom.window.close();
  });

  it('shows one learner over time: a chart for each measure with two dates, and the same numbers in a table', async () => {
    const page = openPage();
    await page.drop(EIGHT(page));
    page.$('show-results').click();
    // A name in the group table opens that learner.
    ask([...page.$('group-table').querySelectorAll('tbody button')], 'BlueHeron7').click();
    expect(page.seen('view-learner') && !page.seen('view-group')).toBe(true);
    expect(page.d.activeElement).toBe(page.$('learner-title'));
    expect(page.$('learner-body').querySelector('.learner-line').textContent).toBe('BlueHeron7. 3 results, Nov 3 to Nov 17, 2026.');
    expect([...page.d.querySelectorAll('.measure h4')].map((node) => node.textContent)).toEqual(['Hearing sounds', 'Spelling', 'Math Fluency (grade 2)']);
    const hearing = page.measure('Hearing sounds');
    expect(hearing.querySelector('.measure-unit').textContent).toBe('First-try percent');
    expect(hearing.querySelector('.measure-latest').textContent).toBe('Latest: 75%, Nov 10, 2026.');
    const chart = hearing.querySelector('svg');
    expect([chart.getAttribute('role'), chart.namespaceURI.endsWith('/svg')]).toEqual(['img', true]);
    const [titleId, descId] = chart.getAttribute('aria-labelledby').split(' ');
    expect(page.$(titleId).textContent).toBe('Hearing sounds: first-try percent over time');
    expect(page.$(descId).textContent).toBe('2 results from Nov 3 to Nov 10, 2026. First 50%, latest 75%. The same numbers are in the table below.');
    const points = [...chart.querySelectorAll('.chart-point')];
    expect(points.map((dot) => [dot.getAttribute('data-date'), dot.getAttribute('data-value')])).toEqual([['2026-11-03', '50'], ['2026-11-10', '75']]);
    // Later is further right, more is higher, and the line passes through the dots.
    const xy = points.map((dot) => [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))]);
    expect(xy[1][0]).toBeGreaterThan(xy[0][0]);
    expect(xy[1][1]).toBeLessThan(xy[0][1]);
    expect(chart.querySelector('.chart-line').getAttribute('points')).toBe(xy.map((p) => p.join(',')).join(' '));
    // Direct labels: each dot carries its number, the axis its dates.
    expect([...chart.querySelectorAll('.chart-value')].map((node) => node.textContent)).toEqual(['50%', '75%']);
    expect([...chart.querySelectorAll('.chart-scale')].map((node) => node.textContent)).toEqual(['0%', '25%', '50%', '75%', '100%', 'Nov 3', 'Nov 10', '2026']);
    expect(hearing.querySelector('figcaption').textContent).toBe('Each dot is one result.');
    expect(page.table(hearing.querySelector('table'))).toEqual([['Nov 3, 2026', '50%', '2 of 4 on the first try.', ''], ['Nov 10, 2026', '75%', '3 of 4 on the first try.', '']]);
    expect([...hearing.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Date', 'First-try percent', 'Details', 'Notes']);
    // One date only: no chart, and the table is still there.
    const math = page.measure('Math Fluency (grade 2)');
    expect(math.querySelector('svg')).toBeNull();
    expect(math.querySelector('.measure-chart').textContent).toBe('A chart is drawn when there are results from two dates.');
    expect(page.table(math.querySelector('table'))).toEqual([['Nov 17, 2026', '8', 'Form A, try 1. 7 of 8 right.', 'Finished before the time was up, so the score is for the time used']]);
    // The most frequent wrong answers in practice, and every result in date order.
    const tables = [...page.$('learner-body').querySelectorAll(':scope > .table-scroll table')];
    expect([...page.$('learner-body').querySelectorAll(':scope > h4')].map((node) => node.textContent)).toEqual(['Most frequent wrong answers in practice', 'Every result, in date order']);
    expect(page.table(tables[0])).toEqual([['bed', 'b', '2'], ['bed', 'e', '1'], ['dog', 'd', '1']]);
    expect(page.table(tables[1])).toEqual([
      ['Nov 3, 2026', 'Practice: ws-short-vowels', '60% on the first try', '5 of 5', '5 min', ''],
      ['Nov 10, 2026', 'Practice: ws-short-vowels', '80% on the first try', '5 of 5', '4 min', ''],
      ['Nov 17, 2026', 'Math Fluency, form A, try 1', '8 digits correct per minute', '8 of 8', '1 min 48 s', 'Finished before the time was up, so the score is for the time used']]);
    // The other learner: the check has two dates, and the changed file carries its notes and a ring on its dot.
    page.learner('RedFox3');
    const fox = page.measure('Math Fluency (grade 2)');
    expect([...fox.querySelectorAll('.chart-point')].map((dot) => [dot.getAttribute('data-date'), dot.getAttribute('data-value')])).toEqual([['2026-11-10', '5'], ['2026-11-17', '7']]);
    expect(fox.querySelectorAll('.chart-ring')).toHaveLength(1);
    expect(fox.querySelector('figcaption').textContent).toBe('Each dot is one result. A ring around a dot means that result has a note in the table.');
    expect(page.table(fox.querySelector('table'))).toEqual([['Nov 10, 2026', '5', 'Form A, try 1. 6 of 6 right.', ''],
      ['Nov 17, 2026', '7', 'Form A, try 1. 8 of 8 right.', 'Left the page for more than 3 seconds (9 seconds away in all); this file was changed after it was saved']]);
    expect(page.measure('Hearing sounds').querySelector('svg')).toBeNull();
    // Every table has a caption and header cells with a scope, and sits in its own scrolling box.
    for (const table of page.d.querySelectorAll('#state-results table')) {
      expect(table.querySelector('caption').textContent.length).toBeGreaterThan(10);
      for (const th of table.querySelectorAll('th')) expect(['col', 'colgroup', 'row']).toContain(th.getAttribute('scope'));
      expect(table.parentNode.classList.contains('table-scroll')).toBe(true);
      expect(table.parentNode.getAttribute('role')).toBe('region');
    }
    const levels = [...page.d.querySelectorAll('h1, h2, h3, h4')].filter((node) => !node.closest('[hidden]')).map((node) => Number(node.tagName[1]));
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
    expect(new Set([...page.d.querySelectorAll('[id]')].map((node) => node.id)).size).toBe(page.d.querySelectorAll('[id]').length);
    page.dom.window.close();
  });

  it('draws a goal the teacher types as a line, says whose it is, and takes it away again', async () => {
    const page = openPage();
    await page.drop(EIGHT(page));
    page.$('show-results').click();
    page.view('learner');
    page.learner('BlueHeron7');
    const card = page.measure('Hearing sounds');
    const input = card.querySelector('input.goal-input');
    expect(page.d.querySelector('label[for="' + input.id + '"]').textContent).toBe('Goal for Hearing sounds (optional)');
    expect(card.querySelector('.chart-goal')).toBeNull();
    expect(card.querySelector('.goal-line').hidden).toBe(true);
    page.type(input, '80');
    const line = card.querySelector('.chart-goal');
    expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));
    // The line is at 80: between the dot at 75 and the top of the chart.
    const at75 = Number(card.querySelector('.chart-point[data-value="75"]').getAttribute('cy'));
    expect(Number(line.getAttribute('y1'))).toBeLessThan(at75);
    expect(line.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(card.querySelector('.chart-goal-label').textContent).toBe('Goal 80%');
    expect(card.querySelector('.goal-line').textContent).toBe('Goal typed by the teacher: 80%.');
    expect(card.querySelector('figcaption').textContent).toBe('Each dot is one result. Dashed line: goal typed by the teacher.');
    expect(card.querySelector('desc').textContent).toContain('Goal typed by the teacher: 80%.');
    // The field the teacher is typing in is still the same field: the chart was drawn again around it.
    expect(card.querySelector('input.goal-input')).toBe(input);
    // Something that is not a number, or is out of range, changes nothing and is flagged on the field.
    for (const bad of ['lots', '-5', '250']) {
      page.type(input, bad);
      expect(input.getAttribute('aria-invalid'), bad).toBe('true');
      expect(card.querySelector('.chart-goal-label').textContent, bad).toBe('Goal 80%');
    }
    // A goal on a score scales the chart to hold it.
    page.learner('RedFox3');
    const math = page.measure('Math Fluency (grade 2)');
    page.type(math.querySelector('input.goal-input'), '24');
    expect(math.querySelector('.chart-goal-label').textContent).toBe('Goal 24');
    expect(math.querySelector('.goal-line').textContent).toBe('Goal typed by the teacher: 24 digits correct per minute.');
    const ticks = [...math.querySelectorAll('.chart-scale')].map((node) => Number(node.textContent)).filter((n) => !Number.isNaN(n) && n < 2000);
    expect(Math.max(...ticks)).toBeGreaterThanOrEqual(24);
    // It belongs to that learner and that measure, and comes back when the learner is shown again.
    page.learner('BlueHeron7');
    expect(page.measure('Hearing sounds').querySelector('input.goal-input').value).toBe('80');
    expect(page.measure('Spelling').querySelector('.chart-goal')).toBeNull();
    page.type(page.measure('Hearing sounds').querySelector('input.goal-input'), '');
    expect(page.measure('Hearing sounds').querySelector('.chart-goal')).toBeNull();
    expect(page.measure('Hearing sounds').querySelector('.goal-line').hidden).toBe(true);
    page.dom.window.close();
  });

  it('asks before counting two close names as one learner, and never asks about names that are the same', async () => {
    const page = openPage();
    const files = [['BlueHeron7', 'm-1', '2026-11-03'], ['blue heron 7', 'm-2', '2026-11-10'], ['BlueHeren7', 'm-3', '2026-11-17'], ['BlueHeron8', 'm-4', '2026-11-17']]
      .map(([learner, sid, day]) => page.file(csvOf(practice({ learner, sid, day })), sid + '.csv'));
    expect(await page.drop(files)).toBe('4 files read, 1 needs a look.');
    expect(page.state()).toBe('state-check');
    const groups = () => [...page.$('check-body').querySelectorAll('.check-group h3')].map((node) => node.textContent);
    expect(groups()).toEqual(['One learner, written two ways?']);
    expect(page.$('check-body').querySelector('.pair-names').textContent).toBe('BlueHeren7 (1 result) and BlueHeron7 (2 results)');
    expect(page.$('check-line').textContent).toBe('4 results counted, from 3 learners. Look through the points below, then show the results.');
    const buttons = () => [...page.$('check-body').querySelectorAll('button')];
    expect(buttons().map((node) => node.textContent)).toEqual(['These are the same learner', 'These are different learners']);
    expect(buttons()[0].getAttribute('aria-label')).toBe('BlueHeren7 and BlueHeron7: these are the same learner');
    buttons()[0].click();
    expect(page.$('said').textContent).toBe('BlueHeren7 and BlueHeron7 are counted as one learner.');
    expect(groups()).toEqual(['Counted as one learner']);
    expect(page.$('check-body').querySelector('.pair-names').textContent).toBe('BlueHeren7 is counted with BlueHeron7.');
    page.$('show-results').click();
    expect(page.rows().map((row) => row.slice(0, 2))).toEqual([['BlueHeron7also written blue heron 7, BlueHeren7', '3'], ['BlueHeron8', '1']]);
    page.view('learner');
    expect(page.$('learner-body').querySelector('.hint').textContent).toBe('Written in the files as: BlueHeron7, blue heron 7, BlueHeren7.');
    expect(page.measure('Hearing sounds').querySelectorAll('.chart-point')).toHaveLength(3);
    // It can be undone, and "different learners" is remembered: the question does not come back.
    page.$('open-check').click();
    ask(buttons(), 'Count them apart again').click();
    expect(groups()).toEqual(['One learner, written two ways?']);
    ask(buttons(), 'These are different learners').click();
    expect(page.$('said').textContent).toBe('BlueHeren7 and BlueHeron7 stay two learners.');
    expect(page.$('check-body').textContent).toBe('Nothing needs a look.');
    page.$('show-results').click();
    page.view('group');
    expect(page.rows().map((row) => row.slice(0, 2))).toEqual([['BlueHeren7', '1'], ['BlueHeron7also written blue heron 7', '2'], ['BlueHeron8', '1']]);
    expect(await page.drop([page.file(csvOf(practice({ learner: 'BlueHeron7', sid: 'm-5', day: '2026-11-18' })), 'm-5.csv')])).toBe('1 file read.');
    expect(page.state()).toBe('state-results');
    page.dom.window.close();
  });

  it('shows the middle of the group for a check that five learners took, with the line that says what it is', async () => {
    const page = openPage();
    page.$('samples').click();
    await page.until(() => page.state() === 'state-results', 'the sample results');
    expect(page.$('said').textContent).toBe('8 files read.');
    expect(page.seen('sample-note')).toBe(true);
    expect(page.$('sample-note').textContent).toBe('These are sample results. The code names and the scores are made up.');
    expect(page.$('results-line').textContent).toBe('8 results from 5 learners. Oct 6 to Oct 27, 2026.');
    const card = page.$('middles').querySelector('.middle');
    expect([...card.children].map((node) => node.textContent)).toEqual(['Math Fluency (grade 2), form A', 'Middle of this group (n = 5)', '9 digits correct per minute', 'Middle half: 8 to 12. Lowest 5, highest 16.']);
    expect(page.$('middles').querySelectorAll('.middle')).toHaveLength(1);
    expect(page.$('middles').querySelector('.honest').textContent).toBe(HONEST);
    expect(page.rows().map((row) => [row[0], row[1], row[row.length - 1]])).toEqual([['BlueHeron7also written Blue Heron 7', '4', '10form B'], ['GoldFinch5', '1', '5form A'], ['GrayOwl4', '1', '9form A'],
      ['GreenTurtle2', '1', '16form A'], ['RedFox3', '1', '12form A']]);
    // In the learner's own view the group's middle on that form stands beside the learner's score, as a description.
    page.view('learner');
    page.learner('GrayOwl4');
    expect(page.measure('Math Fluency (grade 2)').querySelector('.measure-middle').textContent).toBe('Middle of this group on form A (n = 5): 9. Middle half: 8 to 12.');
    expect(page.table(page.measure('Math Fluency (grade 2)').querySelector('table'))[0][3]).toBe('Left the page for more than 3 seconds (14 seconds away in all)');
    page.learner('BlueHeron7');
    expect(page.measure('Math Fluency (grade 2)').querySelectorAll('.chart-point')).toHaveLength(2);
    expect(page.measure('Hearing sounds').querySelectorAll('.chart-point')).toHaveLength(2);
    // Sample results are never kept, and real files replace them.
    expect(page.$('keep').disabled).toBe(true);
    expect(page.$('keep-said').textContent).toBe('Sample results are not kept.');
    await page.drop([page.file(csvOf(A1), nameOf(A1))]);
    expect([page.$('results-line').textContent, page.seen('sample-note'), page.$('keep').disabled]).toEqual(['1 result from 1 learner. Nov 3, 2026.', false, false]);
    expect(page.d.body.textContent).not.toContain('Middle of this group');
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    page.dom.window.close();
  });

  it('with four learners on a form says nothing about a middle', async () => {
    const page = openPage();
    const files = ['RedFox3', 'BlueHeron7', 'GreenTurtle2', 'GoldFinch5'].map((learner, i) => page.file(csvOf(check({ learner, sid: 'four-' + i, elapsedS: 80 + i * 10 })), 'four-' + i + '.csv'));
    expect(await page.drop(files)).toBe('4 files read.');
    expect(page.state()).toBe('state-results');
    expect(page.rows()).toHaveLength(4);
    expect(page.$('middles').children).toHaveLength(0);
    await page.drop([page.file(csvOf(check({ learner: 'GrayOwl4', sid: 'four-4', elapsedS: 120 })), 'four-4.csv')]);
    expect(page.$('middles').querySelector('.middle-label').textContent).toBe('Middle of this group (n = 5)');
    page.dom.window.close();
  });
});

describe('the page: take it with you', () => {
  const ready = async (options) => {
    const page = openPage(options);
    await page.drop(EIGHT(page));
    page.$('show-results').click();
    return page;
  };

  it('saves a summary with the exact header and one exact row for each result', async () => {
    const page = await ready();
    page.$('save-csv').click();
    const saved = page.downloads[0];
    expect(saved.name).toMatch(/^results-summary__\d{4}-\d{2}-\d{2}\.csv$/);
    expect(saved.type).toBe('text/csv;charset=utf-8');
    expect(saved.body.charCodeAt(0)).toBe(0xFEFF);
    expect(saved.body.slice(1).split('\r\n')).toEqual([
      '"learner","date","measure","form","score","score_unit","accuracy_pct","first_try_pct","items_given","items_attempted","duration_s","flags","session_id","packet_id","packet_version","integrity","source_file"',
      '"BlueHeron7","2026-11-03","practice","","","","80","60","5","5","300","","a-1","ws-short-vowels","r91b7d204","ok","Short-vowels__BlueHeron7__2026-11-03.csv"',
      '"BlueHeron7","2026-11-10","practice","","","","100","80","5","5","240","","a-2","ws-short-vowels","r91b7d204","ok","Short-vowels__BlueHeron7__2026-11-10.csv"',
      '"BlueHeron7","2026-11-17","math_dcpm","A","8","digits_correct_per_minute","88","88","8","8","108","finished_early","a-3","math-computation-g2","r5a3c2e10","ok","Math-Fluency-check-2A__BlueHeron7__2026-11-17.csv"',
      '"RedFox3","2026-11-03","practice","","","","80","20","5","5","300","","b-1","ws-short-vowels","r91b7d204","ok","Short-vowels__RedFox3__2026-11-03.csv"',
      '"RedFox3","2026-11-10","math_dcpm","A","5","digits_correct_per_minute","75","100","8","6","132","","b-2","math-computation-g2","r5a3c2e10","ok","Math-Fluency-check-2A__RedFox3__2026-11-10.csv"',
      '"RedFox3","2026-11-17","math_dcpm","A","7","digits_correct_per_minute","100","100","8","8","132","left_the_page;file_changed","b-3","math-computation-g2","r5a3c2e10","changed","Math-Fluency-check-2A__RedFox3__2026-11-17.csv"',
      '']);
    expect(page.$('take-said').textContent).toBe('Saved ' + saved.name + ': 6 rows, one for each result.');
    page.dom.window.close();
  });

  it('prints the group or one learner, with a line that says what it is and when', async () => {
    const page = await ready();
    page.view('learner');
    page.learner('RedFox3');
    page.$('print-group').click();
    expect(page.printed).toEqual(['group']);
    expect(page.$('print-head').textContent).toMatch(/^AlloFlow Packets: Add up results\. The group\. Printed [A-Z][a-z]{2} \d{1,2}, \d{4}\.$/);
    page.$('print-learner').click();
    expect(page.printed).toEqual(['group', 'learner']);
    expect(page.$('print-head').textContent).toMatch(/^AlloFlow Packets: Add up results\. RedFox3\. Printed /);
    // The print sheet: black on white, no controls, the header line shown.
    const css = read('packets-results.css');
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toMatch(/\.top, \.proof, \.skip, \.foot, \.no-print[^{]*\{ display: none !important; \}/);
    expect(print).toMatch(/\.print-only \{ display: block; \}/);
    expect(print).toMatch(/html, body \{ background: #ffffff; color: #000000;/);
    for (const id of ['take', 'start-over-ask']) expect(page.$(id).classList.contains('no-print'), id).toBe(true);
    for (const node of page.d.querySelectorAll('.goal, .view-pick, .results-tools, .learner-pick')) expect(node.classList.contains('no-print')).toBe(true);
    page.dom.window.close();
  });

  it('saves everything as one file, and opening that file on a fresh page restores it all', async () => {
    const page = openPage();
    const files = EIGHT(page).concat([page.file(csvOf(practice({ learner: 'RedFux3', sid: 'b-4', day: '2026-11-18' })), 'typo.csv')]);
    expect(await page.drop(files)).toBe('9 files read, 4 need a look.');
    ask([...page.$('check-body').querySelectorAll('button')], 'These are the same learner').click();
    page.$('show-results').click();
    page.view('learner');
    page.learner('BlueHeron7');
    page.type(page.measure('Hearing sounds').querySelector('input.goal-input'), '90');
    page.$('save-bundle').click();
    const saved = page.downloads[0];
    expect(saved.name).toMatch(/^results-all__\d{4}-\d{2}-\d{2}\.json$/);
    const bundle = JSON.parse(saved.body);
    expect([bundle.kind, bundle.version, bundle.sessions.length, bundle.merges, bundle.goals]).toEqual(['alloflow-packet-results-bundle', 1, 7, [{ from: 'redfux3', into: 'redfox3' }],
      [{ learner: 'blueheron7', measure: 'strand\thearing_sounds', value: 90 }]]);
    expect(bundle.savedLocal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(page.$('take-said').textContent).toBe('Saved ' + saved.name + '. Drop it on this page later to open where you left off.');
    page.view('group');
    const before = { rows: page.rows(), line: page.$('results-line').textContent };
    page.dom.window.close();

    const again = openPage();
    expect(await again.drop([again.file(saved.body, saved.name)])).toBe('1 file read.');
    expect(again.state()).toBe('state-results');
    expect([again.rows(), again.$('results-line').textContent]).toEqual([before.rows, before.line]);
    expect(again.rows().map((row) => row.slice(0, 2))).toEqual([['BlueHeron7', '3'], ['RedFox3also written RedFux3', '4']]);
    again.view('learner');
    again.learner('BlueHeron7');
    expect(again.measure('Hearing sounds').querySelector('input.goal-input').value).toBe('90');
    expect(again.measure('Hearing sounds').querySelector('.chart-goal-label').textContent).toBe('Goal 90%');
    // The changed file is still labeled, and the merge can still be undone.
    again.learner('RedFox3');
    expect(again.table(again.measure('Math Fluency (grade 2)').querySelector('table'))[1][3]).toContain('this file was changed after it was saved');
    again.$('open-check').click();
    expect([...again.$('check-body').querySelectorAll('.check-group h3')].map((node) => node.textContent)).toEqual(['Changed after saving', 'Counted as one learner']);
    // The same results dropped again as files are counted once.
    again.$('show-results').click();
    expect(await again.drop([again.file(csvOf(A1), nameOf(A1)), again.file(csvOf(A2), nameOf(A2))])).toBe('2 files read, 2 need a look.');
    again.$('show-results').click();
    expect(again.$('results-line').textContent).toBe(before.line);
    expect(again.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    again.dom.window.close();
  });

  it('keeps nothing on the device unless the switch is on, and removes it on request', async () => {
    const page = await ready();
    expect(page.$('keep').checked).toBe(false);
    expect(page.seen('forget')).toBe(false);
    // Everything a teacher can do with the switch off leaves the device's storage empty.
    page.view('learner');
    page.type(page.measure('Hearing sounds').querySelector('input.goal-input'), '70');
    page.$('save-csv').click();
    page.$('save-bundle').click();
    page.$('print-group').click();
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    // On: one item, the same content as the one-file copy.
    page.$('keep').click();
    expect(page.$('keep').checked).toBe(true);
    expect(page.stored()).toEqual({ local: 1, session: 0, cookie: '' });
    expect(page.w.localStorage.key(0)).toBe(STORE_KEY);
    const kept = JSON.parse(page.w.localStorage.getItem(STORE_KEY));
    expect([kept.kind, kept.sessions.length, kept.goals.length]).toEqual(['alloflow-packet-results-bundle', 6, 1]);
    expect(page.$('keep-said').textContent).toBe('On. The results on this page are kept in this browser on this device.');
    expect(page.seen('forget')).toBe(true);
    // A change while it is on is kept too.
    await page.drop([page.file(csvOf(practice({ learner: 'RedFox3', sid: 'b-9', day: '2026-11-19' })), 'more.csv')]);
    expect(JSON.parse(page.w.localStorage.getItem(STORE_KEY)).sessions).toHaveLength(7);
    const stored = page.w.localStorage.getItem(STORE_KEY);
    // The button removes it; the results stay on the page.
    page.$('forget').click();
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    expect([page.$('keep').checked, page.seen('forget'), page.$('keep-said').textContent]).toEqual([false, false, 'Removed from this device. The results stay on this page until you close it.']);
    expect(page.$('results-line').textContent).toBe('7 results from 2 learners. Nov 3 to Nov 19, 2026.');
    // Turning the switch off removes it as well.
    page.$('keep').click();
    expect(page.stored().local).toBe(1);
    page.$('keep').click();
    expect(page.stored()).toEqual({ local: 0, session: 0, cookie: '' });
    expect(page.$('keep-said').textContent).toBe('Off. Nothing is kept on this device.');
    page.dom.window.close();

    // A page that finds kept results opens them, with the switch on. Start over clears the page and the device.
    const later = openPage({ before: (w) => w.localStorage.setItem(STORE_KEY, stored) });
    expect(later.state()).toBe('state-results');
    expect([later.$('results-line').textContent, later.$('keep').checked, later.$('said').textContent]).toEqual(['7 results from 2 learners. Nov 3 to Nov 19, 2026.', true, 'Opened the results kept on this device.']);
    later.$('start-over').click();
    expect(later.seen('start-over-ask')).toBe(true);
    later.$('start-over-no').click();
    expect([later.seen('start-over-ask'), later.state()]).toEqual([false, 'state-results']);
    later.$('start-over').click();
    later.$('start-over-yes').click();
    expect([later.state(), later.stored(), later.$('keep').checked, later.$('said').textContent]).toEqual(['state-empty', { local: 0, session: 0, cookie: '' }, false, 'The page is clear.']);
    later.dom.window.close();

    // Kept text that is not a bundle is thrown away, and the page starts empty.
    const broken = openPage({ before: (w) => w.localStorage.setItem(STORE_KEY, '{"kind":"something else"') });
    expect([broken.state(), broken.stored().local]).toEqual(['state-empty', 0]);
    broken.dom.window.close();
  });
});

describe('the page: files that are not what they seem', () => {
  it('lists files that are not results files with a plain reason, refuses a 5 MB file by its size, and shows markup as text', async () => {
    const page = openPage();
    const hostile = practice({ learner: '<img src=x onerror=alert(1)>', sid: 'h-1', title: '<script>alert(2)</script>' });
    const proto = practice({ learner: '__proto__', sid: '__proto__' });
    const files = [
      page.file('x'.repeat(5 * 1024 * 1024), 'huge.csv'), page.file('', 'empty.csv'), page.file('name,score\nAda,3\n', 'gradebook.csv'),
      page.file(JSON.stringify({ studentNickname: 'Ada', wordSoundsState: {} }), 'save.json'),
      page.file(csvOf(hostile), '<b>bold</b>.csv'), page.file(jsonOf(proto), 'proto.json'),
    ];
    expect(await page.drop(files)).toBe('6 files read, 4 need a look.');
    const rows = [...page.$('check-body').querySelectorAll('.check-list li')].map((item) => [...item.children].map((part) => part.textContent));
    expect(rows).toEqual([
      ['huge.csv', 'This file is larger than 2 MB. A results file is much smaller.'], ['empty.csv', 'This file is empty.'],
      ['gradebook.csv', 'This is not a results file from a practice file or a check.'],
      ['save.json', 'This is a save file from the AlloFlow app, not a results file from a practice file or a check.']]);
    page.$('show-results').click();
    expect(page.rows().map((row) => row[0])).toEqual(['<img src=x onerror=alert(1)>', '__proto__']);
    page.view('learner');
    page.learner('<img src=x onerror=alert(1)>');
    expect(page.$('learner-body').textContent).toContain('<img src=x onerror=alert(1)>');
    page.$('save-csv').click();
    expect(page.downloads[0].body).toContain('"<img src=x onerror=alert(1)>","2026-11-03"');
    expect(page.downloads[0].body).toContain('"<b>bold</b>.csv"');
    // Nothing from a file became an element, and nothing was reached.
    expect(page.d.querySelectorAll('main img, main script, main b, main iframe, main a').length).toBe(0);
    expect(page.d.querySelectorAll('script').length).toBe(3);
    expect(page.reached).toEqual([]);
    expect(({}).polluted).toBeUndefined();
    page.dom.window.close();
  });

  it('reads at most 500 files of one drop, and says how many were left out', async () => {
    const page = openPage();
    const files = Array.from({ length: 501 }, (_, i) => page.file('not a results file ' + i, 'note-' + i + '.txt')).concat([page.file(csvOf(A1), nameOf(A1))]);
    expect(await page.drop(files)).toBe('500 files read, 500 need a look.');
    expect(page.state()).toBe('state-check');
    expect(page.$('check-body').querySelectorAll('.check-list li')).toHaveLength(500);
    expect(page.$('check-body').querySelector('.note').textContent).toBe('Only the first 500 files of a drop are read, and the page holds 5000 results. Left out: 2.');
    expect(page.seen('show-results')).toBe(false);
    page.dom.window.close();
  });

  it('when nothing dropped is a results file, says so and offers to add other files', async () => {
    const page = openPage();
    expect(await page.drop([page.file('hello', 'notes.txt')])).toBe('1 file read, 1 needs a look.');
    expect(page.state()).toBe('state-check');
    expect(page.$('check-line').textContent).toBe('None of these files is a results file, so there is nothing to show yet.');
    expect([page.seen('show-results'), page.seen('check-more')]).toEqual([false, true]);
    // Something dragged that is not a file (a piece of text) is left to the browser.
    const event = new page.w.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['text/plain'], files: [] };
    page.$('main').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    // The file chooser reads files the same way.
    const input = page.$('files');
    Object.defineProperty(input, 'files', { configurable: true, value: [page.file(csvOf(A1), nameOf(A1))] });
    input.dispatchEvent(new page.w.Event('change', { bubbles: true }));
    await page.until(() => page.state() === 'state-results', 'the chosen file');
    expect(page.$('results-line').textContent).toBe('1 result from 1 learner. Nov 3, 2026.');
    page.dom.window.close();
  });
});
