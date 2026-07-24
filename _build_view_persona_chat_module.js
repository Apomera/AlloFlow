#!/usr/bin/env node
/**
 * Build view_persona_chat_module.js from view_persona_chat_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_persona_chat_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Persona Chat Renderer
 *
 * Extracted from AlloFlowANTI.txt isPersonaChatOpen + ReactDOM.createPortal block.
 * Source range: 898 lines body. Renders the AI-persona dialog interface
 * (interview/panel modes, character columns, harmony meter, chat history,
 * sentence-level TTS playback, free-response/multiple-choice toggle, hints,
 * topic spark, reflection prompt + grading, save chat).
 *
 * The ReactDOM.createPortal wrap stays in host scope; this module exports
 * just the inner <ErrorBoundary>...</ErrorBoundary> JSX.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.PersonaChatView) {
    console.log('[CDN] ViewPersonaChatModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewPersonaChatModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Eye = _lazyIcon('Eye');
  var EyeOff = _lazyIcon('EyeOff');
  var History = _lazyIcon('History');
  var Lightbulb = _lazyIcon('Lightbulb');
  var ListChecks = _lazyIcon('ListChecks');
  var Lock = _lazyIcon('Lock');
  var MessageSquare = _lazyIcon('MessageSquare');
  var PenTool = _lazyIcon('PenTool');
  var Quote = _lazyIcon('Quote');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Save = _lazyIcon('Save');
  var Search = _lazyIcon('Search');
  var Send = _lazyIcon('Send');
  var Sparkles = _lazyIcon('Sparkles');
  var Star = _lazyIcon('Star');
  var Volume2 = _lazyIcon('Volume2');
  var VolumeX = _lazyIcon('VolumeX');
  var X = _lazyIcon('X');
  var Zap = _lazyIcon('Zap');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PersonaChatView = PersonaChatView;
  window.AlloModules.ViewPersonaChatModule = true;
})();
`;

fs.writeFileSync('view_persona_chat_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_persona_chat_module.js', moduleSrc);
console.log('Wrote view_persona_chat_module.js (' + moduleSrc.length + ' bytes)');
