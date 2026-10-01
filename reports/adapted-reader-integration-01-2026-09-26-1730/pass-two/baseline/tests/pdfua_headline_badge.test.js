// PDF/UA-1 conformance badge beside the headline score (2026-06-20). Aaron asked whether veraPDF
// should be folded INTO the audit score. Answer: no — it validates a DIFFERENT artifact (the exported
// tagged-PDF bytes via ISO 14289-1), whereas the content score's axe half runs on the HTML
// reconstruction and passes "by construction" (can't see byte-level tagging). So the PDF/UA verdict
// rides BESIDE the before→after number as its own badge, never averaged in. This pins both the verdict
// derivation (veraPDF → self-check fallback) and (anti-drift) the headline wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the badge verdict derivation (same precedence as the dashboard chip) ──
const pdfUaVerdict = (ltv) => {
  if (!ltv) return null;
  const _v = ltv.veraPdf;
  const _pev = ltv.postExportValidator && ltv.postExportValidator.summary;
  const _sc = ltv.pdfUa1Checks && ltv.pdfUa1Checks.summary;
  let label = null, fail = false, indep = false;
  if (_v && !_v.error) {
    indep = true; fail = _v.compliant === false;
    label = fail ? ((_v.failedRules ? _v.failedRules.length : 0) + ' rule(s) fail') : 'conformant';
  } else if (_pev) {
    fail = (_pev.fail || 0) > 0;
    label = (_pev.pass || 0) + '/' + ((_pev.pass || 0) + (_pev.fail || 0));
  } else if (_sc) {
    fail = (_sc.fail || 0) > 0;
    label = (_sc.conformancePct || 0) + '%';
  }
  if (!label) return null;
  return { label, fail, indep };
};

describe('PDF/UA verdict derivation — prefers the independent veraPDF result', () => {
  it('veraPDF compliant → ✅ conformant, marked independent', () => {
    expect(pdfUaVerdict({ veraPdf: { compliant: true, failedRules: [] } }))
      .toEqual({ label: 'conformant', fail: false, indep: true });
  });
  it('veraPDF non-compliant → ❌ with the failing rule count, independent', () => {
    expect(pdfUaVerdict({ veraPdf: { compliant: false, failedRules: [1, 2, 3] } }))
      .toEqual({ label: '3 rule(s) fail', fail: true, indep: true });
  });
  it('veraPDF errored out → falls back to the post-export self-check (NOT independent)', () => {
    expect(pdfUaVerdict({ veraPdf: { error: 'jvm crash' }, postExportValidator: { summary: { pass: 18, fail: 0 } } }))
      .toEqual({ label: '18/18', fail: false, indep: false });
  });
  it('self-check with failures → ❌ and not independent', () => {
    expect(pdfUaVerdict({ postExportValidator: { summary: { pass: 15, fail: 3 } } }))
      .toEqual({ label: '15/18', fail: true, indep: false });
  });
  it('only the pdfUa1Checks pct self-check available → percent label', () => {
    expect(pdfUaVerdict({ pdfUa1Checks: { summary: { conformancePct: 94, fail: 2 } } }))
      .toEqual({ label: '94%', fail: true, indep: false });
  });
  it('no validation data at all → no badge (null)', () => {
    expect(pdfUaVerdict(null)).toBe(null);
    expect(pdfUaVerdict({})).toBe(null);
  });
});

describe('anti-drift: the headline badge is wired into the before→after block', () => {
  it('renders the verdict beside the score (independent flag drops the "(self-check)" suffix)', () => {
    expect(viewSrc).toMatch(/\{indep \? '' : ' \(self-check\)'\}: \{label\}/);
    expect(viewSrc).toMatch(/t\('pdf_audit\.pdfua_badge\.lead'\) \|\| 'PDF\/UA-1'/);
  });
  it('shows a "validating…" pill while veraPDF is booting (warmed in the click gesture)', () => {
    expect(viewSrc).toMatch(/if \(veraPdfBusy\) return \([\s\S]{0,400}pdfua_badge\.validating/);
  });
  it('the verdict is NEVER blended into the numeric score (no arithmetic on the verdict)', () => {
    // The badge derivation must not feed blendedAfter / afterDisplay / finalAfterScore.
    expect(viewSrc).not.toMatch(/blendedAfter[^\n]*veraPdf/);
    expect(viewSrc).not.toMatch(/veraPdf[^\n]*blendedAfter/);
  });
});
