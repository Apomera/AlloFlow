#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'main.cjs'),
  path.join(__dirname, 'preload.cjs'),
  path.join(__dirname, 'security.cjs'),
  path.join(__dirname, '..', '..', 'prismflow-deploy', 'public', 'alloflow_desktop_bridge.js'),
  path.join(__dirname, '..', 'runtime', 'alloflow-desktop-runtime.cjs'),
  path.join(__dirname, '..', 'command-center', 'command-center.js'),
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
const appBridgeSource = fs.readFileSync(path.join(__dirname, '..', '..', 'prismflow-deploy', 'public', 'alloflow_desktop_bridge.js'), 'utf8');
const bridgeActions = Array.from(appBridgeSource.matchAll(/action === '([^']+)'/g), (match) => match[1]).sort();
if (JSON.stringify(bridgeActions) !== JSON.stringify(['config.apply', 'kokoro.download', 'kokoro.test', 'sd.download', 'status.get'])) {
  throw new Error('Isolated app bridge exposes an unexpected capability set: ' + bridgeActions.join(', '));
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

