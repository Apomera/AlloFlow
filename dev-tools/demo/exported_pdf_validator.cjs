#!/usr/bin/env node
// dev-tools/demo/exported_pdf_validator.cjs
//
// Post-export validator for AlloFlow-remediated tagged PDFs. Takes a single
// PDF file path on the command line, parses it with pdf-lib, and delegates
// directly to the unified byte-level validator core in
// view_pdf_validator_module.js so browser and CLI run ONE shared rule set
// with zero drift across all PDF/UA-1 structural assertions, including:
//   - StructTreeRoot has /ParentTree
//   - Pages with annotations set /Tabs /S (PDF/UA 7.18.3)
//   - XMP metadata stream present (/Metadata, PDF/UA 7.1)
//   - XMP dc:title non-empty (PDF/UA 7.1)
//   - Link annotations /Contents + /StructParent, table/list containment,
//     /Scope on TH, embedded fonts (including Form XObjects & Type0),
//     evidence-backed PDF/UA XMP declaration, and advisory reading notes.
//
// This is NOT a full PDF/UA-1 validator — pair it with veraPDF (Java) via
// dev-tools/demo/verapdf_check.cjs for content-stream operator verification.
//
// Usage:
//   node dev-tools/demo/exported_pdf_validator.cjs <path-to-tagged.pdf>
//   node dev-tools/demo/exported_pdf_validator.cjs --json <path>      # JSON only
//   node dev-tools/demo/exported_pdf_validator.cjs --batch <dir>      # all *.pdf in dir

'use strict';

const fs = require('fs');
const path = require('path');

// ── pdf-lib loader (prefers vendored copy, then local node_modules, then C:/tmp) ──
let pdfLib;
const candidates = [
  path.join(__dirname, '..', '..', 'desktop', 'mcp', 'vendor', 'pdf-lib.min.js'),
  path.join(__dirname, '..', '..', 'node_modules', 'pdf-lib'),
  'pdf-lib',
  'C:/tmp/node_modules/pdf-lib',
];
for (const p of candidates) {
  try { pdfLib = require(p); break; } catch (_) {}
}
if (!pdfLib) {
  console.error('[validator] pdf-lib not found. Install with: cd C:/tmp && npm install pdf-lib@1.17.1 --no-save');
  if (require.main === module) process.exit(2);
}

// ── Unified core validator (shared with in-Canvas browser runtime) ──
const CORE_VALIDATOR = require(path.join(__dirname, '..', '..', 'view_pdf_validator_module.js'));

async function validatePdfBytes(bytes, options) {
  const opts = Object.assign({ pdfLib }, options || {});
  return CORE_VALIDATOR.validateExportedPdfBytes(bytes, opts);
}

async function validatePdf(filepath, options) {
  const bytes = fs.readFileSync(filepath);
  const report = await validatePdfBytes(bytes, options);
  return Object.assign(
    {
      file: path.basename(filepath),
      fullPath: filepath,
    },
    report
  );
}

// ── Pretty-printer for terminal output ──
function renderReport(r) {
  const lines = [];
  const pad = (s, n) => (s + ' '.repeat(Math.max(0, n - s.length)));
  lines.push('');
  lines.push('═'.repeat(72));
  lines.push('  ' + (r.file || '(bytes)'));
  lines.push('═'.repeat(72));
  if (r.error) {
    lines.push('  ✗ ERROR: ' + r.error);
    lines.push('═'.repeat(72));
    return lines.join('\n');
  }
  lines.push('  Pages:        ' + r.pageCount + '   ·   Bytes: ' + (r.byteLength / 1024).toFixed(1) + ' KB');
  lines.push('  StructElems:  ' + r.structureTally.totalStructElems +
             ' (' + r.structureTally.leafCount + ' leaves, ' + r.structureTally.containerCount + ' containers)');
  lines.push('  By role:      ' + Object.entries(r.structureTally.byRole).map(([k, v]) => k + '×' + v).join(' '));
  lines.push('');
  for (const c of r.checks) {
    const mark = c.status === 'pass' ? '✓' : (c.status === 'warn' ? '⚠' : '✗');
    lines.push('  ' + mark + ' ' + pad(c.rule, 56) + (c.detail ? ' (' + c.detail + ')' : ''));
  }
  lines.push('');
  lines.push('  ' + r.summary.overall + '   (' + r.summary.pass + ' pass, ' + r.summary.fail + ' fail)');
  lines.push('═'.repeat(72));
  return lines.join('\n');
}

// ── CLI ──
async function main(argv) {
  const args = Array.isArray(argv) ? argv : process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log('Usage: node dev-tools/demo/exported_pdf_validator.cjs [--json] [--batch <dir>] <file.pdf>');
    process.exit(1);
  }

  let jsonOnly = false;
  let batchDir = null;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') jsonOnly = true;
    else if (args[i] === '--batch') { batchDir = args[++i]; }
    else files.push(args[i]);
  }
  if (batchDir) {
    const all = fs.readdirSync(batchDir).filter((f) => /\.pdf$/i.test(f)).map((f) => path.join(batchDir, f));
    files.push(...all);
  }
  if (files.length === 0) {
    console.error('[validator] no PDF files to validate');
    process.exit(1);
  }

  const reports = [];
  let anyFail = false;
  for (const f of files) {
    try {
      const r = await validatePdf(f);
      reports.push(r);
      if (!r.summary || r.summary.overall !== 'PASS') anyFail = true;
      if (!jsonOnly) console.log(renderReport(r));
    } catch (e) {
      const r = { file: path.basename(f), fullPath: f, error: e.message, summary: { overall: 'ERROR', pass: 0, fail: 0 } };
      reports.push(r);
      anyFail = true;
      if (!jsonOnly) console.log('\n  ✗ ' + r.file + ' — error: ' + e.message);
    }
  }
  if (jsonOnly) {
    console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
  } else {
    console.log('');
    console.log('  Summary: ' + reports.length + ' file(s), ' +
                reports.filter((r) => r.summary && r.summary.overall === 'PASS').length + ' PASS, ' +
                reports.filter((r) => r.summary && r.summary.overall === 'FAIL').length + ' FAIL, ' +
                reports.filter((r) => !r.summary || r.summary.overall === 'ERROR').length + ' ERROR');
  }
  process.exit(anyFail ? 1 : 0);
}

module.exports = {
  validatePdf,
  validatePdfBytes,
  validatePdfStructure: validatePdfBytes,
  validateExportedPdfBytes: validatePdfBytes,
  renderReport,
  main,
  CORE_VALIDATOR,
};

if (require.main === module) {
  main().catch((e) => { console.error('[validator] FATAL:', e.stack || e.message); process.exit(2); });
}
