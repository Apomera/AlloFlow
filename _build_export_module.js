#!/usr/bin/env node
/**
 * Build export_module.js from export_source.jsx.
 * Match build.js's Export compile pair, including its Babel formatting.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { Script } = require('vm');
const source = fs.readFileSync(path.join(__dirname, 'export_source.jsx'), 'utf8');
const compiled = babel.transformSync(source, {
  plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false,
}).code;
const output = '(function() {\n' + "'use strict';\n" +
  "if (window.AlloModules && window.AlloModules.Export) { console.log('[CDN] Export already loaded, skipping'); return; }\n" + compiled + '\n})();\n';
new Script(output, { filename: 'export_module.js' });
for (const file of ['export_module.js', 'desktop/web-app/public/export_module.js']) fs.writeFileSync(path.join(__dirname, file), output);
console.log('[Export] Built and synchronized release-format modules');
