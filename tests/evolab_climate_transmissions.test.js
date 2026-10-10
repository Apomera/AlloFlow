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
function run(seed = 21, rounds = 2, overrides = {}) {
  let world = m.create(seed);
  world.settings = { ...world.settings, ...overrides };
  for (let generation = 0; generation < rounds; generation++) world = m.step(world);
  return world;
}
function recordedCopies(world, generation, island, species) {
  const before = world.history[generation - 1], frame = world.history[generation];
  const parents = new Map(before.demes.flatMap((deme, from) => deme[species].map(organism => [organism.id, { organism, from }])));
  return frame.demes[island][species].flatMap(child => child.parents.map((parent, slot) => {
    const source = parents.get(parent), event = child.inheritance[slot];
    return { child: child.id, slot, parent, from: source.from, traitCopy: event.copy, markerCopy: event.markerCopy,
      traitBefore: source.organism.genes[event.copy], traitAfter: child.genes[slot], delta: event.delta, marker: child.marker[slot] };
  }));
}
function allTransmissions(row) { return row.members.flatMap(member => member.transmissions); }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function twoParentWorld(seed, mutation = 0) {
  const world = m.create(seed), before = world.history[0];
  const demes = before.demes.map(deme => Object.fromEntries(m.species.map(species => [species, deme[species].slice(0, 2).map((organism, index) => ({ ...organism, genes: [index, index], marker: [0, 1] }))])));
  return m.step({ ...world, settings: { ...world.settings, migration: 0, mutation }, history: [{ ...before, demes }] });
}

describe('recorded weather parental transmissions', () => {
  it('reconstructs exact trait and marker copies for both species, every island and every private weather generation', () => {
    const plan = m.climatePlan(run(21, 2, { migration: .4, mutation: .05 }), { schedule, batch: 3 });
    const study = m.climateStudy(plan);
    let migratedCopies = 0;
    for (const condition of ['steady', 'changing']) {
      const world = study[condition].world;
      for (let generation = plan.start + 1; generation <= plan.end; generation++) for (let island = 0; island < 3; island++) {
        const evidence = m.climateWeightEvidence(world, generation, island, plan.settings.rainfall[island]);
        expect(evidence).not.toBeNull();
        for (const row of evidence.rows) {
          const expected = recordedCopies(world, generation, island, row.species);
          row.members.forEach(member => {
            expect(member.transmissions).toEqual(expected.filter(event => event.parent === member.id));
            expect(member.transmissions).toHaveLength(member.gametes);
            member.transmissions.forEach(event => {
              expect(event.parent).toBe(member.id); expect(event.from).toBe(member.from);
              if (event.from !== island) migratedCopies++;
            });
          });
          expect(allTransmissions(row).reduce((sum, event) => sum + event.traitBefore, 0) / expected.length).toBeCloseTo(row.inheritedMean, 13);
        }
      }
    }
    expect(migratedCopies).toBeGreaterThan(0);
  });

  it('accounts for each newborn slot exactly once and preserves recorded newborn order within each parent', () => {
    const world = run(73, 3, { migration: .4, mutation: .05 });
    for (let generation = 1; generation <= 3; generation++) for (let island = 0; island < 3; island++) {
      for (const row of m.climateWeightEvidence(world, generation, island, .5).rows) {
        const born = world.history[generation].demes[island][row.species], transmissions = allTransmissions(row);
        const expectedKeys = born.flatMap(child => [child.id + ':0', child.id + ':1']);
        expect(born).toHaveLength(24); expect(transmissions).toHaveLength(48);
        const keys = transmissions.map(event => event.child + ':' + event.slot);
        expect(new Set(keys).size).toBe(48);
        expect(keys.slice().sort()).toEqual(expectedKeys.slice().sort());
        const positions = new Map(expectedKeys.map((key, index) => [key, index]));
        row.members.forEach(member => {
          const order = member.transmissions.map(event => positions.get(event.child + ':' + event.slot));
          expect(order).toEqual(order.slice().sort((a, b) => a - b));
        });
        born.forEach(child => {
          const events = transmissions.filter(event => event.child === child.id).sort((a, b) => a.slot - b.slot);
          expect(events.map(event => event.parent)).toEqual(child.parents);
          expect(events[0].parent).not.toBe(events[1].parent);
        });
      }
    }
  });

  it('retains the drawn mutation delta when reflecting a trait copy at a boundary', () => {
    const world = twoParentWorld(21, .05);
    const events = [0, 1, 2].flatMap(island => m.climateWeightEvidence(world, 1, island, .5).rows.flatMap(allTransmissions));
    const mutated = events.filter(event => event.delta !== null);
    expect(mutated.length).toBeGreaterThan(0);
    let reflections = 0;
    events.forEach(event => {
      const unbounded = event.traitBefore + (event.delta === null ? 0 : event.delta);
      const reflected = unbounded < 0 ? -unbounded : unbounded > 1 ? 2 - unbounded : unbounded;
      expect(event.traitAfter).toBe(reflected);
      if (unbounded < 0 || unbounded > 1) {
        reflections++;
        expect(event.delta).not.toBe(event.traitAfter - event.traitBefore);
      }
      if (event.delta === null) expect(event.traitAfter).toBe(event.traitBefore);
    });
    expect(reflections).toBeGreaterThan(0);
  });

  it('uses the independently drawn marker index even when it differs from the trait index', () => {
    const world = twoParentWorld(73);
    let differentChoices = 0;
    for (let island = 0; island < 3; island++) for (const row of m.climateWeightEvidence(world, 1, island, .5).rows) {
      const expected = recordedCopies(world, 1, island, row.species);
      allTransmissions(row).forEach(event => {
        const recorded = expected.find(record => record.child === event.child && record.slot === event.slot);
        expect(event.markerCopy).toBe(recorded.markerCopy); expect(event.traitCopy).toBe(recorded.traitCopy);
        expect(event.marker).toBe(event.markerCopy);
        if (event.markerCopy !== event.traitCopy) {
          differentChoices++;
          expect(event.marker).not.toBe(event.traitCopy);
        }
      });
    }
    expect(differentChoices).toBeGreaterThan(0);
  });

  it('returns empty transmission arrays for sampled noncontributors and extinct one-parent pools', () => {
    const populated = run(21, 1, { migration: 0, selection: false, mutation: 0 });
    const unsampled = [0, 1, 2].flatMap(island => m.climateWeightEvidence(populated, 1, island, .5).rows.flatMap(row => row.members.filter(member => member.gametes === 0)));
    expect(unsampled.length).toBeGreaterThan(0);
    unsampled.forEach(member => expect(member.transmissions).toEqual([]));

    const initial = m.create(11), before = initial.history[0];
    const demes = before.demes.map((deme, island) => ({ birds: island === 0 ? deme.birds.slice(0, 1) : [], plants: island === 1 ? deme.plants.slice(0, 1) : [] }));
    const world = m.step({ ...initial, settings: { ...initial.settings, migration: 0, mutation: 0 }, history: [{ ...before, demes }] });
    for (let island = 0; island < 3; island++) for (const row of m.climateWeightEvidence(world, 1, island, .5).rows) {
      expect(row.offspring.size).toBe(0); expect(allTransmissions(row)).toEqual([]);
      row.members.forEach(member => { expect(member.gametes).toBe(0); expect(member.transmissions).toEqual([]); });
    }
  });

  it('keeps transmission identity tied to its recorded context when baseline rain and upcoming controls change', () => {
    const plan = m.climatePlan(run(17, 2, { migration: .4, mutation: .05 }), { schedule });
    const world = m.climateBranch(plan, 'changing');
    const queued = { ...world, settings: { ...world.settings, rainfall: [1, 0, .1], selection: false, reciprocal: false, migration: 0, mutation: 0 } };
    for (let generation = plan.start + 1; generation <= plan.end; generation++) for (let island = 0; island < 3; island++) {
      const original = m.climateWeightEvidence(world, generation, island, 0);
      const changed = m.climateWeightEvidence(queued, generation, island, 1);
      expect(changed.generation).toBe(generation); expect(changed.island).toBe(island);
      expect(changed.settings).toEqual(world.history[generation].round.settings);
      changed.rows.forEach((row, index) => {
        expect(row.species).toBe(original.rows[index].species);
        expect(row.members.map(member => ({ id: member.id, transmissions: member.transmissions }))).toEqual(original.rows[index].members.map(member => ({ id: member.id, transmissions: member.transmissions })));
      });
    }
  });

  it('detaches every output event from frozen history and preserves source and private random futures', () => {
    const source = run(21, 2, { migration: .4, mutation: .05 });
    const plan = m.climatePlan(source, { schedule }), world = m.climateBranch(plan, 'changing');
    const sourceSnapshot = JSON.stringify(source), worldSnapshot = JSON.stringify(world);
    const sourceFuture = m.step(source), privateFuture = m.step(world);
    freeze(source); freeze(world);
    for (let generation = plan.start + 1; generation <= plan.end; generation++) for (let island = 0; island < 3; island++) {
      const evidence = m.climateWeightEvidence(world, generation, island, .5);
      const pristine = copy(evidence);
      for (const row of evidence.rows) {
        const member = row.members.find(parent => parent.transmissions.length);
        member.transmissions[0].traitBefore = 999;
        member.transmissions[0].marker = 999;
        member.transmissions[0].child = -1;
        member.transmissions.push({ child: -2 });
        row.members[0].transmissions = [];
      }
      expect(m.climateWeightEvidence(world, generation, island, .5)).toEqual(pristine);
    }
    expect(JSON.stringify(source)).toBe(sourceSnapshot); expect(JSON.stringify(world)).toBe(worldSnapshot);
    expect(m.step(source)).toEqual(sourceFuture); expect(m.step(world)).toEqual(privateFuture);
    expect(m.climateBranch(plan, 'changing')).toEqual(world);
  });

  it('rejects missing marker choices, altered inherited markers and malformed newborn slot records', () => {
    const world = run(73, 1, { migration: .4 }), snapshot = JSON.stringify(world);
    const edits = [
      child => { delete child.inheritance[0].markerCopy; },
      child => { child.inheritance[0].markerCopy = '0'; },
      child => { child.marker[0] = 1 - child.marker[0]; },
      child => { child.inheritance.pop(); },
      child => { delete child.inheritance[0]; },
      child => { delete child.parents[0]; }
    ];
    for (const edit of edits) {
      const malformed = copy(world); edit(malformed.history[1].demes[0].birds[0]);
      expect(m.climateWeightEvidence(malformed, 1, 0, .5)).toBeNull();
    }
    const duplicate = copy(world);
    duplicate.history[1].demes[0].plants.push(copy(duplicate.history[1].demes[0].plants[0]));
    expect(m.climateWeightEvidence(duplicate, 1, 0, .5)).toBeNull();
    expect(JSON.stringify(world)).toBe(snapshot);
  });
});
