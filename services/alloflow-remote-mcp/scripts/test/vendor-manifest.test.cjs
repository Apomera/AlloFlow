'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const serviceRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(serviceRoot, '..', '..');
const vendorRoot = path.join(repoRoot, 'desktop', 'mcp', 'vendor');

test('vendor manifest hashes every browser asset and notice', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 1);
  assert.ok(Array.isArray(manifest.files) && manifest.files.length >= 1);
  const seen = new Set();
  for (const entry of manifest.files) {
    assert.equal(typeof entry.path, 'string');
    assert.ok(!entry.path.startsWith('/') && !entry.path.includes('..'));
    assert.equal(seen.has(entry.path), false, `duplicate vendor path: ${entry.path}`);
    seen.add(entry.path);
    const filePath = path.resolve(vendorRoot, entry.path);
    assert.ok(filePath.startsWith(vendorRoot + path.sep));
    const stat = fs.lstatSync(filePath);
    assert.equal(stat.isFile(), true, `vendor entry is not a regular file: ${entry.path}`);
    const bytes = fs.readFileSync(filePath);
    assert.equal(bytes.length, entry.bytes, `byte count mismatch: ${entry.path}`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256, `hash mismatch: ${entry.path}`);
  }
});
