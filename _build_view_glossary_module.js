#!/usr/bin/env node
/**
 * Build view_glossary_module.js from view_glossary_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_glossary.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_glossary_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Glossary Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='glossary' block.
 * Source range (pre-extraction): lines 29412-31037 (~1626 lines).
 * Renders the glossary view: term cards, multi-language toggles,
 * flashcard launchers, mini-games (memory/crossword/bingo/scramble/
 * syntax), audio downloads, export buttons, health checks, etymology
 * panels, and edit-mode controls. ErrorBoundary + game components
 * passed in as props.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.GlossaryView) {
    console.log('[CDN] ViewGlossaryModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewGlossaryModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.GlossaryView = GlossaryView;
  window.AlloModules.ViewGlossaryModule = true;
})();
`;

fs.writeFileSync('view_glossary_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_glossary_module.js', moduleSrc);
console.log('Wrote view_glossary_module.js (' + moduleSrc.length + ' bytes)');
