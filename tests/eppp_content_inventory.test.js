import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

function read(relativePath) {
  return JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

describe('EPPP learning-library inventory and full-review program', () => {
  it('counts the complete legacy learning library', () => {
    const report = read('test_prep/eppp_legacy/content_inventory.json');

    expect(report.summary).toMatchObject({
      legacyQuestions: 2933,
      flashcards: 415,
      memoryAids: 255,
      textbookChapters: 49,
      textbookSections: 278,
      knowledgeChecks: 98,
      diagramTemplates: 25,
      diagramPlacements: 57,
      termDefinitions: 1583,
      chapterReferences: 332,
      sourceReviewedChapters: 33,
      sourceReviewedFlashcards: 9,
      sourceReviewedMemoryAids: 8,
      editorialReviewedSourcePendingMemoryAids: 2,
      aiReflectiveCodas: 49,
      learnerModes: 14,
    });
    expect(report.learnerModes).toEqual(expect.arrayContaining(['textbook', 'flashcards', 'quiz', 'exam', 'cat', 'memory_aids']));
    expect(report.migrationTracks).toHaveLength(6);
    expect(report.migrationTracks.find((track) => track.contentType === 'legacy questions')).toMatchObject({ count: 2933, status: 'active-full-review' });
    expect(report.migrationTracks.find((track) => track.contentType === 'textbook chapters')).toMatchObject({ status: 'review-in-progress', reviewedCount: 33 });
    expect(report.migrationTracks.find((track) => track.contentType === 'flashcards')).toMatchObject({ status: 'review-in-progress', reviewedCount: 9 });
    expect(report.migrationTracks.find((track) => track.contentType === 'memory aids')).toMatchObject({ status: 'review-in-progress', reviewedCount: 8, editorialSourcePendingCount: 2 });
    expect(report.migrationTracks.filter((track) => ['interactive diagrams', 'term definitions'].includes(track.contentType)).every((track) => track.status === 'legacy-preserved-review-not-started')).toBe(true);
  });

  it('tracks all 2,933 legacy questions without mixing in native-original items', () => {
    const report = read('test_prep/eppp_legacy/content_inventory.json');
    const targets = report.nativeRoadmap.domainTargets;

    expect(report.summary).toMatchObject({
      nativeQaQuestions: 1000,
      nativeOriginalQaQuestions: 8,
      sourceAuthoredQaQuestions: 30,
      legacyReviewPassedQuestions: 962,
      nativeTargetQuestions: 2933,
      nativeRemainingToTarget: 1971,
    });
    expect(targets.reduce((sum, domain) => sum + domain.target, 0)).toBe(2933);
    expect(targets.reduce((sum, domain) => sum + domain.currentQaPassed, 0)).toBe(962);
    expect(report.nativeRoadmap.stages).toEqual([100, 300, 1000, 2000, 2933]);
    expect(report.nativeRoadmap.practiceSampling).toContain('blueprint weights');
  });

  it('keeps every unreviewed legacy item quarantined in an explicit ledger', () => {
    const ledger = read('test_prep/eppp_legacy/review_ledger.json');

    expect(ledger.summary).toMatchObject({
      legacyReviewUniverse: 2933,
      legacyItemsMigratedToNativeQa: 962,
      legacyItemsStillQuarantined: 1971,
      nativeOriginalQaItems: 8,
      sourceAuthoredQaItems: 30,
      totalNativeQaItems: 1000,
      independentExpertValidatedItems: 0,
      productionValidatedItems: 0,
    });
    expect(ledger.items.filter((item) => item.workflowStage === 'native-content-qa-passed')).toHaveLength(962);
    expect(ledger.items.filter((item) => item.workflowStage === 'legacy-quarantine')).toHaveLength(1971);
    expect(ledger.requiredGates).toContain('independent qualified psychology/assessment review before production validation');
  });

  it('regenerates identical development and deployment artifacts', () => {
    for (const name of ['content_inventory.json', 'review_ledger.json', 'curation_500.json', 'curation_1000.json']) {
      const source = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy', name), 'utf8');
      const deployed = fs.readFileSync(resolve(process.cwd(), 'prismflow-deploy/public/test_prep/eppp_legacy', name), 'utf8');
      expect(deployed).toBe(source);
    }
    const importer = fs.readFileSync(resolve(process.cwd(), 'dev-tools/import_eppp_legacy.cjs'), 'utf8');
    const builder = fs.readFileSync(resolve(process.cwd(), '_build_test_prep_hub_module.js'), 'utf8');
    expect(importer).toContain('inventory_eppp_learning_content.cjs');
    expect(importer).toContain('build_eppp_review_ledger.cjs');
    expect(importer).toContain('build_eppp_500_curation_manifest.cjs');
    expect(builder).toContain('inventory_eppp_learning_content.cjs');
    expect(builder).toContain('build_eppp_review_ledger.cjs');
    expect(builder).toContain('build_eppp_1000_curation_manifest.cjs');
  });
});
