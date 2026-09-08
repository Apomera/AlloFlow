'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const os = require('node:os');
const { atomicWriteFile } = require('../atomic-file.cjs');

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
  const stagedManifest = JSON.parse(manifestBefore.toString('utf8'));
  assert.match(checked.stdout, new RegExp('Verified ' + stagedManifest.files.length + ' staged runner dependencies', 'u'));
  // Requiring the staged driver exercises all of its eager local imports.
  const stagedDriver = require(nestedDependency);
  for (const relative of [...stagedDriver.MODULE_FILES, 'desktop/mcp/remediation_narration_plan.cjs', 'desktop/mcp/zip_writer.cjs']) {
    assert.deepEqual(fs.readFileSync(path.join(contextRoot, relative)), fs.readFileSync(path.join(repoRoot, relative)),
      'missing or stale required driver dependency: ' + relative);
    assert.ok(stagedManifest.files.some(entry => entry.path === relative), 'missing dependency manifest entry: ' + relative);
  }
  const policyRelative = 'desktop/mcp/remediation_verification.cjs';
  const policyBytes = fs.readFileSync(path.join(contextRoot, policyRelative));
  const policySource = fs.readFileSync(path.join(repoRoot, policyRelative));
  assert.deepEqual(policyBytes, policySource, 'runner must package the current shared verification policy');
  assert.deepEqual(stagedManifest.files.find(entry => entry.path === policyRelative), {
    path: policyRelative, bytes: policyBytes.length,
    sha256: crypto.createHash('sha256').update(policyBytes).digest('hex'),
  });
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

for (const failure of ['write', 'rename']) test('generated contract preserves prior bytes after ' + failure + ' failure', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-stage-contract-'));
  const filename = path.join(directory, 'contract.ts');
  const prior = 'export const contract = { revision: 1 };';
  fs.writeFileSync(filename, prior);
  const io = { ...fs };
  if (failure === 'write') io.writeFileSync = (temporary, bytes, options) => {
    fs.writeFileSync(temporary, 'partial', options);
    throw Object.assign(new Error('Injected disk full'), { code: 'ENOSPC' });
  };
  else io.renameSync = () => { throw Object.assign(new Error('Injected rename failure'), { code: 'EACCES' }); };
  try {
    assert.throws(() => atomicWriteFile(filename, 'complete replacement', io), /Injected/);
    assert.equal(fs.readFileSync(filename, 'utf8'), prior);
    assert.deepEqual(fs.readdirSync(directory), ['contract.ts']);
  } finally { fs.unlinkSync(filename); fs.rmdirSync(directory); }
});

test('generated contract avoids opening the previous destination for writing', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-stage-contract-'));
  const filename = path.join(directory, 'contract.ts');
  fs.writeFileSync(filename, 'previous contract');
  const io = { ...fs, writeFileSync(temporary, bytes, options) {
    assert.notEqual(temporary, filename, 'direct destination writes can fail or truncate existing history');
    assert.equal(fs.readFileSync(filename, 'utf8'), 'previous contract');
    fs.writeFileSync(temporary, bytes, options);
  } };
  try {
    atomicWriteFile(filename, 'complete replacement', io);
    assert.equal(fs.readFileSync(filename, 'utf8'), 'complete replacement');
    assert.deepEqual(fs.readdirSync(directory), ['contract.ts']);
  } finally { fs.unlinkSync(filename); fs.rmdirSync(directory); }
});
