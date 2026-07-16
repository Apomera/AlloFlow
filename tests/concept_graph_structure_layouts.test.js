// Tests for organizer-shaped 3D layouts (engine.applyStructureLayout + the
// renderer's zone geometry).
//
// The contract under test: each known structureType gets its OWN spatial grammar
// instead of the generic strand planes — a Venn's two clusters with the shared
// items in the lens between them, a Story Map's tension arc, T-Chart facing
// walls, … Everything here is pure (no WebGL): layouts are deterministic
// axisValues, and buildScene()'s zones are plain geometry derived from them.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let E, CG3D;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.ConceptGraphEngine;
  delete window.AlloModules.ConceptGraph3D;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_engine_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_3d_module.js'), 'utf8'))();
  E = window.AlloModules.ConceptGraphEngine;
  CG3D = window.AlloModules.ConceptGraph3D;
  if (!E || !CG3D) throw new Error('engine/3d module did not register');
});

function gen(structureType, branches, main = 'Topic') {
  return { main, structureType, branches };
}
const vennGen = () => gen('Venn Diagram', [
  { title: 'Mammals', items: ['Fur', 'Live birth', 'Warm-blooded'] },
  { title: 'Reptiles', items: ['Scales', 'Cold-blooded'] },
  { title: 'Shared', items: ['Vertebrates', 'Lungs'] },
], 'Mammals vs Reptiles');

function laidOut(genData) {
  return E.applyStructureLayout(E.adaptGenerated(genData));
}
function av(g, id) {
  const n = g.nodes.find((x) => x.id === id);
  return n && n.axisValues;
}
function itemsOf(g, category) {
  return g.nodes.filter((n) => n.type === 'item' && n.category === category);
}

describe('applyStructureLayout — Venn Diagram (clusters + shared lens)', () => {
  it('places Set A left, Set B right, Shared between, with numeric z', () => {
    const g = laidOut(vennGen());
    itemsOf(g, 'Mammals').forEach((n) => expect(n.axisValues.x).toBeLessThan(0.35));
    itemsOf(g, 'Reptiles').forEach((n) => expect(n.axisValues.x).toBeGreaterThan(0.65));
    itemsOf(g, 'Shared').forEach((n) => {
      expect(n.axisValues.x).toBeGreaterThan(0.4);
      expect(n.axisValues.x).toBeLessThan(0.6);
    });
    g.nodes.forEach((n) => expect(typeof n.axisValues.z).toBe('number'));
    expect(g.meta.layout.mode).toBe('venn');
    expect(g.meta.layout.zones).toHaveLength(2);
    expect(g.meta.layout.zones[0].includeKeys).toEqual(['Shared']);
  });

  it('is deterministic (same input → identical layout)', () => {
    expect(laidOut(vennGen())).toEqual(laidOut(vennGen()));
  });

  it('handles a 2-branch venn (no Shared) without zones cross-reach', () => {
    const g = laidOut(gen('Venn Diagram', [
      { title: 'A', items: ['a1'] }, { title: 'B', items: ['b1'] },
    ]));
    expect(g.meta.layout.mode).toBe('venn');
    expect(g.meta.layout.zones[0].includeKeys).toEqual([]);
  });

  it('falls back to the generic layout for a degenerate venn (4 branches)', () => {
    const g = laidOut(gen('Venn Diagram', [
      { title: 'A', items: ['x'] }, { title: 'B', items: ['x'] },
      { title: 'C', items: ['x'] }, { title: 'D', items: ['x'] },
    ]));
    expect(g.meta.layout).toBeUndefined();
  });
});

describe('applyStructureLayout — the general contract', () => {
  it('returns the graph UNCHANGED for unknown/absent structureTypes', () => {
    const g = E.adaptGenerated(gen('Memory Palace', [{ title: 'A', items: ['x'] }]));
    expect(E.applyStructureLayout(g)).toBe(g);
    const g2 = E.adaptGenerated(gen('3D Concept Space', [{ title: 'A', items: ['x'] }]));
    expect(E.applyStructureLayout(g2)).toBe(g2);
  });

  it('ensureDefaultAxisValues does not disturb a shaped layout', () => {
    const g = laidOut(vennGen());
    expect(E.ensureDefaultAxisValues(g)).toEqual(g);
  });

  it('a saved arrangement (user drag) still wins on top of the shape', () => {
    const g = laidOut(vennGen());
    const out = E.applyArrangement(g, { axisValues: { b0_i0: { x: 0.99, y: 0.01 } }, categories: {} });
    expect(av(out, 'b0_i0').x).toBe(0.99);
    expect(out.meta.layout.mode).toBe('venn');   // renderer hints survive
  });

  it('onlyIds re-places just that node (strand move flies into the new cluster)', () => {
    const g = laidOut(vennGen());
    const before = av(g, 'b1_i0');
    const moved = E.setNodeStrand(g, 'b0_i0', 'Shared');
    const out = E.applyStructureLayout(moved, { onlyIds: ['b0_i0'] });
    const a = av(out, 'b0_i0');
    expect(typeof a.z).toBe('number');           // not the categorical z setNodeStrand left
    expect(a.x).toBeGreaterThan(0.4);            // now lives in the shared lens
    expect(a.x).toBeLessThan(0.6);
    expect(av(out, 'b1_i0')).toEqual(before);    // everyone else untouched
  });

  it('every registered type lays out its dispatcher-shaped sample', () => {
    const samples = {
      'Structured Outline': [{ title: 'Intro', items: ['a'] }, { title: 'Body', items: ['b', 'c'] }, { title: 'Close', items: ['d'] }],
      'Venn Diagram': vennGen().branches,
      'T-Chart': [{ title: 'L', items: ['a', 'b', 'c'] }, { title: 'R', items: ['d', 'e'] }],
      'Fishbone': [{ title: 'People', items: ['a'] }, { title: 'Methods', items: ['b'] }, { title: 'Machines', items: ['c'] }, { title: 'Materials', items: ['d'] }],
      'Cause and Effect': [{ title: 'Causes', items: ['a', 'b'] }, { title: 'Effects', items: ['c'] }, { title: 'Chain', items: ['d', 'e'] }],
      'Frayer Model': [{ title: 'Definition', items: ['a'] }, { title: 'Characteristics', items: ['b'] }, { title: 'Examples', items: ['c'] }, { title: 'Non-Examples', items: ['d'] }],
      'KWL Chart': [{ title: 'Know', items: ['a'] }, { title: 'Want to Know', items: ['b'] }, { title: 'Learned', items: [] }],
      'See-Think-Wonder': [{ title: 'See', items: ['a'] }, { title: 'Think', items: ['b'] }, { title: 'Wonder', items: ['c'] }],
      'Claim-Evidence-Reasoning': [{ title: 'Claim', items: ['a'] }, { title: 'Evidence', items: ['b', 'c'] }, { title: 'Reasoning', items: ['d'] }],
      'Story Map': [{ title: 'Exposition', items: ['a'] }, { title: 'Rising Action', items: ['b', 'c'] }, { title: 'Climax', items: ['d'] }, { title: 'Falling Action', items: ['e'] }, { title: 'Resolution', items: ['f'] }],
      'Flow Chart': [{ title: 'Step 1', items: ['a'] }, { title: 'Step 2', items: ['b'] }, { title: 'Step 3', items: ['c'] }],
      'Key Concept Map': [{ title: 'A', items: ['a'] }, { title: 'B', items: ['b'] }],
      'Problem Solution': [{ title: 'Fix it', items: ['a'] }, { title: 'Prevent it', items: ['b'] }],
    };
    expect(Object.keys(samples).sort()).toEqual(E.STRUCTURE_LAYOUT_TYPES.slice().sort());
    Object.entries(samples).forEach(([type, branches]) => {
      const g = laidOut(gen(type, branches));
      expect(g.meta.layout, type).toBeTruthy();
      expect(g.meta.layout.structureType, type).toBe(type);
      g.nodes.forEach((n) => {
        expect(typeof n.axisValues?.x, `${type}:${n.id}`).toBe('number');
        expect(n.axisValues.x, `${type}:${n.id}`).toBeGreaterThanOrEqual(0);
        expect(n.axisValues.x, `${type}:${n.id}`).toBeLessThanOrEqual(1);
        expect(typeof n.axisValues.z, `${type}:${n.id}`).toBe('number');
      });
    });
  });
});

describe('applyStructureLayout — type-specific spatial grammar', () => {
  it('Story Map: the climax sits on the summit, linked in narrative order', () => {
    const g = laidOut(gen('Story Map', [
      { title: 'Exposition', items: ['a'] }, { title: 'Rising Action', items: ['b'] },
      { title: 'Climax', items: ['c'] }, { title: 'Falling Action', items: ['d'] }, { title: 'Resolution', items: ['e'] },
    ]));
    const y = (id) => av(g, id).y;   // smaller y = higher on screen
    expect(y('b2')).toBeLessThan(y('b0'));
    expect(y('b2')).toBeLessThan(y('b4'));
    const seq = g.edges.filter((e) => e.id.startsWith('e_layout_'));
    expect(seq.map((e) => `${e.fromId}>${e.toId}`)).toEqual(['b0>b1', 'b1>b2', 'b2>b3', 'b3>b4']);
    // idempotent: re-applying does not duplicate the arc edges
    expect(E.applyStructureLayout(g).edges).toHaveLength(g.edges.length);
  });

  it('T-Chart: two facing walls at fixed x, zones shaped as walls', () => {
    const g = laidOut(gen('T-Chart', [
      { title: 'Left', items: ['a', 'b', 'c', 'd'] }, { title: 'Right', items: ['e', 'f'] },
    ]));
    itemsOf(g, 'Left').forEach((n) => expect(n.axisValues.x).toBe(0.2));
    itemsOf(g, 'Right').forEach((n) => expect(n.axisValues.x).toBe(0.8));
    expect(g.meta.layout.zones.map((z) => z.shape)).toEqual(['wall', 'wall']);
  });

  it('Cause and Effect: causes flow INTO the event, the event flows OUT to effects', () => {
    const g = laidOut(gen('Cause and Effect', [
      { title: 'Causes', items: ['c1', 'c2'] }, { title: 'Effects', items: ['e1'] },
    ]));
    const layout = g.edges.filter((e) => e.id.startsWith('e_layout_'));
    expect(layout.some((e) => e.fromId === 'b0_i0' && e.toId === 'root' && e.type === 'cause')).toBe(true);
    expect(layout.some((e) => e.fromId === 'root' && e.toId === 'b1_i0' && e.type === 'cause')).toBe(true);
  });

  it('Flow Chart: consecutive-step arrows only when the AI gave no connectsTo', () => {
    const plain = laidOut(gen('Flow Chart', [
      { title: 'S1', items: ['a'] }, { title: 'S2', items: ['b'] }, { title: 'S3', items: ['c'] },
    ]));
    expect(plain.edges.filter((e) => e.id.startsWith('e_layout_'))).toHaveLength(2);
    const branched = laidOut(gen('Flow Chart', [
      { title: 'S1', items: ['a'], connectsTo: [1] }, { title: 'S2', items: ['b'] },
    ]));
    expect(branched.edges.filter((e) => e.id.startsWith('e_layout_'))).toHaveLength(0);
  });
});

describe('buildScene — zones replace strand planes in shaped layouts', () => {
  it('Venn: no lane planes; two zone spheres whose lens contains every shared item', () => {
    const g = laidOut(vennGen());
    const scene = CG3D.buildScene(g, {});
    expect(scene.lanePlanes).toEqual([]);
    expect(scene.zones).toHaveLength(2);
    scene.zones.forEach((z) => expect(z.shape).toBe('sphere'));
    const shared = scene.nodes.filter((n) => n.category === 'Shared' && n.type === 'item');
    expect(shared.length).toBeGreaterThan(0);
    shared.forEach((n) => {
      scene.zones.forEach((z) => {
        const d = Math.sqrt((n.sx - z.center.x) ** 2 + (n.sy - z.center.y) ** 2 + (n.sz - z.center.z) ** 2);
        expect(d, `${n.id} inside ${z.key}`).toBeLessThanOrEqual(z.radius);
      });
    });
  });

  it('uses the layout planeGap so free depth actually spreads', () => {
    const g = laidOut(vennGen());
    const scene = CG3D.buildScene(g, {});
    const zs = scene.nodes.map((n) => n.sz);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(100);
  });

  it('classic graphs (no meta.layout) keep their lane planes and gain no zones', () => {
    const g = E.ensureDefaultAxisValues(E.adaptGenerated(gen('3D Concept Space', [
      { title: 'A', items: ['x'] }, { title: 'B', items: ['y'] },
    ])));
    const scene = CG3D.buildScene(g, {});
    expect(scene.lanePlanes.length).toBeGreaterThan(0);
    expect(scene.zones).toEqual([]);
  });

  it('T-Chart: wall zones stand at the columns, facing each other', () => {
    const g = laidOut(gen('T-Chart', [
      { title: 'Left', items: ['a', 'b', 'c', 'd'] }, { title: 'Right', items: ['e', 'f'] },
    ]));
    const scene = CG3D.buildScene(g, {});
    expect(scene.zones.map((z) => z.shape)).toEqual(['wall', 'wall']);
    expect(scene.zones[0].center.x).toBeLessThan(scene.zones[1].center.x);
  });
});
