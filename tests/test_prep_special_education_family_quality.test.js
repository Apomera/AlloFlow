import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));
const BOILERPLATE = /\b(?:misses the developmental|misses the observable definition|misses the adaptive evidence|overlooks an individualized support|does not adequately address the assessed skill|does not apply the key requirement|not the best answer\.)/i;
const TARGETED_WARNINGS = new Set([
  'short-prompt',
  'severe-answer-length-clue',
  'asymmetric-extreme-distractors',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
]);

const SPECIAL_ED_SIBLING_STEMS = [
  'special_education_early_childhood_5692',
  'special_education_severe_profound_5547',
  'special_education_learning_disabilities_5383',
  'special_education_behavior_emotional_5372',
  'special_education_intellectual_disabilities_5322',
];

describe('Special Education sibling pack family (5692, 5547, 5383, 5372, 5322) quality', () => {
  for (const stem of SPECIAL_ED_SIBLING_STEMS) {
    it(`${stem} eliminates severe length cues and boilerplate distractor rationales across 200 items and 60 library checks`, () => {
      const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), `test_prep/${stem}_pack.json`), 'utf8'));
      const library = JSON.parse(fs.readFileSync(resolve(process.cwd(), `test_prep/${stem}_learning_library.json`), 'utf8'));
      const items = pack.items.slice(0, 200);
      expect(items).toHaveLength(200);

      let strictLongest = 0;
      for (const item of items) {
        const lengths = item.choices.map((choice) => String(choice || '').length);
        const keyLength = lengths[item.answerIndex];
        const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
        expect(keyLength, `${stem} ${item.id} exceeds 1.25x longest distractor`).toBeLessThan(longestDistractor * 1.25);
        if (keyLength > longestDistractor) strictLongest += 1;

        const distractorNotes = item.choiceRationales.filter((_, index) => index !== item.answerIndex);
        expect(distractorNotes, `${stem} ${item.id}`).toHaveLength(3);
        expect(new Set(distractorNotes).size, `${stem} ${item.id}`).toBe(3);
        for (const note of distractorNotes) {
          expect(note.length, `${stem} ${item.id}`).toBeGreaterThanOrEqual(100);
          expect(note, `${stem} ${item.id}`).not.toMatch(BOILERPLATE);
        }
        const warnings = warningCodes(item).filter((code) => TARGETED_WARNINGS.has(code));
        expect(warnings, `${stem} ${item.id} warnings`).toEqual([]);
      }
      expect(strictLongest, `${stem} strictLongest`).toBeLessThanOrEqual(60);

      const checks = (library.chapters || []).flatMap((chapter) => chapter.knowledgeChecks || []);
      expect(checks).toHaveLength(60);
      for (const check of checks) {
        const lengths = check.choices.map((choice) => String(choice || '').length);
        const keyLength = lengths[check.answerIndex];
        const longestDistractor = Math.max(...lengths.filter((_, index) => index !== check.answerIndex));
        expect(keyLength, `${stem} ${check.id} exceeds 1.25x longest distractor`).toBeLessThan(longestDistractor * 1.25);
      }
    });
  }
});
