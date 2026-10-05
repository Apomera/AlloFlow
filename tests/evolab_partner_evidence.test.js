import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let m;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  m = window.StemLab.evoArchipelagoModel;
});

function run(seed = 21, rounds = 3, overrides = {}) {
  let world = m.create(seed);
  world.settings = { ...world.settings, ...overrides };
  for (let g = 0; g < rounds; g++) world = m.step(world);
  return world;
}

function recordedPools(world, generation, island) {
  const before = world.history[generation - 1], frame = world.history[generation];
  const index = new Map(before.demes.flatMap(d => m.species.flatMap(sp => d[sp])).map(o => [o.id, o]));
  const pools = Object.fromEntries(m.species.map(sp => {
    const contribution = frame.round.contributions.find(c => c.island === island && c.species === sp);
    return [sp, contribution.members.map(member => ({ ...member, organism: index.get(member.id) }))];
  }));
  return { before, frame, index, pools };
}

function expectFiniteOrNullClose(actual, expected) {
  if (expected === null) expect(actual).toBeNull();
  else expect(actual).toBeCloseTo(expected, 13);
}

describe('recorded reciprocal partner evidence', () => {
  it('reconstructs both species from actual pre-birth pools, recorded weights and parental copies', () => {
    for (const seed of [21, 73]) {
      const world = run(seed, 3, { migration: .4, mutation: .05, rainfall: [.1, .6, .9] });
      for (const generation of [1, 3]) for (let island = 0; island < 3; island++) {
        const evidence = m.partnerEvidence(world, generation, island);
        const { frame, index, pools } = recordedPools(world, generation, island);
        expect(evidence).toMatchObject({ generation, island, settings: frame.round.settings });
        expect(evidence.rows.map(row => row.species)).toEqual(['birds', 'plants']);
        for (const row of evidence.rows) {
          const sp = row.species, other = sp === 'birds' ? 'plants' : 'birds';
          const pool = pools[sp], partners = pools[other].map(p => p.organism);
          const offspring = frame.demes[island][sp], actualCopies = offspring.flatMap(o => o.parents.map((id, j) => index.get(id).genes[o.inheritance[j].copy]));
          expect(row.partnerSpecies).toBe(other);
          expect(row.pool).toEqual(m.stats(pool.map(p => p.organism)));
          expect(row.partnerPool).toEqual(m.stats(partners));
          expect(row.offspring).toEqual(m.stats(offspring));
          expect(row.members.map(member => member.id)).toEqual(pool.map(p => p.id));
          row.members.forEach((member, j) => {
            const original = pool[j];
            expect(member.from).toBe(original.from); expect(member.trait).toBe(m.value(original.organism));
            expect(member.weight).toBe(original.weight);
            expect(member.weight).toBe(m.fitness(original.organism, partners, frame.round.settings.rainfall[island], frame.round.settings));
            expect(member.withoutPartnersWeight).toBe(m.fitness(original.organism, partners, frame.round.settings.rainfall[island], { ...frame.round.settings, reciprocal: false }));
            expect(member.gametes).toBe(offspring.flatMap(o => o.parents).filter(id => id === member.id).length);
          });
          const inherited = actualCopies.length ? actualCopies.reduce((sum, v) => sum + v, 0) / actualCopies.length : null;
          expectFiniteOrNullClose(row.inheritedMean, inherited);
          const story = m.story(world, generation, island, sp);
          expectFiniteOrNullClose(row.expected, story.stages.find(stage => stage.key === 'expected').trait);
          expectFiniteOrNullClose(row.samplingDifference, inherited === null || row.expected === null ? null : inherited - row.expected);
          expectFiniteOrNullClose(row.mutationDifference, inherited === null || row.offspring.mean === null ? null : row.offspring.mean - inherited);
          expectFiniteOrNullClose(row.partnerDifference, row.expected === null || row.withoutPartnersExpected === null ? null : row.expected - row.withoutPartnersExpected);
        }
      }
    }
  });

  it('normalizes expected copy shares and calculates two distinct-parent expectations for each species', () => {
    const world = run(21, 2, { migration: .4 });
    for (let island = 0; island < 3; island++) for (const row of m.partnerEvidence(world, 2, island).rows) {
      const actual = m.parentShares(row.members.map(member => member.weight));
      const baseline = m.parentShares(row.members.map(member => member.withoutPartnersWeight));
      expect(row.members.reduce((sum, member) => sum + member.expectedShare, 0)).toBeCloseTo(1, 13);
      expect(row.members.reduce((sum, member) => sum + member.withoutPartnersShare, 0)).toBeCloseTo(1, 13);
      row.members.forEach((member, index) => {
        expect(member.expectedShare).toBeCloseTo(actual[index], 13);
        expect(member.withoutPartnersShare).toBeCloseTo(baseline[index], 13);
        expect(member.expectedShare).toBeGreaterThan(0);
      });
      expect(row.expected).toBeCloseTo(row.members.reduce((sum, member, index) => sum + member.trait * actual[index], 0), 13);
      expect(row.withoutPartnersExpected).toBeCloseTo(row.members.reduce((sum, member, index) => sum + member.trait * baseline[index], 0), 13);
    }
  });

  it('reports zero partner contrast when reciprocal effects or all selection are off', () => {
    for (const overrides of [{ reciprocal: false }, { selection: false, reciprocal: true }]) {
      const world = run(83, 3, overrides);
      for (let island = 0; island < 3; island++) for (const row of m.partnerEvidence(world, 3, island).rows) {
        expect(row.partnerDifference).toBe(0); expect(row.expected).toBe(row.withoutPartnersExpected);
        row.members.forEach(member => {
          expect(member.weight).toBe(member.withoutPartnersWeight);
          expect(member.expectedShare).toBe(member.withoutPartnersShare);
          if (!world.settings.selection) {
            expect(member.weight).toBe(1);
            expect(member.expectedShare).toBeCloseTo(1 / row.pool.size, 13);
          }
        });
      }
    }
  });

  it('keeps modeled partner influence distinct from realized sampling and mutation differences', () => {
    const world = run(21, 5, { migration: .4, mutation: .05 });
    const rows = world.history.slice(1).flatMap(frame => [0, 1, 2].flatMap(island => m.partnerEvidence(world, frame.generation, island).rows));
    for (const sp of m.species) {
      const speciesRows = rows.filter(row => row.species === sp);
      expect(speciesRows.some(row => Math.abs(row.partnerDifference) > 1e-8)).toBe(true);
      expect(speciesRows.some(row => Math.abs(row.samplingDifference) > 1e-8)).toBe(true);
      expect(speciesRows.some(row => Math.abs(row.offspring.mean - row.expected) > 1e-8)).toBe(true);
    }
    expect(rows.some(row => Math.abs(row.mutationDifference) > 1e-8)).toBe(true);
    rows.forEach(row => expect(row.offspring.mean).toBeCloseTo(row.expected + row.samplingDifference + row.mutationDifference, 13));
  });

  it('counts origins after simultaneous dispersal without mistaking source cohorts for the breeding pool', () => {
    const world = run(21, 4, { migration: .4 }); let arrivals = 0;
    for (let generation = 1; generation <= 4; generation++) {
      const before = world.history[generation - 1], round = world.history[generation].round;
      const evidence = [0, 1, 2].map(island => m.partnerEvidence(world, generation, island));
      for (const sp of m.species) {
        const allMembers = evidence.flatMap(e => e.rows.find(row => row.species === sp).members);
        const previousIds = before.demes.flatMap(d => d[sp]).map(o => o.id);
        expect(allMembers.map(member => member.id).sort((a, b) => a - b)).toEqual(previousIds.slice().sort((a, b) => a - b));
        expect(new Set(allMembers.map(member => member.id)).size).toBe(previousIds.length);
      }
      evidence.forEach((e, island) => e.rows.forEach(row => {
        const other = e.rows.find(other => other.species === row.partnerSpecies);
        expect(row.origins).toEqual([0, 1, 2].map(origin => row.members.filter(member => member.from === origin).length));
        expect(row.origins.reduce((sum, n) => sum + n, 0)).toBe(row.pool.size);
        expect(row.partnerOrigins).toEqual(other.origins);
        expect(row.partnerOrigins.reduce((sum, n) => sum + n, 0)).toBe(row.partnerPool.size);
        const actualArrivals = round.migrants.filter(migrant => migrant.to === island && migrant.species === row.species);
        expect(row.members.filter(member => member.from !== island).map(member => member.id).sort((a, b) => a - b)).toEqual(actualArrivals.map(migrant => migrant.id).sort((a, b) => a - b));
        arrivals += actualArrivals.length;
      }));
    }
    expect(arrivals).toBeGreaterThan(0);
  });

  it('keeps absent expectations undefined and handles the exact two-parent boundary', () => {
    let world = m.create(11);
    const before = world.history[0], birdSource = before.demes[1].birds, plantSource = before.demes[1].plants;
    const demes = [0, 1, 2].map(island => ({ birds: island === 1 ? birdSource.slice(0, 2) : [], plants: island === 1 ? plantSource.slice(0, 1) : [] }));
    world = { ...world, settings: { ...world.settings, migration: 0, mutation: 0 }, history: [{ ...before, demes }] };
    world = m.step(world);
    const birds = m.partnerEvidence(world, 1, 1).rows[0], plants = m.partnerEvidence(world, 1, 1).rows[1];
    expect(birds.pool.size).toBe(2); expect(birds.offspring.size).toBe(24);
    birds.members.forEach(member => { expect(member.expectedShare).toBeCloseTo(.5, 13); expect(member.withoutPartnersShare).toBeCloseTo(.5, 13); });
    expect(birds.expected).toBeCloseTo(birds.pool.mean, 13); expect(birds.partnerDifference).toBeCloseTo(0, 13);
    expect(plants.pool.size).toBe(1); expect(plants.partnerPool.size).toBe(2); expect(plants.offspring.size).toBe(0);
    expect(plants.members[0].expectedShare).toBeNull(); expect(plants.members[0].withoutPartnersShare).toBeNull();
    for (const row of [plants, ...m.partnerEvidence(world, 1, 0).rows]) {
      for (const key of ['expected', 'withoutPartnersExpected', 'partnerDifference', 'inheritedMean', 'samplingDifference', 'mutationDifference']) expect(row[key]).toBeNull();
      expect(row.offspring.mean).toBeNull(); expect(row.offspring.p).toBeNull(); expect(row.offspring.H).toBeNull();
    }
  });

  it('uses captured round conditions even after next-round conditions are edited', () => {
    const world = run(17, 3, { reciprocal: true, rainfall: [.2, .4, .8], mutation: .05 });
    const original = [0, 1, 2].map(island => m.partnerEvidence(world, 2, island));
    const queued = { ...world, settings: { ...world.settings, rainfall: [1, 0, .1], reciprocal: false, selection: false, mutation: 0, migration: 0 } };
    for (let island = 0; island < 3; island++) {
      expect(m.partnerEvidence(queued, 2, island)).toEqual(original[island]);
      expect(original[island].settings).toEqual(world.history[2].round.settings);
      expect(original[island].settings).not.toEqual(queued.settings);
    }
  });

  it('rejects invalid contexts and leaves recorded history and the expedition random future intact', () => {
    const world = run(21, 3), frozen = JSON.stringify(world), future = m.step(world);
    for (const generation of [0, -1, 4, 1.5, NaN, '1', null]) expect(m.partnerEvidence(world, generation, 0)).toBeNull();
    for (const island of [-1, 3, .5, NaN, '0', null]) expect(m.partnerEvidence(world, 1, island)).toBeNull();
    for (const malformed of [null, {}, { generation: 1 }, { ...world, generation: NaN }, { ...world, generation: '3' }, { ...world, generation: 3.5 }, { ...world, history: [] }, { ...world, history: [world.history[0], { generation: 1, demes: [], round: null }] }]) expect(m.partnerEvidence(malformed, 1, 0)).toBeNull();
    for (let generation = 1; generation <= world.generation; generation++) for (let island = 0; island < 3; island++) {
      expect(m.partnerEvidence(world, generation, island)).toEqual(m.partnerEvidence(world, generation, island));
    }
    expect(JSON.stringify(world)).toBe(frozen); expect(m.step(world)).toEqual(future);
  });
});
