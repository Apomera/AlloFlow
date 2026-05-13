// Build view_analysis_module.js — extracted from
// AlloFlowANTI.txt activeView==='analysis' block (post-Image, 429 lines).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_analysis.txt', 'utf-8');

const wrapped = `
function AnalysisView(props) {
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var selectedDiscrepancies = props.selectedDiscrepancies;
  var selectedGrammarErrors = props.selectedGrammarErrors;
  var isTeacherMode = props.isTeacherMode;
  var isProcessing = props.isProcessing;
  var isEditingAnalysis = props.isEditingAnalysis;
  var sourceRefineInstruction = props.sourceRefineInstruction;
  // Refs
  var analysisEditorRef = props.analysisEditorRef;
  // Setters
  var setIsProcessing = props.setIsProcessing;
  var setGenerationStep = props.setGenerationStep;
  var setGeneratedContent = props.setGeneratedContent;
  var setInputText = props.setInputText;
  var setSelectedGrammarErrors = props.setSelectedGrammarErrors;
  var setSourceRefineInstruction = props.setSourceRefineInstruction;
  // Handlers
  var toggleDiscrepancySelection = props.toggleDiscrepancySelection;
  var handleAutoCorrectSource = props.handleAutoCorrectSource;
  var toggleGrammarErrorSelection = props.toggleGrammarErrorSelection;
  var handleToggleIsEditingAnalysis = props.handleToggleIsEditingAnalysis;
  var handleAiRefineSource = props.handleAiRefineSource;
  var handleFormatText = props.handleFormatText;
  var handleAnalysisTextChange = props.handleAnalysisTextChange;
  // API
  var callGemini = props.callGemini;
  // Pure helpers
  var formatInlineText = props.formatInlineText;
  var renderFormattedText = props.renderFormattedText;
  var splitReferencesFromBody = props.splitReferencesFromBody;
  var addToast = props.addToast;
  var warnLog = props.warnLog;
  // Components
  var BilingualFieldRenderer = props.BilingualFieldRenderer;
  var SourceReferencesPanel = props.SourceReferencesPanel;
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
 * AlloFlow View - Analysis Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='analysis' block.
 * Source range (post-Image): 429 lines (largest mini-view).
 * Renders: readability complexity card, concept chips, accuracy/verification
 * panel with discrepancies + verified-facts toggle, grammar/spelling panel
 * with auto-fix flow, original source editor with formatting toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AnalysisView) {
    console.log('[CDN] ViewAnalysisModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAnalysisModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Search = _lazyIcon('Search');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var AlertCircle = _lazyIcon('AlertCircle');
  var Wrench = _lazyIcon('Wrench');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Wand2 = _lazyIcon('Wand2');
  var Pencil = _lazyIcon('Pencil');
  var Sparkles = _lazyIcon('Sparkles');
  var Send = _lazyIcon('Send');
  var Bold = _lazyIcon('Bold');
  var Italic = _lazyIcon('Italic');
  var Highlighter = _lazyIcon('Highlighter');
  var List = _lazyIcon('List');
  var FileText = _lazyIcon('FileText');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AnalysisView = AnalysisView;
  window.AlloModules.ViewAnalysisModule = true;
})();
`;

fs.writeFileSync('view_analysis_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_analysis_module.js', moduleSrc);
console.log('Wrote view_analysis_module.js (' + moduleSrc.length + ' bytes)');
