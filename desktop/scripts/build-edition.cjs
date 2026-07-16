#!/usr/bin/env node
'use strict';

// build-edition.cjs — package a flavored build of the desktop app.
//
// Two editions share this one codebase (decided 2026-07-15):
//   desktop — "AlloFlow Desktop":       single-teacher desktop; boots straight
//             into the web app full-bleed, console behind a settings gear.
//   admin   — "AlloFlow Admin Server":  school-server posture; boots into the
//             command center, auto-starts LAN Share (serves the full web app
//             to the network) and enforces a join PIN by default.
//
// Note: the Document Remediation experience is NOT a build flavor — it is an
// install-step choice inside the desktop installer ("Choose your experience",
// build-resources/installer.nsh), persisted to userData and read at boot by
// electron/main.cjs. One desktop installer serves both experiences.
//
// The flavor is baked via electron-builder extraMetadata.alloEdition (read by
// electron/main.cjs at boot) plus a distinct appId/productName/artifact prefix
// so both apps install side by side with separate userData dirs. Mirrors the
// proven admin/scripts/build-remediation.js effective-config approach: the
// base electron-builder.json stays untouched; a temp effective config is
// written, used, and removed. An unflavored `npm run package:*` build keeps
// pure upstream behavior.
//
// Usage: node scripts/build-edition.cjs <desktop|admin> [win-x64|win|mac] (default win-x64)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const BASE_CONFIG = path.join(DESKTOP_ROOT, 'electron-builder.json');

const EDITIONS = {
  // The single-user flavor IS the desktop product ("AlloFlow Desktop") — it
  // shares the upstream appId/name and simply adds the guided posture.
  desktop: {
    appId: 'com.alloflow.desktop',
    productName: 'AlloFlow Desktop',
    // packageName drives Electron's userData dir — the admin edition gets its
    // own profile (config, caches, service workers) so side-by-side installs
    // never share state. ('alloflow-admin' is taken by the legacy admin app.)
    packageName: 'alloflow-desktop',
    artifactPrefix: 'AlloFlow-Desktop',
    outputDir: 'dist/desktop',
  },
  admin: {
    appId: 'com.alloflow.adminserver',
    productName: 'AlloFlow Admin Server',
    packageName: 'alloflow-admin-server',
    artifactPrefix: 'AlloFlow-Admin-Server',
    outputDir: 'dist/admin',
  },
};

const TARGETS = {
  'win-x64': '--win nsis --x64',
  'win': '--win nsis --x64 --arm64',
  'mac': '--mac dmg zip --x64 --arm64',
};

const edition = String(process.argv[2] || '').toLowerCase();
const target = String(process.argv[3] || 'win-x64').toLowerCase();
if (!EDITIONS[edition]) {
  console.error(`[build-edition] Unknown edition "${edition}". Use: desktop | admin`);
  process.exit(1);
}
if (!TARGETS[target]) {
  console.error(`[build-edition] Unknown target "${target}". Use: ${Object.keys(TARGETS).join(' | ')}`);
  process.exit(1);
}

const spec = EDITIONS[edition];
const EFFECTIVE_CONFIG = path.join(DESKTOP_ROOT, `electron-builder.${edition}.effective.json`);

const config = JSON.parse(fs.readFileSync(BASE_CONFIG, 'utf8'));
config.appId = spec.appId;
config.productName = spec.productName;
config.extraMetadata = { ...(config.extraMetadata || {}), alloEdition: edition, name: spec.packageName };
config.directories = { ...(config.directories || {}), output: spec.outputDir };
// Re-prefix every artifactName so installers are clearly flavored.
const reprefix = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key === 'artifactName' && typeof obj[key] === 'string') {
      obj[key] = obj[key].replace(/^AlloFlow-Desktop/, spec.artifactPrefix);
    } else if (obj[key] && typeof obj[key] === 'object') {
      reprefix(obj[key]);
    }
  }
};
reprefix(config);
fs.writeFileSync(EFFECTIVE_CONFIG, JSON.stringify(config, null, 2));
console.log(`[build-edition] Edition: ${edition} (${spec.productName}) → ${spec.outputDir}`);

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: DESKTOP_ROOT, stdio: 'inherit' });
}

try {
  run('npm run web:build');
  run(`npx electron-builder --config ${path.basename(EFFECTIVE_CONFIG)} ${TARGETS[target]} --publish never`);
  console.log(`\n[build-edition] ${spec.productName} build complete.`);
} finally {
  try { if (fs.existsSync(EFFECTIVE_CONFIG)) fs.unlinkSync(EFFECTIVE_CONFIG); } catch (_) {}
}
