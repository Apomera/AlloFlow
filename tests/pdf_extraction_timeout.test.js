// Anti-hang for pdf.js extraction/OCR (2026-06-16). getDocument / getOperatorList / page.render
// can STALL (never settle) on malformed, scanned, or image-heavy PDFs. Un-timeboxed, that await
// hangs the entire "Make Accessible" run with no error toast and the spinner forever — the second
// hang surface the regression hunt found (the first being the un-timeboxed AI fetch). Each await is
// now wrapped in _withTimeout, whose rejection lands in the surrounding graceful catch (text-only
// fallback / skip-page-and-continue), so the pipeline degrades instead of hanging.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('pdf.js extraction/OCR awaits are timeboxed (anti-hang)', () => {
  it('the image-extraction loop awaits are wrapped in _withTimeout', () => {
    expect(src).toContain("await _withTimeout(window.pdfjsLib.getDocument({ data: pdfBytes }).promise, 60000, 'pdf.js getDocument (image extract)')");
    expect(src).toContain("await _withTimeout(page.getOperatorList(), 30000, 'getOperatorList p' + pg)");
    // (2026-06-19) the image-extraction render now renders at 1.5x then retries at 1x — each attempt
    // is still _withTimeout-wrapped (30s / 20s), so a stalled page is recovered at a lower scale
    // instead of losing its images after the timeout (mirrors the OCR render retry below).
    expect(src).toContain("await _withTimeout(page.render({ canvasContext: _c.getContext('2d'), viewport: _vp }).promise, _sc >= 1.5 ? 30000 : 20000,");
  });

  it('the Tesseract OCR render path awaits are wrapped in _withTimeout (with a bounded lower-scale retry)', () => {
    expect(src).toContain("await _withTimeout(window.pdfjsLib.getDocument({ data: bytes }).promise, 60000, 'pdf.js getDocument (OCR)')");
    // #4 (2026-06-17): the OCR render now tries 2x then retries at 1.25x — EACH attempt is still
    // _withTimeout-wrapped (75s / 40s), so a slow/hung page is recovered at a smaller scale instead of
    // silently blanked, and the await is never unbounded (the original hang fix still holds).
    expect(src).toContain("await _withTimeout(page.render({ canvasContext: _c.getContext('2d'), viewport: _vp }).promise, _sc >= 2 ? 75000 : 40000,");
  });

  it('the mixed-page OCR render path awaits are wrapped in _withTimeout', () => {
    expect(src).toContain("await _withTimeout(window.pdfjsLib.getDocument({ data: bytes }).promise, 60000, 'pdf.js getDocument (mixed-page OCR)')");
    expect(src).toContain("await _withTimeout(page.render({ canvasContext: cctx, viewport }).promise, 45000,");
  });

  it('the PRIMARY digital-text extraction (extractPdfTextDeterministic) awaits are wrapped', () => {
    // hot path: awaited before any AI call; a wedged pdf.js worker here hangs the whole run
    expect(src).toContain("await _withTimeout(window.pdfjsLib.getDocument({ data: bytes }).promise, 60000, 'pdf.js getDocument (text layer)')");
    expect(src).toContain("await _withTimeout(pdf.getPage(p), 30000, 'getPage (text layer) p' + p)");
    expect(src).toContain("await _withTimeout(page.getTextContent(), 30000, 'getTextContent (text layer) p' + p)");
  });

  it('the tagged-PDF reassembly stage (createTaggedPdf + _stage4_extractPdfjsItems) awaits are wrapped', () => {
    // runs AFTER chunk-fixing; a hang here = "never reassembles/rescores"
    expect(src).toContain("await _withTimeout(window.pdfjsLib.getDocument({ data: _srcBytes.slice() }).promise, 60000, 'pdf.js getDocument (tagging)')");
    expect(src).toContain("await _withTimeout(pdfjsDoc.getPage(pageIdx + 1), 30000,");
    expect(src).toContain("await _withTimeout(page.getTextContent(), 30000, 'getTextContent (tagging) p'");
  });

  it('the Imagen image-regen fallback (raw fetch, no inner bound) is timeboxed at its call site', () => {
    expect(src).toContain("await _withTimeout(callImagen(");
  });

  it('the Unicode-font fetch in createTaggedPdf is AbortController-bounded (non-Latin scanned-doc hang)', () => {
    // A raw fetch(_fontUrl) to the Noto CDN could hang ALL tagged-PDF generation for an Arabic/
    // Pashto/CJK scanned doc. Now AbortController-bounded (cancels the connection, not just abandons
    // it) so a hung CDN degrades that script's layer to Helvetica instead of hanging.
    expect(src).toContain('await fetch(_fontUrl, { signal: _fc.signal })');
    expect(src).toContain('setTimeout(() => { try { _fc.abort(); } catch (_) {} }, 25000)');
    expect(src).not.toContain('const resp = await fetch(_fontUrl);'); // the raw form must be gone
  });

  it('no RAW (un-timeboxed) form of the wrapped extraction awaits survives', () => {
    // these exact raw awaits were the hang — they must no longer appear bare
    expect(src).not.toContain('await window.pdfjsLib.getDocument({ data: pdfBytes }).promise;');
    expect(src).not.toContain('await page.getOperatorList();');
    expect(src).not.toContain('await page.render({ canvasContext: ctx2d, viewport }).promise;');
    expect(src).not.toContain('await page.render({ canvasContext: ctx, viewport }).promise;');
    expect(src).not.toContain('await page.render({ canvasContext: cctx, viewport }).promise;');
  });
});
