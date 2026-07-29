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
      'choicesSpeechText: testPrepChoicesSpeechText',
      'handsFreeHelpText: testPrepHandsFreeHelpText',
      'handsFreeStatusText: testPrepHandsFreeStatusText',
      'preAnswerClarificationPolicy: testPrepPreAnswerClarificationPolicy',
      'filterPreAnswerClarificationResponse: testPrepFilterPreAnswerClarificationResponse',
    ];

    for (const entry of requiredExports) expect(builder, entry).toContain(entry);
  });

  it('keeps hands-free helper exports in the legacy builder as well as the release builder', () => {
    const legacyBuilder = fs.readFileSync(resolve(root, '_build_test_prep_hub_module.js'), 'utf8');
    for (const entry of [
      'questionSpeechText: testPrepQuestionSpeechText',
      'feedbackSpeechText: testPrepFeedbackSpeechText',
      'choicesSpeechText: testPrepChoicesSpeechText',
      'handsFreeHelpText: testPrepHandsFreeHelpText',
      'handsFreeStatusText: testPrepHandsFreeStatusText',
      'parseHandsFreeCommand: testPrepParseHandsFreeCommand',
      'preAnswerClarificationPolicy: testPrepPreAnswerClarificationPolicy',
      'filterPreAnswerClarificationResponse: testPrepFilterPreAnswerClarificationResponse',
      'buildClarificationPrompt: testPrepBuildClarificationPrompt',
    ]) expect(legacyBuilder, entry).toContain(entry);
  });
});
