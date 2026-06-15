// Coverage for window.AlloModules.PdfValidator.validateExportedPdfBytes — the 14-rule
// PDF/UA-1 self-check that runs on EVERY tagged-PDF export (doc_pipeline_source.jsx ~:14292)
// but had ZERO automated coverage. The risk the audit named: a refactor that makes the
// validator vacuously always-PASS (or always-FAIL) would be a silent, worse-than-useless
// regression. These tests prove the validator DISCRIMINATES:
//   1. an untagged PDF FAILS the structure rules (detects absence — not always-pass),
//   2. a PDF with Lang/MarkInfo/DisplayDocTitle/Title set PASSES exactly those rules while
//      the structure-tree rules still FAIL (per-rule discrimination — not always-fail),
//   3. malformed bytes return a graceful {error}, not a crash.
//
// Browser-only (validateExportedPdfBytes is hard-bound to window.PDFLib), so Playwright, not
// vitest. Self-contained: about:blank + CDN pdf-lib + the local validator module. No dev server.

import { test, expect } from '@playwright/test';
import * as path from 'path';

const VALIDATOR_PATH = path.resolve(__dirname, '../../view_pdf_validator_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

test.describe('PdfValidator.validateExportedPdfBytes — discrimination', () => {
  let results: any = null;
  let capturedPageErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: VALIDATOR_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.PdfValidator), null, { timeout: 20000 });

    results = await page.evaluate(async () => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, PDFName, PDFString } = PDFLib;
      const validate = (window as any).AlloModules.PdfValidator.validateExportedPdfBytes;

      // (1) A bare, untagged 1-page PDF — no StructTreeRoot, no MarkInfo, no /Lang.
      const bare = await PDFDocument.create();
      bare.addPage();
      const bareBytes = await bare.save();
      const untagged = await validate(bareBytes);

      // (2) Same, but with the cheap catalog/metadata rules satisfied (still NO struct tree).
      const meta = await PDFDocument.create();
      meta.addPage();
      meta.setTitle('Discrimination Test Doc');
      meta.setLanguage('en-US');                                  // -> Catalog /Lang
      const ctx = meta.context;
      meta.catalog.set(PDFName.of('MarkInfo'), ctx.obj({ Marked: true }));
      meta.catalog.set(PDFName.of('ViewerPreferences'), ctx.obj({ DisplayDocTitle: true }));
      const metaBytes = await meta.save();
      const tagged = await validate(metaBytes);

      // (3) Malformed bytes.
      const garbage = await validate(new Uint8Array([0x25, 0x21, 0x02, 0x03, 0x04]));

      const ruleStatus = (r: any, name: string) => {
        const c = (r.checks || []).find((x: any) => x.rule === name);
        return c ? c.status : '(missing)';
      };
      return {
        untagged: {
          overall: untagged.summary && untagged.summary.overall,
          hasStructTreeRoot: untagged.catalogChecks && untagged.catalogChecks.hasStructTreeRoot,
          structTreeRoot: ruleStatus(untagged, 'StructTreeRoot present'),
          markInfo: ruleStatus(untagged, 'MarkInfo /Marked true'),
          lang: ruleStatus(untagged, 'Primary language set (/Lang)'),
        },
        tagged: {
          overall: tagged.summary && tagged.summary.overall,
          lang: ruleStatus(tagged, 'Primary language set (/Lang)'),
          markInfo: ruleStatus(tagged, 'MarkInfo /Marked true'),
          displayDocTitle: ruleStatus(tagged, 'ViewerPreferences /DisplayDocTitle = true'),
          title: ruleStatus(tagged, 'Document title set in metadata (/Info /Title)'),
          structTreeRoot: ruleStatus(tagged, 'StructTreeRoot present'),
        },
        garbageErrorIsString: typeof (garbage && garbage.error) === 'string',
      };
    });
    capturedPageErrors = pageErrors;
  });

  test('loads + runs with no page errors', () => {
    expect(results).toBeTruthy();
    expect(capturedPageErrors).toEqual([]);
  });

  test('untagged PDF FAILS the structure rules (detects absence — not always-pass)', () => {
    expect(results.untagged.overall).toBe('FAIL');
    expect(results.untagged.hasStructTreeRoot).toBe(false);
    expect(results.untagged.structTreeRoot).toBe('fail');
    expect(results.untagged.markInfo).toBe('fail');
    expect(results.untagged.lang).toBe('fail');
  });

  test('metadata-set PDF PASSES exactly the satisfied rules while structure still FAILS (per-rule discrimination)', () => {
    // Three catalog-level rules flip fail->pass once satisfied (proves the validator reads
    // real state, not a constant). (The /Info /Title rule is intentionally NOT asserted here:
    // the validator reads Title from catalog->Info, but pdf-lib's setTitle writes the trailer
    // Info dict, so a hand-built doc can't satisfy it without low-level catalog surgery.)
    expect(results.tagged.lang).toBe('pass');
    expect(results.tagged.markInfo).toBe('pass');
    expect(results.tagged.displayDocTitle).toBe('pass');
    // No real tag tree was added, so this MUST still fail — proves it isn't always-pass.
    expect(results.tagged.structTreeRoot).toBe('fail');
    expect(results.tagged.overall).toBe('FAIL');
  });

  test('malformed bytes return a graceful error, not a crash', () => {
    expect(results.garbageErrorIsString).toBe(true);
  });
});

// Audit #10: the "Every TH has /Scope" rule used to test only for the PRESENCE of an /A
// attribute dict, so a TH whose /A carried layout attrs (O:/Table) but NO /Scope key falsely
// PASSED. This proves it now reads the actual /Scope key.
test.describe('PdfValidator — TH /Scope discrimination (audit #10)', () => {
  test('a TH whose /A lacks /Scope FAILS the rule; adding /Scope PASSES it', async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: VALIDATOR_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.PdfValidator), null, { timeout: 20000 });

    const res = await page.evaluate(async () => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, PDFName } = PDFLib;
      const validate = (window as any).AlloModules.PdfValidator.validateExportedPdfBytes;
      async function docWithTH(withScope: boolean) {
        const doc = await PDFDocument.create();
        doc.addPage();
        const ctx = doc.context;
        const aDict = withScope
          ? ctx.obj({ O: PDFName.of('Table'), Scope: PDFName.of('Column') })
          : ctx.obj({ O: PDFName.of('Table') }); // layout attrs but NO /Scope
        const th = ctx.obj({ Type: PDFName.of('StructElem'), S: PDFName.of('TH'), A: aDict });
        const structRoot = ctx.obj({ Type: PDFName.of('StructTreeRoot'), K: th });
        doc.catalog.set(PDFName.of('StructTreeRoot'), ctx.register(structRoot));
        return await doc.save();
      }
      const ruleStatus = (r: any) => {
        const c = (r.checks || []).find((x: any) => x.rule === 'Every TH has /Scope');
        return c ? c.status : '(missing)';
      };
      const noScope = await validate(await docWithTH(false));
      const withScope = await validate(await docWithTH(true));
      return {
        noScopeStatus: ruleStatus(noScope),
        noScopeThCount: noScope.cellChecks && noScope.cellChecks.thCount,
        noScopeThWithScope: noScope.cellChecks && noScope.cellChecks.thWithScope,
        withScopeStatus: ruleStatus(withScope),
        withScopeThWithScope: withScope.cellChecks && withScope.cellChecks.thWithScope,
      };
    });
    await page.close();

    // The false-pass is now caught: /A present, /Scope absent -> FAIL, 0 of 1 TH scoped.
    expect(res.noScopeThCount).toBe(1);
    expect(res.noScopeStatus).toBe('fail');
    expect(res.noScopeThWithScope).toBe(0);
    // And a genuine /Scope still passes.
    expect(res.withScopeStatus).toBe('pass');
    expect(res.withScopeThWithScope).toBe(1);
  });
});
