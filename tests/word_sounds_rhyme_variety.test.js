import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const coreSource = readFileSync(resolve(process.cwd(), 'word_sounds_core.js'), 'utf8');
const core = new Function(coreSource + '\nreturn createWordSoundsCore();')();
const runtime = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
const common = ['cat','dog','sun','map','bed','pig','cup','hat','fish','star','tree','frog','duck','book','run','red','sit','fan','hop','moon','pen','top','ring','rock','look','mug'];
const words = [
  {word:'cat', rhymeWord:'bat', phonemes:['k','a','t']},
  {word:'dog', rhymeWord:'log', phonemes:['d','o','g']},
  {word:'sun', rhymeWord:'fun', phonemes:['s','u','n']},
  {word:'pig', rhymeWord:'dig', phonemes:['p','i','g']},
];
const repeated = ['dog','sun','bed','leg','cup'];
const build = item => core.buildRhymeBoard({
  word:item.word, answer:item.rhymeWord, phonemes:item.phonemes,
  pool:[...words,...common], distractors:repeated,
});

function rhymeEffect() {
  // Exercise the actual prepared/generated install branch without mounting
  // unrelated modal/audio/image behavior. It reads React state through these
  // arguments and writes the same state setter the real effect uses.
  const start = runtime.lastIndexOf('          const currentWord = currentWordSoundsWord || wordSoundsPhonemes?.word;', runtime.indexOf('// Keep-existing-board check FIRST:'));
  const correctAt = runtime.indexOf('const correctRhyme =', start);
  const end = runtime.indexOf('          } else {', runtime.indexOf('            lastWordForRhyming.current = currentWord;', correctAt));
  if (start < 0 || end <= start) throw new Error('Rhyme Time install branch not found');
  const run = new Function('currentWordSoundsWord','wordSoundsPhonemes','lastWordForRhyming','rhymeOptions','setRhymeOptions','preloadedWords','wsLangCaps','WS_CORE','debugLog','advanceEpochRef','rhymePresentationRef','rhymeSessionRef','lastRhymeOccurrenceRef', runtime.slice(start,end) + '\n          }');
  const epoch = {current: 0}, presentation = {current: 0}, session = {current: core.createRhymeSession()}, lastOccurrence = {current: null};
  return (...args) => run(...args, epoch, presentation, session, lastOccurrence);
}

describe('generated Rhyme Time distractors', () => {
  it('varies distractor sets by target while keeping each board stable and answerable', () => {
    const boards = words.map(build);
    boards.forEach((board, index) => {
      expect(board.answer).toBe(words[index].rhymeWord);
      expect(board.options).toHaveLength(5);
      expect(new Set(board.options).size).toBe(5);
      expect(board.options).toContain(board.answer);
      expect(board.options).not.toContain(words[index].word);
      expect(build(words[index])).toEqual(board);
    });
    const sets = boards.map((board, index) => board.options.filter(word => word !== words[index].rhymeWord).sort().join(','));
    expect(new Set(sets).size).toBe(words.length);
  });

  it.each([
    ['one','fun','sun',['w','u','n']],
    ['blue','true','shoe',['b','l','oo']],
    ['though','show','go',['dh','oa']],
  ])('excludes the genuine alternate-spelling rhyme %s / %s / %s', (word, answer, otherRhyme, phonemes) => {
    const board = core.buildRhymeBoard({word, answer, phonemes, pool:common, distractors:[otherRhyme,...repeated]});
    expect(board.options).not.toContain(otherRhyme);
    expect(board.options).toHaveLength(5);
    expect(board.options).toContain(answer);
  });

  it('prefers a verified close sound contrast while excluding another correct rhyme', () => {
    const board = core.buildRhymeBoard({word:'cat', answer:'hat', phonemes:['k','a','t'], pool:[
      {word:'cut', phonemes:['k','u','t']},
      {word:'bat', phonemes:['b','a','t']},
      ...common,
    ]});
    expect(board.options).toContain('cut');
    expect(board.options).not.toContain('bat');
  });

  it('preserves a saved teacher board, including its exact answer, order and count', () => {
    const saved = {answer:'bat', options:['mug','bat','red','fan','pig','cup'], teacherEdited:true, custom:'keep'};
    const result = core.buildRhymeBoard({word:'cat', answer:'hat', pool:common, prepared:saved});
    expect(result).toEqual(saved);
    expect(result.options).not.toBe(saved.options);
  });
});

describe('Rhyme Time runtime installs the current item', () => {
  it('refreshes choices when the next target shares the previous correct rhyme', () => {
    const old = core.buildRhymeBoard({word:'cat', answer:'hat', phonemes:['k','a','t'], pool:common});
    const last = {current:'cat'}, installed = [];
    rhymeEffect()('bat', {word:'bat', rhymeWord:'hat', phonemes:['b','a','t']}, last, old.options,
      board => installed.push(board), words, {isEnglish:true}, core, () => {});
    expect(installed).toHaveLength(1);
    expect(installed[0]).toContain('hat');
    expect(last.current).toBe('bat');
  });

  it('does not stamp the next target as initialized using the previous word data', () => {
    const last = {current:'cat'}, installed = [];
    rhymeEffect()('bat', {word:'cat', rhymeWord:'hat', phonemes:['k','a','t']}, last, ['hat','cup','dog'],
      board => installed.push(board), words, {isEnglish:true}, core, () => {});
    expect(installed).toEqual([]);
    expect(last.current).toBe('cat');
  });

  it('installs the current prepared board verbatim before considering generated fillers', () => {
    const saved = {answer:'bat', options:['mug','bat','red','fan','pig','cup'], teacherEdited:true};
    const installed = [];
    rhymeEffect()('cat', {word:'cat', rhymeWord:'bat', phonemes:['k','a','t'], activityItems:{rhyming:saved}}, {current:null}, [],
      board => installed.push(board), words, {isEnglish:true}, core, () => {});
    expect(installed).toEqual([saved.options]);
  });
});
