import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));

describe('EPPP cumulative adjudication index', () => {
  it('indexes seven batches and seventy unique quarantined candidates', () => {
    const index = read('test_prep/eppp_legacy/adjudication_index.json');
    const ids = index.items.map((item) => item.legacyId);
    expect(index.status).toBe('editorial-adjudication-index-all-candidates-quarantined');
    expect(index.currentSourceReviewDate).toBe('2026-07-14');
    expect(index.summary.batchCount).toBe(7);
    expect(index.summary.adjudicatedCandidates).toBe(70);
    expect(index.summary.minorRevision + index.summary.majorRewrite).toBe(70);
    expect(index.summary.promotedToNativeBank).toBe(0);
    expect(index.summary.independentExpertValidated).toBe(0);
    expect(index.summary.learnerVisibleCandidates).toBe(0);
    expect(index.batches).toHaveLength(7);
    expect(index.items).toHaveLength(70);
    expect(new Set(ids).size).toBe(70);
    expect(index.items.every((item) => item.workflowStage === 'editorial-adjudicated-quarantine' && item.learnerVisibleInNativeBank === false && item.independentExpertStatus === 'not-started' && item.productionStatus === 'not-production-validated')).toBe(true);
  });

  it('matches the batch reports and excludes every candidate from the native bank', () => {
    const index = read('test_prep/eppp_legacy/adjudication_index.json');
    const reports = ['01', '02', '03', '04', '05', '06', '07'].map((batch) => read(`test_prep/eppp_legacy/adjudication_batch_${batch}.json`));
    const batchItems = reports.flatMap((report) => report.items);
    const nativeIds = new Set(read('test_prep/eppp_native_items.json').map((item) => item.legacySourceId).filter(Boolean));
    expect(index.summary.minorRevision).toBe(reports.reduce((sum, report) => sum + report.summary.minorRevision, 0));
    expect(index.summary.majorRewrite).toBe(reports.reduce((sum, report) => sum + report.summary.majorRewrite, 0));
    expect(new Set(index.items.map((item) => item.legacyId))).toEqual(new Set(batchItems.map((item) => item.legacyId)));
    expect(index.items.some((item) => nativeIds.has(item.legacyId))).toBe(false);
    expect(index.items.every((item) => item.sourceCount > 0)).toBe(true);
  });

  it('keeps deployment artifacts identical to source artifacts', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_legacy/adjudication_index.json')).toEqual(read('test_prep/eppp_legacy/adjudication_index.json'));
    expect(fs.readFileSync(resolve(root, 'desktop/web-app/public/test_prep/eppp_legacy/adjudication_index.md'), 'utf8')).toBe(fs.readFileSync(resolve(root, 'test_prep/eppp_legacy/adjudication_index.md'), 'utf8'));
  });
});
