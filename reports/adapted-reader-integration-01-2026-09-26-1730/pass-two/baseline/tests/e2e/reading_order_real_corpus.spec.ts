// Rendered-browser regression over committed, real government PDFs. The broad
// synthetic suite isolates classifier branches; this file catches the integration
// failures that only pdf.js item geometry, embedded fonts, and mixed page layouts expose.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const MODULE_PATH = path.join(ROOT, 'doc_pipeline_module.js');
const PDFJS_PATH = path.join(ROOT, 'desktop/mcp/vendor/pdfjs.min.js');
const PDFJS_WORKER_PATH = path.join(ROOT, 'desktop/mcp/vendor/pdf.worker.min.js');
const CORPUS = (relative: string) => path.join(ROOT, 'mcp-testing/corpus', relative);

test.describe('reading order — real PDF corpus', () => {
  test('preserves items and classifies IRS mixed layouts without splitting a numeric table', async ({ page }) => {
    test.setTimeout(120000);
    const irsB64 = fs.readFileSync(CORPUS('born-digital/irs-i1040-instructions.pdf')).toString('base64');
    const workerB64 = fs.readFileSync(PDFJS_WORKER_PATH).toString('base64');

    await page.goto('about:blank');
    await page.addScriptTag({ path: PDFJS_PATH });
    await page.addScriptTag({ path: MODULE_PATH });
    const rows = await page.evaluate(async ({ irsB64, workerB64 }) => {
      const pdfjs = (window as any).pdfjsLib;
      const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const bytes = Uint8Array.from(atob(irsB64), (char: string) => char.charCodeAt(0));
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const order = (window as any).AlloModules.createDocPipeline.orderTextItems;
      const signature = (item: any) => JSON.stringify([
        String((item && item.str) || ''),
        ...((item && item.transform) || []).map((value: number) => Math.round(Number(value || 0) * 100) / 100),
        Math.round(Number((item && item.width) || 0) * 100) / 100,
        String((item && item.fontName) || ''),
      ]);
      const pageNumbers = [9, 12, 68, 88, 124];
      const out = [];
      for (const pageNumber of pageNumbers) {
        const text = await (await pdf.getPage(pageNumber)).getTextContent();
        const input = text.items || [];
        const first = order(input, {});
        const second = order(input, {});
        const inputBag = input.map(signature).sort();
        const outputBag = first.items.map(signature).sort();
        out.push({
          page: pageNumber,
          applied: first.applied,
          columns: first.columns,
          inputCount: input.length,
          outputCount: first.items.length,
          lossless: JSON.stringify(inputBag) === JSON.stringify(outputBag),
          deterministic: first.items.map(signature).join('\n') === second.items.map(signature).join('\n'),
        });
      }
      try { await pdf.destroy(); } catch (_) {}
      URL.revokeObjectURL(workerUrl);
      return out;
    }, { irsB64, workerB64 });

    for (const row of rows) {
      expect(row.inputCount, 'fixture page ' + row.page + ' must contain text items').toBeGreaterThan(20);
      expect(row.outputCount, 'page ' + row.page + ' must not lose items').toBe(row.inputCount);
      expect(row.lossless, 'page ' + row.page + ' must preserve the exact pdf.js item multiset').toBe(true);
      expect(row.deterministic, 'page ' + row.page + ' must order identically on repeat').toBe(true);
    }
    const byPage = new Map(rows.map((row) => [row.page, row]));
    expect(byPage.get(9)).toMatchObject({ applied: true });
    expect(byPage.get(9)!.columns).toBeGreaterThanOrEqual(3);
    expect(byPage.get(12)).toMatchObject({ applied: true });
    expect(byPage.get(12)!.columns).toBeGreaterThanOrEqual(3);
    // IRS page 68 is a dense numeric tax table. It must stay row-major, not be
    // mistaken for prose columns merely because it has repeated x-bands.
    expect(byPage.get(68)).toMatchObject({ applied: false, columns: 1 });
    expect(byPage.get(88)).toMatchObject({ applied: true });
    expect(byPage.get(88)!.columns).toBeGreaterThanOrEqual(3);
    // Page 124 is the real two-sided alphabetical index. Its baselines align
    // like a table, but column-major order is correct; the list classifier must
    // distinguish it from the numeric table on page 68.
    expect(byPage.get(124)).toMatchObject({ applied: true });
    expect(byPage.get(124)!.columns).toBeGreaterThanOrEqual(2);
  });

  test('keeps a real single-column Education Department letter on the conservative path', async ({ page }) => {
    const pdfB64 = fs.readFileSync(CORPUS('born-digital/ed-parent-guide-idea.pdf')).toString('base64');
    const workerB64 = fs.readFileSync(PDFJS_WORKER_PATH).toString('base64');
    await page.goto('about:blank');
    await page.addScriptTag({ path: PDFJS_PATH });
    await page.addScriptTag({ path: MODULE_PATH });
    const rows = await page.evaluate(async ({ pdfB64, workerB64 }) => {
      const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      const bytes = Uint8Array.from(atob(pdfB64), (char: string) => char.charCodeAt(0));
      const pdf = await (window as any).pdfjsLib.getDocument({ data: bytes }).promise;
      const order = (window as any).AlloModules.createDocPipeline.orderTextItems;
      const out = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const text = await (await pdf.getPage(pageNumber)).getTextContent();
        const result = order(text.items || [], {});
        out.push({ page: pageNumber, items: (text.items || []).length, applied: result.applied, columns: result.columns });
      }
      try { await pdf.destroy(); } catch (_) {}
      URL.revokeObjectURL(workerUrl);
      return out;
    }, { pdfB64, workerB64 });

    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row.items).toBeGreaterThan(20);
      expect(row).toMatchObject({ applied: false, columns: 1 });
    }
  });
});
