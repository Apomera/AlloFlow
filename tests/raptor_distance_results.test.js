import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modelSource = readFileSync('stem_lab/raptor_distance_model.js', 'utf8');
const evidenceSource = readFileSync('stem_lab/raptor_distance_evidence.js', 'utf8');
const fieldworkSource = readFileSync('stem_lab/raptor_distance_fieldwork.js', 'utf8');
const source = readFileSync('stem_lab/raptor_distance_results.js', 'utf8');
function setup(ready = true) {
  const local = {};
  Function('window', source)(local);
  if (ready) {
    Function('window', fieldworkSource)(local);
    Function('window', evidenceSource)(local);
    Function('window', modelSource)(local);
  }
  return { local, api: local.RaptorDistanceResults };
}
const { api } = setup();
const settings = distance => ({ version: 1, distance, cycles: 12, contrast: 95 });
const completeSettings = distance => ({ ...settings(distance), widthM: .30, wideFov: 20, detailFov: .75 });
const trial = (distance, prediction = 'both') => ({ settings: settings(distance), prediction });
const humanTrials = () => [trial(85, 'neither'), trial(86, 'both')];
const eagleTrials = () => [trial(200, 'both'), trial(201, 'eagle')];
const record = (id, trials) => ({ version: 1, modelVersion: 1, reference: id, trials });
const namespace = () => ({ version: 1, human: record('human', humanTrials()), eagle: record('eagle', eagleTrials()) });
// Independent right-triangle geometry and its inverse establish both the
// bracket sides and the conservative ratio interval without the production API.
const frequency = distance => 12 / (2 * Math.asin(.15 / Math.hypot(distance, .15)) * 180 / Math.PI);
const crossing = limit => .15 / Math.tan((12 / limit) * Math.PI / 360);

describe('Raptor completed fieldwork results', () => {
  it('registers only a frozen idempotent API and waits for dependencies at call time', () => {
    const { local, api: lazy } = setup(false);
    expect(Object.keys(local)).toEqual(['RaptorDistanceResults']); expect(Object.isFrozen(lazy)).toBe(true);
    expect(Object.keys(lazy).sort()).toEqual(['capture', 'compare', 'read', 'version']); expect(lazy.version).toBe(1);
    const unavailable = () => {
      expect(lazy.capture('human', humanTrials())).toBeNull();
      expect(lazy.read(namespace())).toBeNull(); expect(lazy.compare(namespace())).toBeNull();
    };
    unavailable(); Function('window', fieldworkSource)(local); unavailable();
    Function('window', evidenceSource)(local); unavailable();
    Function('window', modelSource)(local); expect(lazy.capture('human', humanTrials())).not.toBeNull();
    const fieldwork = local.RaptorDistanceFieldwork;
    for (const invalid of [null, {}, { ...fieldwork, version: 2 }, { ...fieldwork, trial: null }, { ...fieldwork, summarize: null }]) {
      local.RaptorDistanceFieldwork = invalid; unavailable();
    }
    local.RaptorDistanceFieldwork = fieldwork;
    const model = local.RaptorDistanceModel; local.RaptorDistanceModel = null; unavailable(); local.RaptorDistanceModel = model;
    expect(lazy.compare(namespace()).ratioLow).toBe(200 / 86);
    Function('window', source)(local); expect(local.RaptorDistanceResults).toBe(lazy);
  });

  it('captures complete human and eagle brackets as only original conditions and learner predictions', () => {
    for (const [id, input, distances, predictions, limit] of [
      ['human', humanTrials(), [85, 86], ['neither', 'both'], 60],
      ['eagle', eagleTrials(), [200, 201], ['both', 'eagle'], 140]
    ]) {
      const captured = api.capture(id, input);
      expect(captured).toEqual({ version: 1, modelVersion: 1, reference: id,
        trials: distances.map((distance, index) => ({ settings: completeSettings(distance), prediction: predictions[index] })) });
      expect(Object.keys(captured).sort()).toEqual(['modelVersion', 'reference', 'trials', 'version']);
      expect(captured.trials.every(sample => Object.keys(sample).sort().join(',') === 'prediction,settings')).toBe(true);
      expect(frequency(distances[0])).toBeLessThan(limit); expect(frequency(distances[1])).toBeGreaterThan(limit);
      expect(crossing(limit)).toBeGreaterThan(distances[0]); expect(crossing(limit)).toBeLessThan(distances[1]);
      expect(captured.trials[0].settings).not.toBe(input[0].settings);
      expect(captured).not.toHaveProperty('complete'); expect(captured).not.toHaveProperty('detected');
    }
  });

  it('rejects unknown references, unbounded brackets, one-sided observations and wrong fixed conditions', () => {
    for (const id of [undefined, null, '', 'Human', 'human ', 'constructor', 'toString', '__proto__', true, 1, {}, [], new String('human')]) {
      expect(api.capture(id, humanTrials())).toBeNull();
    }
    for (const input of [[trial(40), trial(85)], [trial(86), trial(300)], [trial(75), trial(86)], eagleTrials()]) {
      expect(api.capture('human', input)).toBeNull();
    }
    expect(api.capture('human', [trial(76), trial(86)])).not.toBeNull();
    expect(api.capture('eagle', [trial(191), trial(201)])).not.toBeNull();
    expect(api.capture('eagle', [trial(190), trial(201)])).toBeNull();
    for (const patch of [{ cycles: 8 }, { contrast: 25 }, { distance: '85' }, { distance: 85.5 }, { distance: NaN },
      { distance: Infinity }, { distance: 301 }, { version: 2 }, { widthM: 3 }, { wideFov: 40 }, { detailFov: 1.5 }]) {
      expect(api.capture('human', [{ settings: { ...settings(85), ...patch }, prediction: 'both' }, trial(86)])).toBeNull();
    }
  });

  it('rejects holes, repeated distances and oversized inputs before fieldwork can repair them', () => {
    for (const input of [undefined, null, {}, 'trials', [], [trial(85)]]) expect(api.capture('human', input)).toBeNull();
    const hole = [trial(85), , trial(86)];
    const inherited = [trial(85), , trial(86)]; Object.setPrototypeOf(inherited, { 1: trial(40) });
    expect(api.capture('human', hole)).toBeNull(); expect(api.capture('human', inherited)).toBeNull();
    expect(api.capture('human', [trial(85), trial(86), trial(85, 'eagle')])).toBeNull();
    const eight = [40, 50, 60, 70, 76, 80, 85, 86].map(distance => trial(distance));
    expect(api.capture('human', eight).trials).toHaveLength(8);
    expect(api.capture('human', eight.concat([trial(100)]))).toBeNull();
    // Validation never calls an untrusted array's method or truncates it.
    eight.forEach = 'untrusted';
    expect(api.capture('human', eight).trials).toHaveLength(8);
  });

  it('invalidates the entire capture for one malformed trial even if other trials supply a complete bracket', () => {
    class Trial { constructor() { Object.assign(this, trial(40)); } }
    const invalid = [null, [], {}, settings(40), { ...settings(40), prediction: 'both' }, { prediction: 'both' },
      { settings: settings(40) }, { settings: settings(40), prediction: 'constructor' },
      { settings: settings(40), prediction: new String('both') }, Object.create(trial(40)),
      Object.assign([], trial(40)), new Trial(), { settings: Object.create(settings(40)), prediction: 'both' }];
    for (const sample of invalid) expect(api.capture('human', [...humanTrials(), sample])).toBeNull();
    const nullPrototype = Object.assign(Object.create(null), trial(40));
    expect(api.capture('human', [...humanTrials(), nullPrototype])).not.toBeNull();
  });

  it('discards computed flags, frequency, imagery and conclusions without trusting or reading them', () => {
    const input = humanTrials();
    input[0].settings = { ...input[0].settings, image: 'data:image/png;base64,fake', conclusion: 'invented' };
    for (const sample of input) {
      Object.defineProperty(sample, 'frequency', { enumerable: true, get() { throw new Error('Serialized frequency must not be read'); } });
      sample.complete = false; sample.correct = true; sample.image = 'data:image/png;base64,fake'; sample.side = 'invented';
    }
    const captured = api.capture('human', input);
    expect(captured).toEqual(api.capture('human', humanTrials()));
    const supplied = { ...record('human', input), width: 999, complete: false, below: { distance: 1 }, ratio: 500,
      conclusion: 'invented', image: 'data:image/png;base64,fake' };
    const loaded = api.read({ version: 1, human: supplied, ratioLow: -1, ratioHigh: 999, conclusion: 'invented' });
    expect(loaded).toEqual({ version: 1, human: captured });
    const serialized = JSON.stringify(loaded);
    for (const excluded of ['frequency', 'complete', 'correct', 'image', 'conclusion', 'ratio', 'below']) expect(serialized).not.toContain('"' + excluded);
    expect(api.capture('human', [trial(40), trial(300)] )).toBeNull();
  });

  it('validates namespace and record versions and reference identity without accepting inherited slots', () => {
    const valid = namespace();
    for (const invalid of [undefined, null, [], {}, Object.create(valid), Object.assign([], valid),
      { ...valid, version: '1' }, { ...valid, version: 2 }]) expect(api.read(invalid)).toBeNull();
    expect(api.read({ version: 1, unknown: valid.human })).toBeNull();
    for (const field of ['version', 'modelVersion', 'reference', 'trials']) {
      const missing = { ...valid.human }; delete missing[field];
      expect(api.read({ version: 1, human: missing })).toBeNull();
    }
    for (const invalid of [null, [], Object.create(valid.human), { ...valid.human, version: '1' },
      { ...valid.human, version: 2 }, { ...valid.human, modelVersion: '1' }, { ...valid.human, modelVersion: 2 },
      { ...valid.human, reference: 'eagle' }, { ...valid.human, reference: new String('human') }]) {
      expect(api.read({ version: 1, human: invalid })).toBeNull();
    }
    expect(api.read(Object.assign(Object.create(null), { version: 1, human: Object.assign(Object.create(null), valid.human) })))
      .toEqual({ version: 1, human: api.capture('human', humanTrials()) });
  });

  it('drops an invalid slot independently while preserving the other valid completed record', () => {
    const valid = namespace();
    const damagedHuman = { ...valid.human, trials: [...humanTrials(), { settings: { ...settings(40), contrast: 94 }, prediction: 'both' }] };
    const onlyEagle = api.read({ version: 1, human: damagedHuman, eagle: valid.eagle });
    expect(onlyEagle).toEqual({ version: 1, eagle: api.capture('eagle', eagleTrials()) });
    expect(api.compare({ version: 1, human: damagedHuman, eagle: valid.eagle })).toBeNull();
    const damagedEagle = { ...valid.eagle, trials: [...eagleTrials(), trial(201)] };
    expect(api.read({ version: 1, human: valid.human, eagle: damagedEagle }))
      .toEqual({ version: 1, human: api.capture('human', humanTrials()) });
    expect(api.read({ version: 1, human: damagedHuman, eagle: damagedEagle })).toBeNull();
    expect(api.read({ version: 1, human: valid.eagle, eagle: valid.human })).toBeNull();
    expect(api.read({ version: 1, human: { ...valid.human, trials: eagleTrials(), complete: true, width: 1 } })).toBeNull();
  });

  it('computes a conservative distance-ratio interval from opposite endpoints of both validated brackets', () => {
    const result = api.compare(namespace());
    expect(Object.keys(result).sort()).toEqual(['eagle', 'human', 'ratioHigh', 'ratioLow']);
    expect(result.human).toMatchObject({ below: { distance: 85 }, above: { distance: 86 }, width: 1, complete: true, limit: 60 });
    expect(result.eagle).toMatchObject({ below: { distance: 200 }, above: { distance: 201 }, width: 1, complete: true, limit: 140 });
    expect(result.human.below.frequency).toBeCloseTo(frequency(85), 11);
    expect(result.human.above.frequency).toBeCloseTo(frequency(86), 11);
    expect(result.eagle.below.frequency).toBeCloseTo(frequency(200), 11);
    expect(result.eagle.above.frequency).toBeCloseTo(frequency(201), 11);
    expect(result.ratioLow).toBe(200 / 86); expect(result.ratioHigh).toBe(201 / 85);
    const exactReferenceRatio = crossing(140) / crossing(60);
    expect(result.ratioLow).toBeLessThan(exactReferenceRatio); expect(result.ratioHigh).toBeGreaterThan(exactReferenceRatio);
    expect(result.ratioLow).toBeLessThan(result.ratioHigh);
    expect(result.human.trials.map(sample => sample.prediction)).toEqual(['neither', 'both']);
    expect(result.eagle.trials.map(sample => sample.prediction)).toEqual(['both', 'eagle']);
    expect(result).not.toHaveProperty('conclusion'); expect(result).not.toHaveProperty('detectionRatio');
  });

  it('recalculates wider valid intervals and requires both references rather than supplied completeness claims', () => {
    const raw = { version: 1, human: record('human', [trial(86), trial(76)]), eagle: record('eagle', [trial(201), trial(191)]),
      complete: true, ratioLow: 0, ratioHigh: Infinity };
    raw.human.complete = false; raw.human.width = 999; raw.eagle.complete = false; raw.eagle.width = 999;
    const result = api.compare(raw);
    expect(result.human.width).toBe(10); expect(result.eagle.width).toBe(10);
    expect(result.ratioLow).toBe(191 / 86); expect(result.ratioHigh).toBe(201 / 76);
    expect(result.human.trials.map(sample => sample.settings.distance)).toEqual([86, 76]);
    expect(result.eagle.trials.map(sample => sample.settings.distance)).toEqual([201, 191]);
    expect(api.compare({ version: 1, human: raw.human })).toBeNull();
    expect(api.compare({ version: 1, eagle: raw.eagle })).toBeNull();
    expect(api.compare({ version: 1, human: { ...raw.human, trials: [trial(75), trial(86)], complete: true, width: 1 }, eagle: raw.eagle })).toBeNull();
  });

  it('returns fresh records, trials, settings and derived summaries without mutating the imported namespace', () => {
    const raw = namespace();
    for (const id of ['human', 'eagle']) {
      raw[id].trials.forEach(sample => { Object.freeze(sample.settings); Object.freeze(sample); });
      Object.freeze(raw[id].trials); Object.freeze(raw[id]);
    }
    Object.freeze(raw); const before = JSON.stringify(raw);
    const first = api.read(raw), second = api.read(raw);
    first.human.trials[0].settings.distance = 300; first.human.trials[0].prediction = 'eagle'; first.human.trials.push(trial(40));
    first.eagle.reference = 'human';
    expect(second).toEqual(api.read(raw)); expect(second.human.trials).toHaveLength(2);
    const compared = api.compare(raw); compared.human.below.distance = 1; compared.eagle.trials[0].settings.distance = 40; compared.ratioLow = -1;
    const next = api.compare(raw);
    expect(next.human.below.distance).toBe(85); expect(next.eagle.trials[0].settings.distance).toBe(200); expect(next.ratioLow).toBe(200 / 86);
    expect(JSON.stringify(raw)).toBe(before);
    const captured = api.capture('human', raw.human.trials); captured.trials[0].settings.distance = 300;
    expect(api.capture('human', raw.human.trials).trials[0].settings.distance).toBe(85);
  });
});
