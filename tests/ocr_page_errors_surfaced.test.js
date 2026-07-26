// Per-page OCR failures are surfaced to the UI (audit #17, 2026-06-15). A page that failed OCR
// became empty text while the doc was still marked fully remediated; the extraction-complete
// payload never carried pageErrors, so the UI's Stage-1 partial-extraction banner (which reads
// metadata.pageErrors) could never render. This pins the full thread-through.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('OCR page errors reach the partial-extraction banner (audit #17)', () => {
  it('the reconcile collects per-page errors from both engines onto the run global', () => {
    // Still the union of both engines' records...
    expect(pipe).toContain('const _allErrs = [].concat(tessResult.pageErrors || [], visionResult.pageErrors || []);');
    // ...but narrowed to pages the RECONCILE left empty (C3, audit 2026-07-26). Before that change
    // the two whole-engine failure paths emitted no records at all, so this global stayed empty on a
    // total engine death; now that they do emit, a raw concat would fire the banner on every run
    // where one engine died and the other covered the document — a false alarm, not a lost page.
    expect(pipe).toContain('window.__lastOcrPageErrors = _unrecovered;');
  });
  it('the global is reset per run so a later born-digital doc does not show stale errors', () => {
    expect(pipe).toContain("window.__lastOcrPageErrors = []; // audit #17");
  });
  it('the extraction-complete metadata now includes pageErrors', () => {
    expect(pipe).toMatch(/pageErrors: \(typeof window !== 'undefined' && Array\.isArray\(window\.__lastOcrPageErrors\)\) \? window\.__lastOcrPageErrors : \[\],/);
  });
  it('the UI banner consumes metadata.pageErrors (the consumer this feeds)', () => {
    expect(view).toContain('extractionData.metadata.pageErrors');
  });
});
