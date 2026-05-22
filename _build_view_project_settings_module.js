#!/usr/bin/env node
/**
 * Build view_project_settings_module.js from view_project_settings_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_project_settings_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Project Settings Modal
 * Extracted from AlloFlowANTI.txt isProjectSettingsOpen block (223 lines body).
 * Teacher-side toggles for: dictation, Socratic tutor, free response, persona
 * free response. Plus XP unlock thresholds (adventure, base, storybook).
 * Backdrop click + Escape both dismiss. Display-only outside of toggle setters.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ProjectSettingsView) {
    console.log('[CDN] ViewProjectSettingsModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewProjectSettingsModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var X = _lazyIcon('X');
  var Settings2 = _lazyIcon('Settings2');
  var MapIcon = _lazyIcon('MapIcon');
  var Trophy = _lazyIcon('Trophy');
  var Lock = _lazyIcon('Lock');
  var CircleHelp = _lazyIcon('CircleHelp');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ProjectSettingsView = ProjectSettingsView;
  window.AlloModules.ViewProjectSettingsModule = true;
})();
`;

fs.writeFileSync('view_project_settings_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_project_settings_module.js', moduleSrc);
console.log('Wrote view_project_settings_module.js (' + moduleSrc.length + ' bytes)');
