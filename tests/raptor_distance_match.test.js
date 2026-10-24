import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modelSource = readFileSync('stem_lab/raptor_distance_model.js', 'utf8');
const evidenceSource = readFileSync('stem_lab/raptor_distance_evidence.js', 'utf8');
const source = readFileSync('stem_lab/raptor_distance_match.js', 'utf8');
function setup(ready = true) {
  const local = {};
  Function('window', source)(local);
  if (ready) {
    Function('window', evidenceSource)(local);
    Function('window', modelSource)(local);
  }
  return { local, api: local.RaptorDistanceMatch };
}
const { api } = setup();
const settings = distance => ({ version: 1, distance, cycles: 8, contrast: 95 });
const completeSettings = distance => ({ ...settings(distance), widthM: .30, wideFov: 20, detailFov: .75 });
// Independent triangle expression, rather than the model's arctangent.
const angle = distance => 2 * Math.asin(.15 / Math.hypot(distance, .15)) * 180 / Math.PI;
const frequency = distance => 8 / angle(distance);
const transfer = fraction => 10 ** -(fraction ** 2);

describe('Raptor distance model-transfer matching', () => {
  it('registers a frozen idempotent API and resolves validated dependencies in either load order', () => {
    for (const firstSource of [modelSource, evidenceSource]) {
      const { local, api: lazy } = setup(false);
      expect(Object.keys(local)).toEqual(['RaptorDistanceMatch']);
      expect(Object.keys(lazy).sort()).toEqual(['compare', 'isReference', 'plan', 'version']);
      expect(Object.isFrozen(lazy)).toBe(true); expect(lazy.version).toBe(1);
      const unavailable = () => {
        expect(lazy.plan()).toBeNull(); expect(lazy.isReference(settings(60))).toBe(false);
        expect(lazy.compare(settings(60), settings(140))).toBeNull();
      };
      unavailable(); Function('window', firstSource)(local); unavailable();
      Function('window', firstSource === modelSource ? evidenceSource : modelSource)(local);
      expect(lazy.compare(settings(60), settings(140)).matched).toBe(true);
      const model = local.RaptorDistanceModel, evidence = local.RaptorDistanceEvidence;
      for (const invalid of [null, {}, { ...model, version: 2 }, { ...model, normalize: null }, { ...model, metrics: null }]) {
        local.RaptorDistanceModel = invalid; unavailable();
      }
      local.RaptorDistanceModel = model;
      for (const invalid of [null, {}, { ...evidence, version: 2 }, { ...evidence, snapshot: null }]) {
        local.RaptorDistanceEvidence = invalid; unavailable();
      }
      local.RaptorDistanceEvidence = evidence;
      expect(lazy.isReference(settings(60))).toBe(true);
      Function('window', source)(local); expect(local.RaptorDistanceMatch).toBe(lazy);
    }
  });

  it('provides fresh complete starter conditions and an explicit activity tolerance', () => {
    const first = api.plan(), second = api.plan();
    expect(first).toEqual({ reference: completeSettings(60), tolerance: .01 });
    expect(first).not.toBe(second); expect(first.reference).not.toBe(second.reference);
    expect(api.isReference(first.reference)).toBe(true);
    first.reference.distance = 300; first.reference.cycles = 20; first.tolerance = 1;
    expect(api.plan()).toEqual(second);
    expect(api.isReference(settings(59))).toBe(false); expect(api.isReference(settings(61))).toBe(false);
    expect(api.isReference({ ...settings(60), cycles: 12 })).toBe(false);
    expect(api.isReference({ ...settings(60), contrast: 94 })).toBe(false);
  });

  it('computes exact geometric ratios and the existing Gaussian transfer independently across the allowed range', () => {
    for (const distance of [40, 60, 100, 138, 139, 140, 141, 142, 200, 300]) {
      const result = api.compare(settings(60), settings(distance));
      const a = frequency(60), b = frequency(distance), ratio = (b / 140) / (a / 60);
      expect(result.reference).toEqual(completeSettings(60)); expect(result.current).toEqual(completeSettings(distance));
      expect(result.referenceFrequency).toBeCloseTo(a, 11); expect(result.currentFrequency).toBeCloseTo(b, 11);
      expect(result.referenceFraction).toBeCloseTo(a / 60, 13); expect(result.currentFraction).toBeCloseTo(b / 140, 13);
      expect(result.ratio).toBeCloseTo(ratio, 13); expect(result.error).toBeCloseTo(Math.abs(ratio - 1), 13);
      expect(result.distanceRatio).toBe(distance / 60); expect(result.angleRatio).toBeCloseTo(angle(distance) / angle(60), 13);
      expect(result.referenceTransfer).toBeCloseTo(transfer(a / 60), 13);
      expect(result.eagleTransfer).toBeCloseTo(transfer(b / 140), 13);
      // Transfer is the fraction of input retained, not output modulation.
      expect(result.referenceTransfer).not.toBeCloseTo(transfer(a / 60) * .95, 4);
    }
  });

  it('matches 139–141 m, rejects 138 and 142 m, and gives a direction using unrounded normalized frequency', () => {
    for (const distance of [139, 140, 141]) {
      const result = api.compare(settings(60), settings(distance));
      expect(result).toMatchObject({ matched: true, direction: 'matched' }); expect(result.error).toBeLessThan(.01);
    }
    for (const distance of [40, 60, 138]) {
      const result = api.compare(settings(60), settings(distance));
      expect(result).toMatchObject({ matched: false, direction: 'farther' }); expect(result.ratio).toBeLessThan(.99);
    }
    for (const distance of [142, 200, 300]) {
      const result = api.compare(settings(60), settings(distance));
      expect(result).toMatchObject({ matched: false, direction: 'nearer' }); expect(result.ratio).toBeGreaterThan(1.01);
    }
    const at140 = api.compare(settings(60), settings(140));
    expect(at140.ratio).toBeLessThan(1); expect(at140.error).toBeGreaterThan(0);
    expect(at140.error).toBeLessThan(.000002);
    // Exact angular geometry does not make the integer distance ratio an exact match.
    const exactMatchDistance = .15 / Math.tan(Math.asin(.15 / Math.hypot(60, .15)) * 60 / 140);
    expect(exactMatchDistance).toBeGreaterThan(140); expect(exactMatchDistance).toBeCloseTo(140.0002380948595, 10);
    expect(at140.eagleTransfer).toBeCloseTo(at140.referenceTransfer, 5);
  });

  it('uses transfer values returned by the model rather than substituting attenuation or a new curve', () => {
    const { local, api: delegated } = setup(), model = local.RaptorDistanceModel;
    const calls = [];
    local.RaptorDistanceModel = { ...model, metrics(raw) {
      calls.push(raw.distance);
      return { ...model.metrics(raw), referenceTransfer: .123, eagleTransfer: .789,
        referenceAttenuation: .456, eagleAttenuation: .012 };
    } };
    const result = delegated.compare(settings(60), settings(140));
    expect(calls).toEqual([60, 140]);
    expect(result.referenceTransfer).toBe(.123); expect(result.eagleTransfer).toBe(.789);
    expect(result.matched).toBe(true);
  });

  it('rejects malformed conditions and changed held variables without coercion or clamping', () => {
    class Settings { constructor() { Object.assign(this, settings(60)); } }
    const invalid = [undefined, null, [], {}, new Settings(), Object.create(settings(60)), Object.assign([], settings(60)),
      { ...settings(60), version: 2 }, { ...settings(60), version: '1' }, { ...settings(60), distance: '60' },
      { ...settings(60), distance: 39 }, { ...settings(60), distance: 301 }, { ...settings(60), distance: 60.5 },
      { ...settings(60), distance: NaN }, { ...settings(60), distance: Infinity }, { ...settings(60), distance: -Infinity },
      { ...settings(60), cycles: 7 }, { ...settings(60), cycles: 9 }, { ...settings(60), cycles: '8' },
      { ...settings(60), contrast: 94 }, { ...settings(60), contrast: 96 }, { ...settings(60), contrast: '95' },
      { ...settings(60), widthM: 30 }, { ...settings(60), wideFov: 21 }, { ...settings(60), detailFov: 1 }];
    for (const key of ['version', 'distance', 'cycles', 'contrast']) {
      const missing = settings(60); delete missing[key]; invalid.push(missing);
    }
    for (const value of invalid) {
      expect(api.isReference(value)).toBe(false);
      expect(api.compare(value, settings(140))).toBeNull();
      expect(api.compare(settings(60), value)).toBeNull();
    }
    expect(api.compare(settings(59), settings(140))).toBeNull();
    expect(api.compare(settings(61), settings(140))).toBeNull();
    expect(api.compare(settings(140), settings(60))).toBeNull();
  });

  it('whitelists settings and returns only model relationships without trusting supplied conclusions', () => {
    const reference = Object.assign(Object.create(null), settings(60), { matched: false, detected: true });
    const current = { ...settings(140), ratio: 999, error: 999, image: 'data:image/png;base64,NOT_EVIDENCE' };
    Object.defineProperty(current, 'eagleTransfer', { get() { throw new Error('Do not read supplied transfer'); } });
    expect(api.isReference(reference)).toBe(true);
    const result = api.compare(reference, current);
    expect(result.reference).toEqual(completeSettings(60)); expect(result.current).toEqual(completeSettings(140));
    expect(Object.keys(result).sort()).toEqual(['angleRatio', 'current', 'currentFraction', 'currentFrequency', 'direction',
      'distanceRatio', 'eagleTransfer', 'error', 'matched', 'ratio', 'reference', 'referenceFraction', 'referenceFrequency', 'referenceTransfer']);
    expect(result.matched).toBe(true); expect(result.ratio).toBeLessThan(1);
    expect(result).not.toHaveProperty('detected'); expect(result).not.toHaveProperty('image');
  });

  it('does not mutate or alias inputs, previous comparisons, or the starter plan', () => {
    const reference = Object.freeze(completeSettings(60)), current = Object.freeze(completeSettings(140));
    const first = api.compare(reference, current), second = api.compare(reference, current);
    expect(first).not.toBe(second); expect(first.reference).not.toBe(reference); expect(first.current).not.toBe(current);
    expect(first.reference).not.toBe(second.reference); expect(first.current).not.toBe(second.current);
    first.reference.distance = 100; first.current.contrast = 10; first.matched = false; first.ratio = 999;
    expect(reference).toEqual(completeSettings(60)); expect(current).toEqual(completeSettings(140));
    expect(api.compare(reference, current)).toEqual(second); expect(api.plan().reference).toEqual(reference);
    const same = api.compare(reference, reference);
    expect(same.reference).not.toBe(same.current); expect(same.direction).toBe('farther');
  });
});
