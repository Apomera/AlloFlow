// Independent read-only Git audit; only excluded audit receipts are written.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const folder = 'reports/micro-lab-home-integrity-2026-10-02';
const report = path.join(root, folder);
assert(!process.env.GIT_INDEX_FILE, 'Use the normal checkout environment for index verification.');
const branchMode = process.argv[2] === '--branch';
const committed = branchMode || process.argv[2] === '--committed';
assert(['--prepared', '--committed', '--branch'].includes(process.argv[2]));
const gitBuffer = (args, input) => cp.execFileSync('git', args, { cwd: root, input, maxBuffer: 32 * 1024 * 1024 });
const git = (args, input) => gitBuffer(args, input).toString('utf8');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const sorted = values => [...values].sort();
const runtime = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const tests = ['tests/microbiology_home_integrity.test.js', 'tests/e2e/microbiology-home-integrity.spec.ts'];
const registries = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
function owned(file) {
  if ([...runtime, ...tests].includes(file)) return true;
  if (!file.startsWith(folder + '/')) return false;
  const name = file.slice(folder.length + 1);
  return !/[\\/\r\n\t\0]/.test(name) && !/^commit-(manifest|receipt)/.test(name) && /\.(md|json|png|txt|csv|cjs)$/.test(name);
}
const manifest = read('commit-manifest.json'), validation = read('validation-summary.json');
assert.equal(manifest.parent, 'ca981c6e06161c81f9946202e9fa3078d9ea43ed');
assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), manifest.branch);
assert.equal(git(['rev-parse', 'HEAD']).trim(), manifest.checkoutParent);
assert(/^[a-f0-9]{40,64}$/.test(manifest.parent));
assert(/^[a-f0-9]{40,64}$/.test(manifest.tree));
assert(/^[a-f0-9]{64}$/.test(validation.sourceSha256));
assert.equal(validation.unit.passed, 941);
assert.equal(validation.unit.files, 26);
assert.equal(validation.unit.failed, 0);
const unitReport = read('unit-results.json');
assert.equal(unitReport.success, true); assert.equal(unitReport.numPassedTests, 941);
assert.equal(unitReport.numFailedTests, 0); assert.equal(unitReport.numPendingTests, 0); assert.equal(unitReport.testResults.length, 26);
assert.equal(validation.browser.passed, 70);
for (const key of ['failed', 'skipped', 'flaky']) assert.equal(validation.browser[key], 0);
for (const key of ['runtimeMirrored', 'microbiologyNamespacesMatch', 'syntaxChecksPassed']) assert.equal(validation.interface[key], true);
for (const key of ['missing', 'changedFallbacks']) assert.equal(validation.interface[key], 0);
const browserEvidence = require('./verify-browser.cjs')();
assert.deepEqual(validation.browser.evidence, browserEvidence);
assert.deepEqual(validation.runners.filter(item => item.kind !== 'unit'), browserEvidence.runners);
assert.equal(validation.runners.length, 1 + browserEvidence.runners.length);
for (const kind of ['unit']) {
  const matches = validation.runners.filter(item => item.kind === kind);
  assert.equal(matches.length, 1);
  const status = matches[0];
  assert.equal(status.phase, 'passed');
  assert.equal(status.exitCode, 0);
  assert.equal(status.signal, null);
  assert.equal(status.sourceStillMatches, true);
  assert.equal(status.testInputsStillMatch, true);
  assert.equal(status.syntaxChecksPassed, true);
  assert.equal(status.sourceSha256, validation.sourceSha256);
  assert.equal(status.expected, 941);
  assert(status.finished);
}
assert.equal(Object.keys(validation.testInputs).length, 37);
for (const [file, expected] of Object.entries(validation.testInputs)) {
  assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Test changed: ' + file);
}
assert(manifest.changed.length && new Set(manifest.changed).size === manifest.changed.length);
for (const file of manifest.changed) assert(owned(file), 'Unowned changed path: ' + file);
const changed = git(['diff', '--name-only', '-z', manifest.parent, manifest.tree]).split('\0').filter(Boolean);
assert.deepEqual(sorted(changed), sorted(manifest.changed));
const sealed = Object.entries(manifest.validatedFiles);
for (const file of [...runtime, ...tests]) assert(Object.hasOwn(manifest.validatedFiles, file), 'File not sealed: ' + file);
for (const [file, expected] of sealed) {
  assert(owned(file));
  assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Sealed working file changed: ' + file);
}
// Compare every committed blob with Git's clean representation of the sealed file.
const paths = sealed.map(([file]) => file);
const cleanOids = git(['hash-object', '--stdin-paths'], paths.join('\n') + '\n').trim().split('\n');
assert.equal(cleanOids.length, paths.length);
const treeRows = git(['ls-tree', '-z', manifest.tree, '--', ...paths]).split('\0').filter(Boolean);
const treeOids = new Map(treeRows.map(row => {
  const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(row); assert(match);
  return [match[3], match[2]];
}));
paths.forEach((file, index) => assert.equal(treeOids.get(file), cleanOids[index], 'Tree file differs: ' + file));
for (const file of runtime) {
  assert.equal(manifest.validatedFiles[file], validation.sourceSha256);
  assert.equal(hash(gitBuffer(['show', manifest.tree + ':' + file])), validation.sourceSha256);
  if (committed && !branchMode) assert.equal(hash(gitBuffer(['show', ':' + file])), validation.sourceSha256);
}
for (const file of registries) {
  assert(gitBuffer(['show', manifest.parent + ':' + file]).equals(gitBuffer(['show', manifest.tree + ':' + file])), 'Registry changed: ' + file);
}
let receipt;
if (committed) {
  receipt = read(branchMode ? 'commit-receipt-isolated-branch.json' : 'commit-receipt.json');
  assert.equal(receipt.refUpdated, true);
  assert.equal(receipt.unrelatedStagingPreserved, true);
  if (branchMode) {
    assert.equal(receipt.checkoutBranch, manifest.branch);
    assert.equal(receipt.checkoutIndexTouched, false);
    assert.equal(receipt.checkoutIndexPreserved, true);
    assert(/^refs\/heads\/codex\/micro-home-integrity-2026-10-03(?:-\d+)?$/.test(receipt.branch));
    assert.equal(git(['rev-parse', receipt.branch]).trim(), receipt.commit);
    assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), manifest.branch);
    assert.equal(git(['rev-parse', 'HEAD']).trim(), manifest.checkoutParent);
    const actualIndex = path.resolve(root, git(['rev-parse', '--git-path', 'index']).trim());
    assert.equal(hash(fs.readFileSync(actualIndex)), receipt.checkoutIndexSha256);
    const staged = gitBuffer(['ls-files', '--stage', '-z']);
    assert.equal(hash(staged), receipt.checkoutStagingSha256);
    assert.equal(staged.toString('utf8').split('\0').filter(Boolean).length, receipt.checkoutStagingEntries);
  } else {
    assert.equal(receipt.indexRefreshed, true);
    assert(receipt.unrelatedIndexEntries > 0 && /^[a-f0-9]{64}$/.test(receipt.unrelatedIndexSha256));
    assert.equal(receipt.originalIndex, null);
    assert.equal(receipt.refreshedIndex, null);
    assert.equal(receipt.branch, manifest.branch);
  }
  for (const key of ['parent', 'tree']) assert.equal(receipt[key], manifest[key]);
  assert.deepEqual(sorted(receipt.changed), sorted(manifest.changed));
  assert.equal(git(['rev-parse', receipt.commit + '^{tree}']).trim(), manifest.tree);
  assert.equal(git(['show', '-s', '--format=%P', receipt.commit]).trim(), manifest.parent);
  git(['merge-base', '--is-ancestor', receipt.commit, branchMode ? receipt.branch : 'HEAD']);
}
const audit = {
  mode: committed ? 'committed' : 'prepared', passed: true, parent: manifest.parent, tree: manifest.tree,
  ...(committed ? { commit: receipt.commit, branch: receipt.branch, refUpdated: true, unrelatedStagingPreserved: true,
    ...(branchMode ? { isolatedBranch: true, checkoutIndexPreserved: true, checkoutStagingEntries: receipt.checkoutStagingEntries } :
      { indexRefreshed: true, ancestorOfHead: true, unrelatedIndexEntries: receipt.unrelatedIndexEntries }) } : {}),
  changedFiles: changed.length, sealedFiles: sealed.length, sourceSha256: validation.sourceSha256,
  unitPassed: 941, browserPassed: 70, workingFilesMatchSealedInputs: true,
  browserVerificationMode: validation.browser.verificationMode, initialBrowserFailures: validation.browser.initialFailures, browserRechecked: validation.browser.rechecked,
  treeFilesMatchSealedInputs: true, registriesUnchanged: true
};
fs.writeFileSync(path.join(report, committed ? 'commit-receipt-verification.json' : 'commit-manifest-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit));
