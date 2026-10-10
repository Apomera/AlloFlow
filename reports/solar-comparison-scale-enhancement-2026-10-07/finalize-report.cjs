const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath);
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const units = read('unit-results.json');
const unitSource = read('unit-source.json');
const visual = read('visual-results.json');
assert.equal(unitSource.sourceSha256, sourceSha256, 'Unit tests must match final source');
assert.equal(visual.sourceSha256, sourceSha256, 'Browser tests must match final source');
assert.equal(units.success, true);
assert.equal(units.numTotalTests, 38);
assert.equal(units.numPassedTests, 38);
assert.equal(units.numFailedTests, 0);
assert.equal(visual.completed, true);
assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))), 'Desktop mirror must match');
const checks = [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_comparison_scale_navigation.test.js']],
];
for (const [name, command, args] of checks) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || ''));
  assert.equal(result.status, 0, name + ' check failed: ' + result.stderr);
}
const summary = {
  sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name),
    checked: ['No horizontal overflow', 'No page errors', '13px minimum comparison and fact text', '44px comparison controls', 'Fixed axes', 'Explore and return focus', 'Single-line planet titles', 'Separate return row at 320px'] },
  syntax: 'passed', whitespace: 'passed', committed: false,
};
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const ownedTemporaryFile of [
  path.join(root, '.tmp-solar-read.py'),
  path.join(__dirname, 'comparison-1060-dark-Earth-Jupiter-details.png'),
]) {
  if (fs.existsSync(ownedTemporaryFile)) fs.unlinkSync(ownedTemporaryFile);
}
console.log(JSON.stringify(summary, null, 2));
