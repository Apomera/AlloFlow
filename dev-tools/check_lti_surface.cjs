#!/usr/bin/env node
// check_lti_surface.cjs — Static surface check for LTI 1.3 LMS integration.
//
// Why this exists:
//   AlloFlow integrates with Canvas/Brightspace/Schoology/Moodle/D2L via LTI 1.3
//   (3 endpoints in prismflow-deploy/functions/index.js: ltiLogin, ltiLaunch,
//   ltiSession). When district pilots happen, a broken LTI handshake means
//   teachers can't launch the tool from inside their LMS — a hard blocker.
//
//   FULL E2E LTI testing requires an LMS sandbox (Canvas test instance,
//   Brightspace dev cloud, etc.) which doesn't exist in this repo. That's
//   a "before-pilot" task, not a per-deploy task.
//
//   This check covers the STATIC SURFACE that can be verified without an LMS:
//     - Are the 3 LTI endpoints exported from functions/index.js?
//     - Do they handle the required OIDC/JWT parameters per the LTI 1.3 spec?
//     - Are LTI secrets defined (LTI_CLIENT_ID, LTI_DEPLOYMENT_ID, LTI_PLATFORM_URL)?
//     - Is JWT verification present (not just decoded — verified)?
//     - Is nonce/state CSRF protection in place?
//     - Is there CORS handling for LMS preflights?
//
// What this check does NOT cover (separate-session work):
//   - Real handshake against an LMS (needs sandbox)
//   - JWT signature verification correctness (needs JWK key from platform)
//   - Roster sync logic correctness
//   - Deep-link launch parameter handling
//
// Usage:
//   node dev-tools/check_lti_surface.cjs
//   node dev-tools/check_lti_surface.cjs --verbose
//
// Exit codes:
//   0 — static LTI surface looks correct
//   1 — at least one expected endpoint or check is missing
//   2 — usage / file not found

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_FILE = path.join(ROOT, 'prismflow-deploy', 'functions', 'index.js');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

if (!fs.existsSync(FUNCTIONS_FILE)) {
  console.error('functions/index.js not found at ' + FUNCTIONS_FILE);
  process.exit(2);
}

const src = fs.readFileSync(FUNCTIONS_FILE, 'utf-8');

// ──────────────────────────────────────────────────────────────────────────
// Define the static checks. Each is a label + matcher predicate + severity.
// ──────────────────────────────────────────────────────────────────────────
const CHECKS = [
  // Endpoint exports
  {
    label: 'ltiLogin endpoint exported',
    severity: 'strict',
    test: () => /exports\.ltiLogin\s*=\s*onRequest/.test(src),
    fixHint: 'Add `exports.ltiLogin = onRequest(...)` for OIDC initiation per LTI 1.3 spec',
  },
  {
    label: 'ltiLaunch endpoint exported',
    severity: 'strict',
    test: () => /exports\.ltiLaunch\s*=\s*onRequest/.test(src),
    fixHint: 'Add `exports.ltiLaunch = onRequest(...)` for JWT-validated launch endpoint',
  },
  {
    label: 'ltiSession endpoint exported',
    severity: 'strict',
    test: () => /exports\.ltiSession\s*=\s*onRequest/.test(src),
    fixHint: 'Add `exports.ltiSession = onRequest(...)` for session check / data fetch',
  },
  // Secrets configuration
  {
    label: 'LTI_CLIENT_ID secret defined',
    severity: 'strict',
    test: () => /defineSecret\s*\(\s*['"]LTI_CLIENT_ID['"]\s*\)/.test(src),
    fixHint: 'Add `const LTI_CLIENT_ID = defineSecret("LTI_CLIENT_ID");` at module top',
  },
  {
    label: 'LTI_DEPLOYMENT_ID secret defined',
    severity: 'strict',
    test: () => /defineSecret\s*\(\s*['"]LTI_DEPLOYMENT_ID['"]\s*\)/.test(src),
    fixHint: 'Add `const LTI_DEPLOYMENT_ID = defineSecret("LTI_DEPLOYMENT_ID");`',
  },
  {
    label: 'LTI_PLATFORM_URL secret defined',
    severity: 'strict',
    test: () => /defineSecret\s*\(\s*['"]LTI_PLATFORM_URL['"]\s*\)/.test(src),
    fixHint: 'Add `const LTI_PLATFORM_URL = defineSecret("LTI_PLATFORM_URL");`',
  },
  // OIDC parameter handling
  {
    label: 'ltiLogin reads required OIDC params (iss, login_hint)',
    severity: 'strict',
    test: () => /iss\s*,/.test(src) && /login_hint/.test(src),
    fixHint: 'Per LTI 1.3 spec, ltiLogin must extract iss + login_hint from req.body',
  },
  {
    label: 'CSRF protection: nonce generated',
    severity: 'strict',
    test: () => /crypto\.randomBytes\([0-9]+\)\.toString\(['"]hex['"]\)/.test(src) && /nonce/i.test(src),
    fixHint: 'Generate nonce per OIDC spec: crypto.randomBytes(16).toString("hex")',
  },
  {
    label: 'CSRF protection: state parameter generated',
    severity: 'strict',
    test: () => /\bstate\b/.test(src) && /crypto\.randomBytes/.test(src),
    fixHint: 'Generate state per OIDC spec to bind login → launch',
  },
  // JWT verification (the security-critical bit)
  {
    label: 'JWT verification (not just decode)',
    severity: 'strict',
    test: () => /jwt\.verify|jose\.jwtVerify|verifyToken|jwtVerify/.test(src),
    fixHint: 'Use jwt.verify() (not jwt.decode()) — decode does NOT validate signature; ' +
             'launches would be forgeable.',
  },
  // CORS handling for LMS preflights
  {
    label: 'CORS preflight handling on ltiLaunch',
    severity: 'recommended',
    test: () => /Access-Control-Allow-Origin/.test(src),
    fixHint: 'Set "Access-Control-Allow-Origin" header — some LMS frames need it',
  },
  // Error handling for malformed requests
  {
    label: 'Returns 400 for missing LTI params',
    severity: 'recommended',
    test: () => /res\.status\(400\)/.test(src) && /Missing\s+required/i.test(src),
    fixHint: 'Return HTTP 400 with descriptive error when OIDC params are missing',
  },
  // OIDC redirect_uri must be HTTPS per spec
  {
    label: 'redirect_uri uses https scheme',
    severity: 'strict',
    test: () => /redirect_uri:\s*[`'"]https:\/\//.test(src),
    fixHint: 'redirect_uri must be https:// (LTI 1.3 spec); platform will reject http://',
  },
];

const results = CHECKS.map(c => ({ ...c, pass: c.test() }));
const failedStrict = results.filter(r => !r.pass && r.severity === 'strict');
const failedRecommended = results.filter(r => !r.pass && r.severity === 'recommended');
const passed = results.filter(r => r.pass);

if (!QUIET || failedStrict.length > 0 || failedRecommended.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   LTI 1.3 Static Surface Check                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  File:                 prismflow-deploy/functions/index.js');
  console.log('  Strict checks:        ' + results.filter(r => r.severity === 'strict').length);
  console.log('  Recommended checks:   ' + results.filter(r => r.severity === 'recommended').length);
  console.log('');
  console.log('  Note: this is STATIC. Real handshake testing needs an LMS sandbox');
  console.log('  (Canvas test, Brightspace dev cloud, etc.) — separate session before pilot.');
  console.log('');
}

if (failedStrict.length > 0) {
  console.log('═══ ✗ STRICT FAILURES (' + failedStrict.length + ') — LTI handshake will fail ═══');
  for (const f of failedStrict) {
    console.log('  ✗ ' + f.label);
    console.log('      Fix: ' + f.fixHint);
    console.log('');
  }
}

if (failedRecommended.length > 0) {
  console.log('═══ ⚠ RECOMMENDED CHECKS (' + failedRecommended.length + ') — would improve robustness ═══');
  for (const f of failedRecommended) {
    console.log('  ⚠ ' + f.label);
    console.log('      Fix: ' + f.fixHint);
  }
  console.log('');
}

if (VERBOSE && passed.length > 0) {
  console.log('═══ ✓ Passed checks ═══');
  for (const p of passed) console.log('  ✓ ' + p.label + '  [' + p.severity + ']');
  console.log('');
}

console.log('  ' + (failedStrict.length === 0 ? '✅' : '❌') + ' ' + passed.length + ' / ' + results.length + ' checks pass.');
if (failedStrict.length === 0 && failedRecommended.length > 0) {
  console.log('     (' + failedRecommended.length + ' recommended-but-not-blocking suggestions above)');
}
console.log('');

process.exit(failedStrict.length > 0 ? 1 : 0);
