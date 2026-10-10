'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const stage = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', report = path.join(repo, 'reports/universe-flight-2026-09-29/close-disk');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const inputs = {
  'stem_lab/universe_flight_scene.js': '6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8',
  'stem_lab/stem_tool_universe.js': 'a744f3d2e32b5bec28864c8ee29468ec68178cd20d9bb08bcd8fa3d9eefc19a9'
};
const derivation = JSON.parse(fs.readFileSync(path.join(stage, 'browser-derivation.json'), 'utf8'));
const driverPath = path.join(stage, 'browser-check.cjs'), driverHash = hash(fs.readFileSync(driverPath));
assert.equal(driverHash, derivation.candidateHash, 'Frozen actual browser driver matches derivation');
for (const [file, expected] of Object.entries(inputs)) {
  assert.equal(hash(fs.readFileSync(path.join(repo, file))), expected, 'Installed source matches frozen 58 candidate');
  assert.equal(hash(fs.readFileSync(path.join(repo, 'desktop/web-app/public', file))), expected, 'Runtime mirror matches frozen candidate');
}
const wrapperHash = hash(fs.readFileSync(__filename)), startedAtUtc = new Date().toISOString();
fs.mkdirSync(report, { recursive: true });
const command = { executable: process.execPath, arguments: [driverPath], cwd: repo, environmentOverrides: { PLAYWRIGHT_BROWSERS_PATH: 'C:/Users/cabba/AppData/Local/ms-playwright', UNIVERSE_CLOSE_DISK_REPORT: report, UNIVERSE_CLOSE_DISK_URL: 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=58#universe-flight' }, windowsHide: true };
const executionPath = path.join(report, 'browser-execution.json');
fs.writeFileSync(executionPath, JSON.stringify({ completed: false, startedAtUtc, wrapperPath: __filename, wrapperHash, driverPath, driverHash, inputs, command }, null, 2));
const run = spawnSync(command.executable, command.arguments, { cwd: command.cwd, env: { ...process.env, ...command.environmentOverrides }, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(report, 'browser-stdout.log'), run.stdout || '');
fs.writeFileSync(path.join(report, 'browser-stderr.log'), run.stderr || '');
const execution = { completed: true, startedAtUtc, finishedAtUtc: new Date().toISOString(), wrapperPath: __filename, wrapperHash, driverPath, driverHash, inputs, command, exitCode: run.status, signal: run.signal, error: run.error ? String(run.error) : null, stdoutHash: hash(run.stdout || ''), stderrHash: hash(run.stderr || ''), driverFrozen: hash(fs.readFileSync(driverPath)) === driverHash, wrapperFrozen: hash(fs.readFileSync(__filename)) === wrapperHash };
fs.writeFileSync(executionPath, JSON.stringify(execution, null, 2));
process.stdout.write(run.stdout || ''); process.stderr.write(run.stderr || '');
console.log(JSON.stringify({ driverHash, wrapperHash, exitCode: run.status, executionPath }));
process.exitCode = run.status === 0 && execution.driverFrozen && execution.wrapperFrozen ? 0 : 1;
