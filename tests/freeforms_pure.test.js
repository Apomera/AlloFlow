// Tests for Free Forms (stem_tool_freeforms.js) — the constructive "World of
// Forms" tool. jsdom has no WebGL, so the 3D stage isn't exercised; what IS
// pinned is the PURE core (window.StemLab.ffPure): the doc model with STABLE
// uids, the doc→graph pipeline through the engine's organizer-shaped layouts,
// the 3D↔sidebar membership reconciliation, and the assessment prompt/parse
// contract (formative JSON coach, never a grader).

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let P, E;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.ConceptGraphEngine;
  loadAlloModule('concept_graph_engine_module.js');
  loadAlloModule('stem_lab/stem_tool_freeforms.js');
  E = window.AlloModules.ConceptGraphEngine;
  P = window.StemLab && window.StemLab.ffPure;
  if (!P || !E) throw new Error('ffPure / engine not exposed');
});

function vennDoc() {
  const d = P.ffNewDoc('Venn Diagram');
  d.groups[0].items = [{ id: 'n10', text: 'Fur', note: '' }, { id: 'n11', text: 'Live birth', note: 'mammal thing' }];
  d.groups[1].items = [{ id: 'n12', text: 'Scales', note: '' }];
  d.groups[2].items = [{ id: 'n13', text: 'Vertebrates', note: '' }];
  d.nextId = 14;
  return d;
}

describe('Free Forms — registration + scaffolds', () => {
  it('registers as a StemLab tool', () => {
    expect(window.StemLab.isRegistered('freeForms')).toBe(true);
    expect(window.StemLab._registry.freeForms.label).toBe('Free Forms');
  });

  it('offers every organizer-shaped layout the engine has, plus Free Space', () => {
    const types = P.FF_SCAFFOLDS.map((s) => s.type);
    expect(types).toContain('free');
    expect(types.filter((x) => x !== 'free').sort()).toEqual(E.STRUCTURE_LAYOUT_TYPES.slice().sort());
    P.FF_SCAFFOLDS.forEach((s) => {
      expect(s.grammar.length, s.type).toBeGreaterThan(10);
      expect(s.starters.length, s.type).toBeGreaterThan(0);
    });
  });

  it('ffNewDoc seeds the form’s starter groups with stable ids', () => {
    const d = P.ffNewDoc('Frayer Model');
    expect(d.groups.map((g) => g.title)).toEqual(['Definition', 'Characteristics', 'Examples', 'Non-Examples']);
    expect(new Set(d.groups.map((g) => g.id)).size).toBe(4);
    expect(d.nextId).toBe(5);
  });
});

describe('Free Forms — doc → graph pipeline', () => {
  it('ffGraphFromDoc keeps user uids, categories, and notes (as summaries)', () => {
    const g = P.ffGraphFromDoc(vennDoc());
    const ids = g.nodes.map((n) => n.id);
    expect(ids).toContain('root');
    expect(ids).toContain('g1');
    expect(ids).toContain('n11');
    const n11 = g.nodes.find((n) => n.id === 'n11');
    expect(n11.category).toBe('Set A');
    expect(n11.summary).toBe('mammal thing');
    expect(g.edges.some((e) => e.fromId === 'g1' && e.toId === 'n11')).toBe(true);
    expect(g.meta.generated.structureType).toBe('Venn Diagram');
  });

  it('ffComposeGraph applies the organizer-shaped layout (venn lens et al.)', () => {
    const g = P.ffComposeGraph(vennDoc(), E);
    expect(g.meta.layout.mode).toBe('venn');
    const shared = g.nodes.find((n) => n.id === 'n13');
    expect(shared.axisValues.x).toBeGreaterThan(0.4);
    expect(shared.axisValues.x).toBeLessThan(0.6);
  });

  it('a saved arrangement wins over the scaffold, and free space skips shaping', () => {
    const d = vennDoc();
    d.arrangement = { axisValues: { n10: { x: 0.97, y: 0.03 } }, categories: {} };
    const g = P.ffComposeGraph(d, E);
    expect(g.nodes.find((n) => n.id === 'n10').axisValues.x).toBe(0.97);
    const free = P.ffNewDoc('free');
    free.groups[0].items = [{ id: 'n2', text: 'x', note: '' }];
    expect(P.ffComposeGraph(free, E).meta.layout).toBeUndefined();
  });
});

describe('Free Forms — 3D ↔ sidebar reconciliation', () => {
  it('moves an item to the group whose title matches its new 3D strand', () => {
    const d = vennDoc();
    const { doc, moved } = P.ffReconcileMembership(d, { n10: 'Shared' });
    expect(moved).toBe(1);
    expect(doc.groups[0].items.map((i) => i.id)).toEqual(['n11']);
    expect(doc.groups[2].items.map((i) => i.id)).toEqual(['n13', 'n10']);
    expect(d.groups[0].items).toHaveLength(2);   // input untouched (pure)
  });

  it('ignores unknown targets and no-op moves (returns the same doc)', () => {
    const d = vennDoc();
    expect(P.ffReconcileMembership(d, { n10: 'Set A' }).doc).toBe(d);
    expect(P.ffReconcileMembership(d, { n10: 'Nope' }).doc).toBe(d);
    expect(P.ffReconcileMembership(d, null).doc).toBe(d);
  });

  it('ffRenameCategory keeps a saved arrangement in step with a group rename', () => {
    const arr = { axisValues: {}, categories: { n10: 'Set A', n12: 'Set B' } };
    const out = P.ffRenameCategory(arr, 'Set A', 'Mammals');
    expect(out.categories).toEqual({ n10: 'Mammals', n12: 'Set B' });
    expect(P.ffRenameCategory(arr, 'Missing', 'X')).toBe(arr);
  });
});

describe('Free Forms — the AI coach contract', () => {
  it('the prompt carries the form grammar, the student’s own words, and the JSON shape', () => {
    const d = vennDoc();
    d.title = 'Mammals vs Reptiles';
    d.nodeArt = { n10: { type: 'object', recipe: { parts: [] } } };
    const p = P.ffBuildAssessPrompt(d);
    expect(p).toContain('shared lens');                       // the venn grammar
    expect(p).toContain('"Live birth" (note: mammal thing)'); // their words + note
    expect(p).toContain('[sculpted]');
    expect(p).toContain('"strengths"');
    expect(p).toContain('No grades, no scores');
    expect(p).toContain('NEVER include the answer');
  });

  it('parses fenced JSON, clamps to 4 per list, rejects junk', () => {
    const good = P.ffParseAssessment('```json\n{"strengths":["a"],"questions":["q1","q2","q3","q4","q5"],"suggestions":[]}\n```');
    expect(good.strengths).toEqual(['a']);
    expect(good.questions).toHaveLength(4);
    expect(P.ffParseAssessment('the model rambled with no json')).toBe(null);
    expect(P.ffParseAssessment('{"strengths":[],"questions":[],"suggestions":[]}')).toBe(null);
  });

  it('ffStats counts groups, ideas, notes, sculptures', () => {
    const d = vennDoc();
    d.nodeArt = { n12: { type: 'object', recipe: {} } };
    expect(P.ffStats(d)).toEqual({ groups: 3, items: 4, notes: 1, sculpted: 1 });
  });
});
