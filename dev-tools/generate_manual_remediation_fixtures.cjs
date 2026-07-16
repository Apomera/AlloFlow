'use strict';

const fs = require('fs');
const path = require('path');

function pdfString(value) {
  return `(${String(value).replace(/([\\()])/g, '\\$1')})`;
}

function streamObject(dictionary, data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, 'latin1');
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`, 'latin1'),
    bytes,
    Buffer.from('\nendstream', 'latin1'),
  ]);
}

function buildPdf(objects) {
  const chunks = [Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = [0];
  let offset = chunks[0].length;

  objects.forEach((object, index) => {
    offsets[index + 1] = offset;
    const body = Buffer.isBuffer(object) ? object : Buffer.from(object, 'latin1');
    const wrapped = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, 'latin1'),
      body,
      Buffer.from('\nendobj\n', 'latin1'),
    ]);
    chunks.push(wrapped);
    offset += wrapped.length;
  });

  const xrefOffset = offset;
  const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n'];
  for (let index = 1; index <= objects.length; index += 1) {
    xref.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }
  xref.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 9 0 R >>\n`,
    `startxref\n${xrefOffset}\n%%EOF\n`,
  );
  chunks.push(Buffer.from(xref.join(''), 'latin1'));
  return Buffer.concat(chunks);
}

function main() {
  const outputDir = path.resolve(__dirname, '..', 'test-assets', 'manual-remediation');
  const outputPath = path.join(outputDir, 'active-content-actions.pdf');
  fs.mkdirSync(outputDir, { recursive: true });

  const lines = [
    'BT',
    '/F1 18 Tf',
    '54 720 Td',
    `${pdfString('AlloFlow Active Content Safety Test')} Tj`,
    '0 -40 Td',
    '/F1 11 Tf',
    `${pdfString('This synthetic fixture intentionally contains:')} Tj`,
    '0 -24 Td',
    `${pdfString('- a document-open JavaScript action')} Tj`,
    '0 -20 Td',
    `${pdfString('- a page additional-actions dictionary')} Tj`,
    '0 -20 Td',
    `${pdfString('- an embedded text attachment')} Tj`,
    '0 -44 Td',
    `${pdfString('Use only for local remediation safety testing.')} Tj`,
    'ET',
  ].join('\n');
  const attachment = Buffer.from('Synthetic AlloFlow remediation safety fixture.\n', 'utf8');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R /OpenAction 6 0 R /Names << /EmbeddedFiles 10 0 R >> /AF [8 0 R] >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R /AA << /O 6 0 R >> >>',
    streamObject('', lines),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Type /Action /S /JavaScript /JS ${pdfString("app.alert('AlloFlow safety fixture: source action executed')")} >>`,
    streamObject('/Type /EmbeddedFile /Subtype /text#2Fplain', attachment),
    '<< /Type /Filespec /F (safety-fixture.txt) /UF (safety-fixture.txt) /Desc (Synthetic attachment for remediation safety testing) /EF << /F 7 0 R /UF 7 0 R >> /AFRelationship /Data >>',
    '<< /Title (AlloFlow Active Content Safety Test) /Author (AlloFlow test fixture generator) /CreationDate (D:20260714000000Z) /ModDate (D:20260714000000Z) >>',
    '<< /Names [(safety-fixture.txt) 8 0 R] >>',
  ];

  const bytes = buildPdf(objects);
  fs.writeFileSync(outputPath, bytes);
  process.stdout.write(`${outputPath}\n`);
}

main();
