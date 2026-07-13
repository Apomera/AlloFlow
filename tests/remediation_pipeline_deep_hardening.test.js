import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipe = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');
const host = read('AlloFlowANTI.txt');
const preview = read('view_export_preview_source.jsx');
const occurrences = (text, needle) => text.split(needle).length - 1;
const plainMarker = view.indexOf('data-help-key="pdf_audit_plain_language_btn"');
const plainHandlerStart = view.indexOf('onClick={async () => {', plainMarker);
const plainHandlerEnd = view.indexOf('}} className=', plainHandlerStart);
if (plainMarker < 0 || plainHandlerStart < 0 || plainHandlerEnd < 0) throw new Error('Plain-language handler markers missing');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runPlainLanguageHandler = new AsyncFunction(
  'pdfFixResult', 'setPlainLangBusy', '_captureAsyncHtmlToken', '_sourceDigestForToken',
  'simplifyAccessibleHtml', 'plainLangLevel', 'setPlainLangProgress', '_commitAsyncHtmlIfCurrent',
  'addToast', 't',
  view.slice(plainHandlerStart + 'onClick={async () => {'.length, plainHandlerEnd)
);
const cssSanitizerStart = pipe.indexOf('function _alloDecodeImportedCss');
const cssSanitizerEnd = pipe.indexOf('function _alloSanitizeRemediationHtml', cssSanitizerStart);
if (cssSanitizerStart < 0 || cssSanitizerEnd < 0) throw new Error('Imported CSS sanitizer markers missing');
const sanitizeImportedCss = new Function(
  pipe.slice(cssSanitizerStart, cssSanitizerEnd) + '\nreturn _alloSanitizeImportedCss;'
)();
const checkpointRuntimeStart = pipe.indexOf("const _ACTIVE_BATCH_FILES_KEY");
const checkpointRuntimeEnd = pipe.indexOf('  const _AUDIT_SLICE_BYTES_KB', checkpointRuntimeStart);
if (checkpointRuntimeStart < 0 || checkpointRuntimeEnd < 0) throw new Error('Batch checkpoint runtime markers missing');
const makeCheckpointRuntime = (storageDB, idbKeyval, navigatorApi = {}) => new Function(
  'storageDB', 'window', 'navigator', '_PIPELINE_PROMPT_VERSION',
  '_alloStripVerificationHtmlSnapshot', '_alloRehydrateVerificationHtmlBinding', 'warnLog', 'addToast',
  pipe.slice(checkpointRuntimeStart, checkpointRuntimeEnd)
    + '\nreturn { normalize: _normalizeBatchCheckpointId, newId: _newBatchCheckpointId, prefixFor: _batchResultPrefixFor, keyFor: _batchResultKeyFor, statusKeyFor: _batchStatusKeyFor, saveFiles: _saveBatchFiles, saveStatusNow: _saveBatchStatusNow, load: _loadActiveBatch, clear: _clearActiveBatch };'
)(
  storageDB, { idbKeyval }, navigatorApi, 'test-prompt-v1',
  (value) => value, async (value) => value, () => {}, () => {}
);
const _checkpointHelperValues = new Map();
const checkpointHelpers = makeCheckpointRuntime(
  {
    get: async (key) => _checkpointHelperValues.get(key),
    set: async (key, value) => { _checkpointHelperValues.set(key, value); },
  },
  {
    keys: async () => Array.from(_checkpointHelperValues.keys()),
    del: async (key) => { _checkpointHelperValues.delete(key); },
  }
);

describe('remediation deep-dive hardening', () => {
  it('sanitizes every imported remediation HTML lane before commit or Builder preview', () => {
    expect(pipe).toContain("querySelectorAll('script,iframe,frame,object,embed,base,link,meta,svg,math,template')");
    expect(pipe).toContain("if (/^on/i.test(name)");
    expect(pipe).toContain("name === 'ping' || name === 'manifest'");
    expect(pipe).toContain("out._translation = Object.assign({}, out._translation, { html: sanitize(out._translation.html) })");
    expect(pipe).toContain("out._plainLanguage = Object.assign({}, out._plainLanguage, { html: sanitize(out._plainLanguage.html) })");
    expect(pipe).toContain("cleanRange.result = Object.assign({}, cleanRange.result, { accessibleHtml: sanitize(cleanRange.result.accessibleHtml) })");
    expect(occurrences(view, '_viewSanitizeProjectImport(parsedProject, _docPipeline)')).toBe(2);
    expect(host).toContain('const _sanitizedImport = _projectSanitizer(_savedProject);');
    expect(host).toContain('const _safeRemediationHtml = _docPipeline.sanitizeRemediationHtml(pdfFixResult.accessibleHtml);');
    expect(preview).toContain("exportPreviewSource === 'remediation' ? 'allow-same-origin' : 'allow-same-origin allow-scripts allow-forms'");
  });

  it('canonicalizes CSS escapes and comments before removing fetch and execution primitives', () => {
    const hostile = [
      '@\\69mport "https://evil.example/import.css";',
      '@font-f\\000061ce { src: u\\72l("https://evil.example/font.woff2"); }',
      '.safe { color: rgb(1, 2, 3); background-image: u\\72l("https://evil.example/a.png"); }',
      '.split { width: 50%; background: u/**/rl("https://evil.example/b.png"); }',
      '.set { background-image: -webkit-\\69mage-set("https://evil.example/c.png" 1x); }',
      '.image { background-image: \\69mage("https://evil.example/d.png"); }',
      '.source { background-image: s\\000072c("https://evil.example/e.png"); }',
      '.old { be\\000068avior: u\\72l("https://evil.example/x.htc"); x: exp\\000072ession(alert(1)); }',
    ].join('\n');
    const clean = sanitizeImportedCss(hostile);
    expect(clean).toContain('color: rgb(1, 2, 3)');
    expect(clean).toContain('width: 50%');
    expect(clean).not.toMatch(/evil\.example|@import|@font-face|url\s*\(|image\s*\(|src\s*\(|image-set\s*\(|expression\s*\(|behavior\s*:/i);
    expect(sanitizeImportedCss('color: red;' + '\\')).toBe('');
  });

  it('uses compare-and-swap and lifecycle epochs for every long-running UI mutation', () => {
    expect(host).toContain('capturePdfHtmlCommitToken');
    expect(host).toContain('commitPdfFixResultIfCurrent');
    expect(view).toContain('const _commitToken = _captureAsyncHtmlToken();');
    expect(view).toContain('_commitAsyncHtmlIfCurrent(_commitToken');
    expect(host).toContain('const pdfAuditEpochRef = useRef(0);');
    expect(host).toContain('invalidatePdfAuditRun();');
    expect(host).toContain('const _pdfFidelityRepairEpochRef = useRef(0);');
    expect(pipe).toContain("const _auditRunToken = (!_skipUi && typeof _auditHost.beginPdfAuditRun === 'function')");
    expect(pipe).toContain('return _auditCancelled() ? null : triangulated;');
  });

  it('binds companions and resume records to exact SHA-256 source identities', () => {
    expect(pipe).toContain("replace(/\\s+/g, '')");
    expect(pipe).not.toContain("replace(/s+/g, '')");
    expect(pipe).toContain("return 'msdoc_v2_' + digest.slice(7)");
    expect(pipe).toContain('record.documentDigest !== expectedDocumentDigest');
    expect(pipe).toContain('saved.documentDigest === _currentDocKey');
    expect(host).toContain('docKey: _override.docKey || null');
    expect(host).toContain('documentDigest: cur.documentDigest || null');
    expect(view).toContain('sourceDigest: _translationSourceDigest');
    expect(view).toContain('sourceDigest: _plainSourceDigest');
    expect(view).toContain("if (!_requireFreshCompanion(pdfFixResult._translation");
    expect(view).toContain("if (!_requireFreshCompanion(pdfFixResult._plainLanguage");
  });

  it('executes plain-language generation before committing the digest-bound companion', async () => {
    const sourceHtml = '<main><h1>Source</h1><p>Complex sentence.</p></main>';
    const busy = [];
    const progress = [];
    const toasts = [];
    let simplifyCall = null;
    let committed = null;
    await runPlainLanguageHandler(
      { accessibleHtml: sourceHtml },
      (value) => busy.push(value),
      () => ({ revision: 3, html: sourceHtml }),
      async () => 'sha256:source-digest',
      async (html, opts) => {
        simplifyCall = { html, gradeBand: opts.gradeBand };
        opts.onProgress(1, 2);
        return { html: '<main><h1>Source</h1><p>Simple sentence.</p></main>', chunksFailed: 0, chunksTotal: 2 };
      },
      '5-6',
      (value) => progress.push(value),
      (_token, updater) => {
        committed = updater({ accessibleHtml: sourceHtml });
        return true;
      },
      (...args) => toasts.push(args),
      (key) => key
    );
    expect(simplifyCall).toEqual({ html: sourceHtml, gradeBand: '5-6' });
    expect(progress).toEqual(['1/2', '']);
    expect(busy).toEqual([true, false]);
    expect(committed._plainLanguage).toMatchObject({
      html: '<main><h1>Source</h1><p>Simple sentence.</p></main>',
      sourceDigest: 'sha256:source-digest',
      srcLen: sourceHtml.length,
      chunksFailed: 0,
      chunksTotal: 2,
    });
    expect(toasts.some((args) => args[1] === 'success')).toBe(true);
  });

  it('blocks remediation until the pipeline, verification policy, and renderer are ready', () => {
    expect(host).toContain("const remediationModuleNames = ['DocPipelineModule', 'VerificationPolicy', 'DocBuilderRenderer'];");
    expect(host).toContain('remediationReady, remediationDependencyState, retryRemediationDependencies');
    expect(view).toContain('Remediation engine not ready');
    expect(view).toContain('disabled={remediationReady === false}');
    expect(view).toContain('disabled={pdfFixLoading || remediationReady === false}');
    expect(view).toContain('module unavailable|modules? finish loading');
  });

  it('keeps batch status small and safely reruns completed files whose result is unavailable', () => {
    const statusBlock = pipe.slice(pipe.indexOf('const _toStatusEntry'), pipe.indexOf('const _saveBatchFiles'));
    expect(statusBlock).toContain('resultKey:');
    expect(statusBlock).toContain('resultSummary:');
    expect(statusBlock).not.toMatch(/\n\s*result:\s*f\.result/);
    expect(pipe).toContain('const _ACTIVE_BATCH_RESULT_MAX_BYTES = 32 * 1024 * 1024;');
    expect(pipe).toContain('const _ACTIVE_BATCH_RESULTS_MAX_BYTES = 128 * 1024 * 1024;');
    expect(pipe).toContain("? (restoredResult ? 'done' : 'pending')");
    expect(pipe).toContain("const _ACTIVE_BATCH_RESULT_PREFIX = 'pdf_active_batch_result_v3_';");
    expect(pipe).toContain("const _ACTIVE_BATCH_STATUS_PREFIX = 'pdf_active_batch_status_v4_';");
    expect(pipe).toContain('schemaVersion: 4,');
    expect(pipe).toContain('_withBatchCheckpointRootLock(async () =>');
    expect(pipe).toContain('rootWriteId: _newBatchCheckpointId()');
    expect(pipe).toContain('writeId: _newBatchCheckpointId()');
    expect(pipe).toContain('_sameBatchFilesRecord(activeFilesRec, initialFilesRec)');
    expect(pipe).toContain('if (requestedId && activeId !== requestedId) return false;');
    expect(pipe).toContain('key.startsWith(_ACTIVE_BATCH_RESULT_PREFIX) && !key.startsWith(activeResultPrefix)');
    const firstKey = checkpointHelpers.keyFor('batch_first_owner', { id: 'same-file' });
    const secondKey = checkpointHelpers.keyFor('batch_second_owner', { id: 'same-file' });
    expect(firstKey).not.toBe(secondKey);
    expect(checkpointHelpers.statusKeyFor('batch_first_owner'))
      .not.toBe(checkpointHelpers.statusKeyFor('batch_second_owner'));
    expect(checkpointHelpers.normalize(checkpointHelpers.newId())).toBeTruthy();
    expect(checkpointHelpers.normalize('../not-an-owner')).toBeNull();
  });

  it('refuses stale checkpoint cleanup and deletes only the owning batch namespace', async () => {
    const filesKey = 'pdf_active_batch_files_v1';
    const legacyStatusKey = 'pdf_active_batch_status_v1';
    const newId = 'batch_new_owner';
    const staleId = 'batch_stale_owner';
    const newStatusKey = checkpointHelpers.statusKeyFor(newId);
    const newResultKey = checkpointHelpers.keyFor(newId, { id: 'shared-file' });
    const staleResultKey = checkpointHelpers.keyFor(staleId, { id: 'shared-file' });
    const values = new Map([
      [filesKey, {
        schemaVersion: 4,
        batchId: newId,
        statusKey: newStatusKey,
        files: [{ id: 'shared-file' }],
        savedAt: 10,
      }],
      [newStatusKey, {
        schemaVersion: 4,
        batchId: newId,
        statuses: [{ id: 'shared-file', resultKey: newResultKey }],
      }],
      [newResultKey, { serialized: '{}' }],
      [staleResultKey, { serialized: '{}' }],
    ]);
    const storageDB = {
      get: async (key) => values.get(key),
      set: async (key, value) => { values.set(key, value); },
    };
    const idbKeyval = {
      keys: async () => Array.from(values.keys()),
      del: async (key) => { values.delete(key); },
    };
    const clear = makeCheckpointRuntime(storageDB, idbKeyval).clear;

    await expect(clear(staleId)).resolves.toBe(false);
    expect(values.get(filesKey).batchId).toBe(newId);
    expect(values.has(newResultKey)).toBe(true);
    await expect(clear(newId)).resolves.toBe(true);
    expect(values.get(filesKey)).toBeNull();
    expect(values.has(newStatusKey)).toBe(false);
    expect(values.has(legacyStatusKey)).toBe(false);
    expect(values.has(newResultKey)).toBe(false);
    expect(values.has(staleResultKey)).toBe(true);

    const legacyOwned = 'pdf_active_batch_result_v2_owned';
    const legacyOrphan = 'pdf_active_batch_result_v2_orphan';
    values.set(filesKey, { files: [{ id: 'legacy' }], savedAt: 20 });
    values.set(legacyStatusKey, {
      schemaVersion: 2,
      statuses: [{ id: 'legacy', resultKey: legacyOwned }],
      lastUpdatedAt: 20,
    });
    values.set(legacyOwned, { serialized: '{}' });
    values.set(legacyOrphan, { serialized: '{}' });
    await expect(clear(null)).resolves.toBe(true);
    expect(values.has(legacyOwned)).toBe(false);
    expect(values.has(legacyOrphan)).toBe(true);
  });
  it('keeps root replacement and inactive cleanup in one lock and restores scoped v4 results', async () => {
    const filesKey = 'pdf_active_batch_files_v1';
    const legacyStatusKey = 'pdf_active_batch_status_v1';
    const batchId = 'batch_scoped_owner';
    const inactiveId = 'batch_inactive_owner';
    const legacyResultKey = 'pdf_active_batch_result_v2_orphan';
    const values = new Map([
      [legacyStatusKey, { schemaVersion: 3, batchId: inactiveId, statuses: [], lastUpdatedAt: 1 }],
    ]);
    let lockTail = Promise.resolve();
    let lockDepth = 0;
    const lockModes = [];
    let cleanupOutsideLock = false;
    const navigatorApi = {
      locks: {
        request: (_name, options, fn) => {
          lockModes.push(options.mode);
          const run = async () => {
            lockDepth++;
            try { return await fn(); } finally { lockDepth--; }
          };
          const next = lockTail.then(run, run);
          lockTail = next.catch(() => {});
          return next;
        },
      },
    };
    const storageDB = {
      get: async (key) => values.get(key),
      set: async (key, value) => { values.set(key, value); },
    };
    const runtime = makeCheckpointRuntime(storageDB, {
      keys: async () => Array.from(values.keys()),
      del: async (key) => {
        if (key === legacyResultKey
            || key === runtime.keyFor(inactiveId, { id: 'old-file' })
            || key === runtime.statusKeyFor(inactiveId)) {
          cleanupOutsideLock = cleanupOutsideLock || lockDepth === 0;
        }
        values.delete(key);
      },
    }, navigatorApi);
    const inactiveResultKey = runtime.keyFor(inactiveId, { id: 'old-file' });
    const inactiveStatusKey = runtime.statusKeyFor(inactiveId);
    values.set(legacyResultKey, { serialized: '{}' });
    values.set(inactiveResultKey, { serialized: '{}' });
    values.set(inactiveStatusKey, { schemaVersion: 4, batchId: inactiveId, statuses: [] });

    const result = { beforeScore: 40, afterScore: 96, verificationState: 'complete' };
    const files = [{
      id: 'file-a',
      fileName: 'a.pdf',
      fileSize: 4,
      base64: 'AA==',
      status: 'done',
      result,
    }];
    await expect(runtime.saveFiles(files, { pdfTargetScore: 95 }, 100, batchId)).resolves.toBe(true);
    expect(cleanupOutsideLock).toBe(false);
    expect(values.has(legacyResultKey)).toBe(false);
    expect(values.has(inactiveResultKey)).toBe(false);
    expect(values.has(inactiveStatusKey)).toBe(false);
    expect(values.has(legacyStatusKey)).toBe(false);

    await expect(runtime.saveStatusNow(files, batchId)).resolves.toBe(true);
    const root = values.get(filesKey);
    const statusKey = runtime.statusKeyFor(batchId);
    const status = values.get(statusKey);
    const goodResultKey = runtime.keyFor(batchId, files[0]);
    expect(root).toMatchObject({ schemaVersion: 4, batchId, statusKey });
    expect(root.rootWriteId).toMatch(/^batch_/);
    expect(status).toMatchObject({ schemaVersion: 4, batchId });
    expect(status.writeId).toMatch(/^batch_/);
    expect(values.has(goodResultKey)).toBe(true);
    expect(lockModes).toEqual(['exclusive', 'shared']);

    const restored = await runtime.load();
    expect(restored.files[0]).toMatchObject({ status: 'done', result });

    const wrongFileKey = runtime.keyFor(batchId, { id: 'different-file' });
    values.set(wrongFileKey, values.get(goodResultKey));
    values.set(statusKey, {
      ...status,
      statuses: status.statuses.map((entry) => ({ ...entry, resultKey: wrongFileKey })),
    });
    const crossFileRestore = await runtime.load();
    expect(crossFileRestore.files[0].status).toBe('pending');
    expect(crossFileRestore.files[0].result).toBeNull();

    await expect(runtime.clear(batchId)).resolves.toBe(true);
    expect(lockModes).toEqual(['exclusive', 'shared', 'exclusive']);
    expect(values.get(filesKey)).toBeNull();
    expect(values.has(statusKey)).toBe(false);
  });

  it('rolls back newly written results when a batch loses root ownership mid-write', async () => {
    const filesKey = 'pdf_active_batch_files_v1';
    const oldId = 'batch_losing_owner';
    const newId = 'batch_replacement_owner';
    const values = new Map();
    let flipOnResultWrite = false;
    let oldResultKey = null;
    const storageDB = {
      get: async (key) => values.get(key),
      set: async (key, value) => {
        values.set(key, value);
        if (flipOnResultWrite && key === oldResultKey) {
          values.set(filesKey, {
            schemaVersion: 4,
            batchId: newId,
            rootWriteId: 'batch_replacement_root',
            statusKey: 'pdf_active_batch_status_v4_' + newId,
            files: [{ id: 'new-file' }],
            startedAt: 200,
            savedAt: Date.now(),
          });
        }
      },
    };
    const idbKeyval = {
      keys: async () => Array.from(values.keys()),
      del: async (key) => { values.delete(key); },
    };
    const runtime = makeCheckpointRuntime(storageDB, idbKeyval);
    const file = {
      id: 'old-file',
      fileName: 'old.pdf',
      fileSize: 4,
      base64: 'AA==',
      status: 'done',
      result: { afterScore: 95 },
    };
    oldResultKey = runtime.keyFor(oldId, file);
    await expect(runtime.saveFiles([file], {}, 100, oldId)).resolves.toBe(true);
    flipOnResultWrite = true;

    await expect(runtime.saveStatusNow([file], oldId)).resolves.toBe(false);
    expect(values.get(filesKey).batchId).toBe(newId);
    expect(values.has(oldResultKey)).toBe(false);
    expect(values.has(runtime.statusKeyFor(oldId))).toBe(false);
    expect(file._checkpointResultKey).toBeNull();
    expect(file._checkpointResultBytes).toBe(0);
  });

  it('removes result and status artifacts when the scoped status write fails', async () => {
    const batchId = 'batch_status_failure';
    const values = new Map();
    let failStatusWrite = false;
    let statusKey = null;
    const storageDB = {
      get: async (key) => values.get(key),
      set: async (key, value) => {
        values.set(key, value);
        if (failStatusWrite && key === statusKey) throw new Error('simulated status quota failure');
      },
    };
    const idbKeyval = {
      keys: async () => Array.from(values.keys()),
      del: async (key) => { values.delete(key); },
    };
    const runtime = makeCheckpointRuntime(storageDB, idbKeyval);
    statusKey = runtime.statusKeyFor(batchId);
    const file = {
      id: 'quota-file',
      fileName: 'quota.pdf',
      fileSize: 4,
      base64: 'AA==',
      status: 'done',
      result: { afterScore: 97 },
    };
    const resultKey = runtime.keyFor(batchId, file);
    await expect(runtime.saveFiles([file], {}, 300, batchId)).resolves.toBe(true);
    failStatusWrite = true;

    await expect(runtime.saveStatusNow([file], batchId)).resolves.toBe(false);
    expect(values.has(statusKey)).toBe(false);
    expect(values.has(resultKey)).toBe(false);
    expect(file._checkpointResultKey).toBeNull();
    expect(file._checkpointResultBytes).toBe(0);
  });
});

