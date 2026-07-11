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
      knowledgeChecks: 76,
      diagramTemplates: 25,
      diagramPlacements: 45,
      termDefinitions: 1583,
      chapterReferences: 266,
      aiReflectiveCodas: 49,
      learnerModes: 14,
    });
    expect(report.learnerModes).toEqual(expect.arrayContaining(['textbook', 'flashcards', 'quiz', 'exam', 'cat', 'memory_aids']));
    expect(report.migrationTracks).toHaveLength(6);
    expect(report.migrationTracks.find((track) => track.contentType === 'legacy questions')).toMatchObject({ count: 2933, status: 'active-full-review' });
    expect(report.migrationTracks.filter((track) => track.contentType !== 'legacy questions').every((track) => track.status === 'legacy-preserved-review-not-started')).toBe(true);
  });

  it('tracks all 2,933 legacy questions without mixing in native-original items', () => {
    const report = read('test_prep/eppp_legacy/content_inventory.json');
    const targets = report.nativeRoadmap.domainTargets;

    expect(report.summary).toMatchObject({
      nativeQaQuestions: 416,
      nativeOriginalQaQuestions: 8,
      legacyReviewPassedQuestions: 408,
      nativeTargetQuestions: 2933,
      nativeRemainingToTarget: 2525,
    });
    expect(targets.reduce((sum, domain) => sum + domain.target, 0)).toBe(2933);
    expect(targets.reduce((sum, domain) => sum + domain.currentQaPassed, 0)).toBe(408);
    expect(report.nativeRoadmap.stages).toEqual([100, 300, 1000, 2000, 2933]);
    expect(report.nativeRoadmap.practiceSampling).toContain('blueprint weights');
  });

  it('keeps every unreviewed legacy item quarantined in an explicit ledger', () => {
    const ledger = read('test_prep/eppp_legacy/review_ledger.json');

    expect(ledger.summary).toMatchObject({
      legacyReviewUniverse: 2933,
      legacyItemsMigratedToNativeQa: 408,
      legacyItemsStillQuarantined: 2525,
      nativeOriginalQaItems: 8,
      totalNativeQaItems: 416,
      independentExpertValidatedItems: 0,
      productionValidatedItems: 0,
    });
    expect(ledger.items.filter((item) => item.workflowStage === 'native-content-qa-passed')).toHaveLength(408);
    expect(ledger.items.filter((item) => item.workflowStage === 'legacy-quarantine')).toHaveLength(2525);
    expect(ledger.requiredGates).toContain('independent qualified psychology/assessment review before production validation');
  });

  it('regenerates identical development and deployment artifacts', () => {
    for (const name of ['content_inventory.json', 'review_ledger.json', 'curation_500.json']) {
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
    expect(builder).toContain('build_eppp_500_curation_manifest.cjs');
  });
});
