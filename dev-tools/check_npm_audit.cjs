#!/usr/bin/env node
'use strict';

// Audit lockfiles without installing packages or executing lifecycle scripts.
// An unavailable/incomplete audit is an error, never a clean result.
// Exit: 0 = complete, below threshold; 1 = vulnerabilities; 2 = incomplete.
// Options: --quiet --json --include-moderate --production --scope=<label>
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const SCOPES = Object.freeze({
  root: '.',
  desktop: 'desktop',
  'desktop/web-app': 'desktop/web-app',
  'desktop/web-app/functions': 'desktop/web-app/functions',
  'desktop/mcp/runtime': 'desktop/mcp/runtime',
  'services/alloflow-remote-mcp': 'services/alloflow-remote-mcp',
  'services/alloflow-remote-mcp/runner': 'services/alloflow-remote-mcp/runner',
  'a11y-audit': 'a11y-audit',
  trailer: 'trailer',
});
const LEVELS = ['info', 'low', 'moderate', 'high', 'critical'];

function parseAudit(result) {
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    return { error: 'npm audit did not complete successfully' };
  }
  let report;
  try { report = JSON.parse(result.stdout); }
  catch { return { error: 'npm audit returned invalid JSON' }; }
  if (!report || typeof report !== 'object' || report.error) {
    return { error: 'npm audit reported a registry or configuration error' };
  }
  const counts = report.metadata?.vulnerabilities;
  if (!counts || [...LEVELS, 'total'].some((level) => !Number.isSafeInteger(counts[level]) || counts[level] < 0)) {
    return { error: 'npm audit omitted valid vulnerability counts' };
  }
  if (LEVELS.reduce((sum, level) => sum + counts[level], 0) !== counts.total) {
    return { error: 'npm audit returned inconsistent vulnerability counts' };
  }
  if (result.status === 1 && counts.total === 0) {
    return { error: 'npm audit failed without a vulnerability result' };
  }
  return { counts };
}

function runAudit(label, options = {}) {
  if (!Object.hasOwn(SCOPES, label)) return { label, error: 'unknown audit scope' };
  const cwd = path.join(options.root || ROOT, SCOPES[label]);
  const exists = options.exists || fs.existsSync;
  for (const file of ['package.json', 'package-lock.json']) {
    if (!exists(path.join(cwd, file))) return { label, error: file + ' is missing' };
  }
  // All shell arguments are fixed strings. Scope selection changes only cwd.
  // Windows needs a shell for npm.cmd; no caller text enters the command.
  const args = ['audit', '--json', '--package-lock-only', '--ignore-scripts'];
  if (options.production) args.push('--omit=dev');
  let result;
  try {
    const command = process.platform === 'win32' ? 'npm.cmd ' + args.join(' ') : 'npm';
    result = (options.spawn || spawnSync)(command, process.platform === 'win32' ? [] : args, {
      cwd, encoding: 'utf8', shell: process.platform === 'win32',
      windowsHide: true, timeout: 90_000, maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return { label, error: 'npm audit could not start' };
  }
  return { label, ...parseAudit(result) };
}

function summarize(results, includeModerate = false) {
  const counts = Object.fromEntries([...LEVELS, 'total'].map((level) => [level, 0]));
  const errors = results.filter((result) => result.error).length;
  for (const result of results) {
    if (result.error) continue;
    for (const level of Object.keys(counts)) counts[level] += result.counts[level];
  }
  const blocking = counts.high + counts.critical + (includeModerate ? counts.moderate : 0);
  return { complete: errors === 0 && results.length > 0, errors, counts, blocking,
    exitCode: errors || results.length === 0 ? 2 : blocking ? 1 : 0 };
}

function main(args = process.argv.slice(2), dependencies = {}) {
  const print = dependencies.print || console.log;
  const selected = [];
  const options = { quiet: false, json: false, includeModerate: false, production: false };
  for (const arg of args) {
    if (arg === '--quiet') options.quiet = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--include-moderate') options.includeModerate = true;
    else if (arg === '--production') options.production = true;
    else if (arg.startsWith('--scope=') && Object.hasOwn(SCOPES, arg.slice(8))) selected.push(arg.slice(8));
    else { print('Invalid audit option: ' + arg); return 2; }
  }
  const labels = [...new Set(selected.length ? selected : Object.keys(SCOPES))];
  const results = labels.map((label) => (dependencies.audit || runAudit)(label, options));
  const summary = summarize(results, options.includeModerate);
  if (options.json) {
    print(JSON.stringify({ ...summary, productionOnly: options.production, results }, null, 2));
  } else {
    for (const result of results) {
      if (result.error) print(result.label + ': INCOMPLETE - ' + result.error);
      else if (!options.quiet || result.counts.high || result.counts.critical || (options.includeModerate && result.counts.moderate)) {
        const c = result.counts;
        print(result.label + ': ' + c.critical + ' critical, ' + c.high + ' high, ' + c.moderate + ' moderate, ' + c.low + ' low');
      }
    }
    if (!summary.complete) print('Audit incomplete: ' + summary.errors + ' scope(s) failed. No clean verdict is available.');
    else if (summary.blocking) print(summary.blocking + ' package findings meet the threshold across ' + results.length + ' scopes; review exposure and test updates. Counts may repeat dependencies across scopes.');
    else print('Audit complete: no ' + (options.includeModerate ? 'MODERATE/HIGH/CRITICAL' : 'HIGH/CRITICAL') + ' findings across ' + results.length + ' scopes.');
  }
  return summary.exitCode;
}

module.exports = { SCOPES, parseAudit, runAudit, summarize, main };
if (require.main === module) process.exitCode = main();
