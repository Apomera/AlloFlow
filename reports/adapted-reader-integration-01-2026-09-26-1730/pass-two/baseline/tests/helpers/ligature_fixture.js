// Runtime-generated PDF fixture for the simple-font code→text precedence
// layers (corpus round 7). Three fonts, one content stream, all uncompressed:
//   F1 — /Encoding /Differences [31 /f_i]      → (quali\x1Fed) reads 'qualified'
//   F2 — ToUnicode maps 'f' (0x66) to U+FB01   → (bene\x66t)  reads 'benefit'
//                                                 (ligature expansion layer)
//   F3 — no ToUnicode, no Differences; a synthetic CFF (FontFile3/Type1C)
//        whose own encoding puts SID 109 'fi' at code 31 → (con\x1Frm) reads
//        'confirm' (the CFF built-in-encoding layer, which nothing else covers)
// The i1040's HelveticaNeueLTStd subsets are the real-world F1 case; F3 pins
// the layer that fires when a producer omits the Differences array too.
import { Buffer } from 'node:buffer';

function synthesizedCff() {
  const header = [1, 0, 4, 4];
  const nameIndex = [0x00, 0x01, 0x01, 0x01, 0x02, 0x54]; // one name: 'T'
  // Top DICT: charset=35, encoding=38, CharStrings=41 — all 5-byte ints so the
  // dict is fixed-size (18 bytes) and the offsets below stay literal.
  const int5 = (v) => [29, (v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  const topDict = [...int5(35), 15, ...int5(38), 16, ...int5(41), 17];
  const topDictIndex = [0x00, 0x01, 0x01, 0x01, 1 + topDict.length, ...topDict];
  const stringIndex = [0x00, 0x00];
  const charset = [0x00, 0x00, 0x6d]; // format 0, SID 109 = 'fi' (glyph 1)
  const encoding = [0x00, 0x01, 0x1f]; // format 0, one code: 0x1F → GID 1
  const charStrings = [0x00, 0x02, 0x01, 0x01, 0x02, 0x03, 0x0e, 0x0e]; // 2 glyphs, endchar each
  const cff = [...header, ...nameIndex, ...topDictIndex, ...stringIndex, ...charset, ...encoding, ...charStrings];
  if (cff.length !== 49 || cff[35] !== 0x00 || cff[38] !== 0x00 || cff[41] !== 0x00) {
    throw new Error('synthesized CFF layout drifted — recompute the Top DICT offsets');
  }
  return Buffer.from(cff);
}

export function buildLigatureFixturePdf() {
  const cff = synthesizedCff();
  const toUnicode = [
    '/CIDInit /ProcSet findresource begin 12 dict begin begincmap',
    '1 begincodespacerange <00> <FF> endcodespacerange',
    '1 beginbfchar <66> <FB01> endbfchar',
    'endcmap end end',
  ].join('\n');
  const content = 'BT /F1 12 Tf 72 700 Td (quali\x1Fed) Tj /F2 12 Tf (bene\x66t) Tj /F3 12 Tf (con\x1Frm) Tj ET';
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R' +
      '/Resources<</Font<</F1 5 0 R/F2 6 0 R/F3 8 0 R>>>>>>',
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Fake-Diff/Encoding<</Type/Encoding/Differences[31/f_i]>>>>',
    `<</Type/Font/Subtype/Type1/BaseFont/Fake-ToUni/ToUnicode 7 0 R>>`,
    `<</Length ${toUnicode.length}>>\nstream\n${toUnicode}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Fake-Cff/FontDescriptor 9 0 R>>',
    '<</Type/FontDescriptor/FontName/Fake-Cff/FontFile3 10 0 R>>',
    `<</Subtype/Type1C/Length ${cff.length}>>\nstream\n{{CFF}}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  for (let i = 0; i < objects.length; i++) body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  body += 'trailer<</Root 1 0 R>>\n%%EOF\n';
  const marker = body.indexOf('{{CFF}}');
  return Buffer.concat([
    Buffer.from(body.slice(0, marker), 'latin1'),
    cff,
    Buffer.from(body.slice(marker + '{{CFF}}'.length), 'latin1'),
  ]);
}
