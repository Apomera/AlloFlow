#!/usr/bin/env node
// dev-tools/demo/exported_pdf_validator.cjs
//
// Post-export validator for AlloFlow-remediated tagged PDFs. Takes a single
// PDF file path on the command line, parses it with pdf-lib, walks the
// StructTreeRoot, and emits a structured report covering the WCAG-relevant
// properties that PAC 2024 / Adobe Accessibility Checker / a Knowbility-grade
// reviewer would check.
//
// This is NOT a PDF/UA-1 validator — that requires Acrobat Pro or PAC 2024.
// It IS the cheap automated gate Aaron can run against every demo PDF to
// confirm the export survived its trip through the pipeline with structure
// intact, BEFORE handing it to Garry's reviewer.
//
// Usage:
//   node dev-tools/demo/exported_pdf_validator.cjs <path-to-tagged.pdf>
//   node dev-tools/demo/exported_pdf_validator.cjs --json <path>      # JSON only
//   node dev-tools/demo/exported_pdf_validator.cjs --batch <dir>      # all *.pdf in dir
//
// Requires pdf-lib (installs to C:/tmp/node_modules if not found globally).

'use strict';

const fs = require('fs');
const path = require('path');

// ── pdf-lib loader (same fallback chain as dev-tools/debug/tag_tree_repro.cjs) ──
let pdfLib;
const candidates = [
  'C:/tmp/node_modules/pdf-lib',
  path.join(__dirname, '..', '..', 'node_modules', 'pdf-lib'),
  'pdf-lib',
];
for (const p of candidates) {
  try { pdfLib = require(p); break; } catch (_) {}
}
if (!pdfLib) {
  console.error('[validator] pdf-lib not found. Install with: cd C:/tmp && npm install pdf-lib@1.17.1 --no-save');
  process.exit(2);
}
const { PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber, PDFRef, PDFString } = pdfLib;

// ── Constants ──
const LEAF_ROLES = ['H1','H2','H3','H4','H5','H6','P','Figure','Caption','BlockQuote','Lbl','LBody','TH','TD','Span','Link'];
const CONTAINER_ROLES = ['Document', 'Part', 'Article', 'Sect', 'Section', 'Div', 'NonStruct', 'Private', 'Table', 'TR', 'TBody', 'THead', 'TFoot', 'L', 'LI'];

// ── Walk the StructTreeRoot once, collecting per-element facts ──
function walkStructTree(stRoot, ctx) {
  const nm = (n) => PDFName.of(n);
  const resolve = (o) => (o instanceof PDFRef ? ctx.lookup(o) : o);
  const elems = [];

  const walk = (objIn, depth) => {
    let obj = resolve(objIn);
    if (depth > 60 || obj == null) return;
    if (obj instanceof PDFArray) {
      for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1);
      return;
    }
    if (!(obj instanceof PDFDict)) return;
    const S = obj.get(nm('S'));
    if (!S) {
      // Untyped node — recurse into K if present
      const k0 = obj.get(nm('K'));
      if (k0 != null) walk(k0, depth + 1);
      return;
    }
    const role = String(S).replace(/^\//, '');
    const K = obj.get(nm('K'));
    let hasContent = false, hasChild = false;
    if (K != null) {
      const kr = resolve(K);
      const items = (kr instanceof PDFArray)
        ? Array.from({ length: kr.size() }, (_, i) => resolve(kr.get(i)))
        : [kr];
      for (const it of items) {
        if (it instanceof PDFNumber) hasContent = true;
        else if (it instanceof PDFDict) {
          const t = it.get(nm('Type'));
          const ts = t ? String(t) : '';
          if (ts === '/MCR' || ts === '/OBJR') hasContent = true;
          else if (it.get(nm('S'))) hasChild = true;
          else hasContent = true;
        }
      }
    }
    elems.push({
      role,
      hasK: K != null,
      hasContent,
      hasChild,
      hasAlt: !!obj.get(nm('Alt')),
      hasActualText: !!obj.get(nm('ActualText')),
      hasA: !!obj.get(nm('A')),
      hasLang: !!obj.get(nm('Lang')),
      hasID: !!obj.get(nm('ID')),
    });
    if (K != null) walk(K, depth + 1);
  };

  const rootK = stRoot && stRoot.get ? stRoot.get(nm('K')) : null;
  if (rootK != null) walk(rootK, 0);
  return elems;
}

// ── The actual validator ──
async function validatePdf(filepath) {
  const bytes = fs.readFileSync(filepath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const ctx = doc.context;
  const catalog = doc.catalog;
  const nm = (n) => PDFName.of(n);
  const resolve = (o) => (o instanceof PDFRef ? ctx.lookup(o) : o);

  // Catalog-level invariants
  const stRoot = resolve(catalog.get(nm('StructTreeRoot')));
  const markInfo = resolve(catalog.get(nm('MarkInfo')));
  const markedRaw = markInfo && markInfo.get ? markInfo.get(nm('Marked')) : null;
  const langRaw = catalog.get(nm('Lang'));
  const pages = doc.getPages();

  // Walk the structure tree
  const elems = stRoot ? walkStructTree(stRoot, ctx) : [];
  const leaves = elems.filter(e => LEAF_ROLES.includes(e.role));
  const containers = elems.filter(e => CONTAINER_ROLES.includes(e.role));
  const orphanedLeaves = leaves.filter(e => !e.hasContent);

  const byRole = {};
  for (const e of elems) byRole[e.role] = (byRole[e.role] || 0) + 1;

  // Table/cell facts (PDF/UA-1 §7.5)
  const thElems = elems.filter(e => e.role === 'TH');
  const cellElems = elems.filter(e => e.role === 'TH' || e.role === 'TD');
  const figures = elems.filter(e => e.role === 'Figure');

  // Per-section checks
  const checks = [];
  const passOrFail = (rule, ok, detail) => checks.push({ rule, status: ok ? 'pass' : 'fail', detail: detail || '' });

  passOrFail('StructTreeRoot present', !!stRoot);
  passOrFail('MarkInfo /Marked true', String(markedRaw) === 'true');
  passOrFail('Primary language set (/Lang)', !!langRaw, langRaw ? String(langRaw) : '');
  passOrFail('Structure tree has content (rootK not null)', elems.length > 0, elems.length + ' elements');
  passOrFail('At least one heading present', elems.some(e => /^H[1-6]$/.test(e.role)));
  passOrFail('Every TH has /Scope', thElems.length === 0 || thElems.every(e => e.hasA), thElems.length + ' TH cells');
  passOrFail('Every TH/TD has /ActualText', cellElems.length === 0 || cellElems.every(e => e.hasActualText), cellElems.length + ' cells');
  passOrFail('Every Figure has /Alt', figures.length === 0 || figures.every(e => e.hasAlt), figures.length + ' figures');

  // Content linkage (PAC 2024's "orphaned semantic elements" check)
  const orphanedRoles = orphanedLeaves.map(e => e.role);
  passOrFail('No orphaned semantic leaves (all leaves have /K → MCR/MCID)',
    orphanedLeaves.length === 0,
    orphanedLeaves.length + '/' + leaves.length + ' orphaned: ' + JSON.stringify(orphanedRoles));

  // Tally pass/fail
  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  return {
    file: path.basename(filepath),
    fullPath: filepath,
    byteLength: bytes.length,
    pageCount: pages.length,
    catalogChecks: {
      hasStructTreeRoot: !!stRoot,
      marked: String(markedRaw),
      lang: langRaw ? String(langRaw) : null,
    },
    structureTally: {
      totalStructElems: elems.length,
      leafCount: leaves.length,
      containerCount: containers.length,
      orphanedLeafCount: orphanedLeaves.length,
      orphanedRoles,
      byRole,
    },
    cellChecks: {
      thCount: thElems.length,
      thWithScope: thElems.filter(e => e.hasA).length,
      cellCount: cellElems.length,
      cellsWithActualText: cellElems.filter(e => e.hasActualText).length,
      figureCount: figures.length,
      figuresWithAlt: figures.filter(e => e.hasAlt).length,
    },
    checks,
    summary: {
      pass: passCount,
      fail: failCount,
      overall: failCount === 0 ? 'PASS' : 'FAIL',
    },
  };
}

// ── Pretty-printer for terminal output ──
function renderReport(r) {
  const lines = [];
  const pad = (s, n) => (s + ' '.repeat(Math.max(0, n - s.length)));
  lines.push('');
  lines.push('═'.repeat(72));
  lines.push('  ' + r.file);
  lines.push('═'.repeat(72));
  lines.push('  Pages:        ' + r.pageCount + '   ·   Bytes: ' + (r.byteLength / 1024).toFixed(1) + ' KB');
  lines.push('  StructElems:  ' + r.structureTally.totalStructElems +
             ' (' + r.structureTally.leafCount + ' leaves, ' + r.structureTally.containerCount + ' containers)');
  lines.push('  By role:      ' + Object.entries(r.structureTally.byRole).map(([k, v]) => k + '×' + v).join(' '));
  lines.push('');
  for (const c of r.checks) {
    const mark = c.status === 'pass' ? '✓' : '✗';
    lines.push('  ' + mark + ' ' + pad(c.rule, 56) + (c.detail ? ' (' + c.detail + ')' : ''));
  }
  lines.push('');
  lines.push('  ' + r.summary.overall + '   (' + r.summary.pass + ' pass, ' + r.summary.fail + ' fail)');
  lines.push('═'.repeat(72));
  return lines.join('\n');
}

// ── CLI ──
async function main() {
  const args = process.argv.slice(2);
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
    const all = fs.readdirSync(batchDir).filter(f => /\.pdf$/i.test(f)).map(f => path.join(batchDir, f));
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
      if (r.summary.overall === 'FAIL') anyFail = true;
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
                reports.filter(r => r.summary.overall === 'PASS').length + ' PASS, ' +
                reports.filter(r => r.summary.overall === 'FAIL').length + ' FAIL, ' +
                reports.filter(r => r.summary.overall === 'ERROR').length + ' ERROR');
  }
  process.exit(anyFail ? 1 : 0);
}

main().catch(e => { console.error('[validator] FATAL:', e.stack || e.message); process.exit(2); });
