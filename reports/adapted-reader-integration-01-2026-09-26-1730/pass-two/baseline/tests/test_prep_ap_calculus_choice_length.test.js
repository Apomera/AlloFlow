import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 the AP Calculus AB pack rewarded a test-wiseness heuristic:
// in 29 of 160 items the key ran at least a quarter longer than every
// distractor. Most were prose claims and were rewritten to match; six offer
// bare numbers or symbolic expressions, where padding would mean writing a
// value nobody would ever compute. Those were fixed by replacing a distractor
// with a genuine slip of comparable length, or by putting the whole option set
// into one format.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_calculus_ab_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_calculus_ab_foundation.cjs');
const PREFIX = 'ap-calculus-ab-foundation-pilot-item-';
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

describe('AP Calculus AB choice-length parity', () => {
  it('keeps every key within a quarter of its longest distractor', () => {
    const pack = readPack();
    expect(pack.items.length).toBe(160);
    pack.items.forEach((item) => {
      const { key, others } = lengths(item);
      expect(others, item.id).toHaveLength(3);
      expect(key, item.id + ' key runs a quarter longer than any distractor').toBeLessThan(Math.max(...others) * 1.25);
    });
  }, SLOW);

  it('reports no key-length cue', () => {
    const coverage = buildApBlueprintCoverage({ pack: readPack(), library: {} }).testWiseness;
    expect(coverage.keyLongerByQuarterSharePercent).toBe(0);
    expect(coverage.advisories).not.toContain('key-length-cue');
  }, SLOW);

  it('repairs the numeric items with real arithmetic slips rather than padding', () => {
    const byId = new Map(readPack().items.map((item) => [item.id, item]));
    // xy + y^2 = 8 gives y' = -y/(x + 2y) = -1/3 at (2,2). Counting y twice in
    // the numerator gives -2/3; dropping the 2 on the y^2 term gives -1/2.
    const implicit = byId.get(PREFIX + '024');
    expect(implicit.choices[implicit.answerIndex]).toBe('-1/3');
    expect(implicit.choices).toContain('-2/3');
    expect(implicit.choices).toContain('-1/2');
    // (f inverse)'(5) = 1/f'(2) = 1/3; 1/5 reciprocates the output value and
    // 1/2 reciprocates the input, both alongside the uninverted 3.
    const inverse = byId.get(PREFIX + '025');
    expect(inverse.choices[inverse.answerIndex]).toBe('1/3');
    expect(inverse.choices).toContain('1/5');
    expect(inverse.choices).toContain('3');
    // A 0/0 form invites "does not exist", which is both a real misconception
    // and the longest option, so the two-character key no longer stands out.
    const limit = byId.get(PREFIX + '083');
    expect(limit.choices[limit.answerIndex]).toBe('12');
    expect(limit.choices).toContain('The limit does not exist');
    // Decimals put all four options in one format; the fraction key could not
    // be shortened and its short distractors could not be padded.
    const inverseAtOne = byId.get(PREFIX + '105');
    expect(inverseAtOne.choices[inverseAtOne.answerIndex]).toBe('-0.5');
    expect(inverseAtOne.choices).toEqual(['-0.5', '-2.0', '0.5', '2.0']);
    // Equilateral cross-section area is (sqrt(3)/4)s^2; halving instead of
    // quartering is the classic slip and matches the key in length.
    const crossSection = byId.get(PREFIX + '157');
    expect(crossSection.choices[crossSection.answerIndex]).toBe('(sqrt(3)/4)[s(x)]^2');
    expect(crossSection.choices).toContain('(sqrt(3)/2)[s(x)]^2');
  });

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('longestDistractor * 1.25');
  });
});
