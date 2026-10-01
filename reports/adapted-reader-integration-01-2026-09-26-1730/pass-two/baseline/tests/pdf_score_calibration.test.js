import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { evaluateObservation, summarizeCorpus, classifyEvidence, reviewProblems } = require('../dev-tools/lib/pdf_calibration.cjs');
const read = name => JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/pdf_calibration', name), 'utf8').replace(/^\uFEFF/, ''));
const synthetic = read('synthetic_cases.json');
function reviewedCase(overrides = {}) {
  const entry = structuredClone(synthetic.entries[0]);
  entry.evidenceKind = 'independent-human-review';
  delete entry.expected;
  entry.review = { status: 'completed', method: 'human', independent: true,
    reviewer: 'UNIT TEST ONLY', reviewedAt: '2026-09-07T12:00:00.000Z', evidenceRef: 'unit-test:review-record',
    artifactSha256: entry.artifact.sha256, readiness: 'ready', layers: { ai: 'passed', fidelity: 'passed' }, findings: [], ...overrides };
  return entry;
}
describe('mixed education policy calibration — synthetic regression evidence', () => {
  it.each(synthetic.entries)('$id uses current layer, fidelity, and export readiness policy', entry => {
    const actual = evaluateObservation(entry);
    expect(actual.readiness).toBe(entry.expected.readiness);
    expect(actual.governingLayerScore).toBe(entry.expected.governingLayerScore);
    expect(Object.fromEntries(Object.entries(actual.layers).map(([key, value]) => [key, value.status]))).toEqual(entry.expected.layerStatuses);
    expect(actual.policyFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
  it('uses current audit completeness predicates before letting a score govern', () => {
    const entry = structuredClone(synthetic.entries[0]);
    entry.observed.verification.ai.score = 20;
    delete entry.observed.verification.ai.chunksAudited;
    expect(evaluateObservation(entry).governingLayerScore).toBe(100);
    entry.observed.verification.ai.chunksAudited = 1;
    entry.observed.verification.axe.score = 10;
    delete entry.observed.verification.axe.totalViolations;
    expect(evaluateObservation(entry).governingLayerScore).toBe(20);
  });
  it('requires an explicit PDF output declaration rather than assuming missing validation is irrelevant', () => {
    const entry = structuredClone(synthetic.entries[0]); delete entry.observed.pdf;
    expect(() => evaluateObservation(entry)).toThrow(/pdf.produced/);
  });
  it('reports synthetic expectations separately from human calibration', () => {
    const report = summarizeCorpus(synthetic);
    expect(report.corpusStatus).toBe('synthetic-only');
    expect(report.coverage.independentlyReviewed).toBe(0);
    expect(report.syntheticMetrics).toEqual({ evaluated: synthetic.entries.length, mismatched: 0 });
    expect(report.humanMetrics).toBeNull();
  });
  it('surfaces a synthetic expectation mismatch', () => {
    const entry = structuredClone(synthetic.entries[0]); entry.expected.readiness = 'review-required';
    const report = summarizeCorpus({ entries: [entry] });
    expect(report.syntheticMetrics.mismatched).toBe(1);
    expect(report.rows[0].expectationMismatches).toContain('readiness');
  });
  it('preserves an actually reported post-fidelity score separately from the governing layer calculation', () => {
    const entry = structuredClone(synthetic.entries[0]); entry.observed.result.afterScore = 87;
    const actual = evaluateObservation(entry);
    expect(actual.governingLayerScore).toBe(100);
    expect(actual.reportedScore).toBe(87);
    expect(actual.readiness).toBe('caution');
  });
  it('does not infer fidelity evidence when coverage was not measured', () => {
    const entry = structuredClone(synthetic.entries[0]); delete entry.observed.result.integrityCoverage;
    expect(evaluateObservation(entry).layers.fidelity.status).toBe('unavailable');
  });
});
describe('human review calibration provenance and quality measures', () => {
  it('reports an empty corpus as uncalibrated with no invented metric', () => {
    const report = summarizeCorpus({ entries: [] });
    expect(report.corpusStatus).toBe('empty'); expect(report.humanMetrics).toBeNull();
  });
  it('leaves legacy scores and unreviewed entries outside human metrics', () => {
    const entry = { ...structuredClone(synthetic.entries[0]), evidenceKind: 'unreviewed' };
    const report = summarizeCorpus({ entries: [entry, { id: 'old', expertScore: 99, alloflowAiScore: 100, alloflowAxeScore: 100 }] });
    expect(report.corpusStatus).toBe('unreviewed'); expect(report.coverage.unreviewed).toBe(2);
    expect(report.coverage.invalidObservations).toBe(1); expect(report.humanMetrics).toBeNull();
  });
  it.each(['pending', 'validator', 'other-artifact', 'no-reviewer'])('excludes %s evidence from independently reviewed metrics', reason => {
    const entry = reviewedCase();
    if (reason === 'pending') entry.review.status = 'pending';
    if (reason === 'validator') entry.review.method = 'veraPDF';
    if (reason === 'other-artifact') entry.review.artifactSha256 = 'b'.repeat(64);
    if (reason === 'no-reviewer') entry.review.reviewer = '';
    expect(reviewProblems(entry).length).toBeGreaterThan(0);
    expect(classifyEvidence(entry)).toBe('unreviewed');
  });
  it('never promotes synthetic expectations even if review fields are present', () => {
    const entry = reviewedCase(); entry.evidenceKind = 'synthetic';
    expect(classifyEvidence(entry)).toBe('synthetic');
  });
  it('measures false-ready outcomes, unnecessary review, and missed findings only on declared completed reviews', () => {
    const falseReady = reviewedCase({ readiness: 'review-required', layers: { ai: 'failed', fidelity: 'review-required' },
      findings: [{ id: 'lost-instruction', layer: 'fidelity', summary: 'Unit-test omission', detectedByAutomation: false }] });
    const unnecessary = reviewedCase(); unnecessary.observed.result.needsExpertReview = true;
    const correctReady = reviewedCase();
    const report = summarizeCorpus({ entries: [falseReady, unnecessary, correctReady, ...synthetic.entries] });
    expect(report.humanMetrics.reviewedDocuments).toBe(3);
    expect(report.humanMetrics.matrix).toEqual({ correctlyDistributable: 1, falseReady: 1, unnecessaryReview: 1, correctlyRequiresReview: 0 });
    expect(report.humanMetrics.falseReadyRateAmongDistributable).toBe(0.5);
    expect(report.humanMetrics.layers.fidelity).toMatchObject({ reviewedFindings: 1, missedFindings: 1, outcomeDisagreements: 1 });
    expect(report.humanMetrics.layers.export.reviewed).toBe(0);
  });
  it('keeps the committed human corpus separate and validates every declared review', () => {
    const manifest = read('manifest.json');
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.entries.every(entry => entry.evidenceKind !== 'synthetic')).toBe(true);
    for (const entry of manifest.entries.filter(entry => entry.evidenceKind === 'independent-human-review')) expect(reviewProblems(entry)).toEqual([]);
    const report = summarizeCorpus(manifest);
    if (!manifest.entries.length) expect(report.humanMetrics).toBeNull();
  });
});
