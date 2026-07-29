#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'allo_sheet');
const destinationDirs = [
  path.join(root, 'desktop', 'web-app', 'public', 'allo_sheet'),
  path.join(root, 'desktop', 'app-build', 'allo_sheet'),
];
const files = [
  'allo_sheet.html',
  'allo_sheet.css',
  'allo_sheet.js',
  'allo_sheet_adapter.js',
  'host_bridge.js',
  'README.md',
  'THIRD_PARTY_NOTICES.md'
];
const rootMirrorFiles = [
  'view_educator_hub_modal_module.js',
  'view_info_modal_module.js',
];
const checkOnly = process.argv.includes('--check');
const mismatches = [];

for (const file of files) {
  const source = path.join(sourceDir, file);
  if (!fs.existsSync(source)) {
    mismatches.push(`${file}: source is missing`);
    continue;
  }
  for (const destinationDir of destinationDirs) {
    const destination = path.join(destinationDir, file);
    const sourceBytes = fs.readFileSync(source);
    const destinationBytes = fs.existsSync(destination) ? fs.readFileSync(destination) : null;
    if (destinationBytes && sourceBytes.equals(destinationBytes)) continue;
    if (checkOnly) {
      mismatches.push(`${path.relative(root, destination)}: mirror is missing or stale`);
      continue;
    }
    fs.mkdirSync(destinationDir, { recursive: true });
    fs.copyFileSync(source, destination);
    process.stdout.write(`Synced ${path.relative(root, destination)}\n`);
  }
}

for (const file of rootMirrorFiles) {
  const source = path.join(root, file);
  const sourceBytes = fs.readFileSync(source);
  for (const destinationRoot of destinationDirs.map((dir) => path.dirname(dir))) {
    const destination = path.join(destinationRoot, file);
    const destinationBytes = fs.existsSync(destination) ? fs.readFileSync(destination) : null;
    if (destinationBytes && sourceBytes.equals(destinationBytes)) continue;
    if (checkOnly) {
      mismatches.push(`${path.relative(root, destination)}: mirror is missing or stale`);
      continue;
    }
    fs.mkdirSync(destinationRoot, { recursive: true });
    fs.copyFileSync(source, destination);
    process.stdout.write(`Synced ${path.relative(root, destination)}\n`);
  }
}

if (mismatches.length) {
  process.stderr.write(mismatches.join('\n') + '\n');
  process.exitCode = 1;
} else if (checkOnly) {
  process.stdout.write('AlloSheet public and packaged assets are synchronized.\n');
}
