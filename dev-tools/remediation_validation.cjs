#!/usr/bin/env node
'use strict';
// One fail-closed selection for local and CI remediation validation.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const manifest = require('./remediation_validation.json');
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
  if (!report.success || report.numFailedTests || report.numPendingTests || report.numTodoTests || report.numFailedTestSuites) throw new Error('Unit validation failed or skipped tests');
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

function main(args = process.argv.slice(2)) {
  validateManifest();
  if (args.length === 1 && args[0] === '--list') { console.log(JSON.stringify(manifest, null, 2)); return; }
  if (args.length && (args.length !== 2 || args[0] !== '--report-dir' || !args[1])) throw new Error('Usage: remediation_validation.cjs [--list | --report-dir PATH]');
  const reportDir = path.resolve(ROOT, args[1] || 'test-results/remediation-validation');
  fs.mkdirSync(reportDir, { recursive: true });
  const unitReport = path.join(reportDir, 'unit.json'), browserReport = path.join(reportDir, 'browser.json');
  const summaryFile = path.join(reportDir, 'summary.json');
  // A failed repeat must not leave a previous success summary behind.
  for (const file of [unitReport, browserReport, summaryFile]) if (fs.existsSync(file)) fs.unlinkSync(file);
  function run(cli, args, env = {}) {
    if (!fs.existsSync(path.join(ROOT, cli))) throw new Error('Required runner is missing: ' + cli);
    const result = spawnSync(process.execPath, [path.join(ROOT, cli), ...args], {
      cwd: ROOT, stdio: 'inherit', shell: false, env: { ...process.env, ...env },
    });
    if (result.error || result.status !== 0) throw new Error('Validation command failed: ' + cli + (result.error ? ': ' + result.error.message : ' (exit ' + result.status + ')'));
  }
  run('node_modules/vitest/vitest.mjs', ['run', ...manifest.unit, '--maxWorkers=2', '--allowOnly=false', '--testTimeout=30000', '--reporter=json', '--outputFile=' + unitReport]);
  const unit = summarizeUnit(JSON.parse(fs.readFileSync(unitReport, 'utf8')));
  run('node_modules/@playwright/test/cli.js', ['test', ...manifest.browser, '--project=chromium', '--forbid-only', '--retries=0', '--workers=2', '--reporter=line,json', '--output=' + path.join(reportDir, 'browser-artifacts')], {
    PLAYWRIGHT_JSON_OUTPUT_NAME: browserReport,
  });
  const browser = summarizeBrowser(JSON.parse(fs.readFileSync(browserReport, 'utf8')));
  const summary = { status: 'passed', verifiedAt: new Date().toISOString(), unit, browser, testsPassed: unit.passed + browser.passed };
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2) + '\n');
  console.log('[remediation-validation] ' + summary.testsPassed + ' tests passed; no skipped or retried tests.');
}

module.exports = { manifest, validateManifest, summarizeUnit, summarizeBrowser, main };
if (require.main === module) {
  try { main(); } catch (error) { console.error('[remediation-validation] ' + error.message); process.exitCode = 1; }
}
