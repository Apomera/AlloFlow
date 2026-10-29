import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const physics = require(resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js'));
const distances = [50, 65, 80, 100, 125, 150, 175];
function scan(path = 'axial', strength = 1, noise = 0, points = distances) {
  return physics.fieldScanSeries([{ x: 0, y: 0, angle: 0, polarity: 1, strength }], path, points, 0, noise)
    .map((row) => ({ ...row, strength }));
}

describe('Hall-probe evidence identifies a law from controlled measurements', () => {
  it('distinguishes the three candidate laws by their shape, with a separately fitted amplitude', () => {
    for (const power of [1, 2, 3]) {
      const rows = scan().map((row) => ({ ...row, measuredMagnitude: 7e6 / row.distance ** power }));
      const evidence = physics.fieldMeasurementAnalysis(rows);
      expect(evidence).toMatchObject({ controlled: true, canCompareModels: true, distinctDistances: 7, distanceRatio: 3.5 });
      expect(evidence.bestModel.power).toBe(power);
      expect(evidence.bestModel.errorPercent).toBeLessThan(1e-9);
      expect(evidence.modelFits.filter((candidate) => candidate.power !== power).every((candidate) => candidate.errorPercent > 20)).toBe(true);
    }
  });

  it('recovers the dipole law from both axes even with the deterministic sensor variation', () => {
    for (const path of ['axial', 'equatorial']) {
      const evidence = physics.fieldMeasurementAnalysis(scan(path, 3, 20));
      expect(evidence.bestModel.power).toBe(3);
      expect(evidence.bestModel.errorPercent).toBeGreaterThan(0);
      expect(evidence.fit.exponent).toBeCloseTo(-3, 0);
    }
  });

  it('allows a manual radial experiment while rejecting a curved probe path', () => {
    const magnet = { x: 0, y: 0, angle: 0, polarity: 1, strength: 1 };
    const rows = distances.map((distance) => ({ ...physics.fieldProbeReading(distance * .8, distance * .6, [magnet], 0), distance, path: 'manual', strength: 1 }));
    expect(physics.fieldMeasurementAnalysis(rows)).toMatchObject({ controlled: true, canCompareModels: true, path: 'manual' });
    const curved = rows.map((row, index) => index ? row : { ...physics.fieldProbeReading(0, -50, [magnet], 0), distance: 50, path: 'manual', strength: 1 });
    expect(physics.fieldMeasurementAnalysis(curved)).toMatchObject({ controlled: false, canCompareModels: false });
    expect(physics.fieldMeasurementAnalysis(curved).reason).toMatch(/angle changed/);
  });

  it('does not turn repeated or narrowly spaced samples into a supported model comparison', () => {
    expect(physics.fieldMeasurementAnalysis(scan('axial', 1, 0, [50, 50, 50]))).toMatchObject({ controlled: false, bestModel: null });
    expect(physics.fieldMeasurementAnalysis(scan('axial', 1, 0, [50, 55, 60]))).toMatchObject({ controlled: true, canCompareModels: false, bestModel: null });
    expect(physics.fieldMeasurementAnalysis(scan('axial', 1, 0, [50, 100]))).toMatchObject({ controlled: true, canCompareModels: false });
  });

  it.each([
    ['strength', { strength: 2 }, /strength changed/],
    ['noise', { noisePercent: 15 }, /uncertainty changed/],
    ['radius', { distance: 99 }, /does not match/],
    ['axis label', { path: 'equatorial' }, /left the selected path/],
  ])('catches the %s confound before presenting evidence for a law', (_label, change, reason) => {
    const rows = scan(); rows[2] = { ...rows[2], ...change };
    const evidence = physics.fieldMeasurementAnalysis(rows);
    expect(evidence.controlled).toBe(false);
    expect(evidence.reason).toMatch(reason);
    expect(evidence.modelFits).toEqual([]);
  });

  it('excludes corrupted rows and withholds a controlled conclusion instead of silently repairing the evidence', () => {
    const rows = scan().concat([null, { ...scan()[0], measuredMagnitude: Infinity }, { ...scan()[0], x: '' }]);
    const evidence = physics.fieldMeasurementAnalysis(rows);
    expect(evidence).toMatchObject({ rejectedCount: 3, controlled: false, canCompareModels: false });
    expect(evidence.samples).toHaveLength(7);
    expect(physics.fieldMeasurementAnalysis({})).toMatchObject({ samples: [], controlled: false });
    expect(physics.fieldMeasurementAnalysis(scan('axial', 1, 0, [30, 50, 100])).reason).toMatch(/too close/);
    expect(physics.fieldMeasurementAnalysis(scan().map((row) => ({ ...row, path: 'unknown' })))).toMatchObject({ controlled: false, canCompareModels: false });
  });
});

describe('power-law fit handles evidence that cannot identify an exponent', () => {
  it('returns no fit for identical distances and ignores non-finite input', () => {
    expect(physics.fieldPowerLawFit([{ distance: 5, measuredMagnitude: 2 }, { distance: 5, measuredMagnitude: 3 }]))
      .toMatchObject({ count: 2, exponent: null, coefficient: null, rSquared: null });
    for (const input of [null, {}, [null, { distance: Infinity, measuredMagnitude: 2 }, { distance: 10, measuredMagnitude: NaN }, { distance: true, measuredMagnitude: 2 }]]) {
      expect(physics.fieldPowerLawFit(input)).toMatchObject({ count: 0, exponent: null });
    }
    expect(physics.fieldPowerLawFit(scan())).toMatchObject({ count: 7 });
    expect(physics.fieldPowerLawFit(scan()).exponent).toBeCloseTo(-3, 9);
  });
});

describe('retained Hall-probe scans compare matched distances without false causal credit', () => {
  it('measures the strength multiplier and axial-to-equatorial ratio', () => {
    const reference = scan();
    const strength = physics.fieldScanComparison(scan('axial', 2), reference);
    expect(strength).toMatchObject({ comparable: true, fairTest: true, changedControls: ['magnet strength'] });
    expect(strength.meanRatio).toBeCloseTo(2, 9);
    const angle = physics.fieldScanComparison(scan('equatorial'), reference);
    expect(angle).toMatchObject({ comparable: true, fairTest: true, changedControls: ['path'] });
    expect(angle.meanRatio).toBeCloseTo(.5, 9);
  });

  it('marks multiple changed variables as descriptive and warns that repeats are deterministic', () => {
    const mixed = physics.fieldScanComparison(scan('equatorial', 2, 10), scan());
    expect(mixed).toMatchObject({ comparable: true, fairTest: false, changedControls: ['path', 'magnet strength', 'sensor uncertainty'] });
    expect(mixed.reason).toMatch(/cannot isolate/);
    expect(physics.fieldScanComparison(scan(), scan())).toMatchObject({ comparable: true, fairTest: false, changedControls: [], meanRatio: 1 });
    expect(physics.fieldScanComparison(scan(), scan()).reason).toMatch(/not an independent/);
  });

  it('requires three genuinely matched distances and does not count duplicate rows as extra positions', () => {
    expect(physics.fieldScanComparison(scan('axial', 2, 0, [50, 100, 175]), scan())).toMatchObject({ comparable: true, fairTest: false, changedControls: ['magnet strength', 'sample distances'] });
    expect(physics.fieldScanComparison(scan('axial', 2, 0, [50, 100, 100, 100]), scan())).toMatchObject({ comparable: false, meanRatio: null });
    expect(physics.fieldScanComparison(scan(), [])).toMatchObject({ comparable: false, meanRatio: null });
  });
});

describe('measurement CSV retains both runs as numeric evidence', () => {
  it('keeps captured predictions and controlled scan results in notebook metrics', () => {
    const source = { tab: 'field', fieldView: 'map', fieldMapStrength: 2,
      fieldMapSamples: scan('axial', 2), fieldMapReference: scan(), fieldMapScanPrediction: 1 };
    const metrics = physics.notebookMetricSnapshot(source);
    const metric = (key) => metrics.find((item) => item.key === key);
    expect(metric('field_predicted_fraction').value).toBe(50);
    expect(metric('field_exponent').value).toBeCloseTo(-3, 9);
    expect(metric('field_reference_ratio').value).toBeCloseTo(2, 9);
    const mixed = physics.notebookMetricSnapshot({ ...source, fieldMapSamples: [
      ...scan('axial', 2).slice(0, 3), ...scan('axial', 2, 10).slice(3),
    ] });
    expect(mixed.some((item) => item.key === 'field_exponent')).toBe(false);
    expect(mixed.some((item) => item.key === 'field_reference_ratio')).toBe(false);
  });

  it('exports the reference and current controls and readings in fixed columns', () => {
    const current = scan('equatorial', 2, 10);
    const output = physics.fieldMeasurementsCSV(current, scan());
    const rows = output.trim().split('\r\n').map((line) => line.split(','));
    expect(rows[0]).toEqual(['run', 'point', 'x', 'y', 'distance', 'path', 'strength', 'noise_percent', 'Bx', 'By', 'magnitude', 'uncertainty']);
    expect(rows).toHaveLength(15);
    expect(rows[1][0]).toBe('reference');
    expect(rows[8].slice(0, 8)).toEqual(['current', '1', '0', '-50', '50', 'equatorial', '2', '10']);
    expect(Number(rows[8][10])).toBeCloseTo(current[0].measuredMagnitude, 12);
  });

  it('never exports arbitrary labels, formula strings, or non-finite data', () => {
    const row = { ...scan()[0], path: '=IMPORTXML("x")', id: '=HYPERLINK("x")' };
    const output = physics.fieldMeasurementsCSV([row, { ...row, measuredMagnitude: Infinity }], null);
    expect(output).not.toMatch(/IMPORTXML|HYPERLINK|Infinity|NaN/);
    expect(output.trim().split('\r\n')).toHaveLength(2);
    expect(output).toContain(',manual,');
  });
});
