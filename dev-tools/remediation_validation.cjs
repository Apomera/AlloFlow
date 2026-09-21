#!/usr/bin/env node
'use strict';
// One fail-closed selection for local and CI remediation validation.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const manifest = require('./remediation_validation.json');
const { captureIdentity, compareIdentity } = require('./remediation_validation_identity.cjs');
const { randomUUID } = require('node:crypto');
const relative = name => path.relative(ROOT, path.resolve(ROOT, name)).replace(/\\/g, '/');

function validateManifest(selection = manifest) {
  for (const kind of ['unit', 'browser']) {
    const files = selection[kind];
    if (!Array.isArray(files) || !files.length || new Set(files).size !== files.length) throw new Error('Invalid ' + kind + ' suite selection');
    for (const file of files) {
      if (relative(file) !== file || !file.startsWith('tests/') || !file.endsWith(kind === 'unit' ? '.test.js' : '.spec.ts') || !fs.existsSync(path.join(ROOT, file)))
        throw new Error('Missing or invalid suite: ' + file);
    }
  }
}

function summarizeUnit(report, expected = manifest.unit) {
  const results = report.testResults || [];
  const actual = new Set(results.map(item => relative(item.name)));
  let passed = 0;
  for (const file of expected) if (!actual.has(file)) throw new Error('Unit suite was not run: ' + file);
  if (actual.size !== expected.length || [...actual].some(file => !expected.includes(file))) throw new Error('Unexpected unit suite selection');
  if (!report.success || report.numFailedTests || report.numPendingTests || report.numTodoTests || report.numFailedTestSuites || report.errors?.length || report.unhandledErrors?.length) throw new Error('Unit validation failed or skipped tests');
  for (const suite of results) {
    if (suite.status !== 'passed' || !suite.assertionResults?.length) throw new Error('Unit suite incomplete: ' + suite.name);
    for (const result of suite.assertionResults) {
      if (result.status !== 'passed') throw new Error('Unit test incomplete: ' + result.fullName);
      passed++;
    }
  }
  return { files: expected.length, passed };
}

function summarizeBrowser(report, expected = manifest.browser) {
  const actual = new Set();
  let passed = 0;
  function visit(suite) {
    for (const spec of suite.specs || []) {
      // Playwright reports paths relative to config.testDir.
      const file = spec.file.replace(/\\/g, '/');
      actual.add(file.startsWith('tests/') ? file : 'tests/e2e/' + file);
      if (!spec.tests?.length) throw new Error('Browser spec has no results: ' + spec.title);
      for (const test of spec.tests) {
        if (test.expectedStatus !== 'passed' || test.status !== 'expected' || test.results?.length !== 1 || test.results[0].status !== 'passed')
          throw new Error('Browser test failed, skipped, or retried: ' + spec.title);
        passed++;
      }
    }
    for (const child of suite.suites || []) visit(child);
  }
  for (const suite of report.suites || []) visit(suite);
  for (const file of expected) if (!actual.has(file)) throw new Error('Browser suite was not run: ' + file);
  if (actual.size !== expected.length || [...actual].some(file => !expected.includes(file))) throw new Error('Unexpected browser suite selection');
  if (!passed || report.errors?.length || report.stats?.unexpected || report.stats?.skipped || report.stats?.flaky) throw new Error('Browser validation incomplete');
  return { files: expected.length, passed };
}

// Diagnostics describe what was collected independently of strict acceptance.
function phaseDiagnostics(kind, report, expected) {
  const files = new Set(), counts = Object.create(null), failures = [];
  const count = status => { const key = typeof status === 'string' ? status : 'unknown'; counts[key] = (counts[key] || 0) + 1; };
  if (kind === 'unit') {
    for (const suite of report.testResults || []) {
      const file = relative(suite.name); files.add(file);
      for (const result of suite.assertionResults || []) count(result.status);
      if (suite.status !== 'passed' || suite.message) failures.push({ file, status: suite.status, message: suite.message || '', assertionFailures: (suite.assertionResults || []).flatMap(result => result.failureMessages || []) });
    }
  } else {
    const visit = suite => {
      for (const spec of suite.specs || []) {
        const file = spec.file.replace(/\\/g, '/'); files.add(file.startsWith('tests/') ? file : 'tests/e2e/' + file);
        for (const test of spec.tests || []) {
          count(test.status);
          if (test.status !== 'expected' || test.expectedStatus !== 'passed' || test.results?.length !== 1 || test.results[0].status !== 'passed')
            failures.push({ file, title: spec.title, status: test.status, expectedStatus: test.expectedStatus, results: (test.results || []).map(result => ({ status: result.status, retry: result.retry, errors: result.errors || (result.error ? [result.error] : []) })) });
        }
      }
      for (const child of suite.suites || []) visit(child);
    };
    for (const suite of report.suites || []) visit(suite);
  }
  return { expectedFiles: expected.length, collectedFiles: files.size, missingSuites: expected.filter(file => !files.has(file)), unexpectedSuites: [...files].filter(file => !expected.includes(file)), assertionStatuses: counts, reportedSuccess: typeof report.success === 'boolean' ? report.success : null, failures, globalErrors: [...(report.errors || []), ...(report.unhandledErrors || [])] };
}

function runCli(cli, args, env = {}, logFile) {
  if (!fs.existsSync(path.join(ROOT, cli))) throw new Error('Required runner is missing: ' + cli);
  const log = logFile ? fs.openSync(logFile, 'w') : null;
  let result;
  try {
    result = spawnSync(process.execPath, [path.join(ROOT, cli), ...args], {
      cwd: ROOT, stdio: log === null ? 'inherit' : ['ignore', log, log], shell: false, windowsHide: true, env: { ...process.env, ...env },
    });
  } finally { if (log !== null) fs.closeSync(log); }
  if (result.error || result.status !== 0) {
    const error = new Error('Validation command failed: ' + cli + (result.error ? ': ' + result.error.message : ' (exit ' + result.status + ')'));
    error.exitCode = result.status; error.signal = result.signal; throw error;
  }
  return { exitCode: result.status, signal: result.signal };
}

function executeValidation({ reportDir, run = runCli, capture = () => captureIdentity(ROOT, [...manifest.unit, ...manifest.browser, ...manifest.identityInputs]) }) {
  fs.mkdirSync(reportDir, { recursive: true });
  const unitReport = path.join(reportDir, 'unit.json'), browserReport = path.join(reportDir, 'browser.json');
  const summaryFile = path.join(reportDir, 'summary.json');
  const summary = { runId: randomUUID(), status: 'running', startedAt: new Date().toISOString(), identityScope: 'Declared manifest inputs, selected suites, tool versions and Git HEAD', identity: {}, phases: { unit: { status: 'not-started' }, browser: { status: 'not-started' } } };
  const save = () => {
    const pending = summaryFile + '.' + summary.runId + '.tmp';
    fs.writeFileSync(pending, JSON.stringify(summary, null, 2) + '\n');
    fs.renameSync(pending, summaryFile);
  };
  const runPhase = (kind, cli, args, env = {}) => {
    const phase = summary.phases[kind], reportFile = kind === 'unit' ? unitReport : browserReport;
    Object.assign(phase, { status: 'running', startedAt: new Date().toISOString(), logFile: path.join(reportDir, kind + '.log') });
    save();
    console.log('[remediation-validation] Running ' + kind + ' phase; diagnostics: ' + phase.logFile);
    const errors = [];
    try {
      const result = run(cli, args, env, phase.logFile);
      phase.process = { exitCode: result?.exitCode ?? null, signal: result?.signal ?? null };
      if (phase.process.exitCode !== 0 || phase.process.signal) errors.push('Validation process did not exit successfully');
    } catch (error) {
      phase.process = { exitCode: error.exitCode ?? null, signal: error.signal ?? null, error: error.message };
      errors.push(error.message);
    }
    let report;
    try { report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); phase.reportStatus = 'parsed'; }
    catch (error) { phase.reportStatus = error.code === 'ENOENT' ? 'missing' : 'unreadable'; phase.reportError = error.message; errors.push('Cannot read ' + kind + ' report: ' + error.message); }
    if (phase.reportStatus === 'parsed') {
      try { phase.diagnostics = phaseDiagnostics(kind, report, manifest[kind]); }
      catch (error) { phase.diagnosticError = error.message; errors.push('Invalid ' + kind + ' report: ' + error.message); }
      try {
        const accepted = kind === 'unit' ? summarizeUnit(report) : summarizeBrowser(report);
        if (!errors.length) summary[kind] = accepted;
      } catch (error) { phase.acceptanceError = error.message; errors.push(error.message); }
    }
    phase.status = errors.length ? 'failed' : 'passed'; phase.finishedAt = new Date().toISOString();
    if (errors.length) phase.error = errors.join('; ');
    save();
    if (errors.length) throw new Error(phase.error);
  };
  // Replace an old success before setup checks, so failures remain unambiguous.
  save();
  try {
    for (const file of [unitReport, browserReport, path.join(reportDir, 'unit.log'), path.join(reportDir, 'browser.log')]) if (fs.existsSync(file)) fs.unlinkSync(file);
    summary.identity.before = capture();
    save();
    validateManifest();
    if (!Array.isArray(manifest.identityInputs) || !manifest.identityInputs.length) throw new Error('Missing validation identity inputs');
    if (!summary.identity.before.gitHead) throw new Error('Git revision is unavailable before validation');
    if (Object.values(summary.identity.before.inputSha256).some(hash => hash === null)) throw new Error('A required validation input is missing');
    if (JSON.stringify(JSON.parse(fs.readFileSync(path.join(ROOT, 'dev-tools/remediation_validation.json'), 'utf8'))) !== JSON.stringify(manifest)) throw new Error('Suite manifest changed before validation started');
    runPhase('unit', 'node_modules/vitest/vitest.mjs', ['run', ...manifest.unit, '--pool=threads', '--maxWorkers=2', '--allowOnly=false', '--testTimeout=30000', '--hookTimeout=30000', '--reporter=dot', '--reporter=json', '--outputFile=' + unitReport]);
    runPhase('browser', 'node_modules/@playwright/test/cli.js', ['test', ...manifest.browser, '--project=chromium', '--forbid-only', '--retries=0', '--workers=2', '--reporter=line,json', '--output=' + path.join(reportDir, 'browser-artifacts')], {
      PLAYWRIGHT_JSON_OUTPUT_FILE: browserReport,
    });
  } catch (error) {
    summary.error = error.message;
  } finally {
    try {
      summary.identity.after = capture();
      if (summary.identity.before) {
        Object.assign(summary.identity, compareIdentity(summary.identity.before, summary.identity.after));
        if (!summary.identity.gitHeadVerified)
          summary.error = [summary.error, 'Git revision metadata is unavailable for verification'].filter(Boolean).join('; ');
        if (summary.identity.changedInputs.length || summary.identity.toolsChanged || summary.identity.gitHeadChanged)
          summary.error = [summary.error, 'Validation inputs, tools or revision changed during the run'].filter(Boolean).join('; ');
      }
    } catch (error) { summary.error = [summary.error, 'Final identity capture failed: ' + error.message].filter(Boolean).join('; '); }
    summary.status = summary.error ? 'failed' : 'passed';
    summary.verifiedAt = new Date().toISOString();
    if (summary.status === 'passed') summary.testsPassed = summary.unit.passed + summary.browser.passed;
    save();
  }
  if (summary.status !== 'passed') throw new Error(summary.error);
  console.log('[remediation-validation] ' + summary.testsPassed + ' tests passed; no skipped or retried tests; validation inputs unchanged.');
  return summary;
}

function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--list') { validateManifest(); console.log(JSON.stringify(manifest, null, 2)); return; }
  if (args.length && (args.length !== 2 || args[0] !== '--report-dir' || !args[1])) throw new Error('Usage: remediation_validation.cjs [--list | --report-dir PATH]');
  return executeValidation({ reportDir: path.resolve(ROOT, args[1] || 'test-results/remediation-validation') });
}

module.exports = { manifest, validateManifest, summarizeUnit, summarizeBrowser, executeValidation, main };
if (require.main === module) {
  try { main(); } catch (error) { console.error('[remediation-validation] ' + error.message); process.exitCode = 1; }
}
