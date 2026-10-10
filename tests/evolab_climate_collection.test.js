import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let m;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  m = window.StemLab.evoArchipelagoModel;
});
const copy = value => JSON.parse(JSON.stringify(value));
const schedule = [[.05, .5, .85], [.95, .5, .85], [.2, .5, .85]];
function run(seed = 21, generations = 2, overrides = {}, small = false) {
  let world = m.create(seed, small);
  world.settings = { ...world.settings, ...overrides };
  for (let i = 0; i < generations; i++) world = m.step(world);
  return world;
}
function recipe(world = run(), count = 8, batch = 0) {
  return m.climateCollectionPlan(m.climatePlan(world, { schedule, batch }), { count });
}
function expectSummary(summary, values, total) {
  const valid = values.filter(Number.isFinite);
  expect(summary).toMatchObject({ values: valid, count: valid.length, total });
  expect(summary.mean).toBe(valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null);
  expect(summary.min).toBe(valid.length ? Math.min(...valid) : null);
  expect(summary.max).toBe(valid.length ? Math.max(...valid) : null);
}
// Dependency injection exercises the actual aggregation block with missing
// cohorts, without inventing invalid organisms or rewriting a model world.
function fixtureCollection(steady, changing) {
  const source = readFileSync('stem_lab/stem_tool_evolab.js', 'utf8');
  const start = source.indexOf('    var climateCollectionRecords = new WeakMap();');
  const end = source.indexOf('    function fingerprint(world)', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const build = new Function('restoreClimatePlan', 'climateStudy', 'species', source.slice(start, end) + '\nreturn { plan: climateCollectionPlan, collect: climateCollection, summary: climateCollectionSummary };');
  const plan = { version: 1, sourceChecksum: 'fixture', start: 0, end: 1, rounds: 1, batch: 0, schedule: [[0, 0, 0]], privateSeed: 0 };
  function series(value) {
    const row = { size: value === null ? 0 : 24, mean: value, p: value, H: value === null ? null : 2 * value * (1 - value) };
    return [0, 1].map(generation => ({ generation, rainfall: generation ? [0, 0, 0] : null, birds: { rows: [row, row, row] }, plants: { rows: [row, row, row] } }));
  }
  const helpers = build(raw => copy(raw), raw => ({ plan: { ...raw, privateSeed: raw.batch }, steady: { series: series(steady[raw.batch]) }, changing: { series: series(changing[raw.batch]) } }), ['birds', 'plants']);
  return { helpers, collection: helpers.collect(helpers.plan(plan, { count: steady.length })) };
}

describe('repeated captured weather investigations', () => {
  it('captures a bounded recipe and canonicalizes saved fields without retaining claimed outcomes', () => {
    const world = run(8, 2, { migration: .3, reciprocal: false, mutation: .025 }), plan = m.climatePlan(world, { schedule, batch: 17 });
    const record = m.climateCollectionPlan(plan);
    expect(record).toEqual({ version: 1, plan, count: 8 });
    const raw = { ...copy(record), results: [{ difference: 999 }], trials: [{ privateSeed: 0 }], prediction: 'not an outcome' };
    raw.plan.privateSeed = 0; raw.plan.end = 900; raw.plan.settings = { selection: false };
    expect(m.restoreClimateCollection(raw)).toEqual(record);
    expect(m.restoreClimateCollection(raw).results).toBeUndefined();
    expect(m.climateCollectionPlan(plan, { count: 1 }).count).toBe(1);
    expect(m.climateCollectionPlan(plan, { count: 32 }).count).toBe(32);
    const source = copy(record); plan.schedule[0][0] = .8; plan.source.settings.rainfall[0] = .8;
    expect(record).toEqual(source);
  });

  it('uses consecutive unsigned batches, unique matched seeds and actual model replay for every recorded trial', () => {
    const record = recipe(run(9, 1), 4, 4294967294), collection = m.climateCollection(record);
    expect(collection.trials.map(trial => trial.batch)).toEqual([4294967294, 4294967295, 0, 1]);
    expect(new Set(collection.trials.map(trial => trial.privateSeed)).size).toBe(4);
    collection.trials.forEach((trial, index) => {
      const study = m.climateStudy({ ...record.plan, batch: trial.batch });
      expect(trial).toEqual({ index, batch: trial.batch, privateSeed: study.plan.privateSeed, start: record.plan.start, end: record.plan.end, steady: { series: study.steady.series }, changing: { series: study.changing.series } });
      expect(m.climateCollectionTrial(record, index)).toEqual(trial);
      expect(study.steady.world.privateSeed).toBe(study.changing.world.privateSeed);
      expect(trial.steady.series[0]).toEqual(trial.changing.series[0]);
      expect(trial.steady.world).toBeUndefined(); expect(trial.changing.world).toBeUndefined();
    });
  });

  it('extends stable prefixes from eight to 32 private futures without replacing earlier batches', () => {
    const small = recipe(run(21, 1), 8, 5), extended = { ...copy(small), count: 32 };
    const a = m.climateCollection(small), b = m.climateCollection(extended);
    expect(b.trials).toHaveLength(32); expect(b.trials.slice(0, 8)).toEqual(a.trials);
    expect(b.trials.map(trial => trial.index)).toEqual(Array.from({ length: 32 }, (_, i) => i));
    expect(b.trials.map(trial => trial.batch)).toEqual(Array.from({ length: 32 }, (_, i) => i + 5));
    expect(new Set(b.trials.map(trial => trial.privateSeed)).size).toBe(32);
    expect(m.climateCollectionTrial(extended, 8)).toEqual(b.trials[8]);
    expect(m.climateCollectionTrial(small, 8)).toBeNull();
  });

  it('summarizes actual paired values for both species, all islands and each supported metric', () => {
    const record = recipe(run(41, 2, { mutation: .05, migration: .3 }), 8), collection = m.climateCollection(record);
    for (const species of ['birds', 'plants']) for (const island of [0, 1, 2]) for (const metric of ['trait', 'marker', 'diversity']) {
      const generation = record.plan.end, key = metric === 'trait' ? 'mean' : metric === 'marker' ? 'p' : 'H';
      const pairs = collection.trials.map(trial => {
        const steady = trial.steady.series.at(-1)[species].rows[island][key], changing = trial.changing.series.at(-1)[species].rows[island][key];
        return { index: trial.index, batch: trial.batch, privateSeed: trial.privateSeed, steady, changing, difference: changing - steady };
      });
      const summary = m.climateCollectionSummary(collection, { species, island, generation, metric });
      expect(summary).toMatchObject({ species, island, generation, metric, start: record.plan.start, end: record.plan.end, total: 8, sourceChecksum: record.plan.sourceChecksum, pairs });
      expectSummary(summary.steady, pairs.map(pair => pair.steady), 8);
      expectSummary(summary.changing, pairs.map(pair => pair.changing), 8);
      expectSummary(summary.difference, pairs.map(pair => pair.difference), 8);
      expect(summary.directions).toEqual({ positive: pairs.filter(pair => pair.difference > 0).length, negative: pairs.filter(pair => pair.difference < 0).length, zero: pairs.filter(pair => pair.difference === 0).length, missing: 0, count: 8, total: 8 });
    }
    const initial = m.climateCollectionSummary(collection, { species: 'birds', island: 0, generation: record.plan.start });
    expect(initial.difference.values).toEqual(Array(8).fill(0));
    expect(initial.directions).toMatchObject({ zero: 8, positive: 0, negative: 0 });
  });

  it('uses available pairs rather than subtracting marginal means when one cohort is missing', () => {
    const { helpers, collection } = fixtureCollection([.2, .4, null], [.5, null, .2]);
    const summary = helpers.summary(collection, { species: 'birds', island: 0, generation: 1, metric: 'trait' });
    expectSummary(summary.steady, [.2, .4, null], 3);
    expectSummary(summary.changing, [.5, null, .2], 3);
    expectSummary(summary.difference, [.5 - .2, null, null], 3);
    expect(summary.difference.mean).not.toBeCloseTo(summary.changing.mean - summary.steady.mean, 10);
    expect(summary.directions).toEqual({ positive: 1, zero: 0, negative: 0, missing: 2, count: 1, total: 3 });
    expect(summary.pairs[1].difference).toBeNull(); expect(summary.pairs[2].difference).toBeNull();
  });

  it('counts exact directions and leaves all-missing summaries undefined rather than inserting zero', () => {
    const mixed = fixtureCollection([.2, .5, .4, null], [.6, .2, .4, .7]);
    const summary = mixed.helpers.summary(mixed.collection, { species: 'plants', island: 2, generation: 1 });
    expectSummary(summary.difference, [.6 - .2, .2 - .5, 0, null], 4);
    expect(summary.directions).toEqual({ positive: 1, zero: 1, negative: 1, missing: 1, count: 3, total: 4 });
    const empty = fixtureCollection([null, null], [null, null]);
    const missing = empty.helpers.summary(empty.collection, { species: 'birds', island: 1, generation: 1, metric: 'diversity' });
    expectSummary(missing.steady, [null, null], 2); expectSummary(missing.changing, [null, null], 2); expectSummary(missing.difference, [null, null], 2);
    expect(missing.directions).toEqual({ positive: 0, zero: 0, negative: 0, missing: 2, count: 0, total: 2 });
  });

  it('keeps every batch at the exact selection-off null and the unchanged-weather control', () => {
    const neutral = run(12, 2, { selection: false, reciprocal: true, migration: .4, mutation: .05 }, true);
    const record = recipe(neutral, 8, 77), collection = m.climateCollection(record);
    for (const trial of collection.trials) {
      expect(trial.steady.series[1].rainfall).not.toEqual(trial.changing.series[1].rainfall);
      for (let i = 0; i < trial.steady.series.length; i++) for (const species of ['birds', 'plants']) expect(trial.steady.series[i][species]).toEqual(trial.changing.series[i][species]);
    }
    for (const species of ['birds', 'plants']) for (const metric of ['trait', 'marker', 'diversity']) {
      const summary = m.climateCollectionSummary(collection, { species, island: 2, generation: record.plan.end, metric });
      expect(summary.difference).toMatchObject({ mean: 0, min: 0, max: 0, count: 8, total: 8 });
      expect(summary.difference.values).toEqual(Array(8).fill(0));
    }
    const selected = run(2, 1), plan = m.climatePlan(selected, { schedule: Array.from({ length: 3 }, () => selected.settings.rainfall.slice()) });
    const steady = m.climateCollection(m.climateCollectionPlan(plan, { count: 4 }));
    steady.trials.forEach(trial => expect(trial.steady.series).toEqual(trial.changing.series));
  });

  it('preserves source genes, queued controls, biological randomness and summaries when the view changes', () => {
    const world = run(29, 2), original = JSON.stringify(world), future = m.step(world), record = recipe(world, 4, 1);
    const collection = m.climateCollection(record), captured = JSON.stringify(collection);
    const a = m.climateCollectionSummary(collection, { species: 'birds', island: 0, generation: record.plan.end });
    m.climateCollectionSummary(collection, { species: 'plants', island: 2, generation: record.plan.start, metric: 'marker' });
    expect(m.climateCollectionSummary(collection, { species: 'birds', island: 0, generation: record.plan.end })).toEqual(a);
    expect(JSON.stringify(collection)).toBe(captured); expect(JSON.stringify(world)).toBe(original); expect(m.step(world)).toEqual(future);
    const queued = { ...world, settings: { ...world.settings, migration: 0, selection: false, rainfall: [1, 0, 1] } };
    m.step(queued);
    expect(m.climateCollection(record).trials).toEqual(collection.trials);
    a.pairs[0].difference = 999; a.steady.values[0] = 999;
    expect(m.climateCollectionSummary(collection, { species: 'birds', island: 0, generation: record.plan.end })).not.toEqual(a);
    expect(JSON.stringify(collection)).toBe(captured);
  });

  it('refuses externally injected or edited results and rebuilds saved recipes deterministically', () => {
    const record = recipe(run(), 4), collection = m.climateCollection(record), options = { species: 'birds', island: 0, generation: record.plan.end };
    const expected = m.climateCollectionSummary(collection, options);
    expect(m.climateCollectionSummary(copy(collection), options)).toBeNull();
    expect(m.climateCollectionSummary({ recipe: record, trials: collection.trials }, options)).toBeNull();
    const raw = { ...copy(record), outcomes: [{ mean: 999 }], trials: [{ steady: { series: [] } }], sourceChecksum: 'forged' };
    const rebuilt = m.climateCollection(m.restoreClimateCollection(raw));
    expect(m.climateCollectionSummary(rebuilt, options)).toEqual(expected);
    collection.trials[0].changing.series.at(-1).birds.rows[0].mean = 999;
    expect(m.climateCollectionSummary(collection, options)).toBeNull();
    expect(m.climateCollectionSummary(rebuilt, options)).toEqual(expected);
    const changedRecipe = m.climateCollection(record); changedRecipe.recipe.count = 1;
    expect(m.climateCollectionSummary(changedRecipe, options)).toBeNull();
  });

  it('rejects invalid recipes, counts, trial indexes and summary lenses without consuming source randomness', () => {
    const world = run(), original = JSON.stringify(world), plan = m.climatePlan(world, { schedule }), record = m.climateCollectionPlan(plan, { count: 4 }), collection = m.climateCollection(record);
    for (const options of [null, [], 1, { count: 0 }, { count: -1 }, { count: .5 }, { count: 33 }, { count: NaN }, { count: '8' }]) expect(m.climateCollectionPlan(plan, options)).toBeNull();
    for (const raw of [null, {}, [], { ...record, version: 2 }, { ...record, count: undefined }, { ...record, count: 33 }, { ...record, plan: null }]) {
      expect(m.restoreClimateCollection(raw)).toBeNull(); expect(m.climateCollection(raw)).toBeNull(); expect(m.climateCollectionTrial(raw, 0)).toBeNull();
    }
    for (const index of [undefined, null, -1, .5, 4, '0']) expect(m.climateCollectionTrial(record, index)).toBeNull();
    const valid = { species: 'birds', island: 0, generation: record.plan.end, metric: 'trait' };
    for (const options of [null, [], { ...valid, species: 'rabbits' }, { ...valid, island: -1 }, { ...valid, island: 3 }, { ...valid, island: .5 }, { ...valid, generation: record.plan.start - 1 }, { ...valid, generation: record.plan.end + 1 }, { ...valid, generation: 2.5 }, { ...valid, metric: 'fitness' }]) expect(m.climateCollectionSummary(collection, options)).toBeNull();
    expect(m.climateCollectionSummary(null, valid)).toBeNull();
    expect(JSON.stringify(world)).toBe(original);
  });
});


describe('yielding captured weather collection jobs', () => {
  it('produces exactly the same eight- and 32-pair collections one pair at a time and reuses completion', () => {
    for (const count of [8, 32]) {
      const record = recipe(run(21, 1), count, 5), expected = m.climateCollection(record), stepper = m.climateCollectionStepper(record);
      expect(Object.keys(stepper)).toEqual(['advance']);
      let result;
      for (let done = 1; done <= count; done++) {
        result = stepper.advance();
        expect(Object.keys(result).sort()).toEqual(['collection', 'done', 'total']);
        expect(result.done).toBe(done); expect(result.total).toBe(count);
        if (done < count) expect(result.collection).toBeNull();
      }
      expect(result.collection).toEqual(expected);
      const completed = result.collection, repeated = stepper.advance();
      expect(repeated).toMatchObject({ done: count, total: count });
      expect(repeated.collection).toBe(completed);
      expect(stepper.advance().collection).toBe(completed);
      expect(m.climateCollectionSummary(completed, { species: 'birds', island: 0, generation: record.plan.end })).toEqual(m.climateCollectionSummary(expected, { species: 'birds', island: 0, generation: record.plan.end }));
    }
  });

  it('keeps pending recipes and outcomes private, captures caller arrays and leaves abandoned source randomness unchanged', () => {
    const world = run(29, 2), original = JSON.stringify(world), future = m.step(world), record = recipe(world, 8, 7), stepper = m.climateCollectionStepper(record);
    expect(stepper.recipe).toBeUndefined(); expect(stepper.trials).toBeUndefined();
    record.count = 1; record.plan.schedule[0][0] = 1; record.plan.source.settings.rainfall[0] = 1;
    for (let done = 1; done <= 3; done++) {
      const progress = stepper.advance();
      expect(progress).toEqual({ done, total: 8, collection: null });
      expect(progress.recipe).toBeUndefined(); expect(progress.trials).toBeUndefined();
    }
    // The abandoned stepper is never advanced to completion.
    expect(JSON.stringify(world)).toBe(original); expect(m.step(world)).toEqual(future);
    for (const raw of [null, {}, [], { ...record, version: 2 }, { ...record, count: 0 }, { ...record, count: 33 }]) expect(m.climateCollectionStepper(raw)).toBeNull();
    expect(JSON.stringify(world)).toBe(original);
  });

  it('preserves wrap provenance and exact null controls while refusing edits to completed outcomes', () => {
    const record = recipe(run(12, 1, { selection: false }), 8, 4294967294), stepper = m.climateCollectionStepper(record);
    let result;
    for (let i = 0; i < 8; i++) result = stepper.advance();
    const collection = result.collection, options = { species: 'plants', island: 2, generation: record.plan.end, metric: 'trait' };
    expect(collection.trials.map(trial => trial.batch)).toEqual([4294967294, 4294967295, 0, 1, 2, 3, 4, 5]);
    expect(new Set(collection.trials.map(trial => trial.privateSeed)).size).toBe(8);
    collection.trials.forEach((trial, index) => expect(trial).toEqual(m.climateCollectionTrial(record, index)));
    expect(m.climateCollectionSummary(collection, options).difference).toMatchObject({ mean: 0, min: 0, max: 0, count: 8 });
    collection.trials[0].changing.series.at(-1).plants.rows[2].mean = 999;
    const repeated = stepper.advance();
    expect(repeated).toMatchObject({ done: 8, total: 8 }); expect(repeated.collection).toBe(collection);
    expect(m.climateCollectionSummary(collection, options)).toBeNull();
    const restored = m.climateCollection(m.restoreClimateCollection(collection.recipe));
    expect(m.climateCollectionSummary(restored, options).difference.mean).toBe(0);
    collection.recipe.count = 1; collection.trials.pop();
    expect(stepper.advance()).toMatchObject({ done: 8, total: 8, collection });
    expect(m.climateCollectionSummary(collection, options)).toBeNull();
  });
});
