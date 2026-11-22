// Wave 8A verification suite:
//   (a) Zero-Chromium Node fast path for deterministic MCP exports (EPUB3, DAISY, BRF, DOCX, ODT)
//   (b) remediation_headless_driver.cjs fast-path routing + transparent Chromium fallback
//   (c) Unified byte-level PDF/UA validator shared between view_pdf_validator_module.js & CLI
import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const NodeExporters = require(resolve(ROOT, 'desktop/mcp/remediation_node_exporters.cjs'));
const Driver = require(resolve(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'));
const CoreValidator = require(resolve(ROOT, 'view_pdf_validator_module.js'));
const CliValidator = require(resolve(ROOT, 'dev-tools/demo/exported_pdf_validator.cjs'));
const PDFLib = require(resolve(ROOT, 'desktop/mcp/vendor/pdf-lib.min.js'));
const JSZip = require(resolve(ROOT, 'node_modules/jszip'));

const scratch = mkdtempSync(join(tmpdir(), 'alloflow-wave8-mcp-val-'));
afterAll(() => {
  NodeExporters.resetNodeExporterCache();
  rmSync(scratch, { recursive: true, force: true });
});

const PNG_1X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const PNG_1X1 = Buffer.from(PNG_1X1_B64, 'base64');

const RICH_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Wave 8 Accessibility Guide</title></head>
<body>
<main>
  <h1 id="top">Wave 8 Accessibility Guide</h1>
  <p>Caf\u00e9 study for 2026 &amp; beyond with <strong>bold</strong> and <a href="https://example.org/guide">reference link</a>.</p>
  <h2 id="metrics">Reading Metrics</h2>
  <p>Students read 128 words per minute across 3 trials.</p>
  <table>
    <caption>Weekly Fluency</caption>
    <thead><tr><th scope="col">Week</th><th scope="col">Score</th></tr></thead>
    <tbody><tr><th scope="row">Week 1</th><td>94</td></tr></tbody>
  </table>
  <figure>
    <img src="data:image/png;base64,${PNG_1X1_B64}" alt="Single pixel reference chart">
    <figcaption>Reference chart</figcaption>
  </figure>
  <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Simple dot"><circle cx="4" cy="4" r="3"/></svg>
</main>
</body>
</html>`;

async function buildPassingPdfBytes() {
  const {
    PDFDocument, PDFName, PDFArray, PDFDict, PDFRawStream, PDFString, PDFNumber, PDFBool,
  } = PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle('Wave 8 Unified Validator Passing Sample');
  const page = doc.addPage([612, 792]);
  const ctx = doc.context;

  // Link annotation with /Contents and /StructParent, plus /Tabs /S on the page
  const annotRef = ctx.register(ctx.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: [72, 700, 200, 720],
    Contents: PDFString.of('External reference link'),
    StructParent: PDFNumber.of(1),
  }));
  page.node.set(PDFName.of('Annots'), ctx.obj([annotRef]));
  page.node.set(PDFName.of('Tabs'), PDFName.of('S'));

  // Minimal valid StructTreeRoot with H1, Table -> TR -> TH (with /Scope), and Figure (with /Alt)
  const h1Mcr = ctx.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(0) });
  const h1Ref = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('H1'),
    Pg: page.ref,
    K: h1Mcr,
    ActualText: PDFString.of('Wave 8 Heading'),
  }));

  const thAttrRef = ctx.register(ctx.obj({ O: PDFName.of('Table'), Scope: PDFName.of('Column') }));
  const thMcr = ctx.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(1) });
  const thRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('TH'),
    Pg: page.ref,
    A: thAttrRef,
    K: thMcr,
    ActualText: PDFString.of('Column A'),
  }));
  const trRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('TR'),
    K: ctx.obj([thRef]),
  }));
  const tableRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('Table'),
    K: ctx.obj([trRef]),
  }));

  const figMcr = ctx.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(2) });
  const figRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('Figure'),
    Pg: page.ref,
    K: figMcr,
    Alt: PDFString.of('Diagram illustrating unified validation'),
  }));

  const docElemRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('Document'),
    K: ctx.obj([h1Ref, tableRef, figRef]),
  }));

  const parentTreeRef = ctx.register(ctx.obj({ Nums: PDFArray.withContext(ctx) }));
  const stRootRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructTreeRoot'),
    K: docElemRef,
    ParentTree: parentTreeRef,
  }));
  doc.catalog.set(PDFName.of('StructTreeRoot'), stRootRef);
  doc.catalog.set(PDFName.of('MarkInfo'), ctx.obj({ Marked: PDFBool.True }));
  doc.catalog.set(PDFName.of('Lang'), PDFString.of('en-US'));
  doc.catalog.set(PDFName.of('ViewerPreferences'), ctx.obj({ DisplayDocTitle: PDFBool.True }));

  const outlineItemRef = ctx.register(ctx.obj({ Title: PDFString.of('Wave 8 Heading') }));
  const outlinesRef = ctx.register(ctx.obj({
    Type: PDFName.of('Outlines'),
    First: outlineItemRef,
    Last: outlineItemRef,
    Count: PDFNumber.of(1),
  }));
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);

  const xmp = [
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">',
    '<dc:title><rdf:Alt><rdf:li xml:lang="x-default">Wave 8 Unified Validator Passing Sample</rdf:li></rdf:Alt></dc:title>',
    '<pdfuaid:part>1</pdfuaid:part>',
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('');
  const metaDict = PDFDict.fromMapWithContext(new Map([
    [PDFName.of('Type'), PDFName.of('Metadata')],
    [PDFName.of('Subtype'), PDFName.of('XML')],
  ]), ctx);
  doc.catalog.set(PDFName.of('Metadata'), ctx.register(PDFRawStream.of(metaDict, new TextEncoder().encode(xmp))));

  return doc.save();
}

async function buildFailingPdfBytes() {
  const { PDFDocument, PDFName, PDFString, PDFNumber } = PDFLib;
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const ctx = doc.context;

  // Annotated page missing /Tabs /S, and link annotation missing /Contents and /StructParent
  const annotRef = ctx.register(ctx.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: [10, 10, 100, 30],
  }));
  page.node.set(PDFName.of('Annots'), ctx.obj([annotRef]));

  // TH without /Scope (only an empty /A dict), orphaned Figure with whitespace-only /Alt
  const badAttrRef = ctx.register(ctx.obj({ O: PDFName.of('Table') }));
  const badThRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('TH'),
    A: badAttrRef,
  }));
  const badFigRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('Figure'),
    Alt: PDFString.of('   '),
  }));
  const stRootRef = ctx.register(ctx.obj({
    Type: PDFName.of('StructTreeRoot'),
    K: ctx.obj([badThRef, badFigRef]),
  }));
  doc.catalog.set(PDFName.of('StructTreeRoot'), stRootRef);

  return doc.save();
}

async function buildCompressedXmpPdfBytes() {
  const { PDFDocument, PDFName, PDFDict, PDFRawStream } = PDFLib;
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const ctx = doc.context;
  const metaDict = PDFDict.fromMapWithContext(new Map([
    [PDFName.of('Type'), PDFName.of('Metadata')],
    [PDFName.of('Subtype'), PDFName.of('XML')],
    [PDFName.of('Filter'), PDFName.of('FlateDecode')],
  ]), ctx);
  doc.catalog.set(PDFName.of('Metadata'), ctx.register(PDFRawStream.of(metaDict, new Uint8Array([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]))));
  return doc.save();
}

describe('Wave 8A (a): remediation_node_exporters.cjs — zero-Chromium deterministic Node exports', () => {
  it('executes EPUB3 (+ validateEpub 0 errors + lossless binary image), DAISY, and BRF in Node in <500ms', async () => {
    // Prime jsdom/module cache once so the timing check measures real export work cleanly,
    // while still confirming total boot + 3 exports stays fast.
    expect(NodeExporters.isNodeExporterAvailable()).toBe(true);

    const t0 = performance.now();
    const epub = await NodeExporters.exportAltFormatNode({ html: RICH_HTML, title: 'Wave 8 Guide', format: 'epub' });
    const daisy = await NodeExporters.exportAltFormatNode({ html: RICH_HTML, title: 'Wave 8 Guide', format: 'daisy' });
    const brf = await NodeExporters.exportAltFormatNode({ html: RICH_HTML, title: 'Wave 8 Guide', format: 'brf' });
    const elapsedMs = performance.now() - t0;

    expect(elapsedMs).toBeLessThan(500);

    // EPUB3 assertions: validateEpub 0 errors, OCF mimetype stored first, externalized PNG lossless, XHTML+SVG valid
    expect(epub.supported).toBe(true);
    expect(epub.executionEngine).toBe('node-fast');
    expect(epub.valid).toBe(true);
    expect(epub.selfChecked).toBe(true);
    expect(epub.structuralErrors).toEqual([]);
    expect(epub.navEntries).toBe(2);
    expect(epub.entries).toContain('OEBPS/images/img-1.png');

    const recheck = NodeExporters.validateEpubNode(epub.files);
    expect(recheck.supported).toBe(true);
    expect(recheck.valid).toBe(true);
    expect(recheck.issues.filter((i) => i.severity === 'error')).toEqual([]);

    const epubBuf = Buffer.from(epub.b64, 'base64');
    expect(epubBuf.readUInt16LE(8)).toBe(0); // mimetype STORED
    expect(epubBuf.subarray(38, 58).toString('latin1')).toBe('application/epub+zip');
    const epubZip = await JSZip.loadAsync(epubBuf);
    const xhtml = await epubZip.file('OEBPS/content.xhtml').async('string');
    const opf = await epubZip.file('OEBPS/content.opf').async('string');
    expect(xhtml).toMatch(/^<html[^>]*xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/);
    expect(opf).toMatch(/id="content"[^>]*properties="[^"]*svg/);
    const imgBytes = Buffer.from(await epubZip.file('OEBPS/images/img-1.png').async('nodebuffer'));
    expect(imgBytes.equals(PNG_1X1)).toBe(true);

    // DAISY assertions
    expect(daisy.supported).toBe(true);
    expect(daisy.executionEngine).toBe('node-fast');
    expect(daisy.selfChecked).toBe(false);
    expect(daisy.valid).toBeUndefined();
    expect(daisy.entries.slice().sort()).toEqual(['book.smil', 'dtbook.xml', 'navigation.ncx', 'package.opf']);
    const daisyZip = await JSZip.loadAsync(Buffer.from(daisy.b64, 'base64'));
    expect(await daisyZip.file('dtbook.xml').async('string')).toContain('Wave 8 Accessibility Guide');

    // BRF assertions (real ASCII braille, <=40 cells, number sign #ABH for 128)
    expect(brf.supported).toBe(true);
    expect(brf.executionEngine).toBe('node-fast');
    expect(brf.grade).toBe(1);
    const brfText = Buffer.from(brf.b64, 'base64').toString('ascii');
    expect(brfText.replace(/[\x20-\x5f\r\n]/g, '')).toBe('');
    expect(brfText.split('\r\n').filter((line) => line.length > 40)).toEqual([]);
    expect(brfText).toContain('#ABH');
  });

  it('executes DOCX and ODT in Node fast path and returns { supported: false } for pptx or missing jsdom', async () => {
    const docx = await NodeExporters.exportAccessibleOfficeNode({ html: RICH_HTML, title: 'Wave 8 Guide', format: 'docx' });
    expect(docx.supported).toBe(true);
    expect(docx.executionEngine).toBe('node-fast');
    expect(docx.fileName).toBe('Wave 8 Guide-accessible.docx');
    const docxZip = await JSZip.loadAsync(Buffer.from(docx.b64, 'base64'));
    const docXml = await docxZip.file('word/document.xml').async('string');
    expect(docXml).toContain('Heading1');
    expect(docXml).toContain('Wave 8 Accessibility Guide');
    expect(docXml).toContain('<w:tblHeader/>');

    const odt = await NodeExporters.exportAccessibleOfficeNode({ html: RICH_HTML, title: 'Wave 8 Guide', format: 'odt' });
    expect(odt.supported).toBe(true);
    expect(odt.executionEngine).toBe('node-fast');
    expect(odt.fileName).toBe('Wave 8 Guide-accessible.odt');
    const odtZip = await JSZip.loadAsync(Buffer.from(odt.b64, 'base64'));
    expect(await odtZip.file('content.xml').async('string')).toContain('Wave 8 Accessibility Guide');

    const pptx = await NodeExporters.exportAccessibleOfficeNode({ html: RICH_HTML, title: 'Wave 8 Guide', format: 'pptx' });
    expect(pptx).toEqual({ supported: false, reason: 'unsupported-format' });

    const noJsdomAlt = await NodeExporters.exportAltFormatNode({
      html: RICH_HTML,
      title: 'Fallback',
      format: 'epub',
      _loadJsdom: () => null,
    });
    expect(noJsdomAlt).toEqual({ supported: false, reason: 'jsdom-unavailable' });

    const noJsdomOffice = await NodeExporters.exportAccessibleOfficeNode({
      html: RICH_HTML,
      title: 'Fallback',
      format: 'docx',
      _loadJsdom: () => null,
    });
    expect(noJsdomOffice).toEqual({ supported: false, reason: 'jsdom-unavailable' });
  });
});

describe('Wave 8A (b): remediation_headless_driver.cjs routing & fallback', () => {
  it('routes exportAltFormat & exportAccessibleOffice through node-fast with zero Chromium launch', async () => {
    const logs = [];
    const driver = Driver.createDriver({ log: (m) => logs.push(String(m)) });
    try {
      const epub = await driver.exportAltFormat({ html: RICH_HTML, title: 'Driver Fast', format: 'epub' });
      expect(epub.executionEngine).toBe('node-fast');
      expect(epub.valid).toBe(true);
      expect(epub.structuralErrors).toEqual([]);
      expect(epub.entries).toContain('OEBPS/content.opf');
      // Internal helper fields from node runner must not leak into driver return schema
      expect(epub.supported).toBeUndefined();
      expect(epub.files).toBeUndefined();

      const daisy = await driver.exportAltFormat({ html: RICH_HTML, title: 'Driver Fast', format: 'daisy' });
      expect(daisy.executionEngine).toBe('node-fast');
      expect(daisy.selfChecked).toBe(false);
      expect(daisy.valid).toBeUndefined();

      const brf = await driver.exportAltFormat({ html: RICH_HTML, title: 'Driver Fast', format: 'brf' });
      expect(brf.executionEngine).toBe('node-fast');
      expect(brf.grade).toBe(1);

      const docx = await driver.exportAccessibleOffice({ html: RICH_HTML, title: 'Driver Fast', format: 'docx' });
      expect(docx.executionEngine).toBe('node-fast');
      expect(docx.fileName).toBe('Driver Fast-accessible.docx');

      const odt = await driver.exportAccessibleOffice({ html: RICH_HTML, title: 'Driver Fast', format: 'odt' });
      expect(odt.executionEngine).toBe('node-fast');
      expect(odt.fileName).toBe('Driver Fast-accessible.odt');

      expect(logs.some((m) => m.includes('node-fast'))).toBe(true);
    } finally {
      await driver.close();
    }
  });

  it('falls back transparently to Chromium when node-fast is unavailable or disabled', async () => {
    const chrome = Driver.resolveChromium();
    if (!chrome.installed) return;
    const logs = [];
    const driver = Driver.createDriver({ log: (m) => logs.push(String(m)) });
    try {
      const fallbackBrf = await driver.exportAltFormat({
        html: RICH_HTML,
        title: 'Fallback Test',
        format: 'brf',
        _loadJsdom: () => null,
      });
      expect(fallbackBrf.executionEngine).toBe('chromium');
      expect(fallbackBrf.grade).toBe(1);
      expect(Buffer.from(fallbackBrf.b64, 'base64').toString('ascii')).toContain('#ABH');
      expect(logs.some((m) => m.includes('jsdom-unavailable') && m.includes('falling back to Chromium'))).toBe(true);

      const disabledEpub = await driver.exportAltFormat({
        html: RICH_HTML,
        title: 'Disabled Fast Path',
        format: 'epub',
        disableNodeFastPath: true,
      });
      expect(disabledEpub.executionEngine).toBe('chromium');
      expect(disabledEpub.valid).toBe(true);
    } finally {
      await driver.close();
    }
  }, 60_000);
});

describe('Wave 8A (c): Unified byte-level PDF/UA validator (browser UMD + Node CJS + CLI)', () => {
  function loadBrowserValidator() {
    const sandbox = {
      window: { PDFLib, AlloModules: {} },
      console: { log() {} },
      TextDecoder,
      Map,
      Set,
      WeakSet,
      Uint8Array,
      ArrayBuffer,
    };
    vm.createContext(sandbox);
    vm.runInContext(readFileSync(resolve(ROOT, 'view_pdf_validator_module.js'), 'utf8'), sandbox);
    return sandbox.window.AlloModules.PdfValidator;
  }

  it('shares the exact single validator core across Node CJS, CLI wrapper, and browser UMD', () => {
    expect(CliValidator.CORE_VALIDATOR).toBe(CoreValidator);
    expect(typeof CoreValidator.validatePdfStructure).toBe('function');
    expect(CoreValidator.validatePdfStructure).toBe(CoreValidator.validateExportedPdfBytes);
    expect(Object.isFrozen(CoreValidator)).toBe(true);
  });

  it('returns identical results across browser UMD, Node CJS, and CLI on passing and failing PDF/UA structures', async () => {
    const browserVal = loadBrowserValidator();
    const passBytes = await buildPassingPdfBytes();
    const failBytes = await buildFailingPdfBytes();

    const passBrowser = await browserVal.validateExportedPdfBytes(passBytes);
    const passNode = await CoreValidator.validatePdfStructure(passBytes, { pdfLib: PDFLib });
    const passCliBytes = await CliValidator.validatePdfBytes(passBytes);
    expect(passBrowser.summary.overall).toBe('PASS');
    expect(passBrowser.summary.fail).toBe(0);
    expect(passNode).toEqual(passBrowser);
    expect(passCliBytes).toEqual(passBrowser);

    const failBrowser = await browserVal.validateExportedPdfBytes(failBytes);
    const failNode = await CoreValidator.validatePdfStructure(failBytes, { pdfLib: PDFLib });
    const failCliBytes = await CliValidator.validatePdfBytes(failBytes);
    expect(failBrowser.summary.overall).toBe('FAIL');
    expect(failBrowser.summary.fail).toBeGreaterThan(0);
    expect(failNode).toEqual(failBrowser);
    expect(failCliBytes).toEqual(failBrowser);

    // Verify specific Wave 5/core rules are enforced identically on CLI (no drift!)
    const failByRule = Object.fromEntries(failCliBytes.checks.map((c) => [c.rule, c.status]));
    expect(failByRule['StructTreeRoot has /ParentTree']).toBe('fail');
    expect(failByRule['Every TH has /Scope']).toBe('fail');
    expect(failByRule['Every Figure has /Alt']).toBe('fail');
    expect(failByRule['Pages with annotations set /Tabs /S (PDF/UA 7.18.3)']).toBe('fail');
    expect(failByRule['Link annotations have /Contents (PDF/UA 7.18.5)']).toBe('fail');
    expect(failByRule['Link annotations reachable from the tag tree (/StructParent)']).toBe('fail');

    // Exercise real CLI file path execution (--json) for both passing (exit 0) and failing (exit 1) PDFs
    const passPath = join(scratch, 'passing.pdf');
    const failPath = join(scratch, 'failing.pdf');
    writeFileSync(passPath, passBytes);
    writeFileSync(failPath, failBytes);

    const passFileReport = await CliValidator.validatePdf(passPath);
    expect(passFileReport.file).toBe('passing.pdf');
    expect(passFileReport.summary).toEqual(passBrowser.summary);
    expect(passFileReport.checks).toEqual(passBrowser.checks);

    const cliJsonOut = execFileSync(
      process.execPath,
      [resolve(ROOT, 'dev-tools/demo/exported_pdf_validator.cjs'), '--json', passPath],
      { cwd: ROOT, encoding: 'utf8', timeout: 30_000 },
    );
    const cliParsed = JSON.parse(cliJsonOut);
    expect(cliParsed.summary).toEqual(passBrowser.summary);
    expect(cliParsed.checks).toEqual(passBrowser.checks);

    let failExitCode = 0;
    let failStdout = '';
    try {
      execFileSync(
        process.execPath,
        [resolve(ROOT, 'dev-tools/demo/exported_pdf_validator.cjs'), '--json', failPath],
        { cwd: ROOT, encoding: 'utf8', timeout: 30_000 },
      );
    } catch (e) {
      failExitCode = e.status;
      failStdout = e.stdout;
    }
    expect(failExitCode).toBe(1);
    const failParsed = JSON.parse(failStdout);
    expect(failParsed.summary).toEqual(failBrowser.summary);
    expect(failParsed.checks).toEqual(failBrowser.checks);
  });

  it('reports compressed/unreadable XMP as warn (never silent pass) and normalizes pdfBytes in encryption fallback', async () => {
    const browserVal = loadBrowserValidator();
    const xmpBytes = await buildCompressedXmpPdfBytes();

    const browserReport = await browserVal.validateExportedPdfBytes(xmpBytes);
    const cliReport = await CliValidator.validatePdfBytes(xmpBytes);
    expect(cliReport).toEqual(browserReport);
    expect(cliReport.uaClaim.xmpUnreadable).toBe(true);
    expect(cliReport.uaClaim.evidenceBacked).toBeNull();
    const byRule = Object.fromEntries(cliReport.checks.map((c) => [c.rule, c.status]));
    expect(byRule['XMP metadata stream present (/Metadata, PDF/UA 7.1)']).toBe('pass');
    expect(byRule['XMP dc:title non-empty (PDF/UA 7.1)']).toBe('warn');
    expect(byRule['PDF/UA declaration is evidence-backed (XMP ↔ content linkage)']).toBe('warn');

    // Verify normalized pdfBytes (Uint8Array) is passed to PDFDocument.load in BOTH loads
    // (including the encryption fallback when doc.isEncrypted is omitted) even when caller passes an ArrayBuffer!
    const loadInputs = [];
    const wrappedPdfLib = Object.assign({}, PDFLib, {
      PDFDocument: {
        async load(input, opts) {
          loadInputs.push({ isU8: input instanceof Uint8Array, len: input && input.byteLength, ignoreEncryption: opts && opts.ignoreEncryption });
          const doc = await PDFLib.PDFDocument.load(input, opts);
          // Hide boolean isEncrypted on first call so the encryption fallback branch executes!
          return new Proxy(doc, {
            get(target, prop, receiver) {
              if (prop === 'isEncrypted') return undefined;
              const val = Reflect.get(target, prop, target);
              return typeof val === 'function' ? val.bind(target) : val;
            },
          });
        },
      },
    });
    const ab = xmpBytes.buffer.slice(xmpBytes.byteOffset, xmpBytes.byteOffset + xmpBytes.byteLength);
    const abReport = await CoreValidator.validatePdfStructure(ab, { pdfLib: wrappedPdfLib });
    expect(abReport.byteLength).toBe(xmpBytes.byteLength);
    expect(loadInputs).toHaveLength(2);
    expect(loadInputs[0]).toEqual({ isU8: true, len: xmpBytes.byteLength, ignoreEncryption: true });
    expect(loadInputs[1]).toEqual({ isU8: true, len: xmpBytes.byteLength, ignoreEncryption: false });
  });
});
