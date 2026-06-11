// STEM golden (2026-06-10): pins the STEM-hardening slice.
// 1. Vision-classified equation images become /Formula StructElems (not
//    /Figure) with a spoken-math /Alt, and still ride the count-gated
//    image-linkage path (MCID link → declaration earnable).
// 2. The PRE-EXISTING table Headers/IDTree feature (Stage 5b lite) gets its
//    first pinned coverage: TH StructElems carry /ID, TD StructElems carry
//    /A /Headers arrays, and the StructTreeRoot carries /IDTree.
// 3. _applyImageIntel (the pure apply step of the Vision pass) honors the
//    honesty contract: chart blocks carry the AI-estimated warning, and a
//    substantive author alt is never clobbered.
// Deterministic — no AI calls; fixtures simulate post-classification state.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let r: any = null;

test.describe('STEM hardening golden — Formula role, Headers/IDTree, image-intel honesty', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: PIPELINE_PATH });

    r = await page.evaluate(async () => {
      try {
        const PDFLib = (window as any).PDFLib;
        const { PDFDocument, StandardFonts, PDFName } = PDFLib;
        const inDoc = await PDFDocument.create();
        const pg = inDoc.addPage([612, 792]);
        const font = await inDoc.embedFont(StandardFonts.Helvetica);
        let y = 740;
        pg.drawText('Quadratic Equations', { x: 50, y, size: 22, font }); y -= 32;
        pg.drawText('The general solution is shown below.', { x: 50, y, size: 12, font }); y -= 24;
        const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const png = await inDoc.embedPng(Uint8Array.from(atob(PNG_B64), (c) => c.charCodeAt(0)));
        pg.drawImage(png, { x: 50, y: y - 40, width: 60, height: 40 }); y -= 60;
        for (const c of ['Trial', 'Score', 'Mean', 'One', '12', '10.5']) { pg.drawText(c, { x: 50, y, size: 12, font }); y -= 16; }
        const inputBytes = await inDoc.save();

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });

        // Post-classification fixture: the img already carries the Vision
        // verdict (data-allo-kind="equation" + spoken alt + LaTeX), the table
        // has scoped THs so Stage 5b lite builds Headers/IDTree.
        const SPOKEN = 'x equals negative b plus or minus the square root of b squared minus 4 a c, all over 2 a';
        const html = '<!DOCTYPE html><html lang="en"><head><title>STEM Fixture</title></head><body><main>'
          + '<h1>Quadratic Equations</h1>'
          + '<p>The general solution is shown below.</p>'
          + '<img src="data:image/png;base64,' + PNG_B64 + '" alt="' + SPOKEN + '" data-allo-kind="equation" data-allo-latex="x = \\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}">'
          + '<table><tr><th scope="col">Trial</th><th scope="col">Score</th><th scope="col">Mean</th></tr>'
          + '<tr><td>One</td><td>12</td><td>10.5</td></tr></table>'
          + '</main></body></html>';

        const result = await pipeline.createTaggedPdf(inputBytes, { accessibleHtml: html }, { title: 'STEM Test', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };

        // Re-parse the tagged output and walk the structure tree.
        const outDoc = await PDFDocument.load(result.bytes);
        const ctx = outDoc.context;
        const roles: string[] = [];
        let formulaAlt: string | null = null;
        let formulaIsLinked = false;
        let figureCount = 0;
        let idTreePresent = false;
        let thWithId = 0;
        let tdHeaders: string[][] = [];
        const root = outDoc.catalog.get(PDFName.of('StructTreeRoot'));
        const rootDict: any = ctx.lookup(root);
        if (rootDict && rootDict.get(PDFName.of('IDTree'))) idTreePresent = true;
        const walk = (ref: any) => {
          let d: any = null;
          try { d = ctx.lookup(ref); } catch (_) { return; }
          if (!d) return;
          // PDFArray ALSO has .get (by index) — handle arrays FIRST or they
          // fall into the dict path and silently end the walk.
          if (typeof d.size === 'function') { for (let i = 0; i < d.size(); i++) walk(d.get(i)); return; }
          if (typeof d.get !== 'function') return;
          const s = d.get(PDFName.of('S'));
          const role = s ? String(s).replace(/^\//, '') : null;
          if (role) roles.push(role);
          if (role === 'Formula') {
            const alt = d.get(PDFName.of('Alt'));
            if (alt && typeof (alt as any).decodeText === 'function') formulaAlt = (alt as any).decodeText();
            else if (alt) formulaAlt = String(alt);
            if (d.get(PDFName.of('K')) != null) formulaIsLinked = true;
          }
          if (role === 'Figure') figureCount++;
          if (role === 'TH' && d.get(PDFName.of('ID'))) thWithId++;
          if (role === 'TD') {
            const a = d.get(PDFName.of('A'));
            const aDict: any = a ? ctx.lookup(a) : null;
            const hdrs = aDict && typeof aDict.get === 'function' ? aDict.get(PDFName.of('Headers')) : null;
            const hArr: any = hdrs ? ctx.lookup(hdrs) : null;
            if (hArr && typeof hArr.size === 'function') {
              const names: string[] = [];
              for (let i = 0; i < hArr.size(); i++) names.push(String(hArr.get(i)));
              tdHeaders.push(names);
            }
          }
          const k = d.get(PDFName.of('K'));
          const kv: any = k ? ctx.lookup(k) : null;
          if (kv && typeof kv.size === 'function') { for (let i = 0; i < kv.size(); i++) walk(kv.get(i)); }
          else if (k && (k as any).objectNumber !== undefined) walk(k);
        };
        const rootK = rootDict ? rootDict.get(PDFName.of('K')) : null;
        const diag: any = {
          rootPresent: !!root, rootDictPresent: !!rootDict,
          rootKeys: rootDict && rootDict.keys ? rootDict.keys().map((k: any) => String(k)) : null,
          rootKType: rootK ? (rootK.constructor && rootK.constructor.name) : null,
        };
        if (rootK) walk(rootK);
        diag.rolesLen = roles.length;

        // Duplicate-image dedup (2026-06-10): the SAME image twice must cost
        // ONE Vision call, with the verdict applied to every copy and the
        // companion chart block attached only once.
        let visionCallCount = 0;
        const dedupPipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}',
          callGeminiVision: async () => { visionCallCount++; return JSON.stringify({ kind: 'chart', alt: 'Bar chart of weekly attendance', chartSummary: 'Attendance rises through May.', chartData: { columns: ['Week', 'Count'], rows: [['1', '20']] } }); },
          callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const dupHtml = '<main><p>intro</p>'
          + '<img src="data:image/png;base64,' + PNG_B64 + '" alt="">'
          + '<p>middle</p>'
          + '<img src="data:image/png;base64,' + PNG_B64 + '" alt="">'
          + '</main>';
        const dedupRes = await dedupPipeline.describeAndClassifyImages(dupHtml, { cap: 10 });
        const dedupDoc = new DOMParser().parseFromString(dedupRes.html, 'text/html');
        const dedup = {
          visionCallCount,
          reportedCalls: dedupRes.visionCalls,
          classified: dedupRes.classified,
          dedupedCopies: dedupRes.dedupedCopies,
          kinds: Array.from(dedupDoc.querySelectorAll('img')).map((im) => im.getAttribute('data-allo-kind')),
          chartBlocks: dedupDoc.querySelectorAll('details.allo-chart-data').length,
        };

        // _applyImageIntel honesty contract (pure, no AI).
        const doc2 = new DOMParser().parseFromString('<main><img id="a" src="data:image/png;base64,AAAA" alt="Figure 3"><img id="b" src="data:image/png;base64,AAAA" alt="Hand-written description of the western watershed by the author"></main>', 'text/html');
        const imA = doc2.getElementById('a')!;
        const imB = doc2.getElementById('b')!;
        const okChart = pipeline._applyImageIntel(doc2, imA, { kind: 'chart', alt: 'Bar chart of rainfall by month', chartSummary: 'Rainfall peaks in April.', chartData: { columns: ['Month', 'Inches'], rows: [['April', '4.2']] } });
        const okKeepAlt = pipeline._applyImageIntel(doc2, imB, { kind: 'photo', alt: 'A river' });
        const chartDetails = doc2.querySelector('details.allo-chart-data');
        return {
          summary: result.summary || {}, diag, dedup,
          roles, formulaAlt, formulaIsLinked, figureCount, idTreePresent, thWithId, tdHeaders,
          applied: { okChart, okKeepAlt },
          chartBlock: {
            present: !!chartDetails,
            hasWarning: !!(chartDetails && /AI-estimated from the image/.test(chartDetails.textContent || '')),
            hasTable: !!(chartDetails && chartDetails.querySelector('table td')),
            altA: imA.getAttribute('alt'), kindA: imA.getAttribute('data-allo-kind'),
            altB: imB.getAttribute('alt'),
          },
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('fixture tagged without error', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
  });

  test('equation image becomes a /Formula StructElem with the spoken-math Alt', () => {
    expect(r.roles).toContain('Formula');
    expect(r.figureCount, 'the equation must NOT also appear as a generic Figure').toBe(0);
    expect(String(r.formulaAlt || '')).toContain('x equals negative b');
  });

  test('Formula rides the image-linkage path (has /K) and the declaration is earnable', () => {
    expect(r.formulaIsLinked, 'Formula elem should carry a K (MCID/content link)').toBeTruthy();
    expect(r.summary.uaDeclared, 'fully-linked STEM fixture should earn the declaration').toBeTruthy();
  });

  test('Stage 5b lite Headers/IDTree — first pinned coverage of the shipped feature', () => {
    expect(r.idTreePresent, 'StructTreeRoot must carry /IDTree').toBeTruthy();
    expect(r.thWithId).toBeGreaterThanOrEqual(3);
    expect(r.tdHeaders.length, 'every TD should carry /A /Headers').toBeGreaterThanOrEqual(3);
    expect(r.tdHeaders[0].length).toBeGreaterThanOrEqual(1);
  });

  test('_applyImageIntel: chart block carries the AI-estimated honesty warning + data table', () => {
    expect(r.applied.okChart).toBeTruthy();
    expect(r.chartBlock.present).toBeTruthy();
    expect(r.chartBlock.hasWarning, 'honesty label is non-negotiable').toBeTruthy();
    expect(r.chartBlock.hasTable).toBeTruthy();
    expect(r.chartBlock.kindA).toBe('chart');
    expect(r.chartBlock.altA, 'placeholder alt should be replaced by the Vision alt').toContain('Bar chart');
  });

  test('_applyImageIntel: substantive author alt is never clobbered', () => {
    expect(r.applied.okKeepAlt).toBeTruthy();
    expect(r.chartBlock.altB).toContain('western watershed');
  });

  test('duplicate images cost ONE Vision call; verdict applies to every copy, chart block only once', () => {
    expect(r.dedup.visionCallCount, 'identical images must be grouped before calling Vision').toBe(1);
    expect(r.dedup.reportedCalls).toBe(1);
    expect(r.dedup.classified).toBe(2);
    expect(r.dedup.dedupedCopies).toBeGreaterThanOrEqual(1);
    expect(r.dedup.kinds).toEqual(['chart', 'chart']);
    expect(r.dedup.chartBlocks, 'companion block must not repeat per copy').toBe(1);
  });
});
