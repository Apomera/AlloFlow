import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let m;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); m = window.StemLab.evoArchipelagoModel; });
const options = patch => ({ firstBatch: 0, trials: 8, generation: 3, species: 'birds', boat: 'large', ...patch });

describe('repeated matched founder connection studies', () => {
  it('accepts bounded scientific contexts and rejects malformed or impossible plans', () => {
    const p = m.connectionStudyPlan(21, options()); expect(p).toEqual({ version: 1, seed: 21, ...options() });
    for (const patch of [{ firstBatch: -1 }, { firstBatch: 4294967296 }, { trials: 1 }, { trials: 25 }, { trials: 2.5 }, { generation: 0 }, { generation: 6 }, { species: 'rabbits' }, { boat: 'other' }]) expect(m.connectionStudyPlan(21, options(patch))).toBeNull();
    for (const seed of [-1, 4294967296, '21', NaN]) expect(m.connectionStudyPlan(seed, options())).toBeNull();
    expect(m.connectionStudyPlan(21, [])).toBeNull(); expect(m.connectionStudyPlan(21)).toBeNull();
    for (const index of [-1, 8, 1.5, '0']) expect(m.connectionStudyTrial(p, index)).toBeNull(); expect(m.connectionStudyTrial({ ...p, version: 2 }, 0)).toBeNull();
  });
  it('resamples founders across trials while keeping each closed/open founding cohort exactly matched', () => {
    const plan = m.connectionStudyPlan(21, options({ firstBatch: 4, trials: 3 })), cohorts = [], breedingSeeds = [], neighbors = [];
    for (let i = 0; i < plan.trials; i++) {
      const row = m.connectionStudyTrial(plan, i), worlds = m.founderConnections(21, row.batch), proof = m.founderConnectionComparison(worlds, plan.generation, plan.species, plan.boat);
      expect(row.batch).toBe(4 + i); expect(row.index).toBe(i);
      expect(worlds.isolated.worlds.large.history[0]).toEqual(worlds.connected.worlds.large.history[0]);
      cohorts.push(JSON.stringify(worlds.isolated.worlds.large.history[0].demes[2].birds));
      breedingSeeds.push(worlds.isolated.breedingSeed); neighbors.push(JSON.stringify(worlds.isolated.worlds.large.history[0].demes.slice(0,2))); expect(worlds.isolated.breedingSeed).toBe(worlds.connected.breedingSeed);
      for (const key of ['isolated', 'connected']) { const e = proof[key]; expect(row[key]).toEqual({ size: e.cohort.size, p: e.cohort.p, H: e.cohort.H, arrivals: e.arrivalCount, reproducingArrivals: e.reproducingArrivals, incomingCopies: e.incomingCopies, totalCopies: e.totalCopies }); }
      expect(row.diversityDifference).toBe(proof.diversityDifference); expect(row.frequencyDifference).toBe(proof.frequencyDifference);
    }
    expect(new Set(cohorts).size).toBe(3);
    expect(new Set(breedingSeeds).size).toBe(3); expect(new Set(neighbors).size).toBe(1);
  });
  it('summarizes actual full precision paired differences and finds both supporting and challenging outcomes', () => {
    const p = m.connectionStudyPlan(21, options()), rows = Array.from({ length: p.trials }, (_, i) => m.connectionStudyTrial(p, i)), summary = m.connectionStudySummary(rows), differences = rows.map(r => r.connected.H - r.isolated.H);
    expect(summary.difference.values).toEqual(differences); expect(summary.difference.mean).toBe(differences.reduce((a,b) => a+b, 0) / 8); expect(summary.difference.min).toBe(Math.min(...differences)); expect(summary.difference.max).toBe(Math.max(...differences)); expect(summary.lower + summary.equal + summary.higher).toBe(8); expect(summary.lower).toBeGreaterThan(0); expect(summary.higher).toBeGreaterThan(0);
    expect(summary.difference.mean).toBeCloseTo(summary.connected.mean - summary.isolated.mean, 12);
  });
  it('excludes undefined comparisons and classifies equality before any display rounding', () => {
    const row = (difference, H) => ({ diversityDifference: difference, isolated: { H }, connected: { H } });
    const s = m.connectionStudySummary([row(null, null), row(0, 0), row(.000001, .3), row(-.000001, .3)]);
    expect(s.difference).toMatchObject({ count: 3, total: 4, mean: 0, min: -.000001, max: .000001 }); expect([s.lower, s.equal, s.higher]).toEqual([1,1,1]);
  });
  it('replays wrapped uint32 batch recipes without changing expedition history or its future randomness', () => {
    const w = m.step(m.create(21)), before = JSON.stringify(w), future = m.step(w), p = m.connectionStudyPlan(21, options({ firstBatch: 4294967295, trials: 2, species: 'plants', boat: 'small', generation: 5 }));
    const rows = [m.connectionStudyTrial(p,0),m.connectionStudyTrial(p,1)]; expect(rows.map(r => r.batch)).toEqual([4294967295,0]); expect(rows).toEqual([m.connectionStudyTrial(JSON.parse(JSON.stringify(p)),0),m.connectionStudyTrial(p,1)]); expect(JSON.stringify(w)).toBe(before); expect(m.step(w)).toEqual(future);
  });
  it('restores only bounded recipes and original predictions, discarding fabricated outcomes', () => {
    const plan = m.connectionStudyPlan(21, options()), raw = { version: 1, plan: { ...plan, fabricated: 99 }, complete: true, prediction: 'higher', reflection: 'r'.repeat(5000), rows: [{ diversityDifference: 999 }], summary: { mean: 999 } };
    expect(m.restoreConnectionStudy(raw)).toEqual({ version: 1, plan, complete: true, prediction: 'higher', reflection: 'r'.repeat(4000) });
    expect(m.restoreConnectionStudy({ ...raw, version: 2 })).toBeNull(); expect(m.restoreConnectionStudy({ ...raw, plan: { ...plan, version: 2 } })).toBeNull(); expect(m.restoreConnectionStudy({ ...raw, plan: { ...plan, generation: 0 } })).toBeNull(); expect(m.restoreConnectionStudy({ ...raw, prediction: 'always better', complete: 'true' })).toMatchObject({ prediction: null, complete: false });
  });
  it('offers explicit replay of a saved recipe without rendering invented cached outcomes', () => {
    localStorage.setItem('evoLab.archipelago.connection-study.v1', JSON.stringify({ version: 1, plan: m.connectionStudyPlan(21, options()), complete: true, prediction: 'higher', reflection: 'Retained study notes', rows: [{ diversityDifference: 999 }] }));
    const world = m.step(m.create(21)), founders = { version: 1, seed: 21, batch: 0, migration: 0, generation: 3, prediction: '', reasoning: '' }, html = renderTool('evoLab', { evoLab: { view: 'archipelago', archipelago: world, archipelagoFounders: founders } }), dom = new DOMParser().parseFromString(html, 'text/html');
    expect(dom.querySelector('[data-connection-study]').getAttribute('data-connection-study')).toBe('ready'); expect(dom.querySelector('[data-connection-study]').textContent).toContain('Replay saved connection study'); expect(dom.querySelectorAll('[data-repeat-point]')).toHaveLength(0); expect(dom.querySelectorAll('[data-repeat-mean]')).toHaveLength(0);
  });
});
