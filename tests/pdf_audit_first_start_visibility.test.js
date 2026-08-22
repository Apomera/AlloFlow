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

  it('asserts loading before clearing the chooser that currently owns the modal', () => {
    const handoff = between(
      view,
      'const _beginVisibleAuditRun = (event, detail) => {',
      'const _restoreVisibleAuditAfterFailure = (snapshot) => {',
    );
    const loading = handoff.indexOf('setPdfAuditLoading(true)');
    const clear = handoff.indexOf('setPdfAuditResult(null)');
    expect(loading).toBeGreaterThanOrEqual(0);
    expect(clear).toBeGreaterThan(loading);
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
