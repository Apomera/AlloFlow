'use strict';
const fs = require('node:fs'), path = require('node:path');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name)));
const initial = read('native-unit-results.json'), rerun = read('comparison-rerun-results.json');
const before = read('native-unit-receipt.json'), after = read('comparison-rerun-receipt.json');
if (!after.successful || !rerun.success || rerun.numFailedTests !== 0 || rerun.numPendingTests !== 0) throw Error('Isolated comparison run has not passed');
if (before.sourceSha256 !== after.sourceSha256 || JSON.stringify(before.runtimeBefore) !== JSON.stringify(before.runtimeAfter) || JSON.stringify(before.runtimeAfter) !== JSON.stringify(after.runtimeBefore) || JSON.stringify(after.runtimeBefore) !== JSON.stringify(after.runtimeAfter)) throw Error('Runtime changed between test runs');
if (JSON.stringify(before.testsBefore) !== JSON.stringify(before.testsAfter) || JSON.stringify(after.testsBefore) !== JSON.stringify(after.testsAfter)) throw Error('Test source changed during a run');
for (const stamp of after.testsBefore) if (before.testsBefore.find(item => item.file === stamp.file)?.sha256 !== stamp.sha256) throw Error('Retried test source changed');
const passed = initial.testResults.filter(suite => suite.status === 'passed');
const suites = [...passed, ...rerun.testResults];
if (passed.length !== 6 || suites.length !== 7 || new Set(suites.map(suite => suite.name)).size !== 7 || suites.some(suite => suite.status !== 'passed' || suite.assertionResults.some(test => test.status !== 'passed'))) throw Error('All seven distinct suites must pass');
const count = suites.reduce((sum, suite) => sum + suite.assertionResults.length, 0);
if (count !== before.passed + after.passed || count !== 113) throw Error('Regression totals differ');
const results = { success: true, aggregated: true, numTotalTests: count, numPassedTests: count, numFailedTests: 0, numPendingTests: 0, testResults: suites };
const receipt = { sourceSha256: after.sourceSha256, aggregated: true, successful: true, exitCode: 0,
  startedAt: before.startedAt, completedAt: after.completedAt, passed: count, failed: 0, skipped: 0,
  runtimeBefore: before.runtimeBefore, runtimeAfter: after.runtimeAfter, testsBefore: before.testsBefore, testsAfter: before.testsAfter,
  runs: ['unit-runs/native-unit-receipt.json', 'unit-runs/comparison-rerun-receipt.json'],
  note: 'Six suites passed in the full run. The unchanged comparison suite passed separately after its first setup timeout.' };
fs.writeFileSync(path.join(__dirname, 'aggregate-unit-results.json'), JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'aggregate-unit-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ successful: true, suites: suites.length, passed: count }));
