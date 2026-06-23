// Audit fix tranche (2026-06-23) from the audit-docbuilder-pipeline workflow: H-1 stale-OCR-globals leak,
// H-2 pdf.js image-doc worker leak, H-3 PII in the diagnostics buffer, H-4 reading-order WARN wired into the
// high-volume AI fix path. Source-presence guards lock each fix in place + survive the build; H-4 also gets a
// real behavior test (the warn actually fires on a block reorder the magnitude checks can't see).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const gem = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
const dpMod = readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8');
const gemMod = readFileSync(resolve(process.cwd(), 'gemini_api_module.js'), 'utf8');

describe('H-1: stale OCR window globals are reset per run (cross-document text bleed)', () => {
  it('the Step-1 reset block clears all four OCR-text globals', () => {
    // they must be reset in the SAME block that resets __lastGroundTruth* (before AutoRestore reads them)
    const block = dp.slice(dp.indexOf('window.__lastGroundTruthCharCount = 0;'), dp.indexOf('Force-OCR escape hatch'));
    expect(block).toMatch(/window\.__lastOcrTesseractText = ''/);
    expect(block).toMatch(/window\.__lastOcrVisionText = ''/);
    expect(block).toMatch(/window\.__lastOcrDisagreements = \[\]/);
    expect(block).toMatch(/window\.__lastOcrMethod = null/);
    expect(dpMod).toMatch(/__lastOcrTesseractText = ''/);   // survives the build
  });
});

describe('H-2: image-extraction pdf.js doc is destroyed in a finally (worker/transport leak)', () => {
  it('pdfDoc is hoisted to let and released in a finally', () => {
    expect(dp).toMatch(/let pdfDoc = null; \/\/ H-2/);
    expect(dp).toMatch(/pdfDoc = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: pdfBytes \}\)/);   // assignment, not a fresh const
    expect(dp).not.toMatch(/const pdfDoc = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: pdfBytes \}\)/);
    expect(dp).toMatch(/if \(pdfDoc\) \{ try \{ pdfDoc\.destroy\(\); \} catch \(_\) \{\} pdfDoc = null; \}/);
  });
});

describe('H-3: OCR recovery logs LENGTH only — no document text (PII) in the diagnostics buffer', () => {
  it('the Vision truncation-recovery warnLog uses partial.length, not partial.substring', () => {
    const block = gem.slice(gem.indexOf('Response JSON truncated'), gem.indexOf('Vision API returned invalid response'));
    expect(block).toMatch(/warnLog\("\[Vision\] Recovered partial text:", partial\.length \+ ' chars'\)/);
    expect(block).not.toMatch(/partial\.substring\(0, 100\)/);
    expect(gemMod).not.toMatch(/Recovered partial text:", partial\.substring/);   // survives the build
  });
});

describe('H-4: reading-order WARN is wired into the high-volume AI fix path (was magnitude-only)', () => {
  it('acceptFixedHtmlDetailed computes the order check and returns readingOrderWarn (non-blocking)', () => {
    const fn = dp.slice(dp.indexOf('const acceptFixedHtmlDetailed = (fixed, original, opts) => {'), dp.indexOf('const acceptFixedHtml = (fixed, original, opts) =>'));
    expect(fn).toMatch(/checkReadingOrderPreserved\(original, fixed\)/);
    expect(fn).toMatch(/readingOrderWarn: _roWarn/);
    // it must NOT flip `accepted` to false on a reorder (WARN-only this increment)
    expect(fn).not.toMatch(/accepted: false, reason: 'reading-order'/);
  });
  it('acceptFixedHtml surfaces the warn, and aiFixChunked checks the assembled doc vs the source', () => {
    expect(dp).toMatch(/if \(r && r\.accepted && r\.readingOrderWarn\)/);
    expect(dp).toMatch(/checkReadingOrderPreserved\(html, _joined\)/);   // aiFixChunked whole-doc order check
    expect(dp).toMatch(/return _restoreImages\(_joined\)/);
  });
});

describe('H-4 behavior: a block reorder that preserves char/word totals raises readingOrderWarn', () => {
  // Extract acceptFixedHtmlDetailed with injected deps + the REAL checkReadingOrderPreserved, so we exercise
  // the actual wiring: magnitude checks pass (identical totals) yet the reorder is caught and surfaced.
  const guardSrc = dp.slice(dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {'), dp.indexOf('\n}', dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {')) + 2);
  const fnSrc = dp.slice(dp.indexOf('const acceptFixedHtmlDetailed = (fixed, original, opts) => {'), dp.indexOf('\n  };', dp.indexOf('const acceptFixedHtmlDetailed = (fixed, original, opts) => {')) + 4);
  const make = () => new Function('textCharCount', 'detectFabrication', 'warnLog',
    guardSrc + '\n' + fnSrc + '\nreturn acceptFixedHtmlDetailed;'
  )((s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, '').length, () => ({ suspected: false }), () => {});
  const accept = make();
  const original = '<body><h2>Alpha section heading</h2><p>first paragraph of content here</p><h2>Beta section heading</h2><p>second paragraph of content here</p></body>';
  const reordered = '<body><h2>Beta section heading</h2><p>second paragraph of content here</p><h2>Alpha section heading</h2><p>first paragraph of content here</p></body>';

  it('accepts the reorder on magnitude (identical totals) but attaches readingOrderWarn', () => {
    const r = accept(reordered, original, {});
    expect(r.accepted).toBe(true);                 // magnitude is identical → not blocked
    expect(r.readingOrderWarn).toBeTruthy();        // …but the reorder is surfaced
    expect(typeof r.readingOrderWarn.droppedToken === 'string' || r.readingOrderWarn.droppedToken === null).toBe(true);
  });
  it('no warn when content + order are unchanged', () => {
    const r = accept(original, original, {});
    expect(r.accepted).toBe(true);
    expect(r.readingOrderWarn).toBeNull();
  });
});
