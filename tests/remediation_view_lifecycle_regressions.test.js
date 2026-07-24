import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('remediation view async document ownership', () => {
  it('binds web/media jobs to a controller and the host document epoch', () => {
    expect(view).toContain('const _viewDocumentJobRef = useRef({ id: 0, controller: null });');
    expect(view).toContain("documentEpoch: typeof capturePdfDocumentIntakeEpoch === 'function' ? capturePdfDocumentIntakeEpoch() : null");
    expect(view).toContain('isPdfDocumentIntakeCurrent(token.documentEpoch)');
    expect(view).toContain("if (!_viewDocumentJobIsCurrent(_webRemediationToken)) return;");
    expect(view).toContain("if (!_viewDocumentJobIsCurrent(_mediaToken)) return;");
    expect(view.match(/if \(typeof startNewPdfAudit === 'function'\) startNewPdfAudit\(\);/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('blocks same-tick duplicate starts and disables modal close throughout one-click and auxiliary work', () => {
    expect(view).toContain('webJobBusy || _viewDocumentJobIsActive()');
    expect(view).toContain('const _modalWorkBusy = oneClickRemediationBusy || pdfFixLoading || pdfAutoContinueRunning || pdfBatchProcessing || batchIngesting || mediaDigesting || applyingRemarkup || !!webJobBusy;');
    expect(view).toContain('disabled={_modalWorkBusy}');
  });

  it('rejects stale or unstamped remediation trace events', () => {
    expect(view).toContain('Number.isInteger(e.detail.documentEpoch) && e.detail.documentEpoch === pdfDocumentEpoch');
    expect(view).toContain('if (!_eventIsForCurrentDocument(e)) return;');
    expect(view).toContain('}, [pdfDocumentEpoch]);');
  });

  it('invalidates the one-click wrapper when another document takes ownership', () => {
    expect(view).toContain('const _oneClickDocumentEpoch = typeof capturePdfDocumentIntakeEpoch');
    expect(view).toContain('if (!_oneClickDocumentIsCurrent()) return;');
    expect(view).toContain('while (!_res && _fixTries < _HANDSOFF_MAX && !_stopped() && _oneClickDocumentIsCurrent())');
  });

  it('allows deterministic transcript and Office audits when only Gemini is missing', () => {
    expect(view).toContain("_auditMissingDependencies.every((name) => name === 'GeminiAPI')");
    expect(view).toContain("pendingPdfBase64.slice(0, 23) === 'QUxMT1RSQU5TQ1JJUFQ6djE'");
    expect(view.match(/disabled=\{pdfAuditLoading \|\| !_auditInputReady\}/g)?.length).toBe(2);
  });

  it('web remediation clears stale PDF bytes and exits the chooser on success', () => {
    expect(view).toContain("setWebJobBusy('remediate');\n                        setPendingPdfBase64(null);");
    expect(view).toContain('setPdfWebMode(false);');
    expect(view).toContain('_isWebRemediation: true');
    expect(view).toContain('setPdfAuditResult({\n                            score: Number.isFinite(beforeScore) ? beforeScore : null');
  });
  it('binds compare crop and tagged callbacks to the opening document and HTML', () => {
    expect(view).toContain('_compareDocumentEpoch = typeof capturePdfDocumentIntakeEpoch');
    expect(view).toContain('let _compareHtmlToken = _captureAsyncHtmlToken();');
    expect(view).toContain('if (!_compareRequestMatches(payload) || !_compareIsCurrent()) return false;');
    expect(view).toContain('_commitAsyncHtmlIfCurrent(_compareHtmlToken');
    expect(view).toContain("documentEpoch: _compareDocumentEpoch, images:");
    expect(view).toContain('_clearComparePopupCallbacks(_comparePopupOwnerRef.current);');
    expect(view).not.toContain('Promise.race([\n                                if (!_compareIsCurrent())');
    expect(view).toContain("win = window.open('', '_blank');");
    expect(view).toContain('let _compareDocumentEpoch = null, _compareOwnerNonce = null;');
    expect(view).toContain("_compareOwnerNonce = Date.now().toString(36)");
    expect(view).not.toContain('const _compareDocumentEpoch =');
    expect(view).not.toContain('const _compareOwnerNonce =');
    expect(view).toContain('request.documentEpoch === _compareDocumentEpoch && request.ownerNonce === _compareOwnerNonce');
    expect(view).toContain('window.opener.__alloflowCompareGetTagged({ documentEpoch: ${JSON.stringify(_compareDocumentEpoch)}, ownerNonce: ${JSON.stringify(_compareOwnerNonce)} })');
    expect(view).toContain('currentResult = pdfFixResultRef && pdfFixResultRef.current');
    expect(view).toContain('persisted = window.opener.__alloflowCompareCropInsert');
    expect(view).toContain('ownerNonce: ${JSON.stringify(_compareOwnerNonce)}');

    expect(view).toContain('win.__alloflowCompareDocumentEpoch = _compareDocumentEpoch;\n                            win.__alloflowCompareOwnerNonce = _compareOwnerNonce;');
    expect(view).toContain('_clearComparePopupCallbacks(_comparePopupOwnerRef.current);\n                            try { if (win && !win.closed) win.close();');
    expect(view).toContain('}\n                          if (!win) return;\n                          const beforeScore');
    const scopeProbe = new Function(`
      let win = null;
      let documentEpoch = null, ownerNonce = null;
      try { win = {}; documentEpoch = 17; ownerNonce = 'owner-a'; } catch (_) {}
      if (!win) return null;
      return { documentEpoch, ownerNonce };
    `);
    expect(scopeProbe()).toEqual({ documentEpoch: 17, ownerNonce: 'owner-a' });
    expect(view).toContain("comparison belongs to a different or changed document");
  });
});

describe('owned batch intake and readiness', () => {
  it('recognizes extension-only PDFs and commits one completed intake atomically', () => {
    expect(view).toContain('/\\.(pdf|docx|pptx|md|markdown|csv|tsv|xlsx|xls|xlsb|ods)$/i');
    expect(view).toContain('const _alloEnqueueBatchFilesOwned = async (files) => {');
    expect(view).toContain('setPdfBatchQueue((previousQueue) => [...previousQueue, ...entries])');
    expect(view).toContain('const _added = await _alloEnqueueBatchFilesOwned(files);');
    expect(view).toContain('session.documentEpoch == null');
    expect(view).not.toContain('const _alloEnqueueBatchFile =');
    expect(view).not.toContain('const _alloEnqueueBatchFiles =');
  });

  it('shares limits with desktop folder intake and gates starts/retries on readiness', () => {
    expect(view).toContain('const accepted = _alloBatchPreflight(descriptors, []);');
    expect(view).toContain('actualBytes + actualSize > _BATCH_MAX_TOTAL_BYTES');
    expect(view).toContain("if (!_requireRemediationReady() || typeof runPdfBatchRemediation !== 'function')");
    expect(view).toContain('disabled={batchIngesting || remediationReady === false}');
    expect(view).toContain('await Promise.resolve(runPdfBatchRemediation({ resumeQueue');
    expect(view).toContain('Batch resume could not start:');
  });

  it('does not retain the stale promise-chain intake implementation', () => {
    expect(view).not.toContain('accepted.reduce((chain, f) => chain.then(() => _alloEnqueueBatchFile(f))');
  });

  it('keeps incomplete batch work honest and resumable', () => {
    expect(view).toContain("pdfBatchSummary.status === 'paused-quota' ? 'Batch Paused at AI Quota'");
    expect(view).toContain("pdfBatchSummary.status === 'stopped' ? 'Batch Processing Stopped'");
    expect(view).toContain('(!pdfBatchSummary || _batchSummaryIncomplete)');
    expect(view).toContain('Resume Pending ({_batchSummaryPending})');
    expect(view).toContain("_batchSummaryIncomplete ? 'Download Processed (ZIP)' : 'Download All (ZIP)'");
    expect(view).toContain('Pending batch files could not resume:');

  });
  it('discards an interrupted checkpoint before clearing the New Batch UI', async () => {
    const newBatchStart = view.indexOf('data-help-key="pdf_audit_view_batch_new_batch_btn"');
    const newBatchEnd = view.indexOf('</button>', newBatchStart);
    const newBatchHandler = view.slice(newBatchStart, newBatchEnd);
    const declarationAt = newBatchHandler.indexOf("const checkpointBatchId = typeof pdfBatchSummary.batchId === 'string'");
    const discardAt = newBatchHandler.indexOf('const discarded = await _docPipeline.discardResumableBatch(checkpointBatchId);');
    const clearAt = newBatchHandler.indexOf('setPdfBatchQueue([]);');
    expect(newBatchStart).toBeGreaterThan(-1);
    expect(declarationAt).toBeGreaterThan(-1);
    expect(discardAt).toBeGreaterThan(-1);
    expect(discardAt).toBeGreaterThan(declarationAt);
    expect(clearAt).toBeGreaterThan(discardAt);
    expect(newBatchHandler).toContain("if (!discarded) throw new Error('storage did not confirm deletion');");
    expect(newBatchHandler).toContain('Could not discard the saved batch checkpoint:');
    expect(newBatchHandler).toContain('does not include a safe checkpoint identity');
    expect(view).not.toContain('_docPipeline.discardResumableBatch(null)');
    const extracted = view.match(/data-help-key="pdf_audit_view_batch_new_batch_btn" onClick=\{async \(\) => \{([\s\S]*?)\}\} className=/);
    expect(extracted).not.toBeNull();
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runNewBatch = new AsyncFunction(
      '_batchSummaryIncomplete', 'pdfBatchSummary', '_docPipeline', 'addToast',
      '_cancelBatchIngest', 'setPdfBatchQueue', 'setPdfBatchSummary', extracted[1],
    );
    const discardedIds = [];
    const cleared = [];
    const toasts = [];
    await runNewBatch(
      true,
      { batchId: ' batch-a ' },
      { discardResumableBatch: async (id) => { discardedIds.push(id); return true; } },
      (...args) => toasts.push(args),
      () => cleared.push('ingest'),
      () => cleared.push('queue'),
      () => cleared.push('summary'),
    );
    expect(discardedIds).toEqual(['batch-a']);
    expect(cleared).toEqual(['ingest', 'queue', 'summary']);
    await runNewBatch(true, { batchId: '' }, { discardResumableBatch: async () => true }, (...args) => toasts.push(args), () => cleared.push('unexpected'), () => cleared.push('unexpected'), () => cleared.push('unexpected'));
    expect(cleared).toEqual(['ingest', 'queue', 'summary']);
    expect(toasts.some(([message]) => String(message).includes('safe checkpoint identity'))).toBe(true);
  });
  it('also discards the resume banner checkpoint by exact ID only', () => {
    expect(view).toContain("const checkpointBatchId = typeof resumableBatch.batchId === 'string' ? resumableBatch.batchId.trim() : '';");
    expect(view.match(/await _docPipeline\.discardResumableBatch\(checkpointBatchId\)/g)?.length).toBe(2);
    expect(view).not.toContain('discardResumableBatch(resumableBatch.batchId || null)');
    expect(view).not.toContain('discardResumableBatch(null)');
  });

  it('stamps view-emitted lifecycle events with the current document epoch', () => {
    expect(view).toContain("new CustomEvent('alloflow:fidelity-stale', { detail: { documentEpoch: _eventDocumentEpoch } })");
    expect(view).toContain("new CustomEvent('alloflow:extraction-complete', { detail: { documentEpoch: _compareDocumentEpoch, images:");
  });
  });

describe('honest scores, project memory cap, and loop completion', () => {
  it('preserves a null score as unavailable rather than coercing it to zero', () => {
    expect(view).toContain('const _auditScoreKnown = !!(pdfAuditResult && Number.isFinite(pdfAuditResult.score));');
    expect(view).toContain('Coverage incomplete - no numeric baseline was assigned');
    expect(view).toContain("_auditScoreKnown ? pdfAuditResult.score : 'unavailable'");
  });

  it('caps project JSON before read and updates both user-facing messages', () => {
    expect(view).toContain('const _VIEW_MAX_PROJECT_FILE_BYTES = 64 * 1024 * 1024;');
    expect(view.match(/larger than the 64 MB safety limit/g)?.length).toBe(2);
  });

  it('does not declare completion solely because axe is clean and catches loop errors', () => {
    expect(view).toContain('if (!r || _s >= pdfTargetScore || _s <= _prevScore) break;');
    expect(view).not.toContain("if (!r || _s >= pdfTargetScore || (r.axeAudit && r.axeAudit.totalViolations === 0)");
    expect(view).toContain('Auto-remediation stopped after an error:');
  });
});

describe('score honesty in restored projects and batch reporting', () => {
  it('preserves unknown project scores and classifies unknown batch scores separately', () => {
    expect(view.match(/score: Number\.isFinite\(project\.beforeScore\) \? project\.beforeScore : null/g)?.length).toBe(2);
    expect(view).toContain("const unknown = done.filter(f => !Number.isFinite(f.result?.afterScore));");
    expect(view).toContain("const cls = !afterKnown ? 'unknown'");
    expect(view).toContain("_afterKnown ? item.result.afterScore : 'Unknown'");
    expect(view).not.toContain('score: project.beforeScore || 0');
  });
});

describe('project loader parity and verification safety', () => {
  it('restores size and source identity consistently', () => {
    expect(view.match(/Number\(project\.fileSize\) \|\| Number\(project\.multiSession\?\.fileSize\) \|\| 0/g)?.length).toBeGreaterThanOrEqual(3);
    expect(view).toContain("documentDigest: project.pdfBase64 ? undefined : (project.docKey || project.auditResult?.documentDigest || null)");
  });

  it('keeps an unfinished project baseline unknown when no audit was saved', () => {
    expect(view).toContain('score: null, scores: [], critical: [], major: [], minor: [], passes: []');
    expect(view).not.toContain('score: 0, scores: [], critical: [], major: [], minor: [], passes: []');
  });

  it('re-derives verification from stored engine evidence in both loaders', () => {
    expect(view).toContain('function _viewNormalizeLoadedVerification(result, pipeline)');
    expect(view.match(/const _normalizedLoadedFixResult = _viewNormalizeLoadedVerification\(_loadedFixResult, _docPipeline\);/g)?.length).toBe(2);
    expect(view.match(/setPdfFixResult\(_normalizedLoadedFixResult\);/g)?.length).toBe(2);
  });

  it('handles synchronous FileReader start failures in both loaders', () => {
    expect(view.match(/try \{ reader\.readAsText\(file\); \}/g)?.length).toBe(2);
    expect(view).toContain("'Unable to start reading project file'");
    expect(view.match(/e\.target\.value = '';\n\s+return;/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
