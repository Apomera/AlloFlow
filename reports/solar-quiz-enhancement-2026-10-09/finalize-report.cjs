const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath), sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
for (const name of ['unit-quiz', 'unit-shuffle', 'visual']) {
  assert.equal(read(name + '-exit.json').status, 0); assert.equal(read(name + '-exit.json').sourceSha256, sourceSha256);
  assert.equal(read(name + '-source.json').sourceSha256, sourceSha256);
}
const runs = ['unit-quiz', 'unit-shuffle'].map(name => {
  const result = read(name + '-results.json'); assert.equal(result.success, true);
  assert.ok(result.numTotalTests > 0); assert.equal(result.numPassedTests, result.numTotalTests); return result;
});
const units = { success: true, numPassedTests: runs.reduce((sum, run) => sum + run.numPassedTests, 0), numTotalTests: runs.reduce((sum, run) => sum + run.numTotalTests, 0), testResults: runs.flatMap(run => run.testResults) };
const visual = read('visual-results.json'); assert.equal(visual.sourceSha256, sourceSha256);
assert.equal(visual.completed, true); assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for (const [name, command, args] of [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_quiz_workbench.test.js']],
]) { const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' }); fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || '')); assert.equal(result.status, 0, name + ': ' + result.stderr); }
const summary = { sourceSha256, baselineSha256: read('baseline.json').sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name) }, validatedBehavior: [
    'Responsive answer cards with 16px copy and explicit chosen/correct status', 'Start, skip, next-question and next-round actions describe their current behavior',
    'Persistent correct and incorrect explanations', 'Keyboard focus reaches matching committed question and feedback headings',
    'Cumulative score and current streak survive draws and round changes', 'Only the first answer counts; duplicate and stale actions cannot overwrite progress',
    'Pure atomic question/history updates keep shuffled choices stable', 'All 15 questions drawn once before a round restarts',
    'Legacy longest-year wording and history map to worlds rather than calling Pluto a planet', 'Malformed saved question and counter recovery',
    'Journal, comparison, vocabulary, checkpoint, learning-path and assignment state preserved',
    'Readable desktop and 320px layouts in both themes with no overflow or browser errors',
  ], syntax: 'passed', whitespace: 'passed', committed: false };
fs.writeFileSync(path.join(__dirname, 'unit-results.json'), JSON.stringify(units, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const name of ['.tmp-solar-quiz-read.py', '.tmp-solar-quiz-component.txt', '.tmp-solar-quiz-edit.py', '.tmp-solar-quiz-candidate.js', '.tmp-solar-quiz-report.py']) {
  const temporary = path.join(root, name); if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(JSON.stringify(summary, null, 2));
