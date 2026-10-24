import { describe, it, expect } from 'vitest';
import { core, compileWords } from './helpers/word_sounds_core.js';

describe('canonical Word Sounds vowel judgments', () => {
  it.each([
    ['ā', 'ay', 'eɪ'],
    ['ē', 'ee', 'iː'],
    ['ī', 'ie', 'aɪ'],
    ['ō', 'oa', 'oʊ'],
    ['ū', 'oo', 'uː'],
  ])('equates generated %s with dictionary %s and supported IPA %s', (macron, canonical, ipa) => {
    for (const spelling of [macron, macron.normalize('NFD'), macron.toUpperCase(), ` /${macron}/ `, canonical, ipa]) {
      expect(core.soundKey(spelling)).toBe(canonical);
    }
  });

  it('keeps different vowels distinct after normalization', () => {
    expect(new Set(['ā', 'ē', 'ī', 'ō', 'ū'].map(core.soundKey)).size).toBe(5);
    expect(core.soundKey('ū')).not.toBe(core.soundKey('ʊ'));
    expect(core.soundKey('ē')).not.toBe(core.soundKey('i'));
  });

  const rainy = { word: 'rainy', phonemes: ['r', 'ā', 'n', 'ē'] };
  const happy = { word: 'happy', phonemes: ['h', 'a', 'p', 'ē'] };
  const mixedPool = [rainy, happy, 'bee', 'cat'];

  it('groups a generated final vowel with the same dictionary sound', () => {
    const board = core.buildSoundSort({ word: rainy.word, phonemes: rainy.phonemes, mode: 'last', pool: mixedPool });
    expect(board.targetChar).toBe('ee');
    expect(new Set(board.options)).toEqual(new Set(['happy', 'bee']));
    expect(board.distractors).toEqual(['cat']);
    expect(core.validSoundBoard(board, rainy.word, mixedPool)).toBe(true);
  });

  it('rejects an old board that scored an equivalent vowel as a distractor', () => {
    const oldBoard = { version: 1, mode: 'last', targetChar: 'ē', options: ['happy'], distractors: ['bee', 'cat'] };
    expect(core.validSoundBoard(oldBoard, rainy.word, mixedPool)).toBe(false);
  });

  it('does not offer an equivalent macron/IPA rhyme as an incorrect option', () => {
    const board = core.buildRhymeBoard({
      word: 'honey', answer: 'funny', phonemes: ['h', 'u', 'n', 'ē'],
      pool: [
        { word: 'funny', phonemes: ['f', 'u', 'n', 'ē'] },
        { word: 'bunny', phonemes: ['b', 'u', 'n', 'iː'] },
        { word: 'sunny', phonemes: ['s', 'u', 'n', 'ee'] },
        { word: 'cat', phonemes: ['k', 'a', 't'] },
        { word: 'dog', phonemes: ['d', 'o', 'g'] },
      ],
    });
    expect(board.options).toContain('funny');
    expect(board.options).not.toContain('bunny');
    expect(board.options).not.toContain('sunny');
    expect(board.options).toContain('cat');
  });

  it('compiles the default honey board without making dictionary key a distractor', () => {
    const words = [
      { word: 'candy', phonemes: ['k', 'a', 'n', 'd', 'ē'] },
      { word: 'sunny', phonemes: ['s', 'u', 'n', 'ē'] },
      { word: 'story', phonemes: ['s', 't', 'or', 'ē'] },
      { word: 'empty', phonemes: ['e', 'm', 'p', 't', 'ē'] },
      { word: 'messy', phonemes: ['m', 'e', 's', 'ē'] },
      { word: 'kitty', phonemes: ['k', 'i', 't', 'ē'] },
      { word: 'carry', phonemes: ['k', 'a', 'r', 'ē'] },
      { word: 'cherry', phonemes: ['ch', 'e', 'r', 'ē'] },
      { word: 'merry', phonemes: ['m', 'e', 'r', 'ē'] },
      { word: 'honey', phonemes: ['h', 'u', 'n', 'ē'] },
      { word: 'monkey', phonemes: ['m', 'u', 'ng', 'k', 'ē'] },
      happy,
    ];
    const board = compileWords(words).find(word => word.word === 'honey').activityItems.sound_sort;
    expect(board).toMatchObject({ mode: 'last', targetChar: 'ee' });
    expect(board.distractors).not.toContain('key');
    const data = new Map(words.map(word => [word.word, word.phonemes]));
    const ending = word => core.edgeSound(word, 'last', data.get(word));
    expect(board.options.every(word => ending(word) === 'ee')).toBe(true);
    expect(board.distractors.every(word => ending(word) !== 'ee')).toBe(true);
    expect(core.validSoundBoard(board, 'honey', words)).toBe(true);
  });
});
