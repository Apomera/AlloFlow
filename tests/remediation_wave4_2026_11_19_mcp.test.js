import { afterAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 180000, hookTimeout: 60000 });

const requireCjs = createRequire(import.meta.url);
const Driver = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));
const ChromiumPdf = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_chromium_pdf.cjs'));
const PortableRender = requireCjs(resolve(process.cwd(), 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs'));
const PDFLib = requireCjs(resolve(process.cwd(), 'desktop/mcp/vendor/pdf-lib.min.js'));
const XLSX = requireCjs(resolve(process.cwd(), 'runtime_assets/document/sheetjs-0.20.3/xlsx.full.min.js'));
const { makeZip } = requireCjs(resolve(process.cwd(), 'desktop/mcp/zip_writer.cjs'));

const tmp = mkdtempSync(join(tmpdir(), 'alloflow-wave4-mcp-'));
const chromiumInfo = Driver.resolveChromium();
const needsChromium = (fn) => async () => {
  if (!chromiumInfo.installed) return;
  await fn();
};

const driver = Driver.createDriver({ log: () => {} });

afterAll(async () => {
  await driver.close().catch(() => {});
  rmSync(tmp, { recursive: true, force: true });
});

function buildMinimalDocx() {
  return makeZip([
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      name: 'word/document.xml',
      data: '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Wave 4 DOCX Offline Fixture Heading</w:t></w:r></w:p><w:p><w:r><w:t>Accessible paragraph content from Word.</w:t></w:r></w:p></w:body></w:document>',
    },
  ]);
}

function buildMinimalPptx() {
  return makeZip([
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>',
    },
    {
      name: 'ppt/slides/slide1.xml',
      data: '<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Wave 4 PPTX Slide Title</a:t></a:r></a:p><a:p><a:r><a:t>Slide bullet content for accessibility testing.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
    },
  ]);
}

const MULTI_SCRIPT_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>دليل الوصول متعدد اللغات — Multilingual Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');
    body { font-family: sans-serif; line-height: 1.5; color: #111; background: #fff; margin: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #333; padding: 6px; }
  </style>
</head>
<body>
  <main>
    <h1 id="top">دليل الوصول متعدد اللغات</h1>
    <p>مرحبا بكم في هذا المستند التعليمي. يشمل النص العربي <strong>تشكيل الحروف</strong> ورابطا داخليا <a href="#sec-asian">الانتقال إلى القسم الآسيوي</a> ورابطا خارجيا <a href="https://example.org/guide?a=1&amp;b=2">دليل المعايير</a>.</p>
    <h2 id="sec-asian">اللغات الآسيوية — CJK &amp; Indic</h2>
    <ul>
      <li>العربية: السلام عليكم ورحمة الله</li>
      <li>中文 (简体): 无障碍文档指南 — <em>完全离线</em></li>
      <li>日本語: アクセシブルなPDFの作成</li>
      <li>हिन्दी: सुगम्य दस्तावेज़ मार्गदर्शिका</li>
    </ul>
    <table>
      <caption>جدول المقارنة</caption>
      <thead>
        <tr><th scope="col">اللغة</th><th scope="col">مثال</th></tr>
      </thead>
      <tbody>
        <tr><td>العربية</td><td>مثال تطبيقي ١٢٣</td></tr>
        <tr><td>中文</td><td>测试数据 456</td></tr>
        <tr><td>हिन्दी</td><td>परीक्षण 789</td></tr>
      </tbody>
    </table>
  </main>
</body>
</html>`;

const LATIN_FAST_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Water Cycle Summary</title>
</head>
<body>
  <main>
    <h1>Water Cycle Summary</h1>
    <p>Water evaporates from lakes and oceans, condenses into clouds, and returns as rain or snow.</p>
    <h2>Key Stages</h2>
    <ul>
      <li>Evaporation driven by solar energy.</li>
      <li>Condensation in cooler upper air.</li>
      <li>Precipitation returning to the watershed.</li>
    </ul>
  </main>
</body>
</html>`;

describe('Wave 4 W4-M1: 100% offline Standard-14 & AcroForm local OS font substitution', () => {
  it('exposes the exact frozen 36-URL substitute route map and validates TrueType-only buffers strictly', () => {
    expect(Driver.SUBSTITUTE_FONT_ROUTES.size).toBe(36);
    for (const url of Driver.SUBSTITUTE_FONT_ROUTES.keys()) {
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.search).toBe('');
      expect(parsed.hash).toBe('');
    }
    expect(Driver.SUBSTITUTE_FONT_ROUTES.has('https://cdn.jsdelivr.net/npm/unrelated@1.0.0/evil.js')).toBe(false);

    // Reject CFF OpenType ('OTTO'), TrueType Collection ('ttcf'), truncated buffers, and Restricted License fsType.
    const otto = Buffer.alloc(256);
    otto.write('OTTO', 0, 'latin1');
    expect(Driver.validateTrueTypeFontBuffer(otto)).toBe(false);

    const ttcf = Buffer.alloc(256);
    ttcf.write('ttcf', 0, 'latin1');
    expect(Driver.validateTrueTypeFontBuffer(ttcf)).toBe(false);

    expect(Driver.validateTrueTypeFontBuffer(Buffer.from([0x00, 0x01, 0x00, 0x00]))).toBe(false);

    // Resolve local OS fonts on this host and verify Restricted License mutation is rejected.
    const sansReg = Driver.resolveLocalSubstituteFont('sans', 'reg');
    const timesReg = Driver.resolveLocalSubstituteFont('times', 'reg');
    const monoReg = Driver.resolveLocalSubstituteFont('mono', 'reg');
    if (sansReg) {
      expect(Driver.validateTrueTypeFontBuffer(sansReg.bytes)).toBe(true);
      // Flip OS/2 fsType bit 0x0002 (Restricted License) on a copy -> must reject.
      const copy = Buffer.from(sansReg.bytes);
      const numTables = copy.readUInt16BE(4);
      for (let i = 0; i < numTables; i++) {
        const off = 12 + i * 16;
        if (copy.subarray(off, off + 4).toString('latin1') === 'OS/2') {
          const os2Off = copy.readUInt32BE(off + 8);
          copy.writeUInt16BE(0x0002, os2Off + 8);
          break;
        }
      }
      expect(Driver.validateTrueTypeFontBuffer(copy)).toBe(false);
    }
    if (timesReg) expect(Driver.validateTrueTypeFontBuffer(timesReg.bytes)).toBe(true);
    if (monoReg) expect(Driver.validateTrueTypeFontBuffer(monoReg.bytes)).toBe(true);

    // Missing host font dir returns null cleanly without throwing.
    const emptyDir = join(tmp, 'no-fonts');
    mkdirSync(emptyDir, { recursive: true });
    expect(Driver.resolveLocalSubstituteFont('sans', 'reg', { roots: [emptyDir] })).toBeNull();

    // Cross-platform isPathContainedInRoot checks work regardless of host OS.
    expect(Driver.isPathContainedInRoot('c:\\windows\\fonts\\arial.ttf', 'C:\\Windows\\Fonts', 'win32')).toBe(true);
    expect(Driver.isPathContainedInRoot('C:\\Windows\\FontsEvil\\arial.ttf', 'C:\\Windows\\Fonts', 'win32')).toBe(false);
    expect(Driver.isPathContainedInRoot('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts', 'linux')).toBe(true);
    expect(Driver.isPathContainedInRoot('/usr/share/fonts-evil/a.ttf', '/usr/share/fonts', 'linux')).toBe(false);
  });

  it('embeds Standard-14 Helvetica, Times-Roman, and Courier 100% offline and passes real veraPDF PDF/UA-1', needsChromium(async () => {
    const prevOffline = process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
    delete process.env.ALLOFLOW_MCP_OFFLINE_ASSETS; // strict offline default
    try {
      const dir = join(tmp, 'std14');
      mkdirSync(dir, { recursive: true });
      const pdfPath = join(dir, 'standard14.pdf');
      const doc = await PDFLib.PDFDocument.create();
      const helv = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const helvBold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const times = await doc.embedFont(PDFLib.StandardFonts.TimesRoman);
      const cour = await doc.embedFont(PDFLib.StandardFonts.Courier);
      const page = doc.addPage([612, 792]);
      page.drawText('Standard Fourteen Offline Guide', { x: 72, y: 720, size: 22, font: helvBold });
      page.drawText('Sans body text using unembedded Helvetica.', { x: 72, y: 684, size: 12, font: helv });
      page.drawText('Serif citation rendered in unembedded Times Roman.', { x: 72, y: 656, size: 12, font: times });
      page.drawText('CODE-42 monospace line rendered in unembedded Courier.', { x: 72, y: 628, size: 11, font: cour });
      writeFileSync(pdfPath, await doc.save());

      const editedHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Standard Fourteen Offline Guide</title></head><body><main>
        <h1>Standard Fourteen Offline Guide</h1>
        <p>Sans body text using unembedded Helvetica.</p>
        <p>Serif citation rendered in unembedded Times Roman.</p>
        <p>CODE-42 monospace line rendered in unembedded Courier.</p>
      </main></body></html>`;

      const out = await driver.finalizeEdited({
        filePath: pdfPath,
        editedHtml,
        reviewer: 'Wave 4 Offline Verifier',
      });
      expect(out.taggedPdfError).toBeNull();
      expect(out.taggedPdfExportMode).toBe('original_layout');
      expect(out.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
      expect(out.taggedPdfB64).toBeTruthy();

      const taggedPath = join(dir, 'standard14-tagged.pdf');
      writeFileSync(taggedPath, Buffer.from(out.taggedPdfB64, 'base64'));
      const vera = await driver.validatePdfUaCli({ filePath: taggedPath });
      expect(vera.status).toBe('compliant');
      expect(vera.failedRules).toBe(0);
      expect(vera.failedChecks).toBe(0);
    } finally {
      if (prevOffline === undefined) delete process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
      else process.env.ALLOFLOW_MCP_OFFLINE_ASSETS = prevOffline;
    }
  }));
});

describe('Wave 4 W4-M2: Chromium tagged PDF fallback & Indic ToUnicode PDF/UA-1 compliance', () => {
  it('detects non-Latin/RTL scripts, rejects active HTML, and sanitizes ToUnicode CMap U+0000/U+FEFF/U+FFFE identically to portable', () => {
    expect(ChromiumPdf.detectNonLatinOrShapingScript(LATIN_FAST_HTML, 'en').needsChromium).toBe(false);
    expect(ChromiumPdf.detectNonLatinOrShapingScript(MULTI_SCRIPT_HTML, 'ar')).toMatchObject({
      needsChromium: true,
      isRtl: true,
    });
    expect(ChromiumPdf.detectNonLatinOrShapingScript('<html lang="hi"><body><p>सुगम्य</p></body></html>', 'hi')).toMatchObject({
      needsChromium: true,
      script: 'devanagari',
    });
    expect(ChromiumPdf.detectNonLatinOrShapingScript('<html lang="zh"><body><p>无障碍</p></body></html>', 'zh')).toMatchObject({
      needsChromium: true,
      script: 'chinese',
    });

    // Active HTML, active data URLs, and unquoted/alternate external media fail closed.
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<p>ok</p><script>alert(1)</script>')).toThrow(/Active HTML/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<img src="https://example.com/a.png" alt="x">')).toThrow(/External or file-backed/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<img src=https://evil.example/track.png alt="x">')).toThrow(/External or file-backed/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<img srcset="https://evil.example/a.png 2x" alt="x">')).toThrow(/External or file-backed/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<svg><image href="https://evil.example/a.png"/></svg>')).toThrow(/External or file-backed/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<video poster="https://evil.example/p.png"></video>')).toThrow(/External or file-backed/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<audio src="https://evil.example/a.mp3"></audio>')).toThrow(/External or file-backed/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<a href="javascript:void(0)">x</a>')).toThrow(/Active JavaScript/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<a href="vbscript:msgbox(1)">x</a>')).toThrow(/Active JavaScript/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<a href="data:text/html,<p>x</p>">x</a>')).toThrow(/Active JavaScript|active data/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<img src="data:text/html,<p>x</p>" alt="x">')).toThrow(/Active JavaScript|active data/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<img src="data:image/svg+xml,<svg/>" alt="x">')).toThrow(/Active JavaScript|active data/i);
    expect(() => ChromiumPdf.prepareHtmlForChromiumPdf('<p onclick="x()">hi</p>')).toThrow(/Active HTML/i);

    // Benign external font @import is stripped cleanly, dir="rtl" is ensured for RTL lang.
    const prepared = ChromiumPdf.prepareHtmlForChromiumPdf(
      '<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Sans");</style><main><h1>مرحبا</h1></main>',
      { lang: 'ar', title: 'Arabic Title' },
    );
    expect(prepared.html).toContain('lang="ar"');
    expect(prepared.html).toContain('dir="rtl"');
    expect(prepared.html).not.toContain('fonts.googleapis.com');

    // ToUnicode CMap sanitizer parity between MCP module and portable render_tagged_pdf.cjs.
    const sampleCmap = [
      'begincmap',
      '1 begincodespacerange',
      '<0000> <FFFF>',
      'endcodespacerange',
      '3 beginbfchar',
      '<00F8> <0915>',
      '<014A> <0000>',
      '<023D> <FEFF>',
      'endbfchar',
      '3 beginbfrange',
      '<0300> <0301> <FFFE>',
      '<0310> <0311> [<0000> <0916>]',
      '<0400> <0402> <FEFE>',
      'endbfrange',
      'endcmap',
    ].join('\n');
    const mcpFixed = ChromiumPdf.sanitizeToUnicodeCmapStream(sampleCmap);
    const portableFixed = PortableRender.sanitizeToUnicodeCmapStream(sampleCmap);
    expect(mcpFixed).toEqual(portableFixed);
    expect(mcpFixed.fixedCount).toBe(5);
    expect(mcpFixed.text).toContain('<0000> <FFFF>'); // codespacerange untouched!
    expect(mcpFixed.text).toContain('<014A> <200D>');
    expect(mcpFixed.text).toContain('<023D> <200D>');
    expect(mcpFixed.text).toContain('<0300> <0301> [<200D> <FFFF>]');
    expect(mcpFixed.text).toContain('<0310> <0311> [<200D> <0916>]');
    expect(mcpFixed.text).toContain('<0400> <0402> [<FEFE> <200D> <FF00>]');

    // Cross-line source-CID regression: <0000> in source CID slots MUST NEVER be corrupted.
    const sourceCidCmap = [
      'begincmap',
      '2 beginbfchar',
      '<0001> <0041>',
      '<0000> <0042>',
      'endbfchar',
      '2 beginbfrange',
      '<0001> <0002> <0041>',
      '<0000> <0010> <0020>',
      'endbfrange',
      'endcmap',
    ].join('\n');
    const srcMcp = ChromiumPdf.sanitizeToUnicodeCmapStream(sourceCidCmap);
    const srcPortable = PortableRender.sanitizeToUnicodeCmapStream(sourceCidCmap);
    expect(srcMcp).toEqual(srcPortable);
    expect(srcMcp.fixedCount).toBe(0);
    expect(srcMcp.text).toBe(sourceCidCmap);
  });

  it('honors an aborted AbortSignal immediately in renderHtmlToTaggedPdf', async () => {
    const ac = new AbortController();
    ac.abort(new Error('user cancelled'));
    const fakeBrowser = { newContext: () => { throw new Error('must not launch context after abort'); } };
    await expect(ChromiumPdf.renderHtmlToTaggedPdf(fakeBrowser, LATIN_FAST_HTML, { signal: ac.signal }))
      .rejects.toThrow(/user cancelled/i);
  });

  it('renders Arabic RTL + CJK + Japanese + Devanagari Hindi offline via Chromium and passes view_pdf_validator + real veraPDF PDF/UA-1 (0 failures)', needsChromium(async () => {
    const out = await driver.renderTypesetTaggedPdf({
      html: MULTI_SCRIPT_HTML,
      lang: 'ar',
    });
    expect(out.engine).toBe('chromium-tagged-pdf');
    expect(out.exportMode).toBe('clean_rebuild');
    expect(out.blockedNetworkRequests).toBe(0);
    expect(out.delivery).toEqual({ ok: true, code: 'verified', reason: '' });
    expect(out.postExportValidator.summary.overall).toBe('PASS');
    expect(out.pdfUaFinalization.cmapEntriesFixed).toBeGreaterThanOrEqual(1);
    expect(out.pdfUaFinalization.linkContentsAdded).toBeGreaterThanOrEqual(1);

    const pdfPath = join(tmp, 'multi-script-mcp.pdf');
    writeFileSync(pdfPath, out.bytes);
    const vera = await driver.validatePdfUaCli({ filePath: pdfPath });
    expect(vera.status).toBe('compliant');
    expect(vera.failedRules).toBe(0);
    expect(vera.failedChecks).toBe(0);
  }));

  it('keeps pure-Latin HTML on the pdflib-typeset fast path offline', needsChromium(async () => {
    const out = await driver.renderTypesetTaggedPdf({
      html: LATIN_FAST_HTML,
      title: 'Water Cycle Summary',
      lang: 'en',
    });
    expect(out.engine).toBe('pdflib-typeset');
    expect(out.fallbackReason).toBeNull();
    expect(out.delivery).toEqual({ ok: true, code: 'verified', reason: '' });
    expect(out.bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  }));

  it('portable render_tagged_pdf.cjs CLI passes real veraPDF PDF/UA-1 (0 failures) on Devanagari + Arabic RTL HTML', needsChromium(async () => {
    const dir = join(tmp, 'portable-indic');
    mkdirSync(dir, { recursive: true });
    const htmlPath = join(dir, 'indic.html');
    const pdfPath = join(dir, 'indic.pdf');
    const cleanPortableHtml = MULTI_SCRIPT_HTML.replace(/@import[^;]+;/gi, '');
    writeFileSync(htmlPath, cleanPortableHtml, 'utf8');
    const res = spawnSync(process.execPath, [
      resolve(process.cwd(), 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs'),
      '--html', htmlPath, '--pdf', pdfPath, '--pdfua-id', '1',
    ], { encoding: 'utf8', timeout: 60000 });
    expect(res.status, res.stderr).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.pdfUaFinalization.cmapEntriesFixed).toBeGreaterThanOrEqual(1);
    const vera = await driver.validatePdfUaCli({ filePath: pdfPath });
    expect(vera.status).toBe('compliant');
    expect(vera.failedRules).toBe(0);
    expect(vera.failedChecks).toBe(0);
  }));
});

describe('Wave 4 W4-M3: Multi-format offline ingestion matrix & clean_rebuild smoke', () => {
  it('ingests .xlsx, .xlsm, .csv, .md, .png, .docx, and .pptx deterministically offline', needsChromium(async () => {
    const dir = join(tmp, 'multi-format');
    mkdirSync(dir, { recursive: true });

    // .xlsx & .xlsm (real SheetJS workbooks)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Topic', 'Score'], ['Accessibility', 99], ['Unicode', 100]]);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    const xlsxBytes = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const xlsxPath = join(dir, 'grades.xlsx');
    const xlsmPath = join(dir, 'macro-grades.xlsm');
    writeFileSync(xlsxPath, xlsxBytes);
    writeFileSync(xlsmPath, xlsxBytes);

    // .csv, .md, .png, .docx, .pptx
    const csvPath = join(dir, 'table.csv');
    writeFileSync(csvPath, 'Region,Count\nNorth,12\nSouth,18\n', 'utf8');
    const mdPath = join(dir, 'notes.md');
    writeFileSync(mdPath, '# Wave 4 Notes\n\nPlain markdown body for offline ingestion.\n', 'utf8');
    const pngPath = join(dir, 'pixel.png');
    writeFileSync(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
    const docxPath = join(dir, 'lesson.docx');
    writeFileSync(docxPath, buildMinimalDocx());
    const pptxPath = join(dir, 'deck.pptx');
    writeFileSync(pptxPath, buildMinimalPptx());

    const rXlsx = await driver.extractDocumentText({ filePath: xlsxPath });
    expect(rXlsx.error).toBeNull();
    expect(rXlsx.text).toContain('Accessibility');

    const rXlsm = await driver.extractDocumentText({ filePath: xlsmPath });
    expect(rXlsm.error).toBeNull();
    expect(rXlsm.text).toContain('Unicode');

    const rCsv = await driver.extractDocumentText({ filePath: csvPath });
    expect(rCsv.text).toContain('North,12');

    const rMd = await driver.extractDocumentText({ filePath: mdPath });
    expect(rMd.text).toContain('Wave 4 Notes');

    const rDocx = await driver.extractDocumentText({ filePath: docxPath });
    expect(rDocx.text).toContain('Wave 4 DOCX Offline Fixture Heading');

    const rPptx = await driver.extractDocumentText({ filePath: pptxPath });
    expect(rPptx.text).toContain('Wave 4 PPTX Slide Title');

    const pngB64 = driver._readDocBase64(pngPath);
    expect(Buffer.from(pngB64, 'base64').subarray(0, 4).toString('hex')).toBe('89504e47');
  }));

  it('produces a verified Chromium clean_rebuild tagged PDF from non-PDF Arabic DOCX via remediate({ exportMode: "clean_rebuild" }) and passes real veraPDF PDF/UA-1', needsChromium(async () => {
    const dir = join(tmp, 'clean-rebuild-docx');
    mkdirSync(dir, { recursive: true });
    const docxPath = join(dir, 'arabic-guide.docx');
    const arTitle = 'دليل الوصول';
    const arBody = 'مرحبا بكم في هذا الدليل التعليمي الشامل حول إمكانية الوصول الرقمي للمستندات.';
    const docxBytes = makeZip([
      {
        name: '[Content_Types].xml',
        data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      },
      {
        name: '_rels/.rels',
        data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      },
      {
        name: 'word/document.xml',
        data: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${arTitle}</w:t></w:r></w:p><w:p><w:r><w:t>${arBody}</w:t></w:r></w:p></w:body></w:document>`,
      },
    ]);
    writeFileSync(docxPath, docxBytes);

    const auditPdfReply = JSON.stringify({
      score: 48,
      summary: 'Source DOCX needs accessible HTML structure.',
      documentLanguage: 'ar',
      critical: [{ issue: 'Missing document landmark structure', wcag: '1.3.1', location: 'document' }],
      serious: [],
      moderate: [],
      minor: [],
    });
    const auditHtmlReply = JSON.stringify({
      score: 98,
      summary: 'Verified accessible Arabic HTML.',
      documentLanguage: 'ar',
      issues: [],
      critical: [],
      serious: [],
      moderate: [],
      minor: [],
    });
    const modelBridge = async (req) => {
      const prompt = String((req && req.prompt) || '');
      if (/Reply with exactly: OK/.test(prompt)) return 'OK';
      if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return auditPdfReply;
      if (/Audit this HTML/i.test(prompt)) return auditHtmlReply;
      if (/Return ONLY a JSON array/i.test(prompt)) {
        return JSON.stringify([
          { type: 'h1', text: arTitle, id: 'ar-h1' },
          { type: 'p', text: arBody, id: 'ar-p1' },
        ]);
      }
      if (/Extract ALL text content/i.test(prompt)) return `# ${arTitle}\n\n${arBody}`;
      if (/raw HTML only|do NOT wrap in JSON|Return the COMPLETE fixed HTML|Return ONLY the fixed fragment/i.test(prompt)) {
        return `<h1>${arTitle}</h1><p>${arBody}</p>`;
      }
      if (/JSON array/i.test(prompt)) return '[]';
      if (/\bJSON\b/i.test(prompt)) return '{}';
      return `<h1>${arTitle}</h1><p>${arBody}</p>`;
    };

    const out = await driver.remediate({
      filePath: docxPath,
      modelBridge,
      targetScore: 95,
      fixPasses: 0,
      polishPasses: 0,
      exportMode: 'clean_rebuild',
    });
    expect(out.accessibleHtml).toBeTruthy();
    expect(out.taggedPdfError).toBeNull();
    expect(out.taggedPdfExportMode).toBe('clean_rebuild');
    expect(out.taggedPdfEngine).toBe('chromium-tagged-pdf');
    expect(out.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
    const pdfBytes = Buffer.from(out.taggedPdfB64, 'base64');
    expect(pdfBytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const outPdfPath = join(dir, 'arabic-guide-tagged.pdf');
    writeFileSync(outPdfPath, pdfBytes);
    const vera = await driver.validatePdfUaCli({ filePath: outPdfPath });
    expect(vera.status).toBe('compliant');
    expect(vera.failedRules).toBe(0);
    expect(vera.failedChecks).toBe(0);
  }));
});
