// Validator-parity golden: the in-app self-check (what Canvas users see —
// they have no Java/veraPDF) must agree with the pipeline's evidence-based
// gate and the ISO contracts. Before the 2026-06-12 parity rules it actively
// CONTRADICTED the shipped declaration on any document with a list (pure-
// marker /Lbl counted as an orphan). This golden tags a fixture containing
// every structure class — heading, two-line paragraph, table, list, image,
// link annotation — and asserts the validator's verdicts match reality.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const VALIDATOR_PATH = path.resolve(__dirname, '../../view_pdf_validator_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let report: any = null;

test.describe('in-app validator parity with the evidence-based gate', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: PIPELINE_PATH });
    await page.addScriptTag({ path: VALIDATOR_PATH });

    report = await page.evaluate(async () => {
      try {
        const PDFLib = (window as any).PDFLib;
        const { PDFDocument, StandardFonts, PDFName, PDFNumber, PDFString, PDFArray, PDFDict } = PDFLib;
        const inDoc = await PDFDocument.create();
        const pg = inDoc.addPage([612, 792]);
        const font = await inDoc.embedFont(StandardFonts.Helvetica);
        let y = 740;
        pg.drawText('Parity Heading Example', { x: 50, y, size: 22, font }); y -= 32;
        pg.drawText('This body paragraph matches the accessible html exactly', { x: 50, y, size: 12, font }); y -= 16;
        pg.drawText('and continues onto a second drawn line for the run test.', { x: 50, y, size: 12, font }); y -= 24;
        for (const c of ['Name', 'Age', 'Ada', '36']) { pg.drawText(c, { x: 50, y, size: 12, font }); y -= 16; }
        pg.drawText('• Apples', { x: 50, y, size: 12, font }); y -= 16;
        pg.drawText('• Bananas grow fast in tropical heat.', { x: 50, y, size: 12, font }); y -= 16;
        pg.drawText('Visit the resource site for details', { x: 50, y, size: 12, font }); y -= 24;
        const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const png = await inDoc.embedPng(Uint8Array.from(atob(PNG_B64), (c) => c.charCodeAt(0)));
        pg.drawImage(png, { x: 50, y: y - 60, width: 80, height: 60 });
        // A link annotation WITHOUT /Contents — Stage 3b must add it.
        const ctx = inDoc.context;
        const annot = ctx.obj({
          Type: PDFName.of('Annot'), Subtype: PDFName.of('Link'),
          Rect: ctx.obj([50, 200, 300, 216].map((n) => PDFNumber.of(n))),
          A: ctx.obj({ S: PDFName.of('URI'), URI: PDFString.of('https://example.com/resource') }),
        });
        const annotRef = ctx.register(annot);
        pg.node.set(PDFName.of('Annots'), ctx.obj([annotRef]));
        const inputBytes = await inDoc.save();

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const html = '<!DOCTYPE html><html lang="en"><head><title>Parity Fixture</title></head><body><main>'
          + '<h1>Parity Heading Example</h1>'
          + '<p>This body paragraph matches the accessible html exactly and continues onto a second drawn line for the run test.</p>'
          + '<table><tr><th scope="col">Name</th><th scope="col">Age</th></tr><tr><td>Ada</td><td>36</td></tr></table>'
          + '<ul><li>Apples</li><li>Bananas grow fast in tropical heat.</li></ul>'
          + '<p>Visit the <a href="https://example.com/resource">resource site</a> for details</p>'
          + '<img src="data:image/png;base64,' + PNG_B64 + '" alt="A red square used to test figure linkage">'
          + '</main></body></html>';
        const result = await pipeline.createTaggedPdf(inputBytes, { accessibleHtml: html }, { title: 'Parity Test', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };
        const v = await (window as any).AlloModules.PdfValidator.validateExportedPdfBytes(result.bytes);
        return { v, pipelineUaDeclared: !!((result.summary || {}).uaDeclared) };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('fixture produced a validator report', () => {
    expect(report && !report.error, 'error: ' + (report && report.error)).toBeTruthy();
  });

  test('pure-marker Lbl exemption: the validator no longer contradicts the declaration on documents with lists', () => {
    expect(report.v.structureTally.markerLblExempted, 'two bullet Lbls must be exempted').toBe(2);
    const orphanRule = report.v.checks.find((c: any) => c.rule === 'No orphaned semantic leaves');
    expect(orphanRule.status, orphanRule.detail).toBe('pass');
  });

  test('link-annotation rules: /Contents + /StructParent verified from shipped bytes', () => {
    expect(report.v.linkAnnots.total).toBe(1);
    expect(report.v.linkAnnots.withContents, 'Stage 3b adds /Contents; the validator must see it').toBe(1);
    expect(report.v.linkAnnots.withStructParent).toBe(1);
  });

  test('containment rule: table/list nesting verified (the veraPDF 7.2 class)', () => {
    const rule = report.v.checks.find((c: any) => c.rule.indexOf('containment') !== -1);
    expect(rule.status, rule.detail).toBe('pass');
  });

  test('declaration consistency: XMP claim matches the pipeline gate AND the byte-level evidence', () => {
    expect(report.v.uaClaim.declaredInXmp, 'fully-linked fixture must declare').toBe(report.pipelineUaDeclared);
    expect(report.v.uaClaim.evidenceBacked).toBe(true);
    const rule = report.v.checks.find((c: any) => c.rule.indexOf('evidence-backed') !== -1);
    expect(rule.status, rule.detail).toBe('pass');
  });

  test('figure linkage surfaces in the tally', () => {
    expect(report.v.cellChecks.figureCount).toBe(1);
    expect(report.v.cellChecks.figuresLinked, 'the image must be content-linked').toBe(1);
  });

  test('overall verdict: PASS on the pipeline’s own fully-linked output', () => {
    expect(report.v.summary.overall, JSON.stringify(report.v.checks.filter((c: any) => c.status === 'fail'))).toBe('PASS');
  });
});
