import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { renderReview } = require('../dev-tools/rendered_fidelity_review.cjs');

function fixture(overrides = {}) {
  return {
    kind: 'rendered-html-fidelity', status: 'passed', id: 'reading',
    source: { sha256: 'a'.repeat(64), path: '/evidence/source.html', bytes: 80 },
    candidate: { sha256: 'b'.repeat(64), path: '/evidence/candidate.html', bytes: 90 },
    coverage: { complete: true, requested: 1, inspected: 1, wholeDocument: false },
    viewport: { width: 1100, height: 800 },
    checks: [{ id: 'instruction', sourceSelector: '#instruction', candidateSelector: '#repaired', status: 'passed', properties: [{ property: 'visible', status: 'passed', source: true, candidate: true }] }],
    ...overrides,
  };
}
const documentFor = value => new JSDOM(renderReview(value)).window.document;

describe('static rendered fidelity review', () => {
  it('supports a legacy single profile with hashes, selectors and typed values', () => {
    const doc = documentFor(fixture());
    expect(doc.title).toBe('Rendered fidelity review');
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.querySelectorAll('main')).toHaveLength(1);
    expect(doc.body.textContent).toContain('Default profile (legacy report)');
    expect(doc.body.textContent).toContain('Human validation has not been run');
    expect(doc.body.textContent).toContain('selected checkpoints and properties only');
    for (const value of ['a'.repeat(64), 'b'.repeat(64), '#instruction', '#repaired', 'screen']) expect(doc.body.textContent).toContain(value);
    const row = doc.querySelector('tbody tr');
    expect([...row.cells].map(cell => cell.textContent)).toEqual(['visible', 'true', 'true', 'passed']);
    expect(doc.querySelector('caption').textContent).toContain('Selected properties');
    expect(doc.querySelector('tbody th').getAttribute('scope')).toBe('row');
    expect(doc.querySelector('.table-container').getAttribute('tabindex')).toBe('0');
    expect([...doc.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['#review-main']);
  });

  it('keeps incomplete coverage prominent even when all observed properties pass', () => {
    const doc = documentFor(fixture({ status: 'unavailable', coverage: { complete: false, requested: 2, inspected: 1 }, resources: { source: { blocked: 1, scripts: 0, unresolved: 1 } } }));
    expect(doc.querySelector('article > p').textContent).toContain('unavailable');
    expect(doc.querySelector('article > .incomplete').textContent).toContain('Coverage: incomplete');
    expect(doc.body.textContent).toContain('Inspected 1 of 2 requested checkpoints');
    expect(doc.body.textContent).toContain('"blocked": 1');
    expect(doc.querySelector('details[open] summary').textContent).toContain('Resource');
    expect(doc.querySelector('tbody').textContent).toContain('passed');
  });

  it('renders each profile with its status, viewport, media and property comparison', () => {
    const first = fixture();
    const doc = documentFor(fixture({ status: 'review-required', profiles: [
      { id: 'wide', name: 'Desktop screen', status: 'passed', media: 'screen', viewport: { width: 1100, height: 800 }, coverage: first.coverage, checks: first.checks },
      { id: 'print', status: 'review-required', media: 'print', viewport: { width: 900, height: 1200 }, coverage: first.coverage, checks: [{ ...first.checks[0], status: 'failed', properties: [{ property: 'visible', status: 'failed', source: true, candidate: false }] }] },
    ] }));
    expect(doc.querySelectorAll('.profile')).toHaveLength(2);
    expect(doc.querySelectorAll('.checkpoint')).toHaveLength(2);
    expect(doc.querySelectorAll('h3')[0].textContent).toBe('Desktop screen');
    expect(doc.querySelectorAll('h3')[1].textContent).toBe('print');
    expect(doc.querySelectorAll('.profile')[0].textContent).toContain('Profile ID: wide');
    expect(doc.querySelectorAll('.profile')[1].textContent).toContain('review-required');
    expect(doc.querySelectorAll('.profile')[1].textContent).toContain('"height": 1200');
    expect(doc.querySelectorAll('tbody tr')[1].textContent).toContain('false');
    const ids = [...doc.querySelectorAll('[id]')].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of doc.querySelectorAll('[aria-labelledby]')) expect(doc.getElementById(el.getAttribute('aria-labelledby'))).not.toBeNull();
  });

  it('shows unavailable observation reasons and preserves null, arrays, and empty strings', () => {
    const first = fixture();
    const doc = documentFor(fixture({ status: 'unavailable', coverage: { complete: false, requested: 2, inspected: 1 }, checks: [
      { id: 'missing', status: 'unavailable', sourceSelector: '#none', candidateSelector: '#many', source: { status: 'unavailable', reason: 'missing-selector', matches: 0 }, candidate: { status: 'unavailable', reason: 'ambiguous-selector', matches: 2 } },
      { ...first.checks[0], properties: [{ property: 'selected', status: 'unavailable', source: ['a', 'b'], candidate: null, reason: 'not-applicable' }, { property: 'name', status: 'passed', source: '', candidate: 'Label' }] },
    ] }));
    expect(doc.body.textContent).toContain('Unavailable reason: missing-selector');
    expect(doc.body.textContent).toContain('Unavailable reason: ambiguous-selector');
    expect(doc.body.textContent).toContain('Unavailable reason: not-applicable');
    const rows = doc.querySelectorAll('tbody tr');
    expect(JSON.parse(rows[0].cells[1].textContent)).toEqual(['a', 'b']);
    expect(rows[0].cells[2].textContent).toBe('null');
    expect(rows[1].cells[1].textContent).toBe('');
  });

  it('escapes all report data without active document markup or external resources', () => {
    const attack = `</pre><script>alert(1)</script><img src="https://attacker.invalid/" onerror="alert(2)"><a href="javascript:alert(3)">'&`;
    const doc = documentFor(fixture({ id: attack, status: attack, source: { sha256: attack, path: attack }, candidate: { sha256: attack }, limitations: [attack], profiles: [{
      id: attack, name: attack, media: attack, viewport: attack, status: attack, reason: attack,
      coverage: { complete: false, requested: attack, inspected: attack, reasons: [attack] }, resources: { source: attack },
      checks: [{ id: attack, status: attack, sourceSelector: attack, candidateSelector: attack, reason: attack, message: attack,
        properties: [{ property: attack, source: attack, candidate: { nested: attack }, status: attack, reason: attack }],
        source: { status: attack, reason: attack, message: attack }, candidate: { reason: attack } }],
    }] }));
    expect(doc.querySelectorAll('script, img, iframe, object, embed, link, form')).toHaveLength(0);
    expect(doc.querySelectorAll('[onerror], [onclick], [src]')).toHaveLength(0);
    expect(doc.querySelectorAll('a')).toHaveLength(1);
    expect(doc.querySelector('h2').textContent).toContain(attack);
    expect(doc.querySelector('tbody tr').cells[1].textContent).toBe(attack);
    expect(JSON.parse(doc.querySelector('tbody tr').cells[2].textContent)).toEqual({ nested: attack });
    expect([...doc.querySelectorAll('[id]')].every(el => !el.id.includes(attack))).toBe(true);
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content).toContain("default-src 'none'");
  });

  it('supports bundles and never implies complete inspection for absent evidence', () => {
    const doc = documentFor({ reports: [fixture(), fixture({ id: 'second', status: 'unavailable', profiles: [], coverage: undefined, artifactChanged: true })] });
    expect(doc.querySelectorAll('article')).toHaveLength(2);
    expect(doc.querySelectorAll('h2')[1].textContent).toContain('second');
    expect(doc.querySelectorAll('article')[1].textContent).toContain('No rendering profiles were recorded. Coverage is incomplete.');
    expect(doc.body.textContent).toContain('Artifacts changed during inspection.');
    expect(documentFor({ reports: [] }).body.textContent).toContain('No reports were supplied.');
    expect(documentFor({}).body.textContent).toContain('unavailable (status not recorded)');
    expect(documentFor({}).body.textContent).toContain('No checkpoint comparisons were recorded');
    expect(() => renderReview(null)).toThrow(TypeError);
  });
});

it('shows aggregate and profile coverage reasons outside collapsed content', () => {
  const original = fixture();
  const doc = documentFor(fixture({ status: 'unavailable', coverage: { complete: false, inspected: 1, requested: 1, reasons: ['print: blocked-resources'] }, profiles: [{
    id: 'print', status: 'unavailable', media: 'print', checks: original.checks,
    coverage: { complete: false, inspected: 1, requested: 1, reasons: ['blocked-resources', 'scripts-disabled'] },
  }] }));
  const profile = doc.querySelector('.profile');
  expect(doc.querySelector('article > div.incomplete').textContent).toContain('print: blocked-resources');
  expect(profile.querySelector('div.incomplete').textContent).toContain('scripts-disabled');
  expect(profile.querySelector('div.incomplete').closest('details')).toBeNull();
});