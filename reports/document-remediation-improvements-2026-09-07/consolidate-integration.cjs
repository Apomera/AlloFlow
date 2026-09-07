const fs = require('node:fs');
const path = require('node:path');
const inputs = ['focused-final-tests.json', 'integration-followup-tests.json', 'ocr-edge-tests.json', 'final-build-tests.json'];
const latest = new Map();
for (const input of inputs) {
  const report = JSON.parse(fs.readFileSync(path.join(__dirname, input), 'utf8'));
  for (const file of report.testResults) latest.set(file.name.replace(/\\/g, '/'), { ...file, sourceReport: input });
}
const files = [...latest.values()].sort((a, b) => a.name.localeCompare(b.name));
const assertions = files.flatMap(file => file.assertionResults);
const failedFiles = files.filter(file => file.status !== 'passed');
const failedAssertions = assertions.filter(test => test.status !== 'passed');
const output = {
  note: 'Consolidated latest result per file across the broad run and isolated/final-build reruns; not a single Vitest invocation.',
  sourceReports: inputs, files: files.length, assertions: assertions.length,
  passedAssertions: assertions.filter(test => test.status === 'passed').length,
  failedFiles: failedFiles.map(file => file.name),
  nonPassingAssertions: failedAssertions.map(test => ({ name: test.fullName, status: test.status })),
  resolvedRunIssues: [
    'A learner annotation confirmation test timed out in the parallel run; the complete file passed in isolation.',
    'The broad worker report omitted ocr_page_edge_artifacts; all 12 assertions passed in its isolated run.'
  ],
  fileResults: files.map(file => ({ file: file.name, status: file.status, assertions: file.assertionResults.length, sourceReport: file.sourceReport }))
};
fs.writeFileSync(path.join(__dirname, 'integration-summary.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ files: output.files, assertions: output.assertions, passedAssertions: output.passedAssertions, failedFiles: output.failedFiles, nonPassingAssertions: output.nonPassingAssertions }));
if (failedFiles.length || failedAssertions.length) process.exitCode = 1;
