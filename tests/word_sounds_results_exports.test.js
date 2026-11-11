// Word Sounds results on the teacher dashboard and as files, 2026-11-11.
// Class Analytics keeps a per-session, per-activity summary that outlives the
// 40-row cut, shows it by skill strand and by session, and saves it as CSV.
// The player saves one session's item-level rows (teacher only).
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';
import {core as CORE} from './helpers/word_sounds_core.js';

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
  cut(analytics, '  function _acTrimStudentData(data) {', '  function _acPersistableStudent(s) {') +
  cut(analytics, '  function _acWsSoundMastered(entry) {', '  function _acRestoreIdentityLinks(raw) {') +
  '\nreturn {trim: _acTrimStudentData, summary: _acWsSessionSummary, bySkill: _acWsBySkill, recent: _acWsRecentSessions,' +
  ' wrongList: _acWsWrongList, sessionCsv: _acWsSessionCsv, skillCsv: _acWsSkillCsv, cell: _acCsvCell, reportHtml: _acWsReportTablesHtml,' +
  ' strands: _AC_WS_STRANDS, activities: _AC_WS_ACTIVITIES, activityName: _acWsActivityName, strandName: _acWsStrandName, wrongText: _acWsWrongText};')();

const at = (month, day, hour, minute = 0) => new Date(2026, month - 1, day, hour, minute).getTime();
const item = (sessionId, when, activity, word, kind, extra = {}) => ({
  timestamp: when, sessionId, activity, word, difficulty: 'easy', textSupported: false, cluesShown: [],
  ...(kind === 'first' ? {correct: true, firstTry: true, attempts: 1}
    : kind === 'retry' ? {correct: true, firstTry: false, attempts: 2}
    : {correct: false, firstTry: false, attempts: 2}),
  ...extra,
});
// Three sessions and one row saved before any of the new fields existed.
const FALCON_ROWS = () => [
  {timestamp: at(10, 1, 9), activity: 'rhyming', word: 'hat', correct: true},
  item('sA', at(11, 3, 9, 0), 'blending', 'cat', 'miss', {wrong: ['cap', 'cot']}),
  item('sA', at(11, 3, 9, 1), 'blending', 'dog', 'first'),
  item('sA', at(11, 3, 9, 2), 'blending', 'sun', 'retry', {wrong: ['sum']}),
  item('sA', at(11, 3, 9, 3), 'blending', 'map', 'first'),
  item('sA', at(11, 3, 9, 4), 'blending', 'cat', 'miss', {wrong: ['cap', 'cap'], extended: true}),
  item('sA', at(11, 3, 9, 5), 'blending', 'pin', 'miss', {wrong: ['pen', 'pan'], extended: true, extensionEnd: 'limit'}),
  item('sB', at(11, 5, 14, 0), 'blending', 'ship', 'retry', {wrong: ['sip'], difficulty: 'medium'}),
  item('sB', at(11, 5, 14, 1), 'blending', 'fish', 'first', {difficulty: 'medium'}),
  item('sB', at(11, 5, 14, 2), 'blending', 'chip', 'miss', {wrong: ['ship', 'chop'], difficulty: 'medium'}),
  item('sB', at(11, 5, 14, 3), 'blending', 'moth', 'miss', {wrong: ['mop', 'moss'], difficulty: 'medium'}),
  item('sB', at(11, 5, 14, 4), 'mapping', 'cat', 'first', {difficulty: 'medium', textSupported: true, cluesShown: ['printed_sound_labels'], aacAssisted: true}),
  item('sB', at(11, 5, 14, 5), 'mapping', 'dog', 'first', {difficulty: 'medium', textSupported: true, cluesShown: ['printed_sound_labels']}),
  item('sB', at(11, 5, 14, 6), 'mapping', 'sun', 'first', {difficulty: 'medium', textSupported: true, cluesShown: ['printed_sound_labels']}),
  item('sC', at(11, 10, 10, 0), 'isolation', 'map', 'first', {difficulty: 'hard', textSupported: true, cluesShown: ['anchor_card']}),
  item('sC', at(11, 10, 10, 1), 'isolation', 'pin', 'first', {difficulty: 'hard', cluesShown: ['anchor_card']}),
  item('sC', at(11, 10, 10, 2), 'letter_tracing', 'map', 'first', {difficulty: 'hard', practiceOnly: true}),
  item('sC', at(11, 10, 10, 3), 'letter_tracing', 'pin', 'first', {difficulty: 'hard', practiceOnly: true}),
];
const totals = (summary) => summary.sessions.reduce((sum, s) => sum + Object.values(s.acts).reduce((n, a) => n + (a.n || 0), 0), 0);

describe('activity and strand table', () => {
  it('is the same as word_sounds_core.js, so the two cannot drift', () => {
    expect(AC.strands).toEqual(CORE.SKILL_STRANDS.map((row) => [row.key, row.name]));
    expect(AC.activities).toEqual(Object.fromEntries(Object.entries(CORE.ACTIVITY_SKILLS).map(([id, row]) => [id, [row.name, row.strand]])));
    expect(Object.keys(AC.activities)).toEqual(CORE.activityIds());
  });
  it('names activities and strands through the registered keys, with English fallbacks', () => {
    const t = (key) => ({'word_sounds.activity_blending': 'Mezclar sonidos', 'word_sounds.strand_spelling': 'Ortografía'})[key] || key;
    expect(AC.activityName(t, 'blending')).toBe('Mezclar sonidos');
    expect(AC.activityName(t, 'mapping')).toBe(CORE.activityLabel('mapping'));
    expect(AC.strandName(t, 'spelling')).toBe('Ortografía');
    expect(AC.strandName(null, 'hearing_sounds')).toBe(CORE.strandLabel('hearing_sounds'));
    expect(AC.activityName(null, 'future_game')).toBe('Future game');
    expect(AC.activityName(null, 'unknown')).toBe('Activity not recorded');
  });
});

describe('session summary kept with the student', () => {
  it('counts each session and activity from the saved rows', () => {
    const summary = AC.summary({history: FALCON_ROWS()});
    expect(summary.sessions.map((s) => [s.id, s.n, Object.keys(s.acts)])).toEqual([
      ['d:2026-10-01', 1, ['rhyming']], ['s:sA', 2, ['blending']], ['s:sB', 3, ['blending', 'mapping']], ['s:sC', 4, ['isolation', 'letter_tracing']]]);
    expect(summary.sessions[1].acts.blending).toEqual({n: 6, g: 6, f: 6, fc: 2, c: 3, x: 2, s: 6, xe: 'limit', d: ['easy']});
    expect(summary.sessions[2].acts.mapping).toEqual({n: 3, g: 3, f: 3, fc: 3, c: 3, s: 3, st: 3, sl: 3, sa: 1, d: ['medium']});
    // Practice-only rows are items, never graded ones.
    expect(summary.sessions[3].acts.letter_tracing).toEqual({n: 2, s: 2, d: ['hard']});
    // A row saved before first-try data existed: graded, first try not recorded.
    expect(summary.sessions[0].acts.rhyming).toEqual({n: 1, g: 1, c: 1});
    expect(summary.sessions[1].start).toBe(at(11, 3, 9, 0));
    expect(summary.count).toBe(4);
  });

  it('outlives the 40-row cut and never counts a row twice when saved again', () => {
    const rows = [];
    for (let s = 0; s < 5; s++) for (let i = 0; i < 20; i++) {
      rows.push(item('big' + s, at(11, 1 + s, 9, i), i < 12 ? 'blending' : 'orthography', 'w' + i, i % 3 ? 'first' : 'miss', i % 3 ? {} : {wrong: ['x' + (i % 2)]}));
    }
    const full = AC.summary({history: rows});
    const saved = AC.trim({wordSoundsState: {history: rows}});
    expect(saved.wordSoundsState.history).toHaveLength(40);
    expect(saved.wordSoundsState.wsSessions).toEqual(full);
    expect(totals(saved.wordSoundsState.wsSessions)).toBe(100);
    // Stored as JSON, loaded and saved again: the same numbers.
    const reloaded = JSON.parse(JSON.stringify(saved));
    const again = AC.trim(reloaded);
    expect(again.wordSoundsState.wsSessions).toEqual(full);
    expect(AC.trim(JSON.parse(JSON.stringify(again))).wordSoundsState.wsSessions).toEqual(full);
    // Three newer rows arrive: only they are added.
    reloaded.wordSoundsState.history.push(
      item('big5', at(11, 8, 9, 0), 'blending', 'new', 'first'), item('big5', at(11, 8, 9, 1), 'blending', 'new', 'miss', {wrong: ['x0']}),
      item('big4', at(11, 8, 9, 2), 'blending', 'late', 'first'));
    const grown = AC.trim(reloaded).wordSoundsState.wsSessions;
    expect(totals(grown)).toBe(103);
    expect(grown.sessions.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(grown.sessions[4].acts.blending.n).toBe(13);
    expect(grown.wrong['w0\tx0']).toBe(full.wrong['w0\tx0']);
    expect(grown.wrong['new\tx0']).toBe(1);
  });

  it('keeps the 60 most recent sessions and their original numbers', () => {
    const rows = [];
    for (let s = 0; s < 70; s++) rows.push(item('s' + s, at(1, 1, 8) + s * 86400000, 'rhyming', 'hat', 'first'));
    const summary = AC.summary({history: rows});
    expect(summary.sessions).toHaveLength(60);
    expect([summary.sessions[0].n, summary.sessions[59].n, summary.count]).toEqual([11, 70, 70]);
    expect(JSON.stringify(summary).length).toBeLessThan(8000);
  });

  it('loads student data saved before any of this existed', () => {
    const old = {sessionScore: {correct: 3, total: 4}, history: [{word: 'cat', correct: true}, {word: 'dog', isCorrect: false}, null, 'x']};
    const summary = AC.summary(old);
    expect(summary.sessions).toEqual([{id: 'd:undated', n: 1, start: 0, acts: {unknown: {n: 2, g: 2, c: 1}}}]);
    const skills = AC.bySkill(summary);
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({key: '', items: 2, firstTryItems: 0, percent: null, notRecorded: 2, needsSupport: false});
    expect(AC.recent(summary)[0]).toMatchObject({date: '', percent: null, extra: 0});
    expect(AC.wrongList(summary)).toEqual([]);
    for (const broken of [null, {}, {history: 'no'}, {history: [], wsSessions: 'no'}, {wsSessions: {sessions: [null, 3, {id: 7}], wrong: 5}}]) {
      expect(AC.summary(broken).sessions).toEqual([]);
      expect(AC.bySkill(AC.summary(broken))).toEqual([]);
    }
    expect(AC.trim({wordSoundsState: {history: []}}).wordSoundsState.wsSessions.sessions).toEqual([]);
  });
});

describe('by skill, recent sessions and wrong answers', () => {
  const summary = () => AC.summary({history: FALCON_ROWS()});
  it('gives first-try numbers per strand and activity, in teaching order', () => {
    const skills = AC.bySkill(summary());
    expect(skills.map((s) => [s.key, s.allItems, s.items, s.firstTryItems, s.firstTryCorrect, s.percent, s.notRecorded, s.needsSupport])).toEqual([
      ['syllables_rhyme', 1, 1, 0, 0, null, 1, false],
      ['hearing_sounds', 12, 12, 12, 5, 42, 0, true],
      ['letters_sounds', 5, 3, 3, 3, 100, 0, false],
    ]);
    expect(skills[1].activities.map((a) => [a.id, a.firstTryItems, a.firstTryCorrect, a.percent, a.needsSupport, a.extra])).toEqual([
      ['isolation', 2, 2, 100, false, 0], ['blending', 10, 3, 30, true, 2]]);
    expect(skills[2].activities.map((a) => [a.id, a.allItems, a.items])).toEqual([['mapping', 3, 3], ['letter_tracing', 2, 0]]);
  });
  it('flags only under 50% on at least 6 first-try items', () => {
    const flag = (right, wrong) => AC.bySkill(AC.summary({history: [
      ...Array.from({length: right}, (_, i) => item('s', at(11, 1, 9, i), 'rhyming', 'a', 'first')),
      ...Array.from({length: wrong}, (_, i) => item('s', at(11, 1, 10, i), 'rhyming', 'b', 'miss')),
    ]}))[0].needsSupport;
    expect([flag(2, 4), flag(3, 3), flag(2, 3), flag(0, 5), flag(0, 6)]).toEqual([true, false, false, false, true]);
    // Six rows that do not say how many tries were used: nothing to flag.
    const silent = AC.bySkill(AC.summary({history: Array.from({length: 6}, (_, i) => ({timestamp: at(11, 1, 9, i), activity: 'rhyming', word: 'a', correct: false}))}))[0];
    expect([silent.needsSupport, silent.percent, silent.notRecorded]).toEqual([false, null, 6]);
  });
  it('lists sessions newest first and marks the ones that needed more practice', () => {
    expect(AC.recent(summary()).map((s) => [s.number, s.date, s.activities, s.percent, s.extra, s.extraIn])).toEqual([
      [4, '2026-11-10', ['isolation', 'letter_tracing'], 100, 0, []],
      [3, '2026-11-05', ['blending', 'mapping'], 57, 0, []],
      [2, '2026-11-03', ['blending'], 33, 2, ['blending']],
      [1, '2026-10-01', ['rhyming'], null, 0, []],
    ]);
  });
  it('lists the most frequent wrong answers by word', () => {
    const list = AC.wrongList(summary(), 5);
    expect(list).toEqual([{word: 'cat', picked: 'cap', count: 3}, {word: 'cat', picked: 'cot', count: 1}, {word: 'chip', picked: 'chop', count: 1},
      {word: 'chip', picked: 'ship', count: 1}, {word: 'moth', picked: 'mop', count: 1}]);
    expect(AC.wrongText(null, list[0])).toBe("cat: picked 'cap' 3 times");
    expect(AC.wrongText(null, list[1])).toBe("cat: picked 'cot' once");
  });
});

// ── Class Analytics, mounted ──
const STORE_KEY = 'alloflow_ac_imported_students';
const stats = {quizAvg: 0, wsAccuracy: 61, wsWordsCompleted: 18, wsBestStreak: 0, fluencyWCPM: 0, gamesPlayed: 0, totalActivities: 0, labelChallengeAvg: 0, adventureXP: 0};
const student = (id, name, wordSoundsState) => ({id, name, stats, safetyFlags: [], screeningHistory: [], data: wordSoundsState ? {wordSoundsState} : {}});
const CLASS = () => [
  student('s1', 'Swift Falcon', {history: FALCON_ROWS(), confusionPatterns: {'b->d': 2}}),
  student('s2', '=SUM(A1), "Lee"', {history: [item('z1', at(11, 4, 9), 'orthography', '-tion', 'miss', {wrong: ['=1+1', '@x']})]}),
  student('s3', 'Old Heron', {sessionScore: {correct: 1, total: 2}, history: [{word: 'cat', correct: true}, {word: 'dog', correct: false}]}),
  student('s4', 'No Data Owl', null),
];
const HEADER = ['Student', 'Date', 'Session number', 'Activity', 'Skill strand', 'Items', 'First-try items recorded', 'First-try correct', 'First-try %',
  'Correct with retries', 'Extra practice items', 'Extra practice ended', 'Supports used', 'Difficulty'];
const FALCON_CSV = [
  ['Swift Falcon', '2026-10-01', '1', 'Rhyme Time', 'Syllables and rhyme', '1', '0', '', '', '1', '0', '', 'not recorded', ''],
  ['Swift Falcon', '2026-11-03', '2', 'Blend Sounds', 'Hearing sounds', '6', '6', '2', '33', '3', '2', 'item limit', 'none', 'easy'],
  ['Swift Falcon', '2026-11-05', '3', 'Blend Sounds', 'Hearing sounds', '4', '4', '1', '25', '2', '0', '', 'none', 'medium'],
  ['Swift Falcon', '2026-11-05', '3', 'Sound Mapping', 'Letters and sounds', '3', '3', '3', '100', '3', '0', '', 'word in print 3; letter hints 3; picture symbols (AAC) 1', 'medium'],
  ['Swift Falcon', '2026-11-10', '4', 'Find Sounds', 'Hearing sounds', '2', '2', '2', '100', '2', '0', '', 'word in print 1; anchor card 2', 'hard'],
  ['Swift Falcon', '2026-11-10', '4', 'Letter Trace', 'Letters and sounds', '2', '0', '', '', '', '0', '', 'none', 'hard'],
];
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const QUOTED_LINE = /^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/;
const textOf = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const localStamp = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

describe('Class Analytics', () => {
  let Panel, root, host, blobs, downloads, savedUrl, toast;
  const bytesOf = (blob) => new Promise((done) => { const reader = new FileReader(); reader.onload = () => done(new Uint8Array(reader.result)); reader.readAsArrayBuffer(blob); });
  const press = async (button) => { await act(async () => { button.click(); await Promise.resolve(); }); };
  const mount = async (students = CLASS()) => {
    localStorage.setItem(STORE_KEY, JSON.stringify(students));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    toast = vi.fn();
    await act(async () => {
      root.render(React.createElement(Panel, {isOpen: true, onClose: vi.fn(), theme: 'light', t: (k) => k, loadProbeBanks: () => Promise.resolve(), addToast: toast,
        interventionLogs: {}, probeHistory: {}, rtiGoals: {}, externalCBMScores: {}}));
      await Promise.resolve();
    });
  };
  const saved = async (button) => {
    expect(button, 'button').toBeTruthy();
    const before = blobs.length;
    await press(button);
    expect(blobs.length, 'one file per click').toBe(before + 1);
    const bytes = await bytesOf(blobs[blobs.length - 1]);
    const text = new TextDecoder('utf-8', {ignoreBOM: true}).decode(bytes);
    return {bytes, text, rows: parseCsv(text.replace(/^\uFEFF/, '')), name: downloads[downloads.length - 1]};
  };
  const exportButton = (part) => document.body.querySelector('[data-ws-results-export="' + part + '"]');
  const open = async (name) => press(document.body.querySelector('button[aria-label="View details for ' + name + '"]'));

  beforeAll(() => {
    globalThis.React = window.React = React;
    globalThis.X = window.X = () => null;
    window.ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    new Function(analytics)();
    Panel = window.AlloModules.StudentAnalytics;
    if (!Panel) throw Error('StudentAnalytics did not register');
  });
  beforeEach(() => {
    blobs = []; downloads = [];
    savedUrl = {create: URL.createObjectURL, revoke: URL.revokeObjectURL};
    URL.createObjectURL = vi.fn((blob) => { blobs.push(blob); return 'blob:results-' + blobs.length; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { downloads.push(this.download); });
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    if (host) host.remove();
    root = null; host = null;
    localStorage.clear();
    URL.createObjectURL = savedUrl.create; URL.revokeObjectURL = savedUrl.revoke;
    vi.restoreAllMocks();
  });

  it('saves "Word Sounds sessions (CSV)": one row per student, session and activity', async () => {
    await mount();
    const button = exportButton('sessions');
    expect(textOf(button)).toBe('Word Sounds sessions (CSV)');
    const {bytes, text, rows, name} = await saved(button);
    expect(name).toBe('word_sounds_sessions_' + localStamp() + '.csv');
    expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]);
    expect(rows[0]).toEqual(HEADER);
    expect(rows.slice(1, 7)).toEqual(FALCON_CSV);
    // A student name and nothing else can start with = here; it stays text.
    expect(rows[7]).toEqual(["'=SUM(A1), \"Lee\"", '2026-11-04', '1', 'Sight & Spell', 'Spelling', '1', '1', '0', '0', '0', '0', '', 'none', 'easy']);
    expect(rows[8]).toEqual(['Old Heron', '', '1', 'Activity not recorded', '', '2', '0', '', '', '1', '0', '', 'not recorded', '']);
    expect(rows).toHaveLength(9);
    const lines = text.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines.pop()).toBe('');
    for (const line of lines) expect(line).toMatch(QUOTED_LINE);
    expect(text).toContain('"\'=SUM(A1), ""Lee"""');
    const message = toast.mock.calls[toast.mock.calls.length - 1];
    expect(message[0]).toContain('Students included: 3.');
    expect(message[0]).toContain('no Word Sounds results: 1.');
    expect(message[0]).toContain('saved on this device');
  });

  it('saves the class by skill: first-try % per strand and who needs support', async () => {
    await mount();
    const {rows, name} = await saved(exportButton('skills'));
    expect(name).toBe('word_sounds_by_skill_' + localStamp() + '.csv');
    expect(rows[0]).toEqual(['Student', ...CORE.SKILL_STRANDS.flatMap((s) => [s.name + ': first-try items', s.name + ': first-try %']), 'Needs support in']);
    expect(rows[1]).toEqual(['Swift Falcon', '0', '', '12', '42', '3', '100', '0', '', '0', '', '0', '', 'Hearing sounds']);
    expect(rows[2].slice(7, 9)).toEqual(['1', '0']);
    expect(rows[3]).toEqual(['Old Heron', '0', '', '0', '', '0', '', '0', '', '0', '', '0', '', '']);
    expect(rows).toHaveLength(4);
  });

  it('leaves the two older Word Sounds files and their buttons as they were', async () => {
    await mount([student('s1', 'Swift Falcon', {history: FALCON_ROWS(), phonemeMastery: {k: {total: 4, correct: 3, independentAttempts: 4, independentAccuracy: 75}}})]);
    expect([...document.body.querySelectorAll('[data-ws-results-export]')].map((b) => [b.getAttribute('data-ws-results-export'), textOf(b)])).toEqual([
      ['results', 'Export Word Sounds results (CSV)'], ['summary', 'Word Sounds summary by sound (CSV)'],
      ['sessions', 'Word Sounds sessions (CSV)'], ['skills', 'Word Sounds by skill (CSV)']]);
    expect((await saved(exportButton('results'))).rows[0]).toEqual(['Student', 'Sound', 'Attempts', 'Correct', 'Accuracy %', 'Mastered', 'Last practiced', 'First-try items', 'First-try correct', 'First-try accuracy %']);
    expect((await saved(exportButton('summary'))).rows[0]).toEqual(['Sound', 'Students practicing', 'Mean accuracy %', 'Students mastered']);
  });

  it('says so when there is nothing to save, and saves nothing', async () => {
    await mount([student('s4', 'No Data Owl', null)]);
    await press(exportButton('sessions'));
    expect(blobs).toHaveLength(0);
    expect(toast).toHaveBeenLastCalledWith('No imported student has Word Sounds session results yet.', 'warning');
  });

  it('shows one student by skill, with a worded flag, and the recent sessions', async () => {
    await mount();
    await open('Swift Falcon');
    const skill = document.body.querySelector('table[data-ws-by-skill]');
    expect(skill.querySelector('caption').textContent).toBe('Word Sounds by skill');
    expect([...skill.querySelectorAll('thead th')].map((th) => [th.getAttribute('scope'), th.textContent])).toEqual([['col', 'Skill'], ['col', 'Items'], ['col', 'Right on the first try']]);
    const line = (row) => [...row.children].map(textOf);
    expect([...skill.querySelectorAll('tbody tr')].map(line)).toEqual([
      ['Syllables and rhyme', '1', 'not recorded'],
      ['Rhyme Time', '1', 'not recorded'],
      ['Hearing sounds', '12', '42% (5 of 12)\u26A0 Needs support'],
      ['Find Sounds', '2', '100% (2 of 2)'],
      ['Blend Sounds', '10', '30% (3 of 10)\u26A0 Needs support'],
      ['Letters and sounds', '5', '100% (3 of 3)'],
      ['Sound Mapping', '3', '100% (3 of 3)'],
      ['Letter Trace', '2', 'practice only'],
    ]);
    expect([...skill.querySelectorAll('tbody tr')].every((row) => row.firstElementChild.matches('th[scope="row"]'))).toBe(true);
    expect([...skill.querySelectorAll('[data-ws-needs-support]')].map((el) => el.closest('tr').getAttribute('data-ws-strand') || el.closest('tr').getAttribute('data-ws-activity'))).toEqual(['hearing_sounds', 'blending']);
    const sessions = document.body.querySelector('table[data-ws-recent-sessions]');
    expect([...sessions.querySelectorAll('tbody tr')].map(line)).toEqual([
      ['2026-11-10', 'Find Sounds, Letter Trace', '100% (2 of 2)', '\u2013'],
      ['2026-11-05', 'Blend Sounds, Sound Mapping', '57% (4 of 7)', '\u2013'],
      ['2026-11-03', 'Blend Sounds', '33% (2 of 6)', 'Needed more practice: 2 extra items (Blend Sounds)'],
      ['2026-10-01', 'Rhyme Time', 'not recorded', '\u2013'],
    ]);
    expect(sessions.querySelector('[data-ws-more-practice="2"]')).toBeTruthy();
    const wrong = document.body.querySelector('[data-ws-wrong-answers]');
    expect(textOf(wrong.querySelector('h4'))).toBe('Most frequent wrong answers');
    expect([...wrong.querySelectorAll('li')].map(textOf)).toEqual(["cat: picked 'cap' 3 times", "cat: picked 'cot' once", "chip: picked 'chop' once", "chip: picked 'ship' once", "moth: picked 'mop' once"]);
    // Most Confused Sounds stays, above the wrong answers.
    const confused = [...document.body.querySelectorAll('h4')].find((h) => /Most Confused Sounds|confused_pairs/.test(h.textContent));
    expect(confused).toBeTruthy();
    expect(confused.compareDocumentPosition(wrong) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.body.textContent).toContain('The file is saved on this device. Nothing is sent anywhere.');
  });

  it("saves this student's record with the same columns", async () => {
    await mount();
    await open('Swift Falcon');
    const button = document.body.querySelector('[data-ws-student-csv]');
    expect(textOf(button)).toBe("Download this student's Word Sounds record (CSV)");
    const {bytes, rows, name} = await saved(button);
    expect(name).toBe('word_sounds_record_Swift_Falcon_' + localStamp() + '.csv');
    expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]);
    expect(rows).toEqual([HEADER, ...FALCON_CSV]);
  });

  it('shows a student saved before the new fields without errors: "not recorded", never 0%', async () => {
    await mount();
    await open('Old Heron');
    const skill = document.body.querySelector('table[data-ws-by-skill]');
    expect([...skill.querySelectorAll('tbody tr')].map((row) => [...row.children].map(textOf))).toEqual([
      ['Other activities', '2', 'not recorded'], ['Activity not recorded', '2', 'not recorded']]);
    expect([...document.body.querySelectorAll('table[data-ws-recent-sessions] tbody tr')].map((row) => [...row.children].map(textOf))).toEqual([
      ['date not recorded', 'Activity not recorded', 'not recorded', '\u2013']]);
    expect(skill.textContent).not.toMatch(/\d%/);
    expect(document.body.querySelector('[data-ws-wrong-answers]')).toBeNull();
    expect(document.body.querySelector('[data-ws-needs-support]')).toBeNull();
  });

  it('adds both tables to the downloaded student report, without flags', async () => {
    await mount();
    await open('Swift Falcon');
    const button = [...document.body.querySelectorAll('button')].find((b) => textOf(b) === 'Student Report');
    const before = blobs.length;
    await press(button);
    expect(blobs.length).toBe(before + 1);
    const html = new TextDecoder().decode(await bytesOf(blobs[blobs.length - 1]));
    const report = new DOMParser().parseFromString(html, 'text/html');
    const tables = [...report.querySelectorAll('[data-ws-report-tables] table')];
    expect(tables.map((table) => table.querySelector('caption').textContent)).toEqual(['Word Sounds by skill', 'Recent Word Sounds sessions']);
    expect([...tables[0].querySelectorAll('tbody tr')].map((row) => [...row.children].map(textOf))[2]).toEqual(['Hearing sounds', '12', '42% (5 of 12)']);
    expect([...tables[1].querySelectorAll('tbody tr')].map((row) => [...row.children].map(textOf))[2]).toEqual(['2026-11-03', 'Blend Sounds', '33% (2 of 6)', '2']);
    expect(report.body.textContent).not.toMatch(/needs support/i);
  });

  it('escapes names in the report tables', () => {
    const html = AC.reportHtml((key) => key === 'word_sounds.activity_rhyming' ? '<img src=x onerror=1>' : key, {history: [item('s', at(11, 1, 9), 'rhyming', 'hat', 'first')]});
    expect(html).toContain('&lt;img src=x onerror=1&gt;');
    expect(html).not.toContain('<img');
    expect(AC.reportHtml(null, {history: []})).toBe('');
  });
});

// ── The player's session-complete screen ──
describe('Download results (CSV) in the player', () => {
  let Modal, root, container, current, originalAudio, originalGlobalAudio, files, names;
  class CompleteAudio {
    constructor(src = '') { this.src = src; this.paused = true; this.listeners = new Map(); queueMicrotask(() => this.emit('canplaythrough')); }
    addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
    emit(name) { this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn(); }
    canPlayType() { return 'probably'; }
    load() { queueMicrotask(() => { this.emit('loadedmetadata'); this.emit('canplaythrough'); }); }
    removeAttribute() {}
    pause() { this.paused = true; }
    play() { this.paused = false; setTimeout(() => { if (!this.paused) { this.ended = true; this.emit('ended'); } }, 1); return Promise.resolve(); }
  }
  const SOUNDS = {ship: ['sh', 'i', 'p'], frog: ['f', 'r', 'o', 'g'], go: ['g', 'o'], stop: ['s', 't', 'o', 'p'], me: ['m', 'e'],
    lamp: ['l', 'a', 'm', 'p'], sun: ['s', 'u', 'n'], no: ['n', 'o'], flag: ['f', 'l', 'a', 'g'], map: ['m', 'a', 'p']};
  const packItem = (word) => {
    const phonemes = SOUNDS[word];
    return {...makePackItem(), id: word, term: word, word, targetWord: word, displayWord: word, phonemes, graphemes: phonemes,
      phonemeCount: phonemes.length, syllables: [word], rhymeWord: '', rhymes: [], firstSound: phonemes[0], _ttsAssets: undefined, activityItems: {}};
  };
  const WORDS = Object.keys(SOUNDS).map(packItem);
  const PLAN = {id: 'results', title: 'Week 3: Short Vowels!', masteryThreshold: 3, activities: [{id: 'counting', count: 4}], order: ['counting']};
  const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).word_sounds;
  const strings = (_t, key, params = {}) => {
    let text = english[String(key).replace('word_sounds.', '')] || '';
    for (const [name, value] of Object.entries(params || {})) text = text.split('{' + name + '}').join(String(value));
    return text;
  };
  function Host(overrides) {
    const [activity, setActivity] = React.useState('counting');
    const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
    const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
    const [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
    const [confusions, setConfusions] = React.useState({});
    current = {activity, word, history};
    return React.createElement(Modal, {...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false,
      disableAnimations: true, sessionId: 'results-csv', learnerId: 'Brave Otter', wsPreloadedWords: WORDS, wordSoundsLanguage: 'en',
      wordSoundsDifficulty: 'auto', wordSoundsSessionGoal: 10, onClose: () => {}, getWordSoundsString: strings,
      lessonPlanConfig: PLAN, initialActivitySequence: ['counting'], ...overrides,
      wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
      currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
      wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
      wordSoundsScore: score, setWordSoundsScore: setScore,
      wordSoundsHistory: history, setWordSoundsHistory: setHistory,
      wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
      wordSoundsConfusionPatterns: confusions, setWordSoundsConfusionPatterns: setConfusions});
  }
  const tick = async (ms) => { await act(async () => vi.advanceTimersByTimeAsync(ms)); };
  const mount = async (overrides = {}) => {
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Host, overrides))); await tick(120);
  };
  const numbers = () => [...container.querySelectorAll('[role="button"][aria-label^="Number "]')];
  const tap = async (wantRight, skip = 0) => {
    const right = 'Number ' + SOUNDS[String(current.word).toLowerCase()].length;
    const target = numbers().filter((b) => (b.getAttribute('aria-label') === right) === wantRight)[skip];
    expect(target, (wantRight ? 'right' : 'wrong') + ' number for ' + current.word).toBeTruthy();
    await act(async () => target.click());
  };
  const answer = async (kind) => {
    const before = current.history.length;
    if (kind === 'first') await tap(true);
    else { await tap(false, 0); await tap(false, 1); }
    expect(current.history.length).toBe(before + 1);
    await tick(9000);
  };
  const recap = () => container.querySelector('[aria-labelledby="word-sounds-session-complete-title"]');
  const finish = async (isTeacherMode) => {
    await mount({isTeacherMode});
    // Three misses and a hit start extra practice; four more misses reach the limit.
    for (const kind of ['miss', 'miss', 'miss', 'first', 'miss', 'miss', 'miss', 'miss']) await answer(kind);
    await tick(3000);
    expect(recap(), 'session recap').toBeTruthy();
  };

  beforeAll(() => { installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds()); });
  beforeEach(() => {
    // 23:30 local on 9 November: the UTC date is already the 10th west of Greenwich, or still the 9th east of it.
    vi.useFakeTimers({now: new Date(2026, 10, 9, 23, 30).getTime(), toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
    window.Audio = globalThis.Audio = CompleteAudio;
    files = []; names = [];
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options && options.type; } });
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { files.push(blob); return 'blob:player-' + files.length; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { names.push(this.download); });
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    root = null; container?.remove();
    window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
    vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  });

  it('is on the teacher recap and saves the rows the recap shows', async () => {
    await finish(true);
    const button = recap().querySelector('[data-ws-results-csv-button]');
    expect(button, 'teacher button').toBeTruthy();
    expect(button.textContent).toBe('Download results (CSV)');
    expect(recap().querySelector('[data-ws-results-csv]').textContent).toContain('saved on this device');
    await act(async () => button.click());
    expect(files).toHaveLength(1);
    expect(files[0].type).toBe('text/csv;charset=utf-8');
    // Local date, with the lesson title.
    expect(names).toEqual(['word-sounds-results-week-3-short-vowels-2026-11-09.csv']);
    const text = files[0].parts.join('');
    expect(text.charCodeAt(0)).toBe(0xFEFF);
    const rows = parseCsv(text.slice(1));
    expect(rows[0]).toEqual(['Date and time', 'Learner', 'Activity', 'Skill strand', 'Word', 'Right on first try', 'Tries', 'Wrong answers picked', 'Extra practice', 'Support shown', 'Difficulty']);
    const saved = current.history.filter((row) => row.activity === 'counting');
    expect(rows.slice(1)).toHaveLength(8);
    expect(rows.slice(1).map((r) => [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]])).toEqual(saved.map((row) => [
      'Brave Otter', 'Sound Counting', 'Hearing sounds', row.word, row.correct && row.firstTry ? 'yes' : 'no', String(row.attempts), (row.wrong || []).join('; '), row.extended ? 'yes' : 'no']));
    expect(rows.slice(1).map((r) => r[5])).toEqual(['no', 'no', 'no', 'yes', 'no', 'no', 'no', 'no']);
    expect(rows.slice(1).map((r) => r[8])).toEqual(['no', 'no', 'no', 'no', 'yes', 'yes', 'yes', 'yes']);
    expect(rows[1][7].split('; ')).toHaveLength(2);
    for (const r of rows.slice(1)) expect(r[0]).toMatch(/^2026-11-(09|10) \d\d:\d\d$/);
    // The words are the recap's words.
    const recapWords = [...recap().querySelectorAll('[data-ws-recap-word]')].map((el) => el.getAttribute('data-ws-recap-word').toLowerCase());
    expect([...new Set(rows.slice(1).map((r) => r[4].toLowerCase()))].sort()).toEqual([...recapWords].sort());
    for (const line of text.slice(1).split('\r\n').slice(0, -1)) expect(line).toMatch(QUOTED_LINE);
  });

  it('is never on the student recap', async () => {
    await finish(false);
    expect(recap().querySelector('[data-ws-results-csv]')).toBeNull();
    expect(recap().querySelector('[data-ws-results-csv-button]')).toBeNull();
    expect(recap().textContent).not.toMatch(/CSV|Download results/);
  });

  it('builds the file from the rows alone: quoting, formula guard, local-date name', () => {
    const build = window.__alloWordSoundsResultsCsv;
    expect(typeof build).toBe('function');
    const when = new Date(2026, 10, 9, 23, 45).getTime();
    const file = build([
      {word: '=cmd', activity: 'blending', correct: false, attempts: 2, extended: true, record: {at: when, learner: '@Kit, "K"', wrong: ['-x', '+y'], difficulty: 'easy', textSupported: true, cluesShown: ['printed_word', 'anchor_card'], aacAssisted: true}},
      {word: 'map', activity: 'letter_tracing', correct: true, attempts: 1, record: {at: when, practiceOnly: true, cluesShown: []}},
      {word: 'old', activity: 'mystery_game', correct: true, attempts: 1},
      {activity: 'blending'}, null,
    ], {title: '  Día 2 / Señales  ', now: new Date(2026, 10, 9, 23, 59), activityName: (id) => CORE.activityLabel(id), strandName: (id) => CORE.strandLabel(CORE.activityStrand(id))});
    expect(file.name).toBe('word-sounds-results-día-2-señales-2026-11-09.csv');
    expect(parseCsv(file.text.slice(1)).slice(1)).toEqual([
      ['2026-11-09 23:45', "'@Kit, \"K\"", 'Blend Sounds', 'Hearing sounds', "'=cmd", 'no', '2', "'-x; +y", 'yes', 'word in print; anchor card; picture symbols (AAC)', 'easy'],
      ['2026-11-09 23:45', '', 'Letter Trace', 'Letters and sounds', 'map', 'practice only', '1', '', 'no', 'none', ''],
      ['', '', 'Mystery game', '', 'old', 'yes', '1', '', 'no', 'none', ''],
    ]);
    expect(file.text).toContain('"\'@Kit, ""K"""');
    expect(build([], {now: new Date(2026, 0, 5)}).name).toBe('word-sounds-results-lesson-2026-01-05.csv');
  });
});
