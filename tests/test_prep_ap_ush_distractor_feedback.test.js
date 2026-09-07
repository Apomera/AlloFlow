import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 all 1,800 distractor rationales in the U.S. History pack
// were one of two boilerplate sentences. The feedback now lives in
// dev-tools/ap_us_history_distractor_feedback/ (six part modules keyed by
// short item id and exact distractor text), and the builder refuses to build
// without a match. These tests pin coverage, the matcher's tolerance for
// apostrophe and dash style, and the shipped pack's option-level feedback.
const require = createRequire(import.meta.url);
const feedback = require(resolve(process.cwd(), 'dev-tools/ap_us_history_distractor_feedback/index.cjs'));
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_us_history_foundation_pilot.json');
const BOILERPLATE = /does not fit the evidence or historical relationship/i;
let cachedPack;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};
const SLOW = 90_000;

describe('AP U.S. History distractor feedback module', () => {
  it('covers every distractor of every item with its own sentence', () => {
    const pack = readPack();
    expect(Object.keys(feedback.AP_US_HISTORY_DISTRACTOR_FEEDBACK)).toHaveLength(pack.items.length);
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

  it('expands short ids and matches distractors regardless of apostrophe or dash style', () => {
    const id = feedback.ID_PREFIX + '027';
    const curly = 'The constitution had no effect because law never matters in history.';
    expect(feedback.distractorFeedbackFor(id, curly)).toBeTruthy();
    expect(feedback.distractorFeedbackFor(id, '  ' + curly + ' ')).toBe(feedback.distractorFeedbackFor(id, curly));
    const withApostrophe = feedback.ID_PREFIX + '032';
    const straight = "The workers' demands must be false because the paper omits them.";
    const curlyApostrophe = 'The workers’ demands must be false because the paper omits them.';
    expect(feedback.distractorFeedbackFor(withApostrophe, straight)).toBeTruthy();
    expect(feedback.distractorFeedbackFor(withApostrophe, straight)).toBe(feedback.distractorFeedbackFor(withApostrophe, curlyApostrophe));
    expect(feedback.distractorFeedbackFor(id, 'Not a choice')).toBeNull();
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
