#!/usr/bin/env node
// check_secrets.cjs — Scan source files for accidentally-committed secrets.
//
// Why this exists:
//   The single worst security mistake in any codebase is committing an API
//   key, token, or password to source. Once it's in git history it's
//   compromised forever (rotating helps but anyone with a clone has the
//   old key). Cloud Functions, Firebase, and CDN modules are particularly
//   at risk because they sometimes need credentials to function.
//
//   This check scans for the most common patterns of accidentally-committed
//   secrets. False positives are possible (e.g., test fixtures with fake
//   keys); allowlist them via the patterns below.
//
// What it catches:
//   - Google API keys (AIza...)
//   - AWS access key IDs (AKIA...)
//   - Stripe keys (sk_live_..., pk_live_...)
//   - GitHub PATs (ghp_..., gho_..., ghu_..., ghs_..., ghr_...)
//   - Slack tokens (xox[bpoa]-...)
//   - Generic high-entropy strings near "key", "token", "secret", "password"
//   - Private key blocks (-----BEGIN PRIVATE KEY-----)
//
// What it does NOT catch:
//   - Secrets that match no known pattern (unguessable, no convention)
//   - Secrets in git history but not current files
//   - Secrets that are obfuscated (base64-encoded, etc.)
//
// Usage:
//   node dev-tools/check_secrets.cjs
//   node dev-tools/check_secrets.cjs --verbose
//
// Exit codes:
//   0 — no suspect secrets found
//   1 — at least one match (TRIAGE: real secret OR allowlist if false positive)
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

// ──────────────────────────────────────────────────────────────────────────
// Allowlist — known-safe matches that aren't real secrets.
// Each entry is a substring; if the matched string contains it, skip.
// ──────────────────────────────────────────────────────────────────────────
const ALLOWLIST_SUBSTRINGS = [
  'YOUR_API_KEY',
  'XXXXXXX',
  'placeholder',
  'example',
  'mock',
  'test_',
  'sk_test',
  'pk_test',
  // Add more here ONLY after manually verifying the match is not a real secret
];

// ──────────────────────────────────────────────────────────────────────────
// Patterns. Each: { name, regex, severity }
// ──────────────────────────────────────────────────────────────────────────
const PATTERNS = [
  { name: 'Google API key',          regex: /AIza[0-9A-Za-z_-]{35}/g,          severity: 'critical' },
  { name: 'AWS Access Key ID',       regex: /AKIA[0-9A-Z]{16}/g,               severity: 'critical' },
  { name: 'Stripe live key',         regex: /(?:sk|pk)_live_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
  { name: 'GitHub Personal Access Token', regex: /gh[pousr]_[0-9A-Za-z]{36}/g, severity: 'critical' },
  { name: 'Slack token',             regex: /xox[bpoars]-[0-9A-Za-z-]{10,}/g,  severity: 'critical' },
  { name: 'Private key block',       regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical' },
  // High-entropy heuristic: identifier that looks like KEY/TOKEN/SECRET assigned to a long random-looking string.
  // We require the value to be ≥32 chars of letters/digits with no obvious words.
  {
    name: 'Possible secret assignment',
    // matches: const FOO_KEY = "abc...32+ chars" or apiKey: "abc..."
    regex: /\b(?:api_?key|secret|token|password|passwd|access[_-]?token|bearer)\b['"]?\s*[:=]\s*['"]([A-Za-z0-9+\/=_-]{32,})['"]/gi,
    severity: 'warning',
  },
];

// Files to scan: source files at root + stem_lab + sel_hub + functions
function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}
const files = [
  ...listFiles(ROOT, f => /\.(js|jsx|ts|tsx|cjs|mjs)$/.test(f) && !f.startsWith('_build_')),
  ...listFiles(ROOT, f => /^(AlloFlowANTI|README|CHANGELOG|VPAT|FEATURE)/.test(f) && !f.endsWith('.md')),
  ROOT + '/AlloFlowANTI.txt',
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'prismflow-deploy', 'functions'), f => f.endsWith('.js') && !f.startsWith('_')),
];

const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  // Skip large binary-ish files
  const stat = fs.statSync(file);
  if (stat.size > 10 * 1024 * 1024) continue;  // skip files >10MB

  const src = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(ROOT, file);

  for (const pattern of PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let m;
    while ((m = re.exec(src)) !== null) {
      const matched = m[0];
      // Allowlist check
      if (ALLOWLIST_SUBSTRINGS.some(s => matched.toLowerCase().includes(s.toLowerCase()))) continue;
      // For high-entropy assignment heuristic, also skip if value is in allowlist
      if (pattern.name === 'Possible secret assignment' && m[1]) {
        if (ALLOWLIST_SUBSTRINGS.some(s => m[1].toLowerCase().includes(s.toLowerCase()))) continue;
        // Skip if the value contains common words (less likely to be a real key)
        if (/(test|example|sample|demo|fake|mock|todo|fix|change[_-]?me)/i.test(m[1])) continue;
      }
      const line = src.substring(0, m.index).split('\n').length;
      findings.push({
        file: rel,
        line,
        pattern: pattern.name,
        severity: pattern.severity,
        // Don't print the actual secret in output — print prefix only
        preview: matched.length > 20 ? matched.slice(0, 12) + '…[' + (matched.length - 12) + ' chars hidden]' : matched,
      });
    }
  }
}

const critical = findings.filter(f => f.severity === 'critical');
const warnings = findings.filter(f => f.severity === 'warning');

if (!QUIET || critical.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Secret Leak Scan                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files scanned: ' + files.filter(f => fs.existsSync(f)).length);
  console.log('  Patterns:      ' + PATTERNS.length);
  console.log('');
}

if (critical.length > 0) {
  console.log('═══ ✗ CRITICAL — POSSIBLE SECRETS COMMITTED (' + critical.length + ') ═══');
  console.log('     If real: rotate the secret IMMEDIATELY (assume compromised) + remove from git history.');
  console.log('     If false positive: add to ALLOWLIST_SUBSTRINGS in this script.');
  console.log('');
  for (const f of critical) {
    console.log('  ✗ [' + f.pattern + '] ' + f.file + ':' + f.line);
    console.log('      Preview: ' + f.preview);
    console.log('');
  }
}

if (warnings.length > 0 && (VERBOSE || critical.length === 0)) {
  console.log('═══ ⚠ WARNINGS (' + warnings.length + ') — high-entropy strings near key/token/secret keywords ═══');
  console.log('     Likely placeholder or test data; verify each manually.');
  console.log('');
  for (const f of warnings.slice(0, 20)) {
    console.log('  ⚠ ' + f.file + ':' + f.line + '  (' + f.preview + ')');
  }
  if (warnings.length > 20) console.log('  (... ' + (warnings.length - 20) + ' more, run --verbose)');
  console.log('');
}

console.log('  ' + (critical.length === 0 ? '✅' : '❌') + ' ' + critical.length + ' critical / ' + warnings.length + ' warnings.');
console.log('');

process.exit(critical.length > 0 ? 1 : 0);
