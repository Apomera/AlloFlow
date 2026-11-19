#!/usr/bin/env node
/*
 * mcp_capability_inventory.cjs — how much of the pipeline does the MCP connector actually expose?
 *
 *   node dev-tools/mcp_capability_inventory.cjs [--json out.json] [--assert-parity]
 *
 * WHY: the app is "nearly any input, nearly any accessible output." The connector advertises
 * PDF/DOCX/PPTX in, HTML + tagged PDF out. If an agent is meant to reach the pipeline THROUGH
 * the connector, the difference between those two surfaces is the set of things the agent will
 * silently fail to offer — and nothing in the tool descriptions tells it where the edge is.
 *
 * Three questions, answered from the code rather than from memory:
 *   1. What can the pipeline actually do?      -> boot it in Chromium, enumerate the factory
 *   2. What does the connector reach?          -> scan the server + driver for call sites
 *   3. What does the connector even SHIP?      -> MODULE_FILES vs where capabilities live
 *
 * (3) is the one that bites: a capability implemented in a module the bundle omits is not
 * "unexposed", it is unreachable, and adding a tool for it would not work.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');

const REPO = path.resolve(__dirname, '..');
const Driver = require(path.join(REPO, 'desktop/mcp/remediation_headless_driver.cjs'));
const { makeZip } = require(path.join(REPO, 'desktop/mcp/zip_writer.cjs'));
const SERVER_SRC = fs.readFileSync(path.join(REPO, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
const DRIVER_SRC = fs.readFileSync(path.join(REPO, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');

// Capabilities worth naming in a report, grouped the way a user would ask for them. Anything the
// factory exposes that isn't listed here still shows up in the raw counts; this is the editorial
// layer that turns ~90 function names into "can it do X?".
const CAPABILITY_MAP = [
  ['Audit a document', ['runPdfAccessibilityAudit', 'auditOutputAccessibility', 'runAxeAudit', 'runEqualAccessAudit']],
  ['Remediate to accessible HTML', ['fixAndVerifyPdf', 'runAutonomousRemediation', 'aiFixChunked', 'remediateSurgicallyThenAI']],
  ['Tagged PDF export', ['createTaggedPdf', 'createTypesetTaggedPdf', 'downloadAccessiblePdf']],
  ['Batch a folder', ['runPdfBatchRemediation', 'downloadBatchResults']],
  ['Conformance reports', ['generateAccessibilityReportHtml', 'generateAuditReportHtml']],
  ['Audio / video input (transcripts)', ['transcribeMediaToPayload']],
  ['XLSX / spreadsheet input', ['convertXlsxToMarkdownTables']],
  ['Office text extraction', ['extractDocxTextDeterministic', 'extractPptxTextDeterministic']],
  ['Translate the accessible output', ['translateAccessibleHtml']],
  ['Plain-language simplification', ['simplifyAccessibleHtml']],
  ['PII redaction', ['redactDocument', 'redactDocHtml', 'redactionLeaks']],
  ['Fillable form fields', ['detectFormBlanks', 'applyFormBlanks', 'overlayPdfFormFields', 'detectPdfBlankFields', 'extractPdfFormFieldsDeterministic']],
  ['Image alt text / classification', ['describeAndClassifyImages', 'visionAltSpotCheck']],
  ['Contrast repair', ['fixContrastViolations', 'fixAxeContrastViolationsTargeted', 'contrastFixPair', 'sanitizeStyleForWCAG']],
  ['Resource / pack HTML generation', ['generateFullPackHTML', 'generateResourceHTML']],
  ['Preview + expert commands', ['getPdfPreviewHtml', 'updatePdfPreview', 'processExpertCommand']],
];

// These functions are an interactive editing SESSION, not a document transformation surface.
// They remain in the report as an explicit design decision, but do not make the transport parity
// gate fail. Every other present capability is required once --assert-parity is requested.
const SESSION_ONLY_CAPABILITIES = new Set(['Preview + expert commands']);

// Formats implemented OUTSIDE the three modules the bundle ships. Grep-verified per format so the
// claim "the connector cannot do this" is evidence, not assumption.
// The third column, `builder`, names the key on window.AlloModules.AltFormatExports that makes the
// format callable headlessly. Null means the format has no published builder — either it does not
// need one (ODT goes out through AccessibleOfficeExport) or nothing has extracted it yet.
const OUT_OF_BUNDLE_FORMATS = [
  ['ePub 3 export', /epub/i, 'epub'],
  ['DAISY export', /daisy/i, 'daisy'],
  ['ODT export', /\bodt\b/i, null],
  ['Braille / BRF', /\bbrf\b|braille/i, 'braille'],
];

const argv = process.argv.slice(2);
const jsonOut = (() => { const i = argv.indexOf('--json'); return i === -1 ? null : argv[i + 1]; })();
const assertParity = argv.includes('--assert-parity');
const runRuntimeProbes = !argv.includes('--no-runtime-probes') && (assertParity || argv.includes('--runtime-probes'));

const PROBE_PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const PROBE_HTML = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Parity Probe</title></head>'
  + '<body><main><h1 id="top">Parity Probe</h1><p>Offline smoke test for 2026 accessibility exports.</p>'
  + '<table><caption>Summary</caption><thead><tr><th scope="col">Metric</th><th scope="col">Value</th></tr></thead>'
  + '<tbody><tr><th scope="row">Score</th><td>100</td></tr></tbody></table></main></body></html>';

async function runOfflineSmokeProbes() {
  const results = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-mcp-parity-probe-'));
  const prevOfflineAssets = process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
  delete process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
  const driver = Driver.createDriver({ onLog: () => {} });
  const runProbe = async (name, fn) => {
    const t0 = performance.now();
    try {
      const detail = await fn();
      results.push({ name, ok: true, elapsedMs: Math.round(performance.now() - t0), detail });
    } catch (err) {
      results.push({ name, ok: false, elapsedMs: Math.round(performance.now() - t0), error: String((err && err.message) || err).slice(0, 400) });
    }
  };
  try {
    await runProbe('readDocBase64-input-families', async () => {
      const minimalZip = makeZip([{ name: 'doc.xml', data: '<doc/>' }]);
      const validFiles = [
        ['sample.pdf', Buffer.from('%PDF-1.4\n%%EOF\n', 'latin1')],
        ['sample.docx', minimalZip],
        ['sample.xlsx', minimalZip],
        ['sample.png', PROBE_PNG_1X1],
        ['sample.jpg', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])],
        ['sample.md', Buffer.from('# Heading\nBody text\n', 'utf8')],
        ['sample.csv', Buffer.from('a,b\n1,2\n', 'utf8')],
      ];
      for (const [name, bytes] of validFiles) {
        const filePath = path.join(tmp, name);
        fs.writeFileSync(filePath, bytes);
        const b64 = driver._readDocBase64(filePath);
        if (!b64 || !Buffer.from(b64, 'base64').equals(bytes)) {
          throw new Error('readDocBase64 round-trip mismatch for ' + name);
        }
      }
      const badExe = path.join(tmp, 'disallowed.exe');
      fs.writeFileSync(badExe, Buffer.from('MZ\x90\x00', 'latin1'));
      let exeRejected = false;
      try { driver._readDocBase64(badExe); } catch (_) { exeRejected = true; }
      if (!exeRejected) throw new Error('readDocBase64 accepted disallowed .exe extension');

      const badPng = path.join(tmp, 'corrupt.png');
      fs.writeFileSync(badPng, Buffer.from('not-a-png', 'utf8'));
      let pngRejected = false;
      try { driver._readDocBase64(badPng); } catch (_) { pngRejected = true; }
      if (!pngRejected) throw new Error('readDocBase64 accepted corrupt .png magic');
      return validFiles.length + ' families accepted, 2 invalid inputs rejected';
    });

    await runProbe('offline-exportAltFormat', async () => {
      const epub = await driver.exportAltFormat({ html: PROBE_HTML, title: 'Parity Probe', format: 'epub' });
      const epubBuf = Buffer.from(epub.b64 || '', 'base64');
      if (!epub.valid || epubBuf.slice(38, 58).toString('latin1') !== 'application/epub+zip') {
        throw new Error('EPUB offline probe failed structural/mimetype check');
      }
      const daisy = await driver.exportAltFormat({ html: PROBE_HTML, title: 'Parity Probe', format: 'daisy' });
      if (!Array.isArray(daisy.entries) || !daisy.entries.includes('dtbook.xml') || !daisy.entries.includes('package.opf')) {
        throw new Error('DAISY offline probe missing required package entries');
      }
      const brf = await driver.exportAltFormat({ html: PROBE_HTML, title: 'Parity Probe', format: 'brf' });
      const brfText = Buffer.from(brf.b64 || '', 'base64').toString('ascii');
      if (!brfText.trim() || brfText.replace(/[\x20-\x5f\r\n]/g, '') !== '') {
        throw new Error('BRF offline probe emitted non-ASCII-braille bytes');
      }
      return 'epub=' + epubBuf.length + 'B, daisy=' + daisy.bytes + 'B, brf=' + brf.bytes + 'B';
    });

    await runProbe('offline-exportAccessibleOffice', async () => {
      const docx = await driver.exportAccessibleOffice({ html: PROBE_HTML, title: 'Parity Probe', format: 'docx' });
      const docxBuf = Buffer.from(docx.b64 || '', 'base64');
      if (docxBuf.length < 100 || docxBuf[0] !== 0x50 || docxBuf[1] !== 0x4B || !docxBuf.includes(Buffer.from('word/document.xml'))) {
        throw new Error('DOCX offline probe did not return a valid OOXML ZIP');
      }
      const odt = await driver.exportAccessibleOffice({ html: PROBE_HTML, title: 'Parity Probe', format: 'odt' });
      const odtBuf = Buffer.from(odt.b64 || '', 'base64');
      if (odtBuf.length < 100 || odtBuf[0] !== 0x50 || odtBuf[1] !== 0x4B || !odtBuf.includes(Buffer.from('content.xml'))) {
        throw new Error('ODT offline probe did not return a valid OpenDocument ZIP');
      }
      return 'docx=' + docxBuf.length + 'B, odt=' + odtBuf.length + 'B';
    });

    await runProbe('offline-accessibleHtml-and-auditHtml', async () => {
      const outline = await driver.accessibleHtmlTool({ mode: 'outline', html: PROBE_HTML, payload: { maxItems: 50 } });
      if (!outline || !Array.isArray(outline.items) || !outline.items.some((it) => it.kind === 'heading')) {
        throw new Error('accessibleHtmlTool outline probe returned no heading item');
      }
      const audited = await driver.auditHtml({ html: PROBE_HTML, fileName: 'probe.html', includeAi: false });
      const doneStatuses = new Set(['passed', 'failed', 'review-required', 'completed']);
      const axeOk = !!(audited && audited.checks && audited.checks.axe && doneStatuses.has(audited.checks.axe.status) && typeof audited.axeViolations === 'number');
      const eaOk = !!(audited && audited.checks && audited.checks.equalAccess && doneStatuses.has(audited.checks.equalAccess.status) && typeof audited.equalAccessFailures === 'number');
      if (!axeOk || !eaOk) {
        throw new Error('auditHtml offline probe incomplete (axe=' + (audited?.checks?.axe?.status || 'missing') + ', equalAccess=' + (audited?.checks?.equalAccess?.status || 'missing') + ')');
      }
      return 'outline=' + outline.items.length + ' items, axeViolations=' + audited.axeViolations + ', eaFailures=' + audited.equalAccessFailures;
    });
  } finally {
    if (prevOfflineAssets === undefined) delete process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
    else process.env.ALLOFLOW_MCP_OFFLINE_ASSETS = prevOfflineAssets;
    try { await driver.close(); } catch (_) {}
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  }
  return results;
}

async function factorySurface() {
  const chrome = Driver.resolveChromium();
  if (!chrome.installed) throw new Error('Chromium not installed — npx playwright install chromium');
  const browser = await chrome.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    for (const m of Driver.MODULE_FILES) await page.addScriptTag({ path: path.join(Driver.ASSETS_ROOT, m) });
    await page.waitForFunction(() => !!(window.AlloModules && window.AlloModules.createDocPipeline), null, { timeout: 30000 });
    return await page.evaluate(() => {
      const boom = async () => { throw new Error('inventory: no model calls here'); };
      const p = window.AlloModules.createDocPipeline({
        callGemini: boom, callGeminiVision: boom, callImagen: async () => null,
        addToast: () => {}, t: (k) => k, isRtlLang: () => false,
        updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
      });
      return Object.keys(p).filter((k) => typeof p[k] === 'function').sort();
    });
  } finally { try { await browser.close(); } catch (_) {} }
}

function connectorReaches(fnNames) {
  const both = SERVER_SRC + '\n' + DRIVER_SRC;
  // Inside page.evaluate the pipeline is routinely aliased (`const p = window.__mcpPipeline`) and
  // called as `p.someFn(...)`. Matching only the canonical receivers missed every aliased call and
  // under-reported real coverage — the inventory was wrong about work that was already done, which
  // is the same class of error as over-reporting. Collect the aliases and accept them too.
  const aliases = new Set(['__mcpPipeline', '__agentPipeline', 'pipeline']);
  for (const m of both.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*window\.__(?:mcp|agent)Pipeline\b/g)) aliases.add(m[1]);
  const receiver = '(?:' + [...aliases].map((a) => a.replace(/\$/g, '\\$')).join('|') + '|getDriver\\(\\))';
  const reached = new Set();
  for (const fn of fnNames) {
    if (new RegExp(receiver + '\\s*\\.\\s*' + fn + '\\b').test(both)) reached.add(fn);
  }
  // The connector's folder jobs deliberately orchestrate the canonical per-document audit and
  // remediation adapters instead of calling the app's UI-coupled FileList/download helpers. That
  // is capability parity, not a second remediation implementation; count it explicitly so the
  // inventory does not recommend a redundant batch tool.
  if (/name:\s*'pdf_batch_(?:audit|remediate)_start'/.test(SERVER_SRC)) {
    reached.add('runPdfBatchRemediation');
    reached.add('downloadBatchResults');
  }
  return reached;
}

function serverToolNames() {
  return [...SERVER_SRC.matchAll(/^\s*name:\s*'([a-z0-9_]+)',/gm)].map((m) => m[1]);
}

// What the MCPB BUNDLE ships is not the same list as what the driver boots. MODULE_FILES is the
// pipeline-boot set; ASSET_FILES is what a packaged install actually contains. A view module can
// legitimately be bundled-but-not-booted (loaded on demand, as the Office export is), so reading
// MODULE_FILES here would under-report what an installed connector can reach.
const BUNDLE_ASSETS = (() => {
  const src = fs.readFileSync(path.join(REPO, 'desktop/mcp/build_mcpb.cjs'), 'utf8');
  const m = src.match(/const ASSET_FILES = \[([^\]]*)\]/);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
})();

// Shipping a module is necessary but not sufficient. A format whose generation lives INSIDE the
// PdfAuditView React component as a download handler is present in the bundle and still not
// callable without rendering the view — a third state, and collapsing it into "shipped" would
// overstate what the connector can do.
//
// ePub 3, DAISY and Braille WERE in that state. Their generation was extracted to module scope on
// 2026-07-29 and published as window.AlloModules.AltFormatExports, so they are now reachable
// through export_alt_format. This regex is kept, empty of matches by design: it is the mechanism
// that catches the next format that gets written into a handler, and deleting it would remove the
// only thing that distinguishes "shipped" from "callable".
const REACT_TRAPPED = /^(?!)/;

// A format is only genuinely reachable if the builder is PUBLISHED, not merely present. This is
// what the earlier inventory could not see: it read the bundle list and concluded a format was
// available while the code sat unreachable inside a component.
const PUBLISHED_BUILDERS = (() => {
  const src = fs.readFileSync(path.join(REPO, '_build_view_pdf_audit_module.js'), 'utf8');
  const m = src.match(/window\.AlloModules\.AltFormatExports\s*=\s*\{([\s\S]*?)\}/);
  return m ? [...m[1].matchAll(/^\s*(\w+)\s*:/gm)].map((x) => x[1]) : [];
})();

function moduleHomeFor(pattern) {
  const candidates = fs.readdirSync(REPO).filter((f) => /_module\.js$/.test(f));
  const hits = [];
  for (const f of candidates) {
    let txt;
    try { txt = fs.readFileSync(path.join(REPO, f), 'utf8'); } catch (_) { continue; }
    const n = (txt.match(new RegExp(pattern.source, 'gi')) || []).length;
    if (n >= 5) hits.push({ module: f, mentions: n, shipped: BUNDLE_ASSETS.includes(f) });
  }
  return hits.sort((a, b) => b.mentions - a.mentions);
}

(async () => {
  const fns = await factorySurface();
  const reached = connectorReaches(fns);
  const tools = serverToolNames();

  const capabilities = CAPABILITY_MAP.map(([label, members]) => {
    const present = members.filter((m) => fns.includes(m));
    const wired = present.filter((m) => reached.has(m));
    return {
      capability: label,
      inPipeline: present.length > 0,
      reachedByConnector: wired.length > 0,
      functions: present,
      wiredFunctions: wired,
    };
  });

  const formats = OUT_OF_BUNDLE_FORMATS.map(([label, re, builder]) => {
    const homes = moduleHomeFor(re);
    const shipped = homes.some((h) => h.shipped);
    const trapped = REACT_TRAPPED.test(label);
    // A named builder that is not published is the trapped case wearing a disguise: the code
    // exists, the module ships, and calling it still fails. Treat it as unreachable.
    const published = builder ? PUBLISHED_BUILDERS.includes(builder) : true;
    return {
      format: label,
      implementedIn: homes.map((h) => h.module),
      shippedWithConnector: shipped,
      publishedBuilder: builder || null,
      callable: shipped && !trapped && published,
      state: !shipped ? 'not shipped'
        : (trapped ? 'shipped but trapped in the React view'
          : (!published ? 'shipped, builder exists but is not published on window' : 'reachable')),
    };
  });

  const gaps = capabilities.filter((c) => c.inPipeline && !c.reachedByConnector);
  const pad = (s, n) => String(s).padEnd(n);

  console.log('\n═══ MCP connector vs the pipeline it fronts ═══\n');
  console.log('pipeline functions exposed by the factory : ' + fns.length);
  console.log('of those, reached by the connector        : ' + reached.size);
  console.log('MCP tools advertised                      : ' + tools.length);
  console.log('pipeline boot modules                     : ' + Driver.MODULE_FILES.join(', '));
  console.log('complete bundle asset set                 : ' + BUNDLE_ASSETS.join(', '));
  console.log('');
  console.log(pad('CAPABILITY', 38) + pad('IN PIPELINE', 13) + 'REACHED BY MCP');
  console.log('-'.repeat(72));
  for (const c of capabilities) {
    console.log(pad(c.capability, 38) + pad(c.inPipeline ? 'yes' : 'no', 13) + (c.reachedByConnector ? 'yes' : (c.inPipeline ? 'NO  <-- gap' : '-')));
  }

  console.log('\n── Alternative export formats ──');
  for (const f of formats) {
    const tag = f.callable ? '[REACHABLE' + (f.publishedBuilder ? ' via AltFormatExports.' + f.publishedBuilder : '') + ']'
      : (f.shippedWithConnector ? '[shipped, but the generator is not callable — extract/publish it at source]'
        : '[NOT SHIPPED — unreachable; adding a tool would not help]');
    console.log('  ' + pad(f.format, 18) + tag);
  }
  console.log('  bundle ships: ' + BUNDLE_ASSETS.join(', '));

  console.log('\n── Gaps, in priority order ──');
  gaps.forEach((g, i) => console.log('  ' + (i + 1) + '. ' + g.capability + '  (' + g.functions.join(', ') + ')'));
  if (!gaps.length) console.log('  none');

  const runtimeProbes = runRuntimeProbes ? await runOfflineSmokeProbes() : [];
  if (runtimeProbes.length) {
    console.log('\n── Offline runtime smoke probes ──');
    for (const p of runtimeProbes) {
      console.log('  [' + (p.ok ? 'PASS' : 'FAIL') + '] ' + p.name + ' (' + p.elapsedMs + 'ms)' + (p.ok ? ' — ' + p.detail : ' — ' + p.error));
    }
  }
  const failedProbes = runtimeProbes.filter((p) => !p.ok);

  const parityRegressions = gaps.filter((g) => !SESSION_ONLY_CAPABILITIES.has(g.capability));
  const report = {
    factoryFunctions: fns.length, reachedByConnector: reached.size, mcpTools: tools.length,
    bootModules: Driver.MODULE_FILES, shippedAssets: BUNDLE_ASSETS,
    capabilities, outOfBundleFormats: formats,
    gaps: gaps.map((g) => g.capability),
    parityRegressions: parityRegressions.map((g) => g.capability),
    ...(runtimeProbes.length ? { runtimeProbes } : {}),
    note: 'bootModules are loaded for every pipeline run; shippedAssets is the complete connector bundle asset set. A capability that is in the pipeline but not reached is a candidate MCP tool.',
  };
  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), 'utf8'); console.log('\nrecord: ' + jsonOut); }
  if (assertParity) {
    if (parityRegressions.length) {
      throw new Error('MCP capability parity regressed: ' + parityRegressions.map((g) => g.capability).join(', '));
    }
    if (failedProbes.length) {
      throw new Error('MCP offline runtime probe(s) failed: ' + failedProbes.map((p) => p.name + ' (' + p.error + ')').join('; '));
    }
    console.log('\nPARITY GATE: PASS (' + (capabilities.length - SESSION_ONLY_CAPABILITIES.size) + ' transport-capable areas reached; ' + runtimeProbes.length + ' offline runtime probes passed; session-only UI commands excluded explicitly)');
  }
})().catch((e) => { console.error('FAILED: ' + ((e && e.message) || e)); process.exit(1); });
