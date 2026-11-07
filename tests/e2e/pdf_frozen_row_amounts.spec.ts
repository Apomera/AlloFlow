// (2026-11-05, expend2) A table freezes a row at the top of each page. The row's text was left out, but amounts with no text
// beside them stayed: "$0.00 $0.00 $668.87" was read five times after the notes, and every check passed. An amount a table
// already reads, at the very same spot on 3+ pages, is that row. The same amount elsewhere on the page stays readable.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

async function run(page: any, pages: number, stray: boolean) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  return page.evaluate(async ({ pages, stray }: any) => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const AMOUNTS = ['$668.87', '$41.25'];
    const rowsHtml: string[] = [];
    for (let n = 0; n < pages; n++) {
      const p = src.addPage([612, 792]);
      // The frozen amounts, at the same spot on every page, far from any text.
      if (n > 0) AMOUNTS.forEach((a, i) => p.drawText(a, { x: 300 + i * 80, y: 760, size: 9, font }));
      if (n === 0) { p.drawText('District', { x: 72, y: 740, size: 10, font }); AMOUNTS.forEach((a, i) => p.drawText(a, { x: 300 + i * 80, y: 760, size: 9, font })); }
      for (let r = 0; r < 4; r++) {
        const name = 'School number ' + (n * 10 + r);
        p.drawText(name, { x: 72, y: 700 - r * 20, size: 10, font });
        p.drawText('$' + (100 + n * 10 + r) + '.00', { x: 300, y: 700 - r * 20, size: 10, font });
        rowsHtml.push('<tr><th scope="row">' + name + '</th><td>$' + (100 + n * 10 + r) + '.00</td></tr>');
      }
      if (stray && n === 0) p.drawText('$668.87', { x: 72, y: 300, size: 10, font });
    }
    const html = '<!doctype html><html lang="en"><head><title>T</title></head><body><main><h1>District</h1><table><tr><th scope="col">$668.87</th><th scope="col">$41.25</th></tr>' + rowsHtml.join('') + '</table></main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'T', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'T' });
    const doc = await PDFDocument.load(tagged.bytes || tagged); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const seen = new Set(); const reads: string[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict) || seen.has(n)) return;
      seen.add(n);
      const a = look(n.get(PDFName.of('ActualText')));
      if (a && a.decodeText) reads.push(a.decodeText());
      const K = n.get(PDFName.of('K'));
      if (K != null) walk(K);
    };
    walk(doc.catalog.lookup(PDFName.of('StructTreeRoot')).get(PDFName.of('K')));
    const delivery = pipeline.taggedPdfDeliveryVerdict(tagged);
    return { reads, delivery: { ok: delivery.ok, code: delivery.code, reason: String(delivery.reason || '').slice(0, 200) } };
  }, { pages, stray });
}
const count = (a: string[], s: string) => a.filter((x) => x.trim() === s).length;

test('an amount at one spot on every page is read once, from the table', async ({ page }) => {
  const r = await run(page, 5, false);
  expect(count(r.reads, '$668.87'), JSON.stringify(r.reads)).toBe(1);
  expect(count(r.reads, '$41.25'), JSON.stringify(r.reads)).toBe(1);
  expect(r.delivery, JSON.stringify(r.delivery)).toMatchObject({ ok: true, code: 'verified' });
});

test('on only two pages it proves nothing, so it stays readable', async ({ page }) => {
  const r = await run(page, 2, false);
  expect(count(r.reads, '$668.87'), JSON.stringify(r.reads)).toBeGreaterThanOrEqual(2);
});
