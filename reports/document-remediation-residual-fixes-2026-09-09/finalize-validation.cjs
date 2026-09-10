'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const unitReports = ['live/tests-final.json', 'checker-unit-final.json', 'integration-final.json', 'build-parity-verified.json'];
const unitFiles = new Map();
for (const report of unitReports) {
  const result = read(report);
  if (!Array.isArray(result.testResults) || result.numPendingTests) throw Error('Incomplete unit report: ' + report);
  for (const file of result.testResults) {
    unitFiles.set(file.name, { file: path.relative(root, file.name).replace(/\\/g, '/'), report, passed: file.assertionResults.length, complete: file.assertionResults.length > 0 && file.assertionResults.every(test => test.status === 'passed') });
  }
}
for (const file of unitFiles.values()) if (!file.complete) throw Error('Incomplete final test file: ' + file.file);
function specs(suite) { return [...(suite.specs || []), ...(suite.suites || []).flatMap(specs)]; }
const browsers = [], browserTests = new Set();
for (const report of ['rendered-final.json', 'export-final.json']) {
  const result = read(report);
  if (result.errors?.length || result.stats.unexpected || result.stats.flaky || result.stats.skipped) throw Error('Incomplete browser report: ' + report);
  let count = 0;
  for (const spec of specs(result)) for (const test of spec.tests) {
    if (test.status !== 'expected' || test.results.length !== 1 || test.results[0].status !== 'passed') throw Error('Browser test did not pass directly: ' + spec.title);
    browserTests.add(spec.id + ':' + test.projectId); count++;
  }
  if (count !== result.stats.expected) throw Error('Browser count mismatch: ' + report);
  browsers.push({ report, passed: count, retries: 0, skipped: 0 });
}
const closure = read('review-cases-results.json');
if (!closure.passed || closure.caseCount !== 35 || !closure.originalEvidenceUnchanged || !closure.implementationUnchangedDuringRun) throw Error('Review case closure incomplete');
for (const [file, expected] of Object.entries(closure.implementationHashes)) if (hash(file) !== expected) throw Error('Implementation changed after closure: ' + file);
for (const [file, expected] of Object.entries(closure.evidenceHashes)) if (hash(file) !== expected) throw Error('Previous review evidence changed: ' + file);
if (hash('doc_pipeline_module.js') !== hash('desktop/web-app/public/doc_pipeline_module.js')) throw Error('Generated modules differ');
const mcp = read('mcp-selftest/benchmark-report.json'), trial = mcp.trials[0];
if (mcp.interruption || mcp.trials.length !== 1 || !trial.passed || trial.exitCode !== 0 || trial.versions.sourceDrift
  || trial.versions.promptBundleSha256 !== hash('doc_pipeline_source.jsx')) throw Error('MCP result is incomplete or stale');
const units = [...unitFiles.values()], unitCount = units.reduce((sum, file) => sum + file.passed, 0);
const summary = { verifiedAt: new Date().toISOString(), policyVersion: closure.policyVersion,
  findingsFixed: 8, reviewCasesPassed: 35, previousEvidenceUnchanged: true,
  distinctTestsPassed: unitCount + browserTests.size, unitTestsPassed: unitCount, browserTestsPassed: browserTests.size,
  unitFiles: units, browserReports: browsers,
  generatedModulesMatch: true, implementationHashes: closure.implementationHashes,
  sharedDependencyCollector: 'dev-tools/document_html_dependencies.cjs',
  calibrationIdentityIncludesDependencies: true,
  mcp: { passed: true, durationMs: trial.durationMs, scriptedModelCalls: trial.metrics.calls, sourceDrift: false, report: 'mcp-selftest/benchmark-report.json' },
  humanValidation: 'not-run', liveModelCalls: 0, deployment: 'not-run',
  limitations: ['Synthetic fixtures and scripted model transport do not establish production or human screen-reader acceptance.', 'Occurrence evidence binds DOM text; accessible alternatives without DOM text require explicit name checkpoints.'] };
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ findingsFixed: summary.findingsFixed, reviewCasesPassed: summary.reviewCasesPassed,
  distinctTestsPassed: summary.distinctTestsPassed, unitTestsPassed: unitCount, browserTestsPassed: browserTests.size,
  generatedModulesMatch: true, mcp: summary.mcp }, null, 2));
