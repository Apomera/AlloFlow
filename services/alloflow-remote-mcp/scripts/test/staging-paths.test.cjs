'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  assertRegularSourceFile,
} = require('../staging-paths.cjs');

test('runner source validation accepts regular files and rejects an escaping parent link', (t) => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'alloflow-staging-paths-'),
  );
  t.after(() => {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const repository = path.join(temporaryRoot, 'repository');
  const outside = path.join(temporaryRoot, 'outside');
  fs.mkdirSync(path.join(repository, 'safe'), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(repository, 'safe', 'driver.cjs'), 'safe');
  fs.writeFileSync(path.join(outside, 'secret.cjs'), 'secret');

  assert.equal(
    assertRegularSourceFile(repository, 'safe/driver.cjs'),
    path.join(repository, 'safe', 'driver.cjs'),
  );

  const escape = path.join(repository, 'escape');
  fs.symlinkSync(
    outside,
    escape,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  assert.throws(
    () => assertRegularSourceFile(repository, 'escape/secret.cjs'),
    /real path escapes repository/u,
  );
});

test('runner source validation rejects a direct file symlink when supported', (t) => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'alloflow-staging-file-link-'),
  );
  t.after(() => {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const repository = path.join(temporaryRoot, 'repository');
  fs.mkdirSync(repository, { recursive: true });
  const target = path.join(repository, 'target.cjs');
  const link = path.join(repository, 'link.cjs');
  fs.writeFileSync(target, 'safe');

  try {
    fs.symlinkSync(target, link, 'file');
  } catch (error) {
    if (
      process.platform === 'win32' &&
      error &&
      (error.code === 'EPERM' || error.code === 'EACCES')
    ) {
      t.skip('Windows file symlinks require Developer Mode or elevation');
      return;
    }
    throw error;
  }

  assert.throws(
    () => assertRegularSourceFile(repository, 'link.cjs'),
    /regular non-symlink file/u,
  );
});
