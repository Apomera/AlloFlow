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
    let tableCount = 0;
    const walk = (v: any) => {
      const n = look(v);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const S = String(n.get(PDFName.of('S')) || '');
      if (S === '/Table') tableCount++;
      const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const linked = kids.some((k: any) => { const d = look(k); return d instanceof PDFNumber || (d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/MCR'); });
      const text = dec(n.get(PDFName.of('ActualText')));
      if (text != null || S === '/Figure') leaves.push({ S, text, alt: dec(n.get(PDFName.of('Alt'))), linked });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const s = tagged.summary || {};
    const fails = ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail);
    return { leaves, marker, headingCheck, fails, tableCount, tables: { offPageTablesDropped: s.offPageTablesDropped, offPageHeaderRowsDropped: s.offPageHeaderRowsDropped }, summary: { offPageLeavesDropped: s.offPageLeavesDropped, imageTextMovedToAlt: s.imageTextMovedToAlt, provenanceFooterDropped: s.provenanceFooterDropped }, roundTripOk: tagged.roundTrip && tagged.roundTrip.ok };
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

test('a dropped heading does not leave its sub-heading skipping a level (veraPDF 7.4.2)', async ({ page }) => {
  await boot(page);
  const r = await tag(page, ['Annual Report', 'Details', 'Attendance rose in every grade this year.'],
    '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Annual Report</h1><h2>Highlights prepared by the editor</h2><h3>Details</h3><p>Attendance rose in every grade this year.</p></main></body></html>', null);
  expect(r.leaves.filter((l: any) => /^\/H[1-6]$/.test(l.S)).map((l: any) => l.S + ' ' + l.text)).toEqual(['/H1 Annual Report', '/H2 Details']);
});

const TABLES_LINES = ['Library Visits', 'Visits rose in the fall.', 'Grade', 'Readers', 'Third', 'Forty', 'Visits by Day'];
const TABLES_HTML = (formTable: boolean) => '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Library Visits</h1><p>Visits rose in the fall.</p>'
  + '<table><tr><th scope="col">Grade</th><th scope="col">Readers</th></tr><tr><td>Third</td><td>Forty</td></tr></table>'
  // read off a chart by the AI, caption and all: nothing of it is on the page
  + '<table><caption>Library visits per month, read from the chart</caption><tr><th scope="col">Month</th><th scope="col">Visits</th></tr><tr><td>October</td><td>412</td></tr><tr><td>November</td><td>388</td></tr></table>'
  // the same, but the page prints its caption: the caption keeps its tag, so the table stays
  + '<table><caption>Visits by Day</caption><tr><th scope="col">Day</th><th scope="col">Visitors</th></tr><tr><td>Monday</td><td>57</td></tr></table>'
  // a form table: its blank stays (a field may nest there), so the table does
  + (formTable ? '<table><tr><td>Signature of parent</td><td>________</td></tr></table>' : '')
  + '</main></body></html>';

test('a table the AI built (none of it printed) leaves the tagged PDF; a printed table stays whole', async ({ page }) => {
  await boot(page);
  const r = await tag(page, TABLES_LINES, TABLES_HTML(false), null);
  expect(r.roundTripOk).toBe(true);
  expect(r.tableCount).toBe(2);
  expect(r.tables).toEqual({ offPageTablesDropped: 1, offPageHeaderRowsDropped: 2 });
  const texts = r.leaves.filter((l: any) => l.text != null).map((l: any) => l.text);
  for (const gone of ['Library visits per month, read from the chart', 'Month', 'October', '412', 'November', '388']) expect(texts, gone).not.toContain(gone);
  const cells = r.leaves.filter((l: any) => l.S === '/TH' || l.S === '/TD');
  expect(cells.map((l: any) => l.text + (l.linked ? '' : ' (unlinked)'))).toEqual(['Grade', 'Readers', 'Third', 'Forty']);
  expect(r.leaves.find((l: any) => l.S === '/Caption' && l.text === 'Visits by Day')).toMatchObject({ linked: true });
  expect(r.fails).toEqual([]);
});

test('a form table whose blank is not printed stays, and its blank goes to review (not erased)', async ({ page }) => {
  await boot(page);
  const r = await tag(page, TABLES_LINES, TABLES_HTML(true), null);
  expect(r.tableCount).toBe(3);
  expect(r.tables.offPageTablesDropped).toBe(1);
  expect(r.leaves.some((l: any) => l.S === '/TD' && l.text === '________' && !l.linked)).toBe(true);
  expect(r.fails).toEqual([expect.stringMatching(/^No orphaned semantic leaves: 1\/\d+ orphaned$/)]);
});

test('a non-Latin image alt survives intact: written as a hex string, not a Latin-1 PDFString (2026-10-19)', async ({ page }) => {
  await boot(page);
  // PDFString.of kept only each character's low byte: "ب" (U+0628) became "(" and "ة" (U+0629) ")",
  // so the Arabic signature alt broke its own object, the Figure vanished at save and the round trip failed.
  const alt = 'توقيع المشرف العام بخط اليد، مدرسة';
  const r = await tag(page, ['Dear families,', 'School starts on Monday at eight in the morning.'],
    '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Dear families,</h1><p>School starts on Monday at eight in the morning.</p>'
    + '<p><img alt="' + alt + '" src="data:image/png;base64,iVBORw0KGgo="></p></main></body></html>', PNG_B64);
  expect(r.roundTripOk).toBe(true);
  expect(r.leaves.filter((l: any) => l.S === '/Figure').map((l: any) => l.alt)).toEqual([alt]);
});

test('a title the AI composed from body words is not a printed heading: it leaves the PDF (2026-10-19)', async ({ page }) => {
  await boot(page);
  // OSEP letter shape: no printed title; the AI's h1 reuses a phrase from the body paragraph
  const lines = ['Dear Colleagues:', 'We write about the Statement of Interest in T.R. v. The School District', 'of Philadelphia and plans for translated documents.'];
  const r = await tag(page, lines,
    '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>IEP Translation: OSEP Letter on the Statement of Interest in T.R. v. The School District of Philadelphia</h1>'
    + '<p>Dear Colleagues:</p><p>We write about the Statement of Interest in T.R. v. The School District of Philadelphia and plans for translated documents.</p></main></body></html>', null, 'IEP Translation letter');
  expect(r.leaves.filter((l: any) => /^\/H[1-6]$/.test(l.S)).map((l: any) => l.text)).toEqual([]);
  expect(r.marker).toBe(true);
  expect(r.leaves.filter((l: any) => l.text != null && !l.linked).map((l: any) => l.text)).toEqual([]);
  expect(r.fails).toEqual([]);
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
