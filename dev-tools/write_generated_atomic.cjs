'use strict';
const crypto = require('crypto');
const fs = require('fs');
// Replace a generated file atomically without following symlinks or exposing a missing/truncated window.
module.exports = function writeGeneratedAtomic(file, content) {
  const existing = fs.lstatSync(file, { throwIfNoEntry: false });
  if (existing && (existing.isSymbolicLink() || !existing.isFile())) {
    throw new Error('Refusing atomic write to symlink or non-file: ' + file);
  }
  const temporary = file + '.next-build-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  try {
    const opts = Buffer.isBuffer(content)
      ? { flag: 'wx', flush: true }
      : { encoding: 'utf8', flag: 'wx', flush: true };
    fs.writeFileSync(temporary, content, opts);
    fs.renameSync(temporary, file);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch (_) {}
    throw error;
  }
};
