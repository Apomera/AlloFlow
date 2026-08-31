#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = __dirname;
const CONFIGS = {
  LiveSessionDockView: {
    source: 'view_live_session_dock_source.jsx',
    output: 'view_live_session_dock_module.js',
    exports: ['LiveSessionDockView'],
  },
  FullPackRunView: {
    source: 'view_full_pack_run_source.jsx',
    output: 'view_full_pack_run_module.js',
    exports: ['FullPackRunView'],
  },
  ShareSessionSurfaces: {
    source: 'view_share_session_surfaces_source.jsx',
    output: 'view_share_session_surfaces_module.js',
    exports: ['HomeworkQrDialogView', 'ClassMailboxSetupView'],
  },
  VideoStudioHostBridgeView: {
    source: 'video_studio_host_bridge_source.jsx',
    output: 'video_studio_host_bridge_module.js',
    exports: ['VideoStudioHostBridgeView'],
  },
};

function buildFirstWaveModule(key, sourceOverride) {
  const config = CONFIGS[key];
  if (!config) throw new Error('Unknown first-wave module: ' + key);
  const source = sourceOverride == null
    ? fs.readFileSync(path.join(ROOT, config.source), 'utf8')
    : String(sourceOverride);
  const compiled = babel.transformSync(source, {
    plugins: ['@babel/plugin-transform-react-jsx'],
    configFile: false,
    babelrc: false,
    comments: true,
  }).code;
  const registrations = config.exports
    .map(name => `window.AlloModules.${name} = ${name};`)
    .join('\n');
  return [
    '/** Auto-generated first-wave cold-path CDN module. */',
    '(function() {',
    "'use strict';",
    'var React = window.React;',
    `if (!React) { console.error('[${key}] React not found on window'); return; }`,
    'window.AlloModules = window.AlloModules || {};',
    `if (window.AlloModules.${key}) return;`,
    compiled,
    registrations,
    `window.AlloModules.${key} = window.AlloModules.${config.exports[0]};`,
    `console.log('[CDN] ${key} loaded');`,
    '})();',
    '',
  ].join('\n');
}

function writeOne(key) {
  const config = CONFIGS[key];
  const output = buildFirstWaveModule(key);
  const rootOutput = path.join(ROOT, config.output);
  const publicOutput = path.join(ROOT, 'desktop', 'web-app', 'public', config.output);
  fs.writeFileSync(rootOutput, output, 'utf8');
  fs.writeFileSync(publicOutput, output, 'utf8');
  console.log(`Built ${config.output} (${Buffer.byteLength(output)} bytes)`);
}

if (require.main === module) {
  const requested = process.argv.slice(2);
  const keys = requested.length ? requested : Object.keys(CONFIGS);
  keys.forEach(writeOne);
}

module.exports = { CONFIGS, buildFirstWaveModule };
