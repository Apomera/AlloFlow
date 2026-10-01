// Fillable S1 golden (2026-06-12): semantic fields → REAL AcroForm widgets
// in the typeset tagged PDF. Pins: (1) field count + names + types survive
// into the saved PDF (re-opened with pdf-lib), (2) Stage 3 tags every
// widget (summary.fields) with zero new tagging code, (3) declaration
// still evidence-gated and EARNED, (4) creation order = reading order
// (text field before checkbox in a doc where the text blank comes first),
// (5) a fieldless doc creates no form. Deterministic, no AI.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let r: any = null;

test.describe('Fillable S1 — AcroForm fields in the typeset tagged PDF', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: PIPELINE_PATH });

    r = await page.evaluate(async () => {
      try {
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        // The S0 → S1 chain: detect + apply on a permission slip, then typeset.
        const SLIP = '<!DOCTYPE html><html lang="en"><head><title>Permission Slip</title></head><body><main>'
          + '<h1>Field Trip Permission</h1>'
          + '<p>Student name: __________</p>'
          + '<p>☐ I give permission for my child to attend.</p>'
          + '<p>Parent signature: ____________________</p>'
          + '</main></body></html>';
        const cands = pipeline.detectFormBlanks(SLIP);
        const acc: any = {};
        cands.forEach((c: any) => { acc[c.id] = { label: c.label }; });
        const fielded = pipeline.applyFormBlanks(SLIP, acc);

        const tagged = await pipeline.createTypesetTaggedPdf({ accessibleHtml: fielded.html }, { title: 'Permission Slip', lang: 'en' });

        const reopened = await (window as any).PDFLib.PDFDocument.load(tagged.bytes);
        const PL = (window as any).PDFLib;
        const fields = reopened.getForm().getFields().map((f: any) => ({ name: f.getName(), type: (f instanceof PL.PDFTextField) ? 'TextField' : (f instanceof PL.PDFCheckBox) ? 'CheckBox' : 'Other' }));

        const plain = await pipeline.createTypesetTaggedPdf({ accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><main><h1>Title</h1><p>No blanks here.</p></main></body></html>' }, { title: 'T', lang: 'en' });
        let plainFieldCount = 0;
        try { plainFieldCount = (await (window as any).PDFLib.PDFDocument.load(plain.bytes)).getForm().getFields().length; } catch (_) { plainFieldCount = 0; }

        return {
          converted: fielded.converted,
          fields,
          summary: { fields: (tagged.summary || {}).fields, fieldsCreated: (tagged.summary || {}).fieldsCreated, uaDeclared: !!(tagged.summary || {}).uaDeclared, orphans: (tagged.summary || {}).orphanedLeaves },
          roundTripOk: !(tagged.roundTrip && tagged.roundTrip.ok === false),
          plainFieldCount,
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('all three fields become real widgets with the right types', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
    expect(r.converted).toBe(3);
    expect(r.fields.length).toBe(3);
    expect(r.fields.filter((f: any) => /TextField/i.test(f.type)).length).toBe(2);
    expect(r.fields.filter((f: any) => /CheckBox/i.test(f.type)).length).toBe(1);
    expect(r.summary.fieldsCreated).toBe(3);
  });

  test('names derive from labels and survive', () => {
    const names = r.fields.map((f: any) => f.name).join(' ');
    expect(names).toMatch(/student_name/);
    expect(names).toMatch(/signature/);
  });

  test('creation order = reading order (name field first, checkbox second)', () => {
    expect(/TextField/i.test(r.fields[0].type)).toBeTruthy();
    expect(/CheckBox/i.test(r.fields[1].type)).toBeTruthy();
  });

  test('Stage 3 tags every widget; declaration evidence-gated and EARNED', () => {
    expect(r.summary.fields).toBe(3);
    expect(r.summary.orphans).toBe(0);
    expect(r.roundTripOk).toBeTruthy();
    expect(r.summary.uaDeclared).toBeTruthy();
  });

  test('fieldless documents create no form', () => {
    expect(r.plainFieldCount).toBe(0);
  });
});
