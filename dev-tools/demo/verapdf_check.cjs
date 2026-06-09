#!/usr/bin/env node
// dev-tools/demo/verapdf_check.cjs
//
// Wraps the veraPDF CLI (https://verapdf.org/) and produces a structured
// PDF/UA-1 conformance report compatible with the format of
// exported_pdf_validator.cjs. Runs veraPDF as a child process, parses its
// JSON MRR (machine-readable report) output, and emits human + JSON
// formats for terminal + downstream tooling.
//
// veraPDF is the open-source, ISO-grade PDF/UA-1 validator the institutional
// accessibility-review world uses (PAC 2024 covers similar ground but is
// GUI/Windows-only). Output is the same KIND of artifact Garry's UMaine
// team would produce themselves — automating it means Aaron ships a result,
// not a claim.
//
// Usage:
//   node dev-tools/demo/verapdf_check.cjs <file.pdf>            # human-readable
//   node dev-tools/demo/verapdf_check.cjs --json <file.pdf>     # JSON
//   node dev-tools/demo/verapdf_check.cjs --flavour ua1 <pdf>   # explicit
//
// Resolution order for the veraPDF binary:
//   1. $VERAPDF_PATH environment variable (full path to verapdf executable)
//   2. `verapdf` on $PATH
//   3. Common install locations: C:/Program Files/veraPDF, C:/veraPDF,
//      $HOME/veraPDF, /opt/verapdf, /usr/local/bin/verapdf
//
// Install veraPDF (requires Java 11+): see docs/verapdf_install.md

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

// ── Locate the veraPDF binary ──
function findVeraPdf() {
  if (process.env.VERAPDF_PATH && fs.existsSync(process.env.VERAPDF_PATH)) {
    return process.env.VERAPDF_PATH;
  }
  // Try plain `verapdf` on PATH first — works on Linux/macOS + Windows when added.
  const whichRes = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['verapdf'], { encoding: 'utf8' });
  if (whichRes.status === 0 && whichRes.stdout.trim()) {
    const firstLine = whichRes.stdout.split(/\r?\n/)[0].trim();
    if (firstLine && fs.existsSync(firstLine)) return firstLine;
  }
  const homedir = os.homedir();
  const candidates = process.platform === 'win32' ? [
    'C:/Program Files/veraPDF/verapdf.bat',
    'C:/Program Files (x86)/veraPDF/verapdf.bat',
    'C:/veraPDF/verapdf.bat',
    path.join(homedir, 'veraPDF', 'verapdf.bat'),
    path.join(homedir, 'veraPDF', 'verapdf'),
  ] : [
    '/opt/verapdf/verapdf',
    '/usr/local/bin/verapdf',
    path.join(homedir, 'veraPDF', 'verapdf'),
    '/opt/verapdf/bin/verapdf',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ── Print install instructions when veraPDF isn't found ──
function printInstallInstructions() {
  console.error('');
  console.error('  veraPDF not found.');
  console.error('');
  console.error('  Install path (one-time, ~5 minutes):');
  console.error('    1. Install Java 11+ if needed (https://adoptium.net/)');
  console.error('    2. Download veraPDF GUI installer from https://verapdf.org/software/');
  console.error('    3. Run the installer (default install path: C:/Program Files/veraPDF on Windows)');
  console.error('    4. Verify: open a terminal and run `verapdf --version`');
  console.error('');
  console.error('  Or set the VERAPDF_PATH env var to the verapdf executable directly:');
  console.error('    Windows PowerShell:  $env:VERAPDF_PATH = "C:/Program Files/veraPDF/verapdf.bat"');
  console.error('    Linux/macOS:         export VERAPDF_PATH="/opt/verapdf/verapdf"');
  console.error('');
  console.error('  Full install + smoke-test guide: docs/verapdf_install.md');
  console.error('');
}

// ── Run veraPDF and parse its JSON output ──
function runVeraPdf(binary, pdfPath, flavour) {
  // --format json     → machine-readable report
  // -f ua1            → validate against PDF/UA-1 (ISO 14289-1)
  // --maxfailures 0   → report all failures (default may cap at 100)
  const args = ['--format', 'json', '-f', flavour || 'ua1', '--maxfailures', '0', pdfPath];
  const res = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  // veraPDF returns non-zero exit codes for validation failures — that's not
  // an error from our perspective, it's a report. Distinguish "couldn't run
  // veraPDF" from "veraPDF ran and reported failures."
  if (res.error) {
    return { error: 'Failed to spawn veraPDF: ' + res.error.message };
  }
  const raw = res.stdout || '';
  if (!raw.trim()) {
    return { error: 'veraPDF produced no output. stderr: ' + (res.stderr || '(empty)') };
  }
  try {
    return { report: JSON.parse(raw) };
  } catch (e) {
    return { error: 'Failed to parse veraPDF JSON output: ' + e.message + ' — first 500 chars: ' + raw.slice(0, 500) };
  }
}

// ── Summarize the veraPDF JSON MRR into a compact, human-friendly report ──
function summarize(report) {
  // veraPDF JSON output structure (as of veraPDF 1.26):
  //   { jobs: [ { itemDetails: {name}, validationResult: { details: { passedRules, failedRules,
  //     ruleSummaries: [ { ruleStatus, specification, clause, testNumber, description, checks: [...] } ] },
  //     profileName, compliant } } ] }
  if (!report.jobs || !report.jobs.length) {
    return { error: 'No job results in veraPDF output' };
  }
  const job = report.jobs[0];
  const vr = job.validationResult;
  if (!vr) {
    return { error: 'No validationResult in veraPDF output' };
  }
  const details = vr.details || {};
  const rules = details.ruleSummaries || [];

  const failedRules = rules.filter(r => r.ruleStatus === 'FAILED');
  const passedRules = rules.filter(r => r.ruleStatus === 'PASSED');

  // Cluster failures by clause for the human-readable summary.
  const byClause = {};
  for (const r of failedRules) {
    const c = r.clause || 'unknown';
    byClause[c] = byClause[c] || { count: 0, examples: [] };
    byClause[c].count += (r.failedChecks || 1);
    if (byClause[c].examples.length < 3) {
      byClause[c].examples.push({
        test: r.testNumber,
        desc: (r.description || '').slice(0, 200),
      });
    }
  }

  return {
    file: (job.itemDetails && job.itemDetails.name) || 'unknown',
    profile: vr.profileName || 'PDF/UA-1',
    compliant: !!vr.compliant,
    rulesPassed: passedRules.length,
    rulesFailed: failedRules.length,
    totalFailedChecks: failedRules.reduce((s, r) => s + (r.failedChecks || 0), 0),
    failuresByClause: byClause,
    rawDetailsCount: rules.length,
  };
}

// ── Pretty-printer for terminal output ──
function renderReport(s) {
  if (s.error) return '\n  ✗ ' + s.error + '\n';
  const lines = [];
  lines.push('');
  lines.push('═'.repeat(72));
  lines.push('  veraPDF — ' + path.basename(s.file));
  lines.push('═'.repeat(72));
  lines.push('  Profile:       ' + s.profile);
  lines.push('  Compliant:     ' + (s.compliant ? '✓ YES' : '✗ NO'));
  lines.push('  Rules passed:  ' + s.rulesPassed);
  lines.push('  Rules failed:  ' + s.rulesFailed + ' (' + s.totalFailedChecks + ' total check failures)');
  if (s.rulesFailed > 0) {
    lines.push('');
    lines.push('  Failures by ISO 14289-1 clause:');
    const sorted = Object.entries(s.failuresByClause).sort(([, a], [, b]) => b.count - a.count);
    for (const [clause, info] of sorted) {
      lines.push('    Clause ' + clause + ': ' + info.count + ' failure(s)');
      for (const ex of info.examples) {
        lines.push('       → ' + (ex.test || '') + ' ' + ex.desc);
      }
    }
  }
  lines.push('');
  lines.push('  ' + (s.compliant ? 'PASS' : 'FAIL') + ' — PDF/UA-1 ' + (s.compliant ? 'conformant' : 'non-conformant'));
  lines.push('═'.repeat(72));
  return lines.join('\n');
}

// ── CLI ──
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log('Usage: node dev-tools/demo/verapdf_check.cjs [--json] [--flavour ua1] <file.pdf>');
    process.exit(1);
  }
  let jsonOnly = false;
  let flavour = 'ua1';
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') jsonOnly = true;
    else if (args[i] === '--flavour') flavour = args[++i];
    else files.push(args[i]);
  }
  if (files.length === 0) {
    console.error('[verapdf_check] no PDF files provided');
    process.exit(1);
  }
  const binary = findVeraPdf();
  if (!binary) {
    printInstallInstructions();
    process.exit(2);
  }
  const results = [];
  let anyFail = false;
  for (const f of files) {
    const { report, error } = runVeraPdf(binary, f, flavour);
    if (error) {
      results.push({ file: f, error });
      anyFail = true;
      if (!jsonOnly) console.log('\n  ✗ ' + path.basename(f) + ' — ' + error);
      continue;
    }
    const s = summarize(report);
    results.push(s);
    if (!s.compliant) anyFail = true;
    if (!jsonOnly) console.log(renderReport(s));
  }
  if (jsonOnly) console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  process.exit(anyFail ? 1 : 0);
}

if (require.main === module) main();
// Reused by dev-tools/verapdf_diff.cjs (source-vs-tagged clause diff).
module.exports = { findVeraPdf, runVeraPdf, summarize, renderReport, printInstallInstructions };
