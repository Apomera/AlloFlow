#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { transformSync } = require('esbuild');
function build() {
  const source = fs.readFileSync(path.join(__dirname, 'view_directions_composer_source.jsx'), 'utf8');
  const compiled = transformSync(source, { loader: 'jsx', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', target: 'es2020' }).code;
  const output = '/* AlloFlow - AGPL-3.0-only. Generated from view_directions_composer_source.jsx. */\n(function() {\nvar React = window.React;\nif (window.AlloModules && window.AlloModules.DirectionsComposer) return;\n' + compiled + '\nwindow.AlloModules = window.AlloModules || {};\nwindow.AlloModules.DirectionsComposer = { DirectionsComposerView: DirectionsComposerView };\n})();\n';
  for (const file of ['view_directions_composer_module.js', 'desktop/web-app/public/view_directions_composer_module.js']) fs.writeFileSync(path.join(__dirname, file), output);
  return output;
}
if (require.main === module) { console.log('Directions composer:', Buffer.byteLength(build()), 'bytes'); }
module.exports = { build };
