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
function recorded(world, generation, from, to, sp) {
  const before = world.history[generation - 1], frame = world.history[generation];
  const index = new Map(before.demes.flatMap(d => m.species.flatMap(species => d[species])).map(o => [o.id, o]));
  const movements = frame.round.migrants.filter(move => move.from === from && move.to === to && move.species === sp);
  const contribution = frame.round.contributions.find(c => c.island === to && c.species === sp);
  return { before, frame, index, movements, pool: contribution.members.map(member => index.get(member.id)) };
}

describe('recorded geography and directed route evidence', () => {
  it('reconstructs source, destination, breeding pool and migrant cohorts from actual recorded organisms', () => {
    for (const seed of [21, 73]) {
      const world = run(seed, 3, { migration: .4, mutation: .05 });
      for (const generation of [1, 3]) for (const [from, to] of routes) {
        const evidence = m.routeEvidence(world, generation, from, to);
        expect(evidence).toMatchObject({ generation, from, to, distance: m.distances[from][to], recorded: true, settings: world.history[generation].round.settings });
        expect(evidence.rows.map(row => row.species)).toEqual(['birds', 'plants']);
        for (const row of evidence.rows) {
          const { before, frame, index, movements, pool } = recorded(world, generation, from, to, row.species);
          expect(row.source).toEqual(m.stats(before.demes[from][row.species]));
          expect(row.destinationBefore).toEqual(m.stats(before.demes[to][row.species]));
          expect(row.destinationPool).toEqual(m.stats(pool));
          expect(row.destinationAfter).toEqual(m.stats(frame.demes[to][row.species]));
          expect(row.migrantCohort).toEqual(m.stats(movements.map(move => index.get(move.id))));
          expect(row.arrivals).toBe(movements.length);
          expect(row.migrants).toEqual(movements.map(move => ({
            id: move.id, trait: m.value(index.get(move.id)), marker: index.get(move.id).marker,
            gametes: move.gametes, markerCopies: move.markerCopies
          })));
        }
      }
    }
  });

  it('uses model distance and species factors for mutually exclusive outbound probabilities', () => {
    const world = run(21, 1, { migration: .4 });
    for (const [from, to] of routes) {
      const other = [0, 1, 2].find(island => island !== from && island !== to);
      const evidence = m.routeEvidence(world, 1, from, to);
      for (const row of evidence.rows) {
        const factor = row.species === 'birds' ? 1 : .3;
        const probability = .4 * factor * Math.exp(-m.distances[from][to] / 6);
        const otherProbability = .4 * factor * Math.exp(-m.distances[from][other] / 6);
        expect(row.probability).toBeCloseTo(probability, 14);
        expect(row.otherProbability).toBeCloseTo(otherProbability, 14);
        expect(row.stayProbability).toBeCloseTo(1 - probability - otherProbability, 14);
        expect(row.probability + row.otherProbability + row.stayProbability).toBeCloseTo(1, 14);
        expect(row.stayProbability).toBeGreaterThan(0);
      }
      expect(evidence.rows[1].probability).toBeCloseTo(evidence.rows[0].probability * .3, 14);
    }
    expect(m.routeEvidence(world, 1, 0, 1).rows[0].probability).toBeGreaterThan(m.routeEvidence(world, 1, 0, 2).rows[0].probability);
  });

  it('scales expected crossings by the preceding source cohort and keeps expected values distinct from integer arrivals', () => {
    const world = run(21, 2, { migration: .4 }, true);
    for (const generation of [1, 2]) for (const row of m.routeEvidence(world, generation, 2, 1).rows) {
      expect(row.source.size).toBe(generation === 1 ? 6 : 24);
      expect(row.expectedCrossings).toBeCloseTo(row.source.size * row.probability, 14);
      expect(Number.isInteger(row.arrivals)).toBe(true);
      expect(Number.isInteger(row.expectedCrossings)).toBe(false);
      expect(row.arrivals).not.toBe(row.expectedCrossings);
    }
  });

  it('counts transmitted marker copies using recorded newborn parents and their independently sampled marker slots', () => {
    const world = run(73, 4, { migration: .4, mutation: .05 });
    for (const generation of [1, 4]) for (const [from, to] of routes) {
      for (const row of m.routeEvidence(world, generation, from, to).rows) {
        const { frame, index, movements } = recorded(world, generation, from, to, row.species);
        const migrantIds = new Set(movements.map(move => move.id));
        const transmitted = frame.demes[to][row.species].flatMap(child => child.parents.flatMap((id, slot) =>
          migrantIds.has(id) ? [{ id, marker: index.get(id).marker[child.inheritance[slot].markerCopy] }] : []));
        expect(row.incomingCopies).toBe(transmitted.length);
        expect(row.transmittedA).toBe(transmitted.filter(copy => copy.marker === 1).length);
        expect(row.transmitteda).toBe(transmitted.filter(copy => copy.marker === 0).length);
        expect(row.transmittedA + row.transmitteda).toBe(row.incomingCopies);
        expect(row.totalCopies).toBe(frame.demes[to][row.species].length * 2);
        expect(row.reproducingArrivals).toBe(new Set(transmitted.map(copy => copy.id)).size);
        for (const migrant of row.migrants) {
          const copies = transmitted.filter(copy => copy.id === migrant.id);
          expect(migrant.gametes).toBe(copies.length);
          expect(migrant.markerCopies).toEqual([copies.filter(copy => copy.marker === 0).length, copies.filter(copy => copy.marker === 1).length]);
        }
      }
    }
  });

  it('keeps arrival counts, reproducing arrivals and inherited copies as different units', () => {
    const world = run(21, 5, { migration: .4, selection: false, mutation: 0 });
    const rows = world.history.slice(1).flatMap(frame => routes.flatMap(([from, to]) => m.routeEvidence(world, frame.generation, from, to).rows));
    expect(rows.some(row => row.migrants.some(migrant => migrant.gametes === 0))).toBe(true);
    expect(rows.some(row => row.incomingCopies !== row.arrivals)).toBe(true);
    for (const row of rows) {
      expect(row.reproducingArrivals).toBeLessThanOrEqual(row.arrivals);
      expect(row.incomingCopies).toBe(row.migrants.reduce((sum, migrant) => sum + migrant.gametes, 0));
      expect(row.incomingCopies).toBeLessThanOrEqual(row.totalCopies);
    }
  });

  it('conserves each source organism across exclusive routes and reconciles all incoming routes with destination bookkeeping', () => {
    const world = run(21, 3, { migration: .4 });
    for (const generation of [1, 3]) for (const sp of m.species) {
      for (let from = 0; from < 3; from++) {
        const outward = routes.filter(route => route[0] === from).map(([source, to]) => m.routeEvidence(world, generation, source, to).rows.find(row => row.species === sp));
        const ids = outward.flatMap(row => row.migrants.map(migrant => migrant.id));
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBeLessThanOrEqual(world.history[generation - 1].demes[from][sp].length);
      }
      for (let to = 0; to < 3; to++) {
        const incoming = routes.filter(route => route[1] === to).map(([from, destination]) => m.routeEvidence(world, generation, from, destination).rows.find(row => row.species === sp));
        const destination = m.connectionEvidence(world, generation, to, sp);
        expect(incoming.reduce((sum, row) => sum + row.arrivals, 0)).toBe(destination.arrivalCount);
        expect(incoming.reduce((sum, row) => sum + row.reproducingArrivals, 0)).toBe(destination.reproducingArrivals);
        expect(incoming.reduce((sum, row) => sum + row.incomingCopies, 0)).toBe(destination.incomingCopies);
        expect(destination.localCopies + destination.incomingCopies).toBe(destination.totalCopies);
      }
    }
  });

  it('treats G0 as a founding baseline with no dispersal or birth-round observations even after later settings are queued', () => {
    const world = run(21, 3, { migration: .4 }, true);
    const baseline = m.routeEvidence(world, 0, 2, 1);
    expect(baseline).toMatchObject({ generation: 0, from: 2, to: 1, distance: 7, recorded: false, settings: null });
    for (const row of baseline.rows) {
      expect(row.source).toEqual(m.stats(world.history[0].demes[2][row.species]));
      expect(row.source.size).toBe(6);
      expect(row.destinationBefore).toEqual(m.stats(world.history[0].demes[1][row.species]));
      for (const key of ['destinationPool', 'destinationAfter', 'migrantCohort', 'probability', 'otherProbability', 'stayProbability', 'expectedCrossings', 'arrivals', 'migrants', 'reproducingArrivals', 'incomingCopies', 'totalCopies', 'transmittedA', 'transmitteda']) expect(row[key]).toBeNull();
    }
    expect(m.routeEvidence({ ...world, settings: { ...world.settings, migration: 0 } }, 0, 2, 1)).toEqual(baseline);
    const fresh = m.create(21, true);
    expect(m.routeEvidence(fresh, 0, 2, 1)).toEqual(baseline);
  });

  it('uses captured round settings and never retrofits queued next-round movement into history', () => {
    const world = run(17, 3, { migration: .3, rainfall: [.2, .4, .8] });
    const original = routes.map(([from, to]) => m.routeEvidence(world, 2, from, to));
    const queued = { ...world, settings: { ...world.settings, migration: 0, rainfall: [1, 0, .1], reciprocal: false, selection: false, mutation: 0 } };
    routes.forEach(([from, to], index) => {
      expect(m.routeEvidence(queued, 2, from, to)).toEqual(original[index]);
      expect(original[index].settings).toEqual(world.history[2].round.settings);
      expect(original[index].settings).not.toEqual(queued.settings);
    });
  });

  it('reports closed routes and empty cohorts without fabricating marker frequencies or newborn copies', () => {
    let world = m.create(11);
    const frame = world.history[0];
    const demes = [0, 1, 2].map(island => ({ birds: island === 1 ? frame.demes[1].birds.slice(0, 2) : [], plants: island === 1 ? frame.demes[1].plants.slice(0, 1) : [] }));
    world = m.step({ ...world, settings: { ...world.settings, migration: 0, mutation: 0 }, history: [{ ...frame, demes }] });
    for (const [from, to] of routes) for (const row of m.routeEvidence(world, 1, from, to).rows) {
      expect(row.probability).toBe(0); expect(row.otherProbability).toBe(0); expect(row.stayProbability).toBe(1);
      expect(row.expectedCrossings).toBe(0); expect(row.arrivals).toBe(0); expect(row.migrants).toEqual([]);
      expect(row.reproducingArrivals).toBe(0); expect(row.incomingCopies).toBe(0); expect(row.transmittedA).toBe(0); expect(row.transmitteda).toBe(0);
      expect(row.migrantCohort).toEqual({ size: 0, mean: null, sd: null, p: null, H: null });
      if (to === 1 && row.species === 'birds') expect(row.destinationAfter.size).toBe(24);
      else {
        expect(row.destinationAfter.size).toBe(0); expect(row.totalCopies).toBe(0);
        expect(row.destinationAfter.mean).toBeNull(); expect(row.destinationAfter.p).toBeNull(); expect(row.destinationAfter.H).toBeNull();
      }
    }
  });

  it('rejects invalid contexts and leaves recorded history and the next random future intact', () => {
    const world = run(21, 3), before = JSON.stringify(world), future = m.step(world);
    for (const generation of [-1, 4, .5, NaN, '1', null]) expect(m.routeEvidence(world, generation, 0, 1)).toBeNull();
    for (const island of [-1, 3, .5, NaN, '0', null]) {
      expect(m.routeEvidence(world, 1, island, 1)).toBeNull();
      expect(m.routeEvidence(world, 1, 0, island)).toBeNull();
    }
    for (let island = 0; island < 3; island++) expect(m.routeEvidence(world, 1, island, island)).toBeNull();
    for (const invalid of [null, {}, { generation: 1 }, { ...world, generation: NaN }, { ...world, generation: '3' }, { ...world, generation: 3.5 }, { ...world, history: [] }, { ...world, history: [world.history[0], { generation: 1, demes: [], round: null }] }]) expect(m.routeEvidence(invalid, 1, 0, 1)).toBeNull();
    for (let generation = 0; generation <= world.generation; generation++) for (const [from, to] of routes) expect(m.routeEvidence(world, generation, from, to)).toEqual(m.routeEvidence(world, generation, from, to));
    expect(JSON.stringify(world)).toBe(before); expect(m.step(world)).toEqual(future);
  });
});
