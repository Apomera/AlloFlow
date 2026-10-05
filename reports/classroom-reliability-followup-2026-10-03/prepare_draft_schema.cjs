#!/usr/bin/env node
'use strict';
// Prepare after other reviewed native changes have been applied, so these
// frozen full-file hashes describe the coordinator's combined candidate.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createTwoFilesPatch } = require('diff');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(__dirname, 'draft-schema');
const MANIFEST = path.join(OUT, 'prepared.json');
const FILES = ['allo_device_storage_module.js', 'desktop/web-app/public/allo_device_storage_module.js', 'storage_bridge.html'];
const BEFORE = `      || hasMeaningfulRecoveryDraft(workspace.builderDraft)
    ));`;
const AFTER = `      || hasMeaningfulRecoveryDraft(workspace.builderDraft)
      || (Array.isArray(workspace.units) && workspace.units.length > 0)
      || (Array.isArray(workspace.profiles) && workspace.profiles.length > 0)
      || hasMeaningfulRecoveryDraft(workspace.guidedProgress)
      || hasMeaningfulRecoveryDraft(workspace.projectState)
      || hasMeaningfulRecoveryDraft(workspace.wordSoundsState)
    ));`;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const head = () => execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'],
  { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
function transform(file, source) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n', before = BEFORE.replace(/\n/g, eol), after = AFTER.replace(/\n/g, eol);
  assert.equal(source.split(before).length - 1, 1, 'Missing/ambiguous meaningful-draft predicate: ' + file);
  assert.equal(source.split(after).length - 1, 0, 'Draft parity replacement already present: ' + file);
  const next = source.replace(before, after);
  assert.equal(next.replace(after, before), source, 'Unowned byte change: ' + file);
  assert.equal(next.charCodeAt(0) === 0xfeff, source.charCodeAt(0) === 0xfeff, 'BOM drift');
  assert.equal(/(?:\r\n|\n|\r)$/.test(next), /(?:\r\n|\n|\r)$/.test(source), 'Final newline drift');
  assert.equal((next.replace(/\r\n/g, '').match(/\r/g) || []).length,
    (source.replace(/\r\n/g, '').match(/\r/g) || []).length, 'Lone CR drift');
  if (file.endsWith('.js')) new vm.Script(next, { filename: file });
  else {
    const scripts = [...next.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
    assert.ok(scripts.length > 0, 'Bridge inline script missing');
    for (const [index, script] of scripts.entries()) new vm.Script(script[1], { filename: file + ':inline-' + index });
  }
  return next;
}
function prepare() {
  assert.ok(!fs.existsSync(MANIFEST), 'Retain existing preparation; choose a fresh report directory for later revisions.');
  const startHead = head();
  const rows = FILES.map((file, index) => {
    const bytes = read(file), next = transform(file, bytes.toString('utf8'));
    return { file, index, bytes, next, beforeSha256: hash(bytes), afterSha256: hash(next) };
  });
  assert.equal(rows[0].afterSha256, rows[1].afterSha256, 'Client public pair drift');
  for (const row of rows) assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent source edit: ' + row.file);
  assert.equal(head(), startHead, 'HEAD changed while preparing');
  fs.mkdirSync(path.join(OUT, 'before'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'candidate'), { recursive: true });
  const files = rows.map(row => {
    const filename = row.index + '-' + path.basename(row.file), before = 'before/' + filename,
      candidate = 'candidate/' + filename, patch = row.index + '.patch';
    fs.writeFileSync(path.join(OUT, before), row.bytes, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, candidate), row.next, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, patch), createTwoFilesPatch(row.file, row.file, row.bytes.toString('utf8'), row.next), { flag: 'wx' });
    return { file: row.file, before, candidate, patch, beforeSha256: row.beforeSha256, afterSha256: row.afterSha256 };
  });
  for (const row of rows) assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit while recording: ' + row.file);
  assert.equal(head(), startHead, 'HEAD changed while recording');
  fs.writeFileSync(MANIFEST, JSON.stringify({ schemaVersion: 1, preparedAt: new Date().toISOString(), startHead, files,
    scope: 'Five existing host meaningful-draft fields added to native client/bridge predicates only.',
    status: 'syntax-checked-report-candidates-only', productionApplied: false, testsRun: false, currentCI: 'unverified' }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ manifest: path.relative(ROOT, MANIFEST), files: files.map(row => row.file), testsRun: false, productionApplied: false }));
}
function apply() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  assert.equal(manifest.schemaVersion, 1); assert.deepEqual(manifest.files.map(row => row.file), FILES);
  assert.equal(head(), manifest.startHead, 'HEAD changed since preparation');
  for (const row of manifest.files) {
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent production edit: ' + row.file);
    const original = fs.readFileSync(path.join(OUT, row.before));
    assert.equal(hash(original), row.beforeSha256, 'Changed before snapshot');
    assert.equal(hash(transform(row.file, original.toString('utf8'))), row.afterSha256, 'Changed expected candidate');
    assert.equal(hash(fs.readFileSync(path.join(OUT, row.candidate))), row.afterSha256, 'Changed prepared candidate');
  }
  for (const row of manifest.files) {
    const target = path.join(ROOT, row.file), temporary = target + '.classroom-schema-' + process.pid + '.tmp';
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit before write: ' + row.file);
    fs.writeFileSync(temporary, fs.readFileSync(path.join(OUT, row.candidate)), { flag: 'wx' });
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit before replacement: ' + row.file);
    fs.renameSync(temporary, target); assert.equal(hash(read(row.file)), row.afterSha256, 'Replacement mismatch');
  }
  fs.writeFileSync(path.join(OUT, 'applied.json'), JSON.stringify({ ...manifest, appliedAt: new Date().toISOString(),
    productionApplied: true, testsRun: false }, null, 2) + '\n', { flag: 'wx' });
  console.log('Applied only meaningful draft-schema parity for native client/bridge.');
}
if (process.argv.length === 2) prepare();
else if (process.argv.length === 3 && process.argv[2] === '--apply') apply();
else throw Error('Usage: node prepare_draft_schema.cjs [--apply]');
