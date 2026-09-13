// The connector's run result and report carry compact per-engine verification evidence
// (`verification`: AI, axe, Equal Access) and the per-engine status summary derived from it
// (`verificationChecks`), so a report can be read and calibrated without the pipeline's log
// lines (2026-09-13: the human calibration packets had to reconstruct these numbers from
// stderr). The driver stringifies compactVerificationEvidence into Chromium and the server
// re-normalises what the page returned, so the function must be self-contained and idempotent.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const Verification = require(path.join(ROOT, 'desktop/mcp/remediation_verification.cjs'));
const { compactVerificationEvidence, auditChecks } = Verification;

const cur = {
  verificationAudit: {
    score: 95, chunksAudited: 3, chunksRequested: 3, _partialAudit: false,
    issues: [
      { ruleId: 'region-landmarks', severity: 'moderate', wcag: '1.3.1', issue: 'The title banner is a plain div and no header landmark accompanies the main landmark.', location: 'document', requiresManualReview: false },
      { ruleId: 'other', severity: 'moderate', wcag: '1.3.1', issue: 'x'.repeat(500), location: 'y'.repeat(200), requiresManualReview: true },
    ],
    passes: ['1. LANGUAGE', '2. TITLE'],
  },
  axeAudit: {
    engine: 'axe-core', score: 100, totalViolations: 1, totalIncomplete: 2,
    critical: [], serious: [{ id: 'color-contrast', impact: 'serious', description: 'Elements must meet minimum color contrast ratio thresholds', nodes: 3, wcag: 'wcag2aa, wcag143' }], moderate: [], minor: [],
  },
  secondEngineAudit: {
    engine: 'IBM Equal Access', score: 86, failViolations: 0, potentialViolations: 5, manualViolations: 2, reviewFindingCount: 7,
    fails: [], potentialFindings: [{ id: 'style_color_misuse', nodes: 1, description: 'Verify color is not used as the only visual means of conveying information', details: [{ snippet: 'secret' }] }],
    manualFindings: [{ id: 'style_highcontrast_visible', nodes: 1, description: 'Confirm Windows high contrast mode is supported' }],
  },
};

describe('compactVerificationEvidence', () => {
  it('summarises the three engines with bounded fields and no engine internals', () => {
    const v = compactVerificationEvidence(cur);
    expect(v.ai).toEqual({
      score: 95, issueCount: 2, reviewIssueCount: 1, passCount: 2, chunksAudited: 3, chunksRequested: 3, partial: false, scoreDegraded: false,
      issues: [
        { ruleId: 'region-landmarks', severity: 'moderate', wcag: '1.3.1', issue: 'The title banner is a plain div and no header landmark accompanies the main landmark.', location: 'document', requiresManualReview: false },
        { ruleId: 'other', severity: 'moderate', wcag: '1.3.1', issue: 'x'.repeat(300), location: 'y'.repeat(120), requiresManualReview: true },
      ],
    });
    expect(v.axe).toEqual({ score: 100, totalViolations: 1, totalIncomplete: 2, violations: [{ id: 'color-contrast', impact: 'serious', nodes: 3, description: 'Elements must meet minimum color contrast ratio thresholds', wcag: 'wcag2aa, wcag143' }] });
    expect(v.equalAccess).toEqual({
      score: 86, failViolations: 0, potentialViolations: 5, manualViolations: 2, reviewFindingCount: 7, fails: [],
      reviewFindings: [
        { id: 'style_color_misuse', nodes: 1, description: 'Verify color is not used as the only visual means of conveying information' },
        { id: 'style_highcontrast_visible', nodes: 1, description: 'Confirm Windows high contrast mode is supported' },
      ],
    });
    expect(JSON.stringify(v)).not.toContain('secret');
  });

  it('is idempotent, so the server can re-normalise what the page returned', () => {
    const once = compactVerificationEvidence(cur);
    const twice = compactVerificationEvidence(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });

  it('caps long lists but keeps the full counts, and auditChecks reads the counts', () => {
    const many = { verificationAudit: { score: 40, issues: Array.from({ length: 120 }, (_, i) => ({ ruleId: 'other', severity: 'minor', issue: 'issue ' + i, requiresManualReview: i % 2 === 0 })) } };
    const v = compactVerificationEvidence(many);
    expect(v.ai.issues.length).toBe(50);
    expect(v.ai.issueCount).toBe(120);
    expect(v.ai.reviewIssueCount).toBe(60);
    expect(auditChecks(v).ai).toEqual({ status: 'failed', findings: 120, reviewFindings: 60 });
    expect(auditChecks(compactVerificationEvidence(cur))).toEqual({
      ai: { status: 'failed', findings: 2, reviewFindings: 1 },
      axe: { status: 'failed', findings: 1, reviewFindings: 2 },
      equalAccess: { status: 'review-required', findings: 0, reviewFindings: 7 },
    });
  });

  it('returns null for nothing and tolerates garbage', () => {
    expect(compactVerificationEvidence(null)).toBeNull();
    expect(compactVerificationEvidence({})).toBeNull();
    expect(compactVerificationEvidence({ verificationAudit: 'no', axeAudit: 7, secondEngineAudit: [] })).toBeNull();
    expect(compactVerificationEvidence({ axeAudit: { totalViolations: -1, score: 'x', violations: [null, 3, { id: 5 }] } })).toEqual({ ai: null, axe: { score: null, totalViolations: null, totalIncomplete: null, violations: [{ id: '5', impact: null, nodes: null, description: null, wcag: null }] }, equalAccess: null });
  });

  it('is self-contained enough to be stringified into the page', () => {
    const standalone = new Function('return ' + compactVerificationEvidence.toString())();
    expect(standalone(cur)).toEqual(compactVerificationEvidence(cur));
  });

  it('the driver stringifies it into the run result and the server publishes it', () => {
    const driver = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    const server = fs.readFileSync(path.join(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
    expect(driver).toContain('verificationEvidenceFn: Verification.compactVerificationEvidence.toString(),');
    expect(driver).toContain("verification: (0,eval)('('+verificationEvidenceFn+')')(cur),");
    expect(server).toContain('verification: Verification.compactVerificationEvidence(out.verification),');
    expect(server).toContain('verificationChecks: Verification.auditChecks(Verification.compactVerificationEvidence(out.verification) || {}),');
    expect(server).toContain('verificationChecks: {}, verification: {},');
  });
});
