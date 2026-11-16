#!/usr/bin/env node
/**
 * Build tts_module.js from tts_source.jsx via build.js's canonical Babel compile pair
 * so standalone rebuilds are byte-identical to release builds.
 */
const path = require('path');
const { execFileSync } = require('child_process');

execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--compile-only=TTS'], {
  cwd: __dirname,
  stdio: 'inherit',
});
