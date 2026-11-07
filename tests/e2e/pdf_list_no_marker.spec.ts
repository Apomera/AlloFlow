// (2026-11-05, keyless ballot) A list drawn with list-style none prints no marker, but every item got /Lbl "•", so a reader
// heard "bullet, YES". An ol of that kind whose text prints its own number would have read it twice.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

async function listsIn(page: any, lines: string[], html: string) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  return page.evaluate(async ({ lines, html }: any) => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const p = src.addPage([612, 792]);
    lines.forEach((t: string, i: number) => { p.drawText(t, { x: 72, y: 720 - i * 22, size: 11, font }); });
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Ballot', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Ballot' });
    const bytes = tagged.bytes || tagged;
    const delivery = pipeline.taggedPdfDeliveryVerdict(tagged);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const lis: { kids: string[]; body: string }[] = [];
    const seen = new Set();
    const text = (d: any) => { const a = look(d.get(PDFName.of('ActualText'))); return a && a.decodeText ? a.decodeText() : ''; };
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict) || seen.has(n)) return;
      seen.add(n);
      if (String(n.get(PDFName.of('S'))) === '/LI') {
        const K = look(n.get(PDFName.of('K')));
        const kids = (K instanceof PDFArray ? K.asArray() : [K]).map(look).filter((d: any) => d instanceof PDFDict);
        const body = kids.find((d: any) => String(d.get(PDFName.of('S'))) === '/LBody');
        lis.push({ kids: kids.map((d: any) => String(d.get(PDFName.of('S')))), body: body ? text(body) : '' });
      }
      const K = n.get(PDFName.of('K'));
      if (K != null) walk(K);
    };
    walk(doc.catalog.lookup(PDFName.of('StructTreeRoot')).get(PDFName.of('K')));
    return { lis, delivery: { ok: delivery.ok, code: delivery.code, reason: String(delivery.reason || '').slice(0, 200) } };
  }, { lines, html });
}

test('no printed marker: the item has no label, a real bullet list keeps one, and the PDF still passes', async ({ page }) => {
  const r = await listsIn(page,
    ['Sample ballot', 'Choose one of these.', 'YES', 'NO', 'Take these steps.', 'Read the question.', 'Mark the oval.'],
    '<!doctype html><html lang="en"><head><title>Ballot</title></head><body><main><h1>Sample ballot</h1><p>Choose one of these.</p>'
    + '<ul style="margin:0;list-style-type:none"><li>YES</li><li>NO</li></ul><p>Take these steps.</p>'
    + '<ul style="margin:0"><li>Read the question.</li><li>Mark the oval.</li></ul></main></body></html>');
  expect(r.lis.length).toBe(4);
  expect(r.lis[0].kids).toEqual(['/LBody']);
  expect(r.lis[1].kids).toEqual(['/LBody']);
  expect(r.lis[0].body).toBe('YES');
  expect(r.lis[2].kids).toEqual(['/Lbl', '/LBody']);
  expect(r.lis[3].kids).toEqual(['/Lbl', '/LBody']);
  expect(r.delivery, JSON.stringify(r.delivery)).toMatchObject({ ok: true, code: 'verified' });
});

test('the shorthand and an ordered list printing its own numbers are covered too', async ({ page }) => {
  const r = await listsIn(page,
    ['Sample ballot', '1. First step.', '2. Second step.', 'YES', 'NO'],
    '<!doctype html><html lang="en"><head><title>Ballot</title></head><body><main><h1>Sample ballot</h1>'
    + '<ol style="list-style-type: none"><li>1. First step.</li><li>2. Second step.</li></ol>'
    + '<ul style="padding:0; list-style: none"><li>YES</li><li>NO</li></ul></main></body></html>');
  expect(r.lis.length).toBe(4);
  for (const li of r.lis) expect(li.kids).toEqual(['/LBody']);
  expect(r.delivery, JSON.stringify(r.delivery)).toMatchObject({ ok: true, code: 'verified' });
});
