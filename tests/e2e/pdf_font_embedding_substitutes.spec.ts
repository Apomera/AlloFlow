// Stage 7 font embedding (2026-10-18), measured on real documents:
//  - a Word PDF's non-embedded TimesNewRomanPSMT stayed non-embedded (veraPDF 7.21.4.1): the only serif
//    substitute, DejaVu Serif, is 16-18% wider, so the width gate (rightly) refused it. Tinos is
//    metric-compatible with Times New Roman and now stands in.
//  - an EMBEDDED composite (Type0) font and a Type3 font were listed as "unrepairable", which withholds
//    the PDF/UA declaration although veraPDF passes 7.21.4.1 (the check looked only at the top-level
//    font dict; a Type0 program lives on its descendant CIDFont, a Type3 font draws with procedures).
// The REAL createTaggedPdf runs in Chromium; the substitute fonts come from the CDN (skips when offline).
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const VENDOR = path.join(ROOT, 'desktop/mcp/vendor');

async function boot(page) {
  await page.route('https://alloflow.test/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/vendor/')) return route.fulfill({ body: fs.readFileSync(path.join(VENDOR, u.pathname.slice(8))), contentType: 'application/javascript' });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
  });
  await page.goto('https://alloflow.test/boot');
  for (const f of ['pdfjs.min.js', 'pdf-lib.min.js', 'pako.min.js', 'fontkit.umd.min.js']) await page.addScriptTag({ path: path.join(VENDOR, f) });
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) await page.addScriptTag({ path: path.join(ROOT, f) });
  await page.evaluate(() => {
    const W: any = window;
    W.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://alloflow.test/vendor/pdf.worker.min.js';
    W.__tag = async (bytes: Uint8Array) => {
      const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
      const tagged = await pipeline.createTaggedPdf(bytes, { accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><p>Times text for families.</p></main></body></html>' }, { title: 'Doc', lang: 'en' });
      const { PDFDocument, PDFName, PDFDict, PDFRef } = W.PDFLib;
      const doc = await PDFDocument.load(tagged.bytes || tagged); const c = doc.context;
      const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
      const fonts: any[] = [];
      for (const pg of doc.getPages()) {
        const res = look(pg.node.get(PDFName.of('Resources'))); const fd = res && look(res.get(PDFName.of('Font')));
        if (!(fd instanceof PDFDict)) continue;
        for (const [, fr] of fd.entries()) {
          const f = look(fr); const desc = look(f.get(PDFName.of('FontDescriptor')));
          fonts.push({ base: String(f.get(PDFName.of('BaseFont'))), embedded: !!(desc && (desc.get(PDFName.of('FontFile')) || desc.get(PDFName.of('FontFile2')) || desc.get(PDFName.of('FontFile3')))) });
        }
      }
      const s = tagged.summary || {};
      return { fonts, unrepairable: s.fontsUnrepairable || [], repaired: s.fontsRepaired };
    };
  });
}

test.describe.configure({ timeout: 180_000 });

test('a non-embedded Times New Roman with declared widths gets the metric-compatible Tinos embedded', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, PDFName, PDFNumber, PDFDict, PDFRef, StandardFonts } = W.PDFLib;
    const first = await PDFDocument.create();
    const times = await first.embedFont(StandardFonts.TimesRoman);
    first.addPage([612, 792]).drawText('Times text for families.', { x: 72, y: 700, size: 12, font: times });
    // make it Word's shape: BaseFont TimesNewRomanPSMT, not embedded, with DECLARED Times widths
    const doc = await PDFDocument.load(await first.save()); const c = doc.context;
    const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
    const fd = look(look(doc.getPages()[0].node.get(PDFName.of('Resources'))).get(PDFName.of('Font')));
    for (const [, fr] of (fd as any).entries()) {
      const f = look(fr);
      const widths: any[] = [];
      for (let ch = 32; ch <= 255; ch++) { let w = 0; try { w = Math.round(times.widthOfTextAtSize(String.fromCharCode(ch), 1000)); } catch (_) { w = 0; } widths.push(PDFNumber.of(w)); }
      f.set(PDFName.of('BaseFont'), PDFName.of('TimesNewRomanPSMT'));
      f.set(PDFName.of('FirstChar'), PDFNumber.of(32)); f.set(PDFName.of('LastChar'), PDFNumber.of(255));
      f.set(PDFName.of('Widths'), c.obj(widths));
    }
    return W.__tag(new Uint8Array(await doc.save()));
  });
  test.skip(r.unrepairable.some((u: string) => /fetch failed|fontkit unavailable/.test(u)), 'substitute font not reachable (offline)');
  expect(r.unrepairable).toEqual([]);
  expect(r.fonts).toEqual([expect.objectContaining({ embedded: true })]);
  expect(r.fonts[0].base).toMatch(/Tinos/);
});

test('an embedded composite (Type0) font is not reported unrepairable', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument } = W.PDFLib;
    let ttf: Uint8Array | null = null;
    try { const resp = await fetch('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/LiberationSans-Regular.ttf'); if (resp.ok) ttf = new Uint8Array(await resp.arrayBuffer()); } catch (_) { ttf = null; }
    if (!ttf) return { offline: true };
    const src = await PDFDocument.create(); src.registerFontkit(W.fontkit);
    const f = await src.embedFont(ttf, { subset: true });
    src.addPage([612, 792]).drawText('Times text for families.', { x: 72, y: 700, size: 12, font: f });
    return W.__tag(new Uint8Array(await src.save()));
  });
  test.skip(!!r.offline, 'font fixture not reachable (offline)');
  // the program lives on the descendant CIDFont; nothing is missing, so nothing withholds the claim
  expect(r.unrepairable).toEqual([]);
});
