// "Add take-home results" in Class Analytics, 2026-11-11.
// A learner saves one results file from a take-home practice file (CSV
// "alloflow-packet-result/1", or the take-home JSON, schemaVersion 1 to 3).
// The teacher drops the files; each becomes a Word Sounds session on the
// right student, dated the day it was finished, counted once.
// The fixtures are built here from the format's written rules, not from the
// code that saves the files.
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {React} from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const analytics = readFileSync(resolve('student_analytics_module.js'), 'utf8');
const cut = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw Error('not found: ' + start);
  return source.slice(a, b);
};
// The module's own functions, evaluated as they are written.
const AC = new Function(
  cut(analytics, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') +
  cut(analytics, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(') +
  '\nreturn {trim: _acTrimStudentData, persistable: _acPersistableStudent, summary: _acWsSessionSummary, bySkill: _acWsBySkill, recent: _acWsRecentSessions,' +
  ' wrongList: _acWsWrongList, sessionCsv: _acWsSessionCsv, reportHtml: _acWsReportTablesHtml, overTime: _acWsOverTime, activities: _AC_WS_ACTIVITIES,' +
  ' parseCsv: _acThParseCsv, readCsv: _acThReadCsv, readJson: _acThReadJson, readFile: _acThReadFile, session: _acThSession, stamp: _acThStamp,' +
  ' fnv: _acThFnv1a, sha: _acThSha256, match: _acThMatch, norm: _acThNorm, newName: _acThNewName, preview: _acThPreview, apply: _acThApply,' +
  ' remove: _acThRemove, ready: _acThReady, choose: _acThChoose, remember: _acThRemember, restoreLabels: _acThRestoreLabels, newStudent: _acThNewStudent,' +
  ' columns: _AC_TH_COLUMNS, labelKey: _acIdentityLinkKey, localDate: _acLocalDate};')();

// ── Fixtures, written from the format's rules ──
const COLUMNS = ['format', 'session_id', 'packet_id', 'packet_version', 'form', 'mode', 'learner', 'started_local', 'finished_local', 'duration_s',
  'item_n', 'item_id', 'activity', 'activity_title', 'scored', 'word', 'target', 'responses', 'correct', 'first_try', 'tries', 'time_ms', 'supports', 'flag'];
const TITLES = {isolation: 'Find Sounds', blending: 'Blend Sounds', rhyming: 'Rhyme Time', letter_tracing: 'Letter Trace', mapping: 'Sound Mapping'};
const quote = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const fnv1a = (text) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
};
// kind: first = right on the first try, retry = right on the second, miss = wrong twice.
const it4 = (activity, word, target, kind, wrong = []) => ({activity, word, target,
  responses: kind === 'first' ? [target] : kind === 'retry' ? [wrong[0] || 'x', target] : [wrong[0] || 'x', wrong[1] || 'y'],
  correct: kind !== 'miss', firstTry: kind === 'first', tries: kind === 'first' ? 1 : 2, ms: 2400, supports: {wordReplays: 1}, flag: ''});
const makeSession = (over = {}) => ({sid: 'b3f1c2f0-7a55-4d0e-9c0b-0d0f6d1e52aa', learner: 'Blue Heron', packetId: 'ws-short-vowels', version: '1.0.0', form: '', mode: 'practice',
  title: 'Short vowels practice', started: '2026-11-12T16:00:05-05:00', finished: '2026-11-12T16:05:05-05:00', durationMs: 300000,
  items: [it4('isolation', 'cat', 'k', 'first'), it4('isolation', 'dog', 'o', 'retry', ['d']), it4('isolation', 'bed', 'd', 'miss', ['b', 'e']),
    it4('blending', 'cup', 'cup', 'first'), it4('blending', 'bug', 'bug', 'first')], ...over});
const itemRows = (s) => s.items.map((it, i) => ['alloflow-packet-result/1', s.sid, s.packetId, s.version, s.form, s.mode, s.learner, s.started, s.finished,
  Math.round(s.durationMs / 1000), i + 1, it.activity + '-' + i, it.activity, TITLES[it.activity] || '', it.scored === false || it.activity === 'letter_tracing' ? 0 : 1,
  it.word, it.target, it.responses.join(' | '), it.correct ? 1 : 0, it.firstTry ? 1 : 0, it.tries, it.ms,
  Object.keys(it.supports).map((k) => k + ':' + it.supports[k]).join(';'), it.flag, ...(it.extra || [])]);
const integrityOf = (s, method) => {
  const text = [s.packetId, s.version, s.form, s.sid].join('|') + '\n' + itemRows(s).map((r) => r.map(quote).join(',')).join('\n');
  return method === 'fnv1a' ? fnv1a(text) : sha256(text);
};
const csvOf = (s, {method = 'sha256', integrity = true, extraHeader = [], extraTrailers = []} = {}) => {
  const rows = itemRows(s);
  const firstTry = s.items.filter((x) => x.firstTry).length, correct = s.items.filter((x) => x.correct).length;
  const lines = [COLUMNS.concat(extraHeader).map(quote).join(',')].concat(rows.map((r) => r.map(quote).join(',')));
  lines.push(['#summary', s.sid, 'items_given=' + rows.length, 'attempted=' + rows.length, 'correct=' + correct, 'first_try=' + firstTry, 'accuracy_pct=' + Math.round(correct / rows.length * 100)].map(quote).join(','));
  if (integrity) lines.push(['#integrity', method, integrityOf(s, method), 'detects accidental edits, not deliberate ones'].map(quote).join(','));
  extraTrailers.forEach((r) => lines.push(r.map(quote).join(',')));
  return String.fromCharCode(0xFEFF) + lines.join('\r\n') + '\r\n';
};
const jsonOf = (s, {method = 'sha256', integrity = true} = {}) => JSON.stringify({
  kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/3', lessonId: 'ws-lesson-1', revision: 'r1', lessonTitle: s.title,
  activityTitles: TITLES, sessionId: s.sid, packet: {id: s.packetId, version: s.version, engine: 'alloflow-packet/1', form: s.form, mode: s.mode},
  learner: s.learner, learnerName: s.learner, startedAt: '2026-11-12T21:00:05.000Z', finishedAt: '2026-11-12T21:05:05.000Z', startedLocal: s.started, finishedLocal: s.finished,
  durationMs: s.durationMs, timesAreFromTheLearnerDevice: true,
  items: s.items.map((it, i) => ({n: i + 1, itemId: it.activity + '-' + i, activity: it.activity, word: it.word, target: it.target, responses: it.responses,
    attempts: it.tries, firstTry: it.firstTry, correct: it.correct, done: true, supports: it.supports, practice: null, ms: it.ms, flag: it.flag})),
  summary: {itemsGiven: s.items.length, attempted: s.items.length},
  ...(integrity ? {integrity: {method, value: integrityOf(s, method)}} : {}),
});
const file = (text, name, lastModified = new Date(2026, 10, 20, 8).getTime()) => new File([text], name, {type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified});
const SAMPLE_V2 = readFileSync(resolve('tests/fixtures/take_home_result_schema2_sample.json'), 'utf8');
const stats = {quizAvg: 0, wsAccuracy: null, wsWordsCompleted: 0, wsBestStreak: 0, fluencyWCPM: 0, gamesPlayed: 0, totalActivities: 0, labelChallengeAvg: 0, adventureXP: 0};
const student = (id, name, wordSoundsState) => ({id, name, stats, safetyFlags: [], screeningHistory: [], data: wordSoundsState ? {wordSoundsState} : {}});
const make = (name, session) => AC.newStudent(name, session, stats, false);
const one = async (text, name = 'results.csv') => { const read = await AC.readFile(file(text, name)); expect(read.reason, name).toBe(''); return read.sessions[0]; };

describe('reading the CSV', () => {
  it('reads the file as it is saved: BOM, CRLF, every cell quoted', async () => {
    const s = await one(csvOf(makeSession()));
    expect([s.id, s.learner, s.title, s.date, s.dateFromFile, s.given, s.done, s.firstTryItems, s.firstTryCorrect, s.percent, s.integrity])
      .toEqual(['th:b3f1c2f0-7a55-4d0e-9c0b-0d0f6d1e52aa', 'Blue Heron', 'ws-short-vowels', '2026-11-12', false, 5, 5, 5, 3, 60, 'ok']);
    expect(s.acts).toEqual({isolation: {n: 3, g: 3, f: 3, fc: 1, c: 2}, blending: {n: 2, g: 2, f: 2, fc: 2, c: 2}});
    expect(s.wrong).toEqual({'dog\td': 1, 'bed\tb': 1, 'bed\te': 1});
  });
  it('reads quoted cells holding commas, line breaks and doubled quotes, with LF line ends', () => {
    expect(AC.parseCsv('a,"b, c","d\ne","say ""hi"""\n1,2,3,4\n')).toEqual([['a', 'b, c', 'd\ne', 'say "hi"'], ['1', '2', '3', '4']]);
    expect(AC.parseCsv(String.fromCharCode(0xFEFF) + '"x","y"\r\n"1",""\r\n\r\n')).toEqual([['x', 'y'], ['1', '']]);
    expect(AC.parseCsv('sep=;\r\na;b\r\n"1;2";3\r\n')).toEqual([['a', 'b'], ['1;2', '3']]);
    expect(AC.parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(AC.parseCsv('')).toEqual([]);
  });
  it('takes the leading apostrophe off cells that were guarded against formulas', async () => {
    const s = await one(csvOf(makeSession({learner: '=Blue Heron', items: [it4('blending', '-tion', '-tion', 'retry', ['+ing'])]})));
    expect(s.learner).toBe('=Blue Heron');
    expect(s.wrong).toEqual({'-tion\t+ing': 1});
    expect(s.integrity).toBe('ok');
  });
  it('reads a spreadsheet re-save: quotes gone, columns in another order, a column added', async () => {
    const session = makeSession();
    const rows = itemRows(session);
    const order = COLUMNS.map((_, i) => i).reverse();
    const lines = [order.map((i) => COLUMNS[i]).concat(['My notes']).join(';')]
      .concat(rows.map((r) => order.map((i) => String(r[i])).concat(['checked']).join(';')))
      .concat(['#summary;' + session.sid + ';items_given=5', '#integrity;sha256;' + integrityOf(session, 'sha256') + ';detects accidental edits, not deliberate ones']);
    const s = await one(lines.join('\n'), 'resaved.csv');
    expect([s.learner, s.date, s.done, s.percent]).toEqual(['Blue Heron', '2026-11-12', 5, 60]);
    expect(s.acts).toEqual({isolation: {n: 3, g: 3, f: 3, fc: 1, c: 2}, blending: {n: 2, g: 2, f: 2, fc: 2, c: 2}});
    // The teacher's added column is a change to the saved rows.
    expect(s.integrity).toBe('changed');
    const plain = [order.map((i) => COLUMNS[i]).join(',')].concat(rows.map((r) => order.map((i) => String(r[i])).join(',')))
      .concat(['#integrity,sha256,' + integrityOf(session, 'sha256')]);
    expect((await one(plain.join('\r\n'), 'reordered.csv')).integrity).toBe('ok');
  });
  it('reads rows with no header row, in the saved column order', async () => {
    const text = csvOf(makeSession()).split('\r\n').slice(1).join('\r\n');
    const s = await one(text, 'no-header.csv');
    expect([s.learner, s.done, s.integrity]).toEqual(['Blue Heron', 5, 'ok']);
  });
  it('reads a practice file with columns after "flag" and trailer rows it does not know', async () => {
    const session = makeSession({sid: 'later-1'});
    session.items.forEach((x, i) => { x.extra = [i + 3, 5]; });
    const text = csvOf(session, {extraHeader: ['digits_correct', 'digits_possible'],
      extraTrailers: [['#score', 'later-1', 'measure=math_dcpm', 'score=34', 'score_unit=digits_correct_per_minute'], ['#later', 'anything']]});
    const s = await one(text, 'later.csv');
    expect([s.id, s.done, s.percent, s.integrity, s.check]).toEqual(['th:later-1', 5, 60, 'ok', undefined]);
    expect(Object.keys(s.acts)).toEqual(['isolation', 'blending']);
  });
  // Real checks (math, mode "probe") are in tests/class_analytics_take_home_checks.test.js.
  it('a file in mode "probe" is a check, never Word Sounds practice: one this version does not know is not added', async () => {
    const session = makeSession({mode: 'probe', sid: 'probe-1'});
    session.items.forEach((x, i) => { x.extra = [i + 3, 5]; });
    const text = csvOf(session, {extraHeader: ['digits_correct', 'digits_possible'],
      extraTrailers: [['#score', 'probe-1', 'measure=math_dcpm', 'score=34', 'score_unit=digits_correct_per_minute']]});
    const read = await AC.readFile(file(text, 'probe.csv'));
    expect([read.sessions.length, read.reason]).toEqual([0, 'unknown_check']);
    // With no header row the two extra columns are still part of the saved row.
    const bare = await AC.readFile(file(text.split('\r\n').slice(1).join('\r\n'), 'probe-no-header.csv'));
    expect([bare.sessions.length, bare.reason]).toEqual([0, 'unknown_check']);
  });
  it('keeps two sessions apart when one file holds both', async () => {
    const a = csvOf(makeSession({sid: 'one'})).split('\r\n');
    const b = csvOf(makeSession({sid: 'two', finished: '2026-11-14T10:00:00-05:00'})).split('\r\n');
    const read = await AC.readFile(file(a.slice(0, 6).concat(b.slice(1, 6)).join('\r\n'), 'both.csv'));
    expect(read.sessions.map((s) => [s.id, s.date, s.done, s.integrity])).toEqual([['th:one', '2026-11-12', 5, 'absent'], ['th:two', '2026-11-14', 5, 'absent']]);
  });
});

describe('date of the work and name of the learner', () => {
  it('uses the day the learner finished, as their device wrote it', async () => {
    // 23:30 at UTC-5 is the next day in UTC; the record keeps the learner's day.
    const s = await one(csvOf(makeSession({started: '2026-11-12T23:20:00-05:00', finished: '2026-11-12T23:30:05-05:00'})));
    expect([s.date, s.dateFromFile]).toEqual(['2026-11-12', false]);
    const d = new Date(s.start);
    expect([d.getHours(), d.getMinutes()]).toEqual([23, 30]);
  });
  it('falls back to the start time, then to the date on the file, and says so', async () => {
    const started = await one(csvOf(makeSession({finished: ''})));
    expect([started.date, started.dateFromFile]).toEqual(['2026-11-12', false]);
    const mangled = await one(csvOf(makeSession({started: '11/12/2026 16:00', finished: 'not a date'})));
    expect([mangled.date, mangled.dateFromFile]).toEqual(['2026-11-20', true]);
    expect(AC.stamp('2026-02-31T10:00:00')).toBe(0);
    expect(AC.stamp('1999-01-01')).toBe(0);
    expect(AC.localDate(AC.stamp('2026-11-12'))).toBe('2026-11-12');
  });
  it('reads the name from the "learner" column, clipped to one line', async () => {
    const s = await one(csvOf(makeSession({learner: '  Blue \n Heron  ' + 'x'.repeat(200)})));
    expect(s.learner.startsWith('Blue Heron x')).toBe(true);
    expect(s.learner.length).toBe(60);
    expect((await one(csvOf(makeSession({learner: ''})))).learner).toBe('');
  });
});

describe('the edit check', () => {
  it('port of the take-home file hash gives the same values as the file itself', () => {
    const loader = readFileSync(resolve('word_sounds_take_home_loader.js'), 'utf8');
    const hashText = new Function(cut(loader, '  function hashText(text) {', '  function randomId() {') + '\nreturn hashText;')();
    ['', 'a', 'ws-short-vowels|1.0.0||abc\n"1","2"', 'ñandú 日本語 "quoted"', 'x'.repeat(5000)].forEach((text) => {
      expect(AC.fnv(text)).toBe(hashText(text));
      expect(AC.fnv(text)).toBe(fnv1a(text));
    });
  });
  it('SHA-256 is the standard one', async () => {
    expect(await AC.sha('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await AC.sha('ñ"1"\n')).toBe(sha256('ñ"1"\n'));
  });
  it('says ok, changed or absent, for both methods, and adds the file either way', async () => {
    const session = makeSession();
    expect((await one(csvOf(session, {method: 'fnv1a'}))).integrity).toBe('ok');
    expect((await one(csvOf(session, {integrity: false}))).integrity).toBe('absent');
    // A learner's score edited by hand: 0 becomes 1 in one row.
    const edited = csvOf(session).replace('"d | o","1","0","2"', '"d | o","1","1","2"');
    expect(edited).not.toBe(csvOf(session));
    const s = await one(edited);
    expect([s.integrity, s.firstTryCorrect, s.done]).toEqual(['changed', 4, 5]);
    expect((await one(csvOf(session, {method: 'fnv1a'}).replace('"Blue Heron"', '"Red Heron"'))).integrity).toBe('changed');
    const unknownMethod = csvOf(session).replace('"#integrity","sha256"', '"#integrity","md5"');
    expect((await one(unknownMethod)).integrity).toBe('unchecked');
  });
  it('checks a JSON file against the same rows', async () => {
    const session = makeSession({learner: '=Blue Heron'});
    expect((await one(jsonOf(session), 'r.json')).integrity).toBe('ok');
    expect((await one(jsonOf(session, {method: 'fnv1a'}), 'r.json')).integrity).toBe('ok');
    expect((await one(jsonOf(session, {integrity: false}), 'r.json')).integrity).toBe('absent');
    const data = JSON.parse(jsonOf(session));
    data.items[2].correct = true;
    const s = await one(JSON.stringify(data), 'r.json');
    expect([s.integrity, s.acts.isolation.c]).toEqual(['changed', 3]);
  });
});

describe('the take-home JSON', () => {
  it('reads schema 3 to the same session as its CSV', async () => {
    const session = makeSession();
    const fromJson = await one(jsonOf(session), 'r.json');
    const fromCsv = await one(csvOf(session));
    expect({...fromJson, title: ''}).toEqual({...fromCsv, title: ''});
    expect(fromJson.title).toBe('Short vowels practice');
  });
  it('reads a real schema 2 file saved before session ids, dates and the edit check existed', async () => {
    const s = await one(SAMPLE_V2, 'sample_results.json');
    const raw = JSON.parse(SAMPLE_V2);
    expect(s.id).toMatch(/^th:old-[0-9a-f]{8}$/);
    expect([s.learner, s.title, s.given, s.done, s.firstTryItems, s.firstTryCorrect, s.percent, s.integrity, s.dateFromFile])
      .toEqual(['Sample Student', 'Short vowels practice', 15, 15, 15, 13, 87, 'absent', false]);
    expect(s.date).toBe(AC.localDate(raw.finishedAt));
    expect(s.acts).toEqual({isolation: {n: 5, g: 5, f: 5, fc: 3, c: 4}, blending: {n: 5, g: 5, f: 5, fc: 5, c: 5}, counting: {n: 5, g: 5, f: 5, fc: 5, c: 5}});
    expect(s.wrong).toEqual({'dog\td': 1, 'bed\tb': 1, 'bed\te': 1});
    // The same file again is the same session.
    expect((await one(SAMPLE_V2, 'copy.json')).id).toBe(s.id);
  });
  it('reads schema 1 (Find Sounds only), a class mailbox copy, and leaves undone items out', async () => {
    const v1 = {kind: 'alloflow-take-home-result', schemaVersion: 1, lessonId: 'L', learnerName: 'Old Owl', startedAt: '2026-10-01T15:00:00.000Z',
      items: [{word: 'cat', target: 'k', responses: ['k'], attempts: 1, firstTry: true, correct: true, done: true}, {word: 'dog', target: 'd', responses: [], attempts: 0, done: false}]};
    const s = await one(JSON.stringify(v1), 'v1.json');
    expect([s.learner, s.given, s.done, s.acts]).toEqual(['Old Owl', 2, 1, {isolation: {n: 1, g: 1, f: 1, fc: 1, c: 1}}]);
    const wrapped = {kind: 'alloflow-take-home-submission', schemaVersion: 1, studentName: 'x', takeHomeResult: JSON.parse(SAMPLE_V2)};
    expect((await one(JSON.stringify(wrapped), 'submission.json')).done).toBe(15);
  });
  it('counts Letter Trace and practice items as items, never as graded', async () => {
    const data = JSON.parse(SAMPLE_V2);
    data.items = [{activity: 'letter_tracing', word: 'cat', responses: [], attempts: 0, done: true, practice: 'traced'},
      {activity: 'mapping', word: 'cat', target: 'c', responses: ['c'], attempts: 1, firstTry: true, correct: true, done: true, practice: null}];
    const s = await one(JSON.stringify(data), 'trace.json');
    expect(s.acts).toEqual({letter_tracing: {n: 1}, mapping: {n: 1, g: 1, f: 1, fc: 1, c: 1}});
    expect([s.firstTryItems, s.percent]).toEqual([1, 100]);
  });
});

describe('activities and skill strands', () => {
  it('every take-home activity is a dashboard activity with a skill strand', () => {
    const ids = readdirSync(resolve('word_sounds_take_home/adapters')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).concat(['isolation']);
    expect(ids.length).toBe(20);
    ids.forEach((id) => {
      expect(readFileSync(resolve('word_sounds_take_home' + (id === 'isolation' ? '_loader.js' : '/adapters/' + id + '.js')), 'utf8'), id).toContain("id: '" + id + "'");
      expect(AC.activities[id], id).toBeTruthy();
      expect(AC.activities[id][1], id).toMatch(/^[a-z_]+$/);
    });
    expect(Object.keys(AC.activities).sort()).toEqual(ids.sort());
  });
  it('an activity this version does not know is added under "Other activities"', async () => {
    const s = await one(csvOf(makeSession({items: [it4('future_game', 'cat', 'cat', 'first'), it4('constructor', 'dog', 'dog', 'first'), it4('__proto__', 'bed', 'bed', 'miss')]})));
    expect(s.acts).toEqual({future_game: {n: 1, g: 1, f: 1, fc: 1, c: 1}, unknown: {n: 1, g: 1, f: 1, fc: 1, c: 1}, proto: {n: 1, g: 1, f: 1}});
    const added = AC.apply([], [{session: s, name: 'Blue Heron'}], make).students[0];
    const skills = AC.bySkill(AC.summary(added.data.wordSoundsState));
    expect(skills.map((k) => [k.key, k.allItems, k.activities.map((a) => a.id)])).toEqual([['', 3, ['future_game', 'unknown', 'proto']]]);
  });
});

describe('matching a file to a student', () => {
  const names = ['Blue Heron', 'Swift Falcon', 'swift-falcon', 'Élan Fox'];
  it('exact name first, then the same name apart from case, spaces and punctuation', () => {
    expect(AC.match('Blue Heron', names, '')).toEqual({name: 'Blue Heron', how: 'exact'});
    expect(AC.match('  blueheron ', names, '')).toEqual({name: 'Blue Heron', how: 'close'});
    expect(AC.match('BLUE-HERON.', names, '')).toEqual({name: 'Blue Heron', how: 'close'});
    expect(AC.match('élan  fox', names, '')).toEqual({name: 'Élan Fox', how: 'close'});
    expect(AC.norm('Blue_Heron 7!')).toBe('blueheron7');
  });
  it('never guesses between two close students, or from an empty name', () => {
    expect(AC.match('SwiftFalcon', names, '')).toEqual({name: '', how: 'several'});
    expect(AC.match('Blue Heron 2', names, '')).toEqual({name: '', how: 'none'});
    expect(AC.match('', names, '')).toEqual({name: '', how: 'no_label'});
    expect(AC.match('!!!', names, '')).toEqual({name: '', how: 'none'});
  });
  it("uses the teacher's earlier choice for the same label, while that student is still there", () => {
    expect(AC.match('BH', names, 'Blue Heron')).toEqual({name: 'Blue Heron', how: 'remembered'});
    expect(AC.match('BH', names, 'Gone Student')).toEqual({name: '', how: 'none'});
    expect(AC.match('BH', names, '+new')).toEqual({name: '+new', how: 'remembered'});
    expect(AC.match('SwiftFalcon', names, 'swift-falcon')).toEqual({name: 'swift-falcon', how: 'remembered'});
  });
  it('remembers a choice by a fingerprint of the label, not the label', async () => {
    const preview = await AC.preview([file(csvOf(makeSession({learner: 'BH'})), 'a.csv')], [student('s1', 'Blue Heron', null)], null, {});
    expect([preview.rows[0].match.how, preview.rows[0].choice, AC.ready(preview.rows[0])]).toEqual(['none', '', false]);
    const chosen = AC.choose(preview.rows, preview.rows[0].key, 'Blue Heron');
    expect(AC.ready(chosen[0])).toBe(true);
    const labels = AC.remember({}, chosen);
    expect(Object.keys(labels)).toEqual([await AC.labelKey('BH')]);
    expect(JSON.stringify(labels)).not.toContain('BH');
    expect(AC.restoreLabels(JSON.stringify(labels))).toEqual(labels);
    expect(AC.restoreLabels('{"plain name":"x","__proto__":"y"}')).toEqual({});
    const later = await AC.preview([file(csvOf(makeSession({learner: 'bh', sid: 'later'})), 'b.csv')], [student('s1', 'Blue Heron', null)], null, labels);
    expect([later.rows[0].match, later.rows[0].choice]).toEqual([{name: 'Blue Heron', how: 'remembered'}, 'Blue Heron']);
  });
  it('one choice fills the other files that carry the same label', async () => {
    const files = [file(csvOf(makeSession({learner: 'BH', sid: 'a'})), 'a.csv'), file(csvOf(makeSession({learner: 'BH', sid: 'b'})), 'b.csv'), file(csvOf(makeSession({learner: 'Other', sid: 'c'})), 'c.csv')];
    const preview = await AC.preview(files, [student('s1', 'Blue Heron', null)], {students: {'Red Panda': {}}}, {});
    expect(preview.names).toEqual(['Blue Heron', 'Red Panda']);
    expect(AC.choose(preview.rows, preview.rows[0].key, '+new').map((r) => r.choice)).toEqual(['+new', '+new', '']);
  });
});

describe('adding the sessions', () => {
  const falcon = () => student('s1', 'Swift Falcon', {history: [
    {timestamp: new Date(2026, 10, 3, 9).getTime(), sessionId: 'sA', activity: 'blending', word: 'cat', correct: true, firstTry: true},
    {timestamp: new Date(2026, 10, 3, 9, 1).getTime(), sessionId: 'sA', activity: 'blending', word: 'dog', correct: false, firstTry: false, wrong: ['dig']}]});
  it('the same session as CSV and as JSON, and the same file dropped again, is added once', async () => {
    const session = makeSession({learner: 'Swift Falcon'});
    const files = () => [file(csvOf(session), 'falcon.csv'), file(jsonOf(session), 'falcon.json')];
    const preview = await AC.preview(files(), [falcon()], null, {});
    expect(preview.rows.map((r) => [r.file, r.status, r.match.how, AC.ready(r)])).toEqual([['falcon.csv', 'new', 'exact', true], ['falcon.json', 'repeat', 'exact', false]]);
    // Even if both rows were sent, only one is added.
    const result = AC.apply([falcon()], preview.rows.map((r) => ({session: r.session, name: r.choice})), make);
    expect([result.added, result.created, result.studentCount, result.students.length]).toEqual([1, 0, 1, 1]);
    const again = await AC.preview(files(), result.students, null, {});
    expect(again.rows.map((r) => r.status)).toEqual(['added', 'added']);
    expect(AC.apply(result.students, again.rows.map((r) => ({session: r.session, name: 'Swift Falcon'})), make).added).toBe(0);
    // On another student too: a session belongs to one student.
    expect(AC.apply(result.students, [{session: preview.rows[0].session, name: 'Someone Else'}], make).added).toBe(0);
  });
  it("joins the student's own sessions: by skill, recent sessions, wrong answers, marked as take-home", async () => {
    const s = await one(csvOf(makeSession({learner: 'Swift Falcon'})));
    const added = AC.apply([falcon()], [{session: s, name: 'Swift Falcon'}], make).students[0];
    const summary = AC.summary(added.data.wordSoundsState);
    expect(summary.sessions.map((x) => [x.id, x.n, x.src || 'app', x.pk || '', x.ig || ''])).toEqual([['s:sA', 1, 'app', '', ''], ['th:' + makeSession().sid, 2, 'th', 'ws-short-vowels', 'ok']]);
    expect(AC.bySkill(summary).map((k) => [k.key, k.allItems, k.firstTryItems, k.firstTryCorrect, k.percent])).toEqual([['hearing_sounds', 7, 7, 4, 57]]);
    expect(AC.recent(summary).map((x) => [x.date, x.takeHome, x.packet, x.percent, x.edited])).toEqual([['2026-11-12', true, 'ws-short-vowels', 60, false], ['2026-11-03', false, '', 50, false]]);
    expect(AC.wrongList(summary, 9)).toEqual([{word: 'bed', picked: 'b', count: 1}, {word: 'bed', picked: 'e', count: 1}, {word: 'dog', picked: 'd', count: 1}, {word: 'dog', picked: 'dig', count: 1}]);
    // Reading it again, and saving it with the student, counts nothing twice.
    const kept = AC.persistable(added);
    expect(AC.summary(kept.data.wordSoundsState)).toEqual(summary);
    expect(AC.summary(JSON.parse(JSON.stringify(kept)).data.wordSoundsState)).toEqual(summary);
    // The saved rows from the app still add only once after a take-home session.
    expect(AC.summary({...added.data.wordSoundsState}).sessions[0].acts.blending).toEqual({n: 2, g: 2, f: 2, fc: 1, c: 1});
  });
  it('the sessions CSV says where each row came from and carries the day it was finished', async () => {
    const s = await one(csvOf(makeSession({learner: 'Swift Falcon'})));
    const added = AC.apply([falcon()], [{session: s, name: 'Swift Falcon'}], make).students;
    const rows = AC.sessionCsv(added).rows;
    expect(rows[0][rows[0].length - 1]).toBe('Source');
    expect(rows.slice(1).map((r) => [r[0], r[1], r[3], r[5], r[8], r[r.length - 1]])).toEqual([
      ['Swift Falcon', '2026-11-03', 'Blend Sounds', 2, 50, 'In app'],
      ['Swift Falcon', '2026-11-12', 'Find Sounds', 3, 33, 'Take-home file'],
      ['Swift Falcon', '2026-11-12', 'Blend Sounds', 2, 100, 'Take-home file']]);
  });
  it('a learner with only take-home files gets a student row', async () => {
    const s = await one(csvOf(makeSession()));
    const result = AC.apply([falcon()], [{session: s, name: 'Blue Heron'}], make);
    expect([result.created, result.students.map((x) => x.name)]).toEqual([1, ['Swift Falcon', 'Blue Heron']]);
    const row = result.students[1];
    expect([row.stats, row.safetyFlags, row.linkedToRoster, row.lastSession.slice(0, 4)]).toEqual([stats, [], false, '2026']);
    expect(AC.bySkill(AC.summary(AC.persistable(row).data.wordSoundsState))[0].allItems).toBe(5);
  });
  it('removing a student\'s take-home results leaves their work in the app as it was', async () => {
    const before = AC.summary(falcon().data.wordSoundsState);
    const s = await one(csvOf(makeSession({learner: 'Swift Falcon'})));
    const added = AC.apply([falcon()], [{session: s, name: 'Swift Falcon'}], make).students[0];
    const removed = AC.summary(AC.remove(added).data.wordSoundsState);
    expect(removed.sessions).toEqual(before.sessions);
    expect(removed.wrong).toEqual(before.wrong);
    // The file can be added again afterwards.
    expect(AC.apply([AC.remove(added)], [{session: s, name: 'Swift Falcon'}], make).added).toBe(1);
  });
});

describe('over time', () => {
  it('two dates give one row per date and one column per skill strand', async () => {
    const first = await one(csvOf(makeSession({sid: 'd1', started: '2026-11-05T17:00:00-05:00', finished: '2026-11-05T17:06:00-05:00',
      items: [it4('isolation', 'cat', 'k', 'miss', ['t', 'a']), it4('isolation', 'dog', 'd', 'first'), it4('rhyming', 'hat', 'cat', 'first')]})));
    const second = await one(jsonOf(makeSession({sid: 'd2'})), 'second.json');
    let students = AC.apply([], [{session: second, name: 'Blue Heron'}], make).students;
    expect(AC.overTime(AC.summary(students[0].data.wordSoundsState)).rows).toHaveLength(1);
    students = AC.apply(students, [{session: first, name: 'Blue Heron'}], make).students;
    expect(students).toHaveLength(1);
    const over = AC.overTime(AC.summary(students[0].data.wordSoundsState));
    expect(over.strands).toEqual(['syllables_rhyme', 'hearing_sounds']);
    expect(over.rows.map((r) => [r.date, r.where, r.cells.syllables_rhyme && [r.cells.syllables_rhyme.percent, r.cells.syllables_rhyme.firstTryItems],
      [r.cells.hearing_sounds.percent, r.cells.hearing_sounds.firstTryCorrect, r.cells.hearing_sounds.firstTryItems]])).toEqual([
      ['2026-11-05', 'th', [100, 1], [50, 1, 2]],
      ['2026-11-12', 'th', null, [60, 3, 5]]]);
    const html = AC.reportHtml(null, students[0].data.wordSoundsState);
    expect(html).toContain('Word Sounds over time');
    expect(html).toContain('2026-11-12 · Take-home');
    expect(html).toContain('60% (3 of 5)');
  });
  it('says when a day mixes work in the app with a take-home file', async () => {
    const day = new Date(2026, 10, 12, 9).getTime();
    const inApp = student('s1', 'Blue Heron', {history: [{timestamp: day, sessionId: 'sA', activity: 'blending', word: 'cat', correct: true, firstTry: true},
      {timestamp: new Date(2026, 10, 1, 9).getTime(), sessionId: 's0', activity: 'blending', word: 'cat', correct: false, firstTry: false}]});
    const s = await one(csvOf(makeSession()));
    const students = AC.apply([inApp], [{session: s, name: 'Blue Heron'}], make).students;
    expect(AC.overTime(AC.summary(students[0].data.wordSoundsState)).rows.map((r) => [r.date, r.where, r.cells.hearing_sounds.firstTryItems])).toEqual([['2026-11-01', 'app', 1], ['2026-11-12', 'both', 6]]);
  });
});

describe('files that are not take-home results', () => {
  const reasonOf = async (text, name) => (await AC.readFile(file(text, name))).reason;
  it('gives a plain reason and never throws', async () => {
    expect(await reasonOf('', 'empty.csv')).toBe('empty');
    expect(await reasonOf('Student,Date\r\nA,B\r\n', 'other.csv')).toBe('not_results');
    expect(await reasonOf('{"hello": 1}', 'other.json')).toBe('not_results');
    expect(await reasonOf('{broken', 'broken.json')).toBe('not_results');
    expect(await reasonOf('[1,2,3]', 'list.json')).toBe('not_results');
    expect(await reasonOf('null', 'null.csv')).toBe('not_results');
    expect(await reasonOf('<!DOCTYPE html><html><body>practice</body></html>', 'packet.html')).toBe('web_page');
    expect(await reasonOf(JSON.stringify({studentNickname: 'Blue Heron', wordSoundsState: {history: []}}), 'save.json')).toBe('save_file');
    expect(await reasonOf(JSON.stringify({kind: 'alloflow-take-home-result', schemaVersion: 9, items: []}), 'new.json')).toBe('newer');
    expect(await reasonOf(JSON.stringify({kind: 'alloflow-take-home-result', schemaVersion: 2, items: 'x'}), 'bad.json')).toBe('no_items');
    expect(await reasonOf(JSON.stringify({kind: 'alloflow-take-home-result', schemaVersion: 2, items: [{}, null, 7]}), 'blank.json')).toBe('nothing_done');
    expect(await reasonOf(csvOf(makeSession()).replace(/alloflow-packet-result\/1/g, 'alloflow-packet-result/2'), 'v2.csv')).toBe('newer');
    expect((await AC.readFile(null)).reason).toBe('too_big');
    expect((await AC.readFile({name: 'x.csv', size: 10, text: () => Promise.reject(Error('gone'))})).reason).toBe('unreadable');
  });
  it('does not read a 5 MB file at all', async () => {
    const text = vi.fn(() => Promise.resolve('x'));
    const read = await AC.readFile({name: 'junk.csv', size: 5 * 1024 * 1024, text});
    expect([read.reason, read.sessions, text.mock.calls.length]).toEqual(['too_big', [], 0]);
    // A wrong size on the file does not let 5 MB of junk through either.
    const big = 'junk,'.repeat(1024 * 1024 + 10);
    expect((await AC.readFile({name: 'liar.csv', size: 10, text: () => Promise.resolve(big)})).reason).toBe('too_big');
  });
  it('hostile cells stay text: object keys, formulas and HTML', async () => {
    const hostile = makeSession({learner: '__proto__', packetId: '<img src=x onerror=alert(1)>', sid: 'constructor',
      items: [it4('isolation', '__proto__', 'k', 'miss', ['constructor', '=HYPERLINK("http://x")']), it4('toString', '<b>cat</b>', 'cat', 'first')]});
    const s = await one(csvOf(hostile));
    expect([s.learner, s.title, s.id, s.integrity]).toEqual(['__proto__', '<img src=x onerror=alert(1)>', 'th:constructor', 'ok']);
    expect(Object.keys(s.acts)).toEqual(['isolation', 'tostring']);
    expect(Object.keys(s.wrong)).toEqual(['__proto__\tconstructor', '__proto__\t=HYPERLINK("http://x")']);
    expect(AC.newName('__proto__')).toBe('Learner __proto__');
    expect(AC.newName('constructor')).toBe('Learner constructor');
    expect(AC.newName('Blue Heron')).toBe('Blue Heron');
    const preview = await AC.preview([file(csvOf(hostile), 'h.csv'), file(jsonOf(hostile), 'h.json')], [student('s1', 'Swift Falcon', null)], {students: {}}, {});
    expect(preview.rows.map((r) => [r.status, r.match.how, r.choice])).toEqual([['new', 'none', ''], ['repeat', 'none', '']]);
    const result = AC.apply([student('s1', 'Swift Falcon', null)], [{session: s, name: AC.newName(s.learner)}], make);
    expect(result.students.map((x) => x.name)).toEqual(['Swift Falcon', 'Learner __proto__']);
    expect(({}).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'isolation')).toBe(false);
    const html = AC.reportHtml(null, result.students[1].data.wordSoundsState);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    // The class CSV keeps formula text as text.
    const csvRow = AC.sessionCsv(result.students).rows[1];
    expect(csvRow[0]).toBe('Learner __proto__');
    const json = JSON.parse(jsonOf(hostile));
    json.sessionId = {toString: 'x'}; json.learner = ['a']; json.items[0].responses = [{}, null, 5, '<i>'];
    json.items.push('text', {activity: {a: 1}, word: 7, correct: 'yes', done: true});
    const odd = await one(JSON.stringify(json), 'odd.json');
    expect(odd.learner).toBe('__proto__');
    expect(odd.id).toMatch(/^th:old-/);
  });
});

// ── Class Analytics, mounted ──
describe('Class Analytics: Add take-home results', () => {
  const STORE_KEY = 'alloflow_ac_imported_students';
  const LABEL_KEY = 'alloflow_ac_take_home_labels_v1';
  let Panel, root, host, toast;
  const textOf = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const settle = async () => { await act(async () => { await new Promise((done) => setTimeout(done, 60)); }); };
  const press = async (button) => { expect(button, 'button').toBeTruthy(); await act(async () => { button.click(); await Promise.resolve(); }); await settle(); };
  const mount = async (students, props = {}) => {
    if (students) localStorage.setItem(STORE_KEY, JSON.stringify(students));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    toast = vi.fn();
    await act(async () => {
      root.render(React.createElement(Panel, {isOpen: true, onClose: vi.fn(), theme: 'light', t: (k) => k, loadProbeBanks: () => Promise.resolve(), addToast: toast,
        interventionLogs: {}, probeHistory: {}, rtiGoals: {}, externalCBMScores: {}, ...props}));
      await Promise.resolve();
    });
  };
  const unmount = async () => { if (root) await act(async () => root.unmount()); if (host) host.remove(); root = null; host = null; };
  const choose = async (files) => {
    const input = document.body.querySelector('input[data-th-input]');
    expect(input, 'file input').toBeTruthy();
    Object.defineProperty(input, 'files', {value: files, configurable: true});
    await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); await Promise.resolve(); });
    await settle();
  };
  const previewRows = () => [...document.body.querySelectorAll('[data-th-preview] tbody tr')];
  const stored = () => JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  const thSessions = (row) => ((row.data && row.data.wordSoundsState && row.data.wordSoundsState.wsSessions && row.data.wordSoundsState.wsSessions.sessions) || []).filter((s) => s.src === 'th');
  const falconRow = () => student('s1', 'Swift Falcon', {history: [{timestamp: new Date(2026, 10, 3, 9).getTime(), sessionId: 'sA', activity: 'blending', word: 'cat', correct: true, firstTry: true}]});

  beforeAll(() => {
    globalThis.React = window.React = React;
    globalThis.X = window.X = () => null;
    window.ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    new Function(analytics)();
    Panel = window.AlloModules.StudentAnalytics;
    if (!Panel) throw Error('StudentAnalytics did not register');
  });
  afterEach(async () => { await unmount(); localStorage.clear(); vi.restoreAllMocks(); });

  it('has one control beside the import button: a button, a multi-file picker and a place to drop files', async () => {
    await mount([falconRow()]);
    const drop = document.body.querySelector('[data-th-drop]');
    expect([...drop.children].slice(1).map(textOf)).toEqual(['Add take-home results', 'or drop the files here']);
    const input = drop.querySelector('input[type="file"]');
    expect([input.multiple, input.accept]).toEqual([true, '.csv,.json,text/csv,application/json']);
    expect(drop.querySelector('button[data-th-add]').type).toBe('button');
    expect(document.body.querySelector('[data-th-preview]')).toBeNull();
  });

  it('shows what the files hold before anything is added, then adds them on "Add all"', async () => {
    await mount([falconRow()]);
    const heron1 = makeSession({sid: 'h1', started: '2026-11-05T17:00:00-05:00', finished: '2026-11-05T17:06:00-05:00'});
    const heron2 = makeSession({sid: 'h2'});
    const falcon = makeSession({sid: 'f1', learner: 'swift falcon', packetId: '<img src=x onerror=alert(1)>'});
    const edited = csvOf(falcon).replace('"d | o","1","0","2"', '"d | o","1","1","2"');
    await choose([file(csvOf(heron1), 'heron-nov5.csv'), file(jsonOf(heron2), 'heron-nov12.json'), file(csvOf(heron2), 'heron-nov12.csv'), file(edited, 'falcon.csv'),
      file('Student,Date\r\nA,B\r\n', 'grades.csv'), file(JSON.stringify({studentNickname: 'Old Owl', wordSoundsState: {history: []}}), 'owl-save.json'), file(SAMPLE_V2, 'sample.json', 0)]);
    const panel = document.body.querySelector('[data-th-preview]');
    expect(panel.querySelector('h3').textContent).toBe('Take-home results to add');
    expect([...panel.querySelectorAll('thead th')].map((th) => [th.getAttribute('scope'), th.textContent])).toEqual([['col', 'File'], ['col', 'Name in the file'], ['col', 'Lesson'],
      ['col', 'Date finished'], ['col', 'Items'], ['col', 'Right on the first try'], ['col', 'Status'], ['col', 'Add to'], ['col', 'Skip']]);
    const cells = previewRows().map((tr) => [...tr.children].slice(0, 7).map(textOf));
    expect(cells[0]).toEqual(['heron-nov5.csv', 'Blue Heron', 'ws-short-vowels', '2026-11-05', '5', '60% (3 of 5)', 'NewNot edited since it was saved']);
    expect(cells[1]).toEqual(['heron-nov12.json', 'Blue Heron', 'Short vowels practice', '2026-11-12', '5', '60% (3 of 5)', 'NewNot edited since it was saved']);
    expect(cells[2][6]).toBe('Same results as another file hereNot edited since it was saved');
    expect(cells[3]).toEqual(['falcon.csv', 'swift falcon', '<img src=x onerror=alert(1)>', '2026-11-12', '5', '80% (4 of 5)', 'New⚠ Edited after it was saved. The numbers are from the file as it is now.']);
    expect(cells[4].slice(0, 2).concat(cells[4][6])).toEqual(['sample.json', 'Sample Student', 'NewThis file has no edit check']);
    expect(panel.querySelector('img')).toBeNull();
    expect(previewRows().map((tr) => [tr.getAttribute('data-th-row'), tr.getAttribute('data-th-check')])).toEqual([['new', 'ok'], ['new', 'ok'], ['repeat', 'ok'], ['new', 'changed'], ['new', 'absent']]);
    // Who each file goes to: the close match is filled in, the others wait for the teacher.
    const selects = [...panel.querySelectorAll('select[data-th-choice]')];
    expect(selects.map((sel) => sel.value)).toEqual(['', '', 'Swift Falcon', '']);
    expect(textOf(selects[2].closest('td'))).toContain('Close match. Check it is the right student.');
    expect([...selects[0].options].map((o) => o.textContent)).toEqual(['Choose a student', 'New student: Blue Heron', 'Swift Falcon']);
    expect([...panel.querySelectorAll('[data-th-others] li')].map((li) => [li.getAttribute('data-th-reason'), textOf(li)])).toEqual([
      ['not_results', 'grades.csv: This is not a take-home results file.'], ['save_file', 'owl-save.json: This is a student save file, not take-home results.']]);
    expect(textOf(panel.querySelector('[data-th-save-files]'))).toBe('Import these as student save files (1)');
    expect(textOf(panel.querySelector('[data-th-waiting]'))).toBe('Choose a student for 3 more, or skip them.');
    expect(textOf(panel.querySelector('[data-th-add-all]'))).toBe('Add all (1)');
    // Nothing is stored yet.
    expect(stored().flatMap(thSessions)).toEqual([]);

    // One choice for "Blue Heron" fills both of that learner's files; the sample is skipped.
    await act(async () => { selects[0].value = '+new'; selects[0].dispatchEvent(new Event('change', {bubbles: true})); });
    expect([...panel.querySelectorAll('select[data-th-choice]')].map((sel) => sel.value)).toEqual(['+new', '+new', 'Swift Falcon', '']);
    await act(async () => { panel.querySelectorAll('input[data-th-skip]')[3].click(); });
    expect(panel.querySelector('[data-th-waiting]')).toBeNull();
    expect(textOf(panel.querySelector('[data-th-add-all]'))).toBe('Add all (3)');
    await press(panel.querySelector('[data-th-add-all]'));
    expect(textOf(panel.querySelector('[role="status"]'))).toBe("Take-home results added: 3. Students with new results: 2. They are kept on this device with the students' other records.");
    expect(toast).toHaveBeenLastCalledWith('Take-home results added: 3.', 'success');
    expect(previewRows().map((tr) => tr.getAttribute('data-th-row'))).toEqual(['added', 'added', 'repeat', 'added', 'new']);

    // Kept on this device, with the student.
    const rows = stored();
    expect(rows.map((r) => [r.name, thSessions(r).map((s) => [s.id, s.ig, new Date(s.start).getDate()])])).toEqual([
      ['Swift Falcon', [['th:f1', 'changed', 12]]], ['Blue Heron', [['th:h1', 'ok', 5], ['th:h2', 'ok', 12]]]]);
    expect(Object.values(JSON.parse(localStorage.getItem(LABEL_KEY))).sort()).toEqual(['+new', 'Swift Falcon']);
    // Review groups and the accuracy tile are not changed by take-home work.
    expect(rows[0].stats.wsAccuracy).toBe(null);

    // The new student has a row; their detail shows the tables, the marker and "over time".
    await press(panel.querySelector('[data-th-close]'));
    expect(document.body.querySelector('[data-th-preview]')).toBeNull();
    await press(document.body.querySelector('button[aria-label="View details for Blue Heron"]'));
    const recent = document.body.querySelector('table[data-ws-recent-sessions]');
    expect([...recent.querySelectorAll('tbody tr')].map((tr) => textOf(tr.children[0]))).toEqual(['2026-11-12Take-home', '2026-11-05Take-home']);
    expect([...document.body.querySelectorAll('table[data-ws-by-skill] tbody tr')].map((tr) => [...tr.children].map(textOf))[0]).toEqual(['Hearing sounds', '10', '60% (6 of 10)']);
    const over = document.body.querySelector('table[data-ws-over-time]');
    expect(over.querySelector('caption').textContent).toBe('Word Sounds over time');
    expect([...over.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Date', 'Where', 'Hearing sounds']);
    expect([...over.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(textOf))).toEqual([['2026-11-05', 'Take-home', '60% (3 of 5)'], ['2026-11-12', 'Take-home', '60% (3 of 5)']]);
    expect([...document.body.querySelectorAll('[data-ws-wrong-answers] li')].map(textOf)).toContain("bed: picked 'b' 2 times");

    // The next visit still has them, and the same files are known.
    await unmount();
    await mount(null);
    await choose([file(csvOf(heron1), 'heron-nov5-again.csv'), file(csvOf(makeSession({sid: 'f2', learner: 'SWIFT FALCON', finished: '2026-11-19T16:00:00-05:00'})), 'falcon-nov19.csv')]);
    expect(previewRows().map((tr) => [tr.getAttribute('data-th-row'), textOf(tr.children[6])])).toEqual([['added', 'Already addedNot edited since it was saved'], ['new', 'NewNot edited since it was saved']]);
    const later = document.body.querySelector('[data-th-preview] select[data-th-choice]');
    expect(later.value).toBe('Swift Falcon');
    await press(document.body.querySelector('[data-th-add-all]'));
    expect(stored().map((r) => [r.name, thSessions(r).length])).toEqual([['Swift Falcon', 2], ['Blue Heron', 2]]);

    // Remove one student's take-home results.
    await press(document.body.querySelector('[data-th-close]'));
    await press(document.body.querySelector('button[aria-label="View details for Blue Heron"]'));
    const answer = async (label) => {
      await press(document.body.querySelector('button[data-th-remove]'));
      const dialog = document.body.querySelector('[role="alertdialog"]');
      expect(textOf(dialog)).toContain("Remove every take-home result added for Blue Heron? The student's other records stay.");
      await press([...dialog.querySelectorAll('button')].find((b) => b.textContent === label));
    };
    await answer('Cancel');
    expect(stored().map((r) => thSessions(r).length)).toEqual([2, 2]);
    await answer('Remove');
    expect(stored().map((r) => [r.name, thSessions(r).length])).toEqual([['Swift Falcon', 2], ['Blue Heron', 0]]);
    expect(document.body.querySelector('table[data-ws-over-time]')).toBeNull();
  });

  it('takes files dropped on the control, and flags a date that came from the file', async () => {
    await mount([falconRow()]);
    const noDates = csvOf(makeSession({learner: 'Swift Falcon', started: '', finished: ''}));
    const drop = document.body.querySelector('[data-th-drop]');
    const over = new Event('dragover', {bubbles: true, cancelable: true});
    drop.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    const event = new Event('drop', {bubbles: true, cancelable: true});
    event.dataTransfer = {files: [file(noDates, 'falcon.csv', new Date(2026, 10, 20, 8).getTime())]};
    await act(async () => { drop.dispatchEvent(event); await Promise.resolve(); });
    await settle();
    expect(event.defaultPrevented).toBe(true);
    const row = previewRows()[0];
    expect(textOf(row.children[3])).toBe('2026-11-20⚠ Date from the file, not from the results');
    expect(document.body.querySelector('[data-th-preview] select[data-th-choice]').value).toBe('Swift Falcon');
    await press(document.body.querySelector('[data-th-add-all]'));
    expect(thSessions(stored()[0]).map((s) => [s.df, AC.localDate(s.start)])).toEqual([[1, '2026-11-20']]);
  });
});
