import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.ALLO_DICT_CANDIDATE || 'dictionary_loader.js', 'utf8');
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

describe('dictionary cache integrity and partial provider recovery', () => {
  it('bypasses a structurally invalid cached entry and repairs it from the provider', async () => {
    const broken = JSON.stringify({ word: 'bank', meanings: { definition: 'wrong shape' } }); localStorage.setItem('allo_dict_bank', broken);
    expect(window.AlloDictionary.getCached('bank')).toBeUndefined(); expect(window.AlloDictionary.hasOffline('bank')).toBe(false);
    expect(localStorage.getItem('allo_dict_bank')).toBe(broken); // Reads do not rewrite persisted data.
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => rows }); vi.stubGlobal('fetch', fetch);
    expect(await window.AlloDictionary.lookupDetailed('bank')).toMatchObject({ entry: { word: 'bank', meanings: rows[0].meanings }, reason: null });
    expect(fetch).toHaveBeenCalledTimes(1); expect(window.AlloDictionary.getCached('bank').meanings[0].definitions[0].definition).toBe('The edge of a river.');
  });
  it.each(['{broken', 'false', '42', '"a definition"', '[]', '{"meanings":[null,{}]}'])('treats malformed cache %s as uncached, without converting it to a miss', async raw => {
    localStorage.setItem('allo_dict_bank', raw); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
    expect(await window.AlloDictionary.lookupDetailed('bank')).toEqual({ entry: null, reason: 'request_failed' });
    expect(localStorage.getItem('allo_dict_bank')).toBe(raw);
  });
  it('rejects a cached entry for a different word and uses the selected word for recovery', async () => {
    localStorage.setItem('allo_dict_bank', JSON.stringify({ word: 'tree', meanings: rows[0].meanings }));
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => rows }); vi.stubGlobal('fetch', fetch);
    expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
    expect((await window.AlloDictionary.lookup('bank')).word).toBe('bank'); expect(fetch.mock.calls[0][0]).toBe('https://api.dictionaryapi.dev/api/v2/entries/en/bank');
  });
  it('preserves useful legacy cached help offline without inventing pronunciation pairs', async () => {
    const legacy = { phonetic: '/bank/', audio: 'legacy.wav', meanings: rows[0].meanings, source: 'Wiktionary (via dictionaryapi.dev)' };
    localStorage.setItem('allo_dict_bank', JSON.stringify(legacy)); const fetch = vi.fn().mockRejectedValue(new Error('Offline')); vi.stubGlobal('fetch', fetch);
    const result = await window.AlloDictionary.lookupDetailed('bank');
    expect(result).toMatchObject({ reason: null, entry: { word: 'bank', phonetic: '/bank/', audio: 'legacy.wav', pronunciations: [], meanings: rows[0].meanings } });
    expect(fetch).not.toHaveBeenCalled(); expect(JSON.parse(localStorage.getItem('allo_dict_bank'))).toEqual(legacy);
  });
  it('recovers valid cached fields while dropping malformed siblings and render-unsafe scalar values', async () => {
    const cached = { word: 'Bank', source: {}, sourceUrl: [], phonetic: {}, audio: {},
      pronunciations: [null, { phonetic: '/bank/', audio: 'bank.wav' }, { phonetic: '/bank/', audio: 'bank.wav' }, { phonetic: {}, audio: [] }],
      meanings: [null, { definitions: {} }, { partOfSpeech: {}, definitions: [null, {}, { definition: {} }, { definition: '  The edge of a river.  ', example: {} }] }],
      synonyms: [null, {}, ' Shore ', 'shore', 4] };
    const raw = JSON.stringify(cached); localStorage.setItem('allo_dict_bank', raw); vi.stubGlobal('fetch', vi.fn());
    const result = await window.AlloDictionary.lookupDetailed('bank');
    expect(result.reason).toBeNull(); expect(result.entry).toMatchObject({ word: 'bank', phonetic: '/bank/', audio: 'bank.wav', pronunciations: [{ phonetic: '/bank/', audio: 'bank.wav' }],
      meanings: [{ partOfSpeech: '', definitions: [{ definition: 'The edge of a river.', example: '' }], pronunciations: [] }], synonyms: ['shore'], sourceUrl: 'https://en.wiktionary.org/wiki/bank' });
    expect(window.AlloDictionary.hasOffline('bank')).toBe(true); expect(fetch).not.toHaveBeenCalled(); expect(localStorage.getItem('allo_dict_bank')).toBe(raw);
  });
  it('keeps per-meaning pronunciation records separate when reading the offline cache', () => {
    const cached = { word: 'lead', phonetic: '/wrong/', audio: 'wrong.wav', pronunciations: [{ phonetic: '/liːd/', audio: 'verb.wav' }, { phonetic: '/lɛd/', audio: 'metal.wav' }],
      meanings: [{ definitions: [{ definition: 'To guide.' }], pronunciations: [{ phonetic: '/liːd/', audio: 'verb.wav' }] }, { definitions: [{ definition: 'A heavy metal.' }], pronunciations: [{ phonetic: '/lɛd/', audio: 'metal.wav' }] }] };
    localStorage.setItem('allo_dict_lead', JSON.stringify(cached));
    const entry = window.AlloDictionary.getCached('lead');
    expect(entry).toMatchObject({ phonetic: '/liːd/', audio: 'verb.wav' }); expect(entry.meanings[1].pronunciations).toEqual([{ phonetic: '/lɛd/', audio: 'metal.wav' }]);
  });
  it('preserves the cached-miss sentinel and its explicit retry behavior', async () => {
    localStorage.setItem('allo_dict_bank', 'null'); const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => rows }); vi.stubGlobal('fetch', fetch);
    expect(window.AlloDictionary.getCached('bank')).toBeNull(); expect(window.AlloDictionary.hasOffline('bank')).toBe(true);
    expect(await window.AlloDictionary.lookupDetailed('bank')).toEqual({ entry: null, reason: 'not_found' }); expect(fetch).not.toHaveBeenCalled();
    expect(await window.AlloDictionary.lookupDetailed('bank', { bypassMissingCache: true })).toMatchObject({ entry: { word: 'bank' }, reason: null });
  });
  it('retains useful provider records alongside malformed rows, meanings, and definitions', async () => {
    const mixed = [null, 7, {}, { meanings: {} }, { phonetics: [null, { text: '/bank/', audio: 'bank.wav' }], meanings: [null, { definitions: {} }, { definitions: [null, {}, { definition: {} }, ...rows[0].meanings[0].definitions], synonyms: {} }] }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mixed }));
    const result = await window.AlloDictionary.lookupDetailed('bank');
    expect(result).toMatchObject({ reason: null, entry: { word: 'bank', pronunciations: [{ phonetic: '/bank/', audio: 'bank.wav' }], meanings: [{ definitions: [{ definition: 'The edge of a river.' }] }] } });
    expect(window.AlloDictionary.getCached('bank')).toEqual(result.entry);
  });
  it('keeps an entirely unusable provider response retryable instead of caching a miss', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [null, {}, { meanings: [{ definitions: [null, { definition: {} }, { definition: 12 }] }] }] }).mockResolvedValueOnce({ ok: true, json: async () => rows }); vi.stubGlobal('fetch', fetch);
    expect(await window.AlloDictionary.lookupDetailed('bank')).toEqual({ entry: null, reason: 'invalid_response' }); expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
    expect(await window.AlloDictionary.lookupDetailed('bank')).toMatchObject({ entry: { word: 'bank' }, reason: null });
  });
  it('returns usable provider data when storage is inaccessible', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => rows }));
    expect(await window.AlloDictionary.lookupDetailed('bank')).toMatchObject({ reason: null, entry: { word: 'bank' } });
    expect(window.AlloDictionary.getCached('bank')).toBeUndefined();
  });
  it('bounds recovered cache collections after removing malformed records', () => {
    const cached = { meanings: [null, ...Array.from({ length: 7 }, (_, mi) => ({ definitions: [null, ...Array.from({ length: 5 }, (_, di) => ({ definition: 'Meaning ' + mi + '-' + di }))] }))],
      pronunciations: [null, ...Array.from({ length: 20 }, (_, i) => ({ phonetic: '/' + i + '/', audio: i + '.wav' }))], synonyms: [null, ...Array.from({ length: 15 }, (_, i) => 'synonym' + i)] };
    localStorage.setItem('allo_dict_bank', JSON.stringify(cached)); const entry = window.AlloDictionary.getCached('bank');
    expect(entry.meanings).toHaveLength(4); expect(entry.meanings[0].definitions).toHaveLength(3); expect(entry.pronunciations).toHaveLength(12); expect(entry.synonyms).toHaveLength(8);
  });
});
