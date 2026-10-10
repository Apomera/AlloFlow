import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let m;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  m = window.StemLab.evoArchipelagoModel;
});

function markerFrame(groups, generation = 0, sp = 'birds') {
  let id = 1;
  return { generation, demes: groups.map(markers => ({ [sp]: markers.map(marker => ({ id: id++, marker: marker.slice() })) })) };
}
function repeated(n, marker) { return Array.from({ length: n }, () => marker.slice()); }
function enumeratedPair(left, right) {
  const masses = [0, 0, 0, 0];
  for (const a of left) for (const b of right) masses[2 * a + b]++;
  return masses.map(count => count / (left.length * right.length));
}

describe('recorded neutral-marker geography and copy-pair probabilities', () => {
  it('counts every marker and observed heterozygote in both species at founding and later recorded generations', () => {
    let world = m.create(31, true);
    for (let generation = 0; generation < 4; generation++) {
      const frame = world.history[generation];
      for (const sp of ['birds', 'plants']) {
        const data = m.markerMap(frame, sp), reference = m.diversity(frame, sp);
        expect(data.generation).toBe(generation); expect(data.species).toBe(sp);
        expect(data.within).toBe(reference.within); expect(data.pooled).toBe(reference.pooled);
        data.rows.forEach((row, island) => {
          const population = frame.demes[island][sp], copies = population.flatMap(o => o.marker), A = copies.filter(bit => bit === 1).length;
          const heterozygotes = population.filter(o => o.marker[0] !== o.marker[1]).length;
          expect(row).toEqual({ island, size: population.length, copies: copies.length, A, a: copies.length - A, p: A / copies.length, H: 2 * A / copies.length * (1 - A / copies.length), heterozygotes, observedH: heterozygotes / population.length, members: population.map(o => ({ id: o.id, marker: o.marker })) });
        });
        const all = frame.demes.flatMap(d => d[sp]).flatMap(o => o.marker);
        expect(data.totalCopies).toBe(all.length);
        expect(data.pooledFrequency).toBe(all.filter(bit => bit === 1).length / all.length);
      }
      world = m.step(world);
    }
  });

  it('matches exhaustive ordered copy-pair enumeration, including repeated choice of the exact same copy', () => {
    const frame = markerFrame([[[1, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0]]]);
    const data = m.markerMap(frame, 'birds');
    for (let from = 0; from < 3; from++) for (let to = 0; to < 3; to++) {
      const expected = enumeratedPair(frame.demes[from].birds.flatMap(o => o.marker), frame.demes[to].birds.flatMap(o => o.marker));
      const pair = data.pairs[from][to];
      expect(pair.from).toBe(from); expect(pair.to).toBe(to);
      pair.masses.forEach((mass, index) => expect(mass).toBeCloseTo(expected[index], 14));
      expect(pair.masses.reduce((sum, mass) => sum + mass, 0)).toBeCloseTo(1, 14);
      expect(pair.probability).toBeCloseTo(expected[1] + expected[2], 14);
      expect(pair.probability).toBeCloseTo(data.pairs[to][from].probability, 14);
    }
    expect(data.pairs[0][0].probability).toBe(.375);
    // Without replacement the same cohort would instead give 2*3*1/(4*3)=.5.
    expect(data.pairs[0][0].probability).not.toBe(.5);
    expect(data.pairs[0][1].masses[1]).toBeCloseTo(data.pairs[1][0].masses[2], 14);
  });

  it('uses census weights for unequal island sizes and distinguishes its within average from conditional pooled same-island sampling', () => {
    const frame = markerFrame([repeated(24, [1, 1]), repeated(24, [0, 0]), repeated(6, [1, 0])]);
    const data = m.markerMap(frame, 'birds');
    expect(data.rows.map(row => row.size)).toEqual([24, 24, 6]);
    expect(data.pooledFrequency).toBe(.5); expect(data.pooled).toBe(.5);
    expect(data.within).toBeCloseTo(1 / 18, 14); expect(data.between).toBeCloseTo(4 / 9, 14);
    const sizes = [24, 24, 6], total = 54;
    data.pairWeights.forEach((row, from) => row.forEach((weight, to) => expect(weight).toBe(sizes[from] * sizes[to] / total ** 2)));
    expect(data.pairWeights.flat().reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 14);
    expect(data.weightedPairs).toBeCloseTo(.5, 14);
    const sameIslandWeight = data.pairWeights.reduce((sum, row, island) => sum + row[island], 0);
    const conditionalSameIsland = data.pairs.reduce((sum, row, island) => sum + row[island].probability * data.pairWeights[island][island], 0) / sameIslandWeight;
    expect(conditionalSameIsland).toBeCloseTo(1 / 66, 14);
    expect(data.within).not.toBeCloseTo(conditionalSameIsland, 10);
  });

  it('makes opposite-fixed islands differ while retaining no within-island variation', () => {
    const data = m.markerMap(markerFrame([repeated(6, [1, 1]), repeated(6, [0, 0]), []]), 'birds');
    expect(data.within).toBe(0); expect(data.pooled).toBe(.5); expect(data.between).toBe(.5);
    expect(data.pairs[0][0]).toMatchObject({ probability: 0, masses: [0, 0, 0, 1] });
    expect(data.pairs[1][1]).toMatchObject({ probability: 0, masses: [1, 0, 0, 0] });
    expect(data.pairs[0][1]).toMatchObject({ probability: 1, masses: [0, 0, 1, 0] });
    expect(data.pairs[1][0]).toMatchObject({ probability: 1, masses: [0, 1, 0, 0] });
    expect(data.rows[2]).toMatchObject({ size: 0, copies: 0, A: 0, a: 0, p: null, H: null, heterozygotes: 0, observedH: null, members: [] });
  });

  it('separates expected copy differences from actual paired genotypes even with identical frequencies across islands', () => {
    const frame = markerFrame([repeated(6, [1, 0]), [...repeated(3, [1, 1]), ...repeated(3, [0, 0])], [[1, 0], [0, 1], [1, 1], [0, 0]]]);
    const data = m.markerMap(frame, 'birds');
    expect(data.rows.map(row => row.p)).toEqual([.5, .5, .5]);
    expect(data.rows.map(row => row.H)).toEqual([.5, .5, .5]);
    expect(data.rows.map(row => row.observedH)).toEqual([1, 0, .5]);
    expect(data.within).toBe(.5); expect(data.pooled).toBe(.5); expect(data.between).toBe(0);
    data.pairs.flat().forEach(pair => expect(pair).toMatchObject({ probability: .5, masses: [.25, .25, .25, .25] }));
  });

  it('equals the weighted frequency variance identity and pooled enumeration for arbitrary census sizes', () => {
    const groups = [[[1, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [0, 0], [0, 1], [1, 0], [1, 1]]];
    const data = m.markerMap(markerFrame(groups), 'birds');
    const total = data.rows.reduce((sum, row) => sum + row.size, 0);
    const variance = data.rows.reduce((sum, row) => sum + row.size / total * (row.p - data.pooledFrequency) ** 2, 0);
    expect(data.between).toBeGreaterThanOrEqual(0); expect(data.between).toBeCloseTo(2 * variance, 14);
    expect(data.within + data.between).toBeCloseTo(data.pooled, 14);
    const all = groups.flat(2), expected = enumeratedPair(all, all);
    expect(data.weightedPairs).toBeCloseTo(expected[1] + expected[2], 14);
    expect(data.weightedPairs).toBeCloseTo(data.pooled, 14);
  });

  it('preserves undefined empty-pair metrics and handles one occupied island without inventing diversity', () => {
    const one = m.markerMap(markerFrame([[], [[1, 0]], []]), 'birds');
    expect(one).toMatchObject({ totalCopies: 2, pooledFrequency: .5, within: .5, pooled: .5, between: 0, weightedPairs: .5 });
    expect(one.pairWeights).toEqual([[0, 0, 0], [0, 1, 0], [0, 0, 0]]);
    one.pairs.flat().filter(pair => pair.from !== 1 || pair.to !== 1).forEach(pair => expect(pair.probability).toBeNull());
    const empty = m.markerMap(markerFrame([[], [], []]), 'birds');
    expect(empty).toMatchObject({ totalCopies: 0, pooledFrequency: null, within: null, pooled: null, between: null, weightedPairs: null, pairWeights: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] });
    empty.pairs.flat().forEach(pair => expect(pair).toMatchObject({ probability: null, masses: null }));
  });

  it('rejects invalid contexts, duplicate identities and malformed marker copies without requiring trait genes', () => {
    const valid = markerFrame([[[0, 1]], [[1, 1]], [[0, 0]]]);
    expect(m.markerMap(valid, 'birds')).not.toBeNull();
    expect(valid.demes[0].birds[0].genes).toBeUndefined();
    const invalid = [null, {}, { ...valid, generation: -1 }, { ...valid, generation: .5 }, { ...valid, generation: 41 }, { ...valid, demes: [] }, { ...valid, demes: [...valid.demes, valid.demes[0]] }, { ...valid, demes: [null, ...valid.demes.slice(1)] }, { ...valid, demes: [{ birds: {} }, ...valid.demes.slice(1)] }];
    invalid.forEach(frame => expect(m.markerMap(frame, 'birds')).toBeNull());
    for (const marker of [[], [0], [0, 1, 0], [0, 2], [false, 1], [0, '1'], [NaN, 1], { 0: 0, 1: 1, length: 2 }]) {
      const frame = structuredClone(valid); frame.demes[0].birds[0].marker = marker;
      expect(m.markerMap(frame, 'birds')).toBeNull();
    }
    for (const id of [0, -1, .5, NaN, Infinity, 2 ** 53, '1']) {
      const frame = structuredClone(valid); frame.demes[0].birds[0].id = id;
      expect(m.markerMap(frame, 'birds')).toBeNull();
    }
    const duplicate = structuredClone(valid); duplicate.demes[1].birds[0].id = duplicate.demes[0].birds[0].id;
    expect(m.markerMap(duplicate, 'birds')).toBeNull();
    const sparseFrame = { ...valid, demes: Array(3) }, sparsePopulation = structuredClone(valid);
    sparsePopulation.demes[0].birds = Array(2);
    expect(m.markerMap(sparseFrame, 'birds')).toBeNull(); expect(m.markerMap(sparsePopulation, 'birds')).toBeNull();
    for (const sp of [null, 'rabbits', '__proto__']) expect(m.markerMap(valid, sp)).toBeNull();
  });

  it('returns independent evidence objects without changing the world, recorded genomes, RNG or next generation', () => {
    let world = m.create(101, true); world = m.step(m.step(world));
    const snapshot = JSON.stringify(world), future = m.step(world), before = m.markerMap(world.history[0], 'birds');
    const data = m.markerMap(world.history[1], 'plants');
    data.rows[0].members[0].marker[0] = 1 - data.rows[0].members[0].marker[0];
    data.rows[0].members[0].id = -999;
    expect(JSON.stringify(world)).toBe(snapshot); expect(m.step(world)).toEqual(future);
    const queued = { ...world, rng: 999, settings: { ...world.settings, mutation: 0, migration: 0 } };
    expect(m.markerMap(queued.history[0], 'birds')).toEqual(before);
    expect(m.markerMap(future.history[0], 'birds')).toEqual(before);
  });

  it('builds contrasting teaching arrangements with identical whole-archipelago counts and actual homozygous genotypes', () => {
    const separated = m.markerMapCase('separated'), mixed = m.markerMapCase('mixed');
    for (const frame of [separated, mixed]) {
      expect(frame.generation).toBe(0); expect(frame.round).toBeNull();
      const individuals = frame.demes.flatMap(deme => ['birds', 'plants'].flatMap(sp => deme[sp]));
      expect(individuals).toHaveLength(144);
      expect(new Set(individuals.map(o => o.id)).size).toBe(144);
      individuals.forEach(o => expect(o).toMatchObject({ born: 0, genes: [.5, .5], parents: [], inheritance: [] }));
    }
    for (const sp of ['birds', 'plants']) {
      const left = m.markerMap(separated, sp), right = m.markerMap(mixed, sp);
      const sortMembers = data => data.rows.flatMap(row => row.members).sort((a, b) => a.id - b.id);
      expect(sortMembers(left)).toEqual(sortMembers(right));
      expect(left.rows.map(row => row.p)).toEqual([1, 0, 0]);
      expect(right.rows.map(row => row.p)).toEqual([1 / 3, 1 / 3, 1 / 3]);
      for (const data of [left, right]) {
        expect(data.rows.map(row => row.size)).toEqual([24, 24, 24]);
        expect(data.totalCopies).toBe(144);
        expect(data.rows.reduce((sum, row) => sum + row.A, 0)).toBe(48);
        expect(data.rows.reduce((sum, row) => sum + row.a, 0)).toBe(96);
        expect(data.rows.map(row => row.heterozygotes)).toEqual([0, 0, 0]);
        expect(data.rows.map(row => row.observedH)).toEqual([0, 0, 0]);
        expect(data.pooledFrequency).toBe(1 / 3); expect(data.pooled).toBeCloseTo(4 / 9, 14);
        expect(data.weightedPairs).toBeCloseTo(4 / 9, 14);
        data.pairWeights.flat().forEach(weight => expect(weight).toBe(1 / 9));
      }
      expect(left.within).toBe(0); expect(left.between).toBeCloseTo(4 / 9, 14);
      expect(right.within).toBeCloseTo(4 / 9, 14); expect(right.between).toBeCloseTo(0, 14);
      right.pairs.flat().forEach(pair => expect(pair.probability).toBeCloseTo(4 / 9, 14));
      expect(left.pairs[0][1].probability).toBe(1);
      // Every actual organism is homozygous: independently re-pairing copies
      // is a different question from inspecting the recorded organism pairs.
      expect(right.rows[0].H).not.toBe(right.rows[0].observedH);
    }
  });

  it('rejects unknown teaching arrangements and returns fresh fixture records without using expedition randomness', () => {
    for (const mode of [null, undefined, '', 'recorded', 'evolution', {}, 1]) expect(m.markerMapCase(mode)).toBeNull();
    const world = m.step(m.create(51)), before = JSON.stringify(world), future = m.step(world);
    const first = m.markerMapCase('mixed'), next = m.markerMapCase('mixed');
    expect(first).toEqual(next); first.demes[0].birds[0].marker[0] = 0;
    expect(next.demes[0].birds[0].marker).toEqual([1, 1]);
    expect(JSON.stringify(world)).toBe(before); expect(m.step(world)).toEqual(future);
  });
});
