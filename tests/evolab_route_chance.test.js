import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let m;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  m = window.StemLab.evoArchipelagoModel;
});

function run(seed = 21, rounds = 3, overrides = {}, small = false) {
  let world = m.create(seed, small);
  world.settings = { ...world.settings, ...overrides };
  for (let g = 0; g < rounds; g++) world = m.step(world);
  return world;
}
const routes = [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]];
function binomial(n, p, k) {
  let choose = 1;
  for (let i = 1; i <= k; i++) choose = choose * (n - i + 1) / i;
  return choose * p ** k * (1 - p) ** (n - k);
}
function dispatches(seed, rows, from, to) {
  let state = seed >>> 0;
  const destinations = [0, 1, 2].filter(island => island !== from);
  return rows.map(row => {
    const counts = { species: row.species, size: row.size, route: 0, other: 0, stay: 0 };
    const first = destinations[0] === to ? row.probability : row.otherProbability;
    for (let i = 0; i < row.size; i++) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      const draw = state / 4294967296;
      const destination = draw < first ? destinations[0] : draw < row.probability + row.otherProbability ? destinations[1] : from;
      counts[destination === to ? 'route' : destination === from ? 'stay' : 'other']++;
    }
    return counts;
  });
}

describe('captured route chance investigations', () => {
  it('matches the independent binomial formula, normalized probabilities and count moments for each recorded route', () => {
    const world = run(21, 3, { migration: .4 }, true);
    for (const generation of [1, 3]) for (const [from, to] of routes) {
      const data = m.routeChance(world, generation, from, to), evidence = m.routeEvidence(world, generation, from, to);
      expect(data).toMatchObject({ generation, from, to, other: [0, 1, 2].find(island => island !== from && island !== to), distance: m.distances[from][to], settings: world.history[generation].round.settings });
      expect(data.rows.map(row => row.species)).toEqual(['birds', 'plants']);
      data.rows.forEach((row, index) => {
        const actual = evidence.rows[index], n = actual.source.size, p = actual.probability;
        expect(row.size).toBe(n); expect(row.probability).toBe(p);
        expect(row.otherProbability).toBe(actual.otherProbability); expect(row.stayProbability).toBe(actual.stayProbability);
        expect(row.observed).toBe(actual.arrivals); expect(row.mass).toHaveLength(n + 1);
        row.mass.forEach((probability, count) => {
          expect(probability).toBeGreaterThanOrEqual(0); expect(probability).toBeLessThanOrEqual(1);
          expect(probability).toBeCloseTo(binomial(n, p, count), 13);
        });
        expect(row.mass.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 13);
        expect(row.expected).toBeCloseTo(n * p, 13); expect(row.variance).toBeCloseTo(n * p * (1 - p), 13);
        expect(row.sd).toBeCloseTo(Math.sqrt(n * p * (1 - p)), 13);
        expect(row.mass.reduce((sum, probability, count) => sum + count * probability, 0)).toBeCloseTo(row.expected, 13);
        expect(row.mass.reduce((sum, probability, count) => sum + (count - row.expected) ** 2 * probability, 0)).toBeCloseTo(row.variance, 13);
        expect(row.zeroProbability).toBe(row.mass[0]); expect(row.zeroProbability).toBeCloseTo((1 - p) ** n, 13);
      });
    }
    expect(m.routeChance(world, 1, 2, 1).rows[0].size).toBe(6);
    expect(m.routeChance(world, 3, 2, 1).rows[0].size).toBe(24);
  });

  it('keeps closed-route and empty-source distributions degenerate without inventing a G0 experiment', () => {
    const closed = run(21, 1, { migration: 0 });
    for (const row of m.routeChance(closed, 1, 0, 1).rows) {
      expect(row.mass).toEqual([1, ...Array(row.size).fill(0)]);
      expect(row.expected).toBe(0); expect(row.variance).toBe(0); expect(row.sd).toBe(0);
      expect(row.zeroProbability).toBe(1); expect(row.observed).toBe(0);
    }
    let empty = m.create(11);
    empty = { ...empty, settings: { ...empty.settings, migration: .4 }, history: [{ ...empty.history[0], demes: empty.history[0].demes.map((deme, island) => island === 0 ? { birds: [], plants: [] } : deme) }] };
    empty = m.step(empty);
    for (const row of m.routeChance(empty, 1, 0, 1).rows) {
      expect(row.size).toBe(0); expect(row.mass).toEqual([1]); expect(row.expected).toBe(0);
      expect(row.variance).toBe(0); expect(row.sd).toBe(0); expect(row.zeroProbability).toBe(1);
    }
    expect(m.routeChanceTrial(empty, 1, 0, 1, 0).rows).toEqual(['birds', 'plants'].map(species => ({ species, size: 0, route: 0, other: 0, stay: 0 })));
    expect(m.routeChanceForecast(empty, 1, 0, 1, 'birds', 0, 0, 0, 16)).toMatchObject({ probability: 1, expectedHits: 16, hits: 16, frequency: 1, counts: Array(16).fill(0), sampleMean: 0, recordedInBand: true });
    expect(m.routeChance(closed, 0, 0, 1)).toBeNull();
    expect(m.routeChanceTrial(closed, 0, 0, 1, 0)).toBeNull();
    expect(m.routeChanceForecast(closed, 0, 0, 1, 'birds', 0, 0, 0, 16)).toBeNull();
  });

  it('holds an earlier captured experiment fixed when queued settings, latest RNG and later recorded generations change', () => {
    const world = run(73, 2, { migration: .3 });
    const original = m.routeChance(world, 1, 0, 2), trial = m.routeChanceTrial(world, 1, 0, 2, 7), forecast = m.routeChanceForecast(world, 1, 0, 2, 'plants', 0, 2, 16, 16);
    const queued = { ...world, rng: 987654321, settings: { ...world.settings, migration: 0, selection: false, reciprocal: false, mutation: 0, rainfall: [1, 0, .1] } };
    const later = m.step(m.step(queued));
    for (const changed of [queued, later]) {
      expect(m.routeChance(changed, 1, 0, 2)).toEqual(original);
      expect(m.routeChanceTrial(changed, 1, 0, 2, 7)).toEqual(trial);
      expect(m.routeChanceForecast(changed, 1, 0, 2, 'plants', 0, 2, 16, 16)).toEqual(forecast);
    }
  });

  it('derives sampling seeds from the pre-dispersal cohort and captured conditions rather than realized movement or newborns', () => {
    const source = m.create(21, true), settings = { ...source.settings, migration: .4 };
    const a = m.step({ ...source, settings, rng: 17 }), b = m.step({ ...source, settings, rng: 123456789 });
    expect(a.history[1]).not.toEqual(b.history[1]);
    for (const [from, to] of routes) {
      const ac = m.routeChance(a, 1, from, to), bc = m.routeChance(b, 1, from, to);
      expect(ac.samplingSeed).toBe(bc.samplingSeed);
      expect(ac.rows.map(({ observed, ...row }) => row)).toEqual(bc.rows.map(({ observed, ...row }) => row));
      for (const index of [0, 15, 127]) expect(m.routeChanceTrial(a, 1, from, to, index)).toEqual(m.routeChanceTrial(b, 1, from, to, index));
      expect(ac.rows.map(row => row.observed)).toEqual(m.routeEvidence(a, 1, from, to).rows.map(row => row.arrivals));
      expect(bc.rows.map(row => row.observed)).toEqual(m.routeEvidence(b, 1, from, to).rows.map(row => row.arrivals));
    }
  });

  it('starts a distinct experiment when captured probabilities change while keeping the same founding source cohort', () => {
    const source = m.create(21, true), a = m.step({ ...source, settings: { ...source.settings, migration: .1 } }), b = m.step({ ...source, settings: { ...source.settings, migration: .4 } });
    for (const [from, to] of routes) {
      const ac = m.routeChance(a, 1, from, to), bc = m.routeChance(b, 1, from, to);
      expect(ac.samplingSeed).not.toBe(bc.samplingSeed);
      ac.rows.forEach((row, index) => {
        expect(row.size).toBe(bc.rows[index].size);
        expect(bc.rows[index].probability).toBeCloseTo(row.probability * 4, 14);
        expect(bc.rows[index].expected).toBeCloseTo(row.expected * 4, 13);
        expect(bc.rows[index].zeroProbability).toBeLessThan(row.zeroProbability);
      });
    }
  });

  it('uses fresh reproducible seeds and one categorical draw per source organism in ascending destination order', () => {
    const world = run(21, 2, { migration: .4 }, true);
    for (const [from, to] of routes) {
      const chance = m.routeChance(world, 1, from, to), seeds = new Set();
      for (const index of [0, 1, 7, 15, 63, 127]) {
        const trial = m.routeChanceTrial(world, 1, from, to, index);
        expect(trial.index).toBe(index); expect(Number.isInteger(trial.seed)).toBe(true);
        expect(trial.seed).toBeGreaterThanOrEqual(0); expect(trial.seed).toBeLessThanOrEqual(4294967295);
        seeds.add(trial.seed);
        expect(trial.rows).toEqual(dispatches(trial.seed, chance.rows, from, to));
        trial.rows.forEach((row, speciesIndex) => {
          expect(row.species).toBe(chance.rows[speciesIndex].species); expect(row.size).toBe(chance.rows[speciesIndex].size);
          for (const key of ['route', 'other', 'stay']) { expect(Number.isInteger(row[key])).toBe(true); expect(row[key]).toBeGreaterThanOrEqual(0); }
          expect(row.route + row.other + row.stay).toBe(row.size);
        });
        expect(m.routeChanceTrial(world, 1, from, to, index)).toEqual(trial);
      }
      expect(seeds.size).toBe(6);
    }
  });

  it('computes inclusive forecast probabilities and each fresh-trial count without treating expected hits as observed hits', () => {
    const world = run(21, 3, { migration: .4 });
    for (const sp of m.species) for (const [low, high, start, count] of [[0, 0, 0, 16], [1, 3, 16, 16], [2, 7, 112, 16], [0, 24, 127, 1]]) {
      const row = m.routeChance(world, 2, 0, 1).rows.find(row => row.species === sp);
      const forecast = m.routeChanceForecast(world, 2, 0, 1, sp, low, high, start, count);
      const counts = Array.from({ length: count }, (_, index) => m.routeChanceTrial(world, 2, 0, 1, start + index).rows.find(row => row.species === sp).route);
      const probability = row.mass.slice(low, high + 1).reduce((sum, value) => sum + value, 0), hits = counts.filter(value => value >= low && value <= high).length;
      expect(forecast).toMatchObject({ species: sp, low, high, start, count, counts, hits, frequency: hits / count, recordedInBand: row.observed >= low && row.observed <= high });
      expect(forecast.probability).toBeCloseTo(probability, 14);
      expect(forecast.expectedHits).toBeCloseTo(probability * count, 13);
      expect(forecast.sampleMean).toBeCloseTo(counts.reduce((sum, value) => sum + value, 0) / count, 13);
    }
  });

  it('partitions the same 128 dispatches into eight checks without reusing a trial or changing the exact distribution', () => {
    const world = run(21, 1, { migration: .3 }), chance = m.routeChance(world, 1, 0, 1);
    for (const sp of m.species) {
      const checks = Array.from({ length: 8 }, (_, index) => m.routeChanceForecast(world, 1, 0, 1, sp, 1, 4, index * 16, 16));
      const whole = m.routeChanceForecast(world, 1, 0, 1, sp, 1, 4, 0, 128);
      expect(checks.flatMap(check => check.counts)).toEqual(whole.counts);
      expect(checks.reduce((sum, check) => sum + check.hits, 0)).toBe(whole.hits);
      expect(checks.every(check => check.probability === whole.probability)).toBe(true);
      expect(m.routeChance(world, 1, 0, 1)).toEqual(chance);
    }
  });

  it('rejects invalid rounds, routes, trial indices and probability bands instead of coercing or clipping them', () => {
    const world = run(21, 3);
    for (const generation of [0, -1, 4, .5, NaN, '1', null]) {
      expect(m.routeChance(world, generation, 0, 1)).toBeNull(); expect(m.routeChanceTrial(world, generation, 0, 1, 0)).toBeNull();
    }
    for (const island of [-1, 3, .5, NaN, '0', null]) {
      expect(m.routeChance(world, 1, island, 1)).toBeNull(); expect(m.routeChance(world, 1, 0, island)).toBeNull();
    }
    for (let island = 0; island < 3; island++) expect(m.routeChance(world, 1, island, island)).toBeNull();
    for (const invalid of [null, {}, { generation: 1 }, { ...world, generation: NaN }, { ...world, generation: '3' }, { ...world, generation: 3.5 }, { ...world, history: [] }, { ...world, history: [world.history[0], { generation: 1, demes: [], round: null }] }]) expect(m.routeChance(invalid, 1, 0, 1)).toBeNull();
    for (const index of [-1, 128, .5, NaN, '0', null]) expect(m.routeChanceTrial(world, 1, 0, 1, index)).toBeNull();
    for (const [sp, low, high, start, count] of [['fish', 0, 3, 0, 16], ['birds', -1, 3, 0, 16], ['birds', 2, 1, 0, 16], ['birds', 0, 25, 0, 16], ['birds', .5, 3, 0, 16], ['birds', 0, '3', 0, 16], ['birds', 0, 3, -1, 16], ['birds', 0, 3, 0, 0], ['birds', 0, 3, 0, 129], ['birds', 0, 3, 127, 2], ['birds', 0, 3, 0, 1.5], ['birds', 0, 3, '0', 16], ['birds', 0, 3, 0, '16']]) expect(m.routeChanceForecast(world, 1, 0, 1, sp, low, high, start, count)).toBeNull();
  });

  it('leaves the recorded expedition, newborn contributions and its next random future unchanged', () => {
    const world = run(21, 3, { migration: .4 }), before = JSON.stringify(world), future = m.step(world);
    const recorded = routes.map(([from, to]) => m.routeEvidence(world, 2, from, to));
    for (const [from, to] of routes) {
      m.routeChance(world, 2, from, to);
      for (const index of [0, 15, 31, 127]) m.routeChanceTrial(world, 2, from, to, index);
      for (const sp of m.species) m.routeChanceForecast(world, 2, from, to, sp, 0, 4, 112, 16);
    }
    expect(JSON.stringify(world)).toBe(before); expect(m.step(world)).toEqual(future);
    routes.forEach(([from, to], index) => expect(m.routeEvidence(world, 2, from, to)).toEqual(recorded[index]));
  });
});
