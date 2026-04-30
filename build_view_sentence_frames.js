// Build view_sentence_frames_module.js — extracted from
// AlloFlowANTI.txt activeView==='sentence-frames' block (post-FaqView,
// 291 lines). Mirrors build_view_faq.js / build_view_outline.js pattern.

const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_sentence_frames.txt', 'utf-8');

const wrapped = `
function SentenceFramesView(props) {
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var studentWorkStatus = props.studentWorkStatus;
  var isTeacherMode = props.isTeacherMode;
  var isScaffoldComplete = props.isScaffoldComplete;
  var isEditingScaffolds = props.isEditingScaffolds;
  var gradingSession = props.gradingSession;
  var studentResponses = props.studentResponses;
  var isIndependentMode = props.isIndependentMode;
  var isParentMode = props.isParentMode;
  var isGeneratingRubric = props.isGeneratingRubric;
  var rubricZoom = props.rubricZoom;
  var gradingResult = props.gradingResult;
  var studentWorkInput = props.studentWorkInput;
  var isGrading = props.isGrading;
  var leveledTextLanguage = props.leveledTextLanguage;
  // Setters
  var setGradingSession = props.setGradingSession;
  var setStudentWorkInput = props.setStudentWorkInput;
  // Handlers
  var handleResetScaffolds = props.handleResetScaffolds;
  var launchGradingSession = props.launchGradingSession;
  var handleToggleIsEditingScaffolds = props.handleToggleIsEditingScaffolds;
  var submitGradingSession = props.submitGradingSession;
  var handleScaffoldChange = props.handleScaffoldChange;
  var handleStudentInput = props.handleStudentInput;
  var handleScaffoldTextChange = props.handleScaffoldTextChange;
  var handleGenerateRubric = props.handleGenerateRubric;
  var handleToggleRubricZoom = props.handleToggleRubricZoom;
  var handleAutoGrade = props.handleAutoGrade;
  var handleSetGradingResultToNull = props.handleSetGradingResultToNull;
  // Pure helpers
  var getRows = props.getRows;
  var renderFormattedText = props.renderFormattedText;
  var copyToClipboard = props.copyToClipboard;
  // Components
  var DraftFeedbackInterface = props.DraftFeedbackInterface;
  var ErrorBoundary = props.ErrorBoundary;
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

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SentenceFramesView = SentenceFramesView;
  window.AlloModules.ViewSentenceFramesModule = true;
})();
`;

fs.writeFileSync('view_sentence_frames_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_sentence_frames_module.js', moduleSrc);
console.log('Wrote view_sentence_frames_module.js (' + moduleSrc.length + ' bytes)');
