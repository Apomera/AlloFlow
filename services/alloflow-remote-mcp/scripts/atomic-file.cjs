'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Keep the previous generated contract intact until complete replacement bytes
// are on disk. This also avoids direct-write failures on synced Windows files.
function atomicWriteFile(filename, bytes, io = fs) {
  const target = path.resolve(filename);
  const temporary = target + '.tmp-' + crypto.randomUUID();
  const existing = io.lstatSync(target, { throwIfNoEntry: false });
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) throw new Error('Unsafe generated file destination: ' + target);
  try {
    io.writeFileSync(temporary, bytes, { encoding: 'utf8', flag: 'wx', mode: 0o600, flush: true });
    io.renameSync(temporary, target);
  } finally {
    try { io.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
module.exports = { atomicWriteFile };
