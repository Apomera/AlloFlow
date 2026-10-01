#!/usr/bin/env node
/**
 * Build view_concept_sort_module.js from view_concept_sort_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_concept_sort.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_concept_sort_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Concept Sort Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='concept-sort' block.
 * Source range: 309 lines body. Renders: pre-activity review (teacher
 * edit categories + items + image-size slider + regenerate/upload/clear
 * image), launch button, and the active ConceptSortGame component.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ConceptSortView) {
    console.log('[CDN] ViewConceptSortModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewConceptSortModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptSortView = ConceptSortView;
  window.AlloModules.ViewConceptSortModule = true;
})();
`;

fs.writeFileSync('view_concept_sort_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_concept_sort_module.js', moduleSrc);
console.log('Wrote view_concept_sort_module.js (' + moduleSrc.length + ' bytes)');
