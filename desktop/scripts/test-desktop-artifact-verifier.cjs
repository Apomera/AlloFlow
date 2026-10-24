#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');
const verifier = path.join(desktopRoot, 'scripts', 'verify-desktop-artifacts.cjs');
const version = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8')).version;
const channel = String(process.env.ALLOFLOW_UPDATE_CHANNEL || 'latest').toLowerCase() === 'beta' ? 'beta' : 'latest';
const metadataName = channel + '.yml';
const prefix = 'alloflow-artifact-verifier-test-';
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const installers = [
  'AlloFlow-Desktop-' + version + '-setup.exe',
  'AlloFlow-Desktop-' + version + '-x64-setup.exe',
  'AlloFlow-Desktop-' + version + '-arm64-setup.exe',
];
const macZips = ['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '.zip');
const macDmgs = ['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '.dmg');

function hash(filePath, algorithm, encoding) {
  return crypto.createHash(algorithm).update(fs.readFileSync(filePath)).digest(encoding);
}

function writeValidMetadata() {
  const entries = installers.map((name) => ({
    name,
    sha512: hash(path.join(fixtureDir, name), 'sha512', 'base64'),
    sha256: hash(path.join(fixtureDir, name), 'sha256', 'hex'),
  }));
  const metadata = [
    'version: ' + version,
    'files:',
    ...entries.flatMap((entry) => [
      '  - url: ' + entry.name,
      '    sha512: ' + entry.sha512,
    ]),
    'path: ' + entries[0].name,
    'sha512: ' + entries[0].sha512,
    "releaseDate: '2026-01-01T00:00:00.000Z'",
    '',
  ].join('\n');
  fs.writeFileSync(path.join(fixtureDir, metadataName), metadata, 'utf8');
  const manifest = entries
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => entry.sha256 + '  ' + entry.name)
    .join('\n') + '\n';
  fs.writeFileSync(path.join(fixtureDir, 'SHA256SUMS-windows.txt'), manifest, 'ascii');
}

function writeValidMacMetadata() {
  // electron-builder includes both ZIP and DMG artifacts in the macOS feed.
  const entries = [...macZips, ...macDmgs].map((name) => ({
    name,
    sha512: hash(path.join(fixtureDir, name), 'sha512', 'base64'),
  }));
  fs.writeFileSync(path.join(fixtureDir, channel + '-mac.yml'), [
    'version: ' + version,
    'files:',
    ...entries.flatMap((entry) => ['  - url: ' + entry.name, '    sha512: ' + entry.sha512]),
    'path: ' + entries[0].name,
    'sha512: ' + entries[0].sha512,
    '',
  ].join('\n'), 'utf8');
}

function runVerifier(label, expectedStatus, expectedPattern, platform = 'win') {
  const result = spawnSync(process.execPath, [verifier, '--platform', platform], {
    cwd: desktopRoot,
    env: { ...process.env, ALLOFLOW_DESKTOP_DIST_DIR: fixtureDir },
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  const output = String(result.stdout || '') + String(result.stderr || '');
  if (result.status !== expectedStatus) {
    throw new Error(label + ' returned ' + result.status + ', expected ' + expectedStatus + ':\n' + output);
  }
  if (expectedPattern && !expectedPattern.test(output)) {
    throw new Error(label + ' did not report the expected failure:\n' + output);
  }
  return output;
}

function swapValues(text, first, second) {
  return text.replaceAll(first, '__ALLOFLOW_HASH_SWAP__')
    .replaceAll(second, first)
    .replaceAll('__ALLOFLOW_HASH_SWAP__', second);
}

try {
  installers.forEach((name, index) => {
    fs.writeFileSync(path.join(fixtureDir, name), Buffer.alloc(1024 * 1024 + 17, 65 + index));
  });
  writeValidMetadata();
  runVerifier('valid artifact fixture', 0);

  const metadataPath = path.join(fixtureDir, metadataName);
  const metadata = fs.readFileSync(metadataPath, 'utf8');
  const metadataHashes = Array.from(metadata.matchAll(/^\s{4}sha512:\s*(\S+)\s*$/gm), (match) => match[1]);
  fs.writeFileSync(metadataPath, swapValues(metadata, metadataHashes[1], metadataHashes[2]), 'utf8');
  runVerifier('swapped files[] SHA-512 fixture', 1, /sha512 is attached to the wrong or modified artifact/);

  writeValidMetadata();
  const manifestPath = path.join(fixtureDir, 'SHA256SUMS-windows.txt');
  const manifest = fs.readFileSync(manifestPath, 'ascii');
  const manifestHashes = Array.from(manifest.matchAll(/^([0-9a-f]{64})  /gm), (match) => match[1]);
  fs.writeFileSync(manifestPath, swapValues(manifest, manifestHashes[1], manifestHashes[2]), 'ascii');
  runVerifier('swapped SHA-256 manifest fixture', 1, /sha256 does not match/);

  writeValidMetadata();
  fs.rmSync(path.join(fixtureDir, installers[0]));
  const missingOutput = runVerifier('missing artifact fixture', 1, /legacy path references a missing artifact/);
  if (/\n\s+at\s/.test(missingOutput) || /ENOENT/.test(missingOutput)) {
    throw new Error('Missing artifact fixture produced an exception instead of controlled validation output:\n' + missingOutput);
  }

  [...macZips, ...macDmgs].forEach((name, index) => {
    fs.writeFileSync(path.join(fixtureDir, name), Buffer.alloc(1024 * 1024 + 17, 80 + index));
  });
  for (const name of macZips) fs.writeFileSync(path.join(fixtureDir, name + '.blockmap'), Buffer.alloc(2048));
  writeValidMacMetadata();
  runVerifier('valid macOS ZIP and DMG metadata', 0, null, 'mac');

  fs.writeFileSync(path.join(fixtureDir, macDmgs[0]), Buffer.alloc(1024 * 1024 + 17, 90));
  runVerifier('modified macOS DMG payload', 1, /sha512 is attached to the wrong or modified artifact/, 'mac');

  writeValidMacMetadata();
  const macMetadataPath = path.join(fixtureDir, channel + '-mac.yml');
  const macMetadata = fs.readFileSync(macMetadataPath, 'utf8');
  fs.writeFileSync(macMetadataPath, macMetadata.replace('  - url: ' + macDmgs[1] + '\n', '  - url: unexpected.dmg\n'), 'utf8');
  runVerifier('unexpected macOS artifact', 1, /unexpectedly contains a files\[\] entry for unexpected.dmg/, 'mac');

  writeValidMacMetadata();
  fs.rmSync(path.join(fixtureDir, macZips[0] + '.blockmap'));
  runVerifier('missing macOS ZIP blockmap', 1, /references an artifact without a blockmap/, 'mac');

  console.log('[AlloFlow Desktop] Artifact verifier regression tests passed');
} finally {
  const temporaryRoot = path.resolve(os.tmpdir());
  if (path.dirname(path.resolve(fixtureDir)) !== temporaryRoot || !path.basename(fixtureDir).startsWith(prefix)) {
    throw new Error('Refusing to clean unexpected verifier fixture path: ' + fixtureDir);
  }
  fs.rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
}

