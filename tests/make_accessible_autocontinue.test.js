// "Make Accessible" auto-continue fix (2026-06-15). The one-click handler chained
// audit → fix, but called fixAndVerifyPdf WITHOUT the audit result — relying on the React state
// pdfAuditResult having propagated within a fixed setTimeout(250). On a slow/large run that race
// lost, fixAndVerifyPdf hit its `if (!_auditResult) return null` guard ("no audit results found"),
// and remediation silently never ran after the audit. Fix: capture the audit's return value and
// pass it as auditResult, so the fix no longer depends on state propagation.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// mirror of fixAndVerifyPdf's audit-result resolution + the bail guard
const wouldBailNoAudit = (batchOverrides, pdfAuditResult, silentMode) => {
  const _auditResult = (batchOverrides && batchOverrides.auditResult) || pdfAuditResult;
  return !silentMode && !_auditResult; // true → fixAndVerifyPdf returns null with "no audit results"
};

describe('Make Accessible — fix runs even when audit state has not propagated', () => {
  it('passing auditResult means the fix does NOT bail, even when React state is still null (the fix)', () => {
    expect(wouldBailNoAudit({ auditResult: { score: 60 } }, null, false)).toBe(false);
  });
  it('the OLD path (no auditResult passed + state not yet propagated) WOULD bail (the bug)', () => {
    expect(wouldBailNoAudit({ base64: 'x' }, null, false)).toBe(true);
  });
  it('and once state is present it also works (the lucky-timing case)', () => {
    expect(wouldBailNoAudit({ base64: 'x' }, { score: 60 }, false)).toBe(false);
  });

  it('anti-drift: the handler captures the audit result and passes it to fixAndVerifyPdf', () => {
    expect(viewSrc).toContain('_audit = await runPdfAccessibilityAudit(pendingPdfBase64, { fileName: pendingPdfFile?.name });');
    expect(viewSrc).toContain('auditResult: _audit });');
    expect(viewSrc).toContain('const _auditChooserSnapshot = pdfAuditResult;');
    expect(viewSrc).toContain('setPdfAuditResult(_viewAuditFallbackResult(_auditChooserSnapshot, pendingPdfFile));');
    expect(viewSrc).toContain('if (!_viewAuditCanStartRemediation(_audit))');
    expect(viewSrc).not.toContain('auditResult: _audit || undefined');
    expect(viewSrc).not.toContain('attempting remediation anyway');
  });
  it('fails closed when the initial audit is absent or explicitly unavailable', () => {
    const start = viewSrc.indexOf('function _viewAuditCanStartRemediation');
    const end = viewSrc.indexOf('function _viewAuditFallbackResult', start);
    const canStart = new Function(viewSrc.slice(start, end) + '\nreturn _viewAuditCanStartRemediation;')();
    expect(canStart(null)).toBe(false);
    expect(canStart({ score: -1 })).toBe(false);
    expect(canStart({ score: null, _coverageIncomplete: true })).toBe(true);
    expect(canStart({ score: 0 })).toBe(true);
  });
  it('anti-drift: fixAndVerifyPdf prefers the passed auditResult over React state', () => {
    // Harness repair (2026-07-09): S1 snapshots audit state at run entry (_run.auditResult).
    expect(pipeSrc).toContain('const _auditResult = batchOverrides?.auditResult || _run.auditResult;');
  });
});
