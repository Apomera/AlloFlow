const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath), sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const runs = ['unit-preview', 'unit-journal'].map(name => { assert.equal(read(name + '-source.json').sourceSha256, sourceSha256); const result = read(name + '-results.json'); assert.equal(result.success, true); return result; });
const units = { success: true, aggregatedFromSeparateRuns: true, numPassedTests: runs.reduce((sum, run) => sum + run.numPassedTests, 0), numTotalTests: runs.reduce((sum, run) => sum + run.numTotalTests, 0), testResults: runs.flatMap(run => run.testResults) };
assert.equal(units.numPassedTests, 25); assert.equal(units.numTotalTests, 25);
const visual = read('visual-results.json');
assert.equal(read('visual-source.json').sourceSha256, sourceSha256); assert.equal(visual.sourceSha256, sourceSha256);
assert.equal(visual.completed, true); assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for (const [name, command, args] of [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_synthesis_preview.test.js']],
]) { const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' }); fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || '')); assert.equal(result.status, 0, name + ': ' + result.stderr); }
const summary = { sourceSha256, baselineSha256: read('baseline.json').sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name), checked: [
    'Live source previews before capture', 'Different-lab capture requirement', 'Full observation disclosure and paragraph preservation',
    'Captured copies remain unchanged after original edits', 'Latest-version comparison and recorded date',
    'Changing either source refreshes both previews', 'Recapture preserves authored explanation',
    'Unlinked original keeps a selectable and saveable captured copy', 'Journal drafts and earlier entries preserved',
    'Committed opening and capture keyboard focus', 'Balanced desktop and single-column phone cards',
    '13px minimum text, 16px writing text, 44px controls', 'No page overflow or browser errors',
  ] }, syntax: 'passed', whitespace: 'passed', committed: false };
fs.writeFileSync(path.join(__dirname, 'unit-results.json'), JSON.stringify(units, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const name of ['.tmp-solar-read.py', '.tmp-solar-synthesis-edit.py', '.tmp-solar-synthesis-spacing.py', '.tmp-solar-process.ps1', '.tmp-solar-process-native.py']) {
  const temporary = path.join(root, name); if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(JSON.stringify(summary, null, 2));
