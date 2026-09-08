const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const reports = [
  'reports/document-remediation-enhancements-2026-09-07/root-regression.json',
  'reports/document-remediation-enhancements-2026-09-07/review-evidence-tests.json',
  'reports/document-remediation-improvements-2026-09-07/core/calibration-tests.json',
  'reports/document-remediation-improvements-2026-09-07/core/review-helper-tests.json',
  'reports/document-remediation-improvements-2026-09-07/core/workbench-evidence-tests.json',
  'reports/document-remediation-enhancements-2026-09-07/benchmark/tests-after-ui.json',
];
const suites = new Map();
for (const report of reports) {
  const data = JSON.parse(fs.readFileSync(path.join(root, report), 'utf8'));
  for (const suite of data.testResults) suites.set(path.relative(root, suite.name).replace(/\\/g, '/'), {
    file: path.relative(root, suite.name).replace(/\\/g, '/'), report,
    passed: suite.assertionResults.filter(test => test.status === 'passed').length,
    failed: suite.assertionResults.filter(test => test.status === 'failed').length,
    skipped: suite.assertionResults.filter(test => !['passed', 'failed'].includes(test.status)).length,
  });
}
const files = [...suites.values()];
const summary = { description: 'Latest scoped result per test file across separate focused invocations; browser and MCP evidence reported separately.',
  files: files.length, passed: files.reduce((n, suite) => n + suite.passed, 0), failed: files.reduce((n, suite) => n + suite.failed, 0), skipped: files.reduce((n, suite) => n + suite.skipped, 0), results: files };
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ files: summary.files, passed: summary.passed, failed: summary.failed, skipped: summary.skipped }));
if (summary.failed || summary.skipped) process.exitCode = 1;

