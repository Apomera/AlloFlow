// Save the sealed change on a new local branch without touching the shared index.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const report = path.join(root, 'reports/micro-lab-mystery-integrity-2026-10-02');
const git = (args, env = {}, input) => cp.execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
if (process.env.GIT_INDEX_FILE) throw Error('Use the normal checkout environment; inherited private indexes are unsupported.');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const receiptFile = path.join(report, 'commit-receipt-isolated-branch.json');
const manifest = read('commit-manifest.json'), validation = read('validation-summary.json');
if (fs.existsSync(receiptFile)) {
  const prior = read('commit-receipt-isolated-branch.json');
  if (prior.commit) {
    let published = prior.refUpdated === true;
    try { git(['merge-base', '--is-ancestor', prior.commit, prior.branch]); published = true; } catch {}
    if (published) throw Error('The branch commit already exists; verify its receipt instead of creating another.');
  }
}
assert.equal(validation.unit.passed, 865);
assert.equal(validation.unit.files, 25);
assert.equal(validation.unit.failed, 0);
assert.equal(validation.browser.passed, 63);
for (const key of ['failed', 'skipped', 'flaky']) assert.equal(validation.browser[key], 0);
for (const status of validation.runners) {
  assert.equal(status.phase, 'passed'); assert.equal(status.exitCode, 0);
  assert.equal(status.sourceStillMatches, true); assert.equal(status.testInputsStillMatch, true);
  assert.equal(status.sourceSha256, validation.sourceSha256);
}
const inputs = { ...manifest.validatedFiles, ...validation.testInputs };
function verify() {
  for (const [file, sha] of Object.entries(inputs)) assert.equal(hash(fs.readFileSync(path.join(root, file))), sha, 'Sealed input changed: ' + file);
  assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), manifest.branch, 'Checkout branch changed.');
  assert.equal(git(['rev-parse', 'HEAD']).trim(), manifest.parent, 'Checkout parent advanced; prepare again.');
}
function writeReceipt(value) {
  const temporary = receiptFile + '.' + process.pid + '.tmp';
  const fd = fs.openSync(temporary, 'w');
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, receiptFile);
}
verify();
const index = path.join(report, 'drafts', '.isolated-index-' + process.pid);
const env = { GIT_INDEX_FILE: index };
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
  const base = 'refs/heads/codex/micro-mystery-integrity-2026-10-02';
  let branch;
  for (let attempt = 1; attempt <= 20; attempt++) {
    const candidate = base + (attempt === 1 ? '' : '-' + attempt);
    try { git(['rev-parse', '--verify', '--quiet', candidate]); }
    catch { branch = candidate; break; }
  }
  assert(branch, 'No unused local branch name found.');
  const message = 'Preserve Mystery Lab notes and report history\n\nPreserve imported notebook metadata, untouched long notes and raw report history when navigating, editing, recording or restoring. Apply only intended field changes to latest state, reject stale actions, and guard deferred keyboard focus. Reflow enlarged reports to one readable column. Validate with 865 unit checks and 63 Chromium scenarios.\n';
  const args = ['commit-tree', manifest.tree, '-p', manifest.parent, '-F', '-'];
  try { if (git(['config', '--bool', '--get', 'commit.gpgsign']).trim() === 'true') args.push('-S'); } catch {}
  const commit = git(args, {}, message).trim();
  const receipt = { branch, checkoutBranch: manifest.branch, commit, parent: manifest.parent, tree: manifest.tree,
    changed: manifest.changed, refUpdated: false, checkoutIndexTouched: false, checkoutIndexSha256: indexBefore,
    checkoutStagingSha256: hash(stagedBefore), checkoutStagingEntries: stagedBefore.split('\0').filter(Boolean).length,
    reason: 'The shared checkout index is locked; changes are saved on an isolated local branch.' };
  writeReceipt(receipt);
  verify();
  git(['update-ref', '-m', 'commit: Preserve Mystery Lab notes and report history', branch, commit, '0'.repeat(commit.length)]);
  receipt.refUpdated = true; writeReceipt(receipt);
  assert.equal(git(['rev-parse', branch]).trim(), commit);
  assert.equal(hash(fs.readFileSync(actualIndex)), indexBefore, 'Checkout index changed concurrently.');
  assert.equal(git(['ls-files', '--stage', '-z']), stagedBefore, 'Checkout staging changed concurrently.');
  receipt.checkoutIndexPreserved = true; receipt.unrelatedStagingPreserved = true; writeReceipt(receipt);
  console.log(JSON.stringify({ branch, commit, changedFiles: manifest.changed.length, checkoutIndexPreserved: true }));
} finally {
  if (fs.existsSync(index)) fs.unlinkSync(index);
}
