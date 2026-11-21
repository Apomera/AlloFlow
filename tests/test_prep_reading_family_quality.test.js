import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));
const BOILERPLATE = /\b(?:does not match the controlling literacy evidence|misses or conflicts with the controlling reading-specialist principle|not the best answer\.)/i;
const TARGETED_WARNINGS = new Set([
  'short-prompt',
  'severe-answer-length-clue',
  'asymmetric-extreme-distractors',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
]);
const TEACHING_READING_SCOPE = /\b(?:reading specialist|literacy specialist|literacy coach|coach(?:es|ed|ing)?|adolescen\w*|older readers?|5302|secondary)\b/i;

describe('Reading family (5205, 5302) diagnostic quality', () => {
  for (const stem of ['teaching_reading_5205', 'reading_specialist_5302']) {
    it(`${stem} removes length cues and boilerplate feedback across 200 items and 60 library checks`, () => {
      const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), `test_prep/${stem}_pack.json`), 'utf8'));
      const library = JSON.parse(fs.readFileSync(resolve(process.cwd(), `test_prep/${stem}_learning_library.json`), 'utf8'));
      const items = pack.items.slice(0, 200);
      expect(items).toHaveLength(200);
      let strictLongest = 0;
      for (const item of items) {
        const lengths = item.choices.map((choice) => String(choice || '').length);
        const keyLength = lengths[item.answerIndex];
        const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
        expect(keyLength, `${item.id} length cue`).toBeLessThan(longestDistractor * 1.25);
        if (keyLength > longestDistractor) strictLongest += 1;
        const notes = item.choiceRationales.filter((_, index) => index !== item.answerIndex);
        expect(new Set(notes).size, item.id).toBe(3);
        for (const note of notes) {
          expect(note.length, item.id).toBeGreaterThanOrEqual(100);
          expect(note, item.id).not.toMatch(BOILERPLATE);
        }
        expect(warningCodes(item).filter((code) => TARGETED_WARNINGS.has(code)), item.id).toEqual([]);
        if (stem === 'teaching_reading_5205') expect(JSON.stringify(item), item.id).not.toMatch(TEACHING_READING_SCOPE);
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
