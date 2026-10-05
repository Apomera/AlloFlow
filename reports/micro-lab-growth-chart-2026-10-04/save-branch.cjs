// Publish only the prepared tree on a new local branch while preserving the shared checkout index.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const input = require('./validation-inputs.cjs');
const root = path.resolve(__dirname, '../..');
const report = path.join(root, 'reports/micro-lab-growth-chart-2026-10-04');
const git = (args, env = {}, bytes) => cp.execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, input: bytes, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
if (process.env.GIT_INDEX_FILE) throw Error('Use the normal checkout environment; inherited private indexes are unsupported.');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const namespaceHash = bytes => {
  const labels = JSON.parse(bytes.toString('utf8')).stem.microbiology;
  return hash(JSON.stringify(Object.fromEntries(Object.keys(labels).sort().map(key => [key, labels[key]]))));
};
const read = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const receiptFile = path.join(report, 'commit-receipt-isolated-branch.json');
function save() {
  if (fs.existsSync(receiptFile)) {
    const prior = read('commit-receipt-isolated-branch.json');
    if (prior.commit) {
      let published = prior.refUpdated === true;
      try { git(['merge-base', '--is-ancestor', prior.commit, prior.branch]); published = true; } catch {}
      if (published) throw Error('The branch commit already exists; verify its receipt instead of creating another.');
      throw Error('An unpublished intent receipt exists. Inspect its branch and commit before retrying publication.');
    }
    throw Error('An existing save receipt requires review before publication.');
  }
  const manifestBytes = fs.readFileSync(path.join(report, 'commit-manifest.json'));
  const validationBytes = fs.readFileSync(path.join(report, 'validation-summary.json'));
  const manifest = JSON.parse(manifestBytes.toString('utf8')), validation = JSON.parse(validationBytes.toString('utf8'));
  process.stdout.write(cp.execFileSync(process.execPath, [path.join(report, 'verify-commit.cjs'), '--prepared'], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(manifest.parent, input.parent);
  assert.equal(validation.unit.passed, input.expectedUnit); assert.equal(validation.unit.files, input.unit.length); assert.equal(validation.unit.failed, 0);
  assert.equal(validation.browser.passed, input.expectedBrowser); assert.equal(validation.browser.files, input.browser.length);
  for (const key of ['failed', 'skipped', 'flaky']) assert.equal(validation.browser[key], 0);
  for (const status of validation.runners) {
    assert.equal(status.sourceStillMatches, true); assert.equal(status.testInputsStillMatch, true); assert.equal(status.sourceSha256, validation.sourceSha256);
  }
  const inputs = { ...manifest.validatedFiles, ...validation.testInputs };
  function verify() {
    assert(fs.readFileSync(path.join(report, 'commit-manifest.json')).equals(manifestBytes), 'Prepared manifest changed; prepare again.');
    assert(fs.readFileSync(path.join(report, 'validation-summary.json')).equals(validationBytes), 'Validated summary changed; prepare again.');
    for (const [file, sha] of Object.entries(inputs)) {
      const bytes = fs.readFileSync(path.join(root, file));
      if (input.registries.includes(file)) assert.equal(namespaceHash(bytes), manifest.registryNamespaces[file], 'Micro Lab registry namespace changed: ' + file);
      else assert.equal(hash(bytes), sha, 'Sealed input changed: ' + file);
    }
    assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), manifest.branch, 'Checkout branch changed.');
    assert.equal(git(['rev-parse', 'HEAD']).trim(), manifest.checkoutParent, 'Checkout parent advanced; prepare again.');
  }
  function writeReceipt(value) {
    const temporary = receiptFile + '.' + process.pid + '.tmp';
    const fd = fs.openSync(temporary, 'wx');
    try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, receiptFile);
  }
  verify();
  const index = path.join(report, '.isolated-index-' + process.pid), env = { GIT_INDEX_FILE: index };
  const actualIndex = path.resolve(root, git(['rev-parse', '--git-path', 'index']).trim());
  const indexBefore = hash(fs.readFileSync(actualIndex));
  const stagedBefore = git(['ls-files', '--stage', '-z']);
  try {
    git(['read-tree', manifest.tree], env);
    process.stdout.write(git(['hook', 'run', 'pre-commit'], env));
    assert.equal(git(['write-tree'], env).trim(), manifest.tree, 'Hook changed the isolated tree.');
    verify();
    assert.equal(hash(fs.readFileSync(actualIndex)), indexBefore, 'Another operation updated the checkout index; prepare again.');
    assert.equal(git(['ls-files', '--stage', '-z']), stagedBefore, 'Checkout staging changed.');
    let branch;
    for (let attempt = 1; attempt <= 20; attempt++) {
      const candidate = input.branch + (attempt === 1 ? '' : '-' + attempt);
      try { git(['rev-parse', '--verify', '--quiet', candidate]); }
      catch { branch = candidate; break; }
    }
    assert(branch, 'No unused local branch name found.');
    const message = 'Inspect a selected model hour on the Growth chart in Micro Lab\n\nShow the selected-hour guide, exact control and trial values, and their difference on fixed chart axes with distinct series markers. Use system colors for curves in forced-color mode. Preserve imported raw notebooks when changing only the inspected hour. Validate with ' + validation.unit.passed + ' unit checks and ' + validation.browser.passed + ' targeted Chromium scenarios.\n';
    const args = ['commit-tree', manifest.tree, '-p', manifest.parent, '-F', '-'];
    try { if (git(['config', '--bool', '--get', 'commit.gpgsign']).trim() === 'true') args.push('-S'); } catch {}
    const commit = git(args, {}, message).trim();
    const receipt = { branch, checkoutBranch: manifest.branch, commit, parent: manifest.parent, tree: manifest.tree,
      changed: manifest.changed, refUpdated: false, checkoutIndexTouched: false, checkoutIndexSha256: indexBefore,
      checkoutStagingSha256: hash(stagedBefore), checkoutStagingEntries: stagedBefore.split('\0').filter(Boolean).length,
      commitManifestSha256: hash(manifestBytes), validationSummarySha256: hash(validationBytes),
      reason: 'Continue the preceding verified Micro Lab branch while preserving the shared checkout and staging.' };
    writeReceipt(receipt);
    verify();
    git(['update-ref', '-m', 'commit: Inspect a selected model hour on the Growth chart in Micro Lab', branch, commit, '0'.repeat(commit.length)]);
    receipt.refUpdated = true; writeReceipt(receipt);
    assert.equal(git(['rev-parse', branch]).trim(), commit);
    assert.equal(hash(fs.readFileSync(actualIndex)), indexBefore, 'Checkout index changed concurrently.');
    assert.equal(git(['ls-files', '--stage', '-z']), stagedBefore, 'Checkout staging changed concurrently.');
    receipt.checkoutIndexPreserved = true; receipt.unrelatedStagingPreserved = true; writeReceipt(receipt);
    console.log(JSON.stringify({ branch, commit, changedFiles: manifest.changed.length, checkoutIndexPreserved: true }));
  } finally { if (fs.existsSync(index)) fs.unlinkSync(index); }
}
const lock = path.join(report, '.save-branch.lock'), lockFd = fs.openSync(lock, 'wx');
try {
  fs.writeFileSync(lockFd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }) + '\n'); fs.fsyncSync(lockFd);
  save();
} finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
