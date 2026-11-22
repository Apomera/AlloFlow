#!/usr/bin/env node
'use strict';

/**
 * Deterministic, privacy-safe, offline golden fixture generator for AlloFlow's
 * remediation benchmark harness (Phase 1).
 *
 * Produces 7 realistic documents without any network calls or wall-clock
 * randomness so every run produces byte-identical inputs (verifiable via SHA-256).
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const { makeZip } = require(path.resolve(__dirname, '..', 'desktop', 'mcp', 'zip_writer.cjs'));

const FIXTURE_IDS = Object.freeze([
  'pdf-out-of-order-formxobj.pdf',
  'pdf-ocr-space-split.pdf',
  'docx-stem-omml-comments.docx',
  'xlsx-merged-pipes.xlsx',
  'html-wcag22-rtl-defects.html',
  'blocks-stem-semantic.json',
  'html-tagged-pdf-and-altformats.html',
]);

// Minimal 1x1 dark-blue PNG (valid, deterministic, zero network)
const PNG_1X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function pdfEscape(value) {
  return String(value).replace(/([\\()])/g, '\\$1').replace(/[\r\n]+/g, ' ');
}

/**
 * Standard PDF ASCII85 encoder (ISO 32000-1 7.4.3).
 * Uses 'z' shorthand for full 4-byte zero blocks and appends '~>'.
 */
function encodeAscii85(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let out = '';
  for (let i = 0; i < buf.length; i += 4) {
    const rem = Math.min(4, buf.length - i);
    const b0 = buf[i];
    const b1 = rem > 1 ? buf[i + 1] : 0;
    const b2 = rem > 2 ? buf[i + 2] : 0;
    const b3 = rem > 3 ? buf[i + 3] : 0;
    let val = (((b0 * 256 + b1) * 256 + b2) * 256 + b3);
    if (rem === 4 && val === 0) {
      out += 'z';
      continue;
    }
    const digits = new Array(5);
    for (let d = 4; d >= 0; d -= 1) {
      digits[d] = String.fromCharCode(33 + (val % 85));
      val = Math.floor(val / 85);
    }
    out += digits.slice(0, rem + 1).join('');
  }
  return Buffer.from(out + '~>', 'latin1');
}

/**
 * Assemble a valid classic PDF-1.4 byte buffer from explicit numbered objects
 * (supports sparse / out-of-order object numbers cleanly in the xref table).
 *
 * @param {Array<{num: number, body: string|Buffer}>} entries
 * @param {number} rootNum
 * @returns {Buffer}
 */
function buildPdfFromObjects(entries, rootNum) {
  const maxNum = entries.reduce((m, e) => Math.max(m, e.num), 0);
  const parts = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  let offset = parts[0].length;
  const offsets = new Map();

  for (const entry of entries) {
    offsets.set(entry.num, offset);
    const header = Buffer.from(`${entry.num} 0 obj\n`, 'latin1');
    const body = Buffer.isBuffer(entry.body) ? entry.body : Buffer.from(entry.body, 'latin1');
    const footer = Buffer.from('\nendobj\n', 'latin1');
    parts.push(header, body, footer);
    offset += header.length + body.length + footer.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${maxNum + 1}\n0000000000 65535 f \n`;
  for (let num = 1; num <= maxNum; num += 1) {
    if (offsets.has(num)) {
      xref += `${String(offsets.get(num)).padStart(10, '0')} 00000 n \n`;
    } else {
      xref += '0000000000 65535 f \n';
    }
  }
  xref += `trailer\n<< /Size ${maxNum + 1} /Root ${rootNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(parts);
}

function makeStreamObj(dictInner, streamBytes) {
  const raw = Buffer.isBuffer(streamBytes) ? streamBytes : Buffer.from(streamBytes, 'latin1');
  return Buffer.concat([
    Buffer.from(`<< ${dictInner} /Length ${raw.length} >>\nstream\n`, 'latin1'),
    raw,
    Buffer.from('\nendstream', 'latin1'),
  ]);
}

/**
 * Fixture 1: pdf-out-of-order-formxobj.pdf
 * - 2 pages with out-of-order /Page object numbers (/Kids [20 0 R 5 0 R])
 * - Chained [/ASCII85Decode /FlateDecode] stream on Page 1
 * - Form XObject (/Subtype /Form) invoked via /Fm1 Do
 * - Indexed color space palette using escaped PDF literal string (\)\051\nABC)
 * - /Length-first stream containing literal 'endstream' bytes
 */
function buildPdfOutOfOrderFormXobj() {
  const page2Stream = Buffer.from(
    'BT /F1 12 Tf 72 720 Td (PAGE_TWO_BETA: Cellular Respiration Summary) Tj ET',
    'latin1',
  );
  const indexedPixels = Buffer.from([0x00, 0x01]);
  const literalEndstreamPayload = Buffer.from('ABCDendstreamXYZ!', 'latin1');

  const page1Primary = Buffer.from(
    'BT /F1 12 Tf 72 720 Td (PAGE_ONE_ALPHA: Photosynthesis Overview) Tj ET\n'
    + 'q 1 0 0 1 72 680 cm /Fm1 Do Q',
    'latin1',
  );
  const page1ChainedRaw = Buffer.from(
    'BT /F1 12 Tf 72 640 Td (CHAINED_A85_FLATE: Light-dependent reactions produce ATP.) Tj ET',
    'latin1',
  );
  const page1ChainedEncoded = encodeAscii85(zlib.deflateSync(page1ChainedRaw));

  const formXobjRaw = Buffer.from(
    'BT /F2 10 Tf 0 40 Td (FORM_XOBJ_CALLOUT: Chlorophyll absorbs red and blue light.) Tj ET',
    'latin1',
  );
  const formXobjCompressed = zlib.deflateSync(formXobjRaw);

  const entries = [
    { num: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { num: 2, body: '<< /Type /Pages /Kids [20 0 R 5 0 R] /Count 2 >>' },
    { num: 4, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    // Deliberately emit Page 2 (obj 5) BEFORE Page 1 (obj 20) in file order
    {
      num: 5,
      body: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 7 0 R >> >> /Contents 6 0 R >>',
    },
    { num: 6, body: makeStreamObj('', page2Stream) },
    // Image XObject with Indexed palette: triplet 0 = [41, 41, 10] (\)\051\n), triplet 1 = [65, 66, 67] (ABC)
    {
      num: 7,
      body: makeStreamObj(
        '/Type /XObject /Subtype /Image /Width 2 /Height 1 /BitsPerComponent 8 /ColorSpace [/Indexed /DeviceRGB 1 (\\)\\051\\nABC)]',
        indexedPixels,
      ),
    },
    // Auxiliary stream containing literal "endstream" inside its /Length-bounded payload
    { num: 8, body: makeStreamObj('/Type /Metadata /Subtype /Plain', literalEndstreamPayload) },
    // Page 1 (obj 20) appears AFTER Page 2 in byte order, but FIRST in /Kids
    {
      num: 20,
      body: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> /XObject << /Fm1 22 0 R >> >> /Contents [21 0 R 23 0 R] >>',
    },
    { num: 21, body: makeStreamObj('', page1Primary) },
    {
      num: 22,
      body: makeStreamObj(
        '/Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 420 90] /Resources << /Font << /F2 4 0 R >> >> /Filter /FlateDecode',
        formXobjCompressed,
      ),
    },
    {
      num: 23,
      body: makeStreamObj('/Filter [/ASCII85Decode /FlateDecode]', page1ChainedEncoded),
    },
  ];

  return buildPdfFromObjects(entries, 1);
}

/**
 * Fixture 2: pdf-ocr-space-split.pdf
 * Multi-page PDF exercising:
 * - Clean PDF content stream words paired with OCR/pdf.js intra-word space splits
 * - Repeating running headers & sequential folios across 4 pages (for _stripPageEdgeArtifacts)
 * - Hyphenated words across a folio + real numeric data values (for _cleanScannedOcrText)
 * - U+FFFD broken-encoding page layer metadata (for _textLayerLooksGarbage & _alloPageTextUnreadable)
 */
function buildPdfOcrSpaceSplit() {
  const pagesContent = [
    [
      'District Science Handbook 2026',
      'The legal permanent resident submitted the form in the United States.',
      'The report covers committee recommendations for photosyn-',
      '10',
      'thesis laboratory safety and clean measurement records.',
      '95',
      'Calibration accuracy stayed above ninety percent.',
      '10',
    ],
    [
      'District Science Handbook 2026',
      'Students recorded baseline temperature across three replicates.',
      'The committee reviewed watershed observations carefully.',
      '11',
    ],
    [
      'District Science Handbook 2026',
      'Each observation log tracks salinity and dissolved oxygen.',
      'All readings were verified against reference standards.',
      '12',
    ],
    [
      'District Science Handbook 2026',
      'Final laboratory summary confirms steady ecological recovery.',
      'Appendix tables provide raw conductivity measurements.',
      '13',
    ],
  ];

  const entries = [
    { num: 1, body: '<< /Type /Catalog /Pages 2 0 R /Info 99 0 R >>' },
    { num: 2, body: '<< /Type /Pages /Kids [10 0 R 20 0 R 30 0 R 40 0 R] /Count 4 >>' },
    { num: 4, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
  ];

  pagesContent.forEach((lines, idx) => {
    const pageNum = (idx + 1) * 10;
    const streamNum = pageNum + 1;
    const ops = ['BT /F1 11 Tf 72 740 Td 16 TL'];
    lines.forEach((line, li) => {
      if (li === 0) ops.push(`(${pdfEscape(line)}) Tj`);
      else ops.push(`T* (${pdfEscape(line)}) Tj`);
    });
    ops.push('ET');
    entries.push({
      num: pageNum,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents ${streamNum} 0 R >>`,
    });
    entries.push({
      num: streamNum,
      body: makeStreamObj('', Buffer.from(ops.join('\n'), 'latin1')),
    });
  });

  // Deterministic UTF-16BE /Subject containing U+FFFD broken-encoding sample payload
  // plus synthetic space-split OCR text note in an auxiliary stream so the fixture is self-contained.
  const ocrSamplePayload = JSON.stringify({
    brokenSpaceSplitPage: [
      'District Science Handbook 2026',
      'The legal p ermanent resident submitted the form in the U nited S tates.',
      'T h e report covers co mmittee recommendations for photosyn-',
      '10',
      'thesis laboratory safety and clean measurement records.',
      '95',
      'Calibration accuracy stayed above ninety percent.',
      '10',
    ].join('\n'),
    garbledUfffdPage: (
      'Broken font encoding sample: ' + '\uFFFD'.repeat(42)
      + ' unreadable glyphs ' + '\uFFFD'.repeat(38)
      + ' residual ascii text for threshold check ' + '\uFFFD'.repeat(32)
    ),
    runningHeaderPages: pagesContent.map((lines) => lines.join('\n')),
  });
  entries.push({
    num: 98,
    body: makeStreamObj('/Type /EmbeddedFile /Subtype /application#2Fjson', Buffer.from(ocrSamplePayload, 'utf8')),
  });
  entries.push({
    num: 99,
    body: '<< /Title (OCR Space Split and Running Header Fixture) /Subject (Synthetic OCR cleanup test) >>',
  });

  return buildPdfFromObjects(entries, 1);
}

/**
 * Fixture 3: docx-stem-omml-comments.docx
 * Valid OOXML ZIP containing:
 * - word/document.xml with Heading1, merged table cells (gridSpan + vMerge),
 *   Word <m:oMath> quadratic equation, and <w:txbxContent> callout box
 * - word/comments.xml with reviewer margin comment (excluded by default, opt-in with includeComments:true)
 */
function buildDocxStemOmmlComments() {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
  </w:style>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Quadratic Kinematics and Lab Protocol</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Use the quadratic formula below to determine projectile landing time from measured height.</w:t></w:r>
    </w:p>
    <w:p>
      <m:oMath>
        <m:r><m:t>x=</m:t></m:r>
        <m:f>
          <m:num>
            <m:r><m:t>-b+</m:t></m:r>
            <m:rad>
              <m:e>
                <m:sSup><m:e><m:r><m:t>b</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>
                <m:r><m:t>-4ac</m:t></m:r>
              </m:e>
            </m:rad>
          </m:num>
          <m:den><m:r><m:t>2a</m:t></m:r></m:den>
        </m:f>
      </m:oMath>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
          <w:p><w:r><w:t>Projectile Trials Summary</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Unit</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:vMerge w:val="restart"/></w:tcPr>
          <w:p><w:r><w:t>Trial Set A</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:p><w:r><w:t>1.42</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>seconds</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:vMerge/></w:tcPr>
          <w:p><w:r><w:t></w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:p><w:r><w:t>1.46</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>seconds</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p>
      <w:r>
        <wps:txbx>
          <w:txbxContent>
            <w:p><w:r><w:t>Lab Safety Callout: Wear impact goggles before launching projectiles.</w:t></w:r></w:p>
          </w:txbxContent>
        </wps:txbx>
      </w:r>
    </w:p>
    <w:p>
      <w:commentRangeStart w:id="0"/>
      <w:r><w:t>Record uncertainties to two decimal places.</w:t></w:r>
      <w:commentRangeEnd w:id="0"/>
      <w:r><w:commentReference w:id="0"/></w:r>
    </w:p>
  </w:body>
</w:document>`;

  const commentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="0" w:author="Curriculum Reviewer" w:date="2026-01-15T12:00:00Z">
    <w:p><w:r><w:t>INTERNAL REVIEWER NOTE: Verify grading rubric before publishing to students.</w:t></w:r></w:p>
  </w:comment>
</w:comments>`;

  return makeZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/comments.xml', data: commentsXml },
  ]);
}

/**
 * Fixture 4: xlsx-merged-pipes.xlsx
 * Valid OOXML XLSX ZIP with 2 worksheets, <mergeCells> (horizontal + vertical),
 * and literal pipe '|' characters inside cell values.
 */
function buildXlsxMergedPipes() {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Lab Scores" sheetId="1" r:id="rId1"/>
    <sheet name="Pipe Conditions" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const strings = [
    'Experiment Group | Control',   // 0
    'pH Reading',                   // 1
    'Cohort Alpha',                 // 2
    'Trial 1 | Baseline',           // 3
    'Trial 2 | Heated',             // 4
    'Rule | Threshold',             // 5
    'Status',                       // 6
    'A | B >= 7.0',                 // 7
    'Pass | Verified',              // 8
  ];
  const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map((s) => `  <si><t>${xmlEsc(s)}</t></si>`).join('\n')}
</sst>`;

  // Sheet 1: A1:B1 merged horizontally (colspan=2), A2:A3 merged vertically (rowspan=2), literal '|' in cells
  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:C3"/>
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1"/>
      <c r="C1" t="s"><v>1</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>2</v></c>
      <c r="B2" t="s"><v>3</v></c>
      <c r="C2"><v>7.1</v></c>
    </row>
    <row r="3">
      <c r="A3"/>
      <c r="B3" t="s"><v>4</v></c>
      <c r="C3"><v>7.4</v></c>
    </row>
  </sheetData>
  <mergeCells count="2">
    <mergeCell ref="A1:B1"/>
    <mergeCell ref="A2:A3"/>
  </mergeCells>
</worksheet>`;

  // Sheet 2: Second worksheet with literal pipe characters
  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:B2"/>
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>5</v></c>
      <c r="B1" t="s"><v>6</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>7</v></c>
      <c r="B2" t="s"><v>8</v></c>
    </row>
  </sheetData>
</worksheet>`;

  return makeZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
    { name: 'xl/sharedStrings.xml', data: sharedStringsXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheet1Xml },
    { name: 'xl/worksheets/sheet2.xml', data: sheet2Xml },
  ]);
}

/**
 * Fixture 5: html-wcag22-rtl-defects.html
 * Bilingual Arabic/English HTML with:
 * - Low-contrast dark-banner text
 * - Skipped heading levels (h1 -> h4 -> h6)
 * - Duplicate IDs (id="sec-notes" repeated, plus data-id="sec-notes" untouched)
 * - DPUB-ARIA role="doc-footnote" (plus role="doc-noteref", data-role="custom-card", invalid role="bogus-made-up", typo role="content-info")
 * - Fixed-width 320px reflow overflow (480px wide container)
 * - Clipped overflow:hidden text spacing paragraph
 * - 16x16px button target
 */
function buildHtmlWcag22RtlDefects() {
  return Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Bilingual Science Lab Guide</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; background: #ffffff; }
    .dark-banner { background-color: #1e293b; color: #334155; padding: 12px; }
    .wide-reflow-box { width: 480px; min-width: 480px; border: 1px solid #cbd5e1; }
    .clipped-spacing { height: 18px; overflow: hidden; line-height: 1.1; }
    .tiny-target { width: 16px; height: 16px; padding: 0; font-size: 10px; }
  </style>
</head>
<body>
  <header class="dark-banner" style="background-color:#1e293b; color:#334155;">
    <p>Important Laboratory Notice — Please review safety rules before starting.</p>
  </header>
  <main id="main-content">
    <h1 id="sec-notes">Bilingual Lab Guide</h1>
    <p dir="rtl" lang="ar">مرحباً بكم في مختبر العلوم: يرجى قراءة تعليمات السلامة بدقة قبل البدء.</p>
    <p>Welcome to the science laboratory.<a role="doc-noteref" href="#fn-1">1</a></p>

    <section id="sec-notes" data-id="sec-notes" data-role="custom-card">
      <h4>Safety Procedures</h4>
      <div class="wide-reflow-box">
        <p>Fixed-width 480px container that overflows a 320px WCAG 1.4.10 reflow viewport.</p>
      </div>
      <p class="clipped-spacing">This paragraph intentionally clips vertically when WCAG 1.4.12 text spacing overrides are applied.</p>
      <button type="button" class="tiny-target" aria-label="Close notice">X</button>
    </section>

    <section>
      <h6>Equipment Checklist</h6>
      <div role="bogus-made-up">Inspect graduated cylinders before measuring liquids.</div>
      <aside id="fn-1" role="doc-footnote">
        <p>1. Adapted from standard introductory chemistry laboratory guidelines.</p>
      </aside>
    </section>
  </main>
  <footer role="content-info">
    <p>Science Department Instructional Materials</p>
  </footer>
</body>
</html>
`, 'utf8');
}

/**
 * Fixture 6: blocks-stem-semantic.json
 * Document Builder block payload testing:
 * - Natural prose "Title: ..." and "Description: ..." preservation
 * - Leaked quoted JSON key cleanup ('"text": ...')
 * - math/formula, code, footnote, and callout blocks
 */
function buildBlocksStemSemantic() {
  const payload = {
    schemaVersion: 1,
    documentTitle: 'STEM Semantic Block Fixture',
    blocks: [
      { type: 'h1', text: 'Literature and STEM Block Semantics' },
      { type: 'p', text: 'Title: The Great Gatsby' },
      { type: 'p', text: 'Description: Observe the onion epidermal cells under low power magnification.' },
      { type: 'p', text: '"text": Leaked JSON key cleaned safely' },
      {
        type: 'math',
        latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        alt: 'x equals negative b plus or minus the square root of b squared minus 4 a c all over 2 a',
      },
      {
        type: 'code',
        code: 'if (tempC < 100 && pressureAtm >= 1) {\n  return "liquid";\n}',
      },
      {
        type: 'footnote',
        text: '1. Source: National Science Education Standards, 2024.',
      },
      {
        type: 'callout',
        title: 'Safety Note',
        text: 'Wear splash goggles and heat-resistant gloves during distillation.',
      },
    ],
  };
  return Buffer.from(JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

/**
 * Fixture 7: html-tagged-pdf-and-altformats.html
 * Rich accessible HTML with headings, nested list, caption+headers table,
 * inline SVG + alt image, internal anchor links, and RTL phrase — used for
 * Alt-Format exports (EPUB3 + validateEpub, DAISY, BRF) and optional --mode pdfua.
 */
function buildHtmlTaggedPdfAndAltformats() {
  return Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Watershed Accessibility Report</title>
  <style>
    body { font-family: Georgia, serif; color: #111827; background: #ffffff; line-height: 1.5; max-width: 720px; margin: 0 auto; padding: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #4b5563; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  <a href="#main-content">Skip to main content</a>
  <main id="main-content">
    <h1 id="sec-overview">Watershed Accessibility Report</h1>
    <p>Field teams measured 128 samples across two seasonal cycles. Jump directly to the <a href="#sec-data">Water Quality Table</a> or <a href="#sec-visuals">Diagrams</a>.</p>
    <p>Multilingual outreach phrase: <span lang="ar" dir="rtl">العلوم للجميع</span> (Science for Everyone).</p>

    <h2 id="sec-methods">Sampling Methods</h2>
    <ul>
      <li>Upstream stations
        <ul>
          <li>Station A: Headwaters gravel bed</li>
          <li>Station B: Shaded riparian corridor</li>
        </ul>
      </li>
      <li>Downstream stations
        <ol>
          <li>Collect duplicate bottles</li>
          <li>Log dissolved oxygen within 5 minutes</li>
        </ol>
      </li>
    </ul>

    <h2 id="sec-data">Water Quality Table</h2>
    <table>
      <caption>Seasonal Dissolved Oxygen and pH Measurements</caption>
      <thead>
        <tr>
          <th id="col-station" scope="col">Station</th>
          <th id="col-do" scope="col">Dissolved Oxygen (mg/L)</th>
          <th id="col-ph" scope="col">pH</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th id="row-a" scope="row" headers="col-station">Station A</th>
          <td headers="row-a col-do">9.4</td>
          <td headers="row-a col-ph">7.2</td>
        </tr>
        <tr>
          <th id="row-b" scope="row" headers="col-station">Station B</th>
          <td headers="row-b col-do">8.8</td>
          <td headers="row-b col-ph">7.1</td>
        </tr>
      </tbody>
    </table>

    <h2 id="sec-visuals">Diagrams</h2>
    <h3 id="sec-svg">Watershed Profile Graphic</h3>
    <figure>
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40" role="img" aria-label="Simplified watershed slope diagram showing upstream elevation descending to downstream basin">
        <title>Watershed Slope Diagram</title>
        <rect x="2" y="2" width="116" height="36" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>
        <line x1="12" y1="10" x2="108" y2="30" stroke="#1e40af" stroke-width="3"/>
      </svg>
      <figcaption>Simplified elevation slope from Station A to Station B.</figcaption>
    </figure>
    <figure>
      <img src="data:image/png;base64,${PNG_1X1_B64}" width="1" height="1" alt="Reference calibration swatch for field turbidity meter"/>
      <figcaption>Calibration reference tile for turbidity testing.</figcaption>
    </figure>
  </main>
</body>
</html>
`, 'utf8');
}

function buildFixtureBuffers() {
  return {
    'pdf-out-of-order-formxobj.pdf': buildPdfOutOfOrderFormXobj(),
    'pdf-ocr-space-split.pdf': buildPdfOcrSpaceSplit(),
    'docx-stem-omml-comments.docx': buildDocxStemOmmlComments(),
    'xlsx-merged-pipes.xlsx': buildXlsxMergedPipes(),
    'html-wcag22-rtl-defects.html': buildHtmlWcag22RtlDefects(),
    'blocks-stem-semantic.json': buildBlocksStemSemantic(),
    'html-tagged-pdf-and-altformats.html': buildHtmlTaggedPdfAndAltformats(),
  };
}

/**
 * Materialize all 7 deterministic golden fixtures into outDir.
 * Returns { outDir, fixtures: { [id]: { path, bytes, sha256 } } }.
 */
function materializeGoldenFixtures(outDir) {
  if (!outDir || typeof outDir !== 'string') {
    throw new Error('materializeGoldenFixtures(outDir): outDir must be a non-empty path');
  }
  const resolvedOutDir = path.resolve(outDir);
  fs.mkdirSync(resolvedOutDir, { recursive: true });
  const buffers = buildFixtureBuffers();
  const fixtures = {};
  for (const id of FIXTURE_IDS) {
    const buf = buffers[id];
    const filePath = path.join(resolvedOutDir, id);
    fs.writeFileSync(filePath, buf);
    fixtures[id] = {
      id,
      path: filePath,
      bytes: buf.length,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    };
  }
  return { outDir: resolvedOutDir, fixtures };
}

if (require.main === module) {
  const targetDir = process.argv[2] || path.join(require('node:os').tmpdir(), 'alloflow-remediation-golden-fixtures');
  const result = materializeGoldenFixtures(targetDir);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

module.exports = {
  FIXTURE_IDS,
  encodeAscii85,
  buildFixtureBuffers,
  materializeGoldenFixtures,
};
