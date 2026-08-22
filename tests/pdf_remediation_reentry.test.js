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
    // The pill is dismissible, but never while a remediation run is active. Its X is
    // first in DOM/visual order and the group moves inward on wider Canvas viewports so
    // Gemini's lower-right floating toolbar cannot cover the only dismiss control.
    expect(host).toContain('{(pdfFixResult || lastPdfAuditResultRef.current) && !pdfAuditResult && !pdfAuditLoading && !pdfFixLoading && !pdfAutoContinueRunning && !pdfReturnPillDismissed && (');
    expect(host).toContain("ALLO_PDF_REMEDIATION_CACHE.isLatestDismissed(localStorage)");
    expect(host).toContain('right-3 sm:right-24');
    const pillStart = host.indexOf('{(pdfFixResult || lastPdfAuditResultRef.current) && !pdfAuditResult && !pdfAuditLoading');
    const pill = host.slice(pillStart, pillStart + 3600);
    expect(pill.indexOf('onClick={dismissCachedPdfRemediationShortcut}')).toBeGreaterThan(-1);
    expect(pill.indexOf('onClick={dismissCachedPdfRemediationShortcut}')).toBeLessThan(pill.indexOf('onClick={() => openCachedPdfRemediation(false)}'));
    // The second door: dismissing must not be able to lose the work.
    expect(host).toContain("t('storage.remediation_open')");
    expect(host).toContain('aria-labelledby="storage-local-documents-title"');
    // Both doors use one re-entry function, with a proven-renderable fallback shape (mirrors the
    // Load-Project pdfAuditResult shape) for the post-reload case where the ref is empty.
    expect(host).toContain('const restoredAudit = lastPdfAuditResultRef.current || {');
    expect(host).toMatch(/const restoredAudit = lastPdfAuditResultRef\.current \|\|[\s\S]{0,500}setPdfAuditResult\(restoredAudit\)/);
    // the fallback carries the fields the results view reads
    expect(host).toMatch(/const restoredAudit = lastPdfAuditResultRef\.current \|\|[\s\S]{0,500}hasSearchableText: true/);
  });

  it('dismissal preserves the exact cache, while Managed Local Storage owns confirmed deletion', () => {
    const dismissStart = host.indexOf('const dismissCachedPdfRemediationShortcut = () => {');
    const dismissBody = host.slice(dismissStart, host.indexOf('\n  };', dismissStart));
    expect(dismissBody).toContain('ALLO_PDF_REMEDIATION_CACHE.dismissLatest(localStorage)');
    expect(dismissBody).not.toContain('ALLO_PDF_REMEDIATION_CACHE.clear(localStorage)');
    expect(dismissBody).toContain('More information → Manage Local Storage');
    // Reload restoration must keep the original key; otherwise the persistence effect
    // would create an "unknown" duplicate and wrongly reveal the just-hidden shortcut.
    expect(host).toContain('restored._cacheStorageKey = latestKey;');
    expect(host).toContain('const storageKey = restoredStorageKey || `allo.lastPdfAudit__${fname}__${fsize}__${fingerprint}`;');

    expect(host).toContain("t('storage.remediation_delete') || 'Delete'");
    expect(host).toContain("t('storage.remediation_delete_warning')");
    expect(host).toContain('onClick={deleteCachedPdfRemediation}');
    expect(host).toContain('pdfRemediationCacheEntries.map(entry => {');
    expect(host).toContain('restoreCachedPdfRemediation(entry.storageKey, true)');
    expect(host).toContain('deleteCachedPdfRemediationEntry(entry.storageKey)');
    const deleteStart = host.indexOf('const deleteCachedPdfRemediation = () => {');
    const deleteBody = host.slice(deleteStart, host.indexOf('\n  };', deleteStart));
    expect(deleteBody).toContain('ALLO_PDF_REMEDIATION_CACHE.clear(localStorage)');
    expect(deleteBody).toContain('startNewPdfAudit()');
    expect(deleteBody).toContain('refreshStorageManagerInventory()');
  });

  it('surfaces normal Document Hub drafts from workspace recovery and opens them directly', () => {
    // History-backed Document Hub edits are already captured in builderDraft; the local
    // documents view now identifies those snapshots and restores the draft before opening it.
    expect(host).toContain("if (typeof window !== 'undefined' && window.__alloBuilderEditedPack) builderDraft = await _getBuilderDraftForProject();");
    expect(host).toContain('builderDraft,');
    expect(host).toContain('await _restoreBuilderDraftFromProject(workspace.builderDraft || null, restoredHistory);');
    expect(host).toContain('const openCanvasDocumentHubDraft = async (snapshot) => {');
    expect(host).toMatch(/const openCanvasDocumentHubDraft = async \(snapshot\) => \{[\s\S]{0,500}restoreCanvasWorkspaceSnapshot\(snapshot\)[\s\S]{0,300}openExportPreview\('print'\)/);
    expect(host).toContain('Document Hub draft</span>');
    expect(host).toContain('onClick={() => void openCanvasDocumentHubDraft(snapshot)}');
    expect(host).toContain("Document Hub drafts are stored with their saved workspaces below.");
  });

  it('stores and restores the exact audit context for each remediation generation', () => {
    // A score-only fallback keeps very old caches usable, but current caches retain the
    // complete audit object so reopening a different document cannot show another run's details.
    expect(host).toContain("auditResult: (pdfAuditResult && !pdfAuditResult._choosing) ? pdfAuditResult : (lastPdfAuditResultRef.current || null)");
    expect(host).toContain('}, [pdfFixResult, pendingPdfFile, pdfAuditResult]);');
    const restoreStart = host.indexOf('const restoreCachedPdfRemediation = async (storageKey, closeStorageManager = true) => {');
    const restoreBody = host.slice(restoreStart, host.indexOf('\n  };', restoreStart));
    expect(restoreStart).toBeGreaterThan(-1);
    expect(restoreBody).toContain('const restoredAudit = entry.auditResult || {');
    expect(restoreBody).toContain('lastPdfAuditResultRef.current = entry.auditResult || null;');
    expect(restoreBody).toContain('setPdfAuditResult(restoredAudit);');
  });

  it('starting a NEW audit drops the stash (no stale re-entry for a cleared result)', () => {
    const invalidateStart = host.indexOf('const invalidatePdfDocumentOperations = () => {');
    const invalidateBody = host.slice(invalidateStart, host.indexOf('\n  };', invalidateStart));
    const startNewStart = host.indexOf('const startNewPdfAudit = () => {');
    const startNewBody = host.slice(startNewStart, host.indexOf('\n  };', startNewStart));
    expect(invalidateStart).toBeGreaterThan(-1);
    expect(invalidateBody).toMatch(/const documentIntakeEpoch = \+\+pdfDocumentSelectionEpochRef\.current;[\s\S]*invalidatePdfAuditRun\(\);/);
    expect(startNewBody).toMatch(/const documentIntakeEpoch = invalidatePdfDocumentOperations\(\);[\s\S]{0,400}lastPdfAuditResultRef\.current = null;/);
    expect(startNewBody).toContain('ALLO_PDF_REMEDIATION_CACHE.clearDismissal(localStorage)');
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
    // Reset still blocked during the initial fix. Strengthened 2026-07-26: the gate is now
    // _remediationBusy (pdfFixLoading OR the pipeline's own live-run lock), because the host flag
    // alone was observed reading idle over a live run — which would have re-armed this very
    // destructive control mid-remediation.
    expect(branch).toContain('disabled={_remediationBusy}');
    expect(viewSrc).toContain("t('pdf_audit.start_new_running_title')"); // idle-branch loading title retained
  });

  it('source: "Make learning materials" carries the running-state disable guard', () => {
    expect(viewSrc).toContain("t('pdf_audit.whatnow.materials_running_title')");
    const idx = viewSrc.indexOf("t('pdf_audit.whatnow.materials_running_title')");
    const around = viewSrc.slice(idx - 400, idx);
    // 2026-07-26 (audit M1): strengthened to _remediationBusy — see the class-invariant test below.
    expect(around).toContain('disabled={_remediationBusy || pdfAutoContinueRunning}');
  });

  it('EVERY "load doc as source then close modal" teardown button is run-guarded (class invariant)', () => {
    // The teardown signature: load pdfFixResult into the editor, then _closePdfAuditModal().
    // There are several of these ("Make learning materials", "Full Differentiation Pipeline", …);
    // an un-guarded one closes the modal mid-run and leaves the auto-fix loop detached (the exact
    // gap the adversarial review caught at view_pdf_audit_source.jsx:8469). Lock the class: every
    // such button must carry the run-state disable guard within the same <button>.
    const sig = "setInputText(temp.textContent || temp.innerText || '');";
    // 2026-07-26 (audit M1): the guard is now _remediationBusy, not bare pdfFixLoading. This pin
    // hard-coded the old expression as a CLASS invariant, so it actively blocked upgrading these two
    // teardown buttons — a test holding a known-weak guard in place. _remediationBusy is
    // pdfFixLoading OR the pipeline's own live-run lock, so it is strictly stronger.
    const guard = 'disabled={_remediationBusy || pdfAutoContinueRunning}';
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
