// Figures cropped from ONE source picture (2026-11-03, worksheet "beaks and feet": 14 HTML figures cut from one
// 1334x782 grid image, so 16 figures met 2 image draws, none linked and the PDF was withheld). The HTML keeps where
// each figure was cut from (data-allo-source-crop in a delivered file, the crop editor's data-crop in the app);
// Stage 4c draws that picture whole as an artifact and once per crop clipped to it, each its own /Figure, and each
// figure links to its own part. A masked picture (drawn twice it would change) and an ambiguous crop stay as before.
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

// Grid: a 4-quadrant picture drawn at x 100-500, y 400-600 on a 612x792 page (displayed y-down fractions: top
// 0.2424, middle 0.3687, bottom 0.4949; x 0.1634 / 0.4902 / 0.8170), and a separate logo at x 72-122, y 700-750.
const Q = { tl: [0.1634, 0.2424, 0.4902, 0.3687], tr: [0.4902, 0.2424, 0.8170, 0.3687], bl: [0.1634, 0.3687, 0.4902, 0.4949], br: [0.4902, 0.3687, 0.8170, 0.4949] };
const ALT = { tl: 'Red apple', tr: 'Green pear', bl: 'Blue berries', br: 'Yellow banana' };

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

// cropAttr(key) -> the figure attribute string; opts.masked: the grid has transparency (an /SMask)
async function tagGrid(page, figures: string, opts: { masked?: boolean, opacity?: number, unpaintable?: boolean } = {}) {
  return page.evaluate(async ({ figures, masked, opacity, unpaintable }) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFNumber, decodePDFRawStream } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    pg.drawText('Fruit Sorting Worksheet', { x: 72, y: 760, size: 18, font });
    pg.drawText('Match each fruit to its basket.', { x: 72, y: 640, size: 12, font });
    const png = async (draw: (g: CanvasRenderingContext2D) => void, w: number, h: number) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
      return src.embedPng(Uint8Array.from(atob(cv.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0)));
    };
    const grid = await png((g) => {
      if (masked) g.globalAlpha = 0.6;
      g.fillStyle = '#c00'; g.fillRect(0, 0, 200, 100); g.fillStyle = '#0a0'; g.fillRect(200, 0, 200, 100);
      g.fillStyle = '#00c'; g.fillRect(0, 100, 200, 100); g.fillStyle = '#cc0'; g.fillRect(200, 100, 200, 100);
    }, 400, 200);
    const logo = await png((g) => { g.fillStyle = '#333'; g.fillRect(0, 0, 50, 50); g.fillStyle = '#fff'; g.fillRect(10, 10, 30, 30); }, 50, 50);
    if (unpaintable) { // an image with no size, drawn first: pdf.js paints nothing for it
      const bad = src.context.register(src.context.stream(new Uint8Array(0), { Type: 'XObject', Subtype: 'Image', Width: 0, Height: 0, ColorSpace: 'DeviceGray', BitsPerComponent: 8 }));
      pg.node.setXObject(PDFName.of('Bad0'), bad);
      const { pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = W.PDFLib;
      pg.pushOperators(pushGraphicsState(), concatTransformationMatrix(10, 0, 0, 10, 300, 700), drawObject('Bad0'), popGraphicsState());
    }
    pg.drawImage(grid, opacity ?{ x: 100, y: 400, width: 400, height: 200, opacity } : { x: 100, y: 400, width: 400, height: 200 });
    pg.drawImage(logo, { x: 72, y: 700, width: 50, height: 50 });
    const html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Fruit Sorting Worksheet</h1>'
      + '<figure><img alt="School logo" src="data:image/png;base64,iVBORw0KGgo="></figure>'
      + '<p>Match each fruit to its basket.</p>' + figures + '</main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Fruit Sorting Worksheet' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const figs: any[] = [];
    let emptyGroups = 0;
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const K = n.get(PDFName.of('K'));
      if (/^\/(Sect|Div|Part|Art|NonStruct)$/.test(String(n.get(PDFName.of('S')))) && (K == null || (look(K) instanceof PDFArray && look(K).size() === 0))) emptyGroups++;
      if (String(n.get(PDFName.of('S'))) === '/Figure' && n.get(PDFName.of('Alt'))) {
        const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
        const mcr = kids.map(look).find((d: any) => d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/MCR');
        figs.push({ alt: n.get(PDFName.of('Alt')).decodeText(), mcid: mcr ? Number(String(mcr.get(PDFName.of('MCID')))) : null });
      }
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const cs = look(doc.getPages()[0].node.get(PDFName.of('Contents')));
    const raw = cs.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(cs).decode() : cs.contents;
    let content = ''; for (let i = 0; i < raw.length; i++) content += String.fromCharCode(raw[i]);
    const clips: any = {};
    const re = /\/Figure <<\/MCID (\d+)>> BDC\nq ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re W n\n/g; let m;
    while ((m = re.exec(content))) clips[m[1]] = [m[2], m[3], m[4], m[5]].map(Number);
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { figs, clips, emptyGroups, artifactGrid: /\/Artifact BMC\n\/Image-\d+-\d+ Do\nEMC/.test(content) || /\/Artifact BMC\n\/[^\s]+ Do\nEMC\n\/Figure/.test(content),
      fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail), b64: btoa(bin) };
  }, { figures, masked: !!opts.masked, opacity: opts.opacity || 0, unpaintable: !!opts.unpaintable });
}

const fig = (attr: string, alt: string) => '<figure ' + attr + '><img alt="' + alt + '" src="data:image/png;base64,iVBORw0KGgo="></figure>';
const delivered = (k: string) => fig('data-allo-source-crop="1 ' + Q[k].join(' ') + '"', ALT[k]);

// each grid figure's clip in the picture's unit square (y up): tl = left half, upper half, ...
const EXPECT = { tl: [0, 0.5], tr: [0.5, 0.5], bl: [0, 0], br: [0.5, 0] };
function expectEachOnItsPart(r: any) {
  for (const k of Object.keys(ALT)) {
    const f = r.figs.find((x: any) => x.alt === ALT[k]);
    expect(f, ALT[k]).toBeTruthy();
    const clip = r.clips[f.mcid];
    expect(clip, ALT[k] + ' has a clipped draw').toBeTruthy();
    expect(clip[0]).toBeCloseTo(EXPECT[k][0], 2); expect(clip[1]).toBeCloseTo(EXPECT[k][1], 2);
    expect(clip[2]).toBeCloseTo(0.5, 2); expect(clip[3]).toBeCloseTo(0.5, 2);
  }
}

test.describe.configure({ timeout: 300_000 });

test('four figures cropped from one picture each link to their own part (delivered data-allo-source-crop)', async ({ page }) => {
  await boot(page);
  // HTML order differs from the grid's order: identity, not order, decides
  const r = await tagGrid(page, delivered('br') + delivered('tl') + delivered('bl') + delivered('tr'));
  expectEachOnItsPart(r);
  expect(r.figs.find((x: any) => x.alt === 'School logo').mcid).not.toBeNull(); // the other picture still pairs by count
  expect(new Set(r.figs.map((x: any) => x.mcid)).size).toBe(5);
  expect(r.artifactGrid).toBe(true);
  expect(r.fails).toEqual([]);
  // (2026-11-03) the page section whose blocks all moved to their leaves is not left behind empty (worksheet run)
  expect(r.emptyGroups).toBe(0);
  const java = resolveJava();
  test.skip(!java, 'No Java runtime available for veraPDF (structural checks above still ran)');
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-crops-')), 'out.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(r.b64, 'base64'));
  let out = '';
  try { out = execFileSync(java!, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--maxfailuresdisplayed', '5', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e: any) { out = String(e.stdout || ''); }
  const j = JSON.parse(out); const x = j.report.jobs[0].validationResult; const vr = Array.isArray(x) ? x[0] : x;
  expect((vr.details.ruleSummaries || []).filter((s: any) => s.ruleStatus !== 'PASSED').map((s: any) => s.clause + '-' + s.testNumber)).toEqual([]);
});

test('the app\'s crop editor data (data-crop, canvas pixels) links the same way', async ({ page }) => {
  await boot(page);
  // a 918x1188 render of the page (1.5x)
  const px = (k: string) => { const [x0, y0, x1, y1] = Q[k]; return { page: 1, x: Math.round(x0 * 918), y: Math.round(y0 * 1188), w: Math.round((x1 - x0) * 918), h: Math.round((y1 - y0) * 1188), canvasW: 918, canvasH: 1188 }; };
  const app = (k: string) => fig('data-crop="' + JSON.stringify(px(k)).replace(/"/g, '&quot;') + '"', ALT[k]);
  const r = await tagGrid(page, app('tl') + app('tr') + app('bl') + app('br'));
  expectEachOnItsPart(r);
});

test('a masked picture is not split (drawn twice it would look different): nothing changes', async ({ page }) => {
  await boot(page);
  const r = await tagGrid(page, delivered('tl') + delivered('tr') + delivered('bl') + delivered('br'), { masked: true });
  expect(Object.keys(r.clips)).toEqual([]);
  expect(r.artifactGrid).toBe(false);
  expect(r.figs.filter((x: any) => Object.values(ALT).includes(x.alt)).every((x: any) => x.mcid === null)).toBe(true);
});

test('a picture drawn see-through (fill alpha below 1) is not split either', async ({ page }) => {
  await boot(page);
  const r = await tagGrid(page, delivered('tl') + delivered('tr') + delivered('bl') + delivered('br'), { opacity: 0.6 });
  expect(Object.keys(r.clips)).toEqual([]);
  expect(r.artifactGrid).toBe(false);
});

test('when pdf.js\'s paints do not line up with the page\'s image draws (one it cannot paint), nothing is split', async ({ page }) => {
  await boot(page);
  const r = await tagGrid(page, delivered('tl') + delivered('tr') + delivered('bl') + delivered('br'), { unpaintable: true });
  expect(Object.keys(r.clips)).toEqual([]);
});

// (2026-11-04) One crop of a picture now splits too (budget's DOE logo), so the unambiguous crop links to its part.
test('two figures claiming the same crop are ambiguous: neither links by crop; the other crop still links to its part', async ({ page }) => {
  await boot(page);
  const r = await tagGrid(page, delivered('tl') + fig('data-allo-source-crop="1 ' + Q.tl.join(' ') + '"', 'Another apple') + delivered('tr'));
  const tr = r.figs.find((x: any) => x.alt === ALT.tr);
  expect(Object.keys(r.clips)).toEqual([String(tr.mcid)]);
  expect(r.clips[tr.mcid][0]).toBeCloseTo(0.5, 2); expect(r.clips[tr.mcid][1]).toBeCloseTo(0.5, 2);
  for (const alt of [ALT.tl, 'Another apple']) expect(Object.keys(r.clips)).not.toContain(String(r.figs.find((x: any) => x.alt === alt).mcid));
});
