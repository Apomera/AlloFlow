// @vitest-environment jsdom
// Take-home checks in Class Analytics, 2026-11-11.
// A check is a math measure done at home in one file (packet mode "probe"): Math Fluency, Missing Number,
// Quantity Discrimination, or a teacher's own problem set. The teacher drops its results file on
// "Add take-home results"; the result is kept where the app keeps that measure, in the same shape, marked
// home: true, and is never used for a benchmark, review group, risk level, growth rate or aimline.
// The Assessment Center and the Math Fluency setup can also SAVE a check as a file for home.
// Every results file here is a real one: a file built by the app's own code, played in jsdom, saved.
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {loadAlloModule} from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(md, 'react'));
const {createRoot} = require(resolve(md, 'react-dom/client'));
const {act} = require(resolve(md, 'react-dom/test-utils'));
const {renderToStaticMarkup} = require(resolve(md, 'react-dom/server'));
const analytics = readFileSync(resolve('student_analytics_module.js'), 'utf8');
const loaderSource = readFileSync(resolve('word_sounds_take_home_loader.js'), 'utf8');
const builderSource = readFileSync(resolve('packet_check_builder.js'), 'utf8');
const BANK = JSON.parse(readFileSync(resolve('psychometric_math_probes.json'), 'utf8'));
const FIXTURES = resolve('tests/fixtures/take_home_checks');
const cut = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw Error('not found: ' + start);
  return source.slice(a, b);
};
// The module's own functions, evaluated as they are written.
const AC = new Function(
  cut(analytics, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') +
  cut(analytics, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(') +
  '\nreturn {readFile: _acThReadFile, preview: _acThPreview, apply: _acThApply, remove: _acThRemove, ready: _acThReady, newStudent: _acThNewStudent, sessionIds: _acThSessionIds,' +
  ' persistable: _acPersistableStudent, record: _acCkRecord, supervised: _acCkSupervised, overTime: _acCkOverTime, card: _acCkOverTimeCard, panel: _acThPreviewPanel,' +
  ' notes: _acCkNotes, scoreText: _acCkScoreText, groupName: _acCkGroupName, removeFromStore: _acCkRemoveFromProbeStore, addToStore: _acCkAddToProbeStore,' +
  ' libs: _acCkLibs, buildForm: _acCkBuildForm, buildCustom: _acCkBuildCustom, fileLabels: _acCkFileLabels, reasonText: _acThReasonText};')();

// The two scripts the app fetches with window.__alloLoadPlugin.
const loadLoader = () => new Function(loaderSource)();
const loadBuilder = () => new Function(builderSource)();
loadLoader(); loadBuilder();
const TH = window.AlloWordSoundsTakeHome;
const PC = window.AlloPacketChecks;

const settle = (ms = 60) => new Promise((done) => setTimeout(done, ms));
const file = (text, name, lastModified = new Date(2026, 10, 20, 8).getTime()) => new File([text], name, {type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified});
const expected = (p) => p.answer != null ? Number(p.answer) : p.left != null ? Math.max(p.left, p.right)
  : p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : Math.trunc(p.a / p.b);

// Plays a built check file as a learner would and returns the two files they can save.
// miss / skip: 0-based numbers among the scored items. stopAfter: press "Stop the check" after that many.
// The learner's clock is the test's: 09:14:05 on 2026-11-12, five hours behind UTC, moved by `days`.
async function play(html, lesson, {learner = 'BlueHeron7', miss = [], skip = [], stopAfter = null, secondsPerItem = 3, days = 0, hide = 0} = {}) {
  const saved = [];
  const clock = {t: 1000, wall: Date.parse('2026-11-12T14:14:05Z') + days * 86400000, hidden: false};
  const dom = new JSDOM(html, {runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/check.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    Object.defineProperty(w.performance, 'now', {configurable: true, value: () => clock.t});
    const RealDate = w.Date;
    w.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(clock.wall); } static now() { return clock.wall; } };
    Object.defineProperty(w.document, 'hidden', {configurable: true, get: () => !!clock.hidden});
    Object.defineProperty(w.crypto, 'subtle', {configurable: true, value: webcrypto.subtle});
    w.TextEncoder = TextEncoder;
  }});
  const w = dom.window, d = w.document;
  const tick = (ms) => { clock.t += ms; clock.wall += ms; };
  const press = (key) => d.querySelector('[data-key="' + key + '"]').click();
  const answer = (raw, wrong) => {
    const want = expected(raw);
    if (raw.left != null) d.querySelector('[data-choice="' + (wrong ? Math.min(raw.left, raw.right) : want) + '"]').click();
    else { String(wrong ? want + 1 : want).split('').forEach((ch) => press(ch === '-' ? 'minus' : ch)); press('next'); }
  };
  const items = lesson.blocks[0].items;
  d.getElementById('learner-name').value = learner;
  d.querySelector('#app button.primary').click();
  for (const raw of items.filter((it) => it.practice)) { tick(1500); answer(raw, false); d.querySelector('[data-practice-next]').click(); }
  d.querySelector('[data-check-begin]').click();
  let n = 0;
  for (const raw of items.filter((it) => !it.practice)) {
    if ((stopAfter != null && n >= stopAfter) || !d.querySelector('[data-stop]')) break;
    tick(secondsPerItem * 1000);
    // The learner looks at another tab for `hide` seconds before the second item.
    if (hide && n === 1) { clock.hidden = true; d.dispatchEvent(new w.Event('visibilitychange')); tick(hide * 1000); clock.hidden = false; d.dispatchEvent(new w.Event('visibilitychange')); }
    if (skip.includes(n)) d.querySelector('[data-skip]').click(); else answer(raw, miss.includes(n));
    n++;
  }
  if (stopAfter != null && d.querySelector('[data-stop]')) {
    d.querySelector('[data-stop]').click();
    d.querySelector('[data-stop-yes]').click();
  } else if (d.querySelector('[data-stop]')) { tick(400000); d.dispatchEvent(new w.Event('visibilitychange')); }
  await settle(300);
  d.querySelector('[data-save-csv]').click();
  const csv = saved[saved.length - 1];
  d.querySelector('[data-save-json]').click();
  const json = saved[saved.length - 1];
  const out = {csv: csv.body, csvName: csv.name, json: json.body, jsonName: json.name, heading: d.querySelector('#app h2').textContent, text: d.getElementById('app').textContent};
  w.close();
  return out;
}
const read = async (text, name) => { const got = await AC.readFile(file(text, name)); expect(got.reason, name).toBe(''); return got.sessions[0]; };
const stats = {quizAvg: 0, wsAccuracy: null, wsWordsCompleted: 0, wsBestStreak: 0, fluencyWCPM: 0, gamesPlayed: 0, totalActivities: 0, labelChallengeAvg: 0, adventureXP: 0};
const student = (id, name, extra = {}) => ({id, name, stats, safetyFlags: [], screeningHistory: [], data: {}, ...extra});
const make = (name, session) => AC.newStudent(name, session, stats, false);

// One real played file of each kind, made once.
const LESSONS = {
  qd: PC.lessonFromMathForm({bank: BANK, measure: 'quantity_discrimination', grade: 'K', form: 'A'}),
  mn: PC.lessonFromMathForm({bank: BANK, measure: 'missing_number', grade: '1', form: 'A'}),
  mc: PC.lessonFromMathForm({bank: BANK, measure: 'math_computation', grade: '3', form: 'A'}),
  own: PC.lessonFromMathProblems({title: 'Facts to 20', problems: PC.parseProblems('7+8,12-5,6x4,20/4,9+9,15-7,3x3,18/2'), timeLimitS: 120}),
  calm: PC.lessonFromMathProblems({title: 'No clock', problems: PC.parseProblems('7+8,12-5,6x4'), timeLimitS: null}),
};
const HOW = {qd: {miss: [3, 11], secondsPerItem: 2}, mn: {miss: [4], skip: [9], secondsPerItem: 6}, mc: {miss: [2, 7], skip: [5], secondsPerItem: 4},
  own: {miss: [1], secondsPerItem: 5}, calm: {miss: [1], secondsPerItem: 5}};
const PLAYED = {};
beforeAll(async () => {
  for (const id of Object.keys(LESSONS)) PLAYED[id] = await play(PC.buildCheckPacket({lesson: LESSONS[id], loader: TH}).html, LESSONS[id], HOW[id]);
  PLAYED.stopped = await play(PC.buildCheckPacket({lesson: LESSONS.mc, loader: TH}).html, LESSONS.mc, {stopAfter: 4, secondsPerItem: 4, days: 1});
  PLAYED.fast = await play(PC.buildCheckPacket({lesson: LESSONS.own, loader: TH}).html, LESSONS.own, {secondsPerItem: 1, days: 2});
  PLAYED.away = await play(PC.buildCheckPacket({lesson: LESSONS.qd, loader: TH}).html, LESSONS.qd, {secondsPerItem: 1, days: 3, hide: 5});
}, 120000);

describe('reading a check file', () => {
  it.each([
    ['qd', 'quantity_discrimination', 23, 'items_correct', 'K', 'A', 'complete'],
    ['mn', 'missing_number', 17, 'items_correct', '1', 'A', 'time'],
    ['mc', 'math_dcpm', 21, 'digits_correct_per_minute', '3', 'A', 'complete'],
    ['own', 'math_dcpm', 15, 'digits_correct_per_minute', '', 'custom', 'complete'],
    ['calm', 'math_items', 2, 'items_correct', '', 'custom', 'complete'],
  ])('%s: the CSV and the JSON a learner saved read as the same check, not edited', async (id, measure, score, unit, grade, form, completion) => {
    const csv = await read(PLAYED[id].csv, PLAYED[id].csvName);
    const json = await read(PLAYED[id].json, PLAYED[id].jsonName);
    for (const s of [csv, json]) {
      expect(s.integrity).toBe('ok');
      expect([s.check.measure, s.check.score, s.check.unit, s.check.grade, s.check.form, s.check.completion, s.check.noScore]).toEqual([measure, score, unit, grade, form, completion, '']);
      expect([s.date, s.dateFromFile, s.learner]).toEqual(['2026-11-12', false, 'BlueHeron7']);
      // A check is never a Word Sounds session.
      expect([s.acts, s.wrong, s.percent]).toEqual([{}, {}, null]);
    }
    expect(json.id).toBe(csv.id);
    // The title too: the CSV carries it in its summary row, the JSON as lessonTitle.
    expect(json.check).toEqual(csv.check);
    expect([csv.title, json.title]).toEqual([LESSONS[id].title, LESSONS[id].title]);
    expect(PLAYED[id].csv).toContain('"attempt=1","title=' + LESSONS[id].title + '"\r\n');
  });
  it('reads the four saved sample files as they were saved on 11 November', async () => {
    const got = {};
    for (const name of ['quantity-discrimination-gK-A__results.csv', 'missing-number-g1-A__results.csv', 'math-computation-g3-A_code2468__results.csv', 'custom-facts-to-20__results.csv']) {
      const text = readFileSync(resolve(FIXTURES, name), 'utf8');
      // Saved before the title was added to the summary row: these files have none.
      expect(text).not.toContain('title=');
      const s = await read(text, name);
      got[name.split('__')[0]] = [s.integrity, s.check.measure, s.check.score, s.check.correct, s.check.attempted, s.check.given, s.check.prorated, s.title];
    }
    // Still "not edited", and named as before: a fixed form by its packet id, a teacher's own set by the start of its file name.
    expect(got).toEqual({
      'quantity-discrimination-gK-A': ['ok', 'quantity_discrimination', 23, 23, 25, 25, false, 'quantity-discrimination-gk'],
      'missing-number-g1-A': ['ok', 'missing_number', 17, 17, 19, 25, false, 'missing-number-g1'],
      'math-computation-g3-A_code2468': ['ok', 'math_dcpm', 21, 22, 25, 25, true, 'math-computation-g3'],
      'custom-facts-to-20': ['ok', 'math_dcpm', 15, 7, 8, 8, true, 'custom facts to 20'],
    });
  });
  it('reads a check CSV whose header row was deleted: the two digit columns are still read and still checked', async () => {
    const s = await read(PLAYED.mc.csv.split('\r\n').slice(1).join('\r\n'), 'no-header.csv');
    expect([s.integrity, s.check.measure, s.check.score, s.check.digitsCorrect, s.check.digitsPossible]).toEqual(['ok', 'math_dcpm', 21, 35, 38]);
  });
  it('a check JSON whose answers were changed after saving reads as edited', async () => {
    const data = JSON.parse(PLAYED.mc.json);
    data.items[3].digitsCorrect = 9;
    expect((await read(JSON.stringify(data), 'edited.json')).integrity).toBe('changed');
  });
  it('makes the score again from the answers: a changed score line does not change the score', async () => {
    const text = PLAYED.mc.csv.replace('"score=21"', '"score=99"');
    expect(text).not.toBe(PLAYED.mc.csv);
    const s = await read(text, 'score-line.csv');
    expect([s.integrity, s.check.score, s.check.recounted, s.check.stated]).toEqual(['ok', 21, true, 99]);
    expect(AC.notes((k) => k, s.check)).toContain('The file gave 99 as the score. The score shown is worked out from the answers in the file.');
  });
  it('a custom set takes its title from the file; a CSV saved before the title was there, from the name it was saved under', async () => {
    expect(PLAYED.own.csvName).toBe('Facts-to-20__BlueHeron7__2026-11-12.csv');
    expect((await read(PLAYED.own.csv, PLAYED.own.csvName)).check.title).toBe('Facts to 20');
    expect((await read(PLAYED.own.json, PLAYED.own.jsonName)).check.title).toBe('Facts to 20');
    // The title is in the file now, so a renamed CSV keeps it.
    expect((await read(PLAYED.own.csv, 'renamed.csv')).check.title).toBe('Facts to 20');
    // Before 2026-11-11 the summary row ended at the try number. Such a file reads as it always did, and is still "not edited".
    const older = PLAYED.own.csv.replace(',"title=Facts to 20"', '');
    expect(older).not.toBe(PLAYED.own.csv);
    const named = await read(older, PLAYED.own.csvName), renamed = await read(older, 'renamed.csv');
    expect([named.check.title, named.integrity]).toEqual(['Facts to 20', 'ok']);
    expect([renamed.check.title, renamed.integrity]).toEqual([LESSONS.own.lessonId, 'ok']);
  });
  it('a check of a kind this version does not know is not added, with a plain reason', async () => {
    const text = PLAYED.qd.csv.replace('"measure=quantity_discrimination"', '"measure=letter_names"');
    const got = await AC.readFile(file(text, 'other.csv'));
    expect([got.sessions.length, got.reason]).toEqual([0, 'unknown_check']);
    expect(AC.reasonText((k) => k, 'unknown_check')).toBe('This is a check of a kind this version cannot add. Update AlloFlow to add it.');
  });
});

describe('what the teacher sees before adding', () => {
  const t = (k) => k;
  const table = (preview) => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(AC.panel(React.createElement, t, {busy: false, done: null, ...preview}, {onFiles() {}, onChoice() {}, onSkip() {}, onAddAll() {}, onClose() {}}));
    return host;
  };
  const cells = (row) => [...row.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim());
  it('shows the name of the check, its form, and the score with its unit', async () => {
    const preview = await AC.preview([file(PLAYED.mc.csv, PLAYED.mc.csvName), file(PLAYED.mn.json, PLAYED.mn.jsonName), file(PLAYED.own.json, PLAYED.own.jsonName), file(PLAYED.calm.csv, PLAYED.calm.csvName)],
      [student('s1', 'BlueHeron7')], null, {}, {});
    const host = table(preview);
    expect([...host.querySelectorAll('thead th')].map((th) => th.textContent)[5]).toBe('Right on the first try, or score');
    const rows = [...host.querySelectorAll('tbody tr')].map(cells);
    expect(rows.map((r) => [r[2], r[4], r[5]])).toEqual([
      ['Math FluencyGrade 3, Form A', '25', '21 digits correct per minute'],
      ['Missing NumberGrade 1, Form A', '19 of 25 done', '17 items correct (19 tried)'],
      ['Facts to 20 (your own problems)Math Fluency', '8', '15 digits correct per minute'],
      ['No clock (your own problems)Math Fluency', '3', '2 items correct (3 tried)'],
    ]);
    expect(rows[0][6]).toBe('NewNot edited since it was savedEvery problem was finished early, so the rate uses the time taken.');
    expect(preview.rows.map((r) => [r.status, r.skip, r.choice])).toEqual([['new', false, 'BlueHeron7'], ['new', false, 'BlueHeron7'], ['new', false, 'BlueHeron7'], ['new', false, 'BlueHeron7']]);
    expect(host.querySelector('[data-th-ck-hint]').textContent).toBe('A check done at home is kept with the student and marked Take-home. It is for seeing progress: it is never used for benchmarks, review groups or risk levels.');
  });
  it('a check that was stopped early says so and is skipped unless the teacher asks for it', async () => {
    const preview = await AC.preview([file(PLAYED.stopped.csv, PLAYED.stopped.csvName)], [student('s1', 'BlueHeron7')], null, {}, {});
    const row = preview.rows[0];
    expect([row.status, row.skip, row.session.check.noScore, row.session.check.score, AC.ready(row)]).toEqual(['new', true, 'ended_early', null, false]);
    const host = table(preview);
    expect(host.querySelector('[data-th-ck-score]').textContent).toBe('No score: the check was stopped before the end.');
    expect(host.querySelector('[data-th-ck-skipped]').textContent).toBe('It has no score, so it is skipped. Clear Skip to add it anyway.');
    expect(host.querySelector('input[data-th-skip]').hasAttribute('checked')).toBe(true);
    expect(host.querySelector('button[data-th-add-all]').textContent).toBe('Add all (0)');
  });
  it('a timed set finished in under 20 seconds, and a file with no score line, have no score either', async () => {
    const fast = await read(PLAYED.fast.csv, PLAYED.fast.csvName);
    expect([fast.check.noScore, fast.check.score, fast.check.elapsedSeconds]).toEqual(['too_fast', null, 8]);
    expect(AC.scoreText((k) => k, fast.check)).toBe('No score: every problem was finished in under 20 seconds, which is too fast to give a rate.');
    const lines = PLAYED.mn.csv.split('\r\n').filter((line) => !line.startsWith('"#score"'));
    const bare = await read(lines.join('\r\n'), 'no-score-line.csv');
    expect([bare.integrity, bare.check.measure, bare.check.noScore, bare.check.correct]).toEqual(['ok', 'missing_number', 'no_score_line', 17]);
    expect(AC.scoreText((k) => k, bare.check)).toBe('No score: the score line is missing from the file.');
  });
  it('says in plain words when the learner left the page, the clock was set back or the page was reloaded', async () => {
    const away = await read(PLAYED.away.json, PLAYED.away.jsonName);
    expect([away.check.flags, away.check.hiddenSeconds, away.check.noScore]).toEqual([['left_the_page'], 5, '']);
    expect(AC.notes((k) => k, away.check)).toEqual(['The learner left the page for more than 3 seconds.']);
    const text = PLAYED.qd.csv.replace('"flags="', '"flags=clock_changed;reloaded;left_the_page"').replace('"attempt=1","flags', '"attempt=2","flags');
    const all = await read(text, 'flags.csv');
    expect(AC.notes((k) => k, all.check)).toEqual(['The clock on the device was set back during the check.', 'The page was reloaded during the check.',
      'The learner left the page for more than 3 seconds.', 'Try 2 of this check on that device.']);
    const host = table(await AC.preview([file(text, 'flags.csv')], [], null, {}, {}));
    expect([...host.querySelectorAll('[data-th-ck-note]')].map((n) => n.textContent)[0]).toBe('⚠ The clock on the device was set back during the check.');
  });
});

describe('where a check result is kept', () => {
  const sessionsOf = async (ids) => { const out = []; for (const id of ids) out.push(await read(PLAYED[id].csv, PLAYED[id].csvName)); return out; };
  it('Missing Number and Quantity Discrimination join the student\'s screening results, in the shape the app writes', async () => {
    const [qd, mn] = await sessionsOf(['qd', 'mn']);
    const result = AC.apply([student('s1', 'BlueHeron7')], [{session: qd, name: 'BlueHeron7'}, {session: mn, name: 'BlueHeron7'}], make, {});
    expect([result.added, result.created, result.probeAdds.length]).toEqual([2, 0, 0]);
    const kept = result.students[0].screeningHistory;
    // saveNumeracyResult writes {student, type, date, correct, total, accuracy, grade, form, formVersion}.
    expect(kept.map((r) => [r.student, r.type, r.correct, r.total, r.accuracy, r.grade, r.form, r.formVersion])).toEqual([
      ['BlueHeron7', 'quantity_discrimination', 23, 25, 92, 'K', 'A', 2], ['BlueHeron7', 'missing_number', 17, 19, 89, '1', 'A', 2]]);
    expect(kept[1]).toMatchObject({source: 'take_home_file', home: true, sessionId: mn.id.slice(3), packetId: 'missing-number-g1', form: 'A', completion: 'time',
      hiddenSeconds: 0, flags: [], attempt: 1, integrity: 'ok'});
    expect(new Date(kept[1].date).getTime()).toBe(new Date(2026, 10, 12, 9, 16, 6).getTime());
    // It is kept with the student between visits.
    expect(AC.persistable(result.students[0]).screeningHistory).toEqual(kept);
  });
  it('Math Fluency goes to probe history, in the shape the Math Fluency panel writes', async () => {
    const [mc] = await sessionsOf(['mc']);
    const result = AC.apply([student('s1', 'BlueHeron7')], [{session: mc, name: 'BlueHeron7'}], make, {});
    expect(result.students[0].screeningHistory).toEqual([]);
    expect(result.probeAdds).toHaveLength(1);
    const {name, record} = result.probeAdds[0];
    expect(name).toBe('BlueHeron7');
    // activity, grade, form, formVersion, scoringVersion, prorated, elapsedSeconds, dcpm, itemsPerMin, correct, total, accuracy, date, timestamp, source.
    expect(Object.keys(record).slice(0, 15)).toEqual(['activity', 'grade', 'form', 'formVersion', 'scoringVersion', 'prorated', 'elapsedSeconds', 'dcpm', 'itemsPerMin', 'correct', 'total', 'accuracy', 'date', 'timestamp', 'source']);
    expect(record).toMatchObject({activity: 'math_dcpm', grade: '3', form: 'A', formVersion: 2, scoringVersion: 3, prorated: true, elapsedSeconds: 100, dcpm: 21, itemsPerMin: 21,
      correct: 22, total: 25, accuracy: 88, source: 'take_home_file', home: true, sessionId: mc.id.slice(3), packetId: 'math-computation-g3', completion: 'complete', hiddenSeconds: 0,
      flags: [], attempt: 1, integrity: 'ok'});
  });
  it('a learner with only a check file gets a student row', async () => {
    const [mc, qd] = await sessionsOf(['mc', 'qd']);
    const result = AC.apply([], [{session: mc, name: 'BlueHeron7'}, {session: qd, name: 'BlueHeron7'}], make, {});
    expect([result.students.length, result.created, result.added, result.studentCount]).toEqual([1, 1, 2, 1]);
    expect(result.students[0].screeningHistory.map((r) => r.type)).toEqual(['quantity_discrimination']);
  });
  it('the same check as CSV and as JSON, and the same file dropped again, is counted once', async () => {
    const drop = [file(PLAYED.mc.csv, PLAYED.mc.csvName), file(PLAYED.mc.json, PLAYED.mc.jsonName), file(PLAYED.qd.json, PLAYED.qd.jsonName), file(PLAYED.qd.csv, PLAYED.qd.csvName)];
    const first = await AC.preview(drop, [student('s1', 'BlueHeron7')], null, {}, {});
    expect(first.rows.map((r) => r.status)).toEqual(['new', 'repeat', 'new', 'repeat']);
    // Even when every row is sent, the session id decides.
    const result = AC.apply([student('s1', 'BlueHeron7')], first.rows.map((r) => ({session: r.session, name: 'BlueHeron7'})), make, {});
    expect([result.added, result.probeAdds.length, result.students[0].screeningHistory.length]).toEqual([2, 1, 1]);
    const probe = {BlueHeron7: [result.probeAdds[0].record]};
    const again = await AC.preview(drop, result.students, null, {}, probe);
    expect(again.rows.map((r) => r.status)).toEqual(['added', 'added', 'added', 'added']);
    const second = AC.apply(result.students, again.rows.map((r) => ({session: r.session, name: 'BlueHeron7'})), make, probe);
    expect([second.added, second.probeAdds.length, second.students[0].screeningHistory.length]).toEqual([0, 0, 1]);
    // A math result kept under ANOTHER student still counts as added.
    expect((await AC.preview([drop[0]], [], null, {}, {Someone: probe.BlueHeron7})).rows[0].status).toBe('added');
  });
  it('a teacher\'s own problem set is kept under its title, apart from the fixed forms', async () => {
    const [own, calm] = await sessionsOf(['own', 'calm']);
    const result = AC.apply([student('s1', 'BlueHeron7')], [{session: own, name: 'BlueHeron7'}, {session: calm, name: 'BlueHeron7'}], make, {});
    expect(result.probeAdds.map((a) => [a.record.activity, a.record.measure, a.record.title, a.record.form, a.record.packetId, a.record.dcpm, a.record.correct, a.record.home])).toEqual([
      ['math_custom', 'math_dcpm', 'Facts to 20', 'custom', LESSONS.own.lessonId, 15, 7, true],
      ['math_custom', 'math_items', 'No clock', 'custom', LESSONS.calm.lessonId, null, 2, true]]);
  });
  it('a check with no score that the teacher adds anyway is kept as "no score"', async () => {
    const stopped = await read(PLAYED.stopped.json, PLAYED.stopped.jsonName);
    const {record} = AC.apply([student('s1', 'BlueHeron7')], [{session: stopped, name: 'BlueHeron7'}], make, {}).probeAdds[0];
    expect([record.dcpm, record.itemsPerMin, record.noScore, record.completion, record.correct, record.total]).toEqual([null, null, 'ended_early', 'ended_early', 4, 4]);
  });
});

// Records as the app itself writes them, given by a teacher.
const SUPERVISED_MATH = (day, dcpm) => ({activity: 'math_dcpm', grade: '3', form: 'A', formVersion: 2, scoringVersion: 3, prorated: false, elapsedSeconds: 120, dcpm, itemsPerMin: dcpm,
  correct: 20, total: 22, accuracy: 91, date: new Date(2026, 10, day, 10).toISOString(), timestamp: new Date(2026, 10, day, 10).getTime(), source: 'math_fluency_probe'});
const SUPERVISED_MN = (day, correct) => ({student: 'BlueHeron7', type: 'missing_number', date: new Date(2026, 10, day, 10).toISOString(), correct, total: correct + 2,
  accuracy: Math.round(correct / (correct + 2) * 100), grade: '1', form: 'A', formVersion: 2});

describe('a take-home result is shown, marked, and never compared', () => {
  let home, row;
  beforeAll(async () => {
    const sessions = [];
    for (const id of ['mc', 'mn', 'own', 'stopped']) sessions.push(await read(PLAYED[id].json, PLAYED[id].jsonName));
    const result = AC.apply([student('s1', 'BlueHeron7', {screeningHistory: [SUPERVISED_MN(3, 12), SUPERVISED_MN(17, 15)]})], sessions.map((session) => ({session, name: 'BlueHeron7'})), make, {});
    row = result.students[0];
    home = result.probeAdds.map((a) => a.record);
  });
  it('probe history as the calculations read it has no results from home', () => {
    const all = {BlueHeron7: [SUPERVISED_MATH(3, 30), ...home, SUPERVISED_MATH(17, 34)], Other: [SUPERVISED_MATH(4, 12)]};
    const seen = AC.supervised(all);
    expect(seen.BlueHeron7.map((r) => r.dcpm)).toEqual([30, 34]);
    expect(seen.Other).toBe(all.Other);
    expect(all.BlueHeron7).toHaveLength(5);
    // Nothing from home: the same object, so nothing re-renders for it.
    const plain = {BlueHeron7: [SUPERVISED_MATH(3, 30)]};
    expect(AC.supervised(plain)).toBe(plain);
    expect(AC.supervised(undefined)).toBe(undefined);
  });
  it('one table per measure lists the results given in the app and the ones from home in date order, each marked', () => {
    const all = {BlueHeron7: [SUPERVISED_MATH(17, 34), ...home, SUPERVISED_MATH(3, 30)]};
    const groups = AC.overTime(row, all);
    expect(groups.map((g) => [g.key, g.rows.map((r) => [r.date, r.where, r.score])])).toEqual([
      ['math_dcpm', [['2026-11-03', 'app', 30], ['2026-11-12', 'th', 21], ['2026-11-13', 'th', null], ['2026-11-17', 'app', 34]]],
      ['custom:' + LESSONS.own.lessonId + ':digits_correct_per_minute', [['2026-11-12', 'th', 15]]],
      ['missing_number', [['2026-11-03', 'app', 12], ['2026-11-12', 'th', 17], ['2026-11-17', 'app', 15]]],
    ]);
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(AC.card(React.createElement, (k) => k, row, all, {onRemoveTakeHome() {}}));
    expect(host.querySelector('h4').textContent).toBe('Math checks over time');
    const tables = [...host.querySelectorAll('table[data-ck-over-time]')];
    expect(tables.map((tb) => tb.querySelector('caption').textContent)).toEqual(['Math Fluency', 'Facts to 20 (your own problems)', 'Missing Number']);
    expect([...tables[0].querySelectorAll('thead th')].map((th) => [th.textContent, th.getAttribute('scope')])).toEqual([['Date', 'col'], ['Where', 'col'], ['Form', 'col'], ['Score', 'col'], ['Notes', 'col']]);
    expect([...tables[0].querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent))).toEqual([
      ['2026-11-03', 'In the app', 'Grade 3, Form A', '30 digits correct per minute', '–'],
      ['2026-11-12', 'Take-home', 'Grade 3, Form A', '21 digits correct per minute', 'Every problem was finished early, so the rate uses the time taken.'],
      ['2026-11-13', 'Take-home', 'Grade 3, Form A', 'No score: the check was stopped before the end.', '–'],
      ['2026-11-17', 'In the app', 'Grade 3, Form A', '34 digits correct per minute', '–'],
    ]);
    expect(tables[0].querySelector('tbody th').getAttribute('scope')).toBe('row');
    expect([...tables[2].querySelectorAll('tbody tr')].map((tr) => [tr.children[1].textContent, tr.children[3].textContent])).toEqual([
      ['In the app', '12 items correct (14 tried)'], ['Take-home', '17 items correct (19 tried)'], ['In the app', '15 items correct (17 tried)']]);
    // No average, no arrow, no colour meaning: text only.
    expect(host.textContent).not.toMatch(/average|trend|↑|↓|benchmark%|percentile/i);
  });
  it('a teacher\'s own set is listed under its title and compared with nothing', () => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(AC.card(React.createElement, (k) => k, row, {BlueHeron7: [SUPERVISED_MATH(3, 30), ...home]}, {}));
    const own = host.querySelector('[data-ck-group^="custom:"]');
    expect(own.querySelector('h5').textContent).toBe('Facts to 20 (your own problems)');
    expect(own.querySelector('[data-ck-custom-note]').textContent).toBe('Your own problem set. It is not compared with any other check.');
    // Its rows are only its own tries: the fixed-form result of the same day is in another table.
    expect([...own.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent))).toEqual([['2026-11-12', 'Take-home', '15 digits correct per minute', 'Every problem was finished early, so the rate uses the time taken.']]);
    expect([...own.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Date', 'Where', 'Score', 'Notes']);
  });
  it('a student with no result from home gets no new table', () => {
    expect(AC.overTime(student('s2', 'Swift Falcon', {screeningHistory: [SUPERVISED_MN(3, 12), SUPERVISED_MN(17, 15)]}), {'Swift Falcon': [SUPERVISED_MATH(3, 30), SUPERVISED_MATH(17, 34)]})).toEqual([]);
    expect(AC.card(React.createElement, (k) => k, student('s2', 'Swift Falcon'), {}, {})).toBeNull();
  });
  it('"Remove this student\'s take-home results" takes the check results off the row and out of probe history', () => {
    const cleaned = AC.remove(row);
    expect(cleaned.screeningHistory).toEqual([SUPERVISED_MN(3, 12), SUPERVISED_MN(17, 15)]);
    localStorage.setItem('alloflow_probe_history', JSON.stringify({BlueHeron7: [SUPERVISED_MATH(3, 30), ...home], OnlyHome: [home[0]], Other: [SUPERVISED_MATH(4, 12)]}));
    const heard = vi.fn();
    window.addEventListener('alloflow:study-bundle-imported', heard);
    expect(AC.removeFromStore(['BlueHeron7', 'BlueHeron7', 'OnlyHome'])).toBe(home.length + 1);
    window.removeEventListener('alloflow:study-bundle-imported', heard);
    expect(JSON.parse(localStorage.getItem('alloflow_probe_history'))).toEqual({BlueHeron7: [SUPERVISED_MATH(3, 30)], Other: [SUPERVISED_MATH(4, 12)]});
    expect(heard).toHaveBeenCalledTimes(1);
    // Nothing to take out: nothing is written and the host is not asked to read again.
    expect(AC.removeFromStore(['Other'])).toBe(0);
    localStorage.clear();
  });
});

// ── The calculations that must never see a result from home ──
describe('the Assessment Center query surface leaves results from home out', () => {
  let meta;
  const HOME_MATH = {...SUPERVISED_MATH(20, 99), source: 'take_home_file', home: true, sessionId: 'h1'};
  const HOME_ORF = {activity: 'orf', wcpm: 10, itemsPerMin: 10, correct: 10, grade: '2', timestamp: new Date(2026, 10, 21, 10).getTime(), date: new Date(2026, 10, 21, 10).toISOString(), home: true, source: 'take_home_file', sessionId: 'h2'};
  const ORF = (day, wcpm) => ({activity: 'orf', wcpm, itemsPerMin: wcpm, correct: wcpm, grade: '2', timestamp: new Date(2026, 10, day, 10).getTime(), date: new Date(2026, 10, day, 10).toISOString()});
  beforeAll(() => {
    globalThis.React = window.React = React;
    globalThis.X = window.X = () => null;
    window.ReactDOM = require(resolve(md, 'react-dom'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    new Function(analytics)();
    meta = window.AlloModules.StudentAnalytics._meta;
  });
  const store = () => localStorage.setItem('alloflow_probe_history', JSON.stringify({BlueHeron7: [SUPERVISED_MATH(3, 30), ORF(4, 60), ORF(18, 70), HOME_MATH, HOME_ORF]}));
  afterEach(() => localStorage.clear());
  it('the probe history other tools read', () => {
    store();
    expect(meta.getStudentProbeHistory('BlueHeron7').map((r) => r.dcpm || r.wcpm)).toEqual([30, 60, 70]);
    expect(meta.getStudentTakeHomeResults('BlueHeron7').map((r) => r.sessionId)).toEqual(['h1', 'h2']);
  });
  it('the screening summary: the latest result of a measure is the latest one a teacher gave', () => {
    store();
    const summary = meta.getScreeningSummary('BlueHeron7');
    expect([summary.probeCount, summary.byActivity.math_dcpm.dcpm, summary.byActivity.orf.wcpm]).toEqual([3, 30, 70]);
  });
  it('the review tier', async () => {
    store();
    await mountPanel();
    const tier = meta.getRTITier('BlueHeron7');
    expect(tier.perProbe.map((p) => [p.activity, p.score])).toEqual([['math_dcpm', 30], ['orf', 70]]);
    await unmountPanel();
  });
  it('the trend series behind the progress-monitoring line', () => {
    store();
    expect(meta.getTrendSeries('BlueHeron7').map((s) => [s.activity, s.points.map((p) => p.value)])).toEqual([['math_dcpm', [30]], ['orf', [60, 70]]]);
  });
  it('the Report Writer export: data points, latest results and the trend', () => {
    store();
    const out = meta.buildReportWriterExport('BlueHeron7', {emit: false});
    expect(out.probeHistory).toHaveLength(3);
    expect(out.prePopulatedSections['Progress Monitoring & Goal Progress']).toMatch(/^3 progress-monitoring data points on file across math_dcpm, orf\./);
    expect(JSON.stringify(out)).not.toMatch(/"dcpm":99|take_home_file/);
  });
  it('the reference comparison itself refuses a result from home', async () => {
    await mountPanel();
    // A record with everything the comparison asks for; only `home` differs.
    const reviewed = {...ORF(18, 70), benchmarkContext: {referenceId: 'hasbrouck-tindal-2017-orf', measure: 'orf', unit: 'wcpm', grade: '2', season: 'winter', language: 'en',
      durationSeconds: 60, material: 'unpracticed-grade-level', scoring: 'standardized', reviewedByEducator: true, formId: 'orf-2-A'}};
    const given = meta.interpretProbeResult('orf', 70, '2', 'winter', reviewed);
    const fromHome = meta.interpretProbeResult('orf', 70, '2', 'winter', {...reviewed, home: true});
    expect([given.comparisonAvailable, typeof given.benchmark50]).toEqual([true, 'number']);
    expect([fromHome.comparisonAvailable, fromHome.tier, fromHome.benchmark50, fromHome.reason]).toEqual([false, 0, null,
      'This result is from a take-home file, done without a teacher present, so it is not compared with a reference.']);
    await unmountPanel();
  });
});

// ── The panel, mounted ──
let Panel, root, host, toast, hostState;
const STORE_KEY = 'alloflow_ac_imported_students';
const textOf = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const flush = async (ms = 60) => { await act(async () => { await new Promise((done) => setTimeout(done, ms)); }); };
const press = async (button) => { expect(button, 'button').toBeTruthy(); await act(async () => { button.click(); await Promise.resolve(); }); await flush(); };
const until = async (test, label, ms = 20000) => { const end = Date.now() + ms; while (!test()) { if (Date.now() > end) throw new Error('timed out waiting for ' + label); await flush(40); } };
// The host keeps probe history: saveProbeResult adds to it, and it reads the store again when asked (as AlloFlowANTI.txt does).
function Host(props) {
  const [history, setHistory] = React.useState(props.probeHistory || {});
  React.useEffect(() => {
    const reread = () => { try { setHistory(JSON.parse(localStorage.getItem('alloflow_probe_history') || '{}')); } catch (_) {} };
    window.addEventListener('alloflow:study-bundle-imported', reread);
    return () => window.removeEventListener('alloflow:study-bundle-imported', reread);
  }, []);
  hostState = {history};
  const save = (name, record) => setHistory((prev) => {
    const next = {...prev, [name]: [...(prev[name] || []), record]};
    localStorage.setItem('alloflow_probe_history', JSON.stringify(next));
    return next;
  });
  return React.createElement(Panel, {...props, probeHistory: history, saveProbeResult: props.noSave ? undefined : save});
}
async function mountPanel(students, props = {}) {
  Panel = window.AlloModules.StudentAnalytics;
  if (students) localStorage.setItem(STORE_KEY, JSON.stringify(students));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  toast = vi.fn();
  await act(async () => {
    root.render(React.createElement(Host, {isOpen: true, onClose: vi.fn(), theme: 'light', t: (k) => k, loadProbeBanks: () => Promise.resolve(), addToast: toast,
      interventionLogs: {}, probeHistory: {}, rtiGoals: {}, externalCBMScores: {}, ...props}));
    await Promise.resolve();
  });
}
async function unmountPanel() { if (root) await act(async () => root.unmount()); if (host) host.remove(); root = null; host = null; }
const choose = async (files) => {
  const input = document.body.querySelector('input[data-th-input]');
  Object.defineProperty(input, 'files', {value: files, configurable: true});
  await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); await Promise.resolve(); });
  await until(() => document.body.querySelector('[data-th-preview] tbody tr') || document.body.querySelector('[data-th-others]'), 'the preview');
};
const stored = () => JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
// What a download would have saved: the Blob's parts and the file name.
const downloads = [];
const catchDownloads = () => {
  downloads.length = 0;
  vi.stubGlobal('Blob', class { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } });
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { downloads.push({blob}); return 'blob:made'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { if (downloads.length) downloads[downloads.length - 1].name = this.getAttribute('download'); });
};
const lastDownload = () => { const d = downloads[downloads.length - 1]; return {name: d.name, html: d.blob.parts.join(''), type: d.blob.type}; };

describe('Class Analytics, mounted: adding check files', () => {
  afterEach(async () => { await unmountPanel(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('drop the files, see the checks, Add all: the row and probe history get them, once', async () => {
    await mountPanel([student('s1', 'BlueHeron7', {data: {wordSoundsState: {history: []}}})]);
    await choose([file(PLAYED.mc.csv, PLAYED.mc.csvName), file(PLAYED.mc.json, PLAYED.mc.jsonName), file(PLAYED.mn.csv, PLAYED.mn.csvName), file(PLAYED.stopped.csv, PLAYED.stopped.csvName)]);
    const rows = [...document.body.querySelectorAll('[data-th-preview] tbody tr')];
    expect(rows.map((r) => [r.getAttribute('data-th-row'), r.getAttribute('data-th-kind'), r.getAttribute('data-th-check')])).toEqual([
      ['new', 'check', 'ok'], ['repeat', 'check', 'ok'], ['new', 'check', 'ok'], ['new', 'check', 'ok']]);
    expect(textOf(rows[0].children[5])).toBe('21 digits correct per minute');
    expect(rows[3].querySelector('input[data-th-skip]').checked).toBe(true);
    const addAll = document.body.querySelector('button[data-th-add-all]');
    expect(addAll.textContent).toBe('Add all (2)');
    await press(addAll);
    expect(hostState.history.BlueHeron7.map((r) => [r.activity, r.dcpm, r.home, r.source])).toEqual([['math_dcpm', 21, true, 'take_home_file']]);
    expect(stored()[0].screeningHistory.map((r) => [r.type, r.correct, r.home])).toEqual([['missing_number', 17, true]]);
    expect(toast).toHaveBeenCalledWith('Take-home results added: 2.', 'success');
    await press(document.body.querySelector('button[data-th-close]'));
    // The same files again: nothing new.
    await choose([file(PLAYED.mc.json, PLAYED.mc.jsonName), file(PLAYED.mn.json, PLAYED.mn.jsonName)]);
    expect([...document.body.querySelectorAll('[data-th-preview] tbody tr')].map((r) => r.getAttribute('data-th-row'))).toEqual(['added', 'added']);
    expect(document.body.querySelector('button[data-th-add-all]').disabled).toBe(true);
  });
  it('with no host function, the math result is written to the store the host reads', async () => {
    await mountPanel([student('s1', 'BlueHeron7')], {noSave: true});
    await choose([file(PLAYED.own.json, PLAYED.own.jsonName)]);
    await press(document.body.querySelector('button[data-th-add-all]'));
    expect(JSON.parse(localStorage.getItem('alloflow_probe_history')).BlueHeron7.map((r) => [r.activity, r.title, r.home])).toEqual([['math_custom', 'Facts to 20', true]]);
    expect(hostState.history.BlueHeron7).toHaveLength(1);
  });
  it('the student\'s page lists the checks from the app and from home in one table per measure, with the remove action', async () => {
    const sessions = [await read(PLAYED.mn.csv, PLAYED.mn.csvName), await read(PLAYED.mc.csv, PLAYED.mc.csvName)];
    const result = AC.apply([student('s1', 'BlueHeron7', {screeningHistory: [SUPERVISED_MN(3, 12)]})], sessions.map((session) => ({session, name: 'BlueHeron7'})), make, {});
    await mountPanel(result.students, {probeHistory: {BlueHeron7: [SUPERVISED_MATH(3, 30), result.probeAdds[0].record]}});
    await press([...document.body.querySelectorAll('button')].find((b) => /Student Data/.test(b.textContent)));
    await press(document.body.querySelector('button[aria-label="View details for BlueHeron7"]'));
    const card = document.body.querySelector('[data-ck-over-time-card]');
    expect(card, 'the card').toBeTruthy();
    expect([...card.querySelectorAll('table[data-ck-over-time]')].map((tb) => [tb.getAttribute('data-ck-over-time'), [...tb.querySelectorAll('tbody tr')].map((tr) => textOf(tr.children[1]) + ': ' + textOf(tr.children[3]))])).toEqual([
      ['math_dcpm', ['In the app: 30 digits correct per minute', 'Take-home: 21 digits correct per minute']],
      ['missing_number', ['In the app: 12 items correct (14 tried)', 'Take-home: 17 items correct (19 tried)']]]);
    expect(card.querySelector('button[data-th-remove]').textContent).toBe("Remove this student's take-home results");
  });
  it('the Screening CSV lists a result from home with no risk level', async () => {
    const home = AC.apply([student('s1', 'BlueHeron7', {screeningHistory: [SUPERVISED_MN(3, 12)]})], [{session: await read(PLAYED.mn.csv, PLAYED.mn.csvName), name: 'BlueHeron7'}], make, {}).students;
    await mountPanel(home);
    catchDownloads();
    await press([...document.body.querySelectorAll('button')].find((b) => /Student Data/.test(b.textContent)));
    await press([...document.body.querySelectorAll('button')].find((b) => textOf(b) === 'Screening CSV'));
    const lines = lastDownload().html.replace(/^﻿/, '').split('\r\n').filter(Boolean).map((line) => line.split('","').map((c) => c.replace(/^"|"$/g, '')));
    expect(lines[0].slice(4)).toEqual(['Subtest', 'Correct', 'Total', 'Accuracy%', 'Items/min', 'Risk Level', 'Note']);
    expect(lines.slice(1).map((l) => l.slice(4))).toEqual([
      ['missing_number', '12', '14', '86', '0', 'Low', ''],
      ['missing_number', '17', '19', '89', '', '', 'Take-home: done without a teacher present, so no risk level']]);
  });
  it('the class screening report reads the latest result a teacher gave, not a later one from home', async () => {
    const day = (d) => new Date(2026, 10, d, 10).toISOString();
    const history = {BlueHeron7: [{type: 'missing_number', correct: 12, total: 14, date: day(3), timestamp: new Date(2026, 10, 3, 10).getTime()},
      {type: 'missing_number', correct: 77, total: 80, date: day(20), timestamp: new Date(2026, 10, 20, 10).getTime(), home: true, source: 'take_home_file', sessionId: 'h9'}]};
    await mountPanel([student('s1', 'BlueHeron7')], {probeHistory: history, researchSuiteOnly: true});
    let html = '';
    vi.spyOn(window, 'open').mockReturnValue({document: {write: (text) => { html += text; }, close() {}}, print() {}});
    await press([...document.body.querySelectorAll('button')].find((b) => /Print Class Screening Report/.test(b.textContent)));
    expect(html).toMatch(/BlueHeron7/);
    expect(html).toMatch(/>12<\/td>/);
    expect(html).not.toMatch(/>77<\/td>/);
  });
});

describe('every calculation in the panel reads probe history without results from home', () => {
  const component = cut(analytics, '  const StudentAnalyticsPanel = ', '  // ── Reciprocal query surface (P3-1)');
  it('the panel takes the whole store under another name and reads a filtered copy', () => {
    expect(component).toContain('probeHistory: probeHistoryAll,');
    expect(component).toContain('const probeHistory = React.useMemo(() => _acCkSupervised(probeHistoryAll), [probeHistoryAll]);');
    // The whole store is used only to add, list, archive and move records: never to work something out.
    const users = component.split('\n').filter((line) => /probeHistoryAll/.test(line) && !/^\s*\/\//.test(line)).map((line) => line.trim().slice(0, 60));
    expect(users).toEqual([
      'probeHistory: probeHistoryAll,',
      'const probeHistory = React.useMemo(() => _acCkSupervised(pro',
      'try { preview = await _acThPreview(list, importedStudents, r',
      'const result = _acThApply(importedStudents, picks, makeStude',
      'try { Object.keys(probeHistoryAll || {}).forEach(n => names.',
      'alloflow_probe_history: { from: (probeHistoryAll || {})[from',
      'probeHistory: probeHistoryAll || {},',
      '_acCkOverTimeCard(React.createElement, t, selectedStudent, p',
    ]);
  });
  it('the AlloSheet tables filter again where they read the records (probe trends, goal progress), whoever hands them the store', () => {
    expect(analytics.split("data.probeHistory[name].filter(function(r) { return !_acCkIsHome(r); })").length - 1).toBe(2);
    expect(analytics.split('? data.probeHistory[name]\n').length - 1).toBe(0);
  });
  it.each([
    ['growth rate and "below expected" in the Progress Monitoring Summary', 'var renderProbeProgressSummary = function(studentName) {', 'var printMeetingSummary = function'],
    ['benchmark status in the RTI meeting summary', 'var printMeetingSummary = function(studentName) {', 'var printClassScreeningReport = function'],
    ['scores and status colours in the class screening report', 'var printClassScreeningReport = function() {', 'const exportScreeningCSV = '],
    ['probe columns of the research CSV', 'const exportResearchCSV = async () => {', 'const exportSessionLogCSV = '],
    ['probe count in student insights', 'const generateStudentInsights = studentName => {', 'const generateClassInsights = '],
    ['probe total on the research dashboard', 'const renderResearchDashboard = () => {', 'const totalSessions = '],
    ['probe trends and goal progress sent to AlloSheet', 'const alloSheetSourceData = React.useMemo(', 'const alloSheetLearners = '],
    ['the Math DCPM sparkline and its direction arrow', 'const mathDcpmData = ', 'const renderSparkline = '],
    ['the goal aimline and decision rule', 'const studentGoal = rtiGoals[selectedStudent.name];', 'const aimline = studentGoal ?'],
  ])('%s', (name, start, end) => {
    const code = cut(component, start, end);
    expect(code).toMatch(/\bprobeHistory\b/);
    expect(code).not.toMatch(/probeHistoryAll/);
  });
});

// ── Saving a check as a file for home ──
describe('Assessment Center: Save as a file for home', () => {
  const setBanks = () => { window.MATH_PROBE_BANKS = BANK.MATH_PROBE_BANKS; window.MISSING_NUMBER_PROBES = BANK.MISSING_NUMBER_PROBES; window.QUANTITY_DISCRIMINATION_PROBES = BANK.QUANTITY_DISCRIMINATION_PROBES; };
  const opener = (measure) => document.body.querySelector('button[data-ck-save-open="' + measure + '"]');
  const dialog = (measure) => document.body.querySelector('[data-ck-save-dialog="' + measure + '"]');
  afterEach(async () => {
    await unmountPanel(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    delete window.__alloLoadPlugin; delete window.MATH_PROBE_BANKS; delete window.MISSING_NUMBER_PROBES; delete window.QUANTITY_DISCRIMINATION_PROBES;
    loadLoader(); loadBuilder();
  });
  it('each of the three checks has one quiet second action, and no dialog until it is pressed', async () => {
    setBanks();
    await mountPanel([student('s1', 'BlueHeron7')]);
    expect(['math_computation', 'missing_number', 'quantity_discrimination'].map((m) => [opener(m).textContent, opener(m).type, opener(m).getAttribute('aria-expanded')])).toEqual([
      ['Save as a file for home', 'button', 'false'], ['Save as a file for home', 'button', 'false'], ['Save as a file for home', 'button', 'false']]);
    expect(document.body.querySelectorAll('[data-ck-save-dialog]')).toHaveLength(0);
    expect(document.body.querySelectorAll('[data-ck-code]')).toHaveLength(0);
  });
  it('fetches the two scripts the way Word Sounds fetches the loader, makes the file, and the file plays to results the dashboard reads', async () => {
    setBanks();
    delete window.AlloWordSoundsTakeHome; delete window.AlloPacketChecks;
    window.__alloLoadPlugin = vi.fn(async (name) => { if (name === 'word_sounds_take_home_loader.js') loadLoader(); else if (name === 'packet_check_builder.js') loadBuilder(); else return false; return true; });
    await mountPanel([student('s1', 'BlueHeron7')]);
    catchDownloads();
    await press(opener('missing_number'));
    await until(() => dialog('missing_number') && dialog('missing_number').querySelector('[data-ck-save-go]') && !dialog('missing_number').querySelector('[data-ck-save-go]').disabled, 'the dialog');
    expect(window.__alloLoadPlugin.mock.calls.map((c) => c[0])).toEqual(['word_sounds_take_home_loader.js', 'packet_check_builder.js']);
    const box = dialog('missing_number');
    expect([box.getAttribute('role'), box.getAttribute('aria-label'), opener('missing_number').getAttribute('aria-expanded')]).toEqual(['dialog', 'Save for home: Missing Number, Grade 1, Form A', 'true']);
    expect(box.querySelector('[data-ck-save-note]').textContent).toBe('Home results are for seeing progress, not for a grade.');
    // The teacher code is there, folded away.
    expect([box.querySelector('details').open, box.querySelector('summary').textContent, box.querySelectorAll('input').length]).toEqual([false, 'Add a teacher code (optional)', 1]);
    await press(box.querySelector('[data-ck-save-go]'));
    await until(() => downloads.length > 0 && downloads[0].name, 'the download');
    const made = lastDownload();
    expect([made.name, made.type]).toEqual(['missing-number-g1-A.html', 'text/html;charset=utf-8']);
    expect(textOf(dialog('missing_number').querySelector('[data-ck-save-message]'))).toBe('Saved missing-number-g1-A.html. Send it home. The learner opens it in a browser and saves a results file at the end. Add that file here with Add take-home results.');
    // The same bytes the command-line builder makes from the same form.
    expect(made.html).toBe(PC.buildCheckPacket({lesson: LESSONS.mn, loader: TH}).html);
    // The loop: play it, save the results, drop them on the dashboard.
    const out = await play(made.html, LESSONS.mn, {learner: 'BlueHeron7', miss: [2], secondsPerItem: 3});
    await choose([file(out.csv, out.csvName), file(out.json, out.jsonName)]);
    const rows = [...document.body.querySelectorAll('[data-th-preview] tbody tr')];
    expect(rows.map((r) => [r.getAttribute('data-th-row'), r.getAttribute('data-th-check'), textOf(r.children[2]), textOf(r.children[5])])).toEqual([
      ['new', 'ok', 'Missing NumberGrade 1, Form A', '24 items correct (25 tried)'], ['repeat', 'ok', 'Missing NumberGrade 1, Form A', '24 items correct (25 tried)']]);
    await press(document.body.querySelector('button[data-th-add-all]'));
    expect(stored()[0].screeningHistory.map((r) => [r.type, r.grade, r.form, r.correct, r.total, r.home, r.integrity])).toEqual([['missing_number', '1', 'A', 24, 25, true, 'ok']]);
  });
  it('takes the grade and form from the pickers beside Start, and an optional teacher code', async () => {
    setBanks();
    await mountPanel([student('s1', 'BlueHeron7')]);
    catchDownloads();
    const pick = async (label, value) => { const el = document.body.querySelector('select[aria-label="' + label + '"]'); await act(async () => { el.value = value; el.dispatchEvent(new Event('change', {bubbles: true})); }); };
    await pick('Math probe grade', '3');
    await pick('Math probe form', 'B');
    await press(opener('math_computation'));
    await until(() => dialog('math_computation') && dialog('math_computation').querySelector('[data-ck-save-go]'), 'the dialog');
    expect(dialog('math_computation').getAttribute('aria-label')).toBe('Save for home: Math Fluency, Grade 3, Form B');
    const code = dialog('math_computation').querySelector('[data-ck-code]');
    const type = async (value) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(code, value); code.dispatchEvent(new Event('input', {bubbles: true})); }); };
    await type('12');
    await press(dialog('math_computation').querySelector('[data-ck-save-go]'));
    expect(textOf(dialog('math_computation').querySelector('[data-ck-save-message]'))).toBe('The teacher code needs 4 or more characters.');
    expect(downloads).toHaveLength(0);
    await type('tulip-47');
    await press(dialog('math_computation').querySelector('[data-ck-save-go]'));
    await until(() => downloads.length > 0 && downloads[0].name, 'the download');
    const made = lastDownload();
    expect(made.name).toBe('math-computation-g3-B.html');
    const manifest = JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(made.html)[1]);
    expect([manifest.packet.id, manifest.packet.form, manifest.packet.mode, manifest.check.measure, manifest.check.items]).toEqual(['math-computation-g3', 'B', 'probe', 'math_dcpm', 25]);
    expect(manifest.check.teacherCode).toMatch(/^set; kept only as a salted SHA-256 hash/);
    expect(made.html).not.toContain('tulip-47');
    // Close puts the keyboard back on the action that opened the dialog.
    await press(dialog('math_computation').querySelector('[data-ck-save-close]'));
    expect(dialog('math_computation')).toBeNull();
    await flush(30);
    expect(document.activeElement).toBe(opener('math_computation'));
  });
  it('says plainly when this version cannot make the file, and the action then says so too', async () => {
    setBanks();
    delete window.AlloPacketChecks;
    // The app's loader answers false for a script that is not in its reviewed list.
    window.__alloLoadPlugin = vi.fn(async (name) => name !== 'packet_check_builder.js');
    await mountPanel([student('s1', 'BlueHeron7')]);
    catchDownloads();
    await press(opener('quantity_discrimination'));
    await until(() => dialog('quantity_discrimination') && dialog('quantity_discrimination').querySelector('[data-ck-save-message="unavailable"]'), 'the message');
    const box = dialog('quantity_discrimination');
    expect(textOf(box.querySelector('[data-ck-save-message]'))).toBe('Saving a file for home is not available in this version.');
    expect([box.querySelector('[data-ck-save-go]'), box.querySelector('details')]).toEqual([null, null]);
    expect(['math_computation', 'missing_number', 'quantity_discrimination'].map((m) => [opener(m).disabled, opener(m).textContent])).toEqual([
      [true, 'Save as a file for home: not available in this version'], [true, 'Save as a file for home: not available in this version'], [true, 'Save as a file for home: not available in this version']]);
    expect(downloads).toHaveLength(0);
  });
  it('puts the words inside the file in the app language where a translation exists, English where none does', async () => {
    setBanks();
    const es = {'word_sounds.take_home_player_check_begin': 'Empezar', 'word_sounds.take_home_player_check_about': 'Esto es para ver cómo vas. No es para una nota.',
      'word_sounds.take_home_player_quantity_discrimination_title': 'Comparar cantidades',
      'class_analytics.th_ck_file_title': 'Revisión de {name} ({grade}{form})', 'class_analytics.th_ck_name_quantity': 'Comparar cantidades'};
    const t = (key) => Object.prototype.hasOwnProperty.call(es, key) ? es[key] : key;
    document.documentElement.lang = 'es';
    const built = await AC.buildForm({measure: 'quantity_discrimination', grade: 'K', form: 'A', t});
    document.documentElement.lang = '';
    expect([built.ok, built.name]).toEqual([true, 'quantity-discrimination-gK-A.html']);
    const labels = JSON.parse(/\nvar labels=(.*);\nvar matches=/.exec(built.html)[1]);
    expect([labels.check_begin, labels.check_about, labels.quantity_discrimination_title, labels.lang]).toEqual(['Empezar', 'Esto es para ver cómo vas. No es para una nota.', 'Comparar cantidades', 'es']);
    // Not translated here: the loader's own English.
    expect([labels.check_time_up, labels.check_skip, labels.check_stop]).toEqual(['Time is up.', 'Skip', 'Stop the check']);
    expect(built.html).toContain('<html lang="es">');
    expect(built.html).toContain('<title>Revisión de Comparar cantidades (KA)</title>');
    // A translated file still plays and its results still read.
    const out = await play(built.html, LESSONS.qd, {secondsPerItem: 1});
    expect(out.text).toContain('Esto es para ver cómo vas.');
    const s = await read(out.csv, out.csvName);
    expect([s.integrity, s.check.measure, s.check.score, s.check.grade, s.check.form]).toEqual(['ok', 'quantity_discrimination', 25, 'K', 'A']);
    // With no translation at all the file is the plain English one.
    expect((await AC.buildForm({measure: 'quantity_discrimination', grade: 'K', form: 'A', t: (k) => k})).html).toBe(PC.buildCheckPacket({lesson: LESSONS.qd, loader: TH}).html);
  });
  it('gives a plain reason when the form is not loaded or the measure is not one of the three', async () => {
    expect(await AC.buildForm({measure: 'missing_number', grade: '1', form: 'A', t: (k) => k})).toEqual({ok: false, reason: 'no_form'});
    setBanks();
    expect(await AC.buildForm({measure: 'missing_number', grade: '9', form: 'A', t: (k) => k})).toEqual({ok: false, reason: 'no_form'});
    expect(await AC.buildForm({measure: 'spelling', grade: '1', form: 'A', t: (k) => k})).toEqual({ok: false, reason: 'no_form'});
  });
});

describe('Math Fluency setup: Save as a file for home', () => {
  let mfRoot, mfHost;
  beforeAll(() => { globalThis.React = window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; loadAlloModule('math_fluency_module.js'); });
  afterEach(async () => {
    if (mfRoot) await act(async () => mfRoot.unmount());
    if (mfHost) mfHost.remove();
    mfRoot = null; mfHost = null;
    vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
    window.AlloTakeHomeChecks = SHARED;
  });
  // The object student_analytics_module.js puts on window for the Math Fluency panel.
  const SHARED = window.AlloTakeHomeChecks;
  const mountFluency = async () => {
    mfHost = document.createElement('div');
    document.body.appendChild(mfHost);
    mfRoot = createRoot(mfHost);
    await act(async () => {
      mfRoot.render(React.createElement(window.AlloModules.MathFluency, {learnerId: null, learnerName: '', gradeLevel: '2', t: (k) => k, addToast: () => {}, onProbeComplete: () => {}, handleScoreUpdate: () => {}}));
    });
    if (!mfHost.querySelector('[data-mf-home-file]')) {
      const name = mfHost.querySelector('#mf-learner-name');
      await act(async () => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(name), 'value').set.call(name, 'Otter'); name.dispatchEvent(new Event('input', {bubbles: true})); name.dispatchEvent(new Event('change', {bubbles: true})); });
      await act(async () => { [...mfHost.querySelectorAll('button')].find((b) => /^Use learner$/.test(b.textContent)).click(); });
    }
  };
  const homeButton = () => mfHost.querySelector('button[data-mf-home-file]');
  const note = () => mfHost.querySelector('[data-mf-home-file-note]').textContent;
  it('the Assessment Center module offers the Math Fluency panel one way to make the file', () => {
    expect(Object.keys(SHARED).sort()).toEqual(['buildCustom', 'buildForm', 'libs', 'saveCustom', 'saveForm']);
  });
  it('one action on the practice setup hands over one fixed list of problems made by the panel\'s own generator', async () => {
    const saveCustom = vi.fn(async () => ({ok: true, name: 'math-facts-check-addition.html'}));
    window.AlloTakeHomeChecks = {saveCustom};
    await mountFluency();
    expect(mfHost.querySelectorAll('[data-mf-home-file]')).toHaveLength(1);
    expect([homeButton().textContent, homeButton().type, note()]).toEqual(['Save as a file for home', 'button', '']);
    await act(async () => { homeButton().click(); await Promise.resolve(); });
    await flush();
    expect(saveCustom).toHaveBeenCalledTimes(1);
    const sent = saveCustom.mock.calls[0][0];
    expect([sent.title, sent.timeLimitS, sent.allowSkip, typeof sent.t]).toEqual(['Math facts check: Addition', 120, true, 'function']);
    // The setup asks for 120 problems; a check file holds 60.
    expect(sent.problems).toHaveLength(60);
    expect(sent.problems.every((p) => Object.keys(p).join() === 'a,b,op' && p.op === 'add' && Number.isInteger(p.a) && Number.isInteger(p.b))).toBe(true);
    expect(note()).toBe('Saved math-facts-check-addition.html: 60 problems, the same for every learner. Home results are for seeing progress, not for a grade.');
  });
  it('says plainly when this version cannot make the file', async () => {
    delete window.AlloTakeHomeChecks;
    await mountFluency();
    await act(async () => { homeButton().click(); await Promise.resolve(); });
    expect(note()).toBe('Saving a file for home is not available in this version.');
    window.AlloTakeHomeChecks = {saveCustom: vi.fn(async () => ({ok: false, reason: 'unavailable'}))};
    await act(async () => { homeButton().click(); await Promise.resolve(); });
    await flush();
    expect(note()).toBe('Saving a file for home is not available in this version.');
  });
  it('the loop: the generator\'s problems become a file every learner plays the same, and its results come back under its title', async () => {
    const generate = window.AlloModules.MathFluencyInternals.generatePracticeProblems;
    const problems = generate('mixed', 'recommended', '3', 12).map((p) => ({a: p.a, b: p.b, op: p.op}));
    const first = await AC.buildCustom({title: 'Math facts check: Mixed', problems, timeLimitS: 60, allowSkip: true, t: (k) => k});
    expect([first.ok, first.name, first.problems]).toEqual([true, 'math-facts-check-mixed.html', 12]);
    // The packet id names the problem list: the same list again is the same set, another list is another set.
    const again = await AC.buildCustom({title: 'Another title', problems, timeLimitS: 0, allowSkip: true, t: (k) => k});
    const other = await AC.buildCustom({title: 'Math facts check: Mixed', problems: problems.slice(1), timeLimitS: 60, allowSkip: true, t: (k) => k});
    expect(again.packetId).toBe(first.packetId);
    expect(other.packetId).not.toBe(first.packetId);
    expect(first.packetId).toMatch(/^math-custom-[0-9a-f]{8}$/);
    // Two learners open the same file: the same problems in the same order.
    const ana = await play(first.html, first.lesson, {learner: 'Ana', secondsPerItem: 4});
    const ben = await play(first.html, first.lesson, {learner: 'Ben', miss: [0, 1], secondsPerItem: 4, days: 7});
    const shown = (csv) => csv.split('\r\n').slice(1).filter((line) => line.startsWith('"alloflow-packet-result/1"')).map((line) => line.split('","')[15]);
    expect(shown(ana.csv)).toEqual(shown(ben.csv));
    expect(shown(ana.csv)).toHaveLength(12);
    const a = await read(ana.csv, ana.csvName), b = await read(ben.json, ben.jsonName);
    expect([a.integrity, a.check.custom, a.check.packetId, a.check.title, a.check.measure, a.check.correct]).toEqual(['ok', true, first.packetId, 'Math facts check: Mixed', 'math_dcpm', 12]);
    expect([b.integrity, b.check.packetId, b.check.title, b.check.correct, b.date]).toEqual(['ok', first.packetId, 'Math facts check: Mixed', 10, '2026-11-19']);
    // On the dashboard both tries of one learner are listed together, under the title.
    const result = AC.apply([student('s1', 'Ana')], [{session: a, name: 'Ana'}, {session: b, name: 'Ana'}], make, {});
    const groups = AC.overTime(result.students[0], {Ana: result.probeAdds.map((x) => x.record)});
    expect(groups.map((g) => [g.key, g.custom, g.rows.map((r) => [r.date, r.where])])).toEqual([['custom:' + first.packetId + ':digits_correct_per_minute', true, [['2026-11-12', 'th'], ['2026-11-19', 'th']]]]);
    expect(AC.groupName((k) => k, groups[0])).toMatch(/^Math facts check:? Mixed \(your own problems\)$/);
  });
});
