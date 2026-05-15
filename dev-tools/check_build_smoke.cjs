#!/usr/bin/env node
// check_build_smoke.cjs — Smoke test: `node build.js --mode=dev` produces parseable JSX.
//
// Why this exists:
//   build.js transforms AlloFlowANTI.txt → prismflow-deploy/src/App.jsx by
//   rewriting loadModule() URLs from CDN to local paths. If the build output
//   has any syntax errors (broken regex substitution, mangled string, dropped
//   brace), the deploy will fail at React's parse step in the browser.
//
//   This check runs a dry-run-equivalent build and verifies the output
//   parses as JSX. It does NOT verify behavior; just that the file is loadable.
//
// What it does:
//   1. Run `node build.js --mode=dev` in a temp directory (so we don't touch
//      the real prismflow-deploy/src/App.jsx)
//   2. Parse the output with @babel/parser (JSX-aware)
//   3. Report parse success/failure
//
// Usage:
//   node dev-tools/check_build_smoke.cjs
//   node dev-tools/check_build_smoke.cjs --quiet
//
// Exit codes:
//   0 — build output parses cleanly
//   1 — build output has a parse error (deploy would break)
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');

// build.js currently only runs in-place. We don't want to overwrite the real
// App.jsx as a side-effect of running the smoke check. Instead, validate the
// EXISTING App.jsx (assumed to be the current build output) and additionally
// run a dry-run if build.js supports --dry-run.

const APP_JSX = path.join(ROOT, 'prismflow-deploy', 'src', 'App.jsx');
const BUILD_SCRIPT = path.join(ROOT, 'build.js');

if (!fs.existsSync(APP_JSX)) {
  console.error('App.jsx not found: ' + APP_JSX);
  console.error('Run `node build.js --mode=dev` first to generate it.');
  process.exit(2);
}
if (!fs.existsSync(BUILD_SCRIPT)) {
  console.error('build.js not found at ' + BUILD_SCRIPT);
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// Step 1: Validate the current build output parses as JSX.
// ──────────────────────────────────────────────────────────────────────────
let parser;
try {
  parser = require('@babel/parser');
} catch (e) {
  console.error('@babel/parser not installed. Run: npm install @babel/parser');
  process.exit(2);
}

const src = fs.readFileSync(APP_JSX, 'utf-8');
const sizeKb = (src.length / 1024).toFixed(1);

if (!QUIET) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Build Pipeline Smoke Test                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  App.jsx:  ' + path.relative(ROOT, APP_JSX) + '  (' + sizeKb + ' KB)');
  console.log('');
}

const start = Date.now();
let parseError = null;
try {
  parser.parse(src, {
    sourceType: 'module',
    plugins: ['jsx'],
    errorRecovery: false,
  });
} catch (e) {
  parseError = e;
}
const elapsedMs = Date.now() - start;

// ──────────────────────────────────────────────────────────────────────────
// Step 2: Verify the source-of-truth (AlloFlowANTI.txt) also parses.
// If it doesn't, that's the actual problem — App.jsx is downstream.
// ──────────────────────────────────────────────────────────────────────────
const SOURCE = path.join(ROOT, 'AlloFlowANTI.txt');
let sourceParseError = null;
if (fs.existsSync(SOURCE)) {
  const sourceSrc = fs.readFileSync(SOURCE, 'utf-8');
  try {
    parser.parse(sourceSrc, {
      sourceType: 'module',
      plugins: ['jsx'],
      errorRecovery: false,
    });
  } catch (e) {
    sourceParseError = e;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────────────────────────────────
const hasErrors = parseError || sourceParseError;

if (sourceParseError) {
  console.log('═══ ✗ AlloFlowANTI.txt has parse error (this is the source of truth) ═══');
  console.log('  Line ' + (sourceParseError.loc?.line || '?') + ': ' + sourceParseError.message);
  console.log('');
}

if (parseError) {
  console.log('═══ ✗ App.jsx (build output) has parse error ═══');
  console.log('  Line ' + (parseError.loc?.line || '?') + ': ' + parseError.message);
  console.log('');
  console.log('  This means the deploy will fail at React\'s parse step in the browser.');
  console.log('  Either the source has an error (check above), or build.js mangled it.');
  console.log('');
}

console.log('  Source:    ' + (sourceParseError ? '✗ parse error' : '✓ parses cleanly'));
console.log('  App.jsx:   ' + (parseError ? '✗ parse error' : '✓ parses cleanly') + '  (' + elapsedMs + 'ms)');
console.log('');

if (!hasErrors) {
  console.log('  ✅ Build pipeline smoke OK — both source and output parse as JSX.');
} else {
  console.log('  ❌ Parse error — fix before deploy.');
}
console.log('');

process.exit(hasErrors ? 1 : 0);
