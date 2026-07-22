#!/usr/bin/env node
// Learning Lab full-suite gate runner.
//
// Why this exists: vitest's --reporter=json can emit its report while worker
// processes are still finishing under load ("Some tests are still running when
// generating the JSON report"), producing passed < total with failed == 0 —
// which looks like a regression but is a reporter race. The default reporter's
// final summary is written after all workers settle, so this script runs the
// suite with the default reporter and parses that summary instead.
//
// Usage: node dev-tools/run_learning_lab_gate.cjs [maxWorkers]
// Default 4 workers; pass 2 (or 1) when the machine is under memory pressure —
// vitest workers can die with "Zone Allocation failed" when free RAM is low,
// which shows up as passed < total with worker errors. Exits 0 only when every
// discovered test passed (no failed, no unaccounted).

const { spawnSync } = require('child_process');

const workers = Math.max(1, parseInt(process.argv[2], 10) || 4);
const result = spawnSync('npx', ['vitest', 'run', 'learning_lab_', '--maxWorkers=' + workers], {
  cwd: process.cwd(),
  shell: true,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024
});

const output = (result.stdout || '') + '\n' + (result.stderr || '');
const strip = output.replace(/\[[0-9;]*m/g, '');

const filesMatch = strip.match(/Test Files\s+(\d+) passed \((\d+)\)/);
const testsMatch = strip.match(/Tests\s+(\d+) passed(?: \| (\d+) [a-z]+)? \((\d+)\)/);
const failedMatch = strip.match(/(\d+) failed/);

if (!filesMatch || !testsMatch) {
  console.error('GATE ERROR: could not parse the vitest summary. Last output lines:');
  console.error(strip.split('\n').slice(-25).join('\n'));
  process.exit(2);
}

const filesPassed = Number(filesMatch[1]);
const filesTotal = Number(filesMatch[2]);
const testsPassed = Number(testsMatch[1]);
const testsTotal = Number(testsMatch[3]);
const failed = failedMatch ? Number(failedMatch[1]) : 0;

console.log('Learning Lab gate: files ' + filesPassed + '/' + filesTotal + ', tests ' + testsPassed + '/' + testsTotal + (failed ? ', FAILED ' + failed : ''));

if (failed > 0 || filesPassed !== filesTotal || testsPassed !== testsTotal) {
  console.error('GATE FAILED. Failing output:');
  const failLines = strip.split('\n').filter(function(line) { return /FAIL|×|AssertionError/.test(line); }).slice(0, 40);
  console.error(failLines.join('\n') || strip.split('\n').slice(-30).join('\n'));
  process.exit(1);
}

console.log('GATE PASSED.');
process.exit(0);
