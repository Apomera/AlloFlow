#!/usr/bin/env node
/*
 * mcp_capability_inventory.cjs — how much of the pipeline does the MCP connector actually expose?
 *
 *   node dev-tools/mcp_capability_inventory.cjs [--json out.json]
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
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const Driver = require(path.join(REPO, 'desktop/mcp/remediation_headless_driver.cjs'));
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

  const report = {
    factoryFunctions: fns.length, reachedByConnector: reached.size, mcpTools: tools.length,
    bootModules: Driver.MODULE_FILES, shippedAssets: BUNDLE_ASSETS,
    capabilities, outOfBundleFormats: formats,
    gaps: gaps.map((g) => g.capability),
    note: 'bootModules are loaded for every pipeline run; shippedAssets is the complete connector bundle asset set. A capability that is in the pipeline but not reached is a candidate MCP tool.',
  };
  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), 'utf8'); console.log('\nrecord: ' + jsonOut); }
})().catch((e) => { console.error('FAILED: ' + ((e && e.message) || e)); process.exit(1); });
