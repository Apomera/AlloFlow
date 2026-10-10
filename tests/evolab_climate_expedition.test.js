import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let m;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  m = window.StemLab.evoArchipelagoModel;
});
const copy = value => JSON.parse(JSON.stringify(value));
const schedule = [[.02, .5, .85], [.15, .5, .85], [.7, .5, .85], [1, .5, .85]];
function run(seed = 21, generations = 2, overrides = {}, small = false) {
  let world = m.create(seed, small);
  world.settings = { ...world.settings, ...overrides };
  for (let i = 0; i < generations; i++) world = m.step(world);
  return world;
}
function independentBranch(plan, condition) {
  let world = m.restoreCheckpoint(plan.source);
  world = { ...world, rng: plan.privateSeed, privateSeed: plan.privateSeed, privateResearch: true, privateKind: 'climate' };
  for (let i = 0; i < plan.schedule.length; i++) {
    world = m.step({ ...world, settings: { ...copy(plan.source.settings), rainfall: (condition === 'steady' ? plan.source.settings.rainfall : plan.schedule[i]).slice() } });
  }
  return world;
}
function mix32(n) {
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d); n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b); return (n ^ n >>> 16) >>> 0;
}

describe('captured weather expeditions', () => {
  it('captures a real checkpoint, bounded schedule and reproducible matched private seed', () => {
    const world = run(21, 3, { migration: .3, mutation: .025, rainfall: [.25, .4, .8] }, true);
    const original = JSON.stringify(world), future = m.step(world), options = { schedule: copy(schedule), batch: 9 };
    const plan = m.climatePlan(world, options);
    expect(plan).toMatchObject({ version: 1, start: 3, end: 7, rounds: 4, batch: 9, sourceChecksum: m.checkpoint(world).checksum, settings: world.settings, schedule });
    expect(plan.source).toEqual(m.checkpoint(world));
    expect(plan.privateSeed).toBe(mix32(parseInt(plan.source.checksum.slice(0, 8), 16) ^ mix32(9) ^ 0x636c696d));
    expect(m.climatePlan(world, options)).toEqual(plan);
    expect(m.restoreClimatePlan(copy(plan))).toEqual(plan);
    const study = m.climateStudy(plan);
    expect(study.plan).toEqual(plan);
    for (const condition of ['steady', 'changing']) {
      const branch = study[condition].world;
      expect(branch).toMatchObject({ privateResearch: true, privateKind: 'climate', privateSeed: plan.privateSeed, generation: 7 });
      expect(branch.history.slice(0, 4)).toEqual(world.history);
      expect(m.checkpoint(branch)).toBeNull();
      expect(m.climatePlan(branch, options)).toBeNull();
    }
    expect(JSON.stringify(world)).toBe(original); expect(m.step(world)).toEqual(future);
  });

  it('matches independent repeated steps and changes only captured upcoming rainfall', () => {
    const world = run(8, 1, { migration: .25, reciprocal: false, mutation: .05, rainfall: [.1, .45, .9] });
    const plan = m.climatePlan(world, { schedule }), study = m.climateStudy(plan);
    for (const condition of ['steady', 'changing']) {
      const branch = study[condition].world;
      expect(branch).toEqual(independentBranch(plan, condition));
      branch.history.slice(plan.start + 1).forEach((frame, index) => {
        expect(frame.round.settings).toEqual({ ...world.settings, rainfall: condition === 'steady' ? world.settings.rainfall : schedule[index] });
      });
      expect(branch.settings.rainfall).toEqual(condition === 'steady' ? world.settings.rainfall : schedule.at(-1));
    }
    expect(study.steady.world.history.at(-1).demes).not.toEqual(study.changing.world.history.at(-1).demes);
  });

  it('summarizes actual captured cohorts and distinguishes starting genes from upcoming weather', () => {
    const world = run(3, 2, { rainfall: [.9, .2, .1] });
    world.settings = { ...world.settings, rainfall: [.2, .3, .4] };
    const plan = m.climatePlan(world, { schedule: [[0, .3, .4], [1, .3, .4]] }), study = m.climateStudy(plan);
    for (const condition of ['steady', 'changing']) {
      const result = study[condition];
      expect(result.series).toHaveLength(3); expect(result.series[0].rainfall).toBeNull();
      result.series.forEach((row, index) => {
        const frame = result.world.history[plan.start + index];
        expect(row.generation).toBe(frame.generation);
        for (const species of ['birds', 'plants']) {
          expect(row[species]).toEqual(m.diversity(frame, species));
          row[species].rows.forEach((deme, island) => expect(deme).toEqual(m.stats(frame.demes[island][species])));
        }
        if (index) expect(row.rainfall).toEqual(frame.round.settings.rainfall);
      });
    }
    expect(study.steady.series[1].rainfall).toEqual([.2, .3, .4]);
    expect(study.changing.series[1].rainfall).toEqual([0, .3, .4]);
    expect(study.steady.series[0].birds).toEqual(study.changing.series[0].birds);
    expect(study.steady.series[0].plants).toEqual(study.changing.series[0].plants);
  });

  it('provides an exact null control when traits have no breeding effect', () => {
    const world = run(41, 2, { selection: false, reciprocal: true, migration: .4, mutation: .05 }, true);
    const plan = m.climatePlan(world, { schedule }), study = m.climateStudy(plan);
    expect(study.steady.world.rng).toBe(study.changing.world.rng);
    expect(study.steady.world.nextId).toBe(study.changing.world.nextId);
    for (let generation = plan.start; generation <= plan.end; generation++) {
      const a = study.steady.world.history[generation], b = study.changing.world.history[generation];
      expect(a.demes).toEqual(b.demes);
      for (const species of ['birds', 'plants']) expect(study.steady.series[generation - plan.start][species]).toEqual(study.changing.series[generation - plan.start][species]);
      if (generation > plan.start) {
        expect(a.round.migrants).toEqual(b.round.migrants);
        expect(a.round.contributions).toEqual(b.round.contributions);
        expect(a.round.mutations).toBe(b.round.mutations);
      }
    }
    expect(study.steady.series[1].rainfall).not.toEqual(study.changing.series[1].rainfall);
  });

  it('preserves actual distinct parents, independently inherited copies and recorded mutations for both species', () => {
    const world = run(21, 2, { mutation: .05, migration: .4 }), plan = m.climatePlan(world, { schedule, batch: 2 });
    const study = m.climateStudy(plan);
    let mutationEvents = 0;
    for (const condition of ['steady', 'changing']) {
      const branch = study[condition].world;
      branch.history.slice(plan.start + 1).forEach(frame => {
        const previous = branch.history[frame.generation - 1];
        const parents = new Map(previous.demes.flatMap(deme => m.species.flatMap(species => deme[species].map(organism => [organism.id, organism]))));
        for (const species of m.species) frame.demes.forEach((deme, island) => {
          expect(deme[species]).toHaveLength(24);
          for (const child of deme[species]) {
            expect(child.parents).toHaveLength(2); expect(child.parents[0]).not.toBe(child.parents[1]);
            expect(child.born).toBe(frame.generation); expect(child.species).toBe(species);
            child.parents.forEach((id, slot) => {
              const parent = parents.get(id), inherited = child.inheritance[slot];
              expect(parent.species).toBe(species); expect([0, 1]).toContain(inherited.copy); expect([0, 1]).toContain(inherited.markerCopy);
              expect(child.marker[slot]).toBe(parent.marker[inherited.markerCopy]);
              const before = parent.genes[inherited.copy] + (inherited.delta === null ? 0 : inherited.delta);
              const reflected = before < 0 ? -before : before > 1 ? 2 - before : before;
              expect(child.genes[slot]).toBe(reflected); expect(child.genes[slot]).toBeGreaterThanOrEqual(0); expect(child.genes[slot]).toBeLessThanOrEqual(1);
              if (inherited.delta !== null) { mutationEvents++; expect(Math.abs(inherited.delta)).toBeLessThanOrEqual(.08); }
            });
          }
          const story = m.story(branch, frame.generation, island, species);
          expect(story.counts.offspring).toBe(deme[species].length);
          for (const newborn of story.newborns) for (const inherited of newborn.copies) expect(inherited.traitBeforeMutation).toBe(parents.get(inherited.parent).genes[inherited.traitCopy]);
        });
      });
    }
    expect(mutationEvents).toBeGreaterThan(0);
  });

  it('isolates all source, option, restored plan and summary arrays from caller edits', () => {
    const world = run(), options = { schedule: copy(schedule), batch: 1 }, plan = m.climatePlan(world, options), frozen = copy(plan);
    options.schedule[0][0] = .9; world.settings.rainfall[0] = .99; world.history[1].round.settings.rainfall[0] = .99;
    expect(plan).toEqual(frozen);
    const restored = m.restoreClimatePlan(plan); restored.schedule[0][0] = .8; restored.settings.rainfall[0] = .8; restored.source.rounds[0].rainfall[0] = .8;
    expect(plan).toEqual(frozen);
    const study = m.climateStudy(plan), changed = study.changing;
    changed.series[1].rainfall[0] = .99; changed.series[1].birds.rows[0].mean = 99;
    expect(changed.world.history[plan.start + 1].round.settings.rainfall[0]).toBe(schedule[0][0]);
    expect(m.stats(changed.world.history[plan.start + 1].demes[0].birds).mean).not.toBe(99);
    expect(plan).toEqual(frozen);
    study.steady.world.history[0].demes[0].birds[0].marker[0] ^= 1;
    expect(study.changing.world.history[0].demes).not.toEqual(study.steady.world.history[0].demes);
  });

  it('replays captured plans independently of later queued controls and fresh batch choices', () => {
    const world = run(12, 2), plan = m.climatePlan(world, { schedule, batch: 0 }), expected = m.climateStudy(plan), original = JSON.stringify(world);
    const later = m.step({ ...world, settings: { migration: 0, selection: false, reciprocal: false, mutation: 0, rainfall: [1, 1, 1] } });
    expect(m.climateStudy(plan)).toEqual(expected); expect(m.climateStudy(copy(plan))).toEqual(expected);
    expect(m.climatePlan(later, { schedule })).not.toEqual(plan);
    const other = m.climatePlan(world, { schedule, batch: 1 });
    expect(other.privateSeed).not.toBe(plan.privateSeed);
    expect(m.climateStudy(other).steady.world.history.at(-1).demes).not.toEqual(expected.steady.world.history.at(-1).demes);
    const otherSchedule = m.climatePlan(world, { schedule: schedule.map(row => [1 - row[0], row[1], row[2]]) });
    expect(otherSchedule.privateSeed).toBe(plan.privateSeed);
    expect(m.climateBranch(otherSchedule, 'steady')).toEqual(expected.steady.world);
    expect(JSON.stringify(world)).toBe(original);
  });

  it('rebuilds derived fields and outcomes from the saved replay recipe', () => {
    const plan = m.climatePlan(run(), { schedule, batch: 3 }), fabricated = { ...copy(plan), sourceChecksum: 'forged', start: -500, end: 999, rounds: 999, privateSeed: 0, settings: { selection: false }, results: { invented: true }, steady: { world: null }, changing: { series: [{ birds: { within: 999 } }] } };
    expect(m.restoreClimatePlan(fabricated)).toEqual(plan);
    expect(m.climateStudy(fabricated)).toEqual(m.climateStudy(plan));
    expect(m.restoreClimatePlan(fabricated).results).toBeUndefined();
    const corrupt = copy(plan); corrupt.source.settings.rainfall[0] = .95;
    expect(m.restoreClimatePlan(corrupt)).toBeNull(); expect(m.climateStudy(corrupt)).toBeNull();
    const privateWorld = m.climateBranch(plan, 'changing');
    expect(m.climatePlan(privateWorld, { schedule })).toBeNull();
  });

  it('bounds work to six rounds and the actual remaining generation budget', () => {
    const six = m.climatePlan(m.create(21), { schedule: Array.from({ length: 6 }, () => [.2, .5, .8]), batch: 4294967295 });
    expect(six).toMatchObject({ rounds: 6, start: 0, end: 6, batch: 4294967295 });
    const late = run(21, 39), one = m.climatePlan(late, { schedule: [[.7, .5, .85]] });
    expect(one).toMatchObject({ start: 39, end: 40, rounds: 1 }); expect(m.climateBranch(one, 'changing').generation).toBe(40);
    expect(m.climatePlan(late, { schedule: [[.7, .5, .85], [.1, .5, .85]] })).toBeNull();
    expect(m.climatePlan(m.step(late), { schedule: [[.7, .5, .85]] })).toBeNull();
    expect(m.climatePlan(m.create(21), { schedule: Array.from({ length: 7 }, () => [0, 0, 0]) })).toBeNull();
  });

  it('rejects malformed sources, schedules, batches and condition selectors without advancing the main stream', () => {
    const world = run(), original = JSON.stringify(world), plan = m.climatePlan(world, { schedule });
    for (const options of [null, [], 7, {}, { schedule: [] }, { schedule: new Array(2) }, { schedule: [[0, 1]] }, { schedule: [[0, 0, 0, 0]] }, { schedule: [[0, , 1]] }, { schedule: [[NaN, 0, 0]] }, { schedule: [[Infinity, 0, 0]] }, { schedule: [[-.01, 0, 0]] }, { schedule: [[1.01, 0, 0]] }, { schedule: [['.2', 0, 0]] }, { schedule, batch: -1 }, { schedule, batch: .5 }, { schedule, batch: 4294967296 }, { schedule, batch: NaN }]) expect(m.climatePlan(world, options)).toBeNull();
    for (const source of [null, {}, [], { ...world, rng: world.rng + 1 }, { ...world, nextId: 0 }, { ...world, privateResearch: true }]) expect(m.climatePlan(source, { schedule })).toBeNull();
    for (const raw of [null, {}, [], { ...plan, version: 2 }, { ...plan, source: null }, { ...plan, schedule: [] }, { ...plan, batch: -.1 }]) { expect(m.restoreClimatePlan(raw)).toBeNull(); expect(m.climateStudy(raw)).toBeNull(); }
    for (const selector of [undefined, null, 'unknown', 'Steady', 0]) expect(m.climateBranch(plan, selector)).toBeNull();
    expect(JSON.stringify(world)).toBe(original);
  });
});
