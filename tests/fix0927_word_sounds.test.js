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
  const span = between('const [usedScrambleIndices, setUsedScrambleIndices] = React.useState([]);', 'const renderActivityContent = () => {');
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
  const scoring = {
    spelling_bee: '+ streakBonus,',
    word_scramble: 'ts("word_sounds.scramble_correct")',
    missing_letter: 'ts("word_sounds.ml_correct")',
    letter_tracing: 'checkAnswer("correct", "correct", { formationScore })',
  };
  it.each(Object.entries(scoring))('%s delayed scoring is dropped after a manual activity change', (_name, marker) => {
    const m = source.indexOf(marker);
    expect(m).toBeGreaterThan(0);
    const st = marker.startsWith('checkAnswer') ? source.lastIndexOf('setTimeout(', m) : source.indexOf('setTimeout(', m);
    const call = timeoutCall(st);
    expect(call).toContain('checkAnswer("correct", "correct"');
    expect(run(call, false).spy.checkAnswer).toHaveLength(1);
    expect(run(call, true).spy.checkAnswer).toEqual([]);
  });
});
