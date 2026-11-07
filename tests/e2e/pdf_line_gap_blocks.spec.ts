// A wide pen move ALONG a text line starts a new block (2026-11-03): the worksheet prints its "Rake" and "Chicken"
// labels on one line ("(Rake) Tj 17.2 0 Td (Chicken) Tj"), and the FDA letter positions table cells by Tm on one
// line, so each line was ONE block and no label or cell could link (worksheet 2 orphans, FDA 7 of 9). A move past
// the shown text by 3+ em splits; ordinary word positioning by Td does not.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host. ALLO_MODULE_DIR: private copies.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

async function tag(page, body: string, html: string) {
  return page.evaluate(async ({ body, html }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFNumber, decodePDFRawStream } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    pg.node.setFontDictionary(PDFName.of('F1'), font.ref);
    pg.node.set(PDFName.of('Contents'), src.context.register(src.context.stream('BT /F1 18 Tf 72 740 Td (Animal Tools) Tj ET\n' + body)));
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Animal Tools</h1>' + html + '</main></body></html>' }, { lang: 'en', title: 'Animal Tools' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const leaves: any[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const S = String(n.get(PDFName.of('S')) || ''); const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const linked = kids.some((k: any) => { const d = look(k); return d instanceof PDFNumber || (d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/MCR'); });
      const at = n.get(PDFName.of('ActualText'));
      if (['/P', '/TD', '/TH'].includes(S)) leaves.push({ S, text: at ? at.decodeText() : null, linked });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const cs = look(doc.getPages()[0].node.get(PDFName.of('Contents')));
    const raw = cs.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(cs).decode() : cs.contents;
    let content = ''; for (let i = 0; i < raw.length; i++) content += String.fromCharCode(raw[i]);
    return { leaves, content, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail) };
  }, { body, html });
}

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

test.describe.configure({ timeout: 180_000 });

test('two labels on one line, far apart by Td, are two blocks: each label links', async ({ page }) => {
  await boot(page);
  // the worksheet's own shape: a scaled Tm, the first label, a 17.2 em Td, the second label
  const r = await tag(page, 'BT /F1 1 Tf 11.7 0 0 11.7 84 600 Tm (Rake) Tj 17.201 0 Td (Chicken) Tj ET\n', '<p>Rake</p><p>Chicken</p>');
  expect(r.leaves.filter((l: any) => l.S === '/P')).toEqual([expect.objectContaining({ text: 'Rake', linked: true }), expect.objectContaining({ text: 'Chicken', linked: true })]);
  expect(r.fails).toEqual([]);
});

test('table cells placed by Tm on one line are one block each: every cell links', async ({ page }) => {
  await boot(page);
  const row = (y: number, cells: string[]) => cells.map((t, i) => '1 0 0 1 ' + (72 + i * 150) + ' ' + y + ' Tm (' + t + ') Tj').join(' ');
  const r = await tag(page, 'BT /F1 10 Tf ' + row(600, ['Tool', 'Bird', 'Use']) + ' ' + row(585, ['Nutcracker', 'Cardinal', 'Cracking seeds']) + ' ET\n',
    '<table><tr><th>Tool</th><th>Bird</th><th>Use</th></tr><tr><td>Nutcracker</td><td>Cardinal</td><td>Cracking seeds</td></tr></table>');
  const cells = r.leaves.filter((l: any) => l.S === '/TD' || l.S === '/TH');
  expect(cells.map((c: any) => c.text)).toEqual(['Tool', 'Bird', 'Use', 'Nutcracker', 'Cardinal', 'Cracking seeds']);
  expect(cells.every((c: any) => c.linked)).toBe(true);
  expect(r.fails).toEqual([]);
});

test('words placed one by one with ordinary spacing stay ONE block (no split inside a sentence)', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'BT /F1 12 Tf 72 600 Td (Families) Tj 52 0 Td (are) Tj 22 0 Td (welcome) Tj 50 0 Td (here.) Tj ET\n', '<p>Families are welcome here.</p>');
  expect(r.leaves.find((l: any) => l.S === '/P')).toEqual(expect.objectContaining({ linked: true }));
  // the four show operators sit in one marked-content section
  const section = /\/P <<\/MCID (\d+)>> BDC([\s\S]*?)EMC/.exec(r.content);
  expect(section && (section[2].match(/Tj/g) || []).length).toBe(4);
});
