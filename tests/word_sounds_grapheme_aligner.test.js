import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Letters matched to sounds for Sound Mapping. The board needs exactly one
// spelling per sound, so a word that cannot give that must say so.
const require = createRequire(import.meta.url);
const data = require('../word_sounds_phonemes_en.js');
const builder = require('../dev-tools/build_word_sounds_phonemes.cjs');
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore;')()({ phonemes: data });
const analyse = (word, sounds) => core.soundAnalysis(word, sounds || core.dictionarySounds(word).sounds);
const graphemes = word => analyse(word).graphemes;

describe('grapheme aligner', () => {
  it('gives one spelling per sound for regular words', () => {
    expect(graphemes('cat')).toEqual(['c', 'a', 't']);
    expect(graphemes('ship')).toEqual(['sh', 'i', 'p']);
    expect(graphemes('chick')).toEqual(['ch', 'i', 'ck']);
    expect(graphemes('rain')).toEqual(['r', 'ai', 'n']);
    expect(graphemes('light')).toEqual(['l', 'igh', 't']);
    expect(graphemes('bird')).toEqual(['b', 'ir', 'd']);
    expect(graphemes('rabbit')).toEqual(['r', 'a', 'bb', 'i', 't']);
    expect(graphemes('butterfly')).toEqual(['b', 'u', 'tt', 'er', 'f', 'l', 'y']);
  });

  it('attaches a silent e to the consonant before it', () => {
    expect(graphemes('cake')).toEqual(['c', 'a', 'ke']);
    expect(graphemes('home')).toEqual(['h', 'o', 'me']);
    expect(graphemes('have')).toEqual(['h', 'a', 've']);
    expect(analyse('cake').chunks[2]).toMatchObject({ text: 'ke', silentE: true });
  });

  it('keeps silent letters with the sound they spell', () => {
    expect(graphemes('knight')).toEqual(['kn', 'igh', 't']);
    expect(graphemes('write')).toEqual(['wr', 'i', 'te']);
    expect(graphemes('lamb')).toEqual(['l', 'a', 'mb']);
    expect(graphemes('listen')).toEqual(['l', 'i', 'st', 'e', 'n']);
  });

  it('matches irregular sight words by their real spellings', () => {
    expect(graphemes('said')).toEqual(['s', 'ai', 'd']);
    expect(graphemes('does')).toEqual(['d', 'oe', 's']);
    expect(graphemes('two')).toEqual(['t', 'wo']);
    expect(graphemes('who')).toEqual(['wh', 'o']);
    expect(graphemes('they')).toEqual(['th', 'ey']);
    expect(graphemes('could')).toEqual(['c', 'oul', 'd']);
    expect(graphemes('through')).toEqual(['th', 'r', 'ough']);
  });

  it('every grapheme list spells the word and has one entry per sound', () => {
    const lists = builder.appWordLists(core);
    let ready = 0;
    for (const raw of Object.values(lists).flat()) {
      const word = String(raw).toLowerCase(), entry = core.dictionarySounds(word);
      if (!entry) continue;
      const result = analyse(word, entry.sounds);
      if (result.mapping.status !== 'ready') { expect(result.graphemes, word).toEqual([]); continue; }
      ready++;
      expect(result.graphemes.join(''), word).toBe(word);
      expect(result.graphemes.length, word).toBe(entry.sounds.length);
      expect(result.graphemes.every(text => text.length > 0), word).toBe(true);
    }
    expect(ready).toBeGreaterThan(1500);
  });

  it('x, long u, -le and "one" are two sounds in one spelling: no one-per-sound list', () => {
    for (const [word, spelling, pair] of [['box', 'x', ['k', 's']], ['cute', 'u', ['y', 'oo']], ['little', 'le', ['schwa', 'l']], ['one', 'o', ['w', 'u']], ['exam', 'x', ['g', 'z']]]) {
      const result = analyse(word);
      expect(result.mapping.status, word).toBe('two_sound_spelling');
      expect(result.graphemes, word).toEqual([]);
      expect(result.flags.twoSound.map(item => [item.grapheme, item.sounds]), word).toEqual([[spelling, pair]]);
    }
    // The letters are still matched, so a teacher note can name the spelling.
    expect(analyse('box').chunks.map(chunk => [chunk.text, chunk.size])).toEqual([['b', 1], ['o', 1], ['x', 2]]);
  });

  it('qu maps q to /k/ and u to /w/ under the split convention, and records the unit', () => {
    expect(core.OG_CONVENTIONS.qu).toBe('split');
    const result = analyse('queen');
    expect(result.mapping.status).toBe('ready');
    expect(result.graphemes).toEqual(['q', 'u', 'ee', 'n']);
    expect(result.flags.units).toEqual([{ unit: 'qu', start: 0, length: 2 }]);
  });

  it('welded units are recorded over separate sounds', () => {
    const result = analyse('think');
    expect(result.graphemes).toEqual(['th', 'i', 'n', 'k']);
    expect(result.flags.welded).toEqual([{ unit: 'ink', start: 1, length: 3 }]);
  });

  it('reports "no alignment" instead of forcing letters onto sounds', () => {
    expect(analyse('cat', ['d', 'o', 'g'])).toMatchObject({ chunks: null, graphemes: [], mapping: { status: 'no_alignment' } });
    expect(analyse('iron', ['ie', 'er', 'n']).mapping.status).toBe('no_alignment');
    expect(analyse("don't", ['d', 'oa', 'n', 't']).mapping.status).toBe('no_alignment');
    expect(analyse('cat', []).mapping.status).toBe('no_alignment');
    expect(core.alignGraphemes('cat', null)).toBeNull();
  });

  it('aligns sounds from any source, including macrons and pronunciation objects', () => {
    expect(analyse('cake', ['k', 'ā', 'k']).graphemes).toEqual(['c', 'a', 'ke']);
    expect(analyse('rain', [{ ipa: 'ɹ' }, { ipa: 'eɪ' }, { ipa: 'n' }]).graphemes).toEqual(['r', 'ai', 'n']);
    expect(analyse('turn', ['t', 'ur', 'n']).graphemes).toEqual(['t', 'ur', 'n']);
    // Four letters and four sounds, but not one letter each: the letter guess would be wrong.
    expect(analyse('cute', ['k', 'y', 'oo', 't']).graphemes).toEqual([]);
  });

  it('is deterministic', () => {
    for (const word of ['knight', 'because', 'beautiful', 'elephant']) expect(analyse(word)).toEqual(analyse(word));
  });
});
