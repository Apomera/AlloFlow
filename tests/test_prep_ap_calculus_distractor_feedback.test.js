import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const feedback = require(resolve(process.cwd(), 'dev-tools/ap_calculus_ab_distractor_feedback/index.cjs'));
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_calculus_ab_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_calculus_ab_foundation.cjs');
const BOILERPLATE = /Recheck this topic move:/i;
let cachedPack;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};
const SLOW = 60_000;

describe('AP Calculus AB distractor feedback module', () => {
  it('covers every distractor of every item with a unique, non-generic explanation', () => {
    const pack = readPack();
    expect(Object.keys(feedback.AP_CALCULUS_AB_DISTRACTOR_FEEDBACK)).toHaveLength(pack.items.length);
    const seen = new Set();
    pack.items.forEach((item) => {
      const distractors = item.choices.filter((_, index) => index !== item.answerIndex);
      expect(distractors, item.id).toHaveLength(3);
      distractors.forEach((choice) => {
        const note = feedback.distractorFeedbackFor(item.id, choice);
        expect(note, item.id + ' :: ' + choice).toBeTruthy();
        expect(note.length, item.id).toBeGreaterThanOrEqual(40);
        expect(note, item.id).not.toMatch(BOILERPLATE);
        expect(seen.has(note), item.id + ' reuses a note: ' + note).toBe(false);
        seen.add(note);
      });
    });
    expect(seen.size).toBe(480);
  }, SLOW);

  it('expands short ids and normalizes apostrophe and minus-sign styles', () => {
    const id = feedback.PACK_ID + '-item-024';
    expect(feedback.distractorFeedbackFor(id, '−2/3')).toBeTruthy();
    expect(feedback.distractorFeedbackFor(id, '-2/3')).toBe(feedback.distractorFeedbackFor(id, '−2/3'));
    expect(feedback.distractorFeedbackFor(id, ' 1/3 ')).toBeTruthy();
    expect(feedback.distractorFeedbackFor(id, '999')).toBeNull();
    expect(feedback.distractorFeedbackFor('no-such-item', '-2/3')).toBeNull();
    const curly = feedback.distractorFeedbackFor(feedback.PACK_ID + '-item-009', 'Some c in (1,4) has f’(c)=0 instead.');
    expect(curly).toBeTruthy();
    expect(feedback.distractorFeedbackFor(feedback.PACK_ID + '-item-009', "Some c in (1,4) has f'(c)=0 instead.")).toBe(curly);
  });

  it('ships in the pack with 480/480 distinct distractor rationales and a QA gate', () => {
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
    expect(coverage.distinctDistractorRationaleCount).toBe(480);
    expect(coverage.distinctDistractorRationaleCount).toBe(coverage.distractorRationaleCount);
    expect(coverage.advisories).not.toContain('distractor-rationales-repeated');
    expect(fs.readFileSync(qaScriptPath, 'utf8')).toContain("'feedback-specificity'");
  }, SLOW);
});
