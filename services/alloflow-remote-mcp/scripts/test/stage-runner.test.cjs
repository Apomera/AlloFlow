'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const serviceRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(serviceRoot, '..', '..');
const script = path.join(serviceRoot, 'scripts', 'stage-runner.cjs');
const contextRoot = path.join(serviceRoot, '.runner-context');
const manifestPath = path.join(contextRoot, 'manifest.json');
const nestedDependency = path.join(
  contextRoot,
  'desktop',
  'mcp',
  'remediation_headless_driver.cjs',
);
const vendorManifestPath = path.join(repoRoot, 'desktop', 'mcp', 'vendor', 'manifest.json');
const stagedVendorNotice = path.join(contextRoot, 'desktop', 'mcp', 'vendor', 'THIRD_PARTY_NOTICES.md');
const { normalizeVendorAssetBytes } = require(path.join(repoRoot, 'desktop', 'mcp', 'remediation_headless_driver.cjs'));

function run(...args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: serviceRoot,
    encoding: 'utf8',
  });
}

test('runner context check traverses nested files and performs no writes', () => {
  const staged = run();
  assert.equal(staged.status, 0, staged.stderr || staged.stdout);

  const manifestBefore = fs.readFileSync(manifestPath);
  const manifestMtimeBefore = fs.statSync(manifestPath).mtimeMs;
  const dependencyMtimeBefore = fs.statSync(nestedDependency).mtimeMs;

  const checked = run('--check');
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  assert.match(checked.stdout, /Verified 21 staged runner dependencies/u);
  assert.ok(fs.existsSync(path.join(
    contextRoot,
    'desktop', 'mcp', 'vendor', 'pdf-lib.min.js',
  )));
  assert.ok(fs.existsSync(stagedVendorNotice));
  assert.ok(fs.existsSync(path.join(contextRoot, 'verapdf', 'verapdf-cli.jar')));
  assert.ok(fs.existsSync(path.join(contextRoot, 'verapdf', 'THIRD_PARTY_NOTICES.md')));
  assert.deepEqual(fs.readFileSync(manifestPath), manifestBefore);
  assert.equal(fs.statSync(manifestPath).mtimeMs, manifestMtimeBefore);
  assert.equal(fs.statSync(nestedDependency).mtimeMs, dependencyMtimeBefore);

  const vendorManifest = JSON.parse(fs.readFileSync(vendorManifestPath, 'utf8'));
  const noticeContract = vendorManifest.files.find((entry) => entry.path === 'THIRD_PARTY_NOTICES.md');
  assert.equal(noticeContract.normalization, 'lf');
  const noticeBytes = fs.readFileSync(stagedVendorNotice);
  assert.equal(noticeBytes.includes(0x0d), false, 'staged vendor notice must contain canonical LF bytes');
  assert.equal(noticeBytes.length, noticeContract.bytes);
  assert.equal(crypto.createHash('sha256').update(noticeBytes).digest('hex'), noticeContract.sha256);
  const stagedManifest = JSON.parse(manifestBefore.toString('utf8'));
  const stagedNoticeRecord = stagedManifest.files.find((entry) => entry.path === 'desktop/mcp/vendor/THIRD_PARTY_NOTICES.md');
  assert.deepEqual(stagedNoticeRecord, {
    path: 'desktop/mcp/vendor/THIRD_PARTY_NOTICES.md',
    bytes: noticeContract.bytes,
    sha256: noticeContract.sha256,
  });

  assert.throws(
    () => normalizeVendorAssetBytes({ path: 'axe.min.js', normalization: 'lf' }, Buffer.from('runtime bytes')),
    /explicitly identified text asset/u,
  );
});
