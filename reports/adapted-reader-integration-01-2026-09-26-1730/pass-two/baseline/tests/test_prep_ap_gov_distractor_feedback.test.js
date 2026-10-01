import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 every one of the Government pack's 780 distractor
// rationales was the same sentence ("This choice is not the best answer
// because it does not match..."). The feedback now lives in
// dev-tools/ap_us_government_distractor_feedback/, one entry per item per
// distractor, and the builder refuses to build without a match. These tests
// pin the module's coverage, the matcher's tolerance for apostrophe style, and
// the shipped pack's option-level feedback.
const require = createRequire(import.meta.url);
const feedback = require(resolve(process.cwd(), 'dev-tools/ap_us_government_distractor_feedback/index.cjs'));
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_us_government_foundation_pilot.json');
const BOILERPLATE = /not the best answer because it does not match/i;
let cachedPack;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};
const SLOW = 60_000;

describe('AP Government distractor feedback module', () => {
  it('covers every distractor of every item with its own sentence', () => {
    const pack = readPack();
    expect(Object.keys(feedback.AP_US_GOVERNMENT_DISTRACTOR_FEEDBACK)).toHaveLength(pack.items.length);
    const seen = new Set();
    pack.items.forEach((item) => {
      const distractors = item.choices.filter((_, index) => index !== item.answerIndex);
      expect(distractors, item.id).toHaveLength(3);
      distractors.forEach((choice) => {
        const note = feedback.distractorFeedbackFor(item.id, choice);
        expect(note, item.id + ' :: ' + choice).toBeTruthy();
        expect(note.length, item.id).toBeGreaterThanOrEqual(30);
        expect(note, item.id).not.toMatch(BOILERPLATE);
        expect(seen.has(note), item.id + ' reuses a note').toBe(false);
        seen.add(note);
      });
    });
  }, SLOW);

  it('matches distractors regardless of apostrophe style or spacing', () => {
    const curly = 'The committee is exercising the president’s power to veto enacted law.';
    const straight = "The committee is exercising the president's power to veto enacted law.";
    expect(feedback.distractorFeedbackFor('ap-usg-u2-211', curly)).toBeTruthy();
    expect(feedback.distractorFeedbackFor('ap-usg-u2-211', straight)).toBe(feedback.distractorFeedbackFor('ap-usg-u2-211', curly));
    expect(feedback.distractorFeedbackFor('ap-usg-u2-211', '  The committee  is exercising the president’s power to veto enacted law. ')).toBeTruthy();
    expect(feedback.distractorFeedbackFor('ap-usg-u2-211', 'Not a choice')).toBeNull();
    expect(feedback.distractorFeedbackFor('no-such-item', curly)).toBeNull();
  });

  it('ships in the pack: three specific, distinct notes per item and no repeated sentence', () => {
    const pack = readPack();
    pack.items.forEach((item) => {
      const notes = item.choiceRationales.filter((_, index) => index !== item.answerIndex);
      expect(notes, item.id).toHaveLength(3);
      expect(new Set(notes).size, item.id).toBe(3);
      expect(notes.includes(item.rationale), item.id).toBe(false);
      notes.forEach((note) => expect(note, item.id).not.toMatch(BOILERPLATE));
    });
    expect(pack.capabilities.optionLevelFeedback).toBe('authored-per-distractor');
    const coverage = buildApBlueprintCoverage({ pack, library: {} }).testWiseness;
    expect(coverage.distinctDistractorRationaleCount).toBe(coverage.distractorRationaleCount);
    expect(coverage.advisories).not.toContain('distractor-rationales-repeated');
  }, SLOW);
});
