import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const pipe = readFileSync('doc_pipeline_source.jsx', 'utf8');
const view = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const between = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Missing production seam: ' + start);
  return source.slice(a, b);
};
const batchSource = between(pipe, 'let _activeBatchRun = null;', 'const downloadBatchResults = async');
const reauditSource = between(view, 'const _reauditAndScore = async', 'const _commitRefixedSection = async');
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const documentResult = () => ({ accessibleHtml: '<main><h1>Document</h1><p>Preserved content</p></main>', afterScore: 95, beforeScore: 70 });
const file = (id, status = 'pending') => ({ id, fileName: id + '.docx', fileSize: 100, base64: id, status, result: status === 'done' ? documentResult() : null });
function batchHarness(overrides = {}) {
  const state = { queue: [file('one')], busy: false, summary: null, epoch: 4, ...overrides.state };
  const win = { __alloPdfBatchGen: 1, dispatchEvent: vi.fn() };
  let lock = null;
  const deps = {
    window: win, AbortController, CustomEvent, setTimeout, clearTimeout,
    _readCurrentDocumentEpoch: () => state.epoch,
    _normalizeDocumentEpoch: value => Number.isInteger(value) ? value : null,
    _normalizeBatchCheckpointId: value => typeof value === 'string' && value.trim() ? value.trim() : null,
    _makeRunCtx: () => ({ batchQueue: state.queue, auditorCount: 1, targetScore: 95, autoFixPasses: 2, polishPasses: 1, outputLanguage: 'English' }),
    _s: () => ({}),
    _claimRemediationLockForBatch: () => lock ? null : (lock = {}),
    _releaseRemediationLockForBatch: token => { if (lock === token) lock = null; },
    setPdfBatchQueue: next => { state.queue = typeof next === 'function' ? next(state.queue) : next; },
    setPdfBatchSummary: next => { state.summary = next; },
    setPdfBatchProcessing: next => { state.busy = next; },
    setPdfBatchStep: vi.fn(), setPdfBatchCurrentIndex: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(),
    _newBatchCheckpointId: () => 'batch-fixture', _batchResultKeyFor: (id, item) => id + item.id,
    _batchCheckpointDegraded: false, _batchTakeoverWarned: false, _batchCheckpointWarningShown: false,
    _saveBatchFiles: vi.fn(async () => 'root-write'),
    _startBatchCheckpointRoot: async ({ startWrite, onCommitted }) => { const id = await startWrite; onCommitted(id); return id; },
    _commitBatchCheckpointBoundary: vi.fn(async ({ startWrite }) => { await startWrite; return { ok: true }; }),
    _BATCH_BOUNDARY_COMMIT_TIMEOUT_MS: 100,
    _warnBatchCheckpointOnce: vi.fn(), _signalBatchCheckpointCommit: vi.fn(),
    _remediationCacheKey: async () => null, _readRemediationCache: async () => null, _writeRemediationCache: vi.fn(),
    _alloDiagnosticDocumentLabel: value => value, _withTimeout: promise => promise,
    runPdfAccessibilityAudit: vi.fn(async () => ({ score: 70 })), fixAndVerifyPdf: vi.fn(async () => documentResult()),
    _alloLiveAbortSignalOrNull: value => value && !value.aborted ? value : null,
    _alloDeriveVerificationState: () => ({ verificationState: 'partial', requiresManualReview: true }),
    _alloNormalizeStoredVerification: (_stored, derived) => derived,
    _discardResumableBatch: vi.fn(async () => true), _clearBatchCheckpoint: vi.fn(async () => true), _clearActiveBatch: vi.fn(async () => true),
    ...overrides.deps,
  };
  const run = new Function(...Object.keys(deps), batchSource + '\nreturn runPdfBatchRemediation;')(...Object.values(deps));
  return { state, win, deps, run, hasLock: () => !!lock };
}
afterEach(() => vi.useRealTimers());

describe('batch startup and cancellation boundaries', () => {
  it('honors Stop while the initial checkpoint is pending and keeps files resumable', async () => {
    const gate = defer();
    const h = batchHarness({ deps: { _saveBatchFiles: () => gate.promise } });
    const run = h.run();
    expect(h.state.busy).toBe(true);
    const stop = h.win.__alloPdfBatchAbortCtrl;
    // This is exactly what the visible Stop button can signal during startup.
    stop?.abort();
    gate.resolve('root-write');
    await run;
    expect(stop).toBeInstanceOf(AbortController);
    expect(h.deps.runPdfAccessibilityAudit).not.toHaveBeenCalled();
    expect(h.state.summary).toMatchObject({ status: 'stopped', pending: 1, processed: 0 });
    expect(h.state.busy).toBe(false);
    expect(h.hasLock()).toBe(false);
  });
  it('releases the busy state and controller when checkpoint setup throws synchronously', async () => {
    const h = batchHarness({ deps: { _saveBatchFiles: () => { throw new Error('storage setup failed'); } } });
    await expect(h.run()).rejects.toThrow('storage setup failed');
    expect(h.state.busy).toBe(false);
    expect(h.win.__alloPdfBatchAbortCtrl).toBeNull();
    expect(h.hasLock()).toBe(false);
  });
  it('never lets superseded startup replace the newer batch controller or launch another file', async () => {
    const old = defer(), current = defer(); let saves = 0;
    const h = batchHarness({ deps: { _saveBatchFiles: () => ++saves === 1 ? old.promise : current.promise } });
    const a = h.run();
    h.state.epoch++; h.win.__alloPdfBatchGen++;
    const b = h.run();
    const controller = h.win.__alloPdfBatchAbortCtrl;
    old.resolve('old-write'); await a;
    expect(h.win.__alloPdfBatchAbortCtrl).toBe(controller);
    expect(h.deps.runPdfAccessibilityAudit).not.toHaveBeenCalled();
    controller?.abort(); current.resolve('current-write'); await b;
    expect(h.deps.runPdfAccessibilityAudit).not.toHaveBeenCalled();
  });
  it('does not launch remediation after Stop during an audit that resolves successfully', async () => {
    const audit = defer();
    const h = batchHarness({ deps: { runPdfAccessibilityAudit: vi.fn(() => audit.promise) } });
    const run = h.run();
    for (let i = 0; i < 40 && !h.deps.runPdfAccessibilityAudit.mock.calls.length; i++) await Promise.resolve();
    expect(h.deps.runPdfAccessibilityAudit).toHaveBeenCalledTimes(1);
    h.win.__alloPdfBatchAbortCtrl.abort(); audit.resolve({ score: 70 }); await run;
    expect(h.deps.fixAndVerifyPdf).not.toHaveBeenCalled();
    expect(h.state.queue[0].status).toBe('pending');
  });
});

describe('canonical verification ticket cleanup', () => {
  it.each(['missing', 'wrong-document', 'throws'])('releases its own ticket when capture is %s', async mode => {
    const ticket = { documentEpoch: 4, controller: new AbortController() };
    const deps = {
      pdfFixResultRef: { current: { accessibleHtml: 'current' } },
      _beginRemediationOperation: vi.fn(() => ticket),
      _captureAsyncHtmlToken: () => { if (mode === 'throws') throw new Error('capture failed'); return mode === 'missing' ? null : { documentEpoch: 5, html: 'current' }; },
      _remediationOperationIsCurrent: () => true,
      _completeRemediationOperation: vi.fn(),
    };
    const run = new Function(...Object.keys(deps), reauditSource + '\nreturn _reauditAndScore;')(...Object.values(deps));
    await expect(run('current')).resolves.toMatchObject({ ok: false });
    expect(deps._completeRemediationOperation).toHaveBeenCalledExactlyOnceWith(ticket);
  });
});

it('a single-file retry keeps every queue item but processes only the selected failure', async () => {
  vi.useFakeTimers();
  const original = [file('complete', 'done'), file('selected', 'failed'), file('other', 'failed')];
  const h = batchHarness({ state: { queue: original } });
  const run = h.run({ resumeQueue: original, retryFileIds: ['selected'], resumeBatchId: 'saved-batch', resumeSettings: { pdfTargetScore: 88 } });
  await vi.runAllTimersAsync(); await run;
  expect(h.deps.runPdfAccessibilityAudit).toHaveBeenCalledTimes(1);
  expect(h.deps.runPdfAccessibilityAudit.mock.calls[0][0]).toBe('selected');
  expect(h.state.queue.map(item => item.status)).toEqual(['done', 'done', 'failed']);
  expect(original.map(item => item.status)).toEqual(['done', 'failed', 'failed']);
  expect(h.state.summary).toMatchObject({ status: 'complete', settings: { pdfTargetScore: 88 } });
});
it.each([null, {}, { accessibleHtml: '' }])('never marks an empty remediation result as processed: %j', async result => {
  vi.useFakeTimers();
  const h = batchHarness({ deps: { fixAndVerifyPdf: vi.fn(async () => result) } });
  const run = h.run(); await vi.runAllTimersAsync(); await run;
  expect(h.state.queue[0].status).toBe('failed');
  expect(h.state.summary).toMatchObject({ processed: 0, failed: 1 });
  expect(h.state.queue[0].error).toContain('did not return a document');
});
it('a stopped cache lookup cannot hand off to auditing', async () => {
  const gate = defer();
  const h = batchHarness({ deps: { _remediationCacheKey: async () => 'key', _readRemediationCache: vi.fn(() => gate.promise) } });
  const run = h.run();
  for (let i = 0; i < 40 && !h.deps._readRemediationCache.mock.calls.length; i++) await Promise.resolve();
  expect(h.deps._readRemediationCache).toHaveBeenCalledTimes(1);
  h.win.__alloPdfBatchAbortCtrl.abort(); gate.resolve(null); await run;
  expect(h.deps.runPdfAccessibilityAudit).not.toHaveBeenCalled();
  expect(h.state.queue[0].status).toBe('pending');
});

const retrySource = between(view, 'const _runBatchSelection = async', '// A stray Escape');
function retryHarness({ ready = true, run = vi.fn(async () => {}) } = {}) {
  const queue = [file('complete', 'done'), { ...file('failed', 'failed'), error: 'Original error' }, file('other', 'failed')];
  const deps = {
    pdfBatchQueue: queue, pdfBatchSummary: { batchId: 'saved-batch', settings: { pdfTargetScore: 88 } },
    _batchActionBusyRef: { current: false }, pdfAuditLoading: false,
    _requireRemediationReady: () => ready, runPdfBatchRemediation: run,
    setBatchActionBusy: vi.fn(), addToast: vi.fn(),
  };
  deps._modalHasActiveWork = () => deps._batchActionBusyRef.current;
  const retry = new Function(...Object.keys(deps), retrySource + '\nreturn _runBatchSelection;')(...Object.values(deps));
  return { deps, retry, queue };
}
describe('UI retry is an owned explicit queue handoff', () => {
  it('leaves failed rows and their error intact if dependencies are unavailable', async () => {
    const h = retryHarness({ ready: false });
    await h.retry('retry', 'failed');
    expect(h.deps.runPdfBatchRemediation).not.toHaveBeenCalled();
    expect(h.queue[1]).toMatchObject({ status: 'failed', error: 'Original error' });
    expect(h.deps.setBatchActionBusy).not.toHaveBeenCalled();
  });
  it('passes the full snapshot and selected IDs without waiting for React to commit', async () => {
    const h = retryHarness(); await h.retry('retry', 'failed');
    const options = h.deps.runPdfBatchRemediation.mock.calls[0][0];
    expect(options).toMatchObject({ resumeBatchId: 'saved-batch', resumeSettings: { pdfTargetScore: 88 }, retryFileIds: ['failed'] });
    expect(options.resumeQueue.map(item => item.status)).toEqual(['done', 'pending', 'failed']);
    expect(options.resumeQueue[0].result).toBe(h.queue[0].result);
    expect(h.queue[1]).toMatchObject({ status: 'failed', error: 'Original error' });
  });
  it('blocks same-tick duplicate retries and always unlocks after a rejected start', async () => {
    const gate = defer(); const run = vi.fn(async () => { await gate.promise; throw new Error('engine not loaded'); });
    const h = retryHarness({ run });
    const first = h.retry('retry', 'failed'); await h.retry('retry', 'failed');
    expect(run).toHaveBeenCalledTimes(1);
    expect(h.deps._batchActionBusyRef.current).toBe(true);
    gate.resolve(); await first;
    expect(h.deps._batchActionBusyRef.current).toBe(false);
    expect(h.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('engine not loaded'), 'error');
    expect(h.queue[1].status).toBe('failed');
  });
});


it('a selected retry leaves pending files resumable without announcing a completed batch', async () => {
  vi.useFakeTimers();
  const h = batchHarness({ state: { queue: [file('selected', 'failed'), file('pending')] } });
  const run = h.run({ retryFileIds: ['selected'] }); await vi.runAllTimersAsync(); await run;
  expect(h.state.queue.map(item => item.status)).toEqual(['done', 'pending']);
  expect(h.state.summary).toMatchObject({ status: 'interrupted', pending: 1, processed: 1 });
  expect(h.deps.addToast.mock.calls.some(([message]) => message.startsWith('Batch complete:'))).toBe(false);
  expect(h.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('remain queued for Resume'), 'info');
});
it('a successful automatic retry clears the previous failure instead of showing an error on a processed file', async () => {
  vi.useFakeTimers(); let attempts = 0;
  const h = batchHarness({ deps: { fixAndVerifyPdf: vi.fn(async () => { if (++attempts === 1) throw new Error('temporary failure'); return documentResult(); }) } });
  const run = h.run(); await vi.runAllTimersAsync(); await run;
  expect(h.state.queue[0]).toMatchObject({ status: 'done', error: null, retried: true });
  expect(h.state.summary).toMatchObject({ failed: 0, processed: 1 });
});
it('Stop preserves a successfully completed current file while leaving the next file pending', async () => {
  const gate = defer();
  const h = batchHarness({ state: { queue: [file('one'), file('two')] }, deps: { fixAndVerifyPdf: vi.fn(() => gate.promise) } });
  const run = h.run();
  for (let i = 0; i < 40 && !h.deps.fixAndVerifyPdf.mock.calls.length; i++) await Promise.resolve();
  expect(h.deps.fixAndVerifyPdf).toHaveBeenCalledTimes(1);
  h.win.__alloPdfBatchAbortCtrl.abort(); gate.resolve(documentResult()); await run;
  expect(h.state.queue.map(item => item.status)).toEqual(['done', 'pending']);
  expect(h.state.summary).toMatchObject({ status: 'stopped', pending: 1, processed: 1 });
});


describe('retry pass safety', () => {
  it.each(['classified', 'global'])('pauses on a daily quota discovered during automatic retry: %s', async source => {
    vi.useFakeTimers(); let attempts = 0;
    const h = batchHarness({ state: { queue: [file('one'), file('two')] }, deps: {
      fixAndVerifyPdf: vi.fn(async () => {
        if (++attempts < 3) throw new Error('temporary extraction failure');
        if (attempts === 3) {
          if (source === 'global') h.win.__alloflowQuotaState = { kind: 'quota', active: true, perDay: true, hitAt: Date.now() };
          throw Object.assign(new Error('daily quota reached'), source === 'classified' ? { isQuota: true, classification: { perDay: true } } : {});
        }
        return documentResult();
      }),
    } });
    const run = h.run(); await vi.runAllTimersAsync(); await run;
    expect(h.deps.fixAndVerifyPdf).toHaveBeenCalledTimes(3);
    expect(h.state.summary).toMatchObject({ status: 'paused-quota', pending: 1, processed: 0 });
    expect(h.state.queue[1].status).toBe('pending');
    expect(h.deps._clearActiveBatch).not.toHaveBeenCalled();
  });
  it('waits through a burst quota on retry and continues with the next file', async () => {
    vi.useFakeTimers(); let attempts = 0; const calm = vi.fn(async () => {});
    const h = batchHarness({ state: { queue: [file('one'), file('two')] }, deps: {
      waitForGeminiCalm: calm,
      fixAndVerifyPdf: vi.fn(async () => {
        if (++attempts < 3) throw new Error('temporary failure');
        if (attempts === 3) throw Object.assign(new Error('burst quota'), { isQuota: true, classification: { perDay: false } });
        expect(calm).toHaveBeenCalledTimes(1);
        return documentResult();
      }),
    } });
    const run = h.run(); await vi.runAllTimersAsync(); await run;
    expect(calm).toHaveBeenCalledTimes(1);
    expect(h.state.summary).toMatchObject({ status: 'complete', processed: 1, failed: 1 });
  });
  it.each([true, false])('a retry drain timeout pauses only while another remediation still owns the lock: %s', async held => {
    vi.useFakeTimers(); let attempts = 0;
    const h = batchHarness({ state: { queue: [file('one'), file('two')] }, deps: {
      _getActiveRemediationRun: () => held ? {} : null,
      fixAndVerifyPdf: vi.fn(async () => {
        if (++attempts < 3) throw new Error('temporary failure');
        if (attempts === 3) throw Object.assign(new Error('drain did not finish'), { code: 'ALLO_BATCH_REMEDIATION_DRAIN_TIMEOUT' });
        return documentResult();
      }),
    } });
    const run = h.run(); await vi.runAllTimersAsync(); await run;
    expect(h.deps.fixAndVerifyPdf).toHaveBeenCalledTimes(held ? 3 : 4);
    expect(h.state.summary).toMatchObject(held ? { status: 'interrupted', pending: 1 } : { status: 'complete', processed: 1 });
    if (held) expect(h.deps._clearActiveBatch).not.toHaveBeenCalled();
  });
  it('records successful retry outcomes and clears extraction metadata between retries', async () => {
    vi.useFakeTimers(); let attempts = 0;
    const h = batchHarness({ state: { queue: [file('one'), file('two')] }, deps: {
      fixAndVerifyPdf: vi.fn(async () => {
        if (++attempts < 3) throw new Error('temporary failure');
        if (attempts === 4) expect(h.win.__lastGroundTruthDocKey).toBeNull();
        h.win.__lastGroundTruthDocKey = 'retry-document-' + attempts;
        return documentResult();
      }),
    } });
    const run = h.run(); await vi.runAllTimersAsync(); await run;
    expect(h.state.summary.processed).toBe(2);
    const outcomes = h.win.dispatchEvent.mock.calls.filter(([event]) => event.type === 'alloflow:batch-file-outcome').map(([event]) => event.detail.outcome);
    expect(outcomes).toEqual(['failed', 'failed', 'completed', 'completed']);
    expect(h.win.__lastGroundTruthDocKey).toBeNull();
  });
  it('keeps automatic retries pending when Stop is pressed during their cooldown', async () => {
    vi.useFakeTimers(); const gate = defer();
    const h = batchHarness({ deps: { fixAndVerifyPdf: vi.fn(async () => { throw new Error('temporary failure'); }), setPdfBatchStep: step => { if (step.startsWith('Retrying 1 failed')) gate.resolve(); } } });
    const run = h.run(); await gate.promise;
    h.win.__alloPdfBatchAbortCtrl.abort(); await vi.runAllTimersAsync(); await run;
    expect(h.state.summary).toMatchObject({ status: 'stopped', pending: 1 });
    expect(h.state.queue[0].status).toBe('pending');
    expect(h.deps.fixAndVerifyPdf).toHaveBeenCalledTimes(1);
  });
});


const savedActionsSource = between(view, 'const _resumeSavedBatch = async', '// A stray Escape');
function savedActionsHarness(overrides = {}) {
  const saved = { batchId: 'saved-batch', files: [file('done', 'done'), file('pending', 'processing')], settings: { pdfTargetScore: 87 }, _doneCount: 1, _incompleteCount: 1 };
  const state = { saved, epoch: 4 };
  const deps = {
    resumableBatch: saved, pdfBatchQueue: [], pdfAuditLoading: false, pdfDocumentEpoch: 4,
    _batchActionBusyRef: { current: false }, setBatchActionBusy: vi.fn(), _requireRemediationReady: () => true,
    capturePdfDocumentIntakeEpoch: () => state.epoch, isPdfDocumentIntakeCurrent: epoch => epoch === state.epoch,
    t: () => '', addToast: vi.fn(), runPdfBatchRemediation: vi.fn(async () => {}),
    _docPipeline: { discardResumableBatch: vi.fn(async () => true) },
    setResumableBatch: vi.fn(next => { state.saved = typeof next === 'function' ? next(state.saved) : next; }),
    ...overrides,
  };
  deps._modalHasActiveWork = () => deps._batchActionBusyRef.current;
  const actions = new Function(...Object.keys(deps), savedActionsSource + '\nreturn { resume: _resumeSavedBatch, discard: _discardSavedBatch };')(...Object.values(deps));
  return { state, deps, ...actions };
}
describe('saved-batch action ownership', () => {
  it('keeps the checkpoint available after rejected resume and blocks a competing discard', async () => {
    const gate = defer();
    const h = savedActionsHarness({ runPdfBatchRemediation: vi.fn(async () => { await gate.promise; throw new Error('start failed'); }) });
    const run = h.resume(); await h.discard();
    expect(h.deps._docPipeline.discardResumableBatch).not.toHaveBeenCalled();
    expect(h.deps._batchActionBusyRef.current).toBe(true);
    expect(h.state.saved).toBe(h.deps.resumableBatch);
    gate.resolve(); await run;
    expect(h.state.saved).toBe(h.deps.resumableBatch);
    expect(h.deps._batchActionBusyRef.current).toBe(false);
    expect(h.deps.addToast).toHaveBeenLastCalledWith(expect.stringContaining('start failed'), 'error');
    expect(h.deps.runPdfBatchRemediation.mock.calls[0][0]).toMatchObject({ resumeBatchId: 'saved-batch', resumeSettings: { pdfTargetScore: 87 } });
  });
  it('does not resume a checkpoint while its deletion is awaiting storage', async () => {
    const gate = defer();
    const h = savedActionsHarness({ _docPipeline: { discardResumableBatch: vi.fn(() => gate.promise) } });
    const run = h.discard(); await h.resume();
    expect(h.deps.runPdfBatchRemediation).not.toHaveBeenCalled();
    gate.resolve(false); await run;
    expect(h.state.saved).toBe(h.deps.resumableBatch);
    expect(h.deps._batchActionBusyRef.current).toBe(false);
  });
  it.each([true, false])('a stale discard result cannot clear a newer banner or show a stale error: %s', async deleted => {
    const gate = defer();
    const h = savedActionsHarness({ _docPipeline: { discardResumableBatch: vi.fn(() => gate.promise) } });
    const run = h.discard(); h.state.epoch = 5; h.state.saved = { batchId: 'new-batch' };
    gate.resolve(deleted); await run;
    expect(h.state.saved).toEqual({ batchId: 'new-batch' });
    expect(h.deps.setResumableBatch).not.toHaveBeenCalled();
    expect(h.deps.addToast).not.toHaveBeenCalled();
    expect(h.deps._batchActionBusyRef.current).toBe(false);
  });
  it('a successful resume only removes the banner for the checkpoint it actually started', async () => {
    const gate = defer(); const h = savedActionsHarness({ runPdfBatchRemediation: vi.fn(() => gate.promise) });
    const run = h.resume(); h.state.saved = { batchId: 'newer-checkpoint' };
    gate.resolve(); await run;
    expect(h.state.saved).toEqual({ batchId: 'newer-checkpoint' });
    expect(h.deps._batchActionBusyRef.current).toBe(false);
  });
});


describe('retained failures and owned recovery feedback', () => {
  it.each(['PDF is password-protected', 'Invalid PDF document', 'API key not valid'])('does not automatically repeat a permanent failure: %s', message => {
    return (async () => {
      vi.useFakeTimers();
      const h = batchHarness({ deps: { fixAndVerifyPdf: vi.fn(async () => { throw new Error(message); }) } });
      const run = h.run(); await vi.runAllTimersAsync(); await run;
      expect(h.deps.fixAndVerifyPdf).toHaveBeenCalledTimes(1);
      expect(h.state.queue[0]).toMatchObject({ status: 'failed', autoRetryable: false });
      expect(h.state.queue[0].retryAdvice.length).toBeGreaterThan(10);
      expect(h.deps._clearActiveBatch).not.toHaveBeenCalled();
      expect(h.deps._commitBatchCheckpointBoundary.mock.calls.at(-1)[0].context).toBe('batch-final-failed');
    })();
  });
  it('keeps the batch busy until the final retained-failure checkpoint is committed', async () => {
    const final = defer(), reached = defer();
    const h = batchHarness({ deps: {
      fixAndVerifyPdf: vi.fn(async () => { throw new Error('Invalid PDF'); }),
      _commitBatchCheckpointBoundary: vi.fn(async options => { if (options.context === 'batch-final-failed') { reached.resolve(); await final.promise; } return { ok: true }; }),
    } });
    const run = h.run(); await reached.promise;
    expect(h.state.busy).toBe(true); expect(h.hasLock()).toBe(true);
    final.resolve(); await run;
    expect(h.state.busy).toBe(false);
    const events = h.win.dispatchEvent.mock.calls.map(([event]) => event).filter(event => event.type === 'alloflow:batch-recovery-state').map(event => event.detail);
    expect(events.some(event => event.phase === 'saving')).toBe(true);
    expect(events.at(-1)).toMatchObject({ phase: 'idle', checkpoint: 'saved', documentEpoch: 4 });
    expect(events.every((event, i) => !i || event.sequence > events[i-1].sequence)).toBe(true);
  });
  it('an explicit corrected-file retry clears obsolete advice and retires the completed checkpoint', async () => {
    vi.useFakeTimers();
    const queue = [{ ...file('failed', 'failed'), error: 'Invalid PDF', autoRetryable: false, failureKind: 'invalid-file', retryAdvice: 'Replace the source' }];
    const h = batchHarness({ state: { queue } });
    const run = h.run({ resumeQueue: queue, retryFileIds: ['failed'], resumeBatchId: 'saved-batch' });
    await vi.runAllTimersAsync(); await run;
    expect(h.state.queue[0]).toMatchObject({ status: 'done', error: null, retryAdvice: null, autoRetryable: true });
    expect(h.deps._clearActiveBatch).toHaveBeenCalled();
  });
});


it('resumes the quota-failed file and pending files after the daily quota clears', async () => {
  vi.useFakeTimers(); let available = false;
  const h = batchHarness({ state: { queue: [file('done', 'done'), file('quota'), file('pending')] }, deps: {
    fixAndVerifyPdf: vi.fn(async () => {
      if (!available) throw Object.assign(new Error('daily quota reached'), { isQuota: true, classification: { perDay: true } });
      return documentResult();
    }),
  } });
  const paused = h.run(); await vi.runAllTimersAsync(); await paused;
  expect(h.deps.fixAndVerifyPdf).toHaveBeenCalledTimes(1);
  expect(h.state.queue.map(item => item.status)).toEqual(['done', 'failed', 'pending']);
  expect(h.state.queue[1]).toMatchObject({ failureKind: 'quota', autoRetryable: true });
  expect(h.state.summary.status).toBe('paused-quota');
  available = true;
  const resumed = h.run({ resumeQueue: h.state.queue, resumeBatchId: h.state.summary.batchId });
  await vi.runAllTimersAsync(); await resumed;
  expect(h.deps.runPdfAccessibilityAudit.mock.calls.map(args => args[0])).toEqual(['quota', 'quota', 'pending']);
  expect(h.state.queue.map(item => item.status)).toEqual(['done', 'done', 'done']);
  expect(h.state.summary).toMatchObject({ status: 'complete', processed: 3, failed: 0, pending: 0 });
});
