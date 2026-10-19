// Option B (2026-10-17, Aaron): the tagged PDF carries what is ON the page; additions stay in the HTML.
//  - an AI transcription of an image of text becomes part of that image's /Alt, not loose paragraphs;
//  - AlloFlow's provenance footer is left out;
//  - a leaf the AI wrote that is not on the page (an extra heading) is left out of the tag tree,
//    while text that IS on the page but did not link stays for review (see pdf_tag_reading_once_golden);
//  - the document's last heading is kept (AlloFlow's validator requires one);
//  - a short leaf the order-bound scan missed links to its ONLY exact match in unclaimed page text.
// The REAL createTaggedPdf runs in Chromium (offline vendor bundle).
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const VENDOR = path.join(ROOT, 'desktop/mcp/vendor');
// 1x1 grey PNG
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==';

async function boot(page) {
  await page.route('https://alloflow.test/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/vendor/')) return route.fulfill({ body: fs.readFileSync(path.join(VENDOR, u.pathname.slice(8))), contentType: 'application/javascript' });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
  });
  await page.goto('https://alloflow.test/boot');
  for (const f of ['pdfjs.min.js', 'pdf-lib.min.js', 'pako.min.js', 'fontkit.umd.min.js']) await page.addScriptTag({ path: path.join(VENDOR, f) });
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) await page.addScriptTag({ path: path.join(ROOT, f) });
  await page.evaluate(() => { (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://alloflow.test/vendor/pdf.worker.min.js'; });
}

// Tag a one-page PDF drawing `lines` (and an image when png is given) with `html`; return the tree's leaves.
async function tag(page, lines: string[], html: string, png: string | null, title: string | null = 'Doc') {
  return page.evaluate(async ({ lines, html, png, title }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFNumber } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    lines.forEach((l: string, i: number) => pg.drawText(l, { x: 72, y: 720 - i * 24, size: 12, font }));
    if (png) { const img = await src.embedPng(Uint8Array.from(atob(png), (c) => c.charCodeAt(0))); pg.drawImage(img, { x: 72, y: 300, width: 100, height: 60 }); }
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const meta: any = { lang: 'en' }; if (title) meta.title = title;
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, meta);
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const headingCheck = ((v && v.checks) || []).find((x: any) => x.rule === 'At least one heading present') || null;
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const root = look0(doc.catalog.get(PDFName.of('StructTreeRoot')));
    function look0(v: any) { return v instanceof PDFRef ? c.lookup(v) : v; }
    const marker = String(root.get(PDFName.of('AlloFlowNoPrintedHeadings'))) === 'true';
    const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
    const dec = (v: any) => (v && typeof v.decodeText === 'function' ? v.decodeText() : null);
    const leaves: any[] = [];
    const walk = (v: any) => {
      const n = look(v);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const S = String(n.get(PDFName.of('S')) || '');
      const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const linked = kids.some((k: any) => { const d = look(k); return d instanceof PDFNumber || (d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/MCR'); });
      const text = dec(n.get(PDFName.of('ActualText')));
      if (text != null || S === '/Figure') leaves.push({ S, text, alt: dec(n.get(PDFName.of('Alt'))), linked });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const s = tagged.summary || {};
    return { leaves, marker, headingCheck, summary: { offPageLeavesDropped: s.offPageLeavesDropped, imageTextMovedToAlt: s.imageTextMovedToAlt, provenanceFooterDropped: s.provenanceFooterDropped }, roundTripOk: tagged.roundTrip && tagged.roundTrip.ok };
  }, { lines, html, png, title });
}

test.describe.configure({ timeout: 180_000 });

test('the tagged PDF keeps what is on the page; AI additions stay in the HTML', async ({ page }) => {
  await boot(page);
  // drawn order: "Sincerely," first, so the order-bound scan has long passed it when its leaf comes up
  const lines = ['Sincerely,', 'Annual Report', 'Our students read more books this year than ever before.', 'Results', 'Attendance rose in every grade.', 'Families joined us for reading night.', 'The library added new books in Spanish.'];
  const html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main>'
    + '<h1>Annual Report</h1><h2>Highlights prepared for families</h2>'
    + '<p>Our students read more books this year than ever before.</p><h2>Results</h2><p>Attendance rose in every grade.</p>'
    // a 2-word AI heading sharing one word with the page ("library"): not on the page as a phrase
    + '<p>Families joined us for reading night.</p><h2>Library Update</h2><p>The library added new books in Spanish.</p>'
    + '<p><img alt="A bar chart of attendance." src="data:image/png;base64,iVBORw0KGgo="></p>'
    + '<details class="allo-imagetext" data-allo-generated="vision" open><summary>Text from this image (AI-transcribed)</summary><p>Grade 3: 95 percent</p><p>Grade 4: 97 percent</p><p><em>Transcribed from the image — verify against the original before relying on it.</em></p></details>'
    + '<p>Sincerely,</p></main>'
    + '<footer role="contentinfo"><p>Prepared with AlloFlow accessibility tools on 10/17/2026. This is not a certification of WCAG conformance.</p></footer></body></html>';
  const r = await tag(page, lines, html, PNG_B64);
  const texts = r.leaves.filter((l: any) => l.text != null).map((l: any) => l.text);
  expect(r.roundTripOk).toBe(true);
  // the AI's extra heading and AlloFlow's footer are not in the PDF
  expect(texts.some((t: string) => t.includes('Highlights prepared for families'))).toBe(false);
  expect(texts.some((t: string) => t.includes('Library Update'))).toBe(false);
  expect(texts.some((t: string) => t.includes('Prepared with AlloFlow'))).toBe(false);
  // the transcription lives in the figure's alt text, not as loose paragraphs
  const fig = r.leaves.find((l: any) => l.S === '/Figure');
  expect(fig && fig.alt).toBe('A bar chart of attendance: Grade 3: 95 percent Grade 4: 97 percent');
  expect(texts.some((t: string) => t.includes('Grade 3'))).toBe(false);
  // everything left is the page's own text, and all of it links (Sincerely, via the unique exact match)
  expect(r.leaves.filter((l: any) => l.text != null && !l.linked).map((l: any) => l.text)).toEqual([]);
  expect(texts).toEqual(expect.arrayContaining(['Annual Report', 'Results', 'Sincerely,']));
  expect(r.summary).toEqual({ offPageLeavesDropped: 2, imageTextMovedToAlt: 1, provenanceFooterDropped: 1 });
});

test('a heavily reworded paragraph whose words are on the page stays for review, not dropped', async ({ page }) => {
  await boot(page);
  const r = await tag(page, ['School News', 'The district will review the budget in the spring and share results with families.'],
    '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>School News</h1><p>In spring, families will hear the results when the district reviews its budget.</p></main></body></html>', null);
  const p = r.leaves.find((l: any) => l.S === '/P');
  expect(p && p.text).toBe('In spring, families will hear the results when the district reviews its budget.');
  expect(r.summary.offPageLeavesDropped).toBe(0);
});

const LETTER_LINES = ['Dear families,', 'School starts on Monday at eight in the morning.'];
const LETTER_HTML = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>A letter to families about the first day</h1><p>Dear families,</p><p>School starts on Monday at eight in the morning.</p></main>'
  // the pre-2026-10 provenance footer is left out too
  + '<footer role="contentinfo"><p>This document was automatically transformed for accessibility compliance (WCAG 2.2 AA) by AlloFlow. Original: letter.pdf (1 pages).</p></footer></body></html>';

test('a letter with no printed heading: the AI title is left out and the document title stands in', async ({ page }) => {
  await boot(page);
  const r = await tag(page, LETTER_LINES, LETTER_HTML, null, 'A letter to families');
  expect(r.leaves.some((l: any) => /^\/H[1-6]$/.test(l.S))).toBe(false);
  expect(r.marker).toBe(true);
  expect(r.headingCheck).toMatchObject({ status: 'pass' });
  expect(r.headingCheck.detail).toMatch(/not applicable: the printed page has no headings/);
  // everything left is the page's own text, all linked
  expect(r.leaves.filter((l: any) => l.text != null && !l.linked)).toEqual([]);
  expect(r.summary).toMatchObject({ offPageLeavesDropped: 1, provenanceFooterDropped: 1 });
});

test('without a document title the AI heading is kept, and the validator still asks for a heading', async ({ page }) => {
  await boot(page);
  const r = await tag(page, LETTER_LINES, LETTER_HTML, null, null);
  const h1 = r.leaves.find((l: any) => l.S === '/H1');
  expect(h1 && h1.text).toBe('A letter to families about the first day');
  expect(h1.linked).toBe(false); // not on the page: the document still goes to review
  expect(r.marker).toBe(false);
  expect(r.summary.offPageLeavesDropped).toBe(0);
});

test('the validator does not accept the marker without a title, nor a heading-less tree without the marker', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, PDFName, StandardFonts } = W.PDFLib;
    const make = async (marker: boolean, title: string | null) => {
      const d = await PDFDocument.create(); const ctx = d.context;
      d.addPage([200, 200]).drawText('Hello', { x: 20, y: 150, size: 12, font: await d.embedFont(StandardFonts.Helvetica) });
      const p = ctx.register(ctx.obj({ Type: 'StructElem', S: 'P' }));
      const body: any = { Type: 'StructTreeRoot', K: [p] }; if (marker) body.AlloFlowNoPrintedHeadings = true;
      d.catalog.set(PDFName.of('StructTreeRoot'), ctx.register(ctx.obj(body)));
      if (title) d.setTitle(title);
      const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(await d.save());
      return (v.checks.find((x: any) => x.rule === 'At least one heading present') || {}).status;
    };
    return { markerAndTitle: await make(true, 'T'), markerNoTitle: await make(true, null), titleNoMarker: await make(false, 'T') };
  });
  expect(res).toEqual({ markerAndTitle: 'pass', markerNoTitle: 'fail', titleNoMarker: 'fail' });
});
