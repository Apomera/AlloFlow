import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
const stateAt = step => ['Resting', 'Resting', 'Grazing', 'Grazing', 'Alert', 'Alert', 'Exploring', 'Exploring'][step % 8];
function sheet(start = 0, interval = 1, extra = {}) {
  const samples = Array.from({ length: 5 }, (_, k) => { const step = start + k * interval, state = stateAt(step); return { step, state, category: api.ethogramCategory(state), x: step / 10, z: 0 }; });
  return { version: 1, species: 'rabbits', index: 0, branch: 'experiment', start, interval, samples, firstCodes: samples.map(p => p.category), codes: samples.map(p => p.category), reflection: 'My original sampling sheet.', ...extra };
}
const meta = reference => ({ version: 1, reference, variable: 'start', category: 'feeding', prediction: 'lower', firstCategory: 'attending', firstPrediction: 'higher', reflection: 'The short shifted window missed the earlier feeding samples.' });

describe('comparison of two ethogram sampling plans', () => {
  it('freezes a flat detached reference with exact states, first codes and revisions', () => {
    const raw = sheet(); raw.firstCodes[0] = 'feeding'; raw.reference = sheet(1); raw.comparison = { arbitrary: true };
    const before = JSON.stringify(raw), reference = api.ethogramSnapshot(raw);
    expect(reference.firstCodes[0]).toBe('feeding'); expect(reference.codes[0]).toBe('resting'); expect(reference.reflection).toBe(raw.reflection);
    expect(reference.reference).toBeUndefined(); expect(reference.comparison).toBeUndefined(); reference.samples[0].x = 999; reference.firstCodes[0] = 'moving'; expect(JSON.stringify(raw)).toBe(before);
  });

  it('compares recorded counts and five-checkpoint proportions with a start-only change', () => {
    const compared = api.samplingComparison(sheet(), sheet(4)), feeding = compared.rows.find(r => r.id === 'feeding');
    expect(compared.variable).toBe('start'); expect(compared.overlapSteps).toEqual([4]);
    expect(feeding).toMatchObject({ reference: 2, current: 0, delta: -2, referenceProportion: 0.4, currentProportion: 0 });
    expect(compared.rows.reduce((sum, r) => sum + r.reference, 0)).toBe(5); expect(compared.rows.reduce((sum, r) => sum + r.current, 0)).toBe(5); expect(compared.rows.reduce((sum, r) => sum + r.delta, 0)).toBe(0);
    const latest = sheet(4); latest.codes.fill('feeding'); const miscoded = api.samplingComparison(sheet(), latest);
    expect(miscoded.rows.find(r => r.id === 'feeding')).toMatchObject({ current: 0, currentCoded: 5 });
  });

  it('allows an interval-only change and rejects both/no variable changes or a new animal/branch', () => {
    const reference = sheet(); expect(api.samplingComparison(reference, sheet(0, 2)).variable).toBe('interval');
    for (const current of [sheet(), sheet(1, 2), sheet(1, 1, { species: 'foxes' }), sheet(1, 1, { index: 1 }), sheet(1, 1, { branch: 'baseline' })]) expect(api.samplingComparison(reference, current)).toBeNull();
  });

  it('rejects contradictory reused checkpoints and malformed snapshot evidence', () => {
    for (const mutate of [s => { s.samples[0].x += 0.01; }, s => { s.samples[0].z += 0.01; }, s => { s.samples[0].state = 'Resting'; s.samples[0].category = 'resting'; }]) {
      const current = sheet(4); mutate(current); expect(api.samplingComparison(sheet(), current)).toBeNull();
    }
    for (const mutate of [s => { s.version = 2; }, s => { s.interval = 0; }, s => { s.start = 240; }, s => { s.samples.pop(); }, s => { s.samples[1].step = 9; }, s => { s.samples[0].category = 'moving'; }, s => { s.samples[0].state = 'Unknown'; s.samples[0].category = null; }, s => { s.samples[0].x = NaN; }, s => { s.samples[0].z = 1000; }, s => { s.firstCodes[0] = ''; }]) {
      const raw = sheet(); mutate(raw); expect(api.ethogramSnapshot(raw)).toBeNull(); expect(api.samplingComparison(raw, sheet(4))).toBeNull();
    }
  });

  it('previews only a valid one-variable plan of the same branch with continuous present animals', () => {
    const frames = Array.from({ length: 25 }, (_, step) => ({ rabbits: [{ active: true, state: stateAt(step), x: step / 10, z: 0 }] })), reference = sheet();
    expect(api.samplingPlan(reference, frames, 4, 1, 'experiment').samples.map(p => p.step)).toEqual([4, 5, 6, 7, 8]);
    expect(api.samplingPlan(reference, frames, 0, 2, 'experiment').samples.map(p => p.step)).toEqual([0, 2, 4, 6, 8]);
    for (const args of [[0, 1, 'experiment'], [1, 2, 'experiment'], [1, 1, 'baseline'], [24, 1, 'experiment']]) expect(api.samplingPlan(reference, frames, ...args)).toBeNull();
    frames[3].rabbits[0].active = false; expect(api.samplingPlan(reference, frames, 0, 2, 'experiment')).toBeNull();
  });

  it('checks a category-specific prediction while leaving uncertainty unscored', () => {
    const compared = api.samplingComparison(sheet(), sheet(4));
    expect(api.samplingClaim(compared, 'feeding', 'lower')).toMatchObject({ expected: 'lower', correct: true, reference: 2, current: 0, delta: -2 });
    expect(api.samplingClaim(compared, 'feeding', 'higher').correct).toBe(false); expect(api.samplingClaim(compared, 'feeding', 'unsure').correct).toBeNull();
    expect(api.samplingClaim(compared, 'grooming', 'same')).toMatchObject({ expected: 'same', correct: true, reference: 0, current: 0 });
    for (const args of [['unknown', 'same'], ['feeding', 'bad'], [null, 'same']]) expect(api.samplingClaim(compared, ...args)).toBeNull();
  });

  it('normalizes a detached comparison attachment with original and revised prediction categories', () => {
    const raw = meta(sheet()), before = JSON.stringify(raw), normalized = api.samplingComparisonRecord(raw, sheet(4));
    expect(normalized.comparison).toEqual({ version: 1, variable: 'start', category: 'feeding', prediction: 'lower', firstCategory: 'attending', firstPrediction: 'higher', reflection: raw.reflection });
    expect(normalized.reference).toEqual(sheet()); normalized.reference.samples[0].x = 999; normalized.comparison.firstPrediction = 'same'; expect(JSON.stringify(raw)).toBe(before);
    const long = meta(sheet()); long.reflection = 'x'.repeat(2000); expect(api.samplingComparisonRecord(long, sheet(4)).comparison.reflection.length).toBe(1600);
    for (const mutate of [m => { m.version = 2; }, m => { m.variable = 'interval'; }, m => { m.category = 'unknown'; }, m => { m.firstCategory = ''; }, m => { m.prediction = ''; }, m => { m.firstPrediction = 'bad'; }, m => { m.reference.index = 1; }]) {
      const raw = meta(sheet()); mutate(raw); expect(api.samplingComparisonRecord(raw, sheet(4))).toBeNull();
    }
  });

  it('retains both sheets through notebook normalization/export and omits an invalid optional comparison', () => {
    const config = { event: 'none' }, pair = api.compare(config), frames = api.behaviorTimeline(config, pair.experiment), first = api.ethogramPlan(frames, 'rabbits', 0, 0, 10), second = api.ethogramPlan(frames, 'rabbits', 0, 10, 10);
    const asSheet = p => ({ version: 1, branch: 'experiment', species: 'rabbits', index: 0, start: p.start, interval: p.interval, samples: p.samples, firstCodes: p.samples.map(s => s.category), codes: p.samples.map(s => s.category), reflection: 'Sampling sheet' });
    const attachment = { ...asSheet(second), reference: asSheet(first), comparison: { version: 1, variable: 'start', category: 'feeding', prediction: 'lower', firstCategory: 'feeding', firstPrediction: 'same', reflection: 'These are samples, not a time budget.' } };
    const note = api.capture(config, pair, second.samples[2].step, 'rabbits', 'Sampling plan comparison', '', 1, null, null, null, attachment), restored = api.notebook([note]);
    expect(note.ethogram.reference).toEqual(attachment.reference); expect(restored[0].ethogram.comparison).toEqual(attachment.comparison);
    const text = api.notebookText(restored); expect(text).toContain('Sampling comparison: changed start only'); expect(text).toContain('Reference sheet'); expect(text).toContain('first prediction: same'); expect(text).toContain('not independent animals');
    const invalid = structuredClone(attachment); invalid.comparison.variable = 'interval'; const normalized = api.ethogramRecord(invalid, config, second.samples[2].step, 'rabbits');
    expect(normalized).toBeTruthy(); expect(normalized.reference).toBeUndefined(); expect(normalized.comparison).toBeUndefined();
  });

  it('leaves recorded timelines and population outcomes unchanged', () => {
    const config = { event: 'none' }, pair = api.compare(config), original = JSON.stringify(pair), frames = api.behaviorTimeline(config, pair.baseline), before = JSON.stringify(frames), first = api.ethogramPlan(frames, 'foxes', 0, 0, 5), second = api.ethogramPlan(frames, 'foxes', 0, 5, 5);
    const full = p => ({ version: 1, branch: 'baseline', species: 'foxes', index: 0, start: p.start, interval: p.interval, samples: p.samples, firstCodes: p.samples.map(s => s.category), codes: p.samples.map(s => s.category) });
    const a = api.samplingComparison(full(first), full(second)), b = api.samplingComparison(full(first), full(second)); expect(a).toEqual(b); a.rows[0].current = 99; a.reference.samples[0].state = 'Changed'; expect(api.samplingComparison(full(first), full(second))).toEqual(b);
    expect(JSON.stringify(frames)).toBe(before); expect(JSON.stringify(pair)).toBe(original);
  });
});
