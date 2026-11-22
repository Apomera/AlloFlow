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

const looksLikeProse = (choice) => String(choice || '').length > 45 || /[.!?]$/.test(String(choice || '').trim());

describe('AP Calculus AB and AP Psychology quality overhaul', () => {
  it('keeps AP Calculus AB free of short prompts, extreme distractors, and prose key-length cues', () => {
    const pack = loadJson('test_prep/ap_calculus_ab_foundation_pilot.json');
    const itemStats = summarizeChoiceLengths(pack.items);
    expect(itemStats.total).toBe(160);
    expect(itemStats.severe).toBe(0);
    expect(itemStats.strict).toBeLessThanOrEqual(6);

    const warnings = collectWarnings(pack.items);
    expect(warnings).toEqual({});
  });

  it('keeps AP Psychology items and library checks free of restatement, key-echo, detail, and extreme-qualifier tells', () => {
    const pack = loadJson('test_prep/ap_psychology_pilot.json');
    const lib = loadJson('test_prep/ap_psychology_pilot_learning_library.json');

    expect(pack.items).toHaveLength(500);
    const proseLongest = pack.items.filter((item) => {
      if (!item.choices.some(looksLikeProse)) return false;
      const keyLen = String(item.choices[item.answerIndex] || '').length;
      const maxOther = Math.max(
        ...item.choices.filter((_, idx) => idx !== item.answerIndex).map((c) => String(c || '').length)
      );
      return keyLen >= maxOther;
    });
    // Only pinned seed item ap-psych-u1-005 remains prose key>=maxD.
    expect(proseLongest.length).toBeLessThanOrEqual(1);

    const warnings = collectWarnings(pack.items);
    expect(warnings).toEqual({});

    const checks = lib.chapters.flatMap((ch) => ch.knowledgeChecks || []);
    expect(checks).toHaveLength(25);
    const checkStats = summarizeChoiceLengths(checks);
    expect(checkStats.severe).toBe(0);
    expect(checkStats.strict).toBeLessThanOrEqual(2);
    expect(checkStats.tied / checkStats.total).toBeLessThanOrEqual(0.2);
    expect(new Set(checks.map((ck) => ck.answerIndex)).size).toBe(4);
  });
});
