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

function collectTargetedWarnings(items) {
  const counts = {};
  for (const item of items) {
    for (const code of warningCodes(item)) {
      counts[code] = (counts[code] || 0) + 1;
    }
  }
  return counts;
}

describe('AP U.S. Government and AP Statistics quality overhaul', () => {
  it('keeps AP U.S. Government items and library checks balanced and free of targeted tells', () => {
    const pack = loadJson('test_prep/ap_us_government_foundation_pilot.json');
    const lib = loadJson('test_prep/ap_us_government_foundation_pilot_learning_library.json');

    const itemStats = summarizeChoiceLengths(pack.items);
    expect(itemStats.total).toBe(260);
    expect(itemStats.severe).toBe(0);
    expect(itemStats.tied / itemStats.total).toBeLessThan(0.15);

    const warnings = collectTargetedWarnings(pack.items);
    expect(warnings).toEqual({});

    const checks = lib.chapters.flatMap((ch) => ch.knowledgeChecks || []);
    expect(checks).toHaveLength(15);
    expect(new Set(checks.map((ck) => ck.prompt)).size).toBe(15);
    const checkStats = summarizeChoiceLengths(checks);
    expect(checkStats.severe).toBe(0);
    expect(checkStats.tied / checkStats.total).toBeLessThanOrEqual(0.25);
    const answerIndices = new Set(checks.map((ck) => ck.answerIndex));
    expect(answerIndices.size).toBe(4);
  });

  it('keeps AP Statistics items and library checks balanced and free of targeted tells', () => {
    const pack = loadJson('test_prep/ap_statistics_foundation_pilot.json');
    const lib = loadJson('test_prep/ap_statistics_foundation_pilot_learning_library.json');

    const itemStats = summarizeChoiceLengths(pack.items);
    expect(itemStats.total).toBe(240);
    expect(itemStats.severe).toBe(0);
    expect(itemStats.tied / itemStats.total).toBeLessThan(0.2);
    expect(itemStats.strict).toBeLessThanOrEqual(5);

    const warnings = collectTargetedWarnings(pack.items);
    expect(warnings).toEqual({});

    const checks = lib.chapters.flatMap((ch) => ch.knowledgeChecks || []);
    expect(checks).toHaveLength(30);
    expect(new Set(checks.map((ck) => ck.prompt)).size).toBe(30);
    const checkStats = summarizeChoiceLengths(checks);
    expect(checkStats.severe).toBe(0);
    expect(checkStats.tied / checkStats.total).toBeLessThanOrEqual(0.3);
    const answerIndices = new Set(checks.map((ck) => ck.answerIndex));
    expect(answerIndices.size).toBe(4);
  });
});
