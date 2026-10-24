import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modelSource = readFileSync('stem_lab/raptor_distance_model.js', 'utf8');
const evidenceSource = readFileSync('stem_lab/raptor_distance_evidence.js', 'utf8');
function setup(withModel = true) {
  const local = {};
  Function('window', evidenceSource)(local);
  if (withModel) Function('window', modelSource)(local);
  return { local, api: local.RaptorDistanceEvidence };
}
const { api } = setup();
const conditions = { version: 1, distance: 80, cycles: 8, contrast: 95 };
const full = { version: 1, distance: 80, contrast: 95, cycles: 8, widthM: .30, wideFov: 20, detailFov: .75 };
const legacy = (note = 'The angular spacing changed.') => ({
  version: 1, modelVersion: 1, distance: 80, cycles: 8, contrast: 95,
  widthM: .30, referenceLimit: 60, eagleLimit: 140, prediction: 'both', note
});
// Independent right-triangle expression for the target's angular span.
const angle = distance => 2 * Math.asin(.15 / Math.hypot(distance, .15));

describe('Raptor distance evidence', () => {
  it('registers only a frozen, idempotent API and resolves its model at call time', () => {
    const { local, api: lazy } = setup(false);
    expect(Object.keys(local)).toEqual(['RaptorDistanceEvidence']);
    expect(Object.isFrozen(lazy)).toBe(true); expect(lazy.version).toBe(1);
    expect(Object.keys(lazy).sort()).toEqual(['compare', 'experiment', 'makeRecord', 'readRecords', 'snapshot', 'version']);
    expect(lazy.snapshot(conditions)).toBeNull(); expect(lazy.compare(conditions, conditions)).toBeNull();
    expect(lazy.experiment(conditions, 'restore')).toBeNull(); expect(lazy.makeRecord(conditions, 'both', 'A note.', null)).toBeNull();
    expect(lazy.readRecords({ version: 1, records: [legacy()] })).toEqual([]);
    Function('window', modelSource)(local); expect(lazy.snapshot(conditions)).toEqual(full);
    const savedModel = local.RaptorDistanceModel;
    for (const incompatible of [null, {}, { ...savedModel, version: 2 }, { ...savedModel, normalize: null }, { ...savedModel, metrics: null }]) {
      local.RaptorDistanceModel = incompatible; expect(lazy.snapshot(conditions)).toBeNull();
    }
    local.RaptorDistanceModel = savedModel; expect(lazy.snapshot(conditions)).toEqual(full);
    Function('window', evidenceSource)(local); expect(local.RaptorDistanceEvidence).toBe(lazy);
  });

  it('requires a plain version-one record with all three explicit conditions', () => {
    class Settings { constructor() { Object.assign(this, conditions); } }
    const invalid = [undefined, null, [], true, false, 1, 'settings', new Date(), new Settings(),
      Object.assign([], conditions), Object.create(conditions), {}, { ...conditions, version: '1' }, { ...conditions, version: 2 }];
    for (const key of ['version', 'distance', 'cycles', 'contrast']) {
      const missing = { ...conditions }; delete missing[key]; invalid.push(missing);
    }
    for (const value of invalid) expect(api.snapshot(value)).toBeNull();
    expect(api.snapshot(Object.assign(Object.create(null), conditions))).toEqual(full);
  });

  it('rejects rather than clamps, rounds or coerces invalid saved numbers', () => {
    const ranges = { distance: [40, 300], cycles: [4, 20], contrast: [10, 100] };
    for (const [field, [min, max]] of Object.entries(ranges)) {
      for (const invalid of [undefined, null, true, false, String(min), NaN, Infinity, -Infinity, min - 1, max + 1, min + .1, [], {}, new Number(min)]) {
        expect(api.snapshot({ ...conditions, [field]: invalid }), `${field}: ${String(invalid)}`).toBeNull();
      }
      for (const valid of [min, max]) expect(api.snapshot({ ...conditions, [field]: valid })[field]).toBe(valid);
    }
  });

  it('checks supplied fixed geometry, whitelists settings and returns fresh independent snapshots', () => {
    for (const [field, value] of [['widthM', .30], ['wideFov', 20], ['detailFov', .75]]) {
      expect(api.snapshot({ ...conditions, [field]: value })).toEqual(full);
      for (const invalid of [undefined, null, String(value), value * 2, NaN]) expect(api.snapshot({ ...conditions, [field]: invalid })).toBeNull();
    }
    const raw = Object.freeze({ ...full, selectedSpecies: 'invented', records: [], referenceBand: 'neither', scale: 100 });
    const first = api.snapshot(raw), second = api.snapshot(raw);
    expect(first).toEqual(full); expect(Object.keys(first).sort()).toEqual(Object.keys(full).sort());
    expect(first).not.toBe(raw); expect(first).not.toBe(second);
    first.distance = 300; expect(second.distance).toBe(80); expect(raw.distance).toBe(80);
  });

  it('distinguishes unchanged conditions from each controlled change with current/reference ratios', () => {
    const same = api.compare(conditions, conditions);
    expect(same).toEqual({ reference: full, current: full, changedFields: [], heldFields: ['distance', 'cycles', 'contrast'],
      kind: 'same', factor: null, angleRatio: 1, frequencyRatio: 1, contrastRatio: 1 });
    const distance = api.compare(conditions, { ...conditions, distance: 160 });
    expect(distance.kind).toBe('single'); expect(distance.factor).toBe('distance');
    expect(distance.changedFields).toEqual(['distance']); expect(distance.heldFields).toEqual(['cycles', 'contrast']);
    expect(distance.angleRatio).toBeCloseTo(angle(160) / angle(80), 13);
    expect(distance.frequencyRatio).toBeCloseTo(angle(80) / angle(160), 13);
    expect(distance.contrastRatio).toBe(1);
    // Exact finite-width geometry makes doubled distance almost, not exactly, twice the frequency.
    expect(distance.frequencyRatio).toBeLessThan(2); expect(distance.frequencyRatio).toBeGreaterThan(1.99);
    const cycles = api.compare(conditions, { ...conditions, cycles: 16 });
    expect(cycles.kind).toBe('single'); expect(cycles.factor).toBe('cycles');
    expect(cycles.changedFields).toEqual(['cycles']); expect(cycles.heldFields).toEqual(['distance', 'contrast']);
    expect(cycles.angleRatio).toBe(1); expect(cycles.frequencyRatio).toBe(2); expect(cycles.contrastRatio).toBe(1);
    const contrast = api.compare(conditions, { ...conditions, contrast: 25 });
    expect(contrast.kind).toBe('single'); expect(contrast.factor).toBe('contrast');
    expect(contrast.changedFields).toEqual(['contrast']); expect(contrast.heldFields).toEqual(['distance', 'cycles']);
    expect(contrast.angleRatio).toBe(1); expect(contrast.frequencyRatio).toBe(1); expect(contrast.contrastRatio).toBeCloseTo(25 / 95, 14);
  });

  it('reports multiple changes without claiming a controlled experiment or biological detection', () => {
    const result = api.compare(conditions, { ...conditions, distance: 120, cycles: 12, contrast: 25 });
    expect(result.kind).toBe('multiple'); expect(result.factor).toBeNull();
    expect(result.changedFields).toEqual(['distance', 'cycles', 'contrast']); expect(result.heldFields).toEqual([]);
    expect(result.angleRatio).toBeCloseTo(angle(120) / angle(80), 13);
    expect(result.frequencyRatio).toBeCloseTo((12 / angle(120)) / (8 / angle(80)), 13);
    expect(result.contrastRatio).toBeCloseTo(25 / 95, 14);
    expect(Object.keys(result).sort()).toEqual(['angleRatio', 'changedFields', 'contrastRatio', 'current', 'factor', 'frequencyRatio', 'heldFields', 'kind', 'reference']);
    expect(api.compare(conditions, { ...conditions, cycles: 12, contrast: 25 }).heldFields).toEqual(['distance']);
    expect(api.compare(null, conditions)).toBeNull(); expect(api.compare(conditions, { ...conditions, distance: '120' })).toBeNull();
  });

  it('makes bounded one-factor suggestions without silently clamping an unavailable doubling', () => {
    for (const distance of [40, 80, 150]) {
      const before = { ...conditions, distance }, after = api.experiment(before, 'distance');
      expect(after).toEqual({ ...full, distance: distance * 2 }); expect(api.compare(before, after).factor).toBe('distance');
    }
    for (const distance of [151, 300]) expect(api.experiment({ ...conditions, distance }, 'distance')).toBeNull();
    for (const cycles of [4, 8, 10]) {
      const before = { ...conditions, cycles }, after = api.experiment(before, 'cycles');
      expect(after).toEqual({ ...full, cycles: cycles * 2 }); expect(api.compare(before, after).factor).toBe('cycles');
    }
    for (const cycles of [11, 20]) expect(api.experiment({ ...conditions, cycles }, 'cycles')).toBeNull();
    for (const contrast of [10, 24, 26, 100]) expect(api.experiment({ ...conditions, contrast }, 'contrast')).toEqual({ ...full, contrast: 25 });
    expect(api.experiment({ ...conditions, contrast: 25 }, 'contrast')).toBeNull();
    expect(api.experiment(conditions, 'restore')).toEqual(full);
    for (const invalid of [undefined, null, false, 'Distance', 'double', 'toString', {}, []]) expect(api.experiment(conditions, invalid)).toBeNull();
    expect(api.experiment({ ...conditions, distance: 301 }, 'restore')).toBeNull();
  });

  it('keeps the existing unpaired record shape and trims rather than scores learner text', () => {
    expect(api.makeRecord(conditions, 'both', '  The angular spacing changed.\n', null)).toEqual(legacy());
    expect(api.makeRecord({ ...conditions, correct: true, detected: true, records: [] }, 'eagle', '<script>uninterpreted text</script>'))
      .toEqual({ ...legacy('<script>uninterpreted text</script>'), prediction: 'eagle' });
    expect(api.makeRecord(conditions, 'neither', 'x'.repeat(600), null).note).toHaveLength(600);
    expect(api.makeRecord(conditions, 'both', '  ' + 'x'.repeat(600) + '  ', null).note).toHaveLength(600);
  });

  it('rejects malformed predictions, notes, conditions and supplied comparison references', () => {
    for (const prediction of [undefined, null, '', true, 'Both', 'toString', '__proto__', 'constructor', {}, []]) {
      expect(api.makeRecord(conditions, prediction, 'A note.', null)).toBeNull();
    }
    for (const note of [undefined, null, true, 3, '', ' \n\t ', 'x'.repeat(601), {}, [], new String('A note.')]) {
      expect(api.makeRecord(conditions, 'both', note, null)).toBeNull();
    }
    expect(api.makeRecord({ ...conditions, distance: NaN }, 'both', 'A note.', null)).toBeNull();
    for (const reference of [false, {}, [], { ...conditions, version: 2 }, { ...conditions, widthM: 30 }]) {
      expect(api.makeRecord(conditions, 'both', 'A note.', reference)).toBeNull();
    }
  });

  it('saves reference conditions without derived claims and permits same or multi-factor comparisons', () => {
    for (const current of [conditions, { ...conditions, distance: 160 }, { ...conditions, distance: 160, contrast: 25 }]) {
      const record = api.makeRecord(current, 'both', 'I recorded these conditions.', { ...conditions, kind: 'single', factor: 'distance', correct: true });
      expect(record.comparison).toEqual({ version: 1, reference: full });
      expect(api.compare(record.comparison.reference, record).kind).toBe(current === conditions ? 'same' : current.contrast === 25 ? 'multiple' : 'single');
      expect(record).not.toHaveProperty('correct'); expect(record.comparison).not.toHaveProperty('factor');
    }
  });

  it('loads the latest six valid records in order while dropping malformed entries', () => {
    const records = [];
    for (let index = 0; index < 9; index++) {
      records.push(legacy(`Observation ${index}`));
      records.push({ ...legacy('Invalid'), contrast: '95' });
    }
    const result = api.readRecords({ version: 1, records });
    expect(result.map(record => record.note)).toEqual([3, 4, 5, 6, 7, 8].map(index => `Observation ${index}`));
    for (const invalid of [undefined, null, [], {}, { version: '1', records }, { version: 2, records }, { version: 1, records: {} }, Object.create({ version: 1, records })]) {
      expect(api.readRecords(invalid)).toEqual([]);
    }
  });

  it('strictly checks legacy metadata and whitelists imported records', () => {
    const mutations = { version: [undefined, 2, '1'], modelVersion: [undefined, 2, '1'], widthM: [undefined, .3 + .00001, '0.3'],
      referenceLimit: [undefined, 59, '60'], eagleLimit: [undefined, 139, '140'], prediction: [undefined, 'toString'], note: [undefined, ' '] };
    const records = [null, [], Object.assign([], legacy()), Object.create(legacy())];
    for (const [field, values] of Object.entries(mutations)) for (const value of values) records.push({ ...legacy(), [field]: value });
    for (const field of Object.keys(legacy())) { const missing = legacy(); delete missing[field]; records.push(missing); }
    expect(api.readRecords({ version: 1, records })).toEqual([]);
    const imported = { ...legacy('  Learner evidence.  '), correct: true, detected: true, referenceBand: 'invented', angleDeg: 1000,
      selectedSpecies: 'invented', records: [legacy()], wideFov: 20, detailFov: .75 };
    expect(api.readRecords({ version: 1, records: [imported] })).toEqual([legacy('Learner evidence.')]);
    expect(api.readRecords({ version: 1, records: [Object.assign(Object.create(null), legacy())] })).toEqual([legacy()]);
  });

  it('drops an entire paired observation when its comparison is invalid rather than rewriting its meaning', () => {
    const invalid = [undefined, null, [], {}, { version: '1', reference: conditions }, { version: 2, reference: conditions },
      { version: 1 }, { version: 1, reference: null }, { version: 1, reference: [] },
      { version: 1, reference: { ...conditions, distance: 999 } }, { version: 1, reference: { ...conditions, detailFov: 1 } },
      Object.create({ version: 1, reference: conditions })];
    expect(api.readRecords({ version: 1, records: invalid.map(comparison => ({ ...legacy(), comparison })) })).toEqual([]);
    const raw = { ...legacy(), comparison: { version: 1, reference: { ...conditions, detected: true },
      kind: 'multiple', factor: 'contrast', angleRatio: 999, frequencyRatio: 999, correct: true } };
    const [record] = api.readRecords({ version: 1, records: [raw] });
    expect(record).toEqual({ ...legacy(), comparison: { version: 1, reference: full } });
    expect(api.compare(record.comparison.reference, record).kind).toBe('same');
  });

  it('never aliases a reference, settings object, record array or previous result', () => {
    const reference = { ...conditions }, current = { ...conditions, distance: 160 };
    const result = api.compare(reference, current), restored = api.experiment(reference, 'restore');
    result.reference.distance = 300; result.current.distance = 300; result.changedFields.push('contrast'); restored.cycles = 20;
    expect(reference).toEqual(conditions); expect(current.distance).toBe(160);
    expect(api.compare(reference, current).changedFields).toEqual(['distance']);
    const record = api.makeRecord(current, 'eagle', 'Copied evidence.', reference);
    const raw = { version: 1, records: [record] }, first = api.readRecords(raw), second = api.readRecords(raw);
    first[0].comparison.reference.distance = 300; first[0].note = 'Changed'; first.push(legacy());
    expect(raw.records).toHaveLength(1); expect(raw.records[0].comparison.reference.distance).toBe(80);
    expect(second[0].note).toBe('Copied evidence.'); expect(second[0].comparison.reference.distance).toBe(80);
    reference.distance = 300; expect(record.comparison.reference.distance).toBe(80);
  });
});
