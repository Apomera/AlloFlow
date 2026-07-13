// Builds a minimal, valid 1-page PDF with a correct xref table (computed byte
// offsets) so veraPDF can parse it. Untagged on purpose — veraPDF will report
// PDF/UA-1 failures, which is exactly what proves it actually validated in-browser.
const fs = require('fs');
const objs = {};
objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
objs[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>';
const stream = 'BT /F1 24 Tf 72 700 Td (Hello veraPDF from the browser) Tj ET';
objs[4] = '<< /Length ' + Buffer.byteLength(stream, 'binary') + ' >>\nstream\n' + stream + '\nendstream';
objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
const off = {};
for (let i = 1; i <= 5; i++) {
  off[i] = Buffer.byteLength(pdf, 'binary');
  pdf += i + ' 0 obj\n' + objs[i] + '\nendobj\n';
}
const xref = Buffer.byteLength(pdf, 'binary');
pdf += 'xref\n0 6\n0000000000 65535 f \n';
for (let i = 1; i <= 5; i++) pdf += String(off[i]).padStart(10, '0') + ' 00000 n \n';
pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
fs.writeFileSync('C:\\tmp\\sample.pdf', Buffer.from(pdf, 'binary'));
console.log('wrote C:\\tmp\\sample.pdf (' + Buffer.byteLength(pdf, 'binary') + ' bytes)');
