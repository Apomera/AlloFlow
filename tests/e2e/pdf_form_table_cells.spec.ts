// Form tables in the tagged PDF (2026-10-18, Aaron approved; measured on IRS Form 1040, which went from
// 140 unlinked leaves to 0 and now earns the PDF/UA declaration, veraPDF clean):
//  - a header row NONE of whose headers is printed (the AI's "Line | Description | Amount") leaves the
//    table, and no cell keeps pointing at its headers (Option A);
//  - a cell the AI invented that is not on the page ("not applicable") stays in the grid as an EMPTY cell;
//  - a blank field cell ("________") holds the widget's Form element (TD > Form > OBJR), paired by the
//    row's printed line label, and loses its placeholder /ActualText;
//  - the validator counts nested content, exempts empty cells, and asks for /ActualText only on a cell
//    with no content (its detail now prints the FAILING count, not the total).
import { test, expect } from '@playwright/test';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const VENDOR = path.join(ROOT, 'desktop/mcp/vendor');

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

test.describe.configure({ timeout: 240_000 });

test('a form table keeps only what is printed, and its blank field cell holds the field', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFHexString, PDFDict, PDFArray, PDFRef } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    const at = (t: string, x: number, y: number) => pg.drawText(t, { x, y, size: 11, font });
    at('Tax Form 2025', 40, 740);
    at('1a', 40, 700); at('Wages . . . . . . . . . . .', 70, 700);
    at('1b', 40, 676); at('Tips . . . . . . . . . . . .', 70, 676);
    // "amount" and "line" occur in printed SENTENCES: an invented header "Amount" is still not printed
    at('Enter each amount on its line.', 40, 640);
    const tf = src.getForm().createTextField('topmostSubform[0].Page1[0].f1_01[0]');
    tf.addToPage(pg, { x: 400, y: 696, width: 120, height: 16, font });
    tf.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText('1a. Wages.'));
    // the AI repeats the printed title as an H2 with one word more: a near repeat, left out
    const html = '<!DOCTYPE html><html lang="en"><head><title>Tax Form</title></head><body><main><h1>Tax Form 2025</h1><h2>Tax Form 2025 Edition</h2>'
      + '<table><tr><th scope="col">Line</th><th scope="col">Description</th><th scope="col">Amount</th></tr>'
      + '<tr><th scope="row">1a</th><td>Wages</td><td>________</td></tr>'
      + '<tr><th scope="row">1b</th><td>Tips</td><td>not applicable</td></tr></table><p>Enter each amount on its line.</p></main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Tax Form', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { title: 'Tax Form', lang: 'en' });
    const bytes: Uint8Array = tagged.bytes || tagged;
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
    const dec = (v: any) => (v && typeof v.decodeText === 'function' ? v.decodeText() : null);
    const cells: any[] = []; const ids = new Set<string>(); const headerRefs: string[] = []; const seen = new Set(); const headings: string[] = [];
    const walk = (v: any) => {
      const n = look(v);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      if (v instanceof PDFRef) { if (seen.has(String(v))) return; seen.add(String(v)); }
      const S = String(n.get(PDFName.of('S')) || '');
      if (/^\/H[1-6]$/.test(S)) headings.push(S + ' ' + dec(n.get(PDFName.of('ActualText'))));
      if (S === '/TH' || S === '/TD') {
        const id = dec(n.get(PDFName.of('ID'))); if (id) ids.add(id);
        const A = look(n.get(PDFName.of('A'))); const H = A instanceof PDFDict ? look(A.get(PDFName.of('Headers'))) : null;
        if (H instanceof PDFArray) H.asArray().forEach((h: any) => headerRefs.push(dec(h)));
        const K = n.get(PDFName.of('K')); const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
        const form = kids.map(look).find((d: any) => d instanceof PDFDict && String(d.get(PDFName.of('S'))) === '/Form');
        cells.push({ S, text: dec(n.get(PDFName.of('ActualText'))), hasK: K != null, form: form ? { parentIsCell: String(form.get(PDFName.of('P'))) === String(v), hasObjr: (look(form.get(PDFName.of('K'))) instanceof PDFArray ? look(form.get(PDFName.of('K'))).asArray() : [form.get(PDFName.of('K'))]).some((k: any) => { const d = look(k); return d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/OBJR'; }) } : null });
      }
      const K = n.get(PDFName.of('K')); if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const check = (rule: string) => ((v && v.checks) || []).find((x: any) => x.rule.startsWith(rule)) || null;
    const s = tagged.summary || {};
    let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)) as number[]);
    return {
      cells, ids: Array.from(ids), headerRefs, headings,
      summary: { fieldsNestedInCells: s.fieldsNestedInCells, offPageHeaderRowsDropped: s.offPageHeaderRowsDropped, offPageCellsBlanked: s.offPageCellsBlanked, orphanedLeaves: s.orphanedLeaves },
      orphanCheck: check('No orphaned semantic leaves'), cellTextCheck: check('Every TH/TD has /ActualText'), b64: btoa(b64),
    };
  });
  expect(r.headings).toEqual(['/H1 Tax Form 2025']);
  // the invented header row is gone, and nothing points at it
  expect(r.cells.map((x: any) => x.text)).not.toEqual(expect.arrayContaining(['Line']));
  expect(r.cells.some((x: any) => ['Line', 'Description', 'Amount'].includes(x.text))).toBe(false);
  for (const h of r.headerRefs) expect(r.ids, 'every /Headers id resolves').toContain(h);
  // "not applicable" is an empty cell (no text, no content); the blank field cell holds the field
  expect(r.cells.some((x: any) => x.text === 'not applicable')).toBe(false);
  expect(r.cells.filter((x: any) => x.S === '/TD' && x.text == null && !x.hasK)).toHaveLength(1);
  const fieldCell = r.cells.find((x: any) => x.form);
  expect(fieldCell, JSON.stringify(r.cells)).toBeTruthy();
  expect(fieldCell).toMatchObject({ S: '/TD', text: null, form: { parentIsCell: true, hasObjr: true } });
  expect(r.summary).toMatchObject({ fieldsNestedInCells: 1, offPageHeaderRowsDropped: 1, offPageCellsBlanked: 1, orphanedLeaves: 0 });
  expect(r.orphanCheck).toMatchObject({ status: 'pass' });
  expect(r.cellTextCheck).toMatchObject({ status: 'pass' });

  // real veraPDF, when Java exists: tables, headings and annotations clean
  let java: string | null = null;
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { if (spawnSync(j, ['-version'], { encoding: 'utf8' }).status === 0) { java = j; break; } } catch (_) { /* next */ }
  }
  test.skip(!java, 'No Java runtime for veraPDF (structural checks above ran)');
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-cells-')), 'form.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(r.b64, 'base64'));
  let out = '';
  try { out = execFileSync(java!, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e: any) { out = String(e?.stdout || ''); if (!out) throw e; }
  const jobs = JSON.parse(out)?.report?.jobs || [];
  const vr = Array.isArray(jobs[0]?.validationResult) ? jobs[0].validationResult[0] : jobs[0]?.validationResult;
  const rules: any[] = vr?.details?.ruleSummaries || [];
  expect(rules.length > 0 || vr?.compliant === true, 'veraPDF produced a verdict: ' + out.slice(0, 600)).toBe(true);
  const bad = rules.filter((x) => /^7\.(2|4|18)/.test(String(x.clause)) && Number(x.failedChecks) > 0).map((x) => x.clause + '-' + x.testNumber + ' x' + x.failedChecks);
  expect(bad, 'PDF/UA table / heading / annotation rules').toEqual([]);
});

test('validator: nested content counts, empty cells are exempt, /ActualText only where there is no content', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, PDFName, PDFHexString, PDFNumber, StandardFonts } = W.PDFLib;
    // one table row per case: [TD shape]
    const run = async (shape: string) => {
      const d = await PDFDocument.create(); const ctx = d.context;
      const pg = d.addPage([300, 300]); pg.drawText('x', { x: 20, y: 250, size: 12, font: await d.embedFont(StandardFonts.Helvetica) });
      const rootRef = ctx.nextRef(); const tableRef = ctx.nextRef(); const trRef = ctx.nextRef(); const tdRef = ctx.nextRef();
      const td: any = { Type: 'StructElem', S: 'TD', P: trRef };
      if (shape === 'nested-form') { const annot = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Widget', Rect: [0, 0, 10, 10] })); td.K = [ctx.register(ctx.obj({ Type: 'StructElem', S: 'Form', P: tdRef, K: [ctx.obj({ Type: 'OBJR', Obj: annot, Pg: pg.ref })] }))]; }
      if (shape === 'linked-no-text') td.K = [ctx.obj({ Type: 'MCR', Pg: pg.ref, MCID: PDFNumber.of(0) })];
      if (shape === 'unlinked-text') td.ActualText = PDFHexString.fromText('Wages');
      // 'empty': neither
      ctx.assign(tdRef, ctx.obj(td));
      ctx.assign(trRef, ctx.obj({ Type: 'StructElem', S: 'TR', P: tableRef, K: [tdRef] }));
      ctx.assign(tableRef, ctx.obj({ Type: 'StructElem', S: 'Table', P: rootRef, K: [trRef] }));
      ctx.assign(rootRef, ctx.obj({ Type: 'StructTreeRoot', K: [tableRef] }));
      d.catalog.set(PDFName.of('StructTreeRoot'), rootRef);
      const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(await d.save());
      const get = (rule: string) => (v.checks.find((x: any) => x.rule.startsWith(rule)) || {});
      return { orphan: get('No orphaned semantic leaves').status, cellText: get('Every TH/TD has /ActualText').status, cellDetail: get('Every TH/TD has /ActualText').detail };
    };
    return { nested: await run('nested-form'), linked: await run('linked-no-text'), empty: await run('empty'), unlinked: await run('unlinked-text') };
  });
  expect(res.nested).toMatchObject({ orphan: 'pass', cellText: 'pass' });
  expect(res.linked).toMatchObject({ orphan: 'pass', cellText: 'pass' });
  expect(res.empty).toMatchObject({ orphan: 'pass', cellText: 'pass' });
  expect(res.unlinked).toMatchObject({ orphan: 'fail' });
  // the detail counts FAILING cells, not all cells
  expect(res.linked.cellDetail).toMatch(/^0\/1 /);
});
