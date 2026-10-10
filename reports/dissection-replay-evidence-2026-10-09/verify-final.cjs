const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const vm = require('node:vm');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-replay-evidence-2026-10-09');
const read = p => fs.readFileSync(path.join(repo, p));
const json = p => JSON.parse(fs.readFileSync(path.join(report, p), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => cp.execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true }).trim();
const baseline = json('baseline.json');
const sourceEdits = json('edits/source-edits.json');
const unitEdit = json('edits/unit-edit.json');
const sourcePath = 'stem_lab/stem_tool_dissection.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_dissection.js';
const unitPath = 'tests/dissection_lab_improvements.test.js';
const newUnitPath = 'tests/dissection_replay_evidence.test.js';
const browserPath = 'tests/e2e/dissection-replay-evidence.spec.ts';
const source = read(sourcePath), unit = read(unitPath);
assert(source.equals(read(mirrorPath)), 'source/runtime parity');
assert.equal(hash(source), sourceEdits.after);
assert.equal(hash(unit), unitEdit.current);
new vm.Script(source.toString(), { filename: sourcePath });
let reversed = source.toString();
for (const edit of [...sourceEdits.edits].reverse()) {
  assert.equal(reversed.split(edit.after).length - 1, 1, 'unique reverse source edit');
  reversed = reversed.replace(edit.after, edit.before);
}
assert.equal(hash(reversed), baseline.source);
assert.equal(hash(zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits/source-before.js.gz')))), baseline.source);
let reversedUnit = unit.toString();
for (const edit of [...unitEdit.edits].reverse()) {
  assert.equal(reversedUnit.split(edit.after).length - 1, edit.count);
  reversedUnit = reversedUnit.split(edit.after).join(edit.before);
}
assert.equal(hash(reversedUnit), baseline.unit);
assert.equal(hash(zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits/unit-before.js.gz')))), baseline.unit);
for (const [file, expected] of Object.entries(baseline.protected)) assert.equal(hash(read(file)), expected, file);
const runs = {};
for (const label of ['unit-' + (process.argv[2] || '6'), 'browser-' + (process.argv[3] || '8')]) {
  const run = json(label + '/run.json'), result = json(label + '/results.json');
  assert.equal(run.exitCode, 0, label);
  assert.equal(run.inputHashesStable, true, label);
  assert.deepEqual(run.startHashes, run.endHashes, label);
  for (const [file, expected] of Object.entries(run.endHashes)) assert.equal(hash(read(file)), expected, label + ' final input ' + file);
  if (label.startsWith('unit')) {
    assert.equal(result.numFailedTests, 0);
    assert.equal(result.numPassedTests, 14);
    runs[label] = { passed: result.numPassedTests, failed: result.numFailedTests, excluded: result.numPendingTests, inputs: run.endHashes };
  } else {
    assert.equal(result.stats.expected, 4);
    assert.equal(result.stats.unexpected, 0);
    assert.equal(result.stats.flaky, 0);
    assert.equal(result.stats.skipped, 0);
    runs[label] = { ...result.stats, inputs: run.endHashes };
  }
}
const audits = {};
for (const name of ['legacy-phone', 'saved-desktop', 'pressure-forced-colors', 'supported-embedded-large']) {
  const audit = json('browser-' + (process.argv[3] || '8') + '/captures/' + name + '-axe.json');
  assert.equal(audit.violations.length, 0);
  audits[name] = { violations: audit.violations.length, incomplete: audit.incomplete.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
}
const scope = [sourcePath, mirrorPath, unitPath, newUnitPath, browserPath];
git(['diff', '--check', '--', ...scope]);
for (const file of [newUnitPath, browserPath]) assert(!/[\t ]+$/m.test(read(file).toString()), file + ' whitespace');
const staged = git(['diff', '--cached', '--name-only']);
assert.equal(staged, baseline.staged, 'index names unchanged');
const head = git(['rev-parse', 'HEAD']);
const scopedCommits = head === baseline.head ? '' : git(['diff', '--name-only', baseline.head, head, '--', ...scope]);
assert.equal(scopedCommits, '', 'no concurrent commits in owned source/test scope');
const archived = {};
for (const [file, archive] of [[sourcePath, 'source-after.js.gz'], [unitPath, 'unit-after.js.gz'], [newUnitPath, 'replay-unit-after.js.gz'], [browserPath, 'browser-after.ts.gz']]) {
  const buffer = read(file);
  fs.writeFileSync(path.join(report, 'edits', archive), zlib.gzipSync(buffer));
  archived[file] = { sha256: hash(buffer), archive: 'edits/' + archive };
}
const result = { at: new Date().toISOString(), sourceSha256: hash(source), unitSha256: hash(unit), sourceRuntimeParity: true, sourceSyntax: true, sourceReversalEdits: sourceEdits.edits.length, sourceReversalMatchesBaseline: true, unitReversalMatchesBaseline: true, protectedFilesUnchanged: Object.keys(baseline.protected).length, runs, audits, scopedWhitespace: true, baselineHead: baseline.head, finalHead: head, concurrentOwnedCommits: scopedCommits, stagedNamesUnchanged: true, stagedNames: staged, scopedStatus: git(['status', '--short', '--', ...scope]), archived };
fs.writeFileSync(path.join(report, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
fs.copyFileSync(__filename, path.join(report, 'verify-final.cjs'));
console.log(JSON.stringify({ source: result.sourceSha256, unit: result.unitSha256, protected: result.protectedFilesUnchanged, reverseEdits: result.sourceReversalEdits, head, unitPassed: 14, browserPassed: 4, audits, archived }, null, 2));
