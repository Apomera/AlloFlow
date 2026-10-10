import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let m;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  m = window.StemLab.evoArchipelagoModel;
});
const copy = value => JSON.parse(JSON.stringify(value));
const schedule = [[.02, .8, .3], [1, .05, .2], [.7, .9, .02]];
function run(seed = 21, generations = 2, overrides = {}) {
  let world = m.create(seed);
  world.settings = { ...world.settings, ...overrides };
  for (let i = 0; i < generations; i++) world = m.step(world);
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
function expectedCopyShares(weights) {
  if (weights.length < 2) return weights.map(() => null);
  const sum = weights.reduce((total, weight) => total + weight, 0), shares = weights.map(() => 0);
  for (let first = 0; first < weights.length; first++) for (let second = 0; second < weights.length; second++) {
    if (first === second) continue;
    const pair = weights[first] / sum * weights[second] / (sum - weights[first]);
    shares[first] += pair / 2; shares[second] += pair / 2;
  }
  return shares;
}
function expectNullableClose(actual, expected) {
  if (expected === null) expect(actual).toBeNull();
  else expect(actual).toBeCloseTo(expected, 13);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('recorded weather breeding weights', () => {
  it('reconstructs both species from actual private weather pools and changes only captured rainfall', () => {
    const source = run(21, 2, { migration: .4, mutation: .05, rainfall: [.15, .5, .85] });
    const plan = m.climatePlan(source, { schedule, batch: 3 }), study = m.climateStudy(plan);
    for (const condition of ['steady', 'changing']) {
      const world = study[condition].world;
      for (const generation of [plan.start + 1, plan.end]) for (let island = 0; island < 3; island++) {
        const baselineRainfall = plan.settings.rainfall[island];
        const evidence = m.climateWeightEvidence(world, generation, island, baselineRainfall);
        const { frame, index, pools } = recordedPools(world, generation, island);
        expect(evidence).toMatchObject({ generation, island, settings: frame.round.settings, recordedRainfall: frame.round.settings.rainfall[island], baselineRainfall });
        expect(evidence.rows.map(row => row.species)).toEqual(['birds', 'plants']);
        for (const row of evidence.rows) {
          const sp = row.species, other = sp === 'birds' ? 'plants' : 'birds';
          const pool = pools[sp], partners = pools[other].map(p => p.organism), offspring = frame.demes[island][sp];
          const baselineSettings = { ...frame.round.settings, rainfall: frame.round.settings.rainfall.slice() };
          baselineSettings.rainfall[island] = baselineRainfall;
          const inherited = offspring.flatMap(child => child.parents.map((id, slot) => index.get(id).genes[child.inheritance[slot].copy]));
          expect(row.partnerSpecies).toBe(other);
          expect(row.pool).toEqual(m.stats(pool.map(p => p.organism)));
          expect(row.partnerPool).toEqual(m.stats(partners));
          expect(row.offspring).toEqual(m.stats(offspring));
          expect(row.members.map(member => member.id)).toEqual(pool.map(p => p.id));
          row.members.forEach((member, j) => {
            const original = pool[j];
            expect(member.from).toBe(original.from); expect(member.trait).toBe(m.value(original.organism));
            expect(member.recordedWeight).toBe(original.weight);
            expect(member.baselineWeight).toBe(m.fitness(original.organism, partners, baselineRainfall, baselineSettings));
            expect(member.gametes).toBe(offspring.flatMap(child => child.parents).filter(id => id === member.id).length);
          });
          expect(row.members.reduce((sum, member) => sum + member.gametes, 0)).toBe(offspring.length * 2);
          expectNullableClose(row.inheritedMean, inherited.length ? inherited.reduce((sum, allele) => sum + allele, 0) / inherited.length : null);
          const story = m.story(world, generation, island, sp);
          expectNullableClose(row.expected, story.stages.find(stage => stage.key === 'expected').trait);
        }
      }
    }
  });

  it('uses the exact ordered lottery of two distinct parents for both rainfall settings', () => {
    const world = run(73, 3, { migration: .4, rainfall: [.02, .95, .1] });
    let differedFromSingleDraw = false;
    for (let island = 0; island < 3; island++) for (const row of m.climateWeightEvidence(world, 3, island, .6).rows) {
      for (const [weightKey, shareKey, expectedKey] of [['recordedWeight', 'recordedShare', 'expected'], ['baselineWeight', 'baselineShare', 'baselineExpected']]) {
        const weights = row.members.map(member => member[weightKey]), shares = expectedCopyShares(weights), total = weights.reduce((sum, weight) => sum + weight, 0);
        expect(row.members.reduce((sum, member) => sum + member[shareKey], 0)).toBeCloseTo(1, 13);
        row.members.forEach((member, index) => {
          expect(member[shareKey]).toBeCloseTo(shares[index], 13);
          expect(member[shareKey]).toBeCloseTo(m.parentShares(weights)[index], 13);
          if (Math.abs(member[shareKey] - weights[index] / total) > 1e-8) differedFromSingleDraw = true;
        });
        expect(row[expectedKey]).toBeCloseTo(row.members.reduce((sum, member, index) => sum + member.trait * shares[index], 0), 13);
      }
    }
    expect(differedFromSingleDraw).toBe(true);
  });

  it('keeps rainfall weighting separate from actual sampling and mutation outcomes', () => {
    const plan = m.climatePlan(run(21, 2, { migration: .4, mutation: .05 }), { schedule });
    const world = m.climateBranch(plan, 'changing');
    const rows = world.history.slice(plan.start + 1).flatMap(frame => [0, 1, 2].flatMap(island => m.climateWeightEvidence(world, frame.generation, island, plan.settings.rainfall[island]).rows));
    for (const species of m.species) {
      const selected = rows.filter(row => row.species === species);
      expect(selected.some(row => Math.abs(row.rainfallDifference) > 1e-8)).toBe(true);
      expect(selected.some(row => Math.abs(row.samplingDifference) > 1e-8)).toBe(true);
    }
    expect(rows.some(row => Math.abs(row.mutationDifference) > 1e-8)).toBe(true);
    rows.forEach(row => {
      expect(row.rainfallDifference).toBe(row.expected - row.baselineExpected);
      expect(row.samplingDifference).toBe(row.inheritedMean - row.expected);
      expect(row.mutationDifference).toBe(row.offspring.mean - row.inheritedMean);
      expect(row.offspring.mean).toBeCloseTo(row.baselineExpected + row.rainfallDifference + row.samplingDifference + row.mutationDifference, 13);
    });
  });

  it('provides exact zero contrasts with selection off and with unchanged rainfall', () => {
    for (const selection of [true, false]) {
      const world = run(83, 3, { selection, reciprocal: true, migration: .4, mutation: .05, rainfall: [.02, .9, .45] });
      for (let island = 0; island < 3; island++) {
        const baselines = selection ? [world.history[3].round.settings.rainfall[island]] : [0, 1];
        for (const baseline of baselines) for (const row of m.climateWeightEvidence(world, 3, island, baseline).rows) {
          expect(row.rainfallDifference).toBe(0); expect(row.expected).toBe(row.baselineExpected);
          row.members.forEach(member => {
            expect(member.recordedWeight).toBe(member.baselineWeight);
            expect(member.recordedShare).toBe(member.baselineShare);
            if (!selection) {
              expect(member.recordedWeight).toBe(1);
              expect(member.recordedShare).toBeCloseTo(1 / row.pool.size, 13);
            }
          });
        }
      }
    }
  });

  it('uses captured conditions and actual opposing pools after upcoming controls are edited', () => {
    const world = run(17, 3, { reciprocal: true, rainfall: [.2, .4, .8], mutation: .05, migration: .4 });
    const original = [0, 1, 2].map(island => m.climateWeightEvidence(world, 2, island, .7));
    const queued = { ...world, settings: { ...world.settings, rainfall: [1, 0, .1], reciprocal: false, selection: false, mutation: 0, migration: 0 } };
    for (let island = 0; island < 3; island++) {
      expect(m.climateWeightEvidence(queued, 2, island, .7)).toEqual(original[island]);
      expect(original[island].settings).toEqual(world.history[2].round.settings);
      expect(original[island].settings).not.toEqual(queued.settings);
    }
    const changedBaseline = m.climateWeightEvidence(world, 2, 0, 0), row = original[0].rows[0];
    expect(changedBaseline.rows[0].pool).toEqual(row.pool);
    expect(changedBaseline.rows[0].partnerPool).toEqual(row.partnerPool);
    expect(changedBaseline.rows[0].offspring).toEqual(row.offspring);
    expect(changedBaseline.rows[0].members.map(member => member.recordedWeight)).toEqual(row.members.map(member => member.recordedWeight));
    expect(changedBaseline.rows[0].members.map(member => member.baselineWeight)).not.toEqual(row.members.map(member => member.baselineWeight));
  });

  it('counts recorded post-dispersal origins and keeps every parent in exactly one destination pool', () => {
    const world = run(21, 3, { migration: .4 }); let arrivals = 0;
    for (let generation = 1; generation <= 3; generation++) {
      const before = world.history[generation - 1], round = world.history[generation].round;
      const evidence = [0, 1, 2].map(island => m.climateWeightEvidence(world, generation, island, .5));
      for (const species of m.species) {
        const ids = evidence.flatMap(e => e.rows.find(row => row.species === species).members.map(member => member.id));
        expect(ids.slice().sort((a, b) => a - b)).toEqual(before.demes.flatMap(d => d[species].map(o => o.id)).sort((a, b) => a - b));
        expect(new Set(ids).size).toBe(ids.length);
      }
      evidence.forEach((e, island) => e.rows.forEach(row => {
        expect(row.origins).toEqual([0, 1, 2].map(origin => row.members.filter(member => member.from === origin).length));
        expect(row.origins.reduce((sum, n) => sum + n, 0)).toBe(row.pool.size);
        expect(row.partnerOrigins).toEqual(e.rows.find(other => other.species === row.partnerSpecies).origins);
        expect(row.partnerOrigins.reduce((sum, n) => sum + n, 0)).toBe(row.partnerPool.size);
        const migrants = round.migrants.filter(migrant => migrant.to === island && migrant.species === row.species);
        expect(row.members.filter(member => member.from !== island).map(member => member.id).sort((a, b) => a - b)).toEqual(migrants.map(migrant => migrant.id).sort((a, b) => a - b));
        arrivals += migrants.length;
      }));
    }
    expect(arrivals).toBeGreaterThan(0);
  });

  it('handles empty opposing pools, one-parent extinction and the exact two-parent boundary', () => {
    let world = m.create(11);
    const before = world.history[0];
    const demes = [
      { birds: before.demes[0].birds.slice(0, 2), plants: [] },
      { birds: [], plants: before.demes[1].plants.slice(0, 2) },
      { birds: before.demes[2].birds.slice(0, 1), plants: before.demes[2].plants.slice(0, 1) }
    ];
    world = m.step({ ...world, settings: { ...world.settings, migration: 0, mutation: 0 }, history: [{ ...before, demes }] });
    const evidence = [0, 1, 2].map(island => m.climateWeightEvidence(world, 1, island, 1));
    for (const row of [evidence[0].rows[0], evidence[1].rows[1]]) {
      expect(row.pool.size).toBe(2); expect(row.partnerPool.size).toBe(0); expect(row.offspring.size).toBe(24);
      row.members.forEach(member => {
        expect(member.recordedShare).toBeCloseTo(.5, 13);
        expect(member.baselineShare).toBeCloseTo(.5, 13);
      });
      expect(row.expected).toBeCloseTo(row.pool.mean, 13);
      expect(row.baselineExpected).toBeCloseTo(row.pool.mean, 13);
      expect(row.rainfallDifference).toBeCloseTo(0, 13);
    }
    for (const row of [evidence[0].rows[1], evidence[1].rows[0], ...evidence[2].rows]) {
      expect(row.pool.size).toBeLessThan(2); expect(row.offspring.size).toBe(0);
      row.members.forEach(member => { expect(member.recordedShare).toBeNull(); expect(member.baselineShare).toBeNull(); expect(member.gametes).toBe(0); });
      for (const key of ['expected', 'baselineExpected', 'rainfallDifference', 'inheritedMean', 'samplingDifference', 'mutationDifference']) expect(row[key]).toBeNull();
      expect(row.offspring.mean).toBeNull(); expect(row.offspring.p).toBeNull(); expect(row.offspring.H).toBeNull();
    }
  });

  it('leaves frozen recorded history, private randomness and expedition futures intact', () => {
    const plan = m.climatePlan(run(), { schedule }), world = m.climateBranch(plan, 'changing');
    const original = JSON.stringify(world), future = m.step(world);
    freeze(world);
    for (let generation = plan.start + 1; generation <= plan.end; generation++) for (let island = 0; island < 3; island++) {
      const evidence = m.climateWeightEvidence(world, generation, island, plan.settings.rainfall[island]);
      expect(evidence).not.toBeNull();
      expect(m.climateWeightEvidence(world, generation, island, plan.settings.rainfall[island])).toEqual(evidence);
      evidence.settings.rainfall[island] = .123;
      evidence.rows[0].origins[0] = 999; evidence.rows[0].members[0].trait = 999;
      evidence.rows[1].partnerOrigins[0] = 999; evidence.rows[1].offspring.mean = 999;
      expect(m.climateWeightEvidence(world, generation, island, plan.settings.rainfall[island]).rows[0].members[0].trait).toBeLessThanOrEqual(1);
    }
    expect(JSON.stringify(world)).toBe(original); expect(m.step(world)).toEqual(future);
  });

  it('rejects invalid selectors, absent rounds and malformed recorded pools or parent copies', () => {
    const world = run(21, 3), original = JSON.stringify(world);
    for (const generation of [0, -1, 4, 1.5, NaN, '1', null]) expect(m.climateWeightEvidence(world, generation, 0, .5)).toBeNull();
    for (const island of [-1, 3, .5, NaN, '0', null]) expect(m.climateWeightEvidence(world, 1, island, .5)).toBeNull();
    for (const rainfall of [-.01, 1.01, NaN, Infinity, '.5', null, undefined]) expect(m.climateWeightEvidence(world, 1, 0, rainfall)).toBeNull();
    for (const malformed of [null, {}, [], m.create(21), { ...world, generation: NaN }, { ...world, generation: '3' }, { ...world, generation: 3.5 }, { ...world, history: [] }]) expect(m.climateWeightEvidence(malformed, 1, 0, .5)).toBeNull();
    const edits = [
      w => { w.history[1].round = null; },
      w => { w.history[1].generation = 2; },
      w => { w.history[0].demes = []; },
      w => { w.history[1].demes[0].birds = null; },
      w => { w.history[1].round.settings.rainfall[0] = '0'; },
      w => { w.history[1].round.contributions = w.history[1].round.contributions.filter(c => c.island !== 0 || c.species !== 'plants'); },
      w => { w.history[1].round.contributions.push(copy(w.history[1].round.contributions[0])); },
      w => { w.history[1].round.contributions[0].members.push(copy(w.history[1].round.contributions[0].members[0])); },
      w => { w.history[1].round.contributions[0].members[0].from = (w.history[1].round.contributions[0].members[0].from + 1) % 3; },
      w => { w.history[1].round.contributions[0].members[0].id = -1; },
      w => { w.history[1].round.contributions[0].members[0].weight = 0; },
      w => { w.history[1].round.contributions[0].members[0].weight = NaN; },
      w => { w.history[0].demes[0].birds[0].genes[0] = NaN; },
      w => { w.history[0].demes[0].birds.push(copy(w.history[0].demes[0].birds[0])); },
      w => { w.history[1].demes[0].birds[0].parents[1] = w.history[1].demes[0].birds[0].parents[0]; },
      w => { w.history[1].demes[0].birds[0].parents[0] = w.history[0].demes.flatMap(d => d.plants)[0].id; },
      w => { w.history[1].demes[0].birds[0].inheritance[0].copy = 2; },
      w => { w.history[1].demes[0].birds[0].inheritance[0].delta = Infinity; },
      w => { w.history[1].demes[0].birds[0].genes[0] = .123456789; }
    ];
    for (const edit of edits) { const malformed = copy(world); edit(malformed); expect(m.climateWeightEvidence(malformed, 1, 0, .5)).toBeNull(); }
    expect(JSON.stringify(world)).toBe(original);
  });
});
