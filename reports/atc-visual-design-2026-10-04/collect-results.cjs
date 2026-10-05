const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const canonical = fs.readFileSync(path.resolve(__dirname, '../../stem_lab/stem_tool_atctower.js'), 'utf8');
const hash = crypto.createHash('sha256').update(canonical).digest('hex');
const files = [
  ['baseline-browser-results.json', 28], ['practice-regression-results.json', 20],
  ['visual-regression-results.json', 23], ['decision-support-regression-results.json', 18],
  ['learning-regression-results.json', 19], ['operational-regression-results.json', 22],
  ['practice-flow-regression-results.json', 17], ['browser-qa-results.json', null]
];
let total = 0;
for (const [file, expected] of files) {
  const result = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  if (expected != null) assert.equal(result.checks.length, expected, file);
  else assert.equal(result.checks.length, 22);
  assert.ok(result.checks.every(check => check.pass === true), file);
  assert.equal((result.errors || []).length, 0, file);
  if (result.sourceHash) assert.equal(result.sourceHash, hash, file);
  if (Object.hasOwn(result, 'sourceStable')) assert.equal(result.sourceStable, true, file);
  total += result.checks.length;
}
const verification = JSON.parse(fs.readFileSync(path.join(__dirname, 'verification.json'), 'utf8'));
assert.equal(verification.sourceSha256, hash);
const regressions = JSON.parse(fs.readFileSync(path.join(__dirname, 'regression-run-verification.json'), 'utf8'));
assert.equal(regressions.sourceSha256, hash);
assert.equal(regressions.sourceStable, true);
assert.equal(regressions.suites.length, 7);
const unitOutput = fs.readFileSync(path.join(__dirname, 'unit-tests.txt'), 'utf8');
assert.match(unitOutput, /Test Files\s+20 passed/);
assert.match(unitOutput, /Tests\s+228 passed/);
const result = { sourceSha256: hash, browserChecksPassed: total, unitTestsPassed: 228, unitTestFilesPassed: 20, browserRuntimeErrors: 0, checkedAt: new Date().toISOString() };
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
