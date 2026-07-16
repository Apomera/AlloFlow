import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

describe('Test Prep Hub release-builder API parity', () => {
  it('preserves every reusable learning-engine export when a new exam pack is bundled', () => {
    const builder = fs.readFileSync(resolve(root, 'dev-tools/build_test_prep_hub_release.cjs'), 'utf8');
    const requiredExports = [
      'buildReviewSet: testPrepBuildReviewSet',
      'buildCustomQuiz: testPrepBuildCustomQuiz',
      'searchPack: testPrepSearchPack',
      'normalizeFlashcardSchedule: normalizeTestPrepFlashcardSchedule',
      'rateFlashcard: testPrepRateFlashcard',
      'buildFlashcardQueue: testPrepBuildFlashcardQueue',
      'normalizeAnnotations: normalizeTestPrepAnnotations',
      'upsertAnnotation: testPrepUpsertAnnotation',
      'deleteAnnotation: testPrepDeleteAnnotation',
      'normalizeStudyPlans: normalizeTestPrepStudyPlans',
      'studyPlanForPack: testPrepStudyPlanForPack',
      'buildStudyPlanStatus: testPrepBuildStudyPlanStatus',
      'exportProgress: testPrepExportProgress',
      'importProgress: testPrepImportProgress',
      'normalizeReviewItems: normalizeTestPrepReviewItems',
    ];

    for (const entry of requiredExports) expect(builder, entry).toContain(entry);
  });
});
