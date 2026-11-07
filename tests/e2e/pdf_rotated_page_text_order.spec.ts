// Text extraction on a /Rotate page (2026-11-03, notifications: a tabloid brochure at /Rotate 90). pdf.js reports
// its text in the UNROTATED space, where the displayed lines stack along x at one y: the extractor read them as one
// line, glued line ends to the next line ("may be" + "grade." = "begrade") and read the columns interleaved, and the
// coverage check flagged words the HTML has. _alloUprightTextItems orders and joins in the displayed frame.
// The REAL extractPdfTextDeterministic runs in Chromium under the verified-runtime host. ALLO_MODULE_DIR: private copies.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

const COL1 = ['Families are asked to call the', 'school office when a child will', 'be absent, so attendance can be', 'recorded on the same day.'];
const COL2 = ['Buses leave at three fifteen.', 'Pickup changes need a note', 'from a parent or guardian.'];

// Lines laid out as DISPLAYED: column x at X, lines going down from Y0. rotate90: the page is /Rotate 90 and each
// displayed point (X, Y) is drawn at user (W - Y, X) with the text turned +90 degrees, as such brochures draw it.
async function extract(page, rotate90: boolean, twoColumns: boolean) {
  return page.evaluate(async ({ COL1, COL2, rotate90, twoColumns }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, degrees } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pw = 612, ph = 792;
    const pg = rotate90 ? src.addPage([pw, ph]) : src.addPage([ph, pw]);
    if (rotate90) pg.setRotation(degrees(90));
    const draw = (lines: string[], X: number) => lines.forEach((t, i) => {
      const Y = 540 - i * 15;
      if (rotate90) pg.drawText(t, { x: pw - Y, y: X, size: 11, font, rotate: degrees(90) });
      else pg.drawText(t, { x: X, y: Y, size: 11, font });
    });
    draw(COL1, 72); if (twoColumns) draw(COL2, 420);
    const bytes = new Uint8Array(await src.save());
    let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const det = await pipeline.extractPdfTextDeterministic(btoa(b64));
    return det.fullText as string;
  }, { COL1, COL2, rotate90, twoColumns });
}

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

test.describe.configure({ timeout: 180_000 });

test('a /Rotate 90 page: each line end keeps its space before the next line (no "begrade")', async ({ page }) => {
  await boot(page);
  const rotated = await extract(page, true, false);
  expect(rotated).toBe(COL1.join(' '));
});

test('turned text on an upright page (a sidebar label) keeps a space between its lines', async ({ page }) => {
  await boot(page);
  const text = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, StandardFonts, degrees } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    // two lines of a label turned +90 degrees: same baseline start y, the second line 15 pt further right
    pg.drawText('Spring Family', { x: 50, y: 300, size: 11, font, rotate: degrees(90) });
    pg.drawText('Newsletter', { x: 65, y: 300, size: 11, font, rotate: degrees(90) });
    const bytes = new Uint8Array(await src.save());
    let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    return (await pipeline.extractPdfTextDeterministic(btoa(b64))).fullText;
  });
  expect(text).toBe('Spring Family Newsletter');
});

test('a /Rotate 90 page with two columns reads exactly as the same page drawn upright', async ({ page }) => {
  await boot(page);
  const upright = await extract(page, false, true);
  const rotated = await extract(page, true, true);
  expect(upright.indexOf('Families are asked')).toBeLessThan(upright.indexOf('Buses leave'));
  expect(rotated).toBe(upright);
});
