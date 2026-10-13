#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const RESERVE_BYTES = 512 * 1024 * 1024;

// The isolated builder keeps one output under os.tmpdir() and another staging
// copy under desktop/ while retaining the old app-build. Existing files already
// count against available space. The reserve allows for caches and file overhead;
// this is an estimate, not a guarantee against concurrent disk consumption.
function assessDesktopBuildSpace({ publicBytes, hostedBytes, desktopVolume, tempVolume }) {
  for (const bytes of [publicBytes, hostedBytes, desktopVolume.freeBytes, tempVolume.freeBytes]) {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Invalid disk-space measurement');
  }
  if (desktopVolume.device == null || tempVolume.device == null) throw new Error('Unknown disk volume');
  const outputBytes = Math.max(publicBytes, hostedBytes);
  const volumes = desktopVolume.device === tempVolume.device ? [{
    path: desktopVolume.path,
    freeBytes: Math.min(desktopVolume.freeBytes, tempVolume.freeBytes),
    requiredBytes: 2 * outputBytes + RESERVE_BYTES,
  }] : [desktopVolume, tempVolume].map(volume => ({
    path: volume.path,
    freeBytes: volume.freeBytes,
    requiredBytes: outputBytes + RESERVE_BYTES,
  }));
  return { outputBytes, volumes, enough: volumes.every(volume => volume.freeBytes >= volume.requiredBytes) };
}

function directoryBytes(directory, ancestors = new Set()) {
  const real = fs.realpathSync(directory);
  if (ancestors.has(real)) throw new Error('Directory link cycle: ' + directory);
  ancestors.add(real);
  let bytes = 0;
  for (const entry of fs.readdirSync(directory)) {
    const file = path.join(directory, entry);
    const stat = fs.statSync(file); // Public assets are copied with dereference: true.
    bytes += stat.isDirectory() ? directoryBytes(file, ancestors) : stat.size;
  }
  ancestors.delete(real);
  return bytes;
}

function inspectDesktopBuildSpace(repoRoot = path.resolve(__dirname, '..')) {
  function volume(directory) {
    const disk = fs.statfsSync(directory);
    return { path: directory, device: fs.statSync(directory).dev, freeBytes: disk.bavail * disk.bsize };
  }
  return assessDesktopBuildSpace({
    publicBytes: directoryBytes(path.join(repoRoot, 'desktop/web-app/public')),
    hostedBytes: directoryBytes(path.join(repoRoot, 'desktop/web-app/build')),
    desktopVolume: volume(path.join(repoRoot, 'desktop')),
    tempVolume: volume(os.tmpdir()),
  });
}

if (require.main === module) {
  try {
    const result = inspectDesktopBuildSpace();
    const gib = bytes => (bytes / 1024 ** 3).toFixed(2) + ' GiB';
    for (const volume of result.volumes) {
      console.log(`  Desktop disk estimate: ${gib(volume.freeBytes)} free, ${gib(volume.requiredBytes)} needed (${volume.path}).`);
    }
    process.exitCode = result.enough ? 0 : 2;
  } catch (error) {
    console.warn('  Desktop disk-space check unavailable: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { assessDesktopBuildSpace, inspectDesktopBuildSpace, RESERVE_BYTES };
