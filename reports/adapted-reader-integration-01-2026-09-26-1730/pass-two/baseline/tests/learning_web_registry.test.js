import { describe, it, expect, beforeAll } from 'vitest';
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

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function graph(id = 'standard:one') {
  return {
    version: 'acg/v1',
    meta: {
      alignmentMap: { version: 'alloflow-alignment-map/v2' },
      alignmentAudit: {
        auditScope: {
          includedArtifacts: [{ id: 'lesson-7', type: 'lesson', title: 'Fractions lesson' }],
        },
      },
    },
    nodes: [
      { id, label: 'Standard one' },
      { id: 'artifact:lesson-7', label: 'Fractions lesson' },
    ],
    edges: [{ fromId: id, toId: 'artifact:lesson-7', type: 'evidencedBy', relationType: 'evidenceFrom' }],
  };
}

describe('LearningWebRegistry', () => {
  it('persists and rehydrates a bounded ACG snapshot without changing canonical edge keys', () => {
    const storage = memoryStorage();
    const first = Registry.createRegistry({ storage, now: () => '2026-08-12T12:00:00.000Z' });
    const saved = first.saveGraph(graph(), { id: 'alignment:lesson-7', title: 'Lesson 7 Alignment Map' });

    expect(saved.graphKind).toBe('alignment-map');
    expect(saved.resourceRefs).toEqual([{ id: 'lesson-7', type: 'lesson', title: 'Fractions lesson' }]);
    expect(saved.graph.edges[0]).toMatchObject({ fromId: 'standard:one', toId: 'artifact:lesson-7' });
    expect(saved.graph.edges[0].source).toBeUndefined();

    const second = Registry.createRegistry({ storage });
    expect(second.getGraph('alignment:lesson-7')).toEqual(saved);
    expect(second.getLatestForResource('lesson-7', 'alignment-map').id).toBe('alignment:lesson-7');
  });

  it('updates a stable graph entry, preserves createdAt, and returns newest entries first', () => {
    const storage = memoryStorage();
    let now = '2026-08-12T12:00:00.000Z';
    const registry = Registry.createRegistry({ storage, now: () => now });
    registry.saveGraph(graph(), { id: 'alignment:lesson-7' });
    now = '2026-08-12T13:00:00.000Z';
    registry.saveGraph(graph('standard:two'), { id: 'alignment:lesson-7' });
    now = '2026-08-12T14:00:00.000Z';
    registry.saveGraph(graph('standard:three'), { id: 'alignment:lesson-8', resourceId: 'lesson-8' });

    const entries = registry.listGraphs({ kind: 'alignment-map' });
    expect(entries.map((entry) => entry.id)).toEqual(['alignment:lesson-8', 'alignment:lesson-7']);
    expect(entries[1].createdAt).toBe('2026-08-12T12:00:00.000Z');
    expect(entries[1].updatedAt).toBe('2026-08-12T13:00:00.000Z');
    expect(entries[0].resourceRefs.map((ref) => ref.id)).toEqual(['lesson-8', 'lesson-7']);
  });

  it('rejects malformed, dangling, and oversized graph data safely', () => {
    expect(Registry.normalizeGraph({ version: 'wrong', nodes: [], edges: [] })).toBeNull();
    const normalized = Registry.normalizeGraph({
      version: 'acg/v1',
      nodes: [{ id: 'a' }, { id: 'a' }, { id: 'b' }],
      edges: [
        { fromId: 'a', toId: 'b', type: 'relatedTo' },
        { fromId: 'a', toId: 'missing', type: 'relatedTo' },
      ],
    });
    expect(normalized.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(normalized.edges).toHaveLength(1);
    expect(Registry.normalizeGraph({
      version: 'acg/v1',
      nodes: Array.from({ length: Registry.LIMITS.nodes + 1 }, (_, index) => ({ id: String(index) })),
      edges: [],
    })).toBeNull();
  });

  it('keeps failed durable writes available in memory and reports the transient status', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
    };
    const registry = Registry.createRegistry({ storage, now: () => '2026-08-12T12:00:00.000Z' });
    const saved = registry.saveGraph(graph(), { id: 'alignment:lesson-7', scopeId: 'workspace:one' });
    expect(saved.storagePersisted).toBe(false);
    expect(Object.keys(saved)).not.toContain('storagePersisted');
    expect(registry.getGraph('alignment:lesson-7', 'workspace:one')).toMatchObject({ id: 'alignment:lesson-7', scopeId: 'workspace:one' });
  });

  it('scopes duplicate graph IDs independently and reconciles one project from embedded history', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-12T12:00:00.000Z' });
    registry.saveGraph(graph(), { id: 'alignment:shared', scopeId: 'workspace:one' });
    registry.saveGraph(graph('standard:two'), { id: 'alignment:shared', scopeId: 'workspace:two', resourceId: 'lesson-8' });
    expect(registry.listGraphs()).toHaveLength(2);
    expect(registry.getGraph('alignment:shared', 'workspace:one').scopeId).toBe('workspace:one');

    const result = registry.reconcileGraphs([{
      id: 'alignment:replacement', graph: graph('standard:replacement'), scopeId: 'workspace:one',
    }], { scopeId: 'workspace:one', kind: 'alignment-map' });
    expect(result.removedIds).toEqual(['alignment:shared']);
    expect(registry.listGraphs({ scopeId: 'workspace:one' }).map((entry) => entry.id)).toEqual(['alignment:replacement']);
    expect(registry.getGraph('alignment:shared', 'workspace:two')).toBeTruthy();
  });

  it('chooses the newest scoped graph linked to any selected-unit resource', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage() });
    registry.saveGraph(graph(), { id: 'old', scopeId: 'workspace:one', resourceId: 'lesson-7', updatedAt: '2026-08-12T12:00:00.000Z' });
    registry.saveGraph(graph('standard:two'), { id: 'new', scopeId: 'workspace:one', resourceId: 'lesson-8', updatedAt: '2026-08-12T13:00:00.000Z' });
    registry.saveGraph(graph('standard:other'), { id: 'other', scopeId: 'workspace:two', resourceId: 'lesson-8', updatedAt: '2026-08-12T14:00:00.000Z' });
    expect(registry.getLatestForResources(['lesson-7', 'lesson-8'], 'alignment-map', 'workspace:one').id).toBe('new');
  });

  it('imports snapshots with deterministic ID-based deduplication', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-12T12:00:00.000Z' });
    registry.saveGraph(graph(), { id: 'alignment:lesson-7' });
    registry.importSnapshot({
      version: Registry.VERSION,
      graphs: [{ id: 'alignment:lesson-7', graph: graph('standard:replacement'), updatedAt: '2026-08-12T15:00:00.000Z' }],
    });
    const entries = registry.listGraphs();
    expect(entries).toHaveLength(1);
    expect(entries[0].graph.nodes.some((node) => node.id === 'standard:replacement')).toBe(true);
  });

  it('removes one project scope without touching another', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage() });
    registry.saveGraph(graph(), { id: 'same', scopeId: 'workspace:a', resourceId: 'a' });
    registry.saveGraph(graph(), { id: 'same', scopeId: 'workspace:b', resourceId: 'b' });
    const result = registry.removeScope('workspace:a');
    expect(result.removedIds).toEqual(['same']);
    expect(result.storagePersisted).toBe(true);
    expect(registry.getGraph('same', 'workspace:a')).toBeNull();
    expect(registry.getGraph('same', 'workspace:b')).not.toBeNull();
  });

  it('rejects snapshots from incompatible future versions', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage() });
    expect(registry.importSnapshot({ version: 'learning-web-registry/v99', graphs: [] })).toBeNull();
    expect(registry.listGraphs()).toEqual([]);
  });
});
