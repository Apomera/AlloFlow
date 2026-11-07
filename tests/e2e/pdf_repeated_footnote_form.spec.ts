// A footnote printed on every page by a footer form (2026-11-03, USCIS civics: "* If you are 65 years old or older
// ... you may study just the questions that have been marked with an asterisk" on all 11 pages). The repeated form
// was page furniture everywhere, so the tagged PDF never said what the asterisks mean. When the form prints prose
// the HTML keeps, its FIRST page draws it as a paragraph; later pages keep it as furniture. A footer the HTML does
// not keep (an address line) stays furniture everywhere.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host. ALLO_MODULE_DIR: private copies.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;
const NOTE = 'If you are 65 years old or older, you may study just the questions marked with an asterisk.';

async function tag(page, htmlKeepsNote: boolean, footerExtra = '') {
  return page.evaluate(async ({ NOTE, htmlKeepsNote, footerExtra }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, decodePDFRawStream, PDFRef, PDFArray } = W.PDFLib;
    const src = await PDFDocument.create(); const ctx = src.context;
    const font = await src.embedFont(StandardFonts.Helvetica);
    const footer = ctx.register(ctx.stream('BT /F1 9 Tf 40 50 Td (* ' + NOTE.replace(/[()\\]/g, '\\$&') + ') Tj ET\nBT /F1 9 Tf 450 30 Td (www.example.gov) Tj ET\n' + (footerExtra ? 'BT /F1 9 Tf 40 20 Td (' + footerExtra + ') Tj ET\n' : ''),
      { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 612, 792], Resources: { Font: { F1: font.ref } } }));
    const bodies = ['BT /F1 18 Tf 72 720 Td (Civics Questions) Tj ET\nBT /F1 12 Tf 72 690 Td (1. What is the supreme law of the land?*) Tj ET\n/Fm0 Do\n',
      'BT /F1 12 Tf 72 720 Td (2. What does the Constitution do?) Tj ET\n/Fm0 Do\n'];
    for (const body of bodies) {
      const pg = src.addPage([612, 792]);
      pg.node.setFontDictionary(PDFName.of('F1'), font.ref);
      pg.node.setXObject(PDFName.of('Fm0'), footer);
      pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream(body)));
    }
    const html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Civics Questions</h1>'
      + '<p>1. What is the supreme law of the land?*</p>' + (htmlKeepsNote ? '<p>* ' + NOTE + '</p>' : '')
      + '<p>2. What does the Constitution do?</p></main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Civics Questions' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const pageText = (i: number) => { const cs = look(doc.getPages()[i].node.get(PDFName.of('Contents'))); const st = cs instanceof PDFArray ? look(cs.get(0)) : cs; const b = st.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(st).decode() : st.contents; let s = ''; for (let k = 0; k < b.length; k++) s += String.fromCharCode(b[k]); return s; };
    const order: any[] = [];
    const walk = (x: any) => { const n = look(x); if (n instanceof PDFArray) { n.asArray().forEach(walk); return; } if (!n || !n.get) return; const at = n.get(PDFName.of('ActualText')); const K = n.get(PDFName.of('K')); const S = String(n.get(PDFName.of('S')) || ''); if (S === '/P') order.push({ text: at ? at.decodeText() : null, linked: K != null }); if (K != null) walk(K); };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    return { order, p1: pageText(0), p2: pageText(1), fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail), notes: (v && v.readingNotes || []).map((n: any) => n.id) };
  }, { NOTE, htmlKeepsNote, footerExtra });
}

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

test.describe.configure({ timeout: 180_000 });

test('a footer form printing a footnote the HTML keeps is a paragraph on its first page, furniture after', async ({ page }) => {
  await boot(page);
  const r = await tag(page, true);
  expect(r.p1).toMatch(/\/P <<\/MCID \d+>> BDC\n\/Fm0 Do\nEMC/);
  expect(r.p2).toMatch(/\/Artifact BMC\n\/Fm0 Do\nEMC/);
  expect(r.fails).toEqual([]);
  // (2026-11-04) it reads where the HTML has it: between the two questions, not after the last page
  expect(r.order.filter((p: any) => p.text).map((p: any) => p.text.slice(0, 12))).toEqual(['1. What is t', '* If you are', '2. What does']);
  expect(r.order.filter((p: any) => !p.text)).toEqual([]);
  expect(r.notes).toEqual([]);
});

test('a footer printing much more than the footnote keeps its own text: the paragraph does not claim the footnote alone', async ({ page }) => {
  await boot(page);
  const r = await tag(page, true, 'Office of Citizenship, Department of Homeland Security, Washington, District of Columbia 20529, open weekdays from nine until five');
  expect(r.p1).toMatch(/\/P <<\/MCID \d+>> BDC\n\/Fm0 Do\nEMC/);
  expect(r.order.some((p: any) => p.text === null && p.linked), 'an untexted paragraph, read from the form').toBe(true);
});

test('the same footnote printed straight on every page (no form) links once, on its first page', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async ({ NOTE }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFRef, PDFArray, PDFDict, PDFNumber } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    // 6 pages: repeated-text detection (_stage6b_detectArtifactHashes) needs 5+
    const qs = ['Civics Questions', '2. What does the Constitution do?', '3. What do we call the first ten amendments?', '4. What is one right in the First Amendment?', '5. What is the economic system?', '6. Name one branch of government.'];
    qs.forEach((q, i) => { const pg = src.addPage([612, 792]); pg.drawText(q, { x: 72, y: 720, size: i ? 12 : 18, font }); pg.drawText('* ' + NOTE, { x: 40, y: 50, size: 9, font }); });
    const html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Civics Questions</h1><p>* ' + NOTE + '</p>'
      + qs.slice(1).map((q) => '<p>' + q + '</p>').join('') + '</main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Civics Questions' });
    const doc = await PDFDocument.load(tagged.bytes || tagged); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const notes: any[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const at = n.get(PDFName.of('ActualText')); const K = n.get(PDFName.of('K'));
      if (at && /65 years/.test(at.decodeText())) { const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]); notes.push(kids.some((k: any) => { const d = look(k); return d instanceof PDFNumber || (d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/MCR'); })); }
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    return notes;
  }, { NOTE });
  expect(r).toEqual([true]);
});

test('a footer the HTML does not keep stays furniture on every page', async ({ page }) => {
  await boot(page);
  const r = await tag(page, false);
  expect(r.p1).toMatch(/\/Artifact BMC\n\/Fm0 Do\nEMC/);
  expect(r.p2).toMatch(/\/Artifact BMC\n\/Fm0 Do\nEMC/);
});
