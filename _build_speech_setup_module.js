#!/usr/bin/env node
/**
 * Build speech_setup_module.js from speech_setup_source.jsx
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('speech_setup_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow - Speech setup panel.
 * Choose how speech becomes text, download the on-device model, test the microphone.
 * Source: speech_setup_source.jsx. Build: node _build_speech_setup_module.js
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SpeechSetup) {
    console.log('[CDN] SpeechSetup already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[SpeechSetup] React not found'); return; }

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SpeechSetup = {
    SpeechSetupPanel: SpeechSetupPanel,
    _pure: { downloadSummary: downloadSummary, classifyDownloadError: classifyDownloadError, classifyMicError: classifyMicError, summaryKind: summaryKind, fillText: fillText, say: say }
  };
})();
`;

function writeAtomic(path, text) {
  const temp = path + '.tmp-build';
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, path);
}
writeAtomic('speech_setup_module.js', moduleSrc);
writeAtomic('desktop/web-app/public/speech_setup_module.js', moduleSrc);
console.log('Wrote speech_setup_module.js (' + moduleSrc.length + ' bytes)');
