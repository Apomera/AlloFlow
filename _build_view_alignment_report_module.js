#!/usr/bin/env node
/**
 * Build view_alignment_report_module.js from view_alignment_report_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_alignment_report.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_alignment_report_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Alignment Report Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='alignment-report' block.
 * Source range: 116 lines body.
 * Renders: standards alignment audit report cards with text/activity/
 * assessment alignment status, evidence quotes, audit notes, gaps list,
 * admin recommendation. Display-only (no edit handlers).
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlignmentReportView) {
    console.log('[CDN] ViewAlignmentReportModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAlignmentReportModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlignmentReportView = AlignmentReportView;
  window.AlloModules.ViewAlignmentReportModule = true;
})();
`;

fs.writeFileSync('view_alignment_report_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_alignment_report_module.js', moduleSrc);
console.log('Wrote view_alignment_report_module.js (' + moduleSrc.length + ' bytes)');
