import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
});

describe('Fisher Lab conservation-violation semantics', () => {
  it('does not penalize voluntary release of a legally retainable specimen', () => {
    const { isCoreConservationViolation } = window.__FisherLabCore;

    expect(isCoreConservationViolation('release', true)).toBe(false);
  });

  it('keeps assessment mistakes separate from conservation harm when the specimen is released', () => {
    const { isCoreConservationViolation } = window.__FisherLabCore;

    // A learner may identify the wrong rule or classification, but the safe
    // disposition still avoids a regulations violation.
    expect(isCoreConservationViolation('release', false)).toBe(false);
    expect(isCoreConservationViolation('release', true)).toBe(false);
  });

  it('counts only unlawful retention as a conservation violation', () => {
    const { isCoreConservationViolation } = window.__FisherLabCore;

    expect(isCoreConservationViolation('keep', false)).toBe(true);
    expect(isCoreConservationViolation('retain', false)).toBe(true);
    expect(isCoreConservationViolation('keep', true)).toBe(false);
    expect(isCoreConservationViolation('retain', true)).toBe(false);
  });

  it('uses legality and disposition—not answer correctness—to update voyage violations', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('function resolveCatch(');
    const end = source.indexOf('function landFishingEncounter(', start);
    const resolveBlock = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(resolveBlock).toContain('isCoreConservationViolation');
    expect(resolveBlock).not.toMatch(/regulationError\s*=\s*kind\s*===\s*['"]shellfish['"]\s*\?\s*!correct/);
    expect(resolveBlock).not.toMatch(/regsViolations\s*\+=\s*[^;]*(?:ruleCorrect|!correct)/);
  });

  it('passes the actual legal-retention result through both catch decision paths', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const fishStart = source.indexOf('function submitFishDecision(');
    const fishEnd = source.indexOf('function continueAfterFishReview(', fishStart);
    const shellfishStart = source.indexOf('function submitShellfishDecision(');
    const shellfishEnd = source.indexOf('function continueAfterShellfishReview(', shellfishStart);
    const fishBlock = source.slice(fishStart, fishEnd);
    const shellfishBlock = source.slice(shellfishStart, shellfishEnd);

    expect(fishStart).toBeGreaterThan(-1);
    expect(shellfishStart).toBeGreaterThan(-1);
    expect(fishBlock).toMatch(/legalToRetain:\s*ruleResult\.legalToRetain|legalToRetain:\s*result\.legalToRetain/);
    expect(shellfishBlock).toMatch(/legalToRetain:\s*!!?activeLobster\.isKeeper/);
  });
});
