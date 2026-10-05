const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const phase = String(process.argv[2] || 'verification').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
const files = [
  'tests/word_sounds_delivery_roundtrip.test.js',
  'tests/word_sounds_runtime_audio_status.test.js',
  'tests/word_sounds_audio_delivery_hardening.test.js',
];
const inputs = ['live_aac_source.jsx', 'word_sounds_module.js', 'module_scope_extras_source.jsx', 'word_sounds_readiness_contract.js', ...files];
const fingerprint = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before = Object.fromEntries(inputs.map(file => [file, fingerprint(file)]));
const args = ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json'];
const startedAt = new Date().toISOString();
const child = spawn(process.execPath, args, { cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '', stderr = '';
child.stdout.on('data', data => { stdout += data; });
child.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('close', code => {
  const marker = stdout.search(/\{\s*"numTotalTestSuites"/);
  let result;
  try { result = JSON.parse(stdout.slice(marker)); } catch (_) {}
  const summary = {
    startedAt, finishedAt: new Date().toISOString(), command: [process.execPath, ...args], exitCode: code,
    success: result?.success === true && code === 0,
    tests: result ? { total: result.numTotalTests, passed: result.numPassedTests, failed: result.numFailedTests, pending: result.numPendingTests } : null,
    sourceHashes: before,
    changedDuringRun: inputs.filter(file => fingerprint(file) !== before[file]),
    failures: (result?.testResults || []).flatMap(suite => (suite.assertionResults || []).filter(test => test.status === 'failed').map(test => ({
      file: path.relative(process.cwd(), suite.name).replace(/\\/g, '/'), title: test.fullName,
      messages: (test.failureMessages || []).map(message => message.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 1600)),
    }))),
    suiteErrors: (result?.testResults || []).filter(suite => suite.message && !suite.assertionResults?.length).map(suite => ({ file: path.relative(process.cwd(), suite.name), message: suite.message.slice(0, 1600) })),
    stderr: stderr.replace(/\u001b\[[0-9;]*m/g, ''),
  };
  if (!result) summary.outputTail = stdout.slice(-4000);
  fs.writeFileSync(path.join(__dirname, phase + '.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ success: summary.success, tests: summary.tests, changedDuringRun: summary.changedDuringRun, failures: summary.failures.map(test => test.title), report: phase + '.json' }, null, 2));
  process.exitCode = summary.success && !summary.changedDuringRun.length ? 0 : (code || 1);
});
