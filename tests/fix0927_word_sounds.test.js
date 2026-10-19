// Regression tests for the Word Sounds defects left open by the 2026-09-20
// review (docs/word-sounds-review-2026-09-20.md). WS_FIX0927_SOURCE points
// every check at another copy of word_sounds_module.js (mutation runs).
import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';
import { core, compileWords } from './helpers/word_sounds_core.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const SOURCE_PATH = process.env.WS_FIX0927_SOURCE || 'word_sounds_module.js';
const source = readFileSync(SOURCE_PATH, 'utf8');
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const REVIEW = 'This word needs a reviewed word family. Choose another activity or return to setup.';
const EAR = String.fromCodePoint(0x1F442);
const EYE = String.fromCodePoint(0x1F441);
const between = (start, end, from = 0) => {
  const a = source.indexOf(start, from), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw Error('marker not found: ' + start);
  return source.slice(a, b);
};
// The full `setTimeout(...)` call that starts at `at`, plus a directly
// preceding `const x = advanceEpochRef.current;` capture when present.
const timeoutCall = (at) => {
  let depth = 0, i = source.indexOf('(', at);
  for (; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')' && --depth === 0) break;
  }
  const lineStart = source.lastIndexOf('\n', at);
  const prevStart = source.lastIndexOf('\n', lineStart - 1);
  const prev = source.slice(prevStart + 1, lineStart);
  return (/^\s*const \w+ = advanceEpochRef\.current;\s*$/.test(prev) ? prev + '\n' : '') + source.slice(at, i + 1) + ';';
};
const checkAnswerStart = source.indexOf('const checkAnswer =');
const checkAnswerEnd = source.indexOf('if (wordSoundsPhonemes?.phonemes) {', checkAnswerStart);

const require = createRequire(import.meta.url), modules = resolve('desktop/web-app/node_modules');
let React, client, act, Modal; const mounted = [];
beforeAll(() => {
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  installCanvasStub();
  Modal = setupWordSounds().WordSoundsModal;
  if (process.env.WS_FIX0927_SOURCE) {
    delete window.AlloModules.WordSoundsModal; // the module skips a duplicate load
    new Function(source)(); Modal = window.AlloModules.WordSoundsModal;
    if (typeof Modal !== 'function') throw Error('override source did not register WordSoundsModal');
  }
});
afterEach(() => { for (const { root, host } of mounted.splice(0)) { act(() => root.unmount()); host.remove(); } });
async function mount(activity, word, extra = {}) {
  const calls = [], props = { ...studentProps(activity, calls), ...extra };
  props.wsPreloadedWords = [word]; props.wordSoundsPhonemes = word; props.currentWordSoundsWord = word.word;
  props.getWordSoundsString = (_t, key) => english[key.replace('word_sounds.', '')] || key;
  const rows = []; props.setWordSoundsHistory = u => rows.splice(0, rows.length, ...(typeof u === 'function' ? u(rows) : u));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = client.createRoot(host); mounted.push({ host, root });
  await act(async () => { root.render(React.createElement(Modal, props)); await new Promise(r => setTimeout(r, 30)); });
  return { host, rows, calls };
}
const buttonWith = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text));
const wordTiles = (host) => [...host.querySelectorAll('button[aria-label]')].map(b => b.getAttribute('aria-label')).filter(l => /^[a-z]+$/.test(l));

const RIMES = { at: ['cat', 'hat', 'bat', 'mat'], un: ['sun', 'fun', 'run'] };
const resolveFamily = new Function('WS_CORE', 'RIME_FAMILIES', 'SOUND_MATCH_POOL',
  between('const resolveWordFamilyRime =', 'const includeOrthographic =') + ';return resolveWordFamilyRime;')(core, RIMES, []);

describe('High: a rejected Word Families board never reaches play', () => {
  const conflicted = { teacherEdited: true, rime: 'at', words: ['hat'], distractors: ['hat'] };
  it('marks a teacher board that scores the same word on both sides as unavailable', () => {
    expect(resolveFamily('cat', conflicted)).toMatchObject({ rime: 'at', unavailable: 'conflict' });
    expect(resolveFamily('cat', { ...conflicted, distractors: [' Hat '] }).unavailable).toBe('conflict');
    expect(resolveFamily('cat', { ...conflicted, distractors: ['cat'] }).unavailable).toBe('conflict');
    expect(resolveFamily('cat', { ...conflicted, words: ['hat', 'bat'], distractors: ['dog'] }).unavailable).toBeUndefined();
  });
  // The notice is the teacher preview; learners skip the word (fix0928).
  it('shows a review notice, not two "hat" tiles, for the compiler-rejected board', async () => {
    const word = compileWords([{ ...makePackItem(), rimeFamilyMembers: conflicted }])[0];
    expect(word.activityItems.word_families).toBeUndefined();
    const { host } = await mount('word_families', word, { isTeacherMode: true });
    const reveal = buttonWith(host, EAR); expect(reveal).toBeTruthy();
    await act(async () => reveal.click());
    expect(host.textContent).toContain(REVIEW);
    expect(wordTiles(host).filter(l => l === 'hat')).toHaveLength(0);
  });
  it('still plays a valid prepared board', async () => {
    const word = compileWords([makePackItem()])[0];
    const { host } = await mount('word_families', word);
    await act(async () => buttonWith(host, EAR).click());
    expect(host.textContent).not.toContain(REVIEW);
    expect(wordTiles(host).sort()).toEqual([...word.activityItems.word_families.options, ...word.activityItems.word_families.distractors].sort());
  });
});

describe('High: Sound Sort credits only the tested edge sound', () => {
  const route = between('if (wordSoundsPhonemes?.phonemes) {', 'if (!isCorrect && answer && expectedAnswer)', checkAnswerStart);
  const attribute = (activity, board, isCorrect = true, word = 'cat') => {
    const credited = [];
    new Function('wordSoundsPhonemes', 'wordSoundsActivity', 'isCorrect', '_masteryEvidence', 'updatePhonemeMastery',
      'isolationStateRef', 'isolationState', 'soundSortPreloadRef', 'currentWordSoundsWord', route)(
      { phonemes: ['k', 'a', 't'] }, activity, isCorrect, { presentations: 1 }, (labels) => credited.push(labels),
      { current: null }, null, { current: board }, word);
    return credited;
  };
  it('a first-sound sort updates only the onset; a last-sound sort only the ending', () => {
    expect(attribute('sound_sort', { word: 'cat', item: { mode: 'first' } })).toEqual([['k']]);
    expect(attribute('sound_sort', { word: 'cat', item: { mode: 'last' } })).toEqual([['t']]);
    expect(attribute('sound_sort', { word: 'cat', item: { mode: 'first' } }, false)).toEqual([['k']]);
  });
  it('credits nothing when the tested edge is unknown for this word', () => {
    expect(attribute('sound_sort', null)).toEqual([]);
    expect(attribute('sound_sort', { word: 'dog', item: { mode: 'first' } })).toEqual([]);
  });
  it('leaves other activities unchanged', () => {
    expect(attribute('segmentation', null)).toEqual([['k', 'a', 't']]);
    expect(attribute('rhyming', null)).toEqual([]);
  });
});

describe('High: support shown during an item is kept after it is hidden', () => {
  it('records printed labels that were shown and hidden again before answering', async () => {
    const { host, rows } = await mount('counting', compileWords([makePackItem()])[0]);
    await act(async () => buttonWith(host, EAR).click());
    await act(async () => buttonWith(host, EYE).click());
    expect(buttonWith(host, EAR)).toBeTruthy();
    await act(async () => host.querySelector('[role="button"][aria-label="Number 3"]').click());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ correct: true, mode: 'visual', textSupported: true });
    expect(rows[0].cluesShown).toContain('printed_sound_labels');
  });
  it('guard: an unsupported answer is still sound-only (post-answer reveal excluded)', async () => {
    const { host, rows } = await mount('counting', compileWords([makePackItem()])[0]);
    await act(async () => host.querySelector('[role="button"][aria-label="Number 3"]').click());
    expect(rows[0]).toMatchObject({ correct: true, mode: 'sound_only', textSupported: false, cluesShown: [] });
  });
});

describe('Medium: an unresolved word family is reported, never replaced by -at', () => {
  it('resolver returns no family for "rhythm"', () => {
    const result = resolveFamily('rhythm', null);
    expect(result.rime).toBeNull();
    expect(result.members).toEqual([]);
    expect(result.unavailable).toBe('no_family');
    expect(resolveFamily('cat', null)).toEqual({ rime: 'at', members: ['hat', 'bat', 'mat'] });
  });
  it('player shows the review notice with no -at tiles', async () => {
    const base = makePackItem();
    const items = { ...base.activityItems }; delete items.word_families;
    const word = { ...base, term: 'rhythm', word: 'rhythm', targetWord: 'rhythm', displayWord: 'rhythm', familyEnding: '', familyMembers: [], activityItems: items, _ttsAssets: { ...base._ttsAssets, rhythm: base._ttsAssets.cat } };
    const { host } = await mount('word_families', word, { isTeacherMode: true });
    await act(async () => buttonWith(host, EAR).click());
    expect(host.textContent).toContain(REVIEW);
    expect(wordTiles(host).filter(l => RIMES.at.includes(l))).toEqual([]);
  });
  it('instruction audio names no family when the family is unavailable', async () => {
    const body = between('} else if (wordSoundsActivity === "word_families") {', '} else if (wordSoundsActivity === "rhyming") {', checkAnswerStart - 20000).replace('} else if (wordSoundsActivity === "word_families") {', '');
    const speak = async (family) => {
      const said = [];
      await new Function('handleAudio', 'resolveWordFamilyRime', 'wordFamilyRimeRef', 'currentWordSoundsWord', 'wordSoundsPhonemes', 'WS_CORE', 'cancelled', 'warnLog',
        'return (async () => {' + body + '})();')(async (x) => { said.push(x); }, () => family, { current: null }, 'rhythm', {}, core, false, () => {});
      return said;
    };
    expect(await speak({ rime: null, members: [], unavailable: 'no_family' })).toEqual([]);
    expect(await speak({ rime: 'at', members: ['hat'], unavailable: 'conflict' })).toEqual([]);
    expect(await speak({ rime: 'ythm', members: ['a', 'b'], prepared: true })).toEqual(['Find all words in the ythm family']);
  });
});

describe('Medium: Missing Letter uses a prepared board only when it is consistent', () => {
  // The board validation moved above the microphone-answer block (79e3e5eae),
  // which needs correctLetter; the letter choices stay beside the scramble.
  const span = sliceBetween(source, 'const preparedMissingLetter = React.useMemo(', 'const correctLetter =', { label: 'Missing Letter board' }) +
    sliceBetween(source, 'const correctLetter =', '\n', { label: 'Missing Letter answer line' }) + '\n' +
    between('const letterOptions = React.useMemo(', 'const renderActivityContent = () => {');
  const board = (prepared, word = 'cat') => new Function('React', 'packForCurrentWord', 'currentWordSoundsWord', 'wordSoundsPhonemes',
    span + ';return {hiddenIndex,correctLetter,letterOptions};')(
    { useMemo: fn => fn(), useState: v => [v, () => {}] }, prepared ? { missing_letter: prepared } : null, word, {});
  const consistent = (r, word = 'cat') => Number.isInteger(r.hiddenIndex) && r.hiddenIndex >= 0 && r.hiddenIndex < word.length &&
    word[r.hiddenIndex] === r.correctLetter && r.letterOptions.length >= 2 && r.letterOptions.filter(o => o === r.correctLetter).length === 1;
  it('rejects hiddenIndex 99 with letter "x" and derives the board from the word', () => {
    const r = board({ hiddenIndex: 99, correctLetter: 'x', options: ['x'] });
    expect(r.hiddenIndex).not.toBe(99);
    expect(r.correctLetter).not.toBe('x');
    expect(consistent(r)).toBe(true);
  });
  it.each([
    [{ hiddenIndex: 0, correctLetter: 'a', options: ['a', 'e'] }],
    [{ hiddenIndex: 1, correctLetter: 'a', options: ['e', 'o', 'u'] }],
    [{ hiddenIndex: 1, correctLetter: 'a', options: ['a', 'a', 'e'] }],
    [{ hiddenIndex: 1, correctLetter: 'a', options: ['a'] }],
    [{ hiddenIndex: -1, correctLetter: 't', options: ['t', 'e'] }],
    [{ hiddenIndex: 1.5, correctLetter: 'a', options: ['a', 'e'] }],
  ])('falls back to a consistent board for %j', (prepared) => {
    expect(consistent(board(prepared))).toBe(true);
  });
  it('keeps a consistent prepared board verbatim', () => {
    expect(board({ hiddenIndex: 1, correctLetter: 'a', options: ['a', 'e', 'o', 'u'] })).toEqual({ hiddenIndex: 1, correctLetter: 'a', letterOptions: ['a', 'e', 'o', 'u'] });
  });
});

describe('Medium: delayed transitions and scoring belong to the activity that scheduled them', () => {
  const run = (callText, epochChanged, extra = {}) => {
    const queued = [], spy = { startActivity: [], setShowSessionComplete: [], checkAnswer: [] };
    const env = {
      setTimeout: (fn) => { queued.push(fn); }, isMountedRef: { current: true }, isProbeMode: false,
      advanceEpochRef: { current: 5 }, _advanceEpoch: 5, autoDirectorCooldown: { current: true },
      startActivity: (...a) => spy.startActivity.push(a), nextActivity: 'blending', firstRevisit: { activityId: 'rhyming', word: 'cat' },
      setRevisitQueue: () => {}, debugLog: () => {}, setShowSessionComplete: (v) => spy.setShowSessionComplete.push(v),
      checkAnswer: (...a) => spy.checkAnswer.push(a), setUserAnswer: () => {}, setUsedScrambleIndices: () => {},
      setTracingPhase: () => {}, formationScore: 1, ...extra,
    };
    const names = Object.keys(env);
    new Function(...names, callText)(...names.map(n => env[n]));
    expect(queued.length).toBeGreaterThan(0);
    if (epochChanged) env.advanceEpochRef.current++;
    queued.shift()();
    return { spy, cooldown: env.autoDirectorCooldown.current };
  };
  const region = source.slice(checkAnswerStart, checkAnswerEnd);
  const directorTimers = [];
  for (let i = region.indexOf('autoDirectorCooldown.current = true;'); i >= 0; i = region.indexOf('autoDirectorCooldown.current = true;', i + 1)) {
    directorTimers.push(timeoutCall(checkAnswerStart + region.indexOf('setTimeout(', i)));
  }
  it('finds all three auto-director transitions', () => { expect(directorTimers).toHaveLength(3); });
  it.each([0, 1, 2])('auto-director transition %i is dropped after a manual activity change', (n) => {
    expect(run(directorTimers[n], false).spy.startActivity).toHaveLength(1);
    const after = run(directorTimers[n], true);
    expect(after.spy.startActivity).toEqual([]);
    expect(after.cooldown).toBe(false);
  });
  it('the lesson-complete screen is dropped after a manual activity change', () => {
    const at = source.indexOf('setTimeout(', source.indexOf('ts("word_sounds.lesson_practice_complete")', checkAnswerStart));
    const call = timeoutCall(at);
    expect(run(call, false).spy.setShowSessionComplete).toEqual([true]);
    expect(run(call, true).spy.setShowSessionComplete).toEqual([]);
  });
  // 79e3e5eae removed the 1.5 s success timers: construction answers grade at
  // once through submitConstructionAnswer, so no timer can outlive the item.
  const construction = between('// BEGIN WORD SOUNDS CONSTRUCTION ANSWERS', '// END WORD SOUNDS CONSTRUCTION ANSWERS');
  const callSites = {
    spelling_bee: 'const checkSpellingBee = () => submitConstructionAnswer(currentWordSoundsWord);',
    word_scramble: 'if (submitConstructionAnswer(currentWordSoundsWord) && !submissionLockRef.current) {',
    missing_letter: 'const checkMissingLetter = () => submitConstructionAnswer(correctLetter);',
  };
  it.each(Object.entries(callSites))('%s grades at once and leaves no delayed scoring behind', (activity, callSite) => {
    expect(source.includes(callSite), callSite).toBe(true);
    const timers = [], checks = [];
    const env = { React: { useRef: v => ({ current: v }) }, isMountedRef: { current: true }, submissionLockRef: { current: false },
      useMicInput: false, wordSoundsActivity: activity, userAnswer: ' CAT ', advanceEpochRef: { current: 5 }, currentWordSoundsWord: 'cat',
      isProbeMode: false, recordSpellingSupport: () => {}, checkAnswer: (...a) => checks.push(a), setUserAnswer: () => {},
      setWordSoundsFeedback: () => {}, setTimeout: fn => timers.push(fn) };
    const names = Object.keys(env);
    const submit = new Function(...names, construction + ';return submitConstructionAnswer;')(...names.map(n => env[n]));
    expect(submit('cat')).toBe(true);
    expect(checks).toEqual([['correct', 'correct']]);
    expect(timers).toEqual([]);
    expect(submit('cat')).toBe(false);
    env.advanceEpochRef.current++;
    env.submissionLockRef.current = true;
    expect(submit('cat')).toBe(false);
    expect(checks).toHaveLength(1);
  });
  it('letter_tracing completion is dropped after a manual activity change', async () => {
    const tracing = between('// BEGIN WORD SOUNDS TRACING COMPLETION', '// END WORD SOUNDS TRACING COMPLETION');
    const load = (phase, extra = {}) => {
      const spy = { checkAnswer: [], phase: [] };
      const env = { React: { useRef: v => ({ current: v }) }, advanceEpochRef: { current: 5 }, wordSoundsActivity: 'letter_tracing',
        currentWordSoundsWord: 'cat', tracingPhase: phase, isMountedRef: { current: true }, submissionLockRef: { current: false },
        checkAnswer: (...a) => spy.checkAnswer.push(a), playSound: () => {}, beginIsolationPlayback: () => 1,
        audioCancelledRef: { current: false }, audioRunIdRef: { current: 1 }, handleAudio: async () => ({ ok: true }),
        warnLog: () => {}, setTracingPhase: p => spy.phase.push(p), window: { __ALLO_INSTRUCTION_AUDIO: {} }, ...extra };
      const names = Object.keys(env);
      const api = new Function(...names, tracing + ';return { completeTracing, skipLowercaseTracing };')(...names.map(n => env[n]));
      return { api, env, spy };
    };
    const live = load('lower');
    await live.api.completeTracing(true, 0.8);
    expect(live.spy.checkAnswer).toEqual([['correct', 'correct', { formationScore: 0.8 }]]);
    const changed = load('lower');
    changed.env.advanceEpochRef.current++;
    await changed.api.completeTracing(true, 0.8);
    changed.api.skipLowercaseTracing();
    expect(changed.spy.checkAnswer).toEqual([]);
    let release;
    const upper = load('upper', { window: { __ALLO_INSTRUCTION_AUDIO: { fb_great_job: 'data:audio/wav;base64,AA==' } },
      handleAudio: () => new Promise(r => { release = r; }) });
    const pending = upper.api.completeTracing(true, 0.8);
    upper.env.advanceEpochRef.current++;
    release({ ok: true });
    await pending;
    expect(upper.spy.phase).toEqual([]);
    expect(upper.spy.checkAnswer).toEqual([]);
  });
});
