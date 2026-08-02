import { describe, expect, it } from 'vitest';
import { auditCatalog, parseArgs } from '../dev-tools/audit_reading_catalog.cjs';

describe('reading catalog health audit', () => {
  it('passes the checked-in catalog and reports the expected coverage shape', () => {
    const report = auditCatalog({ staleDays: 99999 });
    expect(report.status).toBe('ok');
    expect(report.summary).toEqual({ error: 0, warning: 0 });
    expect(report.counts.records).toBeGreaterThan(6000);
    expect(report.counts.localFiles).toBe(report.counts.records);
    expect(report.counts.providers).toBeGreaterThanOrEqual(20);
    expect(report.counts.mirrored).toBeGreaterThan(400);
    expect(report.counts.linkOnly).toBeGreaterThan(2500);
    expect(report.providers).toHaveProperty('openstax');
    expect(report.providers).toHaveProperty('african-storybook');
    expect(report.providers).toHaveProperty('book-dash');
  });

  it('keeps audit options strict and workspace-local', () => {
    expect(parseArgs(['--json', '--stale-days', '10'])).toMatchObject({ json: true, staleDays: 10 });
    expect(() => parseArgs(['--stale-days', '-1'])).toThrow(/non-negative/);
    expect(() => parseArgs(['--unknown'])).toThrow(/Unknown option/);
  });
});
