#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'shared_activity_source.jsx');
const OUTPUT = path.join(ROOT, 'shared_activity_module.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public/shared_activity_module.js');
function buildSharedActivityModule(source) {
  const compiled = babel.transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
  return `(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.SharedActivity) { console.log('[CDN] SharedActivity already loaded, skipping'); return; }\nvar React = window.React;\nvar _alloMailboxCallWithRetry = function() {\n  var call = window.__alloSharedActivityMailboxCallWithRetry;\n  if (typeof call !== 'function') return Promise.reject(new Error('Shared activity mailbox transport is not ready'));\n  return call.apply(window, arguments);\n};\n${compiled}\nconsole.log('[CDN] SharedActivity loaded');\n})();\n`;
}
module.exports = { buildSharedActivityModule };
if (require.main === module) {
  if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
  const output = buildSharedActivityModule(fs.readFileSync(SOURCE, 'utf8'));
  fs.writeFileSync(OUTPUT, output, 'utf8');
  fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
  fs.writeFileSync(PUBLIC, output, 'utf8');
  console.log('Built shared_activity_module.js and public mirror (' + Buffer.byteLength(output) + ' bytes)');
}
