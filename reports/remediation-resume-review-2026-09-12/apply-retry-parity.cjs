const fs=require('fs');const f='doc_pipeline_source.jsx';let s=fs.readFileSync(f,'utf8');function rep(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,140));s=s.replace(a,b);}
const main=s.indexOf('    for (let i = 0; i < queue.length; i++) {',s.indexOf('const _emitBatchFileOutcome ='));
const a=s.indexOf("        if (err && err.code === 'ALLO_BATCH_REMEDIATION_DRAIN_TIMEOUT') {",main);
const b=s.indexOf('      } finally {\n        // Per-file global hygiene',a);
if(a<0||b<a)throw Error('Missing failure policy');let policy=s.slice(a,b);
policy=policy.replace(/^            break;$/gm,"            return 'stop';").replace(/^          break;$/gm,"          return 'stop';").replace(/^          continue;$/gm,"          return 'continue-immediately';");
const cleanupStart=s.indexOf('        try {\n          if (_batchRunIsCurrent()) {',b);
const cleanupEnd=s.indexOf('        // This is the durable file boundary.',cleanupStart);
const cleanup=s.slice(cleanupStart,cleanupEnd);
if(cleanupStart<0||cleanupEnd<cleanupStart)throw Error('Missing cleanup');
const shared=`    // Initial attempts and automatic retries share the same stop/continue policy.
    const _handleBatchFileFailure = async (err, item, i) => {
      if (!_batchRunIsCurrent() || _batchAbortCtrl.signal.aborted) return 'stop';
${policy.split('\n').map(l=>l.startsWith('  ')?l.slice(2):l).join('\n')}      return 'continue';
    };
    const _clearBatchFileGlobals = () => {
${cleanup.split('\n').map(l=>l.startsWith('  ')?l.slice(2):l).join('\n')}    };
`;
s=s.slice(0,a)+`        const disposition = await _handleBatchFileFailure(err, item, i);
        if (disposition === 'stop') break;
        if (disposition === 'continue-immediately') continue;
`+s.slice(b);
s=s.replace(cleanup,'        _clearBatchFileGlobals();\n');
s=s.slice(0,main)+shared+s.slice(main);

rep('    // One event per file, carrying the same fields the single-file rows use.', '    // One event per attempt, carrying the same fields the single-file rows use.');
rep("    if (!_batchAbortCtrl.signal.aborted && !_quotaStopped && !_batchHandoffStopped && failedFiles.length > 0) {", "    let _retryPassStarted = false;\n    if (!_batchAbortCtrl.signal.aborted && !_quotaStopped && !_batchHandoffStopped && failedFiles.length > 0) {\n      _retryPassStarted = true;");
rep('        setPdfBatchStep(`Retrying: ${failedItem.fileName}`);', '        setPdfBatchStep(`Retrying: ${failedItem.fileName}`);\n        queue[idx] = { ...failedItem, status: \'processing\', error: null };\n        setPdfBatchQueue([...queue]);');
rep("          queue[idx] = { ...failedItem, status: 'done', result, retried: true, error: null, interrupted: false };\n          setPdfBatchQueue([...queue]);", "          queue[idx] = { ...failedItem, status: 'done', result, retried: true, error: null, interrupted: false };\n          setPdfBatchQueue([...queue]);\n          _emitBatchFileOutcome(failedItem, result, null);");
rep('        } catch (err) {\n          if (_batchAbortCtrl.signal.aborted) {', '        } catch (err) {\n          _emitBatchFileOutcome(failedItem, null, err);\n          if (_batchAbortCtrl.signal.aborted) {');
rep("          queue[idx] = { ...failedItem, status: 'failed', error: 'Failed after retry: ' + err.message };\n          setPdfBatchQueue([...queue]);\n        } finally {\n          try {", "          queue[idx] = { ...failedItem, status: 'failed', error: 'Failed after retry: ' + err.message };\n          setPdfBatchQueue([...queue]);\n          const disposition = await _handleBatchFileFailure(err, failedItem, idx);\n          if (disposition === 'stop') break;\n          if (disposition === 'continue-immediately') continue;\n        } finally {\n          _clearBatchFileGlobals();\n          try {");
rep('    if (_batchWasAborted || _quotaStopped) {', "    if (_retryPassStarted && (_batchWasAborted || _quotaStopped || _batchHandoffStopped)) {\n      // Entries still identical to the scheduled snapshot never received their retry.\n      // Keep them resumable, including a Stop during the retry cooldown.\n      for (const scheduledItem of failedFiles) {\n        const pendingIndex = queue.indexOf(scheduledItem);\n        if (pendingIndex >= 0) queue[pendingIndex] = { ...scheduledItem, status: 'pending', error: null, interrupted: true };\n      }\n    }\n    if (_batchWasAborted || _quotaStopped || _batchHandoffStopped) {");
rep('    if (!_batchAbortCtrl.signal.aborted && !_quotaStopped && pending.length === 0) {', '    if (!_batchAbortCtrl.signal.aborted && !_quotaStopped && !_batchHandoffStopped && pending.length === 0) {');
fs.writeFileSync(f+'.review-tmp',s);fs.renameSync(f+'.review-tmp',f);
