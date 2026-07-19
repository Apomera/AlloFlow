'use strict';

const fs = require('node:fs');

const retryableCodes = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);
const waitBuffer = new Int32Array(new SharedArrayBuffer(4));

function writeGeneratedFile(file, data, encoding = 'utf8') {
  let lastError;
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      fs.writeFileSync(file, data, encoding);
      return;
    } catch (error) {
      lastError = error;
      if (!retryableCodes.has(error?.code) || attempt === 40) throw error;
      Atomics.wait(waitBuffer, 0, 0, Math.min(1000, 75 * attempt));
    }
  }
  throw lastError;
}

module.exports = { writeGeneratedFile };
