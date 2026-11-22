import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes, canonical } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));

describe('All 31 Test Prep learning libraries knowledge-check quality gate', () => {
  it('keeps all 1,601 four-choice knowledge checks across all 31 libraries free of warnings and severe length cues', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const files = fs.readdirSync(testPrepDir).filter((n) => n.endsWith('_learning_library.json')).sort();
    expect(files).toHaveLength(31);

    let total = 0;
    let tied = 0;
    let severe = 0;
    const warnings = {};

    for (const name of files) {
      const lib = JSON.parse(fs.readFileSync(resolve(testPrepDir, name), 'utf8'));
      const stem = name.replace('_learning_library.json', '');
      const isNonEppp60 = !stem.startsWith('ap_') && stem !== 'eppp';
      const ansDist = [0, 0, 0, 0];
      const promptSet = new Set();

      for (const ch of lib.chapters || lib.units || []) {
        for (const ck of ch.knowledgeChecks || ch.checks || []) {
          if (!Array.isArray(ck.choices) || ck.choices.length !== 4) continue;
          total += 1;
          ansDist[ck.answerIndex] += 1;
          const canonPrompt = canonical(ck.prompt);
          expect(promptSet.has(canonPrompt), `${stem}/${ck.id} duplicate prompt`).toBe(false);
          promptSet.add(canonPrompt);
          expect(new Set(ck.choices).size, `${stem}/${ck.id} duplicate choices`).toBe(4);

          const kl = String(ck.choices[ck.answerIndex] || '').length;
          const md = Math.max(...ck.choices.filter((_, i) => i !== ck.answerIndex).map((c) => String(c || '').length));
          if (kl >= md) tied += 1;
          if (kl >= md * 1.25) severe += 1;
          const codes = warningCodes(ck);
          if (codes.length) warnings[`${stem}/${ck.id}`] = codes;
        }
      }
      if (isNonEppp60) {
        expect(ansDist, `${stem} answer position balance`).toEqual([15, 15, 15, 15]);
      }
    }

    expect(total).toBe(1601);
    expect(warnings).toEqual({});
    expect(severe).toBe(0);
    expect(tied / total).toBeLessThan(0.20);
  });
});
