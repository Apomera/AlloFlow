#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { execFileSync } = require('child_process');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'brand_profile_editor_source.jsx');
const OUTPUT = path.join(ROOT, 'brand_profile_editor_module.js');
const PUBLIC_OUTPUT = path.join(ROOT, 'desktop/web-app', 'public', 'brand_profile_editor_module.js');
const src = fs.readFileSync(SOURCE, 'utf8');
const compiled = babel.transformSync(src, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
const output = `(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.BrandProfileEditor) { console.log('[CDN] BrandProfileEditor already loaded, skipping'); return; }\n${compiled}\n})();\n`;
fs.writeFileSync(OUTPUT, output, 'utf8');
fs.writeFileSync(PUBLIC_OUTPUT, output, 'utf8');
execFileSync(process.execPath, ['-c', OUTPUT], { stdio: 'inherit' });
execFileSync(process.execPath, ['-c', PUBLIC_OUTPUT], { stdio: 'inherit' });
console.log(`Built ${OUTPUT} and synchronized deploy output`);
