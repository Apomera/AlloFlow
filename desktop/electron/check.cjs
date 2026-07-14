#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'main.cjs'),
  path.join(__dirname, 'preload.cjs'),
  path.join(__dirname, 'security.cjs'),
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

const runtime = require(path.join(__dirname, '..', 'runtime', 'alloflow-desktop-runtime.cjs'));
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

console.log('[AlloFlow Desktop] Electron scaffold check passed');

