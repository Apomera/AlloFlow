// Re-entry after accidentally closing the remediation modal (2026-06-16, user report:
// "if I X out of the remediation pipeline modal I don't see a way to get back to it").
//
// Ground truth from the investigation (workflow wl9ozpy4j): the remediated document is NOT
// destroyed on close — it survives in pdfFixResult (App state + localStorage) — but the modal's
// render gate is a DIFFERENT state (pdfAuditResult) which _closePdfAuditModal nulls, stranding the
// work with no in-session door back. The fix: (1) stash the audit object on close + a floating
// "Return to remediation" pill that re-mounts the modal against the surviving pdfFixResult; (2)
// disable the two results-panel buttons that could tear down / reset the modal mid-run (they were
// the only un-guarded mid-run close paths, leaving the auto-fix loop running detached against stale
// state). These are host/view JSX (not runtime-extractable), so we lock them with anti-drift
// assertions over the canonical sources + the generated view module.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const viewMod = readFileSync(resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');

describe('host: result survives close and is re-openable in-session', () => {
  it('a stash ref captures the audit object so re-entry restores the modal verbatim', () => {
    expect(host).toContain('const lastPdfAuditResultRef = useRef(null);');
  });

  it('_closePdfAuditModal stashes the audit object BEFORE nulling pdfAuditResult (and still preserves pdfFixResult)', () => {
    // stash happens, then the modal gate is nulled; pdfFixResult is never cleared here.
    const stashIdx = host.indexOf('lastPdfAuditResultRef.current = pdfAuditResult;');
    const nullIdx = host.indexOf('setPdfAuditResult(null); // close modal; result survives in pdfFixResult');
    expect(stashIdx).toBeGreaterThan(-1);
    expect(nullIdx).toBeGreaterThan(stashIdx); // stash precedes the null
    // do not stash the transient chooser state (it isn't a real result view)
    expect(host).toContain('if (pdfAuditResult && !pdfAuditResult._choosing) lastPdfAuditResultRef.current = pdfAuditResult;');
    // close must NOT clear the result (the whole point — work survives). Scope to the
    // function body so the many _closePdfAuditModal CALL sites don't create false matches.
    const closeStart = host.indexOf('const _closePdfAuditModal = () => {');
    const closeBody = host.slice(closeStart, host.indexOf('\n  };', closeStart));
    expect(closeStart).toBeGreaterThan(-1);
    expect(closeBody).toContain('setPdfAuditResult(null)');
    expect(closeBody).not.toContain('setPdfFixResult(null)');
  });

  it('the floating "Return to remediation" pill is gated on result-exists-but-modal-closed (and never mid-run)', () => {
    // includes the run-state terms (defense-in-depth: the pill is structurally incapable of
    // appearing while any run is in flight, so an overlooked close door can't surface a mid-run pill).
    expect(host).toContain('{(pdfFixResult || lastPdfAuditResultRef.current) && !pdfAuditResult && !pdfAuditLoading && !pdfFixLoading && !pdfAutoContinueRunning && (');
    // pill re-mounts via the stash, with a proven-renderable fallback shape (mirrors the
    // Load-Project pdfAuditResult shape) for the post-reload case where the ref is empty.
    expect(host).toContain('const _restore = lastPdfAuditResultRef.current || {');
    expect(host).toMatch(/const _restore = lastPdfAuditResultRef\.current \|\|[\s\S]{0,400}setPdfAuditResult\(_restore\)/);
    // the fallback carries the fields the results view reads
    expect(host).toMatch(/const _restore = lastPdfAuditResultRef\.current \|\|[\s\S]{0,400}hasSearchableText: true/);
  });

  it('starting a NEW audit drops the stash (no stale re-entry for a cleared result)', () => {
    const invalidateStart = host.indexOf('const invalidatePdfDocumentOperations = () => {');
    const invalidateBody = host.slice(invalidateStart, host.indexOf('\n  };', invalidateStart));
    const startNewStart = host.indexOf('const startNewPdfAudit = () => {');
    const startNewBody = host.slice(startNewStart, host.indexOf('\n  };', startNewStart));
    expect(invalidateStart).toBeGreaterThan(-1);
    expect(invalidateBody).toMatch(/const documentIntakeEpoch = \+\+pdfDocumentSelectionEpochRef\.current;[\s\S]*invalidatePdfAuditRun\(\);/);
    expect(startNewBody).toMatch(/const documentIntakeEpoch = invalidatePdfDocumentOperations\(\);\s*lastPdfAuditResultRef\.current = null;/);
  });
});

describe('view: the two racy results-panel buttons are disabled while a run is active', () => {
  it('source: "Start New Audit" cannot reset state mid-run — it becomes a Stop while the loop runs', () => {
    // Updated design (#1, 2026-06-17): instead of a dead disabled button (which read as "broken"),
    // the loop-running state renders an actionable Stop (abort ONLY — no reset-while-running race),
    // and only the idle branch performs the destructive startNewPdfAudit reset. Same safety invariant
    // (no mid-run teardown), better UX.
    expect(viewSrc).toContain('{pdfAutoContinueRunning ? (');
    const idx = viewSrc.indexOf('{pdfAutoContinueRunning ? (');
    const branch = viewSrc.slice(idx, idx + 2400);
    expect(branch).toContain('pdfAutoContinueAbortRef.current = true'); // running branch = Stop
    expect(branch).toContain('startNewPdfAudit()');                     // idle branch = reset
    expect(branch).toContain('await askPdfConfirmation');               // safe-default destructive confirmation
    expect(branch).toContain('disabled={pdfFixLoading}');               // reset still blocked during the initial fix
    expect(viewSrc).toContain("t('pdf_audit.start_new_running_title')"); // idle-branch loading title retained
  });

  it('source: "Make learning materials" carries the running-state disable guard', () => {
    expect(viewSrc).toContain("t('pdf_audit.whatnow.materials_running_title')");
    const idx = viewSrc.indexOf("t('pdf_audit.whatnow.materials_running_title')");
    const around = viewSrc.slice(idx - 400, idx);
    expect(around).toContain('disabled={pdfFixLoading || pdfAutoContinueRunning}');
  });

  it('EVERY "load doc as source then close modal" teardown button is run-guarded (class invariant)', () => {
    // The teardown signature: load pdfFixResult into the editor, then _closePdfAuditModal().
    // There are several of these ("Make learning materials", "Full Differentiation Pipeline", …);
    // an un-guarded one closes the modal mid-run and leaves the auto-fix loop detached (the exact
    // gap the adversarial review caught at view_pdf_audit_source.jsx:8469). Lock the class: every
    // such button must carry the run-state disable guard within the same <button>.
    const sig = "setInputText(temp.textContent || temp.innerText || '');";
    const guard = 'disabled={pdfFixLoading || pdfAutoContinueRunning}';
    let from = 0, count = 0, idx;
    while ((idx = viewSrc.indexOf(sig, from)) !== -1) {
      count++;
      // the disabled prop sits on the same <button> element, a few lines after the onClick body
      const window = viewSrc.slice(idx, idx + 700);
      expect(window.includes(guard), `un-guarded teardown button near source offset ${idx}`).toBe(true);
      from = idx + sig.length;
    }
    expect(count).toBeGreaterThanOrEqual(2); // at least the two known teardown buttons exist
  });

  it('generated module is rebuilt from source (carries both new guards — no source/module drift)', () => {
    expect(viewMod).toContain('pdf_audit.start_new_running_title');
    expect(viewMod).toContain('pdf_audit.whatnow.materials_running_title');
  });
});
