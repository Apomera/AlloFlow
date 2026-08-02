'use strict';

const fs = require('node:fs');

const retryableCodes = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);
const waitBuffer = new Int32Array(new SharedArrayBuffer(4));

function writeGeneratedFile(file, data, encoding = 'utf8') {
  const expected = Buffer.isBuffer(data) ? data : Buffer.from(String(data), encoding);
  let lastError;
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      fs.writeFileSync(file, expected);
      if (!fs.readFileSync(file).equals(expected)) throw new Error('Generated file failed byte verification: ' + file);
      return;
    } catch (error) {
      lastError = error;
      if (!retryableCodes.has(error?.code)) throw error;
      if (attempt === 40 && error?.code === 'UNKNOWN' && fs.existsSync(file)) {
        const backup = file + '.codex-backup';
        const replacement = file + '.codex-replacement';
        try {
          fs.copyFileSync(file, backup);
          fs.writeFileSync(replacement, expected);
          fs.unlinkSync(file);
          try { fs.renameSync(replacement, file); }
          catch (renameError) { fs.copyFileSync(backup, file); throw renameError; }
          try { fs.unlinkSync(backup); } catch (_) {}
          if (!fs.readFileSync(file).equals(expected)) throw new Error('Generated file failed byte verification: ' + file);
          return;
        } catch (replacementError) {
          lastError = replacementError;
          try { if (fs.existsSync(replacement)) fs.unlinkSync(replacement); } catch (_) {}
          try { if (fs.existsSync(backup)) fs.unlinkSync(backup); } catch (_) {}
        }
      }
      if (attempt === 40) throw lastError;
      Atomics.wait(waitBuffer, 0, 0, Math.min(1000, 75 * attempt));
    }
  }
  throw lastError;
}

module.exports = { writeGeneratedFile };
