import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));

describe('EPPP claim-level adjudication batch 01', () => {
  it('deeply reviews the ten lowest-risk candidates without releasing them', () => {
    const report = read('test_prep/eppp_legacy/adjudication_batch_01.json');
    const native = read('test_prep/eppp_native_items.json');
    const nativeLegacyIds = new Set(native.map((item) => item.legacySourceId).filter(Boolean));

    expect(report.status).toBe('editorial-adjudication-complete-still-quarantined');
    expect(report.summary).toEqual({ adjudicatedCandidates: 10, minorRevision: 4, majorRewrite: 6, promotedToNativeBank: 0, independentExpertValidated: 0 });
    expect(report.items).toHaveLength(10);
    expect(report.items.some((item) => nativeLegacyIds.has(item.legacyId))).toBe(false);
    expect(report.items.every((item) => item.workflowStage === 'editorial-adjudicated-quarantine' && item.learnerVisibleInNativeBank === false)).toBe(true);
    expect(report.items.every((item) => item.independentExpertStatus === 'not-started' && item.productionStatus === 'not-production-validated')).toBe(true);
  });

  it('requires revised four-option questions with complete explanatory feedback', () => {
    const report = read('test_prep/eppp_legacy/adjudication_batch_01.json');
    for (const item of report.items) {
      expect(item.findings.length).toBeGreaterThanOrEqual(2);
      expect(['minor-revision', 'major-rewrite']).toContain(item.decision);
      expect(item.revisedItem.choices).toHaveLength(4);
      expect(item.revisedItem.choiceRationales).toHaveLength(4);
      expect(item.revisedItem.rationale.length).toBeGreaterThanOrEqual(140);
      expect(item.revisedItem.choiceRationales.every((text) => text.length >= 90)).toBe(true);
    }
  });

  it('uses full source names, stable URLs, credibility explanations, and matching deployment artifacts', () => {
    const report = read('test_prep/eppp_legacy/adjudication_batch_01.json');
    const deployed = read('desktop/web-app/public/test_prep/eppp_legacy/adjudication_batch_01.json');
    for (const item of report.items) {
      expect(item.revisedItem.sourceDetails.length).toBeGreaterThan(0);
      for (const source of item.revisedItem.sourceDetails) {
        expect(source.title.length).toBeGreaterThanOrEqual(12);
        expect(source.organization.length).toBeGreaterThanOrEqual(12);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.credibility.length).toBeGreaterThanOrEqual(120);
      }
    }
    expect(deployed).toEqual(report);
  });
});
