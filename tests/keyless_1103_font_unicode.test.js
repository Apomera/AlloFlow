// Unicode for simple-font codes (2026-11-03, veraPDF on the 2026-11-02 corpus):
//  - _alloSymbolicTrueTypeText: what each code of an embedded SYMBOLIC TrueType font with no /ToUnicode draws
//    (udhr_en / udhr_es, 7.21.7-1 x3583 / x4904), read from the font program, all or nothing;
//  - _alloDifferencesCodePoints: /Differences of strict AGL names (udhr_en's ArialMT, which Stage 7 skipped);
//  - _alloOneByteToUnicodeCMap: the ToUnicode stream written for a mapped font.
// The real source is sliced out; ALLO_PIPELINE_SOURCE points it at a private copy for mutation checks.
// The browser end of it (Stage 7 / 7b in createTaggedPdf + veraPDF): tests/e2e/pdf_font_unicode_and_encoding.spec.ts.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const opts = { file: 'doc_pipeline_source.jsx', includeEnd: true };
const { text, diffs, cmap, names, shown } = new Function(
  sliceBetween(SRC, 'var _CS_AGL = {', '};', opts) + '\n'
  + sliceBetween(SRC, 'function _csGlyphToUnicode(name) {', '\n}\n', opts)
  + sliceBetween(SRC, '// ── Unicode for simple-font codes (2026-11-03', "defineresource pop\\nend\\nend\\n';\n}", opts)
  + '\nreturn { text: _alloSymbolicTrueTypeText, diffs: _alloDifferencesCodePoints, cmap: _alloOneByteToUnicodeCMap, names: _alloDifferencesNames, shown: _alloShownCodes };')();

// ── tiny sfnt builders: only the directory, cmap and post matter to the reader ──
const u16 = (v) => [(v >> 8) & 255, v & 255];
const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
function sfnt(tables) {
  const tags = Object.keys(tables).sort();
  let off = 12 + tags.length * 16;
  const dir = [...u32(0x10000), ...u16(tags.length), 0, 0, 0, 0, 0, 0];
  const body = [];
  for (const t of tags) {
    const d = tables[t];
    dir.push(...t.split('').map((c) => c.charCodeAt(0)), ...u32(0), ...u32(off), ...u32(d.length));
    const p = d.concat(new Array((4 - (d.length % 4)) % 4).fill(0));
    body.push(...p); off += p.length;
  }
  return Uint8Array.from(dir.concat(body));
}
const fmt0 = (map) => { const ids = new Array(256).fill(0); for (const [c, g] of Object.entries(map)) ids[c] = g; return [...u16(0), ...u16(262), ...u16(0), ...ids]; };
// format 4 from [code, gid] pairs: one segment each, by idDelta, or (ranges) through idRangeOffset + glyphIdArray
const fmt4 = (pairs, ranges) => {
  const segs = pairs.concat([[0xFFFF, 0]]), n = segs.length;
  const ends = segs.flatMap(([c]) => u16(c)), starts = ends.slice();
  const deltas = segs.flatMap(([c, g], i) => u16(i === n - 1 ? 1 : ranges ? 0 : (g - c) & 0xFFFF));
  const ros = segs.flatMap((_, i) => u16(i === n - 1 || !ranges ? 0 : (n - i) * 2 + i * 2));
  const glyphIds = ranges ? pairs.flatMap(([, g]) => u16(g)) : [];
  const body = [...u16(n * 2), 0, 0, 0, 0, 0, 0, ...ends, 0, 0, ...starts, ...deltas, ...ros, ...glyphIds];
  return [...u16(4), ...u16(4 + body.length), ...u16(0), ...body];
};
const fmt12 = (groups) => [...u16(12), 0, 0, ...u32(16 + groups.length * 12), ...u32(0), ...u32(groups.length), ...groups.flatMap(([a, b, g]) => [...u32(a), ...u32(b), ...u32(g)])];
const cmapTable = (subs) => {
  let off = 4 + subs.length * 8;
  const head = [...u16(0), ...u16(subs.length)], data = [];
  for (const [pid, eid, bytes] of subs) { head.push(...u16(pid), ...u16(eid), ...u32(off)); data.push(...bytes); off += bytes.length; }
  return head.concat(data);
};
const post3 = () => [...u32(0x30000), ...new Array(28).fill(0)];
const post2 = (indexes, extra) => [...u32(0x20000), ...new Array(28).fill(0), ...u16(indexes.length), ...indexes.flatMap(u16), ...extra.flatMap((s) => [s.length, ...s.split('').map((c) => c.charCodeAt(0))])];
const ascii = (from, to, shift) => { const m = {}; for (let c = from; c <= to; c++) m[c] = c - shift; return m; };
const codes = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('_alloSymbolicTrueTypeText', () => {
  it('udhr shape: one (1,0) cmap in standard Macintosh glyph order, no glyph names -> each code is its ASCII character', () => {
    const t = text(sfnt({ cmap: cmapTable([[1, 0, fmt0(ascii(32, 126, 29))]]), post: post3() }), codes(32, 126));
    expect(t.size).toBe(95);
    expect([t.get(32), t.get(65), t.get(97), t.get(126)]).toEqual([' ', 'A', 'a', '~']);
  });
  it('all or nothing: one code whose glyph is out of the standard order, or has no glyph, gives NO map', () => {
    const shifted = ascii(32, 126, 29); shifted[0x51] = 90;
    expect(text(sfnt({ cmap: cmapTable([[1, 0, fmt0(shifted)]]), post: post3() }), codes(32, 126))).toBeNull();
    expect(text(sfnt({ cmap: cmapTable([[1, 0, fmt0(ascii(32, 126, 28))]]), post: post3() }), [0x41])).toBeNull();
    expect(text(sfnt({ cmap: cmapTable([[1, 0, fmt0({ 65: 36 })]]), post: post3() }), [65, 66])).toBeNull();
    // codes outside printable ASCII never come from the glyph-order rule
    expect(text(sfnt({ cmap: cmapTable([[1, 0, fmt0({ 0xE9: 0xE9 - 29 })]]), post: post3() }), [0xE9])).toBeNull();
  });
  it('the font\'s own Unicode cmap wins: (3,0) at 0xF000+code, its glyph found in the (3,1) table (idRangeOffset form)', () => {
    const font = sfnt({ cmap: cmapTable([[3, 0, fmt4([[0xF041, 7], [0xF042, 8]])], [3, 1, fmt4([[0x00E9, 7], [0x0042, 8]], true)]]), post: post3() });
    const t = text(font, [0x41, 0x42]);
    expect([t.get(0x41), t.get(0x42)]).toEqual(['é', 'B']);
  });
  it('(3,10) format 12 reaches beyond the BMP; U+FEFF is never a character', () => {
    const t = text(sfnt({ cmap: cmapTable([[1, 0, fmt0({ 0x80: 40 })], [3, 10, fmt12([[0x1F600, 0x1F600, 40]])]]), post: post3() }), [0x80]);
    expect(t.get(0x80)).toBe('\u{1F600}');
    expect(text(sfnt({ cmap: cmapTable([[1, 0, fmt0({ 0x80: 40 })], [3, 1, fmt4([[0xFEFF, 40]])]]), post: post3() }), [0x80])).toBeNull();
    // a glyph reached from U+FEFF AND a real character takes the character
    const both = text(sfnt({ cmap: cmapTable([[1, 0, fmt0({ 0x80: 40 })], [3, 10, fmt12([[0xFEFF, 0xFEFF, 40], [0x1F600, 0x1F600, 40]])]]), post: post3() }), [0x80]);
    expect(both.get(0x80)).toBe('\u{1F600}');
  });
  it('post-table names: custom names through the glyph-name decoder, standard indexes 3-97 as ASCII', () => {
    // gid 1 -> custom name 0 ("uni00E9"), gid 2 -> standard index 36 ("A")
    const font = sfnt({ cmap: cmapTable([[1, 0, fmt0({ 0x8E: 1, 0x5A: 2 })]]), post: post2([0, 258, 36], ['uni00E9']) });
    const t = text(font, [0x8E, 0x5A]);
    expect([t.get(0x8E), t.get(0x5A)]).toEqual(['é', 'A']);
  });
  it('no symbolic cmap ((3,0) or (1,0)) or no cmap table at all: no map', () => {
    expect(text(sfnt({ cmap: cmapTable([[3, 1, fmt4([[0x41, 36]])]]), post: post3() }), [0x41])).toBeNull();
    expect(text(sfnt({ post: post3() }), [0x41])).toBeNull();
  });
});

describe('_alloDifferencesCodePoints', () => {
  const arr = (...xs) => ({ size: () => xs.length, get: (i) => xs[i] });
  it('udhr_en\'s ArialMT: [0 /t /h /e /space] -> codes 0-3', () => {
    expect(Array.from(diffs(arr('0', '/t', '/h', '/e', '/space')).entries())).toEqual([[0, 116], [1, 104], [2, 101], [3, 32]]);
    expect(Array.from(diffs(arr('39', '/quoteright', '96', '/A')).entries())).toEqual([[39, 0x2019], [96, 65]]);
  });
  it('a name that is not a strict AGL name (derived, variant, ligature join, accent piece) rejects the whole encoding', () => {
    for (const n of ['/uni0041', '/u0041', '/a.sc', '/f_i', '/fi', '/breve', '/g123']) expect(diffs(arr('0', '/t', n))).toBeNull();
    expect(diffs(arr('/t'))).toBeNull();        // a name before any code
    expect(diffs(arr('256', '/t'))).toBeNull(); // not a one-byte code
    expect(diffs(arr())).toBeNull();
  });
});

// fda's redaction box (2026-11-03): the form's /Helv has a PDFDocEncoding /Differences (breve, caron, ...) but draws
// only "(b) (4)". _alloShownCodes reads which codes a content stream draws with given font resource names.
describe('_alloShownCodes', () => {
  const S = (s, ...n) => { const r = shown(s, new Set(n)); return r && Array.from(r).sort((a, b) => a - b); };
  it('the fda redaction box: escaped parentheses in a literal string', () => {
    expect(S('BT\n/Helv 6 Tf\n526 412 Td\n(\\050b\\051 ) Tj\n9 0 Td\n(\\0504\\051) Tj\nET', '/Helv')).toEqual([0x20, 0x28, 0x29, 0x34, 0x62]);
  });
  it('only the named font; nested balanced parentheses, octal, named escapes, hex and TJ arrays', () => {
    const s = '/F1 9 Tf (A(B)C) Tj /F2 9 Tf (zz) Tj /F1 9 Tf [(\\101) -200 <4142> 30 (\\n)] TJ 1 2 (x) " (\\\\) \'';
    expect(S(s, '/F1')).toEqual([10, 0x28, 0x29, 0x41, 0x42, 0x43, 0x5C, 0x78]);
    expect(S(s, '/F2')).toEqual([0x7A]);
  });
  it('a font set inside q ... Q is restored after Q; inline image data is skipped', () => {
    expect(S('/F1 9 Tf q /F2 9 Tf (a) Tj Q (b) Tj', '/F1')).toEqual([0x62]);
    expect(S('/F1 9 Tf BI /W 2 /H 1 /BPC 8 /CS /G ID (\xff\x01) Tj EI (c) Tj', '/F1')).toEqual([0x63]);
  });
  it('no doubt allowed: an unterminated string or a bad hex string gives null; no use gives an empty set', () => {
    expect(S('/F1 9 Tf (abc Tj', '/F1')).toBeNull();
    expect(S('/F1 9 Tf <4G> Tj', '/F1')).toBeNull();
    expect(S('/F2 9 Tf (abc) Tj', '/F1')).toEqual([]);
  });
  it('_alloDifferencesNames keeps every name (strict or not) by code', () => {
    const arr = (...xs) => ({ size: () => xs.length, get: (i) => xs[i] });
    expect(Array.from(names(arr('24', '/breve', '/caron', '39', '/quotesingle')).entries())).toEqual([[24, 'breve'], [25, 'caron'], [39, 'quotesingle']]);
    expect(names(arr('/a'))).toBeNull();
  });
});

describe('_alloOneByteToUnicodeCMap', () => {
  it('one-byte codespace, bfchar blocks of at most 100, UTF-16BE values (surrogate pairs beyond the BMP)', () => {
    const m = new Map(codes(0, 149).map((c) => [c, String.fromCharCode(0x4E00 + c)]));
    m.set(200, '\u{1F600}');
    const s = cmap(m);
    expect(s).toContain('1 begincodespacerange\n<00> <FF>\nendcodespacerange');
    expect(s.match(/(\d+) beginbfchar/g)).toEqual(['100 beginbfchar', '51 beginbfchar']);
    expect(s).toContain('<00> <4E00>');
    expect(s).toContain('<95> <4E95>');
    expect(s).toContain('<C8> <D83DDE00>');
    expect(s.trim().endsWith('end\nend')).toBe(true);
  });
});
