import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const generator = require('../dev-tools/build_word_sounds_pronunciations.cjs');
const api = require('../word_sounds_pronunciations.js');
const source = readFileSync('word_sounds_pronunciations.js', 'utf8');
const counts = word => [...new Set(api.lookup(word).map(value => value.length))];

describe('pinned Word Sounds pronunciation evidence', () => {
  it('derives every lookup from the pinned upstream vowel phones, including alternatives', () => {
    const artifacts = generator.buildArtifacts();
    expect(artifacts.moduleSource).toBe(source);
    expect(readFileSync('desktop/web-app/public/word_sounds_pronunciations.js', 'utf8')).toBe(source);
    expect(readFileSync('data/vendor/cmudict/source.json', 'utf8')).toBe(artifacts.metadataSource);
    expect(api.wordCount).toBe(126045);
    let mismatches = 0;
    for (const [word, variants] of artifacts.parsed.entries) {
      if (JSON.stringify(api.lookup(word)) !== JSON.stringify([...variants])) mismatches++;
    }
    expect(mismatches).toBe(0);
    expect(artifacts.parsed.countVariantWordCount).toBe(1714);
  });

  it('handles vowel hiatus, syllabic endings, silent e and inflectional endings', () => {
    for (const word of ['apple', 'table', 'little', 'bottle', 'people', 'lion', 'quiet', 'poem', 'wanted', 'needed', 'boxes', 'foxes']) {
      expect(counts(word), word).toEqual([2]);
    }
    for (const word of ['smile', 'asked', 'walked', 'jumped']) expect(counts(word), word).toEqual([1]);
    expect(api.lookup('banana')).toEqual(['010']);
    expect(counts('vehicle')).toEqual([3]);
    for (const word of ['baseball', 'homework', 'housework']) expect(counts(word), word).toEqual([2]);
    // Compound-bank coverage is separate from the pinned dictionary's vocabulary.
    expect(api.lookup('whiteboard')).toEqual([]);
  });

  it('retains pronunciation alternatives instead of declaring one universal count', () => {
    expect(api.lookup('family')).toEqual(['100', '10']);
    expect(counts('fire')).toEqual([2, 1]);
    expect(counts('hour')).toEqual([2, 1]);
    expect(counts('every')).toEqual([3, 2]);
    expect(counts('camera')).toEqual([3, 2]);
    expect(api.source.language).toBe('en-US');
    expect(api.source.scope).toContain('not tagged by dialect');
    expect(api.source.commit).toBe(generator.COMMIT);
  });

  it('leaves unknown or nonvocalic words unresolved without prototype lookups', () => {
    for (const word of ['', null, undefined, {}, '__proto__', 'toString', 'quuxzznotaword', 'hmm', 'shh']) {
      expect(api.lookup(word), String(word)).toEqual([]);
    }
    expect(api.lookup(' FAMILY ')).toEqual(api.lookup('family'));
    expect(api.lookup('doesn’t')).toEqual(api.lookup("doesn't"));
    expect(api.lookup("doesn't").length).toBeGreaterThan(0);
  });

  it('does not let a caller change dictionary evidence or shared variants', () => {
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.source)).toBe(true);
    expect(Object.isFrozen(api.lookup('family'))).toBe(true);
    expect(() => api.lookup('family').push('1')).toThrow();
    expect(api.lookup('family')).toEqual(['100', '10']);
  });

  it('registers one cached browser API while preserving other modules', () => {
    const context = { window: { AlloModules: { Other: { untouched: true } } } };
    vm.createContext(context);
    vm.runInContext(source, context);
    const browserApi = context.window.AlloModules.WordSoundsPronunciations;
    expect(browserApi).toBe(context.createWordSoundsPronunciationData());
    expect(browserApi).toBe(context.createWordSoundsPronunciationData());
    expect(Array.from(browserApi.lookup('banana'))).toEqual(['010']);
    expect(context.window.AlloModules.Other).toEqual({ untouched: true });
  });

  it('counts only valid vowel phones and keeps nonvocalic rows unresolved', () => {
    const parsed = generator.parseDictionary('cat K AE1 T\ncat(2) K AE1 T\nfamily F AE1 M AH0 L IY0\nfamily(2) F AE1 M L IY0\nhmm HH M\n', 'K stop\nAE vowel\nT stop\nF fricative\nM nasal\nAH vowel\nL liquid\nIY vowel\nHH aspirate\n');
    expect([...parsed.entries.get('family')]).toEqual(['100', '10']);
    expect([...parsed.entries.get('cat')]).toEqual(['1']);
    expect(parsed.excluded).toEqual(['hmm']);
    expect(() => generator.parseDictionary('word ZZ1\n', 'AH vowel\n')).toThrow('Unknown CMUdict phone');
    expect(() => generator.parseDictionary('word AH\n', 'AH vowel\n')).toThrow('Unstressed vowel metadata');
  });
});
