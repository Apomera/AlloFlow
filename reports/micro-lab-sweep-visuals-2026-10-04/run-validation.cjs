const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const acorn = require('acorn');
const input = require('./validation-inputs.cjs');
const root = path.resolve(__dirname, '../..');
const folder = 'reports/micro-lab-sweep-visuals-2026-10-04';
const report = path.join(root, folder);
const phaseName = process.argv[2];
assert(typeof phaseName === 'string' && /^(unit|browser)(?:-[a-z0-9]+)*$/.test(phaseName) && phaseName.length <= 80, 'Use a unique unit or browser phase name.');
const unit = phaseName.startsWith('unit'), focused = phaseName.startsWith('browser-focused');
assert(!phaseName.startsWith('unit-focused'), 'This UI pass requires the full Micro Lab unit suite.');
const kind = unit ? 'unit' : focused ? 'browser-focused' : 'browser';
const config = JSON.parse(fs.readFileSync(path.join(report, 'candidate.json'), 'utf8'));
assert(/^[a-f0-9]{64}$/.test(config.sourceSha256), 'Set the final candidate source SHA-256 before validation.');
assert.equal(config.newUnitCases, 1); assert.equal(config.newBrowserCases, input.newBrowserCases);
const files = unit ? input.unit : focused ? input.ownedTests.filter(file => file.endsWith('.spec.ts')) : input.browser;
const expected = unit ? input.expectedUnit : focused ? config.newBrowserCases : input.expectedBrowser;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const inputs = Object.fromEntries(files.concat(input.support).map(file => [file, hash(file)]));
const statusFile = path.join(report, phaseName + '-run-status.json');
const output = path.join(report, phaseName + '-results.json');
const outputFolder = path.join(report, phaseName + '-test-output');
const consoleFile = path.join(report, phaseName + '-console.txt');
assert(![statusFile, output, outputFolder, consoleFile].some(file => fs.existsSync(file)), 'Retain prior results; use a fresh phase name for another run.');
const status = { kind, phaseName, pid: process.pid, phase: 'running', started: new Date().toISOString(), sourceSha256: config.sourceSha256, expected,
  files, testInputs: inputs };
function verify() {
  for (const file of input.runtime) assert.equal(hash(file), config.sourceSha256, 'Runtime changed: ' + file);
  for (const [file, expectedHash] of Object.entries(inputs)) assert.equal(hash(file), expectedHash, 'Input changed: ' + file);
}
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
try {
  verify();
  for (const file of input.runtime) acorn.parse(fs.readFileSync(path.join(root, file), 'utf8'), { ecmaVersion: 'latest' });
  if (unit) for (const file of files) acorn.parse(fs.readFileSync(path.join(root, file), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  const args = unit ? ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--pool=forks', '--no-isolate',
    '--testTimeout=60000', '--hookTimeout=60000', '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + output] :
    ['node_modules/@playwright/test/cli.js', 'test', ...files, '--project=chromium', '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + outputFolder];
  const env = unit ? process.env : { ...process.env, MICROBIOLOGY_REPORT_DIR: report, PLAYWRIGHT_JSON_OUTPUT_NAME: output };
  const consoleFd = fs.openSync(consoleFile, 'wx');
  let run;
  try { run = cp.spawnSync(process.execPath, args, { cwd: root, stdio: ['ignore', consoleFd, consoleFd], env }); }
  finally { fs.closeSync(consoleFd); }
  process.stdout.write(fs.readFileSync(consoleFile, 'utf8'));
  if (run.error) throw run.error;
  verify();
  status.exitCode = run.status; status.signal = run.signal;
  if (run.status === 0) {
    const result = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert(unit ? (result.success && result.numPassedTests === expected && !result.numFailedTests && !result.numPendingTests && result.testResults.length === files.length) :
      (result.stats.expected === expected && !result.stats.unexpected && !result.stats.flaky && !result.stats.skipped && !result.errors.length), 'Passing case count does not match the expected suite.');
  }
  status.phase = run.status === 0 ? 'passed' : 'failed'; status.finished = new Date().toISOString();
  status.sourceStillMatches = true; status.testInputsStillMatch = true; status.syntaxChecksPassed = true;
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  process.exitCode = run.status || (run.signal ? 1 : 0);
} catch (error) {
  status.phase = 'failed'; status.error = error.message; status.finished = new Date().toISOString();
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n'); throw error;
}
