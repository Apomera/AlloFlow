const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { wrapSimpleIife } = require('./base/_build_simple_iife_module.js');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const reader = babel.transformSync(['base/reader_place_store.js', 'base/reader_support_drafts.js', 'candidate/view_simplified_source.jsx'].map(read).join('\n'), {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] }, generatorOpts: { jsescOption: { minimal: true } }
});
const modules = {
  'view_simplified_module.js': `(function(){'use strict';if(window.AlloModules?.SimplifiedView)return;var React=window.React;var Fragment=React.Fragment;\n${reader.code}\nwindow.AlloModules=window.AlloModules||{};window.AlloModules.SimplifiedView=SimplifiedView;window.AlloModules.ViewSimplifiedModule=true;})();\n`,
  'content_engine_module.js': wrapSimpleIife({ source: read('candidate/content_engine_source.jsx'), guardKey: 'ContentEngineModule' })
};
for (const [name, source] of Object.entries(modules)) { new Function(source); fs.writeFileSync(path.join(__dirname, 'candidate', name), source); }
console.log('Built and syntax-checked isolated reader and content engine.');
