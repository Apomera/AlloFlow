#!/usr/bin/env node
// _verify_extraction.cjs — Generic phantom-ref checker for CDN module extractions.
//
// Why this exists:
//   When extracting a block of code from AlloFlowANTI.txt to a CDN module,
//   the host must keep a shim for every identifier the block defined that
//   is also REFERENCED elsewhere in the host. Miss one and the host throws
//   `ReferenceError: X is not defined` at runtime.
//
//   This script automates the verification:
//     1. Parses the module file to find every top-level identifier it
//        defines (const/let/var/function declarations).
//     2. For each identifier, scans the host file (AlloFlowANTI.txt) for:
//        a) Bare references outside of declarations.
//        b) A matching shim declaration in host scope.
//     3. Reports phantom refs (referenced but not shimmed → will throw)
//        and orphan callers (referenced but the extracted block doesn't
//        define that name anymore — which would be a different bug).
//
// Usage:
//   node _verify_extraction.cjs <host.txt> <module.js>
//   node _verify_extraction.cjs AlloFlowANTI.txt ui_font_library_module.js
//
//   With explicit identifiers (skip auto-detection):
//     node _verify_extraction.cjs AlloFlowANTI.txt --ids FONT_OPTIONS,injectFontStyles
//
// Exit codes:
//   0 — all referenced identifiers have matching shims (safe to deploy)
//   1 — at least one phantom ref (will throw at runtime)
//   2 — usage error / file not found

'use strict';
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node _verify_extraction.cjs <host-file> <module-file>');
  console.error('   or: node _verify_extraction.cjs <host-file> --ids id1,id2,...');
  process.exit(2);
}

const HOST = args[0];
let ids;
let MODULE_PATH = null;

if (args[1] === '--ids' && args[2]) {
  ids = args[2].split(',').map(s => s.trim()).filter(Boolean);
} else {
  MODULE_PATH = args[1];
  if (!fs.existsSync(MODULE_PATH)) {
    console.error('Module file not found: ' + MODULE_PATH);
    process.exit(2);
  }
  // Auto-detect EXPORTED identifiers from the module — only what's actually
  // registered on window.AlloModules.X or assigned to window.X. Internal
  // IIFE locals (fonts, link, style, etc.) are not exports and don't need
  // host shims, so we deliberately ignore plain const/let/var declarations.
  const mod = fs.readFileSync(MODULE_PATH, 'utf-8');
  const stripped = mod
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const idsSet = new Set();
  // (a) `window.AlloModules.X = { foo, bar, ... }` — preferred export pattern.
  //     Capture the field shorthand or `name: value` keys inside the braces.
  const exportRe = /window\.AlloModules\.[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*\{([\s\S]*?)\}\s*;/g;
  let m;
  while ((m = exportRe.exec(stripped)) !== null) {
    const body = m[1];
    const fieldRe = /(?:^|[\s,])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:[,}\n]|:)/g;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) idsSet.add(fm[1]);
  }
  // (b) `window.X = X;` — direct mirror to window namespace.
  const winAssignRe = /window\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*;/g;
  while ((m = winAssignRe.exec(stripped)) !== null) {
    // Only count when LHS == RHS (mirroring) and not when just assigning
    // arbitrary values to window.
    if (m[1] === m[2]) idsSet.add(m[1]);
  }
  ids = Array.from(idsSet);
}

if (!fs.existsSync(HOST)) {
  console.error('Host file not found: ' + HOST);
  process.exit(2);
}

if (ids.length === 0) {
  console.error('No identifiers detected from module. Use --ids to specify them.');
  process.exit(2);
}

// Common globals/keywords/false-positive identifiers we should never flag.
const IGNORE = new Set([
  // Module-internal helpers that aren't intended for host scope.
  'AlloModules',
  // Common JS built-ins
  'window', 'document', 'console', 'process', 'require', 'module', 'exports',
  // Module wrapper internals
  'fs', 'path',
]);
ids = ids.filter(id => !IGNORE.has(id));

const host = fs.readFileSync(HOST, 'utf-8');
// Strip comments to avoid false positives from comments mentioning identifiers.
const hostStripped = host
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

let phantomCount = 0;
let okCount = 0;
let unusedCount = 0;
const findings = [];

for (const id of ids) {
  // Count bare-reference occurrences in host (whole-word).
  const refRe = new RegExp('(^|[^A-Za-z0-9_$.])' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_$])', 'g');
  let refCount = 0;
  let m;
  while ((m = refRe.exec(hostStripped)) !== null) refCount++;

  // Detect if there's a shim — a host-scope declaration with the same name.
  // Patterns: `var X = ...`, `let X = ...`, `const X = ...`, `function X(...)`,
  // or `window.X = ...` assignment, or `X = window.AlloModules.Y.X` upgrade.
  const shimRe = new RegExp(
    '(?:^|\\n)\\s*(?:const|let|var|function|async\\s+function)\\s+' +
    id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[=(]',
    'g'
  );
  const windowAssignRe = new RegExp(
    'window\\.' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=',
    'g'
  );
  const hasShim = shimRe.test(hostStripped) || windowAssignRe.test(hostStripped);

  if (refCount === 0) {
    findings.push({ id, status: 'unused', refCount, hasShim, msg: 'Defined in module but never referenced in host (safe — extraction-only)' });
    unusedCount++;
  } else if (hasShim) {
    findings.push({ id, status: 'ok', refCount, hasShim, msg: refCount + ' references found, host shim present' });
    okCount++;
  } else {
    findings.push({ id, status: 'phantom', refCount, hasShim, msg: refCount + ' references found, NO host shim — will throw ReferenceError at runtime' });
    phantomCount++;
  }
}

// Cross-check: every loadModule(...) call site in the host must appear
// AFTER the loadModule function is defined. Otherwise we get the
// "ReferenceError: loadModule is not defined" production bug from May 2026
// (where an extraction script's findIndex matched a comment instead of the
// real loadModule call, inserting new ones in the wrong scope).
const hostLines = host.split(/\r?\n/);
const defLineIdx = hostLines.findIndex(l => /(?:const|let|var|function)\s+loadModule\s*[=(]/.test(l));
const orphanLoadModuleCalls = [];
if (defLineIdx !== -1) {
  for (let i = 0; i < defLineIdx; i++) {
    const l = hostLines[i];
    // Skip comments — only flag real call sites.
    const noComment = l.replace(/\/\/[^\n]*$/, '').replace(/\/\*[\s\S]*?\*\//, '');
    if (/(?:^|\s|\()loadModule\s*\(/.test(noComment)) {
      orphanLoadModuleCalls.push({ line: i + 1, text: l.trim().slice(0, 100) });
    }
  }
}

// Pretty print
console.log('');
console.log('Phantom-Ref Verification: ' + (MODULE_PATH || '<--ids list>'));
console.log('Host: ' + HOST);
console.log('Identifiers checked: ' + ids.length);
console.log('  ✓ OK (referenced + shimmed): ' + okCount);
console.log('  ⊙ Unused (defined but unreferenced): ' + unusedCount);
console.log('  ✗ Phantom (referenced + NO shim): ' + phantomCount);
if (orphanLoadModuleCalls.length > 0) {
  console.log('  ✗ Orphan loadModule calls (BEFORE loadModule definition at line ' + (defLineIdx + 1) + '): ' + orphanLoadModuleCalls.length);
}
console.log('');

if (orphanLoadModuleCalls.length > 0) {
  console.log('=== ✗ ORPHAN loadModule CALLS — will throw ReferenceError at parse time ===');
  for (const o of orphanLoadModuleCalls) {
    console.log('  L' + o.line + ': ' + o.text);
  }
  console.log('');
  phantomCount += orphanLoadModuleCalls.length;
}

if (phantomCount > 0) {
  console.log('=== ✗ PHANTOM REFS — fix before deploy ===');
  for (const f of findings) {
    if (f.status === 'phantom') {
      console.log('  ' + f.id.padEnd(30) + '  ' + f.msg);
    }
  }
  console.log('');
}

// Verbose: list everything if --verbose
if (args.includes('--verbose')) {
  console.log('=== All findings ===');
  for (const f of findings) {
    const icon = f.status === 'ok' ? '✓' : f.status === 'unused' ? '⊙' : '✗';
    console.log('  ' + icon + ' ' + f.id.padEnd(30) + '  ' + f.msg);
  }
  console.log('');
}

process.exit(phantomCount > 0 ? 1 : 0);
