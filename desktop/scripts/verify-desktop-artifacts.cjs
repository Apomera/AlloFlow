#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const distDir = path.join(desktopRoot, 'dist');
// Version lives in desktop/package.json since the 2026-07-04 dependency split
// (the repo-root package.json is the web project and carries no version).
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const version = packageJson.version || '0.0.0';

const requiredWindows = [
  `AlloFlow-Desktop-${version}-x64-setup.exe`,
  `AlloFlow-Desktop-${version}-arm64-setup.exe`,
];

function fileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return { exists: true, size: stats.size, modified: stats.mtime.toISOString() };
  } catch (_) {
    return { exists: false, size: 0, modified: '' };
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return '';
  }
}

function main() {
  let failed = false;
  console.log('[AlloFlow Desktop] Artifact check');
  console.log('dist: ' + distDir);

  for (const fileName of requiredWindows) {
    const info = fileInfo(path.join(distDir, fileName));
    if (!info.exists || info.size < 1024 * 1024) {
      failed = true;
      console.error('missing: ' + fileName);
      continue;
    }
    console.log(`ok: ${fileName} (${Math.round(info.size / 1024 / 1024)} MB, ${info.modified})`);
  }

  const latestPath = path.join(distDir, 'latest.yml');
  const latest = readText(latestPath);
  if (!latest) {
    console.warn('warning: latest.yml was not found; auto-update metadata has not been generated yet.');
  } else {
    const missingFromLatest = requiredWindows.filter((fileName) => !latest.includes(fileName));
    if (missingFromLatest.length) {
      console.warn('warning: latest.yml does not reference every Windows installer:');
      missingFromLatest.forEach((fileName) => console.warn(' - ' + fileName));
      console.warn('Run the combined Windows package script before publishing a release.');
    } else {
      console.log('ok: latest.yml references both Windows installer architectures');
    }
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main();
