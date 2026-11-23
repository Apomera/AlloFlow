import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const symTool = require('../dev-tools/build_word_sounds_symbols.cjs');
const extTool = require('../dev-tools/build_reading_symbols_ext.cjs');
const semTool = require('../dev-tools/build_word_picture_semantic_bridge.cjs');
const packetTool = require('../dev-tools/make_word_sounds_packet.cjs');
const matcher = require('../word_picture_matcher.js');
const semantic = require('../word_picture_semantic_en.js');

const baseSymbols = symTool.loadSymbols();
const extSymbols = extTool.loadReadingSymbolsExt();
const { builder } = packetTool.loadParts();

describe('Track 1: Extended reading symbols (reading_symbols_ext_en.js)', () => {
  it('stays cleanly decoupled from Word Sounds and passes svgRefusal() on every shipped SVG', () => {
    expect(extSymbols.ready()).toBe(true);
    expect(extSymbols.count).toBeGreaterThanOrEqual(240);
    expect(extSymbols.symbols).toBeGreaterThanOrEqual(70);
    for (const w of extSymbols.words()) {
      expect(baseSymbols.has(w), `duplicate with base WordSoundsSymbols: ${w}`).toBe(false);
      const got = extSymbols.get(w);
      expect(got && typeof got.svg === 'string', w).toBe(true);
      expect(builder.svgRefusal(got.svg), `${w} (${got.file})`).toBe('');
    }
  });

  it('unlocks high-frequency everyday reading words held from Word Sounds phonics fixtures', () => {
    for (const w of ['chicken', 'watch', 'cricket', 'afraid', 'angry', 'happy', 'sad', 'airplane', 'dad', 'mom', 'hat', 'shoe', 'climb', 'kick', 'sleep', 'wash']) {
      const got = extSymbols.get(w);
      expect(got && got.svg, w).toBeTruthy();
    }
    expect(baseSymbols.has('keyboard')).toBe(true);
    expect(baseSymbols.has('elevator')).toBe(true);
    // Pinned Word Sounds symbols must remain untouched.
    expect(baseSymbols.has('watch')).toBe(false);
    expect(baseSymbols.has('hat')).toBe(false);
  });

  it('matches deterministic build output', () => {
    const made = extTool.compute();
    expect(readFileSync(resolve(process.cwd(), 'reading_symbols_ext_en.js'), 'utf8')).toBe(made.indexText);
    for (const sh of made.shards) {
      expect(readFileSync(resolve(process.cwd(), sh.url), 'utf8')).toBe(sh.text);
    }
  });
});

describe('Track 1: Offline WordNet semantic visual bridge (word_picture_semantic_en.js)', () => {
  it('builds deterministically, stays compact, and provides >= 1,000 semantic visual bridges', () => {
    const made = semTool.compute();
    const disk = readFileSync(resolve(process.cwd(), 'word_picture_semantic_en.js'), 'utf8');
    expect(disk).toBe(made.output);
    expect(Buffer.byteLength(disk)).toBeLessThan(64 * 1024);
    expect(semantic.counts.total).toBeGreaterThanOrEqual(1000);
    expect(semantic.counts.diag).toBeGreaterThanOrEqual(200);
    expect(semantic.counts.syn).toBeGreaterThanOrEqual(400);
    expect(semantic.counts.hyp).toBeGreaterThanOrEqual(300);
  });

  it('maps concrete synonyms, pertainyms, hypernyms, and diagrams cleanly', () => {
    expect(semantic.lookup('serpent')).toMatchObject({ target: 'snake', kind: 'syn', tier: 'semantic-synonym' });
    expect(semantic.lookup('crimson')).toMatchObject({ target: 'red', kind: 'syn', tier: 'semantic-synonym' });
    expect(semantic.lookup('mansion')).toMatchObject({ target: 'house', kind: 'hyp', tier: 'semantic-hypernym' });
    expect(semantic.lookup('avocado')).toMatchObject({ target: 'fruit', kind: 'hyp', tier: 'semantic-hypernym' });
    expect(semantic.lookup('husky')).toMatchObject({ target: 'dog', kind: 'hyp', tier: 'semantic-hypernym' });
    expect(semantic.lookup('elk')).toMatchObject({ target: 'deer', kind: 'hyp', tier: 'semantic-hypernym' });
    expect(semantic.lookup('monarch')).toMatchObject({ target: 'butterfly', kind: 'hyp', tier: 'semantic-hypernym' });
    expect(semantic.lookup('raptor')).toMatchObject({ target: 'bird', kind: 'hyp', tier: 'semantic-hypernym' });
    expect(semantic.lookup('steamboat')).toMatchObject({ target: 'boat', kind: 'hyp', tier: 'semantic-hypernym' });
    expect(semantic.lookup('abdomen')).toMatchObject({ target: 'stomach', kind: 'diag', tier: 'semantic-diagram' });
    expect(semantic.lookup('igloo')).toMatchObject({ target: 'shelter', kind: 'diag', tier: 'semantic-diagram' });
  });

  it('blocks unsafe slang/drug terms and homograph traps', () => {
    for (const bad of ['amphetamine', 'meth', 'boozing', 'wench', 'peckerwood', 'decease', 'bat', 'bark', 'bank', 'crane', 'sauceboat', 'spectator', 'priming', 'castor', 'ash', 'cog', 'needle']) {
      expect(semantic.lookup(bad), `should block ${bad}`).toBeNull();
    }
  });

  it('integrates end-to-end into AlloWordPictureMatcher.matchWord() including inflections and searchSymbols()', async () => {
    const opts = { symbols: baseSymbols, readingSymbolsExt: extSymbols, semantic, preferDiagrams: true };

    // Direct extended symbol
    const chicken = matcher.matchWord({ word: 'chicken' }, opts);
    expect(chicken).toBeTruthy();
    expect(chicken.set).toBe('openmoji');
    expect(chicken.matchTier).toBe('exact');

    // Semantic synonym + inflection
    const serpents = matcher.matchWord({ word: 'serpents' }, opts);
    expect(serpents).toBeTruthy();
    expect(serpents.word).toBe('snake');
    expect(serpents.matchTier).toBe('semantic-synonym');

    // Semantic hypernym + inflection
    const avocados = matcher.matchWord({ word: 'avocados' }, opts);
    expect(avocados).toBeTruthy();
    expect(avocados.word).toBe('fruit');
    expect(avocados.matchTier).toBe('semantic-hypernym');

    // Semantic diagram
    const abdomen = matcher.matchWord({ word: 'abdomen' }, opts);
    expect(abdomen).toBeTruthy();
    expect(abdomen.set).toBe('diagram');
    expect(abdomen.matchTier).toBe('semantic-diagram');

    // Offline searchSymbols finds extended reading symbols too
    const hits = await matcher.searchSymbols('chicken', opts);
    expect(hits.some((h) => h.word === 'chicken' && h.svg)).toBe(true);
  });
});
