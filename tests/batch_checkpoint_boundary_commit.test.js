import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const runtimeStart = source.indexOf('const _ACTIVE_BATCH_FILES_KEY');
const runtimeEnd = source.indexOf('  const _AUDIT_SLICE_BYTES_KB', runtimeStart);
if (runtimeStart < 0 || runtimeEnd < 0) throw new Error('Batch checkpoint runtime markers missing');

const withTimeout = (promise, timeoutMs, label) => new Promise((resolvePromise, rejectPromise) => {
  let settled = false;
  const finish = (fn, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    fn(value);
  };
  const timer = setTimeout(() => finish(rejectPromise, new Error('Timeout: ' + label)), Math.max(0, timeoutMs));
  Promise.resolve(promise).then(
    (value) => finish(resolvePromise, value),
    (error) => finish(rejectPromise, error),
  );
});

class TestCustomEvent {
  constructor(type, init) { this.type = type; this.detail = init && init.detail; }
}

function makeRuntime(options = {}) {
  const values = options.values || new Map();
  const events = [];
  const toasts = [];
  const warnings = [];
  const storageDB = {
    get: async (key) => values.get(key),
    set: async (key, value) => {
      if (typeof options.beforeSet === 'function') await options.beforeSet(key, value);
      if (typeof options.setBehavior === 'function') {
        const behavior = await options.setBehavior(key, value, values);
        if (behavior && behavior.handled) return behavior.result;
      }
      values.set(key, value);
      return true;
    },
  };
  const idbKeyval = {
    keys: async () => Array.from(values.keys()),
    del: async (key) => { values.delete(key); },
  };
  const windowObj = {
    idbKeyval,
    dispatchEvent: (event) => { events.push({ type: event.type, detail: event.detail }); return true; },
  };
  const lockState = options.lockState || { tail: Promise.resolve() };
  const navigatorObj = options.navigator || {
    locks: {
      request: (_name, _config, body) => {
        const operation = lockState.tail.then(() => body({ name: _name }));
        lockState.tail = operation.catch(() => {});
        return operation;
      },
    },
  };
  const factory = new Function(
    'storageDB', 'window', 'navigator', '_PIPELINE_PROMPT_VERSION', '_remediationRetentionMs',
    '_alloStripVerificationHtmlSnapshot', '_alloRehydrateVerificationHtmlBinding', 'warnLog', 'addToast',
    '_withTimeout', 'CustomEvent',
    source.slice(runtimeStart, runtimeEnd) +
      '\nreturn {' +
      ' saveFiles: _saveBatchFiles, saveStatusNow: _saveBatchStatusNow, saveStatus: _saveBatchStatus,' +
      ' commitBoundary: _commitBatchCheckpointBoundary, startRoot: _startBatchCheckpointRoot, clearActive: _clearActiveBatch, statusKeyFor: _batchStatusKeyFor,' +
      ' resultKeyFor: _batchResultKeyFor, degraded: function () { return _batchCheckpointDegraded; }' +
      ' };'
  );
  const api = factory(
    storageDB, windowObj, navigatorObj, 'test-prompt-v1', (requestedMs) => requestedMs,
    (value) => value, async (value) => value,
    (...args) => warnings.push(args.map(String).join(' ')),
    (message) => toasts.push(String(message)), withTimeout, TestCustomEvent,
  );
  return { api, values, events, toasts, warnings };
}

const makeFile = (id, status = 'done') => ({
  id,
  fileName: id + '.pdf',
  fileSize: 4,
  base64: 'AA==',
  status,
  result: status === 'done' ? { beforeScore: 70, afterScore: 96 } : null,
});

const saveRoot = async (runtime, batchId, files) => {
  const rootWriteId = await runtime.api.saveFiles(files, { pdfTargetScore: 95 }, 100, batchId);
  expect(rootWriteId).toMatch(/^batch_/);
  return rootWriteId;
};

describe('post-file batch checkpoint boundaries', () => {
  it('commits a successful boundary with monotonic metadata and observable result storage', async () => {
    const runtime = makeRuntime();
    const batchId = 'batch_boundary_success';
    const files = [makeFile('success-file')];
    const rootWriteId = await saveRoot(runtime, batchId, files);

    const outcome = await runtime.api.commitBoundary({
      files,
      batchId,
      startWrite: Promise.resolve(rootWriteId),
      isCurrent: () => true,
      context: 'file-1-done',
      timeoutMs: 1000,
    });
    expect(outcome).toMatchObject({ ok: true, state: 'committed' });
    const status = runtime.values.get(runtime.api.statusKeyFor(batchId));
    expect(status).toMatchObject({ batchId, commitReason: 'file-1-done' });
    expect(Number.isSafeInteger(status.commitRevision)).toBe(true);
    expect(status.statuses[0]).toMatchObject({ status: 'done', resultStored: true });
    expect(runtime.values.has(runtime.api.resultKeyFor(batchId, files[0]))).toBe(true);
    expect(runtime.api.degraded()).toBe(false);
  });

  it('does not cross the file boundary until a delayed status write resolves', async () => {
    let releaseStatus;
    let statusStarted = false;
    const statusGate = new Promise((resolveGate) => { releaseStatus = resolveGate; });
    const runtime = makeRuntime({
      beforeSet: async (key) => {
        if (!key.startsWith('pdf_active_batch_status_v4_')) return;
        statusStarted = true;
        await statusGate;
      },
    });
    const batchId = 'batch_boundary_delayed';
    const files = [makeFile('slow-file')];
    const rootWriteId = await saveRoot(runtime, batchId, files);
    const order = ['file-1-finished'];
    const boundary = runtime.api.commitBoundary({
      files,
      batchId,
      startWrite: Promise.resolve(rootWriteId),
      isCurrent: () => true,
      context: 'file-1-done',
      timeoutMs: 2000,
    }).then((outcome) => { order.push('boundary-resolved'); return outcome; });
    for (let i = 0; i < 20 && !statusStarted; i++) await Promise.resolve();
    expect(statusStarted).toBe(true);
    expect(order).toEqual(['file-1-finished']);
    releaseStatus();
    await expect(boundary).resolves.toMatchObject({ ok: true, state: 'committed' });
    order.push('file-2-started');
    expect(order).toEqual(['file-1-finished', 'boundary-resolved', 'file-2-started']);
  });

  it.each(['reported-false', 'silent-noop'])('signals degraded when a status commit is %s', async (failureMode) => {
    const runtime = makeRuntime({
      setBehavior: async (key) => {
        if (!key.startsWith('pdf_active_batch_status_v4_')) return null;
        return failureMode === 'reported-false'
          ? { handled: true, result: false }
          : { handled: true, result: true };
      },
    });
    const batchId = 'batch_boundary_' + failureMode.replace(/[^a-z]/g, '_');
    const files = [makeFile('failed-commit')];
    const rootWriteId = await saveRoot(runtime, batchId, files);
    const outcome = await runtime.api.commitBoundary({
      files,
      batchId,
      startWrite: Promise.resolve(rootWriteId),
      isCurrent: () => true,
      context: 'file-1-done',
      timeoutMs: 1000,
    });
    expect(outcome).toMatchObject({ ok: false, state: 'degraded' });
    expect(runtime.api.degraded()).toBe(true);
    expect(runtime.events.some((event) => event.detail && event.detail.state === 'degraded')).toBe(true);
    expect(runtime.toasts.some((message) => /could not (?:update|be committed)/i.test(message))).toBe(true);
    expect(runtime.values.has(runtime.api.resultKeyFor(batchId, files[0]))).toBe(false);
    expect(files[0]._checkpointResultKey).toBeNull();
  });

  it('rejects stale owner and stale revision commits without overwriting the newer checkpoint', async () => {
    const runtime = makeRuntime();
    const batchId = 'batch_boundary_stale';
    const files = [makeFile('stale-file')];
    const rootWriteId = await saveRoot(runtime, batchId, files);
    await expect(runtime.api.saveStatusNow(files, batchId, {
      commitRevision: 200,
      commitReason: 'newer-boundary',
      rootWriteId,
    })).resolves.toBe(true);
    const statusKey = runtime.api.statusKeyFor(batchId);
    const newer = runtime.values.get(statusKey);
    files[0].status = 'failed';
    await expect(runtime.api.saveStatusNow(files, batchId, {
      commitRevision: 100,
      commitReason: 'stale-boundary',
      rootWriteId,
    })).resolves.toBe('stale');
    expect(runtime.values.get(statusKey)).toEqual(newer);
    expect(runtime.events.some((event) => event.detail && event.detail.state === 'stale')).toBe(true);

    const ownerOutcome = await runtime.api.commitBoundary({
      files,
      batchId,
      startWrite: Promise.resolve(rootWriteId),
      isCurrent: () => false,
      context: 'superseded-file',
      timeoutMs: 1000,
    });
    expect(ownerOutcome).toMatchObject({ ok: false, state: 'stale' });
    expect(runtime.values.get(statusKey)).toEqual(newer);
  });

  it('fences an older resumed tab by rootWriteId even when both runs reuse one batchId', async () => {
    const values = new Map();
    const lockState = { tail: Promise.resolve() };
    const older = makeRuntime({ values, lockState });
    const newer = makeRuntime({ values, lockState });
    const batchId = 'batch_same_id_takeover';
    const oldFiles = [makeFile('shared-file')];
    const newFiles = [makeFile('shared-file')];
    const oldRootWriteId = await saveRoot(older, batchId, oldFiles);
    await expect(older.api.saveStatusNow(oldFiles, batchId, {
      commitRevision: 8000000000000000,
      commitReason: 'old-root-high-revision',
      rootWriteId: oldRootWriteId,
    })).resolves.toBe(true);
    const newRootWriteId = await saveRoot(newer, batchId, newFiles);
    expect(newRootWriteId).not.toBe(oldRootWriteId);

    await expect(older.api.commitBoundary({
      files: oldFiles,
      batchId,
      startWrite: Promise.resolve(oldRootWriteId),
      isCurrent: () => true,
      context: 'old-tab-late',
      timeoutMs: 1000,
    })).resolves.toMatchObject({ ok: false, state: 'stale' });
    expect(values.get(older.api.resultKeyFor(batchId, oldFiles[0])).rootWriteId).toBe(oldRootWriteId);
    await expect(older.api.clearActive(batchId, oldRootWriteId)).resolves.toBe(false);
    expect(values.get('pdf_active_batch_files_v1').rootWriteId).toBe(newRootWriteId);

    await expect(newer.api.commitBoundary({
      files: newFiles,
      batchId,
      startWrite: Promise.resolve(newRootWriteId),
      isCurrent: () => true,
      context: 'new-tab-wins',
      timeoutMs: 1000,
    })).resolves.toMatchObject({ ok: true, state: 'committed' });
    expect(values.get(newer.api.resultKeyFor(batchId, newFiles[0])).rootWriteId).toBe(newRootWriteId);
  });

  it('fails checkpoint persistence closed when an atomic Web Lock is unavailable', async () => {
    const runtime = makeRuntime({ navigator: {} });
    const files = [makeFile('no-lock')];
    await expect(runtime.api.saveFiles(files, {}, 100, 'batch_without_lock')).resolves.toBe(false);
    expect(runtime.values.has('pdf_active_batch_files_v1')).toBe(false);
    expect(runtime.api.degraded()).toBe(true);
  });

  it('tombstones a root write that completes after initialization timed out', async () => {
    let releaseRoot;
    let rootWriteStarted = false;
    const rootGate = new Promise((resolveGate) => { releaseRoot = resolveGate; });
    const runtime = makeRuntime({
      beforeSet: async (key) => {
        if (key !== 'pdf_active_batch_files_v1') return;
        rootWriteStarted = true;
        await rootGate;
      },
    });
    const batchId = 'batch_late_root';
    const files = [makeFile('late-root-file', 'pending')];
    const startWrite = runtime.api.saveFiles(files, {}, 100, batchId);
    const outcome = runtime.api.startRoot({
      startWrite,
      batchId,
      isCurrent: () => true,
      timeoutMs: 20,
    });
    for (let i = 0; i < 20 && !rootWriteStarted; i++) await Promise.resolve();
    expect(rootWriteStarted).toBe(true);
    await expect(outcome).resolves.toBe(false);
    releaseRoot();
    await startWrite;
    for (let i = 0; i < 20 && runtime.values.get('pdf_active_batch_files_v1'); i++) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 5));
    }
    expect(runtime.values.get('pdf_active_batch_files_v1')).toBeNull();
    expect(runtime.values.has(runtime.api.statusKeyFor(batchId))).toBe(false);
  });

  it('uses an independent boundary deadline and awaits commits before cooldown/next-file work', () => {
    expect(source).toContain('const _BATCH_BOUNDARY_COMMIT_TIMEOUT_MS = 7000;');
    expect(source).not.toContain('_batchCheckpointBudgetMs');
    expect(source).not.toContain('_batchFileDeadlines');
    const boundaryIndex = source.indexOf('await _persistBatchStatus(\'file-\'');
    const cooldownIndex = source.indexOf('Cooling down before next file...', boundaryIndex);
    expect(boundaryIndex).toBeGreaterThan(-1);
    expect(cooldownIndex).toBeGreaterThan(boundaryIndex);
    expect(source).toContain('_batchStatusWriteTail = operation.catch(() => {});');
    expect(source).toMatch(/\}, 'exclusive'\);/);
    expect(source).toContain('status write was not observable after commit');
    expect(source).toContain('batch_checkpoint_atomic_lock_unavailable');
    expect(source).toContain('_clearActiveBatch(_batchId, _batchRootWriteId)');
  });
});
