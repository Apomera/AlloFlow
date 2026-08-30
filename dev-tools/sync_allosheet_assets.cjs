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
  'allo_sheet_analysis.js',
  'allo_sheet_workspace.js',
  'allo_sheet_casebook.js',
  'allo_sheet_casebook_ui.js',
  'transfer_adapter.js',
  'host_bridge.js',
  'README.md',
  'THIRD_PARTY_NOTICES.md'
];
const rootMirrorFiles = [
  'view_educator_hub_modal_module.js',
  'view_info_modal_module.js',
  'quiz_live_aggregators.js',
  'view_quiz_module.js',
  'student_analytics_module.js',
  'view_submission_inbox_module.js',
  // Loaded on demand by word_sounds_module.js via window.__alloLoadPlugin.
  // It is not a *_module.js file, so check_deploy_mirror.cjs does not see it;
  // without this entry a stale copy would silently serve an old lesson script.
  'word_sounds_di_loader.js',
];
const checkOnly = process.argv.includes('--check');
const mismatches = [];

// desktop/app-build/ is a gitignored local build output: a fresh CI checkout
// never has it, so demanding its mirrors there would fail the gate on every
// run. In --check mode, verify the app-build mirror only where a desktop build
// actually exists; the tracked web-app/public mirror is always checked.
const appBuildRoot = path.join(root, 'desktop', 'app-build');
const skipDestination = (destination) =>
  checkOnly && destination.startsWith(appBuildRoot) && !fs.existsSync(appBuildRoot);

for (const file of files) {
  const source = path.join(sourceDir, file);
  if (!fs.existsSync(source)) {
    mismatches.push(`${file}: source is missing`);
    continue;
  }
  for (const destinationDir of destinationDirs) {
    const destination = path.join(destinationDir, file);
    if (skipDestination(destination)) continue;
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
    if (skipDestination(destination)) continue;
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
