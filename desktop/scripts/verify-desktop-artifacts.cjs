#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const distDir = path.join(desktopRoot, 'dist');
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const version = packageJson.version || '0.0.0';
const platformArg = process.argv.find((arg) => arg.startsWith('--platform='))
  || (process.argv.includes('--platform') ? '--platform=' + process.argv[process.argv.indexOf('--platform') + 1] : '');
const requestedPlatform = platformArg.replace('--platform=', '').toLowerCase();
const platform = requestedPlatform || (process.platform === 'darwin' ? 'mac' : (process.platform === 'win32' ? 'win' : ''));
const channel = String(process.env.ALLOFLOW_UPDATE_CHANNEL || 'latest').toLowerCase() === 'beta' ? 'beta' : 'latest';

let failed = false;

function fail(message) {
  failed = true;
  console.error('missing/invalid: ' + message);
}

function fileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return { exists: true, size: stats.size, modified: stats.mtime.toISOString() };
  } catch (_) {
    return { exists: false, size: 0, modified: '' };
  }
}

function requireFile(fileName, minimumBytes) {
  const info = fileInfo(path.join(distDir, fileName));
  if (!info.exists || info.size < minimumBytes) {
    fail(fileName);
    return false;
  }
  console.log('ok: ' + fileName + ' (' + Math.round(info.size / 1024 / 1024 * 10) / 10 + ' MB, ' + info.modified + ')');
  return true;
}

function requireReferencedArtifact(fileName, metadataName) {
  const info = fileInfo(path.join(distDir, fileName));
  if (!info.exists || info.size < 1024 * 1024) {
    fail(metadataName + ' references a missing or empty artifact: ' + fileName);
  }
  if (/\.(?:exe|zip)$/i.test(fileName)) {
    const blockmapInfo = fileInfo(path.join(distDir, fileName + '.blockmap'));
    if (!blockmapInfo.exists || blockmapInfo.size < 1024) {
      fail(metadataName + ' references an artifact without a blockmap: ' + fileName);
    }
  }
}

function requireMetadata(fileName, referencedFiles) {
  const metadataPath = path.join(distDir, fileName);
  let text = '';
  try {
    text = fs.readFileSync(metadataPath, 'utf8');
  } catch (_) {
    fail(fileName);
    return;
  }
  if (!text.trim()) {
    fail(fileName + ' is empty');
    return;
  }
  for (const referencedFile of referencedFiles) {
    if (!text.includes(referencedFile)) {
      fail(fileName + ' does not reference ' + referencedFile);
    }
  }
  const metadataReferences = new Set();
  const referencePattern = /^\s*(?:-\s*)?(?:url|path):\s*['"]?([^'"\r\n]+?)['"]?\s*$/gm;
  for (const match of text.matchAll(referencePattern)) {
    metadataReferences.add(match[1].trim());
  }
  if (!metadataReferences.size) {
    fail(fileName + ' does not name any update artifacts');
  }
  for (const referencedFile of metadataReferences) {
    requireReferencedArtifact(referencedFile, fileName);
  }
  if (!/(^|\n)sha512:\s*\S+/m.test(text)) {
    fail(fileName + ' does not contain a sha512 checksum');
  }
  if (!failed) console.log('ok: ' + fileName + ' references the complete updater set');
}

function verifyWindows() {
  const installers = ['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '-setup.exe');
  for (const installer of installers) {
    requireFile(installer, 1024 * 1024);
    requireFile(installer + '.blockmap', 1024);
  }
  requireMetadata(channel + '.yml', installers);
}

function verifyMac() {
  const dmgs = ['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '.dmg');
  const zips = ['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '.zip');
  for (const dmg of dmgs) requireFile(dmg, 1024 * 1024);
  for (const zip of zips) {
    requireFile(zip, 1024 * 1024);
    requireFile(zip + '.blockmap', 1024);
  }
  requireMetadata(channel + '-mac.yml', zips);
}

console.log('[AlloFlow Desktop] Artifact check');
console.log('dist: ' + distDir);
console.log('platform: ' + (platform || 'unknown') + ', channel: ' + channel);

if (platform === 'win' || platform === 'windows') {
  verifyWindows();
} else if (platform === 'mac' || platform === 'macos' || platform === 'darwin') {
  verifyMac();
} else {
  fail('use --platform win or --platform mac on this host');
}

if (failed) process.exitCode = 1;
