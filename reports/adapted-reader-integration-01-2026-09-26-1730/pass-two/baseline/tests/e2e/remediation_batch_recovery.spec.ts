import { test, expect, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const source = fs.readFileSync(path.resolve('doc_pipeline_source.jsx'), 'utf8');
const checkpoint = source.slice(source.indexOf('const _ACTIVE_BATCH_FILES_KEY'), source.indexOf('  const _AUDIT_SLICE_BYTES_KB', source.indexOf('const _ACTIVE_BATCH_FILES_KEY')));
const batch = source.slice(source.indexOf('let _activeBatchRun = null;'), source.indexOf('const downloadBatchResults = async', source.indexOf('let _activeBatchRun = null;')));

async function installRuntime(page: Page) {
  await page.evaluate(async ({ checkpoint, batch }) => {
    const w = window as any;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('remediation-recovery-browser', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('records');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const operation = (mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest) => new Promise<any>((resolve, reject) => {
      const tx = database.transaction('records', mode), request = action(tx.objectStore('records'));
      tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error || request.error); tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
    const storageDB = {
      get: async (key: string) => { if (w.__denyReads) throw new DOMException('Storage unavailable', 'InvalidStateError'); return operation('readonly', store => store.get(key)); },
      set: async (key: string, value: any) => { if (w.__denyWrites) throw new DOMException('Storage full', 'QuotaExceededError'); await operation('readwrite', store => store.put(value, key)); return true; },
    };
    w.idbKeyval = { keys: () => operation('readonly', store => store.getAllKeys()), del: (key: string) => operation('readwrite', store => store.delete(key)) };
    const result = () => ({ accessibleHtml: '<main><h1>Preserved result</h1></main>', beforeScore: 70, afterScore: 95, verificationState: 'partial' });
    w.__state = { queue: [
      { id: 'done', fileName: 'done.docx', fileSize: 100, base64: 'done', status: 'done', result: result() },
      { id: 'bad', fileName: 'bad.pdf', fileSize: 100, base64: 'bad', status: 'pending' },
    ], busy: false, summary: null, toasts: [], calls: 0, epoch: 4 };
    w.__alloPdfBatchGen = 1; w.__failMode = true;
    let lock: any = null;
    const withTimeout = (promise: Promise<any>, ms: number, label: string) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(label + ' timed out')), ms);
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
    const deps: any = {
      window: w, navigator, storageDB, AbortController, CustomEvent, setTimeout, clearTimeout,
      _PIPELINE_PROMPT_VERSION: 'browser-recovery-fixture', _remediationRetentionMs: (ms: number) => ms,
      _alloStripVerificationHtmlSnapshot: (value: any) => value, _alloRehydrateVerificationHtmlBinding: async (value: any) => value,
      _readCurrentDocumentEpoch: () => w.__state.epoch, _normalizeDocumentEpoch: (n: any) => Number.isInteger(n) ? n : null,
      _makeRunCtx: () => ({ batchQueue: w.__state.queue, auditorCount: 1, targetScore: 95, autoFixPasses: 2, polishPasses: 1, outputLanguage: 'English' }), _s: () => ({}),
      _claimRemediationLockForBatch: () => lock ? null : (lock = {}), _releaseRemediationLockForBatch: (token: any) => { if (lock === token) lock = null; },
      setPdfBatchQueue: (next: any) => { w.__state.queue = typeof next === 'function' ? next(w.__state.queue) : next; },
      setPdfBatchSummary: (value: any) => { w.__state.summary = value; }, setPdfBatchProcessing: (value: boolean) => { w.__state.busy = value; },
      setPdfBatchStep: () => {}, setPdfBatchCurrentIndex: () => {}, addToast: (...values: any[]) => w.__state.toasts.push(values), warnLog: () => {},
      _remediationCacheKey: async () => null, _readRemediationCache: async () => null, _writeRemediationCache: () => {},
      _alloDiagnosticDocumentLabel: (value: any) => value, _withTimeout: withTimeout,
      runPdfAccessibilityAudit: async () => ({ score: 70 }),
      fixAndVerifyPdf: async () => {
        w.__state.calls++;
        if (w.__deferFix) { w.__awaitingFix = true; await new Promise(resolve => { w.__releaseFix = resolve; }); }
        if (w.__failMode) throw new Error('Invalid PDF document'); return result();
      },
      _alloLiveAbortSignalOrNull: (value: any) => value && !value.aborted ? value : null,
      _alloDeriveVerificationState: () => ({ verificationState: 'partial', requiresManualReview: true }), _alloNormalizeStoredVerification: (_stored: any, derived: any) => derived,
    };
    w.__api = new Function(...Object.keys(deps), checkpoint + '\n' + batch + '\nreturn { run: runPdfBatchRemediation, load: _loadActiveBatch, health: () => _lastBatchRecoveryState };')(...Object.values(deps));
  }, { checkpoint, batch });
}
async function boot(page: Page) {
  await page.route('http://localhost:4179/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body>Batch recovery fixture</body></html>' }));
  await page.goto('http://localhost:4179/batch-recovery');
  await installRuntime(page);
}

test('failed inputs and completed results survive a real reload and a selected retry', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__api.run());
  const saved = await page.evaluate(() => (window as any).__api.load({ throwOnError: true }));
  expect(saved).toMatchObject({ _incompleteCount: 1, _pendingCount: 0, _failedCount: 1, _doneCount: 1 });
  expect(saved.files[1]).toMatchObject({ status: 'failed', autoRetryable: false, failureKind: 'invalid-file' });
  await page.reload(); await installRuntime(page);
  const reopened = await page.evaluate(() => (window as any).__api.load({ throwOnError: true }));
  expect(reopened.batchId).toBe(saved.batchId);
  expect(reopened.files[0].result.accessibleHtml).toBe(saved.files[0].result.accessibleHtml);
  await page.evaluate(async () => { const w = window as any; const saved = await w.__api.load(); w.__failMode = false;
    await w.__api.run({ resumeQueue: saved.files, resumeBatchId: saved.batchId, resumeSettings: saved.settings, retryFileIds: ['bad'] });
  });
  expect(await page.evaluate(() => (window as any).__state.calls)).toBe(1);
  expect(await page.evaluate(() => (window as any).__state.queue.map((item: any) => item.status))).toEqual(['done', 'done']);
  await expect.poll(() => page.evaluate(() => (window as any).__api.load())).toBeNull();
});

test('another tab can take the checkpoint without an older writer deleting its saved batch', async ({ page, context }) => {
  await boot(page);
  await page.evaluate(() => { const w = window as any; w.__deferFix = true; w.__running = w.__api.run(); });
  await expect.poll(() => page.evaluate(() => !!(window as any).__awaitingFix)).toBe(true);
  const other = await context.newPage(); await boot(other);
  await other.evaluate(() => (window as any).__api.run());
  const winningId = await other.evaluate(() => (window as any).__state.summary.batchId);
  await page.evaluate(async () => { const w = window as any; w.__releaseFix(); await w.__running; });
  expect(await page.evaluate(() => (window as any).__api.health())).toMatchObject({ checkpoint: 'tab-only', checkpointReason: 'another-tab' });
  expect((await page.evaluate(() => (window as any).__api.load())).batchId).toBe(winningId);
  expect((await other.evaluate(() => (window as any).__api.load())).batchId).toBe(winningId);
});

test('unavailable storage keeps the queue in memory and exposes a strict lookup error', async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => { const w = window as any; w.__denyWrites = true; await w.__api.run(); });
  expect(await page.evaluate(() => (window as any).__api.health())).toMatchObject({ checkpoint: 'tab-only', phase: 'idle' });
  expect(await page.evaluate(() => (window as any).__state.queue[1].status)).toBe('failed');
  const lookup = await page.evaluate(async () => { const w = window as any; w.__denyReads = true;
    try { await w.__api.load({ throwOnError: true }); return 'unexpected-success'; } catch (error) { return (error as Error).message; }
  });
  expect(lookup).toContain('Storage unavailable');
});
