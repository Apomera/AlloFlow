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
    expect(drops({ ruleId: 'main-landmark', claimKind: 'absence', wcag: '1.3.1', issue: 'The primary content is not wrapped in a <main> landmark.' }, FULL)).toBe(true);
  });
  it('drops "lacks an h1" when an h1 is present', () => {
    expect(drops({ ruleId: 'heading-root', claimKind: 'absence', wcag: '1.3.1', issue: 'The section lacks an h1 element.' }, FULL)).toBe(true);
  });
  it('drops "skip-link missing" when a real skip anchor is present', () => {
    expect(drops({ ruleId: 'skip-link', claimKind: 'absence', wcag: '2.4.1', issue: 'A skip-to-content link is missing.' }, FULL)).toBe(true);
  });
  it('KEEPS a real absence when the tag is genuinely absent', () => {
    expect(keeps({ ruleId: 'main-landmark', claimKind: 'absence', wcag: '1.3.1', issue: 'The primary content is not wrapped in a <main> landmark.' }, '<body><div>x</div></body>')).toBe(true);
  });
});

describe('translated findings use structured absence provenance without hiding quality defects', () => {
  it('suppresses a translated total-absence claim when deterministic markup proves the element exists', () => {
    expect(drops({
      ruleId: 'document-title', claimKind: 'absence', wcag: '2.4.2',
      issue: 'Falta por completo el título requerido del documento.',
    }, FULL)).toBe(true);
  });
  it('retains a translated present-but-poor quality claim with the same broad ruleId', () => {
    expect(keeps({
      ruleId: 'document-title', claimKind: 'quality', wcag: '2.4.2',
      issue: 'El título presente no describe el propósito del documento.',
    }, FULL)).toBe(true);
  });
  it('retains a translated broken table relationship claim even when scoped headers exist', () => {
    expect(keeps({ ruleId: 'table-header', claimKind: 'structure', wcag: '1.3.1', issue: 'Los encabezados apuntan a las columnas equivocadas.' }, TABLE_OK)).toBe(true);
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

// Table-header phantom suppression (2026-06-18): the AI rubric flags "data table lacks <th>/scope" on
// documents whose tables ARE correctly tagged — contradicting the deterministic VERIFIED-ACCESSIBLE
// "TABLES highly accessible" pass. Suppress that claim ONLY when EVERY data table has a <th scope> (DOM
// per-table, so a correct table can NEVER mask a genuinely broken one — the paramount over-suppression risk).
const TABLE_OK = FULL.replace('<p>body</p>', '<table><caption>Q</caption><thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>');
const TABLE_BROKEN = FULL.replace('<p>body</p>', '<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>');
const TABLE_BOTH = FULL.replace('<p>body</p>', '<table><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><table><tr><td>x</td><td>y</td></tr></table>');

describe('table-header suppression — drops the contradicted claim ONLY when every data table is tagged', () => {
  it('drops "data table lacks th and scope" when every table has <th scope>', () => {
    expect(drops({ ruleId: 'table-header', claimKind: 'absence', wcag: '1.3.1', issue: 'The data table lacks semantic header cells (th) and scope attributes.' }, TABLE_OK)).toBe(true);
  });
  it('KEEPS the claim when a data table genuinely has cells but no <th scope> (real barrier)', () => {
    expect(keeps({ ruleId: 'table-header', claimKind: 'absence', wcag: '1.3.1', issue: 'The data table lacks semantic header cells (th) and scope attributes.' }, TABLE_BROKEN)).toBe(true);
  });
  it('KEEPS the claim when ONE table is correct but ANOTHER is broken (a correct table must not mask a broken one)', () => {
    expect(keeps({ ruleId: 'table-header', claimKind: 'absence', wcag: '1.3.1', issue: 'A data table is missing th header cells and scope attributes.' }, TABLE_BOTH)).toBe(true);
  });
  it('does NOT suppress a non-table "missing header" (gated on the issue mentioning a table)', () => {
    expect(keeps({ ruleId: 'region-landmarks', claimKind: 'absence', wcag: '1.3.1', issue: 'The page is missing a banner header region.' }, TABLE_OK)).toBe(true);
  });
  it('KEEPS a table QUALITY complaint (wrong scope direction) even when tables are tagged', () => {
    expect(keeps({ ruleId: 'table-header', claimKind: 'quality', wcag: '1.3.1', issue: 'The table header scope is incorrect — column headers use scope=row.' }, TABLE_OK)).toBe(true);
  });
});

// Landmark-region phantom suppression (2026-06-18): the remediation pipeline INJECTS <nav role=navigation>,
// <footer role=contentinfo>, and role=banner on headers (7387-7434/7631-7634), so a post-fix "missing
// <header>/<nav>/<footer> landmarks" claim is a common phantom. Suppress it ONLY when EVERY landmark the
// claim names is present (a combined claim with one genuinely-absent landmark stays — partial truth).
const LM_ALL = '<html lang="en"><head><title>T</title></head><body><header role="banner">Site</header><nav role="navigation">Menu</nav><main><h1>X</h1></main><footer role="contentinfo">Foot</footer></body></html>';
const LM_FOOTER_ONLY = '<html lang="en"><head><title>T</title></head><body><main><h1>X</h1></main><footer role="contentinfo">Foot</footer></body></html>';
const LM_NONE = '<html lang="en"><head><title>T</title></head><body><main><h1>X</h1><p>y</p></main></body></html>';
const LM_CLAIM = 'The document is missing structural landmark elements such as a header, nav, and footer to define layout regions.';

describe('landmark-region suppression — drops only when EVERY named landmark is present', () => {
  it('drops a combined "missing header/nav/footer landmarks" when all three are present', () => {
    expect(drops({ ruleId: 'region-landmarks', claimKind: 'absence', wcag: '1.3.1', issue: LM_CLAIM }, LM_ALL)).toBe(true);
  });
  it('KEEPS the combined claim when one named landmark is genuinely absent (partial truth)', () => {
    expect(keeps({ ruleId: 'region-landmarks', claimKind: 'absence', wcag: '1.3.1', issue: LM_CLAIM }, LM_FOOTER_ONLY)).toBe(true);
  });
  it('keeps a single-region claim when the schema does not identify which region it targets', () => {
    expect(keeps({ ruleId: 'region-landmarks', claimKind: 'absence', wcag: '1.3.1', issue: 'The page lacks a contentinfo footer landmark region.' }, LM_FOOTER_ONLY)).toBe(true);
  });
  // navWarranted (2026-07-07, maintainer): a <nav> GROUPS navigation links, so "missing <nav>" is a
  // FALSE POSITIVE on a linear prose document (assessment report / letter) with no links to group — you
  // never add an empty landmark. It stays a real barrier ONLY when the doc HAS a link list / TOC.
  const NAV_WARRANTED = '<html lang="en"><head><title>T</title></head><body><main><h1>X</h1><ul><li><a href="#a">Section A</a></li><li><a href="#b">Section B</a></li></ul><p>y</p></main></body></html>';
  it('KEEPS a navigation-only prose claim because prose cannot select the suppression target', () => {
    expect(keeps({ ruleId: 'region-landmarks', claimKind: 'absence', wcag: '1.3.1', issue: 'The page lacks a navigation landmark region.' }, LM_NONE)).toBe(true);
  });
  it('KEEPS "lacks a navigation landmark" when the doc HAS a link list / TOC but no <nav> wrapper (real barrier)', () => {
    expect(keeps({ ruleId: 'region-landmarks', claimKind: 'absence', wcag: '1.3.1', issue: 'The document lacks a <nav> landmark to identify the navigation section.' }, NAV_WARRANTED)).toBe(true);
  });
  it('does NOT misread a TABLE-header absence as a banner landmark (real barrier kept)', () => {
    expect(keeps({ ruleId: 'table-header', claimKind: 'absence', wcag: '1.3.1', issue: 'The data table is missing header cells and scope attributes.' }, LM_ALL)).toBe(true);
  });
});

describe('anti-drift: presence-only suppression wired into both audit paths; contrast NOT plumbed', () => {
  it('helper is presence-only and both audit paths call it; no contrastClean plumbing remains', () => {
    expect(src).toContain('function _suppressContradictedIssues(issues, html) {');
    expect(src).toContain('_suppressContradictedIssues(parsed.issues, htmlContent)');
    expect(src).toContain('_suppressContradictedIssues(mergedIssues, htmlContent)');
    expect(src).not.toContain('const QUALITY =');
    expect(src).not.toContain('const _absNear =');
    expect(src).toContain('present.tableHeaders = (function () {'); // DOM per-table header check
    expect(src).toContain("else if (ruleId === 'table-header') drop = present.tableHeaders;");
    expect(src).toContain("String(issue && issue.claimKind || '')"); // structured provenance, not translated text heuristics
    expect(src).toContain('banner: /role='); // landmark presence facts
    expect(src).toContain('navigation: /role=');
    expect(src).toContain('contentinfo: /role=');
    expect(src).toContain('drop = present.banner && present.contentinfo && (present.navigation || !present.navWarranted);');
    expect(src).not.toContain('opts.contrastClean'); // the unsafe contrast branch is gone
    expect(src).not.toContain('_contrastCleanForAudit');
  });
});
