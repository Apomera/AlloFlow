// Build view_word_sounds_module.js — extracted from
// AlloFlowANTI.txt activeView==='word-sounds' preview-card block (27 lines body).
// Note: only the preview/launcher card is extracted. The main word-sounds
// modal launcher (sibling block guarded by isWordSoundsMode) is already a
// CDN-module invocation in host scope and remains there.
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_word_sounds.txt', 'utf-8');

const wrapped = `
function WordSoundsPreviewView(props) {
  var generatedContent = props.generatedContent;
  var wsActivitySequence = props.wsActivitySequence;
  var setWordSoundsActivity = props.setWordSoundsActivity;
  var setIsWordSoundsMode = props.setIsWordSoundsMode;
  var setWordSoundsAutoReview = props.setWordSoundsAutoReview;
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
 * AlloFlow View - Word Sounds Preview Card
 *
 * Extracted from AlloFlowANTI.txt activeView==='word-sounds' && !isWordSoundsMode block.
 * Source range: 27 lines body. The simplest renderer in the project — a launcher
 * card with two buttons (Pre-Activity Review, Launch Word Sounds Studio).
 * The actual modal lives in word_sounds_module.js (separate CDN module).
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.WordSoundsPreviewView) {
    console.log('[CDN] ViewWordSoundsPreviewModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewWordSoundsPreviewModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var BookOpen = _lazyIcon('BookOpen');
  var Play = _lazyIcon('Play');

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.WordSoundsPreviewView = WordSoundsPreviewView;
  window.AlloModules.ViewWordSoundsPreviewModule = true;
})();
`;

fs.writeFileSync('view_word_sounds_preview_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_word_sounds_preview_module.js', moduleSrc);
console.log('Wrote view_word_sounds_preview_module.js (' + moduleSrc.length + ' bytes)');
