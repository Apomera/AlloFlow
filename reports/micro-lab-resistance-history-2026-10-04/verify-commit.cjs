const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const input = require('./validation-inputs.cjs');
const root = path.resolve(__dirname, '../..');
const folder = 'reports/micro-lab-resistance-history-2026-10-04', report = path.join(root, folder);
assert(!process.env.GIT_INDEX_FILE);
const committed = process.argv[2] === '--branch'; assert(committed || process.argv[2] === '--prepared');
const gitBuffer = (args, bytes) => cp.execFileSync('git', args, { cwd: root, input: bytes, maxBuffer: 32 * 1024 * 1024 });
const git = (args, bytes) => gitBuffer(args, bytes).toString('utf8');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const namespaceHash = bytes => {
  const labels = JSON.parse(bytes.toString('utf8')).stem.microbiology;
  return hash(JSON.stringify(Object.fromEntries(Object.keys(labels).sort().map(key => [key, labels[key]]))));
};
const read = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const sorted = values => [...values].sort();
function owned(file) {
  if ([...input.runtime, ...input.ownedTests, ...input.registries].includes(file)) return true;
  if (!file.startsWith(folder + '/')) return false;
  const name = file.slice(folder.length + 1);
  return !/[\\/\r\n\t\0]/.test(name) && !/^commit-(manifest|receipt)/.test(name) && /\.(md|json|png|txt|csv|cjs)$/.test(name);
}
const manifest = read('commit-manifest.json'), validation = read('validation-summary.json');
assert.deepEqual(sorted(Object.keys(manifest.registryNamespaces)), sorted(input.registries));
const audited = require('./audit-validation.cjs')({ skipRegistryChecks: committed });
if (committed) {
  const { interface: registryEvidence, ...otherEvidence } = validation;
  assert(registryEvidence); assert.deepEqual(audited, otherEvidence);
} else assert.deepEqual(audited, validation);
assert.equal(manifest.parent, input.parent);
assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), manifest.branch); assert.equal(git(['rev-parse', 'HEAD']).trim(), manifest.checkoutParent);
assert(manifest.changed.length && new Set(manifest.changed).size === manifest.changed.length);
const changed = git(['diff', '--name-only', '-z', manifest.parent, manifest.tree]).split('\0').filter(Boolean);
assert.deepEqual(sorted(changed), sorted(manifest.changed));
for (const file of changed) assert(owned(file), file);
for (const file of [...input.runtime, ...input.ownedTests, ...input.registries]) assert(Object.hasOwn(manifest.validatedFiles, file));
const registryDrift = [];
for (const [file, expected] of Object.entries(manifest.validatedFiles)) {
  assert(owned(file));
  const current = hash(fs.readFileSync(path.join(root, file)));
  if (input.registries.includes(file)) {
    assert.equal(namespaceHash(fs.readFileSync(path.join(root, file))), manifest.registryNamespaces[file], 'Micro Lab registry namespace changed: ' + file);
    if (current !== expected) registryDrift.push({ file, preparedSha256: expected, workingSha256: current });
  } else assert.equal(current, expected, 'Sealed file changed: ' + file);
}
const paths = Object.keys(manifest.validatedFiles).filter(file => !input.registries.includes(file));
const cleanOids = git(['hash-object', '--stdin-paths'], paths.join('\n') + '\n').trim().split('\n');
function treeBlobs(paths) {
  return new Map(git(['ls-tree', '-z', manifest.tree, '--', ...paths]).split('\0').filter(Boolean).map(row => {
    const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(row); assert(match); return [match[3], match[2]];
  }));
}
const treeOids = treeBlobs(paths);
assert.equal(paths.length, cleanOids.length);
paths.forEach((file, index) => assert.equal(treeOids.get(file), cleanOids[index], 'Committed file differs: ' + file));
// Inherited tests and tracked support must be precisely the files captured by the passing runners.
const inputPaths = Object.keys(validation.testInputs).concat(validation.supplementaryInputs.map(item => item.file));
assert.equal(inputPaths.length, input.expectedInputCount); assert.equal(new Set(inputPaths).size, input.expectedInputCount);
const inputOids = treeBlobs(inputPaths);
const cleanInputs = git(['hash-object', '--stdin-paths'], inputPaths.join('\n') + '\n').trim().split('\n');
assert.equal(cleanInputs.length, inputPaths.length);
inputPaths.forEach((file, index) => {
  if (inputOids.has(file)) assert.equal(inputOids.get(file), cleanInputs[index], 'Validated inherited input differs from tree: ' + file);
  else assert(input.localDependencies.includes(file), 'A validated test or tracked helper is missing from the tree: ' + file);
});
for (const file of input.runtime) assert.equal(hash(gitBuffer(['show', manifest.tree + ':' + file])), validation.sourceSha256);
const treeSource = git(['show', manifest.tree + ':' + input.runtime[0]]);
const parentSource = git(['show', manifest.parent + ':' + input.runtime[0]]);
const treeRegistries = [];
for (const file of input.registries) {
  const patch = require('./registry-patch.cjs')(git(['show', manifest.parent + ':' + file]), treeSource);
  const bytes = git(['show', manifest.tree + ':' + file]);
  assert.equal(bytes, patch.text, 'Committed registry changed another label or namespace.');
  assert.equal(namespaceHash(bytes), manifest.registryNamespaces[file], 'Immutable Micro Lab namespace differs from the sealed namespace.');
  assert.equal(git(['rev-parse', manifest.tree + ':' + file]).trim(), manifest.registryBlobs[file]);
  treeRegistries.push([file, bytes]);
  const working = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).stem.microbiology;
  for (const [key, expected] of Object.entries(patch.labels)) assert.equal(working[key], expected, 'Working owned label changed: ' + file + ':' + key);
}
const checkDefaults = require('./check-defaults.cjs');
const immutableLabels = checkDefaults(treeSource, parentSource, treeRegistries);
assert.equal(immutableLabels.keys, input.expectedInterfaceKeys);
assert.deepEqual(immutableLabels.sourceKeyChanges, { added: [], removed: [], changed: [] });
assert.equal(Object.keys(immutableLabels.ownLabels).length, input.expectedOwnLabels);
for (const registry of immutableLabels.registries) {
  assert.equal(registry.namespaceKeys, input.expectedNamespaceKeys);
  assert.deepEqual(registry.missing, []); assert.deepEqual(registry.changedFallbacks, []); assert.deepEqual(registry.ownedLabelMismatches, []);
}
assert.deepEqual(...treeRegistries.map(([, bytes]) => JSON.parse(bytes).stem.microbiology));
assert.deepEqual(validation.interface, { keys: input.expectedInterfaceKeys, namespaceKeys: input.expectedNamespaceKeys, missing: 0, changedFallbacks: 0, newLabels: input.expectedOwnLabels, sourceLabelsUnchanged: true, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true });
const workingRegistryBytes = input.registries.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
const workingLabels = checkDefaults(fs.readFileSync(path.join(root, input.runtime[0]), 'utf8'), parentSource, workingRegistryBytes);
assert.equal(workingLabels.keys, input.expectedInterfaceKeys);
assert.deepEqual(workingLabels.sourceKeyChanges, { added: [], removed: [], changed: [] });
assert.equal(Object.keys(workingLabels.ownLabels).length, input.expectedOwnLabels);
for (const registry of workingLabels.registries) {
  assert.equal(registry.namespaceKeys, input.expectedNamespaceKeys);
  assert.deepEqual(registry.missing, []); assert.deepEqual(registry.changedFallbacks, []); assert.deepEqual(registry.ownedLabelMismatches, []);
}
let receipt;
if (committed) {
  receipt = read('commit-receipt-isolated-branch.json');
  for (const key of ['refUpdated', 'unrelatedStagingPreserved', 'checkoutIndexPreserved']) assert.equal(receipt[key], true);
  assert.equal(receipt.checkoutIndexTouched, false); assert.equal(receipt.checkoutBranch, manifest.branch);
  assert(/^refs\/heads\/codex\/micro-resistance-history-2026-10-04(?:-\d+)?$/.test(receipt.branch));
  assert.equal(git(['rev-parse', receipt.branch]).trim(), receipt.commit);
  assert.equal(git(['rev-parse', receipt.commit + '^{tree}']).trim(), manifest.tree);
  assert.equal(git(['show', '-s', '--format=%P', receipt.commit]).trim(), manifest.parent);
  assert.equal(receipt.parent, manifest.parent); assert.equal(receipt.tree, manifest.tree);
  assert.equal(receipt.commitManifestSha256, hash(fs.readFileSync(path.join(report, 'commit-manifest.json'))));
  assert.equal(receipt.validationSummarySha256, hash(fs.readFileSync(path.join(report, 'validation-summary.json'))));
  assert.deepEqual(sorted(receipt.changed), sorted(manifest.changed));
  const actualIndex = path.resolve(root, git(['rev-parse', '--git-path', 'index']).trim());
  assert.equal(hash(fs.readFileSync(actualIndex)), receipt.checkoutIndexSha256);
  const staged = gitBuffer(['ls-files', '--stage', '-z']);
  assert.equal(hash(staged), receipt.checkoutStagingSha256);
  assert.equal(staged.toString('utf8').split('\0').filter(Boolean).length, receipt.checkoutStagingEntries);
}
const result = { mode: committed ? 'committed' : 'prepared', passed: true, parent: manifest.parent, tree: manifest.tree,
  ...(receipt ? { commit: receipt.commit, branch: receipt.branch, checkoutIndexPreserved: true, unrelatedStagingPreserved: true } : {}),
  changedFiles: changed.length, sealedFiles: Object.keys(manifest.validatedFiles).length, sourceSha256: validation.sourceSha256,
  unitPassed: validation.unit.passed, browserPassed: validation.browser.passed,
  registryScope: 'Registry blobs exactly match the immutable parent; unrelated working registry changes excluded.',
  workingSourceLabelsValid: true, workingRegistrySha256Drift: registryDrift };
fs.writeFileSync(path.join(report, committed ? 'commit-receipt-verification.json' : 'commit-manifest-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
