// Hand-build a two-column PDF whose CONTENT STREAM draws the RIGHT column (items 5–8) BEFORE the LEFT column
// (items 1–4). Visual reading order is 1→2→…→8 (left column top-to-bottom, then right column), but the
// stream/draw order is 5,6,7,8,1,2,3,4 — the classic multi-column scramble. pdf.js extracts in stream order,
// so this is the "hard case": a correct tagger must re-establish 1→8; a naive index-pairing tagger keeps the
// scramble. Lets you verify AlloFlow's tagged reading order by eye (screen-reader view) + with veraPDF.
// (2026-06-23) Pure raw-PDF bytes — no deps, exact xref offsets.
const fs = require('fs');
const path = require('path');

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
// [text, x, y] — DRAW ORDER (note: right column 5–8 is emitted first, then left column 1–4)
const lines = [
  ['The Water Cycle  (scrambled-stream test:  read 1 to 8 in order)', 120, 752, 13],
  // RIGHT column (items 5-8) drawn FIRST
  ['5. Groundwater: water seeps down and is stored underground.', 320, 700, 10],
  ['6. Transpiration: plants release water vapor from leaves.', 320, 672, 10],
  ['7. Runoff: surface water flows downhill into rivers.', 320, 644, 10],
  ['8. Human impact: cities and dams change how water moves.', 320, 616, 10],
  // LEFT column (items 1-4) drawn SECOND
  ['1. Evaporation: the sun heats water into invisible vapor.', 60, 700, 10],
  ['2. Condensation: rising vapor cools into clouds and fog.', 60, 672, 10],
  ['3. Precipitation: heavy droplets fall as rain or snow.', 60, 644, 10],
  ['4. Collection: water gathers in oceans and the cycle repeats.', 60, 616, 10],
];
let stream = '';
for (const [t, x, y, sz] of lines) {
  stream += `BT /F1 ${sz} Tf 1 0 0 1 ${x} ${y} Tm (${esc(t)}) Tj ET\n`;
}

const objs = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];

let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
const offsets = [];
objs.forEach((body, i) => {
  offsets[i] = Buffer.byteLength(pdf, 'latin1');
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf, 'latin1');
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
offsets.forEach((off) => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

const out = process.argv[2] || path.resolve(__dirname, 'multi-column-scrambled.pdf');
fs.writeFileSync(out, Buffer.from(pdf, 'latin1'));
console.log('WROTE ' + out + ' (' + Buffer.byteLength(pdf, 'latin1') + ' bytes)');
