import fs from 'node:fs';
import vm from 'node:vm';
import { TextEncoder } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';

const moduleSource = fs.readFileSync('symbol_studio_module.js', 'utf8');
const helperStart = moduleSource.indexOf('// Per-learner authoring drafts.');
const helperEnd = moduleSource.indexOf('var symbolStudioSharedDraftStore', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('Production Symbol Studio draft-store markers are missing');
const source = moduleSource.slice(helperStart, helperEnd);
function helpers() {
  const context = vm.createContext({ URL, TextEncoder, setTimeout, clearTimeout });
  vm.runInContext(source, context);
  return { normalize: context.normalizeSymbolStudioDraftPayload, create: context.createSymbolStudioDraftStore };
}
const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const picture = 'data:image/png;base64,aGVsbG8=';
const recording = 'data:audio/webm;codecs=opus;base64,aGVsbG8=';

// This intentionally separates request success from transaction commit/abort.
// The browser harness verifies the same contract against real IndexedDB.
function fakeIDB({ opens = [], transactions = [] } = {}) {
  const data = new Map(), requests = [], txs = [], connections = [];
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const factory = { data, requests, txs, connections, open: vi.fn(() => {
    const request = {}, mode = opens.shift(); requests.push(request);
    const connection = {
      closed: false, objectStoreNames: { contains: () => true }, close() { this.closed = true; },
      transaction: vi.fn((_names, access) => {
        if (connection.closed) throw new Error('Connection closed');
        const behavior = transactions.shift() || {}, tx = { error: null, ended: false, access };
        txs.push(tx);
        tx.abort = () => {
          if (tx.ended) throw new Error('Transaction inactive');
          tx.ended = true; queueMicrotask(() => tx.onabort?.());
        };
        tx.commit = () => {
          if (tx.ended) return;
          tx.ended = true;
          if (tx.method === 'put') data.set(tx.key, clone(tx.value));
          if (tx.method === 'delete') data.delete(tx.key);
          tx.oncomplete?.();
        };
        tx.objectStore = () => Object.fromEntries(['get', 'put', 'delete'].map(method => [method, value => {
          const req = {}; tx.method = method; tx.key = method === 'put' ? value.profileId : value; tx.value = clone(value);
          queueMicrotask(() => {
            if (tx.ended) return;
            if (behavior.error) { req.error = { name: behavior.error }; req.onerror?.(); return; }
            req.result = method === 'get' ? clone(data.get(value)) : method === 'put' ? value.profileId : undefined;
            req.onsuccess?.();
            if (behavior.abort) tx.abort();
            else if (!behavior.hold) queueMicrotask(tx.commit);
          });
          return req;
        }]));
        return tx;
      })
    };
    connections.push(connection);
    request.succeed = () => { request.result = connection; request.onsuccess?.(); };
    queueMicrotask(() => {
      if (mode === 'hold') return;
      if (mode === 'error') { request.error = new Error('Temporarily denied'); request.onerror?.(); }
      else if (mode === 'blocked') request.onblocked?.();
      else request.succeed();
    });
    return request;
  }) };
  return factory;
}

afterEach(() => vi.useRealTimers());

describe('Symbol Studio draft codec', () => {
  it('preserves partial authoring fields and uncommitted whitespace', () => {
    const { normalize } = helpers();
    const payload = { board: { title: '  My board  ', words: [{ id: 'word', label: '  Help  ', image: picture, audioData: recording, assetId: 'asset', conceptId: 12, locked: true, vocalLabel: 'Please help', translatedLabel: 'Ayuda', originalLabel: 'Help', category: 'verb', description: 'Request', action: 'navigate', linkPage: 1 }] }, sequence: { input: '  wash\n eat\n', items: [{ id: 'step', label: 'Eat', complete: true, assetId: 'asset' }], nowId: null }, story: { pages: [{ id: 'page', text: '  My story.  ', image: picture, imagePrompt: 'Classroom' }] } };
    expect(normalize(payload)).toEqual({ ...payload, sequence: { ...payload.sequence, items: payload.sequence.items.map(item => ({ image: null, ...item })) } });
    expect(normalize({ board: { title: '' } })).toEqual({ board: { title: '' } });
  });
  it('preserves unknown-goal metadata while rejecting malformed array records', () => {
    const { normalize } = helpers();
    expect(normalize({ board: { fctMeta: { fctFunction: null, fctPhase: null, fctGoal: 'My goal' } } })).toEqual({ board: { fctMeta: { fctFunction: null, fctPhase: null, fctGoal: 'My goal' } } });
    for (const payload of [{ board: { words: [{}] } }, { board: { pages: [{}] } }, { sequence: { items: [{}] } }, { story: { pages: [{}] } }]) expect(() => normalize(payload)).toThrow();
    expect(normalize({ board: { pages: [{ id: 'page', words: [] }] }, story: { pages: [{ id: 'story', text: '' }] } })).toEqual({ board: { pages: [{ id: 'page', title: '', words: [], cols: 4 }] }, story: { pages: [{ id: 'story', text: '', image: null, imagePrompt: '' }] } });
  });
  it('retains all four choice entries while excluding runtime and learner response state', () => {
    const { normalize } = helpers();
    const result = normalize({ quickBoards: { cbCount: 2, cbItems: [1, 2, 3, 4].map(n => ({ id: 'c' + n, label: '' + n, image: null, loading: true, audio: 'blob:temporary' })), cbSelected: 'c1', tokenEarned: 4, bcPainLevel: 7, twStep: 3, busy: true }, board: { loading: {}, words: [{ id: 'c', label: 'Help', audioData: recording, speechAudioRef: 'temp', isPlaying: true }] } });
    expect(result.quickBoards).toEqual({ cbCount: 2, cbItems: [1, 2, 3, 4].map(n => ({ id: 'c' + n, label: '' + n, image: null })) });
    expect(result.board.words[0]).toEqual({ id: 'c', label: 'Help', image: null, audioData: recording });
  });
  it.each([
    { board: { words: Array.from({ length: 65 }, () => ({ label: 'a' })) } },
    { board: { pages: Array.from({ length: 25 }, () => ({})) } },
    { sequence: { items: Array.from({ length: 13 }, () => ({})) } },
    { story: { pages: [{ id: 'story', text: 'x'.repeat(2001) }] } },
    { story: { pages: Array.from({ length: 13 }, () => ({})) } },
    { quickBoards: { cbItems: Array.from({ length: 5 }, () => ({})) } },
    { quickBoards: { cmItems: Array.from({ length: 9 }, () => ({})) } },
    { quickBoards: { snItems: Array.from({ length: 11 }, () => ({})) } },
    { board: { cols: NaN } }, { board: { color: 'true' } }, { board: [] }
  ])('rejects malformed or overlong known draft fields %#', input => {
    expect(() => helpers().normalize(input)).toThrow();
  });
  it.each(['javascript:alert(1)', 'data:text/html,<script>', 'blob:lost-after-reload', 'https://', 'https://example.com/\nimage.png'])('rejects nonportable image URLs: %s', image => {
    expect(() => helpers().normalize({ board: { words: [{ id: 'cell', label: 'Help', image }] } })).toThrow();
  });
  it('allows portable SVG and HTTPS images but only recorded data audio', () => {
    const { normalize } = helpers();
    expect(normalize({ board: { words: [{ id: 'one', label: 'One', image: 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E' }, { id: 'two', label: 'Two', image: 'https://example.com/image.png' }] } }).board.words).toHaveLength(2);
    expect(() => normalize({ board: { words: [{ id: 'cell', label: 'Help', audioData: 'https://example.com/audio.mp3' }] } })).toThrow();
  });
  it('rejects dangerous accessor fields without invoking them and ignores unknown keys', () => {
    const { normalize } = helpers(), read = vi.fn();
    expect(() => normalize({ board: Object.defineProperty({}, 'title', { get: read }) })).toThrow();
    expect(read).not.toHaveBeenCalled();
    expect(normalize(JSON.parse('{"__proto__":{"polluted":true},"board":{"constructor":{"x":1},"title":"Safe"}}'))).toEqual({ board: { title: 'Safe' } });
    expect({}.polluted).toBeUndefined();
  });
  it('counts Unicode draft bytes accurately with native UTF-8 encoding', () => {
    const context = vm.createContext({ URL, TextEncoder, setTimeout, clearTimeout }); vm.runInContext(source, context);
    context.SYMBOL_STUDIO_DRAFT_MAX_BYTES = 85;
    expect(context.normalizeSymbolStudioDraftPayload({ board: { title: 'a'.repeat(50) } })).toHaveProperty('board.title');
    expect(() => context.normalizeSymbolStudioDraftPayload({ board: { title: '\u00e9'.repeat(50) } })).toThrow();
  });
  it('rejects aggregate image payloads above 25 MB without truncating', () => {
    const { normalize } = helpers(), large = 'data:image/png;base64,' + 'a'.repeat(9 * 1024 * 1024);
    try { normalize({ board: { words: [{ id: 'a', label: 'a', image: large }, { id: 'b', label: 'b', image: large }, { id: 'c', label: 'c', image: large }] } }); throw new Error('Expected rejection'); }
    catch (error) { expect(error.code).toBe('too-large'); }
  });
});

describe('Symbol Studio IndexedDB draft transactions', () => {
  it('returns null for missing drafts and isolates profiles', async () => {
    const idb = fakeIDB(), store = helpers().create({ indexedDB: idb });
    expect(await store.read('a')).toBeNull();
    const saved = await store.write('a', { board: { title: 'A' } });
    expect(saved).toMatchObject({ version: 1, profileId: 'a', payload: { board: { title: 'A' } } });
    expect(saved.updatedAt).toBeGreaterThan(0);
    expect(await store.read('b')).toBeNull();
    expect(await store.read('a')).toEqual(saved);
    expect(idb.open).toHaveBeenCalledWith('alloSymbolStudioDrafts', 1);
  });
  it('resolves a write only after commit, and captures a snapshot before queuing', async () => {
    const idb = fakeIDB({ transactions: [{ hold: true }] }), store = helpers().create({ indexedDB: idb });
    const payload = { board: { title: 'Original' } }, done = vi.fn();
    const writing = store.write('a', payload).then(done); payload.board.title = 'Edited later';
    await tick(); expect(done).not.toHaveBeenCalled(); expect(idb.data.has('a')).toBe(false);
    idb.txs[0].commit(); await writing;
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ payload: { board: { title: 'Original' } } }));
  });
  it('serializes old writes, new writes, deletes, and reads even across store instances', async () => {
    const idb = fakeIDB({ transactions: [{ hold: true }] }), { create } = helpers();
    const first = create({ indexedDB: idb }), second = create({ indexedDB: idb });
    const old = first.write('a', { board: { title: 'Old' } });
    const latest = second.write('a', { board: { title: 'New' } });
    const removed = first.remove('a'), read = second.read('a');
    await tick(); expect(idb.txs).toHaveLength(1);
    idb.txs[0].commit(); await Promise.all([old, latest, removed]);
    expect(await read).toBeNull();
    expect(idb.txs.map(tx => tx.method)).toEqual(['put', 'put', 'delete', 'get']);
  });
  it('does not hold another learner behind a stalled transaction', async () => {
    const idb = fakeIDB({ transactions: [{ hold: true }, {}] }), store = helpers().create({ indexedDB: idb });
    const first = store.read('a'); await tick();
    expect(await store.write('b', { board: { title: 'Second learner' } })).toHaveProperty('profileId', 'b');
    idb.txs[0].commit(); expect(await first).toBeNull();
  });
  it('does not report success or destroy the old draft when a request succeeded but the transaction aborted', async () => {
    const idb = fakeIDB({ transactions: [{}, { abort: true }] }), store = helpers().create({ indexedDB: idb });
    await store.write('a', { board: { title: 'Saved' } });
    await expect(store.write('a', { board: { title: 'Failed' } })).rejects.toMatchObject({ code: 'transaction-failed' });
    expect((await store.read('a')).payload.board.title).toBe('Saved');
  });
  it('surfaces quota errors and allows the next operation to recover', async () => {
    const idb = fakeIDB({ transactions: [{ error: 'QuotaExceededError' }] }), store = helpers().create({ indexedDB: idb });
    await expect(store.write('a', {})).rejects.toMatchObject({ code: 'quota-exceeded' });
    expect(await store.write('a', { story: { situation: 'Retry' } })).toHaveProperty('payload.story.situation', 'Retry');
  });
  it('retries a transient open failure without poisoning the queue', async () => {
    const idb = fakeIDB({ opens: ['error', 'ok'] }), store = helpers().create({ indexedDB: idb });
    await expect(store.read('a')).rejects.toMatchObject({ code: 'open-failed' });
    expect(await store.read('a')).toBeNull(); expect(idb.open).toHaveBeenCalledTimes(2);
  });
  it('bounds an open, closes a late connection, and allows a fresh retry', async () => {
    vi.useFakeTimers(); const idb = fakeIDB({ opens: ['hold', 'ok'] }), store = helpers().create({ indexedDB: idb, openTimeoutMs: 20 });
    const reading = store.read('a'); const rejected = expect(reading).rejects.toMatchObject({ code: 'open-timeout' });
    await tick(); await vi.advanceTimersByTimeAsync(21); await rejected;
    idb.requests[0].succeed(); expect(idb.connections[0].closed).toBe(true);
    expect(await store.read('a')).toBeNull();
  });
  it('bounds and aborts a hung transaction so its late commit cannot overwrite a retry', async () => {
    vi.useFakeTimers(); const idb = fakeIDB({ transactions: [{ hold: true }, {}] }), store = helpers().create({ indexedDB: idb, transactionTimeoutMs: 20 });
    const old = store.write('a', { board: { title: 'Old' } }); const rejected = expect(old).rejects.toMatchObject({ code: 'transaction-timeout' });
    const newer = store.write('a', { board: { title: 'New' } });
    await tick(); await vi.advanceTimersByTimeAsync(21); await rejected; await newer;
    idb.txs[0].commit();
    expect((await store.read('a')).payload.board.title).toBe('New');
    expect(idb.connections[0].closed).toBe(true);
  });
  it('distinguishes corrupt envelopes from missing data and does not overwrite them', async () => {
    const idb = fakeIDB(), store = helpers().create({ indexedDB: idb });
    const corrupt = { version: 2, profileId: 'a', updatedAt: 1, payload: {} }; idb.data.set('a', corrupt);
    await expect(store.read('a')).rejects.toMatchObject({ code: 'corrupt-draft' });
    expect(idb.data.get('a')).toEqual(corrupt);
    idb.data.set('a', { version: 1, profileId: 'b', updatedAt: 1, payload: {} });
    await expect(store.read('a')).rejects.toMatchObject({ code: 'corrupt-draft' });
  });
  it('releases a version-changed connection and retries blocked opens', async () => {
    const idb = fakeIDB({ opens: ['blocked', 'ok', 'ok'] }), store = helpers().create({ indexedDB: idb });
    await expect(store.read('a')).rejects.toMatchObject({ code: 'blocked' });
    await store.read('a'); idb.connections[1].onversionchange();
    expect(idb.connections[1].closed).toBe(true);
    await store.read('a'); expect(idb.open).toHaveBeenCalledTimes(3);
  });
  it('returns Promise rejections for invalid inputs and unavailable storage', async () => {
    const { create } = helpers(), store = create({ indexedDB: null });
    await expect(store.read('a')).rejects.toMatchObject({ code: 'unavailable' });
    await expect(store.write('', {})).rejects.toMatchObject({ code: 'invalid-profile' });
    await expect(store.write('a', { story: { pages: 'invalid' } })).rejects.toMatchObject({ code: 'invalid-draft' });
  });
});
