// Heading-inference table captions (2026-06-22, Increment 1). A caption-less <table> immediately
// preceded by a heading gets a REAL sr-only <caption> mirroring that heading (genuine semantics, not
// the generic "Data table N" filler). Conservative: only an immediately-adjacent heading (whitespace
// only between), only when the table has no caption, idempotent across passes, context-less tables
// left alone. Extracts the real fixTableCaptionsFromHeadings from doc_pipeline_source.jsx.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const _s = dp.indexOf('const fixTableCaptionsFromHeadings = (htmlContent) => {');
const _e = dp.indexOf('\n  // ── fixComplexTables:', _s);
if (_s === -1 || _e === -1) throw new Error('extraction markers for fixTableCaptionsFromHeadings missing');
const fixTableCaptionsFromHeadings = new Function('warnLog', dp.slice(_s, _e) + '\nreturn fixTableCaptionsFromHeadings;')(() => {});
const run = (html) => fixTableCaptionsFromHeadings(html);

describe('fixTableCaptionsFromHeadings — infers a caption from the adjacent heading', () => {
  it('adds an sr-only caption from an immediately-preceding heading', () => {
    const { html, fixCount } = run('<h2>Quarterly Enrollment</h2><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>');
    expect(fixCount).toBe(1);
    expect(html).toContain('<caption class="sr-only">Quarterly Enrollment</caption>');
    // caption is the table's FIRST child (before <thead>)
    expect(html).toMatch(/<table><caption class="sr-only">Quarterly Enrollment<\/caption><thead>/);
  });
  it('works for any heading level and tolerates whitespace/newlines between heading and table', () => {
    const { html, fixCount } = run('<h3>Scores</h3>\n   <table>\n<tbody><tr><td>x</td></tr></tbody></table>');
    expect(fixCount).toBe(1);
    expect(html).toContain('<caption class="sr-only">Scores</caption>');
  });
  it('strips nested markup in the heading and collapses whitespace', () => {
    const { html } = run('<h2>  <strong>Budget</strong>  by  Dept </h2><table><tbody><tr><td>x</td></tr></tbody></table>');
    expect(html).toContain('<caption class="sr-only">Budget by Dept</caption>');
  });
  it('escapes HTML-special characters in the caption text', () => {
    const { html } = run('<h2>Cost &amp; Risk &lt;2024&gt;</h2><table><tbody><tr><td>x</td></tr></tbody></table>');
    // &amp;/&lt;/&gt; in source decode to & < > via tag-strip, then re-escaped on insert
    expect(html).toContain('<caption class="sr-only">Cost &amp; Risk &lt;2024&gt;</caption>');
    expect(html).not.toMatch(/<caption[^>]*>[^<]*<2024>/); // no raw < injected
  });
});

describe('fixTableCaptionsFromHeadings — conservative: does NOT over-caption', () => {
  it('leaves a table that already has a caption untouched (idempotent)', () => {
    const src = '<h2>Title</h2><table><caption>Existing</caption><tbody><tr><td>x</td></tr></tbody></table>';
    const { html, fixCount } = run(src);
    expect(fixCount).toBe(0);
    expect(html).toBe(src);
    expect((html.match(/<caption/g) || []).length).toBe(1);
  });
  it('does NOT caption a table with non-whitespace (a paragraph) between it and the heading', () => {
    const src = '<h2>Section</h2><p>Intro text.</p><table><tbody><tr><td>x</td></tr></tbody></table>';
    const { html, fixCount } = run(src);
    expect(fixCount).toBe(0);
    expect(html).not.toContain('<caption');
  });
  it('leaves a context-less table (no preceding heading) alone — that is the AI tier’s job', () => {
    const src = '<p>blah</p><table><tbody><tr><td>x</td></tr></tbody></table>';
    const { html, fixCount } = run(src);
    expect(fixCount).toBe(0);
    expect(html).toBe(src);
  });
  it('an empty heading produces no caption', () => {
    const { html, fixCount } = run('<h2></h2><table><tbody><tr><td>x</td></tr></tbody></table>');
    expect(fixCount).toBe(0);
    expect(html).not.toContain('<caption');
  });
  it('only the table IMMEDIATELY after the heading is captioned, not a later sibling table', () => {
    const { html, fixCount } = run('<h2>First</h2><table id="a"><tbody><tr><td>1</td></tr></tbody></table><table id="b"><tbody><tr><td>2</td></tr></tbody></table>');
    expect(fixCount).toBe(1);
    expect(html).toMatch(/<table id="a"><caption class="sr-only">First<\/caption>/);
    expect(html).toMatch(/<table id="b"><tbody>/); // second table untouched
  });
  it('running twice is a no-op the second time (idempotent across loop passes)', () => {
    const once = run('<h2>T</h2><table><tbody><tr><td>x</td></tr></tbody></table>').html;
    const twice = run(once);
    expect(twice.fixCount).toBe(0);
    expect(twice.html).toBe(once);
  });
});

describe('anti-drift: the fixer is wired into runDeterministicWcagFixes BEFORE fixComplexTables', () => {
  it('runDeterministicWcagFixes calls fixTableCaptionsFromHeadings ahead of fixComplexTables', () => {
    const orch = dp.slice(dp.indexOf('const runDeterministicWcagFixes ='), dp.indexOf('const safeSubstring ='));
    const capIdx = orch.indexOf('fixTableCaptionsFromHeadings(result)');
    const complexIdx = orch.indexOf('fixComplexTables(result)');
    expect(capIdx).toBeGreaterThan(-1);
    expect(complexIdx).toBeGreaterThan(-1);
    expect(capIdx).toBeLessThan(complexIdx);
  });
});
