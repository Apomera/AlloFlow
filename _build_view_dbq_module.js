#!/usr/bin/env node
/**
 * Build view_dbq_module.js from view_dbq_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_dbq.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_dbq_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View — DBQ (Document-Based Question) Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='dbq' block.
 * Source range (pre-extraction): lines 37117-37991 (~875 lines).
 * Renders the full DBQ student-facing view: documents, sourcing
 * questions, analysis questions, source reliability check + AI
 * comparison, HAPP analysis, corroboration, synthesis essay,
 * AI grading, print/export. All host-scope deps come in via props
 * so the module is portable across host scopes.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.DbqView) {
    console.log('[CDN] ViewDbqModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewDbqModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.DbqView = DbqView;
  window.AlloModules.ViewDbqModule = true;
})();
`;

fs.writeFileSync('view_dbq_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_dbq_module.js', moduleSrc);
console.log('Wrote view_dbq_module.js (' + moduleSrc.length + ' bytes)');
