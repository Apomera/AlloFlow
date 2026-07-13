import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipe = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');
const host = read('AlloFlowANTI.txt');
const preview = read('view_export_preview_source.jsx');
const occurrences = (text, needle) => text.split(needle).length - 1;

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
    expect(pipe).toContain("key.startsWith(_ACTIVE_BATCH_RESULT_PREFIX)");
  });
});

