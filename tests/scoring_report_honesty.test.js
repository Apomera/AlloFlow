// Scoring-report honesty (2026-06-22), from pdf_pipeline_refinement_report PDF-P0.1/P0.3 (the UMaine/
// legal-attestation surface). The headline moved to weakest-layer min() in the engine + live UI, but the
// EXPORTED reports an administrator forwards still described the OLD "50/50 blend" + a buy-back, and the
// BATCH report attested "meet WCAG 2.1 Level AA compliance" with no PDF/UA caveat. (PDF-P0.2 — before→after
// "mixes formulas" — turned out NOT to apply: the initial audit already governs beforeScore via the same
// _alloComputeHeadline min() at doc_pipeline ~7585, so both ends are two-engine by design.)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const audit = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('PDF-P0.1: exported reports describe the weakest-layer model, not a 50/50 blend', () => {
  it('the stale "50/50 blend" / "blends the AI rubric … at 50/50" wording is gone', () => {
    expect(dp).not.toMatch(/50\/50 blend of AI/);
    expect(dp).not.toMatch(/blends the AI rubric[\s\S]{0,80}50\/50/);
  });
  it('the Scoring Methodology formula now states weakest-layer + no buy-back', () => {
    expect(dp).toMatch(/weakest-layer score/);
    expect(dp).toMatch(/do <strong>not<\/strong> buy back deductions/);
    expect(dp).not.toMatch(/proportionally offset deductions/); // old buy-back sentence removed
  });
  it('the Adobe-style score block caption describes the governing min(), not a mean', () => {
    expect(dp).toMatch(/Headline is the <strong>weakest-layer score<\/strong>/);
    expect(dp).toMatch(/weakest layer governs/);
  });
  it('_scoreIsBlended is documented as the governing min() (not renamed, to avoid cross-module churn)', () => {
    expect(dp).toMatch(/_scoreIsBlended \(legacy name\): true when the headline is the GOVERNING weakest-layer/);
  });
});

describe('PDF-P0.3: the BATCH compliance summary no longer overclaims PDF/UA', () => {
  it('drops the bare "meet WCAG 2.1 Level AA compliance (score ≥ 90)" attestation', () => {
    expect(audit).not.toMatch(/meet WCAG 2\.1 Level AA compliance \(score ≥ 90\)/);
  });
  it('reframes the score as AlloFlow\'s content audit + carries the PDF/UA caveat', () => {
    expect(audit).toMatch(/scored <strong>≥ 90 on AlloFlow's content audit<\/strong>/);
    expect(audit).toMatch(/not<\/strong> an ISO 14289-1 \(PDF\/UA\) conformance verdict/);
    expect(audit).toMatch(/Validate exported PDFs in veraPDF \/ PAC/);
  });
});

describe('the inserted "Accessibility Statement" no longer asserts certified compliance', () => {
  it('drops the "Compliance Statement" + "WCAG-compliant pipeline" overclaim', () => {
    expect(audit).not.toMatch(/Accessibility Compliance Statement/);
    expect(audit).not.toMatch(/WCAG-compliant document pipeline/);
    expect(audit).not.toMatch(/Insert Compliance Statement/);
  });
  it('reframes the standards as "built toward … not an independent conformance audit" + a caveat', () => {
    expect(audit).toMatch(/Built toward WCAG 2\.1 Level AA[\s\S]{0,80}not an independent conformance audit/);
    expect(audit).toMatch(/Color contrast targeted to WCAG 2\.1 AA/); // was "ratios meeting"
    expect(audit).toMatch(/not an independently validated WCAG, ADA, Section 508, or PDF\/UA conformance audit/);
  });
});

describe('(2026-06-22) Content Audit Score cards read before→after, not reversed', () => {
  // The score block showed POST(90) → PRE(0): post on the left, pre on the right — backwards for a
  // before→after progression. Cards now read PRE → POST (before on the left, the result emphasized
  // on the right), keeping the → arrow (flipping it would be wrong).
  it('Pre-Remediation card renders BEFORE the Post-Remediation card', () => {
    const pre = dp.indexOf('text-transform:uppercase">Pre-Remediation');
    const post = dp.indexOf('text-transform:uppercase">Post-Remediation');
    expect(pre).toBeGreaterThan(-1);
    expect(post).toBeGreaterThan(-1);
    expect(pre).toBeLessThan(post);
  });
  it('keeps the → arrow (not reversed) and marks it aria-hidden', () => {
    expect(dp).toContain('color:#475569" aria-hidden="true">→</div>');
    // the score block's before→after row has no reversed arrow
    expect(dp).not.toMatch(/font-size:24px;color:#64748b">→/);
  });
});

describe('(2026-06-22) marginal #64748b footer/meta hardened to a comfortable AA shade', () => {
  // #64748b on white is 4.76:1 — technically passes AA but borderline (and the export footer is injected
  // AFTER the contrast pass, so it never got checked). The distributed-doc footer + the report's own meta
  // line are bumped to #475569 (~7.6:1) so they're no longer borderline / re-flagged.
  it('the export remediation footer uses #475569, not the borderline #64748b', () => {
    expect(dp).toMatch(/remediationFooter = `<footer role="contentinfo"[^`]*color:#475569/);
    expect(dp).not.toMatch(/remediationFooter = `<footer role="contentinfo"[^`]*color:#64748b/);
  });
  it('the conformance-report Document meta line uses #475569', () => {
    expect(dp).toMatch(/<p style="color:#475569;font-size:13px">Document:/);
  });
});
