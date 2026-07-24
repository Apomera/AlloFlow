import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

function read(relativePath) {
  return JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

describe('EPPP 500-question curation milestone', () => {
  it('reserves exactly 500 blueprint-weighted slots and reports only QA-passed items as approved', () => {
    const report = read('test_prep/eppp_legacy/curation_500.json');
    expect(report.summary).toMatchObject({
      targetSlots: 500,
      qaPassed: 500,
      selectedPendingQa: 0,
      legacySourceSlots: 492,
      nativeOriginalSlots: 8,
    });
    expect(report.domainSummary.map((domain) => domain.target)).toEqual([50, 65, 55, 60, 80, 75, 35, 80]);
    expect(report.domainSummary.reduce((sum, domain) => sum + domain.target, 0)).toBe(500);
    expect(report.slots.filter((slot) => slot.status === 'qa-passed')).toHaveLength(500);
    expect(report.slots.filter((slot) => slot.status === 'curation-selected')).toHaveLength(0);
    expect(report.slots.filter((slot) => slot.status === 'curation-selected').every((slot) => slot.nativeItemId === null)).toBe(true);
  });

  it('keeps the manifest synchronized with the external native bank and deployment copy', () => {
    const report = read('test_prep/eppp_legacy/curation_500.json');
    const bank = read('test_prep/eppp_native_items.json');
    const passedIds = new Set(report.slots.filter((slot) => slot.status === 'qa-passed').map((slot) => slot.nativeItemId));
    expect(bank).toHaveLength(1500);
    expect(bank.slice(0, 500).every((item) => passedIds.has(item.id))).toBe(true);
    const source = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/curation_500.json'), 'utf8');
    const deployed = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_legacy/curation_500.json'), 'utf8');
    const markdown = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/curation_500.md'), 'utf8');
    expect(deployed).toBe(source);
    expect(markdown).toContain('Selection is not approval');
  });
});
