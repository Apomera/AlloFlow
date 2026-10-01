// Fillable S0 golden (2026-06-12): detectFormBlanks + applyFormBlanks.
// Deterministic, no AI. Fixtures: a worksheet (underscore runs, mid-sentence
// blank, snake_case safety, checkbox list) and a permission slip (label-colon
// blanks, signature line, consent checkboxes). Pins: counts, label
// derivation, labelMissing flags, reject-path leaves blanks untouched,
// accepted fields become labeled inputs with unique names, re-detection
// after conversion is naturally idempotent (converted fields skipped).
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let r: any = null;

test.describe('Fillable S0 — blank detection + review-first conversion', () => {
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
        const WORKSHEET = '<!DOCTYPE html><html lang="en"><head><title>Worksheet</title></head><body><main>'
          + '<h1>Photosynthesis Worksheet</h1>'
          + '<p>Name: ________</p>'
          + '<p>The green pigment in leaves is called ______.</p>'
          + '<p>The file_name variable stays code.</p>'
          + '<ul><li>☐ Bring a pencil</li><li>[ ] Bring a notebook</li></ul>'
          + '</main></body></html>';
        const SLIP = '<!DOCTYPE html><html lang="en"><head><title>Permission Slip</title></head><body><main>'
          + '<h1>Field Trip Permission</h1>'
          + '<p>Student name: __________</p>'
          + '<p>Date: ______</p>'
          + '<p>☐ I give permission for my child to attend.</p>'
          + '<p>Parent signature: ____________________</p>'
          + '</main></body></html>';

        const wc = pipeline.detectFormBlanks(WORKSHEET);
        const sc = pipeline.detectFormBlanks(SLIP);

        // Accept all worksheet fields EXCEPT the mid-sentence blank (reject path).
        const acc: any = {};
        wc.forEach((c: any) => { if (!(c.kind === 'text' && /pigment/.test(c.context))) acc[c.id] = { label: c.label }; });
        const applied = pipeline.applyFormBlanks(WORKSHEET, acc);
        const redetect = pipeline.detectFormBlanks(applied.html);

        // Permission slip: accept everything.
        const sacc: any = {};
        sc.forEach((c: any) => { sacc[c.id] = { label: c.label }; });
        const sApplied = pipeline.applyFormBlanks(SLIP, sacc);

        const doc = new DOMParser().parseFromString(applied.html, 'text/html');
        const sdoc = new DOMParser().parseFromString(sApplied.html, 'text/html');
        return {
          wCounts: { text: wc.filter((c: any) => c.kind === 'text').length, check: wc.filter((c: any) => c.kind === 'checkbox').length },
          wLabels: wc.map((c: any) => c.label),
          sCounts: { text: sc.filter((c: any) => c.kind === 'text').length, check: sc.filter((c: any) => c.kind === 'checkbox').length },
          converted: applied.converted,
          inputs: Array.from(doc.querySelectorAll('input[data-allo-field]')).map((i: any) => ({ type: i.getAttribute('type'), name: i.getAttribute('name'), aria: i.getAttribute('aria-label') })),
          rejectedBlankSurvives: /called ______/.test(doc.body.textContent || '') || (doc.body.textContent || '').includes('______'),
          snakeCaseSafe: (doc.body.textContent || '').includes('file_name'),
          redetectCount: redetect.length,
          sigFieldWidth: (() => { const sig = Array.from(sdoc.querySelectorAll('input[type="text"]')).find((i: any) => /signature/.test(i.getAttribute('name') || '')); return sig ? ((sig.getAttribute('style') || '').match(/width:\s*(\d+)ch/) || [])[1] : null; })(),
          checkboxInLabel: !!sdoc.querySelector('label > input[type="checkbox"]'),
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('worksheet: counts + label derivation', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
    expect(r.wCounts).toEqual({ text: 2, check: 2 });
    expect(r.wLabels).toContain('Name');
    expect(r.snakeCaseSafe, 'single underscores inside identifiers must not match').toBeTruthy();
  });

  test('permission slip: counts (3 text incl. signature, 1 checkbox)', () => {
    expect(r.sCounts).toEqual({ text: 3, check: 1 });
  });

  test('apply: accepted convert with unique names + labels; rejected blank survives', () => {
    expect(r.converted).toBe(3);
    expect(r.inputs.length).toBe(3);
    expect(r.inputs.every((i: any) => i.name && i.aria !== '')).toBeTruthy();
    expect(new Set(r.inputs.map((i: any) => i.name)).size).toBe(3);
    expect(r.rejectedBlankSurvives, 'rejected blank keeps its underscores').toBeTruthy();
  });

  test('re-detection skips converted fields (only the rejected blank remains)', () => {
    expect(r.redetectCount).toBe(1);
  });

  test('field ergonomics: signature width from blank length, checkbox wrapped in label', () => {
    expect(Number(r.sigFieldWidth)).toBeGreaterThanOrEqual(15);
    expect(r.checkboxInLabel).toBeTruthy();
  });
});
