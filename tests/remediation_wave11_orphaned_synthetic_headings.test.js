// Wave 11A — Orphaned Synthetic Heading Leaves in original_layout Tagging (2026-11-22)
// Verifies:
//  (a) Unprinted remediation-synthesized headings (e.g. <h1> for a page-1 raster banner,
//      <h2>Footnotes</h2>, or synthetic section headings borrowing words from consumed body prose)
//      are pruned cleanly in original_layout mode instead of emitting orphaned 0-MCID StructElems,
//      preserving linked page-1 banner /Figure + /Alt and recording summary.prunedSyntheticHeadings.
//  (b) Honesty / fail-closed invariants: real unlinked source paragraphs, headings, and numbers
//      whose text WAS printed in the source PDF text layer MUST stay orphaned so
//      view_pdf_validator_module.js still fails closed on genuine content-linking failures.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const ROOT = process.cwd();
const PDFLib = requireCjs(path.resolve(ROOT, 'desktop/mcp/vendor/pdf-lib.min.js'));
const pako = requireCjs(path.resolve(ROOT, 'desktop/mcp/vendor/pako.min.js'));
const pdfjsLib = requireCjs(path.resolve(ROOT, 'desktop/mcp/vendor/pdfjs.min.js'));
const PDF_WORKER_PATH = requireCjs.resolve(path.resolve(ROOT, 'desktop/mcp/vendor/pdf.worker.min.js'));

const ED_PDF_PATH = path.resolve(ROOT, 'mcp-testing/corpus/born-digital/ed-parent-guide-idea.pdf');
const ED_HTML_PATH = path.resolve(ROOT, 'mcp-testing/runs/2026-08-10_ed-parent-guide-idea_portable/source-accessible.html');

function createPipelineRuntime() {
  Object.defineProperty(pdfjsLib.GlobalWorkerOptions, 'workerSrc', {
    get() { return PDF_WORKER_PATH; },
    set() {},
    configurable: true,
  });

  const win = {
    AlloModules: {},
    PDFLib,
    pako,
    pdfjsLib,
    __alloGetVerifiedRuntimeAsset: async () => ({ url: 'blob:worker', revoke: async () => {} }),
    console: { log() {}, warn() {}, error() {} },
    document: globalThis.document,
    DOMParser: globalThis.DOMParser,
    NodeFilter: globalThis.NodeFilter,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  const ctx = vm.createContext({
    window: win,
    globalThis: win,
    self: win,
    document: globalThis.document,
    DOMParser: globalThis.DOMParser,
    NodeFilter: globalThis.NodeFilter,
    console: win.console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    Blob,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    AbortController,
    Promise,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    RegExp,
    Error,
    Number,
    String,
    Boolean,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  });

  vm.runInContext(fs.readFileSync(path.resolve(ROOT, 'view_pdf_validator_module.js'), 'utf8'), ctx, { filename: 'view_pdf_validator_module.js' });
  vm.runInContext(fs.readFileSync(path.resolve(ROOT, 'doc_pipeline_module.js'), 'utf8'), ctx, { filename: 'doc_pipeline_module.js' });

  const logs = [];
  const pipeline = win.AlloModules.createDocPipeline({
    warnLog: (m) => logs.push(String(m)),
  });
  return { pipeline, logs, validator: win.AlloModules.PdfValidator };
}

async function listOrphanedStructLeaves(pdfBytes) {
  const outDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const c = outDoc.context;
  const stRoot = c.lookup(outDoc.catalog.get(PDFLib.PDFName.of('StructTreeRoot')));
  const orphans = [];
  const linkedFigures = [];
  const walk = (ref) => {
    const d = c.lookup(ref);
    if (!d || typeof d.get !== 'function') return;
    const s = String(d.get(PDFLib.PDFName.of('S')) || '');
    const k = d.get(PDFLib.PDFName.of('K'));
    const at = d.get(PDFLib.PDFName.of('ActualText'));
    const alt = d.get(PDFLib.PDFName.of('Alt'));
    const txt = at && at.decodeText ? at.decodeText() : '';
    const altTxt = alt && alt.decodeText ? alt.decodeText() : '';
    if (s === '/Figure' && k) linkedFigures.push({ alt: altTxt });
    if (!k && /^\/(H[1-6]|P|Figure|Note|LBody|TH|TD|Caption|BlockQuote)$/.test(s)) {
      orphans.push({ role: s.slice(1), text: txt || altTxt });
    }
    if (k) {
      const ka = c.lookup(k) || k;
      if (typeof ka.size === 'function') {
        for (let i = 0; i < ka.size(); i++) {
          const it = ka.get(i);
          if (it && typeof it.objectNumber === 'number') walk(it);
        }
      } else if (typeof k.objectNumber === 'number') {
        walk(k);
      }
    }
  };
  const rk = stRoot.get(PDFLib.PDFName.of('K'));
  const rka = c.lookup(rk) || rk;
  if (typeof rka.size === 'function') {
    for (let i = 0; i < rka.size(); i++) walk(rka.get(i));
  } else if (rk) {
    walk(rk);
  }
  return { orphans, linkedFigures, stRoot };
}

function getValidatorCheck(res, ruleName) {
  const checks = (res && res.postExportValidator && res.postExportValidator.checks) || [];
  return checks.find((c) => c.rule === ruleName);
}

async function buildBornDigitalPdf(lines, opts = {}) {
  const doc = await PDFLib.PDFDocument.create();
  if (opts.title !== undefined) doc.setTitle(opts.title);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  let y = 740;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font });
    y -= 24;
  }
  return new Uint8Array(await doc.save());
}

describe('Wave 11A — Orphaned synthetic heading leaves in original_layout tagging', () => {
  let runtime;
  let edPdfBytes;
  let edBaseHtml;

  beforeAll(() => {
    runtime = createPipelineRuntime();
    edPdfBytes = new Uint8Array(fs.readFileSync(ED_PDF_PATH));
    edBaseHtml = fs.readFileSync(ED_HTML_PATH, 'utf8');
  });

  it('prunes unprinted synthetic H1 (raster banner) and H2 Footnotes on ed-parent-guide-idea.pdf with 0 orphaned leaves and transparent summary metadata', async () => {
    const html = edBaseHtml
      .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '<h1>OSEP: Office of Special Education Programs</h1>')
      .replace(/<h2[^>]*>Notes<\/h2>/, '<h2>Footnotes</h2>');

    const res = await runtime.pipeline.createTaggedPdf(
      edPdfBytes,
      { accessibleHtml: html, groundTruthMethod: 'pdfjs' },
      { title: 'OSEP Dear Colleague Letter on IEP Translation', lang: 'en-US' },
    );

    expect(res.summary.orphanedLeaves).toBe(0);
    expect(res.summary.noPrintedHeadings).toBe(true);
    expect(res.summary.prunedSyntheticHeadingCount).toBe(2);
    expect(res.summary.prunedSyntheticHeadings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'H1',
          text: 'OSEP: Office of Special Education Programs',
          adjacentBannerFigure: true,
          bannerFigureAltPreserved: true,
        }),
        expect.objectContaining({
          role: 'H2',
          text: 'Footnotes',
          reason: 'not-in-source-text',
        }),
      ]),
    );

    const noOrphansCheck = getValidatorCheck(res, 'No orphaned semantic leaves');
    const headingCheck = getValidatorCheck(res, 'At least one heading present');
    expect(noOrphansCheck?.status).toBe('pass');
    expect(headingCheck?.status).toBe('pass');

    const { orphans, linkedFigures } = await listOrphanedStructLeaves(res.bytes);
    expect(orphans).toEqual([]);
    expect(linkedFigures.length).toBe(1);
    expect(linkedFigures[0].alt).toContain('Office of Special Education Programs');
  }, 30_000);

  it('prevents synthetic H2 section headings borrowing opening words of body prose (e.g. "Title VI") and leading H1 matching a page-2 signature from creating orphans', async () => {
    const html = edBaseHtml
      .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '<h1>Office of Special Education Programs</h1>')
      .replace('<p data-source-page="1">Title VI is a civil rights law', '<h2>Title VI</h2><p data-source-page="1">Title VI is a civil rights law')
      .replace(/<h2[^>]*>Notes<\/h2>/, '<h2>Footnotes</h2>');

    const res = await runtime.pipeline.createTaggedPdf(
      edPdfBytes,
      { accessibleHtml: html, groundTruthMethod: 'pdfjs' },
      { title: 'OSEP Dear Colleague Letter on IEP Translation', lang: 'en-US' },
    );

    expect(res.summary.orphanedLeaves).toBe(0);
    expect(res.summary.noPrintedHeadings).toBe(true);
    expect(res.summary.prunedSyntheticHeadingCount).toBe(3);
    const rolesAndTexts = res.summary.prunedSyntheticHeadings.map((h) => `${h.role}:${h.text}`);
    expect(rolesAndTexts).toContain('H1:Office of Special Education Programs');
    expect(rolesAndTexts).toContain('H2:Title VI');
    expect(rolesAndTexts).toContain('H2:Footnotes');
    expect(getValidatorCheck(res, 'No orphaned semantic leaves')?.status).toBe('pass');
    expect(getValidatorCheck(res, 'At least one heading present')?.status).toBe('pass');
  }, 30_000);

  it('uses source PDF /Info /Title when meta.title is omitted on a no-printed-headings PDF', async () => {
    const html = edBaseHtml
      .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '<h1>U.S. Department of Education — OSEP</h1>')
      .replace(/<h2[^>]*>Notes<\/h2>/, '<h2>Footnotes</h2>');

    const res = await runtime.pipeline.createTaggedPdf(
      edPdfBytes,
      { accessibleHtml: html, groundTruthMethod: 'pdfjs' },
      { lang: 'en-US' },
    );

    expect(res.summary.orphanedLeaves).toBe(0);
    expect(res.summary.noPrintedHeadings).toBe(true);
    expect(res.summary.prunedSyntheticHeadingCount).toBe(2);
    expect(getValidatorCheck(res, 'No orphaned semantic leaves')?.status).toBe('pass');
    expect(getValidatorCheck(res, 'At least one heading present')?.status).toBe('pass');
  }, 30_000);

  it('prunes unprinted synthetic H2 Footnotes while keeping real printed headings linked in a mixed document', async () => {
    const pdfBytes = await buildBornDigitalPdf([
      'District Accessibility Policy',
      'Students receive timely translated notices for every IEP meeting.',
      '1. Reference: 34 CFR 300.322 requires meaningful parent participation.',
    ], { title: 'District Accessibility Policy' });

    const html = `<!doctype html><html lang="en"><head><title>District Accessibility Policy</title></head><body>
      <h1>District Accessibility Policy</h1>
      <p>Students receive timely translated notices for every IEP meeting.</p>
      <h2>Footnotes</h2>
      <p>1. Reference: 34 CFR 300.322 requires meaningful parent participation.</p>
    </body></html>`;

    const res = await runtime.pipeline.createTaggedPdf(
      pdfBytes,
      { accessibleHtml: html, groundTruthMethod: 'pdfjs' },
      { title: 'District Accessibility Policy', lang: 'en' },
    );

    expect(res.summary.orphanedLeaves).toBe(0);
    expect(res.summary.noPrintedHeadings).toBe(false);
    expect(res.summary.prunedSyntheticHeadingCount).toBe(1);
    expect(res.summary.prunedSyntheticHeadings[0]).toMatchObject({
      role: 'H2',
      text: 'Footnotes',
      reason: 'not-in-source-text',
    });
    expect(getValidatorCheck(res, 'No orphaned semantic leaves')?.status).toBe('pass');
    expect(getValidatorCheck(res, 'At least one heading present')?.status).toBe('pass');
  }, 20_000);

  it('HONESTY (fail-closed): preserves real unlinked source paragraphs with altered numbers as orphaned leaves', async () => {
    const pdfBytes = await buildBornDigitalPdf([
      'District Budget Summary',
      'Total special education funding is 14250 dollars for fiscal year 2026 across all schools.',
    ], { title: 'District Budget Summary' });

    // Altered number (14250 -> 99999) prevents Stage 4b near-match from linking this real source paragraph.
    // Because its words WERE printed in the source PDF, Option B MUST keep it orphaned and fail closed.
    const html = `<!doctype html><html lang="en"><head><title>District Budget Summary</title></head><body>
      <h1>District Budget Summary</h1>
      <p>Total special education funding is 99999 dollars for fiscal year 2026 across all schools.</p>
    </body></html>`;

    const res = await runtime.pipeline.createTaggedPdf(
      pdfBytes,
      { accessibleHtml: html, groundTruthMethod: 'pdfjs' },
      { title: 'District Budget Summary', lang: 'en' },
    );

    expect(res.summary.orphanedLeaves).toBeGreaterThanOrEqual(1);
    expect(res.summary.prunedSyntheticHeadingCount).toBe(0);
    expect(getValidatorCheck(res, 'No orphaned semantic leaves')?.status).toBe('fail');
    const { orphans } = await listOrphanedStructLeaves(res.bytes);
    expect(orphans.some((o) => o.role === 'P' && o.text.includes('99999'))).toBe(true);
  }, 20_000);

  it('HONESTY (fail-closed): preserves a real printed heading whose text WAS in the source PDF when it fails to link', async () => {
    const pdfBytes = await buildBornDigitalPdf([
      'Special Education Procedural Safeguards Notice 2026',
      'Parents have the right to review all educational records.',
    ], { title: 'Procedural Safeguards' });

    // Changed number in a REAL printed heading (2026 -> 2029): Stage 4b near-match refuses to link
    // because numbers differ, while _printedAsLine detects >= 0.8 word overlap against the unclaimed
    // printed heading line and MUST keep it orphaned (fail closed).
    const html = `<!doctype html><html lang="en"><head><title>Procedural Safeguards</title></head><body>
      <h1>Special Education Procedural Safeguards Notice 2029</h1>
      <p>Parents have the right to review all educational records.</p>
    </body></html>`;

    const res = await runtime.pipeline.createTaggedPdf(
      pdfBytes,
      { accessibleHtml: html, groundTruthMethod: 'pdfjs' },
      { title: 'Procedural Safeguards', lang: 'en' },
    );

    expect(res.summary.orphanedLeaves).toBeGreaterThanOrEqual(1);
    expect(res.summary.prunedSyntheticHeadingCount).toBe(0);
    expect(getValidatorCheck(res, 'No orphaned semantic leaves')?.status).toBe('fail');
    const { orphans } = await listOrphanedStructLeaves(res.bytes);
    expect(orphans.some((o) => o.role === 'H1' && o.text.includes('2029'))).toBe(true);
  }, 20_000);
});
