#!/usr/bin/env node
/**
 * build-remediation.js — Package the focused "AlloFlow Remediation" flavor.
 *
 * The remediation edition carries its OWN version, independent of the admin app.
 * That version lives in admin/remediation-version.json (a dedicated, easy-to-bump
 * file) — not in package.json and not pinned in the builder config. This wrapper
 * reads it, writes an effective electron-builder config with the version injected
 * into extraMetadata, and builds from that temp config.
 *
 * electron-builder's `extraMetadata` rewrites the SOURCE package.json in place and
 * does not reliably restore it — it strips scripts/devDependencies/build. To keep
 * the source pristine, this wrapper snapshots package.json, runs the build, and
 * always restores the snapshot afterwards. The packaged app still receives the
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
const VERSION_FILE = path.join(ADMIN_DIR, 'remediation-version.json');
const BASE_CONFIG = path.join(ADMIN_DIR, 'electron-builder.remediation.json');
const EFFECTIVE_CONFIG = path.join(ADMIN_DIR, 'electron-builder.remediation.effective.json');
const platform = (process.argv[2] || 'mac').toLowerCase();
const platformFlag = platform === 'win' ? '-w' : '--mac';

const snapshot = fs.readFileSync(PKG, 'utf-8');

// Resolve the remediation edition's own version from its dedicated file.
let remediationVersion = '0.0.0';
try {
  remediationVersion = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8')).version || remediationVersion;
} catch (e) {
  console.error(`[build-remediation] Could not read ${VERSION_FILE}: ${e.message}`);
  process.exit(1);
}
console.log(`[build-remediation] Remediation edition version: ${remediationVersion}`);

// Build an effective config = base config + injected version (extraMetadata.version).
const effectiveConfig = JSON.parse(fs.readFileSync(BASE_CONFIG, 'utf-8'));
effectiveConfig.extraMetadata = { ...(effectiveConfig.extraMetadata || {}), version: remediationVersion };
fs.writeFileSync(EFFECTIVE_CONFIG, JSON.stringify(effectiveConfig, null, 2));

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ADMIN_DIR, stdio: 'inherit' });
}

try {
  run('npm run clean');
  run('npm run build:local');   // rebuild local-app bundle
  run('npm run build');         // build admin React app
  run(`electron-builder -c electron-builder.remediation.effective.json ${platformFlag} --publish never`);
  console.log('\n[build-remediation] Build complete.');
} finally {
  // Remove the generated effective config.
  try { if (fs.existsSync(EFFECTIVE_CONFIG)) fs.unlinkSync(EFFECTIVE_CONFIG); } catch (_) {}
  // Always restore the source package.json — extraMetadata may have clobbered it.
  const after = fs.existsSync(PKG) ? fs.readFileSync(PKG, 'utf-8') : '';
  if (after !== snapshot) {
    fs.writeFileSync(PKG, snapshot);
    console.log('[build-remediation] Restored source package.json (was modified by extraMetadata).');
  }
}
