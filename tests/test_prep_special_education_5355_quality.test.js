import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/special_education_5355_pack.json');
const libraryPath = resolve(process.cwd(), 'test_prep/special_education_5355_learning_library.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_special_education_5355_pack.cjs');
const BOILERPLATE = /\b(?:does not apply the key requirement|does not satisfy the complete task|not the best answer\.)/i;

let cachedPack;
let cachedLibrary;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};
const readLibrary = () => {
  if (!cachedLibrary) cachedLibrary = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
  return cachedLibrary;
};

describe('Special Education 5355 diagnostic & library item quality', () => {
  it('eliminates severe answer-length cues across all 200 diagnostic items and 60 chapter checks', () => {
    const items = readPack().items.slice(0, 200);
    expect(items).toHaveLength(200);
    let strictLongest = 0;
    items.forEach((item) => {
      const lengths = item.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      expect(keyLength, item.id + ' exceeds 1.25x longest distractor').toBeLessThan(longestDistractor * 1.25);
      if (keyLength > longestDistractor) strictLongest += 1;
    });
    expect(strictLongest).toBeLessThanOrEqual(50);

    const checks = (readLibrary().chapters || []).flatMap((chapter) => chapter.knowledgeChecks || []);
    expect(checks).toHaveLength(60);
    checks.forEach((check) => {
      const lengths = check.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[check.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== check.answerIndex));
      expect(keyLength, check.id + ' exceeds 1.25x longest distractor').toBeLessThan(longestDistractor * 1.25);
    });
    expect(fs.readFileSync(qaScriptPath, 'utf8')).toContain("'choice-length-parity'");
  });

  it('provides three specific, non-boilerplate distractor rationales with zero targeted feedback warnings', () => {
    const items = readPack().items.slice(0, 200);
    const targeted = new Set([
      'short-prompt',
      'severe-answer-length-clue',
      'asymmetric-extreme-distractors',
      'incorrect-option-feedback-detail',
      'incorrect-option-choice-restatement',
      'incorrect-option-full-key-echo',
    ]);
    items.forEach((item) => {
      expect(item.prompt.length, item.id + ' short prompt').toBeGreaterThanOrEqual(35);
      const distractorNotes = item.choiceRationales.filter((_, index) => index !== item.answerIndex);
      expect(distractorNotes, item.id).toHaveLength(3);
      expect(new Set(distractorNotes).size, item.id).toBe(3);
      distractorNotes.forEach((note) => {
        expect(note.length, item.id).toBeGreaterThanOrEqual(100);
        expect(note, item.id).not.toMatch(BOILERPLATE);
      });
      const warnings = warningCodes(item).filter((code) => targeted.has(code));
      expect(warnings, item.id + ' warnings').toEqual([]);
    });
    expect(fs.readFileSync(qaScriptPath, 'utf8')).toContain("'feedback-specificity'");
  });
});
