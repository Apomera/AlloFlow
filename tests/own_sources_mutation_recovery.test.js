import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const E = require('../stem_lab/stem_lumen_evidence.js');
const code = readFileSync('own_sources_module.js', 'utf8');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const source = (id, title = id + '.txt') => ({
  id, title, fileName: title, type: 'document', importMethod: 'local-file',
  content: 'Clouds form when water vapor cools and condenses into small droplets. ' + id,
});

function fixture({ ids = ['notes'], legacy = false, empty = false } = {}) {
  let stored = empty ? null : ids.reduce((project, id) => E.upsertSource(project, source(id)), E.makeProject({ title: 'Saved documents' }));
  const faults = { failReads: false, failAfterSave: false };
  const store = {
    load: vi.fn(async () => clone(stored)),
    loadState: vi.fn(async () => faults.failReads
      ? { ok: false, reason: 'storage-read', project: null }
      : { ok: true, reason: '', project: clone(stored) }),
    save: vi.fn(async project => {
      stored = clone(project);
      if (faults.failAfterSave) faults.failReads = true;
      return { ok: true, medium: 'indexeddb' };
    }),
  };
  if (legacy) delete store.loadState;
  const root = {
    LumenEvidence: { ...E, createProjectStore: () => store },
    LumenDocuments: {
      extractLocalDocument: async input => ({
        ...source(input.id || 'notes', input.name),
        content: input.content || 'Updated cloud observations describe condensation and rainfall in the water cycle.',
      }),
    },
  };
  vm.runInNewContext(code, { window: root, setTimeout });
  return { api: root.AlloOwnSources, store, faults, current: () => clone(stored) };
}

describe('document mutation recovery boundaries', () => {
  it('honors Skip if another workspace removes the duplicate while its dialog is open', async () => {
    const { api, store, current } = fixture();
    const resolveDuplicate = vi.fn(async () => {
      await store.save(E.removeSource(current(), 'notes'));
      return 'skip';
    });
    const outcome = await api.importFiles([{ name: 'notes.txt' }], { resolveDuplicate });
    expect(outcome).toMatchObject({ ok: true, imported: 0, skipped: 1, failed: 0 });
    expect(outcome.results[0]).toMatchObject({ action: 'skipped', ok: true });
    expect(resolveDuplicate).toHaveBeenCalledTimes(1);
    expect(store.save).toHaveBeenCalledTimes(1); // Only the other workspace's removal.
    expect(current().sources).toEqual([]);
  });

  it('returns the saved remaining sources after a removal even if subsequent reads fail', async () => {
    const { api, store, faults, current } = fixture({ ids: ['notes', 'other'] });
    faults.failAfterSave = true;
    const outcome = await api.removeSource('notes', { selectedSourceIds: ['other'] });
    expect(outcome).toMatchObject({ ok: true, count: 1 });
    expect(outcome.sources.map(row => row.id)).toEqual(['other']);
    expect(outcome.sources[0].active).toBe(true);
    expect(current().sources.map(row => row.id)).toEqual(['other']);
    expect(store.loadState).toHaveBeenCalledTimes(1);
    expect(await api.readLibrary({})).toMatchObject({ ok: false, reason: 'storage-read' });
  });

  it.each([false, true])('keeps legacy read compatibility but refuses ambiguous legacy mutations (empty=%s)', async empty => {
    const { api, store, current } = fixture({ legacy: true, empty });
    const before = current();
    const library = await api.readLibrary({});
    expect(library.ok).toBe(true);
    expect(library.sources).toHaveLength(empty ? 0 : 1);
    expect(await api.loadProject({})).toMatchObject(empty ? null : { sources: [expect.objectContaining({ id: 'notes' })] });

    const imported = await api.importFiles([{ name: 'new.txt', id: 'new' }], {});
    expect(imported).toMatchObject({ ok: false, imported: 0, failed: 1 });
    expect(imported.reason).not.toBe('');
    expect(imported.results[0].ok).toBe(false);
    expect(await api.removeSource('notes', {})).toMatchObject({ ok: false });
    expect(await api.setSourceActive('notes', false, {})).toMatchObject({ ok: false });
    expect(store.save).not.toHaveBeenCalled();
    expect(current()).toEqual(before);
  });
});
