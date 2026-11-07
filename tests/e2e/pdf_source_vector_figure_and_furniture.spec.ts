// Two leftovers of a tagged SOURCE's own structure (2026-11-03, USCIS civics test):
//  - its logo is vector paths inside "/Figure <</MCID n>> BDC": the MCID was blanked, the paths became /Artifact,
//    and the HTML's logo figure had no draw to link to (orphaned Figure, PDF withheld). Stage 4c now marks the
//    section like a vector Form drawing, so the figure pairs on an exact count;
//  - its footer is a Form XObject drawn on every page that keeps /StructParents and MCIDs from the replaced tree
//    (veraPDF 7.20-2 x10, 7.1-2 x4). As page furniture it loses both and is drawn as an artifact everywhere.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host; veraPDF runs when Java exists.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
// a private module folder for mutation checks (missing files come from the repo)
const MOD = process.env.ALLO_MODULE_DIR || ROOT;
function resolveJava(): string | null {
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { execFileSync(j, ['-version'], { stdio: 'ignore' }); return j; } catch (_) { /* next */ }
  }
  return null;
}

test.describe.configure({ timeout: 300_000 });

test('a source-tagged vector logo links to its figure; a repeated footer form loses the source structure', async ({ page }) => {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  const r = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFNumber, decodePDFRawStream } = W.PDFLib;
    const src = await PDFDocument.create();
    const ctx = src.context;
    const font = await src.embedFont(StandardFonts.Helvetica);
    // the footer: a text form whose content the source tagged (/StructParents 0, MCID 1)
    const footer = ctx.register(ctx.stream('/Span <</MCID 1>> BDC\nBT /F1 9 Tf 72 30 Td (www.example.gov) Tj ET\nEMC\n',
      { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 612, 792], Resources: { Font: { F1: font.ref } }, StructParents: 0 }));
    const logo = 'q 1 0 0 1 400 640 cm\n0 0 m\n' + Array.from({ length: 40 }, (_, i) => (i * 1.5).toFixed(2) + ' ' + (-i * 0.75).toFixed(2) + ' l').join('\n') + '\nh\nf\nQ\n';
    const pageBodies = [
      'BT /F1 18 Tf 72 720 Td (Annual Report) Tj ET\n/Span <</MCID 2>> BDC\nBT /F1 12 Tf 72 690 Td (Attendance rose in every grade this year.) Tj ET\nEMC\n'
        + '/Figure <</MCID 3>> BDC\n' + logo + 'EMC\n/Fm0 Do\n',
      'BT /F1 12 Tf 72 720 Td (Families joined us for reading night in the spring.) Tj ET\n/Fm0 Do\n',
    ];
    for (const body of pageBodies) {
      const pg = src.addPage([612, 792]);
      pg.node.setFontDictionary(PDFName.of('F1'), font.ref);
      pg.node.setXObject(PDFName.of('Fm0'), footer);
      pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream(body)));
    }
    const html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Annual Report</h1>'
      + '<p>Attendance rose in every grade this year.</p><p><img alt="District seal." src="data:image/png;base64,iVBORw0KGgo="></p>'
      + '<p>Families joined us for reading night in the spring.</p></main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Annual Report' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    let figure: any = null;
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const K = n.get(PDFName.of('K'));
      if (String(n.get(PDFName.of('S'))) === '/Figure' && n.get(PDFName.of('Alt'))) {
        const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
        figure = { alt: n.get(PDFName.of('Alt')).decodeText(), linked: kids.some((k: any) => { const d = look(k); return d instanceof PDFNumber || (d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/MCR'); }) };
      }
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const p1 = doc.getPages()[0];
    const fm = look(look(p1.node.get(PDFName.of('Resources'))).get(PDFName.of('XObject'))).get(PDFName.of('Fm0'));
    const form = look(fm);
    const formText = new TextDecoder('latin1').decode(form.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(form).decode() : form.contents);
    const contents = look(p1.node.get(PDFName.of('Contents')));
    const pageText = new TextDecoder('latin1').decode(contents.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(contents).decode() : contents.contents);
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return {
      figure, formMcid: /\/MCID/.test(formText), formStructParents: !!form.dict.get(PDFName.of('StructParents')),
      footerDrawnAsArtifact: /\/Artifact BMC\s*\/Fm0 Do/.test(pageText),
      fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail),
      b64: btoa(bin),
    };
  });
  expect(r.figure).toEqual({ alt: 'District seal.', linked: true });
  expect(r.formMcid).toBe(false);
  expect(r.formStructParents).toBe(false);
  expect(r.footerDrawnAsArtifact).toBe(true);
  expect(r.fails).toEqual([]);

  const java = resolveJava();
  test.skip(!java, 'No Java runtime available for veraPDF (structural checks above still ran)');
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-srcfig-')), 'out.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(r.b64, 'base64'));
  let out = '';
  try { out = execFileSync(java!, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--maxfailuresdisplayed', '20', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e: any) { out = String(e.stdout || ''); }
  const vr = (() => { const j = JSON.parse(out); const x = j.report.jobs[0].validationResult; return Array.isArray(x) ? x[0] : x; })();
  const failed = (vr.details.ruleSummaries || []).filter((s: any) => s.ruleStatus !== 'PASSED').map((s: any) => s.clause + '-' + s.testNumber);
  expect(failed.filter((f: string) => /^7\.20-2$|^7\.1-[123]$/.test(f))).toEqual([]);
});
