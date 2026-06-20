// Force re-OCR escape hatch (2026-06-20). When the extracted text looks wrong — a garbled
// embedded text layer (broken font encodings) or low-confidence OCR — "Re-scan with OCR" sets
// window.__alloForceOcr to 'all' (re-OCR the whole doc, ignoring text layer + resume cache) or
// {pages:[...]} (re-OCR just those, splicing over the page text). This pins the flag parse, the
// text-layer-acceptance + seed-reuse overrides, the per-page splice, and (anti-drift) the wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the Step-1 flag read (kept in sync via anti-drift) ──
const parseForceFlag = (fo) => {
  let forceFullOcr = false, forceOcrPages = null;
  if (fo === 'all') forceFullOcr = true;
  else if (fo && Array.isArray(fo.pages) && fo.pages.length) forceOcrPages = fo.pages.slice();
  return { forceFullOcr, forceOcrPages };
};
// ── Mirror of the text-layer acceptance gate ──
const acceptsTextLayer = (det, forceFullOcr) =>
  !!(det && !det.isScanned && !forceFullOcr && (det.method === 'transcript' || det.sourceCharCount > 100));
// ── Mirror of the resume-seed reuse gate (force overrides) ──
const reusesSeed = (extracted, seed, fileName, forceFullOcr) =>
  (!extracted || extracted.length <= 100) && !forceFullOcr && !!seed
  && seed.fileName === fileName && typeof seed.text === 'string' && seed.text.trim().length >= 50;
// ── Mirror of the per-page re-OCR splice ──
const spliceReOcr = (pageMap, reOcr) => {
  const pm = pageMap.map((pg) => ({ ...pg }));
  pm.forEach((pg) => { if (pg && reOcr[pg.pageNum]) pg.text = reOcr[pg.pageNum]; });
  return pm.slice().sort((a, b) => a.pageNum - b.pageNum).map((pg) => pg.text).filter(Boolean).join('\n\n');
};

describe('force-OCR flag parse', () => {
  it("'all' → full re-OCR, no page list", () => {
    expect(parseForceFlag('all')).toEqual({ forceFullOcr: true, forceOcrPages: null });
  });
  it('{pages:[...]} → per-page re-OCR', () => {
    expect(parseForceFlag({ pages: [5, 12] })).toEqual({ forceFullOcr: false, forceOcrPages: [5, 12] });
  });
  it('empty page list → no-op (neither mode)', () => {
    expect(parseForceFlag({ pages: [] })).toEqual({ forceFullOcr: false, forceOcrPages: null });
  });
  it('null/absent → no-op', () => {
    expect(parseForceFlag(null)).toEqual({ forceFullOcr: false, forceOcrPages: null });
  });
});

describe('text-layer acceptance — full re-OCR rejects it (broken-encoding recovery)', () => {
  const born = { isScanned: false, method: 'pdfjs', sourceCharCount: 5000 };
  it('born-digital is accepted normally (no force)', () => {
    expect(acceptsTextLayer(born, false)).toBe(true);
  });
  it('force "all" REJECTS the text layer → falls through to the OCR path', () => {
    expect(acceptsTextLayer(born, true)).toBe(false);
  });
  it('a truly scanned doc is never accepted as text-layer regardless', () => {
    expect(acceptsTextLayer({ isScanned: true, sourceCharCount: 5 }, false)).toBe(false);
  });
});

describe('resume-seed reuse — full re-OCR overrides the cache', () => {
  const seed = { fileName: 'doc.pdf', text: 'X'.repeat(300) };
  it('reuses cached text on a scanned/empty extraction (no force)', () => {
    expect(reusesSeed('', seed, 'doc.pdf', false)).toBe(true);
  });
  it('force "all" skips the cache → re-OCRs fresh', () => {
    expect(reusesSeed('', seed, 'doc.pdf', true)).toBe(false);
  });
});

describe('per-page re-OCR splice — replace only the targeted pages', () => {
  const pageMap = [
    { pageNum: 1, text: 'clean page one' },
    { pageNum: 2, text: 'g@rbl3d brok3n t3xt l@yer' },
    { pageNum: 3, text: 'clean page three' },
  ];
  it('splices the re-OCR result over only the bad page, keeps the good ones in order', () => {
    expect(spliceReOcr(pageMap, { 2: 'page two recovered by OCR' }))
      .toBe('clean page one\n\npage two recovered by OCR\n\nclean page three');
  });
  it('no re-OCR results → text unchanged', () => {
    expect(spliceReOcr(pageMap, {})).toBe('clean page one\n\ng@rbl3d brok3n t3xt l@yer\n\nclean page three');
  });
});

describe('anti-drift: force-OCR is wired end-to-end', () => {
  it('pipeline reads + parses window.__alloForceOcr and consumes it', () => {
    expect(pipeSrc).toMatch(/window\.__alloForceOcr/);
    expect(pipeSrc).toMatch(/if \(_fo === 'all'\) _forceFullOcr = true/);
    expect(pipeSrc).toMatch(/Array\.isArray\(_fo\.pages\) && _fo\.pages\.length\) _forceOcrPages/);
  });
  it('full re-OCR gates the text-layer acceptance', () => {
    expect(pipeSrc).toMatch(/!det\.isScanned && !_forceFullOcr/);
  });
  it('per-page re-OCR uses _ocrSpecificPages on the requested pages + tags the method', () => {
    expect(pipeSrc).toMatch(/_ocrSpecificPages\(_base64, _forceOcrPages/);
    expect(pipeSrc).toMatch(/\+reocr/);
  });
  it('the view sets the flag from both buttons + surfaces low-confidence pages', () => {
    expect(viewSrc).toMatch(/window\.__alloForceOcr = force/);
    expect(viewSrc).toMatch(/_reRun\('all'\)/);
    expect(viewSrc).toMatch(/_reRun\(\{ pages: _lowPages \}\)/);
    expect(viewSrc).toMatch(/window\.__lastOcrLowConfidencePages/);
  });
});
