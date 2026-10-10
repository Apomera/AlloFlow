const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawn } = require('node:child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', stage = __dirname;
const report = path.join(stage, 'focused-unit'), temp = path.join(stage, 'unit-temp');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const selected = ['tests/universe_flight_physics.test.js', 'tests/universe_flight_bulges.test.js', 'tests/universe_flight_close_disk.test.js'];
const names = ['candidate-renderer.js', 'baseline-renderer.js', 'candidate-close-disk.test.js', 'node-renderer.config.mjs', 'node-renderer-setup.mjs', 'run-focused-unit.cjs'];
assert.equal(sha(path.join(stage, 'candidate-renderer.js')), '6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8');
assert.equal(sha(path.join(stage, 'baseline-renderer.js')), '8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9');
assert.equal(sha(path.join(repo, 'stem_lab/universe_flight_scene.js')), sha(path.join(stage, 'candidate-renderer.js')));
assert.equal(sha(path.join(repo, 'tests/universe_flight_close_disk.test.js')), sha(path.join(stage, 'candidate-close-disk.test.js')));
fs.mkdirSync(report, { recursive: true }); fs.mkdirSync(temp, { recursive: true });
assert.equal(fs.existsSync(path.join(report, 'execution.json')), false, 'Preserve existing attempts before another run.');
const inputs = ['stem_lab/universe_flight_scene.js', 'tests/universe_flight_physics.test.js', 'tests/universe_flight_bulges.test.js', 'tests/universe_flight_close_disk.test.js', 'tests/helpers/universe_galaxy_surfaces.js', 'tests/fixtures/universe_flight_bulge_baseline.json'].map(file => ({ path: file, sha256: sha(path.join(repo, file)) }));
const diagnostics = names.map(file => ({ path: file, sha256: sha(path.join(stage, file)) }));
const args = [path.join(repo, 'node_modules/vitest/vitest.mjs'), 'run', ...selected, '--config', path.join(stage, 'node-renderer.config.mjs'), '--pool=forks', '--maxWorkers=1', '--no-file-parallelism', '--no-isolate', '--testTimeout=180000', '--hookTimeout=180000', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(report, 'results.json')];
const execution = { completed: false, startedAt: new Date().toISOString(), scope: 'Three focused files evaluated directly against the SHA-pinned installed renderer. The new close-disk test also checks accepted baseline byte invariants.', environment: 'Node canvas/event mock with one shared fork worker without isolation; this is not a full DOM or native WebGL suite.', inputs, diagnostics, args };
fs.writeFileSync(path.join(report, 'execution.json'), JSON.stringify(execution, null, 2) + '\n');
const log = fs.createWriteStream(path.join(report, 'stdout.txt'));
const child = spawn(process.execPath, args, { cwd: repo, windowsHide: true, env: { ...process.env, TEMP: temp, TMP: temp }, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { process.stdout.write(data); log.write(data); });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => {
  execution.completed = true; execution.exitCode = code; execution.finishedAt = new Date().toISOString();
  execution.inputsUnchanged = inputs.every(input => sha(path.join(repo, input.path)) === input.sha256);
  execution.diagnosticsUnchanged = diagnostics.every(input => sha(path.join(stage, input.path)) === input.sha256);
  fs.writeFileSync(path.join(report, 'execution.json'), JSON.stringify(execution, null, 2) + '\n'); log.end(); process.exitCode = code ?? 1;
  if (code === 0) {
    const result = JSON.parse(fs.readFileSync(path.join(report, 'results.json')));
    assert.equal(result.success, true); assert.equal(result.numFailedTests, 0); assert.equal(result.testResults.length, 3);
    console.log(JSON.stringify({ completed: true, distinctFiles: result.testResults.length, distinctTests: result.numPassedTests, inputsUnchanged: execution.inputsUnchanged, diagnosticsUnchanged: execution.diagnosticsUnchanged, fullDomSuiteRun: false }));
  }
});
