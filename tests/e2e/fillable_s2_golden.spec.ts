// Fillable S2 golden (2026-06-12): blanks located by PRINTED COORDINATES on
// the original PDF, widgets placed exactly there, Stage 3 tags them.
// Fixture PDF is built in-test with pdf-lib: a label + its own-item
// underscore run (exact confidence), a substring blank (approx), and a
// checkbox glyph line. Pins: detection counts/labels/confidence, widget
// placement coordinates within tolerance of the blank, reading-order field
// creation, reject-path, and the tagged round-trip (summary.fields).
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

let r: any = null;

test.describe('Fillable S2 — widgets on the original layout', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240000);
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ url: PDFJS_CDN });
    await page.waitForFunction(() => !!(window as any).pdfjsLib, null, { timeout: 30000 });
    await page.evaluate((w) => { (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = w; }, PDFJS_WORKER);
    await page.addScriptTag({ path: PIPELINE_PATH });

    r = await page.evaluate(async () => {
      try {
        const PL = (window as any).PDFLib;
        // Build the fixture: one page, three blanks.
        const fx = await PL.PDFDocument.create();
        const pg = fx.addPage([612, 792]);
        const font = await fx.embedFont(PL.StandardFonts.Helvetica);
        pg.drawText('Student name:', { x: 50, y: 700, size: 12, font });
        pg.drawText('____________', { x: 140, y: 700, size: 12, font });           // own item → exact
        pg.drawText('I agree to the terms: ______ (initials)', { x: 50, y: 660, size: 12, font }); // substring → approx
        pg.drawText('[ ] Attending the trip', { x: 50, y: 620, size: 12, font });   // checkbox glyph
        const fxBytes = await fx.save();
        const b64 = btoa(Array.from(new Uint8Array(fxBytes), (b) => String.fromCharCode(b)).join(''));

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const cands = await pipeline.detectPdfBlankFields(b64);

        // Accept all but the approx initials blank (reject path).
        const acc: any = {};
        cands.forEach((c: any) => { if (!/initials|terms/i.test(c.context)) acc[c.id] = { label: c.label }; });
        const fielded = await pipeline.overlayPdfFormFields(b64, cands, acc);

        const reopened = await PL.PDFDocument.load(fielded.bytes);
        const fields = reopened.getForm().getFields().map((f: any) => ({
          name: f.getName(),
          type: (f instanceof PL.PDFTextField) ? 'TextField' : (f instanceof PL.PDFCheckBox) ? 'CheckBox' : 'Other',
          rect: (() => { try { const w = f.acroField.getWidgets()[0]; const rr = w.getRectangle(); return { x: rr.x, y: rr.y, w: rr.width }; } catch (_) { return null; } })(),
        }));

        // Tag the fielded bytes (Stage 3 should tag both widgets).
        const tagged = await pipeline.createTaggedPdf(fielded.bytes, { accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>Slip</title></head><body><main><h1>Slip</h1><p>Student name:</p><p>I agree to the terms: ______ (initials)</p><p>Attending the trip</p></main></body></html>' }, { title: 'Slip', lang: 'en' });

        return {
          counts: { total: cands.length, text: cands.filter((c: any) => c.kind === 'text').length, check: cands.filter((c: any) => c.kind === 'checkbox').length },
          nameCand: cands.find((c: any) => /student name/i.test(c.label || '')) || null,
          allCands: cands.map((c: any) => ({ label: c.label, kind: c.kind, conf: c.confidence })),
          approxCand: cands.find((c: any) => c.confidence === 'approx') || null,
          created: fielded.created,
          fields,
          taggedFields: (tagged && tagged.summary && tagged.summary.fields) || 0,
          roundTripOk: !(tagged && tagged.roundTrip && tagged.roundTrip.ok === false),
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('detection: 3 blanks, kinds and confidence tiers', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
    expect(r.counts).toEqual({ total: 3, text: 2, check: 1 });
    expect(r.nameCand, 'label derived from same-line neighbor: ' + JSON.stringify(r.allCands)).toBeTruthy();
    expect(r.nameCand.confidence).toBe('exact');
    expect(r.approxCand, 'substring blank flagged approx').toBeTruthy();
  });

  test('overlay: accepted fields placed, rejected blank untouched', () => {
    expect(r.created).toBe(2);
    expect(r.fields.length).toBe(2);
    expect(r.fields.filter((f: any) => f.type === 'TextField').length).toBe(1);
    expect(r.fields.filter((f: any) => f.type === 'CheckBox').length).toBe(1);
  });

  test('placement: the name field sits on the printed blank (±3pt)', () => {
    const tf = r.fields.find((f: any) => f.type === 'TextField');
    expect(tf && tf.rect).toBeTruthy();
    expect(Math.abs(tf.rect.x - 140)).toBeLessThanOrEqual(3);
    expect(Math.abs(tf.rect.y - 697)).toBeLessThanOrEqual(4);
    expect(tf.rect.w).toBeGreaterThan(40);
  });

  test('reading order: top blank becomes the first field', () => {
    expect(r.fields[0].type).toBe('TextField');
    expect(r.fields[1].type).toBe('CheckBox');
  });

  test('Stage 3 tags the placed widgets; tagged round-trip holds', () => {
    expect(r.taggedFields).toBe(2);
    expect(r.roundTripOk).toBeTruthy();
  });
});
