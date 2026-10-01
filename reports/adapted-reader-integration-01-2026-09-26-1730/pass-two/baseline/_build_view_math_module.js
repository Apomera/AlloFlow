#!/usr/bin/env node
/**
 * Build view_math_module.js from view_math_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_math_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Math Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='math' block.
 * Source range: 565 lines body.
 * Renders: math problem cards with title + step-by-step solutions, student
 * work textarea with AI Check My Work + hint system, manipulative
 * integrations (coordinate, base10, numberline, fractions, volume,
 * protractor, funcGrapher, physics, chemBalance, punnett, circuit,
 * dataPlot, inequality, molecule, calculus, wave, cell), self-grade
 * mode, AlloBot edit chat, generate similar problems.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.MathView) {
    console.log('[CDN] ViewMathModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewMathModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var EyeOff = _lazyIcon('EyeOff');
  var Eye = _lazyIcon('Eye');
  var Copy = _lazyIcon('Copy');
  var ImageIcon = _lazyIcon('ImageIcon');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Globe = _lazyIcon('Globe');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Sparkles = _lazyIcon('Sparkles');
  var ChevronDown = _lazyIcon('ChevronDown');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathView = MathView;
  window.AlloModules.ViewMathModule = true;
})();
`;

fs.writeFileSync('view_math_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_math_module.js', moduleSrc);
console.log('Wrote view_math_module.js (' + moduleSrc.length + ' bytes)');
