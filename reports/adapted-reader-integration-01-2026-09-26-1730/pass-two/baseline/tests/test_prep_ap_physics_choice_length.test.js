import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Before 2026-09-07 the AP Physics 1 pack rewarded a test-wiseness heuristic: in
// 240 of 500 items the key ran at least a quarter longer than every distractor.
// The distractors in those items were rewritten to be parallel in structure and
// length, and seven numeric items had their keys trimmed to bare values instead
// (a number cannot be padded without changing the physics), which also keeps the
// Hub's all-numeric shuffle lock intact. qa_ap_physics_1_foundation.cjs now fails
// any item whose key exceeds 1.25x its longest distractor.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));
const packPath = resolve(process.cwd(), 'test_prep/ap_physics_1_foundation_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_physics_1_foundation.cjs');
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

describe('AP Physics 1 choice-length parity', () => {
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

  it('leaves the trimmed numeric items answerable and still numeric', () => {
    // These seven keys carried a stray "Approximately" or spelled-out value that
    // made them the long option in a set of bare numbers.
    const expected = {
      'ap-physics-1-u3-060': '6.3 m/s',
      'ap-physics-1-u5-089': '0 N m',
      'ap-physics-1-u7-124': '15.7 rad/s',
      'ap-physics-1-u1-165': '243 km',
      'ap-physics-1-u3-200': '9.9 m/s',
      'ap-physics-1-u3-210': '44 J increase',
      'ap-physics-1-u3-214': '1960 W',
    };
    const byId = new Map(readPack().items.map((item) => [item.id, item]));
    Object.entries(expected).forEach(([id, key]) => {
      const item = byId.get(id);
      expect(item, id).toBeTruthy();
      expect(item.choices[item.answerIndex], id).toBe(key);
      expect(new Set(item.choices).size, id + ' must keep four distinct choices').toBe(4);
    });
  });

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('longestDistractor * 1.25');
  });
});
