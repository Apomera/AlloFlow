#!/usr/bin/env node
// UA-gate probe (2026-07-10): replicates the pdf_tag_tree_golden "link gate" fixture (scanned run:
// { accessibleHtml, groundTruthMethod:'tesseract' } — NO groundTruthPages) in the harness's
// Node/jsdom world, against an arbitrary built module file. Used to bisect which commit made the
// scanned path stop declaring pdfuaid:part=1. Usage:
//   node dev-tools/debug/ua_gate_probe.cjs [path/to/doc_pipeline_module.js]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_PATH = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'doc_pipeline_module.js');

let pdfLib = null;
for (const p of ['C:/tmp/node_modules/pdf-lib', path.join(ROOT, 'node_modules', 'pdf-lib'), 'pdf-lib']) {
  try { pdfLib = require(p); break; } catch (_) {}
}
if (!pdfLib) { console.error('pdf-lib unavailable'); process.exit(2); }
const { PDFDocument, StandardFonts, PDFName, PDFString } = pdfLib;

const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
const win = dom.window;
// realm trick (see tag_tree_live_harness): pdf-lib instanceof checks need Node's primitives
win.TextEncoder = TextEncoder; win.TextDecoder = TextDecoder; win.Uint8Array = Uint8Array;
win.ArrayBuffer = ArrayBuffer; win.DataView = DataView; win.Promise = Promise;
win.PDFLib = pdfLib;
win.Tesseract = undefined;
win.performance = { now: () => Date.now() };
win.fetch = () => Promise.reject(new Error('probe: network stubbed'));
win.DOMPurify = { sanitize: (h) => h, addHook() {}, removeHook() {} };
win.fontkit = {};
win.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.reject(new Error('probe: pdf.js stubbed')), destroy() {} }) };
const ctx = dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(MODULE_PATH, 'utf8'), ctx, { filename: 'doc_pipeline_module.js' });
if (!win.AlloModules || typeof win.AlloModules.createDocPipeline !== 'function') { console.error('createDocPipeline not registered'); process.exit(2); }

(async () => {
  // input: one page + a link annot (same shape as the spec fixture)
  const inDoc = await PDFDocument.create();
  const pg = inDoc.addPage([612, 792]);
  const font = await inDoc.embedFont(StandardFonts.Helvetica);
  pg.drawText('Visit x.', { x: 50, y: 700, size: 12, font });
  const ictx = inDoc.context;
  const action = ictx.obj({ Type: PDFName.of('Action'), S: PDFName.of('URI'), URI: PDFString.of('https://example.com/x') });
  const annot = ictx.obj({ Type: PDFName.of('Annot'), Subtype: PDFName.of('Link'), Rect: [50, 695, 120, 715], Border: [0, 0, 0], A: action });
  const annotRef = ictx.register(annot);
  pg.node.set(PDFName.of('Annots'), ictx.obj([annotRef]));
  const inputBytes = await inDoc.save({ useObjectStreams: false });

  const pipeline = win.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Document', state: {},
  });
  const html = '<!DOCTYPE html><html lang="en"><head><title>Link Fixture</title></head><body><main><h1>Doc</h1><p>Visit <a href="https://example.com/x">x</a>.</p></main></body></html>';
  const r = await pipeline.createTaggedPdf(new Uint8Array(inputBytes), { accessibleHtml: html, groundTruthMethod: 'tesseract' }, { title: 'Link Gate Test', lang: 'en' });
  if (!r || !r.bytes) { console.log('RESULT: no bytes'); process.exit(1); }
  const s = r.summary || {};
  const xmp = Buffer.from(r.bytes).toString('latin1');
  const hasClaim = xmp.indexOf('<pdfuaid:part>1</pdfuaid:part>') !== -1;
  const withheld = (xmp.match(/pdfuaid:part withheld: [^>]*/) || [null])[0];
  console.log('MODULE:', MODULE_PATH);
  console.log('uaDeclared(summary):', s.uaDeclared, '| hasClaim(bytes):', hasClaim);
  console.log('reachableLeaves:', s.reachableLeaves, '| orphanedLeaves:', s.orphanedLeaves);
  if (withheld) console.log('WITHHELD:', withheld.slice(0, 160));
  process.exit(hasClaim ? 0 : 1);
})().catch((e) => { console.error('probe error:', e && e.message); process.exit(2); });
