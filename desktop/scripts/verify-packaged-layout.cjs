#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');

const desktopRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(process.env.ALLOFLOW_DESKTOP_DIST_DIR || path.join(desktopRoot, 'dist'));
const sourcePackage = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const platformArg = process.argv.find((arg) => arg.startsWith('--platform='))
  || (process.argv.includes('--platform') ? '--platform=' + process.argv[process.argv.indexOf('--platform') + 1] : '');
const requestedPlatform = platformArg.replace('--platform=', '').toLowerCase();
const platform = requestedPlatform || (process.platform === 'darwin' ? 'mac' : (process.platform === 'win32' ? 'win' : ''));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertFile(filePath, minimumBytes, label) {
  const stats = fs.statSync(filePath, { throwIfNoEntry: false });
  assert(stats && stats.isFile() && stats.size >= minimumBytes, label + ' is missing or unexpectedly small: ' + filePath);
}

function findFiles(root, predicate) {
  const matches = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile() && predicate(entryPath)) matches.push(entryPath);
    }
  }
  return matches;
}

function resourceLayouts() {
  if (platform === 'win' || platform === 'windows') {
    return [
      {
        arch: 'x64',
        resources: path.join(distDir, 'win-unpacked', 'resources'),
        launcher: path.join(distDir, 'win-unpacked', 'AlloFlow Desktop.exe'),
      },
      {
        arch: 'arm64',
        resources: path.join(distDir, 'win-arm64-unpacked', 'resources'),
        launcher: path.join(distDir, 'win-arm64-unpacked', 'AlloFlow Desktop.exe'),
      },
    ];
  }
  if (platform === 'mac' || platform === 'macos' || platform === 'darwin') {
    // The mac launcher is a small stub (tens of KB on Electron 39) — the real
    // payload is the Electron Framework binary, asserted separately. Flavored
    // builds ship differently-named bundles (AlloFlow Desktop.app, AlloFlow
    // Remediation.app…), so discover the .app per arch dir rather than
    // hardcoding the desktop name (point the drill at a flavored output with
    // ALLOFLOW_DESKTOP_DIST_DIR, e.g. dist/remediation).
    const macLayout = (dirName, arch) => {
      const root = path.join(distDir, dirName);
      let appName = 'AlloFlow Desktop.app';
      try {
        const apps = fs.readdirSync(root).filter((entry) => entry.endsWith('.app'));
        if (apps.length === 1) appName = apps[0];
      } catch (_) {}
      const contents = path.join(root, appName, 'Contents');
      return {
        arch,
        resources: path.join(contents, 'Resources'),
        launcher: path.join(contents, 'MacOS', appName.replace(/\.app$/, '')),
        launcherMinBytes: 8 * 1024,
        electronFramework: path.join(contents, 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Electron Framework'),
      };
    };
    return [macLayout('mac', 'x64'), macLayout('mac-arm64', 'arm64')];
  }
  throw new Error('Use --platform win or --platform mac on this host.');
}

function verifyLayout(layout) {
  const appAsar = path.join(layout.resources, 'app.asar');
  const appBuild = path.join(layout.resources, 'app-build');
  const schoolBox = path.join(layout.resources, 'schoolbox');
  assertFile(layout.launcher, layout.launcherMinBytes || 1024 * 1024, layout.arch + ' native launcher');
  if (layout.electronFramework) {
    assertFile(layout.electronFramework, 50 * 1024 * 1024, layout.arch + ' Electron Framework binary');
  }
  assertFile(appAsar, 1024 * 1024, layout.arch + ' app.asar');
  assertFile(path.join(appBuild, 'index.html'), 1024, layout.arch + ' bundled app index');
  assertFile(path.join(appBuild, 'alloflow_desktop_bridge.js'), 1024, layout.arch + ' desktop app bridge');
  assertFile(path.join(schoolBox, 'docker-compose.yml'), 100, layout.arch + ' School Box compose file');

  const entries = new Set(asar.listPackage(appAsar).map((entry) => entry.replaceAll('\\', '/')));
  const requiredEntries = [
    '/package.json',
    '/electron/main.cjs',
    '/electron/preload.cjs',
    '/electron/security.cjs',
    '/runtime/alloflow-desktop-runtime.cjs',
    '/runtime/web-source-fetch.cjs',
    '/command-center/index.html',
    '/contracts/runtime-contract.json',
  ];
  for (const entry of requiredEntries) {
    assert(entries.has(entry), layout.arch + ' app.asar is missing ' + entry);
  }

  const packagedPackage = JSON.parse(asar.extractFile(appAsar, 'package.json').toString('utf8'));
  assert(packagedPackage.version === sourcePackage.version,
    layout.arch + ' packaged version ' + packagedPackage.version + ' does not match source ' + sourcePackage.version);
  assert(packagedPackage.main === 'electron/main.cjs', layout.arch + ' package has an unexpected Electron entry point.');

  const mainSource = asar.extractFile(appAsar, 'electron/main.cjs').toString('utf8');
  const runtimeSource = asar.extractFile(appAsar, 'runtime/alloflow-desktop-runtime.cjs').toString('utf8');
  const commandCenterSource = asar.extractFile(appAsar, 'command-center/command-center.js').toString('utf8');
  assert(mainSource.includes('configurePrivateApiToken(PRIVATE_API_TOKEN)'),
    layout.arch + ' package does not configure the per-launch private API token.');
  assert(mainSource.includes("randomBytes(32).toString('base64url')"),
    layout.arch + ' package does not create a cryptographically random private API token.');
  assert(runtimeSource.includes('FIRST_PARTY_DOWNLOAD_SHA256'),
    layout.arch + ' package does not contain the first-party download integrity manifest.');
  assert(runtimeSource.includes('privateApiGuardRejection'),
    layout.arch + ' package does not contain the private API request guard.');

  const webScripts = findFiles(appBuild, (filePath) => filePath.endsWith('.js'));
  assert(webScripts.length > 0, layout.arch + ' bundled app contains no JavaScript assets.');
  const hasScopedLanAdapter = webScripts.some((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    return source.includes('lanToken') && source.includes('Bearer ');
  });
  assert(runtimeSource.includes('getIsolatedBundledAppOrigin'),
    layout.arch + ' package does not isolate the bundled app origin.');
  assert(commandCenterSource.includes('event.source !== target.window')
    && commandCenterSource.includes('event.origin !== target.origin')
    && commandCenterSource.includes("appBridgeRequest('config.apply'"),
    layout.arch + ' package does not contain the narrow command-center bridge boundary.');

  assert(hasScopedLanAdapter, layout.arch + ' bundled app does not contain the scoped LAN-token adapter.');

  console.log('ok: ' + layout.arch + ' packaged runtime, web app, resources, and native launcher');
  const bridgeSource = fs.readFileSync(path.join(appBuild, 'alloflow_desktop_bridge.js'), 'utf8');
  assert(bridgeSource.includes("CHANNEL = 'alloflow-desktop-bridge'"),
    layout.arch + ' bundled app bridge has an unexpected protocol.');
  assert(bridgeSource.includes("action === 'config.apply'") && bridgeSource.includes("action === 'kokoro.test'"),
    layout.arch + ' bundled app bridge is missing its narrow capability handlers.');

}

console.log('[AlloFlow Desktop] Packaged layout drill');
console.log('dist: ' + distDir);
console.log('platform: ' + (platform || 'unknown'));

try {
  // Single-arch builds (e.g. the mac-arm64 target) only produce one unpacked
  // dir — verify every arch that was actually built, require at least one.
  const layouts = resourceLayouts();
  const present = layouts.filter((layout) => fs.existsSync(path.dirname(layout.resources)));
  assert(present.length > 0, 'no packaged app found for any architecture under ' + distDir);
  for (const layout of layouts.filter((l) => !present.includes(l))) {
    console.log('skip: ' + layout.arch + ' (not built)');
  }
  for (const layout of present) verifyLayout(layout);
  console.log('[AlloFlow Desktop] Packaged layout drill passed');
} catch (error) {
  console.error('[AlloFlow Desktop] Packaged layout drill failed:', error && error.message ? error.message : error);
  process.exitCode = 1;
}
