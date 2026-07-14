// Coverage #1 (2026-07-03): 2-page scan OCR-reconcile duplication. For a <=2-page range the single-pass
// Vision extract returns ONE pseudo-page covering the whole range (pageNum=_rangeStart); Tesseract OCRs
// per physical page. reconcileOcrPages unions by absolute pageNum, so the Vision blob (all pages, longer →
// wins page 1) is emitted PLUS each Tesseract-only page, and a naive fullText join DUPLICATES every page
// after the first. That inflated the integrity denominator ~1.5x → a false "content may be missing" error +
// false numeric-fidelity alarm on every page-2 score, on a perfectly-remediated 2-page psych-eval scan.
// Fix: when Vision collapsed to one page AND its blob won a page, fullText is that blob once. Source-pin +
// a faithful mirror of the dedupe decision (reconcileOcrPages is factory-internal).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Faithful mirror of the fullText dedupe decision at the end of reconcileOcrPages.
const dedupFullText = (visionPages, tessPages, merged) => {
  if ((visionPages || []).length === 1 && (tessPages || []).length > 1 && merged.some((p) => p.source === 'vision')) {
    return (visionPages[0] && visionPages[0].text) || merged.map((p) => p.text).filter(Boolean).join('\n\n');
  }
  return merged.map((p) => p.text).filter(Boolean).join('\n\n');
};

describe('#1 — 2-page scan pseudo-page dedupe', () => {
  it('source pins the pseudo-page fullText dedupe', () => {
    expect(src).toContain("(visionPages || []).length === 1 && (tessPages || []).length > 1 && merged.some(p => p.source === 'vision')");
  });

  it('mirror: the pseudo-page case emits page 2 ONCE, not twice', () => {
    // Vision blob = both pages (longer → wins page 1); Tesseract = per page; page 2 has no Vision rival.
    const visionPages = [{ pageNum: 1, text: 'PAGE ONE CONTENT. PAGE TWO CONTENT.' }];
    const tessPages = [{ pageNum: 1, text: 'PAGE ONE CONTENT.' }, { pageNum: 2, text: 'PAGE TWO CONTENT.' }];
    const merged = [
      { pageNum: 1, source: 'vision', text: 'PAGE ONE CONTENT. PAGE TWO CONTENT.' },
      { pageNum: 2, source: 'tesseract', text: 'PAGE TWO CONTENT.' },
    ];
    const ft = dedupFullText(visionPages, tessPages, merged);
    expect(ft).toBe('PAGE ONE CONTENT. PAGE TWO CONTENT.');
    expect((ft.match(/PAGE TWO CONTENT/g) || []).length).toBe(1); // not duplicated
  });

  it('mirror: page-2 numbers appear once (no false numeric-fidelity loss)', () => {
    const visionPages = [{ pageNum: 1, text: 'VCI 105 WMI 98' }];
    const tessPages = [{ pageNum: 1, text: 'VCI 105' }, { pageNum: 2, text: 'WMI 98' }];
    const merged = [
      { pageNum: 1, source: 'vision', text: 'VCI 105 WMI 98' },
      { pageNum: 2, source: 'tesseract', text: 'WMI 98' },
    ];
    const ft = dedupFullText(visionPages, tessPages, merged);
    expect((ft.match(/98/g) || []).length).toBe(1); // score 98 present once, not doubled
  });

  it('mirror: a genuine multi-page (Vision per-page) run is NOT deduped', () => {
    const visionPages = [{ pageNum: 1, text: 'A' }, { pageNum: 2, text: 'B' }];
    const tessPages = [{ pageNum: 1, text: 'A' }, { pageNum: 2, text: 'B' }];
    const merged = [{ pageNum: 1, source: 'vision', text: 'A' }, { pageNum: 2, source: 'vision', text: 'B' }];
    expect(dedupFullText(visionPages, tessPages, merged)).toBe('A\n\nB');
  });

  it('mirror: when the Vision blob LOST (all-Tesseract), normal join (no dup)', () => {
    const visionPages = [{ pageNum: 1, text: 'short' }];
    const tessPages = [{ pageNum: 1, text: 'PAGE ONE LONG' }, { pageNum: 2, text: 'PAGE TWO' }];
    const merged = [{ pageNum: 1, source: 'tesseract', text: 'PAGE ONE LONG' }, { pageNum: 2, source: 'tesseract', text: 'PAGE TWO' }];
    expect(dedupFullText(visionPages, tessPages, merged)).toBe('PAGE ONE LONG\n\nPAGE TWO');
  });
});
