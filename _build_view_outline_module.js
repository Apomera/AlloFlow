#!/usr/bin/env node
/**
 * Build view_outline_module.js from view_outline_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_outline_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Outline Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='outline' block.
 * Source range (pre-extraction): lines 31127-31238 (~112 lines).
 * Renders the visual outline view: structured outlines, concept maps,
 * Venn diagrams, flow charts. Most actual rendering is delegated to
 * renderInteractiveMap() and renderOutlineContent() helpers from host scope.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.OutlineView) {
    console.log('[CDN] ViewOutlineModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewOutlineModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle = _lazyIcon('CheckCircle');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Edit = _lazyIcon('Edit');
  var Layout = _lazyIcon('Layout');
  var Pencil = _lazyIcon('Pencil');
  var Plus = _lazyIcon('Plus');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Save = _lazyIcon('Save');
  var Share2 = _lazyIcon('Share2');
  var Sparkles = _lazyIcon('Sparkles');
  var Trash2 = _lazyIcon('Trash2');
  var X = _lazyIcon('X');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.OutlineView = OutlineView;
  window.AlloModules.ViewOutlineModule = true;
})();
`;

fs.writeFileSync('view_outline_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_outline_module.js', moduleSrc);
console.log('Wrote view_outline_module.js (' + moduleSrc.length + ' bytes)');
