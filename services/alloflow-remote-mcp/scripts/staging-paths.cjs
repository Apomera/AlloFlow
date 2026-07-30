'use strict';

const fs = require('node:fs');
const path = require('node:path');

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

/**
 * Resolve one allowlisted runner dependency without following a source-file
 * symlink or a parent junction outside the repository. The build context is a
 * security boundary: an escaping link must never copy an arbitrary host file
 * into the container image.
 */
function assertRegularSourceFile(repoRoot, relative) {
  const source = path.resolve(repoRoot, relative);
  if (!isInside(repoRoot, source)) {
    throw new Error(`Refusing source outside repository: ${relative}`);
  }

  const stat = fs.lstatSync(source, { throwIfNoEntry: false });
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      `Required runner dependency must be a regular non-symlink file: ${relative}`,
    );
  }

  const realRepoRoot = fs.realpathSync.native(repoRoot);
  const realSource = fs.realpathSync.native(source);
  if (!isInside(realRepoRoot, realSource)) {
    throw new Error(`Refusing source whose real path escapes repository: ${relative}`);
  }

  return source;
}

module.exports = {
  assertRegularSourceFile,
  isInside,
};
