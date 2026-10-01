import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 every one of the Statistics pack's 720 distractor
// rationales was the same sentence. The feedback now lives in
// dev-tools/ap_statistics_distractor_feedback/ (three part modules keyed by
// short item id and exact distractor text), and the builder refuses to build
// without a match. These tests pin coverage, the matcher's tolerance for
// apostrophe and minus-sign style, and the shipped pack's feedback.
const require = createRequire(import.meta.url);
const feedback = require(resolve(process.cwd(), 'dev-tools/ap_statistics_distractor_feedback/index.cjs'));
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_statistics_foundation_pilot.json');
const BOILERPLATE = /does not match the statistical definition, calculation, or scope/i;
let cachedPack;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};
const SLOW = 60_000;

describe('AP Statistics distractor feedback module', () => {
  it('covers every distractor of every item with its own sentence', () => {
    const pack = readPack();
    expect(Object.keys(feedback.AP_STATISTICS_DISTRACTOR_FEEDBACK)).toHaveLength(pack.items.length);
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

  it('expands short ids and matches distractors regardless of minus-sign or apostrophe style', () => {
    const id = feedback.PACK_ID + '-item-007';
    expect(feedback.distractorFeedbackFor(id, '−2')).toBeTruthy();
    expect(feedback.distractorFeedbackFor(id, '-2')).toBe(feedback.distractorFeedbackFor(id, '−2'));
    expect(feedback.distractorFeedbackFor(id, ' 12 ')).toBeTruthy();
    expect(feedback.distractorFeedbackFor(id, '99')).toBeNull();
    expect(feedback.distractorFeedbackFor('no-such-item', '−2')).toBeNull();
    const curly = feedback.distractorFeedbackFor(feedback.PACK_ID + '-item-002', 'The participant’s grade level');
    expect(curly).toBeTruthy();
    expect(feedback.distractorFeedbackFor(feedback.PACK_ID + '-item-002', "The participant's grade level")).toBe(curly);
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
