import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/praxis_core_5752_pack.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_praxis_core_5752_pack.cjs');
const BOILERPLATE = /does not satisfy the complete task/i;

let cachedPack;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};

describe('Praxis Core 5752 diagnostic item quality', () => {
  it('eliminates severe answer-length cues across all 200 diagnostic items', () => {
    const items = readPack().items.slice(0, 200);
    expect(items).toHaveLength(200);
    items.forEach((item) => {
      const lengths = item.choices.map((choice) => String(choice || '').length);
      const keyLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      expect(keyLength, item.id + ' exceeds 1.25x longest distractor').toBeLessThan(longestDistractor * 1.25);
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

  it('keeps Batch 2 variant prompts aligned with their own scenario choices and variables', () => {
    const byId = new Map(readPack().items.slice(0, 200).map((item) => [item.id, item]));

    const libThesis = byId.get('core5752-b2-038');
    expect(libThesis.prompt).toContain('extend library hours');
    expect(libThesis.choices.every((choice) => /librar(?:y|ies)/i.test(choice))).toBe(true);

    const conciseApp = byId.get('core5752-b2-042');
    expect(conciseApp.prompt).toContain('reviewing each and every application');
    expect(conciseApp.choices.every((choice) => /application/i.test(choice))).toBe(true);

    const modifierImani = byId.get('core5752-b2-050');
    expect(modifierImani.prompt).toContain('Imani');
    expect(modifierImani.choices.every((choice) => /Imani/.test(choice))).toBe(true);

    const inkRate = byId.get('core5752-b2-071');
    expect(inkRate.prompt).toContain('liters of ink');
    expect(inkRate.choices[inkRate.answerIndex]).toBe('7.5 liters');

    const workshopCost = byId.get('core5752-b2-091');
    expect(workshopCost.prompt).toContain('v workshops');
    expect(workshopCost.choices[workshopCost.answerIndex]).toBe('12 + 4v');
    expect(workshopCost.choices.every((choice) => /v/.test(choice) && !/m/.test(choice))).toBe(true);
  });
});
