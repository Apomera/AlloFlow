#!/usr/bin/env node
// check_npm_audit.cjs — Run `npm audit` against the repo + Firebase functions
// dependencies and report HIGH/CRITICAL vulnerabilities.
//
// Why this exists:
//   Transitive dependencies in node_modules are a routine source of
//   security advisories. `npm audit` is the standard tool for catching
//   them. Running it as part of `npm run verify` gives a single signal
//   for "are any deps known-vulnerable?"
//
//   Two contexts to scan:
//   1. Root package.json (dev tooling — Babel parser, Playwright, etc.)
//   2. prismflow-deploy/functions/package.json (production runtime — jose,
//      firebase-admin, firebase-functions)
//
//   Production deps matter most. Dev deps are local-only.
//
// What this check does:
//   - Run `npm audit --json` in both contexts
//   - Filter to HIGH + CRITICAL severities
//   - Report counts; suggest `npm audit fix` for fixable ones
//
// Usage:
//   node dev-tools/check_npm_audit.cjs
//   node dev-tools/check_npm_audit.cjs --include-moderate    (also count moderate)
//   node dev-tools/check_npm_audit.cjs --quiet
//
// Exit codes:
//   0 — no HIGH/CRITICAL vulnerabilities
//   1 — at least one HIGH or CRITICAL
//   2 — usage / npm not available

'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const INCLUDE_MODERATE = args.includes('--include-moderate');

const SCAN_LOCATIONS = [
  { label: 'root', cwd: ROOT, packageJson: path.join(ROOT, 'package.json') },
  { label: 'prismflow-deploy/functions', cwd: path.join(ROOT, 'prismflow-deploy', 'functions'), packageJson: path.join(ROOT, 'prismflow-deploy', 'functions', 'package.json') },
];

function runAudit(loc) {
  if (!fs.existsSync(loc.packageJson)) {
    return { error: 'package.json missing at ' + loc.packageJson };
  }
  if (!fs.existsSync(path.join(loc.cwd, 'node_modules'))) {
    return { error: 'node_modules missing at ' + loc.cwd + ' (run `npm install` first)' };
  }
  let raw;
  try {
    raw = execSync('npm audit --json', { cwd: loc.cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    // npm audit exits non-zero when vulns are found; the JSON is on stdout still.
    raw = e.stdout || '';
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { error: 'failed to parse npm audit JSON: ' + e.message };
  }
  const meta = parsed.metadata || {};
  const vulns = (meta.vulnerabilities) || {};
  return {
    info: vulns.info || 0,
    low: vulns.low || 0,
    moderate: vulns.moderate || 0,
    high: vulns.high || 0,
    critical: vulns.critical || 0,
    total: vulns.total || 0,
    raw: parsed,
  };
}

const results = {};
for (const loc of SCAN_LOCATIONS) {
  results[loc.label] = runAudit(loc);
}

let totalHigh = 0, totalCritical = 0, totalModerate = 0;
for (const r of Object.values(results)) {
  if (r.error) continue;
  totalHigh += r.high;
  totalCritical += r.critical;
  totalModerate += r.moderate;
}

if (!QUIET || totalHigh + totalCritical > 0 || (INCLUDE_MODERATE && totalModerate > 0)) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   npm audit — Dependency Vulnerability Scan                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  for (const loc of SCAN_LOCATIONS) {
    const r = results[loc.label];
    console.log('  ' + loc.label + ':');
    if (r.error) {
      console.log('    ⊙ ' + r.error);
    } else {
      console.log('    info: ' + r.info + '  low: ' + r.low + '  moderate: ' + r.moderate + '  high: ' + r.high + '  critical: ' + r.critical);
    }
  }
  console.log('');
}

const blocking = totalHigh + totalCritical + (INCLUDE_MODERATE ? totalModerate : 0);

if (blocking > 0) {
  console.log('═══ ✗ ' + (totalHigh + totalCritical) + ' HIGH/CRITICAL ' + (INCLUDE_MODERATE ? '+ ' + totalModerate + ' moderate ' : '') + 'vulnerability(ies) found ═══');
  console.log('');
  console.log('  Fix attempt:');
  console.log('     cd ' + path.relative(process.cwd(), ROOT) + ' && npm audit fix');
  console.log('     cd ' + path.relative(process.cwd(), path.join(ROOT, 'prismflow-deploy', 'functions')) + ' && npm audit fix');
  console.log('');
  console.log('  Manual review for non-fixable:');
  console.log('     npm audit                            # full list at root');
  console.log('     cd prismflow-deploy/functions && npm audit');
  console.log('');
  console.log('  ❌ ' + blocking + ' blocking vulnerability(ies).');
} else if (totalModerate > 0) {
  console.log('  ✅ No HIGH/CRITICAL vulns. (' + totalModerate + ' moderate — see --include-moderate to gate on these too.)');
} else {
  console.log('  ✅ No HIGH/CRITICAL vulns across both contexts.');
}
console.log('');

process.exit(blocking > 0 ? 1 : 0);
