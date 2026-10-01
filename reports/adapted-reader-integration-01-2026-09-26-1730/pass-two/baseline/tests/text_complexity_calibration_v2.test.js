import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const Evaluator = require('../dev-tools/evaluate_text_complexity_calibration.cjs');
const preregisteredMatrix = require('./fixtures/text_complexity_pilot_matrix.json');

const clone = (value) => JSON.parse(JSON.stringify(value));

const midpointForGrade = (grade) => {
  const ranges = {
    '2nd Grade': 2.5,
    '5th Grade': 5.5,
    '8th Grade': 8.5,
    '11th Grade': 11.5,
  };
  return ranges[grade];
};

const completeResults = (fixture = preregisteredMatrix) => fixture.matrix.map((cell) => {
  const bodyScore = midpointForGrade(cell.requestedGrade);
  const wordCount = cell.scenarioId === 'rainwater-watershed' ? 300 : 900;
  return {
    cellId: cell.cellId,
    measurements: {
      body: { score: bodyScore, wordCount },
      artifact: { score: bodyScore + 0.2, wordCount: wordCount + 4 },
    },
    generation: { provider: 'offline-test', model: 'fixed-model-v1' },
  };
});

describe('empirical text-complexity calibration evaluator v2', () => {
  it('validates the preregistered 4 x 2 x 3 core matrix without claiming empirical success', () => {
    const report = Evaluator.evaluateFixtureFile(Evaluator.DEFAULT_EMPIRICAL_FIXTURE_PATH);
    const human = Evaluator.formatHumanReport(report);

    expect(report).toMatchObject({
      schemaVersion: 'text-complexity-calibration-eval/v2',
      mechanics: { passed: true },
      empiricalQuality: { status: 'not-run', passed: null },
      summary: { passed: null, validationPassed: true, mechanicsPassed: true, empiricalQualityPassed: null },
    });
    expect(report.mechanics.matrix).toMatchObject({
      coreCellCount: 24,
      expectedCoreCellCount: 24,
    });
    expect(report.studyDesign).toMatchObject({
      grades: ['2nd Grade', '5th Grade', '8th Grade', '11th Grade'],
      scenarios: ['rainwater-watershed', 'town-road-or-park'],
      repetitions: 3,
      citations: 'off',
    });
    expect(report.thresholdContract).toMatchObject({
      passed: true,
      version: 'text-complexity-empirical-thresholds/v1',
      lock: 'text-complexity-empirical-thresholds/v1',
      fingerprint: 'txt-609e19bf-470',
      fingerprintLock: 'txt-609e19bf-470',
    });
    expect(report.studyDesignContract).toMatchObject({
      passed: true,
      fingerprint: 'txt-84b3d2ad-720',
      textAccessExpectation: 'preserve-primary',
    });
    expect(report.studyDesignContract.scenarios).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'rainwater-watershed', targetWords: 300, tolerancePercent: 15 }),
      expect.objectContaining({ id: 'town-road-or-park', targetWords: 900, tolerancePercent: 20 }),
    ]));
    expect(report.mechanics.matrix).toMatchObject({
      fingerprint: 'txt-b8381b0f-3421',
      fingerprintLock: 'txt-b8381b0f-3421',
    });
    expect(human).toContain('calibration mechanics: PASS');
    expect(human).toContain('Empirical quality: NOT-RUN');
    expect(human).toContain('not evidence of calibration quality');
  });

  it('separates body and artifact scores and reports signed, exact, expanded, severe, median, and p90 metrics', () => {
    const fixture = clone(preregisteredMatrix);
    fixture.results = completeResults(fixture);
    fixture.results[0].measurements.body.score = 5;
    fixture.results[0].measurements.artifact.score = 6;

    const report = Evaluator.evaluateCalibrationFixtures(fixture);
    const sample = report.results.find((row) => row.cellId === fixture.results[0].cellId);
    const gradeTwo = report.empiricalQuality.byGrade['2nd Grade'];

    expect(sample.measurements.body).toMatchObject({
      score: 5,
      exactBand: false,
      expandedBand: false,
      status: 'above-target',
      signedDistance: 2,
      absoluteDistance: 2,
      severeMiss: false,
    });
    expect(sample.measurements.artifact).toMatchObject({
      score: 6,
      signedDistance: 3,
      severeMiss: true,
    });
    expect(gradeTwo.body.medianAbsoluteDistance).toBe(0);
    expect(gradeTwo.body.p90AbsoluteDistance).toBe(2);
    expect(gradeTwo.artifact.p90AbsoluteDistance).toBe(3);
    expect(report.empiricalQuality.overall).toEqual(expect.objectContaining({
      body: expect.objectContaining({ medianAbsoluteDistance: 0, p90AbsoluteDistance: 0 }),
      artifact: expect.objectContaining({ medianAbsoluteDistance: 0, p90AbsoluteDistance: 0 }),
      artifactMinusBody: expect.objectContaining({ pairedCount: 24 }),
    }));
    expect(report.empiricalQuality.status).toBe('pass');
    expect(report.empiricalQuality.failedGates).toEqual([]);
    expect(report.empiricalQuality.overall).toMatchObject({
      overshootCount: 1,
      undershootCount: 0,
    });
  });

  it('passes empirical quality only when every unique core cell, required score, word count, and provenance gate passes', () => {
    const fixture = clone(preregisteredMatrix);
    fixture.results = completeResults(fixture);

    const report = Evaluator.evaluateEmpiricalMatrix(fixture);

    expect(report.mechanics.passed).toBe(true);
    expect(report.empiricalQuality).toMatchObject({
      status: 'pass',
      passed: true,
      missingRequiredMeasurements: [],
      providerIntegrity: {
        passed: true,
        mixed: false,
        missingCellIds: [],
      },
    });
    expect(report.empiricalQuality.overall).toMatchObject({
      exactBandRate: 1,
      expandedBandRate: 1,
      severeMissRate: 0,
      medianAbsoluteDistance: 0,
      p90AbsoluteDistance: 0,
      wordLength: { complianceRate: 1 },
    });
    expect(report.results.find((row) => row.scenarioId === 'rainwater-watershed').wordLength.range)
      .toEqual({ min: 255, max: 345 });
    expect(report.results.find((row) => row.scenarioId === 'town-road-or-park').wordLength.range)
      .toEqual({ min: 720, max: 1080 });
    expect(Object.values(report.empiricalQuality.byGrade)).toHaveLength(4);
    expect(Object.values(report.empiricalQuality.byGrade).every((grade) => grade.sampleCount === 6)).toBe(true);
  });

  it('rejects incomplete and duplicate result cells independently from score quality', () => {
    const incomplete = clone(preregisteredMatrix);
    incomplete.results = completeResults(incomplete).slice(0, 23);
    const incompleteReport = Evaluator.evaluateEmpiricalMatrix(incomplete);

    expect(incompleteReport.mechanics.passed).toBe(false);
    expect(incompleteReport.mechanics.results.checks.completeCoreCells).toBe(false);
    expect(incompleteReport.empiricalQuality.passed).toBe(false);
    expect(incompleteReport.mechanics.failures).toContain('results:completeCoreCells');

    const duplicate = clone(preregisteredMatrix);
    duplicate.results = completeResults(duplicate);
    duplicate.results[23] = clone(duplicate.results[22]);
    const duplicateReport = Evaluator.evaluateEmpiricalMatrix(duplicate);

    expect(duplicateReport.mechanics.results.checks.uniqueCellIds).toBe(false);
    expect(duplicateReport.mechanics.results.checks.uniqueCoreCoordinates).toBe(false);
    expect(duplicateReport.empiricalQuality.passed).toBe(false);
  });

  it('requires complete provider/model metadata and rejects mixed-model runs', () => {
    const fixture = clone(preregisteredMatrix);
    fixture.results = completeResults(fixture);
    fixture.results[0].generation.model = 'different-model';
    delete fixture.results[1].generation.provider;

    const report = Evaluator.evaluateEmpiricalMatrix(fixture);
    const integrity = report.empiricalQuality.providerIntegrity;

    expect(integrity.passed).toBe(false);
    expect(integrity.mixed).toBe(true);
    expect(integrity.missingCellIds).toEqual([fixture.results[1].cellId]);
    expect(Object.keys(integrity.pairs)).toEqual(expect.arrayContaining([
      'offline-test/fixed-model-v1',
      'offline-test/different-model',
    ]));
    expect(report.mechanics.passed).toBe(true);
    expect(report.empiricalQuality.passed).toBe(false);
  });

  it('locks thresholds, study expectations, and matrix coordinates against silent drift', () => {
    const unlocked = clone(preregisteredMatrix);
    unlocked.thresholds.version = 'text-complexity-empirical-thresholds/v2';
    const unlockedReport = Evaluator.evaluateEmpiricalMatrix(unlocked);
    expect(unlockedReport.thresholdContract.passed).toBe(false);
    expect(unlockedReport.mechanics.failures).toContain('thresholds:version-lock-mismatch');

    const silentlyChanged = clone(preregisteredMatrix);
    silentlyChanged.thresholds.overall.minimumExpandedBandRate = 0.7;
    const silentlyChangedReport = Evaluator.evaluateEmpiricalMatrix(silentlyChanged);
    expect(silentlyChangedReport.mechanics.failures).toContain('thresholds:fingerprint-lock-mismatch');

    const duplicateId = clone(preregisteredMatrix);
    duplicateId.matrix[1].cellId = duplicateId.matrix[0].cellId;
    const duplicateIdReport = Evaluator.evaluateEmpiricalMatrix(duplicateId);
    expect(duplicateIdReport.mechanics.matrix.checks.uniqueCellIds).toBe(false);
    expect(duplicateIdReport.mechanics.passed).toBe(false);

    const missingStandard = clone(preregisteredMatrix);
    missingStandard.studyDesign.scenarios[0].standardsExpectation = [];
    const missingStandardReport = Evaluator.evaluateEmpiricalMatrix(missingStandard);
    expect(missingStandardReport.mechanics.failures).toContain(
      'study-design:scenario:rainwater-watershed:boundedStandardsExpectation'
    );
    expect(missingStandardReport.mechanics.failures).toContain('study-design:fingerprint-lock-mismatch');
  });

  it('rejects a two-of-three severe miss cluster in the same grade, scenario, and direction', () => {
    const fixture = clone(preregisteredMatrix);
    fixture.results = completeResults(fixture);
    for (const result of fixture.results.slice(0, 2)) {
      result.measurements.body.score = 5.1;
    }

    const report = Evaluator.evaluateEmpiricalMatrix(fixture);
    const clusters = report.empiricalQuality.directionalClusters;

    expect(clusters.passed).toBe(false);
    expect(clusters.violations).toEqual([
      expect.objectContaining({
        requestedGrade: '2nd Grade',
        scenarioId: 'rainwater-watershed',
        repetitionCount: 3,
        severeOvershootCount: 2,
        severeUndershootCount: 0,
      }),
    ]);
    expect(report.empiricalQuality.failedGates).toContain('grade-scenario:directional-severe-cluster');
    expect(report.empiricalQuality.passed).toBe(false);
  });

  it('reports optional paired research deltas and enforces declared grounding capability', () => {
    const fixture = clone(preregisteredMatrix);
    fixture.results = completeResults(fixture);
    const core = fixture.matrix[0];
    fixture.results.push({
      cellId: 'research-g2-watershed-r1',
      pairedCoreCellId: core.cellId,
      requestedGrade: core.requestedGrade,
      scenarioId: core.scenarioId,
      repetition: core.repetition,
      condition: 'research',
      citations: 'on',
      measurements: {
        body: { score: 3, wordCount: 300 },
        artifact: { score: 3.4, wordCount: 305 },
      },
      generation: {
        provider: 'offline-test',
        model: 'fixed-model-v1',
        groundingCapable: true,
      },
    });

    const passReport = Evaluator.evaluateEmpiricalMatrix(fixture);
    expect(passReport.empiricalQuality.research).toMatchObject({
      status: 'pass',
      passed: true,
      pairedCount: 1,
      groundingCapableCount: 1,
      deltas: {
        body: { median: 0.5, p90: 0.5 },
      },
    });
    expect(passReport.empiricalQuality.research.deltas.artifact.median).toBeCloseTo(0.7);
    expect(passReport.empiricalQuality.research.deltas.artifact.p90).toBeCloseTo(0.7);

    fixture.results.at(-1).generation.groundingCapable = false;
    const failReport = Evaluator.evaluateEmpiricalMatrix(fixture);
    expect(failReport.empiricalQuality.research.status).toBe('fail');
    expect(failReport.empiricalQuality.research.missingGroundingCapability).toEqual([
      'research-g2-watershed-r1',
    ]);
    expect(failReport.empiricalQuality.passed).toBe(false);
  });

  it('keeps v1 fixtures on the v1 report and API contract', () => {
    const v1 = require('./fixtures/text_complexity_calibration.json');
    const report = Evaluator.evaluateCalibrationFixtures(v1);

    expect(report.schemaVersion).toBe(Evaluator.EVALUATOR_VERSION);
    expect(report.summary.passed).toBe(true);
    expect(report).not.toHaveProperty('empiricalQuality');
  });
});
