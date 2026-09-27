import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.ALLO_DICT_CANDIDATE || 'dictionary_loader.js', 'utf8');
const rows = [{ word: 'bank', meanings: [{ definitions: [{ definition: 'The edge of a river.' }] }] }];
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const failures = ['network', 'server', 'json', 'empty', 'shape'];
const reasonFor = failure => ['network', 'server'].includes(failure) ? 'request_failed' : 'invalid_response';
const fail = (request, failure) => {
  if (failure === 'network') request.reject(new Error('Offline'));
  else if (failure === 'server') request.resolve({ ok: false, status: 503 });
  else request.resolve({ ok: true, json: async () => {
    if (failure === 'json') throw new Error('Invalid JSON');
    return failure === 'empty' ? [] : { message: 'Unavailable' };
  } });
};
const cached = () => JSON.stringify({ word: 'bank', meanings: rows[0].meanings });

beforeEach(() => {
  localStorage.clear(); delete window.AlloDictionary;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  new Function(source)();
});
afterEach(() => { localStorage.clear(); delete window.AlloDictionary; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(['lookup', 'lookupDetailed'])('%s concurrent failure recovery', api => {
  it.each(failures)('reuses another caller\'s successful entry after a late %s failure', async failure => {
    const slow = defer(), fast = defer();
    const fetch = vi.fn().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
    vi.stubGlobal('fetch', fetch);
    const pending = window.AlloDictionary[api](' Bank ');
    const concurrent = window.AlloDictionary.lookupDetailed('bank');
    fast.resolve({ ok: true, json: async () => rows });
    const recovered = (await concurrent).entry;
    const raw = localStorage.getItem('allo_dict_bank');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fail(slow, failure);
    expect(await pending).toEqual(api === 'lookup' ? recovered : { entry: recovered, reason: null });
    expect(localStorage.getItem('allo_dict_bank')).toBe(raw);
    expect(writes).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('dictionary failure boundaries', () => {
  it.each(failures)('keeps cancellation authoritative after %s failure and concurrent success', async failure => {
    const request = defer(), controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn(() => request.promise));
    const pending = window.AlloDictionary.lookupDetailed('bank', { signal: controller.signal });
    const raw = cached(); localStorage.setItem('allo_dict_bank', raw);
    controller.abort(); fail(request, failure);
    expect(await pending).toEqual({ entry: null, reason: 'cancelled' });
    expect(localStorage.getItem('allo_dict_bank')).toBe(raw);
  });
  it.each(failures)('preserves the %s failure reason when no useful cache is available', async failure => {
    const request = defer(); vi.stubGlobal('fetch', vi.fn(() => request.promise));
    const pending = window.AlloDictionary.lookupDetailed('bank'); fail(request, failure);
    expect(await pending).toEqual({ entry: null, reason: reasonFor(failure) });
    expect(localStorage.getItem('allo_dict_bank')).toBeNull();
  });
  it.each(['missing', 'malformed', 'wrong-word', 'empty', 'unreadable'])('does not recover from %s cache data', async cache => {
    const request = defer(); vi.stubGlobal('fetch', vi.fn(() => request.promise));
    const pending = window.AlloDictionary.lookupDetailed('bank');
    const values = { missing: 'null', malformed: '{broken', 'wrong-word': JSON.stringify({ word: 'tree', meanings: rows[0].meanings }), empty: '{"word":"bank","meanings":[]}' };
    if (cache === 'unreadable') vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    else localStorage.setItem('allo_dict_bank', values[cache]);
    localStorage.setItem('allo_dict_tree', JSON.stringify({ word: 'tree', meanings: rows[0].meanings }));
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fail(request, 'network');
    expect(await pending).toEqual({ entry: null, reason: 'request_failed' });
    expect(writes).not.toHaveBeenCalled();
  });
  it('checks cancellation again when JSON parsing fails after a cache entry arrives', async () => {
    const body = defer(), controller = new AbortController();
    const json = vi.fn(() => body.promise);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json }));
    const pending = window.AlloDictionary.lookupDetailed('bank', { signal: controller.signal });
    await Promise.resolve(); expect(json).toHaveBeenCalled();
    localStorage.setItem('allo_dict_bank', cached()); controller.abort(); body.reject(new Error('Invalid JSON'));
    expect(await pending).toEqual({ entry: null, reason: 'cancelled' });
  });
  it('lets a later explicit lookup use help saved after the failed request settled', async () => {
    const request = defer(), fetch = vi.fn(() => request.promise); vi.stubGlobal('fetch', fetch);
    const pending = window.AlloDictionary.lookupDetailed('bank'); fail(request, 'network');
    expect(await pending).toEqual({ entry: null, reason: 'request_failed' });
    localStorage.setItem('allo_dict_bank', cached());
    expect(await window.AlloDictionary.lookupDetailed('bank')).toMatchObject({ reason: null, entry: { word: 'bank' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
