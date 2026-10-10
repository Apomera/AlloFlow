'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const expected = process.argv[2];
const runLabel = process.argv[3] || "unit";
if (!/^[a-z0-9-]+$/.test(runLabel)) throw Error("Invalid run label");
const allFiles = ['tests/watercycle_land_cutaway.test.js', 'tests/watercycle_land_surface.test.js',
  'tests/watercycle_conditions_clarity.test.js', 'tests/watercycle_comparison_clarity.test.js',
  'tests/watercycle_next_experiment.test.js', 'tests/watercycle_baseline_restore.test.js', 'tests/watercycle_auto_baseline.test.js'];
const files = process.argv[4] === 'comparison-only' ? ['tests/watercycle_comparison_clarity.test.js'] : allFiles;
const runtimeFiles = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const stamp = names => names.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(repo, file))) }));
const runtimeBefore = stamp(runtimeFiles), testsBefore = stamp(files);
if (!/^[a-f0-9]{64}$/.test(expected || '') || runtimeBefore.some(file => file.sha256 !== expected)) throw Error('Installed source differs from expected');
const output = path.join(__dirname, runLabel + '-results.json');
if (fs.existsSync(output)) throw Error('Fresh test output required; preserve earlier results');
const startedAt = new Date().toISOString();
const child = spawnSync(process.execPath, [path.join(repo, 'node_modules/vitest/vitest.mjs'), 'run', ...files,
  '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=120000', '--hookTimeout=120000',
  '--reporter=default', '--reporter=json', '--outputFile=' + output], { cwd: repo, windowsHide: true, encoding: 'utf8', maxBuffer: 5e6 });
fs.writeFileSync(path.join(__dirname, runLabel + '-run.log'), (child.stdout || '') + (child.stderr || ''));
const report = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output)) : null;
const runtimeAfter = stamp(runtimeFiles), testsAfter = stamp(files);
const receipt = { sourceSha256: expected, startedAt, completedAt: new Date().toISOString(), exitCode: child.status,
  files,
  runtimeBefore, runtimeAfter, testsBefore, testsAfter, successful: child.status === 0 && report?.success === true,
  passed: report?.numPassedTests, failed: report?.numFailedTests, skipped: report?.numPendingTests };
if (JSON.stringify(runtimeBefore) !== JSON.stringify(runtimeAfter) || JSON.stringify(testsBefore) !== JSON.stringify(testsAfter)) throw Error('Inputs changed during tests');
fs.writeFileSync(path.join(__dirname, runLabel + '-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (!receipt.successful) process.exitCode = 1;
