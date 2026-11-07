// Two budget2 failures (2026-11-03; RSU 57 budget review, a deck of charts and tables):
//  - an HTML table read off a PICTURE of a table kept 34 amounts the page never prints: "19,525,926" splits into
//    19 / 525 / 926 and any unclaimed "19" scored 0.5 word overlap, so the cell counted as printed and orphaned
//    (131/578 orphaned). A number is printed or it is not: number cells take an exact match only;
//  - a printed chart caption matched a <figure>'s text (its figcaption) and was tagged /Figure with no /Alt
//    ("Every Figure has /Alt" failed). A text block never takes a picture's role.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host. ALLO_MODULE_DIR: private copies.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

// lines: [text, x, y, size][]; image: draw one picture at (72, 300); html: body
async function tag(page, lines: any[], image: boolean, html: string) {
  return page.evaluate(async ({ lines, image, html }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    for (const [t, x, y, size] of lines) pg.drawText(t, { x, y, size, font });
    if (image) {
      const cv = document.createElement('canvas'); cv.width = 120; cv.height = 80; const g = cv.getContext('2d')!;
      g.fillStyle = '#246'; g.fillRect(0, 0, 120, 80); g.fillStyle = '#fc3'; g.fillRect(10, 30, 30, 50); g.fillRect(50, 10, 30, 70);
      pg.drawImage(await src.embedPng(Uint8Array.from(atob(cv.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0))), { x: 72, y: 300, width: 240, height: 160 });
    }
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main>' + html + '</main></body></html>' }, { lang: 'en', title: 'Budget Review' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const roles: any[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const at = n.get(PDFName.of('ActualText'));
      roles.push({ S: String(n.get(PDFName.of('S'))), alt: !!n.get(PDFName.of('Alt')), text: at ? at.decodeText() : null });
      const K = n.get(PDFName.of('K')); if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    return { roles, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail) };
  }, { lines, image, html });
}

test.describe.configure({ timeout: 180_000 });

test('amounts of a table the page never prints are not "printed" because a lone 19 is', async ({ page }) => {
  await boot(page);
  const r = await tag(page, [['Budget Review', 72, 740, 20], ['Spending rose in every program this year.', 72, 700, 12], ['19', 300, 40, 10]], false,
    '<h1>Budget Review</h1><p>Spending rose in every program this year.</p>'
    + '<table><tr><th scope="col">Program</th><th scope="col">Approved</th></tr><tr><th scope="row">Regular</th><td>19,525,926</td></tr><tr><th scope="row">Transport</th><td>2,019,000</td></tr></table>');
  // every cell is unprinted, so the table leaves the tagged PDF (it stays in the HTML)
  expect(r.roles.filter((x: any) => x.S === '/Table' || x.S === '/TD')).toEqual([]);
  expect(r.fails).toEqual([]);
});

test('a table the page shows only as a picture leaves the tagged PDF, though chart labels print its row headers', async ({ page }) => {
  await boot(page);
  // the page prints the chart's labels (one exact, one shortened) but none of the table's amounts
  const r = await tag(page, [['Budget Review', 72, 740, 20], ['Spending by program is shown in the chart below.', 72, 700, 12],
    ['Regular Instruction', 100, 500, 9], ['Career & Tech', 260, 500, 9]], false,
    '<h1>Budget Review</h1><p>Spending by program is shown in the chart below.</p>'
    + '<table><tr><th scope="col">Program</th><th scope="col">Approved</th><th scope="col">Working</th></tr>'
    + '<tr><th scope="row">Regular Instruction</th><td>19,525,926</td><td>20,249,860</td></tr>'
    + '<tr><th scope="row">Career &amp; Tech Ed</th><td>1,204,118</td><td>1,250,000</td></tr></table>');
  expect(r.roles.filter((x: any) => /^\/(Table|TR|TH|TD)$/.test(x.S))).toEqual([]);
  expect(r.fails).toEqual([]);
});

test('a heading the HTML marks with a footnote asterisk links to the printed heading without it', async ({ page }) => {
  await boot(page);
  const r = await tag(page, [['Budget Review', 72, 740, 20], ['Local Assessments', 72, 700, 14], ['Every school gives two local tests a year.', 72, 680, 12]], false,
    '<h1>Budget Review</h1><h2>Local Assessments *</h2><p>Every school gives two local tests a year.</p>');
  expect(r.fails).toEqual([]);
});

test('a printed caption that matches a figure\'s figcaption is a caption, not an /Alt-less /Figure', async ({ page }) => {
  await boot(page);
  const r = await tag(page, [['Budget Review', 72, 740, 20], ['Revenue sources for the 2025 budget year', 72, 480, 9]], true,
    '<h1>Budget Review</h1><figure><img alt="Bar chart: state aid 60%, local taxes 35%, other 5%" src="data:image/png;base64,iVBORw0KGgo=">'
    + '<figcaption>Revenue sources for the 2025 budget year</figcaption></figure>');
  expect(r.roles.filter((x: any) => x.S === '/Figure' && !x.alt)).toEqual([]);
  expect(r.fails.filter((f: string) => /Figure has \/Alt/.test(f))).toEqual([]);
});
