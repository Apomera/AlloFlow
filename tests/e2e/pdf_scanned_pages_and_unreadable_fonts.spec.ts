// Tagged PDF: scanned multi-page documents and pages whose fonts have no readable characters (2026-10-17).
//
// Measured on real documents:
//  - a 4-page scan with no per-page OCR map failed its own save check ("StructParents 1/4 pages"): every
//    leaf was planned across all 4 pages but text was synthesized for page 1 only, so pages 2-4 lost
//    their text from the content stream and the PDF was withheld;
//  - pages drawn with a font that has no usable ToUnicode (Hebrew UDHR, USGS water-cycle p30-32) were
//    tagged as text, so a screen reader read control characters / U+FFFD (veraPDF 7.21.7 x397);
//  - characters the embedded OCR font has no glyph for were drawn as .notdef (veraPDF 7.21.7/7.21.8).
// The REAL createTaggedPdf runs in Chromium (offline vendor bundle); veraPDF runs when Java exists.
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
  await page.evaluate(() => {
    const W: any = window;
    W.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://alloflow.test/vendor/pdf.worker.min.js';
    W.__alloflowRuntimeAssets = { pdfjsWorker: 'https://alloflow.test/vendor/pdf.worker.min.js' };
    W.__pipe = W.AlloModules.createDocPipeline({ callGemini: async () => 'OK', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {}, publishSourceTelemetry: false });
    // Per page: /StructParents present? marked content (an MCID) in the content stream?
    W.__pageFacts = async (bytes: Uint8Array) => {
      const { PDFDocument, PDFName, PDFArray, PDFRawStream } = W.PDFLib;
      const doc = await PDFDocument.load(bytes); const c = doc.context;
      return doc.getPages().map((pg: any) => {
        const raw = pg.node.get(PDFName.of('Contents')); const arr = c.lookup(raw);
        const refs = arr instanceof PDFArray ? arr.asArray() : [raw];
        let text = '';
        for (const r of refs) { const s = c.lookup(r); if (s instanceof PDFRawStream) { let b = s.contents; try { if (String(s.dict.get(PDFName.of('Filter')) || '').includes('Flate')) b = W.pako.inflate(b); } catch (_) {} text += Array.from(b as Uint8Array, (x: number) => String.fromCharCode(x)).join(''); } }
        return { structParents: pg.node.get(PDFName.of('StructParents')) != null, hasMcid: /\/MCID\s+\d+/.test(text) };
      });
    };
    W.__b64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000))); return btoa(s); };
  });
}

function veraRules(b64: string): any[] | null {
  let java: string | null = null;
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { if (spawnSync(j, ['-version'], { encoding: 'utf8' }).status === 0) { java = j; break; } } catch (_) { /* next */ }
  }
  if (!java) return null;
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-scan-')), 'out.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(b64, 'base64'));
  let out = '';
  try { out = execFileSync(java, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e: any) { out = String(e?.stdout || ''); if (!out) throw e; }
  const jobs = JSON.parse(out)?.report?.jobs || [];
  const d = jobs[0]?.validationResult?.details || (Array.isArray(jobs[0]?.validationResult) ? jobs[0].validationResult[0]?.details : null);
  return d?.ruleSummaries || [];
}

test.describe.configure({ timeout: 240_000 });

test.describe('scanned multi-page documents keep every page\'s text', () => {
  test('no per-page OCR map: every page with content is linked and the save check passes', async ({ page }) => {
    await boot(page);
    const res = await page.evaluate(async () => {
      const W: any = window;
      const { PDFDocument, rgb } = W.PDFLib;
      const src = await PDFDocument.create();
      // content on every page (stands in for the scanned image), as a real scan has
      for (let i = 0; i < 3; i++) src.addPage([612, 792]).drawRectangle({ x: 40, y: 40, width: 530, height: 700, color: rgb(0.95, 0.95, 0.95) });
      const box = String.fromCharCode(0x2610); // a ballot box the OCR font cannot draw
      const html = '<!DOCTYPE html><html lang="en"><head><title>Scan</title></head><body><main>'
        + '<h1>Chapter one</h1><p>The first page talks about rivers and lakes.</p><p>' + box + ' Yes, I have read the rules.</p>'
        + '<h2>Chapter two</h2><p>The second page talks about clouds and rain.</p><p>Water moves between the air and the ground.</p>'
        + '<h2>Chapter three</h2><p>The third page talks about snow and ice.</p><p>Ice stores water for a long time.</p></main></body></html>';
      const tagged = await W.__pipe.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html, groundTruthMethod: 'tesseract' }, { title: 'Scan', lang: 'en' });
      const bytes = tagged.bytes || tagged;
      return { roundTrip: tagged.roundTrip ? { ok: tagged.roundTrip.ok, fails: (tagged.roundTrip.checks || []).filter((c: any) => c.status === 'fail').map((c: any) => c.rule + ': ' + c.detail) } : null, pages: await W.__pageFacts(bytes), b64: W.__b64(bytes) };
    });
    expect(res.roundTrip, JSON.stringify(res.roundTrip)).toMatchObject({ ok: true });
    expect(res.pages).toEqual([{ structParents: true, hasMcid: true }, { structParents: true, hasMcid: true }, { structParents: true, hasMcid: true }]);
    const rules = veraRules(res.b64);
    test.skip(rules === null, 'No Java runtime for veraPDF (structural checks above ran)');
    const glyphFails = (rules || []).filter((r) => (String(r.clause) === '7.21.7' || String(r.clause) === '7.21.8') && Number(r.failedChecks) > 0);
    expect(glyphFails.map((r) => r.clause + '-' + r.testNumber + ' x' + r.failedChecks), 'no .notdef / unmapped glyphs in the OCR layer').toEqual([]);
  });

  test('a blank page in the OCR map is left as an artifact and does not fail the save check', async ({ page }) => {
    await boot(page);
    const res = await page.evaluate(async () => {
      const W: any = window;
      const { PDFDocument, rgb } = W.PDFLib;
      const src = await PDFDocument.create();
      for (let i = 0; i < 3; i++) src.addPage([612, 792]).drawRectangle({ x: 40, y: 40, width: 530, height: 700, color: rgb(0.95, 0.95, 0.95) });
      const html = '<!DOCTYPE html><html lang="en"><head><title>Scan</title></head><body><main><h1>Chapter One</h1><p>Chapter One body text.</p><p>Name Score Alice 90 Bob 82 resource</p></main></body></html>';
      const groundTruthPages = [{ pageNum: 1, text: 'Chapter One\nChapter One body text.' }, { pageNum: 2, text: '' }, { pageNum: 3, text: 'Name Score Alice 90 Bob 82 resource' }];
      const tagged = await W.__pipe.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html, groundTruthMethod: 'tesseract', groundTruthPages }, { title: 'Scan', lang: 'en' });
      return { roundTrip: tagged.roundTrip ? { ok: tagged.roundTrip.ok, fails: (tagged.roundTrip.checks || []).filter((c: any) => c.status === 'fail').map((c: any) => c.rule + ': ' + c.detail) } : null, pages: await W.__pageFacts(tagged.bytes || tagged) };
    });
    expect(res.roundTrip, JSON.stringify(res.roundTrip)).toMatchObject({ ok: true });
    expect(res.pages[1]).toEqual({ structParents: false, hasMcid: false });
    expect(res.pages[0].hasMcid && res.pages[2].hasMcid).toBe(true);
  });
});

test('pages whose fonts have no readable characters are flagged, never tagged as text, and withhold the PDF/UA claim', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, PDFName, StandardFonts } = W.PDFLib;
    const doc = await PDFDocument.create(); const ctx = doc.context;
    // page 1: a Type3 font named /a0../a40 with NO /ToUnicode (the Hebrew UDHR class)
    const N = 41; const glyph = ctx.register(ctx.flateStream('500 0 0 0 450 700 d1 0 0 450 700 re f'));
    const charProcs: any = {}; const diffs: any[] = [0];
    for (let i = 0; i < N; i++) { charProcs['a' + i] = glyph; diffs.push(PDFName.of('a' + i)); }
    const t3 = ctx.register(ctx.obj({ Type: 'Font', Subtype: 'Type3', FontBBox: [0, 0, 1000, 1000], FontMatrix: [0.001, 0, 0, 0.001, 0, 0], CharProcs: charProcs, Encoding: { Type: 'Encoding', Differences: diffs }, FirstChar: 0, LastChar: N - 1, Widths: new Array(N).fill(500), Resources: {} }));
    const H = [15, 15, 15, 40, 17, 8, 15, 15, 40, 19, 15, 40, 8, 8, 5, 14, 27, 20, 7, 3, 6, 35, 25, 37, 0, 25, 29, 21, 33, 21, 31, 18, 36, 25, 21, 3, 16, 35, 21, 20, 7, 36];
    const hex = (codes: number[]) => '<' + codes.map((c) => c.toString(16).padStart(2, '0')).join('') + '>';
    let cs = 'BT /T3 14 Tf 30 350 Td '; for (let k = 0; k < 6; k++) cs += hex(H.slice(k * 7, k * 7 + 7)) + ' Tj 0 -24 Td '; cs += 'ET';
    const p1 = doc.addPage([400, 400]);
    p1.node.set(PDFName.of('Resources'), ctx.obj({ Font: { T3: t3 } }));
    p1.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream(cs)));
    // page 2: ordinary text
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage([400, 400]).drawText('Every learner has a way in to this page of ordinary text.', { x: 20, y: 350, size: 10, font: helv });
    // page 3: a font whose /ToUnicode maps every code to U+FFFD (the USGS water-cycle class)
    const lines: string[] = []; for (let c = 0x20; c <= 0x7e; c++) lines.push('<' + c.toString(16) + '> <FFFD>');
    const cmap = '/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CMapName /Bad def /CMapType 2 def\n1 begincodespacerange <00> <FF> endcodespacerange\n' + lines.length + ' beginbfchar\n' + lines.join('\n') + '\nendbfchar\nendcmap CMapName currentdict /CMap defineresource pop end end';
    const bad = ctx.register(ctx.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica', Encoding: 'WinAnsiEncoding', ToUnicode: ctx.register(ctx.flateStream(cmap)) }));
    const p3 = doc.addPage([400, 400]);
    p3.node.set(PDFName.of('Resources'), ctx.obj({ Font: { F1: bad } }));
    p3.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream('BT /F1 12 Tf 30 350 Td (Worksheet answers go here in a table) Tj 0 -20 Td (Mineral resource consumption per person) Tj ET')));
    const srcBytes = await doc.save({ useObjectStreams: false });

    const det = await W.__pipe.extractPdfTextDeterministic(new Uint8Array(srcBytes));
    const html = '<!DOCTYPE html><html lang="en"><head><title>Mixed</title></head><body><main><h1>Mixed</h1><p>Every learner has a way in to this page of ordinary text.</p></main></body></html>';
    const tagged = await W.__pipe.createTaggedPdf(new Uint8Array(srcBytes), { accessibleHtml: html }, { title: 'Mixed', lang: 'en' });
    return {
      unreadablePages: (det.unreadablePages || []).map((u: any) => u.pageNum),
      page2Text: (det.pages[1] || {}).text, page1KeptForTheEditor: ((det.pages[0] || {}).text || '').length > 0,
      summary: { unreadableTextPages: tagged.summary && tagged.summary.unreadableTextPages, uaDeclared: tagged.summary && tagged.summary.uaDeclared },
      fontsUnrepairable: (tagged.summary && tagged.summary.fontsUnrepairable) || [],
      roundTripOk: tagged.roundTrip && tagged.roundTrip.ok,
      pages: await W.__pageFacts(tagged.bytes || tagged),
    };
  });
  expect(res.unreadablePages).toEqual([1, 3]);
  expect(res.page2Text).toContain('Every learner has a way in');
  // the extractor only FLAGS: the editor path shows the text so a person can see it and re-scan
  expect(res.page1KeptForTheEditor).toBe(true);
  expect(res.summary).toEqual({ unreadableTextPages: [1, 3], uaDeclared: false });
  // a Type3 font draws with procedures inside the file: never "unrepairable" (2026-10-18)
  expect(res.fontsUnrepairable.filter((u: string) => /Type3/.test(u))).toEqual([]);
  expect(res.roundTripOk).toBe(true);
  expect(res.pages.map((p: any) => p.hasMcid)).toEqual([false, true, false]);
});
