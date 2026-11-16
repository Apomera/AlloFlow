#!/usr/bin/env node
/**
 * Build personas_module.js from personas_source.jsx via build.js's canonical Babel compile pair
 * so standalone rebuilds are byte-identical to release builds.
 */
const path = require('path');
const { execFileSync } = require('child_process');

execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--compile-only=Personas'], {
  cwd: __dirname,
  stdio: 'inherit',
});
