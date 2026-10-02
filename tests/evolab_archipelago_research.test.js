import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let m;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); m = window.StemLab.evoArchipelagoModel; });
const copy = v => JSON.parse(JSON.stringify(v));
function world(seed = 21, generations = 2, overrides = {}) { let w = m.create(seed); w.settings = { ...w.settings, ...overrides }; for (let i = 0; i < generations; i++) w = m.step(w); return w; }

describe('repeatable 2×2 island field studies', () => {
  it('copies one real starting population into reproducible private futures and preserves the expedition', () => {
    const w = world(), original = JSON.stringify(w), expected = m.step(w), plan = m.researchPlan(w, { replicates: 3 });
    const a = m.researchTrial(w, plan, 0), b = m.researchTrial(w, plan, 0);
    expect(a).toEqual(b); expect(a.conditions.map(c => c.id)).toEqual(['00', '10', '01', '11']);
    a.conditions.forEach(c => {
      const branch = m.researchBranch(w, plan, 0, c.id);
      expect(branch.history[plan.start]).toBe(w.history[w.generation]); expect(branch.privateSeed).toBe(a.seed); expect(branch.privateResearch).toBe(true);
      expect(c.series[0].birds.means).toEqual(w.history[w.generation].demes.map(d => m.stats(d.birds).mean));
      expect(c.series.at(-1).plants.means).toEqual(branch.history[branch.generation].demes.map(d => m.stats(d.plants).mean));
      expect(m.restore(branch)).toBeNull(); expect(m.checkpoint(branch)).toBeNull();
    });
    expect(JSON.stringify(w)).toBe(original); expect(m.step(w)).toEqual(expected);
  });
  it('changes only the two experimental factors while retaining captured rainfall, mutation and selection', () => {
    const w = world(9, 1, { migration: 0, mutation: .05, rainfall: [.9, .3, .1] }), plan = m.researchPlan(w, { replicates: 2, rounds: 3 });
    expect(plan.connected).toBe(.12);
    plan.conditions.forEach(c => {
      const branch = m.researchBranch(w, plan, 0, c.id);
      branch.history.slice(plan.start + 1).forEach(f => {
        expect(f.round.settings).toEqual({ ...w.settings, migration: c.migration, reciprocal: c.reciprocal });
        if (c.migration === 0) expect(f.round.migrants).toEqual([]);
      });
    });
    const linked = world(9, 1, { migration: .3 }); expect(m.researchPlan(linked).connected).toBe(.3);
  });
  it('uses distinct reproducible future seeds and an exact null control when selection is off', () => {
    const w = world(5, 1, { selection: false }), p = m.researchPlan(w, { replicates: 24 }), q = m.researchPlan(w, { replicates: 24, batch: 1 });
    const seeds = Array.from({ length: 24 }, (_, i) => m.researchSeed(p, i)); expect(new Set(seeds).size).toBe(24);
    expect(seeds).not.toEqual(Array.from({ length: 24 }, (_, i) => m.researchSeed(q, i)));
    const trials = [0, 1, 2].map(i => m.researchTrial(w, p, i));
    trials.forEach(t => { expect(t.conditions[0].series).toEqual(t.conditions[2].series); expect(t.conditions[1].series).toEqual(t.conditions[3].series); });
    const s = m.researchSummary(trials, 'trait', 'birds', 1); expect(s.partnersIsolated.mean).toBe(0); expect(s.partnersConnected.mean).toBe(0); expect(s.interaction.mean).toBe(0);
  });
  it('records actual migrant contributions and inherited copies inside a selected private future', () => {
    const w = world(21, 2, { migration: .4, mutation: .05 }), p = m.researchPlan(w, { replicates: 2 }), t = m.researchTrial(w, p, 1), c = t.conditions.find(c => c.id === '11'), branch = m.researchBranch(w, p, 1, '11');
    for (const sp of m.species) {
      expect(c.migrantCopies[sp]).toBe(branch.history.slice(p.start + 1).flatMap(f => f.round.migrants).filter(r => r.species === sp).reduce((n, r) => n + r.gametes, 0));
      for (let island = 0; island < 3; island++) {
        const story = m.story(branch, branch.generation, island, sp);
        story.newborns.forEach(o => o.copies.forEach(copy => {
          const parent = m.find(branch, copy.parent).organism;
          expect(copy.traitBeforeMutation).toBe(parent.genes[copy.traitCopy]); expect(copy.marker).toBe(parent.marker[copy.markerCopy]);
        }));
      }
    }
  });
  it('calculates observed ranges and paired interactions with the correct missing-data denominators', () => {
    function trial(values, index) { return { index, conditions: ['00', '10', '01', '11'].map((id, i) => ({ id, series: [{ birds: { means: [values[i], .5, .5], within: values[i], between: values[i], divergence: values[i] } }] })) }; }
    const trials = [trial([.1, .3, .5, .9], 0), trial([.3, .1, null, .4], 1)], s = m.researchSummary(trials, 'trait', 'birds', 0);
    expect(s.conditions[0]).toMatchObject({ mean: .2, min: .1, max: .3, count: 2, total: 2 });
    expect(s.conditions[2]).toMatchObject({ mean: .5, min: .5, max: .5, count: 1, total: 2 });
    expect(s.connectionWithoutPartners.mean).toBeCloseTo(0, 12); expect(s.connectionWithoutPartners.count).toBe(2);
    expect(s.connectionWithPartners.mean).toBeCloseTo(.4, 12); expect(s.connectionWithPartners.count).toBe(1);
    expect(s.interaction.mean).toBeCloseTo(.2, 12); expect(s.interaction.count).toBe(1);
    expect(m.researchSummary([], 'trait', 'birds', 0).interaction).toMatchObject({ mean: null, min: null, max: null, count: 0 });
  });
  it('replays compact saved checkpoints exactly and detects corrupted histories even when RNG draws are unchanged', () => {
    let w = world(42, 5); w = { ...w, settings: { ...w.settings, rainfall: [.2, .4, .6] } };
    const c = m.checkpoint(w); expect(m.restoreCheckpoint(copy(c))).toEqual(w);
    expect(JSON.stringify(c).length).toBeLessThan(JSON.stringify(w).length / 20);
    for (const corrupt of [x => x.rounds[0].rainfall[0] = .95, x => x.settings.migration = .2, x => x.rng++, x => x.checksum = '00000000', x => x.rounds[1].mutation = -1]) { const bad = copy(c); corrupt(bad); expect(m.restoreCheckpoint(bad)).toBeNull(); }
    expect(c.rounds).not.toBe(w.history); expect(c.settings.rainfall).not.toBe(w.settings.rainfall);
  });
  it('validates a saved study recipe and recalculates outcomes instead of trusting cached result summaries', () => {
    const w = world(), raw = { version: 1, complete: true, source: m.checkpoint(w), options: { replicates: 3, rounds: 5, batch: 4 }, prediction: 'p'.repeat(700), reasoning: 'r'.repeat(7000), trials: [{ fabricated: true }] };
    const restored = m.restoreResearch(raw); expect(restored.prediction).toHaveLength(500); expect(restored.reasoning).toHaveLength(6000); expect(restored.trials).toBeUndefined();
    const base = m.restoreCheckpoint(restored.source), p = m.researchPlan(base, restored.options); expect(m.researchTrial(base, p, 1)).toEqual(m.researchTrial(w, m.researchPlan(w, raw.options), 1));
    for (const options of [{ replicates: 25 }, { replicates: 0 }, { rounds: 6 }, { batch: -1 }, []]) expect(m.restoreResearch({ ...raw, options })).toBeNull();
    expect(m.restoreResearch({ ...raw, complete: false }).complete).toBe(false); expect(m.restoreResearch({ version: 2 })).toBeNull();
  });
  it('bounds private work by the generation limit and rejects mismatched plans and invalid selectors', () => {
    const w = world(5, 39), p = m.researchPlan(w, { replicates: 2 }); expect(p.rounds).toBe(1); expect(m.researchBranch(w, p, 0, '11').generation).toBe(40);
    expect(m.researchPlan(m.step(w))).toBeNull(); expect(m.researchTrial(w, p, 2)).toBeNull(); expect(m.researchBranch(w, p, 0, 'unknown')).toBeNull();
    expect(m.researchTrial(w, { ...p, connected: .4 }, 0)).toBeNull();
    const changed = { ...w, settings: { ...w.settings, mutation: .03 } }; expect(m.researchTrial(changed, p, 0)).toBeNull();
    const c = m.researchTrial(w, p, 0).conditions[0]; expect(m.researchValue(c, 'unknown', 'birds', 0)).toBeNull(); expect(m.researchValue(c, 'trait', 'fish', 0)).toBeNull();
  });
  it('renders a purposeful field-study entry without inventing results or advancing either model', () => {
    const w = world(), frozen = JSON.stringify(w), doc = new DOMParser().parseFromString(renderTool('evoLab', { evoLab: { view: 'archipelago', archipelago: w } }), 'text/html');
    expect(doc.querySelector('[data-arch-research]').getAttribute('data-arch-research')).toBe('ready'); expect(doc.querySelectorAll('.ea-research-design>div')).toHaveLength(4);
    expect(doc.querySelector('.ea-fieldwork-nav')).toBeTruthy(); expect(doc.querySelectorAll('[data-research-point]')).toHaveLength(0);
    expect(doc.querySelector('[data-arch-research]').textContent).toContain('not independent founder samples');
    expect(JSON.stringify(w)).toBe(frozen);
  });
});
