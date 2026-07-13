// #H (2026-07-07): scanned-PDF searchable-layer POSITIONING regression. The per-leaf MCID draw path
// became the default for scanned PDFs on 2026-07-01 (@f0615fa8) but drew every OCR word top-down at a
// fixed x=36 via _alloOcrBlockLayout — so the invisible searchable layer stopped aligning with the scanned
// image (Ctrl+F highlight / drag-select drifted), regressing the per-word positioned layer that shipped
// 2026-06-07. The fix draws each RAW OCR word at its real (x,y) box position INSIDE its run's BDC/EMC when
// word boxes are present, distributing the page's boxes across the runs in reading order. The tag structure
// (one BDC per run, one MCID, content present) is byte-identical — only glyph coordinates change, which
// PAC/veraPDF do not check — so the validated per-leaf MCID structure stands.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── extract the pure _distributeCallsToRuns (brace-balanced; no closure deps) ──
function extractConst(name) {
  const anchor = 'const ' + name + ' = ';
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error('extraction failed: ' + name);
  const arrowAt = src.indexOf('=>', at);
  let i = src.indexOf('{', arrowAt), depth = 0, end = -1;
  for (; i < src.length; i++) { const c = src[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i; break; } } }
  const head = src.slice(at + anchor.length, arrowAt);
  // eslint-disable-next-line no-eval
  return eval('(' + head + '=> ' + src.slice(src.indexOf('{', arrowAt), end + 1) + ')');
}
const _distributeCallsToRuns = extractConst('_distributeCallsToRuns');

const runsOf = (...texts) => texts.map((t, i) => ({ text: t, role: 'P', mcid: i }));
const callsOf = (n) => Array.from({ length: n }, (_, i) => ({ text: 'w' + i, x: i * 10, y: 100, size: 8, w: 8 }));

describe('_distributeCallsToRuns — positioned words mapped onto per-leaf runs in reading order', () => {
  it('gives each run its own word count, in order', () => {
    const d = _distributeCallsToRuns(runsOf('two words', 'three more words'), callsOf(5));
    expect(d.map((g) => g.calls.length)).toEqual([2, 3]);
    expect(d[0].calls.map((c) => c.text)).toEqual(['w0', 'w1']);
    expect(d[1].calls.map((c) => c.text)).toEqual(['w2', 'w3', 'w4']);
  });
  it('flags large count divergence so the caller uses semantic block layout', () => {
    const d = _distributeCallsToRuns(runsOf('one', 'two'), callsOf(10));
    expect(d.map((g) => g.calls.length)).toEqual([0, 0]);
    expect(d.mismatch).toEqual({ leafWords: 2, boxes: 10 });
  });
  it('every run gets an entry (even empty) so its BDC/EMC is still emitted and the MCR stays backed', () => {
    const d = _distributeCallsToRuns(runsOf('alpha beta', 'delta', 'epsilon'), callsOf(4));
    expect(d.length).toBe(3);
    // all runs retain entries so every semantic leaf keeps a BDC/EMC and backed MCR
    expect(d.map((g) => g.calls.length)).toEqual([2, 1, 1]);
    expect(d.every((g) => g.run)).toBe(true);
  });
  it('degenerate inputs never throw', () => {
    expect(_distributeCallsToRuns([], callsOf(3))).toEqual([]);
    const empty = _distributeCallsToRuns(runsOf('x'), []);
    expect([...empty]).toEqual([{ run: { text: 'x', role: 'P', mcid: 0 }, calls: [] }]);
    expect(empty.mismatch).toEqual({ leafWords: 1, boxes: 0 });
    expect(_distributeCallsToRuns(null, null)).toEqual([]);
  });
});

describe('#H: per-leaf positioned draw wiring — source pins', () => {
  it('the per-leaf path draws POSITIONED words (real x/y) inside each run BDC/EMC when boxes exist', () => {
    expect(src).toContain('const _dist = _distributeCallsToRuns(_runs, _posCalls);');
    // H1 (2026-07-09): words are pre-folded into _grps before any operator is committed
    expect(src).toContain('try { _drawPositionedRunWord(_w.txt, _c); _pageDrewAny = true; }');
    expect(src).toContain('_PLx.setTextMatrix(a * cs, a * sn, -sn, cs, _c.x, _c.y)');
    // still one BDC(role, mcid) + EMC per run — the validated tag structure is unchanged
    expect(src).toContain("[PDFName.of(g.run.role || 'P'), context.obj({ MCID: PDFNumber.of(g.run.mcid) })]");
  });
  it('is fail-safe: gated on _perWord, and any failure / no-boxes falls back to the block layout', () => {
    expect(src).toContain('let _posDrew = false;');
    expect(src).toContain('if (_perWord) {');
    // H1 (2026-07-09): drawability is decided BEFORE emission (_anyDrawable); once BDC/EMC are
    // committed the catch KEEPS them — the old `_posDrew = false` reset made the block fallback
    // re-emit the SAME MCIDs (the §14.7.4 multi-claim this per-leaf path exists to retire).
    expect(src).toContain('const _anyDrawable = _grps.some((g) => g.words.some((w) => w.txt.trim()));');
    expect(src).not.toContain('} catch (_posErr) { _posDrew = false;');
    expect(src).toContain('if (!_posDrew) {');
    // the block-layout fallback still uses _alloOcrBlockLayout top-down (unchanged behavior)
    expect(src).toContain("const _layout = _alloOcrBlockLayout(_runs.map(r => r.text || ' ').join('\\n')");
  });
  it('uses exact viewport transforms or scaled page frames instead of strict same-size geometry', () => {
    expect(src).toContain('viewportTransform: (Array.isArray(_tp.viewportTransform) ? _tp.viewportTransform : null)');
    expect(src).toContain("pdf.js getDocument (OCR geometry)");
    expect(src).toContain('const _wordDrawOpts = _ocrViewportTransform');
    expect(src).toContain('best.dimScore <= 0.35 && best.aspectScore <= 0.20');
    expect(src).not.toContain('Math.abs(sz.height - ocrEntry.pageH) <= 2 && Math.abs(sz.width - ocrEntry.pageW) <= 2');
  });
});
