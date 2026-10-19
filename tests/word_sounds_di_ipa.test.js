import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

let DI;
beforeAll(() => { DI = require(resolve('word_sounds_di_loader.js')); });

const word = (spelling, phonemes, graphemes) => ({word: spelling, phonemes, graphemes, syllables: [spelling]});
const ipa = (sound, grapheme) => ({ipa: sound, grapheme});

describe('IPA phonemes in printed Word Sounds analysis', () => {
  it.each([
    ['cat', [ipa('k', 'c'), ipa('æ', 'a'), ipa('t', 't')], 'CVC', 'closed'],
    ['ship', [ipa('ʃ', 'sh'), ipa('ɪ', 'i'), ipa('p', 'p')], 'CVC', 'closed'],
    ['bed', [ipa('b', 'b'), ipa('ɛ', 'e'), ipa('d', 'd')], 'CVC', 'closed'],
    ['moon', [ipa('m', 'm'), ipa('uː', 'oo'), ipa('n', 'n')], 'CVC', 'vowel team'],
    ['rain', [ipa('r', 'r'), ipa('eɪ', 'ai'), ipa('n', 'n')], 'CVC', 'vowel team'],
    ['bird', [ipa('b', 'b'), ipa('ɝ', 'ir'), ipa('d', 'd')], 'CVC', 'r-controlled'],
    ['cake', [ipa('k', 'c'), ipa('eɪ', 'a'), ipa('k', 'ke')], 'CVC', 'silent-e'],
  ])('analyzes %s from sounds while preserving its IPA and spellings', (spelling, phonemes, shape, syllableType) => {
    const analyzed = DI._analyzeWord(word(spelling, phonemes));
    expect(analyzed.shape).toBe(shape);
    expect(analyzed.syllableType).toBe(syllableType);
    expect(analyzed.phonemeCount).toBe(phonemes.length);
    expect(analyzed.phonemes).toEqual(phonemes.map(p => p.ipa));
    expect(analyzed.graphemes).toEqual(phonemes.map(p => p.grapheme));
  });

  it.each([
    ['æ', 'a', 'short'], ['ɛ', 'e', 'short'], ['ɪ', 'i', 'short'], ['ʌ', 'u', 'short'], ['ʊ', 'oo_short', 'short'],
    ['ɑ', 'o', 'short'], ['ɒ', 'o', 'short'], ['eɪ', 'ay', 'long'], ['iː', 'ee', 'long'], ['aɪ', 'ie', 'long'],
    ['oʊ', 'oa', 'long'], ['əʊ', 'oa', 'long'], ['uː', 'oo', 'long'], ['ɝ', 'er', 'r_controlled'], ['ɚ', 'er', 'r_controlled'],
    ['ɜr', 'er', 'r_controlled'], ['ɑr', 'ar', 'r_controlled'], ['ɔr', 'or', 'r_controlled'], ['ə', 'schwa', 'schwa'],
    ['ɔ', 'aw', 'team'], ['aʊ', 'ow', 'team'], ['ɔɪ', 'oy', 'team'],
  ])('classifies supported IPA %s as the canonical %s vowel', (token, soundKey, sub) => {
    expect(DI._classifyPhoneme(token)).toMatchObject({token, soundKey, kind: 'vowel', sub});
  });

  it.each([
    ['ā', 'ay', 'long'], ['ee', 'ee', 'long'], ['ie', 'ie', 'long'], ['oa', 'oa', 'long'], ['oo', 'oo', 'long'],
    ['oo_short', 'oo_short', 'short'], ['schwa', 'schwa', 'schwa'], ['er', 'er', 'r_controlled'], ['air', 'air', 'r_controlled'],
  ])('recognizes canonical label %s alongside IPA', (token, soundKey, sub) => {
    expect(DI._classifyPhoneme(token)).toMatchObject({soundKey, kind: 'vowel', sub});
  });

  it('ignores stress and tie marks for classification while keeping their printed notation', () => {
    expect(DI._classifyPhoneme('ˈæ')).toMatchObject({token: 'ˈæ', soundKey: 'a', kind: 'vowel'});
    expect(DI._classifyPhoneme('t͡ʃ')).toMatchObject({token: 't͡ʃ', soundKey: 'ch', kind: 'consonant', sub: 'digraph'});
  });

  it('keeps phoneme, sound and grapheme object fallbacks aligned', () => {
    const analyzed = DI._analyzeWord(word('cat', [
      {phoneme: 'k', grapheme: 'c'},
      {ipa: ' ', phoneme: '', sound: 'æ', grapheme: 'a'},
      {grapheme: 't'},
      null,
      {ipa: 4},
    ]));
    expect(analyzed.phonemes).toEqual(['k', 'æ', 't']);
    expect(analyzed.graphemes).toEqual(['c', 'a', 't']);
    expect(analyzed.shape).toBe('CVC');
  });

  it('recognizes consonant aliases without treating a digraph as a blend', () => {
    const frog = DI._analyzeWord(word('frog', [ipa('f', 'f'), ipa('ɹ', 'r'), ipa('ɑ', 'o'), ipa('ɡ', 'g')]));
    expect(frog.shape).toBe('CCVC');
    expect(frog.initialBlend).toEqual(['f', 'ɹ']);
    const milk = DI._analyzeWord(word('milk', [ipa('m', 'm'), ipa('ɪ', 'i'), ipa('l', 'l'), ipa('k', 'k')]));
    expect(milk.finalBlend).toEqual(['l', 'k']);
    for (const [token, key] of [['ʃ', 'sh'], ['tʃ', 'ch'], ['θ', 'th'], ['ð', 'dh'], ['ŋ', 'ng'], ['ʒ', 'zh']]) {
      expect(DI._classifyPhoneme(token)).toMatchObject({soundKey: key, kind: 'consonant', sub: 'digraph'});
    }
    expect(DI._analyzeWord(word('ship', [ipa('ʃ', 'sh'), ipa('ɪ', 'i'), ipa('p', 'p')])).initialBlend).toEqual([]);
  });

  it('distinguishes explicit IPA j/i/u from the app token notation', () => {
    for (const [token, ipaKey, appKey] of [['j', 'y', 'j'], ['i', 'ee', 'i'], ['u', 'oo', 'u']]) {
      expect(DI._classifyPhoneme({ipa: token}).soundKey).toBe(ipaKey);
      expect(DI._classifyPhoneme(token).soundKey).toBe(appKey);
      expect(DI._classifyPhoneme({phoneme: token}).soundKey).toBe(appKey);
    }
    expect(DI._classifyPhoneme({ipa: 'dʒ'}).soundKey).toBe('j');
    const analysis = DI.analyzeWordSet([
      word('yes', [ipa('j', 'y'), ipa('ɛ', 'e'), ipa('s', 's')]),
      word('jet', ['j', 'e', 't'], ['j', 'e', 't']),
    ]);
    expect(analysis.phonemes.filter(p => p.phoneme === 'j').map(p => p.soundKey).sort()).toEqual(['j', 'y']);
  });

  it('retains object-specific IPA categories in the set overview', () => {
    const analysis = DI.analyzeWordSet([word('see', [ipa('s', 's'), ipa('i', 'ee')])]);
    expect(analysis.phonemes.find(p => p.phoneme === 'i')).toMatchObject({soundKey: 'ee', category: 'long vowel'});
    expect(analysis.gpcs.find(p => p.grapheme === 'ee')).toMatchObject({phoneme: 'i', soundKey: 'ee', category: 'long vowel'});
    expect(analysis.words[0].syllableType).toBe('vowel team');
  });

  it('selects models by canonical focus instead of conflating IPA i with the app short vowel', () => {
    const analysis = DI.analyzeWordSet([
      word('it', ['i', 't'], ['i', 't']),
      word('see', [ipa('s', 's'), ipa('i', 'ee')]),
      word('bee', [ipa('b', 'b'), ipa('i', 'ee')]),
    ]);
    const script = DI.buildLessonScript(analysis, null);
    expect(script.sections.find(s => s.id === 'model').items.map(item => item.primary)).toEqual(['see', 'bee']);
  });

  it('prints the original IPA mapping and accepts the matching prepared sound label', () => {
    const item = word('cat', [ipa('k', 'c'), ipa('æ', 'a'), ipa('t', 't')]);
    item.activityItems = {
      mapping: {graphemes: ['c', 'a', 't']},
      isolation: {position: 1, correctSound: 'a', options: ['a', 'e', 'i']},
    };
    const analysis = DI.analyzeWordSet([item]);
    const script = DI.buildLessonScript(analysis, {activities: [{id: 'mapping', count: 1}, {id: 'isolation', count: 1}]});
    expect(script.sections.find(s => s.id === 'test_mapping').teacherSays[0]).toContain('/æ/ is spelled a');
    expect(script.sections.find(s => s.id === 'test_isolation').teacherSays[0]).toContain('second sound is /a/');
    const yes = word('yes', [ipa('j', 'y'), ipa('ɛ', 'e'), ipa('s', 's')]);
    yes.activityItems = {isolation: {position: 0, correctSound: 'y', options: ['y', 'j']}};
    const yesScript = DI.buildLessonScript(DI.analyzeWordSet([yes]), {activities: [{id: 'isolation', count: 1}]});
    expect(yesScript.sections.find(s => s.id === 'test_isolation').teacherSays[0]).toContain('/y/');
  });
});
