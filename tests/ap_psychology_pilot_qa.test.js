import crypto from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const generatorPath = resolve(root, 'dev-tools/qa_ap_psychology_pilot.cjs');
const reportPath = resolve(root, 'test_prep/ap_psychology_pilot_qa.json');
const packPath = resolve(root, 'test_prep/ap_psychology_pilot.json');
const libraryPath = resolve(root, 'test_prep/ap_psychology_pilot_learning_library.json');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

function runGenerator() {
  return spawnSync(process.execPath, [generatorPath], {
    cwd: root,
    encoding: 'utf8',
  });
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

let report;
let reportText;

beforeAll(() => {
  const result = runGenerator();
  expect(result.status, result.stderr || result.stdout).toBe(0);
  reportText = fs.readFileSync(reportPath, 'utf8');
  report = JSON.parse(reportText);
});

describe('AP Psychology deterministic QA report', () => {
  it('is byte-stable when the reviewed inputs have not changed', () => {
    const result = runGenerator();
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(fs.readFileSync(reportPath, 'utf8')).toBe(reportText);
    expect(report.generatedAt).toBe(`${pack.blueprint.lastVerifiedAt}T00:00:00.000Z`);
  });

  it('binds both source assets and verifies available deployment mirrors', () => {
    expect(report.inputs.pack.sha256).toBe(hashFile(packPath));
    expect(report.inputs.learningLibrary.sha256).toBe(hashFile(libraryPath));
    expect(report.deploymentParity).toHaveLength(2);
    for (const parity of report.deploymentParity) {
      expect(['pass', 'not-present-prebuild']).toContain(parity.status);
      expect(parity.blocking).toBe(false);
      if (parity.status === 'pass') expect(parity.deploySha256).toBe(parity.sourceSha256);
      if (parity.status === 'not-present-prebuild') expect(parity.deploySha256).toBeNull();
    }
  });

  it('keeps automated structural QA separate from release readiness', () => {
    expect(report.automatedAssessment).not.toHaveProperty('status');
    expect(report.automatedAssessment).toMatchObject({
      automatedQaStatus: 'pass',
      releaseReady: false,
      structuralFindingCount: 0,
      structuralFindings: [],
    });
    expect(report.independentHumanReview).toMatchObject({
      releaseStatus: 'blocked-pending-independent-review',
      releaseReady: false,
      blockerCount: 8,
    });
    expect(report.releaseAssessment).toMatchObject({
      releaseStatus: 'not-release-ready',
      releaseReady: false,
    });
    expect(report.independentHumanReview.blockers.map((blocker) => blocker.gate)).toEqual([
      'independent-rights-review',
      'independent-accessibility-review',
      'ap-psychology-subject-expert-review',
      'production-validation',
      'student-safety-review',
      'field-testing',
      'psychometric-calibration',
      'ced-and-policy-reverification',
    ]);
  });

  it('records the exact pilot blueprint, practice, key, feedback, and originality metrics', () => {
    expect(report.metrics.blueprint.unitItemCounts).toEqual({
      'biological-bases-of-behavior': 4,
      cognition: 4,
      'development-and-learning': 4,
      'social-psychology-and-personality': 4,
      'mental-and-physical-health': 4,
    });
    expect(report.metrics.sciencePractices.itemCounts).toEqual({ P1: 13, P2: 5, P3: 2, P4: 0 });
    expect(report.metrics.answerKeys.itemCounts).toEqual({ 0: 5, 1: 5, 2: 5, 3: 5 });
    const expectedOrderedKeys = pack.items.map((item) => item.answerIndex);
    const expectedTransitionDeltas = expectedOrderedKeys
      .slice(1)
      .map((answerIndex, index) => (answerIndex - expectedOrderedKeys[index] + 4) % 4);
    const transitionCounts = [0, 1, 2, 3].map(
      (delta) => expectedTransitionDeltas.filter((candidate) => candidate === delta).length
    );
    const sequence = report.metrics.answerKeys.sequence;
    expect(sequence.orderedAnswerKeys).toEqual(expectedOrderedKeys);
    expect(sequence.transitionDeltasMod4).toEqual(expectedTransitionDeltas);
    expect(sequence.transitionDeltaCounts).toEqual({
      0: transitionCounts[0],
      1: transitionCounts[1],
      2: transitionCounts[2],
      3: transitionCounts[3],
    });
    expect(sequence.dominantTransitionCount).toBe(Math.max(...transitionCounts));
    expect(sequence.dominantTransitionRate).toBeCloseTo(
      Math.max(...transitionCounts) / expectedTransitionDeltas.length,
      3
    );
    expect(sequence.dominantTransitionRate).toBeLessThanOrEqual(0.7);
    expect(sequence.longestSameKeyRun).toBeGreaterThanOrEqual(1);
    expect(sequence.advisoryThresholdExclusive).toBe(0.6);
    expect(sequence.structuralThresholdExclusive).toBe(0.7);
    const transitionAdvisories = report.editorialReviewQueue.advisories.filter(
      (entry) => entry.check === 'answer-key-transition-review'
    );
    expect(transitionAdvisories).toHaveLength(sequence.dominantTransitionRate > 0.6 ? 1 : 0);
    expect(report.metrics.itemQuality).toMatchObject({
      completeOptionFeedbackItems: 20,
      editorialDeclarationItems: 20,
      sourceCompleteItems: 20,
      rightsBoundaryItems: 20,
      accessibilityBoundaryItems: 20,
      expertGateItems: 20,
      psychometricBoundaryItems: 20,
      severeKeyedLengthCueItems: 0,
    });
    expect(report.metrics.itemQuality.keyedToDistractorMeanRatio).toBeGreaterThanOrEqual(0.8);
    expect(report.metrics.itemQuality.keyedToDistractorMeanRatio).toBeLessThanOrEqual(1.25);
    expect(report.metrics.promptOriginality.exactDuplicateGroups).toEqual([]);
    expect(report.metrics.promptOriginality.nearDuplicatePairs).toEqual([]);
    expect(report.items).toHaveLength(20);
    expect(report.items.every((item) => item.automatedStatus === 'pass')).toBe(true);
    const categoricalAdvisoryIds = new Set(
      report.editorialReviewQueue.advisories
        .filter((entry) => entry.check === 'categorical-cue-review')
        .map((entry) => entry.recordId)
    );
    for (const metric of report.metrics.itemQuality.categoricalCueMetrics) {
      expect(metric.advisory).toBe(
        metric.distractorCueChoices.length >= 2 && metric.keyedCueTerms.length === 0
      );
      expect(categoricalAdvisoryIds.has(metric.id)).toBe(metric.advisory);
    }
    const lexicalAdvisoryIds = new Set(
      report.editorialReviewQueue.advisories
        .filter((entry) => entry.check === 'stem-key-lexical-cue-review')
        .map((entry) => entry.recordId)
    );
    for (const metric of report.metrics.itemQuality.lexicalCueMetrics) {
      expect(metric.advisory).toBe(
        metric.uniqueStemKeyTerms.length >= 2 && metric.keyOverlapAdvantage >= 2
      );
      expect(lexicalAdvisoryIds.has(metric.id)).toBe(metric.advisory);
    }
    const feedbackAdvisoryIds = new Set(
      report.editorialReviewQueue.advisories
        .filter((entry) => entry.check === 'feedback-opening-restatement-review')
        .map((entry) => entry.recordId)
    );
    for (const metric of report.metrics.itemQuality.feedbackOpeningRestatementMetrics) {
      expect(feedbackAdvisoryIds.has(metric.id)).toBe(metric.choiceIndexes.length > 0);
    }
  });

  it('covers the learning inventory and preserves both workshops as unscored safeguards', () => {
    expect(report.metrics.learningLibrary.inventory).toEqual({
      chapters: 5,
      sections: 15,
      diagrams: 5,
      diagramPlacements: 5,
      knowledgeChecks: 10,
      skills: 4,
      flashcards: 15,
      memoryAids: 10,
      constructedResponseWorkshops: 2,
    });
    expect(report.metrics.learningLibrary).toMatchObject({
      independentExpertReviewedChapters: 0,
      releaseEligibleRecords: 0,
      diagramAccessibility: {
        accessibleDiagramCount: 5,
        originalSpecificationDiagramCount: 5,
        unscoredDiagramCount: 5,
        validDiagramCount: 5,
        validDiagramPlacementCount: 5,
        placedDiagramCount: 5,
        coveredChapterCount: 5,
        essentialVisualDiagramCount: 0,
        diagramsRequiredForComprehension: false,
        fallbackMode: 'ordered-text-equivalent',
      },
      workshopSafeguards: {
        aaqWorkshopCount: 1,
        ebqWorkshopCount: 1,
        safeguardedWorkshopCount: 2,
        unscoredWorkshops: 2,
        automatedScoringWorkshops: 0,
        scorePredictionWorkshops: 0,
        officialWorkshops: 0,
        releaseEligibleWorkshops: 0,
      },
    });
    expect(report.editorialReviewQueue.advisories.every((entry) => entry.requiresHumanJudgment)).toBe(true);
    expect(
      report.editorialReviewQueue.advisories.filter(
        (entry) => entry.check === 'visual-learning-coverage'
      )
    ).toEqual([]);
    expect(
      report.automatedAssessment.signals.find((signal) => signal.check === 'diagram-integrity')
    ).toMatchObject({ status: 'pass' });
  });
});
