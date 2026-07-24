#!/usr/bin/env node
/**
 * Build view_sentence_frames_module.js from view_sentence_frames_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_sentence_frames_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Sentence Frames Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='sentence-frames' block.
 * Source range (post-FaqView): 291 lines.
 * Renders the Sentence Frames / Scaffolds view: list/paragraph modes,
 * grading rubric, AI auto-grader, draft feedback flow.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SentenceFramesView) {
    console.log('[CDN] ViewSentenceFramesModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSentenceFramesModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var RefreshCw = _lazyIcon('RefreshCw');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Sparkles = _lazyIcon('Sparkles');
  var Pencil = _lazyIcon('Pencil');
  var ClipboardList = _lazyIcon('ClipboardList');
  var Maximize = _lazyIcon('Maximize');
  var Minimize = _lazyIcon('Minimize');
  var Copy = _lazyIcon('Copy');
  var ArrowUpRight = _lazyIcon('ArrowUpRight');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SentenceFramesView = SentenceFramesView;
  window.AlloModules.ViewSentenceFramesModule = true;
})();
`;

fs.writeFileSync('view_sentence_frames_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_sentence_frames_module.js', moduleSrc);
console.log('Wrote view_sentence_frames_module.js (' + moduleSrc.length + ' bytes)');
