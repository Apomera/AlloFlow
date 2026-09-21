#!/usr/bin/env node
'use strict';
// Keep protocol calibration and its migrated native checks in one fail-closed command.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { validateManifest, summarizeUnit, summarizeBrowser } = require('./remediation_validation.cjs');
const { captureIdentity, compareIdentity } = require('./remediation_validation_identity.cjs');
const manifest = require('./mcp_calibration_validation.json');
const ROOT = path.resolve(__dirname, '..');

function runCli(cli, args, env, logFile) {
  const log = fs.openSync(logFile, 'w');
  try {
    return spawnSync(process.execPath, [path.join(ROOT, cli), ...args], {
      cwd: ROOT, shell: false, windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env, ...env },
    });
  } finally { fs.closeSync(log); }
}

function executeCalibration({ reportDir, selection = manifest, run = runCli, capture = () => captureIdentity(ROOT, [...selection.unit, ...selection.browser, ...selection.identityInputs]) }) {
  fs.mkdirSync(reportDir, { recursive: true });
  const summaryFile = path.join(reportDir, 'summary.json');
  const summary = { runId: randomUUID(), status: 'running', startedAt: new Date().toISOString(), identityScope: 'Declared manifest inputs, selected suites, tool versions and Git HEAD', identity: {}, phases: { unit: { status: 'not-started' }, browser: { status: 'not-started' } } };
  const save = () => {
    const pending = summaryFile + '.' + summary.runId + '.tmp';
    fs.writeFileSync(pending, JSON.stringify(summary, null, 2) + '\n');
    fs.renameSync(pending, summaryFile);
  };
  const phase = (kind, cli, args, env) => {
    const entry = summary.phases[kind], reportFile = path.join(reportDir, kind + '.json');
    Object.assign(entry, { status: 'running', startedAt: new Date().toISOString(), logFile: path.join(reportDir, kind + '.log') });
    save();
    console.log('[mcp-calibration] Running ' + kind + '; diagnostics: ' + entry.logFile);
    try {
      const result = run(cli, args, env, entry.logFile);
      entry.process = { exitCode: result?.status ?? null, signal: result?.signal ?? null, error: result?.error?.message || null };
      let accepted, reportError;
      try {
        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        accepted = kind === 'unit' ? summarizeUnit(report, selection.unit) : summarizeBrowser(report, selection.browser);
      } catch (error) { reportError = error.message; }
      if (reportError) entry.reportError = reportError;
      if (entry.process.error || entry.process.exitCode !== 0 || entry.process.signal) throw new Error('Calibration ' + kind + ' process failed: ' + (entry.process.error || 'exit ' + entry.process.exitCode + (entry.process.signal ? ', signal ' + entry.process.signal : '')));
      if (reportError) throw new Error(reportError);
      Object.assign(entry, accepted, { status: 'passed' });
    } catch (error) {
      entry.status = 'failed'; entry.error = error.message; throw error;
    } finally { entry.finishedAt = new Date().toISOString(); save(); }
  };
  save();
  try {
    // A runner that emits no report must never inherit an earlier success.
    for (const name of ['unit.json', 'browser.json', 'unit.log', 'browser.log']) {
      const file = path.join(reportDir, name); if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    validateManifest(selection);
    if (!Array.isArray(selection.identityInputs) || !selection.identityInputs.length || selection.identityInputs.some(input => typeof input !== 'string' || !input) || new Set(selection.identityInputs).size !== selection.identityInputs.length)
      throw new Error('Missing or invalid calibration identity inputs');
    summary.identity.before = capture();
    save();
    if (Object.values(summary.identity.before.inputSha256).some(hash => hash === null)) throw new Error('A required calibration input is missing');
    if (!summary.identity.before.gitHead) throw new Error('Calibration Git revision could not be verified before the run');
    if (selection === manifest && JSON.stringify(JSON.parse(fs.readFileSync(path.join(ROOT, 'dev-tools/mcp_calibration_validation.json'), 'utf8'))) !== JSON.stringify(manifest))
      throw new Error('Suite manifest changed before calibration started');
    phase('unit', 'node_modules/vitest/vitest.mjs', ['run', ...selection.unit, '--pool=threads', '--maxWorkers=1', '--allowOnly=false', '--retry=0', '--testTimeout=360000', '--reporter=dot', '--reporter=json', '--outputFile=' + path.join(reportDir, 'unit.json')], {});
    phase('browser', 'node_modules/@playwright/test/cli.js', ['test', ...selection.browser, '--project=chromium', '--forbid-only', '--workers=1', '--retries=0', '--reporter=line,json', '--output=' + path.join(reportDir, 'browser-artifacts')], { PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(reportDir, 'browser.json') });
  } catch (error) { summary.error = error.message; }
  finally {
    try {
      summary.identity.after = capture();
      if (summary.identity.before) {
        Object.assign(summary.identity, compareIdentity(summary.identity.before, summary.identity.after));
        if (summary.identity.changedInputs.length || summary.identity.toolsChanged || summary.identity.gitHeadChanged)
          summary.error = [summary.error, 'Calibration inputs, tools or revision changed during the run'].filter(Boolean).join('; ');
        if (!summary.identity.gitHeadVerified)
          summary.error = [summary.error, 'Calibration Git revision could not be verified for the run'].filter(Boolean).join('; ');
      }
    } catch (error) { summary.error = [summary.error, 'Final identity capture failed: ' + error.message].filter(Boolean).join('; '); }
    summary.status = summary.error ? 'failed' : 'passed';
    if (summary.status === 'passed') summary.testsPassed = summary.phases.unit.passed + summary.phases.browser.passed;
    summary.finishedAt = new Date().toISOString(); save();
  }
  if (summary.status !== 'passed') throw new Error(summary.error);
  console.log('[mcp-calibration] ' + summary.testsPassed + ' tests passed; no skipped or retried tests; calibration inputs unchanged.');
  return summary;
}

function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--list') { validateManifest(manifest); console.log(JSON.stringify(manifest, null, 2)); return; }
  if (args.length && (args.length !== 2 || args[0] !== '--report-dir' || !args[1])) throw new Error('Usage: mcp_calibration_validation.cjs [--list | --report-dir PATH]');
  return executeCalibration({ reportDir: path.resolve(ROOT, args[1] || 'test-results/mcp-calibration') });
}
module.exports = { manifest, executeCalibration, main };
if (require.main === module) {
  try { main(); } catch (error) { console.error('[mcp-calibration] ' + error.message); process.exitCode = 1; }
}
