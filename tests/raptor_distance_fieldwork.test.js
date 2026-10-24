import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modelSource = readFileSync('stem_lab/raptor_distance_model.js', 'utf8');
const evidenceSource = readFileSync('stem_lab/raptor_distance_evidence.js', 'utf8');
const source = readFileSync('stem_lab/raptor_distance_fieldwork.js', 'utf8');
function setup(ready = true) {
  const local = {};
  Function('window', source)(local);
  if (ready) {
    Function('window', evidenceSource)(local);
    Function('window', modelSource)(local);
  }
  return { local, api: local.RaptorDistanceFieldwork };
}
const { api } = setup();
const settings = distance => ({ version: 1, distance, cycles: 12, contrast: 95 });
const completeSettings = distance => ({ ...settings(distance), widthM: .30, wideFov: 20, detailFov: .75 });
const sample = (distance, prediction = 'both', frequency = -1000) => ({ settings: settings(distance), prediction, frequency });
// Independent right-triangle expression instead of the model's arctangent.
const frequency = distance => 12 / (2 * Math.asin(.15 / Math.hypot(distance, .15)) * 180 / Math.PI);

describe('Raptor distance reference-crossing fieldwork', () => {
  it('registers a frozen idempotent API and supports lazy dependency arrival without owning state', () => {
    const { local, api: lazy } = setup(false);
    expect(Object.keys(local)).toEqual(['RaptorDistanceFieldwork']); expect(Object.isFrozen(lazy)).toBe(true);
    expect(Object.keys(lazy).sort()).toEqual(['plan', 'summarize', 'trial', 'version']); expect(lazy.version).toBe(1);
    const unavailable = () => {
      expect(lazy.plan('human')).toBeNull(); expect(lazy.trial(settings(85), 'both')).toBeNull();
      expect(lazy.summarize('human', [sample(85), sample(86)])).toBeNull();
    };
    unavailable(); Function('window', evidenceSource)(local); unavailable();
    Function('window', modelSource)(local); expect(lazy.plan('human').limit).toBe(60);
    const model = local.RaptorDistanceModel, evidence = local.RaptorDistanceEvidence;
    for (const invalid of [null, {}, { ...model, version: 2 }, { ...model, normalize: null }, { ...model, metrics: null }]) {
      local.RaptorDistanceModel = invalid; unavailable();
    }
    local.RaptorDistanceModel = model;
    for (const invalid of [null, {}, { ...evidence, version: 2 }, { ...evidence, snapshot: null }]) {
      local.RaptorDistanceEvidence = invalid; unavailable();
    }
    local.RaptorDistanceEvidence = evidence;
    expect(lazy.summarize('human', [sample(85), sample(86)]).complete).toBe(true);
    Function('window', source)(local); expect(local.RaptorDistanceFieldwork).toBe(lazy);
  });

  it('provides two fresh plans with the same fixed pattern and qualified reference titles', () => {
    for (const [id, limit] of [['human', 60], ['eagle', 140]]) {
      const plan = api.plan(id);
      expect(Object.keys(plan).sort()).toEqual(['id', 'limit', 'reference', 'title']);
      expect(plan.id).toBe(id); expect(plan.limit).toBe(limit); expect(plan.title).toContain(id + ' reference');
      expect(plan.reference).toEqual(completeSettings(40));
      const next = api.plan(id); expect(next).not.toBe(plan); expect(next.reference).not.toBe(plan.reference);
      plan.reference.distance = 300; plan.title = 'Changed'; plan.limit = 999;
      expect(api.plan(id)).toEqual(next);
    }
    for (const invalid of [undefined, null, '', 'Human', 'human ', 1, true, {}, [], 'constructor', 'toString', '__proto__', new String('human')]) {
      expect(api.plan(invalid)).toBeNull(); expect(api.summarize(invalid, [])).toBeNull();
    }
  });

  it('records only a copied condition, learner prediction and independently verified frequency', () => {
    for (const distance of [40, 85, 86, 200, 201, 300]) for (const prediction of ['both', 'eagle', 'neither']) {
      const raw = Object.freeze({ ...settings(distance), frequency: 999, correct: true, detected: true });
      const trial = api.trial(raw, prediction);
      expect(Object.keys(trial).sort()).toEqual(['frequency', 'prediction', 'settings']);
      expect(trial.settings).toEqual(completeSettings(distance)); expect(trial.settings).not.toBe(raw);
      expect(trial.prediction).toBe(prediction); expect(trial.frequency).toBeCloseTo(frequency(distance), 11);
      // The prediction is retained even when it does not match a reference band.
      expect(trial).not.toHaveProperty('correct'); expect(trial).not.toHaveProperty('detected');
    }
  });

  it('rejects malformed settings, pattern changes and coerced predictions without clamping them', () => {
    class Settings { constructor() { Object.assign(this, settings(85)); } }
    const invalidSettings = [undefined, null, [], {}, new Settings(), Object.create(settings(85)), Object.assign([], settings(85)),
      { ...settings(85), version: 2 }, { ...settings(85), version: '1' }, { ...settings(85), distance: '85' },
      { ...settings(85), distance: 39 }, { ...settings(85), distance: 301 }, { ...settings(85), distance: 85.5 },
      { ...settings(85), distance: NaN }, { ...settings(85), distance: Infinity }, { ...settings(85), distance: -Infinity },
      { ...settings(85), cycles: 11 }, { ...settings(85), cycles: 13 }, { ...settings(85), cycles: '12' },
      { ...settings(85), contrast: 94 }, { ...settings(85), contrast: 96 }, { ...settings(85), contrast: '95' },
      { ...settings(85), widthM: 30 }, { ...settings(85), wideFov: 21 }, { ...settings(85), detailFov: 1 }];
    for (const field of ['version', 'distance', 'cycles', 'contrast']) {
      const missing = settings(85); delete missing[field]; invalidSettings.push(missing);
    }
    for (const invalid of invalidSettings) expect(api.trial(invalid, 'both')).toBeNull();
    for (const invalid of [undefined, null, '', 'Both', 'constructor', 'toString', '__proto__', false, 1, [], {}, new String('both')]) {
      expect(api.trial(settings(85), invalid)).toBeNull();
    }
    expect(api.trial(Object.assign(Object.create(null), settings(85)), 'both').settings).toEqual(completeSettings(85));
  });

  it('brackets the human crossing between 85 m and 86 m using frequency rather than sample order or predictions', () => {
    const summary = api.summarize('human', [sample(300, 'both'), sample(85, 'neither'), sample(40, 'eagle'), sample(86, 'both')]);
    expect(frequency(85)).toBeLessThan(60); expect(frequency(86)).toBeGreaterThan(60);
    expect(summary.below.distance).toBe(85); expect(summary.above.distance).toBe(86);
    expect(summary.below.frequency).toBeCloseTo(frequency(85), 11); expect(summary.above.frequency).toBeCloseTo(frequency(86), 11);
    expect(summary).toMatchObject({ width: 1, complete: true, limit: 60 });
    expect(summary.trials.map(trial => trial.settings.distance)).toEqual([300, 85, 40, 86]);
    expect(summary.trials.map(trial => trial.prediction)).toEqual(['both', 'neither', 'eagle', 'both']);
    expect(Object.keys(summary).sort()).toEqual(['above', 'below', 'complete', 'limit', 'trials', 'width']);
    expect(Object.keys(summary.below).sort()).toEqual(['distance', 'frequency']);
    expect(Object.keys(summary.above).sort()).toEqual(['distance', 'frequency']);
  });

  it('brackets the selected eagle crossing between 200 m and 201 m independently of the human reference', () => {
    const input = [sample(201), sample(86), sample(200), sample(85)];
    const summary = api.summarize('eagle', input), human = api.summarize('human', input);
    expect(frequency(200)).toBeLessThan(140); expect(frequency(201)).toBeGreaterThan(140);
    expect(summary.below.distance).toBe(200); expect(summary.above.distance).toBe(201);
    expect(summary.below.frequency).toBeCloseTo(frequency(200), 11); expect(summary.above.frequency).toBeCloseTo(frequency(201), 11);
    expect(summary).toMatchObject({ width: 1, complete: true, limit: 140 });
    expect(human.below.distance).toBe(85); expect(human.above.distance).toBe(86);
  });

  it('requires observations on both sides and completes only a positive bracket at most ten metres wide', () => {
    const empty = api.summarize('human', []);
    expect(empty).toEqual({ trials: [], below: null, above: null, width: null, complete: false, limit: 60 });
    const lowerOnly = api.summarize('human', [sample(40), sample(85)]);
    expect(lowerOnly.below.distance).toBe(85); expect(lowerOnly.above).toBeNull(); expect(lowerOnly.width).toBeNull(); expect(lowerOnly.complete).toBe(false);
    const upperOnly = api.summarize('human', [sample(300), sample(86)]);
    expect(upperOnly.below).toBeNull(); expect(upperOnly.above.distance).toBe(86); expect(upperOnly.width).toBeNull(); expect(upperOnly.complete).toBe(false);
    expect(api.summarize('human', [sample(76), sample(86)])).toMatchObject({ width: 10, complete: true });
    expect(api.summarize('human', [sample(75), sample(86)])).toMatchObject({ width: 11, complete: false });
    expect(api.summarize('eagle', [sample(191), sample(201)])).toMatchObject({ width: 10, complete: true });
    expect(api.summarize('eagle', [sample(190), sample(201)])).toMatchObject({ width: 11, complete: false });
    expect(api.summarize('human', [sample(85), sample(85, 'neither')])).toMatchObject({ above: null, width: null, complete: false });
  });

  it('retains the eight most recent unique distances and replaces a repeat with its latest valid prediction', () => {
    const input = [40, 50, 60, 70, 80, 90, 100, 110, 120].map(distance => sample(distance));
    input.push(sample(50, 'eagle'));
    input.push({ settings: { ...settings(80), contrast: 94 }, prediction: 'neither', frequency: 80 });
    const summary = api.summarize('human', input);
    expect(summary.trials.map(trial => trial.settings.distance)).toEqual([60, 70, 80, 90, 100, 110, 120, 50]);
    expect(summary.trials[7].prediction).toBe('eagle'); expect(summary.trials[2].prediction).toBe('both');
    expect(summary.trials).toHaveLength(8);
    expect(new Set(summary.trials.map(trial => trial.settings.distance)).size).toBe(8);
    expect(summary).toMatchObject({ below: { distance: 80 }, above: { distance: 90 }, width: 10, complete: true });
    // Evicted near-crossing samples cannot continue to supply a tighter bracket.
    const evicted = api.summarize('human', [85, 86, 40, 50, 60, 70, 80, 90, 100, 110].map(distance => sample(distance)));
    expect(evicted.trials.map(trial => trial.settings.distance)).toEqual([40, 50, 60, 70, 80, 90, 100, 110]);
    expect(evicted).toMatchObject({ below: { distance: 80 }, above: { distance: 90 }, width: 10 });
  });

  it('accepts only nested trial records, drops malformed entries, and never reads serialized frequency or derived claims', () => {
    for (const invalid of [undefined, null, {}, 'samples', 3, true]) expect(api.summarize('human', invalid)).toBeNull();
    const invalid = [null, [], {}, settings(85), { ...settings(85), prediction: 'both' },
      { prediction: 'both', frequency: 50 }, { settings: settings(85) },
      { settings: settings(85), prediction: 'constructor' },
      Object.create(sample(85)), Object.assign([], sample(85)),
      { settings: { ...settings(85), cycles: 8 }, prediction: 'both' }];
    expect(api.summarize('human', invalid)).toEqual({ trials: [], below: null, above: null, width: null, complete: false, limit: 60 });
    const lower = { ...sample(85, 'eagle', Infinity), complete: true, side: 'above', detected: true };
    const upper = { ...sample(86, 'both', -Infinity), complete: false, side: 'below' };
    Object.defineProperty(lower, 'frequency', { enumerable: true, get() { throw new Error('Untrusted derived frequency must not be read'); } });
    const summary = api.summarize('human', [lower, ...invalid, upper]);
    expect(summary).toMatchObject({ below: { distance: 85 }, above: { distance: 86 }, width: 1, complete: true });
    expect(summary.trials[0].frequency).toBeCloseTo(frequency(85), 11);
    expect(summary.trials[1].frequency).toBeCloseTo(frequency(86), 11);
    for (const trial of summary.trials) expect(Object.keys(trial).sort()).toEqual(['frequency', 'prediction', 'settings']);
  });

  it('returns fresh trials and endpoints without aliasing input records or previous summaries', () => {
    const rawSettings = Object.freeze(settings(85));
    const raw = Object.freeze([Object.freeze({ settings: rawSettings, prediction: 'both', frequency: 0 }),
      Object.freeze({ settings: Object.freeze(settings(86)), prediction: 'eagle', frequency: 999 })]);
    const first = api.summarize('human', raw), second = api.summarize('human', raw);
    first.trials[0].settings.distance = 300; first.trials[0].prediction = 'neither'; first.trials[0].frequency = -1;
    first.below.distance = 40; first.above.frequency = 0; first.trials.push(api.trial(settings(90), 'both'));
    expect(raw[0].settings.distance).toBe(85); expect(raw[0].prediction).toBe('both'); expect(raw[0].frequency).toBe(0);
    expect(second).toEqual(api.summarize('human', raw)); expect(second.trials).toHaveLength(2);
    expect(second.trials[0].settings.distance).toBe(85); expect(second.below.distance).toBe(85);
    expect(second.above.frequency).toBeCloseTo(frequency(86), 11);
    const trial = api.trial(rawSettings, 'both'); trial.settings.distance = 40;
    expect(api.trial(rawSettings, 'both').settings.distance).toBe(85);
  });
});
