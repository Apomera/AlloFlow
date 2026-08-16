import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, Explorer, root, host;

const graph = {
  version: 'acg/v1',
  title: 'Fractions unit',
  nodes: [
    { id: 'standard', label: 'CCSS 4.NF.A.1', type: 'standard', category: 'Standards' },
    { id: 'concept', label: 'Equivalent fractions', type: 'concept', category: 'Concepts' },
    { id: 'lesson', label: 'Fraction strips lesson', type: 'lesson', category: 'Instruction' },
    { id: 'evidence', label: 'Exit ticket response', type: 'auditEvidence', category: 'Evidence' },
  ],
  edges: [
    { id: 'align', fromId: 'standard', toId: 'concept', type: 'alignedTo' },
    { id: 'teaches', fromId: 'concept', toId: 'lesson', type: 'elaborates' },
    {
      id: 'shows', fromId: 'lesson', toId: 'evidence', relationType: 'evidencedBy',
      explanation: 'The exit ticket demonstrates the lesson outcome.',
      evidence: 'Teacher-confirmed artifact link.',
      attributionSource: 'teacher',
      provenance: {
        provider: 'District curriculum review', datasetVersion: '2026.1', snapshotId: 'review-44',
        license: 'District use', attribution: 'Reviewed by A. Teacher',
        sourceIds: ['artifact-17'], sourceUrls: ['https://example.test/artifact-17', 'javascript:alert(1)'],
      },
    },
  ],
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('learning_web_explorer_module.js');
  Explorer = window.AlloModules.LearningWebExplorer;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
});

async function mount(input = graph, props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Explorer.View, { graph: input, ...props }));
  });
}

async function rerender(input = graph, props = {}) {
  await act(async () => {
    root.render(React.createElement(Explorer.View, { graph: input, ...props }));
  });
}

async function change(control, value) {
  await act(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(control.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value');
    descriptor.set.call(control, value);
    control.dispatchEvent(new Event('change', { bubbles: true }));
    control.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Learning Web Explorer pure graph helpers', () => {
  it('exposes stable integration aliases for normalization, filtering, and layout', () => {
    expect(Explorer.filter).toBe(Explorer.filterGraph);
    expect(Explorer.layout).toBe(Explorer.layoutGraph);
    expect(Explorer.layout(graph).positions).toHaveProperty('standard');
    expect(Explorer.filter(graph, { nodeType: 'standard' }).nodes).toHaveLength(1);
  });

  it('normalizes registry snapshots with collision-safe IDs and source context', () => {
    const snapshot = {
      version: 'learning-web-registry/v1',
      graphs: [
        { id: 'audit', scopeId: 'course-a', graphKind: 'alignment-map', title: 'Audit map', resourceRefs: [{ id: 'unit-1', type: 'unit', title: 'Unit 1' }], graph },
        { id: 'concepts', scopeId: 'course-a', graphKind: 'concept-map', title: 'Concept map', graph: { ...graph, nodes: [{ id: 'concept', label: 'A second concept', type: 'concept' }], edges: [] } },
      ],
    };
    const normalized = Explorer.normalizeInput(snapshot);
    expect(normalized.version).toBe('acg/v1');
    expect(normalized.nodes).toHaveLength(5);
    expect(new Set(normalized.nodes.map((node) => node.id)).size).toBe(5);
    expect(normalized.nodes.find((node) => node.graphKind === 'alignment-map')).toMatchObject({ graphTitle: 'Audit map', resourceRefs: [{ id: 'unit-1', type: 'unit', title: 'Unit 1' }] });
    expect(normalized.meta.learningWebExplorer.inputKind).toBe('registry');
  });

  it('keeps known colliding graph identities distinct with deterministic namespaces and honest counts', () => {
    function entry(id, label) {
      return {
        id, scopeId: 'course-a', graphKind: 'concept-map',
        graph: { version: 'acg/v1', nodes: [{ id: 'root', label, type: 'concept' }], edges: [] },
      };
    }
    const entries = [entry('graph-yzb5hc-12vk', 'First root'), entry('graph-c8adw7-21c9', 'Second root')];
    const snapshot = { version: 'learning-web-registry/v1', graphs: entries };
    const normalized = Explorer.normalizeInput(snapshot);
    const reversed = Explorer.normalizeInput({ ...snapshot, graphs: entries.slice().reverse() });
    expect(normalized.nodes).toHaveLength(2);
    expect(new Set(normalized.nodes.map((node) => node.id)).size).toBe(2);
    expect(normalized.nodes.map((node) => node.id).sort()).toEqual(['g14k2cgt-2::root', 'g14k2cgt::root'].sort());
    expect(normalized.meta.learningWebExplorer.counts).toMatchObject({ inputGraphs: 2, displayedGraphs: 2, inputNodes: 2, displayedNodes: 2 });
    const namespaceByGraph = Object.fromEntries(normalized.nodes.map((node) => [node.graphId, node.id]));
    const reversedNamespaceByGraph = Object.fromEntries(reversed.nodes.map((node) => [node.graphId, node.id]));
    expect(reversedNamespaceByGraph).toEqual(namespaceByGraph);
    expect(Object.keys(namespaceByGraph).sort()).toEqual(['graph-c8adw7-21c9', 'graph-yzb5hc-12vk']);
  });

  it('preserves direct unified source-kind memberships and source-specific evidence', () => {
    const unified = {
      version: 'acg/v1', title: 'Unified Learning Web',
      meta: { learningWeb: { graphKind: 'learning-web', graphKinds: ['alignment-map', 'concept-map', 'unit-path'] } },
      nodes: [
        { id: 'shared', label: 'Shared concept', type: 'concept', learningWeb: { sourceGraphKinds: ['alignment-map', 'concept-map'] } },
        { id: 'lesson', label: 'Lesson', type: 'lesson', learningWeb: { sourceGraphKinds: ['alignment-map', 'unit-path'] } },
      ],
      edges: [{
        id: 'unified-edge', fromId: 'shared', toId: 'lesson', type: 'alignedTo',
        learningWeb: {
          sourceGraphKinds: ['alignment-map', 'unit-path'],
          sourceDetails: [{
            sourceEntryId: 'alignment-1', graphKind: 'alignment-map', title: 'Alignment audit',
            provider: 'Teacher review', evidence: 'The teacher confirmed this alignment.',
            provenance: { provider: 'District audit', sourceUrls: ['https://example.test/audit', 'javascript:alert(1)'] },
          }],
        },
      }],
    };
    const normalized = Explorer.normalizeInput(unified);
    const shared = normalized.nodes.find((node) => node.sourceNodeId === 'shared');
    expect(shared.graphKind).toBe('learning-web');
    expect(shared.graphKinds).toEqual(['alignment-map', 'concept-map']);
    expect(normalized.edges[0]).toMatchObject({
      graphKinds: ['alignment-map', 'unit-path'],
      sourceDetails: [{ graphKind: 'alignment-map', provider: 'Teacher review', evidence: 'The teacher confirmed this alignment.' }],
    });
    expect(normalized.edges[0].sourceDetails[0].provenance.sourceUrls).toEqual(['https://example.test/audit']);
    const view = Explorer.buildViewGraph(unified, { graphKind: 'alignment-map' });
    expect(view.available.graphKinds).toEqual(['alignment-map', 'concept-map', 'unit-path']);
    expect(view.graph.nodes).toHaveLength(2);
    expect(view.graph.edges).toHaveLength(1);
    expect(Explorer.filter(unified, { graphKind: 'concept-map' }).nodes.map((node) => node.sourceNodeId)).toEqual(['shared']);
    expect(Explorer.filter(unified, { query: 'unit-path' }).nodes.map((node) => node.sourceNodeId)).toContain('lesson');
  });

  it('applies hard graph bounds and reports truncation', () => {
    const oversized = {
      version: 'learning-web-registry/v1',
      graphs: Array.from({ length: Explorer.LIMITS.graphs + 4 }, (_, graphIndex) => ({
        id: `graph-${graphIndex}`,
        graphKind: 'concept-map',
        graph: {
          version: 'acg/v1',
          nodes: Array.from({ length: 20 }, (_, nodeIndex) => ({ id: `n-${nodeIndex}`, label: `Node ${nodeIndex}` })),
          edges: Array.from({ length: 40 }, (_, edgeIndex) => ({ id: `e-${edgeIndex}`, fromId: `n-${edgeIndex % 20}`, toId: `n-${(edgeIndex + 1) % 20}`, type: 'relatedTo' })),
        },
      })),
    };
    const normalized = Explorer.normalizeInput(oversized);
    expect(normalized.nodes.length).toBeLessThanOrEqual(Explorer.LIMITS.nodes);
    expect(normalized.edges.length).toBeLessThanOrEqual(Explorer.LIMITS.edges);
    expect(normalized.meta.learningWebExplorer.truncated).toEqual({ graphs: true, nodes: true, edges: true });
  });

  it('returns a deterministic exact one-hop neighborhood without mutating the graph', () => {
    const before = JSON.stringify(graph);
    const focused = Explorer.focusNeighborhood(graph, 'concept');
    const reversed = Explorer.focusNeighborhood({ ...graph, nodes: graph.nodes.slice().reverse(), edges: graph.edges.slice().reverse() }, 'concept');
    expect(focused.nodes.map((node) => node.id)).toEqual(['concept', 'lesson', 'standard']);
    expect(focused.edges.map((edge) => edge.id)).toEqual(['align', 'teaches']);
    expect(reversed.nodes.map((node) => node.id)).toEqual(focused.nodes.map((node) => node.id));
    expect(reversed.edges.map((edge) => edge.id)).toEqual(focused.edges.map((edge) => edge.id));
    expect(focused.meta.learningWebExplorerFocus).toEqual({ nodeId: 'concept', found: true, hops: 1, nodes: 3, edges: 2 });
    expect(Explorer.focusNeighborhood(graph, 'missing')).toMatchObject({ nodes: [], edges: [], meta: { learningWebExplorerFocus: { found: false } } });
    expect(JSON.stringify(graph)).toBe(before);
  });

  it('produces deterministic positions and filters relationship evidence', () => {
    const first = Explorer.buildViewGraph(graph, { query: 'teacher-confirmed' });
    const reversed = Explorer.buildViewGraph({ ...graph, nodes: graph.nodes.slice().reverse(), edges: graph.edges.slice().reverse() }, { query: 'teacher-confirmed' });
    expect(first.graph.edges.map((edge) => edge.id)).toEqual(['shows']);
    expect(first.graph.nodes.map((node) => node.sourceNodeId).sort()).toEqual(['evidence', 'lesson']);
    const firstPositions = Object.fromEntries(Object.entries(first.layout.positions).map(([id, pos]) => [first.graph.nodes.find((node) => node.id === id).sourceNodeId, pos]));
    const reversedPositions = Object.fromEntries(Object.entries(reversed.layout.positions).map(([id, pos]) => [reversed.graph.nodes.find((node) => node.id === id).sourceNodeId, pos]));
    expect(firstPositions).toEqual(reversedPositions);
  });
});

describe('Learning Web Explorer accessible view', () => {
  it('renders a responsive SVG plus the always-present node outline and relationship table', async () => {
    await mount();
    const svg = host.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    const svgLabelIds = svg.getAttribute('aria-labelledby').split(/\s+/);
    expect(svgLabelIds).toHaveLength(2);
    expect(svgLabelIds.every((id) => svg.contains(document.getElementById(id)))).toBe(true);
    expect(svg.querySelector('title').id).toBe(svgLabelIds[0]);
    expect(svg.querySelector('desc').id).toBe(svgLabelIds[1]);
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 1000 /);
    expect(svg.style.minWidth).toBe('1000px');
    expect(svg.closest('[data-learning-web-diagram-scroll]').style.overflowX).toBe('auto');
    expect(svg.querySelectorAll('[data-node-id]')).toHaveLength(4);
    expect(svg.textContent).toContain('Aligned To');
    expect(host.querySelectorAll('[data-learning-web-node-select]')).toHaveLength(4);
    expect(host.querySelectorAll('[data-learning-web-edge-row]')).toHaveLength(3);
    expect(host.textContent).toContain('Accessible graph outline');
    expect(host.textContent).toContain('Relationships');
  });

  it('focuses the SVG one hop while retaining the complete authoritative outline and table', async () => {
    await mount();
    await act(async () => { host.querySelector('[data-learning-web-node-select="concept"]').click(); });
    const focus = host.querySelector('[data-learning-web-focus-node="concept"]');
    expect(focus).toBeTruthy();
    expect(focus.style.minHeight).toBe('44px');
    await act(async () => { focus.click(); });
    expect(host.querySelector('svg').querySelectorAll('[data-node-id]')).toHaveLength(3);
    expect(host.querySelector('svg').querySelectorAll('[data-edge-id]')).toHaveLength(2);
    expect(host.querySelectorAll('[data-learning-web-node-select]')).toHaveLength(4);
    expect(host.querySelectorAll('[data-learning-web-edge-row]')).toHaveLength(3);
    expect(host.textContent).toContain('The complete outline and table remain below.');
    const whole = host.querySelector('[data-learning-web-show-whole]');
    expect(whole.style.minHeight).toBe('44px');
    whole.focus();
    await act(async () => {
      whole.click();
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    });
    expect(host.querySelector('svg').querySelectorAll('[data-node-id]')).toHaveLength(4);
    expect(document.activeElement).toBe(host.querySelector('[data-learning-web-node-select="concept"]'));
  });

  it('filters through labeled native controls and preserves an explicit empty-result state', async () => {
    await mount();
    const search = host.querySelector('input[type="search"]');
    await change(search, 'exit ticket');
    expect(host.querySelectorAll('[data-learning-web-node-select]')).toHaveLength(2);
    expect(host.querySelectorAll('[data-learning-web-edge-row]')).toHaveLength(1);
    await change(search, 'not present anywhere');
    expect(host.textContent).toContain('No Learning Web items match these filters.');
    expect(host.querySelector('table')).toBeTruthy();
    expect(host.textContent).toContain('No relationships to list.');
  });

  it('clears filtered and replaced selection/focus state so hidden targets cannot resurrect', async () => {
    await mount();
    await act(async () => { host.querySelector('[data-learning-web-node-select="concept"]').click(); });
    await act(async () => { host.querySelector('[data-learning-web-focus-node="concept"]').click(); });
    expect(host.querySelector('[data-learning-web-focus-controls]')).toBeTruthy();

    const nodeType = host.querySelector('select[id$="-node-type"]');
    await change(nodeType, 'standard');
    expect(host.querySelector('[data-learning-web-focus-controls]')).toBeNull();
    expect(host.querySelector('section[id$="-detail"]').textContent).toContain('Select a node or relationship');
    await change(nodeType, 'all');
    expect(host.querySelector('[data-learning-web-node-select="concept"]').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('svg').querySelectorAll('[data-node-id]')).toHaveLength(4);

    await act(async () => { host.querySelector('[data-learning-web-node-select="concept"]').click(); });
    await act(async () => { host.querySelector('[data-learning-web-focus-node="concept"]').click(); });
    const replacement = {
      ...graph,
      title: 'Replacement snapshot',
      nodes: graph.nodes.map((node) => node.id === 'concept' ? { ...node, label: 'Replacement concept' } : node),
    };
    await rerender(replacement);
    expect(host.querySelector('[data-learning-web-focus-controls]')).toBeNull();
    expect(host.querySelector('[data-learning-web-node-select="concept"]').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('section[id$="-detail"]').textContent).toContain('Select a node or relationship');
    await rerender(graph);
    expect(host.querySelector('[data-learning-web-focus-controls]')).toBeNull();
    expect(host.querySelector('[data-learning-web-node-select="concept"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('supports keyboard selection without moving focus and exposes typed provenance detail', async () => {
    const onSelectionChange = vi.fn();
    await mount(graph, { onSelectionChange });
    const inspect = host.querySelector('[data-learning-web-edge-select="shows"]');
    inspect.focus();
    await act(async () => {
      inspect.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      inspect.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      inspect.click();
    });
    expect(document.activeElement).toBe(inspect);
    expect(inspect.getAttribute('aria-pressed')).toBe('true');
    expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ kind: 'edge', item: expect.objectContaining({ relationType: 'evidencedBy' }) }));
    const detail = host.querySelector('section[id$="-detail"]');
    expect(detail.textContent).toContain('Relationship: Evidenced By');
    expect(detail.textContent).toContain('Teacher-confirmed artifact link.');
    expect(detail.textContent).toContain('District curriculum review');
    expect(detail.textContent).toContain('District use');
    expect(detail.querySelector('a[href="https://example.test/artifact-17"]')).toMatchObject({ rel: 'noopener noreferrer' });
    expect(detail.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('opens only an unambiguous resource identity explicitly carried by the node', async () => {
    const onOpenResource = vi.fn();
    const resourceGraph = {
      version: 'acg/v1',
      nodes: [
        { id: 'resource-field', label: 'Explicit resource', resourceId: 'resource-1' },
        { id: 'artifact-field', label: 'Explicit artifact', artifactId: 'artifact-2' },
        { id: 'reference-field', label: 'Explicit reference', resourceRefs: [{ id: 'reference-3', type: 'lesson' }] },
        { id: 'resources-field', label: 'Explicit resources array', resources: [{ id: 'resource-4', type: 'unit' }] },
        { id: 'label-only', label: 'resource-5' },
        { id: 'ambiguous', label: 'Ambiguous', resourceId: 'resource-6', artifactId: 'artifact-6' },
      ], edges: [],
    };
    const normalized = Explorer.normalizeInput(resourceGraph);
    const bySourceId = Object.fromEntries(normalized.nodes.map((node) => [node.sourceNodeId, node]));
    expect(Explorer.explicitResourceId(bySourceId['resource-field'])).toBe('resource-1');
    expect(Explorer.explicitResourceId(bySourceId['artifact-field'])).toBe('artifact-2');
    expect(Explorer.explicitResourceId(bySourceId['reference-field'])).toBe('');
    expect(Explorer.explicitResourceId(bySourceId['resources-field'])).toBe('');
    expect(Explorer.explicitResourceId(bySourceId['label-only'])).toBe('');
    expect(Explorer.explicitResourceId(bySourceId.ambiguous)).toBe('');
    await mount(resourceGraph, { onOpenResource });
    await act(async () => { host.querySelector('[data-learning-web-node-select="resource-field"]').click(); });
    const open = host.querySelector('[data-learning-web-open-resource="resource-1"]');
    expect(open).toBeTruthy();
    expect(open.style.minHeight).toBe('44px');
    await act(async () => { open.click(); });
    expect(onOpenResource).toHaveBeenCalledWith({ resourceId: 'resource-1', nodeId: 'resource-field' });
    await act(async () => { host.querySelector('[data-learning-web-node-select="reference-field"]').click(); });
    expect(host.querySelector('[data-learning-web-open-resource]')).toBeNull();
    await act(async () => { host.querySelector('[data-learning-web-node-select="label-only"]').click(); });
    expect(host.querySelector('[data-learning-web-open-resource]')).toBeNull();
    await act(async () => { host.querySelector('[data-learning-web-node-select="ambiguous"]').click(); });
    expect(host.querySelector('[data-learning-web-open-resource]')).toBeNull();
  });

  it('contains synchronous throws and Promise rejections from every optional callback', async () => {
    const callbackGraph = {
      version: 'acg/v1',
      nodes: [{ id: 'resource', label: 'Resource', type: 'lesson', resourceId: 'lesson-1' }],
      edges: [],
    };
    const onSelectionChange = vi.fn(() => { throw new Error('selection failed'); });
    const onOpenResource = vi.fn(() => Promise.reject(new Error('open failed')));
    const onClose = vi.fn(() => Promise.reject(new Error('close failed')));
    await mount(callbackGraph, { onSelectionChange, onOpenResource, onClose });
    await act(async () => { host.querySelector('[data-learning-web-node-select="resource"]').click(); });
    expect(host.querySelector('[data-learning-web-node-select="resource"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-learning-web-callback-status]').textContent).toBe('The selection could not be shared.');

    await act(async () => {
      host.querySelector('[data-learning-web-open-resource="lesson-1"]').click();
      await Promise.resolve();
    });
    expect(host.querySelector('[data-learning-web-callback-status]').textContent).toBe('The resource could not be opened.');
    await act(async () => {
      host.querySelector('button[aria-label="Close Learning Web Explorer"]').click();
      await Promise.resolve();
    });
    expect(host.querySelector('[data-learning-web-callback-status]').textContent).toBe('Learning Web Explorer could not close.');
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onOpenResource).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses a bounded exact resourceId allowlist and rejects virtual or artifact-only identities', async () => {
    const onOpenResource = vi.fn();
    const allowlistGraph = {
      version: 'acg/v1',
      nodes: [
        { id: 'openable', label: 'Openable lesson', resourceId: 'lesson-1' },
        { id: 'virtual', label: 'Virtual lexical focus', resourceId: 'lingua:transport' },
        { id: 'artifact-only', label: 'Audit artifact', artifactId: 'artifact-2' },
      ], edges: [],
    };
    expect(Explorer.normalizeOpenableResourceIds(Array.from({ length: Explorer.LIMITS.openableResources + 4 }, (_, index) => 'r-' + index))).toHaveLength(Explorer.LIMITS.openableResources);
    expect(Explorer.normalizeOpenableResourceIds([null, 7, { id: 'lesson-1' }, 'lesson-1'])).toEqual(['lesson-1']);
    await mount(allowlistGraph, { onOpenResource, openableResourceIds: ['lesson-1', 'artifact-2'] });
    await act(async () => { host.querySelector('[data-learning-web-node-select="virtual"]').click(); });
    expect(host.querySelector('[data-learning-web-open-resource]')).toBeNull();
    await act(async () => { host.querySelector('[data-learning-web-node-select="artifact-only"]').click(); });
    expect(host.querySelector('[data-learning-web-open-resource]')).toBeNull();
    await act(async () => { host.querySelector('[data-learning-web-node-select="openable"]').click(); });
    const open = host.querySelector('[data-learning-web-open-resource="lesson-1"]');
    expect(open).toBeTruthy();
    await act(async () => { open.click(); });
    expect(onOpenResource).toHaveBeenCalledWith({ resourceId: 'lesson-1', nodeId: 'openable' });
  });

  it('accepts registrySnapshot, marks the current resource in text, and does not retain raw nested payloads', async () => {
    const currentGraph = {
      ...graph,
      nodes: graph.nodes.map((node) => node.id === 'lesson'
        ? { ...node, resourceId: 'lesson-44', unsafeNested: { enormous: 'x'.repeat(50000) } }
        : node),
    };
    const snapshot = { version: 'learning-web-registry/v1', graphs: [{ id: 'unit', graphKind: 'unit-path', graph: currentGraph }] };
    const normalized = Explorer.normalizeInput(snapshot);
    expect(normalized.nodes.find((node) => node.sourceNodeId === 'lesson')).not.toHaveProperty('unsafeNested');
    expect(normalized.nodes.find((node) => node.sourceNodeId === 'lesson')).not.toHaveProperty('original');
    await mount(null, { registrySnapshot: snapshot, currentResourceId: 'lesson-44' });
    const current = host.querySelector('[data-current-resource-label]');
    expect(current.textContent).toContain('Current resource');
    expect(current.closest('li').querySelector('button').getAttribute('aria-current')).toBe('true');
    expect(host.querySelector('[data-current-resource="true"]')).toBeTruthy();
  });

  it('renders source-specific edge evidence and only its safe provenance links', async () => {
    const unified = {
      version: 'acg/v1', title: 'Unified Learning Web', meta: { learningWeb: { graphKind: 'learning-web' } },
      nodes: [
        { id: 'a', label: 'Standard', type: 'standard', learningWeb: { sourceGraphKinds: ['alignment-map'] } },
        { id: 'b', label: 'Lesson', type: 'lesson', learningWeb: { sourceGraphKinds: ['alignment-map'] } },
      ],
      edges: [{ id: 'ab', fromId: 'a', toId: 'b', type: 'alignedTo', learningWeb: {
        sourceGraphKinds: ['alignment-map'], sourceDetails: [{ graphKind: 'alignment-map', title: 'Alignment audit', provider: 'Teacher review', evidence: 'Explicit artifact evidence.', provenance: { provider: 'District audit', sourceUrl: 'https://example.test/audit' } }]
      } }],
    };
    await mount(unified);
    expect(host.querySelector('[data-learning-web-edge-row="ab"]').textContent).toContain('Teacher review');
    await act(async () => { host.querySelector('[data-learning-web-edge-select="ab"]').click(); });
    const detail = host.querySelector('section[id$="-detail"]');
    expect(detail.textContent).toContain('Source-specific evidence');
    expect(detail.textContent).toContain('Explicit artifact evidence.');
    expect(detail.querySelector('a[href="https://example.test/audit"]')).toBeTruthy();
  });

  it('isolates every ancestor, recovers stray Tab focus, and routes Escape only to the top modal', async () => {
    const bodyPeer = document.createElement('button');
    bodyPeer.textContent = 'Body peer';
    const outer = document.createElement('div');
    const outerPeer = document.createElement('button');
    outerPeer.textContent = 'Outer peer';
    const middle = document.createElement('div');
    const middlePeer = document.createElement('button');
    middlePeer.textContent = 'Middle peer';
    const deepHost = document.createElement('div');
    middle.append(middlePeer, deepHost);
    outer.append(outerPeer, middle);
    document.body.append(bodyPeer, outer);
    host = outer;
    const firstClose = vi.fn();
    root = ReactDOMClient.createRoot(deepHost);
    await act(async () => { root.render(React.createElement(Explorer.View, { graph, onClose: firstClose })); });
    await act(async () => { await new Promise((resolvePromise) => setTimeout(resolvePromise, 0)); });
    expect(middlePeer.hasAttribute('inert')).toBe(true);
    expect(outerPeer.hasAttribute('inert')).toBe(true);
    expect(bodyPeer.hasAttribute('inert')).toBe(true);

    bodyPeer.focus();
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); });
    expect(document.activeElement).toBe(deepHost.querySelector('button[aria-label="Close Learning Web Explorer"]'));

    const secondHost = document.createElement('div');
    document.body.appendChild(secondHost);
    const secondRoot = ReactDOMClient.createRoot(secondHost);
    const secondClose = vi.fn();
    await act(async () => { secondRoot.render(React.createElement(Explorer.View, { graph, onClose: secondClose })); });
    await act(async () => { await new Promise((resolvePromise) => setTimeout(resolvePromise, 0)); });
    const secondDialog = secondHost.querySelector('[role="dialog"]');
    const results = await axe.run(secondDialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations).toEqual([]);
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(secondClose).toHaveBeenCalledTimes(1);
    expect(firstClose).not.toHaveBeenCalled();
    act(() => secondRoot.unmount());
    secondHost.remove();
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(firstClose).toHaveBeenCalledTimes(1);

    act(() => root.unmount()); root = null;
    expect(middlePeer.hasAttribute('inert')).toBe(false);
    expect(outerPeer.hasAttribute('inert')).toBe(false);
    expect(bodyPeer.hasAttribute('inert')).toBe(false);
    outer.remove(); host = null;
    bodyPeer.remove();
  });

  it('provides modal close, Escape, focus restore, and a populated axe-clean structure', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open explorer';
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const priorBodyOverflow = document.body.style.overflow;
    await mount(graph, { onClose });
    await act(async () => { await new Promise((resolvePromise) => setTimeout(resolvePromise, 0)); });
    expect(document.body.style.overflow).toBe('hidden');
    const dialog = host.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('data-learning-web-modal-overlay')).toBe('true');
    expect(dialog.style.position).toBe('fixed');
    expect(dialog.style.inset).toMatch(/^0(?:px)?$/);
    expect(dialog.style.width).toBe('100%');
    expect(dialog.style.height).toBe('100%');
    expect(dialog.style.maxWidth).toBe('100vw');
    expect(dialog.style.maxHeight).toBe('100vh');
    expect(dialog.style.overflowY).toBe('auto');
    expect(Number(dialog.style.zIndex)).toBeGreaterThan(1000000);
    expect(dialog.style.padding).toBeTruthy();
    // Was: expect(...).toContain('var(--background'). That assertion pinned the defect.
    // Reading the surface colour from a CSS custom property meant the modal inherited
    // whatever the embedding page defined, and in Gemini Canvas that resolved
    // transparent: the overlay painted nothing and the explorer's contents appeared on
    // top of the still-visible page. The surface must be opaque and self-defined.
    // Full coverage in tests/learning_web_explorer_tokens.test.js.
    expect(dialog.style.background).toBe('rgb(248, 250, 252)'); // #f8fafc, jsdom-normalised
    expect(dialog.style.background).not.toContain('var(');
    expect(document.activeElement.getAttribute('aria-label')).toBe('Close Learning Web Explorer');
    const results = await axe.run(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations).toEqual([]);
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount()); root = null;
    expect(document.body.style.overflow).toBe(priorBodyOverflow);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('degrades safely for empty and invalid input while retaining canonical views', async () => {
    await mount(null);
    expect(host.textContent).toContain('No Learning Web connections are available yet.');
    expect(host.textContent).toContain('No nodes to list.');
    expect(host.querySelector('table')).toBeTruthy();
    expect(host.querySelector('svg')).toBeNull();
    act(() => root.unmount()); root = null;
    host.remove(); host = null;

    await mount({ version: 'acg/v2', nodes: [], edges: [] });
    expect(host.textContent).toContain('not an acg/v1 graph');
    expect(host.textContent).toContain('No Learning Web connections are available yet.');
  });
});
