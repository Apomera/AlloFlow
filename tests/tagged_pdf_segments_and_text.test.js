// Tagged-PDF text segments (2026-10-16). Stage 4 used to tag each BT…ET text object as one block
// and give it the text of ONE pdf.js item, so (measured on real school documents) a screen reader
// heard truncated replacement text and then the page text a second time. The fixes covered here:
//  - _stage4_parseBTSegments({ fine: true }) splits a text object into LINE segments, never
//    between a string operand and its operator, never across the source's own marked content,
//    and keeps glyph-by-glyph runs on one line together (right-to-left text needs that).
//  - _stage4_mergeSegmentItems joins the items pdf.js draws inside one segment into its text.
// Both run as sliced from doc_pipeline_source.jsx (they are inline in createDocPipeline).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const slice = (from, to) => {
  const s = src.indexOf(from), e = src.indexOf(to, s);
  if (s < 0 || e < 0) throw new Error('slice markers missing: ' + from);
  return src.slice(s, e);
};
const parseSrc = slice('const _stage4_maskStrings = (s) => {', '  // _stage4_rewriteStream');
const rewriteSrc = slice('const _stage4_rewriteStream = (streamBytes, segments, wraps) => {', '  // _stage4_extractPdfjsItems');
const lib = new Function(parseSrc + '\n' + rewriteSrc + '\nreturn { parse: _stage4_parseBTSegments, rewrite: _stage4_rewriteStream };')();
const mergeSrc = slice('const _STAGE4_RTL_CHAR', '  // ── Stage 6b: conservative artifact detection ──');
const merge = new Function(mergeSrc + '\nreturn _stage4_mergeSegmentItems;')();

const bytes = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const text = (u8) => Array.from(u8, (c) => String.fromCharCode(c)).join('');
const segTexts = (stream, opts) => lib.parse(bytes(stream), opts).map((g) => stream.slice(g.btStart, g.etEnd));

describe('line segments inside one text object', () => {
  const page = 'BT /F1 12 Tf 72 700 Td (June 14, 2016) Tj 5 0 Td ( ) Tj 0 -14 Td (Dear Colleagues:) Tj T* (I am writing) Tj ET';
  it('splits a multi-paragraph text object at line moves only', () => {
    expect(segTexts(page, { fine: true })).toEqual(['(June 14, 2016) Tj 5 0 Td ( ) Tj', '(Dear Colleagues:) Tj', '(I am writing) Tj']);
  });
  it('the coarse mode (no probe) is unchanged: one segment per text object', () => {
    expect(segTexts(page)).toEqual([page]);
  });
  it('never separates a whitespace-only string operand from its operator', () => {
    const out = text(lib.rewrite(bytes(page), lib.parse(bytes(page), { fine: true }), [0, 1, 2].map((i) => ({ bdc: '/P <</MCID ' + i + '>> BDC ', emc: ' EMC' }))));
    expect(out).toContain('/P <</MCID 0>> BDC (June 14, 2016) Tj 5 0 Td ( ) Tj EMC');
    expect(out).not.toMatch(/\(\s*\)\s*\/P/);
  });
  it('keeps glyph-by-glyph runs on one line together (Tm with the same y)', () => {
    const glyphs = 'BT 1 0 0 1 300 500 Tm (a) Tj 1 0 0 1 292 500 Tm (b) Tj 1 0 0 1 284 500 Tm (c) Tj 1 0 0 1 300 480 Tm (d) Tj ET';
    expect(segTexts(glyphs, { fine: true })).toEqual(['(a) Tj 1 0 0 1 292 500 Tm (b) Tj 1 0 0 1 284 500 Tm (c) Tj', '(d) Tj']);
  });
  it("' and \" start a new line segment", () => {
    expect(segTexts("BT (one) Tj (two) ' 1 2 (three) \" ET", { fine: true })).toEqual(['(one) Tj', "(two) '", '1 2 (three) "']);
  });
  it("never spans the source's own marked content", () => {
    const tagged = 'BT /P <</MCID 0>> BDC (A) Tj EMC /P <</MCID 1>> BDC (B) Tj EMC ET';
    const segs = segTexts(tagged, { fine: true });
    expect(segs).toEqual(['(A) Tj', '(B) Tj']);
  });
  it('TJ arrays with kerning stay whole', () => {
    expect(segTexts('BT [(J)-11(une)4( 14)] TJ ET', { fine: true })).toEqual(['[(J)-11(une)4( 14)] TJ']);
  });
});

describe('segment text from the items pdf.js draws inside it', () => {
  const it_ = (str, x, y, width, extra) => Object.assign({ str, x, y, width, fontScale: 12, height: 12, fontName: 'F1' }, extra || {});
  it('joins a bold run on the same line with its real spaces', () => {
    expect(merge([it_('The ', 72, 700, 24), it_('mitochondria', 96, 700, 70), it_(' is the powerhouse.', 166, 700, 100)]).str)
      .toBe('The mitochondria is the powerhouse.');
  });
  it('joins a kerned split with no space and a real gap with one', () => {
    expect(merge([it_('sab', 72, 700, 18), it_('emos', 90.2, 700, 24)]).str).toBe('sabemos');
    expect(merge([it_('two', 72, 700, 18), it_('words', 96, 700, 30)]).str).toBe('two words');
  });
  it('a new line joins with a space, or drops a word-break hyphen', () => {
    expect(merge([it_('first line', 72, 700, 50), it_('second line', 72, 686, 55)]).str).toBe('first line second line');
    expect(merge([it_('accessi-', 72, 700, 40), it_('ble', 72, 686, 15)]).str).toBe('accessible');
  });
  it('orders a right-to-left line right to left', () => {
    const r = merge([it_('עולם', 100, 700, 30), it_('שלום', 140, 700, 30)]);
    expect(r.str).toBe('שלום עולם');
  });
  it('an empty segment has empty text and is not symbolic', () => {
    expect(merge([it_('  ', 72, 700, 6)])).toMatchObject({ str: '', symbolic: false });
  });
});
