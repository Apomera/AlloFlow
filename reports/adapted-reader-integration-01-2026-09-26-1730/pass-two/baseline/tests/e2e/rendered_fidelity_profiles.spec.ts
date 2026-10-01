import { test, expect } from '@playwright/test';
const { compareRenderedHtml, validateProfiles } = require('../../dev-tools/rendered_document_fidelity.cjs');
const cases = require('../fixtures/rendered_fidelity/extended_cases.cjs');
test.describe.configure({ mode: 'serial' });
test.setTimeout(90000);
for (const fixture of cases) test('rendering profiles: ' + fixture.id, async ({ browser }) => {
  const report = await compareRenderedHtml(browser, fixture.sourceHtml, fixture.candidateHtml, fixture);
  expect(report.status).toBe(fixture.expectedStatus);
  if (fixture.profiles) {
    expect(report.profiles.map((p: any) => p.id)).toEqual(['desktop', 'mobile', 'print']);
    expect(report.coverage.profilesCompleted).toBe(3);
    expect(report.checks.every((c: any) => c.profileId && c.checkpointId)).toBe(true);
  }
  if (fixture.id === 'mobile-only-instruction-hidden') expect(report.profiles.map((p: any) => p.status)).toEqual(['passed', 'review-required', 'passed']);
  if (fixture.id === 'print-only-instruction-hidden') expect(report.profiles.map((p: any) => p.status)).toEqual(['passed', 'passed', 'review-required']);
  if (fixture.id === 'delayed-css-animation-unavailable') expect(report.coverage.reasons).toContain('active-animations');
  expect(report.humanValidation).toBe('not-run');
});
test('a failure cannot conceal an unavailable property in coverage', async ({ browser }) => {
  const report = await compareRenderedHtml(browser, '<p id="p">Original</p>', '<p id="p">Changed</p>', { checkpoints: [{ id: 'p', sourceSelector: '#p', properties: ['text', 'value'] }] });
  expect(report.status).toBe('review-required');
  expect(report.checks[0].status).toBe('failed');
  expect(report.coverage.complete).toBe(false);
  expect(report.coverage.inspected).toBe(0);
  expect(report.coverage.reasons).toContain('incomplete-checkpoint');
});
test('profile contracts are bounded and unambiguous', () => {
  expect(() => validateProfiles({ profiles: [] })).toThrow();
  expect(() => validateProfiles({ profiles: [{ id: 'a' }, { id: 'a' }] })).toThrow();
  expect(() => validateProfiles({ profiles: [{ id: 'a', media: 'speech' }] })).toThrow();
  expect(() => validateProfiles({ profiles: [{ id: 'a' }], viewport: { width: 800, height: 600 } })).toThrow();
  expect(() => validateProfiles({ profiles: Array.from({ length: 5 }, (_, i) => ({ id: 'p' + i })) })).toThrow();
});
