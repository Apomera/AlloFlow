import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 the AP Chemistry pack rewarded a test-wiseness heuristic:
// in 201 of 700 items the key ran at least a quarter longer than every
// distractor. Those 600 distractors were rewritten to be parallel in length,
// keeping each one's misconception intact because this pack stores its
// per-distractor reasons positionally. Three items could not be fixed by
// rewriting distractors at all, because their options are bare formulas or
// numbers; those changed the key instead.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_chemistry_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_chemistry_foundation.cjs');
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

describe('AP Chemistry choice-length parity', () => {
  it('keeps every key within a quarter of its longest distractor', () => {
    const pack = readPack();
    expect(pack.items.length).toBe(700);
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

  it('fixes the three formula and numeric items by rewriting the key, not by padding', () => {
    const byId = new Map(readPack().items.map((item) => [item.id, item]));
    // Naming the charge keeps all four ions parallel and is the property the
    // radius comparison actually turns on.
    const radius = byId.get('ap-chem-u1-194');
    expect(radius.choices[radius.answerIndex]).toBe('Mg2+, a doubly charged cation');
    expect(radius.choices).toContain('O2-, a doubly charged anion');
    // A formula key cannot be shortened, so the distractors gained their names.
    const amphiprotic = byId.get('ap-chem-u8-302');
    expect(amphiprotic.choices[amphiprotic.answerIndex]).toBe('HCO3-, the bicarbonate ion');
    expect(amphiprotic.choices).toContain('CH4, the methane molecule');
    // A formal charge of zero written as a word stood out beside -2, +1 and +2.
    const formalCharge = byId.get('ap-chem-u2-387');
    expect(formalCharge.choices[formalCharge.answerIndex]).toBe('0');
    expect(formalCharge.choices).toEqual(['-2', '+1', '0', '+2']);
  });

  it('keeps the electrolysis charges consistent after adding parallel conversions', () => {
    const byId = new Map(readPack().items.map((item) => [item.id, item]));
    // 1 F is 96485 C, so each faraday option now carries its own coulomb value
    // rather than leaving that conversion only on the key.
    const twoFaraday = byId.get('ap-chem-u9-180');
    expect(twoFaraday.choices).toContain('Approximately 0.500 F, or 4.82 times 10 to the 4 C');
    expect(twoFaraday.choices).toContain('Approximately 4.00 F, or 3.86 times 10 to the 5 C');
    const oneFaraday = byId.get('ap-chem-u9-339');
    expect(oneFaraday.choices).toContain('Approximately 0.250 faraday, or 24121 C');
    expect(oneFaraday.choices).toContain('Approximately 2.00 faradays, or 192970 C');
  });

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('longestDistractor * 1.25');
  });
});
