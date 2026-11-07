// (2026-11-06) FDA letter: a row label ("1.") and its cell share one text line, a pen move apart. The move is too small for
// the general "new block" rule, so both became one block and the row header cell stayed empty.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '..', process.env.ALLO_PIPELINE_SRC || 'doc_pipeline_source.jsx'), 'utf8');
const slice = (a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker missing: ' + a); return src.slice(i, j); };
const parse = new Function(slice('const _stage4_maskStrings = (s) => {', '  // _stage4_rewriteStream') + '\nreturn _stage4_parseBTSegments;')();

const OPTS = { fine: true, splitFont: true };
const count = (stream, opts = OPTS) => parse(Uint8Array.from(stream, (c) => c.charCodeAt(0)), opts).length;
const cid = (t) => '(' + Array.from(t, (c) => '\\000' + c).join('') + ')';

describe('a short label before a pen move along the line', () => {
  it('splits the real FDA row: 2-byte label, then a move of 2.54 em', () => {
    expect(count('BT 1 0 0 1 100.8 658.8 Tm /F16 12 Tf ' + cid('1.') + ' Tj 1 0 0 1 131.28 658.8 Tm ' + cid('Final Protocol Submission') + ' Tj ET')).toBe(2);
  });
  it('splits a 1-byte label the same way, by Tm, by Td, and as hex', () => {
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf (1.) Tj 1 0 0 1 131 700 Tm (Final) Tj ET')).toBe(2);
    expect(count('BT 100 700 Td /F1 12 Tf (1.) Tj 31 0 Td (Final) Tj ET')).toBe(2);
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf <00310032> Tj 1 0 0 1 131 700 Tm (Final) Tj ET')).toBe(2);
  });
  it('scales the move with the text matrix', () => {
    expect(count('BT 12 0 0 12 100 700 Tm /F1 1 Tf (1.) Tj 12 0 0 12 131 700 Tm (Final) Tj ET')).toBe(2);
    expect(count('BT 12 0 0 12 100 700 Tm /F1 1 Tf (1.) Tj 12 0 0 12 125 700 Tm (Final) Tj ET')).toBe(1);
  });
  it('keeps a short word and the next word together, even the widest short words', () => {
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf (of) Tj 1 0 0 1 113 700 Tm (the) Tj ET')).toBe(1);
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf (WWW) Tj 1 0 0 1 135 700 Tm (site) Tj ET')).toBe(1);
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf ' + cid('WW') + ' Tj 1 0 0 1 126 700 Tm (site) Tj ET')).toBe(1);
  });
  it('keeps glyph-by-glyph text in one block', () => {
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf (a) Tj 1 0 0 1 106 700 Tm (b) Tj 1 0 0 1 112 700 Tm (c) Tj 1 0 0 1 118 700 Tm (d) Tj ET')).toBe(1);
  });
  it('does not treat a longer string as a label', () => {
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf (Item) Tj 1 0 0 1 131 700 Tm (Final) Tj ET')).toBe(1);
  });
  it('counts all the shows since the pen last moved, not only the last', () => {
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf (ab) Tj (cd) Tj 1 0 0 1 135 700 Tm (Final) Tj ET')).toBe(1);
  });
  it('stays off without splitFont (right-to-left documents)', () => {
    expect(count('BT 1 0 0 1 100 700 Tm /F1 12 Tf (1.) Tj 1 0 0 1 131 700 Tm (Final) Tj ET', { fine: true })).toBe(1);
  });
  it('splits the operand and operator together, so BDC never lands between them', () => {
    const s = 'BT 1 0 0 1 100 700 Tm /F1 12 Tf (1.) Tj 1 0 0 1 131 700 Tm (Final) Tj ET';
    const segs = parse(Uint8Array.from(s, (c) => c.charCodeAt(0)), OPTS);
    expect(segs.map((g) => s.slice(g.btStart, g.etEnd))).toEqual(['(1.) Tj', '(Final) Tj']);
  });
});
