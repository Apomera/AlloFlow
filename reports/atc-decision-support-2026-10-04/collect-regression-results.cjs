const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sources = [
  ['../atc-deep-dive-2026-10-03/browser-qa-results.json', 'baseline-browser-results.json', 28],
  ['../atc-quality-pass3-2026-10-03/browser-qa-results.json', 'practice-browser-results.json', 20],
  ['../atc-visual-engagement-2026-10-03/browser-qa-results.json', 'visual-regression-results.json', 23]
];
for (const [source, destination, count] of sources) {
  const text = fs.readFileSync(path.resolve(__dirname, source), 'utf8');
  const results = JSON.parse(text);
  assert.equal(results.checks.length, count, 'The complete regression suite must have run');
  assert.ok(results.checks.every(check => check.pass === true), 'All regression checks must pass');
  assert.equal((results.errors || []).length, 0, 'No browser runtime errors are allowed');
  fs.writeFileSync(path.join(__dirname, destination), text);
  console.log(`${count} regression checks verified and retained in ${destination}`);
}
