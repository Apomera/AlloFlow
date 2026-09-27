import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const E = require('../stem_lab/stem_lumen_evidence.js');
const helperCode = fs.readFileSync(path.resolve(__dirname, '../own_sources_module.js'), 'utf8');
const copy = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const content = (label) => `# Page 1\n\n${label}: clouds form when water vapor cools and condenses into droplets.`;
const file = (name, text = content('Original')) => ({ name, text });

function setup() {
  const cells = new Map();
  const fallback = new Map();
  const db = {
    get: async (key) => copy(cells.get(key) || null),
    set: async (key, value) => { cells.set(key, copy(value)); return true; },
  };
  const localStorage = {
    getItem: (key) => fallback.get(key) || null,
    setItem: (key, value) => { fallback.set(key, value); },
    removeItem: (key) => { fallback.delete(key); },
  };
  const adapter = {
    MAX_FILES_PER_IMPORT: 5,
    extractLocalDocument: async (input) => ({
      id: 'src_file_' + E.hashString(input.name.toLowerCase()),
      title: input.name, fileName: input.name, content: input.text,
      fileContentHash: E.hashString(input.text), type: 'document', importMethod: 'local-file',
    }),
  };
  const root = { LumenEvidence: E, LumenDocuments: adapter, localStorage, AlloModules: { UtilsPure: { storageDB: db } } };
  vm.runInNewContext(helperCode, { window: root, setTimeout });
  const store = E.createProjectStore({ storageDB: db, localStorage, scope: E.readingScope({}) });
  return { api: root.AlloOwnSources, store, db, localStorage, adapter, cells };
}

describe('explicit duplicate decisions', () => {
  it('never replaces a different document sharing a filename without a decision', async () => {
    const { api, store } = setup();
    const first = await api.importFiles([file('notes.pdf')], {});
    const second = await api.importFiles([file('NOTES.pdf', content('Different'))], {});
    expect(first.results[0]).toMatchObject({ ok: true, action: 'added' });
    expect(second).toMatchObject({ ok: false, imported: 0, skipped: 1, reason: 'duplicate-name', count: 1 });
    expect(second.results[0]).toMatchObject({ action: 'skipped', sourceId: first.results[0].sourceId, reason: 'duplicate-name' });
    expect(second.results[0].message).toMatch(/Keep both, Replace, or Skip/);
    expect((await store.load()).sources[0].content).toBe(content('Original'));
  });

  it('skips an exact re-import and reports the existing document', async () => {
    const { api, store } = setup();
    const first = await api.importFiles([file('notes.pdf')], {});
    const again = await api.importFiles([file('notes.pdf')], {});
    expect(again).toMatchObject({ ok: true, imported: 0, skipped: 1, failed: 0, count: 1 });
    expect(again.results[0]).toMatchObject({ action: 'skipped', ok: true, reason: 'duplicate', sourceId: first.results[0].sourceId });
    expect(again.results[0].message).toMatch(/already saved/);
    expect((await store.load()).sources[0].version).toBe(1);
  });

  it('keeps both with unique persistent identities and recognizes a re-import of the second copy', async () => {
    const { api, store } = setup();
    const first = await api.importFiles([file('notes.pdf')], {});
    const resolver = vi.fn(async () => 'keep-both');
    const second = await api.importFiles([file('notes.pdf', content('Second'))], { resolveDuplicate: resolver });
    expect(resolver).toHaveBeenCalledWith(expect.objectContaining({
      existing: expect.objectContaining({ id: first.results[0].sourceId, title: 'notes.pdf' }),
      incoming: expect.objectContaining({ title: 'notes.pdf' }), identical: false,
    }));
    expect(second).toMatchObject({ ok: true, imported: 1, count: 2 });
    expect(second.results[0].sourceId).not.toBe(first.results[0].sourceId);
    expect(second.results[0]).toMatchObject({ action: 'added', title: 'notes (2).pdf' });
    const stored = await store.load();
    expect(stored.sources.map((source) => source.content)).toEqual([content('Original'), content('Second')]);
    expect(stored.sources.map((source) => source.version)).toEqual([1, 1]);
    const again = await api.importFiles([file('notes.pdf', content('Second'))], {});
    expect(again.results[0]).toMatchObject({ sourceId: second.results[0].sourceId, action: 'skipped', reason: 'duplicate' });
    expect(again.count).toBe(2);
  });

  it('supports explicit Keep both even for exact copies without overwriting either copy', async () => {
    const { api, store } = setup();
    await api.importFiles([file('notes.pdf')], {});
    const decisions = vi.fn(async () => 'keep-both');
    await api.importFiles([file('notes.pdf'), file('notes.pdf')], { resolveDuplicate: decisions });
    expect(decisions.mock.calls.every(([info]) => info.identical)).toBe(true);
    const sources = (await store.load()).sources;
    expect(new Set(sources.map((source) => source.id)).size).toBe(3);
    expect(sources.map((source) => source.title)).toEqual(['notes.pdf', 'notes (2).pdf', 'notes (3).pdf']);
  });

  it('replaces only the selected identity and retains its exclusion, privacy and version history', async () => {
    const { api, store } = setup();
    const first = await api.importFiles([file('notes.pdf')], {});
    const sourceId = first.results[0].sourceId;
    let project = E.setSourceActive(await store.load(), sourceId, false);
    project.sources[0].allowAI = false;
    project.sources[0].labels = ['lesson one'];
    await store.save(project);
    const replacement = await api.importFiles([file('notes.pdf', content('Updated'))], { resolveDuplicate: async () => 'replace' });
    expect(replacement).toMatchObject({ ok: true, imported: 1, count: 0 });
    expect(replacement.results[0]).toMatchObject({ sourceId, action: 'replaced' });
    project = await store.load();
    expect(project.sources).toHaveLength(1);
    expect(project.sources[0]).toMatchObject({ id: sourceId, active: false, allowAI: false, version: 2, labels: ['lesson one'], content: content('Updated') });
    expect(project.evidenceNodes.every((node) => node.sourceVersion === 2)).toBe(true);
  });

  it('honors Skip duplicate and does not save or modify the existing project', async () => {
    const { api, store, db } = setup();
    await api.importFiles([file('notes.pdf')], {});
    const before = await store.load();
    const writes = vi.spyOn(db, 'set');
    const skipped = await api.importFiles([file('notes.pdf', content('New'))], { resolveDuplicate: async () => 'skip' });
    expect(skipped).toMatchObject({ ok: true, imported: 0, skipped: 1, count: 1 });
    expect(skipped.results[0]).toMatchObject({ ok: true, action: 'skipped', reason: 'skipped' });
    expect(writes).not.toHaveBeenCalled();
    expect(await store.load()).toEqual(before);
  });

  it('reloads after a decision so another workspace save survives the import', async () => {
    const { api, store } = setup();
    const first = await api.importFiles([file('notes.pdf')], {});
    await api.importFiles([file('notes.pdf', content('Updated'))], {
      resolveDuplicate: async () => {
        let current = E.upsertSource(await store.load(), { id: 'other', title: 'Other lesson', content: content('Other workspace') });
        current = E.setSourceActive(current, first.results[0].sourceId, false);
        await store.save(current);
        return 'replace';
      },
    });
    const saved = await store.load();
    expect(saved.sources.map((source) => source.id)).toContain('other');
    expect(saved.sources.find((source) => source.id === first.results[0].sourceId)).toMatchObject({ active: false, version: 2 });
  });

  it('asks again if the document being replaced changes while the choice is open', async () => {
    const { api, store } = setup();
    const first = await api.importFiles([file('notes.pdf')], {});
    const resolver = vi.fn(async () => {
      if (resolver.mock.calls.length === 1) {
        await store.save(E.upsertSource(await store.load(), { id: first.results[0].sourceId, fileName: 'notes.pdf', title: 'notes.pdf', content: content('Concurrent revision') }));
        return 'replace';
      }
      return 'skip';
    });
    const outcome = await api.importFiles([file('notes.pdf', content('Incoming revision'))], { resolveDuplicate: resolver });
    expect(resolver).toHaveBeenCalledTimes(2);
    expect(outcome.imported).toBe(0);
    expect((await store.load()).sources[0].content).toBe(content('Concurrent revision'));
  });

  it('reports partial persistence accurately when a later save fails', async () => {
    const { api, store, db, localStorage } = setup();
    let writes = 0;
    const save = db.set;
    db.set = async (...args) => ++writes === 1 ? save(...args) : false;
    localStorage.setItem = () => { throw new Error('Device full'); };
    const outcome = await api.importFiles([file('one.pdf'), file('two.pdf', content('Second'))], {});
    expect(outcome).toMatchObject({ ok: false, reason: 'storage', imported: 1, failed: 1, count: 1 });
    expect(outcome.results[0]).toMatchObject({ ok: true, action: 'added' });
    expect(outcome.results[1]).toMatchObject({ ok: false, reason: 'storage' });
    expect((await store.load()).sources.map((source) => source.title)).toEqual(['one.pdf']);
  });
});

describe('research selection belongs to each run', () => {
  async function seeded() {
    const fixture = setup();
    let project = E.makeProject({ title: 'Shared library' });
    project = E.upsertSource(project, { id: 'a', title: 'First', content: content('First'), labels: ['science'] });
    project = E.upsertSource(project, { id: 'b', title: 'Second', content: content('Second'), active: false, labels: ['history'] });
    project = E.upsertSource(project, { id: 'private', title: 'Private', content: content('Private'), allowAI: false });
    project = E.connectReadingSource(project, { title: 'Adapted reading', text: content('Generated'), anchor: { kind: 'adapted' } });
    project = E.setRetrievalLabel(project, 'science');
    await fixture.store.save(project);
    return fixture;
  }

  it('can select a saved inactive source for this run without changing Lumen or another run', async () => {
    const { api, store } = await seeded();
    const before = await store.load();
    const runA = await api.loadProject({ selectedSourceIds: ['a'] });
    const runB = await api.loadProject({ selectedSourceIds: ['b'] });
    expect(E.retrieve(runA, 'clouds water vapor', { forAI: true }).map((hit) => hit.node.sourceId)).toEqual(['a']);
    expect(E.retrieve(runB, 'clouds water vapor', { forAI: true }).map((hit) => hit.node.sourceId)).toEqual(['b']);
    expect(runA.sources.find((source) => source.id === 'b').active).toBe(false);
    expect(runB.retrievalLabel).toBe('');
    expect(await store.load()).toEqual(before);
    expect(await api.countSources({ selectedSourceIds: ['b'] })).toBe(1);
  });

  it('treats an empty list as none, ignores invalid IDs, and respects AI restrictions', async () => {
    const { api } = await seeded();
    expect(api.activeSourceCount(await api.getResearchProject({}, []))).toBe(0);
    const run = await api.getResearchProject({}, ['missing', 'private', null, 99, 'b']);
    expect(api.activeSourceCount(run)).toBe(1);
    expect(run.sources.find((source) => source.id === 'private')).toMatchObject({ active: false, allowAI: false });
    expect(E.retrieve(run, 'clouds water vapor', { forAI: true }).map((hit) => hit.node.sourceId)).toEqual(['b']);
  });

  it('keeps legacy stored active behavior when no selection was supplied', async () => {
    const { api } = await seeded();
    const legacy = await api.loadProject({});
    expect(E.retrieve(legacy, 'clouds water vapor', { forAI: true }).map((hit) => hit.node.sourceId)).toEqual(['a']);
    const rows = await api.listSources({});
    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'private']);
    expect(rows.find((row) => row.id === 'private')).toMatchObject({ active: false, allowAI: false, version: 1 });
    expect(await api.countSources({})).toBe(1);
  });

  it('returns the current run count after deleting an unselected source', async () => {
    const { api, store } = await seeded();
    const result = await api.removeSource('a', { selectedSourceIds: ['b'] });
    expect(result).toMatchObject({ ok: true, count: 1 });
    expect(result.sources.filter((source) => source.active).map((source) => source.id)).toEqual(['b']);
    expect((await store.load()).sources.find((source) => source.id === 'b').active).toBe(false);
  });

  it('captures the selection before storage finishes loading', async () => {
    const { api, db } = await seeded();
    const originalGet = db.get;
    let release;
    let notifyStarted;
    const started = new Promise((resolve) => { notifyStarted = resolve; });
    db.get = async (...args) => {
      await new Promise((resolve) => { release = resolve; notifyStarted(); });
      return originalGet(...args);
    };
    const selectedSourceIds = ['b'];
    const pending = api.loadProject({ selectedSourceIds });
    selectedSourceIds.length = 0;
    await started;
    release();
    const project = await pending;
    expect(project.sources.find((source) => source.id === 'b').active).toBe(true);
  });
});
