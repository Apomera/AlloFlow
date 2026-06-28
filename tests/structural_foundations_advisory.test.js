// Honest-pass (2026-06-24): the WCAG re-audit runs WCAG-tagged axe rules only, so best-practice STRUCTURE
// rules (region / landmark-one-main / page-has-heading-one / heading-order) are never evaluated and the report
// was silent on them. _alloStructuralFoundations now also returns an `advisory` array of those gaps — surfaced
// as RECOMMENDATIONS (never scored), so "0 WCAG issues" can't imply a perfect outline, and so the Tier-1
// foundations + Tier-2a title→h1 are visibly verified (the advisory shrinks as fixes land). Deterministic by
// choice (more reliable than a second axe iframe pass; maps straight onto the foundations we add).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// _alloStructuralFoundations now calls _headingOutlineIssue — inject both into the extracted scope.
const _ho = dp.indexOf('function _headingOutlineIssue(html) {');
const _hoEnd = dp.indexOf('\n}', _ho) + 2;
const _sf = dp.indexOf('var _alloStructuralFoundations = function (html) {');
const _sfEnd = dp.indexOf('\n};', _sf) + 3;
const structuralFoundations = new Function(
  dp.slice(_ho, _hoEnd) + '\n' + dp.slice(_sf, _sfEnd) + '\nreturn _alloStructuralFoundations;'
)();
const adv = (html) => structuralFoundations(html).advisory.map((a) => a.id);

describe('structural foundations advisory — best-practice gaps (NOT WCAG, never scored)', () => {
  it('flags a missing <main> landmark', () => {
    expect(adv('<html lang="en"><head><title>T</title></head><body><h1>Doc</h1><p>content</p></body></html>')).toContain('landmark-main');
  });
  it('does NOT flag <main> once present (verifies the Tier-1 fix landed)', () => {
    expect(adv('<html lang="en"><head><title>T</title></head><body><main id="main-content"><h1>Doc</h1><p>x</p></main></body></html>')).not.toContain('landmark-main');
  });
  it('flags more than one <main> (landmark-one-main)', () => {
    expect(adv('<body><main>a</main><main>b</main></body>')).toContain('landmark-one-main');
  });
  it('flags no <h1> when there are section headings (finding #3)', () => {
    expect(adv('<body><main><div style="font-weight:bold">Title</div><h2>Section</h2><p>x</p></main></body>')).toContain('page-has-heading-one');
  });
  it('flags no <h1> in a long doc even without other headings', () => {
    expect(adv('<body><main><p>' + 'word '.repeat(120) + '</p></main></body>')).toContain('page-has-heading-one');
  });
  it('does NOT flag no-h1 on a trivial short doc (no noise)', () => {
    expect(adv('<body><main><p>Short.</p></main></body>')).not.toContain('page-has-heading-one');
  });
  it('does NOT flag no-h1 once an <h1> is present (Tier-2a applied)', () => {
    expect(adv('<body><main><h1>Title</h1><h2>Section</h2><p>x</p></main></body>')).not.toContain('page-has-heading-one');
  });
  it('flags a heading-order skip (h2 → h4)', () => {
    expect(adv('<body><main><h1>T</h1><h2>A</h2><h4>skips</h4></main></body>')).toContain('heading-order');
  });
  it('does NOT flag heading-order when the outline is sequential', () => {
    expect(adv('<body><main><h1>T</h1><h2>A</h2><h3>B</h3></main></body>')).not.toContain('heading-order');
  });
  it('a fully-scaffolded document has an EMPTY advisory (every foundation present)', () => {
    const good = '<html lang="en"><head><title>Worksheet</title></head><body><main id="main-content"><h1>Worksheet</h1><h2>Part 1</h2><p>content here</p></main></body></html>';
    expect(structuralFoundations(good).advisory.length).toBe(0);
  });
  it('keeps the present + checked shape (backward-compatible)', () => {
    const r = structuralFoundations('<html lang="en"><head><title>T</title></head><body><main><h1>D</h1></main></body></html>');
    expect(Array.isArray(r.present)).toBe(true);
    expect(r.checked).toBe(18);
    expect(Array.isArray(r.advisory)).toBe(true);
  });
  it('every advisory item carries an id + a human label', () => {
    const items = structuralFoundations('<body><h2>A</h2><h4>B</h4></body>').advisory; // missing main + missing h1 + skip
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) { expect(typeof it.id).toBe('string'); expect(it.label.length).toBeGreaterThan(10); }
  });
});

describe('anti-drift: advisory is computed in the engine + rendered honestly in the view', () => {
  it('the engine returns an advisory array of best-practice gaps', () => {
    expect(dp).toContain('var _foundations = { present: present, checked: 18, advisory: advisory };');
    expect(dp).toContain("id: 'landmark-main'");
    expect(dp).toContain("id: 'page-has-heading-one'");
    expect(dp).toContain("id: 'heading-order'");
  });
  it('the view renders the advisory chip, labeled NOT WCAG / not scored', () => {
    expect(view).toContain('_structuralFoundations.advisory');
    expect(view).toContain('best-practice tip(s)');
    expect(view).toMatch(/NOT WCAG failures and are NOT counted in the score/);
  });
});
