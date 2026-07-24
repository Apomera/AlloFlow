#!/usr/bin/env node
/**
 * Build view_timeline_module.js from view_timeline_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_timeline.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_timeline_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Timeline Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='timeline' block.
 * Source range (pre-extraction): lines 35374-35751 (~378 lines).
 * Renders the timeline editor view: drag/drop reordering, AI verify,
 * auto-fix, image generation per item, revision flow, and the
 * timeline game launcher. ErrorBoundary + TimelineGame components
 * passed in as props.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.TimelineView) {
    console.log('[CDN] ViewTimelineModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewTimelineModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TimelineView = TimelineView;
  window.AlloModules.ViewTimelineModule = true;
})();
`;

fs.writeFileSync('view_timeline_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_timeline_module.js', moduleSrc);
console.log('Wrote view_timeline_module.js (' + moduleSrc.length + ' bytes)');
