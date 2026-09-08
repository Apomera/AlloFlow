import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 the AP U.S. History pack rewarded a test-wiseness
// heuristic: in 185 of 600 items the key ran at least a quarter longer than
// every distractor, so a student could pick the longest option without reading
// the history. Those 555 distractors were rewritten to be parallel in length
// across both build stages (the 50-item foundation builder and the extension
// specs), and because this pack keys its authored feedback by exact distractor
// text, every rewrite renamed its key in ap_us_history_distractor_feedback/ in
// the same pass.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const { distractorFeedbackFor } = require(resolve(process.cwd(), 'dev-tools/ap_us_history_distractor_feedback/index.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_us_history_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_us_history_foundation.cjs');
let cachedPack;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};
const lengths = (item) => {
  const all = item.choices.map((choice) => String(choice || '').length);
  return { key: all[item.answerIndex], others: all.filter((_, index) => index !== item.answerIndex) };
};
const SLOW = 30_000;

describe('AP U.S. History choice-length parity', () => {
  it('keeps every key within a quarter of its longest distractor', () => {
    const pack = readPack();
    expect(pack.items.length).toBe(600);
    pack.items.forEach((item) => {
      const { key, others } = lengths(item);
      expect(others, item.id).toHaveLength(3);
      expect(key, item.id + ' key runs a quarter longer than any distractor').toBeLessThan(Math.max(...others) * 1.25);
    });
  }, SLOW);

  it('reports no key-length cue and keeps every distractor rationale distinct', () => {
    const coverage = buildApBlueprintCoverage({ pack: readPack(), library: {} }).testWiseness;
    expect(coverage.keyLongerByQuarterSharePercent).toBe(0);
    expect(coverage.advisories).not.toContain('key-length-cue');
    // The rewrite touched the feedback join key, so the earlier specificity
    // guarantee has to survive it: every distractor keeps its own note.
    expect(coverage.distinctDistractorRationaleCount).toBe(coverage.distractorRationaleCount);
    expect(coverage.advisories).not.toContain('distractor-rationales-repeated');
  }, SLOW);

  it('kept every rewritten distractor matched to its authored feedback', () => {
    // A missed rename would have failed the build, but the lookup is the thing
    // the rewrite could silently break, so it is checked directly here.
    readPack().items.forEach((item) => {
      item.choices.forEach((choice, index) => {
        if (index === item.answerIndex) return;
        expect(distractorFeedbackFor(item.id, choice), item.id + ' :: ' + choice).toBeTruthy();
      });
    });
  }, SLOW);

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('longestDistractor * 1.25');
  });
});
