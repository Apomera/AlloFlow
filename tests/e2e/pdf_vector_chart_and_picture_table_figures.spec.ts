// RSU 57 budget keyless run (2026-11-04, budget_v4): with the verdict clear, the tagged PDF was still withheld by
// "No orphaned semantic leaves" (10): six charts drawn as VECTOR paths had no image draw for their figures (8 figures,
// 7 draws: the count rule linked none), and two footnotes printed only inside table pictures counted as "printed"
// because their words appear on OTHER pages. Now:
//  - a figure whose crop (data-allo-source-crop) lies on no picture marks the paths drawn inside it as that figure
//    (Stage 4 path pass, q/Q/cm tracked), page decoration outside stays /Artifact;
//  - a single crop of part of a picture links to its clipped part, and the whole picture may be claimed by the
//    picture table on its pages, which gives it the HTML table's text as Alt (it read "Image (description unavailable)");
//  - an unlinked paragraph counts as printed only on the pages of its linked neighbours.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host; veraPDF runs when Java exists.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

function resolveJava(): string | null {
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { execFileSync(j, ['-version'], { stdio: 'ignore' }); return j; } catch (_) { /* next */ }
  }
  return null;
}
function veraFails(b64: string): string[] | null {
  const java = resolveJava();
  if (!java) return null;
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-vector-')), 'out.pdf');
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
const CHART_CROP = '1 0.1634 0.3687 0.6536 0.6212';
// The logo: the picture's lower-right corner, x 340-400, y 300-340.
const LOGO_CROP = '1 0.5556 0.5707 0.6536 0.6212';

async function tag(page, scene: string) {
  return page.evaluate(async ({ scene, CHART_CROP, LOGO_CROP }) => {
    const W: any = window;
    const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, decodePDFRawStream, rgb } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const img = '<img alt="ALT" src="data:image/png;base64,iVBORw0KGgo=">';
    let html = '';
    if (scene === 'chart') {
      const pg = src.addPage([612, 792]);
      pg.pushOperators(L.pushGraphicsState(), L.setFillingRgbColor(0.97, 0.97, 1), L.rectangle(0, 0, 612, 792), L.fill(), L.popGraphicsState()); // slide background
      pg.drawText('School Enrollment Report', { x: 72, y: 740, size: 20, font });
      pg.drawText('Enrollment rose every year.', { x: 72, y: 700, size: 12, font });
      for (const [i, h] of [[0, 60], [1, 120], [2, 180]]) pg.drawRectangle({ x: 140 + i * 80, y: 320, width: 50, height: h, color: rgb(0.2, 0.4, 0.8) }); // bars (pdf-lib draws them through cm)
      pg.pushOperators(L.pushGraphicsState(), L.moveTo(120, 310), L.lineTo(390, 310), L.stroke(), L.popGraphicsState()); // axis
      // numerically inside the chart, moved below it by cm: decoration, not the chart
      pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(1, 0, 0, 1, 0, -250), L.moveTo(150, 451), L.lineTo(350, 451), L.stroke(), L.popGraphicsState());
      pg.drawText('Data from the district office.', { x: 72, y: 250, size: 12, font });
      html = '<h1>School Enrollment Report</h1><p>Enrollment rose every year.</p>'
        + '<figure data-allo-source-crop="' + CHART_CROP + '">' + img.replace('ALT', 'Bar chart of enrollment rising from 100 to 300 students') + '</figure>'
        + '<p>Data from the district office.</p>';
    } else if (scene === 'tablepic') {
      const pg = src.addPage([612, 792]);
      pg.drawText('Per Pupil Costs', { x: 72, y: 740, size: 20, font });
      pg.drawText('Costs compared with the state.', { x: 72, y: 700, size: 12, font });
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 200; const g = cv.getContext('2d')!;
      g.fillStyle = '#fff'; g.fillRect(0, 0, 300, 200); g.strokeStyle = '#000';
      for (let r = 0; r <= 4; r++) { g.beginPath(); g.moveTo(0, r * 40); g.lineTo(240, r * 40); g.stroke(); }
      g.fillStyle = '#036'; g.fillRect(240, 160, 60, 40); // the logo in the corner
      const png = await src.embedPng(Uint8Array.from(atob(cv.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0)));
      pg.drawImage(png, { x: 100, y: 300, width: 300, height: 200 });
      // clip art the HTML marks decorative (alt=""): left over once every described figure links, it is decoration
      const cv2 = document.createElement('canvas'); cv2.width = 40; cv2.height = 40; const g2 = cv2.getContext('2d')!; g2.fillStyle = '#a50'; g2.fillRect(5, 5, 30, 30);
      const art = await src.embedPng(Uint8Array.from(atob(cv2.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0)));
      pg.drawImage(art, { x: 480, y: 700, width: 40, height: 40 });
      pg.drawText('Source: district records.', { x: 72, y: 250, size: 12, font });
      html = '<h1>Per Pupil Costs</h1><figure><img alt="" role="presentation" src="data:image/png;base64,iVBORw0KGgo="></figure><p>Costs compared with the state.</p>'
        + '<table><caption>Per pupil costs by year</caption><thead><tr><th scope="col">Year</th><th scope="col">State</th><th scope="col">District</th></tr></thead>'
        + '<tbody><tr><th scope="row">2019-20</th><td>$13,863</td><td>$13,124</td></tr><tr><th scope="row">2018-19</th><td>$13,473</td><td>$12,675</td></tr>'
        + '<tr><th scope="row">2017-18</th><td>$12,940</td><td>$12,001</td></tr></tbody></table>'
        + '<figure data-allo-source-crop="' + LOGO_CROP + '">' + img.replace('ALT', 'Maine Department of Education logo') + '</figure>'
        + '<p>Source: district records.</p>';
    } else {
      // footnote: "** Per Maine Department of Education" sits on page 2; its words print only on page 1 (far) or also on page 2 (near)
      const p1 = src.addPage([612, 792]);
      p1.drawText('Annual Budget', { x: 72, y: 740, size: 20, font });
      p1.drawText('The Maine Department of Education sets the funding rules.', { x: 72, y: 700, size: 12, font });
      const p2 = src.addPage([612, 792]);
      p2.drawText('Per Pupil Costs', { x: 72, y: 740, size: 20, font });
      p2.drawText('Costs compared with the state.', { x: 72, y: 700, size: 12, font });
      if (scene === 'footnote-near') p2.drawText('** Per Maine Department of Education', { x: 72, y: 400, size: 9, font });
      if (scene === 'footnote-echo') p2.drawText('Per Maine Department of Education rules, costs include transport.', { x: 72, y: 400, size: 12, font });
      p2.drawText('Source: district records.', { x: 72, y: 250, size: 12, font });
      html = '<h1>Annual Budget</h1><p>The Maine Department of Education sets the funding rules.</p>'
        + '<h2>Per Pupil Costs</h2><p>Costs compared with the state.</p>'
        + (scene === 'footnote-echo' ? '<p>Per Maine Department of Education rules, costs include transport.</p>' : '')
        + '<p><strong>** Per Maine Department of Education</strong></p><p>Source: district records.</p>';
    }
    html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main>' + html + '</main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Doc' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const figs: any[] = [], texts: any[] = [];
    let seq = 0, nonStructPics = 0;
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      seq++;
      if (String(n.get(PDFName.of('S'))) === '/NonStruct' && n.get(PDFName.of('Alt'))) nonStructPics++;
      const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const mcids = kids.map(look).filter((d: any) => d instanceof PDFDict && d.get(PDFName.of('MCID'))).map((d: any) => Number(String(d.get(PDFName.of('MCID')))));
      const S = String(n.get(PDFName.of('S')));
      if (S === '/Figure') { const a = n.get(PDFName.of('Alt')); figs.push({ alt: a ? a.decodeText() : null, mcids, seq }); }
      const at = n.get(PDFName.of('ActualText'));
      if (at) texts.push({ S, text: at.decodeText(), mcids, seq });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const pages = doc.getPages().map((p: any) => {
      const cs = look(p.node.get(PDFName.of('Contents')));
      const raw = cs.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(cs).decode() : cs.contents;
      let s = ''; for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
      return s;
    });
    // the marked-content tag in force where `needle` is drawn on page 1
    const tagAt = (needle: string) => {
      const s = pages[0], at = s.indexOf(needle); if (at < 0) return 'absent';
      const re = /(\/[A-Za-z]+)(?: <<\/MCID (\d+)>>)? B(?:DC|MC)|EMC/g; const stack: string[] = []; let m;
      while ((m = re.exec(s)) && m.index < at) { if (m[0] === 'EMC') stack.pop(); else stack.push(m[1] + (m[2] ? ' ' + m[2] : '')); }
      return stack.length ? stack[stack.length - 1] : 'none';
    };
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { figs, texts, nonStructPics, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail),
      bg: tagAt('0 0 612 792 re'), movedLine: tagAt('150 451 m'), axis: tagAt('120 310 m'), b64: btoa(bin) };
  }, { scene, CHART_CROP, LOGO_CROP });
}

test.describe.configure({ timeout: 300_000 });

test('a figure cropped from a VECTOR chart links to the paths drawn inside its crop; decoration stays artifact', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'chart');
  const chart = r.figs.find((f: any) => /^Bar chart/.test(f.alt || ''));
  expect(chart, 'chart figure').toBeTruthy();
  expect(chart.mcids.length).toBeGreaterThanOrEqual(1);
  expect(r.axis).toMatch(/^\/Figure \d+$/);
  expect(chart.mcids).toContain(Number(r.axis.split(' ')[1]));
  expect(r.bg, 'the page background is not part of the chart').toBe('/Artifact');
  expect(r.movedLine, 'a path moved out of the chart by cm is not part of it').toBe('/Artifact');
  expect(r.fails).toEqual([]);
  const vf = veraFails(r.b64);
  test.skip(vf === null, 'No Java runtime available for veraPDF (structural checks above still ran)');
  expect(vf).toEqual([]);
});

test('one crop of part of a picture links to its part; the picture table on the page describes the whole picture', async ({ page }) => {
  await boot(page);
  const r = await tag(page, 'tablepic');
  const logo = r.figs.find((f: any) => f.alt === 'Maine Department of Education logo');
  expect(logo && logo.mcids.length).toBe(1);
  const table = r.figs.find((f: any) => /^Table: /.test(f.alt || ''));
  expect(table, 'the table picture carries the table text').toBeTruthy();
  expect(table.alt).toBe('Table: Per pupil costs by year. Year, State, District; 2019-20, $13,863, $13,124; 2018-19, $13,473, $12,675; 2017-18, $12,940, $12,001.');
  expect(table.mcids.length).toBe(1);
  expect(table.mcids[0]).not.toBe(logo.mcids[0]);
  // (budget_v5) it stands where the table stood: before the paragraph after it, not in the page leftovers after the document
  const source = r.texts.find((t: any) => t.text === 'Source: district records.');
  expect(table.seq).toBeLessThan(source.seq);
  // the clip art the HTML marks decorative is decoration, not "Image (description unavailable)"
  expect(r.figs.filter((f: any) => f.alt === 'Image (description unavailable)')).toEqual([]);
  expect(r.nonStructPics).toBeGreaterThanOrEqual(1);
  expect(r.fails).toEqual([]);
  const vf = veraFails(r.b64);
  test.skip(vf === null, 'No Java runtime available for veraPDF (structural checks above still ran)');
  expect(vf).toEqual([]);
});

test('a footnote whose words print only on ANOTHER page leaves the tagged PDF; printed on its own page it links', async ({ page }) => {
  await boot(page);
  const far = await tag(page, 'footnote-far');
  expect(far.fails).toEqual([]);
  expect(far.texts.some((t: any) => /\*\* Per Maine/.test(t.text))).toBe(false);
  const near = await tag(page, 'footnote-near');
  expect(near.fails).toEqual([]);
  const fn = near.texts.find((t: any) => /\*\* Per Maine/.test(t.text));
  expect(fn, 'printed on its own page: kept and linked').toBeTruthy();
  expect(fn.mcids.length).toBeGreaterThanOrEqual(1);
  // its words printed on its OWN page (inside another line) keep it, unlinked, for a person to review: as before
  const echo = await tag(page, 'footnote-echo');
  expect(echo.texts.some((t: any) => /\*\* Per Maine/.test(t.text))).toBe(true);
  expect(echo.fails.some((f: string) => /orphaned semantic leaves/.test(f))).toBe(true);
});
