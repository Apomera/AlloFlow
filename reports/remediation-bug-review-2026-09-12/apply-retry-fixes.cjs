const fs=require('fs');function save(f,s){fs.writeFileSync(f+'.review-tmp',s);fs.renameSync(f+'.review-tmp',f);}let s=fs.readFileSync('view_pdf_audit_source.jsx','utf8');function rep(a,b){if(!s.includes(a))throw Error(a.slice(0,90));s=s.replace(a,b);}
rep('  const [workspaceDestination, setWorkspaceDestination] = useState(null);','  const [batchActionBusy, setBatchActionBusy] = useState(false);\n  const _batchActionBusyRef = useRef(false);\n  const [workspaceDestination, setWorkspaceDestination] = useState(null);');
rep('const _modalWorkBusy = oneClickRemediationBusy', 'const _modalWorkBusy = batchActionBusy || oneClickRemediationBusy');
rep('const _modalHasActiveWork = () => _modalWorkBusy || _oneClickRemediationBusyRef.current', 'const _modalHasActiveWork = () => _modalWorkBusy || _batchActionBusyRef.current || _oneClickRemediationBusyRef.current');
rep('  const _requestCloseAudit = () => { if (!_modalHasActiveWork()) safeCloseAudit(); };', `  const _requestCloseAudit = () => { if (!_modalHasActiveWork()) safeCloseAudit(); };
  const _runBatchSelection = async (kind, fileId) => {
    if (_modalHasActiveWork() || pdfAuditLoading) return;
    if (!_requireRemediationReady() || typeof runPdfBatchRemediation !== 'function') {
      if (typeof runPdfBatchRemediation !== 'function') addToast('The batch remediation engine is unavailable. Retry after it finishes loading.', 'error');
      return;
    }
    const selected = pdfBatchQueue.filter(item => item && (kind === 'retry'
      ? item.status === 'failed' && (fileId == null || item.id === fileId)
      : !item.status || item.status === 'pending' || item.status === 'processing'));
    if (!selected.length) { addToast(kind === 'retry' ? 'No failed files to retry.' : 'No pending files to resume.', 'info'); return; }
    const ids = new Set(selected.map(item => item.id));
    // Pass the complete queue explicitly: React may not have committed a setter yet.
    // The pipeline limits this invocation to the selected IDs and retains every other result.
    const queue = pdfBatchQueue.map(item => ids.has(item.id) ? { ...item, status: 'pending', error: null } : item);
    _batchActionBusyRef.current = true;
    setBatchActionBusy(true);
    try {
      await Promise.resolve(runPdfBatchRemediation({
        resumeQueue: queue,
        resumeBatchId: pdfBatchSummary && pdfBatchSummary.batchId,
        resumeSettings: pdfBatchSummary && pdfBatchSummary.settings,
        retryFileIds: selected.map(item => item.id),
      }));
    } catch (error) {
      addToast((kind === 'retry' ? 'Batch retry could not start: ' : 'Pending batch files could not resume: ') + ((error && error.message) || error), 'error');
    } finally {
      _batchActionBusyRef.current = false;
      setBatchActionBusy(false);
    }
  };`);
rep("(Number.isFinite(pdfBatchSummary.pending) ? pdfBatchSummary.pending : pdfBatchQueue.filter((item) => !item.status || item.status === 'pending' || item.status === 'processing').length)", "Math.max(Number.isFinite(pdfBatchSummary.pending) ? pdfBatchSummary.pending : 0, pdfBatchQueue.filter((item) => item && (!item.status || item.status === 'pending' || item.status === 'processing')).length)");
let a=s.indexOf('                              {/* 2026-06-08: per-row retry.');let b=s.indexOf("                              {!pdfBatchProcessing && !batchIngesting",a);if(a<0||b<0)throw Error('row retry');
s=s.slice(0,a)+`                              {!pdfBatchProcessing && item.status === 'failed' && (
                                <button data-help-key="pdf_audit_view_batch_row_retry_btn" type="button"
                                  onClick={() => _runBatchSelection('retry', item.id)}
                                  disabled={_modalDismissBusy || remediationReady === false}
                                  className="text-amber-700 hover:text-amber-800 font-bold ml-1 px-2 py-1 disabled:opacity-50"
                                  title="Retry this file; other files and completed results are kept."
                                  aria-label={'Retry ' + item.fileName}
                                >{_pdfWorkspaceText(t, 'retry', 'Retry')}</button>
                              )}
`+s.slice(b);
a=s.indexOf("                        {/* 2026-06-08: 'Retry all failed' bulk action.");b=s.indexOf('                      </div>\n                    )}',a);if(a<0||b<0)throw Error('bulk retry');
s=s.slice(0,a)+`                        {pdfBatchSummary.failed > 0 && !pdfBatchProcessing && (
                          <button type="button" onClick={() => _runBatchSelection('retry')}
                            disabled={_modalDismissBusy || remediationReady === false}
                            data-help-key="pdf_audit_view_batch_retry_all_failed_btn"
                            className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold disabled:opacity-50"
                            title="Retry failed files while keeping completed results."
                          >↻ Retry all failed ({pdfBatchSummary.failed})</button>
                        )}
`+s.slice(b);
a=s.indexOf('<button data-help-key="pdf_audit_view_batch_resume_pending_btn"');b=s.indexOf(' className=',a);if(a<0||b<0)throw Error('resume button');
s=s.slice(0,a)+`<button data-help-key="pdf_audit_view_batch_resume_pending_btn" onClick={() => _runBatchSelection('resume')} disabled={_modalDismissBusy || remediationReady === false}`+s.slice(b);
// Start is another entry point after an asynchronous confirmation.
rep('                          // Pre-batch cost estimator', '                          if (_modalHasActiveWork() || pdfAuditLoading) return;\n                          const startEpoch = capturePdfDocumentIntakeEpoch();\n                          // Pre-batch cost estimator');
rep("                            if (batchIngesting) { addToast('Wait for every selected file", "                            if (_modalHasActiveWork() || pdfAuditLoading || !isPdfDocumentIntakeCurrent(startEpoch)) return;\n                            if (batchIngesting) { addToast('Wait for every selected file");
rep('disabled={batchIngesting || remediationReady === false} data-help-key="pdf_audit_view_batch_start_btn"', 'disabled={_modalDismissBusy || remediationReady === false} data-help-key="pdf_audit_view_batch_start_btn"');
save('view_pdf_audit_source.jsx',s);
// Guard shared metadata cleanup and warnings when an older run resumes after awaiting storage.
s=fs.readFileSync('doc_pipeline_source.jsx','utf8');
s=s.replace("      _batchCheckpointDegraded = true;\n      _warnBatchCheckpointOnce('Browser storage did not finish", "      if (!_batchRunIsCurrent()) return false;\n      _batchCheckpointDegraded = true;\n      _warnBatchCheckpointOnce('Browser storage did not finish");
s=s.replace("    const _emitBatchFileOutcome = (item, result, err) => {\n      try {", "    const _emitBatchFileOutcome = (item, result, err) => {\n      if (!_batchRunIsCurrent()) return;\n      try {");
// Only the owning batch may clear shared extraction diagnostics between files.
const cleanup=s.indexOf('        try {\n          window.__lastGroundTruthCharCount = 0;',s.indexOf('const _runPdfBatchRemediationOwned'));
if(cleanup<0)throw Error('cleanup');s=s.slice(0,cleanup)+s.slice(cleanup).replace('        try {\n          window.__lastGroundTruthCharCount = 0;', '        try {\n          if (_batchRunIsCurrent()) {\n          window.__lastGroundTruthCharCount = 0;').replace("          window.__lastGroundTruthDocKey = null;\n        } catch (_) {}", "          window.__lastGroundTruthDocKey = null;\n          }\n        } catch (_) {}");
save('doc_pipeline_source.jsx',s);
