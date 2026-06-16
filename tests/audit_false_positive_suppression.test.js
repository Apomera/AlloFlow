// Audit false-positive suppression (2026-06-15, hardened after TWO adversarial reviews). The AI rubric
// over-flags PRESENCE of landmarks/h1/skip-link/lang/title — listing them as "missing" while they ARE
// present (contradicting the audit's own structuralPasses), capping the score and stalling the
// auto-fix loop on non-issues. _suppressContradictedIssues drops ONLY those, conservatively. The
// PARAMOUNT risk is OVER-suppression (dropping a REAL barrier → clean score on an inaccessible doc),
// so: presence drops only an UNAMBIGUOUS total-absence claim about a tag that is actually present,
// with quality/semantic/hierarchy complaints excluded; comments/code stripped; skip-link needs a real
// anchor. CONTRAST is intentionally NOT suppressed — fixContrastViolations is blind to class-based
// contrast (the second review proved this would drop real barriers); only axe's computed contrast is
// reliable, and that cross-check belongs at the loop level (follow-up). These tests pin the suppression
// AND the reviews' over-suppression repros as MUST-KEEP regressions.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _suppressContradictedIssues(issues, html) {');
const end = src.indexOf('var createDocPipeline = function(deps) {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _suppressContradictedIssues missing');
const { _suppressContradictedIssues } = new Function(src.slice(start, end) + '\n; return { _suppressContradictedIssues };')();

const FULL = '<html lang="en"><head><title>Guide</title></head><body><a href="#main" class="sr-only">Skip to main content</a><main id="main"><h1>Title</h1><p>body</p></main></body></html>';
const drops = (issue, html) => _suppressContradictedIssues([{ id: 'x', ...issue }], html).suppressed.length === 1;
const keeps = (issue, html) => _suppressContradictedIssues([{ id: 'x', ...issue }], html).kept.length === 1;

describe('presence — drops only unambiguous absence of a present tag', () => {
  it('drops "main not wrapped" when <main> is present', () => {
    expect(drops({ wcag: '1.3.1', issue: 'The primary content is not wrapped in a <main> landmark.' }, FULL)).toBe(true);
  });
  it('drops "lacks an h1" when an h1 is present', () => {
    expect(drops({ wcag: '1.3.1', issue: 'The section lacks an h1 element.' }, FULL)).toBe(true);
  });
  it('drops "skip-link missing" when a real skip anchor is present', () => {
    expect(drops({ wcag: '2.4.1', issue: 'A skip-to-content link is missing.' }, FULL)).toBe(true);
  });
  it('KEEPS a real absence when the tag is genuinely absent', () => {
    expect(keeps({ wcag: '1.3.1', issue: 'The primary content is not wrapped in a <main> landmark.' }, '<body><div>x</div></body>')).toBe(true);
  });
});

describe('contrast is NEVER suppressed (only axe-computed contrast is reliable ground truth)', () => {
  it('keeps a 1.4.3 flag even when the cited colors look like they pass', () => {
    expect(keeps({ wcag: '1.4.3', issue: 'The text color (#475569) fails 4.5:1 against #f8fafc.' }, FULL)).toBe(true);
  });
  it('keeps a class-based contrast flag (the case fixContrastViolations is blind to)', () => {
    expect(keeps({ wcag: '1.4.3', issue: 'text-teal-400 body text is 1.86:1, failing AA.' }, FULL)).toBe(true);
  });
});

describe('OVER-SUPPRESSION regressions — these real barriers MUST be kept', () => {
  it('empty h1 (quality, not absence)', () => {
    expect(keeps({ wcag: '2.4.6', issue: 'The h1 element is empty and has no text content.' }, FULL)).toBe(true);
  });
  it('invalid lang value (quality/validity)', () => {
    expect(keeps({ wcag: '3.1.1', issue: 'The html lang attribute is not set to a valid language code.' }, FULL)).toBe(true);
  });
  it('multiple main elements (quality)', () => {
    expect(keeps({ wcag: '1.3.1', issue: 'There is no single main landmark; multiple main elements exist.' }, FULL)).toBe(true);
  });
  it('heading-level skip / hierarchy (semantic)', () => {
    expect(keeps({ wcag: '1.3.1', issue: 'Heading levels skip from h1 to h3 with no h2 in between.' }, FULL)).toBe(true);
  });
  it('non-descriptive title (quality)', () => {
    expect(keeps({ wcag: '2.4.2', issue: 'The document title does not contain meaningful descriptive text.' }, FULL)).toBe(true);
  });
  it('lang of parts / 3.1.2 (sub-element)', () => {
    expect(keeps({ wcag: '3.1.2', issue: 'A foreign-language passage is missing a lang attribute (lang of parts).' }, FULL)).toBe(true);
  });
  it('<main> only inside an HTML comment is NOT "present"', () => {
    expect(keeps({ wcag: '1.3.1', issue: 'The content is not wrapped in a <main> landmark.' }, '<body><!-- TODO add <main> --><div>real content</div></body>')).toBe(true);
  });
  it('prose "skip to content" with no real anchor is NOT a present skip link', () => {
    expect(keeps({ wcag: '2.4.1', issue: 'A skip-to-content link is missing.' }, '<body><p>Use skip to content for navigation.</p><div>x</div></body>')).toBe(true);
  });
  it('a semantic judgment (alt quality) is always kept', () => {
    expect(keeps({ wcag: '1.1.1', issue: 'The alt text "image" is not descriptive of the chart.' }, FULL)).toBe(true);
  });
});

describe('anti-drift: presence-only suppression wired into both audit paths; contrast NOT plumbed', () => {
  it('helper is presence-only and both audit paths call it; no contrastClean plumbing remains', () => {
    expect(src).toContain('function _suppressContradictedIssues(issues, html) {');
    expect(src).toContain('_suppressContradictedIssues(parsed.issues, htmlContent)');
    expect(src).toContain('_suppressContradictedIssues(mergedIssues, htmlContent)');
    expect(src).toContain('const QUALITY ='); // quality/semantic exclusion guard exists
    expect(src).not.toContain('opts.contrastClean'); // the unsafe contrast branch is gone
    expect(src).not.toContain('_contrastCleanForAudit');
  });
});
