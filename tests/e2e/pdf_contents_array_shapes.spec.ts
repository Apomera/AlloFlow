// (2026-11-05) A page's /Contents can be one stream, an array, or a REFERENCE to an array (IRS 1913 form, every page). The
// reference read as "no content stream", so tagging fell back, and the fallback wrapped it in a nested array no viewer
// reads. Separately, an array's compressed streams were joined raw, and inflating that keeps only the first stream.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;
const TEXTS = ['First paragraph lives in the first stream of this page.', 'Second paragraph lives in the second stream of this page.', 'Third paragraph lives in the third stream of this page.'];
const HTML = '<!doctype html><html lang="en"><head><title>Shapes</title></head><body><main><h1>Shapes</h1>' + TEXTS.map((t) => '<p>' + t + '</p>').join('') + '</main></body></html>';

async function run(page: any, shape: string, forceFallback = false) {
  const logs: string[] = [];
  page.on('console', (m: any) => logs.push(m.text()));
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  const r = await page.evaluate(async ({ shape, TEXTS, HTML, forceFallback }: any) => {
    const W: any = window;
    const { PDFDocument, PDFName, PDFNumber, StandardFonts } = W.PDFLib;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pg = doc.addPage([612, 792]);
    const fontKey = pg.node.newFontDictionary('F1', font.ref);
    const ctx = doc.context;
    // Helvetica is winansi-encoded here, so plain ASCII in a literal string draws as written.
    const draw = (s: string, y: number) => {
      const raw = new TextEncoder().encode('BT ' + fontKey.toString() + ' 12 Tf 72 ' + y + ' Td (' + s + ') Tj ET\n');
      if (shape.endsWith('flate')) {
        const z = W.pako.deflate(raw);
        return ctx.register(ctx.stream(z, { Filter: PDFName.of('FlateDecode'), Length: PDFNumber.of(z.length) }));
      }
      return ctx.register(ctx.stream(raw, { Length: PDFNumber.of(raw.length) }));
    };
    const arr = ctx.obj([draw('Shapes', 720), ...TEXTS.map((t: string, i: number) => draw(t, 690 - i * 30))]);
    pg.node.set(PDFName.of('Contents'), shape.startsWith('ref') ? ctx.register(arr) : arr);
    const bytes = await doc.save({ useObjectStreams: false });
    const check = await PDFDocument.load(bytes, { updateMetadata: false });
    const srcIsRef = check.getPages()[0].node.get(PDFName.of('Contents')) instanceof W.PDFLib.PDFRef;
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Shapes', state: {} });
    // A stream Stage 4 cannot decompress sends the page to the fallback wrap, which is where a nested array was written.
    const pako = W.pako;
    if (forceFallback) W.pako = { ...pako, inflate() { throw new Error('forced'); }, Inflate: function (this: any) { this.push = () => {}; this.err = 1; this.msg = 'forced'; this.strm = {}; } };
    let tagged;
    try { tagged = await pipeline.createTaggedPdf(bytes, { accessibleHtml: HTML }, { lang: 'en', title: 'Shapes' }); } finally { W.pako = pako; }
    const out = tagged.bytes || tagged;
    const delivery = pipeline.taggedPdfDeliveryVerdict(tagged);
    const pdf = await W.pdfjsLib.getDocument({ data: out.slice(0) }).promise;
    const tc = await (await pdf.getPage(1)).getTextContent();
    const painted = tc.items.map((i: any) => i.str).join(' ');
    const res = await PDFDocument.load(out, { updateMetadata: false });
    const c = res.context;
    const val = c.lookup(res.getPages()[0].node.get(PDFName.of('Contents')));
    const nested = typeof val.size === 'function' && Array.from({ length: val.size() }, (_: any, k: number) => c.lookup(val.get(k))).some((x: any) => typeof x.size === 'function');
    return { painted, nested, srcIsRef, outIsArray: typeof val.size === 'function', delivery: { ok: delivery.ok, code: delivery.code, reason: String(delivery.reason || '').slice(0, 300) } };
  }, { shape, TEXTS, HTML, forceFallback });
  return { ...r, fallback: logs.filter((l) => /Stage 3 fallback|getContentStream/.test(l)) };
}

for (const shape of ['ref-plain', 'ref-flate', 'direct-plain', 'direct-flate']) {
  test('/Contents as ' + shape + ': every stream is painted and tagged, with no fallback', async ({ page }) => {
    const r = await run(page, shape);
    // The fixture really has the shape it claims: a test of a direct array proves nothing about a reference.
    expect(r.srcIsRef).toBe(shape.startsWith('ref'));
    for (const t of TEXTS) expect(r.painted).toContain(t);
    expect(r.painted).toContain('Shapes');
    expect(r.nested).toBe(false);
    expect(r.fallback).toEqual([]);
    expect(r.delivery, JSON.stringify(r.delivery)).toMatchObject({ ok: true, code: 'verified' });
  });
}

test('when tagging falls back, a reference to an array still paints: no nested array', async ({ page }) => {
  const r = await run(page, 'ref-flate', true);
  expect(r.srcIsRef).toBe(true);
  expect(r.outIsArray).toBe(true); // the fixture took the path under test: Stage 4 writes one stream, the fallback an array
  expect(r.nested).toBe(false);
  expect(r.fallback.filter((l: string) => /getContentStream/.test(l))).toEqual([]);
  for (const t of TEXTS) expect(r.painted).toContain(t);
});
