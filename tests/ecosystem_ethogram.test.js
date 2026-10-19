import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
const animal = (state, extra = {}) => ({ active: true, state, x: 1, z: 2, ...extra });
const states = ['Grazing', 'Retreating', 'Alert', 'Resting', 'Preening'];
const categories = ['feeding', 'moving', 'attending', 'resting', 'grooming'];
const fixture = () => states.map((state, step) => ({ rabbits: [animal(state, { x: step / 10 })] }));
const rawRecord = () => ({ version: 1, branch: 'experiment', species: 'rabbits', index: 0, start: 0, interval: 1, samples: states.map((state, step) => ({ step, state, category: categories[step], x: step / 10, z: 2 })), firstCodes: ['resting', 'moving', 'attending', 'resting', 'grooming'], codes: categories.slice(), reflection: 'I revised the first sample after checking the feeding action.', runPrediction: 'More cover might change rabbit feeding.' });

describe('fixed-interval representative ethogram', () => {
  it('maps action labels with an explicit key and does not mistake search or memory for feeding', () => {
    expect(api.ethogramCategory('Checking last location')).toBe('attending');
    for (const state of ['Preparing to pounce', 'Alert', 'Listening']) expect(api.ethogramCategory(state)).toBe('attending');
    for (const state of ['Pouncing', 'Tracking prey', 'Searching for insects', 'Gliding', 'Stalking']) expect(api.ethogramCategory(state)).toBe('moving');
    for (const state of ['Grazing', 'Foraging', 'Pecking', 'Feeding']) expect(api.ethogramCategory(state)).toBe('feeding');
    expect(api.ethogramCategory('Recovering')).toBe('resting'); expect(api.ethogramCategory('Preening')).toBe('grooming');
    for (const state of ['Not present', 'Growing', 'Unknown', '', null, undefined, 3, {}]) expect(api.ethogramCategory(state)).toBeNull();
  });

  it('builds five exact evenly spaced detached checkpoints of one fixed representative', () => {
    const frames = Array.from({ length: 13 }, (_, step) => ({ foxes: [animal('Searching', { x: step / 10 }), animal('Resting', { x: 10 + step / 10, z: -step / 20 })] })), original = JSON.stringify(frames);
    const plan = api.ethogramPlan(frames, 'foxes', 1, 2, 2);
    expect(plan).toMatchObject({ id: 'foxes:1:2:2', species: 'foxes', index: 1, start: 2, interval: 2, end: 10 });
    expect(plan.samples.map(s => s.step)).toEqual([2, 4, 6, 8, 10]); expect(plan.samples.map(s => s.state)).toEqual(Array(5).fill('Resting'));
    expect(plan.samples[0]).toEqual({ step: 2, state: 'Resting', category: 'resting', x: 10.2, z: -0.1 });
    plan.samples[0].x = 999; expect(JSON.stringify(frames)).toBe(original); expect(api.ethogramPlan(frames, 'foxes', 1, 2, 2).samples[0].x).toBe(10.2);
  });

  it('rejects invalid plans, absent or corrupt animals, and gaps between selected checkpoints', () => {
    for (const args of [['plants', 0, 0, 1], ['unknown', 0, 0, 1], ['rabbits', -1, 0, 1], ['rabbits', 16, 0, 1], ['rabbits', 0.5, 0, 1], ['rabbits', 0, -1, 1], ['rabbits', 0, 0.2, 1], ['rabbits', 0, 0, 0], ['rabbits', 0, 0, 0.5], ['rabbits', 0, 1, 1], ['rabbits', 0, 0, Infinity]]) expect(api.ethogramPlan(fixture(), ...args)).toBeNull();
    for (const mutate of [f => { f[2].rabbits[0].active = false; }, f => { f[2].rabbits[0].active = 1; }, f => { f[2].rabbits[0].x = NaN; }, f => { f[2].rabbits[0].z = Infinity; }, f => { f[2].rabbits[0].x = 1000; }, f => { f[2].rabbits[0].state = 'Unknown'; }, f => { f[2].rabbits = {}; }, f => { f[2] = null; }]) {
      const f = fixture(); mutate(f); expect(api.ethogramPlan(f, 'rabbits', 0, 0, 1)).toBeNull();
    }
    const f = Array.from({ length: 9 }, () => ({ rabbits: [animal('Resting')] })); f[3].rabbits[0].active = false;
    expect(api.ethogramPlan(f, 'rabbits', 0, 0, 2)).toBeNull();
    for (const f of [null, {}, 'frames', []]) expect(api.ethogramPlan(f, 'rabbits', 0, 0, 1)).toBeNull();
  });

  it('tallies checkpoints and proportions independently from first and revised learner codes', () => {
    const plan = api.ethogramPlan(fixture(), 'rabbits', 0, 0, 1), first = ['resting', 'moving', 'attending', 'resting', 'grooming'], saved = JSON.stringify({ plan, first }), check = api.ethogramCheck(plan, categories, first);
    expect(check.matches).toBe(5); expect(check.firstMatches).toBe(4); expect(check.total).toBe(5);
    expect(check.tally.map(row => row.recorded)).toEqual([1, 1, 1, 1, 1]); expect(check.tally.map(row => row.recordedProportion)).toEqual(Array(5).fill(0.2));
    expect(check.tally.reduce((sum, row) => sum + row.coded, 0)).toBe(5); expect(check.tally.reduce((sum, row) => sum + row.recordedProportion, 0)).toBeCloseTo(1, 12);
    check.tally[0].recorded = 99; check.comparisons[0].state = 'Changed'; expect(JSON.stringify({ plan, first })).toBe(saved);
    const repeated = api.ethogramCheck(plan, Array(5).fill('feeding')); expect(repeated.matches).toBe(1); expect(repeated.tally[0].coded).toBe(5); expect(repeated.firstMatches).toBeNull();
  });

  it('rejects incomplete or malformed codes and inconsistent or uneven sample metadata', () => {
    const plan = api.ethogramPlan(fixture(), 'rabbits', 0, 0, 1);
    for (const codes of [null, [], categories.slice(0, 4), [...categories, 'moving'], ['unknown', ...categories.slice(1)], ['', ...categories.slice(1)]]) expect(api.ethogramCheck(plan, codes)).toBeNull();
    for (const first of [[], ['moving'], ['unknown', ...categories.slice(1)]]) expect(api.ethogramCheck(plan, categories, first)).toBeNull();
    for (const mutate of [p => { p.samples[2].category = 'moving'; }, p => { p.samples[2].state = 'Unknown'; p.samples[2].category = null; }, p => { p.samples[2].step = 1; }, p => { p.samples[4].step = 5; }, p => { p.samples[0] = null; }]) {
      const p = structuredClone(plan); mutate(p); expect(api.ethogramCheck(p, categories)).toBeNull();
    }
  });

  it('retains exact original states, first codes and revisions in a detached normalized notebook record', () => {
    const raw = rawRecord(), saved = api.ethogramRecord(raw, { event: 'none' }, 2, 'rabbits');
    expect(saved).toEqual(raw); raw.samples[0].x = 99; raw.firstCodes[0] = 'moving'; expect(saved.samples[0].x).toBe(0); expect(saved.firstCodes[0]).toBe('resting');
    const long = rawRecord(); long.reflection = 'x'.repeat(2000); long.runPrediction = 'x'.repeat(1600); const limited = api.ethogramRecord(long, {}, 2, 'rabbits'); expect(limited.reflection.length).toBe(1600); expect(limited.runPrediction.length).toBe(1200);
  });

  it('rejects wrong branch, identity, interval, state mapping, coordinates and anchor in saved records', () => {
    for (const mutate of [r => { r.version = 2; }, r => { r.branch = 'other'; }, r => { r.species = 'foxes'; }, r => { r.index = 16; }, r => { r.start = -1; }, r => { r.interval = 0; }, r => { r.interval = 61; }, r => { r.samples[1].step = 3; }, r => { r.samples[0].category = 'moving'; }, r => { r.samples[0].state = 'Unknown'; r.samples[0].category = null; }, r => { r.samples[0].x = NaN; }, r => { r.samples[0].z = -1000; }, r => { r.firstCodes[0] = ''; }, r => { r.codes.pop(); }]) {
      const raw = rawRecord(); mutate(raw); expect(api.ethogramRecord(raw, {}, 2, 'rabbits')).toBeNull();
    }
    expect(api.ethogramRecord(rawRecord(), {}, 1, 'rabbits')).toBeNull(); expect(api.ethogramRecord(rawRecord(), {}, 2, 'foxes')).toBeNull(); expect(api.ethogramRecord(rawRecord(), { enabled: { rabbits: false } }, 2, 'rabbits')).toBeNull();
  });

  it('samples a real recorded run without changing its representative timeline or population comparison', () => {
    const config = { event: 'none', cover: 30 }, result = api.compare(config), original = JSON.stringify(result), frames = api.behaviorTimeline(config, result.experiment), before = JSON.stringify(frames), plan = api.ethogramPlan(frames, 'rabbits', 0, 0, 20);
    expect(plan).toBeTruthy(); expect(plan.samples.map(s => s.step)).toEqual([0, 20, 40, 60, 80]);
    for (const sample of plan.samples) expect(sample.state).toBe(frames[sample.step].rabbits[0].state);
    expect(api.ethogramCheck(plan, plan.samples.map(s => s.category)).matches).toBe(5); expect(JSON.stringify(frames)).toBe(before); expect(JSON.stringify(result)).toBe(original);
  });

  it('round-trips an exact ethogram attachment and original ecological prediction through the field notebook', () => {
    const config = { event: 'none', cover: 30 }, pair = api.compare(config), frames = api.behaviorTimeline(config, pair.baseline), plan = api.ethogramPlan(frames, 'rabbits', 0, 0, 10), codes = plan.samples.map(s => s.category), firstCodes = codes.slice();
    firstCodes[0] = firstCodes[0] === 'feeding' ? 'resting' : 'feeding';
    const attachment = { version: 1, branch: 'baseline', species: 'rabbits', index: 0, start: plan.start, interval: plan.interval, samples: plan.samples, firstCodes, codes, reflection: 'Five samples show this pattern, not time spent.', runPrediction: 'I predicted more rabbit feeding.' };
    const note = api.capture(config, pair, plan.samples[2].step, 'rabbits', 'Five-sample behavior coding', attachment.reflection, 1, null, null, null, attachment), restored = api.notebook([note]);
    expect(note.ethogram).toEqual(attachment); expect(restored).toHaveLength(1); expect(restored[0].ethogram).toEqual(attachment);
    const text = api.notebookText(restored);
    expect(text).toContain('First submitted codes:'); expect(text).toContain('Latest codes:'); expect(text).toContain('Sample 5 at time 4.0:'); expect(text).toContain('not elapsed time'); expect(text).toContain(attachment.runPrediction);
    note.ethogram.firstCodes[0] = 'changed'; expect(restored[0].ethogram.firstCodes).toEqual(firstCodes);
  });
});
