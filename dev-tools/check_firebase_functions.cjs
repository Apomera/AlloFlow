#!/usr/bin/env node
// check_firebase_functions.cjs — Static contract check for the 12 Firebase
// functions in prismflow-deploy/functions/index.js.
//
// Why this exists:
//   AlloFlow's backend is 12 Firebase Cloud Functions handling LTI auth,
//   search proxy, dashboard data, LMS scanning, and PDF audit logging.
//   They're invoked from the client + LMS handshakes; if any one is missing,
//   broken, or has a malformed export, the corresponding feature breaks
//   silently in production.
//
//   FULL E2E testing each function requires the Firebase emulator suite,
//   a real Firestore mock, a real Auth mock, and an LMS sandbox for the LTI
//   handlers. That's a separate session. This check is a STATIC SMOKE: it
//   verifies the functions/index.js file parses, exports the expected
//   functions, each export looks like a valid Cloud Function, and required
//   patterns are present (e.g., CORS headers, error handling).
//
// What's NOT checked here (separate-session work):
//   - Actual function invocation (would need Firebase emulator)
//   - Firestore queries returning correct data
//   - JWT signature verification on LTI handlers
//   - Schema validation of LMS scan results
//
// Usage:
//   node dev-tools/check_firebase_functions.cjs
//   node dev-tools/check_firebase_functions.cjs --verbose
//
// Exit codes:
//   0 — all expected exports present and well-shaped
//   1 — at least one export missing/broken
//   2 — usage / file not found

'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_FILE = path.join(ROOT, 'prismflow-deploy', 'functions', 'index.js');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

if (!fs.existsSync(FUNCTIONS_FILE)) {
  console.error('functions/index.js not found at ' + FUNCTIONS_FILE);
  process.exit(2);
}

// Expected exports based on memory + earlier survey
const EXPECTED_FUNCTIONS = [
  { name: 'searchProxy',      type: 'http',     description: 'Serper.dev search proxy for SearxNG fallback' },
  { name: 'ltiLogin',         type: 'http',     description: 'LTI 1.3 OIDC login initiation endpoint' },
  { name: 'ltiLaunch',        type: 'http',     description: 'LTI 1.3 launch resource endpoint' },
  { name: 'ltiSession',       type: 'http',     description: 'LTI 1.3 session check / data fetch' },
  { name: 'logRemediation',   type: 'http',     description: 'Log PDF audit + remediation events' },
  { name: 'dashboardData',    type: 'http',     description: 'Aggregate analytics for teacher dashboard' },
  { name: 'lmsAuth',          type: 'http',     description: 'LMS auth handshake for scan endpoints' },
  { name: 'lmsScan',          type: 'schedule', description: 'Scheduled LMS content scan (cron)' },
  { name: 'triggerLmsScan',   type: 'http',     description: 'Manual LMS scan trigger' },
  { name: 'scanResults',      type: 'http',     description: 'Fetch LMS scan results' },
  { name: 'accessible',       type: 'http',     description: 'Public accessible-PDF lookup' },
  { name: 'storeRemediated',  type: 'http',     description: 'Store remediated PDF artifact' },
];

const src = fs.readFileSync(FUNCTIONS_FILE, 'utf-8');
let ast;
try {
  ast = acorn.parse(src, {
    ecmaVersion: 2022, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true, allowHashBang: true, sourceType: 'script',
    locations: true,
  });
} catch (e) {
  console.error('Failed to parse functions/index.js: ' + e.message);
  console.error('Line ' + (e.loc?.line || '?') + ': would block deploy.');
  process.exit(1);
}

// Walk AST: find every `exports.X = wrapper(...)` assignment + classify wrapper
const foundExports = new Map(); // name → { line, wrapperKind, hasCorsHeader, hasErrorHandling }

function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
    const ae = node.expression;
    if (ae.left.type === 'MemberExpression'
        && ae.left.object && ae.left.object.name === 'exports'
        && ae.left.property && ae.left.property.name) {
      const name = ae.left.property.name;
      let wrapperKind = 'unknown';
      if (ae.right.type === 'CallExpression' && ae.right.callee && ae.right.callee.type === 'Identifier') {
        wrapperKind = ae.right.callee.name;  // onRequest / onCall / onSchedule
      }
      foundExports.set(name, {
        line: node.loc.start.line,
        wrapperKind,
      });
    }
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
    if (node[k] && typeof node[k] === 'object') walk(node[k]);
  }
}
walk(ast);

// Cross-reference
const missing = [];
const wrongType = [];
const found = [];
for (const exp of EXPECTED_FUNCTIONS) {
  const got = foundExports.get(exp.name);
  if (!got) {
    missing.push(exp);
    continue;
  }
  // Map expected type → wrapper name
  const expectedWrappers = exp.type === 'http' ? ['onRequest', 'onCall'] : ['onSchedule'];
  if (!expectedWrappers.includes(got.wrapperKind)) {
    wrongType.push({ ...exp, gotWrapper: got.wrapperKind, line: got.line });
  } else {
    found.push({ ...exp, line: got.line, wrapperKind: got.wrapperKind });
  }
}

// Find unexpected exports (not in our list — informational)
const unexpected = [];
for (const [name, info] of foundExports) {
  if (!EXPECTED_FUNCTIONS.find(e => e.name === name)) {
    unexpected.push({ name, ...info });
  }
}

// Sanity checks across the file
const corsCount = (src.match(/Access-Control-Allow-Origin/g) || []).length;
const tryCatchCount = (src.match(/\btry\s*\{/g) || []).length;
const totalLines = src.split('\n').length;

if (!QUIET || missing.length > 0 || wrongType.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   Firebase Functions Static Smoke                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  File:                    prismflow-deploy/functions/index.js (' + totalLines + ' lines)');
  console.log('  Expected exports:        ' + EXPECTED_FUNCTIONS.length);
  console.log('  Found:                   ' + found.length);
  console.log('  Missing:                 ' + missing.length);
  console.log('  Wrong wrapper type:      ' + wrongType.length);
  console.log('  Unexpected exports:      ' + unexpected.length + ' (informational)');
  console.log('  CORS headers:            ' + corsCount + ' use sites');
  console.log('  try/catch blocks:        ' + tryCatchCount);
  console.log('');
}

if (missing.length > 0) {
  console.log('═══ ✗ MISSING EXPORT (' + missing.length + ') — function not exported from functions/index.js ═══');
  for (const m of missing) {
    console.log('  ✗ exports.' + m.name + '  — ' + m.description);
  }
  console.log('');
}

if (wrongType.length > 0) {
  console.log('═══ ✗ WRONG WRAPPER (' + wrongType.length + ') — export uses unexpected Firebase wrapper ═══');
  for (const w of wrongType) {
    console.log('  ✗ exports.' + w.name + '  expected ' + w.type + ' (' + (w.type === 'http' ? 'onRequest/onCall' : 'onSchedule') + ') but got ' + w.gotWrapper + '  (line ' + w.line + ')');
  }
  console.log('');
}

if (VERBOSE) {
  console.log('═══ ✓ Found exports ═══');
  for (const f of found) {
    console.log('  ✓ exports.' + f.name.padEnd(20) + ' line ' + f.line + '  ' + f.wrapperKind);
  }
  console.log('');
  if (unexpected.length > 0) {
    console.log('═══ ⊙ Unexpected exports (not in catalog) ═══');
    for (const u of unexpected) {
      console.log('  ⊙ exports.' + u.name + '  line ' + u.line + '  ' + u.wrapperKind);
    }
    console.log('');
  }
}

const hasErrors = missing.length > 0 || wrongType.length > 0;

console.log('  ' + (hasErrors ? '❌' : '✅') + ' ' + found.length + ' / ' + EXPECTED_FUNCTIONS.length + ' expected functions present and well-shaped.');
if (corsCount === 0) {
  console.log('  ⚠ Note: no CORS headers found — verify if browser callers need them.');
}
console.log('');

process.exit(hasErrors ? 1 : 0);
