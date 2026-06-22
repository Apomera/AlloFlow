// Residual report findings (2026-06-22): DB-B6 (iframe→state sync dropped edits to <50-char docs because
// it couldn't tell "un-hydrated shell" from "short real doc") and PDF-Issue2 (the reliability test-retest
// experiment ran the legacy processSinglePdfForBatch loop, so its SD/SEM/CV characterized code that never
// ships). DB-B6 fix: a data-allo-hydrated flag on the HOST iframe element (never exported) as the primary
// signal, with the <50 length kept as a regression-proof fallback. Issue2 fix: repoint to the production
// runPdfAccessibilityAudit + fixAndVerifyPdf path.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of the new getPdfPreviewHtml gate: only fall back to the in-memory HTML when NOT hydrated AND near-empty.
const useMemFallback = (hydrated, bodyLen, hasMem) => !hydrated && bodyLen < 50 && hasMem;

describe('DB-B6: a hydrated iframe is trusted even for a short doc (edits persist), shell still falls back', () => {
  it('hydrated short doc → trust the iframe (edit persists, no fallback)', () => {
    expect(useMemFallback(true, 12, true)).toBe(false);
  });
  it('un-hydrated near-empty shell → fall back to in-memory HTML (no regression of the original guard)', () => {
    expect(useMemFallback(false, 12, true)).toBe(true);
  });
  it('long content is trusted regardless of the flag', () => {
    expect(useMemFallback(false, 500, true)).toBe(false);
    expect(useMemFallback(true, 500, true)).toBe(false);
  });
  it('anti-drift: the flag lives on the HOST iframe element + the <50 fallback is preserved', () => {
    expect(dp).toMatch(/iframe\.setAttribute\('data-allo-hydrated', '1'\)/);                 // set after doc.close
    expect(dp).toMatch(/const _hydrated = \(\(\) => \{ try \{ return pdfPreviewRef\.current\.getAttribute\('data-allo-hydrated'\) === '1'/);
    expect(dp).toMatch(/if \(!_hydrated && bodyText\.trim\(\)\.length < 50 && memHtml\) return memHtml;/); // fallback kept
    expect(dp).toMatch(/if \(_wasHydrated \|\| liveText\.trim\(\)\.length >= 50\)/);          // live-edit snapshot
  });
});

describe('PDF-Issue2: the reliability experiment measures the PRODUCTION pipeline, not the legacy loop', () => {
  it('runTestRetestExperiment now runs runPdfAccessibilityAudit + fixAndVerifyPdf (the shipped path)', () => {
    const expIdx = dp.indexOf('const runTestRetestExperiment =');
    const endIdx = dp.indexOf('const proceedWithPdfTransform', expIdx);
    const body = dp.slice(expIdx, endIdx);
    expect(body).toMatch(/const _audit = await runPdfAccessibilityAudit\(base64Data, \{ skipUiUpdates: true, fileName: fileName \}\)/);
    expect(body).toMatch(/await fixAndVerifyPdf\(\{\s*base64: base64Data,\s*fileName: fileName,\s*auditResult: _audit,/);
    expect(body).not.toMatch(/await processSinglePdfForBatch\(/); // legacy loop no longer used by the experiment
  });
  it('the experiment output labels which pipeline it measured (honesty)', () => {
    expect(dp).toMatch(/pipeline: 'production \(runPdfAccessibilityAudit \+ fixAndVerifyPdf/);
  });
});
