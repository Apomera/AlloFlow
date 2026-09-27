import { describe, expect, it, vi } from 'vitest';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';

const E = EvidenceMod.default || EvidenceMod;
let scopeNumber = 0;

function device() {
  const primary = new Map();
  const fallback = new Map();
  const db = {
    get: vi.fn(async key => primary.get(key) || null),
    set: vi.fn(async (key, value) => { primary.set(key, structuredClone(value)); return true; }),
    del: vi.fn(async key => primary.delete(key)),
  };
  const local = {
    getItem: vi.fn(key => fallback.get(key) || null),
    setItem: vi.fn((key, value) => { fallback.set(key, value); }),
    removeItem: vi.fn(key => fallback.delete(key)),
  };
  const scope = `storage-recovery-${++scopeNumber}`;
  const open = () => E.createProjectStore({ storageDB: db, localStorage: local, scope });
  return { primary, fallback, db, local, open, store: open() };
}

function projectWith(...ids) {
  return ids.reduce((project, id) => E.upsertSource(project, {
    id,
    title: `${id}.txt`,
    content: `Document ${id} contains source material about plants and photosynthesis.`,
    type: 'document',
    importMethod: 'local-file',
    now: '2026-01-01T00:00:00Z',
  }), E.makeProject({ id: 'project', title: 'Lesson documents', now: '2026-01-01T00:00:00Z' }));
}

const sourceIds = project => project.sources.map(source => source.id);
const unavailable = () => { throw new Error('storage unavailable'); };

describe('Lumen project storage recovery', () => {
  it('restores imports and removals saved to fallback over an older primary snapshot', async () => {
    const d = device();
    await d.store.save(projectWith('first'));
    d.db.set.mockResolvedValue(false);

    expect(await d.store.save(projectWith('first', 'second'))).toEqual({ ok: true, medium: 'localstorage' });
    expect(sourceIds(await d.open().load())).toEqual(['first', 'second']);

    expect(await d.open().save(projectWith('second'))).toEqual({ ok: true, medium: 'localstorage' });
    expect(sourceIds(await d.open().load())).toEqual(['second']);
  });

  it('lets a recovered primary supersede fallback even when cleanup is blocked', async () => {
    const d = device();
    await d.store.save(projectWith('original'));
    d.db.set.mockResolvedValueOnce(false);
    await d.store.save(projectWith('fallback'));
    const oldFallback = d.fallback.get(d.store.key);
    d.local.removeItem.mockImplementation(unavailable);

    expect(await d.open().save(projectWith('recovered'))).toEqual({ ok: true, medium: 'indexeddb' });
    expect(d.fallback.get(d.store.key)).toBe(oldFallback);
    expect(sourceIds(await d.open().load())).toEqual(['recovered']);

    // A later fallback write must supersede that recovered primary again.
    d.db.set.mockResolvedValueOnce(false);
    await d.open().save(projectWith('next-fallback'));
    expect(sourceIds(await d.open().load())).toEqual(['next-fallback']);
  });

  it('removes obsolete fallback data after primary recovery when cleanup is available', async () => {
    const d = device();
    d.db.set.mockResolvedValueOnce(false);
    await d.store.save(projectWith('fallback'));
    await d.store.save(projectWith('recovered'));
    expect(d.fallback.has(d.store.key)).toBe(false);
    expect(sourceIds(await d.open().load())).toEqual(['recovered']);
  });

  it('keeps fallback authoritative through a cold primary outage and clock rollback', async () => {
    const d = device();
    const clock = vi.spyOn(Date, 'now');
    try {
      clock.mockReturnValue(900000);
      await d.store.save(projectWith('original'));
      d.db.get.mockImplementationOnce(unavailable);
      d.db.set.mockImplementationOnce(unavailable);
      clock.mockReturnValue(1);
      await d.open().save(projectWith('newer'));
      // First read is during the outage, second after primary access returns.
      expect(sourceIds(await d.open().load())).toEqual(['newer']);
      expect(sourceIds(await d.open().load())).toEqual(['newer']);
    } finally { clock.mockRestore(); }
  });

  it('reports complete persistence failure without changing the last successful snapshot', async () => {
    const d = device();
    await d.store.save(projectWith('saved'));
    d.db.set.mockImplementation(unavailable);
    d.local.setItem.mockImplementation(unavailable);
    expect(await d.store.save(projectWith('unsaved'))).toEqual({ ok: false, medium: null });
    expect(sourceIds(await d.open().load())).toEqual(['saved']);
  });

  it('preserves the existing fallback when both writes fail after an earlier fallback save', async () => {
    const d = device();
    await d.store.save(projectWith('primary'));
    d.db.set.mockResolvedValue(false);
    await d.store.save(projectWith('fallback'));
    d.local.setItem.mockImplementation(unavailable);
    expect(await d.store.save(projectWith('unsaved'))).toEqual({ ok: false, medium: null });
    expect(sourceIds(await d.open().load())).toEqual(['fallback']);
  });

  it('does not claim success if a fallback cannot be read and acknowledged safely', async () => {
    const d = device();
    d.db.set.mockResolvedValueOnce(false);
    await d.store.save(projectWith('fallback'));
    d.local.getItem.mockImplementationOnce(unavailable);
    const writes = d.db.set.mock.calls.length;
    expect(await d.store.save(projectWith('unsaved'))).toEqual({ ok: false, medium: null });
    expect(d.db.set).toHaveBeenCalledTimes(writes);
    expect(sourceIds(await d.open().load())).toEqual(['fallback']);
  });

  it('keeps fallback writes bounded without discarding the previous successful value', async () => {
    const d = device();
    d.db.set.mockResolvedValue(false);
    await d.store.save(projectWith('saved'));
    const oversized = projectWith('oversized');
    oversized.notes = 'x'.repeat(1500001);
    expect(await d.store.save(oversized)).toEqual({ ok: false, medium: null });
    expect(sourceIds(await d.open().load())).toEqual(['saved']);
  });

  it('reads legacy primary and fallback projects without exposing storage metadata', async () => {
    const d = device();
    const legacy = projectWith('legacy-primary');
    delete legacy.schemaVersion;
    d.primary.set(d.store.key, legacy);
    d.fallback.set(d.store.key, JSON.stringify(projectWith('legacy-fallback')));
    expect(sourceIds(await d.store.load())).toEqual(['legacy-primary']);
    expect((await d.store.load()).schemaVersion).toBe(E.SCHEMA_VERSION);
    d.primary.delete(d.store.key);
    expect(sourceIds(await d.store.load())).toEqual(['legacy-fallback']);
    await d.store.save(projectWith('modern'));
    expect(await d.store.load()).not.toHaveProperty('__lumenProjectStore');
    expect(await d.store.load()).not.toHaveProperty('writeId');
  });

  it('replaces a legacy primary using a modern fallback', async () => {
    const d = device();
    d.primary.set(d.store.key, projectWith('legacy'));
    d.db.set.mockResolvedValue(false);
    await d.store.save(projectWith('modern'));
    expect(sourceIds(await d.open().load())).toEqual(['modern']);
  });

  it('ignores malformed snapshots instead of hiding valid stored documents', async () => {
    const d = device();
    await d.store.save(projectWith('primary'));
    d.fallback.set(d.store.key, '{broken JSON');
    expect(sourceIds(await d.store.load())).toEqual(['primary']);
    d.primary.set(d.store.key, { __lumenProjectStore: 1, writeId: 'broken', project: 'invalid' });
    d.fallback.set(d.store.key, JSON.stringify(projectWith('fallback')));
    expect(sourceIds(await d.store.load())).toEqual(['fallback']);
  });

  it('does not remove an intervening fallback written by another browser context', async () => {
    const d = device();
    d.db.set.mockImplementationOnce(async (key, value) => {
      d.primary.set(key, structuredClone(value));
      d.fallback.set(key, JSON.stringify({
        __lumenProjectStore: 1, writeId: 'another-browser-context', fallbackWriteId: null,
        project: projectWith('intervening'),
      }));
      return true;
    });
    await d.store.save(projectWith('primary'));
    expect(d.local.removeItem).not.toHaveBeenCalled();
    expect(sourceIds(await d.open().load())).toEqual(['intervening']);
  });
});

describe('Lumen project clearing and operation order', () => {
  it('orders clear after a pending save across store instances', async () => {
    const d = device();
    let finishWrite;
    const blocked = new Promise(resolve => { finishWrite = resolve; });
    d.db.set.mockImplementationOnce(async (key, value) => {
      await blocked;
      d.primary.set(key, structuredClone(value));
      return true;
    });
    const saving = d.store.save(projectWith('pending'));
    const clearing = d.open().clear();
    const loading = d.open().load();
    finishWrite();
    await saving;
    expect(await clearing).toEqual({ ok: true, medium: 'indexeddb' });
    expect(await loading).toBeNull();
    expect(await d.open().load()).toBeNull();
  });

  it('allows an explicitly queued new save after clear', async () => {
    const d = device();
    await d.store.save(projectWith('old'));
    const clearing = d.store.clear();
    const saving = d.open().save(projectWith('new'));
    await clearing;
    await saving;
    expect(sourceIds(await d.open().load())).toEqual(['new']);
  });

  it('prevents old primary documents from returning after a fallback clear', async () => {
    const d = device();
    await d.store.save(projectWith('removed'));
    d.db.set.mockResolvedValueOnce(false);
    expect(await d.store.clear()).toEqual({ ok: true, medium: 'localstorage' });
    expect(await d.open().load()).toBeNull();
    await d.open().save(projectWith('new'));
    expect(sourceIds(await d.open().load())).toEqual(['new']);
  });

  it('keeps primary clear authoritative when stale fallback removal fails', async () => {
    const d = device();
    d.db.set.mockResolvedValueOnce(false);
    await d.store.save(projectWith('removed'));
    d.local.removeItem.mockImplementation(unavailable);
    expect(await d.store.clear()).toEqual({ ok: true, medium: 'indexeddb' });
    expect(await d.open().load()).toBeNull();
  });

  it('reports a failed clear and preserves the last successfully stored documents', async () => {
    const d = device();
    await d.store.save(projectWith('retained'));
    d.db.set.mockResolvedValue(false);
    d.local.setItem.mockImplementation(unavailable);
    expect(await d.store.clear()).toEqual({ ok: false, medium: null });
    expect(sourceIds(await d.open().load())).toEqual(['retained']);
  });
});
