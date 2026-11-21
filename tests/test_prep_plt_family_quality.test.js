import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));
const BOILERPLATE = /\b(?:misses or conflicts with the controlling teaching|conflicts with development, evidence, access|not the best answer\.)/i;
const TARGETED_WARNINGS = new Set([
  'short-prompt',
  'severe-answer-length-clue',
  'asymmetric-extreme-distractors',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
]);

const PLT_STEMS = [
  'plt_k6_5622',
  'plt_5_9_5623',
  'plt_7_12_5624',
  'plt_early_childhood_5621',
];

describe('PLT 4-pack family (5622, 5623, 5624, 5621) diagnostic quality', () => {
  for (const stem of PLT_STEMS) {
    it(`${stem} eliminates severe length cues, boilerplate distractor rationales, and authoring-scaffold prompts`, () => {
      const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), `test_prep/${stem}_pack.json`), 'utf8'));
      const items = pack.items.slice(0, 200);
      expect(items).toHaveLength(200);

      let strictLongest = 0;
      for (const item of items) {
        expect(item.prompt, `${stem} ${item.id}`).not.toMatch(/\bIn a parallel\b/i);
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
      expect(strictLongest, `${stem} strictLongest`).toBeLessThanOrEqual(40);
    });
  }
});
