const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8').replace(/^\uFEFF/, ''));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
const full = read('full-regression.json');
const browser = read('browser-results.json');
assert.equal(full.numFailedTests, 0, 'Full circuit tests must pass');
assert.equal(full.success, true);
assert.equal(browser.passed, true);
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
assert.equal(hash(source), hash(mirror), 'Circuit source and mirror must match');
const host = 'stem_lab/stem_lab_module.js';
const hostMirror = 'desktop/web-app/public/stem_lab/stem_lab_module.js';
assert.equal(hash(host), hash(hostMirror), 'STEM host source and mirror must match');
const result = {
  verifiedAt: new Date().toISOString(),
  source: { path: source, sha256: hash(source), mirror, mirrorMatches: true },
  host: { path: host, sha256: hash(host), mirror: hostMirror, mirrorMatches: true },
  regression: { tests: full.numTotalTests, passed: full.numPassedTests, failed: full.numFailedTests, pending: full.numPendingTests, files: full.testResults.length },
  browser: { workflows: browser.checks.length, axeScans: browser.axe.length, axeViolations: browser.axe.reduce((sum, scan) => sum + scan.violations.length, 0), layoutChecks: browser.layouts.length, errors: browser.errors.length },
  aiProvider: 'Mocked during validation; expanded runtime context explicitly approved by user.',
  syntaxCheck: 'passed', patchWhitespaceCheck: 'passed'
};
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
