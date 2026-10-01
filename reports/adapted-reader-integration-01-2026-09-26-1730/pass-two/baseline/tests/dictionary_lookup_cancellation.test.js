import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

// Exercise the staged loader delta against current source without writing the
// shared loader or its public mirror. The transform is a no-op after integration.
const require = createRequire(import.meta.url);
const { applyDictionaryRecovery } = require('../dev-tools/prepare_reading_lookup_resilience.cjs');
const source = process.env.ALLO_DICT_CANDIDATE ? readFileSync(process.env.ALLO_DICT_CANDIDATE, 'utf8')
  : applyDictionaryRecovery(readFileSync('dictionary_loader.js', 'utf8').replace(/\r\n/g, '\n'));
const rows = [{ word: 'bank', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The edge of a river.' }] }] }];
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => {
  localStorage.clear(); delete window.AlloDictionary;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  new Function(source)();
});
afterEach(() => { localStorage.clear(); delete window.AlloDictionary; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('dictionary cancellation and retry cache ownership', () => {
  it('passes the owned signal to fetch and does not cache a late response after cancellation', async () => {
    const response = deferred(), controller = new AbortController();
    const fetch = vi.fn(() => response.promise); vi.stubGlobal('fetch', fetch);
    const pending = window.AlloDictionary.lookup('bank', { signal: controller.signal }); await Promise.resolve();
    expect(fetch).toHaveBeenCalledWith('https://api.dictionaryapi.dev/api/v2/entries/en/bank', { signal: controller.signal });
    controller.abort(); response.resolve({ ok: true, json: () => Promise.resolve(rows) });
    expect(await pending).toBeNull(); expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
  });
  it('does not cache a response whose JSON finishes after cancellation', async () => {
    const body = deferred(), controller = new AbortController(), json = vi.fn(() => body.promise);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json }));
    const pending = window.AlloDictionary.lookup('bank', { signal: controller.signal });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(json).toHaveBeenCalled(); controller.abort(); body.resolve(rows);
    expect(await pending).toBeNull(); expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
  });
  it('starts no fetch for an already cancelled request', async () => {
    const controller = new AbortController(), fetch = vi.fn(); vi.stubGlobal('fetch', fetch); controller.abort();
    expect(await window.AlloDictionary.lookup('bank', { signal: controller.signal })).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  });
  it('allows explicit retry after a cached miss while ordinary lookups keep using the cache', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ status: 404, ok: false }).mockResolvedValueOnce({ ok: true, json: async () => rows });
    vi.stubGlobal('fetch', fetch);
    expect(await window.AlloDictionary.lookup('bank')).toBeNull();
    expect(await window.AlloDictionary.lookup('bank')).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1);
    const entry = await window.AlloDictionary.lookup('bank', { bypassMissingCache: true });
    expect(entry.meanings[0].definitions[0].definition).toBe('The edge of a river.'); expect(fetch).toHaveBeenCalledTimes(2);
    expect(await window.AlloDictionary.lookup('bank', { bypassMissingCache: true })).toEqual(entry); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(['rejection', 'throw', 'server', 'malformed', 'empty', 'json'])('keeps %s failure retryable without a cached miss', async failure => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    if (failure === 'rejection') fetch.mockRejectedValueOnce(new Error('Offline'));
    else if (failure === 'throw') fetch.mockImplementationOnce(() => { throw new Error('Offline'); });
    else if (failure === 'server') fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    else fetch.mockResolvedValueOnce({ ok: true, json: async () => { if (failure === 'json') throw new Error('Invalid JSON'); return failure === 'empty' ? [] : { message: 'Unavailable' }; } });
    expect(await window.AlloDictionary.lookup('bank')).toBeNull(); expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => rows });
    expect(await window.AlloDictionary.lookup('bank')).toMatchObject({ word: 'bank' }); expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('dictionary sense suggestions and paired pronunciations', () => {
  it('keeps phonetic text paired with its own recording and retains distinct variants', () => {
    const entry = window.AlloDictionary._normalizeEntry([
      { phonetic: '/lɛd/', phonetics: [{ audio: 'unlabelled.wav' }], meanings: rows[0].meanings },
      { phonetic: '/liːd/', phonetics: [{ text: '/liːd/', audio: 'verb.wav' }, { text: '/lɛd/', audio: 'metal.wav' }], meanings: rows[0].meanings }
    ], 'lead');
    expect(entry.pronunciations).toEqual([{ phonetic: '', audio: 'unlabelled.wav' }, { phonetic: '/lɛd/', audio: '' }, { phonetic: '/liːd/', audio: 'verb.wav' }, { phonetic: '/lɛd/', audio: 'metal.wav' }]);
    expect(entry).toMatchObject({ phonetic: '/liːd/', audio: 'verb.wav' });
    expect(entry.meanings[0].pronunciations).not.toContainEqual({ phonetic: '/lɛd/', audio: 'unlabelled.wav' });
  });
  it('suggests the contextual sense without changing cached provider order', () => {
    const entry = { word: 'bank', meanings: [{ definitions: [{ definition: 'An institution lending money.' }, { definition: 'The land beside a river.' }] }] };
    const before = JSON.stringify(entry);
    expect(window.AlloDictionary.matchPassageSense(entry, 'The river bank is steep.')).toMatchObject({ definitionIndex: 1 });
    expect(window.AlloDictionary.matchPassageSense(entry, 'The bank lends money.')).toMatchObject({ definitionIndex: 0 });
    expect(JSON.stringify(entry)).toBe(before);
  });
  it.each(['bank', 'The river carries money.', '', 'The surface is smooth.'])('declines ambiguous or unsupported context: %s', context => {
    const entry = { word: 'bank', meanings: [{ definitions: [{ definition: 'A bank lending money.' }, { definition: 'A bank beside a river.' }] }] };
    expect(window.AlloDictionary.matchPassageSense(entry, context)).toBeNull();
  });
});

describe('dictionary detailed outcomes preserve the legacy entry-or-null API', () => {
  it('distinguishes and caches a genuine 404, then supports explicit retry', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ status: 404, ok: false }).mockResolvedValueOnce({ ok: true, json: async () => rows }); vi.stubGlobal('fetch', fetch);
    expect(await window.AlloDictionary.lookupDetailed('bank')).toEqual({ entry: null, reason: 'not_found' });
    expect(await window.AlloDictionary.lookupDetailed('bank')).toEqual({ entry: null, reason: 'not_found' }); expect(fetch).toHaveBeenCalledTimes(1);
    const recovered = await window.AlloDictionary.lookupDetailed('bank', { bypassMissingCache: true });
    expect(recovered).toMatchObject({ entry: { word: 'bank' }, reason: null });
    expect(await window.AlloDictionary.lookup('bank', null)).toEqual(recovered.entry); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(['offline', 'server', 'json', 'shape', 'normalization'])('classifies %s failures without poisoning the cache', async failure => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    if (failure === 'offline') fetch.mockRejectedValueOnce(new Error('Offline'));
    else if (failure === 'server') fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    else fetch.mockResolvedValueOnce({ ok: true, json: async () => { if (failure === 'json') throw new Error('Invalid JSON'); return failure === 'normalization' ? [{ meanings: {} }] : { message: 'Unavailable' }; } });
    expect(await window.AlloDictionary.lookupDetailed('bank')).toEqual({ entry: null, reason: ['offline', 'server'].includes(failure) ? 'request_failed' : 'invalid_response' });
    expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => rows });
    expect(await window.AlloDictionary.lookupDetailed('bank')).toMatchObject({ entry: { word: 'bank' }, reason: null }); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('reports cancellation even when the transport ignores abort', async () => {
    const response = deferred(), controller = new AbortController(); vi.stubGlobal('fetch', vi.fn(() => response.promise));
    const pending = window.AlloDictionary.lookupDetailed('bank', { signal: controller.signal }); controller.abort(); response.resolve({ status: 404 });
    expect(await pending).toEqual({ entry: null, reason: 'cancelled' }); expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
  });
  it('reports unsupported input and unavailable transport separately', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await window.AlloDictionary.lookupDetailed('river bank', null)).toEqual({ entry: null, reason: 'unsupported_word' }); expect(fetch).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', undefined);
    expect(await window.AlloDictionary.lookupDetailed('bank')).toEqual({ entry: null, reason: 'not_available' });
  });
});
