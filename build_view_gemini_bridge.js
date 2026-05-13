// Build view_gemini_bridge_module.js — extracted from
// AlloFlowANTI.txt activeView==='gemini-bridge' block (43 lines body).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_gemini_bridge.txt', 'utf-8');

const wrapped = `
function GeminiBridgeView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var copyToClipboard = props.copyToClipboard;
  return (
${inner}
  );
}
`;

const result = babel.transformSync(wrapped, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Gemini Bridge Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='gemini-bridge' block.
 * Source range: 43 lines body. Renders Gemini prompt steps as a
 * terminal-style card with copy buttons per step.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.GeminiBridgeView) {
    console.log('[CDN] ViewGeminiBridgeModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewGeminiBridgeModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Terminal = _lazyIcon('Terminal');
  var Copy = _lazyIcon('Copy');

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.GeminiBridgeView = GeminiBridgeView;
  window.AlloModules.ViewGeminiBridgeModule = true;
})();
`;

fs.writeFileSync('view_gemini_bridge_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_gemini_bridge_module.js', moduleSrc);
console.log('Wrote view_gemini_bridge_module.js (' + moduleSrc.length + ' bytes)');
