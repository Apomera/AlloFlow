import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));
const expectedPerBatch = { biological: 10, 'cognitive-affective': 13, 'social-cultural': 11, lifespan: 12, assessment: 16, intervention: 15, research: 7, professional: 16 };

describe('EPPP next-500 editorial review docket', () => {
  it('creates five balanced 100-item batches that remain quarantined', () => {
    const docket = read('test_prep/eppp_legacy/next_review_docket.json');
    expect(docket.status).toBe('editorial-docket-only-not-released');
    expect(docket.summary).toMatchObject({ docketItems: 500, reviewBatches: 5, itemsPerBatch: 100, remainingQuarantinedItems: 1490 });
    expect(docket.items).toHaveLength(500);

    for (let batch = 1; batch <= 5; batch += 1) {
      const items = docket.items.filter((item) => item.reviewBatch === batch);
      const counts = Object.fromEntries(Object.keys(expectedPerBatch).map((domainId) => [domainId, items.filter((item) => item.domainId === domainId).length]));
      expect(items).toHaveLength(100);
      expect(counts).toEqual(expectedPerBatch);
      expect(items.map((item) => item.positionInBatch)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    }
  });

  it('does not leak docket candidates into the native learner bank', () => {
    const docket = read('test_prep/eppp_legacy/next_review_docket.json');
    const native = read('test_prep/eppp_native_items.json');
    const nativeLegacyIds = new Set(native.map((item) => item.legacySourceId).filter(Boolean));

    expect(native).toHaveLength(1500);
    expect(new Set(docket.items.map((item) => item.legacyId)).size).toBe(500);
    expect(docket.items.some((item) => nativeLegacyIds.has(item.legacyId))).toBe(false);
    for (const item of docket.items) {
      expect(item).toMatchObject({ workflowStage: 'legacy-quarantine-next-review', learnerVisibleInNativeBank: false, contentQaStatus: 'not-started', independentExpertStatus: 'not-started' });
      expect(item.reviewTasks.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(item.editorialRisks)).toBe(true);
    }
  });

  it('records the current official blueprint, future transition, and an identical deploy artifact', () => {
    const docket = read('test_prep/eppp_legacy/next_review_docket.json');
    const deployed = read('desktop/web-app/public/test_prep/eppp_legacy/next_review_docket.json');

    expect(docket.blueprint).toMatchObject({ label: expect.stringContaining('2026–2027'), owner: expect.stringContaining('Association of State and Provincial Psychology Boards') });
    expect(docket.blueprint.officialUrl).toMatch(/^https:\/\/asppb\.net\//);
    expect(docket.transition.notice).toContain('fourth quarter of 2027');
    expect(docket.transition.officialUrl).toMatch(/^https:\/\/asppb\.net\//);
    expect(deployed).toEqual(docket);
  });
});
