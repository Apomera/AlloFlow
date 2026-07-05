#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const files = [
  path.join(__dirname, 'main.cjs'),
  path.join(__dirname, 'preload.cjs'),
  path.join(__dirname, '..', 'runtime', 'alloflow-desktop-runtime.cjs'),
  path.join(__dirname, '..', 'command-center', 'command-center.js'),
];

for (const file of files) {
  execFileSync(process.execPath, ['-c', file], { stdio: 'inherit' });
}

console.log('[AlloFlow Desktop] Electron scaffold check passed');

