// Adaptive length inside a planned lesson, 2026-11-11.
// The rule lives in WS_CORE.planExtensionDecision; the mounted tests play a
// planned lesson the way a child would (Count Sounds: tap a number).
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
const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).word_sounds;
const strings = (_t, key, params = {}) => {
  let text = english[String(key).replace('word_sounds.', '')] || '';
  for (const [name, value] of Object.entries(params || {})) text = text.split('{' + name + '}').join(String(value));
  return text;
};

describe('planExtensionDecision (the one rule)', () => {
  const base = {minCount: 5, ceiling: 10, masteryThreshold: 3, adaptive: true};
  const decide = (extra) => CORE.planExtensionDecision({...base, ...extra});
  it('states its numbers', () => {
    expect(CORE.PLAN_EXTENSION).toEqual({minGraded: 4, lowAccuracy: 0.5, recoveryRun: 2});
  });
  it.each([
    // [label, input, action, reason, startsExtension]
    ['below the minimum, however well', {answered: 4, firstTryCorrect: 4, streak: 4}, 'continue', 'below_minimum', false],
    ['below the minimum, however badly', {answered: 4, firstTryCorrect: 0, streak: 0}, 'continue', 'below_minimum', false],
    ['fast: minimum met with the streak', {answered: 5, firstTryCorrect: 5, streak: 5}, 'advance', 'mastery', false],
    ['middling: over half right, no streak yet', {answered: 5, firstTryCorrect: 3, streak: 1}, 'continue', 'awaiting_streak', false],
    ['exactly half is not low', {answered: 6, firstTryCorrect: 3, streak: 0}, 'continue', 'awaiting_streak', false],
    ['struggling at the minimum', {answered: 5, firstTryCorrect: 2, streak: 0}, 'continue', 'extend', true],
    ['struggling, noticed after the minimum', {answered: 7, firstTryCorrect: 3, streak: 0}, 'continue', 'extend', true],
    ['struggling but already on a 2-run', {answered: 5, firstTryCorrect: 2, streak: 2}, 'continue', 'awaiting_streak', false],
    ['fixed difficulty (adaptive off)', {answered: 5, firstTryCorrect: 0, streak: 0, adaptive: false}, 'continue', 'awaiting_streak', false],
    ['never extended twice', {answered: 6, firstTryCorrect: 1, streak: 0, alreadyExtended: true}, 'continue', 'awaiting_streak', false],
    ['in the extension, no run yet', {answered: 7, firstTryCorrect: 3, streak: 1, extended: true}, 'continue', 'extending', false],
    ['in the extension, 2 in a row', {answered: 7, firstTryCorrect: 4, streak: 2, extended: true}, 'advance', 'recovered', false],
    ['extension reaches the ceiling', {answered: 10, firstTryCorrect: 2, streak: 0, extended: true}, 'advance', 'ceiling_no_recovery', false],
    ['ceiling without an extension', {answered: 10, firstTryCorrect: 6, streak: 1}, 'advance', 'ceiling', false],
    ['ceiling wins over everything', {answered: 12, firstTryCorrect: 0, streak: 0}, 'advance', 'ceiling', false],
  ])('%s', (_label, input, action, reason, starts) => {
    const d = decide(input);
    expect([d.action, d.reason, d.startsExtension]).toEqual([action, reason, starts]);
  });
  it('needs at least 4 graded items before calling accuracy low', () => {
    expect(decide({minCount: 3, ceiling: 6, answered: 3, firstTryCorrect: 0, streak: 0}).reason).toBe('awaiting_streak');
    expect(decide({minCount: 3, ceiling: 6, answered: 4, firstTryCorrect: 0, streak: 0}).reason).toBe('extend');
    // Unscored practice items are not graded.
    expect(decide({answered: 5, graded: 3, firstTryCorrect: 0, streak: 0}).reason).toBe('awaiting_streak');
  });
  it('uses the plan streak as the recovery run when it is shorter than 2', () => {
    expect(decide({masteryThreshold: 1, masteryMet: false, answered: 6, firstTryCorrect: 1, streak: 1, extended: true}).reason).toBe('recovered');
  });
  it('defaults the ceiling to double the count and trusts the caller\'s mastery verdict', () => {
    expect(CORE.planExtensionDecision({answered: 10, minCount: 5}).reason).toBe('ceiling');
    expect(CORE.planExtensionDecision({answered: 5, minCount: 5, streak: 3, masteryMet: false}).reason).toBe('awaiting_streak');
  });
});

let Modal, root, container, current, originalAudio, originalGlobalAudio;
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
function item(word) {
  const phonemes = SOUNDS[word];
  return {...makePackItem(), id: word, term: word, word, targetWord: word, displayWord: word, phonemes, graphemes: phonemes,
    phonemeCount: phonemes.length, syllables: [word], rhymeWord: '', rhymes: [], firstSound: phonemes[0], _ttsAssets: undefined, activityItems: {}};
}
const WORDS = Object.keys(SOUNDS).map(item);
const PLAN = {id: 'adaptive', masteryThreshold: 3, activities: [{id: 'counting', count: 4}, {id: 'isolation', count: 4}], order: ['counting', 'isolation']};
const SEQUENCE = ['counting', 'isolation'];
function Host(overrides) {
  const [activity, setActivity] = React.useState('counting');
  const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
  const [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
  const [confusions, setConfusions] = React.useState({});
  current = {activity, word, history};
  return React.createElement(Modal, {...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false,
    disableAnimations: true, sessionId: 'adaptive-length', wsPreloadedWords: WORDS, wordSoundsLanguage: 'en',
    wordSoundsDifficulty: 'auto', wordSoundsSessionGoal: 10, onClose: () => {}, getWordSoundsString: strings,
    lessonPlanConfig: PLAN, initialActivitySequence: SEQUENCE, ...overrides,
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
    currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
    wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
    wordSoundsConfusionPatterns: confusions, setWordSoundsConfusionPatterns: setConfusions});
}
async function tick(ms) { await act(async () => vi.advanceTimersByTimeAsync(ms)); }
async function mount(overrides = {}) {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Host, overrides))); await tick(120);
}
const numbers = () => [...container.querySelectorAll('[role="button"][aria-label^="Number "]')];
const tap = async (wantRight, skip = 0) => {
  const right = 'Number ' + SOUNDS[String(current.word).toLowerCase()].length;
  const target = numbers().filter((b) => (b.getAttribute('aria-label') === right) === wantRight)[skip];
  expect(target, (wantRight ? 'right' : 'wrong') + ' number for ' + current.word).toBeTruthy();
  await act(async () => target.click());
};
// One item: 'first' = right first time, 'miss' = wrong twice.
async function answer(kind) {
  expect(current.activity).toBe('counting');
  const before = current.history.length, word = current.word;
  if (kind === 'first') await tap(true);
  else { await tap(false, 0); await tap(false, 1); }
  expect(current.history.length, 'a row for ' + word).toBe(before + 1);
  await tick(9000);
  return word;
}
const play = async (kinds) => { const words = []; for (const kind of kinds) words.push(await answer(kind)); return words; };
const rows = () => current.history.filter((row) => row.activity === 'counting');
const recap = () => container.querySelector('[aria-labelledby="word-sounds-session-complete-title"]');

describe('adaptive length in the mounted player', () => {
  beforeAll(() => { installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds()); });
  beforeEach(() => {
    vi.useFakeTimers({now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
    window.Audio = globalThis.Audio = CompleteAudio;
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    root = null; container?.remove();
    window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
    vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
  });

  it('a fast child leaves at the minimum, as before, with nothing marked', async () => {
    await mount();
    await play(['first', 'first', 'first', 'first']);
    expect(current.activity).toBe('isolation');
    expect(rows()).toHaveLength(4);
    expect(rows().some((row) => row.extended)).toBe(false);
  });

  it('a struggling child gets extra items up to the ceiling, missed words first, then moves on in plan order', async () => {
    await mount();
    const first = await play(['miss', 'miss', 'miss', 'first']);
    expect(current.activity, 'still in the activity after the minimum').toBe('counting');
    const missed = first.slice(0, 3).map((w) => w.toLowerCase());
    const extra = await play(['miss', 'miss', 'miss']);
    // The three words missed so far come back before any new word.
    expect(extra.map((w) => w.toLowerCase()).sort()).toEqual([...missed].sort());
    await play(['miss']);
    expect(rows()).toHaveLength(8);
    expect(rows().map((row) => !!row.extended)).toEqual([false, false, false, false, true, true, true, true]);
    expect(rows().map((row) => row.extensionEnd || null)).toEqual([null, null, null, null, null, null, null, 'limit']);
    // Double the count is the hard stop; the next activity is the plan's next one.
    expect(current.activity).toBe('isolation');
  });

  it('a short recovery run (2 right in a row) ends the extension', async () => {
    await mount();
    await play(['miss', 'miss', 'miss', 'first']);
    expect(current.activity).toBe('counting');
    await play(['first']);
    expect(current.activity).toBe('isolation');
    expect(rows()).toHaveLength(5);
    expect(rows()[4]).toMatchObject({extended: true, extensionEnd: 'recovered'});
    expect(rows().slice(0, 4).some((row) => row.extended)).toBe(false);
  });

  it('a fixed difficulty never starts an extension: the plan streak rule alone applies', async () => {
    await mount({wordSoundsDifficulty: 'easy'});
    await play(['miss', 'miss', 'miss', 'first', 'first']);
    // 2 in a row is not the plan's 3: still here, and nothing is marked.
    expect(current.activity).toBe('counting');
    await play(['first']);
    expect(current.activity).toBe('isolation');
    expect(rows()).toHaveLength(6);
    expect(rows().some((row) => row.extended || row.extensionEnd)).toBe(false);
  });

  it('the teacher recap marks "needed more practice"; the child\'s recap does not', async () => {
    const single = {...PLAN, activities: [{id: 'counting', count: 4}], order: ['counting']};
    const run = async (isTeacherMode) => {
      await mount({isTeacherMode, lessonPlanConfig: single, initialActivitySequence: ['counting']});
      await play(['miss', 'miss', 'miss', 'first', 'miss', 'miss', 'miss', 'miss']);
      await tick(3000);
      expect(recap(), 'session recap').toBeTruthy();
    };
    await run(true);
    const note = recap().querySelector('[data-ws-recap-more-practice]');
    expect(note, 'teacher note').toBeTruthy();
    expect(note.textContent).toContain('Needed more practice');
    expect(note.querySelector('[data-ws-recap-extended="counting"]').textContent).toMatch(/extra items: 4 \(reached the item limit\)/);
    await act(async () => root.unmount()); root = null; container.remove();
    await run(false);
    expect(recap().querySelector('[data-ws-recap-more-practice]')).toBeNull();
    expect(recap().textContent).not.toMatch(/more practice|extra items/i);
  });
});

describe('where the rule cannot apply', () => {
  const source = readFileSync(resolve('word_sounds_module.js'), 'utf8');
  it('probes, assessments and fixed forms never reach the decision', () => {
    // The plan activity is only looked up outside a fixed form (isFixedForm covers probes).
    expect(source).toMatch(/const _planActivity = lessonPlanConfig && activitySequence && activitySequence\.length > 0 && !isFixedForm\s/);
    expect(source).toMatch(/adaptive: wordSoundsDifficulty === "auto" && !isProbeMode && !WS_NON_GRADED_ACTIVITIES\.has\(wordSoundsActivity\)/);
  });
  it('the recap helper reports extra items per activity from the rows alone', () => {
    const recapOf = window.__alloWordSoundsRecap;
    expect(typeof recapOf).toBe('function');
    const out = recapOf([
      {activity: 'counting', word: 'go', correct: false},
      {activity: 'counting', word: 'go', correct: false, extended: true},
      {activity: 'counting', word: 'me', correct: true, extended: true, extensionEnd: 'recovered'},
      {activity: 'isolation', word: 'me', correct: true},
    ]);
    expect(out.extensions).toEqual([{activity: 'counting', extraItems: 2, end: 'recovered'}]);
    expect(recapOf([{activity: 'counting', word: 'go', correct: true}]).extensions).toEqual([]);
  });
});
