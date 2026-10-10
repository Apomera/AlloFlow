'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), cp = require('node:child_process'), crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../../..'), prior = JSON.parse(fs.readFileSync(path.join(repo, 'reports/universe-flight-2026-09-29/stellar-sampling/unit-tests.json'), 'utf8'));
assert.equal(prior.numPassedTests, 364); assert.equal(prior.testResults.length, 31);
const files = prior.testResults.map(result => path.relative(repo, result.name));
for (const file of files) { assert.ok(!path.isAbsolute(file) && !file.startsWith('..')); assert.ok(fs.existsSync(path.join(repo, file))); }
assert.equal(new Set(files).size, 31);
const vitestVersion = JSON.parse(fs.readFileSync(path.join(repo, 'node_modules/vitest/package.json'), 'utf8')).version;
const args = ['node_modules/vitest/vitest.mjs', '--run', ...files, '--pool=forks', '--maxWorkers=1', '--no-file-parallelism', '--isolate', '--testTimeout', '60000', '--hookTimeout', '60000', '--reporter=default', '--reporter=json', '--outputFile', 'reports/universe-flight-2026-09-29/prominence-edges/unit-tests.json'];
const temp = 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-3/universe-detail-lens/temp';
const plan = { prepared: true, started: false, baselineCases: 364, vitestVersion, files, args, temp,
  flagMigration: { previous: '--poolOptions.forks.singleFork', equivalent: '--maxWorkers=1 --isolate', fileParallelism: false, source: 'https://vitest.dev/guide/migration.html' } };
fs.writeFileSync(path.join(__dirname, 'unit-suite-plan.json'), JSON.stringify(plan, null, 2) + '\n');
if (!process.argv.includes('--run')) { console.log(JSON.stringify({ prepared: true, started: false, cases: 364, files: files.length })); process.exit(0); }
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex');
const pins = Object.fromEntries(['stem_lab/universe_flight_scene.js', 'stem_lab/stem_tool_universe.js'].map(file => [file, hash(file)]));
const run = { started: true, completed: false, startedAt: new Date().toISOString(), vitestVersion, pins, files, args, temp };
const save = () => fs.writeFileSync(path.join(__dirname, 'unit-suite-run.json'), JSON.stringify(run, null, 2) + '\n');
save(); const result = cp.spawnSync(process.execPath, args, { cwd: repo, env: { ...process.env, TEMP: temp, TMP: temp }, stdio: 'inherit' });
run.exitCode = result.status; run.finishedAt = new Date().toISOString(); if (result.error) run.error = String(result.error); save();
assert.equal(result.status, 0, 'The explicit Universe unit suite succeeds');
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'unit-tests.json'), 'utf8'));
assert.equal(report.success, true); assert.equal(report.numPassedTests, 364); assert.equal(report.numFailedTests, 0); assert.equal(report.testResults.length, 31);
for (const [file, pin] of Object.entries(pins)) assert.equal(hash(file), pin, 'Runtime stays fixed during unit verification');
run.completed = true; run.tests = { cases: report.numPassedTests, files: report.testResults.length, failures: report.numFailedTests }; save();
console.log(JSON.stringify({ completed: true, ...run.tests }));
