import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// The sound dictionary: CMUdict phones -> the app's sound labels under
// Orton-Gillingham conventions. Each rule in C:\tmp\ws_aifree_1110\og_rules.md
// (the owner's sign-off sheet) has its example words here.
const require = createRequire(import.meta.url);
const builder = require('../dev-tools/build_word_sounds_phonemes.cjs');
const data = require('../word_sounds_phonemes_en.js');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const core = new Function(coreSource + ';return createWordSoundsCore;')()({ phonemes: data });

let cmu;
beforeAll(() => { cmu = builder.readDictionary(); });
const convert = word => core.arpabetEntry(word, cmu.get(word));
const sounds = word => core.dictionarySounds(word).sounds;
const analysis = word => core.soundAnalysis(word, sounds(word));
const spelled = word => analysis(word).chunks.map(chunk => chunk.text);

describe('ARPAbet to sound labels, rule by rule', () => {
  it('maps one phone to one label and keeps voiced and unvoiced th apart', () => {
    expect(core.arpabetToSounds('ship', 'SH IH1 P')).toEqual(['sh', 'i', 'p']);
    expect(core.arpabetToSounds('thin', 'TH IH1 N')).toEqual(['th', 'i', 'n']);
    expect(core.arpabetToSounds('this', 'DH IH1 S')).toEqual(['dh', 'i', 's']);
    expect(core.arpabetToSounds('vision', 'V IH1 ZH AH0 N')).toEqual(['v', 'i', 'zh', 'schwa', 'n']);
    expect(core.arpabetToSounds('xx', 'QQ1')).toBeNull();
  });

  it('consonant digraphs sh ch th wh ck ng ph are one sound each', () => {
    expect(sounds('ship')).toEqual(['sh', 'i', 'p']);
    expect(sounds('chin')).toEqual(['ch', 'i', 'n']);
    expect(sounds('thin')).toEqual(['th', 'i', 'n']);
    expect(sounds('when')).toEqual(['w', 'e', 'n']);
    expect(sounds('duck')).toEqual(['d', 'u', 'k']);
    expect(sounds('ring')).toEqual(['r', 'i', 'ng']);
    expect(sounds('phone')).toEqual(['f', 'oa', 'n']);
    for (const [word, digraph] of [['ship', 'sh'], ['chin', 'ch'], ['thin', 'th'], ['when', 'wh'], ['duck', 'ck'], ['ring', 'ng'], ['phone', 'ph']]) {
      expect(analysis(word).flags.digraphs.map(item => item.grapheme), word).toEqual([digraph]);
    }
  });

  it('blends stay separate sounds', () => {
    expect(sounds('stop')).toEqual(['s', 't', 'o', 'p']);
    expect(sounds('black')).toEqual(['b', 'l', 'a', 'k']);
    expect(sounds('trip')).toEqual(['t', 'r', 'i', 'p']);
    expect(sounds('hand')).toEqual(['h', 'a', 'n', 'd']);
    expect(spelled('strap')).toEqual(['s', 't', 'r', 'a', 'p']);
  });

  it('short vowels are a e i o u', () => {
    expect(['cat', 'bed', 'pig', 'hop', 'sun'].map(word => sounds(word)[1])).toEqual(['a', 'e', 'i', 'o', 'u']);
  });

  it('long vowels use the bank labels and record the spelling pattern', () => {
    expect(sounds('cake')).toEqual(['k', 'ay', 'k']);
    expect(spelled('cake')).toEqual(['c', 'a', 'ke']);
    expect(analysis('cake').flags.vowelPatterns).toEqual([{ start: 1, grapheme: 'a', pattern: 'silent_e' }]);
    expect(sounds('rain')).toEqual(['r', 'ay', 'n']);
    expect(analysis('rain').flags.vowelPatterns[0].pattern).toBe('vowel_team');
    expect(sounds('go')).toEqual(['g', 'oa']);
    expect(analysis('go').flags.vowelPatterns[0].pattern).toBe('open_syllable');
    expect(sounds('tree')).toEqual(['t', 'r', 'ee']);
    expect(sounds('bike')).toEqual(['b', 'ie', 'k']);
    expect(sounds('boat')).toEqual(['b', 'oa', 't']);
    expect(sounds('moon')).toEqual(['m', 'oo', 'n']);
    expect(sounds('book')).toEqual(['b', 'oo_short', 'k']);
    expect(analysis('fly').flags.vowelPatterns[0].pattern).toBe('y_as_vowel');
  });

  it('r-controlled vowels are single units; er, ir and ur follow the spelling', () => {
    expect(sounds('car')).toEqual(['k', 'ar']);
    expect(sounds('corn')).toEqual(['k', 'or', 'n']);
    expect(sounds('her')).toEqual(['h', 'er']);
    expect(sounds('bird')).toEqual(['b', 'ir', 'd']);
    expect(sounds('turn')).toEqual(['t', 'ur', 'n']);
    expect(sounds('word')).toEqual(['w', 'er', 'd']);
    expect(sounds('chair')).toEqual(['ch', 'air']);
    expect(sounds('here')).toEqual(['h', 'ear']);
    expect(sounds('story')).toEqual(['s', 't', 'or', 'ee']);
    // A vowel and r before another vowel stay two sounds unless the spelling is an r-controlled one.
    expect(sounds('very')).toEqual(['v', 'e', 'r', 'ee']);
    expect(sounds('fairy')).toEqual(['f', 'air', 'ee']);
    // er, ir and ur are one sound: the app compares them as equal.
    expect(new Set(['er', 'ir', 'ur'].map(core.soundKey)).size).toBe(1);
  });

  it('"ure" has no recording: its two sounds play and the unit is recorded', () => {
    expect(sounds('sure')).toEqual(['sh', ...core.OG_CONVENTIONS.ure]);
    expect(analysis('sure').flags.units).toEqual([{ unit: 'ure', start: 1, length: 2 }]);
  });

  it('schwa is kept and flagged, never passed off as a short vowel', () => {
    expect(sounds('about')).toEqual(['schwa', 'b', 'ow', 't']);
    expect(analysis('about').flags.schwa).toBe(true);
    expect(sounds('elephant')).toEqual(['e', 'l', 'schwa', 'f', 'schwa', 'n', 't']);
    expect(analysis('cat').flags.schwa).toBe(false);
    expect(core.soundsNeedGlance({ source: 'dictionary', sounds: sounds('about'), alternates: [] })).toEqual(['schwa']);
  });

  it('x is /k/ + /s/ and qu is /k/ + /w/', () => {
    expect(sounds('box')).toEqual(['b', 'o', 'k', 's']);
    expect(analysis('box').flags.twoSound).toEqual([{ grapheme: 'x', sounds: ['k', 's'], start: 2 }]);
    expect(sounds('queen')).toEqual(['k', 'w', 'ee', 'n']);
    expect(spelled('queen')).toEqual(['q', 'u', 'ee', 'n']);
    expect(analysis('queen').flags.units).toEqual([{ unit: 'qu', start: 0, length: 2 }]);
    expect(core.OG_CONVENTIONS.qu).toBe('split');
  });

  it('long u is /y/ + /oo/ where it is said and /oo/ where it is not', () => {
    expect(sounds('cute')).toEqual(['k', 'y', 'oo', 't']);
    expect(sounds('use').slice(0, 2)).toEqual(core.OG_CONVENTIONS.longU);
    expect(sounds('rule')).toEqual(['r', 'oo', 'l']);
    expect(sounds('blue')).toEqual(['b', 'l', 'oo']);
  });

  it('-le is a final stable syllable: schwa + l', () => {
    expect(sounds('little')).toEqual(['l', 'i', 't', 'schwa', 'l']);
    expect(spelled('little')).toEqual(['l', 'i', 'tt', 'le']);
    expect(analysis('little').flags.finalLe).toBe(true);
  });

  it('-ng and -nk stay separate sounds and the welded unit is recorded', () => {
    expect(sounds('sing')).toEqual(['s', 'i', 'ng']);
    expect(analysis('sing').flags.welded).toEqual([{ unit: 'ing', start: 1, length: 2 }]);
    expect(sounds('bank')).toEqual(['b', 'a', 'ng', 'k']);
    expect(analysis('bank').flags.welded).toEqual([{ unit: 'ank', start: 1, length: 3 }]);
    for (const [word, unit] of [['bang', 'ang'], ['song', 'ong'], ['sung', 'ung'], ['pink', 'ink'], ['honk', 'onk'], ['junk', 'unk']]) {
      // Straight from the vendored dictionary: "honk" is not among the shipped common words.
      expect(core.soundAnalysis(word, convert(word)[0]).flags.welded.map(item => item.unit), word).toEqual([unit]);
    }
    // all, am, an are welded only in some programmes: off unless the owner turns them on.
    expect(core.OG_CONVENTIONS.useWeldedExtended).toBe(false);
    expect(analysis('ball').flags.welded).toEqual([]);
  });

  it('-ed has three sounds', () => {
    expect(sounds('jumped')).toEqual(['j', 'u', 'm', 'p', 't']);
    expect(analysis('jumped').flags.ed).toBe('t');
    expect(sounds('played')).toEqual(['p', 'l', 'ay', 'd']);
    expect(analysis('played').flags.ed).toBe('d');
    expect(sounds('wanted')).toEqual(['w', 'o', 'n', 't', ...core.OG_CONVENTIONS.edSyllable]);
    expect(analysis('wanted').flags.ed).toBe('ed');
    expect(spelled('needed')).toEqual(['n', 'ee', 'd', 'e', 'd']);
    expect(analysis('bed').flags.ed).toBeNull();
    expect(analysis('seed').flags.ed).toBeNull();
  });

  it('a silent letter joins the spelling of the sound beside it', () => {
    expect(sounds('knight')).toEqual(['n', 'ie', 't']);
    expect(spelled('knight')).toEqual(['kn', 'igh', 't']);
    expect(spelled('write')).toEqual(['wr', 'i', 'te']);
    expect(spelled('gnat')).toEqual(['gn', 'a', 't']);
    expect(spelled('lamb')).toEqual(['l', 'a', 'mb']);
    expect(analysis('knight').flags.silentLetters).toEqual([{ grapheme: 'kn', silent: 'k', start: 0 }]);
  });

  it('General American: short o or aw follows the spelling', () => {
    expect(sounds('dog')).toEqual(['d', 'o', 'g']);
    expect(sounds('saw')).toEqual(['s', 'aw']);
    expect(sounds('caught')).toEqual(['k', 'aw', 't']);
    expect(sounds('ball')).toEqual(['b', 'aw', 'l']);
    expect(sounds('walk')).toEqual(['w', 'aw', 'k']);
    expect(sounds('want')).toEqual(['w', 'o', 'n', 't']);
    expect(sounds('father')).toEqual(['f', 'o', 'dh', 'er']);
    expect(core.OG_CONVENTIONS.dialect).toContain('General American');
  });

  it('keeps other pronunciations and puts the taught form first', () => {
    expect(convert('the')).toEqual([['dh', 'schwa'], ['dh', 'u'], ['dh', 'ee']]);
    expect(convert('a')[0]).toEqual(['schwa']);
    // The dictionary lists the reduced form of "and" first; the citation form is taught.
    expect(cmu.get('and')[0].join(' ')).toBe('AH0 N D');
    expect(convert('and')[0]).toEqual(['a', 'n', 'd']);
    const use = core.dictionarySounds('use');
    expect(use.sounds).toEqual(['y', 'oo', 's']);
    expect(use.alternates).toEqual([['y', 'oo', 'z']]);
    expect(core.soundsNeedGlance({ source: 'dictionary', sounds: use.sounds, alternates: use.alternates })).toEqual(['alternate']);
    expect(core.dictionarySounds('cat').alternates).toEqual([]);
    // wh is /w/: the /hw/ listing is not a second pronunciation.
    expect(convert('whale')).toEqual([['w', 'ay', 'l']]);
  });

  it('says where sounds came from and when a teacher should glance', () => {
    expect(core.SOUND_SOURCES).toEqual(['teacher', 'dictionary', 'espeak', 'ai', 'estimate']);
    expect(core.soundsNeedGlance({ source: 'dictionary', sounds: ['k', 'a', 't'], alternates: [] })).toEqual([]);
    expect(core.soundsNeedGlance({ source: 'espeak', sounds: ['k', 'a', 't'] })).toEqual(['not_dictionary']);
    expect(core.soundsNeedGlance({ source: 'ai', sounds: ['k', 'a', 't'] })).toEqual(['not_dictionary']);
    expect(core.soundsNeedGlance({ source: 'estimate', sounds: ['c', 'a', 't'] })).toEqual(['estimate']);
    expect(core.soundsNeedGlance({ source: 'teacher', sounds: ['schwa'], alternates: [['u']] })).toEqual([]);
  });
});

describe('the generated dictionary file', () => {
  it('is in sync with the vendored dictionary, the word lists and the rules', () => {
    const built = builder.buildEntries();
    const output = builder.renderModule(built);
    expect(readFileSync('word_sounds_phonemes_en.js', 'utf8')).toBe(output);
    expect(readFileSync('desktop/web-app/public/word_sounds_phonemes_en.js', 'utf8')).toBe(output);
    expect(data.wordCount).toBe(built.entries.size);
    expect(data.wordCount).toBeGreaterThan(25000);
  });

  it('produces only labels the recorded phoneme bank can play', () => {
    const bank = new Set([...Object.keys(JSON.parse(readFileSync('audio_bank.json', 'utf8')).phonemes),
      ...Object.keys(JSON.parse(readFileSync('audio_bank_kokoro.json', 'utf8')).phonemes)]);
    expect(bank.size).toBe(52);
    expect(data.labels.filter(label => !bank.has(label))).toEqual([]);
    const used = new Set();
    for (const word of builder.buildEntries().entries.keys()) for (const form of data.lookup(word)) for (const label of form) used.add(label);
    expect([...used].filter(label => !bank.has(label))).toEqual([]);
    // Every label also reaches a clip through the player's own lookup.
    for (const label of used) expect(core.phonemeBankCandidates(label).some(key => bank.has(key)), label).toBe(true);
  });

  it('covers every word in the app lists that the vendored dictionary has', () => {
    const lists = builder.appWordLists(core);
    for (const [name, words] of Object.entries(lists)) {
      const missing = [...new Set(words.map(word => String(word).toLowerCase()))].filter(word => cmu.has(word) && !core.dictionarySounds(word));
      expect(missing, name).toEqual([]);
    }
  });

  it('leaves unknown input unresolved and cannot be changed by a caller', () => {
    for (const value of ['', null, undefined, {}, '__proto__', 'toString', 'quuxzznotaword']) expect(data.lookup(value)).toEqual([]);
    expect(core.dictionarySounds('quuxzznotaword')).toBeNull();
    expect(data.lookup(' CAT ')).toEqual([['k', 'a', 't']]);
    expect(Object.isFrozen(data)).toBe(true);
    expect(() => data.lookup('cat')[0].push('s')).toThrow();
    const copy = core.dictionarySounds('cat');
    copy.sounds.push('s');
    expect(core.dictionarySounds('cat').sounds).toEqual(['k', 'a', 't']);
  });

  it('registers one browser API and carries the licence notice', () => {
    const source = readFileSync('word_sounds_phonemes_en.js', 'utf8');
    expect(source.startsWith('// Generated by dev-tools/build_word_sounds_phonemes.cjs. Do not edit.')).toBe(true);
    expect(source).toContain('Copyright (C) 1993-2015 Carnegie Mellon University');
    const context = { window: { AlloModules: { Other: { untouched: true } } } };
    vm.createContext(context);
    vm.runInContext(source, context);
    expect(Array.from(context.window.AlloModules.WordSoundsPhonemes.lookup('ship')[0])).toEqual(['sh', 'i', 'p']);
    expect(context.window.AlloModules.Other).toEqual({ untouched: true });
  });

  it('without the dictionary file the core reports "not known" instead of guessing', () => {
    const bare = new Function(coreSource + ';return createWordSoundsCore;')()({ phonemes: {} });
    expect(bare.dictionarySounds('cat')).toBeNull();
  });
});
