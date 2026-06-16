// OCR page reconciliation aligns by ABSOLUTE pageNum, not array index (audit #20, 2026-06-15).
// Tesseract OCRs the WHOLE doc (pageNum 1..N); Vision covers only the selected range and used to
// number its pseudo-pages range-relative (1..k). Index-pairing then reconciled e.g. a page-1
// Tesseract transcript against a page-6 Vision transcript on any partial range — scrambling content.
// Fix: Vision pages now carry absolute pageNum, Tesseract is narrowed to the range at the call site,
// and reconcileOcrPages pairs by pageNum.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const reconcileOcrPages = (tessPages, visionPages) => {');
const end = src.indexOf('const ensureMammothLoaded', start);
if (start === -1 || end === -1) throw new Error('extraction markers for reconcileOcrPages missing');
const { reconcileOcrPages } = new Function(src.slice(start, end) + '\n; return { reconcileOcrPages };')();

describe('reconcileOcrPages pairs by absolute pageNum', () => {
  it('reconciles page 6 with page 6 — not tess-page-1 vs vision-page-6 (the #20 bug)', () => {
    const tess = [{ pageNum: 1, text: 'page one tesseract text here' }, { pageNum: 6, text: 'six' }];
    const vision = [{ pageNum: 6, text: 'page six vision much longer transcript' }];
    const rec = reconcileOcrPages(tess, vision);
    const p6 = rec.pages.find((p) => p.pageNum === 6);
    expect(p6.text).toBe('page six vision much longer transcript'); // vision (longer) won ON PAGE 6
    const p1 = rec.pages.find((p) => p.pageNum === 1);
    expect(p1.text).toBe('page one tesseract text here'); // page 1 (tess-only) intact, not clobbered by page 6
  });

  it('whole-doc (1..N) reconciles in order, longer text wins per page', () => {
    const tess = [{ pageNum: 1, text: 'aaa' }, { pageNum: 2, text: 'longer tess page two' }];
    const vision = [{ pageNum: 1, text: 'vision page one is longer' }, { pageNum: 2, text: 'bb' }];
    const rec = reconcileOcrPages(tess, vision);
    expect(rec.pages.map((p) => p.pageNum)).toEqual([1, 2]);
    expect(rec.pages[0].text).toBe('vision page one is longer');
    expect(rec.pages[1].text).toBe('longer tess page two');
  });

  it('disagreements carry the absolute pageNum', () => {
    const tess = [{ pageNum: 6, text: 'short' }];
    const vision = [{ pageNum: 6, text: 'a substantially longer vision transcript that disagrees a lot in length here' }];
    const rec = reconcileOcrPages(tess, vision);
    expect(rec.disagreements[0].pageNum).toBe(6);
  });

  it('carries the matched page\'s Tesseract word boxes + dims (for the searchable layer)', () => {
    const tess = [{ pageNum: 3, text: 'x', words: [{ t: 'x', c: 90 }], pageW: 600, pageH: 800 }];
    const vision = [{ pageNum: 3, text: 'x longer vision' }];
    const p3 = reconcileOcrPages(tess, vision).pages.find((p) => p.pageNum === 3);
    expect(p3.words).toEqual([{ t: 'x', c: 90 }]);
    expect(p3.pageW).toBe(600);
  });

  it('a page only one engine produced is kept (no false disagreement)', () => {
    const rec = reconcileOcrPages([{ pageNum: 9, text: 'only tesseract here' }], []);
    expect(rec.pages.find((p) => p.pageNum === 9).text).toBe('only tesseract here');
    expect(rec.disagreements).toEqual([]);
  });
});

describe('anti-drift: absolute Vision pageNum + range-narrowed Tesseract at the call site', () => {
  it('Vision numbers pages absolutely and Tesseract is sliced to the range', () => {
    expect(src).toContain('pagesOut.push({ pageNum: _rangeStart + startPage + q,');
    expect(src).toContain('_tessPagesForRec = _tessPagesForRec.filter(p => p && typeof p.pageNum === \'number\' && p.pageNum >= _rs && p.pageNum <= _re)');
    expect(src).toContain('const rec = reconcileOcrPages(_tessPagesForRec, visionResult.pages || []);');
  });
});
