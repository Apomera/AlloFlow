import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const E = require('../stem_lab/stem_lumen_evidence.js');
const code = readFileSync('own_sources_module.js', 'utf8');
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const file = name => ({ name });

function setup() {
  const primary = new Map();
  const fallback = new Map();
  const faults = { primary: false, fallback: false };
  const db = {
    get: async key => {
      if (faults.primary) throw new Error('device unavailable');
      return copy(primary.get(key) ?? null);
    },
    set: vi.fn(async (key, value) => { primary.set(key, copy(value)); return true; }),
  };
  const localStorage = {
    getItem: key => { if (faults.fallback) throw new Error('access denied'); return fallback.get(key) ?? null; },
    setItem: (key, value) => fallback.set(key, value),
    removeItem: key => fallback.delete(key),
  };
  const adapter = {
    extractLocalDocument: async input => ({
      id: 'src_' + input.name, title: input.name, fileName: input.name,
      content: 'Clouds form when water vapor cools and condenses into small droplets. ' + input.name,
      type: 'document', importMethod: 'local-file',
    }),
  };
  const root = { LumenEvidence: E, LumenDocuments: adapter, localStorage, AlloModules: { UtilsPure: { storageDB: db } } };
  vm.runInNewContext(code, { window: root, setTimeout });
  return { api: root.AlloOwnSources, db, faults, primary, fallback, root, key: E.storageKey(E.readingScope({})) };
}

describe('document library read recovery', () => {
  it('distinguishes a confirmed empty library from a failed read', async () => {
    const { api, faults } = setup();
    expect(await api.readLibrary({})).toMatchObject({ ok: true, sources: [] });
    faults.primary = true;
    expect(await api.readLibrary({})).toEqual({ ok: false, reason: 'storage-read', sources: [] });
    expect(await api.loadProject({})).toBe(null);
  });

  it('never imports over a library it could not read, then recovers without losing existing files', async () => {
    const { api, db, faults } = setup();
    await api.importFiles([file('original.txt')], {});
    db.set.mockClear();
    faults.primary = true;
    const failed = await api.importFiles([file('new.txt')], {});
    expect(failed).toMatchObject({ ok: false, reason: 'storage-read', imported: 0, failed: 1 });
    expect(failed.results[0]).toMatchObject({ ok: false, reason: 'storage-read' });
    expect(failed.results[0].message).toContain('not added or replaced');
    expect(db.set).not.toHaveBeenCalled();
    faults.primary = false;
    expect((await api.readLibrary({})).sources.map(row => row.title)).toEqual(['original.txt']);
    expect((await api.importFiles([file('new.txt')], {})).imported).toBe(1);
    expect((await api.readLibrary({})).sources.map(row => row.title)).toEqual(['original.txt', 'new.txt']);
  });

  it('blocks removal and legacy active-flag changes during a failed read', async () => {
    const { api, db, faults } = setup();
    const imported = await api.importFiles([file('notes.txt')], {});
    const id = imported.results[0].sourceId;
    db.set.mockClear();
    faults.primary = true;
    expect(await api.removeSource(id, {})).toMatchObject({ ok: false, reason: 'storage-read' });
    expect(await api.setSourceActive(id, false, {})).toMatchObject({ ok: false, reason: 'storage-read' });
    expect(db.set).not.toHaveBeenCalled();
    faults.primary = false;
    expect((await api.readLibrary({})).sources[0]).toMatchObject({ id, active: true });
  });

  it('does not trust a primary when a potentially newer fallback cannot be read', async () => {
    const { api, db, faults } = setup();
    await api.importFiles([file('notes.txt')], {});
    faults.fallback = true;
    db.set.mockClear();
    expect(await api.readLibrary({})).toMatchObject({ ok: false, reason: 'storage-read' });
    expect((await api.importFiles([file('new.txt')], {})).imported).toBe(0);
    expect(db.set).not.toHaveBeenCalled();
  });

  it('preserves corrupt stored bytes instead of replacing them with a new library', async () => {
    const { api, db, fallback, key } = setup();
    fallback.set(key, '{not valid JSON');
    expect(await api.readLibrary({})).toMatchObject({ ok: false, reason: 'corrupt' });
    expect((await api.importFiles([file('new.txt')], {})).reason).toBe('corrupt');
    expect(db.set).not.toHaveBeenCalled();
    expect(fallback.get(key)).toBe('{not valid JSON');
  });

  it('treats a denied localStorage property as an unreadable fallback, not an absent adapter', async () => {
    const { api, db, root } = setup();
    await api.importFiles([file('notes.txt')], {});
    db.set.mockClear();
    Object.defineProperty(root, 'localStorage', { get() { throw new Error('Access denied'); } });
    expect(await api.readLibrary({})).toMatchObject({ ok: false, reason: 'storage-read' });
    expect((await api.importFiles([file('new.txt')], {})).imported).toBe(0);
    expect(db.set).not.toHaveBeenCalled();
  });

  it('does not replace a duplicate if storage fails while its decision dialog is open', async () => {
    const { api, db, faults } = setup();
    await api.importFiles([file('notes.txt')], {});
    db.set.mockClear();
    const result = await api.importFiles([file('notes.txt')], { resolveDuplicate: async () => { faults.primary = true; return 'replace'; } });
    expect(result).toMatchObject({ ok: false, imported: 0, failed: 1, reason: 'storage-read' });
    expect(db.set).not.toHaveBeenCalled();
    faults.primary = false;
    expect((await api.readLibrary({})).sources[0].version).toBe(1);
  });

  it('reports earlier saved files accurately if a later read fails', async () => {
    const { api, db, faults } = setup();
    db.set.mockImplementationOnce(async () => { faults.primary = true; return true; });
    const result = await api.importFiles([file('one.txt'), file('two.txt')], {});
    expect(result).toMatchObject({ ok: false, imported: 1, failed: 1, reason: 'storage-read' });
    expect(result.results.map(row => row.ok)).toEqual([true, false]);
    expect(db.set).toHaveBeenCalledTimes(1);
  });

  it('copies requested selection before storage resolves and preserves explicit none', async () => {
    const { api } = setup();
    const result = await api.importFiles([file('notes.txt')], {});
    const selection = [result.results[0].sourceId];
    const pending = api.readLibrary({ selectedSourceIds: selection });
    selection.length = 0;
    expect((await pending).sources[0].active).toBe(true);
    expect((await api.readLibrary({ selectedSourceIds: [] })).sources[0].active).toBe(false);
    expect((await api.readLibrary({})).sources[0].active).toBe(true);
  });

  it('supports a legacy adapter while surfacing its rejected read', async () => {
    const { api, root } = setup();
    root.LumenEvidence = { ...E, createProjectStore: () => ({ load: async () => { throw new Error('offline'); } }) };
    expect(await api.readLibrary({})).toMatchObject({ ok: false, reason: 'storage-read' });
    expect((await api.importFiles([file('notes.txt')], {})).imported).toBe(0);
  });
});
