// Final-audit throttle estimate (2026-07-08): when the authoritative final AI audit
// does not produce a usable score, the verified after score stays pending, but the
// UI/report may show a lower-confidence estimated minimum based on the lower of the
// last successful AI score and the current automated score.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

const estimatedMinimum = (lastAi, automated) => Math.min(lastAi, automated);

describe('final audit estimated minimum score', () => {
  it('is conservative: never above the last successful AI score or automated score', () => {
    expect(estimatedMinimum(96, 88)).toBe(88);
    expect(estimatedMinimum(82, 94)).toBe(82);
  });

  it('pipeline treats a missing final audit score as incomplete and carries estimate metadata', () => {
    // Mutable because the explicit final-audit retry may recover (or lose) a usable score.
    expect(pipeSrc).toContain('let _finalAuditScoreMissing = !_finalAuditHadUsableScore;');
    // The inline chain became the named _alloUsableCompleteAiAudit guard, which
    // covers the same four conditions and adds a coverage requirement. Pin the
    // call AND the guard body, so the semantics stay asserted, not just a name.
    expect(pipeSrc).toMatch(/const _aiDegraded = !_alloUsableCompleteAiAudit\(verification\) \|\| _finalAuditScoreMissing;/);
    expect(pipeSrc).toMatch(/function _alloUsableCompleteAiAudit\(audit\) \{[\s\S]{0,320}Number\.isFinite\(audit\.score\)[\s\S]{0,200}audit\._scoreDegraded !== true[\s\S]{0,200}audit\.synthesized !== true/);
    expect(pipeSrc).toContain('_estimatedMinimumScore = _alloComputeHeadline(_lastSuccessfulAiScore, deterministicScore);');
    expect(pipeSrc).toContain("kind: 'last-successful-ai-plus-current-automated'");
    expect(pipeSrc).toMatch(/_estimatedMinimumScore: Number\.isFinite\(_estimatedMinimumScore\) \? _estimatedMinimumScore : null/);
    expect(pipeSrc).toContain('_finalAuditRetryAvailable: !!(_aiVerificationIncomplete && accessibleHtml)');
  });

  it('reports disclose the estimate without making it the verified after score', () => {
    expect(pipeSrc).toContain('const _rptEstimate = Number.isFinite(d._estimatedMinimumScore) ? d._estimatedMinimumScore : null;');
    expect(pipeSrc).toMatch(/Estimated minimum:[\s\S]{0,120}_rptEstimate/);
    expect(pipeSrc).toContain('Final AI semantic audit incomplete, so the post-remediation score is not verified.');
  });

  it('the UI shows the estimate and provides a calm-aware Complete final audit action', () => {
    expect(viewSrc).toContain("t('pdf_audit.score.estimated_min')");
    expect(viewSrc).toContain("t('pdf_audit.verification.estimated_min_label')");
    expect(viewSrc).toContain('Complete final audit');
    expect(viewSrc).toContain('waitForGeminiCalm');
    // In THIS lane the estimate is now null, and that is the fix (2026-07-27).
    // Setting it to _wscore made the panel print one number twice under two
    // labels — "structural only: 90" and "estimated minimum: 90" — the second of
    // which claims to fold in the last successful AI audit. No such audit exists
    // in this lane, so the estimate implied corroboration that was never there.
    // Null makes the panel omit the estimate instead of fabricating one.
    expect(viewSrc).toContain('_estimatedMinimumScore: null,');
    // and the basis must be the OBJECT shape the pipeline writes and the UI
    // reads; it was a string here, so this very lane rendered "AI ? / automated ?"
    expect(viewSrc).toMatch(/_estimatedScoreBasis: \(!_wvOk && Number\.isFinite\(_wdet\)\) \? \{/);
  });

  it('export payloads carry both verified=false and the estimate basis', () => {
    expect(viewSrc).toContain('afterScoreVerified: _jsonVerification.afterScoreVerified');
    expect(viewSrc).toContain('aiVerificationIncomplete: !!value._aiVerificationIncomplete');
    expect(viewSrc).toContain('estimatedMinimumScore: Number.isFinite(pdfFixResult._estimatedMinimumScore)');
    expect(viewSrc).toContain('estimatedScoreBasis: pdfFixResult._estimatedScoreBasis || null');
  });
});
