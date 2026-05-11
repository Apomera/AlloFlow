#!/usr/bin/env node
// check_stem_tile_catalog.cjs — Verify every stem_tool_*.js registerTool('id')
// has a matching tile catalog entry in stem_lab_module.js
//
// Why this exists:
//   STEM Lab tools become visible to users via TWO independent registrations:
//     1. window.StemLab.registerTool('id', { render, ... })   ← in stem_tool_*.js
//     2. { id: 'id', icon, label, desc, color, ready }        ← in stem_lab_module.js _allStemTools array
//
//   If (1) exists but (2) does not, the tool is fully wired but invisible —
//   no tile in the STEM Lab modal means students/teachers can't launch it.
//
//   BirdLab shipped this way on May 10 2026: 9,717 lines of working tool,
//   registered via registerTool, but no entry in the tile catalog. Memory:
//   project_birdlab.md "Visibility fix May 10 2026: missing tile entry in
//   stem_lab_module.js. New STEM tools need BOTH registerTool + tile-catalog entry."
//
//   The reverse case (catalog entry but no registerTool) is also checked —
//   that would render a tile that throws on click.
//
// Usage:
//   node dev-tools/check_stem_tile_catalog.cjs
//   node dev-tools/check_stem_tile_catalog.cjs --verbose   (list every tool ID with status)
//   node dev-tools/check_stem_tile_catalog.cjs --quiet     (silent unless failures)
//
// Exit codes:
//   0 — every registerTool id has a tile, every tile has a registerTool
//   1 — orphans found (either direction)
//   2 — usage / file not found

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STEM_DIR = path.join(ROOT, 'stem_lab');
const CATALOG_FILE = path.join(STEM_DIR, 'stem_lab_module.js');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

function log(s) { if (!QUIET) console.log(s); }

// ──────────────────────────────────────────────────────────────────────────
// Step 1: collect every registerTool('id', ...) id from stem_tool_*.js
// ──────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(STEM_DIR)) {
  console.error('stem_lab/ directory not found at: ' + STEM_DIR);
  process.exit(2);
}

const toolFiles = fs.readdirSync(STEM_DIR)
  .filter(f => /^stem_tool_.*\.js$/.test(f))
  .sort();

const registeredIds = new Map(); // id → file

for (const f of toolFiles) {
  const src = fs.readFileSync(path.join(STEM_DIR, f), 'utf8');
  // Match window.StemLab.registerTool('id', { ... })
  const re = /window\.StemLab\.registerTool\s*\(\s*['"]([a-zA-Z][a-zA-Z0-9_$]*)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = m[1];
    if (registeredIds.has(id)) {
      // duplicate id across files — also a bug, but flag separately
      log('  ⚠ Duplicate registerTool id "' + id + '" in ' + f + ' (also in ' + registeredIds.get(id) + ')');
    }
    registeredIds.set(id, f);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Step 2: collect every catalog entry { id: '…', … } from stem_lab_module.js
//
// The catalog is `var _allStemTools = [ {…}, {…}, … ]`. Each entry has
// shape `{ id: 'foo', icon: '…', label: '…', … }`. We scan for object
// literals containing an `id: 'string'` property. To avoid false matches
// in unrelated code, we restrict the search to a region bounded by the
// _allStemTools opening bracket and its closing bracket.
// ──────────────────────────────────────────────────────────────────────────
const catalogSrc = fs.readFileSync(CATALOG_FILE, 'utf8');

// Find `var _allStemTools = [` (the declaration, not other refs).
const declRe = /(?:var|let|const)\s+_allStemTools\s*=\s*\[/;
const declMatch = declRe.exec(catalogSrc);
if (!declMatch) {
  console.error('Could not locate `var _allStemTools = [` declaration in ' + CATALOG_FILE);
  process.exit(2);
}
// bracketStart points at the `[` itself
const bracketStart = declMatch.index + declMatch[0].length - 1;
// Bracket-match to find the closing ]
let depth = 0, bracketEnd = -1, inStr = null;
for (let i = bracketStart; i < catalogSrc.length; i++) {
  const c = catalogSrc[i];
  if (inStr) {
    if (c === '\\') { i++; continue; }
    if (c === inStr) inStr = null;
    continue;
  }
  if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
  if (c === '[') depth++;
  else if (c === ']') {
    depth--;
    if (depth === 0) { bracketEnd = i; break; }
  }
}
if (bracketEnd < 0) {
  console.error('Could not bracket-match closing ] for _allStemTools');
  process.exit(2);
}
const catalogRegion = catalogSrc.slice(bracketStart, bracketEnd + 1);

// Extract id values, excluding category headers (id starts with '_cat_')
const catalogIds = new Map(); // id → line number in catalog file
const idRe = /\bid:\s*['"]([a-zA-Z_][a-zA-Z0-9_$]*)['"]/g;
let cm;
while ((cm = idRe.exec(catalogRegion)) !== null) {
  const id = cm[1];
  if (id.startsWith('_cat_')) continue; // category section headers, not tools
  // Calculate line number in original file
  const absPos = bracketStart + cm.index;
  const line = catalogSrc.slice(0, absPos).split('\n').length;
  if (catalogIds.has(id)) {
    log('  ⚠ Duplicate catalog id "' + id + '" at line ' + line + ' (first at line ' + catalogIds.get(id) + ')');
    // keep first
  } else {
    catalogIds.set(id, line);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Step 3: diff the two sets
// ──────────────────────────────────────────────────────────────────────────
const registeredButNotInCatalog = [];
for (const [id, file] of registeredIds) {
  if (!catalogIds.has(id)) registeredButNotInCatalog.push({ id, file });
}
const inCatalogButNotRegistered = [];
for (const [id, line] of catalogIds) {
  if (!registeredIds.has(id)) inCatalogButNotRegistered.push({ id, line });
}

// ──────────────────────────────────────────────────────────────────────────
// Step 4: report
// ──────────────────────────────────────────────────────────────────────────
log('');
log('STEM Lab tile catalog audit');
log('───────────────────────────');
log('  registerTool ids found:  ' + registeredIds.size + ' (across ' + toolFiles.length + ' stem_tool_*.js files)');
log('  catalog tile ids found:  ' + catalogIds.size);
log('');

if (VERBOSE) {
  const allIds = new Set([...registeredIds.keys(), ...catalogIds.keys()]);
  for (const id of [...allIds].sort()) {
    const reg = registeredIds.has(id) ? '✓' : '✗';
    const cat = catalogIds.has(id) ? '✓' : '✗';
    log('  ' + reg + ' registerTool   ' + cat + ' catalog   ' + id);
  }
  log('');
}

let fail = false;
if (registeredButNotInCatalog.length > 0) {
  fail = true;
  log('  ✗ ' + registeredButNotInCatalog.length + ' tool(s) registered but INVISIBLE (no catalog tile):');
  for (const { id, file } of registeredButNotInCatalog) {
    log('     - "' + id + '"  (from ' + file + ')');
  }
  log('');
  log('     Fix: add a catalog entry to _allStemTools in stem_lab/stem_lab_module.js:');
  log('     { id: \'<id>\', icon: \'<emoji>\', label: \'<Display Name>\', desc: \'<one-line desc>\', color: \'<tw color>\', ready: true }');
  log('');
}
if (inCatalogButNotRegistered.length > 0) {
  fail = true;
  log('  ✗ ' + inCatalogButNotRegistered.length + ' tile(s) in catalog but UNRENDERED (no registerTool):');
  for (const { id, line } of inCatalogButNotRegistered) {
    log('     - "' + id + '"  (catalog line ' + line + ')');
  }
  log('');
  log('     Fix: either remove the catalog entry, or create stem_lab/stem_tool_<id>.js');
  log('     that calls window.StemLab.registerTool(\'<id>\', { render, ... }).');
  log('');
}

if (!fail) {
  log('  ✅ All ' + registeredIds.size + ' registered tools have catalog tiles. All ' + catalogIds.size + ' tiles have registered handlers.');
  log('');
}

process.exit(fail ? 1 : 0);
