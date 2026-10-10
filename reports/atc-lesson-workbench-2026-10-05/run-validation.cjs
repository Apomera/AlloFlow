const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'stem_lab/stem_tool_atctower.js');
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const proof = { startedAt: new Date().toISOString(), sourceSha256: hash(), suites: [], complete: false };
const resume = process.argv.includes('--resume') ? JSON.parse(fs.readFileSync(path.join(__dirname, 'validation-results.json'), 'utf8')) : null;
function execute(script, logName, resultsPath) {
  const log = fs.openSync(path.join(__dirname, logName), 'w');
  let result;
  try { result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, env: { ...process.env, ...(resultsPath ? { ATC_QA_RESULTS_PATH: resultsPath, ATC_QA_ARTIFACT_DIR: path.dirname(resultsPath) } : {}) }, stdio: ['ignore', log, log] }); }
  finally { fs.closeSync(log); }
  if (result.error) throw result.error;
  assert.equal(result.status, 0, script + ' failed; inspect ' + logName);
  assert.equal(hash(), proof.sourceSha256, 'Source changed during validation');
}
try {
  if (resume) {
    assert.equal(resume.sourceSha256, proof.sourceSha256, 'Cannot resume checks for a different source');
    assert.equal(resume.sourceStable, true);
    proof.resumedFrom = resume.startedAt;
  }
  if (resume && resume.unitTestsPassed === 266 && resume.unitFilesPassed === 22) console.log('Reusing the verified unit run for this unchanged source');
  else {
    console.log('Running ATC unit suite');
    execute('reports/atc-deep-dive-2026-10-03/run-tests.cjs', 'unit-tests.txt');
  }
  const unitLog = fs.readFileSync(path.join(__dirname, 'unit-tests.txt'), 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(unitLog, /Test Files\s+22 passed \(22\)/); assert.match(unitLog, /Tests\s+266 passed \(266\)/);
  proof.unitTestsPassed = 266; proof.unitFilesPassed = 22; console.log('266 unit tests passed');
  execute('reports/atc-lesson-workbench-2026-10-05/verify.cjs', 'parity-check.txt');
  const suites = [
    ['atc-lesson-workbench-2026-10-05', 'browser-qa-results.json', 15],
    ['atc-visual-design-2026-10-04', 'visual-design-regression-results.json', 22],
    ['atc-practice-flow-2026-10-04', 'practice-flow-regression-results.json', 17]
  ];
  for (const [name, destination, count] of suites) {
    const verified = resume && resume.suites.find(suite => suite.name === name && suite.checksPassed === count);
    const resultsPath = verified ? path.resolve(__dirname, verified.resultsFile || destination) : path.join(__dirname, 'regressions', name, proof.startedAt.replace(/[^0-9A-Za-z]/g, ''), 'browser-qa-results.json');
    console.log((verified ? 'Reusing the verified run for this unchanged source: ' : 'Running ') + name);
    if (!verified) {
      fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
      execute('reports/' + name + '/browser-qa.cjs', name + '.txt', resultsPath);
    }
    const content = fs.readFileSync(resultsPath, 'utf8');
    const result = JSON.parse(content);
    assert.equal(result.checks.length, count); assert.ok(result.checks.every(check => check.pass === true)); assert.equal((result.errors || []).length, 0);
    if (result.sourceHash) assert.equal(result.sourceHash, proof.sourceSha256);
    if (Object.hasOwn(result, 'sourceStable')) assert.equal(result.sourceStable, true);
    proof.suites.push({ name, checksPassed: count, reused: !!verified, resultsFile: path.relative(__dirname, resultsPath).replace(/\\/g, '/') }); console.log(count + ' checks passed in ' + name);
  }
  proof.browserChecksPassed = proof.suites.reduce((sum, suite) => sum + suite.checksPassed, 0);
  proof.complete = true;
} catch (error) { proof.error = error.stack; process.exitCode = 1; console.error(error.message); }
finally { proof.completedAt = new Date().toISOString(); proof.sourceStable = hash() === proof.sourceSha256; fs.writeFileSync(path.join(__dirname, 'validation-results.json'), JSON.stringify(proof, null, 2) + '\n'); }
