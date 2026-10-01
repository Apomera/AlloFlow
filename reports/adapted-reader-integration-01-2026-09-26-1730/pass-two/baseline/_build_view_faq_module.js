#!/usr/bin/env node
/**
 * Build view_faq_module.js from view_faq_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_faq.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_faq_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - FAQ Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='faq' block.
 * Source range (post-OutlineView): lines 31815-31963 (149 lines).
 * Renders the FAQ view: question/answer cards with edit mode,
 * sentence-level TTS playback highlighting, translation lines.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.FaqView) {
    console.log('[CDN] ViewFaqModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewFaqModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FaqView = FaqView;
  window.AlloModules.ViewFaqModule = true;
})();
`;

fs.writeFileSync('view_faq_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_faq_module.js', moduleSrc);
console.log('Wrote view_faq_module.js (' + moduleSrc.length + ' bytes)');
