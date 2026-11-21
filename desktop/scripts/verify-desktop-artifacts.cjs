#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yaml = require(require.resolve('js-yaml', { paths: [path.resolve(__dirname, '..')] }));

const desktopRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(process.env.ALLOFLOW_DESKTOP_DIST_DIR || path.join(desktopRoot, 'dist'));
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const builderConfig = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'electron-builder.json'), 'utf8'));
const windowsDifferentialPackage = builderConfig.nsis?.differentialPackage !== false;
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
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      return { exists: false, size: 0, modified: '' };
    }
    return { exists: true, size: stats.size, modified: stats.mtime.toISOString() };
  } catch (_) {
    return { exists: false, size: 0, modified: '' };
  }
}

function hashFile(filePath, algorithm, encoding) {
  const stats = fs.lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error('Refusing to hash non-regular file or symlink: ' + filePath);
  }
  const hash = crypto.createHash(algorithm);
  const buffer = Buffer.allocUnsafe(4 * 1024 * 1024);
  const openFlags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const descriptor = fs.openSync(filePath, openFlags);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest(encoding);
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
  const windowsFullDownload = (platform === 'win' || platform === 'windows') && !windowsDifferentialPackage;
  if (/\.(?:exe|zip)$/i.test(fileName) && !windowsFullDownload) {
    const blockmapInfo = fileInfo(path.join(distDir, fileName + '.blockmap'));
    if (!blockmapInfo.exists || blockmapInfo.size < 1024) {
      fail(metadataName + ' references an artifact without a blockmap: ' + fileName);
    }
  }
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'"))
    || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseUpdaterMetadata(text, fileName) {
  const entries = new Map();
  let parsed;
  try {
    parsed = yaml.load(text, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    fail(fileName + ' is invalid YAML: ' + (error && error.message ? error.message : String(error)));
    return { entries, legacyPath: '', legacyHash: '', version: '' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(fileName + ' root YAML value must be a mapping');
    return { entries, legacyPath: '', legacyHash: '', version: '' };
  }
  const parsedVersion = typeof parsed.version === 'string' || typeof parsed.version === 'number'
    ? String(parsed.version).trim()
    : '';
  if (!Array.isArray(parsed.files)) {
    fail(fileName + ' must contain a files[] sequence');
  } else {
    for (const item of parsed.files) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        fail(fileName + ' contains a malformed files[] item');
        continue;
      }
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      const sha512 = typeof item.sha512 === 'string' ? item.sha512.trim() : '';
      if (!url) {
        fail(fileName + ' contains a files[] entry without url');
        continue;
      }
      if (entries.has(url)) {
        fail(fileName + ' contains a duplicate updater entry: ' + url);
      } else {
        entries.set(url, { sha512 });
      }
    }
  }
  const legacyPath = typeof parsed.path === 'string' ? parsed.path.trim() : '';
  const legacyHash = typeof parsed.sha512 === 'string' ? parsed.sha512.trim() : '';
  return { entries, legacyPath, legacyHash, version: parsedVersion };
}

function requireMetadata(fileName, expectedFiles) {
  const metadataPath = path.join(distDir, fileName);
  if (!fileInfo(metadataPath).exists) {
    fail(fileName);
    return;
  }
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

  const metadata = parseUpdaterMetadata(text, fileName);
  if (metadata.version !== version) {
    fail(fileName + ' version does not match package.json (' + version + ')');
  }
  const expectedSet = new Set(expectedFiles);
  const actualHashes = new Map();

  for (const expectedFile of expectedSet) {
    const entry = metadata.entries.get(expectedFile);
    if (!entry) {
      fail(fileName + ' does not contain a files[] entry for ' + expectedFile);
      continue;
    }
    requireReferencedArtifact(expectedFile, fileName);
    if (!entry.sha512) {
      fail(fileName + ' files[] entry has no sha512: ' + expectedFile);
      continue;
    }
    const artifactPath = path.join(distDir, expectedFile);
    if (!fileInfo(artifactPath).exists) continue;
    const actualHash = hashFile(artifactPath, 'sha512', 'base64');
    actualHashes.set(expectedFile, actualHash);
    if (entry.sha512 !== actualHash) {
      fail(fileName + ' sha512 is attached to the wrong or modified artifact: ' + expectedFile);
    } else {
      console.log('ok: ' + fileName + ' files[] sha512 matches ' + expectedFile);
    }
  }

  for (const referencedFile of metadata.entries.keys()) {
    if (!expectedSet.has(referencedFile)) {
      fail(fileName + ' unexpectedly contains a files[] entry for ' + referencedFile);
    }
  }

  if (Boolean(metadata.legacyPath) !== Boolean(metadata.legacyHash)) {
    fail(fileName + ' legacy path/sha512 fields must appear together');
  } else if (metadata.legacyPath) {
    if (!expectedSet.has(metadata.legacyPath)) {
      fail(fileName + ' legacy path unexpectedly references ' + metadata.legacyPath);
    } else {
      const legacyArtifactPath = path.join(distDir, metadata.legacyPath);
      if (!fileInfo(legacyArtifactPath).exists) {
        fail(fileName + ' legacy path references a missing artifact: ' + metadata.legacyPath);
      } else {
        const actualHash = actualHashes.get(metadata.legacyPath)
          || hashFile(legacyArtifactPath, 'sha512', 'base64');
        if (metadata.legacyHash !== actualHash) {
          fail(fileName + ' legacy sha512 does not match ' + metadata.legacyPath);
        } else {
          console.log('ok: ' + fileName + ' legacy path/sha512 matches ' + metadata.legacyPath);
        }
      }
    }
  }

  if (!failed) console.log('ok: ' + fileName + ' references the complete updater set');
}

function requireChecksumManifest(fileName, expectedFiles) {
  const manifestPath = path.join(distDir, fileName);
  if (!fileInfo(manifestPath).exists) {
    fail(fileName);
    return;
  }
  let text = '';
  try {
    text = fs.readFileSync(manifestPath, 'ascii');
  } catch (_) {
    fail(fileName);
    return;
  }

  const entries = new Map();
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!match) {
      fail(fileName + ' contains a malformed line: ' + line);
      continue;
    }
    if (entries.has(match[2])) {
      fail(fileName + ' contains a duplicate entry: ' + match[2]);
    }
    entries.set(match[2], match[1]);
  }

  const expectedSet = new Set(expectedFiles);
  for (const expectedFile of expectedSet) {
    if (!entries.has(expectedFile)) {
      fail(fileName + ' does not contain ' + expectedFile);
      continue;
    }
    const artifactPath = path.join(distDir, expectedFile);
    if (!fileInfo(artifactPath).exists) {
      fail(fileName + ' references a missing artifact: ' + expectedFile);
      continue;
    }
    const actualHash = hashFile(artifactPath, 'sha256', 'hex');
    if (entries.get(expectedFile) !== actualHash) {
      fail(fileName + ' sha256 does not match ' + expectedFile);
    } else {
      console.log('ok: ' + fileName + ' sha256 matches ' + expectedFile);
    }
  }
  for (const referencedFile of entries.keys()) {
    if (!expectedSet.has(referencedFile)) {
      fail(fileName + ' unexpectedly references ' + referencedFile);
    }
  }
}

function verifyWindows() {
  const installers = [
    'AlloFlow-Desktop-' + version + '-setup.exe',
    ...['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '-setup.exe'),
  ];
  for (const installer of installers) {
    requireFile(installer, 1024 * 1024);
    if (windowsDifferentialPackage) {
      requireFile(installer + '.blockmap', 1024);
    } else if (fileInfo(path.join(distDir, installer + '.blockmap')).exists) {
      fail('full-download mode must not ship a stale blockmap: ' + installer + '.blockmap');
    }
  }
  requireMetadata(channel + '.yml', installers);
  requireChecksumManifest('SHA256SUMS-windows.txt', installers);

  if (!windowsDifferentialPackage) {
    console.log('ok: Windows updater is in full-download mode (ZIP/nsisunz; blockmaps intentionally omitted)');
  }
}
function verifyMac() {
  const dmgs = ['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '.dmg');
  const zips = ['x64', 'arm64'].map((arch) => 'AlloFlow-Desktop-' + version + '-' + arch + '.zip');
  for (const dmg of dmgs) requireFile(dmg, 1024 * 1024);
  for (const zip of zips) {
    requireFile(zip, 1024 * 1024);
    requireFile(zip + '.blockmap', 1024);
  }
  requireMetadata(channel + '-mac.yml', [...zips, ...dmgs]);
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
