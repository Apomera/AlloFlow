import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dictSrc = readFileSync('dictionary_loader.js', 'utf8');
const publicDictSrc = readFileSync('desktop/web-app/public/dictionary_loader.js', 'utf8');

function mountRealBank() {
  const bankSrc = readFileSync('packets_vocab_bank_en.js', 'utf8');
  new Function(bankSrc)();
  const en1 = JSON.parse(readFileSync('packets_vocab/en-1.json', 'utf8'));
  const en2 = JSON.parse(readFileSync('packets_vocab/en-2.json', 'utf8'));
  window.AlloVocabBank.add(en1, 1);
  window.AlloVocabBank.add(en2, 2);
}

describe('AlloDictionary school-curated offline bank & lemmatization', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.AlloDictionary;
    delete window.AlloVocabBank;
    delete window._isDesktopBundledApp;
    delete window._CACHE_WORD_SHARD_CLIPS;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
    delete window.AlloDictionary;
    delete window.AlloVocabBank;
    delete window._isDesktopBundledApp;
    delete window._CACHE_WORD_SHARD_CLIPS;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps dictionary_loader.js and desktop/web-app/public/dictionary_loader.js byte-identical', () => {
    expect(publicDictSrc).toBe(dictSrc);
  });

  it('resolves direct and inflected headwords offline & on Desktop with 0 external fetches and attaches shard audio', async () => {
    mountRealBank();
    window._isDesktopBundledApp = true;
    window._CACHE_WORD_SHARD_CLIPS = { habitat: 'data:audio/webm;base64,GkXf', run: 'data:audio/webm;base64,GkXg' };
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    new Function(dictSrc)();
    expect(window.AlloDictionary.hasOffline('habitat')).toBe(true);
    expect(window.AlloDictionary.hasOffline('ecosystems')).toBe(true);
    expect(window.AlloDictionary.hasOffline('studied')).toBe(true);
    expect(window.AlloDictionary.hasOffline('ran')).toBe(true);

    const direct = await window.AlloDictionary.lookupDetailed('habitat');
    expect(direct.reason).toBeNull();
    expect(direct.entry.word).toBe('habitat');
    expect(direct.entry.meanings.length).toBeGreaterThan(0);
    expect(direct.entry.audio).toBe('data:audio/webm;base64,GkXf');
    expect(direct.entry.source).toContain('AlloFlow School Vocabulary');

    const inflected = await window.AlloDictionary.lookupDetailed('ran');
    expect(inflected.reason).toBeNull();
    expect(inflected.entry.word).toBe('ran');
    expect(inflected.entry.audio).toBe('data:audio/webm;base64,GkXg');
    expect(inflected.entry.sourceUrl).toBe('https://en.wiktionary.org/wiki/run');

    expect(await window.AlloDictionary.lookupDetailed('studied')).toMatchObject({ reason: null, entry: { word: 'studied' } });
    expect(await window.AlloDictionary.lookupDetailed('ecosystems')).toMatchObject({ reason: null, entry: { word: 'ecosystems' } });
    expect(await window.AlloDictionary.lookupDetailed('constructor')).toMatchObject({ reason: 'not_available', entry: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to AlloVocabBank on web when dictionaryapi.dev 404s or fails without caching a null sentinel', async () => {
    mountRealBank();
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ status: 404, ok: false })
      .mockRejectedValueOnce(new Error('Offline'));
    vi.stubGlobal('fetch', fetchSpy);

    new Function(dictSrc)();
    const after404 = await window.AlloDictionary.lookupDetailed('ecosystems');
    expect(after404.reason).toBeNull();
    expect(after404.entry.word).toBe('ecosystems');
    expect(localStorage.getItem('allo_dict_ecosystems')).toBeNull();

    const afterErr = await window.AlloDictionary.lookupDetailed('studied');
    expect(afterErr.reason).toBeNull();
    expect(afterErr.entry.word).toBe('studied');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('works with pickSense and matchPassageSense on multi-sense bank words and respects useOfflineBank: false', async () => {
    const fixture = require('./fixtures/packets_vocab_bank_fixture.js');
    await fixture.load();
    window.AlloVocabBank = {
      version: fixture.version,
      ready: () => true,
      head: (w) => {
        const k = String(w || '').trim().toLowerCase();
        return fixture.has(k) ? k : null;
      },
      senses: (w) => fixture.senses(w),
    };
    window._isDesktopBundledApp = true;
    new Function(dictSrc)();

    const cellEntry = await window.AlloDictionary.lookup('cell');
    expect(cellEntry.meanings[0].definitions.length).toBe(3);
    const bio = window.AlloDictionary.matchPassageSense(cellEntry, 'Every living plant cell has a nucleus.');
    expect(bio.definition).toContain('smallest living part');
    const phone = window.AlloDictionary.pickSense(cellEntry, 'Call me on my phone.');
    expect(phone.definition).toContain('phone');

    expect(await window.AlloDictionary.lookupDetailed('cell', { useOfflineBank: false })).toEqual({ entry: null, reason: 'not_available' });
  });

  it('supports loadOfflineBank() using an already-present AlloVocabBank.load', async () => {
    const en1 = JSON.parse(readFileSync('packets_vocab/en-1.json', 'utf8'));
    const en2 = JSON.parse(readFileSync('packets_vocab/en-2.json', 'utf8'));
    new Function(readFileSync('packets_vocab_bank_en.js', 'utf8'))();
    new Function(dictSrc)();

    const ok = await window.AlloDictionary.loadOfflineBank({
      base: '',
      fetch: async (url) => ({
        ok: true,
        status: 200,
        json: async () => (url.endsWith('en-1.json') ? en1 : en2),
      }),
    });
    expect(ok).toBe(true);
    expect(window.AlloDictionary.lookupOfflineBank('migrated')).toBeTruthy();
  });

  it('fetches packets_vocab/en-*.json directly when AlloVocabBank is absent, falls back to ../packets_vocab/, and rejects HTML fallbacks', async () => {
    const en1 = JSON.parse(readFileSync('packets_vocab/en-1.json', 'utf8'));
    const en2 = JSON.parse(readFileSync('packets_vocab/en-2.json', 'utf8'));
    const fetchSpy = vi.fn(async (url) => {
      if (url.startsWith('./packets_vocab/')) {
        return {
          ok: true,
          status: 200,
          json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
        };
      }
      if (url === '../packets_vocab/en-1.json') return { ok: true, status: 200, json: async () => en1 };
      if (url === '../packets_vocab/en-2.json') return { ok: true, status: 200, json: async () => en2 };
      return { ok: false, status: 404, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchSpy);

    new Function(dictSrc)();
    const ok = await window.AlloDictionary.loadOfflineBank();
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('../packets_vocab/en-1.json', expect.objectContaining({ credentials: 'omit' }));
    expect(fetchSpy).toHaveBeenCalledWith('../packets_vocab/en-2.json', expect.objectContaining({ credentials: 'omit' }));
    expect(window.AlloDictionary.lookupOfflineBank('habitat')).toBeTruthy();
    expect(window.AlloDictionary.lookupOfflineBank('constructor')).toBeNull();
  });

  it('auto-loads offline JSON bank only when autoLoadOfflineBank: true (preserving 0-fetch bare Desktop lookups) and handles curly apostrophes & possessives', async () => {
    const en1 = JSON.parse(readFileSync('packets_vocab/en-1.json', 'utf8'));
    const en2 = JSON.parse(readFileSync('packets_vocab/en-2.json', 'utf8'));
    window._isDesktopBundledApp = true;
    const fetchSpy = vi.fn(async (url) => {
      if (url === './packets_vocab/en-1.json') return { ok: true, status: 200, json: async () => en1 };
      if (url === './packets_vocab/en-2.json') return { ok: true, status: 200, json: async () => en2 };
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', fetchSpy);

    new Function(dictSrc)();
    expect(await window.AlloDictionary.lookupDetailed('water')).toEqual({ entry: null, reason: 'not_available' });
    expect(fetchSpy).not.toHaveBeenCalled();

    const loaded = await window.AlloDictionary.lookupDetailed('children’s', { autoLoadOfflineBank: true });
    expect(loaded.reason).toBeNull();
    expect(loaded.entry.word).toBe("children's");
    expect(loaded.entry.meanings.length).toBeGreaterThan(0);

    const possessive = await window.AlloDictionary.lookupDetailed('teacher\u2019s', { autoLoadOfflineBank: true });
    expect(possessive.reason).toBeNull();
    expect(possessive.entry.word).toBe("teacher's");

    const trailingQuote = await window.AlloDictionary.lookupDetailed('habitats’', { autoLoadOfflineBank: true });
    expect(trailingQuote.reason).toBeNull();
    expect(trailingQuote.entry.word).toBe('habitats');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('respects AbortSignal cancellation on loadOfflineBank and attaches transient shard audio without persisting blob URLs to localStorage', async () => {
    const en1 = JSON.parse(readFileSync('packets_vocab/en-1.json', 'utf8'));
    const en2 = JSON.parse(readFileSync('packets_vocab/en-2.json', 'utf8'));
    const ctrl = new AbortController();
    let rejectPending;
    const delayedFetch = vi.fn(() => new Promise((_, rej) => { rejectPending = rej; }));
    vi.stubGlobal('fetch', delayedFetch);

    new Function(dictSrc)();
    const abortedPromise = window.AlloDictionary.loadOfflineBank({ signal: ctrl.signal });
    ctrl.abort();
    expect(await abortedPromise).toBe(false);
    rejectPending?.(new Error('aborted'));

    window.getWordShardAudio = vi.fn(async (w) => (w === 'river' ? 'blob:shard-river' : null));
    const apiFetch = vi.fn(async (url) => {
      if (url.includes('dictionaryapi.dev')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{
            word: 'river',
            phonetic: '/ˈrɪvɚ/',
            phonetics: [{ text: '/ˈrɪvɚ/', audio: '' }],
            meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A large natural stream of water.' }] }],
          }],
        };
      }
      if (url.endsWith('en-1.json')) return { ok: true, status: 200, json: async () => en1 };
      if (url.endsWith('en-2.json')) return { ok: true, status: 200, json: async () => en2 };
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', apiFetch);

    const online = await window.AlloDictionary.lookupDetailed('river');
    expect(online.reason).toBeNull();
    expect(online.entry.audio).toBe('blob:shard-river');
    const persisted = JSON.parse(localStorage.getItem('allo_dict_river'));
    expect(persisted.audio).toBe('');

    // Subsequent cache hit re-attaches fresh transient shard audio from getWordShardAudio
    window.getWordShardAudio = vi.fn(async (w) => (w === 'river' ? 'blob:shard-river-2' : null));
    const cachedHit = await window.AlloDictionary.lookupDetailed('river');
    expect(cachedHit.entry.audio).toBe('blob:shard-river-2');
    delete window.getWordShardAudio;
  });

  it('wires autoLoadOfflineBank into content_engine_source.jsx and content_engine_module.js for all reading lookups', () => {
    const ce = readFileSync('content_engine_module.js', 'utf8');
    expect(ce).toContain('autoLoadOfflineBank: true');
  });

  it('recovers online web lookups via lazy packets_vocab fetch when dictionaryapi.dev fails (school firewall) or 404s without caching null', async () => {
    const en1 = JSON.parse(readFileSync('packets_vocab/en-1.json', 'utf8'));
    const en2 = JSON.parse(readFileSync('packets_vocab/en-2.json', 'utf8'));
    const makeFetch = () => vi.fn(async (url) => {
      if (String(url).includes('dictionaryapi.dev') && String(url).endsWith('/ecosystems')) {
        return { ok: false, status: 404 };
      }
      if (String(url).includes('dictionaryapi.dev')) {
        throw new Error('Blocked by school firewall');
      }
      if (url === './packets_vocab/en-1.json') return { ok: true, status: 200, json: async () => en1 };
      if (url === './packets_vocab/en-2.json') return { ok: true, status: 200, json: async () => en2 };
      return { ok: false, status: 404 };
    });

    // Without autoLoadOfflineBank, a bare lookup preserves the single-fetch failure/not_found contract
    const bareFetch = makeFetch();
    vi.stubGlobal('fetch', bareFetch);
    new Function(dictSrc)();
    expect(await window.AlloDictionary.lookupDetailed('water')).toEqual({ entry: null, reason: 'request_failed' });
    expect(bareFetch).toHaveBeenCalledTimes(1);

    // With autoLoadOfflineBank: true (as reading-view lookups pass), firewall blocks & 404s recover cleanly
    const autoFetch = makeFetch();
    vi.stubGlobal('fetch', autoFetch);
    new Function(dictSrc)();
    const firewalled = await window.AlloDictionary.lookupDetailed('water', { autoLoadOfflineBank: true });
    expect(firewalled.reason).toBeNull();
    expect(firewalled.entry.word).toBe('water');
    expect(firewalled.entry.meanings.length).toBeGreaterThan(0);

    const missed404 = await window.AlloDictionary.lookupDetailed('ecosystems', { autoLoadOfflineBank: true });
    expect(missed404.reason).toBeNull();
    expect(missed404.entry.word).toBe('ecosystems');
    expect(localStorage.getItem('allo_dict_ecosystems')).toBeNull();
    expect(autoFetch).toHaveBeenCalledTimes(4); // 1 water API + 2 bank shards + 1 ecosystems API (bank already loaded)
  });
});
