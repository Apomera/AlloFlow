const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_spotlight.txt', 'utf-8');

const wrapped = `
function SpotlightTourView(props) {
  var t = props.t;
  var debugLog = props.debugLog;
  var tourRect = props.tourRect;
  var spotlightMessage = props.spotlightMessage;
  var spotlightOpenTimeRef = props.spotlightOpenTimeRef;
  var setIsSpotlightMode = props.setIsSpotlightMode;
  return (
${inner}
  );
}
`;

const result = babel.transformSync(wrapped, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Spotlight Tour Overlay
 * Extracted from AlloFlowANTI.txt isSpotlightMode block (111 lines body).
 * Renders the contextual help spotlight: backdrop dismiss, message panel
 * with markdown formatting, glow ring around the highlighted element.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SpotlightTourView) {
    console.log('[CDN] ViewSpotlightTourModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSpotlightTourModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Sparkles = _lazyIcon('Sparkles');
  var X = _lazyIcon('X');

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SpotlightTourView = SpotlightTourView;
  window.AlloModules.ViewSpotlightTourModule = true;
})();
`;
fs.writeFileSync('view_spotlight_tour_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_spotlight_tour_module.js', moduleSrc);
console.log('Wrote view_spotlight_tour_module.js (' + moduleSrc.length + ' bytes)');
