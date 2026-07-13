// Typeset-then-tag golden (2026-06-10, item 8): Office inputs have no source
// PDF — createTypesetTaggedPdf generates a clean typeset PDF from the
// accessible HTML and runs the standard tagger on it. Because BOTH sides
// derive from the same html, per-leaf linking should match near-exactly and
// the evidence-gated declaration should be EARNED, not withheld. This golden
// proves the full chain deterministically (no AI).
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { TAGGED_PDF_INVARIANTS_JS, PAKO_CDN } from './_tagged_pdf_invariants';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let r: any = null;

test.describe('createTypesetTaggedPdf — Office-input tagged-PDF chain', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.addScriptTag({ url: PAKO_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).pako, null, { timeout: 30000 });
    await page.addScriptTag({ path: PIPELINE_PATH });
    await page.addScriptTag({ content: TAGGED_PDF_INVARIANTS_JS });

    r = await page.evaluate(async () => {
      try {
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        // A representative Office-derived document: headings, paragraphs
        // (one long enough to wrap), a scoped table, a list, an image.
        const html = '<!DOCTYPE html><html lang="en"><head><title>Office Fixture</title></head><body><main>'
          + '<h1>Quarterly Science Report</h1>'
          + '<p>This report summarizes the laboratory findings from the spring term and includes a comparison table of measured values across all three trial groups for the photosynthesis experiment.</p>'
          + '<h2>Results</h2>'
          + '<table><tr><th scope="col">Group</th><th scope="col">Mean</th></tr><tr><td>Control</td><td>4.2</td></tr><tr><td>Treatment</td><td>6.8</td></tr></table>'
          + '<ul><li>Chlorophyll increased under blue light.</li><li>Growth slowed in the dark condition.</li></ul>'
          + '<img src="data:image/png;base64,' + PNG_B64 + '" alt="Bar chart comparing mean growth across the three groups">'
          + '</main></body></html>';
        const result = await pipeline.createTypesetTaggedPdf({ accessibleHtml: html }, { title: 'Office Fixture', lang: 'en' });
        if (!result || !result.bytes) return { error: 'no bytes' };
        const s = result.summary || {};
        // Re-open the output to confirm it parses and has a structure root.
        const outDoc = await (window as any).PDFLib.PDFDocument.load(result.bytes);
        const hasRoot = !!outDoc.catalog.get((window as any).PDFLib.PDFName.of('StructTreeRoot'));
        // Shared structural-invariant sweep (2026-07-09): dup claims, dangling MCRs, balance,
        // artifact-only StructParents — the typeset chain must pass the same set the scanned path does.
        const sweep = await (window as any).__alloTaggedPdfInvariants(result.bytes);
        return {
          summary: { uaDeclared: s.uaDeclared, reachableLeaves: s.reachableLeaves, orphanedLeaves: s.orphanedLeaves },
          roundTripOk: !(result.roundTrip && result.roundTrip.ok === false),
          hasRoot,
          pageCount: outDoc.getPageCount(),
          byteLength: result.bytes.length,
          sweepViolations: sweep.violations,
          sweepMcrCount: sweep.mcrCount,
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('chain produced verified tagged bytes', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
    expect(r.hasRoot).toBeTruthy();
    expect(r.roundTripOk, 'post-save structure check must pass').toBeTruthy();
    expect(r.pageCount).toBeGreaterThanOrEqual(1);
  });

  test('same-html derivation earns the declaration with zero orphans', () => {
    expect(r.summary.orphanedLeaves, 'typeset text comes from the same html — nothing should orphan').toBe(0);
    expect(r.summary.reachableLeaves).toBeGreaterThanOrEqual(8);
    expect(r.summary.uaDeclared, 'the evidence-gated declaration should be EARNED').toBeTruthy();
  });

  test('the FULL structural-invariant sweep is clean', () => {
    expect(r.sweepViolations, JSON.stringify(r.sweepViolations)).toEqual([]);
    expect(r.sweepMcrCount).toBeGreaterThan(0);
  });
});
