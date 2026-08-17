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
      'resolveLearnerDataIdentity: testPrepResolveLearnerDataIdentity',
      'reviewItemsForPack: testPrepReviewItemsForPack',
      'annotationsForPack: testPrepAnnotationsForPack',
      'normalizeFlashcardStore: normalizeTestPrepFlashcardStore',
      'normalizeChapterProgressStore: normalizeTestPrepNativeChapterProgressStore',
      'choicesSpeechText: testPrepChoicesSpeechText',
      'handsFreeHelpText: testPrepHandsFreeHelpText',
      'handsFreeStatusText: testPrepHandsFreeStatusText',
      'preAnswerClarificationPolicy: testPrepPreAnswerClarificationPolicy',
      'filterPreAnswerClarificationResponse: testPrepFilterPreAnswerClarificationResponse',
    ];

    for (const entry of requiredExports) expect(builder, entry).toContain(entry);
  });

  // _build_test_prep_hub_module.js used to be a second copy of the release
  // pipeline, and this test string-matched its export list to keep the two in
  // sync. That guard was necessary but weak: it drifted anyway, and two exports
  // (parsePracticeVoiceCommand, practiceVoiceHelpText) ended up in one builder
  // only. The entry point now DELEGATES, so parity is structural rather than
  // asserted, and the invariant worth pinning is the delegation itself.
  it('keeps the legacy entry point delegating rather than reimplementing the pipeline', () => {
    const legacyBuilder = fs.readFileSync(resolve(root, '_build_test_prep_hub_module.js'), 'utf8');
    expect(legacyBuilder).toContain("build_test_prep_hub_release.cjs");
    // A second Object.assign export block here means the duplication is back.
    expect(legacyBuilder).not.toContain('window.AlloModules.TestPrepHub = Object.assign(');
    expect(legacyBuilder.split(/\r?\n/).length).toBeLessThan(150);
  });
});
