import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));
const { hasChoiceSpecificFeedback } = require(resolve(process.cwd(), 'dev-tools/non_eppp_feedback_checks.cjs'));
const { corrections: ecCorrections } = require(resolve(process.cwd(), 'dev-tools/early_childhood_5025/source_review_corrections.cjs'));

const BOILERPLATE = /(?:substitutes a narrow, unsupported, inequitable, or procedurally weak action|This option applies the claim)/i;
const TARGETED_WARNINGS = new Set([
  'short-prompt',
  'severe-answer-length-clue',
  'asymmetric-extreme-distractors',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
]);

describe('School Librarian (5312) and Early Childhood Education (5025) diagnostic quality', () => {
  for (const stem of ['school_librarian_5312', 'early_childhood_5025']) {
    it(`${stem} removes length cues and boilerplate feedback across 200 source items, preserves Batch 3 drafts, and balances 60 library checks`, () => {
      const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), `test_prep/${stem}_pack.json`), 'utf8'));
      const library = JSON.parse(fs.readFileSync(resolve(process.cwd(), `test_prep/${stem}_learning_library.json`), 'utf8'));
      expect(pack.items).toHaveLength(500);
      expect(pack.items.slice(200, 300).every((item) => item.authorship === 'assistant-authored-independent'
        && item.reviewStatus === 'assistant-reviewed-independent-draft'
        && item.qaStatus === 'pending-integrated-qa')).toBe(true);

      const items = pack.items.slice(0, 200);
      let strictLongest = 0;
      for (const item of items) {
        const lengths = item.choices.map((choice) => String(choice || '').length);
        const keyLength = lengths[item.answerIndex];
        const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
        const ratioCap = stem === 'early_childhood_5025' && ecCorrections[item.id] ? 1.4 : 1.25;
        expect(keyLength, `${item.id} length cue`).toBeLessThan(longestDistractor * ratioCap);
        if (keyLength > longestDistractor) strictLongest += 1;
        const distractorPairs = item.choiceRationales
          .map((note, index) => ({ note, choice: item.choices[index], index }))
          .filter(({ index }) => index !== item.answerIndex);
        expect(new Set(distractorPairs.map(({ note }) => note)).size, item.id).toBe(3);
        for (const { note, choice } of distractorPairs) {
          expect(note.length, item.id).toBeGreaterThanOrEqual(100);
          expect(note, item.id).not.toMatch(BOILERPLATE);
          if (stem === 'early_childhood_5025') {
            expect(hasChoiceSpecificFeedback(choice, note), `${item.id} choice-specific`).toBe(true);
          }
        }
        expect(warningCodes(item).filter((code) => TARGETED_WARNINGS.has(code)), item.id).toEqual([]);
      }
      expect(strictLongest).toBeLessThanOrEqual(50);

      const checks = library.chapters.flatMap((chapter) => chapter.knowledgeChecks);
      expect(checks).toHaveLength(60);
      for (const check of checks) {
        const lengths = check.choices.map((choice) => String(choice || '').length);
        const longestDistractor = Math.max(...lengths.filter((_, index) => index !== check.answerIndex));
        expect(lengths[check.answerIndex], check.id).toBeLessThan(longestDistractor * 1.25);
      }
    });
  }
});
