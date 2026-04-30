// Build view_image_module.js — extracted from
// AlloFlowANTI.txt activeView==='image' block (post-Brainstorm, 153 lines).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_image.txt', 'utf-8');

const wrapped = `
function ImageView(props) {
  var t = props.t;
  var leveledTextLanguage = props.leveledTextLanguage;
  var fillInTheBlank = props.fillInTheBlank;
  var generatedContent = props.generatedContent;
  var singleImageOverride = props.singleImageOverride;
  var isTeacherMode = props.isTeacherMode;
  var imageRefinementInput = props.imageRefinementInput;
  var isProcessing = props.isProcessing;
  var singleImageFileRef = props.singleImageFileRef;
  var setLabelChallengeResults = props.setLabelChallengeResults;
  var setSingleImageOverride = props.setSingleImageOverride;
  var setHistory = props.setHistory;
  var setGeneratedContent = props.setGeneratedContent;
  var setImageRefinementInput = props.setImageRefinementInput;
  var handleRefinePanel = props.handleRefinePanel;
  var handleUpdateVisualLabel = props.handleUpdateVisualLabel;
  var handleSpeak = props.handleSpeak;
  var handleScoreUpdate = props.handleScoreUpdate;
  var handleRestoreImage = props.handleRestoreImage;
  var handleRefineImage = props.handleRefineImage;
  var handleDownloadImage = props.handleDownloadImage;
  var callGemini = props.callGemini;
  var addToast = props.addToast;
  var VisualPanelGrid = props.VisualPanelGrid;
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
 * AlloFlow View - Image Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='image' block.
 * Source range (post-Brainstorm): 153 lines.
 * Renders the visual panel view: VisualPanelGrid for multi-panel,
 * single image with upload/refine/regenerate, label challenge.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ImageView) {
    console.log('[CDN] ViewImageModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewImageModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ImageIcon = _lazyIcon('ImageIcon');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Send = _lazyIcon('Send');
  var Download = _lazyIcon('Download');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ImageView = ImageView;
  window.AlloModules.ViewImageModule = true;
})();
`;

fs.writeFileSync('view_image_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_image_module.js', moduleSrc);
console.log('Wrote view_image_module.js (' + moduleSrc.length + ' bytes)');
