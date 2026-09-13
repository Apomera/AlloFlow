// Recovery presentation stays independent of the active document and remediation owner.
function _usePdfSavedBatch({ pipeline, batchMode, documentEpoch, occupied, ready }) {
  const [saved, setSaved] = React.useState(null);
  const [status, setStatus] = React.useState('idle');
  const [version, setVersion] = React.useState(0);
  const refresh = React.useCallback(() => setVersion(value => value + 1), []);
  const loader = pipeline?.loadResumableBatch;
  React.useEffect(() => {
    if (!batchMode || occupied) return;
    let cancelled = false, timeout, retry;
    const lookup = async (attempt) => {
      if (typeof loader !== 'function') { setStatus('unavailable'); return; }
      setStatus('loading');
      try {
        const value = await Promise.race([
          Promise.resolve().then(() => loader.call(pipeline, { throwOnError: true })),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Saved batch lookup timed out')), 5000); }),
        ]);
        clearTimeout(timeout);
        if (cancelled) return;
        const recoverable = value && Array.isArray(value.files) && value.files.some(file => file && file.status !== 'done');
        setSaved(recoverable ? value : null);
        setStatus('ready');
      } catch (_) {
        clearTimeout(timeout);
        if (cancelled) return;
        setStatus('error');
        // One automatic retry; explicit Retry, returning to this mode, focus, and online can try again.
        if (attempt === 0) retry = setTimeout(() => lookup(1), 1200);
      }
    };
    lookup(0);
    return () => { cancelled = true; clearTimeout(timeout); clearTimeout(retry); };
  }, [loader, batchMode, documentEpoch, occupied, ready, version]);
  React.useEffect(() => {
    if (!batchMode || occupied) return;
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [batchMode, occupied, refresh]);
  return { saved, setSaved, status, refresh };
}
function _pdfWorkspaceAcceptRecovery(current, detail, epoch, hostGeneration) {
  if (!detail || typeof detail.batchId !== 'string' || !Number.isInteger(detail.sequence) || !Number.isInteger(detail.generation)) return current;
  const owned = detail.documentEpochSource === 'batch'
    ? detail.hostGeneration === hostGeneration
    : detail.documentEpoch === epoch;
  if (!owned) return current;
  if (current && (detail.generation < current.generation || (detail.generation === current.generation && detail.sequence <= current.sequence))) return current;
  return detail;
}
function _usePdfBatchRecovery(pipeline, epoch) {
  const [state, setState] = React.useState(null);
  React.useEffect(() => {
    let current = null;
    const receive = (detail) => {
      const next = _pdfWorkspaceAcceptRecovery(current, detail, epoch, Number(window.__alloPdfBatchGen) || 0);
      if (next !== current) { current = next; setState(next); }
    };
    setState(null);
    const listener = event => receive(event.detail);
    window.addEventListener('alloflow:batch-recovery-state', listener);
    try { receive(pipeline?.getBatchRecoveryState?.()); } catch (_) {}
    return () => window.removeEventListener('alloflow:batch-recovery-state', listener);
  }, [pipeline?.getBatchRecoveryState, epoch]);
  return state;
}
function _PdfWorkspaceRecovery({ state, t }) {
  if (!state || state.checkpoint === 'not-needed') return null;
  const say = (key, fallback) => _pdfWorkspaceText(t, key, fallback);
  const saving = state.checkpoint === 'saving', saved = state.checkpoint === 'saved';
  return <aside className="pdf-workspace-recovery" data-tone={saved ? 'saved' : saving ? 'saving' : 'attention'} aria-label={say('recovery', 'Batch recovery')}>
    <p role="status" aria-live="polite"><strong>{saved ? say('checkpoint_saved', 'Saved for resume') : saving ? say('checkpoint_saving', 'Saving checkpoint…') : say('checkpoint_tab_only', 'Only available in this tab')}</strong></p>
    <p>{saved ? say('checkpoint_saved_detail', 'Queued and failed files can be reopened from the saved batch.') : saving ? say('checkpoint_saving_detail', 'Keep this workspace open until saving finishes.') : state.checkpointReason === 'another-tab'
      ? say('checkpoint_taken', 'Another tab replaced this checkpoint. Keep this tab open and download processed files before leaving.')
      : say('checkpoint_unavailable', 'Browser storage could not keep the resume checkpoint. Keep this tab open and download processed files before leaving.')}</p>
    {Number.isFinite(state.savedAt) && <small>{say('last_saved', 'Last successful save')}: {new Date(state.savedAt).toLocaleTimeString()}</small>}
  </aside>;
}
function _pdfWorkspaceBatchFindings(item) {
  const result = item?.result || {};
  const text = value => typeof value === 'string' ? value : value && [value.issue, value.description, value.message, value.msg, value.ruleId].find(part => typeof part === 'string' && part.trim()) || '';
  const list = (values, engine) => (Array.isArray(values) ? values : []).map(value => ({ engine, text: text(value) })).filter(value => value.text);
  const axe = result.axeAudit || {};
  const equal = result.secondEngineAudit || {};
  const expertReason = {
    accessibility: 'Accessibility barriers need expert review.',
    'content-fidelity': 'Content preservation needs expert review.',
    both: 'Accessibility and content preservation need expert review.',
  }[result.expertReviewReason] || result.expertReviewReason || 'Expert review is required.';
  return [
    ...list(result.verificationAudit?.issues, 'AI audit'),
    ...list([].concat(axe.critical || [], axe.serious || [], axe.moderate || [], axe.minor || []), 'axe-core'),
    ...list(axe.incomplete, 'axe-core (manual review)'),
    ...list(equal.fails || equal.violations || equal.failures, 'Equal Access'),
    ...list(equal.potentialFindings, 'Equal Access (potential finding)'),
    ...list(equal.manualFindings, 'Equal Access (manual review)'),
    ...list(result.fidelityNotes, 'Content preservation'),
    ...list([result.integrityWarning], 'Content preservation'),
    ...list(result.needsExpertReview ? [expertReason] : [], 'Expert review'),
  ];
}
function _PdfWorkspaceBatchReview({ item, t }) {
  if (item.status !== 'done' || !item.result) return null;
  const say = (key, fallback) => _pdfWorkspaceText(t, key, fallback);
  const result = item.result, coverage = result.verificationCoverage || {}, findings = _pdfWorkspaceBatchFindings(item);
  const coverageLabel = value => value === 'complete' ? say('check_complete', 'Complete') : value === 'partial' ? say('check_partial', 'Partial') : value === 'unavailable' ? say('unavailable', 'Unavailable') : say('not_recorded', 'Not recorded');
  return <details className="pdf-workspace-batch-review">
    <summary aria-label={say('review_file', 'Review findings for') + ' ' + item.fileName}>{say('review_findings', 'Review findings')}</summary>
    <p><strong>{item.fileName}</strong></p>
    <p>{_pdfWorkspaceBatchVerified(item) ? say('review_verified', 'Recorded verification is complete. Review the document before sharing.') : say('review_provisional', 'This file still needs review. A high score alone does not establish complete verification.')}</p>
    <dl>{[['AI audit', coverage.ai], ['axe-core', coverage.axe], ['Equal Access', coverage.equalAccess]].map(([engine, value]) => <div key={engine}><dt>{engine}</dt><dd>{coverageLabel(value)}</dd></div>)}</dl>
    {findings.length ? <ul>{findings.map((finding, index) => <li key={index}><strong>{finding.engine}: </strong>{finding.text}</li>)}</ul>
      : <p>{say('no_saved_findings', 'No detailed findings were recorded in this saved result. Check the verification coverage above.')}</p>}
  </details>;
}
