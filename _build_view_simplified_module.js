#!/usr/bin/env node
/**
 * Build view_simplified_module.js from view_simplified_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_simplified.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_simplified_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Simplified (Leveled Text) Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='simplified' block.
 * Source range: 1,650 lines body (largest single extraction in the project).
 * Renders: leveled text reader with immersive mode, focus/chunk/crawl/karaoke
 * overlays, side-by-side bilingual layout, define/phonics/revise/cloze/
 * add-glossary interaction modes, level check + rigor report panels,
 * complexity slider, teacher edit mode with formatting toolbar, definition/
 * phonics/revision popups, line focus, theme switcher, immersive toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SimplifiedView) {
    console.log('[CDN] ViewSimplifiedModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSimplifiedModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SimplifiedView = SimplifiedView;
  window.AlloModules.ViewSimplifiedModule = true;
})();
`;

fs.writeFileSync('view_simplified_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_simplified_module.js', moduleSrc);
console.log('Wrote view_simplified_module.js (' + moduleSrc.length + ' bytes)');
