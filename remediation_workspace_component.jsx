// Presentation only: job ownership remains in PdfAuditView. Never infer completion from a percentage.
function _pdfWorkspaceText(t, key, fallback) {
  const full = 'pdf_audit.workspace.' + key;
  const text = typeof t === 'function' ? t(full) : '';
  return text && text !== full ? text : fallback;
}
// Filters only select visible rows; the full queue remains owned by the pipeline.
function _pdfWorkspaceBatchVerified(item) {
  const result = item?.result;
  return item?.status === 'done' && result?.verificationState === 'complete' && result.fullyVerifiedSuccess === true && !result.needsExpertReview;
}
function _pdfWorkspaceBatchModel(queue, filter = 'all') {
  const items = Array.isArray(queue) ? queue.filter(item => item && typeof item === 'object') : [];
  const groups = {
    all: items,
    pending: items.filter(item => !['done', 'failed'].includes(item.status)),
    failed: items.filter(item => item.status === 'failed'),
    review: items.filter(item => item.status === 'done' && !_pdfWorkspaceBatchVerified(item)),
    done: items.filter(item => item.status === 'done'),
  };
  const counts = Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.length]));
  return { counts, rows: groups[filter] || items, percent: items.length ? counts.done / items.length * 100 : 0 };
}
function _PdfWorkspaceBatchFilters({ model, value, onChange, t }) {
  const say = (key, text) => _pdfWorkspaceText(t, key, text);
  return <div className="pdf-workspace-batch-filters" role="group" aria-label={say('filter_files', 'Filter batch files')}>
    {[
      ['all', say('all_files', 'All files')], ['pending', say('unfinished', 'Unfinished')],
      ['failed', say('failed', 'Failed')], ['review', say('needs_review', 'Needs review')], ['done', say('processed', 'Processed')],
    ].map(([key, label]) => <button type="button" key={key} aria-pressed={value === key} aria-controls="pdf-workspace-batch-queue"
      onClick={() => onChange(key)}>{label} <span>({model.counts[key]})</span></button>)}
  </div>;
}
function _pdfWorkspaceState(input) {
  const { audit, result, busy, auditLoading, batchMode, batchProcessing, batchIngesting,
    batchSummary, batchStopping, batchPhase, queue = [], progress, verifying, webMode, step = '', webBusy, evidence, verdict, t } = input;
  const say = (key, text) => _pdfWorkspaceText(t, key, text);
  const state = (stage, title, detail, tone = 'neutral', destination = null, action = '') => ({ stage, title, detail, tone, destination, action });
  if (batchMode) {
    const { counts } = _pdfWorkspaceBatchModel(queue);
    const processed = counts.done, failed = counts.failed;
    const detail = processed + ' / ' + counts.all + ' ' + say('processed', 'processed') + (failed ? ' · ' + failed + ' ' + say('failed', 'failed') : '');
    if (batchIngesting) return state(0, say('adding_files', 'Adding files'), say('adding_detail', 'The queue will update as files are read.'), 'working');
    if (batchProcessing && batchStopping) return state(2, say('batch_stopping', 'Stopping batch'), say('batch_stopping_detail', 'Stop requested. Keep this workspace open while the active work ends and the checkpoint is saved.'), 'working');
    if ((batchProcessing || busy) && batchPhase === 'preparing') return state(0, say('batch_preparing', 'Preparing batch'), say('batch_preparing_detail', 'Loading the saved settings and preparing recovery.'), 'working');
    if ((batchProcessing || busy) && batchPhase === 'saving') return state(2, say('batch_saving', 'Saving batch checkpoint'), say('batch_saving_detail', 'Saving the latest file outcomes before continuing.'), 'working');
    if ((batchProcessing || busy) && batchPhase === 'cooldown') return state(2, say('batch_cooldown', 'Waiting before retry'), say('batch_cooldown_detail', 'The run is still active and will continue after the retry cooldown.'), 'working');
    if (batchProcessing || busy) return state(2, say('batch_running', 'Processing batch'), detail + '. ' + say('batch_cycle', 'Each file is audited, remediated and verified.'), 'working');
    if (batchSummary) {
      const complete = batchSummary.status === 'complete' && counts.pending === 0 && !(batchSummary.pending > 0);
      return state(complete ? 4 : 2, complete ? say('batch_processed', 'Batch processed') : say('batch_paused', 'Batch paused or interrupted'),
        detail + '. ' + say('batch_review', 'Processing status and verification are shown separately below.'), complete && !failed && !counts.review && !batchSummary.reviewRequired ? 'neutral' : 'attention', '#pdf-workspace-batch', say('view_batch', 'View batch results'));
    }
    return state(0, say('batch_select', 'Build your batch'), say('batch_select_detail', 'Add files or a folder, then start remediation. Completed files stay in the queue.'), 'neutral');
  }
  const active = busy || auditLoading || webBusy;
  const checking = auditLoading || webBusy === 'audit';
  if (active) {
    const stage = checking ? 1 : verifying || progress?.step === 3 ? 3 : 2;
    // Throttle telemetry from a finished pass must not make a later audit look stalled.
    const waiting = !checking && (progress?.status === 'throttled' || /waiting for (?:the )?AI|rate.limit cooldown/i.test(step));
    return state(stage, waiting ? say('waiting', 'Waiting for AI') : checking ? say('auditing', 'Auditing document') : stage === 3 ? say('verifying', 'Verifying improvements') : say('remediating', 'Remediation in progress'),
      waiting ? say('waiting_detail', 'The run is still active. If the waiting budget is reached, your checkpoint is kept and Resume is offered.') : say('working_detail', 'Keep this workspace open. Results stay provisional until the whole run finishes.'), 'working');
  }
  if (result?._remediationThrottlePaused) return state(2, say('paused', 'Remediation paused'), say('paused_detail', 'Your latest version is kept. Resume when the AI service is available.'), 'attention', '#pdf-remediation-paused-heading', say('resume_options', 'View resume options'));
  if (progress?.status === 'failed' || progress?.status === 'cancelled') return state(2, progress.status === 'failed' ? say('interrupted', 'Remediation interrupted') : say('stopped', 'Remediation stopped'),
    say('stopped_detail', 'The run ended early. Review the saved result or retry from the controls below.'), 'attention', result ? '[data-help-key="pdf_audit_verification_status"]' : '[data-help-key="pdf_audit_view_make_accessible_btn"], [data-help-key="pdf_workspace_fix_verify"]', say('review_run', 'Review this run'));
  if (result) {
    const ready = evidence?.fullyVerifiedSuccess === true && verdict?.level === 'ready' && !verdict.inProgress;
    return state(4, ready ? say('review_download', 'Review & download') : say('needs_review', 'Needs review'),
      ready ? say('ready_detail', 'Verification completed. Review the document and choose a download format.') : say('review_detail', 'Check verification coverage and unresolved findings before sharing this copy.'), ready ? 'ready' : 'attention',
      ready ? '#allo-sec-downloads' : '[data-help-key="pdf_audit_verification_status"]', ready ? say('downloads', 'Go to downloads') : say('review_verification', 'Review verification'));
  }
  if (audit?.score === -1) return state(1, say('audit_interrupted', 'Audit did not finish'), say('audit_retry', 'Read the error below, then retry the audit.'), 'attention');
  if (audit && !audit._choosing) return state(2, say('audit_ready', 'Audit available'), say('audit_next', 'Review the findings, then use Fix & Verify to remediate the document.'), 'neutral', '[data-help-key="pdf_workspace_fix_verify"]', say('fix_controls', 'Go to fix controls'));
  if (webMode) return state(0, say('prepare_web', 'Prepare static HTML'), say('prepare_web_detail', 'Load a URL or paste HTML, then audit or remediate the source. Live interactions require separate review.'));
  if (audit?._mediaPending) return state(0, say('prepare_media', 'Prepare your recording'), say('prepare_media_detail', 'Digest the recording first, then audit and remediate its content.'));
  return state(0, say('prepare', 'Prepare your document'), say('prepare_detail', 'Make Accessible runs the audit, fixes and verification. Manual controls are available below.'), 'neutral');
}
// Open every ancestor disclosure before scrolling; focus follows keyboard navigation.
function _pdfWorkspaceJump(root, selector) {
  const target = root && root.querySelector(selector);
  if (!target) return false;
  for (let node = target; node && node !== root; node = node.parentElement) if (node.tagName === 'DETAILS') node.open = true;
  const focusTarget = target.tagName === 'DETAILS' ? target.querySelector('summary') : target;
  if (focusTarget) {
    if (!focusTarget.matches('button, input, select, textarea, a[href], summary, [tabindex]')) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  }
  const shell = root.querySelector('.pdf-workspace-shell');
  const header = root.querySelector('.pdf-workspace-header');
  if (shell && header) shell.style.scrollPaddingTop = (getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height + 12 : 12) + 'px';
  target.scrollIntoView({ behavior: 'instant', block: 'start' });
  return true;
}
function _PdfWorkspaceHeader({ fileName, sourceLabel, state, hasResult, onNavigate, children, t }) {
  const say = (key, text) => _pdfWorkspaceText(t, key, text);
  const headerRef = React.useRef(null);
  React.useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof ResizeObserver !== 'function') return;
    const update = () => { header.parentElement.style.scrollPaddingTop = (getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height + 12 : 12) + 'px'; };
    const observer = new ResizeObserver(update);
    observer.observe(header); update();
    return () => observer.disconnect();
  }, []);
  const steps = [say('select', 'Select'), say('audit', 'Audit'), say('remediate', 'Remediate'), say('verify', 'Verify'), say('review_download', 'Review & download')];
  return <header ref={headerRef} className="pdf-workspace-header" data-testid="pdf-workspace-header">
    <style>{_PDF_WORKSPACE_CSS}</style>
    <div className="pdf-workspace-topline">
      <div className="pdf-workspace-identity">
        <p className="pdf-workspace-eyebrow">{say('title', 'Document accessibility')} <span> / {sourceLabel}</span></p>
        <h2 title={fileName}>{fileName || say('new_document', 'New document')}</h2>
      </div>
      <div className="pdf-workspace-window-actions">{children}</div>
    </div>
    <ol className="pdf-workspace-stages" aria-label={say('workflow', 'Remediation stages; audit and fix steps may repeat')}>
      {steps.map((label, index) => <li key={index} aria-current={state.stage === index ? 'step' : undefined}>
        <span className="pdf-workspace-step-number" aria-hidden="true">{index + 1}</span><span>{label}</span>
      </li>)}
    </ol>
    <div className="pdf-workspace-status" data-tone={state.tone}>
      <div><p className="pdf-workspace-status-title" role="status" aria-live="polite" aria-atomic="true">{state.title}</p><p className="pdf-workspace-status-detail">{state.detail}</p></div>
      {state.destination && <button type="button" className="pdf-workspace-primary" onClick={() => onNavigate(state.destination)}>{state.action}<span aria-hidden="true"> →</span></button>}
    </div>
    {hasResult && <nav className="pdf-workspace-nav" aria-label={say('result_sections', 'Result sections')}>
      <button type="button" onClick={() => onNavigate('[data-help-key="pdf_audit_verification_status"]')}>{say('verification', 'Verification & review')}</button>
      <button type="button" onClick={() => onNavigate('#allo-sec-downloads')}>{say('downloads_short', 'Downloads')}</button>
      <button type="button" onClick={() => onNavigate('#allo-sec-workbench')}>{say('advanced_tools', 'Advanced tools')}</button>
    </nav>}
  </header>;
}
function _PdfWorkspaceSources({ batch, web, disabled, onChange, t }) {
  const say = (key, text) => _pdfWorkspaceText(t, key, text);
  return <div className="pdf-workspace-sources" role="group" aria-label={say('source', 'Source to remediate')}>
    {[
      ['single', say('single', 'Single document'), say('single_detail', 'PDF, Office or media')],
      ['batch', say('batch', 'Batch of files'), say('batch_detail', 'Files or a folder')],
      ['web', say('web', 'Website / HTML'), say('web_detail', 'Static source audit')],
    ].map(([value, title, detail]) => <button key={value} type="button" data-help-key={'pdf_audit_view_mode_' + value + '_btn'}
      aria-pressed={value === (web ? 'web' : batch ? 'batch' : 'single')} disabled={disabled} onClick={() => onChange(value)}>
      <strong>{value === (web ? 'web' : batch ? 'batch' : 'single') && <span className="pdf-workspace-selected" aria-hidden="true">✓ </span>}{title}</strong><span>{detail}</span>
    </button>)}
  </div>;
}
function _PdfWorkspaceAfterFix({ value, disabled, onChange, t }) {
  const say = (key, text) => _pdfWorkspaceText(t, key, text);
  return <label className="pdf-workspace-afterfix">
    <span>{say('after_fix', 'After remediation')}</span>
    <select value={value || 'auto'} disabled={disabled} onChange={event => onChange(event.target.value)}>
      <option value="auto">{say('show_results', 'Show results')}</option>
      <option value="review">{say('review_changes', 'Review changes')}</option>
      <option value="expert">{say('open_editor', 'Open editor')}</option>
    </select>
    <small>{say('manual_behavior', 'Applies to manual Fix & Verify. Make Accessible always finishes in results.')}</small>
  </label>;
}
function _PdfWorkspaceBatchStatus({ item, t }) {
  const say = (key, text) => _pdfWorkspaceText(t, key, text);
  const result = item.result || {};
  const done = item.status === 'done';
  const status = done ? say('processed', 'Processed') : item.status === 'failed' ? say('failed', 'Failed') : item.status === 'processing' ? say('running', 'Running') : say('queued', 'Queued');
  const verification = _pdfWorkspaceBatchVerified(item) ? say('verified', 'Verification complete') : result.verificationState === 'partial' ? say('partial', 'Verification partial') : result.verificationState === 'review-required' ? say('needs_review', 'Needs review') : say('unverified', 'Verification unconfirmed');
  return <span className="pdf-workspace-batch-status"><strong>{status}</strong>{done && <span>{verification}</span>}</span>;
}
