'use strict';
// Local-only staging retry for the host's recurring direct-write UNKNOWN error.
const fs = require('node:fs'), path = require('node:path');
const expected = path.resolve('services/alloflow-remote-mcp/src/runner-release-contract.ts');
const original = fs.writeFileSync;
fs.writeFileSync = function(filename, bytes, options) {
  if (typeof filename === 'string' && path.resolve(filename) === expected) {
    const temporary = expected + '.refinement-stage-tmp';
    original(temporary, bytes, { ...options, flag: 'wx' });
    fs.renameSync(temporary, expected);
    return;
  }
  return original(filename, bytes, options);
};
