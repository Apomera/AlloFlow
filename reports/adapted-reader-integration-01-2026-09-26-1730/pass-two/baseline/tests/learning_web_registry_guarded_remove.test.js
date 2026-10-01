import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let Registry;

beforeAll(() => {
  const src = readFileSync(resolve(process.cwd(), 'learning_web_registry_module.js'), 'utf8');
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.LearningWebRegistry;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  Registry = window.AlloModules.LearningWebRegistry;
});

function unitGraph(label = 'Unit root') {
  return {
    version: 'acg/v1',
    title: label,
    nodes: [{ id: 'root', label, type: 'main' }],
    edges: [],
    meta: { throughline: { unitId: 'unit-1' } },
  };
}

function conceptGraph(label = 'Concept root') {
  return {
    version: 'acg/v1',
    title: label,
    nodes: [{ id: 'root', label, type: 'main' }],
    edges: [],
    meta: { conceptMap: { structureType: 'Mind Map' } },
  };
}

function controlledStorage() {
  const values = new Map();
  let failWrites = false;
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => {
      if (failWrites) throw new Error('storage unavailable');
      values.set(key, String(value));
    },
    setFailWrites: (value) => { failWrites = !!value; },
  };
}

function sharedStorageTabs() {
  const values = new Map();
  let tabAFails = false;
  const tab = (isA) => ({
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => {
      if (isA && tabAFails) throw new Error('tab A storage unavailable');
      values.set(key, String(value));
    },
  });
  return {
    tabA: tab(true),
    tabB: tab(false),
    setTabAFails: (value) => { tabAFails = !!value; },
  };
}

describe('LearningWebRegistry guarded durable unregister', () => {
  it('deletes only the expected kind in the exact scope and persists the removal', () => {
    const storage = controlledStorage();
    const registry = Registry.createRegistry({ storage, now: () => '2026-08-13T20:00:00.000Z' });
    registry.saveGraph(unitGraph('Scope A'), { id: 'unit:shared', scopeId: 'workspace:a', kind: 'unit-path' });
    registry.saveGraph(unitGraph('Scope B'), { id: 'unit:shared', scopeId: 'workspace:b', kind: 'unit-path' });

    const result = registry.removeGraphOfKind('unit:shared', 'workspace:a', 'throughline');
    expect(result).toEqual({
      id: 'unit:shared', scopeId: 'workspace:a', expectedKind: 'unit-path',
      status: 'removed', removed: true, absent: false, kindMismatch: false,
      storagePersisted: true, writeAttempted: true, ok: true,
    });
    expect(registry.getGraph('unit:shared', 'workspace:a')).toBeNull();
    expect(registry.getGraph('unit:shared', 'workspace:b')).toMatchObject({ graphKind: 'unit-path' });

    const rehydrated = Registry.createRegistry({ storage });
    expect(rehydrated.getGraph('unit:shared', 'workspace:a')).toBeNull();
    expect(rehydrated.getGraph('unit:shared', 'workspace:b')).not.toBeNull();
  });

  it('never deletes a wrong-kind entry and reports the actual kind', () => {
    const storage = controlledStorage();
    const registry = Registry.createRegistry({ storage });
    registry.saveGraph(conceptGraph(), { id: 'graph:one', scopeId: 'workspace:a', kind: 'concept-map' });

    const mismatch = registry.removeGraphOfKind('graph:one', 'workspace:a', 'unit-path');
    expect(mismatch).toEqual({
      id: 'graph:one', scopeId: 'workspace:a', expectedKind: 'unit-path', actualKind: 'concept-map',
      status: 'kind-mismatch', removed: false, absent: false, kindMismatch: true,
      storagePersisted: true, writeAttempted: false, ok: false,
    });
    expect(registry.getGraph('graph:one', 'workspace:a')).toMatchObject({ graphKind: 'concept-map' });
    expect(Registry.createRegistry({ storage }).getGraph('graph:one', 'workspace:a')).not.toBeNull();
  });

  it('keeps a failed durable deletion absent in-session and flushes it on an idempotent retry', () => {
    const storage = controlledStorage();
    const registry = Registry.createRegistry({ storage, now: () => '2026-08-13T20:00:00.000Z' });
    registry.saveGraph(unitGraph(), { id: 'unit:retry', scopeId: 'workspace:retry', kind: 'unit-path' });
    storage.setFailWrites(true);

    const failed = registry.removeGraphOfKind('unit:retry', 'workspace:retry', 'unit-path');
    expect(failed).toMatchObject({
      status: 'removed', removed: true, absent: false,
      storagePersisted: false, writeAttempted: true, ok: false,
    });
    expect(registry.getGraph('unit:retry', 'workspace:retry')).toBeNull();
    expect(Registry.createRegistry({ storage }).getGraph('unit:retry', 'workspace:retry')).not.toBeNull();

    // A differently guarded retry must not flush deletion of the stale unit.
    const wrongRetry = registry.removeGraphOfKind('unit:retry', 'workspace:retry', 'concept-map');
    expect(wrongRetry).toMatchObject({
      status: 'kind-mismatch', actualKind: 'unit-path', removed: false,
      storagePersisted: false, writeAttempted: false, ok: false,
    });

    storage.setFailWrites(false);
    const retry = registry.removeGraphOfKind('unit:retry', 'workspace:retry', 'unit-path');
    expect(retry).toEqual({
      id: 'unit:retry', scopeId: 'workspace:retry', expectedKind: 'unit-path',
      status: 'absent', removed: false, absent: true, kindMismatch: false,
      storagePersisted: true, writeAttempted: true, ok: true,
    });
    expect(registry.getGraph('unit:retry', 'workspace:retry')).toBeNull();
    expect(Registry.createRegistry({ storage }).getGraph('unit:retry', 'workspace:retry')).toBeNull();

    const cleanNoop = registry.removeGraphOfKind('unit:retry', 'workspace:retry', 'unit-path');
    expect(cleanNoop).toMatchObject({
      status: 'absent', removed: false, absent: true,
      storagePersisted: true, writeAttempted: false, ok: true,
    });
  });

  it('rebases pending deletions onto current durable state without erasing another tab additions', () => {
    const shared = sharedStorageTabs();
    const tabA = Registry.createRegistry({ storage: shared.tabA, now: () => '2026-08-13T20:00:00.000Z' });
    tabA.saveGraph(unitGraph('First pending unit'), { id: 'unit:pending-a', scopeId: 'workspace:shared', kind: 'unit-path' });
    tabA.saveGraph(unitGraph('Second pending unit'), { id: 'unit:pending-b', scopeId: 'workspace:shared', kind: 'unit-path' });
    shared.setTabAFails(true);

    expect(tabA.removeGraphOfKind('unit:pending-a', 'workspace:shared', 'unit-path')).toMatchObject({
      status: 'removed', storagePersisted: false, ok: false,
    });
    expect(tabA.removeGraphOfKind('unit:pending-b', 'workspace:shared', 'unit-path')).toMatchObject({
      status: 'removed', storagePersisted: false, ok: false,
    });
    expect(tabA.listGraphs({ scopeId: 'workspace:shared' })).toEqual([]);

    const tabB = Registry.createRegistry({ storage: shared.tabB, now: () => '2026-08-13T20:01:00.000Z' });
    tabB.saveGraph(conceptGraph('Concurrent concept'), {
      id: 'concept:concurrent', scopeId: 'workspace:shared', kind: 'concept-map',
    });
    expect(tabB.getGraph('concept:concurrent', 'workspace:shared')).not.toBeNull();

    shared.setTabAFails(false);
    const retry = tabA.removeGraphOfKind('unit:pending-a', 'workspace:shared', 'unit-path');
    expect(retry).toMatchObject({
      status: 'absent', removed: false, absent: true,
      storagePersisted: true, writeAttempted: true, ok: true,
    });
    expect(tabA.getGraph('concept:concurrent', 'workspace:shared')).toMatchObject({ graphKind: 'concept-map' });
    expect(tabA.getGraph('unit:pending-a', 'workspace:shared')).toBeNull();
    expect(tabA.getGraph('unit:pending-b', 'workspace:shared')).toBeNull();

    const fresh = Registry.createRegistry({ storage: shared.tabB });
    expect(fresh.getGraph('concept:concurrent', 'workspace:shared')).not.toBeNull();
    expect(fresh.getGraph('unit:pending-a', 'workspace:shared')).toBeNull();
    expect(fresh.getGraph('unit:pending-b', 'workspace:shared')).toBeNull();
  });

  it('persists an unrelated failed session save while rebasing concurrent durable additions', () => {
    const shared = sharedStorageTabs();
    const tabA = Registry.createRegistry({ storage: shared.tabA, now: () => '2026-08-13T20:00:00.000Z' });
    tabA.saveGraph(unitGraph('Delete me'), {
      id: 'unit:delete-me', scopeId: 'workspace:mixed-dirty', kind: 'unit-path',
    });
    shared.setTabAFails(true);

    const pendingSave = tabA.saveGraph(conceptGraph('Session-only concept'), {
      id: 'concept:session-only', scopeId: 'workspace:mixed-dirty', kind: 'concept-map',
    });
    expect(pendingSave.storagePersisted).toBe(false);
    expect(tabA.removeGraphOfKind('unit:delete-me', 'workspace:mixed-dirty', 'unit-path')).toMatchObject({
      status: 'removed', storagePersisted: false, ok: false,
    });

    const tabB = Registry.createRegistry({ storage: shared.tabB, now: () => '2026-08-13T20:01:00.000Z' });
    tabB.saveGraph(conceptGraph('Concurrent durable concept'), {
      id: 'concept:concurrent-durable', scopeId: 'workspace:mixed-dirty', kind: 'concept-map',
    });

    shared.setTabAFails(false);
    expect(tabA.removeGraphOfKind('unit:delete-me', 'workspace:mixed-dirty', 'unit-path')).toMatchObject({
      status: 'absent', storagePersisted: true, writeAttempted: true, ok: true,
    });

    const fresh = Registry.createRegistry({ storage: shared.tabB });
    expect(fresh.getGraph('unit:delete-me', 'workspace:mixed-dirty')).toBeNull();
    expect(fresh.getGraph('concept:session-only', 'workspace:mixed-dirty')).toMatchObject({ graphKind: 'concept-map' });
    expect(fresh.getGraph('concept:concurrent-durable', 'workspace:mixed-dirty')).toMatchObject({ graphKind: 'concept-map' });
  });

  it('does not resurrect an unrelated graph another tab deleted while removal was pending', () => {
    const shared = sharedStorageTabs();
    const tabA = Registry.createRegistry({ storage: shared.tabA });
    tabA.saveGraph(unitGraph('Delete target'), { id: 'unit:target', scopeId: 'workspace:no-resurrection', kind: 'unit-path' });
    tabA.saveGraph(conceptGraph('Delete elsewhere'), { id: 'concept:base', scopeId: 'workspace:no-resurrection', kind: 'concept-map' });
    shared.setTabAFails(true);
    expect(tabA.removeGraphOfKind('unit:target', 'workspace:no-resurrection', 'unit-path')).toMatchObject({ ok: false });

    const tabB = Registry.createRegistry({ storage: shared.tabB });
    expect(tabB.removeGraph('concept:base', 'workspace:no-resurrection')).toBe(true);
    shared.setTabAFails(false);

    expect(tabA.removeGraphOfKind('unit:target', 'workspace:no-resurrection', 'unit-path')).toMatchObject({ ok: true });
    const fresh = Registry.createRegistry({ storage: shared.tabB });
    expect(fresh.getGraph('unit:target', 'workspace:no-resurrection')).toBeNull();
    expect(fresh.getGraph('concept:base', 'workspace:no-resurrection')).toBeNull();
  });

  it('reports conflict instead of deleting a newer same-kind same-id revival', () => {
    const shared = sharedStorageTabs();
    const tabA = Registry.createRegistry({ storage: shared.tabA, now: () => '2026-08-13T20:00:00.000Z' });
    tabA.saveGraph(unitGraph('Original unit'), { id: 'unit:revived', scopeId: 'workspace:revival', kind: 'unit-path' });
    shared.setTabAFails(true);
    expect(tabA.removeGraphOfKind('unit:revived', 'workspace:revival', 'unit-path')).toMatchObject({ ok: false });

    const tabB = Registry.createRegistry({ storage: shared.tabB, now: () => '2026-08-13T20:00:00.000Z' });
    const revived = tabB.saveGraph(unitGraph('Revived unit'), { id: 'unit:revived', scopeId: 'workspace:revival', kind: 'unit-path' });
    expect(revived.storagePersisted).toBe(true);
    shared.setTabAFails(false);

    const conflict = tabA.removeGraphOfKind('unit:revived', 'workspace:revival', 'unit-path');
    expect(conflict).toMatchObject({ status: 'conflict', conflict: true, removed: false, ok: false });
    const retry = tabA.removeGraphOfKind('unit:revived', 'workspace:revival', 'unit-path');
    expect(retry).toMatchObject({ status: 'conflict', removed: false, writeAttempted: false, ok: false });
    const fresh = Registry.createRegistry({ storage: shared.tabB });
    expect(fresh.getGraph('unit:revived', 'workspace:revival')).toMatchObject({
      graphKind: 'unit-path', title: 'Learning Web graph'
    });
    expect(fresh.getGraph('unit:revived', 'workspace:revival').graph.title).toBe('Revived unit');
  });

  it('does not delete a concurrent same-id replacement of another kind during retry', () => {
    const shared = sharedStorageTabs();
    const tabA = Registry.createRegistry({ storage: shared.tabA });
    tabA.saveGraph(unitGraph('Original unit'), { id: 'shared-id', scopeId: 'workspace:conflict', kind: 'unit-path' });
    shared.setTabAFails(true);
    expect(tabA.removeGraphOfKind('shared-id', 'workspace:conflict', 'unit-path')).toMatchObject({ storagePersisted: false });

    const tabB = Registry.createRegistry({ storage: shared.tabB });
    tabB.saveGraph(conceptGraph('Concurrent replacement'), { id: 'shared-id', scopeId: 'workspace:conflict', kind: 'concept-map' });
    shared.setTabAFails(false);

    const conflict = tabA.removeGraphOfKind('shared-id', 'workspace:conflict', 'unit-path');
    expect(conflict).toMatchObject({
      status: 'kind-mismatch', kindMismatch: true, actualKind: 'concept-map',
      removed: false, storagePersisted: false, writeAttempted: false, ok: false,
    });
    const fresh = Registry.createRegistry({ storage: shared.tabB });
    expect(fresh.getGraph('shared-id', 'workspace:conflict')).toMatchObject({ graphKind: 'concept-map' });
  });

  it('requires id, scope, and kind and preserves the legacy boolean remover', () => {
    const storage = controlledStorage();
    const registry = Registry.createRegistry({ storage });
    registry.saveGraph(unitGraph(), { id: 'legacy', scopeId: 'workspace:a', kind: 'unit-path' });

    expect(registry.removeGraphOfKind('legacy', '', 'unit-path')).toMatchObject({ status: 'invalid', removed: false, ok: false });
    expect(registry.removeGraphOfKind('legacy', 'workspace:a', '')).toMatchObject({ status: 'invalid', removed: false, ok: false });
    expect(registry.getGraph('legacy', 'workspace:a')).not.toBeNull();
    expect(registry.removeGraph('legacy', 'workspace:a')).toBe(true);
    expect(registry.removeGraph('legacy', 'workspace:a')).toBe(false);
  });
});
