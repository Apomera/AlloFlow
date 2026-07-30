import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

function read(relativePath) {
  return JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

describe('EPPP learning-library inventory and full-review program', () => {
  it('counts the complete legacy learning library', () => {
    const report = read('quality/eppp_provenance/evidence/audit/content_inventory.json');

    expect(report.summary).toMatchObject({
      legacyQuestions: 2933,
      flashcards: 415,
      memoryAids: 255,
      textbookChapters: 49,
      textbookSections: 278,
      knowledgeChecks: 109,
      diagramTemplates: 25,
      diagramPlacements: 58,
      sourceReviewedDiagramPlacements: 58,
      termDefinitions: 1583,
      chapterReferences: 383,
      sourceReviewedChapters: 49,
      sourceReviewedSections: 278,
      reviewRequiredSections: 0,
      sourceReviewedFlashcards: 415,
      retainedReviewedFlashcards: 335,
      retiredRedundantFlashcards: 80,
      editorialReviewedSourcePendingMemoryAids: 0,
      aiReflectiveCodas: 49,
      learnerModes: 14,
    });
    expect(report.summary.sourceReviewedMemoryAids).toBe(255);
    expect(report.learnerModes).toEqual(expect.arrayContaining(['textbook', 'flashcards', 'quiz', 'exam', 'cat', 'memory_aids']));
    expect(report.migrationTracks).toHaveLength(7);
    expect(report.migrationTracks.find((track) => track.contentType === 'legacy questions')).toMatchObject({ count: 2933, status: 'active-full-review' });
    expect(report.migrationTracks.find((track) => track.contentType === 'textbook chapters')).toMatchObject({ status: 'first-pass-complete-expert-pending', reviewedCount: 49 });
    expect(report.migrationTracks.find((track) => track.contentType === 'textbook sections')).toMatchObject({
      status: 'parent-chapter-review-complete-expert-pending',
      reviewedCount: 278,
      reviewRequiredCount: 0,
      reviewScope: 'containing-chapter',
    });
    expect(report.migrationTracks.find((track) => track.contentType === 'flashcards')).toMatchObject({ status: 'first-pass-complete-expert-pending', reviewedCount: 415, retainedCount: 335, retiredRedundantCount: 80 });
    const memoryAidTrack = report.migrationTracks.find((track) => track.contentType === 'memory aids');
    expect(memoryAidTrack).toMatchObject({
      status: 'first-pass-complete-expert-pending',
      reviewedCount: 255,
      editorialSourcePendingCount: 0,
    });
    expect(memoryAidTrack.reviewedCount).toBe(report.summary.sourceReviewedMemoryAids);
    const diagramTrack = report.migrationTracks.find((track) => track.contentType === 'interactive diagrams');
    expect(diagramTrack).toMatchObject({ count: 58, reviewedCount: 58, status: 'first-pass-complete-expert-pending' });
    expect(diagramTrack.reviewedCount).toBe(report.summary.sourceReviewedDiagramPlacements);
    expect(report.migrationTracks.find((track) => track.contentType === 'term definitions')).toMatchObject({ count: 1583, status: 'legacy-preserved-review-not-started' });
  });

  it('tracks all 2,933 legacy questions without mixing in native-original items', () => {
    const report = read('quality/eppp_provenance/evidence/audit/content_inventory.json');
    const targets = report.nativeRoadmap.domainTargets;

    expect(report.summary).toMatchObject({
      nativeQaQuestions: 1500,
      nativeOriginalQaQuestions: 8,
      sourceAuthoredQaQuestions: 49,
      legacyReviewPassedQuestions: 1443,
      nativeTargetQuestions: 2933,
      nativeRemainingToTarget: 1490,
    });
    expect(targets.reduce((sum, domain) => sum + domain.target, 0)).toBe(2933);
    expect(targets.reduce((sum, domain) => sum + domain.currentQaPassed, 0)).toBe(1443);
    expect(report.nativeRoadmap.stages).toEqual([100, 300, 1000, 2000, 2933]);
    expect(report.nativeRoadmap.practiceSampling).toContain('blueprint weights');
  });

  it('keeps every unreviewed legacy item quarantined in an explicit ledger', () => {
    const ledger = read('quality/eppp_provenance/evidence/review/review_ledger.json');

    expect(ledger.summary).toMatchObject({
      legacyReviewUniverse: 2933,
      legacyItemsMigratedToNativeQa: 1443,
      legacyItemsStillQuarantined: 1490,
      nativeOriginalQaItems: 8,
      sourceAuthoredQaItems: 49,
      totalNativeQaItems: 1500,
      independentExpertValidatedItems: 0,
      productionValidatedItems: 0,
    });
    expect(ledger.items.filter((item) => item.workflowStage === 'native-content-qa-passed')).toHaveLength(1443);
    expect(ledger.items.filter((item) => item.workflowStage === 'legacy-quarantine')).toHaveLength(1490);
    expect(ledger.requiredGates).toContain('independent qualified psychology/assessment review before production validation');
  });

  it('keeps QA evidence non-runtime and normal Hub builds native-only', () => {
    const builder = fs.readFileSync(resolve(process.cwd(), '_build_test_prep_hub_module.js'), 'utf8');
    const inventoryBuilder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/inventory_eppp_learning_content.cjs'), 'utf8');
    expect(fs.existsSync(resolve(process.cwd(), 'quality/eppp_provenance/evidence/audit/content_inventory.json'))).toBe(true);
    expect(fs.existsSync(resolve(process.cwd(), 'quality/eppp_provenance/evidence/review/review_ledger.json'))).toBe(true);
    expect(fs.existsSync(resolve(process.cwd(), 'test_prep/eppp_legacy/content_inventory.json'))).toBe(false);
    expect(inventoryBuilder).toContain('openEpppMigrationSourceArchive');
    expect(builder).toContain('MIGRATION_ARCHIVE_SCRIPT');
    expect(builder).toContain('LEARNING_LIBRARY_SCRIPT');
    expect(builder).toContain('QA_SCRIPT');
    expect(builder).not.toContain('inventory_eppp_learning_content.cjs');
    expect(builder).not.toContain('build_eppp_review_ledger.cjs');
    expect(builder).not.toContain('build_eppp_1500_curation_manifest.cjs');
  });
});
