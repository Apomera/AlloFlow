// RSU 57 budget keyless run (2026-11-04, budget_v5): the tagged PDF was delivered and passed veraPDF, yet page text no
// HTML leaf claimed stayed real content AFTER the document: "u" bullets, page numbers, axis ticks, repeated slide titles
// and a second H1. Repeated "Source" lines linked one page off, and a heading printed only inside a picture linked to a
// chart legend three pages earlier. Now:
//  - a short label inside a linked figure's crop joins that figure;
//  - a bullet glyph, the page's own number or an exact repeat of linked text becomes a real /Artifact;
//  - other leftover text stays readable, as a paragraph, never a heading;
//  - leaves with the same text take their copies in page order;
//  - a short heading linked outside its neighbours' pages is released (re-linked to an exact copy on its own pages).
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host; veraPDF runs when Java exists.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

function veraFails(b64: string): string[] | null {
  let java: string | null = null;
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { execFileSync(j, ['-version'], { stdio: 'ignore' }); java = j; break; } catch (_) { /* next */ }
  }
  if (!java) return null;
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-leftover-')), 'out.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(b64, 'base64'));
  let out = '';
  try { out = execFileSync(java, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--maxfailuresdisplayed', '5', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e: any) { out = String(e.stdout || ''); }
  const j = JSON.parse(out); const x = j.report.jobs[0].validationResult; const vr = Array.isArray(x) ? x[0] : x;
  return (vr.details.ruleSummaries || []).filter((s: any) => s.ruleStatus !== 'PASSED').map((s: any) => s.clause + '-' + s.testNumber);
}

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

// Chart region x 100-400, y 300-500 on a 612x792 page: displayed (y-down) fractions 0.1634 0.3687 0.6536 0.6212.
const CHART_CROP = '2 0.1634 0.3687 0.6536 0.6212';

async function tag(page, scene: string) {
  return page.evaluate(async ({ scene, CHART_CROP }) => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const add = () => src.addPage([612, 792]);
    const say = (p: any, s: string, x: number, y: number, size = 12) => p.drawText(s, { x, y, size, font });
    const LONG = (n: string) => 'Paragraph ' + n + ' explains what the committee decided about the budget this year.';
    let html = '';
    if (scene === 'leftovers') {
      const p1 = add();
      say(p1, 'Annual Report', 72, 740, 20);
      say(p1, LONG('one'), 72, 700);
      say(p1, '1', 300, 40);
      const p2 = add();
      say(p2, 'Annual Report', 72, 740, 20);                       // the slide title repeated
      say(p2, 'Enrollment History', 72, 710, 16);
      say(p2, 'u', 72, 680);                                       // a Wingdings-style bullet decoded as a letter
      p2.pushOperators(L.pushGraphicsState(), L.moveTo(120, 310), L.lineTo(390, 310), L.stroke(), L.popGraphicsState()); // the chart's axis
      say(p2, '2600', 105, 330); say(p2, 'FY19', 150, 303);        // labels inside the crop
      say(p2, 'FY20', 402, 303);                                   // just outside it, within 3% of the page
      say(p2, 'This sentence inside the chart area has far too many words to be a label.', 110, 480, 8);
      say(p2, 'Unclaimed Big Title', 72, 250, 30);                 // leftover drawn large: a draft heading
      say(p2, 'A sentence the HTML never mentions stays readable.', 72, 220);
      say(p2, '7', 72, 200);                                       // a number that is not this page's
      say(p2, '2', 300, 40);                                       // this page's number
      html = '<h1>Annual Report</h1><p>' + LONG('one') + '</p><h2>Enrollment History</h2>'
        + '<figure data-allo-source-crop="' + CHART_CROP + '"><img alt="Line chart of enrollment, 2600 students in FY19" src="data:image/png;base64,iVBORw0KGgo="></figure>';
    } else if (scene === 'backwards') {
      // the HTML reads page 2's paragraph first: a real order problem a person should see, nothing a rule fails on
      const p1 = add(); say(p1, 'Order Report', 72, 740, 20); say(p1, LONG('one'), 72, 700);
      const p2 = add(); say(p2, LONG('two'), 72, 700);
      html = '<h1>Order Report</h1><p>' + LONG('two') + '</p><p>' + LONG('one') + '</p>';
    } else if (scene === 'open-leaf') {
      // "Yes" on p1 links; p2's "Yes" leaf has two equal copies far past its neighbour, so no rule can pick one
      const p1 = add(); say(p1, 'Consent Form', 72, 740, 20); say(p1, LONG('one'), 72, 700); say(p1, 'Yes', 72, 660);
      const p2 = add(); say(p2, 'Second Part', 72, 740, 16); say(p2, LONG('two'), 72, 700);
      for (let i = 0; i < 8; i++) say(p2, 'Unclaimed line ' + i + ' of the printed form here', 72, 660 - i * 14, 8);
      say(p2, 'Yes', 72, 500); say(p2, 'Yes', 150, 500); say(p2, LONG('three'), 72, 460);
      html = '<h1>Consent Form</h1><p>' + LONG('one') + '</p><p>Yes</p><h2>Second Part</h2><p>' + LONG('two') + '</p><p>Yes</p><p>' + LONG('three') + '</p>';
    } else if (scene === 'markers-numbers') {
      const p1 = add(); say(p1, 'Spending Totals', 72, 740, 20); say(p1, LONG('one'), 72, 700); say(p1, 'Acadia Academy', 72, 660); say(p1, '$1,234.50', 250, 660); say(p1, '-1-', 300, 40);
      const p2 = add(); say(p2, 'Second Section', 72, 740, 16); say(p2, LONG('two'), 72, 700); say(p2, '1.', 72, 660); say(p2, 'a)', 72, 640);
      say(p2, '$1,234.50', 72, 300); // an amount alone: nothing says it is the same fact as p1's
      for (let i = 0; i < 20; i++) say(p2, 'Real unclaimed line number ' + i + ' of this long page', 72, 280 - i * 12, 8);
      const p3 = add(); say(p3, 'Third Section', 72, 740, 16); say(p3, LONG('three'), 72, 700);
      say(p3, 'Acadia Academy', 72, 100); say(p3, '$1,234.50', 250, 100); // the row frozen at the top of every page
      html = '<h1>Spending Totals</h1><p>' + LONG('one') + '</p><p>Acadia Academy</p><p>$1,234.50</p>'
        + '<h2>Second Section</h2><p>' + LONG('two') + '</p><h2>Third Section</h2><p>' + LONG('three') + '</p>';
    } else if (scene === 'repeats') {
      const SRC = 'Source: Maine DOE ED-279 reports';
      const p1 = add(); say(p1, 'Valuation Report', 72, 740, 20); say(p1, LONG('intro'), 72, 700);
      const p2 = add(); say(p2, SRC, 72, 100); say(p2, 'Enrollment Data', 72, 740, 16); say(p2, LONG('two'), 72, 700); // the source line is DRAWN first
      const p3 = add(); say(p3, 'Valuation Data', 72, 740, 16); say(p3, LONG('three'), 72, 700); say(p3, SRC, 72, 100);
      const p4 = add(); say(p4, 'Cumulative Data', 72, 740, 16); say(p4, LONG('four'), 72, 700); say(p4, SRC, 72, 100);
      html = '<h1>Valuation Report</h1><p>' + LONG('intro') + '</p>'
        + '<h2>Enrollment Data</h2><p>' + LONG('two') + '</p><p>' + SRC + '</p>'
        + '<h2>Valuation Data</h2><p>' + LONG('three') + '</p><p>' + SRC + '</p>'
        + '<h2>Cumulative Data</h2><p>' + LONG('four') + '</p><p>' + SRC + '</p>';
    } else {
      // a heading the page prints only inside a picture ('far'), or also on its own page, drawn before the paragraph
      // the scan had already passed ('far-copy'); its words print again two pages later, where the scan lands.
      const HEAD = 'Local Assessments Summary';
      const p1 = add(); say(p1, 'Budget Book', 72, 740, 20); say(p1, LONG('one'), 72, 700);
      const p2 = add();
      if (scene === 'far-copy') say(p2, HEAD, 72, 740, 16);
      say(p2, LONG('two'), 72, 700); say(p2, LONG('three'), 72, 660); say(p2, LONG('four'), 72, 620);
      const p3 = add(); say(p3, 'Revenue Section', 72, 740, 16); say(p3, LONG('five'), 72, 700);
      const p4 = add(); say(p4, 'Closing Notes', 72, 740, 16); say(p4, LONG('six'), 72, 700);
      const p5 = add(); say(p5, 'Appendix Tables', 72, 740, 16); say(p5, LONG('seven'), 72, 700); say(p5, HEAD, 72, 300, 9); // a legend far away
      html = '<h1>Budget Book</h1><p>' + LONG('one') + '</p><p>' + LONG('two') + '</p><h2>' + HEAD + '</h2><p>' + LONG('three') + '</p><p>' + LONG('four') + '</p>'
        + '<h2>Revenue Section</h2><p>' + LONG('five') + '</p><h2>Closing Notes</h2><p>' + LONG('six') + '</p><h2>Appendix Tables</h2><p>' + LONG('seven') + '</p>';
    }
    html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main>' + html + '</main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Doc' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const pageNo = new Map(doc.getPages().map((p: any, i: number) => [String(p.ref), i + 1]));
    const leaves: any[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const mcrs = kids.map(look).filter((d: any) => d instanceof PDFDict && d.get(PDFName.of('MCID')));
      const S = String(n.get(PDFName.of('S'))).slice(1), at = n.get(PDFName.of('ActualText')), alt = n.get(PDFName.of('Alt'));
      if (at || alt || mcrs.length) leaves.push({ S, text: at ? at.decodeText() : alt ? alt.decodeText() : '', mcrs: mcrs.length, pg: mcrs.length ? pageNo.get(String(mcrs[0].get(PDFName.of('Pg')))) : null });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    // what pdf.js itself sees inside /Artifact, page by page
    const pdf = await W.pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    const artifacts: string[][] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const tc = await (await pdf.getPage(p)).getTextContent({ includeMarkedContent: true });
      const stack: string[] = [], out: string[] = [];
      for (const it of tc.items as any[]) {
        if (it.type === 'beginMarkedContent' || it.type === 'beginMarkedContentProps') stack.push(it.tag || '');
        else if (it.type === 'endMarkedContent') stack.pop();
        else if (typeof it.str === 'string' && it.str.trim() && stack.includes('Artifact')) out.push(it.str.trim());
      }
      artifacts.push(out);
    }
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { leaves, artifacts, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail), b64: btoa(bin),
      overall: v && v.summary && v.summary.overall, readingNotes: v && v.readingNotes, warnRows: ((v && v.checks) || []).filter((x: any) => x.status === 'warn' && /Reading order note/.test(x.rule)).length,
      deliveryOk: (pipeline as any).taggedPdfDeliveryVerdict ? (pipeline as any).taggedPdfDeliveryVerdict(tagged).ok : null, embeddedNotes: tagged.postExportValidator && tagged.postExportValidator.readingNotes };
  }, { scene, CHART_CROP });
}

test.describe.configure({ timeout: 300_000 });

test('leftover page text: labels join the chart; glyphs, page numbers and repeats are artifacts; the rest stays readable, never a heading', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'leftovers');
  const has = (t: string) => r.leaves.some((l: any) => l.text === t);
  // the chart's figure reads its alt and owns its labels: no label is a stray paragraph
  const fig = r.leaves.find((l: any) => l.S === 'Figure');
  expect(fig.text).toMatch(/^Line chart/);
  expect(fig.mcrs).toBeGreaterThanOrEqual(4); // the axis + 2600, FY19, FY20
  for (const label of ['2600', 'FY19', 'FY20']) expect(has(label), label).toBe(false);
  // real artifacts in the content stream, as pdf.js reads them
  expect(r.artifacts[0]).toEqual(['1']);
  expect(r.artifacts[1].sort()).toEqual(['2', 'Annual Report', 'u'].sort());
  // a long sentence inside the chart area is not a label; a number that is not this page's is not a folio
  expect(has('This sentence inside the chart area has far too many words to be a label.')).toBe(true);
  expect(has('7')).toBe(true);
  expect(has('A sentence the HTML never mentions stays readable.')).toBe(true);
  // structure: one H1, and leftover text is never a heading
  expect(r.leaves.filter((l: any) => l.S === 'H1').map((l: any) => l.text)).toEqual(['Annual Report']);
  const big = r.leaves.find((l: any) => l.text === 'Unclaimed Big Title');
  expect(big && big.S).toBe('P');
  expect(r.fails).toEqual([]);
  const vf = veraFails(r.b64);
  test.skip(vf === null, 'No Java runtime available for veraPDF (structural checks above still ran)');
  expect(vf).toEqual([]);
});

test('list markers and dashed page numbers are artifacts; a lone repeated amount stays readable, a frozen row does not', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'markers-numbers');
  expect(r.artifacts[0]).toEqual(['-1-']);
  expect(r.artifacts[1].sort()).toEqual(['1.', 'a)'].sort());
  // the amount alone on page 2 is read; the same amount beside the repeated name on page 3 is not
  expect(r.leaves.filter((l: any) => l.text === '$1,234.50').map((l: any) => l.pg).sort()).toEqual([1, 2]);
  expect(r.artifacts[2].sort()).toEqual(['$1,234.50', 'Acadia Academy'].sort());
  expect(r.fails).toEqual([]);
});

test('text matching a leaf still unlinked is not hidden: nothing printed twice on its page becomes an artifact', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'open-leaf');
  expect(r.artifacts[1]).not.toContain('Yes');
});

test('a reading-order note on the saved bytes is advisory: the PDF still passes and is still delivered', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'backwards');
  expect(r.readingNotes.map((n: any) => n.id)).toEqual(['goes-back']);
  expect(r.readingNotes[0].detail).toContain('from page 2 to page 1');
  expect(r.warnRows).toBe(1);
  expect(r.fails).toEqual([]);
  expect(r.overall).toBe('PASS');
  expect(r.deliveryOk).toBe(true);
  expect(r.embeddedNotes.map((n: any) => n.id)).toEqual(['goes-back']); // createTaggedPdf hands them to the connector and the app
  // the clean scene has none
  const clean = await tag(page, 'repeats');
  expect(clean.readingNotes).toEqual([]);
  expect(clean.warnRows).toBe(0);
});

test('repeated source lines read in page order, even when a page draws its line first', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'repeats');
  expect(r.leaves.filter((l: any) => l.text.startsWith('Source:')).map((l: any) => l.pg)).toEqual([2, 3, 4]);
  expect(r.fails).toEqual([]);
});

test('a short heading linked far from where it sits is released: dropped when its page does not print it', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'far');
  expect(r.leaves.some((l: any) => l.S === 'H2' && l.text === 'Local Assessments Summary')).toBe(false);
  expect(r.fails).toEqual([]);
});

test('a short heading linked far from where it sits re-links to the exact copy on its own page; the far copy is a repeat', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'far-copy');
  const h = r.leaves.find((l: any) => l.S === 'H2' && l.text === 'Local Assessments Summary');
  expect(h, 'the heading stays').toBeTruthy();
  expect(h.pg).toBe(2);
  expect(r.artifacts[4]).toContain('Local Assessments Summary');
  expect(r.fails).toEqual([]);
});
