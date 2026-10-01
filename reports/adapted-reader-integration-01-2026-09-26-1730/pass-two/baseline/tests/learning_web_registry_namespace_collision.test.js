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

function collisionEntry(id, label, evidence) {
  return {
    id,
    version: 'learning-web-entry/v1',
    graphKind: 'concept-map',
    scopeId: 'course-a',
    title: label,
    createdAt: '2026-08-13T18:00:00.000Z',
    updatedAt: '2026-08-13T18:00:00.000Z',
    resourceRefs: [{ id: 'shared-resource', type: 'lesson', title: 'Shared lesson' }],
    provenance: { provider: id },
    graph: {
      version: 'acg/v1',
      title: label,
      nodes: [
        { id: 'root', label: `${label} root`, type: 'main' },
        { id: 'child', label: `${label} child`, type: 'item' },
      ],
      edges: [{
        id: 'root-child', fromId: 'root', toId: 'child', type: 'elaborates',
        relationType: 'explains', evidence, provenance: { provider: id },
      }],
      meta: { conceptMap: { structureType: 'Mind Map' } },
    },
  };
}

describe('LearningWebRegistry namespace collision allocation', () => {
  it('keeps known FNV-colliding entry composites distinct and deterministic', () => {
    const y = collisionEntry('graph-yzb5hc-12vk', 'Graph Y', 'Evidence Y');
    const c = collisionEntry('graph-c8adw7-21c9', 'Graph C', 'Evidence C');

    const forward = Registry.mergeEntriesToGraph([y, c], {
      scopeId: 'course-a', maxNodes: 5, maxEdges: 4,
    });
    const reversed = Registry.mergeEntriesToGraph([c, y], {
      scopeId: 'course-a', maxNodes: 5, maxEdges: 4,
    });

    expect(reversed).toEqual(forward);
    expect(forward.nodes).toHaveLength(5);
    expect(forward.edges).toHaveLength(4);
    expect(forward.nodes.every((node) => node.id.length <= 240)).toBe(true);
    expect(forward.edges.every((edge) => edge.fromId !== edge.toId)).toBe(true);

    const genericNodes = forward.nodes.filter((node) => node.type !== 'resource');
    expect(genericNodes).toHaveLength(4);
    expect(new Set(genericNodes.map((node) => node.id)).size).toBe(4);
    expect(genericNodes.every((node) => node.id.startsWith('graph:14k2cgt~'))).toBe(true);

    const roots = genericNodes.filter((node) => node.type === 'main');
    expect(roots).toHaveLength(2);
    expect(roots.map((node) => node.learningWeb.sourceEntryIds)).toEqual(expect.arrayContaining([
      ['graph-yzb5hc-12vk'],
      ['graph-c8adw7-21c9'],
    ]));

    const semanticEdges = forward.edges.filter((edge) => edge.relationType === 'explains');
    expect(semanticEdges).toHaveLength(2);
    expect(new Set(semanticEdges.map((edge) => `${edge.fromId}>${edge.toId}`)).size).toBe(2);
    expect(semanticEdges.map((edge) => edge.learningWeb.sourceEntryIds)).toEqual(expect.arrayContaining([
      ['graph-yzb5hc-12vk'],
      ['graph-c8adw7-21c9'],
    ]));
    expect(semanticEdges.flatMap((edge) => edge.learningWeb.sourceDetails.map((detail) => detail.evidence)).sort()).toEqual(['Evidence C', 'Evidence Y']);

    const shared = forward.nodes.find((node) => node.id === 'resource:shared-resource');
    expect(shared.learningWeb.sourceEntryIds).toEqual(['graph-c8adw7-21c9', 'graph-yzb5hc-12vk']);
    expect(forward.edges.filter((edge) => edge.type === 'generatedFor' && edge.toId === shared.id)).toHaveLength(2);
    expect(forward.meta.learningWeb.sourceEntryIds).toEqual(['graph-c8adw7-21c9', 'graph-yzb5hc-12vk']);
    expect(forward.meta.learningWeb.sources.map((source) => source.id)).toEqual(['graph-c8adw7-21c9', 'graph-yzb5hc-12vk']);
    expect(forward.meta.learningWeb.graphKinds).toEqual(['concept-map']);
    expect(forward.meta.learningWeb.counts).toMatchObject({ entries: 2, selectedEntries: 2, nodes: 5, edges: 4 });
  });
});
