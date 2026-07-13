// Document Builder credibility fixes (2026-06-22), from the document_builder_refinement_report (DB-P0.*).
// (1) the authored-export "WCAG 2.1 AA compliance" badge softened to non-conformance language; (2) the
// typeset PDF/UA-1 declaration is VETOED when non-Latin/shaping-required content was dropped (so the
// shipped bytes never claim conformance for an incomplete doc); (3) the CSS contrast auto-fixer only
// counts a "fix" that actually REACHED the target (residualCount surfaces improved-but-still-failing).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Extract + run the real validateAndFixCssContrast (fully self-contained) ──
const _vS = dp.indexOf('const validateAndFixCssContrast = (cssText, options) =>');
// the return line ITSELF ends in "};" (object + statement); the arrow's closing "};" is the NEXT one.
const _retMark = 'residual: _residual.reverse() };';
const _vE = dp.indexOf('};', dp.indexOf(_retMark, _vS) + _retMark.length) + 2;
const validateAndFixCssContrast = new Function('warnLog', dp.slice(_vS, _vE) + '\nreturn validateAndFixCssContrast;')(() => {});

describe('DB-P0.4: contrast auto-fixer only claims a fix it actually reached', () => {
  it('passing CSS → zero fixes, zero residual', () => {
    const r = validateAndFixCssContrast('.x { color: #000000; background: #ffffff; }');
    expect(r.fixCount).toBe(0);
    expect(r.residualCount).toBe(0);
  });
  it('a fixable low-contrast color → counted ONLY because it verified >= AA', () => {
    const r = validateAndFixCssContrast('.x { color: #bbbbbb; background: #ffffff; }');
    expect(r.fixCount).toBe(1);
    expect(r.residualCount).toBe(0);
    expect(r.fixes[0].reached).toBe(true);
    expect(r.fixes[0].newRatio).toBeGreaterThanOrEqual(4.5); // the fix is POST-VERIFIED, not assumed
  });
  it('every recorded fix carries a verified newRatio + reached flag (no "changed = fixed" claim)', () => {
    const r = validateAndFixCssContrast('.a { color: #999999; background: #ffffff; } .b { color: #cccccc; background: #ffffff; }');
    expect(r.fixes.length).toBeGreaterThan(0);
    for (const f of r.fixes) {
      expect(f).toHaveProperty('reached');
      expect(f).toHaveProperty('newRatio');
      if (f.reached) expect(f.newRatio).toBeGreaterThanOrEqual(4.5);
    }
    // fixCount counts ONLY reached; residual is everything else (honest split)
    expect(r.fixCount).toBe(r.fixes.filter((f) => f.reached).length);
    expect(r.residualCount).toBe(r.fixes.filter((f) => !f.reached).length);
  });
});

describe('anti-drift: DB-P0.1 authored-export badge no longer overclaims', () => {
  it('drops the unconditional "WCAG 2.1 AA compliance features" conformance verb', () => {
    expect(dp).not.toMatch(/generated with WCAG 2\.1 AA compliance features/);
    expect(dp).toMatch(/built with accessibility in mind/);
    expect(dp).toMatch(/not an independently validated WCAG or PDF\/UA conformance claim/);
  });
});

describe('anti-drift: DB-P0.2 typeset PDF/UA-1 is vetoed on dropped content', () => {
  it('_uaDeclared ANDs in !meta.contentDropped (withholds the actual XMP stamp)', () => {
    expect(dp).toMatch(/_fontsUnrepairable\.length === 0 && !meta\.contentDropped &&/);
  });
  it('the typeset call threads contentDropped from the unicode-drop signal', () => {
    expect(dp).toMatch(/contentDropped: !!\(_unicodeTypesetWarning && _unicodeTypesetWarning\.droppedChars > 0\)/);
  });
  it('the withheld-XMP comment states the content-drop reason (not a misleading leaf count)', () => {
    expect(dp).toMatch(/non-Latin \/ shaping-required text was dropped from this typeset PDF/);
  });
});

describe('anti-drift: DB-P0.4 toast surfaces the residual honestly', () => {
  it('the export-theme toast reports residual-still-below-AA instead of implying all passed', () => {
    expect(dp).toMatch(/still below AA \(background needs adjusting/);
    expect(dp).toMatch(/wcag\.residualCount/);
  });
});
