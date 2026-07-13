// stem_real_pdf_tag_probe.cjs — run the REAL createTaggedPdf (built doc_pipeline_module.js)
// against a REAL born-digital PDF (e.g. a NY Regents exam) in Node, and analyze what survived
// in the saved bytes. Companion to tag_tree_live_harness.cjs (same jsdom/realm scaffolding);
// that harness builds synthetic scanned fixtures — this probe exercises the BORN-DIGITAL path
// (ActualText associations) on real 20-30 page STEM layouts.
//
// Usage:
//   node dev-tools/debug/stem_real_pdf_tag_probe.cjs --pdf <file.pdf> --text <file_text.json> [--out out.pdf] [--title "Doc"]
// The _text.json comes from the per-page extractor (see dev-tools/debug/stem_text_quality_probe.cjs
// header for corpus + setup): { pages: [{pageNum, text}] }.
//
// Exit codes: 0 = clean; 1 = structural loss (dangles / zero leaves / throw); 2 = harness error.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_PATH = path.join(ROOT, 'doc_pipeline_module.js');

let pdfLib = null;
for (const p of ['C:/tmp/node_modules/pdf-lib', path.join(ROOT, 'node_modules', 'pdf-lib'), 'pdf-lib']) {
  try { pdfLib = require(p); console.log('[probe] pdf-lib from:', p, 'v' + require(p + '/package.json').version); break; } catch (_) {}
}
if (!pdfLib) { console.error('[probe] pdf-lib not found — cd C:/tmp && npm install pdf-lib@1.17.1 --no-save'); process.exit(2); }
const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } = pdfLib;

const args = process.argv.slice(2);
const argOf = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const PDF_PATH = argOf('--pdf');
const TEXT_PATH = argOf('--text');
const OUT = argOf('--out');
const TITLE = argOf('--title') || (PDF_PATH ? path.basename(PDF_PATH).replace(/\.pdf$/i, '') : 'Document');
if (!PDF_PATH || !TEXT_PATH) { console.error('usage: --pdf <file.pdf> --text <file_text.json> [--out out.pdf]'); process.exit(2); }

// ── jsdom world (same realm trick as tag_tree_live_harness.cjs) ──
const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://alloflow.local/', runScripts: 'outside-only', pretendToBeVisual: true,
});
const win = dom.window;
win.PDFLib = pdfLib;
win.TextEncoder = TextEncoder;
win.TextDecoder = TextDecoder;
win.Uint8Array = Uint8Array;
win.ArrayBuffer = ArrayBuffer;
win.DataView = DataView;
if (!win.AbortController) win.AbortController = AbortController;
if (!win.performance) win.performance = performance;
win.fetch = () => Promise.reject(new Error('no network in probe'));
win.warnLog = (...a) => console.warn('[app]', ...a);
win.DOMPurify = { sanitize: (h) => h, addHook() {}, removeHook() {} };
win.fontkit = {};
win.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.reject(new Error('probe: pdf.js stubbed')), destroy() {} }) };
const ctx = dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(MODULE_PATH, 'utf8'), ctx, { filename: 'doc_pipeline_module.js' });
if (!win.AlloModules || typeof win.AlloModules.createDocPipeline !== 'function') { console.error('[probe] createDocPipeline not registered'); process.exit(2); }

// ── Build a faithful born-digital fixResult from the extracted text ──
const textJson = JSON.parse(fs.readFileSync(TEXT_PATH, 'utf8'));
const pages = textJson.pages || [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Paragraph chunking: split at question-number starts ("12 Which…", "(1) choice") so the
// structure has realistic leaf counts; fall back to ~500-char chunks for long runs.
const chunk = (t) => {
  const parts = String(t).split(/(?=(?<![\d.])\b\d{1,2}\s+(?=[A-Z(]))/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.length <= 700) { out.push(p); continue; }
    for (let i = 0; i < p.length; i += 500) out.push(p.slice(i, i + 500));
  }
  return out.length ? out : [String(t)];
};
let bodyHtml = '<h1>' + esc(TITLE) + '</h1>\n';
for (const pg of pages) {
  if (!pg.text) continue;
  bodyHtml += '<section aria-label="Page ' + pg.pageNum + '">\n<h2>Page ' + pg.pageNum + '</h2>\n';
  for (const c of chunk(pg.text)) bodyHtml += '<p>' + esc(c) + '</p>\n';
  bodyHtml += '</section>\n';
}
const ACCESSIBLE_HTML = '<!DOCTYPE html><html lang="en"><head><title>' + esc(TITLE) + '</title></head><body><main id="main-content" role="main">\n' + bodyHtml + '</main></body></html>';
const allText = pages.map((p) => p.text).join('\n\n');
const fixResult = {
  accessibleHtml: ACCESSIBLE_HTML,
  groundTruthMethod: 'pdfjs', // born-digital — never matches /tesseract|vision|ocr/
  groundTruthPages: pages.map((p) => ({ pageNum: p.pageNum, text: p.text })),
  sourceText: allText,
  finalText: allText,
};

(async () => {
  const inputBytes = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pipeline = win.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => TITLE, state: {},
  });
  const t0 = Date.now();
  let result;
  try {
    result = await pipeline.createTaggedPdf(inputBytes, fixResult, { title: TITLE, lang: 'en' });
  } catch (e) {
    console.error('[probe] createTaggedPdf THREW:', e && (e.stack || e.message));
    process.exit(1);
  }
  const ms = Date.now() - t0;
  if (!result || !result.bytes) { console.error('[probe] no bytes returned'); process.exit(1); }
  console.log('[probe] tagged in ' + ms + 'ms; input ' + inputBytes.length + 'B → output ' + result.bytes.length + 'B');
  if (OUT) { fs.writeFileSync(OUT, Buffer.from(result.bytes)); console.log('[probe] wrote', OUT); }

  const s = result.summary || {};
  console.log('[summary] pages=' + s.pages + ' headings=' + s.headings + ' paragraphs=' + s.paragraphs +
    ' reachableLeaves=' + s.reachableLeaves + ' orphanedLeaves=' + s.orphanedLeaves + ' uaDeclared=' + s.uaDeclared);
  if (result.pdfUa1Checks && result.pdfUa1Checks.summary) {
    // NOTE: pdfUa1Checks.summary has {pass,fail,warn,manual,na,conformancePct} — the `overall`
    // verdict lives on postExportValidator (separate CDN PdfValidator module, absent in Node).
    // KNOWN probe artifact: 'Embedding repair' fails here because fetch is stubbed, so font
    // substitutes (Liberation/DejaVu) can't download — production repairs these over the network.
    const u = result.pdfUa1Checks.summary;
    console.log('[ua1 self-check] ' + u.pass + ' pass / ' + u.fail + ' fail / ' + u.warn + ' warn — conformance ' + u.conformancePct + '%');
    for (const c of (result.pdfUa1Checks.checks || [])) if (c.status === 'fail') console.log('   FAIL: ' + (c.rule || c.label) + ' — ' + (c.message || ''));
  }
  if (result.postExportValidator && result.postExportValidator.summary) {
    const pv = result.postExportValidator.summary;
    console.log('[post-export validator] overall ' + pv.overall + ' (' + pv.pass + ' pass / ' + pv.fail + ' fail)');
  }
  if (result.roundTrip) console.log('[roundTrip] ok=' + result.roundTrip.ok + (result.roundTrip.warnings && result.roundTrip.warnings.length ? ' warnings: ' + result.roundTrip.warnings.join('; ') : ''));

  // ── Saved-bytes structural walk (same checks as the harness) ──
  const outDoc = await PDFDocument.load(result.bytes, { updateMetadata: false });
  const octx = outDoc.context;
  const nm = (x) => PDFName.of(x);
  let structCount = 0, actualTextCount = 0;
  const roleTally = {};
  for (const [, obj] of octx.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict) {
      try {
        const t = obj.get(nm('Type'));
        if (t && String(t) === '/StructElem') {
          structCount++;
          const role = String(obj.get(nm('S')) || '(none)').replace(/^\//, '');
          roleTally[role] = (roleTally[role] || 0) + 1;
          if (obj.get(nm('ActualText'))) actualTextCount++;
        }
      } catch (_) {}
    }
  }
  const dangles = [];
  const seen = new Set();
  const walk = (o, at, d) => {
    if (d > 100 || o == null) return;
    if (o instanceof PDFRef) {
      const r = octx.lookup(o);
      if (r == null) { dangles.push(o.objectNumber + ' at ' + at); return; }
      if (seen.has(o.objectNumber)) return;
      seen.add(o.objectNumber);
      walk(r, at + '→' + o.objectNumber, d + 1);
      return;
    }
    if (o instanceof PDFArray) { for (let i = 0; i < o.size(); i++) walk(o.get(i), at + '[' + i + ']', d + 1); return; }
    if (o instanceof PDFDict) { const K = o.get(nm('K')); if (K != null) walk(K, at + '.K', d + 1); }
  };
  const stRoot = (() => { const r = outDoc.catalog.get(nm('StructTreeRoot')); return r instanceof PDFRef ? octx.lookup(r) : r; })();
  if (stRoot) walk(stRoot.get(nm('K')), 'Root.K', 0); else console.log('[probe] NO StructTreeRoot!');
  console.log('[bytes] StructElems=' + structCount + ' withActualText=' + actualTextCount + ' reachableFromRoot=' + seen.size + ' dangling=' + dangles.length);
  console.log('[roles] ' + Object.entries(roleTally).sort((a, b) => b[1] - a[1]).map(([r, n]) => r + ':' + n).join(' '));
  if (dangles.length) { console.log('[DANGLES]', dangles.slice(0, 10).join(', ')); process.exit(1); }
  if (!stRoot || structCount === 0) process.exit(1);
  console.log('[probe] CLEAN');
  process.exit(0);
})().catch((e) => { console.error('[probe] fatal:', e && (e.stack || e.message)); process.exit(2); });
