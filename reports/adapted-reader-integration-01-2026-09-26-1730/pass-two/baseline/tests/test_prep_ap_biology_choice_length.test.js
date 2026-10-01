import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 the AP Biology pack rewarded a test-wiseness heuristic: in
// 194 of 500 items the key ran at least a quarter longer than every distractor.
// The distractors in those items were rewritten to be parallel in structure and
// length. One amplification item was numeric (480 against 24, 48, and 80), so a
// distractor was replaced with 128, an arithmetic slip of the same digit count,
// and its stale reason line was corrected at the same time.
// qa_ap_biology_foundation.cjs now fails any item whose key exceeds 1.25x its
// longest distractor.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_biology_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_biology_foundation.cjs');
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

describe('AP Biology choice-length parity', () => {
  it('keeps every key within a quarter of its longest distractor', () => {
    const pack = readPack();
    expect(pack.items.length).toBe(500);
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
    expect(coverage.largestSharedChoiceSet).toBeLessThan(10);
  }, SLOW);

  it('keeps the amplification item numeric and answerable', () => {
    const item = readPack().items.find((candidate) => candidate.id === 'ap-bio-u4-371');
    expect(item).toBeTruthy();
    // 1 receptor x 8 relays x 6 enzymes x 10 messengers.
    expect(item.choices[item.answerIndex]).toBe('480');
    expect(new Set(item.choices)).toEqual(new Set(['480', '128', '48', '80']));
    // 8 x (6 + 10): the replacement distractor is a real slip, and its reason
    // must describe that slip rather than the one the old value implied.
    const noteFor128 = item.choiceRationales[item.choices.indexOf('128')];
    expect(noteFor128).toContain('128');
    expect(noteFor128).toMatch(/sum of the enzyme and messenger counts/);
  });

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('longestDistractor * 1.25');
  });
});
