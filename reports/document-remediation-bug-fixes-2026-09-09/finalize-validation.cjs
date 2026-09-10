'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const unitReports = ['live/vitest.json', 'live/vitest-final.json', 'integration-tests.json', 'rendered/final-unit.json', 'export/inspection-failure-tests.json'];
const unitFiles = new Map();
// Use the final report for each file. The initial live run's one corrected
// positive fixture is superseded by the full final run of that test file.
for (const report of unitReports) for (const result of read(report).testResults) unitFiles.set(result.name, { report, result });
const units = [...unitFiles].map(([file, { report, result }]) => {
  if (!result.assertionResults.length || result.assertionResults.some(test => test.status !== 'passed')) throw Error('Unit tests incomplete: ' + file);
  return { file: path.relative(root, file).replace(/\\/g, '/'), report, passed: result.assertionResults.length };
});
const browserReports = ['rendered/final-browser.json', 'export/review-fix-final-tests.json'];
const browserTests = new Map(), browsers = [];
function specs(suite) { return [...(suite.specs || []), ...(suite.suites || []).flatMap(specs)]; }
for (const report of browserReports) {
  const result = read(report);
  if (result.errors?.length || result.stats.unexpected || result.stats.flaky || result.stats.skipped) throw Error('Browser report incomplete: ' + report);
  let count = 0;
  for (const spec of specs(result)) for (const test of spec.tests) {
    if (test.status !== 'expected' || test.results.length !== 1 || test.results[0].status !== 'passed') throw Error('Browser test did not pass directly: ' + spec.title);
    browserTests.set(spec.id + ':' + test.projectId, { file: spec.file, title: spec.title });
    count++;
  }
  if (count !== result.stats.expected) throw Error('Browser count mismatch: ' + report);
  browsers.push({ report, passed: count, skipped: 0, retries: 0 });
}
const closure = read('original-cases-results.json');
if (!closure.passed || closure.caseCount !== 18 || !closure.originalEvidenceUnchanged || !closure.implementationUnchangedDuringRun) throw Error('Original review cases not closed');
for (const [file, expected] of Object.entries(closure.implementationHashes)) if (hash(file) !== expected) throw Error('Implementation changed after closure: ' + file);
const moduleHash = hash('doc_pipeline_module.js');
if (moduleHash !== hash('desktop/web-app/public/doc_pipeline_module.js')) throw Error('Generated module mirror mismatch');
const mcp = read('mcp-selftest/benchmark-report.json');
const trial = mcp.trials[0];
if (mcp.interruption || mcp.trials.length !== 1 || !trial.passed || trial.exitCode !== 0 || trial.versions.sourceDrift
  || trial.versions.promptBundleSha256 !== hash('doc_pipeline_source.jsx')) throw Error('MCP validation incomplete or stale');
const unitCount = units.reduce((sum, file) => sum + file.passed, 0);
const summary = { measuredAt: new Date().toISOString(), policyVersion: closure.policyVersion,
  issuesClosed: 13, originalReviewCasesPassed: closure.caseCount, originalEvidenceUnchanged: true,
  distinctTestsPassed: unitCount + browserTests.size, unitTestsPassed: unitCount, browserTestsPassed: browserTests.size,
  unitFiles: units, browserReports: browsers, generatedModulesMatch: true, implementationHashes: closure.implementationHashes,
  mcp: { passed: true, durationMs: trial.durationMs, scriptedModelCalls: trial.metrics.calls, sourceDrift: false,
    report: 'mcp-selftest/benchmark-report.json' },
  originalCasesReport: 'original-cases-results.json',
  humanValidation: 'not-run', liveModelCalls: 0, deployment: 'not-run',
  limitations: ['Validation uses synthetic local fixtures and scripted model transport.', 'Optional rendered checks assess authored checkpoints, not whole-document or human screen-reader acceptance.'] };
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ issuesClosed: summary.issuesClosed, originalReviewCasesPassed: summary.originalReviewCasesPassed,
  distinctTestsPassed: summary.distinctTestsPassed, unitTestsPassed: unitCount, browserTestsPassed: browserTests.size,
  generatedModulesMatch: true, mcp: summary.mcp }, null, 2));
