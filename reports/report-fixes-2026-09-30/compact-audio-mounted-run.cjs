'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process'), assert = require('node:assert/strict');
const dir = 'reports/report-fixes-2026-09-30/', root = process.cwd();
const suites = ['tests/report_compact_audio_ui.test.js', 'tests/report_reader_glossary_parity.test.js'];
const { INPUTS } = require('../../dev-tools/lib/reader_compiler.cjs');
const inputs = [...new Set([...INPUTS, ...suites, 'tests/setup.js', 'vitest.config.js', 'AlloFlowANTI.txt', 'text_utility_helpers_source.jsx', 'text_utility_helpers_module.js', 'view_simplified_module.js', 'text_pipeline_helpers_module.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'desktop/web-app/public/view_simplified_module.js', 'desktop/web-app/public/text_utility_helpers_module.js', 'dev-tools/lib/reader_compiler.cjs', dir + 'compact-audio-mounted-run.cjs'])];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const before = Object.fromEntries(inputs.map(file => [file, hash(file)]));
assert.equal(before['view_simplified_source.jsx'], '9237d2815e76a2e881e616fcf187904c7885e758d02114798b6985fed3aa024b');
assert.equal(before['text_utility_helpers_source.jsx'], '6e3295ec4a7c662347d57ed2b6996fdf676066b09c288a2e92c12a240ae925ee');
const build = JSON.parse(fs.readFileSync(dir + 'build-reader.json', 'utf8'));
for (const item of build.modules) {
  assert.equal(item.sha256, before[item.output]);
  assert.equal(before[item.output], before['desktop/web-app/public/' + item.output]);
  for (const [file, digest] of Object.entries(item.inputs)) assert.equal(before[file], digest);
}
const args = ['node_modules/vitest/vitest.mjs', 'run', ...suites, '--maxWorkers=1', '--pool=threads', '--testTimeout=30000', '--hookTimeout=180000', '--reporter=default', '--reporter=json', '--outputFile=' + dir + 'compact-audio-mounted-candidate-tests.json'];
const result = { started: new Date().toISOString(), command: [process.execPath, ...args], inputHashes: before, frozenBuild: build.modules, status: 'running' };
const run = cp.spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', timeout: 600000 });
result.exitCode = run.status; result.error = run.error?.message; result.changedInputs = inputs.filter(file => hash(file) !== before[file]); result.completed = new Date().toISOString();
const counts = JSON.parse(fs.readFileSync(dir + 'compact-audio-mounted-candidate-tests.json', 'utf8'));
result.counts = { passed: counts.numPassedTests, failed: counts.numFailedTests, skipped: counts.numPendingTests, total: counts.numTotalTests };
result.suites = counts.testResults.map(suite => ({ file: path.relative(root, suite.name).replaceAll('\\', '/'), passed: suite.assertionResults.filter(test => test.status === 'passed').length, failed: suite.assertionResults.filter(test => test.status === 'failed').length, skipped: suite.assertionResults.filter(test => test.status === 'pending' || test.status === 'skipped').length }));
result.status = run.status === 0 && counts.success && counts.numPassedTests === 38 && counts.numFailedTests === 0 && counts.numPendingTests === 0 && !result.changedInputs.length ? 'passed' : 'failed';
fs.writeFileSync(dir + 'compact-audio-mounted-candidate-validation.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, ...result.counts, changedInputs: result.changedInputs }));
process.exitCode = result.status === 'passed' ? 0 : 1;
