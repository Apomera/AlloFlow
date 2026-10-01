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
