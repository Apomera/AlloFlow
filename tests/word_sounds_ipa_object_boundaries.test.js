import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { core, compileWords } from './helpers/word_sounds_core.js';

const runtime = readFileSync('word_sounds_module.js', 'utf8');
const phonicsHost = {};
new Function('window', readFileSync('phonics_g2p_loader.js', 'utf8'))(phonicsHost);
const phonics = phonicsHost.AlloPhonics;
const checkedWord = (word, ipa, spelling) => ({word,
  ...phonics.buildPhonemes(word, {ipa: ipa.map(phonics._normalizeToken)}, spelling)});
const rainy = checkedWord('rainy', ['r', 'eɪ', 'n', 'iː'], ['r', 'ai', 'n', 'y']);
const happy = checkedWord('happy', ['h', 'æ', 'p', 'iː'], ['h', 'a', 'pp', 'y']);

function slice(startMarker, endMarker) {
  const start = runtime.indexOf(startMarker), end = runtime.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error('Missing runtime boundary: ' + startMarker);
  return runtime.slice(start, end);
}
const phonemeKey = new Function('WS_CORE', slice('const SAME_PHONEME_CLUSTERS =', '// Resolved at RENDER time') + '\nreturn phonemeKey;')(core);

function isolationFor(item, isEnglish, index = 0) {
  let state = null;
  const math = Object.create(Math); math.random = () => index / item.phonemes.length;
  const env = {
    wordSoundsActivity: 'isolation', wordSoundsPhonemes: item, currentWordSoundsWord: item.word,
    WS_CORE: core, lastWordForIsolation: {current: null}, isolationStateRef: {current: null},
    isolationState: null, setIsolationState: value => {state = value;}, isolationPositionRef: {current: null},
    Math: math, phonemeKey, wsLangCaps: {isEnglish}, preloadedWords: [item],
    fisherYatesShuffle: values => [...values], debugLog: () => {}, warnLog: () => {}, handleAudio: () => Promise.resolve(true),
  };
  new Function(...Object.keys(env), slice(
    '        if (wordSoundsActivity !== "isolation" || !wordSoundsPhonemes',
    '      }, [wordSoundsActivity, wordSoundsPhonemes, currentWordSoundsWord, itemPresentation]);',
  ))(...Object.values(env));
  return state;
}
function aacKeywords(state) {
  const images = [];
  new Function('WS_CORE', 'aacMode', 'isolationState', 'PHONEME_KEYWORDS', 'generateOptionImages', slice(
    '        if (!aacMode || !isolationState?.isoOptions) return;',
    '      }, [aacMode, isolationState, generateOptionImages]);',
  ))(core, true, state, {ee: 'bee', i: 'igloo', y: 'yarn', j: 'jet', k: 'kite', g: 'goat'}, words => images.push(...words));
  return images;
}

describe('notation provenance across learner sound boundaries', () => {
  it.each([['i', 'ee'], ['u', 'oo'], ['j', 'y']])('keeps explicit IPA %s distinct from the bare app token', (token, key) => {
    expect(core.soundKey({ipa: token, grapheme: 'ignored'})).toBe(key);
    expect(core.soundKey(token)).toBe(token);
    expect(core.soundKey({phoneme: token})).toBe(token);
    expect(core.soundKey({sound: token})).toBe(token);
    expect(core.soundKey({ipa: ` /${token}/ `})).toBe(key);
  });

  it('normalizes supported IPA, accents and meaningful object fallbacks without mutating notation', () => {
    const original = {ipa: ' ˈi ', grapheme: 'y'};
    expect(core.soundKey(original)).toBe('ee');
    expect(core.phonemeToken(original)).toBe('ˈi');
    expect(core.phonemeLabel(original)).toBe('ee');
    expect(original).toEqual({ipa: ' ˈi ', grapheme: 'y'});
    expect(core.soundKey({ipa: ' ', phoneme: '', sound: 'æ', grapheme: 'wrong'})).toBe('a');
    expect(core.soundKey({grapheme: 'sh'})).toBe('sh');
    expect(core.soundKey({ipa: 4})).toBe('');
    expect(core.soundKey(null)).toBe('');
    expect(core.soundKey({ipa: 't͡ʃ'})).toBe('ch');
    expect(core.soundKey({ipa: 'ɜr'})).toBe('er');
    expect(core.soundKey({ipa: 'ɑr'})).toBe('ar');
    expect(core.soundKey({ipa: 'ɔr'})).toBe('or');
  });

  it('groups a production G2P object ending with dictionary bee and excludes it from distractors', () => {
    expect(rainy.phonemes.at(-1)).toEqual({ipa: 'i', grapheme: 'y'});
    const pool = [rainy, happy, 'bee', 'cat'];
    const board = core.buildSoundSort({word: 'rainy', phonemes: rainy.phonemes, mode: 'last', pool});
    expect(board.targetChar).toBe('ee');
    expect(new Set(board.options)).toEqual(new Set(['happy', 'bee']));
    expect(board.distractors).toEqual(['cat']);
    expect(core.validSoundBoard(board, 'rainy', pool)).toBe(true);
    expect(core.validSoundBoard({mode: 'last', targetChar: 'i', options: ['happy'], distractors: ['bee', 'cat']}, 'rainy', pool)).toBe(false);
  });

  it('preserves canonical sounds when checked object data is compiled again', () => {
    const compiled = compileWords([rainy, happy]);
    const prepared = compiled[0];
    expect(prepared.activityItems.isolation).toMatchObject({position: 3, correctSound: 'ee'});
    expect(prepared.activityItems.segmentation.chips.filter(chip => !chip.isDistractor).map(chip => chip.phoneme).sort()).toEqual(['ay', 'ee', 'n', 'r']);
    expect(prepared.phonemes).toEqual(rainy.phonemes);
    expect(prepared.graphemes.join('')).toBe('rainy');
    const board = prepared.activityItems.sound_sort;
    expect(board.targetChar).toBe('ee');
    expect(board.distractors).not.toContain('bee');
  });

  it('excludes another genuine rhyme when IPA and app final-vowel notation differ', () => {
    const honey = checkedWord('honey', ['h', 'ʌ', 'n', 'iː'], ['h', 'o', 'n', 'ey']);
    const board = core.buildRhymeBoard({word: 'honey', answer: 'funny', phonemes: honey.phonemes,
      pool: [honey, {word: 'funny', phonemes: ['f', 'u', 'n', 'ē']}, {word: 'bunny', phonemes: ['b', 'u', 'n', 'ee']}, 'cat', 'dog']});
    expect(board.options).toContain('funny');
    expect(board.options).not.toContain('bunny');
    expect(board.options).toContain('cat');
  });

  it('keeps unprepared English isolation options and AAC lookup on safe sound labels', () => {
    const state = isolationFor(rainy, true, 3);
    expect(state.correctSound).toBe('ee');
    expect(state.isoOptions.every(option => typeof option === 'string')).toBe(true);
    expect(new Set(state.isoOptions.map(phonemeKey)).size).toBe(state.isoOptions.length);
    expect(state.isoOptions).toContain('ee');
    expect(aacKeywords(state)).toContain('bee');
    expect(aacKeywords({isoOptions: [rainy.phonemes.at(-1), null, {ipa: 4}]})).toEqual(['bee']);
  });

  it('keeps non-English IPA labels as strings at the isolation and AAC boundary', () => {
    const gato = checkedWord('gato', ['g', 'a', 't', 'o'], ['g', 'a', 't', 'o']);
    const state = isolationFor(gato, false);
    expect(state.correctSound).toBe('g');
    expect(state.isoOptions.every(option => typeof option === 'string')).toBe(true);
    expect(() => aacKeywords(state)).not.toThrow();
    expect(core.phonemeLabel({ipa: 'i', grapheme: 'i'}, false)).toBe('i');
    expect(core.phonemeLabel({ipa: 'j', grapheme: 'y'}, false)).toBe('j');
  });

  it('adapts prepared object options without losing the authored position or order', () => {
    const item = {...rainy, activityItems: {isolation: {position: 3, correctSound: rainy.phonemes[3], options: [rainy.phonemes[0], rainy.phonemes[3]]}}};
    const state = isolationFor(item, true);
    expect(state.currentPosition).toBe(3);
    expect(state.correctSound).toBe('ee');
    expect(state.isoOptions).toEqual(['r', 'ee']);
    expect(aacKeywords(state)).toEqual(['bee']);
  });
});
