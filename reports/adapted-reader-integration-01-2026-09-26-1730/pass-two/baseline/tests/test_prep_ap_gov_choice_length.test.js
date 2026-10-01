import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 the AP U.S. Government pack rewarded a test-wiseness
// heuristic: in 164 of 260 items the key ran at least a quarter longer than
// every distractor, so "pick the elaborated option" beat reading the question.
// The distractors in those items were rewritten to be parallel in structure and
// length, and qa_ap_us_government_foundation.cjs now fails on any item where the
// key exceeds 1.25x its longest distractor. These tests pin the shipped pack.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_us_government_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_us_government_foundation.cjs');
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

describe('AP U.S. Government choice-length parity', () => {
  it('keeps every key within a quarter of its longest distractor', () => {
    const pack = readPack();
    expect(pack.items.length).toBe(260);
    pack.items.forEach((item) => {
      const { key, others } = lengths(item);
      expect(others, item.id).toHaveLength(3);
      expect(key, item.id + ' key runs a quarter longer than any distractor').toBeLessThan(Math.max(...others) * 1.25);
    });
  }, SLOW);

  it('reports no key-length cue in blueprint coverage', () => {
    const coverage = buildApBlueprintCoverage({ pack: readPack(), library: {} }).testWiseness;
    expect(coverage.keyLongerByQuarterSharePercent).toBe(0);
    expect(coverage.advisories).not.toContain('key-length-cue');
    // The rewrite must not have created a new cue by reusing choice sets.
    expect(coverage.largestSharedChoiceSet).toBeLessThan(10);
  }, SLOW);

  it('leaves no distractor stranded far below its key', () => {
    // Parallel options, not padding: the shortest distractor of an item stays a
    // recognisable fraction of the key rather than a two-word throwaway.
    const pack = readPack();
    pack.items.forEach((item) => {
      const { key, others } = lengths(item);
      expect(Math.min(...others) / key, item.id).toBeGreaterThan(0.4);
    });
  }, SLOW);

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('longestDistractor * 1.25');
  });
});
