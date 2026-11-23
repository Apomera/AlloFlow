import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const build = require('../dev-tools/build_packets_vocab_bank.cjs');

function makeFreshBank() {
  const code = read('packets_vocab_bank_en.js');
  const fetched = [];
  const root = {
    fetch: (url) => {
      fetched.push(url);
      const rel = String(url).replace(/^.*?(packets_vocab(?:_ext)?\/)/, '$1');
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(read(rel)),
      });
    },
  };
  new Function('window', 'module', code)(root, undefined);
  return { api: root.AlloVocabBank, fetched };
}

describe('Track 2: Lazy extended offline definition shards & provenance', () => {
  it('exposes extShards separately from core shards and loads letter shards lazily on demand', async () => {
    const { api, fetched } = makeFreshBank();
    await api.load();
    expect(fetched.sort()).toEqual(['packets_vocab/en-1.json', 'packets_vocab/en-2.json']);
    expect(api.extTotalWords).toBeGreaterThanOrEqual(5000);
    expect(Object.keys(api.extShards)).toContain('phrases');
    expect(api.extReady('a')).toBe(false);

    // Pick a real extended word from shard 'a' that is NOT in core
    const aShard = JSON.parse(read('packets_vocab_ext/a.json'));
    expect(aShard.words.length).toBeGreaterThan(50);
    const sampleWord = aShard.words[0][0];
    expect(api.has(sampleWord)).toBe(false);

    // ensureForWords fetches ONLY letter 'a' (and not b..z)
    fetched.length = 0;
    await api.ensureForWords(['habitat', sampleWord]);
    expect(fetched).toEqual(['packets_vocab_ext/a.json']);
    expect(api.extReady('a')).toBe(true);
    expect(api.extReady('z')).toBe(false);
    expect(api.has(sampleWord)).toBe(true);
    const senses = api.senses(sampleWord);
    expect(senses.length).toBeGreaterThan(0);
    expect(['human-reviewed', 'ai-curated', 'cross-verified', 'open-dict']).toContain(senses[0].provenance);
    expect(senses[0].distractors).toEqual([]);
    // Core words() stays invariant; allWords() includes loaded extended headwords
    expect(api.words()).not.toContain(sampleWord);
    expect(api.allWords()).toContain(sampleWord);
  });

  it('loads curated K-12 & WordNet multi-word phrases from packets_vocab_ext/phrases.json', async () => {
    const { api, fetched } = makeFreshBank();
    await api.load();
    fetched.length = 0;
    expect(api.phraseSenses('water cycle')).toEqual([]);
    await api.loadPhrases();
    expect(fetched).toEqual(['packets_vocab_ext/phrases.json']);
    for (const ph of ['water cycle', 'food web', 'solar system', 'right angle', 'main idea', 'checks and balances']) {
      const got = api.phraseSenses(ph);
      expect(got.length, ph).toBeGreaterThan(0);
      expect(got[0].def.length, ph).toBeGreaterThan(10);
      expect(got[0].provenance, ph).toBe('human-reviewed');
    }
  });

  it('marks provenance honestly across core and extended senses and keeps HARD terms out', async () => {
    const { api } = makeFreshBank();
    await api.load();
    await api.loadAllExtended();
    const cell = api.senses('cell')[0];
    expect(cell.provenance).toBe('ai-curated');
    // Check cross-verified count across loaded words
    const allLoaded = api.allWords().flatMap((w) => api.senses(w));
    const crossCount = allLoaded.filter((s) => s.provenance === 'cross-verified').length;
    expect(crossCount).toBeGreaterThan(1000);
    // Safety invariant: no HARD terms in any extended definition
    const bad = allLoaded.filter((s) => build.HARD.test(s.def) || build.HARD.test(s.word));
    expect(bad).toEqual([]);
  });

  it('integrates lazy letter loading into AlloDictionary.lookupDetailed when autoLoadOfflineBank is true', async () => {
    localStorage.clear();
    delete window.AlloDictionary;
    delete window.AlloVocabBank;
    const { api } = makeFreshBank();
    window.AlloVocabBank = api;
    window._isDesktopBundledApp = true;
    new Function(read('dictionary_loader.js'))();

    const mShard = JSON.parse(read('packets_vocab_ext/m.json'));
    const extWord = mShard.words[0][0];
    expect(api.extReady('m')).toBe(false);

    const res = await window.AlloDictionary.lookupDetailed(extWord, { autoLoadOfflineBank: true });
    expect(res.reason).toBeNull();
    expect(res.entry).toBeTruthy();
    expect(res.entry.word).toBe(extWord);
    expect(res.entry.source).toContain('AlloFlow School Vocabulary');
    expect(api.extReady('m')).toBe(true);

    delete window._isDesktopBundledApp;
    delete window.AlloDictionary;
    delete window.AlloVocabBank;
  });
});
