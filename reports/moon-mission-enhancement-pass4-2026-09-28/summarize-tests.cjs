const fs = require('node:fs');
const path = require('node:path');
const folder = __dirname;
const inputs = ['focused-launch-units.json', 'focused-launch-reset-rerun.json', 'remaining-unit-tests.json', 'remaining-worker-rerun.json'];
const cases = new Map();
for (const input of inputs) {
  const report = JSON.parse(fs.readFileSync(path.join(folder, input), 'utf8'));
  for (const file of report.testResults) {
    const occurrences = new Map();
    for (const test of file.assertionResults) {
      const occurrence = occurrences.get(test.fullName) || 0;
      occurrences.set(test.fullName, occurrence + 1);
      if (test.status !== 'passed' && test.status !== 'failed') continue;
      const name = path.basename(file.name);
      cases.set(name + '\0' + test.fullName + '\0' + occurrence, { file: name, name: test.fullName, occurrence, status: test.status, failureMessages: test.failureMessages, source: input });
    }
  }
}
const expected = fs.readdirSync(path.join(process.cwd(), 'tests')).filter(name => /^moon.*\.test\.js$/.test(name));
const results = [...cases.values()];
const covered = new Set(results.map(test => test.file));
const missing = expected.filter(name => !covered.has(name));
const failed = results.filter(test => test.status === 'failed');
const summary = { kind: 'combined regression, replacing the corrected reset timeout and three worker-startup failures with their focused reruns', sources: inputs,
  numTestFiles: covered.size, numTotalTests: results.length, numPassedTests: results.length - failed.length, numFailedTests: failed.length,
  missingFiles: missing, success: failed.length === 0 && missing.length === 0, tests: results };
fs.writeFileSync(path.join(folder, 'full-unit-tests.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, tests: undefined }, null, 2));
if (failed.length) console.log(JSON.stringify(failed, null, 2));
if (!summary.success) process.exitCode = 1;
