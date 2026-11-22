import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));

describe('EPPP Learning Library knowledge checks and 2027 Preview quality', () => {
  it('keeps all 109 EPPP Learning Library knowledge checks free of warnings and length tells', () => {
    const lib = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_learning_library.json'), 'utf8'));
    const checks = lib.chapters.flatMap((ch) => ch.knowledgeChecks || []);
    expect(checks).toHaveLength(109);

    let tied = 0;
    let severe = 0;
    const warnings = {};
    for (const ck of checks) {
      const kl = String(ck.choices[ck.answerIndex] || '').length;
      const md = Math.max(...ck.choices.filter((_, i) => i !== ck.answerIndex).map((c) => String(c || '').length));
      if (kl >= md) tied += 1;
      if (kl >= md * 1.25) severe += 1;
      const codes = warningCodes(ck);
      if (codes.length) warnings[ck.id] = codes;
    }
    expect(warnings).toEqual({});
    expect(severe).toBe(0);
    expect(tied).toBe(0);
  });

  it('keeps all 20 EPPP 2027 Preview items free of leakage, brief distractor feedback, and length tells', () => {
    const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_2027_preview_pack.json'), 'utf8'));
    expect(pack.items).toHaveLength(20);

    let tied = 0;
    let severe = 0;
    const unexpectedWarnings = {};
    for (const item of pack.items) {
      const kl = String(item.choices[item.answerIndex] || '').length;
      const md = Math.max(...item.choices.filter((_, i) => i !== item.answerIndex).map((c) => String(c || '').length));
      if (kl >= md) tied += 1;
      if (kl >= md * 1.25) severe += 1;
      const codes = warningCodes(item).filter(
        (code) => !(item.id === 'eppp-2027-preview-ethical-02' && code === 'asymmetric-extreme-distractors')
      );
      if (codes.length) unexpectedWarnings[item.id] = codes;
    }
    expect(unexpectedWarnings).toEqual({});
    expect(severe).toBe(0);
    expect(tied).toBe(0);
  });
});
