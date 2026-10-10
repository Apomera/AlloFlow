const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath), sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
for (const name of ['unit-log', 'unit-journey', 'visual']) {
  assert.equal(read(name + '-exit.json').status, 0);
  assert.equal(read(name + '-exit.json').sourceSha256, sourceSha256);
  assert.equal(read(name + '-source.json').sourceSha256, sourceSha256);
}
const runs = ['unit-log', 'unit-journey'].map(name => {
  const result = read(name + '-results.json'); assert.equal(result.success, true);
  assert.ok(result.numTotalTests > 0); assert.equal(result.numPassedTests, result.numTotalTests); return result;
});
const units = { success: true, numPassedTests: runs.reduce((sum, run) => sum + run.numPassedTests, 0), numTotalTests: runs.reduce((sum, run) => sum + run.numTotalTests, 0), testResults: runs.flatMap(run => run.testResults) };
const visual = read('visual-results.json'); assert.equal(visual.sourceSha256, sourceSha256);
assert.equal(visual.completed, true); assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for (const [name, command, args] of [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_mission_log_workspace.test.js']],
]) {
  const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || ''));
  assert.equal(result.status, 0, name + ': ' + result.stderr);
}
const summary = { sourceSha256, baselineSha256: read('baseline.json').sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name) }, validatedBehavior: [
    'Responsive activity timeline with 16px entry text and 44px minimum controls',
    'Search across activity text, type and world with normalized all-word matching',
    'Activity filters and saved-order reversal persist across disclosure changes',
    'Five-entry pagination focuses the first newly revealed committed entry',
    'Stale pagination callbacks and disconnected rows cannot steal filter focus',
    'New entries include dates; original legacy text and time strings remain intact',
    'Rapid event recording appends against current state and retains the latest 20 raw entries',
    'Vehicle deployment credit requires deployment evidence and survives log retention',
    'CSV exports include all matches, including entries below Show more',
    'CSV quoting, multiline fields and spreadsheet formula protection',
    'Exporting leaves saved activity, learning state and progress unchanged',
    'Malformed saved entries and preferences recover safely',
    'Existing orbital observation and learning journey regression coverage',
    'Desktop and 320px layouts in both themes have no overflow or browser errors',
  ], visualReview: ['mission-log-1060-light-timeline.png', 'mission-log-320-dark-timeline.png', 'mission-log-320-light-filtered.png'],
  syntax: 'passed', whitespace: 'passed', committed: false };
fs.writeFileSync(path.join(__dirname, 'unit-results.json'), JSON.stringify(units, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const name of ['.tmp-solar-activity-read.py', '.tmp-solar-activity-helpers.txt', '.tmp-solar-activity-component.txt', '.tmp-solar-activity-edit.py', '.tmp-solar-activity-candidate.js', '.tmp-solar-activity-report.py']) {
  const temporary = path.join(root, name); if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(JSON.stringify(summary, null, 2));
