import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
const read = (p) => JSON.parse(fs.readFileSync(resolve(process.cwd(), p), 'utf8'));

describe('EPPP 1,000-question curation and expansion audit', () => {
  it('covers all 500 added template-v2 questions with passing item-level audit records', () => {
    const bank = read('test_prep/eppp_native_items.json');
    const audit = read('test_prep/eppp_native_expansion_1000_audit.json');
    const added = bank.filter((item) => item.expansionBatch === 'native-501-1000');
    expect(added).toHaveLength(500);
    expect(audit.summary).toMatchObject({ addedItems: 500, totalItems: 1000, addedItemsPassingAllChecks: 500, addedItemsWithFourChoiceRationales: 500, addedItemsWithFullSourceDetails: 500, addedItemsWithSevereLengthClues: 0, status: 'pass' });
    expect(new Set(audit.items.map((item) => item.id))).toEqual(new Set(added.map((item) => item.id)));
    expect(audit.items.every((item) => Object.values(item.checks).every((status) => status === 'pass' || status === 'automated-pass' || status === 'editorial-pass' || status === 'editorial-pass-after-manual-option-review'))).toBe(true);
  });

  it('publishes a deployment-identical 1,000-item curation record and expansion audit', () => {
    const curation = read('test_prep/eppp_legacy/curation_1000.json');
    expect(curation.summary).toMatchObject({ targetItems: 1000, editorialQaPassedItems: 1000, legacySeededReauthoredItems: 962, sourceAuthoredReplacementItems: 30, nativeOriginalItems: 8, pendingItems: 0 });
    expect(curation.batching).toMatchObject({ batchSize: 100, batches: 10 });
    for (const rel of ['eppp_legacy/curation_1000.json', 'eppp_native_expansion_1000_audit.json']) {
      const runtime = fs.readFileSync(resolve(process.cwd(), 'test_prep', rel), 'utf8');
      const deployed = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep', rel), 'utf8');
      expect(deployed).toBe(runtime);
    }
  });
});
