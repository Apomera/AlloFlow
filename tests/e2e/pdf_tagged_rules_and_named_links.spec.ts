// Two orphans from the 2026-11-02 corpus (fixed 2026-11-03):
//  - notifications: 18 one-pixel-high images (ruled lines) beside the signature, so no figure count matched and
//    the signature orphaned. An image 1-2 px thin is page furniture (/Artifact), not a figure candidate;
//  - activity4h: the page prints a bare address ("www.jpl.nasa.gov/edu/...the-types-of-clouds..."), wrapped into
//    many blocks; the HTML names the link "NASA JPL Education: ... (address)". The address in the closing
//    parentheses links to its adjacent printed blocks between the leaf's linked neighbours.
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

// Draw `runs` ([text, x, y][]) and `images` ([w, h, x, y][] as canvas PNGs), tag with `html`, report the tree.
async function tag(page, runs: any[], images: any[], html: string) {
  return page.evaluate(async ({ runs, images, html }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFNumber, decodePDFRawStream } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    for (const [t, x, y] of runs) pg.drawText(t, { x, y, size: 11, font });
    for (const [w, h, x, y] of images) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d')!; g.fillStyle = '#336'; g.fillRect(0, 0, w, h); g.fillStyle = '#fc0'; g.fillRect(0, 0, Math.ceil(w / 2), h);
      const png = Uint8Array.from(atob(cv.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0));
      pg.drawImage(await src.embedPng(png), { x, y, width: Math.max(w, 1), height: Math.max(h, 1) });
    }
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Doc' });
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
      const at = n.get(PDFName.of('ActualText')); const alt = n.get(PDFName.of('Alt'));
      if (S === '/Figure' || S === '/LBody' || S === '/P') leaves.push({ S, text: at ? at.decodeText() : null, alt: alt && alt.decodeText ? alt.decodeText() : null, linked });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const cs = look(doc.getPages()[0].node.get(PDFName.of('Contents')));
    const stream = new TextDecoder('latin1').decode(cs.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(cs).decode() : cs.contents);
    return {
      leaves, artifactDraws: (stream.match(/\/Artifact BMC\s*\/[^\s]+ Do/g) || []).length,
      fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail),
    };
  }, { runs, images, html });
}

test.describe.configure({ timeout: 180_000 });

test('ruled-line images (1-2 px thin) are page furniture, so the one real picture pairs with the one figure', async ({ page }) => {
  await boot(page);
  const r = await tag(page, [['Field Trip Permission', 72, 750], ['Dear families,', 72, 720], ['Please return the signed form by Friday.', 72, 700], ['Sincerely,', 72, 560]],
    [[300, 1, 72, 690], [200, 1, 72, 650], [150, 2, 72, 600], [120, 40, 72, 500], [1, 90, 400, 600]],
    '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Field Trip Permission</h1><p>Dear families,</p><p>Please return the signed form by Friday.</p>'
    + '<p>Sincerely,</p><p><img alt="Signature of the principal" src="data:image/png;base64,iVBORw0KGgo="></p></main></body></html>');
  expect(r.leaves.filter((l: any) => l.S === '/Figure' && l.alt === 'Signature of the principal')).toEqual([expect.objectContaining({ linked: true })]);
  expect(r.artifactDraws).toBe(4); // 3 horizontal rules and 1 vertical
  expect(r.fails).toEqual([]);
});

test('a 1x1 image is a picture, not a line: it still pairs with its figure', async ({ page }) => {
  await boot(page);
  const r = await tag(page, [['School Logo', 72, 750], ['Our school colors are blue and gold.', 72, 720]], [[1, 1, 72, 600]],
    '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>School Logo</h1><p>Our school colors are blue and gold.</p>'
    + '<p><img alt="School logo" src="data:image/png;base64,iVBORw0KGgo="></p></main></body></html>');
  expect(r.leaves.filter((l: any) => l.S === '/Figure' && l.alt === 'School logo')).toEqual([expect.objectContaining({ linked: true })]);
  expect(r.artifactDraws).toBe(0);
});

test('a link the HTML names, printed as a bare wrapped address, links to the printed address', async ({ page }) => {
  await boot(page);
  // the address wraps into separate show operators, as activity4h prints it
  const r = await tag(page, [['Learn more about cloud and rain science:', 72, 720], ['www.example.org/learn/project/the', 90, 700], ['-', 280, 700], ['types', 285, 700],
    ['-', 315, 700], ['of', 320, 700], ['-', 332, 700], ['clouds', 337, 700], ['The University is an equal opportunity employer.', 72, 600]], [],
    '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Learn more about cloud and rain science:</h1>'
    + '<ul><li><a href="https://www.example.org/learn/project/the-types-of-clouds">Example Learning: The Types of Clouds (www.example.org/learn/project/the-types-of-clouds)</a></li></ul>'
    + '<p>The University is an equal opportunity employer.</p></main></body></html>');
  expect(r.leaves.find((l: any) => l.S === '/LBody')).toEqual(expect.objectContaining({ text: 'Example Learning: The Types of Clouds (www.example.org/learn/project/the-types-of-clouds)', linked: true }));
  expect(r.fails).toEqual([]);
});
