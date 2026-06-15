#!/usr/bin/env node
/**
 * build-remediation.js — Package the focused "AlloFlow Remediation" flavor.
 *
 * electron-builder's `extraMetadata` (used by electron-builder.remediation.json to
 * inject alloEdition + an independent version) rewrites the SOURCE package.json in
 * place and does not reliably restore it — it strips scripts/devDependencies/build.
 * To keep the source pristine, this wrapper snapshots package.json, runs the build,
 * and always restores the snapshot afterwards. The packaged app still receives the
 * injected metadata (electron-builder writes that into the bundled app.asar).
 *
 * Usage: node scripts/build-remediation.js [mac|win]   (default: mac)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ADMIN_DIR = path.join(__dirname, '..');
const PKG = path.join(ADMIN_DIR, 'package.json');
const platform = (process.argv[2] || 'mac').toLowerCase();
const platformFlag = platform === 'win' ? '-w' : '--mac';

const snapshot = fs.readFileSync(PKG, 'utf-8');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ADMIN_DIR, stdio: 'inherit' });
}

try {
  run('npm run clean');
  run('npm run build:local');   // rebuild local-app bundle
  run('npm run build');         // build admin React app
  run(`electron-builder -c electron-builder.remediation.json ${platformFlag} --publish never`);
  console.log('\n[build-remediation] Build complete.');
} finally {
  // Always restore the source package.json — extraMetadata may have clobbered it.
  const after = fs.existsSync(PKG) ? fs.readFileSync(PKG, 'utf-8') : '';
  if (after !== snapshot) {
    fs.writeFileSync(PKG, snapshot);
    console.log('[build-remediation] Restored source package.json (was modified by extraMetadata).');
  }
}
