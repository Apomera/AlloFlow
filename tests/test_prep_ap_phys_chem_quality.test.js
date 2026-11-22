import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(resolve(process.cwd(), relPath), 'utf8'));
}

function summarizeChoiceLengths(items) {
  let tied = 0;
  let strict = 0;
  let severe = 0;
  for (const item of items) {
    const keyLen = String(item.choices[item.answerIndex] || '').length;
    const maxOther = Math.max(
      ...item.choices.filter((_, idx) => idx !== item.answerIndex).map((c) => String(c || '').length)
    );
    if (keyLen >= maxOther) tied += 1;
    if (keyLen > maxOther) strict += 1;
    if (keyLen >= maxOther * 1.25) severe += 1;
  }
  return { total: items.length, tied, strict, severe };
}

function collectWarnings(items) {
  const counts = {};
  for (const item of items) {
    for (const code of warningCodes(item)) {
      counts[code] = (counts[code] || 0) + 1;
    }
  }
  return counts;
}

describe('AP Physics 1 and AP Chemistry quality overhaul', () => {
  it('keeps AP Physics 1 items and section-specific library checks balanced and free of targeted tells', () => {
    const pack = loadJson('test_prep/ap_physics_1_foundation_pilot.json');
    const lib = loadJson('test_prep/ap_physics_1_foundation_pilot_learning_library.json');

    const itemStats = summarizeChoiceLengths(pack.items);
    expect(itemStats.total).toBe(500);
    expect(itemStats.severe).toBe(0);
    expect(itemStats.strict).toBeLessThanOrEqual(5);
    expect(itemStats.tied / itemStats.total).toBeLessThan(0.15);

    const warnings = collectWarnings(pack.items);
    expect(warnings).toEqual({});

    const checks = lib.chapters.flatMap((ch) => ch.knowledgeChecks || []);
    expect(checks).toHaveLength(24);
    expect(new Set(checks.map((ck) => ck.prompt)).size).toBe(24);
    expect(checks.every((ck) => !/^Which (?:reasoning|study) move /.test(ck.prompt))).toBe(true);
    const checkStats = summarizeChoiceLengths(checks);
    expect(checkStats.severe).toBe(0);
    expect(checkStats.tied / checkStats.total).toBeLessThanOrEqual(0.25);
    expect(new Set(checks.map((ck) => ck.answerIndex)).size).toBe(4);
  });

  it('keeps AP Chemistry items and library checks balanced and free of targeted tells', () => {
    const pack = loadJson('test_prep/ap_chemistry_foundation_pilot.json');
    const lib = loadJson('test_prep/ap_chemistry_foundation_pilot_learning_library.json');

    const itemStats = summarizeChoiceLengths(pack.items);
    expect(itemStats.total).toBe(700);
    expect(itemStats.severe).toBe(0);
    expect(itemStats.strict).toBeLessThanOrEqual(15);
    expect(itemStats.tied / itemStats.total).toBeLessThan(0.15);

    const warnings = collectWarnings(pack.items);
    expect(warnings).toEqual({});

    const checks = lib.chapters.flatMap((ch) => ch.knowledgeChecks || []);
    expect(checks).toHaveLength(27);
    const checkStats = summarizeChoiceLengths(checks);
    // Only the 4-char vs 3-char numeric check (0.25 vs 4.0) remains strict/severe.
    expect(checkStats.severe).toBeLessThanOrEqual(1);
    expect(checkStats.strict).toBeLessThanOrEqual(1);
    expect(checkStats.tied / checkStats.total).toBeLessThanOrEqual(0.2);
  });
});
