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

function canonicalStandardsGraph(provider, evidence, attack = {}) {
  return {
    version: 'acg/v1',
    title: `${provider} standards evidence`,
    nodes: [
      { id: `${provider}-left`, label: 'Standard left', type: 'standard', standardsContext: { id: 'std:left', code: 'LEFT', framework: 'Test' } },
      { id: `${provider}-right`, label: 'Standard right', type: 'standard', standardsContext: { id: 'std:right', code: 'RIGHT', framework: 'Test' } },
    ],
    edges: [{
      fromId: `${provider}-left`, toId: `${provider}-right`, type: 'alignedTo', relationType: 'supports',
      evidence, explanation: `${provider} explanation`, status: provider === 'provider-a' ? 'reviewed' : 'teacher-confirmed',
      attributionSource: provider,
      provenance: { provider, sourceUrl: `https://example.test/${provider}`, nested: attack },
    }],
    meta: { alignmentMap: { version: 'alloflow-alignment-map/v2' } },
  };
}

describe('LearningWebRegistry merged-graph trust boundaries', () => {
  it('retains separate sanitized evidence details for every provider of a deduped typed edge', () => {
    const attack = JSON.parse('{"safe":"retained","constructor":{"prototype":{"polluted":true}},"__proto__":{"polluted":true}}');
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-13T15:00:00.000Z' });
    registry.saveGraph(canonicalStandardsGraph('provider-a', 'Evidence from provider A.', attack), {
      id: 'entry-a', scopeId: 'workspace:trust', kind: 'alignment-map',
    });
    registry.saveGraph(canonicalStandardsGraph('provider-b', 'Different evidence from provider B.', attack), {
      id: 'entry-b', scopeId: 'workspace:trust', kind: 'alignment-map',
    });

    const unified = registry.buildUnifiedGraph('workspace:trust');
    const edge = unified.edges.find((candidate) => candidate.fromId === 'standard:std:left' && candidate.toId === 'standard:std:right' && candidate.relationType === 'supports');
    expect(edge).toBeTruthy();
    expect(edge.learningWeb.sourceEntryIds).toEqual(['entry-a', 'entry-b']);
    expect(edge.learningWeb.sourceDetails).toHaveLength(2);
    expect(edge.learningWeb.sourceDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entryId: 'entry-a', graphKind: 'alignment-map', evidence: 'Evidence from provider A.',
        explanation: 'provider-a explanation', status: 'reviewed', attributionSource: 'provider-a',
        provenance: expect.objectContaining({ provider: 'provider-a', nested: { safe: 'retained' } }),
      }),
      expect.objectContaining({
        entryId: 'entry-b', graphKind: 'alignment-map', evidence: 'Different evidence from provider B.',
        explanation: 'provider-b explanation', status: 'teacher-confirmed', attributionSource: 'provider-b',
        provenance: expect.objectContaining({ provider: 'provider-b', nested: { safe: 'retained' } }),
      }),
    ]));
    expect(JSON.stringify(edge.learningWeb.sourceDetails)).not.toContain('polluted');
    expect(({}).polluted).toBeUndefined();
    expect(edge.learningWeb.sourceDetails.length).toBeLessThanOrEqual(Registry.LIMITS.edgeSourceDetails);
  });

  it('uses bounded semantic content in generated entry identities so same-topology revisions coexist', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-13T15:00:00.000Z' });
    const first = registry.saveGraph({
      version: 'acg/v1', title: 'First interpretation',
      nodes: [{ id: 'root', label: 'Water cycle' }, { id: 'child', label: 'Evaporation' }],
      edges: [{ fromId: 'root', toId: 'child', type: 'elaborates', explanation: 'Liquid becomes vapor.' }],
      meta: { conceptMap: { structureType: 'Mind Map' }, revision: 'one' },
    }, { scopeId: 'workspace:fingerprint', kind: 'concept-map' });
    const second = registry.saveGraph({
      version: 'acg/v1', title: 'Second interpretation',
      nodes: [{ id: 'root', label: 'Carbon cycle' }, { id: 'child', label: 'Respiration' }],
      edges: [{ fromId: 'root', toId: 'child', type: 'elaborates', explanation: 'Organisms release carbon dioxide.' }],
      meta: { conceptMap: { structureType: 'Mind Map' }, revision: 'two' },
    }, { scopeId: 'workspace:fingerprint', kind: 'concept-map' });

    expect(first.id).not.toBe(second.id);
    expect(registry.listGraphs({ scopeId: 'workspace:fingerprint', kind: 'concept-map' })).toHaveLength(2);
  });

  it('can omit embedded alignment graphs while retaining resource and resolved standards catalog nodes', () => {
    const resource = {
      id: 'audit-resource', type: 'alignment-report', title: 'Audit resource',
      data: { comprehensive: {
        standardsContext: {
          resolutionStatus: 'resolved', provider: 'local-cache',
          standards: [{ id: 'std:catalog', code: 'CAT', label: 'Catalog standard', framework: 'Test' }],
        },
        alignmentMapGraph: {
          version: 'acg/v1',
          nodes: [{ id: 'alignment-audit', label: 'Embedded audit', type: 'audit' }],
          edges: [], meta: { alignmentMap: { version: 'alloflow-alignment-map/v2' } },
        },
      } },
    };
    const included = Registry.graphFromResources([resource], { scopeId: 'workspace:embedded' });
    const omitted = Registry.graphFromResources([resource], { scopeId: 'workspace:embedded', includeEmbeddedAlignment: false });

    expect(included.nodes.some((node) => node.label === 'Embedded audit')).toBe(true);
    expect(omitted.nodes.some((node) => node.label === 'Embedded audit')).toBe(false);
    expect(omitted.nodes.some((node) => node.id === 'resource:audit-resource')).toBe(true);
    expect(omitted.nodes.some((node) => node.id === 'standard:std:catalog')).toBe(true);
    expect(omitted.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromId: 'resource:audit-resource', toId: 'standard:std:catalog', type: 'alignedTo' }),
    ]));
  });

  it('reserves bounded capacity across graph kinds and reports only sources that actually contributed', () => {
    const registry = Registry.createRegistry({ storage: memoryStorage(), now: () => '2026-08-13T15:00:00.000Z' });
    const resources = Array.from({ length: Registry.LIMITS.resources }, (_, resourceIndex) => ({
      id: `resource-${String(resourceIndex).padStart(3, '0')}`,
      type: 'lesson',
      title: `Resource ${resourceIndex}`,
      resourcePlan: Array.from({ length: 80 }, (_, planIndex) => ({
        stepId: `step-${String(planIndex).padStart(2, '0')}`,
        title: `Planned item ${resourceIndex}-${planIndex}`,
        resourceType: planIndex % 2 ? 'quiz' : 'visual-organizer',
      })),
    }));
    const catalog = registry.reconcileResources(resources, { scopeId: 'workspace:stress' });
    expect(catalog.graph.nodes).toHaveLength(Registry.LIMITS.nodes);

    registry.saveGraph({
      version: 'acg/v1',
      nodes: [
        { id: 'alignment-audit', label: 'Stress audit', type: 'audit' },
        { id: 'alignment-standard', label: 'Stress standard', type: 'standard', standardsContext: { id: 'std:stress', code: 'STRESS', framework: 'Test' } },
      ],
      edges: [{ fromId: 'alignment-audit', toId: 'alignment-standard', type: 'contains', evidence: 'Reviewed alignment.' }],
      meta: { alignmentMap: { version: 'alloflow-alignment-map/v2' } },
    }, { id: 'stress-alignment', scopeId: 'workspace:stress', kind: 'alignment-map' });

    registry.saveGraph({
      version: 'acg/v1',
      nodes: [
        { id: 'lex:en:water:n:1', label: 'water', type: 'main' },
        { id: 'etymon:proto-water', label: 'historical water form', type: 'branch' },
      ],
      edges: [{ fromId: 'lex:en:water:n:1', toId: 'etymon:proto-water', type: 'relatedTo', relationType: 'inheritedFrom', evidence: 'Reviewed lexical source.' }],
      meta: { lexicalGraphVersion: 'LexicalGraph/v1', focusId: 'lex:en:water:n:1' },
    }, { id: 'stress-lexical', scopeId: 'workspace:stress', kind: 'lexical-graph' });

    registry.saveGraph({
      version: 'acg/v1', nodes: [], edges: [], meta: { conceptMap: { structureType: 'Mind Map' } },
    }, { id: 'empty-concept', scopeId: 'workspace:stress', kind: 'concept-map' });

    const unified = registry.buildUnifiedGraph('workspace:stress');
    expect(unified.nodes).toHaveLength(Registry.LIMITS.nodes);
    expect(unified.nodes.some((node) => node.learningWeb?.sourceGraphKinds?.includes('alignment-map'))).toBe(true);
    expect(unified.nodes.some((node) => node.learningWeb?.sourceGraphKinds?.includes('lexical-graph'))).toBe(true);
    expect(unified.nodes.some((node) => node.id === 'standard:std:stress')).toBe(true);
    expect(unified.nodes.some((node) => node.id === 'lex:en:water:n:1')).toBe(true);
    expect(unified.edges.some((edge) => edge.learningWeb?.sourceDetails?.some((detail) => detail.entryId === 'stress-alignment'))).toBe(true);
    expect(unified.edges.some((edge) => edge.learningWeb?.sourceDetails?.some((detail) => detail.entryId === 'stress-lexical'))).toBe(true);
    expect(unified.meta.learningWeb.graphKinds).toEqual(['alignment-map', 'lexical-graph', 'project-resources']);
    expect(unified.meta.learningWeb.sourceEntryIds).toEqual(expect.arrayContaining([
      'project-resources:workspace:stress', 'stress-alignment', 'stress-lexical',
    ]));
    expect(unified.meta.learningWeb.sourceEntryIds).not.toContain('empty-concept');
    expect(unified.meta.learningWeb.sources.map((source) => source.id)).not.toContain('empty-concept');
    expect(unified.meta.learningWeb.counts.entries).toBe(3);
    expect(unified.meta.learningWeb.counts.selectedEntries).toBe(4);
  });
});
