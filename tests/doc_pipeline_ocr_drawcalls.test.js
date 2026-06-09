// Unit tests for _ocrWordsToDrawCalls — the pure mapper from Tesseract word boxes (PDF points,
// top-left origin) to invisible-text draw calls (PDF user space, bottom-left origin). It now also
// carries the box WIDTH (w) so the tagger can horizontally scale each invisible word to span the
// OCR box (Ctrl+F highlight alignment). Pins size-from-height, baseline placement, the new width,
// and the skip/clamp guards. Anti-drift: extracts the real arrow from source at runtime.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
function extractArrow(name) {
  const anchor = 'const ' + name + ' = ';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('not found in source: ' + name);
  const braceStart = SRC.indexOf('{', SRC.indexOf('=>', at));
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  const head = SRC.slice(at + anchor.length, SRC.indexOf('=>', at));
  // eslint-disable-next-line no-eval
  return eval('(' + head + '=> ' + SRC.slice(braceStart, end + 1) + ')');
}
const toDrawCalls = extractArrow('_ocrWordsToDrawCalls');

describe('_ocrWordsToDrawCalls', () => {
  it('maps a word: size from box height, baseline at box bottom, x from x0, w from box width', () => {
    const calls = toDrawCalls([{ t: 'hi', x0: 10, x1: 50, y0: 20, y1: 40 }], 100, { sizeFactor: 0.92 });
    expect(calls.length).toBe(1);
    const c = calls[0];
    expect(c.text).toBe('hi');
    expect(c.x).toBe(10);
    expect(c.y).toBe(60);              // pageH(100) - y1(40)
    expect(c.size).toBeCloseTo(18.4, 5); // (40-20)*0.92
    expect(c.w).toBe(40);              // x1(50) - x0(10)  <-- the new horizontal-scale input
  });

  it('clamps size to the minimum for a tiny box', () => {
    const c = toDrawCalls([{ t: 'x', x0: 0, x1: 3, y0: 0, y1: 1 }], 100, { minSize: 4 })[0];
    expect(c.size).toBe(4);
    expect(c.w).toBe(3);
  });

  it('skips empty / non-string / whitespace-only words', () => {
    const calls = toDrawCalls([
      { t: '   ', x0: 0, x1: 10, y0: 0, y1: 10 },
      { t: '', x0: 0, x1: 10, y0: 0, y1: 10 },
      { x0: 0, x1: 10, y0: 0, y1: 10 },
      { t: 'ok', x0: 0, x1: 10, y0: 0, y1: 10 },
    ], 100);
    expect(calls.length).toBe(1);
    expect(calls[0].text).toBe('ok');
  });

  it('w is 0 (not NaN) for a degenerate zero-width box — the scaling caller treats 0 as "no scale"', () => {
    const c = toDrawCalls([{ t: 'word', x0: 10, x1: 10, y0: 0, y1: 10 }], 100)[0];
    expect(c.w).toBe(0);
    expect(c.x).toBe(10);
  });

  it('skips a word missing x-coordinates (can\'t be placed — isFinite guard)', () => {
    expect(toDrawCalls([{ t: 'word', y0: 0, y1: 10 }], 100)).toEqual([]);
  });

  it('returns [] for bad input', () => {
    expect(toDrawCalls(null, 100)).toEqual([]);
    expect(toDrawCalls([{ t: 'x', x0: 0, x1: 5, y0: 0, y1: 5 }], 'notnum')).toEqual([]);
  });
});
