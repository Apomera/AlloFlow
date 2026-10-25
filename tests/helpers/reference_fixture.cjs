'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const manifest = require('../fixtures/regression/manifest.json');
module.exports = function loadReferenceFixture(name) {
  const entry = Object.hasOwn(manifest.files, name) && manifest.files[name];
  if (!entry || entry.encoding !== 'gzip') throw new Error('Unknown compressed reference fixture: ' + name);
  const bytes = gunzipSync(fs.readFileSync(path.join(__dirname, '../fixtures/regression', name)), { maxOutputLength: entry.bytes });
  if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
    throw new Error('Reference fixture integrity check failed: ' + name);
  }
  return JSON.parse(bytes.toString('utf8'));
};
