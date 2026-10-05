const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sources = [
  ['../atc-deep-dive-2026-10-03/browser-qa-results.json', 'baseline-browser-results.json', 28],
  ['../atc-quality-pass3-2026-10-03/browser-qa-results.json', 'practice-regression-results.json', 20],
  ['../atc-visual-engagement-2026-10-03/browser-qa-results.json', 'visual-regression-results.json', 23],
  ['../atc-decision-support-2026-10-04/browser-qa-results.json', 'decision-support-regression-results.json', 18],
  ['../atc-learning-experience-2026-10-04/browser-qa-results.json', 'learning-regression-results.json', 19],
  ['../atc-operational-clarity-2026-10-04/browser-qa-results.json', 'operational-regression-results.json', 22]
];
const canonical = fs.readFileSync(path.resolve(__dirname, '../../stem_lab/stem_tool_atctower.js'), 'utf8');
const hash = crypto.createHash('sha256').update(canonical).digest('hex');
let total = 0;
for (const [source, destination, count] of sources) {
  const text = fs.readFileSync(path.resolve(__dirname, source), 'utf8');
  const results = JSON.parse(text);
  assert.equal(results.checks.length, count, 'The complete regression suite must have run');
  assert.ok(results.checks.every(check => check.pass === true), 'All regression checks must pass');
  assert.equal((results.errors || []).length, 0, 'No browser runtime errors are allowed');
  if (results.sourceHash) assert.equal(results.sourceHash, hash, 'Hash-bearing regression results must match the final source');
  if (Object.hasOwn(results, 'sourceStable')) assert.equal(results.sourceStable, true);
  fs.writeFileSync(path.join(__dirname, destination), text);
  total += count;
  console.log(`${count} regression checks verified and retained in ${destination}`);
}
const focused = JSON.parse(fs.readFileSync(path.join(__dirname, 'browser-qa-results.json'), 'utf8'));
assert.ok(focused.checks.length >= 17, 'The complete focused flow suite must have run');
assert.ok(focused.checks.every(check => check.pass === true));
assert.equal((focused.errors || []).length, 0);
assert.equal(focused.sourceStable, true);
assert.equal(focused.sourceHash, hash);
total += focused.checks.length;
console.log(`${total} browser checks verified; source-bearing results match the final source.`);
