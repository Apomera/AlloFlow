'use strict';

const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const EPPP_ARCHIVE_ROOT_RELATIVE = 'migration_sources/eppp/v1';
const EPPP_ARCHIVE_ROOT = path.join(
  WORKSPACE_ROOT,
  ...EPPP_ARCHIVE_ROOT_RELATIVE.split('/'),
);

function assertArchiveRelativePath(relativePath) {
  if (
    typeof relativePath !== 'string'
    || !relativePath
    || relativePath.includes('\\')
    || path.posix.isAbsolute(relativePath)
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath === '.'
    || relativePath.startsWith('../')
  ) {
    throw new Error(`Unsafe EPPP migration-source archive path: ${relativePath}`);
  }
  return relativePath;
}

function resolveEpppArchivePath(relativePath, workspaceRoot = WORKSPACE_ROOT) {
  const safePath = assertArchiveRelativePath(relativePath);
  const archiveRoot = path.join(
    path.resolve(workspaceRoot),
    ...EPPP_ARCHIVE_ROOT_RELATIVE.split('/'),
  );
  const resolved = path.resolve(archiveRoot, ...safePath.split('/'));
  const relativeCheck = path.relative(archiveRoot, resolved);
  if (!relativeCheck || relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
    throw new Error(`EPPP migration-source archive path escaped its root: ${relativePath}`);
  }
  return resolved;
}

module.exports = {
  EPPP_ARCHIVE_ROOT,
  EPPP_ARCHIVE_ROOT_RELATIVE,
  WORKSPACE_ROOT,
  assertArchiveRelativePath,
  resolveEpppArchivePath,
};
