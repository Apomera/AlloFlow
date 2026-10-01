import { describe, expect, it, vi } from 'vitest';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';

const E = EvidenceMod.default || EvidenceMod;
let sequence = 0;
const unavailable = () => { throw new Error('Storage unavailable'); };
const failed = reason => ({ ok: false, project: null, reason, medium: null });
const empty = { ok: true, project: null, reason: 'empty', medium: null };

function harness() {
  const primary = new Map();
  const fallback = new Map();
  const storageDB = {
    get: vi.fn(async key => primary.get(key) ?? null),
    set: vi.fn(async (key, value) => { primary.set(key, structuredClone(value)); return true; }),
  };
  const localStorage = {
    getItem: vi.fn(key => fallback.get(key) ?? null),
    setItem: vi.fn((key, value) => fallback.set(key, value)),
    removeItem: vi.fn(key => fallback.delete(key)),
  };
  const scope = `safe-library-read-${++sequence}`;
  const open = (overrides = {}) => E.createProjectStore({ storageDB, localStorage, scope, ...overrides });
  return { primary, fallback, storageDB, localStorage, open, store: open() };
}

function project(title) {
  return E.upsertSource(E.makeProject({ title }), {
    id: 'document', title, type: 'document', importMethod: 'local-file',
    content: 'This saved document contains information that must not be overwritten after an unreadable load.',
  });
}

describe('explicit Lumen library read state', () => {
  it('distinguishes a confirmed empty library from missing storage adapters', async () => {
    const h = harness();
    expect(await h.store.loadState()).toEqual(empty);
    const missing = h.open({ storageDB: null, localStorage: null });
    expect(await missing.loadState()).toEqual(failed('unavailable'));
    expect(await missing.load()).toBeNull();
  });

  it('does not treat unread primary storage and empty fallback as a new library', async () => {
    const h = harness();
    await h.store.save(project('Existing library'));
    h.storageDB.get.mockImplementation(unavailable);
    expect(await h.open().loadState()).toEqual(failed('unavailable'));
    expect(await h.store.load()).toBeNull();
    expect(h.primary.get(h.store.key).project.sources).toHaveLength(1);
  });

  it('does not trust a primary snapshot while the configured fallback is unreadable', async () => {
    const h = harness();
    await h.store.save(project('Primary'));
    h.localStorage.getItem.mockImplementation(unavailable);
    expect(await h.store.loadState()).toEqual(failed('unavailable'));
    expect((await h.store.load()).title).toBe('Primary');
  });

  it('keeps legacy fallback recovery but blocks mutations when primary freshness is unknown', async () => {
    const h = harness();
    await h.store.save(project('Primary'));
    h.storageDB.set.mockResolvedValueOnce(false);
    await h.store.save(project('Fallback'));
    h.storageDB.get.mockImplementation(unavailable);
    expect(await h.store.loadState()).toEqual(failed('unavailable'));
    expect((await h.store.load()).title).toBe('Fallback');
  });

  it('reports unavailable when an adapter lacks its read method', async () => {
    const h = harness();
    expect(await h.open({ storageDB: { set: async () => true } }).loadState()).toEqual(failed('unavailable'));
    expect(await h.open({ localStorage: { setItem() {} } }).loadState()).toEqual(failed('unavailable'));
  });

  it('opts into strict host-adapter errors without changing legacy load behavior', async () => {
    const h = harness();
    h.storageDB.get.mockImplementation(async (_key, options) => {
      if (options && options.throwOnError) throw new Error('Device storage is not ready yet.');
      return null;
    });
    expect(await h.store.load()).toBeNull();
    expect(await h.store.loadState()).toEqual(failed('unavailable'));
    expect(h.storageDB.get).toHaveBeenLastCalledWith(h.store.key, { throwOnError: true });
  });

  it('classifies JSON decoding errors thrown by the host adapter as corruption', async () => {
    const h = harness();
    h.storageDB.get.mockRejectedValue(new SyntaxError('Invalid stored JSON'));
    expect(await h.store.loadState()).toEqual(failed('corrupt'));
  });

  it.each([
    '{invalid JSON',
    '',
    'false',
    '[]',
    '{}',
    JSON.stringify({ sources: null }),
    JSON.stringify({ __lumenProjectStore: 1, writeId: 'missing-sources', project: {} }),
    JSON.stringify({ __lumenProjectStore: 1, writeId: 'null-sources', project: { sources: null } }),
    JSON.stringify({ __lumenProjectStore: 1, writeId: 'broken', project: 'not-a-project' }),
    JSON.stringify({ __lumenProjectStore: 2, writeId: 'future', project: null }),
    JSON.stringify({ id: 'broken-project', sources: 'not-an-array' }),
    JSON.stringify({ id: 'broken-project', sources: [null] }),
  ])('reports a corrupt fallback instead of accepting an apparently empty library %#', async serialized => {
    const h = harness();
    h.fallback.set(h.store.key, serialized);
    expect(await h.store.loadState()).toEqual(failed('corrupt'));
  });

  it('does not hide a corrupt primary behind a valid fallback', async () => {
    const h = harness();
    h.storageDB.set.mockResolvedValueOnce(false);
    await h.store.save(project('Fallback'));
    h.primary.set(h.store.key, { __lumenProjectStore: 1, writeId: 'broken', project: [] });
    expect(await h.store.loadState()).toEqual(failed('corrupt'));
    expect((await h.store.load()).title).toBe('Fallback');
  });

  it('does not hide a corrupt fallback behind a valid primary', async () => {
    const h = harness();
    await h.store.save(project('Primary'));
    h.fallback.set(h.store.key, '{broken');
    expect(await h.store.loadState()).toEqual(failed('corrupt'));
    expect((await h.store.load()).title).toBe('Primary');
  });

  it('returns the latest valid fallback and identifies its storage medium', async () => {
    const h = harness();
    await h.store.save(project('Original'));
    h.storageDB.set.mockResolvedValueOnce(false);
    await h.store.save(project('Recovered fallback'));
    const result = await h.store.loadState();
    expect(result).toMatchObject({ ok: true, reason: '', medium: 'localstorage', project: { title: 'Recovered fallback' } });
    expect(result.project).not.toHaveProperty('__lumenProjectStore');
    result.project.title = 'Caller changed copy';
    expect((await h.store.loadState()).project.title).toBe('Recovered fallback');
  });

  it('identifies the recovered primary even if its acknowledged fallback cannot be removed', async () => {
    const h = harness();
    h.storageDB.set.mockResolvedValueOnce(false);
    await h.store.save(project('Fallback'));
    h.localStorage.removeItem.mockImplementation(unavailable);
    await h.store.save(project('Recovered primary'));
    expect(await h.store.loadState()).toMatchObject({ ok: true, reason: '', medium: 'indexeddb', project: { title: 'Recovered primary' } });
    h.storageDB.get.mockImplementation(unavailable);
    expect(await h.open().loadState()).toEqual(failed('unavailable'));
  });

  it.each(['primary', 'fallback'])('reports a confirmed %s tombstone as empty', async medium => {
    const h = harness();
    await h.store.save(project('Removed'));
    if (medium === 'fallback') h.storageDB.set.mockResolvedValueOnce(false);
    await h.store.clear();
    expect(await h.open().loadState()).toEqual(empty);
  });

  it('supports legacy projects and stores configured with only one usable backend', async () => {
    const h = harness();
    const legacy = project('Legacy');
    delete legacy.schemaVersion;
    h.primary.set(h.store.key, legacy);
    expect(await h.open({ localStorage: null }).loadState()).toMatchObject({ ok: true, medium: 'indexeddb', project: { title: 'Legacy', schemaVersion: E.SCHEMA_VERSION } });
    h.fallback.set(h.store.key, JSON.stringify(legacy));
    expect(await h.open({ storageDB: null }).loadState()).toMatchObject({ ok: true, medium: 'localstorage', project: { title: 'Legacy' } });
  });

  it('accepts a legacy empty source array without requiring later project collections', async () => {
    const h = harness();
    h.primary.set(h.store.key, { schemaVersion: 1, sources: [] });
    expect(await h.store.loadState()).toMatchObject({ ok: true, reason: '', medium: 'indexeddb', project: { sources: [], schemaVersion: E.SCHEMA_VERSION } });
  });

  it('queues read state after pending saves and clear operations across instances', async () => {
    const h = harness();
    const saving = h.store.save(project('Queued'));
    const reading = h.open().loadState();
    const clearing = h.open().clear();
    const readingAfterClear = h.store.loadState();
    await saving;
    expect(await reading).toMatchObject({ ok: true, project: { title: 'Queued' } });
    await clearing;
    expect(await readingAfterClear).toEqual(empty);
  });
});
