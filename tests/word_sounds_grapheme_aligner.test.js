import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Letters matched to sounds for Sound Mapping. The board has one box per
// sound; a spelling chip covers one box, or two (chipSpans) for qu, x, the u
// of cute and le. A word that cannot give that must say so.
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

  it('every grapheme list spells the word and its chips cover one box per sound', () => {
    const lists = builder.appWordLists(core);
    let ready = 0;
    for (const raw of Object.values(lists).flat()) {
      const word = String(raw).toLowerCase(), entry = core.dictionarySounds(word);
      if (!entry) continue;
      const result = analyse(word, entry.sounds);
      if (result.mapping.status !== 'ready') { expect(result.graphemes, word).toEqual([]); continue; }
      ready++;
      expect(result.graphemes.join(''), word).toBe(word);
      expect(result.chipSpans.length, word).toBe(result.graphemes.length);
      expect(result.chipSpans.reduce((sum, n) => sum + n, 0), word).toBe(entry.sounds.length);
      expect(core.mappingChipSpans(result.graphemes, entry.sounds.length, result.chipSpans), word).toEqual(result.chipSpans);
      expect(result.graphemes.every(text => text.length > 0), word).toBe(true);
    }
    expect(ready).toBeGreaterThan(1500);
  });

  it('x, long u and -le: one chip spans two sound boxes', () => {
    for (const [word, chips, spans, spelling, pair] of [
      ['box', ['b', 'o', 'x'], [1, 1, 2], 'x', ['k', 's']], ['six', ['s', 'i', 'x'], [1, 1, 2], 'x', ['k', 's']],
      ['exam', ['e', 'x', 'a', 'm'], [1, 2, 1, 1], 'x', ['g', 'z']], ['cute', ['c', 'u', 'te'], [1, 2, 1], 'u', ['y', 'oo']],
      ['use', ['u', 'se'], [2, 1], 'u', ['y', 'oo']], ['music', ['m', 'u', 's', 'i', 'c'], [1, 2, 1, 1, 1], 'u', ['y', 'oo']],
      ['little', ['l', 'i', 'tt', 'le'], [1, 1, 1, 2], 'le', ['schwa', 'l']], ['apple', ['a', 'pp', 'le'], [1, 1, 2], 'le', ['schwa', 'l']]]) {
      const result = analyse(word);
      expect(result.mapping.status, word).toBe('ready');
      expect(result.graphemes, word).toEqual(chips);
      expect(result.chipSpans, word).toEqual(spans);
      expect(result.flags.twoSound.map(item => [item.grapheme, item.sounds]), word).toEqual([[spelling, pair]]);
    }
    expect(analyse('box').chunks.map(chunk => [chunk.text, chunk.size])).toEqual([['b', 1], ['o', 1], ['x', 2]]);
    // The sounds stay one per box: box is 4 sounds.
    expect(analyse('box').sounds).toEqual(['b', 'o', 'k', 's']);
  });

  it('"one", "once" and other two-sound spellings with no taught chip stay out of Sound Mapping', () => {
    for (const [word, spelling] of [['one', 'o'], ['once', 'o'], ['few', 'ew']]) {
      const result = analyse(word);
      expect(result.mapping.status, word).toBe('two_sound_spelling');
      expect(result.graphemes, word).toEqual([]);
      expect(result.chipSpans, word).toEqual([]);
      expect(result.flags.twoSound.map(item => item.grapheme), word).toEqual([spelling]);
    }
  });

  it('qu is one chip over the /k/ and /w/ boxes (the unit convention); the sounds stay four', () => {
    expect(core.OG_CONVENTIONS.qu).toBe('unit');
    expect(core.OG_CONVENTIONS.groupWelded).toBe(false);
    const result = analyse('queen');
    expect(result.sounds).toEqual(['k', 'w', 'ee', 'n']);
    expect(result.mapping.status).toBe('ready');
    expect(result.graphemes).toEqual(['qu', 'ee', 'n']);
    expect(result.chipSpans).toEqual([2, 1, 1]);
    expect(result.flags.units).toEqual([{ unit: 'qu', start: 0, length: 2 }]);
    expect(analyse('squid')).toMatchObject({ graphemes: ['s', 'qu', 'i', 'd'], chipSpans: [1, 2, 1, 1] });
    // A word with no spanning chip has all ones.
    expect(analyse('ship').chipSpans).toEqual([1, 1, 1]);
  });

  it('mappingChipSpans checks a board: chips = spellings, spans add up to the sounds', () => {
    expect(core.mappingChipSpans(['qu', 'ee', 'n'], 4, [2, 1, 1])).toEqual([2, 1, 1]);
    expect(core.mappingChipSpans(['q', 'u', 'ee', 'n'], 4)).toEqual([1, 1, 1, 1]); // an old board
    expect(core.mappingChipSpans(['qu', 'ee', 'n'], 4)).toBeNull();
    expect(core.mappingChipSpans(['qu', 'ee', 'n'], 4, [2, 2, 1])).toBeNull();
    expect(core.mappingChipSpans(['qu', 'ee', 'n'], 4, [3, 1])).toBeNull();
    expect(core.mappingChipSpans(['b', 'o', 'x'], 4, [1, 1, 3])).toBeNull();
    expect(core.mappingChipSpans([], 0)).toBeNull();
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
    expect(analyse('cute', ['k', 'y', 'oo', 't'])).toMatchObject({ graphemes: ['c', 'u', 'te'], chipSpans: [1, 2, 1] });
  });

  it('is deterministic', () => {
    for (const word of ['knight', 'because', 'beautiful', 'elephant']) expect(analyse(word)).toEqual(analyse(word));
  });
});
