#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');
const workspaceDist = path.join(desktopRoot, 'dist');
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const builderConfig = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'electron-builder.json'), 'utf8'));
const version = packageJson.version;
const channel = String(process.env.ALLOFLOW_UPDATE_CHANNEL || 'latest').toLowerCase() === 'beta' ? 'beta' : 'latest';
const differentialPackage = builderConfig.nsis?.differentialPackage !== false;
const stagePrefix = 'alloflow-desktop-build-';
const windowsInstallers = [
  'AlloFlow-Desktop-' + version + '-setup.exe',
  'AlloFlow-Desktop-' + version + '-x64-setup.exe',
  'AlloFlow-Desktop-' + version + '-arm64-setup.exe',
];
const checksumManifestName = 'SHA256SUMS-windows.txt';
const minimumStageFreeBytes = 6 * 1024 * 1024 * 1024;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Builds Windows installers outside synchronized folders, verifies them, and copies hash-checked artifacts to desktop/dist.');
  console.log('Optional: ALLOFLOW_DESKTOP_STAGE_ROOT=<path>, ALLOFLOW_DESKTOP_KEEP_STAGE=1');
  process.exit(0);
}

function isWithin(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function looksSynchronized(candidate) {
  return /(?:^|[\\/])(?:OneDrive|Dropbox|Google Drive|iCloud)(?:[\\/]|$)/i.test(path.resolve(candidate));
}

function runNode(scriptPath, args, environment) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: desktopRoot,
    env: { ...process.env, ...environment },
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(path.basename(scriptPath) + ' exited with status ' + String(result.status));
  }
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(4 * 1024 * 1024);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
}

function writeChecksumManifest(directory, fileNames) {
  const checksumText = fileNames
    .slice()
    .sort()
    .map((name) => sha256(path.join(directory, name)) + '  ' + name)
    .join('\n') + '\n';
  fs.writeFileSync(path.join(directory, checksumManifestName), checksumText, 'ascii');
}

function retry(action, label, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return action();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn('[AlloFlow Desktop] Retrying ' + label + ' (' + attempt + '/' + attempts + ')');
      }
    }
  }
  throw lastError;
}

function copyVerified(sourcePath, destinationPath) {
  const sourceStats = fs.statSync(sourcePath, { throwIfNoEntry: false });
  if (!sourceStats || !sourceStats.isFile() || sourceStats.size === 0) {
    throw new Error('Missing staged release file: ' + sourcePath);
  }
  const expectedHash = sha256(sourcePath);
  const temporaryPath = destinationPath + '.partial-' + process.pid;
  fs.rmSync(temporaryPath, { force: true });
  retry(() => fs.copyFileSync(sourcePath, temporaryPath), 'copying ' + path.basename(sourcePath));
  if (sha256(temporaryPath) !== expectedHash) {
    fs.rmSync(temporaryPath, { force: true });
    throw new Error('Hash changed while staging ' + path.basename(sourcePath));
  }
  retry(() => fs.copyFileSync(temporaryPath, destinationPath), 'publishing ' + path.basename(sourcePath));
  fs.rmSync(temporaryPath, { force: true });
  if (sha256(destinationPath) !== expectedHash) {
    throw new Error('Published hash does not match staged file: ' + path.basename(sourcePath));
  }
  console.log('ok: copied ' + path.basename(sourcePath) + ' (sha256 ' + expectedHash.slice(0, 16) + '...)');
  return expectedHash;
}

function removeStage(stageDir, stageBase) {
  if (!isWithin(stageDir, stageBase) || path.basename(stageDir).indexOf(stagePrefix) !== 0) {
    throw new Error('Refusing to clean an unexpected staging path: ' + stageDir);
  }
  retry(() => fs.rmSync(stageDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 }), 'cleaning temporary build output', 3);
}

const stageBase = path.resolve(process.env.ALLOFLOW_DESKTOP_STAGE_ROOT || os.tmpdir());
if (isWithin(stageBase, desktopRoot) || looksSynchronized(stageBase)) {
  throw new Error('Windows release staging must be outside the desktop project and synchronized folders: ' + stageBase);
}
fs.mkdirSync(stageBase, { recursive: true });
const stageStats = fs.statfsSync(stageBase);
const availableStageBytes = Number(stageStats.bavail) * Number(stageStats.bsize);
if (availableStageBytes < minimumStageFreeBytes) {
  throw new Error('Windows release packaging requires at least 6 GiB free on the staging volume; available: '
    + Math.round(availableStageBytes / 1024 / 1024 / 1024 * 10) / 10 + ' GiB at ' + stageBase);
}
console.log('[AlloFlow Desktop] Staging volume free space: '
  + Math.round(availableStageBytes / 1024 / 1024 / 1024 * 10) / 10 + ' GiB');

const stageDir = fs.mkdtempSync(path.join(stageBase, stagePrefix));
const stageDist = path.join(stageDir, 'dist');
let completed = false;

console.log('[AlloFlow Desktop] Safe Windows packaging');
console.log('staging: ' + stageDist);
console.log('destination: ' + workspaceDist);

try {
  const builderCli = require.resolve('electron-builder/cli.js');
  runNode(builderCli, [
    '--config', path.join(desktopRoot, 'electron-builder.json'),
    '-c.directories.output=' + stageDist,
    '--win', 'nsis', '--x64', '--arm64', '--publish', 'never',
  ], { ALLOFLOW_DESKTOP_DIST_DIR: stageDist });

  writeChecksumManifest(stageDist, windowsInstallers);
  const verifierEnvironment = { ALLOFLOW_DESKTOP_DIST_DIR: stageDist };
  runNode(path.join(desktopRoot, 'scripts', 'verify-packaged-layout.cjs'), ['--platform', 'win'], verifierEnvironment);
  runNode(path.join(desktopRoot, 'scripts', 'verify-desktop-artifacts.cjs'), ['--platform', 'win'], verifierEnvironment);

  fs.mkdirSync(workspaceDist, { recursive: true });
  const releaseFiles = [...windowsInstallers, channel + '.yml', checksumManifestName];
  if (differentialPackage) {
    releaseFiles.push(...windowsInstallers.map((name) => name + '.blockmap'));
  }
  if (fs.existsSync(path.join(stageDist, 'builder-debug.yml'))) releaseFiles.push('builder-debug.yml');

  for (const fileName of releaseFiles) {
    copyVerified(path.join(stageDist, fileName), path.join(workspaceDist, fileName));
  }
  copyVerified(path.join(desktopRoot, 'WINDOWS-INSTALL.md'), path.join(workspaceDist, 'WINDOWS-INSTALL.md'));

  if (!differentialPackage) {
    for (const installer of windowsInstallers) {
      fs.rmSync(path.join(workspaceDist, installer + '.blockmap'), { force: true });
    }
  }

  runNode(path.join(desktopRoot, 'scripts', 'verify-desktop-artifacts.cjs'), ['--platform', 'win'], {
    ALLOFLOW_DESKTOP_DIST_DIR: workspaceDist,
  });
  completed = true;
  console.log('[AlloFlow Desktop] Safe Windows packaging completed');
} finally {
  if (process.env.ALLOFLOW_DESKTOP_KEEP_STAGE === '1') {
    console.log('[AlloFlow Desktop] Preserved staging directory: ' + stageDir);
  } else {
    try {
      removeStage(stageDir, stageBase);
    } catch (error) {
      console.warn('[AlloFlow Desktop] Could not remove staging directory: ' + error.message);
      if (completed) process.exitCode = 1;
    }
  }
}

