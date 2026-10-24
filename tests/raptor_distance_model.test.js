import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('stem_lab/raptor_distance_model.js', 'utf8');
function model() { const local = {}; Function('window', source)(local); return local.RaptorDistanceModel; }
const api = model();
const defaults = { version: 1, distance: 120, contrast: 95, cycles: 12, widthM: .30, wideFov: 20, detailFov: .75 };
// Independent right-triangle oracle: use the hypotenuse and arcsine instead of
// the production arctangent, retaining the exact finite-width target geometry.
const angularSpan = distance => 2 * Math.asin(.15 / Math.hypot(distance, .15)) * 180 / Math.PI;

describe('Raptor distance-detail model', () => {
  it('registers a frozen pure API without DOM, graphics, timers, random state or providers', () => {
    const local = {}; Function('window', source)(local);
    expect(Object.keys(local)).toEqual(['RaptorDistanceModel']);
    expect(local.RaptorDistanceModel.version).toBe(1); expect(Object.isFrozen(local.RaptorDistanceModel)).toBe(true);
    const original = local.RaptorDistanceModel;
    Function('window', source)(local); expect(local.RaptorDistanceModel).toBe(original);
    expect(Object.keys(original).sort()).toEqual(['assumptions', 'gaussianSigmaPixels', 'metrics', 'normalize', 'presets', 'sources', 'version']);
  });

  it('uses explicit defaults for missing, malformed or differently versioned saved records', () => {
    const invalid = [undefined, null, [], [1], true, false, 'settings', 1, NaN, Infinity, new Date(), new Number(1),
      {}, { version: '1', distance: 42 }, { version: 0, distance: 42 }, { version: 2, distance: 42 },
      Object.assign([], { version: 1, distance: 42 }), Object.assign(Object.create({ version: 1 }), { distance: 42 })];
    class Settings { constructor() { this.version = 1; this.distance = 42; } }
    invalid.push(new Settings());
    for (const value of invalid) expect(api.normalize(value)).toEqual(defaults);
    const nullPrototype = Object.assign(Object.create(null), { version: 1, distance: 42 });
    expect(api.normalize(nullPrototype).distance).toBe(42);
  });

  it('rejects coerced and nonfinite field values, bounds numeric values and ignores foreign state', () => {
    for (const field of ['distance', 'contrast', 'cycles']) {
      for (const value of [undefined, null, '45', '', true, false, NaN, Infinity, -Infinity, [], {}, new Number(45)]) {
        expect(api.normalize({ version: 1, [field]: value })[field], field + ': ' + String(value)).toBe(defaults[field]);
      }
    }
    expect(api.normalize({ version: 1, distance: -100, contrast: -1, cycles: -1 })).toEqual({ ...defaults, distance: 40, contrast: 10, cycles: 4 });
    expect(api.normalize({ version: 1, distance: 999, contrast: 999, cycles: 999 })).toEqual({ ...defaults, distance: 300, contrast: 100, cycles: 20 });
    expect(api.normalize({ version: 1, distance: 64.51, contrast: 42.49, cycles: 8.5 })).toEqual({ ...defaults, distance: 65, contrast: 42, cycles: 9 });
    const raw = Object.freeze({ version: 1, distance: 80, widthM: 300, detailFov: 60, wideFov: .1,
      selectedSpecies: 'goldenEagle', visualAcuityX: 1000, flightSession: {}, prediction: 'eagle', answer: 'both' });
    expect(api.normalize(raw)).toEqual({ ...defaults, distance: 80 });
    expect(raw.widthM).toBe(300);
  });

  it('returns independent normalized settings and frozen representative presets', () => {
    const first = api.normalize(), second = api.normalize(); first.distance = 42;
    expect(second).toEqual(defaults); expect(api.normalize()).toEqual(defaults);
    for (const [name, distance] of [['near', 40], ['middle', 120], ['far', 300]]) {
      expect(api.presets[name]).toEqual({ ...defaults, distance }); expect(Object.isFrozen(api.presets[name])).toBe(true);
    }
    expect(Object.isFrozen(api.presets)).toBe(true);
    expect(api.metrics(api.presets.near).referenceBand).toBe('both');
    expect(api.metrics(api.presets.middle).referenceBand).toBe('eagle');
    expect(api.metrics(api.presets.far).referenceBand).toBe('neither');
  });

  it('preserves exact physical angle and frequency over all permitted distance/cycle combinations', () => {
    let previousAngle = Infinity;
    for (let distance = 40; distance <= 300; distance++) {
      const angle = angularSpan(distance);
      expect(angle).toBeLessThan(previousAngle); previousAngle = angle;
      for (let cycles = 4; cycles <= 20; cycles++) {
        const actual = api.metrics({ version: 1, distance, cycles, contrast: 73 });
        expect(actual.angleDeg).toBeCloseTo(angle, 12);
        expect(actual.cyclesPerDegree).toBeCloseTo(cycles / angle, 10);
        expect(actual.settings.widthM).toBe(.30);
        expect(actual.referenceLimit).toBe(60); expect(actual.eagleLimit).toBe(140);
        const cpd = cycles / angle;
        expect(actual.referenceBand).toBe(cpd <= 60 ? 'both' : cpd <= 140 ? 'eagle' : 'neither');
      }
    }
  });

  it('crosses the reference bands on the correct side of each exact distance boundary', () => {
    let crossed = 0;
    for (const cycles of [4, 8, 12, 16, 20]) for (const limit of [60, 140]) {
      const boundary = .15 / Math.tan((cycles / limit) * Math.PI / 360);
      const near = Math.floor(boundary), far = Math.ceil(boundary);
      if (near < 40 || far > 300) continue;
      const before = api.metrics({ version: 1, distance: near, cycles });
      const after = api.metrics({ version: 1, distance: far, cycles });
      expect(before.cyclesPerDegree).toBeLessThan(limit); expect(after.cyclesPerDegree).toBeGreaterThan(limit);
      expect(before.referenceBand).toBe(limit === 60 ? 'both' : 'eagle');
      expect(after.referenceBand).toBe(limit === 60 ? 'eagle' : 'neither'); crossed++;
    }
    expect(crossed).toBeGreaterThanOrEqual(6);
  });

  it('keeps camera magnification identical for both conditions and independent of target and contrast', () => {
    // Ratio of projected widths for the same centered object at the same range.
    const projection = fov => 800 * .30 / (2 * 120 * Math.tan(fov * Math.PI / 360));
    const expected = projection(.75) / projection(20);
    for (const preset of Object.values(api.presets)) for (const contrast of [10, 50, 100]) {
      const reading = api.metrics({ ...preset, contrast });
      expect(reading.magnification).toBeCloseTo(expected, 12);
      expect(reading.settings.wideFov).toBe(20); expect(reading.settings.detailFov).toBe(.75);
    }
  });

  it('uses the declared Gaussian illustration and scales modulation without inventing low-contrast detection bands', () => {
    for (const preset of Object.values(api.presets)) {
      const full = api.metrics({ ...preset, contrast: 100 });
      const faint = api.metrics({ ...preset, contrast: 10 });
      expect(faint.angleDeg).toBe(full.angleDeg); expect(faint.cyclesPerDegree).toBe(full.cyclesPerDegree);
      expect(faint.referenceBand).toBe(full.referenceBand);
      for (const [limit, transfer, attenuation] of [[60, 'referenceTransfer', 'referenceAttenuation'], [140, 'eagleTransfer', 'eagleAttenuation']]) {
        const expected = 10 ** (-((full.cyclesPerDegree / limit) ** 2));
        expect(full[transfer]).toBeCloseTo(expected, 14); expect(full[attenuation]).toBeCloseTo(expected, 14);
        expect(faint[transfer]).toBe(full[transfer]); expect(faint[attenuation]).toBeCloseTo(full[attenuation] / 10, 14);
        expect(full[attenuation]).toBeGreaterThan(0); expect(full[attenuation]).toBeLessThan(1);
      }
      expect(full.eagleTransfer).toBeGreaterThan(full.referenceTransfer);
    }
    expect(api.assumptions.filter).toContain('not a measured retina');
    expect(api.assumptions.contrast).toContain('not detection or recognition predictions');
    expect(api.assumptions.limits).toContain('No prey detection distance');
  });

  it('scales Gaussian sigma with pixel sampling while retaining 10% sinusoidal transfer at each reference', () => {
    for (const limit of [60, 140]) for (const width of [280, 560, 1120]) {
      const sigma = api.gaussianSigmaPixels(limit, width);
      const cyclesPerPixel = limit / (width / .75);
      // The Gaussian Fourier transform, independently evaluated at the selected
      // reference spatial frequency, must equal the declared 10% convention.
      const transfer = Math.exp(-2 * Math.PI ** 2 * sigma ** 2 * cyclesPerPixel ** 2);
      expect(transfer).toBeCloseTo(.1, 14);
      expect(api.gaussianSigmaPixels(limit, width * 2)).toBeCloseTo(sigma * 2, 12);
    }
    expect(api.gaussianSigmaPixels(60, 0)).toBe(0);
    for (const invalid of [undefined, null, '60', NaN, Infinity, -Infinity, -1, 0, [], {}]) {
      expect(() => api.gaussianSigmaPixels(invalid, 560)).toThrow(RangeError);
    }
    for (const invalid of [undefined, null, '560', NaN, Infinity, -Infinity, -1, [], {}]) {
      expect(() => api.gaussianSigmaPixels(60, invalid)).toThrow(RangeError);
    }
  });

  it('keeps source ranges and selected illustrative references distinct from universal species claims', () => {
    expect(api.sources.eagle.url).toBe('https://pubmed.ncbi.nlm.nih.gov/4090282/');
    expect(api.sources.eagle.species).toBe('Aquila audax'); expect(api.sources.eagle.range).toEqual([132, 143]);
    expect(api.sources.eagle.selected).toBeGreaterThanOrEqual(132); expect(api.sources.eagle.selected).toBeLessThanOrEqual(143);
    expect(api.sources.reference.url).toBe('https://pmc.ncbi.nlm.nih.gov/articles/PMC6125913/');
    expect(api.sources.reference.range).toEqual([30, 60]); expect(api.sources.reference.selected).toBe(60);
    expect(api.sources.reference.scope).toContain('not a universal human threshold');
    expect(api.sources.eagle.scope).toContain('not a parameter for every raptor');
    expect(Object.isFrozen(api.sources.eagle.range)).toBe(true);
    expect(Object.isFrozen(api.assumptions)).toBe(true);
    const reading = api.metrics({ ...api.presets.middle, selectedSpecies: 'peregrine', visualAcuityX: 99 });
    expect(reading).toEqual(api.metrics(api.presets.middle));
    expect(reading).not.toHaveProperty('detected'); expect(reading).not.toHaveProperty('identifiable');
  });
});
