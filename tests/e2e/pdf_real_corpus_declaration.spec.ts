// Ratchet on REAL documents (2026-10-18): these earn the PDF/UA declaration end to end (pipeline gate,
// AlloFlow's validator, delivery verdict 'verified'; independently veraPDF-compliant when measured).
// They got there through the tagged-PDF work of 10-16..10-18: read-once matching, links, fonts, source
// marks, Option B (only what is printed), and form tables. A regression in any of it shows here first.
// The inputs live partly outside the repo (C:/tmp corpus) or in untracked folders, so a document whose
// files are missing is skipped, not failed.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const VENDOR = path.join(ROOT, 'desktop/mcp/vendor');
const DOCS = [
  { name: 'Spanish family letter', pdf: 'C:/tmp/remediation_corpus/new/pps-childcare-letter-es-2020-12.pdf', html: path.join(ROOT, 'runs/2026-09-22-keyless-pilot/pps-childcare-letter-es/output/pps-childcare-letter-es-2020-12-accessible.html'), lang: 'es' },
  { name: 'ED parent guide', pdf: path.join(ROOT, 'mcp-testing/corpus/born-digital/ed-parent-guide-idea.pdf'), html: path.join(ROOT, 'mcp-testing/refinement-study/private/calibration-2026-09-12/primary/ed-parent-guide-idea-accessible.html'), lang: 'en' },
  // HTML copied from the 09-13 pilot report (reports/mcp-gap-lane-pilots-2026-09-13/f1040-form/) so the
  // ratchet does not depend on a reports folder
  { name: 'IRS Form 1040', pdf: 'C:/tmp/remediation_corpus/legacy/irs-f1040.pdf', html: path.join(ROOT, 'tests/fixtures/pdf_real_corpus/irs-f1040-accessible.html'), lang: 'en' },
];

test.describe.configure({ timeout: 600_000 });

for (const d of DOCS) {
  test(d.name + ' earns the PDF/UA declaration', async ({ page }) => {
    test.skip(!fs.existsSync(d.pdf) || !fs.existsSync(d.html), 'corpus files not on this machine');
    await page.route('https://alloflow.test/**', (route) => {
      const u = new URL(route.request().url());
      if (u.pathname.startsWith('/vendor/')) return route.fulfill({ body: fs.readFileSync(path.join(VENDOR, u.pathname.slice(8))), contentType: 'application/javascript' });
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
    });
    await page.goto('https://alloflow.test/boot');
    for (const f of ['pdfjs.min.js', 'pdf-lib.min.js', 'pako.min.js', 'fontkit.umd.min.js']) await page.addScriptTag({ path: path.join(VENDOR, f) });
    for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) await page.addScriptTag({ path: path.join(ROOT, f) });
    const r = await page.evaluate(async ({ pdfB64, html, lang, title }) => {
      const W: any = window;
      W.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://alloflow.test/vendor/pdf.worker.min.js';
      W.__alloflowRuntimeAssets = { pdfjsWorker: 'https://alloflow.test/vendor/pdf.worker.min.js' };
      const bytes = Uint8Array.from(atob(pdfB64), (c) => c.charCodeAt(0));
      const p = W.AlloModules.createDocPipeline({ callGemini: async () => 'OK', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: (l: string) => /^(ar|he|fa|ur|ps)/.test(l || ''), updateExportPreview: () => {}, getDefaultTitle: () => title, state: {} });
      const tagged = await p.createTaggedPdf(bytes, { accessibleHtml: html, isScanned: false }, { title, lang, modDate: '2026-10-18T00:00:00Z' });
      const s = tagged.summary || {};
      const verdict = p.taggedPdfDeliveryVerdict(tagged);
      const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(tagged.bytes || tagged);
      return { uaDeclared: s.uaDeclared, orphanedLeaves: s.orphanedLeaves, fontsUnrepairable: s.fontsUnrepairable, verdict: verdict && (verdict.code || (verdict.ok ? 'ok' : 'blocked')), fails: ((v && v.checks) || []).filter((c: any) => c.status === 'fail').map((c: any) => c.rule + ': ' + c.detail), roundTrip: tagged.roundTrip && tagged.roundTrip.ok };
    }, { pdfB64: fs.readFileSync(d.pdf).toString('base64'), html: fs.readFileSync(d.html, 'utf8'), lang: d.lang, title: d.name });
    expect(r.fails, 'AlloFlow validator').toEqual([]);
    expect(r).toMatchObject({ uaDeclared: true, orphanedLeaves: 0, verdict: 'verified', roundTrip: true });
    expect(r.fontsUnrepairable).toEqual([]);
  });
}
