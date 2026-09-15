const fs=require('fs');
function save(f,s){fs.writeFileSync(f+'.review-tmp',s);fs.renameSync(f+'.review-tmp',f);}
function editor(f){
  let s=fs.readFileSync(f,'utf8');
  return { replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b);}, get(){return s;}, set(v){s=v;}, save(){save(f,s);} };
}
const p=editor('doc_pipeline_source.jsx');
p.replace("try { if (typeof window !== 'undefined' && window.__alloPdfBatchAbortCtrl) window.__alloPdfBatchAbortCtrl.abort(); } catch (_) {}", "try { if (_activeBatchRun.controller) _activeBatchRun.controller.abort(); } catch (_) {}");
p.replace("      promise: null,\n    };\n    _activeBatchRun = owner;", "      promise: null,\n      controller: new AbortController(),\n      previousAbortSignal: typeof window !== 'undefined' ? window.__alloPdfAbortSignal : null,\n    };\n    _activeBatchRun = owner;");
p.replace("    owner.promise = raw.finally(() => {\n      _releaseRemediationLockForBatch", `    owner.promise = raw.finally(() => {
      // Startup persistence can throw before the inner processing try/finally is entered.
      // Only this owner may clear its UI or shared signal slots.
      publishers.setPdfBatchProcessing(false);
      publishers.setPdfBatchCurrentIndex(-1);
      publishers.setPdfBatchStep('');
      try { owner.controller.abort(); } catch (_) {}
      if (typeof window !== 'undefined') {
        if (window.__alloPdfBatchAbortCtrl === owner.controller) {
          window.__alloPdfBatchAbortCtrl = null;
          window.__alloPdfBatchAbortSignal = null;
        }
        if (window.__alloPdfAbortSignal === owner.controller.signal) window.__alloPdfAbortSignal = _alloLiveAbortSignalOrNull(owner.previousAbortSignal);
      }
      _releaseRemediationLockForBatch`);
p.replace("    const queue = _sourceQueue.filter(Boolean);", "    const queue = _sourceQueue.filter(Boolean).map(item => ({ ...item }));\n    const _retryFileIds = opts && Array.isArray(opts.retryFileIds) ? new Set(opts.retryFileIds.map(String)) : null;");
let s=p.get();const a=s.indexOf('    // Batch AbortController — separate global',s.indexOf('const _runPdfBatchRemediationOwned'));const b=s.indexOf('    const _batchDelay =',a);if(a<0||b<0)throw Error('controller range');
let ctrl=s.slice(a,b).replace('const _batchAbortCtrl = new AbortController();','const _batchAbortCtrl = owner.controller;').replace("const _prevBatchAbortSlot = (typeof window !== 'undefined') ? window.__alloPdfAbortSignal : null;", 'const _prevBatchAbortSlot = owner.previousAbortSignal;');
s=s.slice(0,a)+s.slice(b);const start=s.indexOf('    setPdfBatchProcessing(true);',s.indexOf('const _runPdfBatchRemediationOwned'));s=s.slice(0,start)+ctrl+s.slice(start);p.set(s);
p.replace("    await _persistBatchStatus('batch-start');", "    await _persistBatchStatus('batch-start');\n    if (!_batchRunIsCurrent()) return; // Never start work after a newer batch takes ownership.");
p.replace("    const _processOne = async (item, i, isRetry) => {\n      const label", `    const _assertBatchFileCurrent = () => {
      if (_batchRunIsCurrent() && !_batchAbortCtrl.signal.aborted) return;
      const error = new Error('Batch processing was stopped or superseded.');
      error.name = 'AbortError';
      error.isAbort = true;
      throw error;
    };
    const _processOne = async (item, i, isRetry) => {
      _assertBatchFileCurrent();
      const label`);
p.replace("      if (_remedKey) {\n        const cached = await _readRemediationCache(_remedKey, _deadlineAt);\n        if (cached) {", "      _assertBatchFileCurrent();\n      if (_remedKey) {\n        const cached = await _readRemediationCache(_remedKey, _deadlineAt);\n        _assertBatchFileCurrent();\n        if (cached && typeof cached.accessibleHtml === 'string' && cached.accessibleHtml.trim()) {");
p.replace("        if (!auditResult || auditResult.score === -1) {", "        _assertBatchFileCurrent();\n        if (!auditResult || auditResult.score === -1) {");
p.replace("        // Write remediation cache (Tier 4)\n        if (_remedKey && result)", `        if (!result || typeof result.accessibleHtml !== 'string' || !result.accessibleHtml.trim()) {
          const missingResult = new Error('Remediation did not return a document. The file remains available for retry.');
          missingResult.code = 'ALLO_BATCH_EMPTY_RESULT';
          throw missingResult;
        }
        // Write remediation cache (Tier 4)
        if (_remedKey && result)`);
p.replace("    for (let i = 0; i < queue.length; i++) {\n      if (_batchAbortCtrl.signal.aborted)", "    for (let i = 0; i < queue.length; i++) {\n      if (!_batchRunIsCurrent()) return;\n      if (_retryFileIds && !_retryFileIds.has(String(queue[i].id))) continue;\n      if (_batchAbortCtrl.signal.aborted)");
p.replace("        const result = await _processOne(item, i, false);\n        queue[i]", "        const result = await _processOne(item, i, false);\n        if (!_batchRunIsCurrent()) return;\n        queue[i]");
p.replace("    const failedFiles = queue.filter(q => q.status === 'failed');", "    const failedFiles = queue.filter(q => q.status === 'failed' && (!_retryFileIds || _retryFileIds.has(String(q.id))));");
p.replace("      for (const failedItem of failedFiles) {\n        if (_batchAbortCtrl.signal.aborted)", "      for (const failedItem of failedFiles) {\n        if (!_batchRunIsCurrent()) return;\n        if (_batchAbortCtrl.signal.aborted)");
p.replace("          const result = await _processOne(failedItem, idx, true);\n          queue[idx]", "          const result = await _processOne(failedItem, idx, true);\n          if (!_batchRunIsCurrent()) return;\n          queue[idx]");
s=p.get();const owned=s.indexOf('const _runPdfBatchRemediationOwned');const end=s.indexOf('const downloadBatchResults = async',owned);let body=s.slice(owned,end);body=body.replaceAll('      batchId: _batchId,\n      total: queue.length,','      batchId: _batchId,\n      settings: { ..._batchSettings },\n      total: queue.length,').replace('        batchId: _batchId,\n        total: queue.length,','        batchId: _batchId,\n        settings: { ..._batchSettings },\n        total: queue.length,');p.set(s.slice(0,owned)+body+s.slice(end));p.save();
const v=editor('view_pdf_audit_source.jsx');
v.replace('  const _reauditAndScore = async (newHtml, onActivity, operationTicket) => {\n    let ownedTicket = null;\n    if (!operationTicket)', '  const _reauditAndScore = async (newHtml, onActivity, operationTicket) => {\n    let ownedTicket = null;\n    try {\n    if (!operationTicket)');
v.replace("    if (!_reauditIsCurrent()) return { ok: false, score: null, stale: true, verificationState: 'unavailable' };\n    try {\n      if (onActivity", "    if (!_reauditIsCurrent()) return { ok: false, score: null, stale: true, verificationState: 'unavailable' };\n      if (onActivity");
v.save();
