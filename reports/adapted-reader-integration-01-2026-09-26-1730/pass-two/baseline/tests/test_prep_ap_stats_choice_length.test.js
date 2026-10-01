import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 the AP Statistics pack rewarded a test-wiseness heuristic:
// in 82 of 240 items the key ran at least a quarter longer than every
// distractor. Those distractors were rewritten to be parallel in length, and
// because this pack keys its authored feedback by exact distractor text, every
// rewrite renamed its key in ap_statistics_distractor_feedback/ in the same
// pass. Three items were numeric or symbolic and changed value instead of
// length, so their notes were replaced outright.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const { distractorFeedbackFor } = require(resolve(process.cwd(), 'dev-tools/ap_statistics_distractor_feedback/index.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_statistics_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_statistics_foundation.cjs');
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

describe('AP Statistics choice-length parity', () => {
  it('keeps every key within a quarter of its longest distractor', () => {
    const pack = readPack();
    expect(pack.items.length).toBe(240);
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
    // The rewrite touched the feedback join key, so the round-12 guarantee has
    // to survive it: 720 distractors, 720 distinct authored notes.
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

  it('keeps the three value-changed items answerable', () => {
    const byId = new Map(readPack().items.map((item) => [item.id, item]));
    const prefix = 'ap-statistics-foundation-pilot-item-';
    // 20 of 32 borrowers used a study room; 0.375 is the complement, 12 of 32.
    const conditional = byId.get(prefix + '026');
    expect(conditional.choices[conditional.answerIndex]).toBe('0.625');
    expect(conditional.choices).toContain('0.375');
    expect(distractorFeedbackFor(conditional.id, '0.375')).toMatch(/12 out of 32/);
    // Binomial P(X = 2) for n = 5, p = 0.2, with three same-length wrong forms.
    const binomial = byId.get(prefix + '034');
    expect(binomial.choices[binomial.answerIndex]).toBe('C(5,2)(0.2)^2(0.8)^3');
    expect(new Set(binomial.choices).size).toBe(4);
    // sqrt(np(1 - p)) = sqrt(24); the wrong options now carry the same shape.
    const deviation = byId.get(prefix + '035');
    expect(deviation.choices[deviation.answerIndex]).toBe('sqrt(24), or about 4.90');
    expect(deviation.choices).toContain('sqrt(40), or about 6.32');
    expect(deviation.choices).toContain('sqrt(60), or about 7.75');
  });

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('longestDistractor * 1.25');
  });
});
