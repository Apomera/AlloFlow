import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));

const TARGETED_WARNINGS = new Set([
  'short-prompt',
  'severe-answer-length-clue',
  'asymmetric-extreme-distractors',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
]);

describe('ParaPro (1755) diagnostic and learning-library quality', () => {
  it('removes targeted feedback/prompt/length warnings across 200 source items, preserves 300 Batch 3-5 drafts, keeps full pack under 25% key=longest, and balances 60 library checks', () => {
    const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/parapro_pack.json'), 'utf8'));
    const library = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/parapro_learning_library.json'), 'utf8'));
    expect(pack.items).toHaveLength(500);
    expect(pack.items.slice(200).every((item) => item.authorship === 'assistant-authored-independent'
      && item.reviewStatus === 'assistant-reviewed-independent-draft'
      && item.qaStatus === 'pending-integrated-qa')).toBe(true);

    let allTiedOrLongest = 0;
    for (const item of pack.items) {
      const lengths = item.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      if (keyLength >= longestDistractor) allTiedOrLongest += 1;
    }
    expect(allTiedOrLongest).toBeLessThanOrEqual(125);

    const sourceItems = pack.items.slice(0, 200);
    let sourceTiedOrLongest = 0;
    for (const item of sourceItems) {
      const lengths = item.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      if (keyLength >= longestDistractor) sourceTiedOrLongest += 1;
      const notes = item.choiceRationales.filter((_, index) => index !== item.answerIndex);
      expect(new Set(notes).size, item.id).toBe(3);
      for (const note of notes) {
        expect(note.length, item.id).toBeGreaterThanOrEqual(100);
        expect(note.trim().split(/\s+/).length, item.id).toBeGreaterThanOrEqual(16);
      }
      expect(warningCodes(item).filter((code) => TARGETED_WARNINGS.has(code)), item.id).toEqual([]);
    }
    expect(sourceTiedOrLongest).toBeLessThanOrEqual(50);

    const checks = library.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    expect(checks).toHaveLength(60);
    let strictLib = 0;
    for (const check of checks) {
      const lengths = check.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[check.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== check.answerIndex));
      if (keyLength > longestDistractor) strictLib += 1;
      expect(keyLength, check.id).toBeLessThan(longestDistractor * 1.25);
    }
    expect(strictLib).toBeLessThanOrEqual(10);
  });
});
