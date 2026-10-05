// Read-only Git audit. Only the excluded audit JSON is written.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const folder = 'reports/micro-lab-measurement-conversion-2026-10-01';
const report = path.join(root, folder);
const mode = process.argv[2];
assert(['--prepared', '--committed'].includes(mode), 'Use --prepared or --committed.');
const committed = mode === '--committed';
const read = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const gitBuffer = args => cp.execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const git = args => gitBuffer(args).toString('utf8');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sorted = values => [...values].sort();
const runtime = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const tests = [
  'tests/microbiology_measurement_conversion.test.js',
  'tests/microbiology_measurement_conversion_workflow.test.js',
  'tests/microbiology_microscope.test.js',
  'tests/e2e/microbiology-measurement-conversion.spec.ts'
];
const shared = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const explicit = new Set([...runtime, ...tests]);
function owned(file) {
  if (explicit.has(file)) return true;
  if (!file.startsWith(folder + '/')) return false;
  const name = file.slice(folder.length + 1);
  return !name.includes('/') && !name.includes('\\') && !/^commit-(manifest|receipt)/.test(name) && /\.(md|json|png|txt|csv|cjs)$/.test(name);
}
function namespace(text) {
  const marker = '    "microbiology": {';
  const index = text.indexOf(marker);
  assert(index >= 0 && text.indexOf(marker, index + 1) < 0, 'Ambiguous Micro namespace.');
  const start = text.indexOf('{', index);
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      const raw = text.slice(start, i + 1), value = JSON.parse(raw);
      assert.deepEqual(value, JSON.parse(text).stem.microbiology, 'Wrong namespace.');
      return { raw, value, outside: text.slice(0, start) + '\0MICRO\0' + text.slice(i + 1) };
    }
  }
  throw Error('Unclosed Micro namespace.');
}
const manifest = read('commit-manifest.json');
const validation = read('validation-summary.json');
assert(/^[a-f0-9]{40,64}$/.test(manifest.parent), 'Invalid parent.');
assert(/^[a-f0-9]{40,64}$/.test(manifest.tree), 'Invalid tree.');
assert(/^[a-f0-9]{64}$/.test(validation.sourceSha256), 'Invalid source hash.');
assert.equal(validation.unit.passed, 794);
assert.equal(validation.unit.failed, 0);
assert.equal(validation.unit.files, 24);
assert.equal(validation.browser.passed, 56);
for (const name of ['failed', 'skipped', 'flaky']) assert.equal(validation.browser[name], 0, 'Browser ' + name + '.');
for (const name of ['runtimeMirrored', 'microbiologyNamespacesMatch', 'syntaxChecksPassed']) assert.equal(validation.interface[name], true, 'Missing check: ' + name);
assert.equal(validation.interface.missing, 0);
assert.equal(validation.interface.changedFallbacks, 0);
assert(Array.isArray(validation.runners) && validation.runners.length === 2, 'Missing runner evidence.');
for (const kind of ['unit', 'browser']) {
  const matches = validation.runners.filter(item => item.kind === kind);
  assert.equal(matches.length, 1, 'Ambiguous runner: ' + kind);
  const status = matches[0];
  assert.equal(status.phase, 'passed');
  assert.equal(status.exitCode, 0);
  assert.equal(status.signal, null);
  assert.equal(status.sourceStillMatches, true);
  assert.equal(status.sourceSha256, validation.sourceSha256);
  assert.equal(status.expected, kind === 'unit' ? 794 : 56);
  assert(status.finished, 'Unfinished runner: ' + kind);
}
assert(Array.isArray(manifest.changed) && manifest.changed.length, 'Missing changed paths.');
assert.equal(new Set(manifest.changed).size, manifest.changed.length, 'Duplicate changed paths.');
for (const file of manifest.changed) assert(owned(file) || shared.includes(file), 'Unowned changed path: ' + file);
const changed = git(['diff', '--name-only', '-z', manifest.parent, manifest.tree]).split('\0').filter(Boolean);
assert.deepEqual(sorted(changed), sorted(manifest.changed), 'Tree paths differ from manifest.');
assert(manifest.validatedFiles && typeof manifest.validatedFiles === 'object' && !Array.isArray(manifest.validatedFiles), 'Missing sealed files.');
for (const file of [...runtime, ...tests]) assert(Object.hasOwn(manifest.validatedFiles, file), 'File not sealed: ' + file);
for (const [file, expected] of Object.entries(manifest.validatedFiles)) {
  assert(owned(file), 'Unowned sealed file: ' + file);
  assert(/^[a-f0-9]{64}$/.test(expected), 'Invalid sealed hash: ' + file);
  assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Working file changed: ' + file);
}
for (const file of runtime) {
  assert.equal(manifest.validatedFiles[file], validation.sourceSha256, 'Sealed runtime differs: ' + file);
  assert.equal(hash(fs.readFileSync(path.join(root, file))), validation.sourceSha256, 'Working runtime differs: ' + file);
  assert.equal(hash(gitBuffer(['show', manifest.tree + ':' + file])), validation.sourceSha256, 'Tree runtime differs: ' + file);
  if (committed) assert.equal(hash(gitBuffer(['show', ':' + file])), validation.sourceSha256, 'Staged runtime differs: ' + file);
}
const registries = shared.map(file => {
  const parent = namespace(git(['show', manifest.parent + ':' + file]));
  const tree = namespace(git(['show', manifest.tree + ':' + file]));
  assert.equal(tree.outside, parent.outside, 'Outside-Micro bytes changed: ' + file);
  const before = Object.keys(parent.value), after = Object.keys(tree.value);
  const added = after.filter(key => !Object.hasOwn(parent.value, key));
  const removed = before.filter(key => !Object.hasOwn(tree.value, key));
  assert.equal(added.length, 7, 'Wrong Micro additions count: ' + file);
  assert.equal(removed.length, 0, 'Micro keys removed: ' + file);
  for (const key of before) assert.deepEqual(tree.value[key], parent.value[key], 'Existing Micro value changed: ' + file + ':' + key);
  for (const key of added) assert.equal(typeof tree.value[key], 'string', 'New key is not text: ' + key);
  assert.equal(namespace(fs.readFileSync(path.join(root, file), 'utf8')).raw, tree.raw, 'Working Micro differs: ' + file);
  if (committed) assert.equal(namespace(git(['show', ':' + file])).raw, tree.raw, 'Staged Micro differs: ' + file);
  return { file, added: sorted(added), removed: 0, changedExisting: 0, outsideBytesUnchanged: true, totalMicroKeys: after.length, raw: tree.raw };
});
assert.equal(registries[0].raw, registries[1].raw, 'Micro namespaces differ.');
assert.deepEqual(registries[0].added, registries[1].added, 'Micro additions differ.');
let receipt;
if (committed) {
  receipt = read('commit-receipt.json');
  assert.equal(receipt.refUpdated, true, 'Ref not published.');
  assert.equal(receipt.indexRefreshed, true, 'Index recovery remains.');
  assert.equal(receipt.originalIndex, null);
  assert.equal(receipt.refreshedIndex, null);
  assert.equal(receipt.branch, manifest.branch);
  assert.equal(receipt.parent, manifest.parent);
  assert.equal(receipt.tree, manifest.tree);
  assert.deepEqual(sorted(receipt.changed), sorted(manifest.changed));
  assert(/^[a-f0-9]{40,64}$/.test(receipt.commit), 'Invalid commit.');
  assert.equal(git(['rev-parse', receipt.commit + '^{tree}']).trim(), manifest.tree, 'Commit tree differs.');
  assert.equal(git(['show', '-s', '--format=%P', receipt.commit]).trim(), manifest.parent, 'Commit parent differs.');
  git(['merge-base', '--is-ancestor', receipt.commit, 'HEAD']);
}
const audit = {
  mode: committed ? 'committed' : 'prepared', passed: true, parent: manifest.parent, tree: manifest.tree,
  ...(committed ? { commit: receipt.commit, refUpdated: true, indexRefreshed: true, ancestorOfHead: true, stagedRuntimeMatches: true, stagedMicroNamespacesMatch: true } : {}),
  changedFiles: changed.length, sealedFiles: Object.keys(manifest.validatedFiles).length,
  sourceSha256: validation.sourceSha256, unitPassed: 794, browserPassed: 56,
  workingFilesMatchSealedInputs: true,
  registries: registries.map(({ raw, ...item }) => item)
};
fs.writeFileSync(path.join(report, committed ? 'commit-receipt-verification.json' : 'commit-manifest-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit));
