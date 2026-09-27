import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.ALLO_DICT_CANDIDATE || 'dictionary_loader.js', 'utf8');
const rows = [{ word: 'bank', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The edge of a river.' }] }] }];
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const success = () => ({ ok: true, json: async () => rows });
const miss = () => ({ ok: false, status: 404 });

beforeEach(() => {
  localStorage.clear(); delete window.AlloDictionary;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  new Function(source)();
});
afterEach(() => { localStorage.clear(); delete window.AlloDictionary; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('concurrent dictionary cache ownership', () => {
  it.each(['lookup', 'lookupDetailed'])('reuses successful offline help after a late miss through %s', async api => {
    const slow = deferred(), fast = deferred();
    const fetch = vi.fn().mockImplementationOnce(() => slow.promise).mockImplementationOnce(() => fast.promise);
    vi.stubGlobal('fetch', fetch);
    const late = window.AlloDictionary[api](' Bank '), winner = window.AlloDictionary.lookupDetailed('bank');
    expect(fetch).toHaveBeenCalledTimes(2);
    fast.resolve(success()); const recovered = (await winner).entry;
    const raw = localStorage.getItem('allo_dict_bank');
    slow.resolve(miss()); const result = await late;
    expect(result).toEqual(api === 'lookup' ? recovered : { entry: recovered, reason: null });
    expect(localStorage.getItem('allo_dict_bank')).toBe(raw);
    fetch.mockRejectedValue(new Error('Offline'));
    expect(await window.AlloDictionary.lookup('bank')).toEqual(recovered);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('replaces an earlier concurrent miss when success arrives afterward', async () => {
    const first = deferred(), second = deferred();
    const fetch = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    vi.stubGlobal('fetch', fetch);
    const missing = window.AlloDictionary.lookupDetailed('bank'), found = window.AlloDictionary.lookupDetailed('bank');
    first.resolve(miss()); expect(await missing).toEqual({ entry: null, reason: 'not_found' });
    expect(window.AlloDictionary.getCached('bank')).toBeNull();
    second.resolve(success()); const result = await found;
    expect(result).toMatchObject({ reason: null, entry: { word: 'bank' } });
    expect(await window.AlloDictionary.lookup('bank')).toEqual(result.entry);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(['cancel-first', 'success-first'])('keeps cancellation independent of another successful caller (%s)', async order => {
    const first = deferred(), second = deferred(), controller = new AbortController();
    const fetch = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    vi.stubGlobal('fetch', fetch);
    const cancelled = window.AlloDictionary.lookupDetailed('bank', { signal: controller.signal });
    const active = window.AlloDictionary.lookupDetailed('bank');
    controller.abort();
    if (order === 'cancel-first') { first.resolve(miss()); expect(await cancelled).toEqual({ entry: null, reason: 'cancelled' }); }
    second.resolve(success()); const result = await active;
    if (order === 'success-first') { first.resolve(miss()); expect(await cancelled).toEqual({ entry: null, reason: 'cancelled' }); }
    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
    expect(fetch.mock.calls[1][1].signal).toBeUndefined();
    expect(window.AlloDictionary.getCached('bank')).toEqual(result.entry);
  });

  it.each(['{broken', '{"word":"bank","meanings":{}}', '{"word":"tree","meanings":[{"definitions":[{"definition":"A plant."}]}]}'])('does not reuse unusable cache data written while a request is pending: %s', async raw => {
    const response = deferred(); vi.stubGlobal('fetch', vi.fn(() => response.promise));
    const pending = window.AlloDictionary.lookupDetailed('bank');
    localStorage.setItem('allo_dict_bank', raw);
    response.resolve(miss()); expect(await pending).toEqual({ entry: null, reason: 'not_found' });
    expect(window.AlloDictionary.getCached('bank')).toBeNull();
  });

  it('returns a validated legacy entry written during the request without rewriting it', async () => {
    const response = deferred(); vi.stubGlobal('fetch', vi.fn(() => response.promise));
    const pending = window.AlloDictionary.lookupDetailed('bank');
    const raw = JSON.stringify({ meanings: rows[0].meanings, phonetic: '/bank/', audio: 'bank.wav' });
    localStorage.setItem('allo_dict_bank', raw);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    response.resolve(miss()); const result = await pending;
    expect(result).toMatchObject({ reason: null, entry: { word: 'bank', phonetic: '/bank/', audio: 'bank.wav', pronunciations: [] } });
    expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem('allo_dict_bank')).toBe(raw);
  });

  it('does not substitute a successful entry belonging to another cache key', async () => {
    const response = deferred(); vi.stubGlobal('fetch', vi.fn(() => response.promise));
    const pending = window.AlloDictionary.lookupDetailed('bank');
    const raw = JSON.stringify({ word: 'tree', meanings: [{ definitions: [{ definition: 'A plant.' }] }] });
    localStorage.setItem('allo_dict_tree', raw);
    response.resolve(miss()); expect(await pending).toEqual({ entry: null, reason: 'not_found' });
    expect(localStorage.getItem('allo_dict_tree')).toBe(raw);
  });
});
