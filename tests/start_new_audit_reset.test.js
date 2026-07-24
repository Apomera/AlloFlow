// "Start New Audit" no-op (#1, 2026-06-17): the button isn't broken — it's DISABLED because the
// auto-continue loop is still grinding (legitimately, for minutes), and there was no dead-man switch
// for that flag nor a reset of it in startNewPdfAudit, so a stranded flag could leave it disabled
// forever. Fixes: (a) startNewPdfAudit now aborts + clears the auto-continue loop; (b) a dead-man
// switch mirrors the pdfFixLoading one; (c) the button becomes an actionable Stop while the loop runs
// (no reset-while-running race) and reverts to Start New Audit once the loop ends.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('#1 host — startNewPdfAudit fully resets, + dead-man switch for the auto-continue flag', () => {
  it('startNewPdfAudit aborts the loop and clears pdfAutoContinueRunning + the abort controller', () => {
    const start = host.indexOf('const startNewPdfAudit = () => {');
    const end = host.indexOf('const ensurePdfBase64', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = host.slice(start, end);
    expect(body).toContain('invalidatePdfDocumentOperations()');
    expect(body).toContain('pdfAutoContinueAbortRef.current = true');
    expect(body).toContain('pdfAutoContinueAbortCtrlRef.current.abort()');
    expect(body).toContain('pdfAutoContinueAbortCtrlRef.current = null');
    expect(body).toContain('setPdfAutoContinueRunning(false)');
  });

  it('a dead-man useEffect clears a stranded pdfAutoContinueRunning (mirrors the pdfFixLoading one)', () => {
    expect(host).toContain('Dead-man switch fired: pdfAutoContinueRunning stuck');
    // keyed on the same (flag, step) pair so it only fires when genuinely stalled
    const i = host.indexOf('pdfAutoContinueRunning stuck');
    const around = host.slice(i - 600, i + 400);
    expect(around).toContain('if (pdfFixStep === stepAtStart)');
    expect(around).toContain('setPdfAutoContinueRunning(false)');
  });
});

describe('#1 view — the Start-New button is an actionable Stop while the loop runs', () => {
  it('renders Stop (abort) when pdfAutoContinueRunning, else the Start New Audit reset', () => {
    expect(view).toContain('{pdfAutoContinueRunning ? (');
    // the running branch sets the abort flag (Stop only — no reset-while-running)
    const i = view.indexOf('{pdfAutoContinueRunning ? (');
    const branch = view.slice(i, i + 2400);
    expect(branch).toContain('pdfAutoContinueAbortRef.current = true');
    expect(branch).toContain('startNewPdfAudit()'); // the idle branch still resets
    expect(branch).toContain('await askPdfConfirmation'); // destructive reset uses the shared safe-default dialog
    // idle branch is only disabled by the initial-fix flag now, not the loop flag
    expect(branch).toContain('disabled={pdfFixLoading}');
    expect(branch).not.toContain('disabled={pdfFixLoading || pdfAutoContinueRunning}');
  });
});
