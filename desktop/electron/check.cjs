#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'main.cjs'),
  path.join(__dirname, 'preload.cjs'),
  path.join(__dirname, 'security.cjs'),
  path.join(__dirname, '..', '..', 'desktop/web-app', 'public', 'alloflow_desktop_bridge.js'),
  path.join(__dirname, '..', 'runtime', 'alloflow-desktop-runtime.cjs'),
  path.join(__dirname, '..', 'runtime', 'web-source-fetch.cjs'),
  path.join(__dirname, '..', 'command-center', 'command-center.js'),
  path.join(__dirname, '..', 'scripts', 'package-windows-safe.cjs'),
  path.join(__dirname, '..', 'scripts', 'verify-desktop-artifacts.cjs'),
  path.join(__dirname, '..', 'scripts', 'verify-packaged-layout.cjs'),
  path.join(__dirname, '..', 'scripts', 'test-desktop-artifact-verifier.cjs'),
];

for (const file of files) {
  execFileSync(process.execPath, ['-c', file], { stdio: 'inherit' });
}

const { isSameOrigin } = require('./security.cjs');
const trustedUrl = 'http://127.0.0.1:32170';
if (!isSameOrigin(trustedUrl + '/settings', trustedUrl)) {
  throw new Error('Desktop navigation guard rejected a trusted same-origin route.');
}
if (isSameOrigin('http://127.0.0.1:32170@evil.example/', trustedUrl)) {
  throw new Error('Desktop navigation guard accepted a userinfo-prefix origin bypass.');
}
if (isSameOrigin('http://127.0.0.1:32171/', trustedUrl)) {
  throw new Error('Desktop navigation guard accepted a different loopback port.');
}

const mainSource = fs.readFileSync(path.join(__dirname, 'main.cjs'), 'utf8');
for (const requiredBoundary of [
  "crypto.randomBytes(32).toString('base64url')",
  "getBundledAppOrigin() + '/api/*'",
  "urls: [getCommandCenterUrl() + '/api/*'",
  'configurePrivateApiRequestHeaders(mainWindow)',
  'details.frame.parent === null',
  "key.toLowerCase() === 'x-allo-desktop-token'",
  'runtime.configurePrivateApiToken(PRIVATE_API_TOKEN)',
]) {
  if (!mainSource.includes(requiredBoundary)) {
    throw new Error('Electron private API boundary is missing: ' + requiredBoundary);
  }
}

const runtime = require(path.join(__dirname, '..', 'runtime', 'alloflow-desktop-runtime.cjs'));
const commandCenterSource = fs.readFileSync(path.join(__dirname, '..', 'command-center', 'command-center.js'), 'utf8');
for (const requiredBridgeBoundary of [
  'event.source !== target.window',
  'event.origin !== target.origin',
  "appBridgeRequest('config.apply'",
  "appBridgeRequest('kokoro.download'",
  "appBridgeRequest('sd.download'",
]) {
  if (!commandCenterSource.includes(requiredBridgeBoundary)) {
    throw new Error('Command-center app bridge boundary is missing: ' + requiredBridgeBoundary);
  }
}
const appBridgeSource = fs.readFileSync(path.join(__dirname, '..', '..', 'desktop/web-app', 'public', 'alloflow_desktop_bridge.js'), 'utf8');
const bridgeActions = Array.from(appBridgeSource.matchAll(/action === '([^']+)'/g), (match) => match[1]).sort();
if (JSON.stringify(bridgeActions) !== JSON.stringify(['config.apply', 'kokoro.download', 'kokoro.test', 'sd.download', 'status.get'])) {
  throw new Error('Isolated app bridge exposes an unexpected capability set: ' + bridgeActions.join(', '));
}
const packageMetadata = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
if (typeof packageMetadata.description !== 'string' || packageMetadata.description.length > 160) {
  throw new Error('Desktop package description must stay under 160 characters; NSIS uses it in fixed-size Windows metadata fields.');
}

if (appBridgeSource.includes('/api/config') || appBridgeSource.includes('X-Allo-Desktop-Token')) {
  throw new Error('Isolated app bridge contains a privileged API capability.');
}

const packagedResourcesRoot = path.join('C:', 'AlloFlow', 'resources');
if (runtime.resolveStaticAppDir(packagedResourcesRoot) !== path.join(packagedResourcesRoot, 'app-build')) {
  throw new Error('Packaged runtime did not resolve the external app-build resource.');
}

const builderConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'electron-builder.json'), 'utf8'));
const packagingFiles = Array.isArray(builderConfig.files) ? builderConfig.files : [];
if (packagingFiles.includes('**/*')) {
  for (const resource of ['app-build', 'schoolbox', 'build-resources']) {
    if (!packagingFiles.includes('!' + resource + '/**')) {
      throw new Error('Desktop packaging would duplicate or archive external resource: ' + resource);
    }
  }
}

const installerSource = fs.readFileSync(path.join(__dirname, '..', 'build-resources', 'installer.nsh'), 'utf8');
for (const installerBoundary of [
  'FileSeek $InstallDiagnosticHandle 0 END',
  'ERROR=x64InstallerOnArm64',
  'ERROR=arm64InstallerOnX64',
  '/SD IDOK',
]) {
  if (!installerSource.includes(installerBoundary)) {
    throw new Error('Windows installer compatibility guard is missing: ' + installerBoundary);
  }
}
if ((installerSource.match(/SetErrorLevel 2/g) || []).length < 3) {
  throw new Error('Installer compatibility rejections must return explicit error level 2.');
}
if (builderConfig.nsis?.useZip !== true || builderConfig.nsis?.differentialPackage !== false) {
  throw new Error('Windows NSIS packages must use ZIP/nsisunz; Nsis7z silently failed extraction on Windows ARM.');
}

const safePackagerSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'package-windows-safe.cjs'), 'utf8');
for (const stagingBoundary of [
  'fs.mkdtempSync',
  'looksSynchronized(stageBase)',
  'verify-packaged-layout.cjs',
  'verify-desktop-artifacts.cjs',
  'copyVerified',
  'writeChecksumManifest(stageDist, windowsInstallers)',
  'checksumManifestName',
  'minimumStageFreeBytes',
  'fs.statfsSync(stageBase)',
]) {
  if (!safePackagerSource.includes(stagingBoundary)) {
    throw new Error('Safe Windows packaging is missing: ' + stagingBoundary);
  }
}
if (!String(packageMetadata.scripts?.['package:win']).includes('package-windows-safe.cjs')) {
  throw new Error('Local Windows packaging must use the safe out-of-sync-folder wrapper.');
}
const artifactVerifierSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'verify-desktop-artifacts.cjs'), 'utf8');
for (const integrityBoundary of [
  'parseUpdaterMetadata',
  'sha512 is attached to the wrong or modified artifact',
  'requireChecksumManifest',
  'SHA256SUMS-windows.txt',
]) {
  if (!artifactVerifierSource.includes(integrityBoundary)) {
    throw new Error('Release artifact integrity check is missing: ' + integrityBoundary);
  }
}
const installerSmokeSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'verify-windows-installer.ps1'), 'utf8');
for (const smokeBoundary of [
  'Refusing to run the destructive installer smoke test',
  'Get-AlloFlowRegistrations',
  'Test-RegistrationForRoot',
  'Wait-ProcessWithTimeout',
  'Get-PeMachine',
  'ARM64-only installer rejection returned',
  'ERROR=arm64InstallerOnX64',
  'WrongArchitectureRoot',
]) {
  if (!installerSmokeSource.includes(smokeBoundary)) {
    throw new Error('Windows installer smoke safety is missing: ' + smokeBoundary);
  }
}
if (!String(packageMetadata.scripts?.['verify:installer:win']).includes('verify-windows-installer.ps1')) {
  throw new Error('Windows installer smoke test is not wired into package scripts.');
}


const safeConfigPatch = runtime.sanitizeConfigPatch({
  selectedProvider: 'gemini',
  providers: { gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' } },
  localEngine: { cloudFallbackEnabled: false },
});
if (safeConfigPatch.selectedProvider !== 'gemini' || safeConfigPatch.providers.gemini.baseUrl.indexOf('https://') !== 0) {
  throw new Error('Browser configuration allowlist rejected safe command-center fields.');
}
for (const unsafePatch of [
  { app: { command: 'powershell.exe' } },
  { localEngine: { binaryUrl: 'https://evil.example/tool.exe' } },
]) {
  let rejected = false;
  try {
    runtime.sanitizeConfigPatch(unsafePatch);
  } catch (_) {
    rejected = true;
  }
  if (!rejected) throw new Error('Browser configuration allowlist accepted a privileged field.');
}
console.log('[AlloFlow Desktop] Electron scaffold check passed');

