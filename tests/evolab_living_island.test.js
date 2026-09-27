import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  model = window.StemLab.evoIslandModel;
});
const run = (world, n) => { for (let i = 0; i < n; i++) world = model.step(world); return world; };

describe('Living Island landscape is a separate visual world', () => {
  it('recreates the coastline and elevation from a seed without changing biological replay', () => {
    const world = model.create(2026), before = JSON.stringify(world);
    const landscape = window.StemLab.evoIslandLandscape.create(world.seed);
    const repeat = window.StemLab.evoIslandLandscape.create(world.seed);
    const other = window.StemLab.evoIslandLandscape.create(18);
    const coasts = [], elevations = [];
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * Math.PI * 2;
      coasts.push(landscape.coast(a));
      expect(landscape.coast(a)).toBe(repeat.coast(a));
      expect(landscape.sample(Math.cos(a) * 5, Math.sin(a) * 5)).toEqual(repeat.sample(Math.cos(a) * 5, Math.sin(a) * 5));
      elevations.push(landscape.sample(Math.cos(a) * 4, Math.sin(a) * 4).height);
    }
    expect(Math.max(...coasts) - Math.min(...coasts)).toBeGreaterThan(1.5);
    expect(Math.max(...elevations) - Math.min(...elevations)).toBeGreaterThan(1.5);
    expect(landscape.coast(0)).not.toBe(other.coast(0));
    expect(JSON.stringify(world)).toBe(before);
    expect(run(world, 12)).toEqual(run(model.create(2026), 12));
  });

  it('keeps every creature and its decorative movement on dry ground across seeds and population sizes', () => {
    for (const seed of [0, 1, 18, 2026, 4294967295]) {
      const landscape = window.StemLab.evoIslandLandscape.create(seed);
      for (const count of [1, 36, 60]) for (let i = 0; i < count; i++) {
        const p = landscape.position(i, count, i + 1);
        expect(p.y).toBe(landscape.sample(p.x, p.z).height);
        for (const dx of [-0.65, 0.65]) for (const dz of [-0.65, 0.65]) {
          expect(landscape.sample(p.x + dx, p.z + dz).height).toBeGreaterThan(0.15);
        }
      }
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2, r = landscape.coast(a) * 1.1;
        expect(landscape.sample(Math.cos(a) * r, Math.sin(a) * r * 0.82).height).toBeLessThan(0);
      }
    }
  });
});

describe('Living Island inheritance and reproducibility', () => {
  it('replays an expedition exactly and preserves the original population', () => {
    const first = model.create(42);
    const frozen = JSON.stringify(first);
    const result = run(first, 15);
    expect(result).toEqual(run(model.create(42), 15));
    expect(JSON.stringify(first)).toBe(frozen);
    expect(result.history[0].population).toEqual(first.history[0].population);
    expect(result).not.toEqual(run(model.create(43), 15));
  });

  it('inherits one allele from each distinct surviving parent when mutation is off', () => {
    const world = model.create(314);
    world.mutation = 0;
    const result = run(world, 8);
    result.history.slice(1).forEach((frame, i) => {
      const parents = new Map(result.history[i].population.map(o => [o.id, o]));
      frame.population.forEach(child => {
        expect(child.parents[0]).not.toBe(child.parents[1]);
        child.parents.forEach(id => expect(frame.survivors).toContain(id));
        expect(child.born).toBe(frame.generation);
        expect(parents.has(child.id)).toBe(false);
        model.traits.forEach(key => child.parents.forEach((id, j) => {
          expect(parents.get(id).genes[key]).toContain(child.genes[key][j]);
        }));
        expect(child.mutations).toBe(0);
      });
    });
  });

  it('keeps every allele bounded and never exceeds carrying capacity', () => {
    for (const seed of [0, 1, 2026, 4294967295]) {
      const world = model.create(seed); world.mutation = 0.2;
      run(world, 60).history.forEach(frame => {
        expect(frame.population.length).toBeLessThanOrEqual(60);
        frame.population.forEach(o => model.traits.forEach(key => o.genes[key].forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
        })));
      });
    }
  });

  it('does not manufacture survivors or report a mean after extinction', () => {
    const world = model.create(11);
    world.history[0].population = world.history[0].population.slice(0, 1);
    const result = model.step(world);
    expect(result.history[1].population).toEqual([]);
    expect(result.history[1].stats.means).toEqual({ shade: null, fur: null, legs: null });
    expect(model.step(result)).toBe(result);
  });

  it('makes neutral survival independent of all three traits', () => {
    const pop = model.create(7).history[0].population;
    for (const env of Object.values(model.habitats)) {
      expect(new Set(pop.map(o => model.chance(o, env, false))).size).toBe(1);
      expect(new Set(pop.map(o => model.chance(o, env, true))).size).toBeGreaterThan(1);
    }
  });

  it('shows the expected insulation response to cold across independent seeds', () => {
    const changes = [];
    for (let seed = 1; seed <= 40; seed++) {
      const world = model.create(seed);
      world.living = false; world.habitat = 'snow';
      const result = run(world, 12);
      const last = result.history.at(-1);
      if (last.population.length) changes.push(last.stats.means.fur - world.history[0].stats.means.fur);
    }
    expect(changes.length).toBeGreaterThan(25);
    expect(changes.reduce((a, b) => a + b, 0) / changes.length).toBeGreaterThan(0.06);
  });

  it('records both parents in ancestry and excludes unrelated individuals', () => {
    const result = run(model.create(23), 4);
    const child = result.history[1].population[0];
    expect(model.family(result, child.parents[0]).has(child.id)).toBe(true);
    expect(model.family(result, child.parents[1]).has(child.id)).toBe(true);
    expect(model.family(result, child.id).has(child.parents[0])).toBe(false);
  });

  it('continues an identical RNG sequence after a save round trip', () => {
    const world = run(model.create(234), 9);
    const restored = model.restore(JSON.parse(JSON.stringify(world)));
    expect(restored).toEqual(world);
    expect(run(restored, 5)).toEqual(run(world, 5));
  });

  it('rejects corrupt and unbounded saved state and reconstructs statistics', () => {
    const world = run(model.create(234), 3);
    const bad = JSON.parse(JSON.stringify(world)); bad.history[1].population[0].genes.fur[0] = Infinity;
    expect(model.restore(bad)).toBeNull();
    expect(model.restore({ ...world, generation: 100000 })).toBeNull();
    expect(model.restore({ ...world, habitat: '__proto__' })).toBeNull();
    const bogusStats = JSON.parse(JSON.stringify(world)); bogusStats.history[0].stats.means.fur = 999;
    expect(model.restore(bogusStats).history[0].stats.means.fur).toBeLessThanOrEqual(1);
  });

  it('exports one row per generation with the actual means and settings', () => {
    const world = run(model.create(0), 7);
    const lines = model.csv(world).split('\r\n');
    expect(lines).toHaveLength(9);
    expect(lines[0]).toContain('mean_insulation');
    expect(lines[8].split(',')[9]).toBe(world.history[7].stats.means.fur.toFixed(5));
  });
});

describe('Living Island investigations and recorded evidence', () => {
  it('replays actual survivor identities and unchanged parent genes without consuming randomness', () => {
    const world = run(model.create(2026), 5), saved = JSON.stringify(world);
    const study = window.StemLab.evoIslandStudy;
    for (let gen = 1; gen <= 5; gen++) {
      const transition = study.transition(world, gen);
      expect(transition.parents).toBe(world.history[gen - 1].population);
      expect(transition.offspring).toBe(world.history[gen].population);
      expect(transition.survivors.map(o => o.id)).toEqual(world.history[gen].survivors);
      transition.survivors.forEach(o => expect(transition.parents).toContain(o));
      expect(transition.means.survivors).toEqual(model.stats(transition.survivors).means);
    }
    expect(study.transition(world, 0)).toBeNull();
    expect(study.transition(world, 6)).toBeNull();
    expect(JSON.stringify(world)).toBe(saved);
  });

  it('traces both parents, direct children, and an unrecorded next generation', () => {
    const world = run(model.create(23), 3), study = window.StemLab.evoIslandStudy;
    const child = world.history[1].population[0], family = study.lineage(world, child.id);
    expect(family.parents.map(o => o.id)).toEqual(child.parents);
    expect(family.children.map(o => o.id)).toEqual(world.history[2].population.filter(o => o.parents.includes(child.id)).map(o => o.id));
    family.parents.forEach(o => expect(study.lineage(world, o.id).children).toContain(child));
    expect(study.lineage(world, world.history[3].population[0].id).outcome).toBe('pending');
    expect(study.lineage(world, -1)).toBeNull();
  });

  it('holds mission evidence at the result generation and detects changed experimental conditions', () => {
    let world = model.create(2026); world.habitat = 'snow'; world.living = false;
    const study = window.StemLab.evoIslandStudy;
    const mission = { kind: 'cold', start: 0, founder: 1, habitat: 'snow', selection: true, mutation: 0.06, reviewedAt: null, saved: false };
    world = run(world, 3);
    expect(study.progress(world, mission)).toMatchObject({ ready: false, elapsed: 3, consistent: true });
    world = run(world, 4);
    const progress = study.progress(world, mission);
    expect(progress).toMatchObject({ ready: true, end: 5, target: 5, consistent: true, reviewed: false });
    expect(progress.last).toBe(world.history[5]);
    expect(study.progress(world, { ...mission, reviewedAt: 5 }).reviewed).toBe(true);
    expect(study.progress(world, { ...mission, reviewedAt: 4 }).reviewed).toBe(false);
    const changed = structuredClone(world); changed.history[3].selection = false;
    expect(study.progress(changed, mission).consistent).toBe(false);
    changed.history[3].selection = true; changed.history[3].mutationRate = 0.2;
    expect(study.progress(changed, mission).consistent).toBe(false);
  });

  it('lets early extinction finish an investigation with missing means, never a fabricated result', () => {
    const world = model.create(11), study = window.StemLab.evoIslandStudy;
    world.history[0].population = world.history[0].population.slice(0, 1);
    world.history[0].stats = model.stats(world.history[0].population);
    const ended = model.step(world);
    const mission = { kind: 'family', start: 0, founder: 1, habitat: 'meadow', selection: true, mutation: 0.06, reviewedAt: 1 };
    expect(study.progress(ended, mission)).toMatchObject({ ready: true, end: 1, total: 3, descendants: 0, reviewed: true });
    expect(study.progress(ended, mission).last.stats.means.fur).toBeNull();
  });

  it('validates saved mission bounds, settings and the tracked starting organism', () => {
    const world = run(model.create(23), 7), study = window.StemLab.evoIslandStudy;
    const mission = { kind: 'drift', start: 0, founder: 1, habitat: 'meadow', selection: false, mutation: 0.06, reviewedAt: 5, saved: true };
    expect(study.restoreMission(mission, world)).toEqual(mission);
    for (const change of [{ kind: '__proto__' }, { start: -1 }, { start: 50 }, { founder: 4000 }, { habitat: '__proto__' }, { mutation: Infinity }]) expect(study.restoreMission({ ...mission, ...change }, world)).toBeNull();
    expect(study.restoreMission({ ...mission, reviewedAt: 500 }, world).reviewedAt).toBeNull();
    expect(study.restoreMission({ ...mission, reviewedAt: 500 }, world).saved).toBe(false);
    expect(study.restoreMission({ ...mission, start: 6, founder: world.history[6].population[0].id, reviewedAt: 7 }, world).saved).toBe(false);
    expect(study.restoreMission({ ...mission, habitat: 'snow', selection: true }, world)).toMatchObject({ habitat: 'meadow', selection: false });
  });
});

describe('Living Island field names and paired trials', () => {
  it('keeps names cosmetic, bounded, Unicode-safe and attached only to recorded organisms', () => {
    const names = window.StemLab.evoIslandNames, world = run(model.create(2026), 3), before = JSON.stringify(world);
    const original = names.get(world.seed, 1, {});
    expect(names.get(world.seed, 1, {})).toBe(original);
    expect(names.get(world.seed, 2, {})).not.toBe(original);
    expect(names.clean('  Pebble\n\u202e Explorer  ')).toBe('Pebble Explorer');
    expect(Array.from(names.clean('🌱'.repeat(40)))).toHaveLength(24);
    const clean = names.restore({ 1: 'Pebble', 2: '', 9999: 'Unknown', __proto__: { 3: 'Inherited property' } }, world);
    expect(clean).toEqual({ 1: 'Pebble' });
    expect(names.get(world.seed, 1, clean)).toBe('Pebble');
    expect(names.get(world.seed, 2, clean)).toBe(names.get(world.seed, 2, {}));
    expect(JSON.stringify(world)).toBe(before);
  });

  it('forks identical starting genes and randomness, changes one factor, and never advances the main world', () => {
    const exp = window.StemLab.evoIslandExperiment, world = run(model.create(2026), 2), before = JSON.stringify(world);
    let trial = exp.create(world, 'habitat', 'snow');
    expect(trial.a.history).toBe(world.history);
    expect(trial.b.history).toBe(world.history);
    expect(trial.a.rng).toBe(trial.b.rng);
    expect(trial.a).toMatchObject({ habitat: world.habitat, living: false, selection: world.selection, mutation: world.mutation });
    expect(trial.b).toEqual({ ...trial.a, habitat: 'snow' });
    const start = JSON.stringify(trial);
    const first = exp.step(trial);
    expect(JSON.stringify(trial)).toBe(start);
    trial = first;
    for (let i = 0; i < 9; i++) trial = exp.step(trial);
    expect(trial.round).toBe(5);
    expect(trial.a.generation).toBe(7);
    expect(trial.b.generation).toBe(7);
    expect(exp.step(trial)).toBe(trial);
    expect(JSON.stringify(world)).toBe(before);
    expect(trial.a.history.slice(0, 3)).toEqual(world.history);
    expect(trial.b.history.slice(0, 3)).toEqual(world.history);
  });

  it('isolates trait selection and reproduces identical outcomes when branch settings match', () => {
    const exp = window.StemLab.evoIslandExperiment, world = model.create(23);
    let trial = exp.create(world, 'selection');
    expect(trial.b).toEqual({ ...trial.a, selection: false });
    trial = { ...trial, b: { ...trial.a } };
    for (let i = 0; i < 5; i++) trial = exp.step(trial);
    expect(trial.a).toEqual(trial.b);
    expect(exp.create({ ...world, selection: false }, 'selection').b.selection).toBe(true);
    expect(exp.create(world, 'habitat', 'meadow')).toBeNull();
    expect(exp.create(world, 'habitat', '__proto__')).toBeNull();
    expect(exp.create(world, 'unsupported', 'snow')).toBeNull();
    expect(exp.create(run(world, 56), 'selection')).toBeNull();
  });

  it('records extinction once while the other branch continues, without fabricating later frames', () => {
    const exp = window.StemLab.evoIslandExperiment;
    let trial, world;
    for (let seed = 1; seed < 200; seed++) {
      world = model.create(seed);
      world.history[0].population = world.history[0].population.slice(0, 4);
      world.history[0].stats = model.stats(world.history[0].population);
      world.nextId = 5;
      trial = exp.step(exp.create(world, 'habitat', 'snow'));
      if (Boolean(trial.a.history[1].population.length) !== Boolean(trial.b.history[1].population.length)) break;
    }
    const dead = trial.a.history[1].population.length ? 'b' : 'a', live = dead === 'a' ? 'b' : 'a';
    expect(trial[dead].history[1].population).toHaveLength(0);
    expect(trial[live].history[1].population.length).toBeGreaterThan(0);
    const extinction = trial[dead];
    trial = exp.step(trial);
    expect(trial[dead]).toBe(extinction);
    expect(trial[live].generation).toBe(2);
    const summary = exp.summary(trial);
    expect(summary[dead].frames).toHaveLength(2);
    expect(summary[dead].frames[1].means.fur).toBeNull();
    expect(exp.restore(summary, world)).toEqual(summary);
    summary[dead].frames.push({ ...summary[dead].frames[1], generation: 2 });
    expect(exp.restore(summary, world)).toBeNull();
  });

  it('restores only small, coherent summaries with the original starting evidence', () => {
    const exp = window.StemLab.evoIslandExperiment, world = run(model.create(2026), 3);
    let trial = exp.create(world, 'habitat', 'snow');
    for (let i = 0; i < 5; i++) trial = exp.step(trial);
    const summary = exp.summary(trial);
    expect(exp.restore(JSON.parse(JSON.stringify(summary)), world)).toEqual(summary);
    expect(JSON.stringify(summary).length).toBeLessThan(4000);
    expect(summary.a.frames).toHaveLength(6);
    expect(summary.a.frames[0]).not.toHaveProperty('population');
    for (const change of [{ round: 6 }, { round: 0 }, { start: -1 }, { start: 4 }, { seed: 4 }, { mutation: NaN }, { factor: 'genes' }]) expect(exp.restore({ ...summary, ...change }, world)).toBeNull();
    for (const corrupt of [
      s => { s.a.frames[0].means.fur += 0.1; },
      s => { s.b.habitat = s.a.habitat; },
      s => { s.b.selection = !s.a.selection; },
      s => { s.a.frames[1].means.fur = Infinity; },
      s => { s.a.frames[1].size = 61; },
      s => { s.a.frames[1].generation = 55; },
      s => { s.a.frames.pop(); }
    ]) { const copy = structuredClone(summary); corrupt(copy); expect(exp.restore(copy, world)).toBeNull(); }
  });
});

describe('Living Island integration', () => {
  it('provides a prominent entry point while retaining the existing activities', () => {
    const html = renderTool('evoLab', { evoLab: { view: 'menu' } });
    expect(html).toContain('Explore Living Island');
    expect(html.indexOf('Explore Living Island')).toBeLessThan(html.indexOf('Evolution Mission Control'));
    expect(html).toContain('Selection Sandbox');
  });

  it('renders organism access, evidence, explicit model limits and safe controls without WebGL', () => {
    const html = renderTool('evoLab', { evoLab: { view: 'livingIsland', island: { broken: true } } });
    for (const text of ['Living Island', 'Inspect an organism', 'Generation table', 'Mutation chance', 'does not simulate the full evolutionary process', 'Next generation']) expect(html).toContain(text);
    expect(html).toContain('id="ei-organism"');
  });

  it('resolves a prediction when extinction ends the run before five generations', () => {
    const world = model.create(11);
    world.history[0].population = world.history[0].population.slice(0, 1);
    world.history[0].stats = model.stats(world.history[0].population);
    world.nextId = 2;
    const mean = world.history[0].stats.means.fur;
    const ended = model.step(world);
    const html = renderTool('evoLab', { evoLab: {
      view: 'livingIsland', island: ended,
      islandStudy: { seed: 11, prediction: { start: 0, mean, choice: 'more' } }
    } });
    expect(html).toContain('no mean trait to compare');
    expect(html).not.toContain('Evidence arrives at generation');
  });
});

describe('Living Island read-only observation lenses', () => {
  it('finds actual trait extremes without sorting, changing or resampling the population', () => {
    const world = run(model.create(2026), 4), before = JSON.stringify(world);
    const observation = window.StemLab.evoIslandObservation, population = world.history[4].population;
    for (const trait of model.traits) {
      const result = observation.range(population, trait), values = population.map(o => model.value(o, trait));
      expect(result.minimum).toBe(Math.min(...values));
      expect(result.maximum).toBe(Math.max(...values));
      expect(result.mean).toBeCloseTo(world.history[4].stats.means[trait], 12);
      expect(result.low).toBe(population.find(o => o.id === result.low.id));
      expect(result.high).toBe(population.find(o => o.id === result.high.id));
      expect(result.count).toBe(population.length);
    }
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(model.step(JSON.parse(before)));
  });

  it('handles ties, a single individual, empty cohorts and hostile saved lens choices', () => {
    const observation = window.StemLab.evoIslandObservation;
    const population = model.create(1).history[0].population.slice(0, 2);
    population.forEach(o => { o.genes.fur = [0.25, 0.75]; });
    const range = observation.range(population.slice().reverse(), 'fur');
    expect(range.low.id).toBe(1); expect(range.high.id).toBe(1);
    expect(range.minimum).toBe(range.maximum);
    expect(observation.range([population[1]], 'fur')).toMatchObject({ low: population[1], high: population[1], mean: 0.5, count: 1 });
    expect(observation.range([], 'fur')).toBeNull();
    for (const value of ['__proto__', 'chance', 'constructor', null, {}, 0]) {
      expect(observation.range(population, value)).toBeNull();
      expect(observation.lens(value)).toBe('natural');
    }
    for (const value of model.traits) expect(observation.lens(value)).toBe(value);
  });

  it('tells a recorded story with actual cohorts and undefined means at extinction', () => {
    const observation = window.StemLab.evoIslandObservation;
    const start = model.create(11); start.history[0].population = start.history[0].population.slice(0, 1);
    start.history[0].stats = model.stats(start.history[0].population); start.nextId = 2; start.selection = false;
    const world = model.step(start), before = JSON.stringify(world);
    const transition = window.StemLab.evoIslandStudy.transition(world, 1);
    for (const phase of ['parents', 'survivors', 'offspring']) {
      expect(observation.chapter(world, 1, phase, 'fur')).toMatchObject({ generation: 1, phase, count: transition[phase].length, mean: transition.means[phase].fur, selection: false });
    }
    expect(observation.chapter(world, 1, 'offspring', 'fur').mean).toBeNull();
    expect(observation.chapter(world, 0, 'parents', 'fur')).toBeNull();
    expect(observation.chapter(world, 2, 'parents', 'fur')).toBeNull();
    expect(observation.chapter(world, 1, 'unrecorded', 'fur')).toBeNull();
    expect(observation.chapter(world, 1, 'parents', 'natural')).toBeNull();
    expect(JSON.stringify(world)).toBe(before);
  });
});


describe('Living Island family journeys', () => {
  it('counts two-parent ancestry once and distinguishes future survival from recorded zero', () => {
    const world = model.create(8);
    const make = (id, born, parents) => ({ ...structuredClone(world.history[0].population[0]), id, born, parents });
    world.history = [
      { generation: 0, habitat: 'meadow', population: [make(1, 0, []), make(2, 0, []), make(3, 0, [])], survivors: [] },
      { generation: 1, habitat: 'snow', population: [make(4, 1, [1, 2]), make(5, 1, [3, 1]), make(6, 1, [2, 3])], survivors: [1, 2, 3] },
      { generation: 2, habitat: 'forest', population: [make(7, 2, [4, 5]), make(8, 2, [6, 4])], survivors: [4, 5, 6] },
      { generation: 3, habitat: 'drought', population: [], survivors: [7] }
    ];
    world.generation = 3;
    const before = JSON.stringify(world), study = window.StemLab.evoIslandStudy;
    const journey = study.chronicle(world, 1);
    expect(journey.frames.map(f => f.count)).toEqual([1, 2, 2, 0]);
    expect(journey.frames.map(f => f.breeders)).toEqual([1, 2, 1, null]);
    expect(journey.frames.map(f => f.share)).toEqual([1 / 3, 2 / 3, 1, null]);
    expect(journey.frames[0].nextHabitat).toBe('snow');
    expect(journey.frames[2].members[0]).toBe(world.history[2].population[0]);
    expect(journey.lostAt).toBe(3);
    expect(study.chronicle(world, 5).frames.map(f => f.generation)).toEqual([1, 2, 3]);
    expect(study.chronicle(world, 999)).toBeNull();
    expect(JSON.stringify(world)).toBe(before);
  });

  it('reports a lost lineage while the population continues, without inventing descendants or changing the next generation', () => {
    const world = run(model.create(2026), 8), before = JSON.stringify(world);
    const study = window.StemLab.evoIslandStudy;
    const lost = world.history[0].population.find(o => !world.history[1].population.some(c => c.parents.includes(o.id)));
    expect(lost).toBeTruthy();
    const journey = study.chronicle(world, lost.id);
    expect(journey.lostAt).toBe(1);
    expect(journey.frames.slice(1).every(f => f.count === 0)).toBe(true);
    expect(journey.frames[1].population).toBeGreaterThan(0);
    expect(journey.frames[1].share).toBe(0);
    const current = world.history[world.generation].population[0];
    expect(study.chronicle(world, current.id)).toMatchObject({ lostAt: null, outcome: 'pending', frames: [{ count: 1, breeders: null, nextHabitat: null }] });
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(model.step(JSON.parse(before)));
  });

  it('puts the island before advanced choices and restores an explicitly dismissed introduction', () => {
    const world = model.create(2026);
    const html = renderTool('evoLab', { evoLab: { view: 'livingIsland', island: world } });
    expect(html).toContain('Meet a spriglet');
    expect(html.indexOf('class="ei-board ei-workspace"')).toBeLessThan(html.indexOf('class="ei-investigations"'));
    const restored = renderTool('evoLab', { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, introDismissed: true, trackedId: 1 } } });
    expect(restored).not.toContain('data-discovery-step=');
    expect(restored).toContain('Family journey');
    expect(restored).toContain('Your first discovery');
  });
});


describe('Living Island recorded field reports', () => {
  it('derives actual turnover, trait shifts and a recorded mutation specimen without drawing new randomness', () => {
    const world = run(model.create(2026), 4), before = JSON.stringify(world);
    const report = window.StemLab.evoIslandObservation.briefing(world, 3);
    const a = world.history[2], b = world.history[3];
    expect(report).toMatchObject({ generation: 3, parents: a.population.length, survivors: b.survivors.length, offspring: b.population.length, habitat: b.habitat, selection: b.selection, mutations: b.mutations });
    for (const shift of report.shifts) {
      expect(shift.from).toBe(a.stats.means[shift.trait]);
      expect(shift.to).toBe(b.stats.means[shift.trait]);
      expect(shift.delta).toBe(shift.to - shift.from);
    }
    expect(Math.abs(report.strongest.delta)).toBe(Math.max(...report.shifts.map(s => Math.abs(s.delta))));
    const candidates = b.population.filter(o => o.mutations > 0).sort((a, b) => b.mutations - a.mutations || a.id - b.id);
    expect(report.variant).toBe(candidates[0]);
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(model.step(JSON.parse(before)));
  });

  it('keeps recorded climate and selection separate from pending changes and handles absent mutation or offspring evidence', () => {
    let world = model.create(2026);
    world.mutation = 0; world.selection = false; world.habitat = 'snow'; world.living = false;
    world = model.step(world);
    world.habitat = 'forest'; world.selection = true;
    const read = window.StemLab.evoIslandObservation.briefing;
    expect(read(world, 1)).toMatchObject({ previousHabitat: 'meadow', habitat: 'snow', changedHabitat: true, selection: false, mutations: 0, variant: null });
    for (const generation of [0, -1, 2, 1.5, '1']) expect(read(world, generation)).toBeNull();
    let tiny = model.create(11);
    tiny.history[0].population = tiny.history[0].population.slice(0, 1);
    tiny.history[0].stats = model.stats(tiny.history[0].population); tiny.nextId = 2;
    tiny = model.step(tiny);
    const report = read(tiny, 1);
    expect(report).toMatchObject({ offspring: 0, strongest: null, variant: null, mutations: 0 });
    expect(report.shifts.every(s => s.to === null && s.delta === null)).toBe(true);
    const html = renderTool('evoLab', { evoLab: { view: 'livingIsland', island: tiny } });
    expect(html).toContain('no new trait mean to compare');
    expect(html).not.toContain('Meet this offspring');
  });

  it('makes deterministic tied observations without sorting or relabeling the population', () => {
    const world = run(model.create(2026), 1);
    model.traits.forEach(t => { world.history[0].stats.means[t] = 0.25; world.history[1].stats.means[t] = 0.5; });
    world.history[1].population.forEach(o => { o.mutations = 1; });
    const before = JSON.stringify(world), read = window.StemLab.evoIslandObservation.briefing;
    const expected = Math.min(...world.history[1].population.map(o => o.id));
    expect(read(world, 1).strongest.trait).toBe('shade');
    expect(read(world, 1).variant.id).toBe(expected);
    world.history[1].population.reverse();
    expect(read(world, 1).variant.id).toBe(expected);
    world.history[1].population.reverse();
    expect(JSON.stringify(world)).toBe(before);
  });
});


describe('Living Island records actual allele choices without changing the experiment', () => {
  it.each([
    [0, 4065309506, 757, 0.5673668387452294],
    [42, 1343740481, 701, 0.6017708021158356],
    [2026, 1313251840, 717, 0.27714883579127486],
    [4294967295, 3801042661, 757, 0.7365417422687945]
  ])('preserves the pre-provenance outcome for seed %s', (seed, rng, nextId, shade) => {
    const world = model.create(seed); world.mutation = 0.2;
    const result = run(world, 12);
    expect(result.rng).toBe(rng); expect(result.nextId).toBe(nextId);
    expect(result.history[12].stats.means.shade).toBe(shade);
  });

  it('records both exact parental choices and mutation draws and restores them independently', () => {
    const first = model.create(2026); first.mutation = 0.2;
    const world = run(first, 6);
    let changed = 0;
    for (const frame of world.history.slice(1)) {
      const parents = new Map(world.history[frame.generation - 1].population.map(o => [o.id, o]));
      for (const child of frame.population) {
        let mutations = 0;
        for (const trait of model.traits) child.inheritance[trait].forEach((event, i) => {
          expect([0, 1]).toContain(event.copy);
          let value = parents.get(child.parents[i]).genes[trait][event.copy];
          if (event.delta !== null) {
            expect(Math.abs(event.delta)).toBeLessThanOrEqual(0.14);
            value += event.delta; value = value < 0 ? -value : value > 1 ? 2 - value : value;
            mutations++; changed++;
          }
          expect(child.genes[trait][i]).toBe(value);
        });
        expect(child.mutations).toBe(mutations);
      }
    }
    expect(changed).toBeGreaterThan(0);
    const restored = model.restore(JSON.parse(JSON.stringify(world)));
    expect(restored).toEqual(world);
    expect(restored.history[1].population[0].inheritance).not.toBe(world.history[1].population[0].inheritance);
    expect(model.step(restored)).toEqual(model.step(world));
  });

  it('resumes older saves without inventing their missing inheritance records', () => {
    const world = run(model.create(2026), 3);
    world.history.forEach(f => f.population.forEach(o => delete o.inheritance));
    const restored = model.restore(world);
    expect(restored).toEqual(world);
    expect(restored.history[3].population.every(o => !o.inheritance)).toBe(true);
    const next = model.step(restored);
    expect(next.history[4].population.every(o => o.inheritance)).toBe(true);
    expect(model.restore(next)).toEqual(next);
  });

  it.each(['copy', 'delta', 'result', 'count', 'missing-pair', 'founder'])('rejects a corrupted %s inheritance record', kind => {
    const world = run(model.create(2026), 1), child = world.history[1].population[0];
    if (kind === 'copy') child.inheritance.fur[0].copy = 2;
    if (kind === 'delta') child.inheritance.fur[0].delta = 0.15;
    if (kind === 'result') child.genes.fur[0] = child.genes.fur[0] === 1 ? 0 : 1;
    if (kind === 'count') child.mutations += 1;
    if (kind === 'missing-pair') delete child.inheritance.fur;
    if (kind === 'founder') world.history[0].population[0].inheritance = child.inheritance;
    expect(model.restore(world)).toBeNull();
  });
});


describe('Living Island repeated paired trials', () => {
  const finish = trial => {
    const experiment = window.StemLab.evoIslandExperiment;
    while (!experiment.done(trial)) trial = experiment.step(trial);
    return experiment.summary(trial);
  };

  it('repeats the same starting genes with distinct reproducible streams and preserves the main expedition', () => {
    const experiment = window.StemLab.evoIslandExperiment, repeats = window.StemLab.evoIslandRepeats;
    const world = run(model.create(2026), 3), summary = finish(experiment.create(world, 'habitat', 'snow'));
    const before = JSON.stringify(world), original = JSON.stringify(summary), seeds = new Set([world.rng]);
    for (let i = 1; i <= repeats.limit; i++) {
      const result = repeats.run(world, summary, world.rng, i);
      expect(seeds.has(result.seed)).toBe(false); seeds.add(result.seed);
      expect(result).toEqual(repeats.run(world, summary, world.rng, i));
      let manual = experiment.create({ ...world, rng: result.seed }, 'habitat', 'snow');
      while (!experiment.done(manual)) manual = experiment.step(manual);
      const expected = experiment.summary(manual);
      expect(result).toEqual({ seed: result.seed, round: expected.round, a: expected.a.frames.at(-1), b: expected.b.frames.at(-1) });
      expect(manual.a.history[world.generation].population).toBe(world.history[world.generation].population);
      expect(manual.b.history[world.generation].population).toBe(world.history[world.generation].population);
    }
    expect(JSON.stringify(world)).toBe(before);
    expect(JSON.stringify(summary)).toBe(original);
    expect(repeats.run(world, summary, world.rng, 0)).toBeNull();
    expect(repeats.run(world, summary, world.rng, 6)).toBeNull();
    expect(repeats.run(world, summary, -1, 1)).toBeNull();
    expect(repeats.run(world, { ...summary, round: 1 }, world.rng, 1)).toBeNull();
  });

  it('keeps a selection experiment one-factor-only and restores historical repeats after the main world advances', () => {
    const experiment = window.StemLab.evoIslandExperiment, repeats = window.StemLab.evoIslandRepeats;
    const world = run(model.create(71), 4);
    const summary = finish(experiment.create(world, 'selection'));
    summary.repeats = { version: 1, rng: world.rng, runs: [1,2,3,4,5].map(i => repeats.run(world, summary, world.rng, i)) };
    const restored = experiment.restore(JSON.parse(JSON.stringify(summary)), run(world, 5));
    expect(restored).toEqual(summary);
    expect(restored.repeats).not.toBe(summary.repeats);
    expect(restored.repeats.runs[0].a.means).not.toBe(summary.repeats.runs[0].a.means);
    expect(JSON.stringify(restored).length).toBeLessThan(6500);
    const r = summary.repeats.runs[0];
    const manual = finish(experiment.create({ ...world, rng: r.seed }, 'selection'));
    expect(r.a).toEqual(manual.a.frames.at(-1)); expect(r.b).toEqual(manual.b.frames.at(-1));
  });

  it('recomputes saved repeat evidence and discards corrupted optional repeats while retaining the original comparison', () => {
    const experiment = window.StemLab.evoIslandExperiment, repeats = window.StemLab.evoIslandRepeats, world = model.create(42);
    const summary = finish(experiment.create(world, 'habitat', 'snow'));
    const good = { ...summary, repeats: { version: 1, rng: world.rng, runs: [1,2].map(i => repeats.run(world, summary, world.rng, i)) } };
    expect(experiment.restore(good, world)).toEqual(good);
    for (const corrupt of [
      s => { s.repeats.rng = -1; },
      s => { s.repeats.runs[0].seed += 1; },
      s => { s.repeats.runs[0].a.means.fur += 0.01; },
      s => { s.repeats.runs[0].b.size = 61; },
      s => { s.repeats.runs[0].a.generation = 0; },
      s => { s.repeats.runs.reverse(); },
      s => { s.repeats.runs.push(...s.repeats.runs, ...s.repeats.runs); },
      s => { s.repeats.version = 2; }
    ]) {
      const copy = structuredClone(good); corrupt(copy);
      expect(experiment.restore(copy, world)).toEqual(summary);
    }
  });

  it('includes extinction explicitly and never treats an extinct population as a zero-valued trait', () => {
    const repeats = window.StemLab.evoIslandRepeats;
    const end = (fur, size = 10, generation = 5) => ({ size, generation, means: { shade: fur, fur, legs: fur } });
    const summary = { round: 5, a: { frames: [end(.2)] }, b: { frames: [end(.4)] },
      repeats: { rng: 42, runs: [
        { seed: 1, round: 5, a: end(.6), b: end(.3) },
        { seed: 2, round: 5, a: end(.4), b: end(.4005) },
        { seed: 3, round: 5, a: end(null, 0, 2), b: end(.9) },
        { seed: 4, round: 2, a: end(null, 0, 2), b: end(null, 0, 1) }
      ] } };
    const before = JSON.stringify(summary), data = repeats.observe(summary, 'fur');
    expect(data).toMatchObject({ higher: 1, lower: 1, similar: 1, missing: 2, compared: 3, extinctA: 2, extinctB: 1, min: -30, max: 20 });
    expect(data.mean).toBeCloseTo((20 - 30 + .05) / 3);
    expect(data.rows[3].difference).toBeNull(); expect(data.rows[4].difference).toBeNull();
    expect(JSON.stringify(summary)).toBe(before);
    expect(repeats.observe(summary, 'fitness')).toBeNull();
    const allDead = { round: 1, a: { frames: [end(null, 0, 1)] }, b: { frames: [end(null, 0, 1)] } };
    expect(repeats.observe(allDead, 'fur')).toMatchObject({ mean: null, min: null, max: null, compared: 0, missing: 1 });
  });

  it('records actual extinction endpoints without fabricating later generations in repeats', () => {
    const experiment = window.StemLab.evoIslandExperiment, repeats = window.StemLab.evoIslandRepeats;
    let world = model.create(17);
    world.history[0].population = world.history[0].population.slice(0, 2);
    world.history[0].stats = model.stats(world.history[0].population); world.nextId = 3;
    const summary = finish(experiment.create(world, 'habitat', 'snow'));
    const results = [1,2,3,4,5].map(i => repeats.run(world, summary, world.rng, i));
    expect(results.some(r => !r.a.size || !r.b.size)).toBe(true);
    for (const result of results) {
      for (const key of ['a', 'b']) {
        expect(result[key].generation).toBeLessThanOrEqual(result.round);
        if (!result[key].size) expect(result[key].means).toEqual({ shade: null, fur: null, legs: null });
        else expect(result[key].generation).toBe(5);
      }
    }
    summary.repeats = { version: 1, rng: world.rng, runs: results };
    expect(experiment.restore(summary, world)).toEqual(summary);
  });
});


describe('Living Island survival detective', () => {
  it('preserves the original exact survival formula for every habitat and reveals its shared factors', () => {
    const original = (o, env, selection) => {
      if (!selection) return .68 * env.food;
      const shade = model.value(o, 'shade'), fur = model.value(o, 'fur'), legs = model.value(o, 'legs');
      const camouflage = 1 - Math.abs(shade - env.shade), temperature = 1 - Math.abs(fur - env.cold);
      const escape = .35 + .65 * legs, predation = 1 - env.predators * (1 - (camouflage * .7 + escape * .3));
      const energy = 1 - .13 * legs - .12 * fur * (1 - env.cold);
      return Math.max(.02, Math.min(.95, (.36 + .58 * temperature) * predation * energy * env.food));
    };
    for (const o of model.create(2026).history[0].population) for (const env of Object.values(model.habitats)) for (const selection of [true, false]) {
      expect(model.chance(o, env, selection)).toBe(original(o, env, selection));
      const d = model.survivalDetails(o, env, selection);
      expect(d.chance).toBe(original(o, env, selection));
      expect(d.selection ? Math.max(.02, Math.min(.95, d.thermal * d.predation * d.energy * d.food)) : d.baseline * d.food).toBe(d.chance);
    }
  });

  it('selects actual contrasting residents without changing genes, RNG or original world', () => {
    const detective = window.StemLab.evoIslandDetective, world = model.create(2026), before = JSON.stringify(world);
    const record = detective.create(world), data = detective.observe(world, record);
    const chances = world.history[0].population.map(o => model.chance(o, model.habitats.meadow, true));
    expect(data.rows.map(r => r.details.chance).sort()).toEqual([Math.min(...chances), Math.max(...chances)]);
    expect(data.rows.every(r => r.survived === null && r.offspring === null)).toBe(true);
    expect(data).toMatchObject({ ready: true, complete: false, matched: null });
    expect(detective.advance(world, record)).toBeNull();
    expect(detective.create(world)).toEqual(record);
    expect(JSON.stringify(world)).toBe(before);
  });

  it('runs precisely one real round at a climate boundary, then restores living climate without rerolling', () => {
    const detective = window.StemLab.evoIslandDetective, world = run(model.create(2026), 4), before = JSON.stringify(world);
    const record = { ...detective.create(world), choice: 'a' }, next = detective.advance(world, record);
    const expected = { ...model.step({ ...world, living: false }), living: true };
    expect(next).toEqual(expected);
    expect(next.generation).toBe(5); expect(next.habitat).toBe(world.habitat);
    expect(JSON.stringify(world)).toBe(before);
    expect(detective.advance(next, record)).toBeNull();
    const data = detective.observe(next, record);
    expect(data).toMatchObject({ complete: true, ready: false, consistent: true });
    for (const row of data.rows) {
      expect(row.survived).toBe(next.history[5].survivors.includes(row.organism.id));
      expect(row.offspring).toBe(next.history[5].population.filter(o => o.parents.includes(row.organism.id)).length);
    }
    const later = run(next, 8);
    expect(detective.observe(later, record)).toEqual(data);
    expect(detective.restore(JSON.parse(JSON.stringify(record)), later)).toEqual(record);
  });

  it('keeps neutral chances equal despite different traits and permits survival outcomes to differ', () => {
    const detective = window.StemLab.evoIslandDetective;
    let foundDifferent = false;
    for (let seed = 1; seed <= 10; seed++) {
      const world = { ...model.create(seed), selection: false, habitat: 'drought' };
      const record = { ...detective.create(world), choice: 'similar' }, data = detective.observe(detective.advance(world, record), record);
      expect(data).toMatchObject({ answer: 'similar', matched: true });
      expect(data.rows[0].details.chance).toBe(.68 * model.habitats.drought.food);
      expect(data.rows[1].details.chance).toBe(data.rows[0].details.chance);
      foundDifferent ||= data.rows[0].survived !== data.rows[1].survived;
    }
    expect(foundDifferent).toBe(true);
  });

  it('blocks stale pending cases and grades no prediction against a changed recorded habitat or selection', () => {
    const detective = window.StemLab.evoIslandDetective, world = model.create(2026);
    const record = { ...detective.create(world), choice: 'a' };
    for (const changed of [{ ...world, habitat: 'snow' }, { ...world, selection: false }]) {
      expect(detective.observe(changed, record).ready).toBe(false);
      expect(detective.advance(changed, record)).toBeNull();
      const next = model.step(changed), data = detective.observe(next, record);
      expect(data).toMatchObject({ complete: true, consistent: false, matched: null, habitat: next.habitat, selection: next.selection });
      for (const row of data.rows) expect(row.details.chance).toBe(model.chance(row.organism, model.habitats[next.habitat], next.selection));
    }
    const unpredicted = detective.observe(model.step(world), detective.create(world));
    expect(unpredicted.matched).toBeNull(); expect(unpredicted.complete).toBe(true);
  });

  it('rejects malformed saved cases and missing residents rather than trusting cached outcomes', () => {
    const detective = window.StemLab.evoIslandDetective, world = model.create(42), record = detective.create(world);
    for (const bad of [
      { ...record, seed: 3 }, { ...record, start: -1 }, { ...record, start: 1 }, { ...record, start: 60 },
      { ...record, habitat: '__proto__' }, { ...record, selection: 'true' }, { ...record, choice: 'winner' },
      { ...record, ids: [record.ids[0], record.ids[0]] }, { ...record, ids: [1, 999] }, { ...record, ids: new Array(2) },
      { ...record, ids: [1.5, 2] }, { ...record, version: 2 }
    ]) expect(detective.restore(bad, world)).toBeNull();
    expect(detective.restore({ ...record, chances: [1, 0], survivors: [1, 2] }, world)).toEqual(record);
    const lone = model.create(42); lone.history[0].population = lone.history[0].population.slice(0, 1);
    expect(detective.create(lone)).toBeNull();
    expect(detective.create(run(world, 60))).toBeNull();
  });

  it('reports one survivor with no offspring accurately when the population goes extinct', () => {
    const detective = window.StemLab.evoIslandDetective;
    let evidence;
    for (let seed = 1; seed <= 50 && !evidence; seed++) {
      const world = model.create(seed);
      world.history[0].population = world.history[0].population.slice(0, 2);
      world.history[0].stats = model.stats(world.history[0].population); world.nextId = 3;
      const record = { ...detective.create(world), choice: 'a' }, next = detective.advance(world, record);
      if (next.history[1].survivors.length === 1) evidence = detective.observe(next, record);
    }
    expect(evidence).toBeTruthy();
    expect(evidence.rows.filter(r => r.survived)).toHaveLength(1);
    expect(evidence.rows.map(r => r.offspring)).toEqual([0, 0]);
  });
});


describe('Living Island family trait time machine', () => {
  it('uses unique two-parent descendants and actual family ranges rather than counting ancestry paths', () => {
    const world = model.create(8);
    const make = (id, born, parents, value) => ({ id, born, parents, mutations: 0, genes: { shade: [value, value], fur: [value, value], legs: [value, value] } });
    world.history = [
      { generation: 0, habitat: 'meadow', population: [make(1, 0, [], .2), make(2, 0, [], .8), make(3, 0, [], .6)], survivors: [] },
      { generation: 1, habitat: 'snow', population: [make(4, 1, [1, 2], .1), make(5, 1, [3, 1], .9), make(6, 1, [2, 3], .6)], survivors: [1, 2, 3] },
      { generation: 2, habitat: 'forest', population: [make(7, 2, [4, 5], .4), make(8, 2, [6, 4], .8)], survivors: [4, 5, 6] },
      { generation: 3, habitat: 'drought', population: [], survivors: [7] }
    ];
    world.generation = 3;
    const before = JSON.stringify(world), journey = window.StemLab.evoIslandStudy.chronicle(world, 1);
    for (const trait of model.traits) {
      expect(journey.frames[0].traits[trait]).toMatchObject({ minimum: .2, maximum: .2, mean: .2, count: 1 });
      const generation1 = journey.frames[1].traits[trait];
      expect(generation1).toMatchObject({ minimum: .1, maximum: .9, mean: .5, count: 2 });
      expect(generation1.low).toBe(world.history[1].population[0]); expect(generation1.high).toBe(world.history[1].population[1]);
      expect(journey.frames[1].populationMeans[trait]).toBeCloseTo((.1 + .9 + .6) / 3);
      expect(journey.frames[2].traits[trait].mean).toBeCloseTo(.6);
      expect(journey.frames[2].traits[trait].count).toBe(2);
      expect(journey.frames[2].traits[trait].mean).toBe(journey.frames[2].populationMeans[trait]);
      expect(journey.frames[3].traits[trait]).toBeNull(); expect(journey.frames[3].populationMeans[trait]).toBeNull();
    }
    expect(JSON.stringify(world)).toBe(before);
  });

  it('leaves family statistics undefined after lineage loss while retaining the living population comparison', () => {
    const world = run(model.create(2026), 8), study = window.StemLab.evoIslandStudy;
    const lost = world.history[0].population.find(o => !world.history[1].population.some(c => c.parents.includes(o.id)));
    const journey = study.chronicle(world, lost.id);
    expect(journey.frames[0].traits.fur.low.id).toBe(lost.id);
    for (const frame of journey.frames.slice(1)) {
      expect(frame.traits).toEqual({ shade: null, fur: null, legs: null });
      for (const trait of model.traits) {
        const pop = world.history[frame.generation].population;
        const independent = pop.reduce((sum, o) => sum + (o.genes[trait][0] + o.genes[trait][1]) / 2, 0) / pop.length;
        expect(frame.populationMeans[trait]).toBe(independent);
      }
    }
  });

  it('keeps zero traits, tied extremes and a one-member generation distinct from missing data', () => {
    const world = model.create(1);
    world.history[0].population.forEach(o => { o.genes.fur = [0, 0]; });
    const root = world.history[0].population[0];
    const journey = window.StemLab.evoIslandStudy.chronicle(world, root.id);
    expect(journey.frames[0].traits.fur).toMatchObject({ minimum: 0, maximum: 0, mean: 0, count: 1, low: { id: root.id }, high: { id: root.id } });
    expect(journey.frames[0].populationMeans.fur).toBe(0);
    const evolved = model.step({ ...world, mutation: 0, selection: false });
    const parentId = evolved.history[1].population[0].parents[0];
    const next = window.StemLab.evoIslandStudy.chronicle(evolved, parentId).frames[1];
    expect(next.traits.fur.mean).toBe(0);
    const firstId = Math.min(...next.members.map(o => o.id));
    expect(next.traits.fur.low.id).toBe(firstId); expect(next.traits.fur.high.id).toBe(firstId);
  });

  it('preserves historical habitats and next-step determinism with a later-born ancestor over long histories', () => {
    const world = run(model.create(2026), 40), root = world.history[4].population[0];
    const before = JSON.stringify(world), study = window.StemLab.evoIslandStudy, journey = study.chronicle(world, root.id);
    expect(journey.frames[0].generation).toBe(4);
    expect(journey.frames).toHaveLength(world.generation - 3);
    const queued = { ...world, habitat: world.habitat === 'snow' ? 'forest' : 'snow', selection: !world.selection };
    expect(study.chronicle(queued, root.id)).toEqual(journey);
    for (const frame of journey.frames) for (const trait of model.traits) {
      expect(frame.habitat).toBe(world.history[frame.generation].habitat);
      if (frame.traits[trait]) {
        const values = frame.members.map(o => (o.genes[trait][0] + o.genes[trait][1]) / 2);
        expect(frame.traits[trait].minimum).toBe(Math.min(...values));
        expect(frame.traits[trait].maximum).toBe(Math.max(...values));
        expect(frame.traits[trait].mean).toBe(values.reduce((sum, v) => sum + v, 0) / values.length);
      }
    }
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(model.step(JSON.parse(before)));
  });
});


describe('Living Island expedition highlights', () => {
  it('selects real contrasts across the recorded expedition without mutating history or RNG', () => {
    const world = run(model.create(2026), 18), before = JSON.stringify(world), h = window.StemLab.evoIslandHighlights;
    const suggested = h.suggest(world);
    expect(suggested.length).toBeLessThanOrEqual(5);
    const habitats = world.history.filter((f, i) => i > 0 && f.habitat !== world.history[i - 1].habitat);
    expect(suggested.find(m => m.record.kind === 'habitat').generation).toBe(habitats.at(-1).generation);
    const rounds = world.history.slice(1).map(f => ({ generation: f.generation, ratio: f.survivors.length / world.history[f.generation - 1].population.length }));
    rounds.sort((a, b) => a.ratio - b.ratio || a.generation - b.generation);
    expect(suggested.find(m => m.record.kind === 'survival').generation).toBe(rounds[0].generation);
    const mean = (f, k) => f.population.length ? f.population.reduce((n, o) => n + (o.genes[k][0] + o.genes[k][1]) / 2, 0) / f.population.length : null;
    const changes = world.history.slice(1).flatMap(f => model.traits.map(trait => ({ generation: f.generation, trait, delta: f.population.length ? mean(f, trait) - mean(world.history[f.generation - 1], trait) : null }))).filter(c => c.delta !== null);
    const largest = changes.reduce((a, b) => Math.abs(a.delta) >= Math.abs(b.delta) ? a : b);
    expect(suggested.find(m => m.record.kind === 'shift')).toMatchObject({ generation: largest.generation, delta: largest.delta, record: { trait: largest.trait } });
    const births = world.history.slice(1).flatMap(f => f.population).filter(o => o.mutations).sort((a, b) => b.mutations - a.mutations || a.born - b.born || a.id - b.id);
    expect(suggested.find(m => m.record.kind === 'mutation').variant.id).toBe(births[0].id);
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(model.step(JSON.parse(before)));
  });

  it('never invents a starting event or turn extinction into a zero-valued trait shift', () => {
    const h = window.StemLab.evoIslandHighlights;
    expect(h.suggest(model.create(2026))).toEqual([]);
    const world = model.create(17);
    world.history[0].population = world.history[0].population.slice(0, 1);
    world.history[0].stats = model.stats(world.history[0].population); world.nextId = 2;
    const ended = model.step(world), events = h.suggest(ended);
    expect(ended.history[1].population).toHaveLength(0);
    expect(events.map(e => e.record.kind)).toEqual(['extinction', 'survival']);
    expect(events[0]).toMatchObject({ generation: 1, parents: 1, offspring: 0, from: null, to: null, delta: null });
    expect(events[0].survivors).toBe(ended.history[1].survivors.length);
    expect(h.resolve({ kind: 'shift', generation: 1, trait: 'fur' }, ended)).toBeNull();
  });

  it('keeps historical moments after suggestions change and ignores queued conditions and forged metrics', () => {
    const h = window.StemLab.evoIslandHighlights, first = run(model.create(2026), 5);
    const turn = h.suggest(first).find(m => m.record.kind === 'habitat');
    const record = { ...turn.record, survivors: 999, offspring: 999, habitat: '__proto__' };
    const later = run(first, 6), queued = { ...later, habitat: 'drought', selection: !later.selection, mutation: .2 };
    expect(h.suggest(later).find(m => m.record.kind === 'habitat').key).not.toBe(turn.key);
    const restored = h.restore([record], queued);
    expect(restored).toEqual([turn.record]);
    expect(h.resolve(restored[0], queued)).toEqual(turn);
    expect(h.suggest(queued)).toEqual(h.suggest(later));
  });

  it('bounds collections, removes duplicates and permits removing a moment to make room', () => {
    const h = window.StemLab.evoIslandHighlights, world = run(model.create(2026), 8);
    const records = [1,2,3,4,5,6,7,8].map(generation => ({ kind: 'survival', generation }));
    let kept = [];
    records.forEach(r => { kept = h.toggle(world, kept, r); });
    expect(kept).toEqual(records.slice(0, 6));
    expect(h.restore(records, world)).toEqual(records.slice(0, 6));
    expect(h.restore([records[0], records[0], records[1]], world)).toEqual(records.slice(0, 2));
    kept = h.toggle(world, kept, records[2]);
    expect(kept).toHaveLength(5);
    kept = h.toggle(world, kept, records[6]);
    expect(kept).toHaveLength(6); expect(kept.at(-1)).toEqual(records[6]);
    expect(h.restore(JSON.parse(JSON.stringify(kept)), world)).toEqual(kept);
    expect(JSON.stringify(kept).length).toBeLessThan(600);
  });

  it('rejects nonexistent or malformed references and never trusts an unrecorded mutation', () => {
    const h = window.StemLab.evoIslandHighlights, world = run(model.create(2026), 3);
    for (const record of [
      null, {}, { kind: '__proto__', generation: 1 }, { kind: 'survival', generation: -1 }, { kind: 'survival', generation: 4 },
      { kind: 'survival', generation: 1.5 }, { kind: 'survival', generation: '1' }, { kind: 'habitat', generation: 1 },
      { kind: 'extinction', generation: 1 }, { kind: 'shift', generation: 1, trait: '__proto__' },
      { kind: 'mutation', generation: 1, organismId: 1 }, { kind: 'mutation', generation: 1, organismId: 9999 },
      { kind: 'mutation', generation: 1, organismId: world.history[1].population.find(o => !o.mutations).id }
    ]) expect(h.resolve(record, world)).toBeNull();
    expect(h.restore({ kind: 'survival', generation: 1 }, world)).toEqual([]);
    expect(h.restore(new Array(6), world)).toEqual([]);
  });

  it('breaks equal contrasts by earliest generation and mutation ID without inventing shifts', () => {
    const h = window.StemLab.evoIslandHighlights, world = model.create(1);
    const make = (id, born, mutations = 0) => ({ id, born, parents: born ? [1, 2] : [], mutations, genes: { shade: [.5, .5], fur: [.5, .5], legs: [.5, .5] } });
    world.history = [
      { generation: 0, habitat: 'meadow', selection: true, population: [1,2,3,4].map(id => make(id, 0)), survivors: [] },
      { generation: 1, habitat: 'meadow', selection: true, population: [make(7,1),make(6,1,2),make(5,1,2),make(8,1)], survivors: [1,2] },
      { generation: 2, habitat: 'meadow', selection: true, population: [9,10,11,12].map(id => make(id, 2, 2)), survivors: [5,6] }
    ]; world.generation = 2;
    const items = h.suggest(world);
    expect(items.map(m => m.record.kind)).toEqual(['survival', 'mutation']);
    expect(items[0].generation).toBe(1);
    expect(items[1].variant.id).toBe(5);
    expect(h.resolve({ kind: 'shift', generation: 1, trait: 'fur' }, world)).toBeNull();
  });
});


describe('Living Island next-round preview', () => {
  it('previews the same seeded climate choice that stepping uses without sampling survival', () => {
    for (const seed of [0, 18, 2026, 4294967295]) {
      let world = model.create(seed);
      for (let g = 0; g < 12; g++) {
        const before = JSON.stringify(world), p = model.preview(world);
        expect(model.preview(world)).toEqual(p);
        expect(JSON.stringify(world)).toBe(before);
        const next = model.step(world), frame = next.history[next.generation];
        expect(p).toEqual({ generation: g + 1, habitat: frame.habitat, event: frame.event, selection: world.selection, mutation: world.mutation, parents: world.history[g].population.length });
        if ((g + 1) % 5 === 0) {
          const nextRandom = (Math.imul(1664525, world.rng) + 1013904223) >>> 0;
          const alternatives = Object.keys(model.habitats).filter(k => k !== world.habitat);
          expect(p.habitat).toBe(alternatives[Math.floor(nextRandom / 4294967296 * alternatives.length)]);
          expect(p.habitat).not.toBe(world.habitat);
          expect(p.event).toBe('climate');
        }
        expect(model.step(world)).toEqual(next);
        world = next;
      }
    }
  });

  it('uses queued settings and the current population, including intervention and fixed climates', () => {
    const recorded = run(model.create(2026), 4);
    const world = { ...recorded, habitat: 'forest', living: false, selection: false, mutation: 0.2 };
    const snapshot = JSON.stringify(world), p = model.preview(world);
    expect(p).toEqual({ generation: 5, habitat: 'forest', event: 'intervention', selection: false, mutation: 0.2, parents: recorded.history[4].population.length });
    expect(model.step(world).history[5].habitat).toBe('forest');
    expect(world.history[4].habitat).toBe('meadow');
    expect(JSON.stringify(world)).toBe(snapshot);
    const living = { ...world, living: true };
    expect(model.preview(living).event).toBe('climate');
    expect(model.preview(living).habitat).not.toBe('forest');
    expect(Object.keys(p).sort()).toEqual(['event', 'generation', 'habitat', 'mutation', 'parents', 'selection']);
  });

  it('ends honestly at extinction and the 60-generation limit', () => {
    const world = model.create(8);
    world.history[0].population = world.history[0].population.slice(0, 1);
    world.history[0].stats = model.stats(world.history[0].population);
    const extinct = model.step(world);
    expect(model.preview(world).parents).toBe(1);
    expect(extinct.history[1].population).toHaveLength(0);
    expect(model.preview(extinct)).toBeNull();
    expect(model.step(extinct)).toBe(extinct);
    const full = run({ ...model.create(2026), living: false, selection: false }, 59);
    expect(full.generation).toBe(59);
    expect(model.preview(full).generation).toBe(60);
    const final = model.step(full);
    expect(final.history[60].population.length).toBeGreaterThan(0);
    expect(model.preview(final)).toBeNull();
    expect(model.step(final)).toBe(final);
  });

  it('does not change a restored expedition or its subsequent biological random stream', () => {
    const saved = run(model.create(90), 9), restored = model.restore(JSON.parse(JSON.stringify(saved)));
    const reference = model.step(restored), before = JSON.stringify(restored);
    for (let i = 0; i < 100; i++) model.preview(restored);
    expect(JSON.stringify(restored)).toBe(before);
    expect(model.step(restored)).toEqual(reference);
    expect(model.step(saved)).toEqual(reference);
  });
});
