const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const input = require('./validation-inputs.cjs');
const root = path.resolve(__dirname, '../..');
const folder = 'reports/micro-lab-resistance-history-2026-10-04', report = path.join(root, folder);
assert(!process.env.GIT_INDEX_FILE);
const git = (args, env = {}, bytes) => cp.execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, input: bytes, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const namespaceHash = bytes => {
  const labels = JSON.parse(bytes.toString('utf8')).stem.microbiology;
  return hash(JSON.stringify(Object.fromEntries(Object.keys(labels).sort().map(key => [key, labels[key]]))));
};
function prepare() {
  assert(!fs.existsSync(path.join(report, 'commit-receipt-isolated-branch.json')), 'A save receipt already exists; inspect it before preparing again.');
  const validation = JSON.parse(fs.readFileSync(path.join(report, 'validation-summary.json'), 'utf8'));
  assert.deepEqual(require('./audit-validation.cjs')(), validation);
  git(['merge-base', '--is-ancestor', input.parent, input.priorBranch]);
  const branch = git(['symbolic-ref', '-q', 'HEAD']).trim(), checkoutParent = git(['rev-parse', 'HEAD']).trim();
  const owned = [...input.runtime, ...input.ownedTests, ...input.registries];
  for (const name of fs.readdirSync(report)) {
    if (!/^commit-(manifest|receipt)/.test(name) && /\.(md|json|png|txt|csv|cjs)$/.test(name) && fs.statSync(path.join(report, name)).isFile()) owned.push(folder + '/' + name);
  }
  assert.equal(new Set(owned).size, owned.length);
  const validatedFiles = Object.fromEntries(owned.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
  const registryBlobs = {}, registryNamespaces = {};
  for (const file of input.registries) {
    const patch = require('./registry-patch.cjs')(git(['show', input.parent + ':' + file]), fs.readFileSync(path.join(root, input.runtime[0]), 'utf8'));
    const working = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).stem.microbiology;
    for (const [key, value] of Object.entries(patch.labels)) assert.equal(working[key], value);
    registryNamespaces[file] = namespaceHash(patch.text);
    assert.equal(namespaceHash(fs.readFileSync(path.join(root, file))), registryNamespaces[file], 'Micro Lab registry namespace differs: ' + file);
    registryBlobs[file] = git(['hash-object', '-w', '--stdin'], {}, patch.text).trim();
  }
  function verify() {
    assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), branch); assert.equal(git(['rev-parse', 'HEAD']).trim(), checkoutParent);
    for (const [file, expected] of Object.entries({ ...validatedFiles, ...validation.testInputs })) {
      const bytes = fs.readFileSync(path.join(root, file));
      if (Object.hasOwn(registryNamespaces, file)) assert.equal(namespaceHash(bytes), registryNamespaces[file], 'Micro Lab registry namespace changed: ' + file);
      else assert.equal(hash(bytes), expected, file);
    }
  }
  const index = path.join(report, '.prepare-index-' + process.pid), env = { GIT_INDEX_FILE: index };
  try {
    verify(); git(['read-tree', input.parent], env);
    git(['add', '--', ...owned.filter(file => !Object.hasOwn(registryBlobs, file))], env);
    for (const [file, oid] of Object.entries(registryBlobs)) git(['update-index', '--add', '--cacheinfo', '100644,' + oid + ',' + file], env);
    const tree = git(['write-tree'], env).trim();
    const changed = git(['diff', '--name-only', '-z', input.parent, tree]).split('\0').filter(Boolean);
    assert(changed.length && changed.every(file => owned.includes(file)));
    verify();
    fs.writeFileSync(path.join(report, 'commit-manifest.json'), JSON.stringify({ branch, checkoutParent, parent: input.parent, tree, changed, validatedFiles, registryBlobs, registryNamespaces }, null, 2) + '\n');
    console.log(JSON.stringify({ parent: input.parent, tree, changedFiles: changed.length, sealedFiles: owned.length, checkoutParent }));
  } finally { if (fs.existsSync(index)) fs.unlinkSync(index); }
}
const lock = path.join(report, '.prepare-commit.lock'), lockFd = fs.openSync(lock, 'wx');
try {
  fs.writeFileSync(lockFd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }) + '\n'); fs.fsyncSync(lockFd);
  prepare();
} finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
