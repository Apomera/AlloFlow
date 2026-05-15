#!/usr/bin/env node
// check_main_placeholder.cjs — Verify every loadModule URL using `@main`
// has a corresponding entry in build.js MODULES.
//
// Why this exists:
//   Memory: feedback_extraction_register_in_build_js.md
//
//   Extraction scripts hardcode `@main` as the version placeholder in
//   newly-added loadModule URLs:
//     loadModule('NewThing', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/new_thing_module.js');
//
//   `build.js --mode=prod` rewrites `@main` to the current git hash, but
//   ONLY for modules registered in its MODULES array. If the new module
//   isn't in MODULES, the @main URL ships to production unchanged.
//
//   What goes wrong with @main in prod:
//   - jsdelivr resolves @main to the LATEST commit on main (not the
//     deployed commit), so future commits silently change what
//     production serves
//   - cache invalidation becomes inconsistent across CDN edges
//   - rollbacks don't actually roll back this module
//
//   Concrete past incidents: AdventureSessionHandlers + TextUtilityHelpers
//   shipped with `@MAIN` until caught at runtime via console error.
//
// What this check does:
//   1. Find every `loadModule('Name', 'https://...@main/...')` in AlloFlowANTI.txt
//   2. Find every entry in build.js MODULES array
//   3. Flag any loadModule using @main that's missing from MODULES
//
// Usage:
//   node dev-tools/check_main_placeholder.cjs
//   node dev-tools/check_main_placeholder.cjs --verbose
//
// Exit codes:
//   0 — every @main loadModule has a build.js MODULES entry
//   1 — at least one @main loadModule missing from MODULES (will ship to prod broken)
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');
const BUILD = path.join(ROOT, 'build.js');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

if (!fs.existsSync(HOST) || !fs.existsSync(BUILD)) {
  console.error('Required file not found (AlloFlowANTI.txt and build.js)');
  process.exit(2);
}

const hostSrc = fs.readFileSync(HOST, 'utf-8');
const buildSrc = fs.readFileSync(BUILD, 'utf-8');

// Step 1: Collect every loadModule using @main
const mainLoads = [];
const loadRe = /loadModule\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*@main\/[^'"]+)['"]\s*\)/g;
let m;
while ((m = loadRe.exec(hostSrc)) !== null) {
  const name = m[1];
  const url = m[2];
  const line = hostSrc.substring(0, m.index).split('\n').length;
  mainLoads.push({ name, url, line });
}

// Step 2: Collect every name in build.js MODULES array
const modulesNames = new Set();
const moduleRe = /name\s*:\s*['"]([^'"]+)['"]\s*,\s*filename\s*:/g;
while ((m = moduleRe.exec(buildSrc)) !== null) {
  modulesNames.add(m[1]);
}

// Step 3: Cross-reference
const missing = mainLoads.filter(l => !modulesNames.has(l.name));
const ok = mainLoads.filter(l => modulesNames.has(l.name));

// Also collect loadModules using @hash (for context in the report)
const hashLoadCount = (hostSrc.match(/loadModule\([^)]*@[a-f0-9]+\/[^)]+\)/g) || []).length;

if (!QUIET || missing.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   @main URL Placeholder Check                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  loadModule calls using @main:  ' + mainLoads.length);
  console.log('  loadModule calls using @hash:  ' + hashLoadCount + ' (already-built form)');
  console.log('  build.js MODULES array entries: ' + modulesNames.size);
  console.log('');
  console.log('  Note: @main is fine in dev (jsdelivr serves latest), but every prod build');
  console.log('  rewrites @main → @<hash> ONLY for names in build.js MODULES. If a name is');
  console.log('  missing from MODULES, the @main URL ships to prod unchanged — bad for');
  console.log('  reproducibility (future commits change what prod serves).');
  console.log('');
}

if (missing.length > 0) {
  console.log('═══ ✗ @main URL with NO build.js MODULES entry (' + missing.length + ') — will ship to prod ═══');
  console.log('');
  for (const m of missing) {
    console.log('  ✗ loadModule(\'' + m.name + '\', ...) at AlloFlowANTI.txt:' + m.line);
    console.log('      URL: ' + m.url);
    console.log('      Fix: add to build.js MODULES array:');
    console.log('        { name: \'' + m.name + '\', filename: \'' + (m.url.split('/').pop()) + '\', cdnBase: \'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow\' }');
    console.log('');
  }
}

if (VERBOSE && ok.length > 0) {
  console.log('═══ ✓ @main URLs with MODULES entries (' + ok.length + ') ═══');
  for (const o of ok.slice(0, 30)) {
    console.log('  ✓ ' + o.name);
  }
  if (ok.length > 30) console.log('  (... ' + (ok.length - 30) + ' more)');
  console.log('');
}

console.log('  ' + (missing.length === 0 ? '✅' : '❌') + ' ' + ok.length + ' / ' + mainLoads.length + ' @main loadModules have MODULES entries.');
console.log('');

process.exit(missing.length > 0 ? 1 : 0);
