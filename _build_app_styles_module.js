#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'app_styles_source.jsx');
const OUTPUT = path.join(ROOT, 'app_styles_module.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public', 'app_styles_module.js');
function buildAppStylesModule(source) {
  const compiled = babel.transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
  return `(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.AppStyles) { console.log('[CDN] AppStyles already loaded, skipping'); return; }\nvar React = window.React;\n\n${compiled}\nconsole.log('[CDN] AppStyles loaded');\n})();\n`;
}
module.exports = { buildAppStylesModule };
if (require.main === module) {
  if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
  const output = buildAppStylesModule(fs.readFileSync(SOURCE, 'utf8'));
  fs.writeFileSync(OUTPUT, output, 'utf8');
  fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
  fs.writeFileSync(PUBLIC, output, 'utf8');
  console.log('Built app_styles_module.js and public mirror (' + Buffer.byteLength(output) + ' bytes)');
}
