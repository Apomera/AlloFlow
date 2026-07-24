#!/usr/bin/env node
/**
 * Build view_brainstorm_module.js from view_brainstorm_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_brainstorm_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Brainstorm Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='brainstorm' block.
 * Source range (post-SentenceFrames): 163 lines.
 * Renders the brainstorm view: idea cards with title/description/connection,
 * teacher guides + student worksheets + cover image generation.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.BrainstormView) {
    console.log('[CDN] ViewBrainstormModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewBrainstormModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Lightbulb = _lazyIcon('Lightbulb');
  var ListChecks = _lazyIcon('ListChecks');
  var RefreshCw = _lazyIcon('RefreshCw');
  var FileText = _lazyIcon('FileText');
  var ImageIcon = _lazyIcon('ImageIcon');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.BrainstormView = BrainstormView;
  window.AlloModules.ViewBrainstormModule = true;
})();
`;

fs.writeFileSync('view_brainstorm_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_brainstorm_module.js', moduleSrc);
console.log('Wrote view_brainstorm_module.js (' + moduleSrc.length + ' bytes)');
