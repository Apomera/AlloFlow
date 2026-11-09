// Host side of the 2026-11-09 Word Sounds fix batch.
//
// 1. XP shown is XP credited. The player reports each item's XP; the host used
//    to pass it through the high-score handler, which credits only the amount
//    above the best single score stored for the open resource.
// 3. A student save file holds only the saving learner's Word Sounds rows.
// 4. Class analytics keeps the confused-sound pairs and per-sound dates across
//    a reload, and reports first-try accuracy beside the with-retries figure.
// 5. A failed player download shows a message and a Try again button that
//    really starts the download again.
//
// The host code is cut from AlloFlowANTI.txt and run; the analytics helpers are
// cut from student_analytics_module.js and run; the save runs the built module.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const analytics = readFileSync(resolve(process.cwd(), 'student_analytics_module.js'), 'utf8');

const between = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error('Missing source boundary: ' + start + ' / ' + end);
  return source.slice(from, to);
};
const braceBlock = (source, marker) => {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error('Missing: ' + marker);
  const open = source.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(at, i + 1);
  }
  throw new Error('Unbalanced: ' + marker);
};

// ── 1. XP ────────────────────────────────────────────────────────────────────

// The three host handlers, run with plain state instead of React state.
function makeHost(resourceId) {
  const state = { globalPoints: 0, pointHistory: [], completedActivities: new Map(), toasts: [] };
  const setter = key => update => { state[key] = typeof update === 'function' ? update(state[key]) : update; };
  const source = between(anti, '  const handleScoreUpdate = useCallback(', '  const recordGameCompletion =')
    + between(anti, '  const handleGameScoreUpdate = useCallback(', '  // Live-session state must be initialized');
  const build = new Function('useCallback', 'state', 'setGlobalPoints', 'setPointHistory', 'setCompletedActivities', 'addToast', 't', 'generatedContent', 'window',
    'const completedActivities = state.completedActivities;\n' + source + '\nreturn { handleScoreUpdate, handleGameScoreUpdate, handleWordSoundsScoreUpdate };');
  // A fresh closure per call stands in for React re-creating the callbacks after each state change.
  const handlers = () => build(fn => fn, state, setter('globalPoints'), setter('pointHistory'), setter('completedActivities'),
    (message, type) => state.toasts.push({ message, type }), key => key, { id: resourceId }, { dispatchEvent() {} });
  return { state, handlers };
}
const historyTotal = state => state.pointHistory.reduce((sum, row) => sum + row.points, 0);

describe('Word Sounds XP: what the player shows is what the host credits', () => {
  it('credits ten items of 12 as 120 with a resource open, and again on a second run', () => {
    const { state, handlers } = makeHost('resource-1');
    for (let i = 0; i < 10; i++) handlers().handleWordSoundsScoreUpdate(12, 'word_sounds_counting');
    expect(state.globalPoints).toBe(120);
    expect(historyTotal(state)).toBe(120);
    for (let i = 0; i < 10; i++) handlers().handleWordSoundsScoreUpdate(12, 'word_sounds_counting');
    expect(state.globalPoints).toBe(240);
    expect(historyTotal(state)).toBe(240);
    expect(state.toasts, 'the player shows its own XP float and total').toEqual([]);
    expect(state.completedActivities.size, 'Word Sounds XP is not a high score').toBe(0);
  });

  it('the old route through the high-score handler credited 12 of those 120', () => {
    const { state, handlers } = makeHost('resource-1');
    for (let i = 0; i < 10; i++) handlers().handleGameScoreUpdate(12, 'word_sounds_counting');
    expect(state.globalPoints).toBe(12);
    for (let i = 0; i < 10; i++) handlers().handleGameScoreUpdate(12, 'word_sounds_counting');
    expect(state.globalPoints, 'nothing at all on the second run').toBe(12);
  });

  it('credits the growing streak awards in full', () => {
    const awards = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
    const { state, handlers } = makeHost('resource-1');
    awards.forEach(points => handlers().handleWordSoundsScoreUpdate(points, 'word_sounds_blending'));
    expect(state.globalPoints).toBe(210);
    expect(historyTotal(state)).toBe(210);
  });

  it('keeps one history row per activity run instead of one per item', () => {
    const { state, handlers } = makeHost('resource-1');
    for (let i = 0; i < 10; i++) handlers().handleWordSoundsScoreUpdate(12, 'word_sounds_counting');
    handlers().handleWordSoundsScoreUpdate(10, 'word_sounds_blending');
    handlers().handleWordSoundsScoreUpdate(12, 'word_sounds_counting');
    expect(state.pointHistory.map(row => [row.activity, row.points])).toEqual([
      ['word_sounds_counting', 12], ['word_sounds_blending', 10], ['word_sounds_counting', 120]]);
  });

  it('does not fold Word Sounds XP into a row another activity wrote', () => {
    const { state, handlers } = makeHost(null);
    handlers().handleScoreUpdate(40, 'word_sounds_counting');
    handlers().handleWordSoundsScoreUpdate(12, 'word_sounds_counting');
    expect(state.pointHistory.map(row => row.points)).toEqual([12, 40]);
    expect(state.globalPoints).toBe(52);
  });

  it('ignores zero, negative and non-numeric awards', () => {
    const { state, handlers } = makeHost('resource-1');
    [0, -5, NaN, undefined, 'abc'].forEach(points => expect(handlers().handleWordSoundsScoreUpdate(points, 'word_sounds_counting')).toBe(0));
    expect(state.globalPoints).toBe(0);
    expect(state.pointHistory).toEqual([]);
  });

  it('other games keep the high-score rule', () => {
    const { state, handlers } = makeHost('resource-1');
    handlers().handleGameScoreUpdate(50, 'Syntax Scramble');
    handlers().handleGameScoreUpdate(40, 'Syntax Scramble');
    handlers().handleGameScoreUpdate(70, 'Syntax Scramble');
    expect(state.globalPoints).toBe(70);
    expect(state.completedActivities.get('resource-1')).toBe(70);
  });

  it('only the Word Sounds player is wired to the full-credit handler', () => {
    const player = between(anti, 'const WS = window.AlloModules && window.AlloModules.WordSoundsModal;', 'onProbeComplete:');
    expect(player).toContain('onScoreUpdate: handleWordSoundsScoreUpdate,');
    expect(player).not.toContain('handleGameScoreUpdate');
    expect(anti.split('handleWordSoundsScoreUpdate').length - 1, 'one definition and one mount').toBe(2);
    expect(between(anti, '<SyntaxScramble', '/>')).toContain('onScoreUpdate={handleGameScoreUpdate}');
  });

  it('the player still gives no XP in a probe, so the host has nothing to credit', () => {
    const player = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    const award = between(player, 'let awardedXP = 0;', 'awardedXP = baseXP');
    expect(award).toMatch(/if \(isCorrect && !isProbeMode\) \{/);
    expect(player).toMatch(/if \(awardedXP > 0\) \{\s*setSessionXPEarned\([^\n]+\n\s*onScoreUpdate\?\.\(awardedXP,/);
  });
});

// ── 3. Save files ────────────────────────────────────────────────────────────

describe('a save file holds only the saving learner\'s Word Sounds rows', () => {
  let PhaseKHelpers, blobs;
  class TestBlob {
    constructor(parts, options) { this.parts = parts; this.type = options?.type || ''; blobs.push(this); }
    async text() { return this.parts.join(''); }
  }
  const rows = [
    { word: 'cat', correct: true, learnerId: 'uid-a' },
    { word: 'dog', correct: true, learnerId: 'uid-b' },
    { word: 'sun', correct: false, learnerId: 'Bea' },
    { word: 'old', correct: true },
    { word: 'pin', correct: true, learnerId: 'uid-b' },
  ];
  const makeSaveDeps = (overrides = {}) => ({
    saveFileName: 'student-project', saveType: 'student',
    history: [{ id: 'lesson-1', type: 'lesson-plan', title: 'Lesson' }],
    studentProgressLog: [], studentResponses: {}, studentNickname: 'Bea', studentProjectSettings: {},
    adventureState: {}, escapeRoomState: {}, completedActivities: new Map(), socraticMessages: [],
    fluencyAssessments: [], flashcardEngagement: {}, timeOnTask: {}, pointHistory: [], probeHistory: [],
    interventionLogs: [], surveyResponses: [], fidelityLog: [], externalCBMScores: [], gameCompletions: {},
    labelChallengeResults: [], wordSoundsHistory: rows, wordSoundsBadges: {}, phonemeMastery: {},
    wordSoundsDailyProgress: {}, wordSoundsConfusionPatterns: {}, wordSoundsFamilies: {}, wordSoundsAudioLibrary: {},
    wordSoundsScore: {}, globalPoints: 0, sessionCounter: 1, _isCanvasEnv: true, user: { uid: 'uid-b' },
    addToast() {}, warnLog() {}, t(key) { return key; },
    setStudentProgressLog() {}, setLastJsonFileSave() {}, setIsSaveActionPulsing() {}, setShowSaveModal() {},
    getFocusRatio() { return null; },
    ...overrides,
  });
  const saved = async (overrides) => {
    const result = await PhaseKHelpers.executeSaveFile(makeSaveDeps(overrides), { privacyConfirmed: true });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    return JSON.parse(await blobs[blobs.length - 1].text());
  };

  beforeAll(() => {
    globalThis.React = React;
    window.React = React;
    window.AlloIcons = new Proxy({}, { get: () => () => null });
    ['phase_k_helpers_module.js', 'firestore_sync_module.js', 'instructional_context_module.js', 'session_transport_module.js', 'live_aac_module.js'].forEach(loadAlloModule);
    PhaseKHelpers = window.AlloModules.PhaseKHelpers;
  });
  let clickSpy;
  beforeEach(() => {
    blobs = [];
    window.__alloflowSelToolData = null;
    vi.stubGlobal('Blob', TestBlob);
    URL.createObjectURL = vi.fn(() => 'blob:ws-fix-batch');
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.AlloFlowUX = { confirm: async () => true };
  });
  afterEach(() => { clickSpy.mockRestore(); vi.unstubAllGlobals(); delete window.AlloFlowUX; });

  it('a student file leaves out another learner\'s rows and rows with no learner', async () => {
    const file = await saved();
    expect(file.mode).toBe('student');
    expect(file.wordSoundsState.history.map(row => row.word)).toEqual(['dog', 'sun', 'pin']);
    expect(JSON.stringify(file)).not.toContain('uid-a');
  });

  it('a learner known only by nickname keeps the rows saved under that nickname', async () => {
    const file = await saved({ user: null });
    expect(file.wordSoundsState.history.map(row => row.word)).toEqual(['sun']);
  });

  it('a student with no learner id at all keeps every row (own-device save)', async () => {
    const file = await saved({ user: null, studentNickname: '' });
    expect(file.wordSoundsState.history.map(row => row.word)).toEqual(['cat', 'dog', 'sun', 'old', 'pin']);
  });

  it('a teacher file keeps the whole device record', async () => {
    const file = await saved({ saveType: 'teacher' });
    expect(file.wordSoundsState.history.map(row => row.word)).toEqual(['cat', 'dog', 'sun', 'old', 'pin']);
  });

  it('the filter itself: ids are trimmed and compared as text, the input is not changed', () => {
    const filter = PhaseKHelpers.filterWordSoundsHistoryForLearner;
    const input = [{ word: 'a', learnerId: 7 }, { word: 'b', learnerId: ' Bea ' }, { word: 'c', learnerId: '' }, null];
    expect(filter(input, ['7']).map(row => row.word)).toEqual(['a']);
    expect(filter(input, [null, 'Bea']).map(row => row.word)).toEqual(['b']);
    expect(filter(input, [null, '  '])).toBe(input);
    expect(filter(undefined, ['x'])).toEqual([]);
    expect(input).toHaveLength(4);
  });

  it('loading still takes every row an older, unfiltered file holds', () => {
    // The load side copies wordSoundsState.history as it is; nothing there reads learnerId.
    const loader = readFileSync(resolve(process.cwd(), 'host_handlers_source.jsx'), 'utf8');
    const restore = between(loader, 'const wordSounds = workspace.wordSoundsState || {};', 'setWordSoundsBadges');
    expect(restore).toMatch(/setWordSoundsHistory\(/);
    expect(restore).not.toMatch(/learnerId/);
  });
});

// ── 4. Class analytics ───────────────────────────────────────────────────────

const ac = new Function(
  between(analytics, '  function _acWsSoundMastered(', '  // RFC 4180 quoting')
  + braceBlock(analytics, '  function _acTrimStudentData(data)')
  + '\nreturn { _acWsRowFirstTry, _acWsFirstTryStats, _acWsSoundSummary, _acWordSoundsResults, _acTrimStudentData, _acWsText, _acLocalDate };',
)();
const DAY = 86400000;
const START = new Date(2026, 8, 1, 10).getTime();
const row = (index, extra = {}) => ({ word: 'w' + index, activity: 'isolation', correct: true, firstTry: true,
  timestamp: new Date(START + index * DAY).toISOString(), soundLabels: ['m'], ...extra });

describe('class analytics keeps what a reload used to drop', () => {
  const mastery = { sh: { total: 6, correct: 4 }, m: { total: 60, correct: 50 } };
  const history = [
    row(0, { soundLabels: ['sh'] }), row(1, { soundLabels: ['sh'], firstTry: false }), row(2, { soundLabels: ['sh'], correct: false, firstTry: false }),
    ...Array.from({ length: 57 }, (_, i) => row(3 + i)),
  ];
  const confusionPatterns = Object.fromEntries(Array.from({ length: 60 }, (_, i) => ['t' + i + '->c' + i, i + 1]));
  const student = () => ({ name: 'Ada', data: { wordSoundsState: { history, phonemeMastery: mastery, badges: [], confusionPatterns } } });

  it('keeps the 50 most frequent confused pairs', () => {
    const kept = ac._acTrimStudentData(student().data).wordSoundsState.confusionPatterns;
    expect(Object.keys(kept)).toHaveLength(50);
    expect(kept['t59->c59']).toBe(60);
    expect(kept['t10->c10']).toBe(11);
    expect(kept['t9->c9'], 'the ten rarest pairs go').toBeUndefined();
  });

  it('drops empty, zero and malformed confusion data without failing', () => {
    const trim = cp => ac._acTrimStudentData({ wordSoundsState: { history: [], confusionPatterns: cp } }).wordSoundsState.confusionPatterns;
    expect(trim(undefined)).toEqual({});
    expect(trim(['a->b'])).toEqual({});
    expect(trim({ 'a->b': 0, 'c->d': 'x', 'e->f': 2 })).toEqual({ 'e->f': 2 });
  });

  it('a sound practised only in rows older than the 40-row cut keeps its date and first-try counts', () => {
    const trimmed = ac._acTrimStudentData(student().data);
    expect(trimmed.wordSoundsState.history).toHaveLength(40);
    expect(trimmed.wordSoundsState.history.some(h => h.soundLabels.includes('sh')), 'the sh rows were cut').toBe(false);
    const before = ac._acWordSoundsResults([student()]).rows.find(r => r.sound === 'sh');
    const after = ac._acWordSoundsResults([{ name: 'Ada', data: trimmed }]).rows.find(r => r.sound === 'sh');
    expect(after).toEqual(before);
    expect(after.lastPracticed).toBe(ac._acLocalDate(START + 2 * DAY));
    expect([after.firstTryItems, after.firstTryCorrect, after.firstTryAccuracy]).toEqual([3, 1, 33]);
    expect([after.correct, after.accuracy], 'the with-retries figure still comes from mastery').toEqual([4, 67]);
  });

  it('saving again does not count the kept rows twice', () => {
    const once = ac._acTrimStudentData(student().data);
    const twice = ac._acTrimStudentData(JSON.parse(JSON.stringify(once)));
    expect(twice.wordSoundsState.soundSummary).toEqual(once.wordSoundsState.soundSummary);
    expect(twice.wordSoundsState.soundSummary.sounds.m).toMatchObject({ firstTryItems: 57, firstTryCorrect: 57 });
  });

  it('rows added after a save are added to the saved summary', () => {
    const once = JSON.parse(JSON.stringify(ac._acTrimStudentData(student().data)));
    once.wordSoundsState.history.push(row(100, { soundLabels: ['sh'] }));
    const next = ac._acTrimStudentData(once).wordSoundsState.soundSummary.sounds.sh;
    expect(next).toEqual({ last: START + 100 * DAY, firstTryItems: 4, firstTryCorrect: 2 });
  });

  it('the survived store stays small', () => {
    const size = JSON.stringify(ac._acTrimStudentData(student().data).wordSoundsState.soundSummary).length;
    expect(size).toBeLessThan(400);
  });
});

describe('first-try accuracy beside the with-retries figure', () => {
  it('reads firstTry, and counts right-on-retry as not right first try', () => {
    const history = [
      { correct: true, firstTry: true }, { correct: true, firstTry: true }, { correct: true, firstTry: true },
      { correct: true, firstTry: false }, { correct: false, firstTry: false },
    ];
    expect(ac._acWsFirstTryStats(history)).toEqual({ items: 5, correct: 3, accuracy: 60 });
    expect(ac._acWsText(null, 'class_analytics.ws_first_try', 'First try: {percent}%', { percent: 60 })).toBe('First try: 60%');
  });

  it('reads the new wrong-picks list, with or without firstTry', () => {
    expect(ac._acWsRowFirstTry({ correct: true, wrong: [] })).toBe(true);
    expect(ac._acWsRowFirstTry({ correct: true, wrong: ['b'] })).toBe(false);
    expect(ac._acWsRowFirstTry({ correct: true, firstTry: true, wrong: ['b'] }), 'a wrong pick wins over a stale flag').toBe(false);
    expect(ac._acWsRowFirstTry({ correct: false, firstTry: true, wrong: ['b', 'd'] })).toBe(false);
    expect(ac._acWsRowFirstTry({ correct: true, firstTry: true, wrong: 'b' }), 'a malformed list is ignored').toBe(true);
  });

  it('reads older rows: the attempts count, the isCorrect name, and rows that do not say', () => {
    expect(ac._acWsRowFirstTry({ correct: true, attempts: 1 })).toBe(true);
    expect(ac._acWsRowFirstTry({ correct: true, attempts: 2 })).toBe(false);
    expect(ac._acWsRowFirstTry({ isCorrect: true, firstTry: true })).toBe(true);
    expect(ac._acWsRowFirstTry({ correct: true })).toBeNull();
    expect(ac._acWsRowFirstTry({ word: 'x' })).toBeNull();
    expect(ac._acWsRowFirstTry(null)).toBeNull();
    expect(ac._acWsFirstTryStats([{ correct: true }, { correct: false }])).toEqual({ items: 0, correct: 0, accuracy: null });
    expect(ac._acWsFirstTryStats(undefined).accuracy).toBeNull();
  });

  it('leaves practice-only rows out, like the with-retries figure does', () => {
    const history = [{ correct: true, firstTry: true, practiceOnly: true }, { correct: true, firstTry: true, activity: 'letter_tracing' }, { correct: false, firstTry: false }];
    expect(ac._acWsFirstTryStats(history)).toEqual({ items: 1, correct: 0, accuracy: 0 });
  });

  it('uses a translation when there is one and the English text when the key comes back', () => {
    expect(ac._acWsText(() => 'Primer intento: {percent}%', 'k', 'First try: {percent}%', { percent: 60 })).toBe('Primer intento: 60%');
    expect(ac._acWsText(key => key, 'class_analytics.ws_first_try', 'First try: {percent}%', { percent: 5 })).toBe('First try: 5%');
    expect(ac._acWsText(() => { throw new Error('x'); }, 'k', 'Plain')).toBe('Plain');
  });

  it('the panel, the stats, the report and the CSV all carry it', () => {
    expect(analytics).toContain("_acWsText(t, 'class_analytics.ws_first_try', 'First try: {percent}%', { percent: _first })");
    expect(analytics).toContain("'Accuracy (with second tries)'");
    expect(analytics).toMatch(/stats\.wsFirstTryAccuracy = firstTry\.accuracy;/);
    expect(analytics).toMatch(/const wsFirstTryAccuracy = _acWsFirstTryStats\(wsHistory\)\.accuracy;/);
    const header = between(analytics, "[['Student', 'Sound', 'Attempts',", ']]');
    expect(header, 'old columns keep their names and order; first-try columns follow')
      .toBe("[['Student', 'Sound', 'Attempts', 'Correct', 'Accuracy %', 'Mastered', 'Last practiced', 'First-try items', 'First-try correct', 'First-try accuracy %'");
  });
});

// ── 5. A failed player download ──────────────────────────────────────────────

describe('the Word Sounds loading card when the download fails', () => {
  let container, root, registry, loads, closed;
  const cardSource = between(anti, 'const wsLoadFailed = window.__alloModuleRegistry', '\n                })()}\n                {isTeacherMode && generatedContent && activeView === generatedContent.type && isUnfilledBlankDraft');
  const Card = new Function('React', transformSync(
    'function Card({ t, setIsWordSoundsMode, setActiveView }) {\n' + cardSource + '\n}',
    { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code + '\nreturn Card;')(React);
  const installRetry = () => {
    const source = between(anti, 'window.__alloRetryModule = function(name) {', 'window.__alloRetryFailedModules');
    new Function('window', '__alloModuleRegistry', 'loadModule', source)(window, registry, (name, url) => { loads.push([name, url]); registry[name].status = 'pending'; });
  };
  const render = async () => act(async () => root.render(React.createElement(Card, {
    t: () => undefined, setIsWordSoundsMode: value => closed.push(['mode', value]), setActiveView: value => closed.push(['view', value]) })));
  const button = label => [...container.querySelectorAll('button')].find(b => b.textContent === label);

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    registry = window.__alloModuleRegistry = { WordSoundsModal: { status: 'pending', originalUrl: 'https://cdn.example/word_sounds_module.js?v=1' } };
    loads = []; closed = [];
    installRetry();
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); container.remove();
    delete window.__alloModuleRegistry; delete window.__alloRetryModule; vi.unstubAllGlobals();
  });

  it('while the download is running it says loading and offers only Close', async () => {
    await render();
    expect(container.textContent).toContain('Loading Word Sounds...');
    expect(container.textContent).not.toContain('could not load');
    expect(button('Try again')).toBeUndefined();
    await act(async () => button('Close').click());
    expect(closed).toEqual([['mode', false], ['view', 'input']]);
  });

  it('after a failed download it says so, and Try again starts the download again', async () => {
    registry.WordSoundsModal.status = 'failed';
    await render();
    expect(container.querySelector('[role="alert"]').textContent).toContain('Word Sounds could not load. Check the connection and try again.');
    expect(container.textContent).not.toContain('Loading Word Sounds');
    expect(button('Close')).toBeTruthy();
    await act(async () => button('Try again').click());
    expect(loads).toEqual([['WordSoundsModal', 'https://cdn.example/word_sounds_module.js?v=1']]);
    expect(registry.WordSoundsModal.status).toBe('pending');
    await render();
    expect(container.textContent).toContain('Loading Word Sounds...');
    expect(button('Try again')).toBeUndefined();
  });

  it('Try again does nothing harmful when the loader has no retry yet', async () => {
    registry.WordSoundsModal.status = 'failed';
    delete window.__alloRetryModule;
    await render();
    await act(async () => button('Try again').click());
    expect(loads).toEqual([]);
  });
});

// ── 6. Sidebar words reach the setup screen ──────────────────────────────────

describe('words typed in the sidebar reach Word Sounds setup', () => {
  it('the setup mount gets the trimmed words, at most 60', () => {
    const memo = between(anti, 'const wordSoundsInitialCustomWords = React.useMemo(', '\n    const [wordSoundsOracleData');
    const compute = terms => new Function('React', 'wordSoundsCustomTerms', memo + '\nreturn wordSoundsInitialCustomWords;')({ useMemo: fn => fn() }, terms);
    expect(compute([' cat ', '', 'dog', 7, null, '  '])).toEqual(['cat', 'dog']);
    expect(compute(Array.from({ length: 80 }, (_, i) => 'w' + i))).toHaveLength(60);
    expect(compute(null)).toEqual([]);
    expect(between(anti, '<WordSoundsGenerator key=', 'onStartGame=')).toContain('initialCustomWords={wordSoundsInitialCustomWords}');
  });

  it('opening Word Sounds from the sidebar splits the vocabulary field on commas and new lines', () => {
    const handlers = readFileSync(resolve(process.cwd(), 'host_handlers_source.jsx'), 'utf8');
    const calls = [];
    const __d = { sourceVocabulary: 'ship, shop\n  fish ,,\nmoth', setIsWordSoundsMode() {}, setActiveView() {}, setWordSoundsCustomTerms: terms => calls.push(terms) };
    new Function('__d', braceBlock(handlers, 'const handleOpenWordSounds = () =>') + '; handleOpenWordSounds();')(__d);
    expect(calls).toEqual([['ship', 'shop', 'fish', 'moth']]);
  });
});
