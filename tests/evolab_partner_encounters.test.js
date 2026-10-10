import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let m;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  m = window.StemLab.evoArchipelagoModel;
});
const copy = value => JSON.parse(JSON.stringify(value));
const trait = organism => (organism.genes[0] + organism.genes[1]) / 2;
const access = (beak, shell) => .08 + .84 / (1 + Math.exp(-10 * (beak - shell)));
const otherSpecies = species => species === 'birds' ? 'plants' : 'birds';
function run(seed = 21, generations = 3, overrides = {}) {
  let world = m.create(seed);
  world.settings = { ...world.settings, ...overrides };
  for (let i = 0; i < generations; i++) world = m.step(world);
  return world;
}
function pools(world, generation, island) {
  const before = world.history[generation - 1], frame = world.history[generation];
  const index = new Map(before.demes.flatMap((deme, from) => m.species.flatMap(species => deme[species].map(organism => [organism.id, { organism, from }]))));
  const groups = Object.fromEntries(m.species.map(species => [species, frame.round.contributions.find(row => row.island === island && row.species === species).members.map(member => ({ ...member, organism: index.get(member.id).organism }))]));
  return { before, frame, groups };
}
function independentFitness(organism, partners, rain, settings) {
  if (!settings.selection) return 1;
  const value = trait(organism), bird = organism.species === 'birds';
  const ideal = bird ? .72 - .42 * rain : .6 - .4 * rain;
  const habitat = .25 + .75 * Math.exp(-(((value - ideal) / .38) ** 2));
  const mean = partners.length ? partners.reduce((sum, partner) => sum + (bird ? access(value, trait(partner)) : access(trait(partner), value)), 0) / partners.length : 0;
  const factor = settings.reciprocal ? bird ? .18 + .82 * mean : 1 - .75 * mean : 1;
  const cost = bird ? 1 - .32 * value * value : Math.max(.12, 1 - .45 * value * value / (.35 + rain));
  return .04 + habitat * factor * cost;
}
function assertEncounter(world, generation, island, species, member) {
  const { frame, groups } = pools(world, generation, island), partnerSpecies = otherSpecies(species);
  const partners = groups[partnerSpecies], settings = frame.round.settings;
  const expected = partners.map(partner => ({ id: partner.id, from: partner.from, trait: trait(partner.organism), access: species === 'birds' ? access(trait(member.organism), trait(partner.organism)) : access(trait(partner.organism), trait(member.organism)) }));
  const meanAccess = expected.length ? expected.reduce((sum, partner) => sum + partner.access, 0) / expected.length : null;
  const partnerMean = partners.length ? partners.reduce((sum, partner) => sum + trait(partner.organism), 0) / partners.length : null;
  const accessAtMean = partnerMean === null ? null : species === 'birds' ? access(trait(member.organism), partnerMean) : access(partnerMean, trait(member.organism));
  const evidence = m.partnerEncounterEvidence(world, generation, island, species, member.id);
  expect(evidence).toMatchObject({ generation, island, species, partnerSpecies, parent: { id: member.id, from: member.from, trait: trait(member.organism) }, settings, active: settings.selection && settings.reciprocal });
  expect(evidence.partners).toEqual(expected);
  for (const [key, value] of Object.entries({ meanAccess, accessAtMean, meanDifference: meanAccess === null ? null : meanAccess - accessAtMean })) {
    if (value === null) expect(evidence[key]).toBeNull();
    else expect(evidence[key]).toBeCloseTo(value, 13);
  }
  expect(evidence.effectiveAccess).toBe(meanAccess === null ? 0 : meanAccess);
  const active = settings.selection && settings.reciprocal;
  expect(evidence.partnerFactor).toBeCloseTo(active ? species === 'birds' ? .18 + .82 * evidence.effectiveAccess : 1 - .75 * evidence.effectiveAccess : 1, 13);
  expect(evidence.recordedWeight).toBe(member.weight);
  expect(evidence.recordedWeight).toBeCloseTo(independentFitness(member.organism, partners.map(partner => partner.organism), settings.rainfall[island], settings), 13);
  expect(evidence.withoutPartnersWeight).toBeCloseTo(independentFitness(member.organism, partners.map(partner => partner.organism), settings.rainfall[island], { ...settings, reciprocal: false }), 13);
  return evidence;
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('individual reciprocal encounters in recorded breeding pools', () => {
  it('reconstructs both species on every island against the actual opposing distribution', () => {
    const world = run(21, 3, { migration: .4, mutation: .05, rainfall: [.1, .6, .9] });
    for (const generation of [1, 3]) for (let island = 0; island < 3; island++) {
      const { groups } = pools(world, generation, island);
      for (const species of m.species) for (const member of [groups[species][0], groups[species].at(-1)]) assertEncounter(world, generation, island, species, member);
    }
  });

  it('keeps nonlinear mean access distinct from access to a hypothetical mean partner', () => {
    let world = m.create(11);
    const before = world.history[0];
    const birds = before.demes[1].birds.slice(0, 2).map((organism, i) => ({ ...organism, genes: [i ? .9 : .2, i ? .9 : .2] }));
    const plants = before.demes[1].plants.slice(0, 2).map((organism, i) => ({ ...organism, genes: [i, i] }));
    const demes = [0, 1, 2].map(island => ({ birds: island === 1 ? birds : [], plants: island === 1 ? plants : [] }));
    world = m.step({ ...world, settings: { ...world.settings, reciprocal: true, selection: true, migration: 0, mutation: 0 }, history: [{ ...before, demes }] });
    const { groups } = pools(world, 1, 1);
    for (const species of m.species) {
      const evidence = assertEncounter(world, 1, 1, species, groups[species][0]);
      expect(Math.abs(evidence.meanDifference)).toBeGreaterThan(.001);
      expect(evidence.meanAccess).toBe(evidence.partners.reduce((sum, partner) => sum + partner.access, 0) / 2);
      expect(evidence.partnerFactor).not.toBe(species === 'birds' ? .18 + .82 * evidence.accessAtMean : 1 - .75 * evidence.accessAtMean);
      // The hypothetical mean partner is only a comparison, never an extra organism.
      expect(evidence.partners.map(partner => partner.id)).toEqual(groups[otherSpecies(species)].map(partner => partner.id));
    }
  });

  it('uses recorded dispersal destinations and prior islands rather than source census membership', () => {
    const world = run(73, 3, { migration: .4 }); let arrivals = 0;
    for (let generation = 1; generation <= 3; generation++) for (let island = 0; island < 3; island++) {
      const { groups, frame } = pools(world, generation, island);
      for (const species of m.species) for (const member of groups[species].filter(member => member.from !== island)) {
        const evidence = assertEncounter(world, generation, island, species, member);
        expect(frame.round.migrants).toContainEqual(expect.objectContaining({ id: member.id, from: member.from, to: island, species }));
        expect(evidence.partners.map(partner => [partner.id, partner.from])).toEqual(groups[otherSpecies(species)].map(partner => [partner.id, partner.from]));
        arrivals++;
      }
    }
    expect(arrivals).toBeGreaterThan(0);
  });

  it('leaves empty opposing means undefined while exposing the model’s explicit zero-access fallback', () => {
    let world = m.create(11);
    const before = world.history[0];
    const demes = [
      { birds: before.demes[0].birds.slice(0, 2), plants: [] },
      { birds: [], plants: before.demes[1].plants.slice(0, 2) },
      { birds: [], plants: [] }
    ];
    world = m.step({ ...world, settings: { ...world.settings, migration: 0, mutation: 0, reciprocal: true, selection: true }, history: [{ ...before, demes }] });
    for (const [island, species, factor] of [[0, 'birds', .18], [1, 'plants', 1]]) {
      const member = pools(world, 1, island).groups[species][0], evidence = assertEncounter(world, 1, island, species, member);
      expect(evidence.partners).toEqual([]);
      for (const key of ['meanAccess', 'accessAtMean', 'meanDifference']) expect(evidence[key]).toBeNull();
      expect(evidence.effectiveAccess).toBe(0); expect(evidence.partnerFactor).toBe(factor); expect(evidence.active).toBe(true);
    }
    expect(m.partnerEncounterEvidence(world, 1, 2, 'birds', before.demes[2].birds[0].id)).toBeNull();
  });

  it('retains access evidence but applies no partner factor when reciprocal effects or selection are off', () => {
    for (const controls of [{ reciprocal: false, selection: true }, { reciprocal: true, selection: false }, { reciprocal: false, selection: false }]) {
      const world = run(83, 2, { ...controls, migration: .4 });
      for (let island = 0; island < 3; island++) for (const species of m.species) {
        const evidence = assertEncounter(world, 2, island, species, pools(world, 2, island).groups[species][0]);
        expect(evidence.partners.length).toBeGreaterThan(0); expect(evidence.meanAccess).toBeGreaterThan(0);
        expect(evidence.active).toBe(false); expect(evidence.partnerFactor).toBe(1);
        expect(evidence.recordedWeight).toBe(evidence.withoutPartnersWeight);
        if (!controls.selection) expect(evidence.recordedWeight).toBe(1);
      }
    }
  });

  it('reads captured conditions even after upcoming weather and selection controls change', () => {
    const world = run(17, 3, { reciprocal: true, rainfall: [.2, .4, .8], mutation: .05, migration: .4 });
    const queued = { ...world, settings: { ...world.settings, rainfall: [1, 0, .1], reciprocal: false, selection: false, mutation: 0, migration: 0 } };
    for (let island = 0; island < 3; island++) for (const species of m.species) {
      const member = pools(world, 2, island).groups[species][0];
      const evidence = assertEncounter(world, 2, island, species, member);
      expect(m.partnerEncounterEvidence(queued, 2, island, species, member.id)).toEqual(evidence);
      expect(evidence.settings).toEqual(world.history[2].round.settings);
      expect(evidence.settings).not.toEqual(queued.settings);
    }
  });

  it('uses the exact selected private weather and factorial-study pools throughout their futures', () => {
    const source = run(21, 2, { migration: .4, mutation: .05, rainfall: [.1, .5, .9] });
    const climate = m.climatePlan(source, { schedule: [[.02, .8, .3], [1, .05, .2]], batch: 4 });
    const research = m.researchPlan(source, { replicates: 2, rounds: 2, batch: 4 });
    const contexts = ['steady', 'changing'].map(condition => m.climateBranch(climate, condition)).concat(research.conditions.map(condition => m.researchBranch(source, research, 1, condition.id)));
    for (const world of contexts) {
      expect(world.privateResearch).toBe(true);
      for (let generation = source.generation + 1; generation <= world.generation; generation++) for (let island = 0; island < 3; island++) for (const species of m.species) {
        const member = pools(world, generation, island).groups[species][0];
        if (member) assertEncounter(world, generation, island, species, member);
      }
    }
  });

  it('returns detached evidence without altering frozen history, private randomness or the next generation', () => {
    const source = run(), plan = m.climatePlan(source, { schedule: [[.02, .8, .3], [1, .05, .2]], batch: 4 });
    const world = m.climateBranch(plan, 'changing'), original = JSON.stringify(world), future = m.step(world);
    freeze(world);
    for (let island = 0; island < 3; island++) for (const species of m.species) {
      const member = pools(world, world.generation, island).groups[species][0];
      const expected = assertEncounter(world, world.generation, island, species, member);
      const evidence = m.partnerEncounterEvidence(world, world.generation, island, species, member.id);
      expect(evidence).toEqual(expected);
      evidence.parent.trait = 999; evidence.parent.from = 999;
      evidence.partners[0].trait = 999; evidence.partners[0].access = 999;
      evidence.partners.push({ id: -1 }); evidence.settings.rainfall[island] = .123;
      expect(m.partnerEncounterEvidence(world, world.generation, island, species, member.id)).toEqual(expected);
    }
    expect(JSON.stringify(world)).toBe(original); expect(m.step(world)).toEqual(future);
  });

  it('rejects invalid selectors, nonmembers, inconsistent weights and malformed captured traces', () => {
    const world = run(), { groups } = pools(world, 1, 0), id = groups.birds[0].id, original = JSON.stringify(world);
    for (const generation of [0, -1, 4, 1.5, NaN, '1', null]) expect(m.partnerEncounterEvidence(world, generation, 0, 'birds', id)).toBeNull();
    for (const island of [-1, 3, .5, NaN, '0', null]) expect(m.partnerEncounterEvidence(world, 1, island, 'birds', id)).toBeNull();
    for (const species of ['fish', 'Birds', '', null, undefined, 0]) expect(m.partnerEncounterEvidence(world, 1, 0, species, id)).toBeNull();
    for (const parent of [0, -1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, String(id), null, undefined, groups.plants[0].id]) expect(m.partnerEncounterEvidence(world, 1, 0, 'birds', parent)).toBeNull();
    const nonmember = world.history[0].demes.flatMap(deme => deme.birds).find(organism => !groups.birds.some(member => member.id === organism.id));
    expect(nonmember).toBeDefined(); expect(m.partnerEncounterEvidence(world, 1, 0, 'birds', nonmember.id)).toBeNull();
    for (const malformed of [null, {}, [], m.create(21), { ...world, generation: NaN }, { ...world, generation: '3' }, { ...world, history: [] }]) expect(m.partnerEncounterEvidence(malformed, 1, 0, 'birds', id)).toBeNull();
    const edits = [
      w => { w.history[1].round = null; },
      w => { w.history[1].generation = 2; },
      w => { w.history[1].round.settings.rainfall[0] = '0'; },
      w => { w.history[1].round.contributions = w.history[1].round.contributions.filter(row => row.island !== 0 || row.species !== 'plants'); },
      w => { w.history[1].round.contributions.push(copy(w.history[1].round.contributions.find(row => row.island === 0 && row.species === 'birds'))); },
      w => { const row = w.history[1].round.contributions.find(row => row.island === 0 && row.species === 'birds'); row.members.push(copy(row.members[0])); },
      w => { const member = w.history[1].round.contributions.find(row => row.island === 0 && row.species === 'birds').members.find(member => member.id === id); member.weight *= 1.01; },
      w => { const member = w.history[1].round.contributions.find(row => row.island === 0 && row.species === 'birds').members.find(member => member.id === id); member.from = (member.from + 1) % 3; },
      w => { w.history[0].demes[0].birds.push(copy(w.history[0].demes[0].birds[0])); },
      w => { delete w.history[0].demes[0].birds[0].genes[0]; },
      w => { w.history[1].demes[0].birds[0].parents[1] = w.history[1].demes[0].birds[0].parents[0]; },
      w => { w.history[1].demes[0].birds[0].inheritance[0].copy = 2; },
      w => { w.history[1].demes[0].birds[0].inheritance[0].markerCopy = 2; },
      w => { w.history[1].demes[0].birds[0].inheritance[0].delta = Infinity; },
      w => { w.history[1].demes[0].birds[0].genes[0] = .123456789; }
    ];
    for (const edit of edits) { const malformed = copy(world); edit(malformed); expect(m.partnerEncounterEvidence(malformed, 1, 0, 'birds', id)).toBeNull(); }
    expect(JSON.stringify(world)).toBe(original);
  });
});
