const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const suites = [
  ['atc-deep-dive-2026-10-03', 'baseline-browser-results.json', 28],
  ['atc-quality-pass3-2026-10-03', 'practice-regression-results.json', 20],
  ['atc-visual-engagement-2026-10-03', 'visual-regression-results.json', 23],
  ['atc-decision-support-2026-10-04', 'decision-support-regression-results.json', 18],
  ['atc-learning-experience-2026-10-04', 'learning-regression-results.json', 19],
  ['atc-operational-clarity-2026-10-04', 'operational-regression-results.json', 22],
  ['atc-practice-flow-2026-10-04', 'practice-flow-regression-results.json', 17]
];
const root = path.resolve(__dirname, '../..');
const sourceFile = path.join(root, 'stem_lab/stem_tool_atctower.js');
const sourceHash = () => crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
const initialHash = sourceHash();
const proof = { sourceSha256: initialHash, startedAt: new Date().toISOString(), sourceStable: true, suites: [] };
for (const [suite, destination, count] of suites) {
  const directory = path.join(root, 'reports', suite);
  const log = fs.openSync(path.join(__dirname, suite + '.txt'), 'w');
  console.log('Running ' + suite);
  let result;
  try { result = spawnSync(process.execPath, [path.join(directory, 'browser-qa.cjs')], { cwd: root, stdio: ['ignore', log, log] }); }
  finally { fs.closeSync(log); }
  if (result.error) throw result.error;
  assert.equal(result.status, 0, suite + ' failed; inspect its saved log');
  const content = fs.readFileSync(path.join(directory, 'browser-qa-results.json'), 'utf8');
  const checks = JSON.parse(content);
  assert.equal(checks.checks.length, count);
  assert.ok(checks.checks.every(check => check.pass === true));
  assert.equal((checks.errors || []).length, 0);
  assert.equal(sourceHash(), initialHash, 'Production source must stay unchanged during each regression suite');
  if (checks.sourceHash) assert.equal(checks.sourceHash, initialHash);
  fs.writeFileSync(path.join(__dirname, destination), content);
  proof.suites.push({ name: suite, checksPassed: count });
  console.log(count + ' checks passed in ' + suite);
}
proof.completedAt = new Date().toISOString();
fs.writeFileSync(path.join(__dirname, 'regression-run-verification.json'), JSON.stringify(proof, null, 2) + '\n');
