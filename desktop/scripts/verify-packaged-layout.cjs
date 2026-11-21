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
const archArg = process.argv.find((arg) => arg.startsWith('--arch='))
  || (process.argv.includes('--arch') ? '--arch=' + process.argv[process.argv.indexOf('--arch') + 1] : '');
const requestedArch = archArg.replace('--arch=', '').toLowerCase();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertFile(filePath, minimumBytes, label, { allowSymlink = false } = {}) {
  const stats = allowSymlink
    ? fs.statSync(filePath, { throwIfNoEntry: false })
    : fs.lstatSync(filePath, { throwIfNoEntry: false });
  assert(
    stats && (!allowSymlink ? !stats.isSymbolicLink() : true) && stats.isFile() && stats.size >= minimumBytes,
    label + ' is missing, symlinked, or unexpectedly small: ' + filePath
  );
}

function findFiles(root, predicate) {
  const matches = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      assert(!entry.isSymbolicLink(), 'Refusing symbolic link in packaged app-build: ' + entryPath);
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
        rootDir: path.join(distDir, 'win-unpacked'),
        resources: path.join(distDir, 'win-unpacked', 'resources'),
        launcher: path.join(distDir, 'win-unpacked', 'AlloFlow Desktop.exe'),
      },
      {
        arch: 'arm64',
        rootDir: path.join(distDir, 'win-arm64-unpacked'),
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
      let discoveryError = '';
      if (fs.existsSync(root)) {
        const apps = fs.readdirSync(root, { withFileTypes: true })
          .filter((entry) => entry.name.endsWith('.app') && entry.isDirectory() && !entry.isSymbolicLink())
          .map((entry) => entry.name);
        if (apps.length === 1) appName = apps[0];
        else discoveryError = arch + ' packaged directory ' + root + ' must contain exactly one .app bundle (found ' + apps.length + ')';
      }
      const contents = path.join(root, appName, 'Contents');
      return {
        arch,
        rootDir: root,
        discoveryError,
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
    assertFile(layout.electronFramework, 50 * 1024 * 1024, layout.arch + ' Electron Framework binary', { allowSymlink: true });
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
  const allLayouts = resourceLayouts();
  const targetLayouts = (requestedArch && requestedArch !== 'all')
    ? allLayouts.filter((layout) => layout.arch === requestedArch)
    : allLayouts;
  assert(targetLayouts.length > 0, 'Unknown --arch value: ' + requestedArch);
  for (const layout of targetLayouts) {
    if (layout.discoveryError) throw new Error(layout.discoveryError);
    if (fs.existsSync(layout.rootDir) && !fs.existsSync(path.dirname(layout.resources))) {
      throw new Error(layout.arch + ' packaged directory exists but is missing expected layout: ' + layout.resources);
    }
  }
  const present = targetLayouts.filter((layout) => fs.existsSync(path.dirname(layout.resources)));
  assert(present.length > 0, 'no packaged app found for any architecture under ' + distDir);
  const missing = targetLayouts.filter((l) => !present.includes(l));
  if (requestedArch === 'all' || (requestedArch && requestedArch !== 'auto')) {
    assert(missing.length === 0, 'missing required packaged architecture(s): ' + missing.map((l) => l.arch).join(', '));
  }
  for (const layout of missing) {
    console.log('skip: ' + layout.arch + ' (not built)');
  }
  for (const layout of present) verifyLayout(layout);
  console.log('[AlloFlow Desktop] Packaged layout drill passed');
} catch (error) {
  console.error('[AlloFlow Desktop] Packaged layout drill failed:', error && error.message ? error.message : error);
  process.exitCode = 1;
}
