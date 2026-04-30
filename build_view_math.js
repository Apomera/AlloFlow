// Build view_math_module.js — extracted from
// AlloFlowANTI.txt activeView==='math' block (565 lines body).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_math.txt', 'utf-8');

const wrapped = `
function MathView(props) {
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var isProcessing = props.isProcessing;
  var showMathAnswers = props.showMathAnswers;
  var mathSelfGradeMode = props.mathSelfGradeMode;
  var mathEditInput = props.mathEditInput;
  var isMathEditingChat = props.isMathEditingChat;
  var mathHintData = props.mathHintData;
  var mathCheckResults = props.mathCheckResults;
  var mathSubject = props.mathSubject;
  var studentResponses = props.studentResponses;
  var gridPoints = props.gridPoints;
  var base10Value = props.base10Value;
  var numberLineMarkers = props.numberLineMarkers;
  var fractionPieces = props.fractionPieces;
  var cubeDims = props.cubeDims;
  var angleValue = props.angleValue;
  var labToolData = props.labToolData;
  var cubeBuilderMode = props.cubeBuilderMode;
  var cubePositions = props.cubePositions;
  // Setters
  var setStemLabTool = props.setStemLabTool;
  var setStemLabTab = props.setStemLabTab;
  var setShowStemLab = props.setShowStemLab;
  var setGridPoints = props.setGridPoints;
  var setBase10Value = props.setBase10Value;
  var setNumberLineRange = props.setNumberLineRange;
  var setFractionPieces = props.setFractionPieces;
  var setCubeDims = props.setCubeDims;
  var setAngleValue = props.setAngleValue;
  var setMathEditInput = props.setMathEditInput;
  var setCubeBuilderMode = props.setCubeBuilderMode;
  var setCubePositions = props.setCubePositions;
  var setCubeBuilderChallenge = props.setCubeBuilderChallenge;
  var setCubeBuilderFeedback = props.setCubeBuilderFeedback;
  // Handlers
  var handleToggleShowMathAnswers = props.handleToggleShowMathAnswers;
  var handleSetShowMathAnswersToTrue = props.handleSetShowMathAnswersToTrue;
  var handleToggleMathSelfGrade = props.handleToggleMathSelfGrade;
  var submitMathSelfGrade = props.submitMathSelfGrade;
  var handleStudentInput = props.handleStudentInput;
  var handleMathProblemEdit = props.handleMathProblemEdit;
  var handleCheckMathWork = props.handleCheckMathWork;
  var handleResetMathCheck = props.handleResetMathCheck;
  var handleGetMathHint = props.handleGetMathHint;
  var handleGenerateSimilar = props.handleGenerateSimilar;
  var handleMathEdit = props.handleMathEdit;
  var isMathEditing = props.isMathEditing;
  var toggleMathEdit = props.toggleMathEdit;
  // Pure helpers
  var formatMathQuestion = props.formatMathQuestion;
  var formatInlineText = props.formatInlineText;
  var sanitizeHtml = props.sanitizeHtml;
  var copyToClipboard = props.copyToClipboard;
  var addToast = props.addToast;
  // Components
  var MathSymbol = props.MathSymbol;
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
 * AlloFlow View - Math Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='math' block.
 * Source range: 565 lines body.
 * Renders: math problem cards with title + step-by-step solutions, student
 * work textarea with AI Check My Work + hint system, manipulative
 * integrations (coordinate, base10, numberline, fractions, volume,
 * protractor, funcGrapher, physics, chemBalance, punnett, circuit,
 * dataPlot, inequality, molecule, calculus, wave, cell), self-grade
 * mode, AlloBot edit chat, generate similar problems.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.MathView) {
    console.log('[CDN] ViewMathModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewMathModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var EyeOff = _lazyIcon('EyeOff');
  var Eye = _lazyIcon('Eye');
  var Copy = _lazyIcon('Copy');
  var ImageIcon = _lazyIcon('ImageIcon');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Globe = _lazyIcon('Globe');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Sparkles = _lazyIcon('Sparkles');
  var ChevronDown = _lazyIcon('ChevronDown');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathView = MathView;
  window.AlloModules.ViewMathModule = true;
})();
`;

fs.writeFileSync('view_math_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_math_module.js', moduleSrc);
console.log('Wrote view_math_module.js (' + moduleSrc.length + ' bytes)');
