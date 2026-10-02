import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); model = window.StemLab.evoArchipelagoModel; });
function run(seed, rounds, overrides = {}) {
  let world = model.create(seed); world.settings = { ...world.settings, ...overrides };
  for (let g = 0; g < rounds; g++) world = model.step(world);
  return world;
}
const near = (a, b) => expect(a).toBeCloseTo(b, 12);

describe('recorded generation stories', () => {
  it('accounts for both ordered parent choices instead of normalizing only the first-parent weights', () => {
    expect(model.parentShares([1, 99])).toEqual([.5, .5]);
    const weights = [1, 2, 4], sum = 7, exhaustive = [0, 0, 0];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) {
      const probability = weights[a] / sum * weights[b] / (sum - weights[a]);
      exhaustive[a] += probability / 2; exhaustive[b] += probability / 2;
    }
    const shares = model.parentShares(weights); shares.forEach((p, i) => near(p, exhaustive[i])); near(shares.reduce((n, p) => n + p, 0), 1);
    model.parentShares([1, 1, 1, 1]).forEach(p => near(p, .25));
    expect(model.parentShares([])).toEqual([]); expect(model.parentShares([1])).toEqual([null]);
  });

  it('reconciles every stage with the recorded cohorts without drawing RNG or using queued conditions', () => {
    const world = run(21, 4, { migration: .4, mutation: .05 }), original = JSON.stringify(world);
    const next = model.step(world);
    for (let g = 1; g <= 4; g++) for (let island = 0; island < 3; island++) for (const sp of model.species) {
      const story = model.story(world, g, island, sp), before = model.stats(world.history[g - 1].demes[island][sp]), after = model.stats(world.history[g].demes[island][sp]);
      expect(story.counts.residents - story.counts.departures + story.counts.arrivals).toBe(story.counts.pool);
      near(story.stages[0].trait, before.mean); near(story.stages[0].marker, before.p);
      near(story.stages[5].trait, after.mean); near(story.stages[5].marker, after.p);
      for (const key of ['trait', 'marker']) near(story.stages.slice(1).reduce((n, s) => n + s[key + 'Delta'], 0), after[key === 'trait' ? 'mean' : 'p'] - before[key === 'trait' ? 'mean' : 'p']);
      near(story.stages[5].markerDelta, 0);
      near(story.parents.reduce((n, p) => n + p.expectedShare, 0), 1);
      expect(story.parents.reduce((n, p) => n + p.gametes, 0)).toBe(story.counts.offspring * 2);
      expect(story.settings).toEqual(world.history[g].round.settings);
    }
    const queued = { ...world, settings: { ...world.settings, selection: false, rainfall: [1, 1, 1] } };
    expect(model.story(queued, 2, 1, 'birds')).toEqual(model.story(world, 2, 1, 'birds'));
    expect(JSON.stringify(world)).toBe(original); expect(model.step(world)).toEqual(next);
  });

  it('keeps the expected mean unchanged with selection off while showing actual parent and allele sampling', () => {
    const world = run(5, 4, { selection: false, migration: 0, mutation: 0 }); let samplingChanged = false;
    for (let g = 1; g <= 4; g++) for (let island = 0; island < 3; island++) for (const sp of model.species) {
      const story = model.story(world, g, island, sp);
      near(story.stages[1].traitDelta, 0); near(story.stages[1].markerDelta, 0);
      near(story.stages[2].traitDelta, 0); near(story.stages[2].markerDelta, 0);
      near(story.stages[5].traitDelta, 0);
      if (Math.abs(story.stages[3].markerDelta) + Math.abs(story.stages[4].markerDelta) > 1e-8) samplingChanged = true;
    }
    expect(samplingChanged).toBe(true);
  });

  it('traces each newborn copy to its actual parent, birth-round origin and independently selected marker copy', () => {
    const world = run(21, 3, { migration: .4, mutation: .05 }); let migrantCopies = 0;
    for (let island = 0; island < 3; island++) for (const sp of model.species) {
      const story = model.story(world, 3, island, sp), children = world.history[3].demes[island][sp];
      story.newborns.forEach((birth, i) => birth.copies.forEach((copy, j) => {
        const child = children[i], p = model.find(world, child.parents[j]);
        expect(copy.parent).toBe(child.parents[j]); expect(copy.from).toBe(p.island);
        expect(copy.traitBeforeMutation).toBe(p.organism.genes[child.inheritance[j].copy]); expect(copy.traitAfterMutation).toBe(child.genes[j]);
        expect(copy.marker).toBe(p.organism.marker[child.inheritance[j].markerCopy]);
        expect(copy.markerCopy).toBe(child.inheritance[j].markerCopy);
      }));
      expect(story.routes.reduce((n, r) => n + r.copies, 0)).toBe(children.length * 2);
      expect(story.routes.reduce((n, r) => n + r.A, 0)).toBe(children.reduce((n, o) => n + o.marker[0] + o.marker[1], 0));
      story.routes.forEach(r => {
        expect(r.A + r.a).toBe(r.copies);
        if (r.from !== island) {
          const arrivals = world.history[3].round.migrants.filter(m => m.to === island && m.from === r.from && m.species === sp);
          expect(r.copies).toBe(arrivals.reduce((n, m) => n + m.gametes, 0));
          expect(r.A).toBe(arrivals.reduce((n, m) => n + m.markerCopies[1], 0)); migrantCopies += r.copies;
        }
      });
    }
    expect(migrantCopies).toBeGreaterThan(0);
  });

  it('measures the actual mutation effect after boundary reflection, not the raw mutation draw', () => {
    const initial = model.create(5); initial.settings = { ...initial.settings, selection: false, migration: 0, mutation: 0 };
    initial.history[0].demes[0].birds = initial.history[0].demes[0].birds.slice(0, 2).map(o => ({ ...o, genes: [.99, .99] }));
    const world = model.step(initial), child = world.history[1].demes[0].birds[0];
    child.inheritance[0].delta = .04; child.genes[0] = .97;
    const story = model.story(world, 1, 0, 'birds');
    expect(story.mutationEvents).toBe(1); near(story.stages[5].traitDelta, -.02 / 48);
    expect(story.newborns[0].copies[0].mutation).toBe(.04); expect(story.newborns[0].copies[0].traitAfterMutation).toBe(.97);
  });

  it('uses undefined means for missing reproductive cohorts rather than inventing zero-valued organisms', () => {
    const initial = model.create(1); initial.settings.migration = 0; initial.history[0].demes[0].birds = initial.history[0].demes[0].birds.slice(0, 1);
    const world = model.step(initial), story = model.story(world, 1, 0, 'birds');
    expect(story.counts.pool).toBe(1); expect(story.counts.offspring).toBe(0);
    expect(story.stages.slice(2).every(s => s.trait === null && s.marker === null)).toBe(true);
    expect(story.newborns).toEqual([]); expect(story.routes.every(r => r.copies === 0)).toBe(true);
    for (const args of [[0, 0, 'birds'], [2, 0, 'birds'], [1, 3, 'birds'], [1, 0, 'fish'], [1.1, 0, 'birds']]) expect(model.story(world, ...args)).toBeNull();
  });

  it('renders the expected-versus-recorded distinction and neutral-marker limits with real values', () => {
    const world = run(21, 1, { migration: .4 }), html = renderTool('evoLab', { evoLab: { view: 'archipelago', archipelago: world } });
    const doc = new DOMParser().parseFromString(html, 'text/html'), story = model.story(world, 1, 0, 'birds');
    expect(doc.querySelectorAll('[data-story-stage]')).toHaveLength(6);
    expect(doc.querySelector('[data-generation-story]').textContent).toContain('not a unique causal decomposition');
    story.stages.forEach(s => near(Number(doc.querySelector('[data-story-stage="' + s.key + '"]').getAttribute('data-story-value')), s.trait));
    expect(doc.querySelector('[data-generation-story]').textContent).toContain('after excluding the first');
    expect(doc.querySelectorAll('[data-story-copy]')).toHaveLength(2);
  });
});
