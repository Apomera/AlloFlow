#!/usr/bin/env node
/**
 * Build brand_profile_editor_module.js from brand_profile_editor_source.jsx via
 * build.js's canonical Babel compile pair so standalone rebuilds are byte-identical
 * to release builds.
 */
const path = require('path');
const { execFileSync } = require('child_process');

execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--compile-only=BrandProfileEditor'], {
  cwd: __dirname,
  stdio: 'inherit',
});
