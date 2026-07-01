// tag_tree_live_harness.cjs — Node harness that runs the REAL createTaggedPdf
// (the built doc_pipeline_module.js) under jsdom + pdf-lib 1.17.1 (the exact
// version the app loads from CDN), with a PDFContext LEDGER that records every
// assign/delete so a dropped StructElem can be traced to the exact call that
// killed it. This is the instrumentation the b0d24ae3 investigation said it
// needed (docs/tag_tree_unification_design.md → "instrument, don't iterate
// variants") — but in Node (seconds) instead of Playwright (minutes).
//
// Usage:
//   node dev-tools/debug/tag_tree_live_harness.cjs             # scanned single-page baseline
//   node dev-tools/debug/tag_tree_live_harness.cjs --experiment # sets fixResult._experimentPerLeafScanned
//   node dev-tools/debug/tag_tree_live_harness.cjs --multi      # 2-page scanned fixture
//   node dev-tools/debug/tag_tree_live_harness.cjs --out out.pdf # save output bytes
//
// Exit codes: 0 = clean (no loss, no dangling refs); 1 = loss/dangle detected; 2 = harness error.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_PATH = path.join(ROOT, 'doc_pipeline_module.js');

// ── pdf-lib 1.17.1 (same as the app's CDN pin) ──
let pdfLib = null;
for (const p of ['C:/tmp/node_modules/pdf-lib', path.join(ROOT, 'node_modules', 'pdf-lib'), 'pdf-lib']) {
  try { pdfLib = require(p); console.log('[harness] pdf-lib from:', p, 'v' + require(p + '/package.json').version); break; } catch (_) {}
}
if (!pdfLib) { console.error('[harness] pdf-lib not found — cd C:/tmp && npm install pdf-lib@1.17.1 --no-save'); process.exit(2); }
const { PDFDocument, PDFName, PDFNumber, PDFArray, PDFDict, PDFRef, PDFContext, StandardFonts } = pdfLib;

const args = process.argv.slice(2);
const EXPERIMENT = args.includes('--experiment');
const MULTI = args.includes('--multi');
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;

// ── PDFContext ledger — every assign/delete with a trimmed stack ──
// register() = nextRef()+assign(), so patching assign catches both paths.
const ledger = []; // {op, num, gen, kind, s, stack}
const _brief = (obj) => {
  try {
    if (!obj) return String(obj);
    const ctor = obj.constructor ? obj.constructor.name : typeof obj;
    if (obj instanceof PDFDict || (obj.get && obj.entries)) {
      const t = obj.get && obj.get(PDFName.of('Type'));
      const s = obj.get && obj.get(PDFName.of('S'));
      return ctor + (t ? ' Type=' + String(t) : '') + (s ? ' S=' + String(s) : '');
    }
    return ctor;
  } catch (_) { return 'unknown'; }
};
const _stack = () => {
  const raw = (new Error().stack || '').split('\n').slice(3, 9);
  return raw.map((l) => l.trim()).join(' | ');
};
const origAssign = PDFContext.prototype.assign;
PDFContext.prototype.assign = function (ref, obj) {
  ledger.push({ op: 'assign', num: ref.objectNumber, gen: ref.generationNumber, kind: _brief(obj), stack: _stack() });
  return origAssign.call(this, ref, obj);
};
const origDelete = PDFContext.prototype.delete;
PDFContext.prototype.delete = function (ref) {
  ledger.push({ op: 'delete', num: ref && ref.objectNumber, gen: ref && ref.generationNumber, kind: '(delete)', stack: _stack() });
  return origDelete.call(this, ref);
};

// ── jsdom world ──
const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://alloflow.local/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const win = dom.window;
win.PDFLib = pdfLib;
// Realm unification: pdf-lib (Node realm) does `instanceof Uint8Array` checks; typed
// arrays created by module code inside the jsdom VM realm would fail them (a browser
// has ONE realm). Force Node's intrinsics into the window so bare identifiers in the
// module resolve to Node-realm constructors.
win.TextEncoder = TextEncoder;
win.TextDecoder = TextDecoder;
win.Uint8Array = Uint8Array;
win.ArrayBuffer = ArrayBuffer;
win.DataView = DataView;
if (!win.AbortController) win.AbortController = AbortController;
if (!win.performance) win.performance = performance;
// No network in the harness: fetch rejects immediately (font loader degrades to
// Helvetica; scanned path never loads pdf.js/pako).
win.fetch = () => Promise.reject(new Error('no network in harness'));
win.warnLog = (...a) => console.warn('[app]', ...a);
// Pre-satisfy CDN loaders' isReady checks so no <script> injection is attempted
// (jsdom never loads external scripts; each loader would poll its full timeout).
// - DOMPurify: pass-through sanitize (harness input is our own fixture HTML).
// - fontkit: registerFontkit just stores it; the Latin fixture never embeds a
//   custom font (fetch rejects → Helvetica), so the stub is never exercised.
// - pdfjsLib: getDocument rejects instantly → post-save text checks degrade
//   exactly as they do on a blocked network, just without the 12s×N polling.
win.DOMPurify = { sanitize: (h) => h, addHook() {}, removeHook() {} };
win.fontkit = {};
win.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.reject(new Error('harness: pdf.js stubbed')), destroy() {} }) };
const ctx = dom.getInternalVMContext();

const moduleSrc = fs.readFileSync(MODULE_PATH, 'utf8');
try {
  vm.runInContext(moduleSrc, ctx, { filename: 'doc_pipeline_module.js' });
} catch (e) {
  console.error('[harness] module load failed:', e && e.message);
  process.exit(2);
}
if (!win.AlloModules || typeof win.AlloModules.createDocPipeline !== 'function') {
  console.error('[harness] createDocPipeline not registered');
  process.exit(2);
}

// ── fixture ──
const ACCESSIBLE_HTML = `<!DOCTYPE html><html lang="en"><head><title>Harness Doc</title></head>
<body><main id="main-content" role="main">
<h1>Chapter One</h1>
<p>This is a paragraph of body text used to exercise the tagger.</p>
<p>A second paragraph so multiple level-zero leaves exist under the section.</p>
<h2>A Subsection</h2>
<table><thead><tr><th scope="col">Name</th><th scope="col">Score</th></tr></thead>
<tbody><tr><td>Alice</td><td>90</td></tr><tr><td>Bob</td><td>82</td></tr></tbody></table>
<p>Closing remarks paragraph with plain text.</p>
</main></body></html>`;

const OCR_TEXT_P1 = 'Chapter One\nThis is a paragraph of body text used to exercise the tagger.\nA second paragraph so multiple level-zero leaves exist under the section.';
const OCR_TEXT_P2 = 'A Subsection\nName Score Alice 90 Bob 82\nClosing remarks paragraph with plain text.';

async function makeInputPdf(pages) {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const pg = d.addPage([612, 792]);
    // Real content so _origContentCount > 0 → exercises the scanned Artifact/OCR split.
    pg.drawRectangle({ x: 40, y: 40, width: 532, height: 712, borderWidth: 1 });
    pg.drawText(' ', { x: 50, y: 750, size: 8, font }); // trivial op, keeps stream non-degenerate
  }
  return d.save({ useObjectStreams: false });
}

(async () => {
  const pageCount = MULTI ? 2 : 1;
  const inputBytes = await makeInputPdf(pageCount);
  const ledgerStartInput = ledger.length; // events before the pipeline ran (fixture build)

  const pipeline = win.AlloModules.createDocPipeline({
    callGemini: async () => '{}',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (k) => k,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
  if (typeof pipeline.createTaggedPdf !== 'function') { console.error('[harness] createTaggedPdf not exported'); process.exit(2); }

  const fixResult = {
    accessibleHtml: ACCESSIBLE_HTML,
    groundTruthMethod: 'tesseract', // → isScanned
    groundTruthPages: MULTI
      ? [{ pageNum: 1, text: OCR_TEXT_P1 }, { pageNum: 2, text: OCR_TEXT_P2 }]
      : [{ pageNum: 1, text: OCR_TEXT_P1 + '\n' + OCR_TEXT_P2 }],
  };
  if (EXPERIMENT) fixResult._experimentPerLeafScanned = true;
  if (args.includes('--early-getpages')) fixResult._experimentEarlyGetPages = true;

  const t0 = Date.now();
  let result;
  try {
    result = await pipeline.createTaggedPdf(new Uint8Array(inputBytes), fixResult, { title: 'Harness Doc', lang: 'en' });
  } catch (e) {
    console.error('[harness] createTaggedPdf threw:', e && (e.stack || e.message));
    process.exit(2);
  }
  console.log('[harness] createTaggedPdf completed in', Date.now() - t0, 'ms; bytes:', result && result.bytes && result.bytes.length);
  if (!result || !result.bytes) { console.error('[harness] no bytes'); process.exit(2); }
  if (OUT) { fs.writeFileSync(OUT, Buffer.from(result.bytes)); console.log('[harness] wrote', OUT); }

  // ── Post-analysis ──
  // 1) Everything the ledger says was assigned as a StructElem during the pipeline run.
  const pipelineEvents = ledger.slice(ledgerStartInput);
  const lastAssignByNum = new Map(); // num → event (last assign wins)
  const eventsByNum = new Map();
  for (const ev of pipelineEvents) {
    if (!eventsByNum.has(ev.num)) eventsByNum.set(ev.num, []);
    eventsByNum.get(ev.num).push(ev);
    if (ev.op === 'assign') lastAssignByNum.set(ev.num, ev);
  }
  const builtStructNums = [...lastAssignByNum.entries()]
    .filter(([, ev]) => /Type=\/StructElem|S=\//.test(ev.kind) && /StructElem/.test(ev.kind))
    .map(([num]) => num);

  // 2) What actually survived in the saved bytes.
  const outDoc = await PDFDocument.load(result.bytes, { updateMetadata: false });
  const octx = outDoc.context;
  const savedByNum = new Map();
  for (const [ref, obj] of octx.enumerateIndirectObjects()) savedByNum.set(ref.objectNumber, obj);
  const savedStructNums = new Set();
  const roleTally = {};
  for (const [num, obj] of savedByNum) {
    try {
      if (obj instanceof PDFDict) {
        const t = obj.get(PDFName.of('Type'));
        if (t && String(t) === '/StructElem') {
          savedStructNums.add(num);
          const s = obj.get(PDFName.of('S'));
          const role = s ? String(s).replace(/^\//, '') : '(none)';
          roleTally[role] = (roleTally[role] || 0) + 1;
        }
      }
    } catch (_) {}
  }

  // 3) Dangling refs: walk the saved StructTree; any /K ref that resolves to nothing is a dangle.
  const dangles = [];
  const nm = (s) => PDFName.of(s);
  const resolve = (o) => (o instanceof PDFRef ? octx.lookup(o) : o);
  const seen = new Set();
  const walk = (o, pathStr, depth) => {
    if (depth > 80 || o == null) return;
    if (o instanceof PDFRef) {
      const r = octx.lookup(o);
      if (r == null) { dangles.push({ num: o.objectNumber, at: pathStr }); return; }
      if (seen.has(o.objectNumber)) return;
      seen.add(o.objectNumber);
      walk(r, pathStr + '→' + o.objectNumber, depth + 1);
      return;
    }
    if (o instanceof PDFArray) { for (let i = 0; i < o.size(); i++) walk(o.get(i), pathStr + '[' + i + ']', depth + 1); return; }
    if (o instanceof PDFDict) {
      const K = o.get(nm('K'));
      if (K != null) walk(K, pathStr + '.K', depth + 1);
    }
  };
  const stRootRef = outDoc.catalog.get(nm('StructTreeRoot'));
  const stRoot = resolve(stRootRef);
  if (stRoot) walk(stRoot.get(nm('K')), 'Root.K', 0);

  // 4) Orphan tally (golden-master metric): leaves without /K→MCR/MCID.
  const LEAF_ROLES = ['H1','H2','H3','H4','H5','H6','P','Figure','Formula','Caption','BlockQuote','Lbl','LBody','TH','TD','Span','Link','Note'];
  let leafCount = 0, orphanedLeafCount = 0;
  const walkRoles = (objIn, depth) => {
    let obj = resolve(objIn);
    if (depth > 80 || obj == null) return;
    if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walkRoles(obj.get(i), depth + 1); return; }
    if (!(obj instanceof PDFDict)) return;
    const S = obj.get(nm('S'));
    if (!S) { const k0 = obj.get(nm('K')); if (k0 != null) walkRoles(k0, depth + 1); return; }
    const role = String(S).replace(/^\//, '');
    const K = obj.get(nm('K'));
    let hasContent = false;
    if (K != null) {
      const kr = resolve(K);
      const items = kr instanceof PDFArray ? Array.from({ length: kr.size() }, (_, i) => resolve(kr.get(i))) : [kr];
      for (const it of items) {
        if (it instanceof PDFNumber) hasContent = true;
        else if (it instanceof PDFDict) {
          const t = it.get(nm('Type')); const ts = t ? String(t) : '';
          if (ts === '/MCR' || ts === '/OBJR') hasContent = true;
        }
      }
    }
    if (LEAF_ROLES.includes(role)) { leafCount++; if (!hasContent) orphanedLeafCount++; }
    if (K != null) walkRoles(K, depth + 1);
  };
  if (stRoot) walkRoles(stRoot.get(nm('K')), 0);

  // 4b) CONTENT-STREAM level checks (added after the first decode found the runs
  // were only object-level-correct): decode every page's streams and verify
  //   (i)  the /Artifact wrap actually covers the fixture's original content
  //        (the drawRectangle path "0 712") — catches the normalize()/count
  //        mis-split that shipped the image as /P text content;
  //   (ii) every StructElem MCR (page, MCID) has a matching BDC in that page's
  //        decoded content — catches "linked" MCRs that point at nothing.
  const zlib = require('zlib');
  const streamChecks = [];
  const pagesOut = outDoc.getPages();
  const pageDecoded = [];
  for (let p = 0; p < pagesOut.length; p++) {
    const contents = pagesOut[p].node.get(nm('Contents'));
    let all = '';
    if (contents && typeof contents.size === 'function') {
      for (let i = 0; i < contents.size(); i++) {
        const s = octx.lookup(contents.get(i));
        if (!s) continue;
        let bytes = s.getContents ? s.getContents() : (s.contents || null);
        if (!bytes) continue;
        const filt = s.dict && s.dict.get && s.dict.get(nm('Filter'));
        try { all += (filt && String(filt) === '/FlateDecode') ? zlib.inflateSync(Buffer.from(bytes)).toString('latin1') : Buffer.from(bytes).toString('latin1'); }
        catch (_) { all += ''; }
      }
    }
    pageDecoded.push(all);
  }
  // (i) artifact coverage probe — fixture rect path must be INSIDE the artifact region
  for (let p = 0; p < pageDecoded.length; p++) {
    const body = pageDecoded[p];
    const aStart = body.indexOf('/Artifact BMC');
    if (aStart === -1) { streamChecks.push('page ' + (p + 1) + ': no /Artifact wrap found'); continue; }
    const aEnd = body.indexOf('EMC', aStart);
    const artifactRegion = aEnd > aStart ? body.slice(aStart, aEnd) : '';
    if (!/0 712/.test(artifactRegion)) streamChecks.push('page ' + (p + 1) + ': original content NOT inside /Artifact region (mis-split)');
  }
  // (ii) every MCR must resolve to a real BDC on its page; tally multi-claims
  const pageRefToIdx = new Map();
  for (let p = 0; p < pagesOut.length; p++) pageRefToIdx.set(pagesOut[p].ref.toString(), p);
  const bdcByPage = pageDecoded.map((body) => {
    const found = new Map(); // mcid → count
    for (const m of body.matchAll(/<<\s*\/MCID\s+(\d+)\s*>>\s*BDC/g)) found.set(Number(m[1]), (found.get(Number(m[1])) || 0) + 1);
    return found;
  });
  const mcrClaims = new Map(); // pageIdx:mcid → claim count
  for (const [, obj] of savedByNum) {
    try {
      if (!(obj instanceof PDFDict)) continue;
      const t = obj.get(nm('Type')); if (!t || String(t) !== '/StructElem') continue;
      const K = resolve(obj.get(nm('K')));
      const items = K instanceof PDFArray ? Array.from({ length: K.size() }, (_, i) => resolve(K.get(i))) : [K];
      for (const it of items) {
        if (it instanceof PDFDict && it.get(nm('Type')) && String(it.get(nm('Type'))) === '/MCR') {
          const pg = it.get(nm('Pg')); const mc = it.get(nm('MCID'));
          const pIdx = pg ? pageRefToIdx.get(pg.toString()) : undefined;
          const mcid = mc ? Number(String(mc)) : NaN;
          if (pIdx === undefined || Number.isNaN(mcid)) { streamChecks.push('MCR with unresolvable Pg/MCID'); continue; }
          const key = pIdx + ':' + mcid;
          mcrClaims.set(key, (mcrClaims.get(key) || 0) + 1);
          if (!bdcByPage[pIdx] || !bdcByPage[pIdx].has(mcid)) streamChecks.push('MCR → page ' + (pIdx + 1) + ' MCID ' + mcid + ' has NO matching BDC in content');
        }
      }
    } catch (_) {}
  }
  const multiClaims = [...mcrClaims.entries()].filter(([, c]) => c > 1);
  if (EXPERIMENT && multiClaims.length) streamChecks.push('per-leaf mode: MCIDs claimed by >1 element: ' + multiClaims.map(([k, c]) => k + '×' + c).join(', '));

  // 5) The verdict: every ledger-built StructElem must exist in saved bytes AS a StructElem.
  const missing = builtStructNums.filter((n) => !savedStructNums.has(n));
  console.log('\n===== TAG-TREE LIVE HARNESS REPORT =====');
  console.log('mode:', EXPERIMENT ? 'EXPERIMENT (per-leaf scanned)' : 'baseline', '| pages:', pageCount);
  console.log('StructElems built (ledger):', builtStructNums.length, '| saved:', savedStructNums.size);
  console.log('saved role tally:', JSON.stringify(roleTally));
  console.log('leaves:', leafCount, '| orphaned (no /K→MCR):', orphanedLeafCount);
  console.log('roundTrip.ok:', result.roundTrip && result.roundTrip.ok,
    '| built-vs-saved (app):', result.roundTrip && result.roundTrip.structElemsBuilt, '/', result.roundTrip && result.roundTrip.structElemsSaved);
  if (dangles.length) {
    console.log('\n!! DANGLING REFS IN SAVED STRUCT TREE:', dangles.length);
    for (const d of dangles.slice(0, 10)) console.log('  obj', d.num, 'at', d.at);
  }
  if (missing.length) {
    console.log('\n!! BUILT-BUT-NOT-SAVED StructElems:', missing.length, '→', missing.slice(0, 20).join(', '));
    for (const num of missing.slice(0, 6)) {
      console.log('\n  ── life of object', num, '──');
      for (const ev of (eventsByNum.get(num) || [])) {
        console.log('   ', ev.op, ev.kind);
        console.log('     ', ev.stack);
      }
      const nowIs = savedByNum.get(num);
      console.log('    saved file object', num, 'is now:', nowIs ? _brief(nowIs) : '(ABSENT)');
    }
  }
  if (streamChecks.length) {
    console.log('\n!! CONTENT-STREAM CHECK FAILURES:', streamChecks.length);
    for (const c of streamChecks.slice(0, 15)) console.log('  -', c);
  } else {
    console.log('content-stream checks: artifact coverage OK, every MCR has a matching BDC' + (EXPERIMENT ? ', no multi-claimed MCIDs' : ''));
  }
  const bad = missing.length > 0 || dangles.length > 0 || streamChecks.length > 0;
  console.log('\nverdict:', bad ? 'LOSS/DANGLE/STREAM-FAULT DETECTED' : 'CLEAN');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('[harness] fatal:', e && (e.stack || e.message)); process.exit(2); });
