// OCR page-skip (#4, 2026-06-17). Two fixes for scanned PDFs where "some pages aren't highlightable":
//  (A) Render regression: the 45s _withTimeout on the OCR page render (added in the hang fix) silently
//      BLANKED a slow/large page → no positioned text layer. Now the render tries 2x then retries once
//      at 1.25x — each attempt still bounded (no unbounded await), so a slow/hung page is recovered at
//      a smaller scale instead of dropped. The word boxes + page dims are normalized by the ACTUAL
//      render scale used (not a hard-coded 2.0), so the layer stays correctly positioned.
//  (B) Persistence: the OCR ground-truth page map lived only on the transient window.__lastGroundTruth-
//      PageMap (reset each fix run, overwritten by the next doc). It's now persisted onto the result as
//      groundTruthPages, so a tagged PDF generated LATER (Compare's Verify-tagged, a re-download, a
//      project restore) reuses it instead of producing a PDF with no highlightable text layer.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('#4A — OCR render recovers a slow/hung page via a bounded lower-scale retry', () => {
  it('tries 2x then 1.25x then 1x, every attempt _withTimeout-wrapped (still bounded — hang fix intact)', () => {
    // 2026-06-19: ladder gained a final 1x rung with a generous budget so a heavy scanned page reliably
    // renders (→ Tesseract word boxes → POSITIONED searchable text) instead of dropping to a top-block.
    expect(src).toContain('const _renderScales = _renderFailureStreak > 0 ? [1.0] : [2.0, 1.25, 1.0];');
    expect(src).toContain('for (const _sc of _renderScales) {');
    expect(src).toContain("_renderTask = page.render({ canvasContext: _c.getContext('2d'), viewport: _vp });");
    expect(src).toContain("await _withTimeout(_renderTask.promise, _sc >= 2 ? 45000 : (_sc >= 1.25 ? 35000 : 55000),");
    // higher scales retry to a lower scale; the final 1x rung rethrows into the per-page catch (recorded, not silent)
    expect(src).toContain('else throw _rErr;');
  });

  it('normalizes word boxes + page dims by the ACTUAL render scale (not a hard-coded 2.0)', () => {
    expect(src).toContain('const words = _collectOcrWords(data, renderScale);');
    expect(src).toContain('pageW: canvas.width / renderScale, pageH: canvas.height / renderScale');
    // the old hard-coded-2.0 OCR normalization must be gone (the image-extraction path is separate)
    expect(src).not.toContain('const words = _collectOcrWords(data, 2.0)');
    expect(src).not.toContain('pageW: viewport.width / 2.0, pageH: viewport.height / 2.0');
  });

  it('a render failure is still RECORDED per page (never a silent total loss)', () => {
    expect(src).toContain("pages.push({ pageNum: p, text: '', words: null, error: _pmsg });");
    expect(src).toContain('pageErrors.push({ pageNum: p, error: _pmsg });');
  });

  it('cancels timed-out render work and opens a Vision-backed circuit after two failed pages', () => {
    expect(src).toContain("typeof _renderTask.cancel === 'function'");
    expect(src).toContain('_renderFailureStreak >= 2');
    expect(src).toContain("phase: 'vision-fallback'");
  });
});

describe('#4B — the OCR ground-truth page map is persisted onto the result', () => {
  it('groundTruthPages is stored on the result (survives the transient window global being reset)', () => {
    expect(src).toContain('groundTruthPages: (typeof window !== \'undefined\' && Array.isArray(window.__lastGroundTruthPageMap)) ? window.__lastGroundTruthPageMap : null,');
  });

  it('createTaggedPdf already prefers the persisted map over the global (so persistence takes effect)', () => {
    // the read site (multi-line) prefers fixResult.groundTruthPages, falling back to the window global
    expect(src).toContain('? ((fixResult && fixResult.groundTruthPages)');
    const i = src.indexOf('? ((fixResult && fixResult.groundTruthPages)');
    expect(src.slice(i, i + 200)).toContain('window.__lastGroundTruthPageMap');
  });
});
