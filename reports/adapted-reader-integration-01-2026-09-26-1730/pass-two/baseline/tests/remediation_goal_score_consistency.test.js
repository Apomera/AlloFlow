import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeline = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('remediation target and final-score consistency', () => {
  it('uses the canonical 95 default in outcome and distribution policy helpers', () => {
    expect(pipeline).toContain('var PIPELINE_DEFAULTS = { targetScore: 95 };');
    expect(pipeline.match(/opts\.targetScore === 'number'\) \? opts\.targetScore : PIPELINE_DEFAULTS\.targetScore/g)).toHaveLength(2);
    expect(pipeline).not.toContain("opts.targetScore === 'number') ? opts.targetScore : 90");
  });

  it('accepts an AI score only when every requested section was audited', () => {
    const start = view.indexOf('function _viewUsableCompleteAiAudit(audit) {');
    const end = view.indexOf('function _viewAuditFallbackResult', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const usable = Function(view.slice(start, end) + '\nreturn _viewUsableCompleteAiAudit;')();

    expect(usable({ score: 96, chunksRequested: 3, chunksAudited: 3 })).toBe(true);
    expect(usable({ score: 99, chunksRequested: 3, chunksAudited: 2, _partialAudit: false })).toBe(false);
    expect(usable({ score: 99, chunksRequested: 3, chunksAudited: 3, _partialAudit: true })).toBe(false);
    expect(usable({ score: 99 })).toBe(false);
  });

  it('logs the same final governing headline that the result and UI consume', () => {
    expect(pipeline).toContain("final headline score: ' + (Number.isFinite(finalAfterScore) ? finalAfterScore : '?') + '/100'");
    expect(pipeline).toContain('afterScore: Number.isFinite(finalAfterScore) ? finalAfterScore : null,');
    expect(pipeline).toContain('aiScore: _finalAiEvidenceAvailable && verification && Number.isFinite(verification.score) ? verification.score : null,');
    expect(pipeline).not.toContain('afterScore: verification ? verification.score : null,');
    expect(pipeline).toContain('Final AI semantic audit:');
  });

  it('does not treat a structural-only throttle score as verified target completion', () => {
    const start = view.indexOf('Hands-off auto-retry');
    const end = view.indexOf('className="w-full px-8 py-4', start);
    const handsOff = view.slice(start, end);
    expect(handsOff).toContain("x.afterScoreVerified === true && !x.requiresManualReview");
    expect(handsOff).toContain('x._aiVerificationIncomplete');
    expect(handsOff).toContain('_s >= pdfTargetScore && _handsCanonicalComplete(r)');
    expect(handsOff).toContain('const _plateau = !_evidenceProgressed && !_stillRecoveringThrottle;');
    expect(handsOff).not.toContain('ai-throttled-clean (shipping structural result)');
  });
});
