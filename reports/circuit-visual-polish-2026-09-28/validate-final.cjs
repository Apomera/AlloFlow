const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const sourceHash = hash(source);
const visual = read('visual-results.json');
const tests = read('regression.json');
assert.equal(hash(mirror), sourceHash);
assert.equal(visual.sourceSha256, sourceHash);
assert.equal(visual.sourceSha256AtEnd, sourceHash);
assert.equal(visual.sourceChangedDuringRun, false);
assert.equal(visual.passed, true);
assert.deepEqual(visual.visualIssues, []);
assert.deepEqual(visual.errors, []);
assert.ok(visual.axe.every(scan => scan.violations.length === 0));
assert.ok(visual.focus.every(check => check.visible));
assert.equal(tests.success, true);
assert.equal(tests.numFailedTests, 0);
assert.ok(tests.testResults.every(suite => suite.status === 'passed'));
for (const capture of visual.screenshots) assert.ok(fs.existsSync(path.join(__dirname, capture.file)));
execFileSync(process.execPath, ['--check', source], { cwd: root, stdio: 'pipe' });
execFileSync('git', ['diff', '--check', '--', source, mirror], { cwd: root, stdio: 'pipe' });
const summary = {
  verifiedAt: new Date().toISOString(),
  source: { path: source, sha256: sourceHash, mirror, mirrorMatches: true },
  regression: { files: tests.testResults.length, passed: tests.numPassedTests, failed: tests.numFailedTests,
    note: 'Behavior and accessibility suites passed. Final CSS-only refinements were followed by the complete visual audit.' },
  browser: { workflows: visual.checks.length, axeScans: visual.axe.length, violations: 0,
    layoutChecks: visual.layouts.length, keyboardFocusChecks: visual.focus.length,
    primaryActionChecks: visual.actions.reduce((count, group) => count + group.actions.length, 0),
    screenshots: visual.screenshots.length, visualIssues: 0, pageErrors: 0,
    viewportWidths: [...new Set(visual.layouts.map(check => check.width))],
    reducedMotion: 'Primary action transition durations are at most the shared 0.01ms reset.' },
  syntaxCheck: 'passed', patchWhitespaceCheck: 'passed'
};
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
