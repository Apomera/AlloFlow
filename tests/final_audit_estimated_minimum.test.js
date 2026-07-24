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
    expect(pipeSrc).toMatch(/_aiDegraded = !verification \|\| verification\.score === null \|\| verification\._scoreDegraded \|\| verification\.synthesized \|\| _finalAuditScoreMissing/);
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
    expect(viewSrc).toContain('_estimatedMinimumScore: (!_wvOk && Number.isFinite(_wscore)) ? _wscore : null');
  });

  it('export payloads carry both verified=false and the estimate basis', () => {
    expect(viewSrc).toContain('afterScoreVerified: _jsonVerification.afterScoreVerified');
    expect(viewSrc).toContain('aiVerificationIncomplete: !!value._aiVerificationIncomplete');
    expect(viewSrc).toContain('estimatedMinimumScore: Number.isFinite(pdfFixResult._estimatedMinimumScore)');
    expect(viewSrc).toContain('estimatedScoreBasis: pdfFixResult._estimatedScoreBasis || null');
  });
});
