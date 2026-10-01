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

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe('LearningWebRegistry multi-graph project index', () => {
  it('keeps v1 persistence additive and normalizes typed refs and graph-kind aliases', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-13T12:00:00.000Z' });
    const saved = registry.saveGraph({
      version: 'acg/v1', nodes: [{ id: 'root', label: 'Unit' }], edges: [], meta: { throughline: { unitId: 'u1' } },
    }, {
      id: 'unit-one', scopeId: 'workspace:multi', kind: 'throughline',
      resourceRefs: [{ id: 'lesson-1', type: 'lesson', title: 'Lesson one', role: 'focus', relationType: 'generatedFor', unitId: 'u1', sourceUrl: 'https://example.test/lesson' }],
    });

    expect(Registry.VERSION).toBe('learning-web-registry/v1');
    expect(saved.graphKind).toBe(Registry.GRAPH_KINDS.UNIT);
    expect(saved.resourceRefs[0]).toMatchObject({ role: 'focus', relationType: 'generatedFor', unitId: 'u1', sourceUrl: 'https://example.test/lesson' });
    expect(Registry.normalizeSnapshot({ version: Registry.VERSION, graphs: [saved] }).graphs[0].id).toBe('unit-one');
  });

  it('adapts explicit project structure without mining prose and marks unreviewed glossary roots AI-suggested', () => {
    const graph = Registry.graphFromResources([{
      id: 'lesson-1', type: 'lesson-plan', title: 'Water lesson', unitId: 'unit-water',
      resourcePlan: [
        { resourceId: 'planned-quiz', title: 'Water check', resourceType: 'quiz', status: 'planned' },
        { uiId: 'planned-model', title: 'System model', resourceType: 'visual-organizer' },
      ],
      data: {
        standardsContext: {
          resolutionStatus: 'resolved', provider: 'local-cache', datasetVersion: '2026-01',
          standards: [{ id: 'std:water', code: '5-ESS2-2', label: 'Water distribution', framework: 'NGSS', sourceUrl: 'https://example.test/standard' }],
        },
        prose: 'Fungi causes rain: never infer a semantic link from this prose.',
      },
    }, {
      id: 'organizer-1', type: 'outline', title: 'Cycle organizer',
      data: { main: 'Water cycle', structureType: 'Mind Map', branches: [{ title: 'Processes', items: ['Evaporation'] }] },
    }, {
      id: 'glossary-1', type: 'glossary', title: 'Word bank',
      data: [{ term: 'transport', def: 'carry', roots: [
        { root: 'port', lang: 'Latin', meaning: 'carry' },
        { id: 'morph:aqua', root: 'aqua', lang: 'Latin', meaning: 'water', verification: 'reviewed', provenance: { provider: 'teacher review', reviewedAt: '2026-08-13' } },
      ] }],
    }], { scopeId: 'workspace:multi' });

    expect(graph.meta.learningWeb.graphKind).toBe(Registry.GRAPH_KINDS.RESOURCES);
    expect(graph.nodes.filter((node) => node.type === 'resource')).toHaveLength(3);
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'unit:unit-water', type: 'unit' }),
      expect.objectContaining({ id: 'standard:std:water', type: 'standard' }),
      expect.objectContaining({ id: 'planned-resource:lesson-1:planned-quiz', type: 'plannedResource', resourceType: 'quiz' }),
      expect.objectContaining({ label: 'port', verification: 'ai-suggested' }),
      expect.objectContaining({ label: 'aqua', verification: 'reviewed' }),
    ]));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromId: 'unit:unit-water', toId: 'resource:lesson-1', relationType: 'unitContainsResource' }),
      expect.objectContaining({ fromId: 'resource:lesson-1', toId: 'standard:std:water', type: 'alignedTo' }),
      expect.objectContaining({ fromId: 'resource:lesson-1', toId: 'planned-resource:lesson-1:planned-quiz', type: 'contains', relationType: 'plans' }),
    ]));
    expect(JSON.stringify(graph)).not.toContain('Fungi causes rain');
    expect(graph.nodes.map((node) => node.id)).toEqual([...graph.nodes.map((node) => node.id)].sort());
  });

  it('reconciles one deterministic project-resource catalog instead of one entry per resource', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-13T12:00:00.000Z' });
    const first = registry.reconcileResources([{ id: 'a', type: 'lesson', title: 'A' }, { id: 'b', type: 'quiz', title: 'B' }], { scopeId: 'workspace:multi' });
    const second = registry.reconcileResources([{ id: 'a', type: 'lesson', title: 'A revised' }, { id: 'c', type: 'outline', title: 'C' }], { scopeId: 'workspace:multi' });

    expect(first.id).toBe('project-resources:workspace:multi');
    expect(second.id).toBe(first.id);
    expect(registry.listGraphs({ scopeId: 'workspace:multi', kind: 'resources' })).toHaveLength(1);
    expect(second.graph.nodes.some((node) => node.id === 'resource:b')).toBe(false);
    expect(second.graph.nodes.some((node) => node.id === 'resource:c')).toBe(true);
  });

  it('merges deterministically, namespaces generic IDs, preserves lexical identities, and links resource refs', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-13T12:00:00.000Z' });
    registry.reconcileResources([{ id: 'lesson-1', type: 'lesson', title: 'Lesson one' }], { scopeId: 'workspace:multi' });
    registry.saveGraph({
      version: 'acg/v1', nodes: [{ id: 'root', label: 'Concept root', type: 'main' }], edges: [], meta: { conceptMap: { structureType: 'Mind Map' } },
    }, { id: 'concept-one', scopeId: 'workspace:multi', kind: 'concept', resourceId: 'lesson-1' });
    registry.saveGraph({
      version: 'acg/v1', nodes: [{ id: 'root', label: 'Lexical root' }, { id: 'lex:en:water:n:1', label: 'water', type: 'main' }],
      edges: [{ fromId: 'root', toId: 'lex:en:water:n:1', type: 'relatedTo' }], meta: { lexicalGraphVersion: 'LexicalGraph/v1', focusId: 'lex:en:water:n:1' },
    }, { id: 'lexical-one', scopeId: 'workspace:multi', kind: 'lexical', resourceId: 'lesson-1' });
    registry.saveGraph({
      version: 'acg/v1', nodes: [{ id: 'root', label: 'Other root', type: 'main' }], edges: [], meta: { generated: { structureType: 'Mind Map' } },
    }, { id: 'concept-two', scopeId: 'workspace:multi', kind: 'concept-map' });
    registry.saveGraph({
      version: 'acg/v1', nodes: [{ id: 'alignment-audit', label: 'Audit', type: 'audit' }, { id: 'std-node', label: 'Water standard', type: 'standard', standardsContext: { id: 'std:water', code: '5-ESS2-2', framework: 'NGSS' } }],
      edges: [{ fromId: 'alignment-audit', toId: 'std-node', type: 'contains' }], meta: { alignmentMap: { version: 'alloflow-alignment-map/v2' } },
    }, { id: 'alignment-one', scopeId: 'workspace:multi', kind: 'alignment', resourceId: 'lesson-1' });

    const first = registry.buildUnifiedGraph('workspace:multi');
    expect(registry.buildUnifiedGraph({ scopeId: 'workspace:multi' })).toEqual(first);
    expect(first.meta.learningWeb.graphKinds).toEqual(['alignment-map', 'concept-map', 'lexical-graph', 'project-resources']);
    expect(first.nodes.filter((node) => /root$/i.test(node.label))).toHaveLength(3);
    expect(first.nodes.filter((node) => node.id === 'lex:en:water:n:1')).toHaveLength(1);
    expect(first.edges.filter((edge) => edge.type === 'generatedFor' && edge.toId === 'resource:lesson-1')).toHaveLength(3);
    expect(first.nodes.filter((node) => node.id === 'standard:std:water')).toHaveLength(1);
    expect(registry.buildUnifiedGraph({ scopeId: 'workspace:multi', kinds: ['organizer'] }).meta.learningWeb.graphKinds).toEqual(['concept-map']);
  });

  it('bounds and sanitizes metadata, prototype-dangerous keys, and merged output', () => {
    const attack = JSON.parse('{"constructor":{"prototype":{"polluted":true}},"__proto__":{"polluted":true},"safe":"ok"}');
    let deep = attack;
    for (let index = 0; index < 20; index += 1) deep = { next: deep };
    const normalized = Registry.normalizeGraph({
      version: 'acg/v1', meta: deep,
      nodes: [{ id: 'a', label: 'x'.repeat(Registry.LIMITS.text + 500), extra: attack }], edges: [],
    });
    expect(normalized.nodes[0].label.length).toBe(Registry.LIMITS.text);
    expect(JSON.stringify(normalized)).not.toContain('polluted');
    expect(({}).polluted).toBeUndefined();

    const registry = Registry.createRegistry({ storage: memoryStorage() });
    registry.saveGraph({ version: 'acg/v1', nodes: Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` })), edges: [] }, { id: 'bounded', scopeId: 'workspace:bounds', kind: 'concept' });
    const merged = registry.buildUnifiedGraph({ scopeId: 'workspace:bounds', maxNodes: 5, maxEdges: 2 });
    expect(merged.nodes).toHaveLength(5);
    expect(merged.meta.learningWeb.truncated.nodes).toBe(true);
  });
});
