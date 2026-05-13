// Build view_brainstorm_module.js — extracted from
// AlloFlowANTI.txt activeView==='brainstorm' block (post-SF, 163 lines).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_brainstorm.txt', 'utf-8');

const wrapped = `
function BrainstormView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isEditingBrainstorm = props.isEditingBrainstorm;
  var isGeneratingGuide = props.isGeneratingGuide;
  var isGeneratingWorksheet = props.isGeneratingWorksheet;
  var isGeneratingWorksheetCover = props.isGeneratingWorksheetCover;
  var handleToggleIsEditingBrainstorm = props.handleToggleIsEditingBrainstorm;
  var handleBrainstormChange = props.handleBrainstormChange;
  var handleGenerateGuide = props.handleGenerateGuide;
  var handleGenerateWorksheet = props.handleGenerateWorksheet;
  var handleGenerateWorksheetCover = props.handleGenerateWorksheetCover;
  var getRows = props.getRows;
  var renderFormattedText = props.renderFormattedText;
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
 * AlloFlow View - Brainstorm Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='brainstorm' block.
 * Source range (post-SentenceFrames): 163 lines.
 * Renders the brainstorm view: idea cards with title/description/connection,
 * teacher guides + student worksheets + cover image generation.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.BrainstormView) {
    console.log('[CDN] ViewBrainstormModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewBrainstormModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Lightbulb = _lazyIcon('Lightbulb');
  var ListChecks = _lazyIcon('ListChecks');
  var RefreshCw = _lazyIcon('RefreshCw');
  var FileText = _lazyIcon('FileText');
  var ImageIcon = _lazyIcon('ImageIcon');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.BrainstormView = BrainstormView;
  window.AlloModules.ViewBrainstormModule = true;
})();
`;

fs.writeFileSync('view_brainstorm_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_brainstorm_module.js', moduleSrc);
console.log('Wrote view_brainstorm_module.js (' + moduleSrc.length + ' bytes)');
