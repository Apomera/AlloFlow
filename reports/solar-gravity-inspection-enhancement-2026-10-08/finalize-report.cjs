const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath), sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const unitRuns = ['unit-chart', 'unit-model', 'unit-comparison'].map(name => {
  assert.equal(read(name + '-source.json').sourceSha256, sourceSha256);
  return read(name + '-results.json');
});
const units = { aggregatedFromSeparateRuns: true, success: unitRuns.every(run => run.success),
  numPassedTests: unitRuns.reduce((sum, run) => sum + run.numPassedTests, 0),
  numTotalTests: unitRuns.reduce((sum, run) => sum + run.numTotalTests, 0),
  numFailedTests: unitRuns.reduce((sum, run) => sum + run.numFailedTests, 0),
  testResults: unitRuns.flatMap(run => run.testResults),
};
const visual = read('visual-results.json');
assert.equal(read('visual-source.json').sourceSha256, sourceSha256);
assert.equal(visual.sourceSha256, sourceSha256);
assert.equal(units.success, true); assert.equal(units.numPassedTests, 33); assert.equal(units.numFailedTests, 0);
assert.equal(visual.completed, true); assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for (const [name, command, args] of [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_gravity_inspection_chart.test.js']],
]) {
  const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || ''));
  assert.equal(result.status, 0, name + ': ' + result.stderr);
}
const summary = { sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name), checked: [
    'Reduced-motion pre-run release position', 'Results hidden until run', 'Keyboard checkpoint and slider interaction',
    'Shared chart cursor and capped distances', 'Round markers and aligned axis labels', 'Replay reopens saving',
    'Retry returns keyboard focus and preserves settings, journal and other learning', '13px text and 44px controls', 'No overflow or page errors',
  ] }, syntax: 'passed', whitespace: 'passed', committed: false };
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'unit-results.json'), JSON.stringify(units, null, 2) + '\n');
const temporary = path.join(root, '.tmp-solar-inspect.py');
if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
const diagnostic = path.join(root, '.tmp-solar-resources.py');
if (fs.existsSync(diagnostic)) fs.unlinkSync(diagnostic);
console.log(JSON.stringify(summary, null, 2));
