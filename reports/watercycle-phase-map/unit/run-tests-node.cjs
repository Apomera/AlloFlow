'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const repo = process.env.WC_REPO || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sourceSha256 = process.argv[2], label = process.argv[3] || 'unit-final';
if (!/^[a-f0-9]{64}$/.test(sourceSha256 || '') || !/^[a-z0-9-]+$/.test(label)) throw Error('Expected runtime hash and safe output label required');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const stamp = (directory, files) => files.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(directory, file))) }));
const files = ['tests/watercycle_phase_map.test.js', 'tests/watercycle_process_compare.test.js', 'tests/watercycle_matter_energy.test.js'];
const runtimeFiles = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const helperFiles = ['tests/helpers/stem_widgets_smoke_harness.js'];
const supportFiles = []; // These model tests use fallback copy and load no shared translations.
const executionFiles = ['run-tests-node.cjs', 'phase-vitest.config.mjs', 'ssr-node-setup.mjs'];
const runtimeBefore = stamp(repo, runtimeFiles), testsBefore = stamp(repo, files), helpersBefore = stamp(repo, helperFiles);
const supportBefore = stamp(repo, supportFiles), executionInputsBefore = stamp(__dirname, executionFiles);
if (runtimeBefore.some(stamp => stamp.sha256 !== sourceSha256)) throw Error('Installed runtime copies differ from authorized candidate');
const output = path.join(__dirname, label + '-results.json');
const log = path.join(__dirname, label + '-run.log');
const receiptFile = path.join(__dirname, label + '-receipt.json');
if ([output, log, receiptFile].some(file => fs.existsSync(file))) throw Error('Fresh evidence outputs required');
const startedAt = new Date().toISOString(), stream = fs.createWriteStream(log, { flags: 'wx' });
const configFile = path.join(__dirname, 'phase-vitest.config.mjs');
const args = [path.join(repo, 'node_modules/vitest/vitest.mjs'), 'run', ...files,
  '--pool=forks', '--configLoader=native', '--config=' + configFile,
  '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=120000', '--hookTimeout=120000',
  '--reporter=default', '--reporter=json', '--outputFile=' + output];
const errors = [];
const child = spawn(process.execPath, args, { cwd: repo, windowsHide: true, env: { ...process.env, WATER_CYCLE_PHASE_MAP_LOADED_REPORT: path.join(__dirname, label + '-phase-map-loaded.json') } });
for (const pipe of [child.stdout, child.stderr]) pipe.on('data', bytes => { stream.write(bytes); process.stdout.write(bytes); });
child.on('error', error => errors.push('Test process: ' + String(error)));
child.on('close', (exitCode, signal) => {
  let results = null;
  try { if (fs.existsSync(output)) results = JSON.parse(fs.readFileSync(output, 'utf8')); } catch (error) { errors.push('JSON results: ' + String(error)); }
  const runtimeAfter = stamp(repo, runtimeFiles), testsAfter = stamp(repo, files), helpersAfter = stamp(repo, helperFiles);
  const supportAfter = stamp(repo, supportFiles), executionInputsAfter = stamp(__dirname, executionFiles);
  for (const [name, before, after] of [['runtime', runtimeBefore, runtimeAfter], ['tests', testsBefore, testsAfter], ['helpers', helpersBefore, helpersAfter], ['support', supportBefore, supportAfter], ['runner/config/setup', executionInputsBefore, executionInputsAfter]]) {
    if (JSON.stringify(before) !== JSON.stringify(after)) errors.push('Changed inputs: ' + name);
  }
  const assertions = results?.testResults?.flatMap(suite => suite.assertionResults) || [];
  const successful = exitCode === 0 && !signal && !errors.length && results?.success === true
    && results.numTotalTests > 0 && results.numPassedTests === results.numTotalTests
    && results.numFailedTests === 0 && results.numPendingTests === 0 && !results.numTodoTests
    && results.testResults.length === 3 && results.testResults.every(suite => suite.status === 'passed' && suite.assertionResults.length > 0)
    && assertions.length === results.numTotalTests && assertions.every(test => test.status === 'passed')
    && new Set(assertions.map(test => test.fullName)).size === assertions.length;
  const inputHash = filename => executionInputsBefore.find(input => input.file === filename).sha256;
  const afterHash = filename => executionInputsAfter.find(input => input.file === filename).sha256;
  const receipt = {
    sourceSha256, files, startedAt, completedAt: new Date().toISOString(), exitCode, signal, errors,
    environment: 'node', pool: 'forks', configLoader: 'native', nodeVersion: process.version,
    configFile: path.basename(configFile), configSha256: inputHash('phase-vitest.config.mjs'), finalConfigSha256: afterHash('phase-vitest.config.mjs'),
    runnerFile: path.basename(__filename), runnerSha256: inputHash('run-tests-node.cjs'), finalRunnerSha256: afterHash('run-tests-node.cjs'),
    setupFile: 'ssr-node-setup.mjs', setupSha256: inputHash('ssr-node-setup.mjs'), finalSetupSha256: afterHash('ssr-node-setup.mjs'),
    runtimeBefore, runtimeAfter, testsBefore, testsAfter, helpersBefore, helpersAfter, supportBefore, supportAfter,
    executionInputsBefore, executionInputsAfter,
    resultFile: path.basename(output), resultSha256: fs.existsSync(output) ? hash(fs.readFileSync(output)) : null,
    successful, total: results?.numTotalTests ?? 0, passed: results?.numPassedTests ?? 0,
    failed: results?.numFailedTests ?? 0, skipped: results?.numPendingTests ?? 0,
    assertionCount: assertions.length, suiteCount: results?.testResults?.length ?? 0,
  };
  stream.end(() => {
    receipt.logFile = path.basename(log); receipt.logSha256 = hash(fs.readFileSync(log));
    fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(receipt));
    if (!successful) process.exitCode = 1;
  });
});
