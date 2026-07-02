// Golden/contract tests for concept_graph_engine_module.js (acg/v1).
//
// STEP 0 of the reusable-engine extraction (docs/concept_graph_engine_design.md).
// The non-negotiable property is LOSSLESS round-trip: existing saved data (Throughline
// units in project JSON, Visual-Organizer concept maps in csState) must convert to acg
// and back BYTE-FOR-MEANING identical, or flipping any surface onto the engine corrupts
// saved work. Also pins the a11y spine (deriveOutline = Kahn topo-sort) and the
// semantic-axis projector so the "3D meaning" stays reproducible/testable.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let E;
beforeAll(() => {
  const src = readFileSync(resolve(process.cwd(), 'concept_graph_engine_module.js'), 'utf8');
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.ConceptGraphEngine;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  E = window.AlloModules.ConceptGraphEngine;
  if (!E) throw new Error('ConceptGraphEngine did not register (anchor changed?)');
});

function sampleUnit() {
  return {
    schemaVersion: 1, generator: 'throughline@1', minAppSchema: 1,
    unitId: 'tl_x', sourceUnitId: 'u_fix', title: 'The Water Cycle', essentialQuestion: 'How does water recycle?',
    author: '', license: null, parentUnitId: null, forkedFrom: null,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    nodes: [
      { nodeId: 'n1', lessonId: 'h1', x: 80, y: 120, description: 'Hook.', role: '', status: 'draft', category: 'Acquire' },
      { nodeId: 'n2', lessonId: 'h2', x: 350, y: 120, description: 'Terms.', role: '', status: 'draft', category: 'Make-Meaning' },
      { nodeId: 'n3', lessonId: null, x: 620, y: 120, description: '', role: '', status: 'planned', category: null, bundledLessonIds: ['h3', 'h4'] },
    ],
    edges: [{ from: 'n1', to: 'n2', type: 'sequence' }, { from: 'n2', to: 'n3', type: 'prerequisite' }],
  };
}

function sampleConceptMap() {
  return {
    nodes: [
      { id: 'm', x: 350, y: 50, text: 'Photosynthesis', type: 'main', colorVariant: 0 },
      { id: 'a', x: 100, y: 200, text: 'Light reactions', type: 'branch', colorVariant: 1 },
      { id: 'b', x: 600, y: 200, text: 'Calvin cycle', type: 'branch', colorVariant: 2 },
    ],
    edges: [
      { id: 'e1', fromId: 'm', toId: 'a', style: 'dashed', color: '#334155', status: null },
      { id: 'e2', fromId: 'm', toId: 'b' },
    ],
    structureType: 'Mind Map',
  };
}

describe('ConceptGraphEngine — lossless round-trip (the load-bearing guarantee)', () => {
  it('Throughline unit → acg → Throughline unit is identical', () => {
    const u = sampleUnit();
    const back = E.toThroughlineUnit(E.fromThroughlineUnit(u));
    expect(back).toEqual(u);
  });

  it('Visual-Organizer concept map → acg → concept map is identical', () => {
    const cm = sampleConceptMap();
    const back = E.toConceptMap(E.fromConceptMap(cm.nodes, cm.edges, cm.structureType));
    expect(back).toEqual(cm);
  });

  it('fromThroughlineUnit produces canonical acg fields (id/fromId/toId/layers)', () => {
    const g = E.fromThroughlineUnit(sampleUnit());
    expect(g.version).toBe('acg/v1');
    expect(g.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    expect(g.edges).toEqual([
      { fromId: 'n1', toId: 'n2', type: 'sequence' },
      { fromId: 'n2', toId: 'n3', type: 'prerequisite' },
    ]);
    expect(g.layers.map((l) => l.key)).toEqual(['Acquire', 'Make-Meaning', null]); // n3 is uncategorized
  });
});

describe('ConceptGraphEngine — deriveOutline (the a11y reading spine)', () => {
  it('linear chain reads in teaching order', () => {
    const g = E.fromThroughlineUnit(sampleUnit());
    const o = E.deriveOutline(g);
    expect(o.hasCycle).toBe(false);
    expect(o.order).toEqual(['n1', 'n2', 'n3']);
  });

  it('detects a cycle and falls back to x-order', () => {
    const g = E.normalizeGraph({
      version: 'acg/v1', nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }],
      edges: [{ fromId: 'a', toId: 'b', type: 'sequence' }, { fromId: 'b', toId: 'a', type: 'sequence' }],
    });
    const o = E.deriveOutline(g);
    expect(o.hasCycle).toBe(true);
    expect(o.order).toEqual(['a', 'b']);   // x-order fallback
  });

  it('ties broken by x then y (matches Throughline tiebreak)', () => {
    const g = { version: 'acg/v1', nodes: [
      { id: 'late', x: 300, y: 0 }, { id: 'early', x: 50, y: 0 }, { id: 'mid', x: 50, y: 200 },
    ], edges: [] };
    expect(E.deriveOutline(g).order).toEqual(['early', 'mid', 'late']);
  });
});

describe('ConceptGraphEngine — adaptGenerated (Gemini Stage-1 graph → acg)', () => {
  it('builds root + branch + item nodes and elaborates/sequence edges', () => {
    const g = E.adaptGenerated({
      main: 'Ecosystems',
      structureType: 'Mind Map',
      branches: [
        { title: 'Producers', items: ['Plants', 'Algae'], connectsTo: [1] },
        { title: 'Consumers', items: ['Herbivores'] },
      ],
    });
    expect(g.title).toBe('Ecosystems');
    // root + 2 branches + 3 items
    expect(g.nodes.length).toBe(6);
    expect(g.nodes[0]).toMatchObject({ id: 'root', type: 'main', label: 'Ecosystems' });
    // root→branch + branch→item elaborates (2 + 3 = 5) plus 1 connectsTo sequence edge
    const seq = g.edges.filter((e) => e.type === 'sequence');
    expect(seq).toEqual([{ id: 'e_ct0_1', fromId: 'b0', toId: 'b1', type: 'sequence' }]);
    expect(g.edges.filter((e) => e.type === 'elaborates').length).toBe(5);
  });

  it('handles {text} object items (seeded/template organizers) without stringifying the object', () => {
    const g = E.adaptGenerated({ main: 'T', branches: [{ title: 'S', items: [{ text: 'From a template' }, 'Plain'] }] });
    const labels = g.nodes.filter((n) => n.type === 'item').map((n) => n.label);
    expect(labels).toEqual(['From a template', 'Plain']);
  });
});

describe('ConceptGraphEngine — normalizeGraph routing + idempotence', () => {
  it('is idempotent on an acg graph', () => {
    const g = E.fromThroughlineUnit(sampleUnit());
    expect(E.normalizeGraph(g)).toBe(g);   // returns the same object
  });
  it('routes a throughline unit, a concept map, and a generated graph', () => {
    expect(E.normalizeGraph(sampleUnit()).nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    const cm = sampleConceptMap();
    expect(E.normalizeGraph(cm).nodes.map((n) => n.id)).toEqual(['m', 'a', 'b']);
    expect(E.normalizeGraph({ main: 'X', branches: [{ title: 'Y', items: [] }] }).title).toBe('X');
  });
});

describe('ConceptGraphEngine — semantic-axis Gemini prompt', () => {
  it('buildSemanticGraphPrompt lists node ids, asks for 0..1 axes, and offers existing strands', () => {
    const g = E.fromThroughlineUnit(sampleUnit());
    g.nodes[0].label = 'Hook lesson'; g.nodes[1].label = 'Terms lesson';
    const p = E.buildSemanticGraphPrompt(g, { topic: 'Water Cycle' });
    expect(p).toMatch(/Water Cycle/);
    expect(p).toMatch(/id "n1": Hook lesson/);
    expect(p).toMatch(/0\.0 to 1\.0/);
    expect(p).toMatch(/Acquire/);           // existing strand offered as a z option
    expect(p).toMatch(/Return ONLY JSON/);
  });

  it('parseSemanticGraph tolerates code fences, clamps x/y to 0..1, keeps z label', () => {
    const text = '```json\n{ "axes": { "x": {"label":"seq"} }, "nodes": [ { "id":"n1", "axisValues": { "x": 1.7, "y": -0.3, "z": "Acquire" } } ] }\n```';
    const out = E.parseSemanticGraph(text);
    expect(out.axes).toEqual({ x: { label: 'seq' } });
    expect(out.nodes).toEqual([{ id: 'n1', axisValues: { x: 1, y: 0, z: 'Acquire' } }]);
  });

  it('parseSemanticGraph returns empty on junk (no throw)', () => {
    expect(E.parseSemanticGraph('not json at all')).toEqual({ axes: null, nodes: [] });
  });

  it('layoutWithGemini merges AI axisValues onto matching nodes and sets axes', async () => {
    const g = E.fromThroughlineUnit(sampleUnit());
    const fakeGemini = async () => JSON.stringify({
      axes: { x: { label: 'seq' }, z: { label: 'strand', categories: ['Acquire', 'Make-Meaning'] } },
      nodes: [
        { id: 'n1', axisValues: { x: 0, y: 0.2, z: 'Acquire' } },
        { id: 'n2', axisValues: { x: 1, y: 0.8, z: 'Make-Meaning' } },
      ],
    });
    const merged = await E.layoutWithGemini(g, fakeGemini, { topic: 'Water Cycle' });
    expect(merged.axes.z.categories).toEqual(['Acquire', 'Make-Meaning']);
    expect(merged.nodes[0].axisValues).toEqual({ x: 0, y: 0.2, z: 'Acquire' });
    expect(merged.nodes[1].axisValues).toEqual({ x: 1, y: 0.8, z: 'Make-Meaning' });
    // and the renderer can now project those into real depth
    const projected = E.project(merged, { width: 1000, height: 800, planeGap: 300 });
    expect(projected.nodes[0].z).not.toBe(projected.nodes[1].z);
  });

  it('layoutWithGemini rejects when callGemini is missing', async () => {
    await expect(E.layoutWithGemini(E.emptyGraph(), null)).rejects.toThrow();
  });
});

describe('ConceptGraphEngine — project (semantic axes → coordinates)', () => {
  it('maps normalized ordinal axes to pixels and categorical z to discrete planes', () => {
    const g = {
      version: 'acg/v1',
      axes: { z: { kind: 'categorical', categories: ['Bio', 'Chem'] } },
      nodes: [
        { id: 'p', x: 0, y: 0, z: 0, category: 'Bio', axisValues: { x: 0.5, y: 0.25, z: 'Bio' } },
        { id: 'q', x: 0, y: 0, z: 0, category: 'Chem', axisValues: { x: 1.0, y: 1.0, z: 'Chem' } },
      ],
      edges: [], layers: [],
    };
    const out = E.project(g, { width: 1000, height: 800, planeGap: 300 });
    expect(out.nodes[0]).toMatchObject({ x: 500, y: 200, z: 0 });    // Bio plane index 0
    expect(out.nodes[1]).toMatchObject({ x: 1000, y: 800, z: 300 }); // Chem plane index 1 * 300
  });
  it('leaves nodes without axisValues untouched (manual-drag/legacy coords preserved)', () => {
    const g = { version: 'acg/v1', nodes: [{ id: 'd', x: 42, y: 99, z: 0 }], edges: [], layers: [] };
    expect(E.project(g).nodes[0]).toMatchObject({ x: 42, y: 99 });
  });
});

describe('ConceptGraphEngine — arrangements (persistable 3D placement + constrained editing)', () => {
  it('extractArrangement ↔ applyArrangement round-trips axisValues + categories + axes', () => {
    const g = {
      version: 'acg/v1',
      axes: { z: { kind: 'categorical', categories: ['Bio'] } },
      nodes: [
        { id: 'a', x: 0, y: 0, z: 0, category: 'Bio', axisValues: { x: 0.2, y: 0.4, z: 'Bio' } },
        { id: 'b', x: 5, y: 5, z: 0, category: null },
      ],
      edges: [], layers: [],
    };
    const arr = E.extractArrangement(g);
    expect(arr.axisValues.a).toEqual({ x: 0.2, y: 0.4, z: 'Bio' });
    expect(arr.categories).toEqual({ a: 'Bio' });
    expect(arr.axes).toEqual(g.axes);
    // apply onto a fresh copy that has no placement — the persisted meaning returns
    const bare = { version: 'acg/v1', nodes: [{ id: 'a', x: 0, y: 0, z: 0, category: null }, { id: 'b', x: 5, y: 5, z: 0, category: null }], edges: [], layers: [] };
    const applied = E.applyArrangement(bare, arr);
    expect(applied.nodes[0].axisValues).toEqual({ x: 0.2, y: 0.4, z: 'Bio' });
    expect(applied.nodes[0].category).toBe('Bio');
    expect(applied.nodes[1].axisValues).toBeUndefined();
    expect(applied.axes).toEqual(g.axes);
    expect(applied.layers.map((l) => l.key)).toEqual(['Bio', null]);
  });

  it('applyArrangement ignores unknown ids and a null arrangement', () => {
    const g = E.adaptGenerated({ main: 'X', branches: [{ title: 'S', items: ['i'] }] });
    expect(E.applyArrangement(g, null)).toBe(g);
    const applied = E.applyArrangement(g, { axisValues: { ghost: { x: 1 } }, categories: { ghost: 'Z' } });
    expect(applied.nodes.some((n) => n.id === 'ghost')).toBe(false);
    expect(applied.nodes.map((n) => n.axisValues)).toEqual(g.nodes.map((n) => n.axisValues));
  });

  it('ensureDefaultAxisValues: geometry-less generated graphs get reading-order × tier × strand defaults', () => {
    const g = E.adaptGenerated({ main: 'T', branches: [{ title: 'S1', items: ['a1'] }, { title: 'S2', items: [] }] });
    const withDefaults = E.ensureDefaultAxisValues(g);
    const byId = {}; withDefaults.nodes.forEach((n) => { byId[n.id] = n; });
    expect(byId.root.axisValues.x).toBe(0);            // first in reading order
    expect(byId.b0.axisValues.x).toBeCloseTo(1 / 3);   // second of four
    expect(byId.root.axisValues.y).toBe(0.12);         // main tier
    expect(byId.b0.axisValues.y).toBe(0.45);           // branch tier
    expect(byId.b0_i0.axisValues.y).toBe(0.78);        // item tier
    expect(byId.b0.axisValues.z).toBe('S1');           // strand from category
    // projected result is no longer a degenerate single column
    const proj = E.project(withDefaults, { width: 1000, height: 800, planeGap: 300 });
    expect(new Set(proj.nodes.map((n) => n.x)).size).toBeGreaterThan(1);
  });

  it('ensureDefaultAxisValues leaves real coordinates and existing axisValues alone', () => {
    const manual = { version: 'acg/v1', nodes: [{ id: 'm', x: 42, y: 99, z: 0 }], edges: [], layers: [] };
    expect(E.ensureDefaultAxisValues(manual)).toBe(manual);   // unchanged ⇒ same object
    const scored = { version: 'acg/v1', nodes: [{ id: 's', x: 0, y: 0, z: 0, axisValues: { x: 0.7, y: 0.3 } }], edges: [], layers: [] };
    expect(E.ensureDefaultAxisValues(scored).nodes[0].axisValues).toEqual({ x: 0.7, y: 0.3 });
  });

  it('setNodeStrand moves category + axisValues.z together and refreshes lanes', () => {
    const g = E.ensureDefaultAxisValues(E.adaptGenerated({ main: 'T', branches: [{ title: 'S1', items: [] }, { title: 'S2', items: [] }] }));
    const moved = E.setNodeStrand(g, 'b0', 'S2');
    const n = moved.nodes.find((x) => x.id === 'b0');
    expect(n.category).toBe('S2');
    expect(n.axisValues.z).toBe('S2');
    expect(moved.layers.map((l) => l.key)).toEqual(['S2', null]);   // S1 has no members left; root is uncategorized
    expect(E.setNodeStrand(g, 'ghost', 'S2')).toBe(g);              // unknown id ⇒ unchanged
  });

  it('buildStrandChallenge strips item strands + answer-leaking edges but keeps the strand planes', () => {
    const g = E.ensureDefaultAxisValues(E.adaptGenerated({
      main: 'T',
      branches: [{ title: 'S1', items: ['a', 'b'] }, { title: 'S2', items: ['c'] }],
    }));
    const ch = E.buildStrandChallenge(g);
    expect(ch.targets.slice().sort()).toEqual(['b0_i0', 'b0_i1', 'b1_i0']);
    expect(ch.answerKey).toEqual({ b0_i0: 'S1', b0_i1: 'S1', b1_i0: 'S2' });
    expect(ch.strands).toEqual(['S1', 'S2']);
    const items = ch.graph.nodes.filter((n) => n.type === 'item');
    expect(items.every((n) => n.category === null)).toBe(true);                    // items fall off their strands
    expect(items.every((n) => !n.axisValues || n.axisValues.z === undefined)).toBe(true);
    expect(ch.graph.nodes.find((n) => n.id === 'b0').category).toBe('S1');         // strand planes remain as targets
    expect(ch.graph.edges.some((e) => /_i\d/.test(e.fromId) || /_i\d/.test(e.toId))).toBe(false);   // no giveaway edges
    expect(ch.graph.layers.map((l) => l.key)).toEqual(['S1', 'S2', null]);         // trailing Ungrouped plane holds the items
  });

  it('scoreStrandChallenge classifies correct / incorrect / unplaced and detects completion', () => {
    const key = { i1: 'A', i2: 'B', i3: 'B' };
    const partial = E.scoreStrandChallenge(key, { i1: 'A', i2: 'A' });
    expect(partial).toMatchObject({ total: 3, correct: 1, incorrect: 1, unplaced: 1, complete: false });
    expect(partial.results).toEqual({ i1: 'correct', i2: 'incorrect', i3: 'unplaced' });
    expect(E.scoreStrandChallenge(key, { i1: 'A', i2: 'B', i3: 'B' }).complete).toBe(true);
    expect(E.scoreStrandChallenge({}, {}).complete).toBe(false);   // empty key can never be "won"
  });

  it('nudgeNodeAxis clamps to 0..1 and derives a start from current coords when axisValues are absent', () => {
    const g = { version: 'acg/v1', nodes: [{ id: 'd', x: 1000, y: 600, z: 0 }], edges: [], layers: [] };
    const once = E.nudgeNodeAxis(g, 'd', 'x', 0.06, { width: 2000, height: 1200 });
    expect(once.nodes[0].axisValues.x).toBeCloseTo(0.56);           // 1000/2000 + 0.06 — moves FROM where it is
    const capped = E.nudgeNodeAxis(once, 'd', 'x', 9, {});
    expect(capped.nodes[0].axisValues.x).toBe(1);
    const floored = E.nudgeNodeAxis(once, 'd', 'y', -9, {});
    expect(floored.nodes[0].axisValues.y).toBe(0);
    expect(E.nudgeNodeAxis(g, 'd', 'q', 1)).toBe(g);                // invalid axis ⇒ unchanged
  });
});
