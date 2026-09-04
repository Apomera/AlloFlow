import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('PDF audit modal first-start visibility', () => {
  it('gives the extracted audit view direct access to the host loading owner', () => {
    expect(root).toMatch(/setLiveChunkStream,\s*setPdfAuditLoading,\s*setPdfAuditResult/);
    expect(view).toMatch(/setLiveChunkStream,\s*setPdfAuditLoading,\s*setPdfAuditResult/);
  });

  it('asserts loading first and never leaves the modal without a result owner', () => {
    const handoff = between(
      view,
      'const _beginVisibleAuditRun = (event, detail) => {',
      'const _restoreVisibleAuditAfterFailure = (snapshot) => {',
    );
    const loading = handoff.indexOf('setPdfAuditLoading(true)');
    const retain = handoff.indexOf('setPdfAuditResult((previous) => _viewAuditFallbackResult(previous, pendingPdfFile))');
    expect(loading).toBeGreaterThanOrEqual(0);
    expect(retain).toBeGreaterThan(loading);
    // The old shape nulled the result, leaving pdfAuditLoading as the modal's ONLY owner for
    // the whole run. invalidatePdfAuditRun clears exactly that flag, so any invalidation
    // landing mid-audit closed the modal outright and discarded the finished audit with no
    // toast (field report 2026-09-04). The run must always stand on a result it can fall back to.
    expect(handoff).not.toContain('setPdfAuditResult(null)');
  });

  it('hides the chooser while an audit is loading instead of unmounting the modal', () => {
    // The chooser branch wins over the loading branch in the render chain, so suppressing it
    // has to be a render condition - not a nulled result.
    expect(view).toContain('{pdfAuditResult?._choosing && !pdfAuditLoading ? (');
    expect(view).not.toContain('{pdfAuditResult?._choosing ? (');
  });

  it('will not let Escape or a backdrop click silently abort an in-flight audit', () => {
    expect(view).toContain('const _modalDismissBusy = _modalWorkBusy || pdfAuditLoading;');
    expect(view).toContain('if (e.target === e.currentTarget && !_modalDismissBusy) {');
    expect(view).toContain("if (e.key === 'Escape' && !_modalDismissBusy) {");
    // The explicit close button deliberately stays on _modalWorkBusy so a stranded loading
    // flag can never trap the user inside the modal.
    expect(view).toContain('disabled={_modalWorkBusy}');
  });

  it('uses the continuous handoff for Run Audit, Retry Audit, and Make Accessible', () => {
    expect(view).toContain("_beginVisibleAuditRun('audit START clicked");
    expect(view).toContain("_beginVisibleAuditRun('audit RETRY clicked");
    expect(view).toContain("_beginVisibleAuditRun('audit ONE-CLICK started");
    expect(view.match(/_beginVisibleAuditRun\(/g)).toHaveLength(3);
  });

  it('restores a visible chooser/result and releases loading when startup fails', () => {
    const recovery = between(
      view,
      'const _restoreVisibleAuditAfterFailure = (snapshot) => {',
      'const _remediationDependencies =',
    );
    expect(recovery.indexOf('setPdfAuditLoading(false)')).toBeGreaterThanOrEqual(0);
    expect(recovery.indexOf('setPdfAuditResult(_viewAuditFallbackResult')).toBeGreaterThan(
      recovery.indexOf('setPdfAuditLoading(false)'),
    );
    expect(view.match(/_restoreVisibleAuditAfterFailure\(_auditSnapshot\)/g)).toHaveLength(4);
    expect(view.match(/_restoreVisibleAuditAfterFailure\(_auditChooserSnapshot\)/g)).toHaveLength(2);
  });
});
