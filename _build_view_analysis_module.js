#!/usr/bin/env node
/**
 * Build view_analysis_module.js from view_analysis_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_analysis.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_analysis_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Analysis Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='analysis' block.
 * Source range (post-Image): 429 lines (largest mini-view).
 * Renders: readability complexity card, concept chips, accuracy/verification
 * panel with discrepancies + verified-facts toggle, grammar/spelling panel
 * with auto-fix flow, original source editor with formatting toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AnalysisView) {
    console.log('[CDN] ViewAnalysisModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAnalysisModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AnalysisView = AnalysisView;
  window.AlloModules.ViewAnalysisModule = true;
})();
`;

fs.writeFileSync('view_analysis_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_analysis_module.js', moduleSrc);
console.log('Wrote view_analysis_module.js (' + moduleSrc.length + ' bytes)');
