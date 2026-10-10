const fs = require('fs');
const path = require('path');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06/unit-main-4/results.json');
const mode = process.argv[2] || 'failures';
if (mode === 'failures') {
  const result = JSON.parse(fs.readFileSync(report, 'utf8'));
  console.log(JSON.stringify({ startTime: result.startTime, success: result.success, total: result.numTotalTests, passed: result.numPassedTests, failed: result.numFailedTests, pending: result.numPendingTests }, null, 2));
  for (const suite of result.testResults || []) {
    const cases = suite.assertionResults || [];
    const failures = cases.filter(test => test.status === 'failed');
    if (!failures.length) continue;
    console.log(JSON.stringify({ suite: suite.name, status: suite.status, startTime: suite.startTime, endTime: suite.endTime, message: suite.message }, null, 2));
    for (const failure of failures) {
      const index = cases.indexOf(failure);
      console.log(JSON.stringify({ failure, adjacent: cases.slice(Math.max(0, index - 1), index + 2).map(test => ({ fullName: test.fullName, status: test.status, duration: test.duration })) }, null, 2));
    }
  }
} else if (mode === 'lab') {
  const lines = fs.readFileSync(path.join(repo, 'tests/dissection_lab_improvements.test.js'), 'utf8').split('\n');
  console.log(lines.slice(4936, 5034).map((line, index) => (4937 + index) + ': ' + line).join('\n'));
} else if (mode === 'harness') {
  console.log(fs.readFileSync(path.join(repo, 'tests/helpers/stem_widgets_smoke_harness.js'), 'utf8'));
} else throw Error('Unknown mode');
