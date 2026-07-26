'use strict';

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'stem_lab', 'blockly_runtime_entry.mjs');
const output = path.join(root, 'stem_lab', 'blockly_runtime.bundle.js');
const checkOnly = process.argv.includes('--check');

const result = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  legalComments: 'eof',
  banner: {
    js: '/*! Blockly 13.1.1 (Apache-2.0) | AlloFlow Blockly bridge */'
  }
});

const next = result.outputFiles[0].text;
if (checkOnly) {
  const current = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '';
  if (current !== next) {
    console.error('Blockly runtime bundle is stale. Run: npm run build:blockly');
    process.exit(1);
  }
  console.log('Blockly runtime bundle is current.');
} else {
  fs.writeFileSync(output, next);
  console.log(`Built ${path.relative(root, output)} (${Math.round(next.length / 1024)} KiB)`);
}
