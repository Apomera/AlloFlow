// 2026-08-10 — the document caches must be visible and escapable.
//
// Field report (Aaron): re-processing a previously-seen document appeared to
// "just exit the modal" — the content-hash audit cache replayed the finished
// result instantly, with nothing on screen saying a cache was involved and no
// way anywhere in the UI to force a fresh run or forget cached results. The
// pipeline even had a skipCache option — with ZERO callers.
//
// These pins hold the three-part repair in place:
//   1. clearPdfDocumentCaches — a live, prefix-scoped export: deletes ONLY the
//      pdf_audit_/pdf_remed_ cache keys, never batch-resume or other stores;
//   2. cache hits stamp provenance (_fromAuditCache/_auditCachedAt) on the UI
//      copy while the legacy write-back stays UNstamped (a stored stamp would
//      lie on the next first-run write);
//   3. Retry Audit passes skipCache: true — retry means retry, not replay —
//      and the results header renders the cached-result pill with the
//      Clear-cache escape hatch behind the DocPipelineModule registry guard.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

let pipeline;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => 'OK',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (k) => k,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
});

describe('clearPdfDocumentCaches — LIVE instance', () => {
  it('is exported by the pipeline', () => {
    expect(typeof pipeline.clearPdfDocumentCaches).toBe('function');
  });

  it('deletes exactly the pdf_audit_/pdf_remed_ keys and reports the count', async () => {
    const store = new Map([
      ['pdf_audit_v9_cloud_abc_n1_en', { audit: {}, savedAt: 1 }],
      ['pdf_remed_v9_cloud_abc_n1_en_t90_p1_pp0_ocrauto', { result: {}, savedAt: 1 }],
      ['pdf_active_batch_files_v1', { files: [] }],
      ['alloflow_unrelated_key', 42],
    ]);
    const prevIdb = window.idbKeyval;
    window.idbKeyval = {
      keys: async () => Array.from(store.keys()),
      del: async (k) => { store.delete(k); },
      get: async (k) => store.get(k),
      set: async (k, v) => { store.set(k, v); },
    };
    try {
      const res = await pipeline.clearPdfDocumentCaches();
      expect(res.ok).toBe(true);
      expect(res.removed).toBe(2);
      // The resume checkpoint and unrelated keys must survive a cache clear.
      expect(store.has('pdf_active_batch_files_v1')).toBe(true);
      expect(store.has('alloflow_unrelated_key')).toBe(true);
      expect(store.has('pdf_audit_v9_cloud_abc_n1_en')).toBe(false);
      expect(store.has('pdf_remed_v9_cloud_abc_n1_en_t90_p1_pp0_ocrauto')).toBe(false);
    } finally {
      window.idbKeyval = prevIdb;
    }
  });

  it('fails soft when the cache store is unavailable', async () => {
    const prevIdb = window.idbKeyval;
    window.idbKeyval = undefined;
    try {
      const res = await pipeline.clearPdfDocumentCaches();
      expect(res.ok).toBe(false);
      expect(res.removed).toBe(0);
    } finally {
      window.idbKeyval = prevIdb;
    }
  });
});

describe('cache provenance — source pins (single-line anchors; the tree is CRLF)', () => {
  it('the audit cache hit stamps _fromAuditCache and _auditCachedAt on the UI copy', () => {
    expect(dp).toContain('_fromAuditCache: true, _auditCachedAt: (_cachedRec.savedAt || null)');
  });

  it('the legacy digest write-back stays UNstamped', () => {
    expect(dp).toContain('_writeAuditCache(_cacheKey, { ...cached, documentDigest: _runDocumentDigest })');
  });

  it('_readAuditCache returns the record so savedAt can travel without persisting stamps', () => {
    expect(dp).toContain('return { audit: cached.audit, savedAt: cached.savedAt };');
  });

  it('the clear is scoped by the same prefix list the sweep owns', () => {
    expect(dp).toContain("_PDF_CACHE_KEY_PREFIXES = ['pdf_audit_', 'pdf_remed_']");
    const clearBody = dp.slice(dp.indexOf('const clearPdfDocumentCaches'));
    expect(clearBody.slice(0, 1200)).toContain('_PDF_CACHE_KEY_PREFIXES.some(p => k.startsWith(p))');
  });
});

describe('view controls — source pins', () => {
  it('Retry Audit forces a fresh audit (skipCache: true)', () => {
    const retryIdx = view.indexOf("addToast(t('toasts.retrying_audit')");
    expect(retryIdx).toBeGreaterThan(-1);
    expect(view.slice(retryIdx, retryIdx + 600)).toContain('skipCache: true');
  });

  it('the results header renders cache provenance with the clear-cache escape hatch', () => {
    expect(view).toContain('pdfAuditResult._fromAuditCache && (');
    expect(view).toContain('window.AlloModules.DocPipelineModule) || null');
    expect(view).toContain("typeof _pipe.clearPdfDocumentCaches !== 'function'");
  });

  it('the one-click and Start paths still use the cache (only Retry skips it)', () => {
    const skips = view.match(/skipCache: true/g) || [];
    expect(skips.length).toBe(1);
  });
});
