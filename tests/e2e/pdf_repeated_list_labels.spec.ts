// (2026-11-05, MDOE complaint form) "Name / Address / State/Zip code" repeat in several lists. A label drawn in two pieces was
// linked after the single-piece ones had taken the nearest copies, so the first list's item could point at a copy pages later.
// Same words either way, but reading went back and forth across pages. Items with the same text now take the copies in page order.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

test('repeated list labels read in page order', async ({ page }) => {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  const r = await page.evaluate(async () => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const LABELS = ['Name', 'Address', 'City'];
    const lists = ['First parent section', 'Second parent section', 'Interested party section'];
    const drawList = (p: any, title: string, y0: number) => {
      p.drawText(title, { x: 72, y: y0, size: 13, font });
      LABELS.forEach((t, i) => p.drawText(t, { x: 72, y: y0 - 18 - i * 16, size: 11, font }));
      // Two separate draws of one label: only a later, multi-piece pass can link this item.
      const y = y0 - 18 - LABELS.length * 16;
      p.drawText('State/', { x: 72, y, size: 11, font });
      p.drawText('Zip code', { x: 108, y, size: 11, font });
    };
    const p1 = src.addPage([612, 792]);
    drawList(p1, lists[0], 720); drawList(p1, lists[1], 560);
    const p2 = src.addPage([612, 792]);
    drawList(p2, lists[2], 720);
    const html = '<!doctype html><html lang="en"><head><title>Form</title></head><body><main><h1>Form</h1>' + lists.map((t) => '<h2>' + t + '</h2><ul>' + [...LABELS, 'State/Zip code'].map((l) => '<li>' + l + '</li>').join('') + '</ul>').join('') + '</main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Form', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Form' });
    const delivery = pipeline.taggedPdfDeliveryVerdict(tagged);
    const doc = await PDFDocument.load(tagged.bytes || tagged); const c = doc.context;
    const pageNo = new Map(); doc.getPages().forEach((p: any, i: number) => pageNo.set(p.ref.toString(), i + 1));
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const seen = new Set(); const order: { s: string; t: string; pg: number }[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict) || seen.has(n)) return;
      seen.add(n);
      const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const pg = n.get(PDFName.of('Pg'));
      const at = look(n.get(PDFName.of('ActualText')));
      if (pg && kids.some((k: any) => { const v = look(k); return v instanceof PDFDict && v.get(PDFName.of('MCID')) || (v && typeof v.asNumber === 'function'); }))
        order.push({ s: String(n.get(PDFName.of('S'))), t: at && at.decodeText ? at.decodeText() : '', pg: pageNo.get(pg.toString()) as number });
      for (const k of kids) { const v = look(k); if (v instanceof PDFDict && !v.get(PDFName.of('MCID'))) walk(k); }
    };
    walk(doc.catalog.lookup(PDFName.of('StructTreeRoot')).get(PDFName.of('K')));
    return { order, delivery: { ok: delivery.ok, code: delivery.code, reason: String(delivery.reason || '').slice(0, 200) } };
  });
  const bodies = r.order.filter((x: any) => x.s === '/LBody');
  expect(bodies.length).toBe(12); // every item reached the tree, or the order proves nothing
  let last = 0;
  for (const b of r.order) { expect(b.pg, JSON.stringify(r.order)).toBeGreaterThanOrEqual(last); last = b.pg; }
  expect(r.delivery, JSON.stringify(r.delivery)).toMatchObject({ ok: true, code: 'verified' });
});
