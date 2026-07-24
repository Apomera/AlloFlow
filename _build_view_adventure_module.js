#!/usr/bin/env node
/**
 * Build view_adventure_module.js from view_adventure_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_adventure_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Adventure Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='adventure' block.
 * Source range: 1,304 lines body — second-largest extraction in the
 * project's history (after Simplified at 1,650).
 *
 * Renders: full Adventure game UI — setup form (difficulty/language/art
 * style/free-response/chance/story-mode/character-consistency/system-mode
 * /custom-instructions/climax-config), main scene rendering with image,
 * choice buttons, dictation mode, text input, ledger, inventory modal,
 * shop modal, storybook export modal, immersive mode (Ken Burns animation,
 * hide-UI / show-choices toggles, full-screen scene viewer), session
 * democracy/multi-player vote display, climax progress bar, animated XP.
 *
 * Pre-extraction prep: 4 inline setAdventureState callbacks lifted to
 * named host handlers (handleToggleAdventureImmersive,
 * handleExitAdventureImmersive, handleSetEnableAutoClimax,
 * handleSetClimaxMinTurns) to ensure climax-config form doesn't break.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AdventureView) {
    console.log('[CDN] ViewAdventureModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAdventureModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ArrowDown = _lazyIcon('ArrowDown');
  var Backpack = _lazyIcon('Backpack');
  var BookOpen = _lazyIcon('BookOpen');
  var Download = _lazyIcon('Download');
  var Eye = _lazyIcon('Eye');
  var EyeOff = _lazyIcon('EyeOff');
  var Flag = _lazyIcon('Flag');
  var History = _lazyIcon('History');
  var ImageIcon = _lazyIcon('ImageIcon');
  var Lock = _lazyIcon('Lock');
  var MapIcon = _lazyIcon('MapIcon');
  var Maximize = _lazyIcon('Maximize');
  var Mic = _lazyIcon('Mic');
  var MicOff = _lazyIcon('MicOff');
  var Minimize = _lazyIcon('Minimize');
  var Monitor = _lazyIcon('Monitor');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var Pencil = _lazyIcon('Pencil');
  var Plus = _lazyIcon('Plus');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Scale = _lazyIcon('Scale');
  var Send = _lazyIcon('Send');
  var Sparkles = _lazyIcon('Sparkles');
  var Trophy = _lazyIcon('Trophy');
  var User = _lazyIcon('User');
  var Users = _lazyIcon('Users');
  var Volume2 = _lazyIcon('Volume2');
  var VolumeX = _lazyIcon('VolumeX');
  var Wifi = _lazyIcon('Wifi');
  var WifiOff = _lazyIcon('WifiOff');
  var X = _lazyIcon('X');
  var Zap = _lazyIcon('Zap');

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AdventureView = AdventureView;
  window.AlloModules.ViewAdventureModule = true;
})();
`;

fs.writeFileSync('view_adventure_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_adventure_module.js', moduleSrc);
console.log('Wrote view_adventure_module.js (' + moduleSrc.length + ' bytes)');
