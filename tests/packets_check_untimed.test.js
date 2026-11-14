// @vitest-environment jsdom
// "Untimed (an accommodation)" for checks (2026-11-12): the maker's folded option (packets-check.html), the builder's
// untimed: true (packet_check_builder.js), what the file records (CSV "#score" timing=untimed, JSON score.untimed,
// the teacher screen, the manifest), Add up results (packets_results_reader.js) and the Class Analytics take-home import
// (student_analytics_module.js). An untimed result is never put with timed results: its own series, its own middle,
// its own goal, and no score per minute.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');
delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const PC = require('../packet_check_builder.js');
const reader = require('../packets_results_reader.js');
const BANK = JSON.parse(read('psychometric_math_probes.json').replace(/^﻿/, ''));
const form = (measure, grade, extra = {}) => PC.lessonFromMathForm({ bank: BANK, measure, grade, form: 'A', ...extra });
const expected = (p) => p.answer != null ? Number(p.answer) : p.left != null ? Math.max(p.left, p.right)
  : p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : Math.trunc(p.a / p.b);
const settle = (ms = 60) => new Promise((done) => setTimeout(done, ms));
const pairsOf = (line) => Object.fromEntries(line.split('","').slice(2).map((c) => c.replace(/"$/, '')).map((c) => [c.slice(0, c.indexOf('=')), c.slice(c.indexOf('=') + 1)]));

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
// Plays a built check as a student would: every item, `secondsPerItem` apart, `miss` wrong. Returns the saved files.
async function play(lesson, { learner = 'BlueHeron7', miss = [], secondsPerItem = 3, day = 12, teacherCode = '' } = {}) {
  const html = PC.buildCheckPacket({ lesson, loader: TH, teacherCode }).html;
  const saved = [];
  const clock = { t: 1000, wall: Date.parse('2026-11-' + day + 'T14:14:05Z') };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/check.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => clock.t });
    const RealDate = w.Date;
    w.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(clock.wall); } static now() { return clock.wall; } };
    Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    w.TextEncoder = TextEncoder;
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
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
  const ready = d.getElementById('app').textContent;
  d.querySelector('[data-check-begin]').click();
  const clockShown = !!d.querySelector('[data-time-left]');
  let n = 0;
  for (const raw of items.filter((it) => !it.practice)) { tick(secondsPerItem * 1000); answer(raw, miss.includes(n)); n++; }
  await settle(200);
  const heading = d.querySelector('#app h2').textContent;
  d.querySelector('[data-save-csv]').click();
  const csv = saved[saved.length - 1];
  d.querySelector('[data-save-json]').click();
  const json = saved[saved.length - 1];
  // The teacher screen.
  // With a teacher code the screen asks for it at once; without one, a button opens it.
  if (teacherCode) {
    d.getElementById('teacher-code').value = teacherCode; d.querySelector('[data-teacher-show]').click();
    for (let i = 0; i < 200 && !d.querySelector('[data-review]'); i++) await settle(50);
  } else d.querySelector('[data-teacher-open]').click();
  const teacher = d.getElementById('app').textContent;
  return { html, csv: csv.body, csvName: csv.name, json: JSON.parse(json.body), jsonName: json.name, ready, clockShown, heading, teacher, n };
}

const QD = form('quantity_discrimination', 'K');
const QD_UNTIMED = form('quantity_discrimination', 'K', { untimed: true });
const MC_UNTIMED = form('math_computation', '3', { untimed: true });
const P = {};
beforeAll(async () => {
  P.qd = await play(QD, { miss: [2], secondsPerItem: 2 });
  P.qdUntimed = await play(QD_UNTIMED, { miss: [2, 5], secondsPerItem: 6, teacherCode: 'tulip-47' });
  P.mcUntimed = await play(MC_UNTIMED, { miss: [1], secondsPerItem: 9 });
}, 120000);

describe('the builder: untimed: true takes the clock away and says what it took', () => {
  it('no time limit, the usual one kept, a title that says it; a timed lesson is as before', () => {
    expect(QD.timeLimitS).toBe(60);
    expect(QD.check).not.toHaveProperty('untimed');
    // 2026-11-14 (T1/makers2): PC.formTitle writes out the grade and version ("Quantity Discrimination, kindergarten, version A").
    expect(QD.title).toBe('Quantity Discrimination, kindergarten, version A');
    expect(QD_UNTIMED).toMatchObject({ timeLimitS: null, lessonId: QD.lessonId, form: 'A', title: 'Quantity Discrimination, kindergarten, version A, untimed' });
    expect(QD_UNTIMED.check).toMatchObject({ untimed: true, usualTimeLimitS: 60, measure: 'quantity_discrimination', scoreUnit: 'items_correct' });
    // A different revision: a different place in the browser's storage, so a timed try is never resumed untimed.
    expect(QD_UNTIMED.revision).not.toBe(QD.revision);
    expect(MC_UNTIMED.check).toMatchObject({ untimed: true, usualTimeLimitS: 120, measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute' });
    expect(form('quantity_discrimination', 'K', { untimed: false })).toEqual(QD);
  });
});

describe('the file: no clock, every item, and the results say "untimed"', () => {
  it('the student is told there is no clock, sees no clock and does every item', () => {
    expect(P.qdUntimed.ready).toContain('There is no clock. Take your time.');
    expect(P.qdUntimed.clockShown).toBe(false);
    expect(P.qd.clockShown).toBe(true);
    expect(P.qdUntimed.n).toBe(QD_UNTIMED.blocks[0].items.filter((it) => !it.practice).length);
    expect(P.qdUntimed.heading).toBe('You finished. Thank you.');
  });
  it('CSV: "#score" ends with timing=untimed and the usual limit; the item rows are as before', () => {
    const lines = P.qdUntimed.csv.split('\r\n');
    const score = lines.find((l) => l.startsWith('"#score"'));
    expect(pairsOf(score)).toMatchObject({ measure: 'quantity_discrimination', score: String(25 - 2), score_unit: 'items_correct', time_limit_s: '', timing: 'untimed', usual_time_limit_s: '60', completion: 'complete' });
    expect(score.endsWith('"timing=untimed","usual_time_limit_s=60"')).toBe(true);
    // A timed check writes neither cell.
    expect(P.qd.csv).not.toMatch(/timing=|usual_time_limit_s=/);
  });
  it('JSON: score.untimed and score.usualTimeLimitS; a rate is never made without a clock', () => {
    expect(P.qdUntimed.json.score).toMatchObject({ untimed: true, usualTimeLimitS: 60, timeLimitS: null, score: 23, scoreUnit: 'items_correct' });
    expect(P.qd.json.score).not.toHaveProperty('untimed');
    expect(P.mcUntimed.json.score).toMatchObject({ untimed: true, usualTimeLimitS: 120, timeLimitS: null, score: null, noScoreReason: 'untimed', scoreUnit: 'digits_correct_per_minute' });
    expect(P.mcUntimed.json.score.digitsCorrect).toBeGreaterThan(0);
  });
  it('the teacher screen says it plainly, and the manifest says it too', () => {
    expect(P.qdUntimed.teacher).toContain('Untimed (an accommodation): no clock. The usual time limit is 60 s. Do not compare this score with timed scores.');
    expect(P.qdUntimed.teacher).toContain('Time limit: none.');
    expect(P.qd.teacher).not.toContain('Untimed');
    const manifest = JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(P.qdUntimed.html)[1]);
    expect(manifest.check).toMatchObject({ timeLimitS: null, clock: 'no time limit: untimed (an accommodation); the usual time limit is 60 seconds' });
  });
  it('the loader reads its own untimed file back with the marker', async () => {
    const back = await TH.parseResult(JSON.stringify(P.qdUntimed.json));
    expect(back.ok).toBe(true);
    expect(back.result.score).toMatchObject({ untimed: true, usualTimeLimitS: 60 });
  });
});

describe('Add up results: an untimed result is kept apart from timed results', () => {
  const session = async (text, name) => { const got = await reader.read(text, { name, lastModified: Date.UTC(2026, 10, 20) }); expect(got.ok, name + ': ' + got.why).toBe(true); return got.sessions[0]; };
  it('marks it, gives it its own series (own middle, own goal), and makes no rate', async () => {
    const timed = await session(P.qd.csv, P.qd.csvName);
    const untimed = await session(P.qdUntimed.csv, P.qdUntimed.csvName);
    const json = await session(JSON.stringify(P.qdUntimed.json), P.qdUntimed.jsonName);
    const mc = await session(P.mcUntimed.csv, P.mcUntimed.csvName);
    expect(timed.untimed).toBe(false);
    expect(timed.flags).not.toContain('untimed');
    expect(untimed).toMatchObject({ untimed: true, value: 23 });
    expect(untimed.flags).toContain('untimed');
    expect(json.untimed).toBe(true);
    expect(mc).toMatchObject({ untimed: true, value: null });
    expect(mc.flags).toEqual(expect.arrayContaining(['untimed', 'untimed_no_rate']));
    expect(mc.flags).not.toContain('no_time_limit');
    const model = reader.addUp([timed, untimed, mc], {});
    const keys = model.checks.map((c) => c.key);
    expect(new Set(keys).size).toBe(3);
    const qdSeries = model.checks.filter((c) => c.measure === 'quantity_discrimination');
    expect(qdSeries.map((c) => c.label).sort()).toEqual(['Quantity Discrimination (grade K)', 'Quantity Discrimination (grade K), untimed']);
    // The summary CSV says it on the row.
    const csv = reader.summaryCsv([{ learner: 'BlueHeron7', session: untimed }]);
    expect(csv).toMatch(/"untimed"|;untimed|"untimed;/);
  });
  it('a fixed-form result with no time limit is untimed even when its file does not say so', async () => {
    const edited = P.qdUntimed.csv.replace(',"timing=untimed","usual_time_limit_s=60"', '');
    expect(edited).not.toContain('timing=');
    const s = await session(edited, P.qdUntimed.csvName);
    expect(s.untimed).toBe(true);
  });
});

describe('Class Analytics: the take-home import marks it and lists it on its own', () => {
  const analytics = read('student_analytics_module.js');
  const cut = (source, start, end) => {
    const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
    if (a < 0 || b < 0) throw Error('not found: ' + start);
    return source.slice(a, b);
  };
  const AC = new Function(
    cut(analytics, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') +
    cut(analytics, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(') +
    '\nreturn {readFile: _acThReadFile, record: _acCkRecord, overTime: _acCkOverTime, notes: _acCkNotes, groupName: _acCkGroupName, scoreText: _acCkScoreText, supervised: _acCkSupervised};')();
  const file = (text, name) => new File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified: Date.UTC(2026, 10, 20) });
  it('untimed on the record, a group of its own, a plain note, and never in what benchmarks read', async () => {
    const got = async (p, which) => { const r = await AC.readFile(file(which === 'json' ? JSON.stringify(p.json) : p.csv, which === 'json' ? p.jsonName : p.csvName)); expect(r.reason).toBe(''); return r.sessions[0]; };
    const timed = await got(P.qd, 'csv');
    const untimed = await got(P.qdUntimed, 'csv');
    const untimedJson = await got(P.qdUntimed, 'json');
    const mc = await got(P.mcUntimed, 'csv');
    expect(timed.check.untimed).toBe(false);
    expect(untimed.check).toMatchObject({ untimed: true, usualTimeLimitSeconds: 60, score: 23 });
    expect(untimedJson.check).toMatchObject({ untimed: true, usualTimeLimitSeconds: 60 });
    expect(mc.check).toMatchObject({ untimed: true, score: null, noScore: 'untimed' });
    expect(AC.notes(null, untimed.check)).toContain('Untimed (an accommodation): no clock. It is never compared with timed results.');
    expect(AC.notes(null, timed.check).join(' ')).not.toContain('Untimed');
    const records = [AC.record(timed, 'Ana'), AC.record(untimed, 'Ana')];
    expect(records[0].untimed).toBeUndefined();
    expect(records[1]).toMatchObject({ untimed: true, usualTimeLimitSeconds: 60, home: true, type: 'quantity_discrimination' });
    const groups = AC.overTime({ name: 'Ana', screeningHistory: records }, {});
    expect(groups.map((g) => g.key).sort()).toEqual(['quantity_discrimination', 'quantity_discrimination:untimed']);
    const g = groups.find((x) => x.untimed);
    expect(g.rows).toHaveLength(1);
    expect(AC.groupName(null, g)).toBe('Quantity Discrimination, untimed');
    expect(AC.supervised({ Ana: [{ activity: 'math_dcpm', dcpm: 30 }, AC.record(mc, 'Ana')] }).Ana).toHaveLength(1);
  });
});

describe('the maker page offers it folded, for the ready checks', () => {
  const html = read('packets-check.html');
  const js = read('packets-check.js');
  it('a folded option inside the ready-check panel, in plain words', () => {
    const doc = new JSDOM(html).window.document;
    const box = doc.getElementById('untimed-box');
    expect(box.tagName).toBe('DETAILS');
    expect(box.closest('#panel-ready')).not.toBeNull();
    expect(box.querySelector('summary').textContent).toBe('Untimed (an accommodation)');
    const input = doc.getElementById('f-untimed');
    expect(input.type).toBe('checkbox');
    expect(input.closest('label')).not.toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe('untimed-hint');
    expect(box.textContent).not.toMatch(/\b(?:tests?|assessments?|learners?)\b/i);
  });
  it('the choice is not kept between visits, and the file name says untimed', () => {
    // 2026-11-14 (T1/makers2): defaults() also resets readyTitle and learner alongside untimed: false.
    expect(js).toContain("title: '', readyTitle: '', time: TIME_DEFAULT, skip: true, untimed: false, learner: '' };");
    expect(js).not.toMatch(/untimed: state\.untimed/);
    expect(js).toContain("(state.untimed ? '-untimed' : '') + '.html'");
  });
});
