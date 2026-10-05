import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let m;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); m = window.StemLab.evoArchipelagoModel; });
function run(seed, count, cfg) { let w = m.create(seed); w.settings = { ...w.settings, ...cfg }; for (let i = 0; i < count; i++) w = m.step(w); return w; }
const all = f => f.demes.flatMap(d => d.birds.concat(d.plants));

describe('neutral founder voyages and actual copy ancestry', () => {
  it('draws nested six/24-founder groups from the same original pool without changing any expedition', () => {
    const expedition = run(21, 3, { migration: .4 }), original = JSON.stringify(expedition), next = m.step(expedition), a = m.founderStudy(expedition.seed, { batch: 2 });
    expect(m.founderStudy(21, { batch: 2 })).toEqual(a);
    for (const sp of m.species) {
      expect(m.stats(a.source[sp])).toMatchObject({ size: 48, p: .5, H: .5 });
      const small = a.worlds.small.history[0].demes[2][sp], large = a.worlds.large.history[0].demes[2][sp]; expect(small).toHaveLength(6); expect(large).toHaveLength(24); expect(small).toEqual(large.slice(0, 6));
      large.forEach(o => { expect(o.genes).toEqual(a.source[sp][o.sourceIndex].genes); expect(o.marker).toEqual(a.source[sp][o.sourceIndex].marker); });
    }
    for (const island of [0, 1]) expect(a.worlds.small.history[0].demes[island]).toEqual(a.worlds.large.history[0].demes[island]);
    expect(new Set(all(a.worlds.small.history[0]).map(o => o.id)).size).toBe(108);
    expect(JSON.stringify(expedition)).toBe(original); expect(m.step(expedition)).toEqual(next);
    expect(m.founderStudy(21, { batch: 3 }).worlds.small.history[0]).not.toEqual(a.worlds.small.history[0]);
  });
  it('grows both cohorts to 24, keeps all parent weights equal and preserves absent marker letters under isolation', () => {
    const a = m.founderStudy(5);
    for (const key of ['small', 'large']) {
      const w = a.worlds[key]; expect(w.privateResearch).toBe(true); expect(m.checkpoint(w)).toBeNull(); expect(m.restore(w)).toBeNull(); expect(m.researchPlan(w)).toBeNull();
      w.history.slice(1).forEach(f => {
        expect(f.round.migrants).toEqual([]); expect(f.round.mutations).toBe(0); expect(f.round.contributions.every(c => c.members.every(p => p.weight === 1))).toBe(true);
        f.demes.forEach((d, i) => m.species.forEach(sp => { expect(d[sp]).toHaveLength(24); const before = new Set(w.history[0].demes[i][sp].flatMap(o => o.marker)); expect(d[sp].flatMap(o => o.marker).every(v => before.has(v))).toBe(true); }));
      });
    }
  });
  it('traces every step of a chosen trait and marker through actual independently selected parent copies', () => {
    const w = run(7, 8, { migration: .4, mutation: .05 });
    for (const id of all(w.history[8]).filter((_, i) => i % 11 === 0).map(o => o.id)) for (const locus of ['marker', 'trait']) for (const copy of [0, 1]) {
      const t = m.alleleTrail(w, id, copy, locus); expect(t.steps).toHaveLength(9); expect(t.steps.at(-1)).toMatchObject({ id, copy });
      t.steps.forEach((s, g) => {
        const found = m.find(w, s.id), o = found.organism; expect(s.generation).toBe(g); expect(s.island).toBe(found.island); expect(s.value).toBe((locus === 'marker' ? o.marker : o.genes)[s.copy]);
        if (g) { const parent = t.steps[g - 1], e = o.inheritance[s.copy]; expect(s.parent).toBe(parent.id); expect(s.parentCopy).toBe(parent.copy); expect(s.parentCopy).toBe(locus === 'marker' ? e.markerCopy : e.copy); expect(s.crossing).toBe(parent.island !== s.island); expect(s.mutation).toBe(locus === 'trait' ? e.delta : null); }
      });
      if (locus === 'marker') expect(new Set(t.steps.map(s => s.value)).size).toBe(1);
    }
    const trails = all(w.history[8]).flatMap(o => [0, 1].map(c => m.alleleTrail(w, o.id, c, 'trait')));
    expect(trails.some(t => t.crossings > 0)).toBe(true); expect(trails.some(t => t.mutationEvents > 0)).toBe(true);
    expect(all(w.history[8]).some(o => m.alleleTrail(w, o.id, 0, 'trait').founder.copy !== m.alleleTrail(w, o.id, 0, 'marker').founder.copy || m.alleleTrail(w, o.id, 0, 'trait').founder.id !== m.alleleTrail(w, o.id, 0, 'marker').founder.id)).toBe(true);
  });
  it('conserves every census copy and counts ancestry identities separately from allele types', () => {
    const study = m.founderStudy(21);
    for (const key of ['small', 'large']) for (let g = 0; g <= 5; g++) for (const sp of m.species) {
      const w = study.worlds[key], c = m.founderCensus(w, g, 2, sp), pop = w.history[g].demes[2][sp];
      expect(c.total).toBe(pop.length * 2); expect(c.copies.reduce((n, f) => n + f.transmitted, 0)).toBe(c.total); expect(c.origins.reduce((n, v) => n + v, 0)).toBe(c.total);
      expect(c.origins[0] + c.origins[1]).toBe(0); expect(c.localRepresented).toBe(c.distinct); expect(c.distinct).toBeLessThanOrEqual(c.startingLocal);
      expect(c.copies.filter(f => f.marker === 1).reduce((n, f) => n + f.transmitted, 0)).toBe(pop.flatMap(o => o.marker).filter(v => v === 1).length);
      c.copies.forEach(f => { const root = m.find(w, f.id); expect(root.generation).toBe(0); expect(root.organism.marker[f.copy]).toBe(f.marker); });
    }
    const start = m.founderCensus(study.worlds.small, 0, 2, 'birds'); expect(start.distinct).toBe(12); expect(new Set(start.copies.map(f => f.marker)).size).toBeLessThanOrEqual(2);
  });
  it('tracks successful immigrant founder ancestry rather than arrival counts or only the previous island', () => {
    const study = m.founderStudy(21, { migration: .3 });
    const w = study.worlds.small, c = m.founderCensus(w, 5, 2, 'birds'); expect(c.origins[0] + c.origins[1]).toBeGreaterThan(0);
    const manual = [0, 0, 0]; w.history[5].demes[2].birds.forEach(o => [0, 1].forEach(slot => manual[m.alleleTrail(w, o.id, slot, 'marker').founder.island]++)); expect(c.origins).toEqual(manual);
    expect(study.worlds.small.history[0]).toEqual(m.founderStudy(21).worlds.small.history[0]);
  });
  it('bounds compact saved recipes and rejects malformed or unrecorded trace requests', () => {
    const raw = { version: 1, seed: 0, batch: 0, migration: .3, generation: 5, prediction: 'p'.repeat(700), reasoning: 'r'.repeat(5000), fabricated: true }, restored = m.restoreFounders(raw);
    expect(restored.prediction).toHaveLength(500); expect(restored.reasoning).toHaveLength(4000); expect(restored.fabricated).toBeUndefined();
    for (const patch of [{ version: 2 }, { seed: -1 }, { batch: 4294967296 }, { migration: .2 }, { generation: 6 }, { generation: 2.5 }]) expect(m.restoreFounders({ ...raw, ...patch })).toBeNull();
    for (const options of [{ migration: .2 }, { batch: -1 }, []]) expect(m.founderStudy(21, options)).toBeNull();
    const w = run(1, 2, {}); expect(m.alleleTrail(w, 999999, 0, 'marker')).toBeNull(); expect(m.alleleTrail(w, 1, 2, 'marker')).toBeNull(); expect(m.alleleTrail(w, 1, 0, 'unknown')).toBeNull(); expect(m.founderCensus(w, 3, 2, 'birds')).toBeNull();
    const bad = JSON.parse(JSON.stringify(w)), id = bad.history[2].demes[0].birds[0].id; bad.history[2].demes[0].birds[0].parents[0] = 99999; expect(m.alleleTrail(bad, id, 0, 'marker')).toBeNull();
  });
  it('renders an inviting empty voyage without generating private results during render', () => {
    const w = run(21, 3, {}), original = JSON.stringify(w), doc = new DOMParser().parseFromString(renderTool('evoLab', { evoLab: { view: 'archipelago', archipelago: w } }), 'text/html');
    expect(doc.querySelector('[data-founder-voyage]').getAttribute('data-founder-voyage')).toBe('empty'); expect(doc.querySelectorAll('[data-founder-world]')).toHaveLength(0); expect(doc.querySelector('[data-founder-voyage]').textContent).toContain('Six founders can have a higher H than 24'); expect(JSON.stringify(w)).toBe(original);
  });
});
