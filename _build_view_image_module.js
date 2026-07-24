#!/usr/bin/env node
/**
 * Build view_image_module.js from view_image_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_image_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Image Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='image' block.
 * Source range (post-Brainstorm): 153 lines.
 * Renders the visual panel view: VisualPanelGrid for multi-panel,
 * single image with upload/refine/regenerate, label challenge.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ImageView) {
    console.log('[CDN] ViewImageModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewImageModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ImageIcon = _lazyIcon('ImageIcon');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Send = _lazyIcon('Send');
  var Download = _lazyIcon('Download');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ImageView = ImageView;
  window.AlloModules.ViewImageModule = true;
})();
`;

fs.writeFileSync('view_image_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_image_module.js', moduleSrc);
console.log('Wrote view_image_module.js (' + moduleSrc.length + ' bytes)');
