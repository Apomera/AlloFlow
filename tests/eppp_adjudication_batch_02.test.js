import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));

describe('EPPP claim-level adjudication batch 02', () => {
  it('reviews a blueprint-spanning set without releasing or repeating candidates', () => {
    const report = read('test_prep/eppp_legacy/adjudication_batch_02.json');
    const prior = read('test_prep/eppp_legacy/adjudication_batch_01.json');
    const native = read('test_prep/eppp_native_items.json');
    const priorIds = new Set(prior.items.map((item) => item.legacyId));
    const nativeIds = new Set(native.map((item) => item.legacySourceId).filter(Boolean));

    expect(report.status).toBe('editorial-adjudication-complete-still-quarantined');
    expect(report.summary).toEqual({
      adjudicatedCandidates: 10,
      minorRevision: 4,
      majorRewrite: 6,
      promotedToNativeBank: 0,
      independentExpertValidated: 0,
      domainDistribution: { biological: 2, 'cognitive-affective': 1, 'social-cultural': 1, lifespan: 1, assessment: 2, intervention: 1, research: 1, professional: 1 },
    });
    expect(report.items).toHaveLength(10);
    expect(report.items.some((item) => priorIds.has(item.legacyId) || nativeIds.has(item.legacyId))).toBe(false);
    expect(report.items.every((item) => item.workflowStage === 'editorial-adjudicated-quarantine' && item.learnerVisibleInNativeBank === false)).toBe(true);
    expect(report.items.every((item) => item.independentExpertStatus === 'not-started' && item.productionStatus === 'not-production-validated')).toBe(true);
  });

  it('requires complete questions, per-option feedback, findings, and provenance', () => {
    const report = read('test_prep/eppp_legacy/adjudication_batch_02.json');
    for (const item of report.items) {
      expect(item.findings.length).toBeGreaterThanOrEqual(2);
      expect(['minor-revision', 'major-rewrite']).toContain(item.decision);
      expect(item.revisedItem.choices).toHaveLength(4);
      expect(item.revisedItem.choiceRationales).toHaveLength(4);
      expect(item.revisedItem.rationale.length).toBeGreaterThanOrEqual(140);
      expect(item.revisedItem.choiceRationales.every((text) => text.length >= 90)).toBe(true);
      for (const source of item.revisedItem.sourceDetails) {
        expect(source.title.length).toBeGreaterThanOrEqual(12);
        expect(source.organization.length).toBeGreaterThanOrEqual(12);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.credibility.length).toBeGreaterThanOrEqual(120);
      }
    }
  });

  it('keeps deployment artifacts identical to their source artifacts', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_legacy/adjudication_batch_02.json')).toEqual(read('test_prep/eppp_legacy/adjudication_batch_02.json'));
    expect(fs.readFileSync(resolve(root, 'desktop/web-app/public/test_prep/eppp_legacy/adjudication_batch_02.md'), 'utf8')).toBe(fs.readFileSync(resolve(root, 'test_prep/eppp_legacy/adjudication_batch_02.md'), 'utf8'));
  });
});
