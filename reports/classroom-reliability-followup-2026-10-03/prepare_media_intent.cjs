#!/usr/bin/env node
'use strict';
// Default: frozen report-local candidates only. --apply is for the coordinator
// after baseline/candidate review and refuses changed production inputs.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createTwoFilesPatch } = require('diff');
const parser = require('@babel/parser');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(__dirname, 'media-intent');
const MANIFEST = path.join(OUT, 'prepared.json');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const CLIENTS = ['allo_device_storage_module.js', 'desktop/web-app/public/allo_device_storage_module.js'];
const FILES = [...HOSTS, ...CLIENTS, 'storage_bridge.html'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const head = () => execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'],
  { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
const hostReplacements = [
  {
    label: 'device-storage client cache version',
    before: "          'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds5-partition-consent',",
    after: "          'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds6-media-removal-intent',",
  },
  {
    label: 'bounded manifest selector before snapshot normalization',
    before: '  const normalizeSnapshot = (candidate) => {',
    after: `  const normalizeOmissionManifest = (value) => {
    const source = Array.isArray(value) ? value : [];
    const manifest = source.slice(0, 500);
    if (!manifest.some(entry => entry?.reason === 'user-remove-media')) {
      const explicitRemoval = source.find(entry => entry?.reason === 'user-remove-media');
      if (explicitRemoval) manifest[499] = explicitRemoval;
    }
    return manifest;
  };
  const normalizeSnapshot = (candidate) => {`,
  },
  {
    label: 'snapshot manifest normalization',
    before: '      omittedAssetManifest: Array.isArray(candidate.omittedAssetManifest) ? candidate.omittedAssetManifest.slice(0, 500) : [],',
    after: '      omittedAssetManifest: normalizeOmissionManifest(candidate.omittedAssetManifest),',
  },
  {
    label: 'omission tracker manifest normalization',
    before: `    const omittedAssetManifest = Array.isArray(snapshot?.omittedAssetManifest)
      ? snapshot.omittedAssetManifest.slice(0, 500)
      : [];`,
    after: '    const omittedAssetManifest = normalizeOmissionManifest(snapshot?.omittedAssetManifest);',
  },
  {
    label: 'saturated tracker retains actual teacher removal entry',
    before: '      if (omittedAssetManifest.length < 500) omittedAssetManifest.push(entry);',
    after: `      if (omittedAssetManifest.length < 500) omittedAssetManifest.push(entry);
      else if (entry.reason === 'user-remove-media'
          && !omittedAssetManifest.some(item => item?.reason === 'user-remove-media')) {
        omittedAssetManifest[499] = entry;
      }`,
  },
];
const nativeReplacements = [
  {
    label: 'native strip retains explicit entry beyond imported cap',
    before: `    var manifest = Array.isArray(snapshot.omittedAssetManifest)
      ? snapshot.omittedAssetManifest.slice(0, 500)
      : [];`,
    after: `    var sourceManifest = Array.isArray(snapshot.omittedAssetManifest) ? snapshot.omittedAssetManifest : [];
    var manifest = sourceManifest.slice(0, 500);
    if (!manifest.some(function (entry) { return entry && entry.reason === 'user-remove-media'; })) {
      for (var removalIndex = 500; removalIndex < sourceManifest.length; removalIndex++) {
        var explicitRemoval = sourceManifest[removalIndex];
        if (explicitRemoval && explicitRemoval.reason === 'user-remove-media') {
          manifest[499] = explicitRemoval;
          break;
        }
      }
    }`,
  },
  {
    label: 'native saturated tracker retains actual teacher removal entry',
    before: '      if (manifest.length < 500) manifest.push(entry);',
    after: `      if (manifest.length < 500) manifest.push(entry);
      else if (entry.reason === 'user-remove-media'
          && !manifest.some(function (item) { return item && item.reason === 'user-remove-media'; })) {
        manifest[499] = entry;
      }`,
  },
];
const clientCacheReplacement = {
  label: 'device-storage bridge cache version',
  before: "  var DEFAULT_BRIDGE_URL = 'https://alloflow-cdn.pages.dev/storage_bridge.html?v=ds5-partition-consent';",
  after: "  var DEFAULT_BRIDGE_URL = 'https://alloflow-cdn.pages.dev/storage_bridge.html?v=ds6-media-removal-intent';",
};
const signature = source => ({ bom: source.charCodeAt(0) === 0xfeff,
  crlf: (source.match(/\r\n/g) || []).length, loneCR: (source.replace(/\r\n/g, '').match(/\r/g) || []).length,
  finalNewline: /(?:\r\n|\n|\r)$/.test(source), mixedNewlines: /\r\n/.test(source) && /(?<!\r)\n/.test(source) });
function replacementsFor(file, source) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  return (HOSTS.includes(file) ? hostReplacements
    : CLIENTS.includes(file) ? [...nativeReplacements, clientCacheReplacement] : nativeReplacements)
    .map(row => ({ ...row, before: row.before.replace(/\n/g, eol), after: row.after.replace(/\n/g, eol) }));
}
function transform(file, source) {
  const replacements = replacementsFor(file, source);
  let next = source;
  for (const row of replacements) {
    assert.equal(next.split(row.before).length - 1, 1, 'Missing/ambiguous ' + row.label + ': ' + file);
    assert.equal(next.split(row.after).length - 1, 0, 'Already-present replacement: ' + row.label + ': ' + file);
    next = next.replace(row.before, row.after);
  }
  let reversed = next;
  for (const row of [...replacements].reverse()) {
    assert.equal(reversed.split(row.after).length - 1, 1, 'Ambiguous reverse guard: ' + row.label);
    reversed = reversed.replace(row.after, row.before);
  }
  assert.equal(reversed, source, 'Unowned byte change: ' + file);
  const beforeShape = signature(source), afterShape = signature(next);
  assert.equal(afterShape.bom, beforeShape.bom); assert.equal(afterShape.finalNewline, beforeShape.finalNewline);
  assert.equal(afterShape.loneCR, beforeShape.loneCR); assert.equal(afterShape.mixedNewlines, beforeShape.mixedNewlines);
  if (HOSTS.includes(file)) parser.parse(next, { sourceType: 'unambiguous', plugins: ['jsx'] });
  else if (CLIENTS.includes(file)) new vm.Script(next, { filename: file });
  else {
    const scripts = [...next.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
    assert.ok(scripts.length > 0, 'Bridge inline script missing');
    for (const [index, script] of scripts.entries()) new vm.Script(script[1], { filename: file + ':inline-' + index });
  }
  return { next, replacementLabels: replacements.map(row => row.label), beforeShape, afterShape };
}
function prepare() {
  assert.ok(!fs.existsSync(MANIFEST), 'Retain existing preparation; use a new directory for later edits.');
  const startHead = head();
  const rows = FILES.map((file, index) => {
    const bytes = read(file), transformed = transform(file, bytes.toString('utf8'));
    return { file, index, bytes, ...transformed, beforeSha256: hash(bytes), afterSha256: hash(transformed.next) };
  });
  assert.equal(rows[0].afterSha256, rows[1].afterSha256, 'Host source pair drift');
  assert.equal(rows[0].afterSha256, rows[2].afterSha256, 'Host App source drift');
  assert.equal(rows[3].afterSha256, rows[4].afterSha256, 'Device-storage public pair drift');
  for (const row of rows) assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent source edit: ' + row.file);
  assert.equal(head(), startHead, 'HEAD changed during preparation');
  fs.mkdirSync(path.join(OUT, 'before'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'candidate'), { recursive: true });
  const files = rows.map(row => {
    const filename = row.index + '-' + path.basename(row.file), before = 'before/' + filename,
      candidate = 'candidate/' + filename, patch = row.index + '.patch';
    fs.writeFileSync(path.join(OUT, before), row.bytes, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, candidate), row.next, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, patch), createTwoFilesPatch(row.file, row.file, row.bytes.toString('utf8'), row.next), { flag: 'wx' });
    return { file: row.file, before, candidate, patch, beforeSha256: row.beforeSha256, afterSha256: row.afterSha256,
      replacementLabels: row.replacementLabels, beforeShape: row.beforeShape, afterShape: row.afterShape };
  });
  for (const row of rows) assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit while recording: ' + row.file);
  assert.equal(head(), startHead, 'HEAD changed while recording');
  fs.writeFileSync(MANIFEST, JSON.stringify({ schemaVersion: 1, preparedAt: new Date().toISOString(), startHead, files,
    status: 'syntax-checked-report-candidates-only', testsRun: false, productionApplied: false, currentCI: 'unverified' }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ manifest: path.relative(ROOT, MANIFEST), files: files.map(row => row.file), productionApplied: false, testsRun: false }));
}
function apply() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  assert.equal(manifest.schemaVersion, 1); assert.deepEqual(manifest.files.map(row => row.file), FILES);
  assert.equal(head(), manifest.startHead, 'HEAD changed since preparation');
  for (const row of manifest.files) {
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent production edit: ' + row.file);
    const original = fs.readFileSync(path.join(OUT, row.before));
    assert.equal(hash(original), row.beforeSha256, 'Changed before snapshot: ' + row.file);
    const expected = transform(row.file, original.toString('utf8')).next;
    assert.equal(hash(expected), row.afterSha256, 'Changed expected candidate: ' + row.file);
    assert.equal(hash(fs.readFileSync(path.join(OUT, row.candidate))), row.afterSha256, 'Changed prepared candidate: ' + row.file);
  }
  for (const row of manifest.files) {
    const target = path.join(ROOT, row.file), temporary = target + '.classroom-intent-' + process.pid + '.tmp';
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit before write: ' + row.file);
    fs.writeFileSync(temporary, fs.readFileSync(path.join(OUT, row.candidate)), { flag: 'wx' });
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit before replacement: ' + row.file);
    fs.renameSync(temporary, target);
    assert.equal(hash(read(row.file)), row.afterSha256, 'Replacement mismatch: ' + row.file);
  }
  fs.writeFileSync(path.join(OUT, 'applied.json'), JSON.stringify({ ...manifest, appliedAt: new Date().toISOString(),
    productionApplied: true, testsRun: false }, null, 2) + '\n', { flag: 'wx' });
  console.log('Applied only bounded omission-manifest selection and actual removal-entry retention.');
}
if (process.argv.length === 2) prepare();
else if (process.argv.length === 3 && process.argv[2] === '--apply') apply();
else throw Error('Usage: node prepare_media_intent.cjs [--apply]');
