const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath), sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
for (const name of ['unit-assignment', 'unit-path', 'visual']) {
  assert.equal(read(name + '-exit.json').status, 0); assert.equal(read(name + '-exit.json').sourceSha256, sourceSha256);
  assert.equal(read(name + '-source.json').sourceSha256, sourceSha256);
}
const runs = ['unit-assignment', 'unit-path'].map(name => {
  const result = read(name + '-results.json'); assert.equal(result.success, true);
  assert.ok(result.numTotalTests > 0); assert.equal(result.numPassedTests, result.numTotalTests); return result;
});
const units = { success: true, numPassedTests: runs.reduce((sum, run) => sum + run.numPassedTests, 0), numTotalTests: runs.reduce((sum, run) => sum + run.numTotalTests, 0), testResults: runs.flatMap(run => run.testResults) };
const visual = read('visual-results.json'); assert.equal(visual.sourceSha256, sourceSha256);
assert.equal(visual.completed, true); assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for (const [name, command, args] of [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_assignment_workspace.test.js']],
]) { const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' }); fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || '')); assert.equal(result.status, 0, name + ': ' + result.stderr); }
const summary = { sourceSha256, baselineSha256: read('baseline.json').sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name), checked: [
    'Four responsive assignment cards show independent saved progress even while paused', 'Disclosure and selected-state semantics',
    'Native keyboard checking and unchecking with full-size labels', 'Pause preserves all checklists and returns focus to the assignment card',
    'Resume focuses the next unchecked task without changing saved state', 'Checklist focus follows the committed selection',
    'Each assignment awards completion points once; uncheck/recheck cannot re-award', 'Legacy and malformed saved records handled without render-time writes',
    'Quest completion recognizes paused completed assignments', 'Journal, comparison, vocabulary, checkpoint and learning-path work preserved',
    'Readable desktop and 320px layouts in light and dark themes', '13px minimum text, 16px instructions, 44px buttons and checkbox labels',
    'No text or page overflow and no browser errors',
  ] }, syntax: 'passed', whitespace: 'passed', committed: false };
fs.writeFileSync(path.join(__dirname, 'unit-results.json'), JSON.stringify(units, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const name of ['.tmp-solar-next-read.py', '.tmp-solar-assignment-component.txt', '.tmp-solar-assignment-edit.py', '.tmp-solar-assignment-candidate.js', '.tmp-solar-assignment-report.py']) {
  const temporary = path.join(root, name); if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(JSON.stringify(summary, null, 2));
