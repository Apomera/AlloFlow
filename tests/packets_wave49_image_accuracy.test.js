import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');

const matcher = require('../word_picture_matcher.js');
const semanticBridge = require('../word_picture_semantic_en.js');
const SYMBOLS = require('../word_sounds_symbols_en.js');
const EXT_SYMBOLS = require('../reading_symbols_ext_en.js');

for (const shard of SYMBOLS.shards) SYMBOLS.add(JSON.parse(read(shard.url)));
for (const shard of EXT_SYMBOLS.shards) EXT_SYMBOLS.add(JSON.parse(read(shard.url)));

const STRICT_OPTS = {
  symbols: SYMBOLS,
  readingSymbolsExt: EXT_SYMBOLS,
  semantic: semanticBridge,
  preferDiagrams: false,
  strictConcrete: true,
};

const ACADEMIC_OPTS = {
  symbols: SYMBOLS,
  readingSymbolsExt: EXT_SYMBOLS,
  semantic: semanticBridge,
  preferDiagrams: true,
};

describe('Wave 49: Strict concrete Word Sounds image accuracy', () => {
  it('matches exact WordSoundsSymbols, safe inflectional lemmas, and exact ReadingSymbolsExt entries', () => {
    for (const w of ['cat', 'frog', 'dog', 'drum', 'fish', 'sun']) {
      const hit = matcher.matchWord({ word: w }, STRICT_OPTS);
      expect(hit, `expected exact match for "${w}"`).toBeTruthy();
      expect(hit.matchTier).toBe('exact');
      expect(hit.word).toBe(w);
      expect(hit.svg).toContain('<svg');
    }

    const inflections = [
      ['cats', 'cat'],
      ['frogs', 'frog'],
      ['jumping', 'jump'],
      ['jumped', 'jump'],
      ['running', 'run'],
      ['mice', 'mouse'],
      ['leaves', 'leaf'],
    ];
    for (const [word, expectedBase] of inflections) {
      const hit = matcher.matchWord({ word }, STRICT_OPTS);
      expect(hit, `expected safe inflection match for "${word}"`).toBeTruthy();
      expect(['exact', 'lemma']).toContain(hit.matchTier);
      expect(hit.matchTier === 'exact' ? hit.word : hit.word).toBe(hit.matchTier === 'exact' ? word : expectedBase);
      expect(hit.svg).toContain('<svg');
    }
    // Verify genuine Tier 2 lemma match on full bank ('mice' is not exact in either bank -> 'mouse')
    const miceHit = matcher.matchWord({ word: 'mice' }, STRICT_OPTS);
    expect(miceHit && miceHit.matchTier).toBe('lemma');
    expect(miceHit && miceHit.word).toBe('mouse');

    // Verify safe Tier 2 inflectional lemmas against base-only symbols
    const baseWords = { cat: 1, frog: 1, jump: 1, run: 1, leaf: 1, mouse: 1 };
    const baseOnlyBank = {
      has: (w) => !!baseWords[w],
      get: (w) => (baseWords[w] ? { svg: '<svg/>', label: w, set: 'mulberry', file: '' } : null),
    };
    const baseStrictOpts = {
      symbols: baseOnlyBank,
      useReadingExt: false,
      preferDiagrams: false,
      strictConcrete: true,
    };
    for (const [word, expectedBase] of [['cats', 'cat'], ['frogs', 'frog'], ['jumping', 'jump'], ['jumped', 'jump'], ['running', 'run'], ['mice', 'mouse'], ['leaves', 'leaf']]) {
      const hit = matcher.matchWord({ word }, baseStrictOpts);
      expect(hit, `expected Tier 2 lemma match for "${word}"`).toBeTruthy();
      expect(hit.matchTier).toBe('lemma');
      expect(hit.word).toBe(expectedBase);
    }

    // Exact ReadingSymbolsExt symbol not in primary WordSoundsSymbols
    const extOnlyWord = EXT_SYMBOLS.words().find((w) => !SYMBOLS.has(w) && /^[a-z]+$/.test(w));
    expect(extOnlyWord).toBeTruthy();
    const extHit = matcher.matchWord({ word: extOnlyWord }, STRICT_OPTS);
    expect(extHit, `expected exact ReadingSymbolsExt match for "${extOnlyWord}"`).toBeTruthy();
    expect(extHit.matchTier).toBe('exact');
    expect(extHit.word).toBe(extOnlyWord);
    expect(extHit.svg).toContain('<svg');
  });

  it('returns null (no inaccurate diagram, semantic hypernym, or bad short-stem match) in strictConcrete mode', () => {
    const noMatchWords = [
      'snap', 'spot', 'trip', 'slot', 'list', 'need', 'only', 'never',
      'many', 'just', 'rust', 'plan', 'slam', 'slip', 'stun', 'ever',
      'then', 'spit', 'her', 'led', 'best',
    ];
    for (const w of noMatchWords) {
      const hit = matcher.matchWord({ word: w }, STRICT_OPTS);
      expect(hit, `expected null for "${w}" in strictConcrete mode, got ${hit && hit.word} (${hit && (hit.matchTier || hit.matchType)})`).toBeNull();
    }

    // Short/tricky concrete words that ARE exact symbols must match themselves, never a stripped stem
    for (const w of ['bed', 'red', 'fed', 'sled', 'feed', 'fast']) {
      const hit = matcher.matchWord({ word: w }, STRICT_OPTS);
      expect(hit, `expected exact symbol for "${w}"`).toBeTruthy();
      expect(hit.matchTier).toBe('exact');
      expect(hit.word).toBe(w);
    }
  });

  it('preserves default academic Vocabulary/Glossary matching when strictConcrete is false', () => {
    for (const w of ['erosion', 'photosynthesis', 'fraction', 'gravity']) {
      const hit = matcher.matchWord({ word: w }, ACADEMIC_OPTS);
      expect(hit, `expected academic match for "${w}"`).toBeTruthy();
      expect(hit.svg).toContain('<svg');
    }
  });

  it('wires packets-make.js to use strictConcrete: true and preferDiagrams: false', () => {
    const src = read('packets-make.js');
    expect(src).toContain('strictConcrete: true');
    expect(src).toContain('preferDiagrams: false');
    expect(src).not.toContain('preferDiagrams: true');
  });
});
