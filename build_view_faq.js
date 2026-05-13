// Build view_faq_module.js — extracted from AlloFlowANTI.txt activeView==='faq'
// block (post-OutlineView lines 31815-31963, 149 lines). Mirrors
// build_view_outline.js / build_view_glossary.js pattern.

const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_faq.txt', 'utf-8');

const wrapped = `
function FaqView(props) {
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isPlaying = props.isPlaying;
  var playingContentId = props.playingContentId;
  var voiceSpeed = props.voiceSpeed;
  var isTeacherMode = props.isTeacherMode;
  var isEditingFaq = props.isEditingFaq;
  var leveledTextLanguage = props.leveledTextLanguage;
  var playbackState = props.playbackState;
  // Refs
  var audioRef = props.audioRef;
  var playbackSessionRef = props.playbackSessionRef;
  // Setters
  var setVoiceSpeed = props.setVoiceSpeed;
  var setIsPlaying = props.setIsPlaying;
  var setPlayingContentId = props.setPlayingContentId;
  // Handlers
  var handleToggleIsEditingFaq = props.handleToggleIsEditingFaq;
  var handleFaqChange = props.handleFaqChange;
  var handleSpeak = props.handleSpeak;
  // Pure helpers
  var getRows = props.getRows;
  var splitTextToSentences = props.splitTextToSentences;
  var formatInteractiveText = props.formatInteractiveText;
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
const transformedFn = result.code;

const moduleSrc = `/**
 * AlloFlow View - FAQ Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='faq' block.
 * Source range (post-OutlineView): lines 31815-31963 (149 lines).
 * Renders the FAQ view: question/answer cards with edit mode,
 * sentence-level TTS playback highlighting, translation lines.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.FaqView) {
    console.log('[CDN] ViewFaqModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewFaqModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FaqView = FaqView;
  window.AlloModules.ViewFaqModule = true;
})();
`;

fs.writeFileSync('view_faq_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_faq_module.js', moduleSrc);
console.log('Wrote view_faq_module.js (' + moduleSrc.length + ' bytes)');
