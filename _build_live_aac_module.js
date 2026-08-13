#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'live_aac_source.jsx');
const OUTPUT = path.join(ROOT, 'live_aac_module.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public', 'live_aac_module.js');
function buildLiveAacModule(source) {
  const compiled = babel.transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
  return `(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.LiveAac) { console.log('[CDN] LiveAac already loaded, skipping'); return; }\nvar React = window.React;\nvar useState = React.useState;\nvar useEffect = React.useEffect;\nvar useRef = React.useRef;\n${compiled}\nconsole.log('[CDN] LiveAac loaded');\n})();\n`;
}
module.exports = { buildLiveAacModule };
if (require.main === module) {
  if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
  const output = buildLiveAacModule(fs.readFileSync(SOURCE, 'utf8'));
  fs.writeFileSync(OUTPUT, output, 'utf8');
  fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
  fs.writeFileSync(PUBLIC, output, 'utf8');
  console.log('Built live_aac_module.js and public mirror (' + Buffer.byteLength(output) + ' bytes)');
}
