// Run from the repository root after the focused Vitest reports exist.
const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-enhancement-pass2-2026-09-27/';
const source = fs.readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const mirror = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_bridgelab.js', 'utf8');
if (source !== mirror) throw new Error('Bridge source mirror differs');
const keys = new Map();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === '__alloT'
    && typeof node.arguments[0]?.value === 'string' && typeof node.arguments[1]?.value === 'string') {
    const key = node.arguments[0].value;
    const fallback = node.arguments[1].value;
    if (keys.has(key) && keys.get(key) !== fallback) throw new Error('Conflicting fallback: ' + key);
    keys.set(key, fallback);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(acorn.parse(source, { ecmaVersion: 'latest' }));
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, fallback] of keys) {
    const registered = key.split('.').reduce((value, part) => value?.[part], registry);
    if (registered !== fallback) throw new Error(file + ': mismatch for ' + key);
  }
}
const checks = new Map();
const reports = ['initial-unit-results.json', 'final-followup-results.json'];
for (const file of reports) {
  const report = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  for (const suite of report.testResults) for (const test of suite.assertionResults) {
    if (test.status === 'passed' || test.status === 'failed') {
      checks.set(suite.name + '::' + test.fullName, { name: test.fullName, status: test.status });
    }
  }
}
const failures = [...checks.values()].filter(check => check.status !== 'passed');
if (failures.length) throw new Error(JSON.stringify(failures));
const verification = {
  syntax: 'passed', sourceMirrors: 'identical',
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  matchingEnglishKeys: keys.size, missingEnglishKeys: 0, mismatchedEnglishFallbacks: 0,
  unitReports: reports, distinctUnitChecksPassed: checks.size, unitFailuresAfterFollowup: 0,
  note: 'The initial run had three mirror-parity failures while the saved-crossing fix was being copied. The focused follow-up verifies all three, affected workflows and reports, and two additional restored-data cases. Unrelated skipped tests are excluded.'
};
fs.writeFileSync(folder + 'source-verification.json', JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify(verification, null, 2));
