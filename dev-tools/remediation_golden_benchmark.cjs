#!/usr/bin/env node
'use strict';

/**
 * Deploy-Safe Real-Document Golden Benchmark Harness (Phase 1).
 *
 * Exercises REAL repo code end-to-end (zero mocks of our own remediation logic,
 * zero network calls, zero AI keys in --mode offline) against 7 deterministic
 * golden fixtures materialized by build_remediation_golden_fixtures.cjs:
 *   1. Portable Python engine (alloflow_portable.py) + Stage-4 PDF decoders/inliner
 *   2. Pure OCR / space-split / running-header / U+FFFD cleanup helpers
 *   3. DOCX extractor (mammoth/JSZip + OMML + textboxes + comment exclusion/opt-in)
 *   4. XLSX extractor (SheetJS 0.20.3 + zip-bomb guard + merged tableGrids + pipe escaping)
 *   5. Deterministic WCAG fixers (contrast, DPUB-ARIA roles, heading skips, dup IDs) + WCAG 2.2 probe + RTL detection
 *   6. Document Builder block renderer (doc_builder_renderer_module.js)
 *   7. Alt-Format exports (view_pdf_audit_module.js: EPUB3 + validateEpub, DAISY, BRF)
 *      and optional --mode pdfua Chromium tagged-PDF + veraPDF pass.
 *
 * CLI usage:
 *   node dev-tools/remediation_golden_benchmark.cjs [--mode offline|pdfua] [--update-golden] [--json <path>]
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { JSDOM } = require('jsdom');
const JSZip = require('jszip');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE_PATH = path.join(ROOT, 'tests', 'fixtures', 'remediation_golden', 'golden_baseline.json');
const PORTABLE_ENGINE = path.join(ROOT, 'agent_skills', 'alloflow-portable-remediation', 'scripts', 'alloflow_portable.py');
const DOC_PIPELINE_MODULE = path.join(ROOT, 'doc_pipeline_module.js');
const DOC_BUILDER_MODULE = path.join(ROOT, 'doc_builder_renderer_module.js');
const VIEW_PDF_AUDIT_MODULE = path.join(ROOT, 'view_pdf_audit_module.js');
const CHROMIUM_PDF_MODULE = path.join(ROOT, 'desktop', 'mcp', 'remediation_chromium_pdf.cjs');
const ZIP_WRITER_MODULE = path.join(ROOT, 'desktop', 'mcp', 'zip_writer.cjs');
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

const VENDOR_ASSETS = {
  jszip: path.join(ROOT, 'runtime_assets', 'document', 'jszip-3.10.1', 'jszip.min.js'),
  mammoth: path.join(ROOT, 'runtime_assets', 'document', 'mammoth-1.6.0', 'mammoth.browser.min.js'),
  sheetjs: path.join(ROOT, 'runtime_assets', 'document', 'sheetjs-0.20.3', 'xlsx.full.min.js'),
  pdflib: path.join(ROOT, 'runtime_assets', 'document', 'pdf-lib-1.17.1', 'pdf-lib.min.js'),
  pako: path.join(ROOT, 'runtime_assets', 'document', 'pako-2.1.0', 'pako.min.js'),
  dompurify: path.join(ROOT, 'runtime_assets', 'document', 'dompurify-3.4.17', 'purify.min.js'),
};

const { FIXTURE_IDS, materializeGoldenFixtures } = require(path.join(__dirname, 'build_remediation_golden_fixtures.cjs'));
const { zipFileMap } = require(ZIP_WRITER_MODULE);

function assertCondition(cond, message, failures) {
  if (!cond) failures.push(message);
  return Boolean(cond);
}

function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Missing start marker for ${label}: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) throw new Error(`Missing end marker for ${label}: ${endMarker}`);
  return source.slice(start, end);
}

/**
 * Create an isolated JSDOM VM environment with all vendored browser libraries
 * and AlloFlow runtime modules loaded strictly offline (zero network fetches).
 */
function createOfflineRuntime() {
  const dom = new JSDOM('<!DOCTYPE html><html lang="en"><head><title>Benchmark</title></head><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'outside-only',
  });
  const win = dom.window;
  const ctx = dom.getInternalVMContext();

  // Provide standard typed-array / encoding / crypto / console globals expected by browser bundles.
  win.TextEncoder = TextEncoder;
  win.TextDecoder = TextDecoder;
  win.Uint8Array = Uint8Array;
  win.Int8Array = Int8Array;
  win.Uint16Array = Uint16Array;
  win.Int16Array = Int16Array;
  win.Uint32Array = Uint32Array;
  win.Int32Array = Int32Array;
  win.Float32Array = Float32Array;
  win.Float64Array = Float64Array;
  win.ArrayBuffer = ArrayBuffer;
  win.DataView = DataView;
  win.Buffer = Buffer;
  win.atob = (b64) => Buffer.from(String(b64), 'base64').toString('binary');
  win.btoa = (bin) => Buffer.from(String(bin), 'binary').toString('base64');
  win.warnLog = () => {};
  win.debugLog = () => {};
  win.console = {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };

  // Minimal inert React stub so view_pdf_audit_module.js registers AltFormatExports cleanly offline.
  win.React = {
    useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
    useEffect: () => {},
    useRef: (v) => ({ current: v }),
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useContext: () => null,
    Fragment: Symbol('Fragment'),
    createElement: () => null,
  };
  win.ReactDOM = {};

  const loadScript = (filePath) => {
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, ctx, { filename: filePath });
  };

  loadScript(VENDOR_ASSETS.pako);
  // Use the real Node JSZip 3.10.1 package (browser jszip.min.js relies on window.postMessage
  // scheduling for internalStream, which stalls under JSDOM outside-only mode).
  win.JSZip = JSZip;
  loadScript(VENDOR_ASSETS.mammoth);
  loadScript(VENDOR_ASSETS.sheetjs);
  loadScript(VENDOR_ASSETS.pdflib);
  loadScript(VENDOR_ASSETS.dompurify);

  // Load real compiled AlloFlow modules.
  const docPipelineSrc = fs.readFileSync(DOC_PIPELINE_MODULE, 'utf8');
  vm.runInContext(docPipelineSrc, ctx, { filename: DOC_PIPELINE_MODULE });
  loadScript(DOC_BUILDER_MODULE);
  loadScript(VIEW_PDF_AUDIT_MODULE);

  const factory = win.AlloModules && win.AlloModules.createDocPipeline;
  if (typeof factory !== 'function') {
    throw new Error('Failed to load window.AlloModules.createDocPipeline from doc_pipeline_module.js');
  }
  const stubModel = async () => '{}';
  const pipeline = factory({
    callGemini: stubModel,
    callGeminiVision: stubModel,
    callImagen: async () => null,
    addToast: () => {},
    t: (k) => k,
    isRtlLang: (lang) => /^(?:ar|he|fa|ur)/i.test(String(lang || '')),
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });

  // Extract pure internal helpers directly from the compiled doc_pipeline_module.js
  // (immune to Phase 2 source splitting because doc_pipeline_module.js is the runtime bundle).
  const stage4Slice = sliceBetween(
    docPipelineSrc,
    'const _stage4_decodeAsciiHex =',
    'const _stage4_itemShape =',
    'stage4_decoders_and_inliner',
  );
  const stage4Helpers = vm.runInContext(
    `(function(_stage4_inflate) {\n${stage4Slice}\nreturn { _stage4_decodeAsciiHex, _stage4_decodeAscii85, _stage4_extractFilterNames, _stage4_decodeStreamWithFilters, _stage4_getStreamBytesAndFilter, _stage4_tryInlineFormXObjects };\n})`,
    ctx,
    { filename: 'doc_pipeline_module.js#stage4' },
  )((u8) => new Uint8Array(zlib.inflateSync(Buffer.from(u8))));

  const suspectSlice = sliceBetween(
    docPipelineSrc,
    'const _COMMON_SHORT_TOKENS =',
    'const _getCsPages =',
    'pageSuspectSpaceSplit',
  );
  const pageSuspectSpaceSplit = vm.runInContext(
    `(function() {\n${suspectSlice}\nreturn _pageSuspectSpaceSplit;\n})()`,
    ctx,
    { filename: 'doc_pipeline_module.js#suspectSpaceSplit' },
  );

  const garbageSlice = sliceBetween(
    docPipelineSrc,
    'var _textLayerLooksGarbage =',
    'var _alloListMarkerNumbers =',
    'textLayerLooksGarbage',
  );
  const textLayerHelpers = vm.runInContext(
    `(function() {\n${garbageSlice}\nreturn { _textLayerLooksGarbage, _alloPageTextUnreadable };\n})()`,
    ctx,
    { filename: 'doc_pipeline_module.js#textLayerGarbage' },
  );

  const headingAndDupSlice = sliceBetween(
    docPipelineSrc,
    'const fixHeadingHierarchy =',
    'const runDeterministicWcagFixes =',
    'fixHeadingHierarchy_and_fixDuplicateIds',
  );
  const domFixers = vm.runInContext(
    `(function(DOMParser, _serializeDomEdit, warnLog) {\n${headingAndDupSlice}\nreturn { fixHeadingHierarchy, fixDuplicateIds };\n})`,
    ctx,
    { filename: 'doc_pipeline_module.js#headingAndDupIds' },
  )(win.DOMParser, factory.serializeDomEdit, () => {});

  const strictHeadingSlice = sliceBetween(
    docPipelineSrc,
    'function _collapseHeadingSkipsStrict(',
    '// Actionable HTML-foundation remediation',
    'collapseHeadingSkipsStrict',
  );
  const collapseHeadingSkipsStrict = vm.runInContext(
    `(function() {\n${strictHeadingSlice}\nreturn _collapseHeadingSkipsStrict;\n})()`,
    ctx,
    { filename: 'doc_pipeline_module.js#collapseHeadingSkipsStrict' },
  );

  const rolePassSlice = sliceBetween(
    docPipelineSrc,
    'const __validRoles = new Set([',
    'if (__roleFixCount > 0)',
    'dpubAriaRolePass',
  );
  const runRolePass = vm.runInContext(
    `(function(accessibleHtml) {\n${rolePassSlice}\nreturn { html: accessibleHtml, count: __roleFixCount };\n})`,
    ctx,
    { filename: 'doc_pipeline_module.js#rolePass' },
  );

  const wcag22ProbeSlice = sliceBetween(
    docPipelineSrc,
    'const _runWcag22LayoutChecks =',
    'const runAxeAudit =',
    'wcag22LayoutChecks',
  );
  const runWcag22LayoutChecks = vm.runInContext(
    `(function() {\n${wcag22ProbeSlice}\nreturn _runWcag22LayoutChecks;\n})()`,
    ctx,
    { filename: 'doc_pipeline_module.js#wcag22LayoutChecks' },
  );

  return {
    dom,
    win,
    factory,
    pipeline,
    stage4Helpers,
    pageSuspectSpaceSplit,
    textLayerHelpers,
    domFixers,
    collapseHeadingSkipsStrict,
    runRolePass,
    runWcag22LayoutChecks,
    close: () => {
      try { dom.window.close(); } catch (_) {}
    },
  };
}

/**
 * Benchmark 1: Portable Python engine + Stage-4 PDF pipeline on pdf-out-of-order-formxobj.pdf
 */
async function runPortableAndStage4Pdf(rt, fixturePath, failures) {
  const t0 = performance.now();
  const pyCode = [
    'import importlib.util, json, sys',
    'spec = importlib.util.spec_from_file_location("ap", sys.argv[1])',
    'mod = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(mod)',
    'data = open(sys.argv[2], "rb").read()',
    'extracted = mod._pdf_extract_text(data)',
    'objs = {num: (d, raw) for num, d, raw in mod._pdf_iter_stream_objects(data)}',
    'obj8_raw = objs[8][1] if 8 in objs else b""',
    'obj7_dict = objs[7][0] if 7 in objs else b""',
    'ct, label, pal, tf = mod._resolve_color_space(obj7_dict, {})',
    'print(json.dumps({',
    '  "page_count": extracted.get("pages"),',
    '  "text": extracted.get("text", ""),',
    '  "obj8_exact": obj8_raw == b"ABCDendstreamXYZ!",',
    '  "obj8_len": len(obj8_raw),',
    '  "palette": list(pal) if pal is not None else None,',
    '  "color_type": ct,',
    '}))',
  ].join('\n');

  const env = { ...process.env };
  for (const key of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY']) {
    delete env[key];
  }
  const pyRun = spawnSync(PYTHON, ['-c', pyCode, PORTABLE_ENGINE, fixturePath], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    timeout: 30000,
  });
  if (pyRun.error || pyRun.status !== 0) {
    throw new Error(`alloflow_portable.py probe failed (status=${pyRun.status}): ${pyRun.stderr || (pyRun.error && pyRun.error.message)}`);
  }
  const pyRes = JSON.parse(pyRun.stdout);
  const idxP1 = pyRes.text.indexOf('PAGE_ONE_ALPHA');
  const idxP2 = pyRes.text.indexOf('PAGE_TWO_BETA');
  const portablePageOrderCorrect = idxP1 >= 0 && idxP2 > idxP1;
  const portableFormXobjExtracted = pyRes.text.includes('FORM_XOBJ_CALLOUT');

  // Exercise Stage-4 decoders + Form XObject inliner via real pdf-lib on the SAME PDF file.
  const pdfBytes = fs.readFileSync(fixturePath);
  const pdfU8 = new rt.win.Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);
  const { PDFDocument, PDFName } = rt.win.PDFLib;
  const pdfDoc = await PDFDocument.load(pdfU8, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdfDoc.getPages();
  const page0 = pages[0];
  const streamRes = rt.stage4Helpers._stage4_getStreamBytesAndFilter(page0, PDFName, pdfDoc.context);
  const decodedStr = streamRes && streamRes.bytes ? Buffer.from(streamRes.bytes).toString('latin1') : '';
  const stage4ChainedDecoded = decodedStr.includes('PAGE_ONE_ALPHA') && decodedStr.includes('CHAINED_A85_FLATE');

  const inlinedBytes = streamRes && streamRes.bytes
    ? rt.stage4Helpers._stage4_tryInlineFormXObjects(page0, streamRes.bytes, PDFName, pdfDoc.context)
    : null;
  const inlinedStr = inlinedBytes ? Buffer.from(inlinedBytes).toString('latin1') : '';
  const stage4FormXobjInlined = inlinedStr.includes('FORM_XOBJ_CALLOUT') && inlinedStr.includes('CHAINED_A85_FLATE');

  let unsupportedFilterRejected = false;
  try {
    rt.stage4Helpers._stage4_decodeStreamWithFilters(new rt.win.Uint8Array([1, 2, 3]), ['LZWDecode']);
  } catch (err) {
    unsupportedFilterRejected = /unsupported PDF stream filter: LZWDecode/.test(String(err && err.message));
  }

  const metrics = {
    portablePageCount: pyRes.page_count,
    portablePageOrderCorrect,
    portableFormXobjExtracted,
    portableLengthFirstStreamOk: Boolean(pyRes.obj8_exact),
    portableLengthFirstStreamLen: pyRes.obj8_len,
    portableIndexedColorType: pyRes.color_type,
    portableIndexedPalette: pyRes.palette,
    stage4PageCount: pages.length,
    stage4ChainedDecoded,
    stage4FormXobjInlined,
    stage4UnsupportedFilterRejected: unsupportedFilterRejected,
  };

  assertCondition(metrics.portablePageCount === 2, 'portable PDF page count expected 2', failures);
  assertCondition(metrics.portablePageOrderCorrect, 'portable PDF out-of-order /Kids page order failed', failures);
  assertCondition(metrics.portableFormXobjExtracted, 'portable PDF Form XObject text missing', failures);
  assertCondition(metrics.portableLengthFirstStreamOk, 'portable PDF /Length-first stream slicing failed', failures);
  assertCondition(
    JSON.stringify(metrics.portableIndexedPalette) === JSON.stringify([41, 41, 10, 65, 66, 67]),
    'portable PDF Indexed escaped literal palette mismatch',
    failures,
  );
  assertCondition(metrics.portableIndexedColorType === 3, 'portable PDF Indexed color_type expected 3', failures);
  assertCondition(metrics.stage4ChainedDecoded, 'Stage-4 chained ASCII85+Flate decode failed', failures);
  assertCondition(metrics.stage4FormXobjInlined, 'Stage-4 Form XObject inlining failed', failures);
  assertCondition(metrics.stage4UnsupportedFilterRejected, 'Stage-4 unsupported filter error check failed', failures);

  return { metrics, durationMs: Math.round(performance.now() - t0) };
}

/**
 * Benchmark 2: OCR / space-split / running-header / U+FFFD pure helpers on pdf-ocr-space-split.pdf
 */
async function runOcrAndSpaceSplit(rt, fixturePath, failures) {
  const t0 = performance.now();
  const pdfBytes = fs.readFileSync(fixturePath);
  const pdfU8 = new rt.win.Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);
  const { PDFDocument, PDFName } = rt.win.PDFLib;
  const pdfDoc = await PDFDocument.load(pdfU8, { ignoreEncryption: true, updateMetadata: false });

  // Extract content-stream reference page texts using real doc_pipeline_module.js helper.
  const csPages = await rt.win.__alloCsPageTexts(pdfU8);
  const csPage1 = Array.isArray(csPages) && csPages[0] ? csPages[0] : '';

  // Read embedded OCR scenario payload from object 98 inside the fixture PDF.
  let payload = null;
  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (obj && obj.dict && typeof obj.dict.get === 'function') {
      const tp = obj.dict.get(PDFName.of('Type'));
      if (tp && tp.toString() === '/EmbeddedFile') {
        payload = JSON.parse(Buffer.from(obj.getContents()).toString('utf8'));
        break;
      }
    }
  }
  if (!payload) throw new Error('Embedded OCR payload stream not found in pdf-ocr-space-split.pdf');

  const suspectSpaceSplitDetected = Boolean(rt.pageSuspectSpaceSplit(payload.brokenSpaceSplitPage));
  const cleanPageFalsePositive = Boolean(rt.pageSuspectSpaceSplit(csPage1));

  const repairedRes = rt.win.__alloRepairSpacesWithCs(payload.brokenSpaceSplitPage, csPage1);
  const repairedText = repairedRes.text || '';
  const spaceSplitsRestored = (
    repairedText.includes('permanent')
    && repairedText.includes('United')
    && repairedText.includes('States')
    && repairedText.includes('committee')
  );

  const cleanedOcr = rt.factory.cleanScannedOcrText(repairedText);
  const hyphenAcrossFolioRejoined = cleanedOcr.includes('photosynthesis');
  const numericDataValuePreserved = /(?:^|\n)\s*95\s*(?:\n|$)/.test(cleanedOcr);

  const edgeRes = rt.factory.stripPageEdgeArtifacts(payload.runningHeaderPages);
  const runningHeaderStripped = edgeRes.texts.every((pg) => !pg.includes('District Science Handbook 2026'));
  const strippedEdgeLineCount = Array.isArray(edgeRes.strippedLines) ? edgeRes.strippedLines.length : 0;
  const detectedFolioCount = Array.isArray(edgeRes.folios) ? edgeRes.folios.length : 0;

  const garbageDetected = Boolean(rt.textLayerHelpers._textLayerLooksGarbage(payload.garbledUfffdPage));
  const pageUnreadableObj = rt.textLayerHelpers._alloPageTextUnreadable(payload.garbledUfffdPage);
  const cleanGarbageFalsePositive = Boolean(rt.textLayerHelpers._textLayerLooksGarbage(csPage1));

  const metrics = {
    csExtractedPageCount: Array.isArray(csPages) ? csPages.length : 0,
    suspectSpaceSplitDetected,
    cleanPageFalsePositive,
    repairedSpaceCount: repairedRes.repaired,
    spaceSplitsRestored,
    hyphenAcrossFolioRejoined,
    numericDataValuePreserved,
    runningHeaderStripped,
    strippedEdgeLineCount,
    detectedFolioCount,
    ufffdGarbageDetected: garbageDetected,
    ufffdPageUnreadable: Boolean(pageUnreadableObj && pageUnreadableObj.unreadable),
    cleanGarbageFalsePositive,
  };

  assertCondition(metrics.csExtractedPageCount === 4, 'OCR fixture content-stream page count expected 4', failures);
  assertCondition(metrics.suspectSpaceSplitDetected, '_pageSuspectSpaceSplit failed to detect split words', failures);
  assertCondition(!metrics.cleanPageFalsePositive, '_pageSuspectSpaceSplit false-positived on clean page', failures);
  assertCondition(metrics.repairedSpaceCount >= 4 && metrics.spaceSplitsRestored, '_alloRepairSpacesWithCs failed to repair split words', failures);
  assertCondition(metrics.hyphenAcrossFolioRejoined, 'cleanScannedOcrText failed to rejoin hyphenated word across folio', failures);
  assertCondition(metrics.numericDataValuePreserved, 'cleanScannedOcrText dropped numeric data line 95', failures);
  assertCondition(metrics.runningHeaderStripped && metrics.strippedEdgeLineCount >= 1 && metrics.detectedFolioCount >= 4, 'stripPageEdgeArtifacts failed to remove running headers/folios', failures);
  assertCondition(metrics.ufffdGarbageDetected && metrics.ufffdPageUnreadable, 'U+FFFD broken text layer not detected', failures);
  assertCondition(!metrics.cleanGarbageFalsePositive, '_textLayerLooksGarbage false-positived on clean page', failures);

  return { metrics, durationMs: Math.round(performance.now() - t0) };
}

/**
 * Benchmark 3: Real DOCX extractor on docx-stem-omml-comments.docx
 */
async function runDocxOmmlAndComments(rt, fixturePath, failures) {
  const t0 = performance.now();
  const base64 = fs.readFileSync(fixturePath).toString('base64');

  const defaultRes = await rt.pipeline.extractDocxTextDeterministic(base64);
  const optInRes = await rt.pipeline.extractDocxTextDeterministic(base64, { includeComments: true });

  const defaultText = String(defaultRes && defaultRes.fullText || '');
  const optInText = String(optInRes && optInRes.fullText || '');

  const metrics = {
    method: defaultRes && defaultRes.method || 'failed',
    headingExtracted: defaultText.includes('Quadratic Kinematics and Lab Protocol'),
    mergedTableExtracted: defaultText.includes('Projectile Trials Summary') && defaultText.includes('Trial Set A') && defaultText.includes('1.42'),
    extractedEquations: Number(defaultRes && defaultRes.extractedEquations || 0),
    ommlEquationRecovered: defaultText.includes('sqrt(b^(2)-4ac)') && defaultText.includes('/(2a)'),
    extractedTextboxes: Number(defaultRes && defaultRes.extractedTextboxes || 0),
    textboxRecovered: defaultText.includes('Lab Safety Callout: Wear impact goggles before launching projectiles.'),
    hasReviewerComments: Boolean(defaultRes && defaultRes.hasReviewerComments),
    defaultOmittedCommentsCount: Number(defaultRes && defaultRes.omittedCommentsCount || 0),
    commentsExcludedByDefault: !defaultText.includes('INTERNAL REVIEWER NOTE'),
    optInOmittedCommentsCount: Number(optInRes && optInRes.omittedCommentsCount || 0),
    commentsIncludedOnOptIn: optInText.includes('INTERNAL REVIEWER NOTE'),
  };

  assertCondition(metrics.method !== 'failed', 'DOCX extraction failed', failures);
  assertCondition(metrics.headingExtracted, 'DOCX heading not extracted', failures);
  assertCondition(metrics.mergedTableExtracted, 'DOCX merged table cells not extracted', failures);
  assertCondition(metrics.extractedEquations === 1 && metrics.ommlEquationRecovered, 'DOCX OMML quadratic equation not recovered', failures);
  assertCondition(metrics.extractedTextboxes === 1 && metrics.textboxRecovered, 'DOCX w:txbxContent callout not recovered', failures);
  assertCondition(metrics.hasReviewerComments && metrics.defaultOmittedCommentsCount === 1 && metrics.commentsExcludedByDefault, 'DOCX reviewer comments not excluded by default', failures);
  assertCondition(metrics.optInOmittedCommentsCount === 0 && metrics.commentsIncludedOnOptIn, 'DOCX reviewer comments not included when includeComments:true', failures);

  return { metrics, durationMs: Math.round(performance.now() - t0) };
}

/**
 * Benchmark 4: Real XLSX extractor on xlsx-merged-pipes.xlsx
 */
async function runXlsxMergedAndPipes(rt, fixturePath, failures) {
  const t0 = performance.now();
  const base64 = fs.readFileSync(fixturePath).toString('base64');

  const res = await rt.pipeline.convertXlsxToMarkdownTables(base64);
  const md = String((res && (res.text || res.markdown)) || '');
  const grids = Array.isArray(res && res.tableGrids) ? res.tableGrids : [];
  const sheet1Grid = grids[0] || { rows: [] };
  const sheet1Cells = (sheet1Grid.rows || []).flatMap((r) => (Array.isArray(r) ? r : (r && Array.isArray(r.cells) ? r.cells : [])));

  const hasColspan2 = sheet1Cells.some((c) => c.colspan === 2 && c.text === 'Experiment Group | Control');
  const hasRowspan2 = sheet1Cells.some((c) => c.rowspan === 2 && c.text === 'Cohort Alpha');
  const escapedPipeMatches = md.match(/\\\|/g) || [];
  const unescapedPipeLeak = md.includes('Experiment Group | Control') || md.includes('Pass | Verified');

  const metrics = {
    sheetCount: Number((res && (res.sheets ?? res.sheetCount)) || 0),
    tableGridCount: grids.length,
    sheetNames: grids.map((g) => g.caption),
    hasMergedColspan2: hasColspan2,
    hasMergedRowspan2: hasRowspan2,
    escapedPipeCount: escapedPipeMatches.length,
    unescapedPipeLeak,
    truncatedRows: Number((res && (res.truncatedRows ?? res.truncated)) || 0),
  };

  assertCondition(metrics.sheetCount === 2 && metrics.tableGridCount === 2, 'XLSX expected 2 sheets and 2 tableGrids', failures);
  assertCondition(metrics.hasMergedColspan2, 'XLSX horizontal merge (colspan=2) missing in tableGrids', failures);
  assertCondition(metrics.hasMergedRowspan2, 'XLSX vertical merge (rowspan=2) missing in tableGrids', failures);
  assertCondition(metrics.escapedPipeCount >= 5 && !metrics.unescapedPipeLeak, 'XLSX literal pipes not properly escaped in Markdown', failures);

  return { metrics, durationMs: Math.round(performance.now() - t0) };
}

/**
 * Benchmark 5: Real deterministic WCAG fixers + WCAG 2.2 layout probe + RTL detection
 * on html-wcag22-rtl-defects.html
 */
async function runHtmlWcag22AndRtl(rt, fixturePath, failures) {
  const t0 = performance.now();
  const rawHtml = fs.readFileSync(fixturePath, 'utf8');

  // 1. RTL detection
  const rtlInfo = rt.factory.detectRtlText(rawHtml);
  const rtlDetected = Boolean(rtlInfo && (rtlInfo.detected || rtlInfo.hasRtl));
  const rtlScripts = Array.isArray(rtlInfo && rtlInfo.scripts) ? rtlInfo.scripts : [];

  // 2. Dark-banner contrast fix via real sanitizeStyleForWCAG
  const styleRes = rt.pipeline.sanitizeStyleForWCAG(rawHtml);
  const styledHtml = styleRes && styleRes.html ? styleRes.html : rawHtml;
  const darkBannerContrastFixed = styledHtml !== rawHtml && !styledHtml.includes('background-color:#1e293b; color:#334155;');

  // 3. DPUB-ARIA role preservation + invalid role cleanup
  const roleRes = rt.runRolePass(styledHtml);
  const roleHtml = roleRes.html;
  const dpubFootnotePreserved = roleHtml.includes('role="doc-footnote"') && roleHtml.includes('role="doc-noteref"');
  const dataRolePreserved = roleHtml.includes('data-role="custom-card"');
  const invalidRoleCleaned = !roleHtml.includes('role="bogus-made-up"') && roleHtml.includes('role="contentinfo"');

  // 4. Heading skip repair (h1 -> h4 -> h6 -> h1 -> h2 -> h3)
  const headingBeforeIssue = rt.pipeline.headingOutlineIssue(roleHtml);
  const hLenient = rt.domFixers.fixHeadingHierarchy(roleHtml);
  const hStrict = rt.collapseHeadingSkipsStrict(hLenient.html);
  const headingAfterIssue = rt.pipeline.headingOutlineIssue(hStrict.html);
  const headingLevelsAfter = [...hStrict.html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));

  // 5. Duplicate ID repair (without touching data-id="sec-notes")
  const dupRes = rt.domFixers.fixDuplicateIds(hStrict.html);
  const finalHtml = dupRes.html;
  const finalDoc = new rt.win.DOMParser().parseFromString(finalHtml, 'text/html');
  const idCounts = new Map();
  for (const el of finalDoc.querySelectorAll('[id]')) {
    const id = el.getAttribute('id');
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }
  const duplicateIdsAfter = [...idCounts.values()].filter((c) => c > 1).length;
  const dataIdPreserved = finalHtml.includes('data-id="sec-notes"');

  // 6. Real _runWcag22LayoutChecks probe driven by the fixture's real CSS defect geometry
  const parsedFixture = new rt.win.DOMParser().parseFromString(rawHtml, 'text/html');
  const wideBox = parsedFixture.querySelector('.wide-reflow-box');
  const clippedPara = parsedFixture.querySelector('.clipped-spacing');
  const tinyBtn = parsedFixture.querySelector('.tiny-target');

  const styleCss = (parsedFixture.querySelector('style') && parsedFixture.querySelector('style').textContent) || '';
  const widePx = Number((/\.wide-reflow-box[^}]*width:\s*(\d+)px/i.exec(styleCss) || [])[1] || 0);
  const btnPx = Number((/\.tiny-target[^}]*width:\s*(\d+)px/i.exec(styleCss) || [])[1] || 0);
  const isOverflowHidden = /\.clipped-spacing[^}]*overflow:\s*hidden/i.test(styleCss);

  const buildLayoutFrame = ({ boxWidthPx, clipped, buttonSizePx }) => {
    const styleEl = { setAttribute() {}, textContent: '', remove() {} };
    const btnEl = {
      tagName: 'BUTTON',
      textContent: (tinyBtn && tinyBtn.textContent) || 'X',
      getAttribute: (name) => (name === 'aria-label' ? ((tinyBtn && tinyBtn.getAttribute('aria-label')) || '') : ''),
      getBoundingClientRect: () => ({ width: buttonSizePx, height: buttonSizePx }),
    };
    const paraEl = {
      tagName: 'P',
      textContent: (clippedPara && clippedPara.textContent) || 'Clipped text',
      clientHeight: 18,
      scrollHeight: clipped ? 46 : 18,
      clientWidth: 280,
      scrollWidth: 280,
    };
    const iframe = {
      style: { width: '1024px' },
      contentWindow: {
        getComputedStyle: (el) => (el === paraEl
          ? { display: 'block', visibility: 'visible', overflowY: clipped ? 'hidden' : 'visible', overflowX: 'visible' }
          : { display: 'inline-block', visibility: 'visible' }),
      },
    };
    const iframeDoc = {
      head: { appendChild() {} },
      documentElement: {
        get clientWidth() { return iframe.style.width === '320px' ? 320 : 1024; },
        get scrollWidth() { return Math.max(this.clientWidth, boxWidthPx); },
      },
      body: {
        get clientWidth() { return iframe.style.width === '320px' ? 320 : 1024; },
        get scrollWidth() { return Math.max(this.clientWidth, boxWidthPx); },
        querySelectorAll: (sel) => (sel.includes('button, input') ? [btnEl] : [paraEl]),
      },
      createElement: () => styleEl,
    };
    return { iframe, iframeDoc };
  };

  const defectFrame = buildLayoutFrame({ boxWidthPx: wideBox ? widePx : 0, clipped: isOverflowHidden, buttonSizePx: btnPx });
  const defectLayout = rt.runWcag22LayoutChecks(defectFrame.iframe, defectFrame.iframeDoc);
  const cleanFrame = buildLayoutFrame({ boxWidthPx: 300, clipped: false, buttonSizePx: 28 });
  const cleanLayout = rt.runWcag22LayoutChecks(cleanFrame.iframe, cleanFrame.iframeDoc);

  const metrics = {
    rtlDetected,
    rtlScripts,
    darkBannerContrastFixed,
    roleFixCount: roleRes.count,
    dpubFootnotePreserved,
    dataRolePreserved,
    invalidRoleCleaned,
    headingOutlineSkipBefore: Boolean(headingBeforeIssue && headingBeforeIssue.skip),
    headingOutlineSkipAfter: Boolean(headingAfterIssue && headingAfterIssue.skip),
    headingLevelsAfter,
    duplicateIdsFixedCount: dupRes.fixCount,
    duplicateIdsAfter,
    dataIdPreserved,
    wcag22DefectReflowPassed: Boolean(defectLayout.reflow320 && defectLayout.reflow320.passed),
    wcag22DefectReflowOverflowPx: Number(defectLayout.reflow320 && defectLayout.reflow320.overflowPx || 0),
    wcag22DefectTextSpacingPassed: Boolean(defectLayout.textSpacing && defectLayout.textSpacing.passed),
    wcag22DefectTextSpacingClipped: Number(defectLayout.textSpacing && defectLayout.textSpacing.clippedCount || 0),
    wcag22DefectTargetSizePassed: Boolean(defectLayout.targetSize && defectLayout.targetSize.passed),
    wcag22DefectTargetUndersized: Number(defectLayout.targetSize && defectLayout.targetSize.undersizedCount || 0),
    wcag22CleanAllPassed: Boolean(
      !cleanLayout.skipped
      && cleanLayout.reflow320.passed
      && cleanLayout.textSpacing.passed
      && cleanLayout.targetSize.passed,
    ),
  };

  assertCondition(metrics.rtlDetected && metrics.rtlScripts.includes('Arabic'), 'RTL Arabic text was not detected', failures);
  assertCondition(metrics.darkBannerContrastFixed, 'Dark banner low-contrast text was not fixed', failures);
  assertCondition(metrics.roleFixCount === 2 && metrics.dpubFootnotePreserved && metrics.dataRolePreserved && metrics.invalidRoleCleaned, 'DPUB-ARIA role preservation / invalid role cleanup failed', failures);
  assertCondition(metrics.headingOutlineSkipBefore && !metrics.headingOutlineSkipAfter, 'Heading hierarchy skip repair failed', failures);
  assertCondition(metrics.duplicateIdsFixedCount >= 1 && metrics.duplicateIdsAfter === 0 && metrics.dataIdPreserved, 'Duplicate ID repair failed or corrupted data-id', failures);
  assertCondition(!metrics.wcag22DefectReflowPassed && metrics.wcag22DefectReflowOverflowPx === 160, 'WCAG 2.2 reflow 320px probe failed to catch 480px overflow', failures);
  assertCondition(!metrics.wcag22DefectTextSpacingPassed && metrics.wcag22DefectTextSpacingClipped === 1, 'WCAG 2.2 text-spacing probe failed to catch clipped paragraph', failures);
  assertCondition(!metrics.wcag22DefectTargetSizePassed && metrics.wcag22DefectTargetUndersized === 1, 'WCAG 2.2 target-size probe failed to catch 16x16px button', failures);
  assertCondition(metrics.wcag22CleanAllPassed, 'WCAG 2.2 layout probe false-positived on clean frame', failures);

  return { metrics, durationMs: Math.round(performance.now() - t0) };
}

/**
 * Benchmark 6: Real doc_builder_renderer_module.js on blocks-stem-semantic.json
 */
async function runDocBuilderBlocks(rt, fixturePath, failures) {
  const t0 = performance.now();
  const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const renderer = rt.win.AlloModules.DocBuilderRenderer.createRenderer({
    docStyle: {
      headingColor: '#0f172a',
      textColor: '#1e293b',
      accentColor: '#2563eb',
      bgColor: '#ffffff',
      sectionBorderColor: '#cbd5e1',
      tableBg: '#1e3a8a',
      headerBg: '#1e3a8a',
    },
    _accessibleHeaderColors: () => null,
    _alloCellRichText: (value, escape) => escape(value),
    _emitAccessibleTableHtml: () => '<table></table>',
    _pipeLog: () => {},
    _sanitizeRawHtmlBlock: (html) => String(html || ''),
    _validateTableGrid: () => ({ ok: false }),
    renderWordArtHtml: (text) => '<span>' + text + '</span>',
    warnLog: () => {},
  });

  const html = renderer(payload.blocks);

  const metrics = {
    blockCount: payload.blocks.length,
    titlePrefixPreserved: html.includes('Title: The Great Gatsby'),
    descriptionPrefixPreserved: html.includes('Description: Observe the onion epidermal cells under low power magnification.'),
    leakedJsonKeyStripped: html.includes('Leaked JSON key cleaned safely') && !html.includes('"text":'),
    mathRoleRendered: html.includes('role="math"') && html.includes('aria-label="x equals negative b plus or minus the square root of b squared minus 4 a c all over 2 a"'),
    codeBlockEscaped: html.includes('<pre') && html.includes('<code>if (tempC &lt; 100 &amp;&amp; pressureAtm &gt;= 1)'),
    footnoteRendered: html.includes('<aside role="doc-footnote"') && html.includes('National Science Education Standards'),
    calloutRendered: html.includes('<aside') && html.includes('Safety Note') && html.includes('Wear splash goggles'),
  };

  assertCondition(metrics.titlePrefixPreserved, 'DocBuilderRenderer stripped natural prose "Title: ..." prefix', failures);
  assertCondition(metrics.descriptionPrefixPreserved, 'DocBuilderRenderer stripped natural prose "Description: ..." prefix', failures);
  assertCondition(metrics.leakedJsonKeyStripped, 'DocBuilderRenderer failed to strip leaked quoted JSON key', failures);
  assertCondition(metrics.mathRoleRendered, 'DocBuilderRenderer failed to render semantic math block', failures);
  assertCondition(metrics.codeBlockEscaped, 'DocBuilderRenderer failed to render escaped code block', failures);
  assertCondition(metrics.footnoteRendered, 'DocBuilderRenderer failed to render doc-footnote block', failures);
  assertCondition(metrics.calloutRendered, 'DocBuilderRenderer failed to render callout block', failures);

  return { metrics, durationMs: Math.round(performance.now() - t0) };
}

/**
 * Benchmark 7: Real view_pdf_audit_module.js (AltFormatExports) on html-tagged-pdf-and-altformats.html
 * Plus optional --mode pdfua Chromium tagged-PDF + veraPDF verification pass.
 */
async function runAltFormatExports(rt, fixturePath, mode, failures) {
  const t0 = performance.now();
  const html = fs.readFileSync(fixturePath, 'utf8');
  const alt = rt.win.AlloModules && rt.win.AlloModules.AltFormatExports;
  if (!alt) throw new Error('window.AlloModules.AltFormatExports did not register from view_pdf_audit_module.js');

  const title = 'Watershed Accessibility Report';

  // 1. EPUB3 + structural validator + OCF zip check
  const epubPkg = alt.epub(html, { title, uid: 'urn:uuid:alloflow-golden-bench-0001' });
  const epubFiles = epubPkg.files || {};
  const epubBinary = epubPkg.binaryFiles || {};
  const epubValidateMap = { ...epubFiles };
  const epubZipMap = { ...epubFiles };
  for (const [rel, b64] of Object.entries(epubBinary)) {
    epubValidateMap[rel] = true;
    epubZipMap[rel] = Buffer.from(String(b64), 'base64');
  }
  const epubValidation = alt.validateEpub(epubValidateMap);
  const epubErrors = (epubValidation.issues || []).filter((i) => i.severity === 'error');
  const contentXhtml = String(epubFiles['OEBPS/content.xhtml'] || '');
  const contentOpf = String(epubFiles['OEBPS/content.opf'] || '');
  const navXhtml = String(epubFiles['OEBPS/nav.xhtml'] || '');
  const epubZip = zipFileMap(epubZipMap, epubPkg.storeFirst || 'mimetype');
  const epubMimetypeStoredAt38 = (
    epubZip.readUInt16LE(8) === 0
    && epubZip.readUInt16LE(28) === 0
    && epubZip.subarray(38, 58).toString('latin1') === 'application/epub+zip'
  );
  const epubNavEntries = (navXhtml.match(/<a\s/g) || []).length;

  // 2. DAISY 3 package
  const daisyPkg = alt.daisy(html, { title, uid: 'urn:uuid:alloflow-golden-bench-0001' });
  const daisyFiles = daisyPkg.files || {};
  const daisyKeys = Object.keys(daisyFiles).sort();
  const daisyDtbook = String(daisyFiles['dtbook.xml'] || '');
  const daisyNcx = String(daisyFiles['navigation.ncx'] || '');
  const daisyNavPoints = (daisyNcx.match(/<navPoint\b/g) || []).length;

  // 3. BRF (ASCII Grade-1 Braille)
  const brfRes = alt.braille(html, { title });
  const brfText = String(brfRes && brfRes.brf || '');
  const brfAsciiOnly = brfText.replace(/[\x20-\x5f\r\n]/g, '') === '';
  const brfLinesOver40 = brfText.split('\r\n').filter((line) => line.length > 40).length;
  const brfHasNumber128 = brfText.includes('#ABH');

  const metrics = {
    epubValid: Boolean(epubValidation.valid),
    epubValidationErrorCount: epubErrors.length,
    epubRootXhtmlNamespaceOk: /^<\?xml[\s\S]*?<html[^>]*xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"|^<html[^>]*xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/.test(contentXhtml),
    epubOpfDeclaresSvg: /id="content"[^>]*properties="[^"]*svg/.test(contentOpf),
    epubNavEntryCount: epubNavEntries,
    epubMimetypeStoredAt38,
    daisyFileCount: daisyKeys.length,
    daisyHasRequiredFiles: JSON.stringify(daisyKeys) === JSON.stringify(['book.smil', 'dtbook.xml', 'navigation.ncx', 'package.opf']),
    daisyHasTitleAndRtl: daisyDtbook.includes('Watershed Accessibility Report') && daisyDtbook.includes('العلوم للجميع'),
    daisyNavPointCount: daisyNavPoints,
    daisyNcxHasLangEn: /xml:lang="en"/.test(daisyNcx),
    brfGrade: Number(brfRes && brfRes.grade || 0),
    brfAsciiOnly,
    brfLinesOver40,
    brfHasNumber128,
  };

  assertCondition(metrics.epubValid && metrics.epubValidationErrorCount === 0, `EPUB3 validateEpub failed: ${JSON.stringify(epubErrors)}`, failures);
  assertCondition(metrics.epubRootXhtmlNamespaceOk, 'EPUB3 content.xhtml missing root XHTML namespace', failures);
  assertCondition(metrics.epubOpfDeclaresSvg, 'EPUB3 content.opf missing svg manifest property', failures);
  assertCondition(metrics.epubNavEntryCount === 5, `EPUB3 nav expected 5 heading entries, got ${metrics.epubNavEntryCount}`, failures);
  assertCondition(metrics.epubMimetypeStoredAt38, 'EPUB3 OCF mimetype not STORED at byte 38', failures);
  assertCondition(metrics.daisyHasRequiredFiles && metrics.daisyHasTitleAndRtl && metrics.daisyNavPointCount >= 1 && metrics.daisyNcxHasLangEn, 'DAISY 3 export check failed', failures);
  assertCondition(metrics.brfGrade === 1 && metrics.brfAsciiOnly && metrics.brfLinesOver40 === 0 && metrics.brfHasNumber128, 'BRF ASCII braille export check failed', failures);

  // Optional --mode pdfua pass: Chromium renderHtmlToTaggedPdf + finalizeTaggedPdfBytes + veraPDF probe.
  let pdfua = null;
  if (mode === 'pdfua') {
    pdfua = await runOptionalPdfUaPass(html, title, failures);
  }

  return { metrics, pdfua, durationMs: Math.round(performance.now() - t0) };
}

async function runOptionalPdfUaPass(html, title, failures) {
  const t0 = performance.now();
  const mcpPdf = require(CHROMIUM_PDF_MODULE);
  const out = {
    chromiumAvailable: false,
    taggedPdfGenerated: false,
    markers: null,
    verapdf: { available: false, passed: null, detail: 'not-checked' },
    mathMlAf: null,
    durationMs: 0,
  };

  let browser = null;
  const stamp = `${process.pid}-${Date.now()}`;
  const tmpPdf = path.join(os.tmpdir(), `alloflow-golden-pdfua-${stamp}.pdf`);
  const tmpMathPdf = path.join(os.tmpdir(), `alloflow-golden-pdfua-mathml-${stamp}.pdf`);
  const runVeraPdfCheck = (pdfFilePath) => {
    const veraCode = [
      'import importlib.util, json, pathlib, sys',
      'spec = importlib.util.spec_from_file_location("ap", sys.argv[1])',
      'mod = importlib.util.module_from_spec(spec)',
      'spec.loader.exec_module(mod)',
      'cap = mod.verapdf_capability()',
      'res = {"available": bool(cap.get("available")), "detail": cap.get("reason") or cap.get("validator") or ""}',
      'if res["available"]:',
      '  v = mod.validate_pdf_ua(pathlib.Path(sys.argv[2]))',
      '  res["status"] = v.get("status")',
      '  res["passed"] = bool(v.get("status") == "completed" and v.get("compliant") is True)',
      '  res["passed_rules"] = v.get("passedRules")',
      '  res["failed_rule_count"] = v.get("failedRuleCount")',
      '  res["failed_rules"] = v.get("failedRules") or []',
      '  if v.get("reason"):',
      '    res["detail"] = v.get("reason")',
      'print(json.dumps(res))',
    ].join('\n');
    const veraRun = spawnSync(PYTHON, ['-c', veraCode, PORTABLE_ENGINE, pdfFilePath], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 180000,
    });
    if (!veraRun.error && veraRun.status === 0 && veraRun.stdout.trim()) {
      return JSON.parse(veraRun.stdout);
    }
    return {
      available: false,
      passed: null,
      detail: String((veraRun.error && veraRun.error.message) || veraRun.stderr || `exit ${veraRun.status}`).trim(),
    };
  };

  try {
    const playwright = require('playwright');
    browser = await playwright.chromium.launch({ headless: true });
    out.chromiumAvailable = true;
    const rendered = await mcpPdf.renderHtmlToTaggedPdf(browser, html, {
      title,
      lang: 'en',
      pdfuaId: 1,
    });
    const finalBytes = rendered && rendered.bytes ? rendered.bytes : rendered;
    out.taggedPdfGenerated = Buffer.isBuffer(finalBytes) && finalBytes.length > 500;
    out.markers = (rendered && rendered.structuralMarkers) || mcpPdf.structuralMarkersFromBuffer(finalBytes);
    assertCondition(out.taggedPdfGenerated, 'pdfua mode failed to generate tagged PDF bytes', failures);
    assertCondition(
      Boolean(out.markers && out.markers.structTreeRoot && out.markers.markInfo && out.markers.marked),
      'pdfua tagged PDF missing /StructTreeRoot, /MarkInfo, or /Marked true',
      failures,
    );

    // Check veraPDF capability honestly via alloflow_portable.py without failing if Java/veraPDF is absent.
    fs.writeFileSync(tmpPdf, finalBytes);
    out.verapdf = runVeraPdfCheck(tmpPdf);
    if (out.verapdf.available) {
      assertCondition(
        out.verapdf.passed === true,
        `veraPDF PDF/UA-1 failed (${out.verapdf.detail || out.verapdf.status}): ${JSON.stringify(out.verapdf.failed_rules)}`,
        failures,
      );
    }

    // Wave 10B: PDF/UA-2 MathML Associated Files (/AF) + PDF/UA-1 round-trip verification.
    const mathHtml = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head><meta charset="utf-8"><title>Golden MathML Associated Files Check</title></head>',
      '<body>',
      '  <main>',
      '    <h1>Quadratic Formula Reference</h1>',
      '    <p>Solutions to a quadratic equation are given by:</p>',
      '    <math display="block" alttext="x equals negative b plus or minus the square root of b squared minus 4 a c over 2 a" xmlns="http://www.w3.org/1998/Math/MathML">',
      '      <mi>x</mi><mo>=</mo>',
      '      <mfrac>',
      '        <mrow><mo>-</mo><mi>b</mi><mo>&#x00B1;</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow>',
      '        <mrow><mn>2</mn><mi>a</mi></mrow>',
      '      </mfrac>',
      '    </math>',
      '  </main>',
      '</body>',
      '</html>',
    ].join('\n');
    const mathRendered = await mcpPdf.renderHtmlToTaggedPdf(browser, mathHtml, {
      title: 'Golden MathML Associated Files Check',
      lang: 'en',
      pdfuaId: 1,
    });
    const mathBytes = mathRendered && mathRendered.bytes ? mathRendered.bytes : null;
    const mathText = Buffer.isBuffer(mathBytes) ? mathBytes.toString('latin1') : '';
    const mathMlAfAttached = Number(mathRendered && mathRendered.pdfUaFinalization && mathRendered.pdfUaFinalization.mathMlAfAttached || 0);
    const hasEmbeddedMathMlBytes = (
      mathText.includes('/Subtype /application#2Fmathml+xml')
      && mathText.includes('/Type /Filespec')
      && mathText.includes('/AFRelationship /Supplement')
      && mathText.includes('/S /Formula')
      && mathText.includes('/AF [')
      && /<math\b[^>]*xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/.test(mathText)
      && mathText.includes('<mfrac>')
    );
    let mathVerapdf = { available: false, passed: null, detail: 'not-checked' };
    if (Buffer.isBuffer(mathBytes) && mathBytes.length > 500) {
      fs.writeFileSync(tmpMathPdf, mathBytes);
      mathVerapdf = runVeraPdfCheck(tmpMathPdf);
    }
    out.mathMlAf = {
      mathMlAfAttached,
      hasEmbeddedMathMlBytes,
      verapdf: mathVerapdf,
    };
    assertCondition(mathMlAfAttached >= 1, `pdfua MathML /AF expected mathMlAfAttached >= 1, got ${mathMlAfAttached}`, failures);
    assertCondition(hasEmbeddedMathMlBytes, 'pdfua MathML /AF PDF missing embedded MathML XML stream or /Formula /AF linkage', failures);
    if (mathVerapdf.available) {
      assertCondition(
        mathVerapdf.passed === true && mathVerapdf.failed_rule_count === 0,
        `veraPDF PDF/UA-1 failed on MathML /AF PDF (${mathVerapdf.detail || mathVerapdf.status}): ${JSON.stringify(mathVerapdf.failed_rules)}`,
        failures,
      );
    }
  } catch (err) {
    out.error = String(err && err.message || err);
    failures.push(`pdfua mode error: ${out.error}`);
  } finally {
    if (browser) { try { await browser.close(); } catch (_) {} }
    try { fs.unlinkSync(tmpPdf); } catch (_) {}
    try { fs.unlinkSync(tmpMathPdf); } catch (_) {}
    out.durationMs = Math.round(performance.now() - t0);
  }
  return out;
}

/**
 * Run the complete golden benchmark suite.
 * @param {{ mode?: 'offline'|'pdfua', fixturesDir?: string }} [options]
 */
async function runGoldenBenchmark(options = {}) {
  const mode = options.mode === 'pdfua' ? 'pdfua' : 'offline';
  const totalStart = performance.now();
  const ownedTmpDir = !options.fixturesDir;
  const fixturesDir = options.fixturesDir
    ? path.resolve(options.fixturesDir)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-golden-bench-'));

  const failures = [];
  let rt = null;
  try {
    const materialized = materializeGoldenFixtures(fixturesDir);
    rt = createOfflineRuntime();

    const s1 = await runPortableAndStage4Pdf(rt, materialized.fixtures['pdf-out-of-order-formxobj.pdf'].path, failures);
    const s2 = await runOcrAndSpaceSplit(rt, materialized.fixtures['pdf-ocr-space-split.pdf'].path, failures);
    const s3 = await runDocxOmmlAndComments(rt, materialized.fixtures['docx-stem-omml-comments.docx'].path, failures);
    const s4 = await runXlsxMergedAndPipes(rt, materialized.fixtures['xlsx-merged-pipes.xlsx'].path, failures);
    const s5 = await runHtmlWcag22AndRtl(rt, materialized.fixtures['html-wcag22-rtl-defects.html'].path, failures);
    const s6 = await runDocBuilderBlocks(rt, materialized.fixtures['blocks-stem-semantic.json'].path, failures);
    const s7 = await runAltFormatExports(rt, materialized.fixtures['html-tagged-pdf-and-altformats.html'].path, mode, failures);

    const fixtureSummary = {};
    for (const id of FIXTURE_IDS) {
      fixtureSummary[id] = {
        bytes: materialized.fixtures[id].bytes,
        sha256: materialized.fixtures[id].sha256,
      };
    }

    const report = {
      schemaVersion: 1,
      mode,
      passed: failures.length === 0,
      failures,
      fixtures: fixtureSummary,
      metrics: {
        portableAndStage4Pdf: s1.metrics,
        ocrAndSpaceSplit: s2.metrics,
        docxOmmlAndComments: s3.metrics,
        xlsxMergedAndPipes: s4.metrics,
        htmlWcag22AndRtl: s5.metrics,
        docBuilderBlocks: s6.metrics,
        altFormatExports: s7.metrics,
      },
      timingsMs: {
        portableAndStage4Pdf: s1.durationMs,
        ocrAndSpaceSplit: s2.durationMs,
        docxOmmlAndComments: s3.durationMs,
        xlsxMergedAndPipes: s4.durationMs,
        htmlWcag22AndRtl: s5.durationMs,
        docBuilderBlocks: s6.durationMs,
        altFormatExports: s7.durationMs,
      },
      totalDurationMs: Math.round(performance.now() - totalStart),
    };
    if (s7.pdfua) report.pdfua = s7.pdfua;
    return report;
  } finally {
    if (rt) rt.close();
    if (ownedTmpDir) {
      try { fs.rmSync(fixturesDir, { recursive: true, force: true }); } catch (_) {}
    }
  }
}

function buildBaselineFromReport(report) {
  return {
    schemaVersion: 1,
    mode: 'offline',
    fixtures: report.fixtures,
    invariants: report.metrics,
  };
}

/**
 * Strictly compare a benchmark report against a golden baseline.
 * Timings are informational only; all fixture hashes and quality invariants
 * are strictly enforced so any regression fails closed.
 */
function compareAgainstGolden(report, baseline) {
  const regressions = [];
  let checkedCount = 0;

  if (!baseline || baseline.schemaVersion !== 1) {
    return {
      ok: false,
      checkedCount: 0,
      regressions: ['Golden baseline is missing or has unsupported schemaVersion (expected 1).'],
    };
  }
  if (!report || report.passed !== true || (Array.isArray(report.failures) && report.failures.length > 0)) {
    regressions.push(`Benchmark run reported internal invariant failures: ${JSON.stringify(report && report.failures)}`);
  }

  // 1. Verify deterministic fixture SHA-256 hashes & byte sizes
  for (const [id, expected] of Object.entries(baseline.fixtures || {})) {
    checkedCount += 1;
    const actual = report && report.fixtures && report.fixtures[id];
    if (!actual) {
      regressions.push(`Missing fixture in run report: ${id}`);
      continue;
    }
    if (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) {
      regressions.push(`Fixture drift for ${id}: expected ${expected.bytes}B/${expected.sha256.slice(0, 12)}, got ${actual.bytes}B/${String(actual.sha256).slice(0, 12)}`);
    }
  }

  // 2. Strictly verify every quality invariant across all 7 benchmark sections
  for (const [section, expectedMetrics] of Object.entries(baseline.invariants || {})) {
    const actualSection = report && report.metrics && report.metrics[section];
    if (!actualSection) {
      regressions.push(`Missing benchmark section: ${section}`);
      continue;
    }
    for (const [key, expectedVal] of Object.entries(expectedMetrics)) {
      checkedCount += 1;
      const actualVal = actualSection[key];
      if (JSON.stringify(actualVal) !== JSON.stringify(expectedVal)) {
        regressions.push(`Regression in ${section}.${key}: expected ${JSON.stringify(expectedVal)}, got ${JSON.stringify(actualVal)}`);
      }
    }
  }

  return {
    ok: regressions.length === 0,
    checkedCount,
    regressions,
  };
}

function parseCliArgs(argv) {
  const opts = {
    mode: 'offline',
    updateGolden: false,
    jsonPath: null,
    baselinePath: DEFAULT_BASELINE_PATH,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      opts.mode = argv[++i];
    } else if (arg.startsWith('--mode=')) {
      opts.mode = arg.slice('--mode='.length);
    } else if (arg === '--update-golden') {
      opts.updateGolden = true;
    } else if (arg === '--json' && argv[i + 1]) {
      opts.jsonPath = path.resolve(argv[++i]);
    } else if (arg.startsWith('--json=')) {
      opts.jsonPath = path.resolve(arg.slice('--json='.length));
    } else if (arg === '--baseline' && argv[i + 1]) {
      opts.baselinePath = path.resolve(argv[++i]);
    }
  }
  return opts;
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  const report = await runGoldenBenchmark({ mode: opts.mode });

  let comparison = null;
  if (opts.updateGolden) {
    if (!report.passed) {
      console.error('[golden-benchmark] Refusing to update baseline while invariants fail:', report.failures);
      process.exitCode = 1;
      return;
    }
    const baseline = buildBaselineFromReport(report);
    fs.mkdirSync(path.dirname(opts.baselinePath), { recursive: true });
    fs.writeFileSync(opts.baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
    console.log(`[golden-benchmark] Updated golden baseline: ${path.relative(ROOT, opts.baselinePath)} (${Object.keys(baseline.invariants).length} suites, ${report.totalDurationMs}ms)`);
  } else {
    if (!fs.existsSync(opts.baselinePath)) {
      console.error(`[golden-benchmark] Baseline not found at ${opts.baselinePath}. Run with --update-golden first.`);
      process.exitCode = 1;
      return;
    }
    const baseline = JSON.parse(fs.readFileSync(opts.baselinePath, 'utf8'));
    comparison = compareAgainstGolden(report, baseline);
    if (!comparison.ok) {
      console.error(`[golden-benchmark] FAILED (${comparison.regressions.length} regressions):`);
      for (const r of comparison.regressions) console.error('  - ' + r);
      process.exitCode = 1;
    } else {
      console.log(
        `[golden-benchmark] PASS mode=${report.mode} invariants=${comparison.checkedCount} regressions=0 total=${report.totalDurationMs}ms `
        + `(pdf=${report.timingsMs.portableAndStage4Pdf}ms ocr=${report.timingsMs.ocrAndSpaceSplit}ms docx=${report.timingsMs.docxOmmlAndComments}ms `
        + `xlsx=${report.timingsMs.xlsxMergedAndPipes}ms wcag22=${report.timingsMs.htmlWcag22AndRtl}ms blocks=${report.timingsMs.docBuilderBlocks}ms alt=${report.timingsMs.altFormatExports}ms)`,
      );
    }
  }

  if (opts.jsonPath) {
    fs.mkdirSync(path.dirname(opts.jsonPath), { recursive: true });
    fs.writeFileSync(opts.jsonPath, JSON.stringify({ report, comparison }, null, 2) + '\n', 'utf8');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[golden-benchmark] Fatal error:', err && err.stack || err);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_BASELINE_PATH,
  buildBaselineFromReport,
  compareAgainstGolden,
  runGoldenBenchmark,
};
