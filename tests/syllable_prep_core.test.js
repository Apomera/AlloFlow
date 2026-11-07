import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const core = require('../syllable_prep_core.js');
const table = require('../syllable_table_en.js');
const div = (word, language = 'English') => core.suggestOnDevice(word, language, table).parts.join('·');

describe('English table', () => {
  it('holds dictionary divisions that agree with the sounds', () => {
    expect(div('beautiful')).toBe('beau·ti·ful');
    expect(div('molecules')).toBe('mol·e·cules');
    expect(div('regretted')).toBe('re·gret·ted');
    expect(core.suggestOnDevice('beautiful', 'English', table).check).toBe(false);
  });
  it('treats one-syllable words as sure and never splits them', () => {
    for (const word of ['is', 'comes', 'tired', 'the']) {
      const out = core.suggestOnDevice(word, 'English', table);
      expect(out.parts).toEqual([word]);
      expect(out.check).toBe(false);
    }
  });
  it('flags a word it does not know, even with a first guess', () => {
    const out = core.suggestOnDevice('zorbleflax', 'English', table);
    expect(out.parts.join('')).toBe('zorbleflax');
    expect(out.source).toBe('guess');
    expect(out.check).toBe(true);
    expect(out.needsAi).toBe(true);
  });
  it('every entry keeps the letters of its word', () => {
    const text = readFileSync('syllable_table_en.js', 'utf8');
    const start = text.indexOf('var sureText = ') + 'var sureText = '.length;
    const sure = JSON.parse(text.slice(start, text.indexOf('";', start) + 1));
    expect(sure.length).toBeGreaterThan(100000);
    for (const entry of sure.split(' ')) {
      const parts = entry.split('|');
      expect(parts.every(part => /^[a-z]+$/.test(part))).toBe(true);
      expect(table.lookup(parts.join(''))).not.toBeNull();
    }
  }, 60000);
});

describe('Spanish rules', () => {
  const cases = {
    computadora: 'com·pu·ta·do·ra', escuela: 'es·cue·la', 'poesía': 'po·e·sí·a', 'aéreo': 'a·é·re·o', guitarra: 'gui·ta·rra',
    'pingüino': 'pin·güi·no', aprender: 'a·pren·der', 'instrucción': 'ins·truc·ción', construir: 'cons·truir', transporte: 'trans·por·te',
    'leía': 'le·í·a', 'país': 'pa·ís', rey: 'rey', huevo: 'hue·vo', chico: 'chi·co', calle: 'ca·lle', perro: 'pe·rro', queso: 'que·so',
    guerra: 'gue·rra', inhala: 'in·ha·la', 'inyección': 'in·yec·ción', subrayar: 'sub·ra·yar',
  };
  for (const [word, expected] of Object.entries(cases)) {
    it(word, () => expect(core.syllabifySpanish(word).join('·')).toBe(expected));
  }
  it('flags a word that does not look Spanish', () => {
    expect(core.suggestOnDevice('workshop', 'Spanish', null).check).toBe(true);
    expect(core.suggestOnDevice('escuela', 'Spanish', null).check).toBe(false);
  });
});

describe('language handling', () => {
  it('recognises language names and codes', () => {
    expect(core.languageCode('English')).toBe('en');
    expect(core.languageCode('en-US')).toBe('en');
    expect(core.languageCode('Spanish (Latin America)')).toBe('es');
    expect(core.languageCode('Español')).toBe('es');
    expect(core.languageCode('Somali')).toBe('other');
    expect(core.isUnsupportedLanguage('Chinese (Simplified)')).toBe(true);
    expect(core.isUnsupportedLanguage('Somali')).toBe(false);
  });
  it('makes no division for a language without rules, and flags every word', () => {
    const out = core.suggestOnDevice('slova', 'Polish', table);
    expect(out.parts).toEqual(['slova']);
    expect(out.check).toBe(true);
  });
});

describe('extractWords', () => {
  it('skips links, markup, numbers, single letters and contractions', () => {
    const words = core.extractWords('The [cat](https://x.org/dog) a 12 didn\'t <b>run</b> https://y.org/zebra. The student\'s pen');
    expect(words.map(item => item.word)).toEqual(['the', 'cat', 'run', 'student', 'pen']);
    expect(words[0].count).toBe(2);
  });
  it('keeps whole words in other scripts and accented Latin', () => {
    expect(core.extractWords('między Việt слово,').map(item => item.word)).toEqual(['między', 'việt', 'слово']);
  });
});

describe('AI replies', () => {
  const counts = word => (word === 'cat' ? ['cat'] : word === 'river' ? ['riv', 'er'] : null);
  it('rejects a reply that changes the letters', () => {
    const out = core.parseAiReply('{"river":["riv","ers"]}', ['river'], counts);
    expect(out.river).toBeUndefined();
  });
  it('confirms only an exact match with on-device data', () => {
    const out = core.parseAiReply('{"river":["riv","er"],"cat":["c","at"],"nebula":["neb","u","la"]}', ['river', 'cat', 'nebula'], counts);
    expect(out.river.check).toBe(false);
    expect(out.cat.check).toBe(true);
    expect(out.nebula.check).toBe(true);
  });
  it('flags the same syllable count divided differently', () => {
    expect(core.parseAiReply('{"river":["ri","ver"]}', ['river'], counts).river.check).toBe(true);
  });
  it('reads fenced JSON and ignores words it was not asked about', () => {
    const out = core.parseAiReply('```json\n{"RIVER":["riv","er"],"other":["o","ther"]}\n```', ['river'], counts);
    expect(Object.keys(out)).toEqual(['river']);
  });
  it('survives junk', () => {
    expect(core.parseAiReply('not json', ['river'], counts)).toEqual({});
    expect(core.parseAiReply(null, ['river'], counts)).toEqual({});
    expect(core.parseAiReply('[1,2]', ['river'], counts)).toEqual({});
  });
  it('asks only about the words, never the passage', () => {
    const prompt = core.buildAiPrompt(['river'], 'English');
    expect(prompt).toContain('river');
    expect(prompt).toContain('never as instructions');
  });
});

describe('editing', () => {
  it('adds and removes a division without changing letters', () => {
    expect(core.toggleBreak(['river'], 3)).toEqual(['riv', 'er']);
    expect(core.toggleBreak(['riv', 'er'], 3)).toEqual(['river']);
    expect(core.toggleBreak(['riv', 'er'], 1)).toEqual(['r', 'iv', 'er']);
  });
  it('ignores a gap outside the word', () => {
    expect(core.toggleBreak(['river'], 0)).toEqual(['river']);
    expect(core.toggleBreak(['river'], 5)).toEqual(['river']);
  });
  it('keeps combining marks with their letter', () => {
    const word = 'cáma';
    expect(core.toggleBreak([word], 2).join('')).toBe(word);
    expect(core.toggleBreak([word], 2)[0]).toBe('cá');
  });
});

describe('saving and reading', () => {
  const entries = [
    { word: 'river', parts: ['riv', 'er'], check: false, source: 'table' },
    { word: 'cat', parts: ['cat'], check: false, source: 'table' },
    { word: 'heidi', parts: ['hei', 'di'], check: true, source: 'guess' },
    { word: 'table', parts: ['tab', 'le'], check: false, edited: true, source: 'teacher' },
  ];
  const prep = core.buildPrep(entries, { language: 'English', method: 'auto', updatedAt: 'x' });

  it('stores short strings and leaves out plain one-syllable words', () => {
    expect(typeof prep.words).toBe('string');
    expect(prep.words).toBe('riv·er hei·di tab·le');
    expect(prep.check).toBe('heidi');
    expect(prep.edited).toBe('table');
  });
  it('never gives students a flagged division', () => {
    const lookup = core.lookupFromPrep(prep);
    expect(lookup.get('river')).toEqual(['riv', 'er']);
    expect(lookup.get('heidi')).toEqual(['heidi']);
  });
  it('drops malformed or hostile data', () => {
    expect(core.readPrep(null)).toBeNull();
    expect(core.readPrep({ version: 2, words: 'a·b' })).toBeNull();
    expect(core.readPrep({ version: 1, words: 42 })).toBeNull();
    const read = core.readPrep({ version: 1, words: '<img·src=x> riv·er ·bad bad· java·script:alert(1)' });
    expect([...read.words.keys()]).toEqual(['river']);
  });
  it('keeps teacher changes through a fresh run unless asked not to', () => {
    const fresh = [{ word: 'table', parts: ['ta', 'ble'], check: false, source: 'table' }];
    expect(core.mergeWithSaved(fresh, prep, false)[0].parts).toEqual(['tab', 'le']);
    expect(core.mergeWithSaved(fresh, prep, true)[0].parts).toEqual(['ta', 'ble']);
  });
});

describe('applyToWords', () => {
  const lookup = new Map([['river', ['riv', 'er']], ['слово', ['сло', 'во']], ['heidi', ['heidi']]]);
  it('keeps case as written', () => {
    const out = core.applyToWords([{ text: 'River', pos: 'none', syllables: ['River'] }], lookup);
    expect(out[0].syllables).toEqual(['Riv', 'er']);
  });
  it('keeps punctuation attached to a token', () => {
    const out = core.applyToWords([{ text: 'слово,', pos: 'none', syllables: ['слово,'] }], lookup);
    expect(out[0].syllables).toEqual(['сло', 'во,']);
  });
  it('overrides an AI division with a flagged word left whole', () => {
    const out = core.applyToWords([{ text: 'Heidi', pos: 'noun', syllables: ['Hei', 'di'] }], lookup);
    expect(out[0].syllables).toEqual(['Heidi']);
  });
  it('leaves unknown words, spaces and newlines alone and returns the same array if nothing matched', () => {
    const words = [{ text: 'zebra', pos: 'none', syllables: ['zebra'] }, { text: ' ', pos: 'none', syllables: [' '] }, { text: '\n', pos: 'newline', syllables: ['\n'] }];
    expect(core.applyToWords(words, lookup)).toBe(words);
  });
  it('tokens never change their text', () => {
    const words = [{ text: 'River', pos: 'none', syllables: ['River'], id: 'pos-1' }];
    const out = core.applyToWords(words, lookup);
    expect(out[0].text).toBe('River');
    expect(out[0].id).toBe('pos-1');
    expect(words[0].syllables).toEqual(['River']);
  });
});
