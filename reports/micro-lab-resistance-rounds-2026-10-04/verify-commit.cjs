const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), folder = 'reports/micro-lab-resistance-rounds-2026-10-04', report = path.join(root, folder);
assert(!process.env.GIT_INDEX_FILE);
const committed = process.argv[2] === '--branch'; assert(committed || process.argv[2] === '--prepared');
const gitBuffer = (args, input) => cp.execFileSync('git', args, { cwd: root, input, maxBuffer: 32 * 1024 * 1024 });
const git = (args, input) => gitBuffer(args, input).toString('utf8');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const sorted = x => [...x].sort();
const runtime = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const tests = ['tests/microbiology_resistance_rounds.test.js', 'tests/e2e/microbiology-resistance-rounds.spec.ts'];
const registries = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
function owned(file) {
  if ([...runtime, ...tests, ...registries].includes(file)) return true;
  if (!file.startsWith(folder + '/')) return false;
  const name = file.slice(folder.length + 1);
  return !/[\\/\r\n\t\0]/.test(name) && !/^commit-(manifest|receipt)/.test(name) && /\.(md|json|png|txt|csv|cjs)$/.test(name);
}
const manifest = read('commit-manifest.json'), validation = read('validation-summary.json');
assert.deepEqual(require('./audit-validation.cjs')(), validation);
assert.equal(manifest.parent, '36d70aaa36bddf4789ef5d56dca420283a11098d');
assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), manifest.branch); assert.equal(git(['rev-parse', 'HEAD']).trim(), manifest.checkoutParent);
assert(manifest.changed.length && new Set(manifest.changed).size === manifest.changed.length);
const changed = git(['diff', '--name-only', '-z', manifest.parent, manifest.tree]).split('\0').filter(Boolean);
assert.deepEqual(sorted(changed), sorted(manifest.changed));
for (const file of changed) assert(owned(file), file);
for (const file of [...runtime, ...tests, ...registries]) assert(Object.hasOwn(manifest.validatedFiles, file));
for (const [file, expected] of Object.entries(manifest.validatedFiles)) {
  assert(owned(file)); assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Sealed file changed: ' + file);
}
const paths = Object.keys(manifest.validatedFiles).filter(file => !registries.includes(file));
const cleanOids = git(['hash-object', '--stdin-paths'], paths.join('\n') + '\n').trim().split('\n');
const treeRows = git(['ls-tree', '-z', manifest.tree, '--', ...paths]).split('\0').filter(Boolean);
const treeOids = new Map(treeRows.map(row => { const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(row); assert(match); return [match[3], match[2]]; }));
assert.equal(paths.length, cleanOids.length);
paths.forEach((file, index) => assert.equal(treeOids.get(file), cleanOids[index], 'Committed file differs: ' + file));
// Baseline tests and tracked harness files must also be the versions that ran.
const inputPaths = Object.keys(validation.testInputs).concat(validation.supplementaryInputs.map(item => item.file));
const inputRows = git(['ls-tree', '-z', manifest.tree, '--', ...inputPaths]).split('\0').filter(Boolean);
const inputOids = new Map(inputRows.map(row => { const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(row); assert(match); return [match[3], match[2]]; }));
const cleanInputs = git(['hash-object', '--stdin-paths'], inputPaths.join('\n') + '\n').trim().split('\n');
const localDependencies = ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  'node_modules/@playwright/test/package.json', 'node_modules/playwright/package.json', 'node_modules/playwright-core/package.json'];
assert.equal(cleanInputs.length, inputPaths.length);
inputPaths.forEach((file, index) => {
  if (inputOids.has(file)) assert.equal(inputOids.get(file), cleanInputs[index], 'Validated inherited input differs from tree: ' + file);
  else assert(localDependencies.includes(file), 'A validated test or tracked helper is missing from the tree: ' + file);
});
for (const file of runtime) assert.equal(hash(gitBuffer(['show', manifest.tree + ':' + file])), validation.sourceSha256);
for (const file of registries) {
  const patch = require('./registry-patch.cjs')(git(['show', manifest.parent + ':' + file]), fs.readFileSync(path.join(root, runtime[0]), 'utf8'));
  assert.equal(git(['show', manifest.tree + ':' + file]), patch.text, 'Committed registry changed another label or namespace.');
  assert.equal(git(['rev-parse', manifest.tree + ':' + file]).trim(), manifest.registryBlobs[file]);
  const working = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).stem.microbiology;
  for (const [key, expected] of Object.entries(patch.labels)) assert.equal(working[key], expected);
}
let receipt;
if (committed) {
  receipt = read('commit-receipt-isolated-branch.json');
  for (const key of ['refUpdated', 'unrelatedStagingPreserved', 'checkoutIndexPreserved']) assert.equal(receipt[key], true);
  assert.equal(receipt.checkoutIndexTouched, false); assert.equal(receipt.checkoutBranch, manifest.branch);
  assert(/^refs\/heads\/codex\/micro-resistance-rounds-2026-10-04(?:-\d+)?$/.test(receipt.branch));
  assert.equal(git(['rev-parse', receipt.branch]).trim(), receipt.commit);
  assert.equal(git(['rev-parse', receipt.commit + '^{tree}']).trim(), manifest.tree);
  assert.equal(git(['show', '-s', '--format=%P', receipt.commit]).trim(), manifest.parent);
  assert.equal(receipt.parent, manifest.parent); assert.equal(receipt.tree, manifest.tree);
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
  unitPassed: validation.unit.passed, browserPassed: validation.browser.passed, registryScope: 'Eight comparison labels only; other registry changes excluded.' };
fs.writeFileSync(path.join(report, committed ? 'commit-receipt-verification.json' : 'commit-manifest-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
