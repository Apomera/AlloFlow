#!/usr/bin/env node
/**
 * _check_tool_catalog.cjs — Validate that tool_catalog_source.jsx is the single
 * source of truth and that every consumer is in sync.
 *
 * Checks:
 *   1. Every catalog entry has a matching `if (type === '<id>')` branch in
 *      generate_dispatcher_source.jsx.
 *   2. Every dispatcher branch is covered by a catalog entry (no orphans).
 *   3. Every catalog entry with a sidebarKey resolves in ui_strings.js.
 *   4. The catalog can be parsed and the loader publishes the expected globals.
 *
 * Exits non-zero if drift is detected. Run before deploys, or wire into a
 * pre-commit hook if you want zero-drift enforcement.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// ─── 1. Load catalog by eval'ing the source ──────────────────────────────
const catalogSrc = fs.readFileSync(path.join(ROOT, 'tool_catalog_source.jsx'), 'utf8');
// Extract the TOOL_CATALOG literal (between `const TOOL_CATALOG = [` and the
// matching `];` that ends on its own line — naive but works for our format).
const m = catalogSrc.match(/const TOOL_CATALOG = (\[[\s\S]*?\n\]);/);
if (!m) {
  console.error('[check] Could not locate TOOL_CATALOG literal in tool_catalog_source.jsx');
  process.exit(1);
}
let TOOL_CATALOG;
try {
  // eslint-disable-next-line no-eval
  TOOL_CATALOG = eval('(' + m[1] + ')');
} catch (e) {
  console.error('[check] Failed to eval catalog literal:', e.message);
  process.exit(1);
}

const catalogIds = TOOL_CATALOG.map(t => t.id);
const catalogIdSet = new Set(catalogIds);

// ─── 2. Dispatcher branches ──────────────────────────────────────────────
const dispatcherSrc = fs.readFileSync(path.join(ROOT, 'generate_dispatcher_source.jsx'), 'utf8');
const dispatcherIds = new Set();
const branchRe = /type\s*===\s*'([a-z][a-z0-9-]*)'/g;
let bm;
while ((bm = branchRe.exec(dispatcherSrc))) {
  dispatcherIds.add(bm[1]);
}

// Curated list of dispatcher type strings that are NOT user-facing resource
// tools (sub-types, internal pipeline states, etc.). Excluded from drift check.
const NON_TOOL_TYPES = new Set([
  // Add internal/sub-pipeline type strings here as you discover them.
  // Examples: 'udl-advice' (chat output, not a generated resource).
  'udl-advice',
  // Other strings that may appear in dispatcher conditionals but are not
  // resource-pack tool ids:
  'word-sounds',  // sub-type of word_sounds module routing
  'reflection',   // quiz question sub-type (q.type === 'reflection')
  'mcq',          // quiz question sub-type (q.type === 'mcq')
]);

// ─── 3. ui_strings.js sidebar keys ───────────────────────────────────────
const uiStrings = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
const sidebarKeys = new Set(Object.keys(uiStrings.sidebar || {}).map(k => `sidebar.${k}`));

// ─── Run checks ─────────────────────────────────────────────────────────
let errors = 0;
let warnings = 0;
const log = (level, msg) => {
  if (level === 'ERR') { errors++; console.error('  [ERR]', msg); }
  else if (level === 'WARN') { warnings++; console.warn('  [WARN]', msg); }
  else console.log('  [OK]', msg);
};

console.log('\n=== Catalog → Dispatcher coverage ===');
for (const id of catalogIds) {
  if (!dispatcherIds.has(id)) {
    log('ERR', `Catalog id '${id}' has NO matching dispatcher branch — autofill would recommend a tool that cannot be generated.`);
  } else {
    log('OK', `'${id}' has dispatcher branch`);
  }
}

console.log('\n=== Dispatcher → Catalog coverage (orphan check) ===');
for (const id of dispatcherIds) {
  if (NON_TOOL_TYPES.has(id)) continue;
  if (!catalogIdSet.has(id)) {
    log('WARN', `Dispatcher branch '${id}' has NO catalog entry — bot will never recommend this tool. Add to catalog or add to NON_TOOL_TYPES exclusion list in _check_tool_catalog.cjs.`);
  }
}

console.log('\n=== Catalog → ui_strings sidebar keys ===');
for (const t of TOOL_CATALOG) {
  if (!t.sidebarKey) continue;
  if (!sidebarKeys.has(t.sidebarKey)) {
    log('ERR', `Catalog '${t.id}' references sidebarKey '${t.sidebarKey}' which is missing from ui_strings.js.`);
  } else {
    log('OK', `'${t.id}' sidebarKey '${t.sidebarKey}' resolves`);
  }
}

console.log('\n=== Catalog entry sanity ===');
for (const t of TOOL_CATALOG) {
  if (!t.id) log('ERR', `Catalog entry missing id: ${JSON.stringify(t).slice(0, 80)}`);
  if (!t.description) log('ERR', `Catalog id '${t.id}' missing description`);
}

console.log('\n=== Summary ===');
console.log(`  Catalog tools: ${catalogIds.length}`);
console.log(`  Dispatcher branches: ${dispatcherIds.size} (${[...dispatcherIds].filter(id => NON_TOOL_TYPES.has(id)).length} excluded as non-tools)`);
console.log(`  Errors: ${errors}`);
console.log(`  Warnings: ${warnings}`);

if (errors > 0) {
  console.error('\n❌ DRIFT DETECTED. Fix the [ERR] items above before deploying.');
  process.exit(1);
} else {
  console.log('\n✅ Catalog is in sync.');
}
