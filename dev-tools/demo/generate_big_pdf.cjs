// Builds a larger multi-page PDF (default 50 pages) with real content streams,
// to gauge how veraPDF-on-CheerpJ timing scales vs the 610-byte toy. Still
// untagged (will fail PDF/UA-1) — we only care about parse/validation TIME here.
const fs = require('fs');
const N = parseInt(process.argv[2] || '50', 10);
const objs = {};
let next = 1;
const CATALOG = next++, PAGES = next++, FONT = next++;
const pageObjs = [];
for (let p = 0; p < N; p++) { pageObjs.push({ page: next++, content: next++ }); }

objs[CATALOG] = '<< /Type /Catalog /Pages ' + PAGES + ' 0 R >>';
objs[PAGES] = '<< /Type /Pages /Kids [' + pageObjs.map((o) => o.page + ' 0 R').join(' ') + '] /Count ' + N + ' >>';
objs[FONT] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
for (let p = 0; p < N; p++) {
  const o = pageObjs[p];
  let body = 'BT /F1 12 Tf 72 720 Td (Page ' + (p + 1) + ' of ' + N + ' — veraPDF scaling test) Tj ET\n';
  for (let line = 0; line < 40; line++) {
    body += 'BT /F1 10 Tf 72 ' + (700 - line * 16) + ' Td (Line ' + line + ': the quick brown fox jumps over the lazy dog 0123456789) Tj ET\n';
  }
  objs[o.content] = '<< /Length ' + Buffer.byteLength(body, 'binary') + ' >>\nstream\n' + body + 'endstream';
  objs[o.page] = '<< /Type /Page /Parent ' + PAGES + ' 0 R /MediaBox [0 0 612 792] /Contents ' + o.content + ' 0 R /Resources << /Font << /F1 ' + FONT + ' 0 R >> >> >>';
}

let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
const off = {};
const total = next - 1;
for (let i = 1; i <= total; i++) {
  off[i] = Buffer.byteLength(pdf, 'binary');
  pdf += i + ' 0 obj\n' + objs[i] + '\nendobj\n';
}
const xref = Buffer.byteLength(pdf, 'binary');
pdf += 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
for (let i = 1; i <= total; i++) pdf += String(off[i]).padStart(10, '0') + ' 00000 n \n';
pdf += 'trailer\n<< /Size ' + (total + 1) + ' /Root ' + CATALOG + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';
fs.writeFileSync('C:\\tmp\\sample.pdf', Buffer.from(pdf, 'binary'));
console.log('wrote C:\\tmp\\sample.pdf  ' + N + ' pages, ' + Buffer.byteLength(pdf, 'binary') + ' bytes (' + total + ' objects)');
