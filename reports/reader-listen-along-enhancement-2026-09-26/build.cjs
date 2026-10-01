// Build only the captured candidate. No shared source or public output writes.
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const source = ['base/reader_place_store.js', 'base/reader_support_drafts.js', 'candidate/view_simplified_source.jsx']
  .map(file => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n');
const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] }, generatorOpts: { jsescOption: { minimal: true } }
});
const output = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.SimplifiedView) return;
var React = window.React;
if (!React) throw new Error('React required');
var Fragment = React.Fragment;
${result.code}
window.AlloModules = window.AlloModules || {};
window.AlloModules.SimplifiedView = SimplifiedView;
window.AlloModules.ViewSimplifiedModule = true;
})();\n`;
new Function(output);
fs.writeFileSync(path.join(__dirname, 'candidate/view_simplified_module.js'), output);
console.log('Built isolated reader candidate (' + output.length + ' characters).');
