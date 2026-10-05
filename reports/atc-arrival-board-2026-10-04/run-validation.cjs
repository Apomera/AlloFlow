const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'stem_lab/stem_tool_atctower.js');
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const proof = { startedAt: new Date().toISOString(), sourceSha256: hash(), suites: [], complete: false };
function execute(script, logName) {
  const log = fs.openSync(path.join(__dirname, logName), 'w');
  let result;
  try { result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, stdio: ['ignore', log, log] }); }
  finally { fs.closeSync(log); }
  if (result.error) throw result.error;
  assert.equal(result.status, 0, script + ' failed; inspect ' + logName);
  assert.equal(hash(), proof.sourceSha256, 'Source changed during validation');
}
try {
  console.log('Running ATC unit suite');
  execute('reports/atc-deep-dive-2026-10-03/run-tests.cjs', 'unit-tests.txt');
  const unitLog = fs.readFileSync(path.join(__dirname, 'unit-tests.txt'), 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(unitLog, /Test Files\s+21 passed \(21\)/); assert.match(unitLog, /Tests\s+242 passed \(242\)/);
  proof.unitTestsPassed = 242; proof.unitFilesPassed = 21; console.log('242 unit tests passed');
  execute('reports/atc-arrival-board-2026-10-04/verify.cjs', 'parity-check.txt');
  const suites = [
    ['atc-arrival-board-2026-10-04', 'browser-qa-results.json', 14],
    ['atc-visual-design-2026-10-04', 'visual-design-regression-results.json', 22],
    ['atc-deep-dive-2026-10-03', 'baseline-browser-results.json', 28],
    ['atc-quality-pass3-2026-10-03', 'practice-regression-results.json', 20],
    ['atc-visual-engagement-2026-10-03', 'visual-regression-results.json', 23],
    ['atc-decision-support-2026-10-04', 'decision-support-regression-results.json', 18],
    ['atc-learning-experience-2026-10-04', 'learning-regression-results.json', 19],
    ['atc-operational-clarity-2026-10-04', 'operational-regression-results.json', 22],
    ['atc-practice-flow-2026-10-04', 'practice-flow-regression-results.json', 17]
  ];
  for (const [name, destination, count] of suites) {
    console.log('Running ' + name);
    execute('reports/' + name + '/browser-qa.cjs', name + '.txt');
    const content = fs.readFileSync(path.join(root, 'reports', name, 'browser-qa-results.json'), 'utf8');
    const result = JSON.parse(content);
    assert.equal(result.checks.length, count); assert.ok(result.checks.every(check => check.pass === true)); assert.equal((result.errors || []).length, 0);
    if (result.sourceHash) assert.equal(result.sourceHash, proof.sourceSha256);
    if (name !== path.basename(__dirname)) fs.writeFileSync(path.join(__dirname, destination), content);
    proof.suites.push({ name, checksPassed: count }); console.log(count + ' checks passed in ' + name);
  }
  proof.browserChecksPassed = proof.suites.reduce((sum, suite) => sum + suite.checksPassed, 0);
  proof.complete = true;
} catch (error) { proof.error = error.stack; process.exitCode = 1; console.error(error.message); }
finally { proof.completedAt = new Date().toISOString(); proof.sourceStable = hash() === proof.sourceSha256; fs.writeFileSync(path.join(__dirname, 'validation-results.json'), JSON.stringify(proof, null, 2) + '\n'); }
