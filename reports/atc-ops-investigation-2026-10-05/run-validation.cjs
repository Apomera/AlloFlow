const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'stem_lab/stem_tool_atctower.js'))).digest('hex');
const proof = { startedAt: new Date().toISOString(), sourceSha256: hash(), suites: [], complete: false };
const runDir = path.join(__dirname, 'validation', proof.startedAt.replace(/[^0-9A-Za-z]/g, ''));
const recoveredDir = process.argv[3] ? path.resolve(root, process.argv[3]) : null;
fs.mkdirSync(runDir, { recursive: true });
function execute(script, logName, resultsPath) {
  const logPath = path.join(runDir, logName), log = fs.openSync(logPath, 'wx');
  let result;
  try { result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, env: { ...process.env, ...(resultsPath ? { ATC_QA_RESULTS_PATH: resultsPath, ATC_QA_ARTIFACT_DIR: path.dirname(resultsPath) } : {}) }, stdio: ['ignore', log, log] }); }
  finally { fs.closeSync(log); }
  if (result.error) throw result.error;
  assert.equal(result.status, 0, script + ' failed; inspect ' + logPath);
  assert.equal(hash(), proof.sourceSha256, 'Source changed during validation');
  return logPath;
}
try {
  if (recoveredDir) {
    const recordedParity = JSON.parse(fs.readFileSync(path.join(recoveredDir, 'parity-check.txt'), 'utf8'));
    assert.equal(recordedParity.sourceSha256, proof.sourceSha256, 'Recovery requires the same verified source');
    assert.ok(recordedParity.syntaxValid && recordedParity.toolMirrorsEqual && recordedParity.englishNamespacesEqual && recordedParity.developmentEnglishCatalogEqual);
    proof.resumedFrom = path.relative(__dirname, recoveredDir).replace(/\\/g, '/');
  }
  console.log(recoveredDir ? 'Verifying the completed ATC unit run' : 'Running the full ATC unit suite');
  const unitLog = recoveredDir ? path.join(recoveredDir, 'unit-tests.txt') : execute('reports/atc-deep-dive-2026-10-03/run-tests.cjs', 'unit-tests.txt');
  const output = fs.readFileSync(unitLog, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(output, /Test Files\s+23 passed \(23\)/); assert.match(output, /Tests\s+285 passed \(285\)/);
  proof.unitTestsPassed = 285; proof.unitFilesPassed = 23; proof.unitLog = path.relative(__dirname, unitLog).replace(/\\/g, '/'); console.log('285 unit tests passed');
  execute('reports/atc-ops-investigation-2026-10-05/verify.cjs', 'parity-check.txt');
  for (const [name, count] of [
    ['atc-ops-investigation-2026-10-05', 15],
    ['atc-lesson-workbench-2026-10-05', 15],
    ['atc-visual-design-2026-10-04', 22]
  ]) {
    const completedSuite = recoveredDir && path.join(recoveredDir, name, 'browser-qa-results.json');
    const reuse = name === 'atc-ops-investigation-2026-10-05' && process.argv[2] || completedSuite && fs.existsSync(completedSuite) && completedSuite;
    const resultsPath = reuse ? path.resolve(root, reuse) : path.join(runDir, name, 'browser-qa-results.json');
    console.log((reuse ? 'Verifying the completed run of ' : 'Running ') + name);
    if (!reuse) {
      fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
      execute('reports/' + name + '/browser-qa.cjs', name + '.txt', resultsPath);
    }
    const result = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    assert.equal(result.checks.length, count); assert.ok(result.checks.every(check => check.pass)); assert.equal((result.errors || []).length, 0);
    if (reuse || result.sourceHash) assert.equal(result.sourceHash, proof.sourceSha256);
    if (Object.hasOwn(result, 'sourceStable')) assert.equal(result.sourceStable, true);
    proof.suites.push({ name, checksPassed: count, reused: !!reuse, resultsFile: path.relative(__dirname, resultsPath).replace(/\\/g, '/') }); console.log(count + ' checks passed in ' + name);
  }
  proof.browserChecksPassed = proof.suites.reduce((sum, suite) => sum + suite.checksPassed, 0);
  proof.complete = true;
} catch (error) { proof.error = error.stack; process.exitCode = 1; console.error(error.message); }
finally {
  proof.completedAt = new Date().toISOString(); proof.sourceStable = hash() === proof.sourceSha256;
  fs.writeFileSync(path.join(runDir, 'validation-results.json'), JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify({ complete: proof.complete, result: path.join(runDir, 'validation-results.json') }));
}
