const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), sourcePath = path.join(root, 'stem_lab/stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath), sourceSha256 = createHash('sha256').update(source).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const runs = ['unit-journal', 'unit-navigation'].map(name => { assert.equal(read(name + '-source.json').sourceSha256, sourceSha256); const result = read(name + '-results.json'); assert.equal(result.success, true); return result; });
const units = { success: true, aggregatedFromSeparateRuns: true, numPassedTests: runs.reduce((sum, run) => sum + run.numPassedTests, 0), numTotalTests: runs.reduce((sum, run) => sum + run.numTotalTests, 0), testResults: runs.flatMap(run => run.testResults) };
assert.equal(units.numPassedTests, 31); assert.equal(units.numTotalTests, 31);
const visual = read('visual-results.json');
assert.equal(read('visual-source.json').sourceSha256, sourceSha256); assert.equal(visual.sourceSha256, sourceSha256);
assert.equal(visual.completed, true); assert.equal(visual.results.length, 4);
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for (const [name, command, args] of [
  ['syntax', process.execPath, ['--max-old-space-size=64', '--check', sourcePath]],
  ['whitespace', 'git', ['diff', '--check', '--', 'stem_lab/stem_tool_solarsystem.js', 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js', 'tests/solar_system_journal_drafts.test.js']],
]) { const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' }); fs.writeFileSync(path.join(__dirname, name + '-log.txt'), (result.stdout || '') + (result.stderr || '')); assert.equal(result.status, 0, name + ': ' + result.stderr); }
const summary = { sourceSha256, verifiedAt: new Date().toISOString(), desktopMirrorMatches: true,
  units: { passed: units.numPassedTests, total: units.numTotalTests, suites: units.testResults.map(suite => path.relative(root, suite.name)) },
  browser: { passed: visual.results.length, cases: visual.results.map(result => result.name), checked: [
    'Four controlled fields restore after closing', 'Drafts stay with their worlds', 'Whitespace cannot enable saving',
    'Saving preserves raw paragraphs and clears only the current draft', 'Prior entries and explanation drafts preserved',
    'Filter resets so the new entry is visible', 'Keyboard save focuses confirmation', 'Cross-lab synthesis snapshots and labels preserved',
    'Balanced desktop grid and single-column phone layout', '13px minimum journal text and 44px controls', '16px textareas', 'No page overflow or errors',
  ] }, syntax: 'passed', whitespace: 'passed', committed: false };
fs.writeFileSync(path.join(__dirname, 'unit-results.json'), JSON.stringify(units, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const name of ['.tmp-solar-read.py', '.tmp-solar-journal-polish.py']) {
  const temporary = path.join(root, name); if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(JSON.stringify(summary, null, 2));
