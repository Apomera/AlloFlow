#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { execFileSync } = require('child_process');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'ui_modals_source.jsx');
const OUTPUT = path.join(ROOT, 'ui_modals_module.js');
const PUBLIC_OUTPUT = path.join(ROOT, 'desktop/web-app', 'public', 'ui_modals_module.js');
const source = fs.readFileSync(SOURCE, 'utf8');
const compiled = babel.transformSync(source, { plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] }, generatorOpts: { jsescOption: { minimal: true } } }).code;
const output = `(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.UIModalsModule) { console.log('[CDN] UIModalsModule already loaded, skipping'); return; }\n${compiled}\n})();\n`;
fs.writeFileSync(OUTPUT, output, 'utf8');
fs.writeFileSync(PUBLIC_OUTPUT, output, 'utf8');
execFileSync(process.execPath, ['-c', OUTPUT], { stdio: 'inherit' });
execFileSync(process.execPath, ['-c', PUBLIC_OUTPUT], { stdio: 'inherit' });
console.log(`Built ${OUTPUT} and synchronized deploy output`);
