import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));
const { deriveGuidedReviewItems } = require(resolve(process.cwd(), 'dev-tools/test_prep_guided_expansion_core.cjs'));

function nonEpppPackStems() {
  return fs.readdirSync(resolve(process.cwd(), 'test_prep'))
    .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))
    .map((name) => name.slice(0, -'_pack.json'.length))
    .sort();
}

describe('Non-EPPP Praxis/ParaPro zero-warning quality gate', () => {
  it('keeps all 11,000 items across all 22 Praxis/ParaPro packs free of warnings', () => {
    const stems = nonEpppPackStems();
    expect(stems).toHaveLength(22);

    const warnings = {};
    for (const stem of stems) {
      const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', stem + '_pack.json'), 'utf8'));
      expect(pack.items).toHaveLength(500);

      for (const item of pack.items) {
        const codes = warningCodes(item);
        if (codes.length > 0) {
          warnings[stem + '/' + item.id] = codes;
        }
      }
    }
    expect(warnings).toEqual({});
  }, 30_000);

  it('keeps representative source-only and batch-3 packs in byte-for-byte guided-review parity', () => {
    for (const stem of ['praxis_core_5752', 'audiology_5343']) {
      const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', stem + '_pack.json'), 'utf8'));
      const authoredCount = Math.max(0, Number(pack.assistantAuthoredIndependentItems) || 0);
      const guidedNeeded = Math.max(0, 500 - 200 - authoredCount);
      const expectedGuided = deriveGuidedReviewItems(pack.items.slice(0, 200)).slice(0, guidedNeeded);
      expect(JSON.stringify(pack.items.slice(200 + authoredCount)), stem + ' guided-review tail parity').toBe(JSON.stringify(expectedGuided));
    }
  }, 30_000);
});
