#!/usr/bin/env node
// check_cors_strict.cjs — Flag CORS wildcard origins in Firebase Functions.
//
// Why this exists:
//   Setting `Access-Control-Allow-Origin: *` allows ANY website to make
//   requests to your endpoint and read the response. For public read-only
//   endpoints (search proxy, public PDF lookup) this is fine and intentional.
//   For endpoints that handle PII, sessions, or LMS data, it's a leak surface.
//
//   This check reports every CORS wildcard so they can be triaged. It's
//   informational by default — most are intentional, but should be reviewed
//   before any district pilot to ensure session-handling endpoints aren't
//   accidentally permissive.
//
// What this check does:
//   Finds every `Access-Control-Allow-Origin` header in functions/index.js
//   and reports its value. Categorizes:
//     - "*" wildcard
//     - explicit origin
//     - dynamic (from a variable)
//
// Usage:
//   node dev-tools/check_cors_strict.cjs
//   node dev-tools/check_cors_strict.cjs --verbose
//
// Exit codes:
//   0 — informational pass (this check is advisory by default)
//   2 — usage / file not found

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS = path.join(ROOT, 'prismflow-deploy', 'functions', 'index.js');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
const STRICT = args.includes('--strict');  // exit 1 on any wildcard (for CI hardening)

if (!fs.existsSync(FUNCTIONS)) {
  console.error('functions/index.js not found at ' + FUNCTIONS);
  process.exit(2);
}

const src = fs.readFileSync(FUNCTIONS, 'utf-8');
const lines = src.split('\n');

// Find every set("Access-Control-Allow-Origin", X) call
const corsRe = /res\.set\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*([^)]+)\)/g;
const findings = [];
let m;
while ((m = corsRe.exec(src)) !== null) {
  const value = m[1].trim();
  const line = src.substring(0, m.index).split('\n').length;
  // Find the surrounding exports.* function
  let surroundingFunction = '?';
  for (let i = line; i >= 0; i--) {
    const fnMatch = lines[i] && lines[i].match(/exports\.([a-zA-Z]+)\s*=\s*onRequest/);
    if (fnMatch) { surroundingFunction = fnMatch[1]; break; }
  }
  // Classify
  let kind, severity;
  if (value === '"*"' || value === "'*'") {
    kind = 'wildcard';
    severity = 'review';
  } else if (/^['"]/.test(value)) {
    kind = 'explicit';
    severity = 'ok';
  } else {
    kind = 'dynamic';
    severity = 'review';
  }
  findings.push({ function: surroundingFunction, value, line, kind, severity });
}

const wildcards = findings.filter(f => f.kind === 'wildcard');
const dynamic = findings.filter(f => f.kind === 'dynamic');
const explicit = findings.filter(f => f.kind === 'explicit');

if (!QUIET) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   CORS Strict Origin Check                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  CORS sites:  ' + findings.length);
  console.log('  Wildcards:   ' + wildcards.length + ' (review intent — fine for public read endpoints)');
  console.log('  Explicit:    ' + explicit.length);
  console.log('  Dynamic:     ' + dynamic.length);
  console.log('');
}

if (wildcards.length > 0 && (VERBOSE || STRICT)) {
  console.log('═══ ⚠ WILDCARD CORS (' + wildcards.length + ') — review whether each is intentional ═══');
  console.log('     OK for: public search proxies, public PDF lookups (no auth, no PII)');
  console.log('     NOT OK for: session endpoints, LMS data, anything that returns user info');
  console.log('');
  for (const f of wildcards) {
    console.log('  ⚠ exports.' + f.function + '  (line ' + f.line + ')');
  }
  console.log('');
}

if (VERBOSE && explicit.length > 0) {
  console.log('═══ ✓ EXPLICIT ORIGINS (' + explicit.length + ') ═══');
  for (const f of explicit) {
    console.log('  ✓ exports.' + f.function + '  →  ' + f.value);
  }
  console.log('');
}

if (STRICT && wildcards.length > 0) {
  console.log('  ❌ ' + wildcards.length + ' wildcard(s) found in --strict mode.');
  process.exit(1);
}

console.log('  ✅ Reviewed ' + findings.length + ' CORS sites. ' + wildcards.length + ' wildcard(s) — review intent if endpoints handle PII or sessions.');
console.log('');

process.exit(0);
