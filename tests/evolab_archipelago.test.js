import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); model = window.StemLab.evoArchipelagoModel; });
const copy = data => JSON.parse(JSON.stringify(data));
const residents = frame => frame.demes.flatMap(d => d.birds.concat(d.plants));
function run(seed = 2026, rounds = 5, overrides = {}) {
  let world = model.create(seed); world.settings = { ...world.settings, ...overrides };
  for (let i = 0; i < rounds; i++) world = model.step(world);
  return world;
}

describe('advanced island genetics and reciprocal selection', () => {
  it('replays the same finite populations exactly without changing the source world', () => {
    const initial = model.create(2026), frozen = JSON.stringify(initial), a = model.step(initial), b = model.step(initial);
    expect(a).toEqual(b); expect(JSON.stringify(initial)).toBe(frozen);
    expect(residents(initial.history[0])).toHaveLength(144);
    expect(new Set(residents(a.history[1]).map(o => o.id)).size).toBe(144);
    expect(a.history[0]).toBe(initial.history[0]);
  });

  it('inherits actual copies from two distinct parents and never changes the parents', () => {
    const world = run(2026, 6, { mutation: 0 });
    for (let g = 1; g <= world.generation; g++) {
      const parents = new Map(residents(world.history[g - 1]).map(o => [o.id, o]));
      for (const child of residents(world.history[g])) {
        expect(child.parents[0]).not.toBe(child.parents[1]);
        child.parents.forEach((id, j) => {
          const p = parents.get(id), event = child.inheritance[j];
          expect(p.species).toBe(child.species); expect(child.genes[j]).toBe(p.genes[event.copy]);
          expect(child.marker[j]).toBe(p.marker[event.markerCopy]); expect(event.delta).toBeNull();
        });
      }
    }
  });

  it('moves each original individual once before simultaneous breeding and records successful gene flow separately', () => {
    const world = run(21, 4, { migration: .4, mutation: 0 });
    for (let g = 1; g <= world.generation; g++) {
      const frame = world.history[g], before = world.history[g - 1], all = frame.round.contributions.flatMap(c => c.members);
      expect(all).toHaveLength(residents(before).length); expect(new Set(all.map(m => m.id)).size).toBe(all.length);
      expect(frame.round.migrants.length).toBeGreaterThan(0);
      frame.round.migrants.forEach(m => {
        const arrived = frame.round.contributions.find(c => c.island === m.to && c.species === m.species);
        expect(arrived.members.find(p => p.id === m.id).from).toBe(m.from); expect(m.to).not.toBe(m.from);
        const actual = frame.demes[m.to][m.species].flatMap(o => o.parents.map((id, j) => id === m.id ? o.marker[j] : null)).filter(v => v !== null);
        expect(m.gametes).toBe(actual.length); expect(m.markerCopies).toEqual([actual.filter(v => v === 0).length, actual.filter(v => v === 1).length]);
      });
    }
    expect(world.history.slice(1).flatMap(f => f.round.migrants).some(m => m.gametes === 0)).toBe(true);
  });

  it('fully isolates demes at zero dispersal, including parent provenance', () => {
    const world = run(99, 5, { migration: 0 });
    for (let g = 1; g <= world.generation; g++) {
      expect(world.history[g].round.migrants).toEqual([]);
      world.history[g].demes.forEach((deme, i) => model.species.forEach(sp => {
        const previous = new Set(world.history[g - 1].demes[i][sp].map(o => o.id));
        expect(deme[sp].every(o => o.parents.every(id => previous.has(id)))).toBe(true);
      }));
    }
  });

  it('makes both species’ breeding weights depend reciprocally on the other inherited trait, with costs and no marker advantage', () => {
    const s = model.create(1).settings, make = (species, v) => ({ species, genes: [v, v], marker: [0, 0] });
    const bird = make('birds', .6), plant = make('plants', .6);
    expect(model.fitness(bird, [make('plants', .1)], .5, s)).toBeGreaterThan(model.fitness(bird, [make('plants', .9)], .5, s));
    expect(model.fitness(plant, [make('birds', .1)], .5, s)).toBeGreaterThan(model.fitness(plant, [make('birds', .9)], .5, s));
    const off = { ...s, reciprocal: false };
    expect(model.fitness(bird, [make('plants', .1)], .5, off)).toBe(model.fitness(bird, [make('plants', .9)], .5, off));
    expect(model.fitness({ ...bird, marker: [1, 1] }, [plant], .5, s)).toBe(model.fitness(bird, [plant], .5, s));
    for (const sp of model.species) for (const v of [0, .5, 1]) expect(model.fitness(make(sp, v), [make(sp === 'birds' ? 'plants' : 'birds', .5)], 0, s)).toBeGreaterThan(0);
  });

  it('removes all trait and partner fitness effects when selection is off, retaining drift and inheritance', () => {
    const s = { ...model.create(5).settings, selection: false };
    for (const sp of model.species) for (const v of [0, .5, 1]) expect(model.fitness({ species: sp, genes: [v, v] }, [], 1, s)).toBe(1);
    const world = run(5, 3, { selection: false, migration: 0, mutation: 0 });
    expect(world.history.slice(1).every(f => f.round.contributions.every(c => c.members.every(m => m.weight === 1)))).toBe(true);
    expect(world.history.slice(1).some(f => f.demes.some((d, i) => model.stats(d.birds).p !== model.stats(world.history[0].demes[i].birds).p))).toBe(true);
  });

  it('computes one-locus marker diversity separately within and across demes, including fixed and empty demes', () => {
    const population = marker => [{ genes: [.5, .5], marker }];
    const frame = { demes: [{ birds: population([0, 0]) }, { birds: population([1, 1]) }, { birds: [] }] };
    expect(model.diversity(frame, 'birds')).toEqual({ rows: [model.stats(frame.demes[0].birds), model.stats(frame.demes[1].birds), model.stats([])], within: 0, pooled: .5, contrast: 1 });
    expect(model.stats(population([0, 1])).H).toBe(.5); expect(model.stats([])).toEqual({ size: 0, mean: null, sd: null, p: null, H: null });
  });

  it('starts a small founding sample without designing its alleles to fit the island', () => {
    const full = [], small = [];
    for (let seed = 1; seed <= 80; seed++) {
      const a = model.create(seed), b = model.create(seed, true);
      expect(b.history[0].demes[2].birds).toHaveLength(6); expect(b.history[0].demes[2].plants).toHaveLength(6);
      expect(b.history[0].demes[0]).toEqual(a.history[0].demes[0]);
      full.push(model.stats(a.history[0].demes[2].birds).p); small.push(model.stats(b.history[0].demes[2].birds).p);
    }
    const variance = values => { const mean = values.reduce((n, v) => n + v, 0) / values.length; return values.reduce((n, v) => n + (v - mean) ** 2, 0) / values.length; };
    expect(variance(small)).toBeGreaterThan(variance(full));
  });

  it('records bounded, bidirectional mutation events and correct allelic provenance', () => {
    const world = run(7, 8, { mutation: .05 }); let positive = 0, negative = 0;
    for (let g = 1; g <= world.generation; g++) {
      const parents = new Map(residents(world.history[g - 1]).map(o => [o.id, o])); let events = 0;
      residents(world.history[g]).forEach(o => o.inheritance.forEach((event, j) => {
        let expected = parents.get(o.parents[j]).genes[event.copy] + (event.delta || 0); expected = expected < 0 ? -expected : expected > 1 ? 2 - expected : expected;
        expect(o.genes[j]).toBe(expected); expect(o.genes[j]).toBeGreaterThanOrEqual(0); expect(o.genes[j]).toBeLessThanOrEqual(1);
        if (event.delta !== null) { events++; if (event.delta > 0) positive++; if (event.delta < 0) negative++; }
      })); expect(events).toBe(world.history[g].round.mutations);
    }
    expect(positive).toBeGreaterThan(0); expect(negative).toBeGreaterThan(0);
  });

  it('validates saved history by deterministic replay and rejects altered genes, parents, movements or settings', () => {
    const world = run(19, 3); expect(model.restore(copy(world))).toEqual(world);
    for (const tamper of [w => w.history[1].demes[0].birds[0].genes[0] = .999, w => w.history[2].demes[0].birds[0].parents[0] = 9999, w => w.rng++, w => w.settings.migration = .7, w => w.history[1].round.migrants[0].gametes++, w => w.history[1].round.settings.rainfall[0] = NaN]) {
      const raw = copy(world); tamper(raw); expect(model.restore(raw)).toBeNull();
    }
    const queued = { ...world, settings: { ...world.settings, rainfall: [.4, .4, .4] } }; expect(model.restore(queued).settings.rainfall).toEqual([.4, .4, .4]);
  });

  it('copies the same real starting populations into isolated or connected futures without consuming expedition RNG', () => {
    const world = run(45, 2), original = JSON.stringify(world), expected = model.step(world), c = model.compare(world, 'migration', 5);
    expect(c.start).toBe(2); expect(c.end).toBe(7); expect(c.a.settings.migration).toBe(0); expect(c.b.settings.migration).toBeGreaterThan(0);
    expect(c.a.history[2]).toBe(world.history[2]); expect(c.b.history[2]).toBe(world.history[2]);
    expect(c.a.history.slice(3).every(f => f.round.migrants.length === 0)).toBe(true);
    expect(JSON.stringify(world)).toBe(original); expect(model.step(world)).toEqual(expected);
    expect(model.compare(world, 'reciprocal', 5).a.settings.reciprocal).toBe(false);
  });

  it('stops at the generation bound and refuses malformed or sparse settings', () => {
    const world = run(5, 40); expect(model.step(world)).toBe(world); expect(model.restore(copy(world))).toEqual(world);
    for (const s of [{}, { ...world.settings, rainfall: Array(3) }, { ...world.settings, selection: 1 }, { ...world.settings, mutation: -.1 }]) expect(model.settings(s)).toBeNull();
  });

  it('labels the fictional primer and advanced model with scientifically necessary distinctions in the visible UI', () => {
    const primer = new DOMParser().parseFromString(renderTool('evoLab', { evoLab: { view: 'livingIsland' } }), 'text/html');
    expect(primer.querySelector('[data-primer-context]').textContent).toContain('fictional organisms, not rabbits');
    expect(primer.querySelector('[data-primer-context]').textContent).toContain('not a measure of genome-wide genetic diversity');
    const advanced = new DOMParser().parseFromString(renderTool('evoLab', { evoLab: { view: 'archipelago' } }), 'text/html');
    expect(advanced.querySelector('[data-archipelago]')).toBeTruthy(); expect(advanced.querySelectorAll('[data-arch-deme]')).toHaveLength(3);
    expect(advanced.body.textContent).toContain('not proof of new species'); expect(advanced.body.textContent).toContain('not survival probabilities');
  });
});
