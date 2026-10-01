// crop-sparse-chart (2026-06-15): _cropIsNearUniform rejected a crop as a "solid
// fill" (degrading a real figure to a text placeholder) using a single 0.92 near-mean
// gate, even on the GEOMETRY-CONFIRMED XObject path where a sparse line-chart/diagram
// (mostly-white background + a little ink) legitimately reads as near-uniform. The fix
// factors the pixel decision into a pure _cropPixelsAreFill(data, strict): the strict
// path (blind band-crop) is byte-unchanged; the non-strict path (XObject) loosens the
// near-mean cutoff to 0.985 and adds a distinct-quantized-color escape so a real chart
// survives — while a true solid fill is STILL rejected (the "all blue" bug stays fixed).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const _cropPixelsAreFill = (data, strict) => {');
const end = src.indexOf('const _cropIsNearUniform = (srcCanvas, strict) => {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _cropPixelsAreFill missing');
const _cropPixelsAreFill = new Function(src.slice(start, end) + '\n; return _cropPixelsAreFill;')();

// build a flat RGBA buffer from [count, [r,g,b,a]] segments
const buf = (...segs) => {
  const out = [];
  for (const [n, [r, g, b, a]] of segs) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return out;
};
const W = [255, 255, 255, 255], K = [0, 0, 0, 255], CLEAR = [0, 0, 0, 0];

describe('_cropPixelsAreFill — strict (band-crop) vs non-strict (XObject)', () => {
  it('a true SOLID fill is rejected on BOTH paths (the all-blue bug stays fixed)', () => {
    const blue = buf([100, [30, 60, 200, 255]]);
    expect(_cropPixelsAreFill(blue, true)).toBe(true);   // strict: reject
    expect(_cropPixelsAreFill(blue, false)).toBe(true);  // non-strict: still reject
  });

  it('a sparse mostly-white chart (97% bg + 3% ink) is rejected by strict but KEPT by non-strict (the fix)', () => {
    const chart = buf([97, W], [3, K]); // near/count ~0.97 → in the 0.92..0.985 gap
    expect(_cropPixelsAreFill(chart, true)).toBe(true);   // strict: still rejects (unchanged)
    expect(_cropPixelsAreFill(chart, false)).toBe(false); // non-strict: accepted — real figure survives
  });

  it('a multi-series chart (>=4 distinct colors) is kept by non-strict via the distinct-color escape', () => {
    const multi = buf([40, W], [15, [230, 30, 30, 255]], [15, [30, 200, 30, 255]], [15, [30, 30, 220, 255]], [15, [240, 150, 20, 255]]);
    expect(_cropPixelsAreFill(multi, false)).toBe(false); // >=4 buckets each >2% → not a fill
  });

  it('a mostly-transparent crop is rejected on both paths', () => {
    const clear = buf([95, CLEAR], [5, W]);
    expect(_cropPixelsAreFill(clear, true)).toBe(true);
    expect(_cropPixelsAreFill(clear, false)).toBe(true);
  });

  it('an empty buffer is treated as fill (reject) — no crash', () => {
    expect(_cropPixelsAreFill([], true)).toBe(true);
    expect(_cropPixelsAreFill([], false)).toBe(true);
  });
});

describe('crop-sparse-chart wiring (anti-drift)', () => {
  it('the XObject call opts out of strict; the blind band-crop keeps strict', () => {
    expect(src).toContain('_cropIsNearUniform(crop, false)'); // geometry-confirmed XObject path
    expect(src).toContain('return _cropPixelsAreFill(data, strict !== false);');
  });
});
