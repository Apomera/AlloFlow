import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));

describe('EPPP claim-level adjudication batch 06', () => {
  it('reviews ten high-risk candidates without releasing or repeating them', () => {
    const report = read('test_prep/eppp_legacy/adjudication_batch_06.json');
    const priorIds = new Set(['01', '02', '03', '04', '05'].flatMap((batch) => read(`test_prep/eppp_legacy/adjudication_batch_${batch}.json`).items.map((item) => item.legacyId)));
    const nativeIds = new Set(read('test_prep/eppp_native_items.json').map((item) => item.legacySourceId).filter(Boolean));

    expect(report.status).toBe('editorial-adjudication-complete-still-quarantined');
    expect(report.currentSourceReviewDate).toBe('2026-07-14');
    expect(report.summary).toEqual({
      adjudicatedCandidates: 10,
      minorRevision: 2,
      majorRewrite: 8,
      promotedToNativeBank: 0,
      independentExpertValidated: 0,
      domainDistribution: { biological: 1, 'cognitive-affective': 1, 'social-cultural': 1, lifespan: 1, assessment: 2, intervention: 2, research: 1, professional: 1 },
    });
    expect(report.items).toHaveLength(10);
    expect(report.items.some((item) => priorIds.has(item.legacyId) || nativeIds.has(item.legacyId))).toBe(false);
    expect(report.items.every((item) => item.workflowStage === 'editorial-adjudicated-quarantine' && item.learnerVisibleInNativeBank === false)).toBe(true);
    expect(report.items.every((item) => item.independentExpertStatus === 'not-started' && item.productionStatus === 'not-production-validated')).toBe(true);
    expect(report.items.map((item) => item.revisedItem.answerIndex)).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1]);
  });

  it('requires distinct options, complete feedback, findings, and named provenance', () => {
    const report = read('test_prep/eppp_legacy/adjudication_batch_06.json');
    for (const item of report.items) {
      expect(item.findings.length).toBeGreaterThanOrEqual(2);
      expect(['minor-revision', 'major-rewrite']).toContain(item.decision);
      expect(item.revisedItem.choices).toHaveLength(4);
      expect(new Set(item.revisedItem.choices).size).toBe(4);
      expect(item.revisedItem.choices.every((choice) => choice.trim().length >= 20)).toBe(true);
      expect(item.revisedItem.choiceRationales).toHaveLength(4);
      expect(item.revisedItem.rationale.length).toBeGreaterThanOrEqual(140);
      expect(item.revisedItem.choiceRationales.every((text) => text.length >= 90)).toBe(true);
      expect(item.revisedItem.sourceDetails.length).toBeGreaterThan(0);
      for (const source of item.revisedItem.sourceDetails) {
        expect(source.title.length).toBeGreaterThanOrEqual(12);
        expect(source.organization.length).toBeGreaterThanOrEqual(12);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.credibility.length).toBeGreaterThanOrEqual(120);
      }
    }
  });

  it('keeps deployment artifacts identical to source artifacts', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_legacy/adjudication_batch_06.json')).toEqual(read('test_prep/eppp_legacy/adjudication_batch_06.json'));
    expect(fs.readFileSync(resolve(root, 'desktop/web-app/public/test_prep/eppp_legacy/adjudication_batch_06.md'), 'utf8')).toBe(fs.readFileSync(resolve(root, 'test_prep/eppp_legacy/adjudication_batch_06.md'), 'utf8'));
  });
});
