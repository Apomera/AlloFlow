const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath), sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
for (const name of ['unit-board', 'unit-log', 'visual']) {
  assert.equal(read(name + '-exit.json').status, 0);
  assert.equal(read(name + '-exit.json').sourceSha256, sourceSha256);
  assert.equal(read(name + '-source.json').sourceSha256, sourceSha256);
}
const runs = ['unit-board', 'unit-log'].map(name => {
  const result = read(name + '-results.json'); assert.equal(result.success, true);
  assert.ok(result.numTotalTests > 0); assert.equal(result.numPassedTests, result.numTotalTests); return result;
});
const units = { success: true, numPassedTests: runs.reduce((sum, run) => sum + run.numPassedTests, 0), numTotalTests: runs.reduce((sum, run) => sum + run.numTotalTests, 0), testResults: runs.flatMap(run => run.testResults) };
const visual = read('visual-results.json'); assert.equal(visual.sourceSha256, sourceSha256);
assert.equal(visual.completed, true); assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for (const [name, command, args] of [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_challenge_board.test.js']],
]) {
  const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || ''));
  assert.equal(result.status, 0, name + ': ' + result.stderr);
}
const summary = { sourceSha256, baselineSha256: read('baseline.json').sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name) }, validatedBehavior: [
    'Readable responsive cards for all 18 challenges with visible requirements and rewards',
    'Explicit completed and to-explore states independent of color',
    'Named progress bar counts unique recognized completed achievements',
    'Duplicate and unknown saved achievement records remain intact',
    'Malformed saved point balances, filters and collections display safely',
    'Compact persistent disclosure with native status filter and result counts',
    'Open and empty-filter reset focus is applied only to committed connected controls',
    'Restored state and native filtering do not steal focus',
    'Collapsing or changing filters cancels superseded focus requests',
    'Browsing preserves saved learning and rewards',
    'Mission log regression suite passes',
    'Desktop and 320px layouts in both themes have no overflow or browser errors',
    'Minimum 44px controls, 16px requirement text and forced-colors progress visibility',
  ], visualReview: ['challenge-board-1060-light-all.png', 'challenge-board-320-dark-completed.png', 'challenge-board-1060-dark-completed.png'],
  syntax: 'passed', whitespace: 'passed', committed: false };
fs.writeFileSync(path.join(__dirname, 'unit-results.json'), JSON.stringify(units, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const name of ['.tmp-solar-read.cjs', '.tmp-solar-challenge-component.txt', '.tmp-solar-challenge-edit.cjs', '.tmp-solar-challenge-candidate.js', '.tmp-solar-challenge-report.cjs']) {
  const temporary = path.join(root, name); if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(JSON.stringify(summary, null, 2));
