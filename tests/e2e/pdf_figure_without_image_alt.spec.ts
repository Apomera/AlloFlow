// (2026-11-05, keyless ballot) A picture kept as a text description has no <img>, so its Figure got /Alt "(image)": a reader
// using /Alt never heard the description, and veraPDF passes it, since the rule only asks that /Alt exists.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;
const DESC = 'A small filled-in black oval that shows voters how to mark the ballot.';

async function altsFor(page: any, html: string) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  return page.evaluate(async ({ html, DESC }: any) => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFHexString, PDFString } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const p = src.addPage([612, 792]);
    p.drawText('Sample ballot', { x: 72, y: 720, size: 14, font });
    p.drawText('Fill in the oval to the left, like this.', { x: 72, y: 690, size: 11, font });
    p.drawEllipse({ x: 320, y: 694, xScale: 8, yScale: 4, color: L.rgb(0, 0, 0) });
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Ballot', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Ballot' });
    const doc = await PDFDocument.load(tagged.bytes || tagged); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const figs: string[] = [];
    const seen = new Set();
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict) || seen.has(n)) return;
      seen.add(n);
      if (String(n.get(PDFName.of('S'))) === '/Figure') {
        const a = look(n.get(PDFName.of('Alt')));
        figs.push(a instanceof PDFHexString || a instanceof PDFString ? a.decodeText() : String(a));
      }
      const K = n.get(PDFName.of('K'));
      if (K != null) walk(K);
    };
    walk(doc.catalog.lookup(PDFName.of('StructTreeRoot')).get(PDFName.of('K')));
    return figs;
  }, { html, DESC });
}

test('a figure kept as a description reads that description in /Alt, not "(image)"', async ({ page }) => {
  const figs: string[] = await altsFor(page, '<!doctype html><html lang="en"><head><title>Ballot</title></head><body><main><h1>Sample ballot</h1><p>Fill in the oval to the left, like this.</p><figure data-image-unavailable="true"><figcaption>Image not reproduced: <span>' + DESC + '</span></figcaption></figure></main></body></html>');
  expect(figs.length).toBeGreaterThan(0); // a test of no figures proves nothing
  for (const a of figs) { expect(a).not.toBe('(image)'); expect(a).toContain(DESC); }
});
