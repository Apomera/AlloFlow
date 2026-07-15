import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const SOURCE = fs.readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');

function loadMeasurementMath() {
  const start = SOURCE.indexOf('  function formatVolume(vol)');
  const end = SOURCE.indexOf('  var ACHIEVEMENTS = [', start);
  const body = SOURCE.slice(start, end);
  return new Function(body + '\nreturn { measuredVolume, enrichMeasurement, formatVolume, parseVolumePrediction, compareVolumePrediction, countExposedCubeFaces, completeMeasurementRecords, summarizePredictionAccuracy, compareMeasurementRecords, measurementLayerFor, belongsToMeasuredComponent };')();
}

describe('Geometry World measurement model', () => {
  const math = loadMeasurementMath();

  it('uses L x W x H for a completely filled rectangular prism', () => {
    const result = math.enrichMeasurement({ count: 24, totalVolume: 24, boundingVolume: 24, hasFractions: false });

    expect(result.isSolidPrism).toBe(true);
    expect(result.occupiedVolume).toBe(24);
    expect(result.missingVolume).toBe(0);
    expect(result.fillPercent).toBe(100);
  });

  it('separates occupied volume from bounding-box volume for composite forms', () => {
    const result = math.enrichMeasurement({ count: 8, totalVolume: 8, boundingVolume: 12, hasFractions: false });

    expect(result.isSolidPrism).toBe(false);
    expect(result.formattedOccupiedVolume).toBe('8');
    expect(result.missingVolume).toBe(4);
    expect(result.fillPercent).toBe(67);
  });

  it('preserves fractional occupied volume', () => {
    const result = math.enrichMeasurement({ count: 2, totalVolume: 1.5, boundingVolume: 2, hasFractions: true });

    expect(result.isSolidPrism).toBe(false);
    expect(result.formattedOccupiedVolume).toBe('1 1/2');
    expect(result.missingVolume).toBe(0.5);
    expect(result.fillPercent).toBe(75);
  });

  it('counts exposed unit faces for solid and composite cube structures', () => {
    const single = math.countExposedCubeFaces([{ x: 0, y: 0, z: 0 }]);
    const pair = math.countExposedCubeFaces([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]);
    const cube = [];
    for (let x = 0; x < 2; x += 1) for (let y = 0; y < 2; y += 1) for (let z = 0; z < 2; z += 1) cube.push({ x, y, z });
    expect(single.surfaceArea).toBe(6);
    expect(pair).toMatchObject({ xFaces: 2, yFaces: 4, zFaces: 4, surfaceArea: 10 });
    expect(math.countExposedCubeFaces(cube).surfaceArea).toBe(24);
    expect(math.countExposedCubeFaces([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }]).surfaceArea).toBe(14);
  });

  it('compares equal-volume structures by exposed surface efficiency', () => {
    const efficient = math.compareMeasurementRecords({ occupiedVolume: 24, surfaceArea: 52 }, { occupiedVolume: 24, surfaceArea: 46 });
    expect(efficient).toMatchObject({ sameVolume: true, surfaceAreaDifference: -6, moreSurfaceEfficient: 'latest' });
    expect(efficient.volumeDifference).toBe(0);
    const changed = math.compareMeasurementRecords({ occupiedVolume: 18, surfaceArea: 42 }, { occupiedVolume: 24, surfaceArea: 52 });
    expect(changed).toMatchObject({ sameVolume: false, volumeDifference: 6, moreSurfaceEfficient: null });
    const legacy = math.compareMeasurementRecords({ vol: '1 1/2' }, { vol: '2' });
    expect(legacy).toMatchObject({ previousVolume: 1.5, latestVolume: 2, volumeDifference: 0.5 });
  });
  it('marks capped measurements incomplete and excludes them from comparisons', () => {
    const incomplete = math.enrichMeasurement({ count: 1500, totalVolume: 1500, boundingVolume: 1500, hasFractions: false, shapeCounts: { cube: 1500 }, blocks: [{ x: 0, y: 0, z: 0 }], isComplete: false });
    expect(incomplete).toMatchObject({ isComplete: false, isSolidPrism: false, surfaceAreaExact: false, exposedSurfaceArea: null, exposedFaces: null });
    expect(math.compareMeasurementRecords(incomplete, { occupiedVolume: 10, surfaceArea: 20, isComplete: true })).toBeNull();
  });

  it('retains incomplete scans but skips them when selecting complete history', () => {
    const records = [{ id: 'first' }, { id: 'capped', isComplete: false }, { id: 'latest', isComplete: true }];
    expect(math.completeMeasurementRecords(records).map((record) => record.id)).toEqual(['first', 'latest']);
    expect(math.completeMeasurementRecords(null)).toEqual([]);
  });

  it('summarizes actual prediction quality instead of cube shape', () => {
    const summary = math.summarizePredictionAccuracy([{ data: { predictionPercentError: 0 } }, { data: { predictionPercentError: 5 } }, { percentError: 25 }, { data: { predictionPercentError: null } }]);
    expect(summary).toEqual({ predictionsMade: 3, exactPredictions: 1, predictionsWithin10Percent: 2, averagePredictionPercentError: 10, measurementsWithoutPrediction: 1 });
  });




  it('keeps world layers separate while combining connected student materials', () => {
    const student = { blockType: 'stone', _measurementLayer: 'student' };
    const anotherStudent = { blockType: 'stone', _measurementLayer: 'student' };
    const ground = { blockType: 'stone', _measurementLayer: 'ground', _lessonBlock: true };
    const lesson = { blockType: 'stone', _measurementLayer: 'lesson', _lessonBlock: true };
    expect(math.measurementLayerFor({ blockType: 'stone' })).toBe('student');
    expect(math.belongsToMeasuredComponent(student, anotherStudent)).toBe(true);
    expect(math.belongsToMeasuredComponent(student, ground)).toBe(false);
    expect(math.belongsToMeasuredComponent(lesson, ground)).toBe(false);
    expect(math.belongsToMeasuredComponent(student, { blockType: 'gold', _measurementLayer: 'student' })).toBe(true);
  });

  it('parses decimal, simple-fraction, and mixed-number predictions', () => {
    expect(math.parseVolumePrediction('24.5')).toBe(24.5);
    expect(math.parseVolumePrediction('3/4')).toBe(0.75);
    expect(math.parseVolumePrediction('1 1/2')).toBe(1.5);
    expect(math.parseVolumePrediction('not a number')).toBeNull();
  });

  it('compares predictions without treating an estimate as a score', () => {
    const exact = math.compareVolumePrediction('24', 24);
    const over = math.compareVolumePrediction('30', 24);
    const under = math.compareVolumePrediction('23', 24);
    expect(exact).toMatchObject({ relation: 'exact', percentError: 0, accuracyLabel: 'Exact match!' });
    expect(over).toMatchObject({ relation: 'over', percentError: 25 });
    expect(under).toMatchObject({ relation: 'under', percentError: 4 });
  });


  it('keeps touch measurements in history and exposes accessible prediction feedback in the HUD', () => {
    expect(SOURCE).toContain('var mobileHistory = (measureHistory || []).concat');
    expect(SOURCE).toContain("'Composite structure'");
    expect(SOURCE).toContain("'Bounding box ' + measureResult.boundingVolume");
    expect(SOURCE).toContain("'aria-label': 'Predicted volume in cubic units'");
    expect(SOURCE).toContain("'data-geometry-prediction-result': 'true'");
    expect(SOURCE).toContain('var mobilePrediction = m.isComplete === false ? null : compareVolumePrediction');
    expect(SOURCE).toContain("if (!nm.isSolidPrism) {");
    expect(SOURCE).toContain("'data-geometry-surface-area': measureResult.surfaceAreaExact ? 'exact' : 'partial'");
    expect(SOURCE).toContain('hasFractions: hasPartialShapes');
    expect(SOURCE).toContain("'data-geometry-measurement-comparison': 'true'");
    expect(SOURCE).toContain("_measurementLayer: engine._measurementLayer || (engine._placingLessonBlocks ? 'lesson' : 'student')");
    expect(SOURCE).toContain('belongsToMeasuredComponent(seedData, mesh.userData)');
    expect(SOURCE).toContain("'data-geometry-material-breakdown': 'true'");
    expect(SOURCE).not.toContain('candidateData.blockType === blockType');
    expect(SOURCE).toContain('MEASUREMENT_BLOCK_LIMIT = MAX_BLOCKS');
    expect(SOURCE).toContain("'data-geometry-measurement-incomplete': 'true'");
    expect(SOURCE).toContain('queue[queueIndex++]');
    expect(SOURCE).not.toContain('result.length < 500');
    expect(SOURCE).toContain('COMPARE LATEST TWO COMPLETE');
    expect(SOURCE).toContain('incompleteMeasurementAttempts: allMeasurements.length - measurements.length');
    expect(SOURCE).toContain("completedMeasurements.length + ' complete measurements taken'");
    expect(SOURCE).toContain('correctMeasurements: predictionSummary.predictionsWithin10Percent');
    expect(SOURCE).toContain('Predictions within 10%');
    expect(SOURCE).toContain('Avg prediction error');
    expect(SOURCE).not.toContain('m.data.blocks === m.data.volume');
  });
});
