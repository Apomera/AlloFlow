// Build view_lesson_plan_module.js — extracted from
// AlloFlowANTI.txt activeView==='lesson-plan' block (411 lines body).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_lesson_plan.txt', 'utf-8');

const wrapped = `
function LessonPlanView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var sourceTopic = props.sourceTopic;
  var gradeLevel = props.gradeLevel;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var isParentMode = props.isParentMode;
  var isEditingLessonPlan = props.isEditingLessonPlan;
  var history = props.history;
  var isGeneratingExtensionGuide = props.isGeneratingExtensionGuide;
  var progressionData = props.progressionData;
  var isGeneratingProgression = props.isGeneratingProgression;
  var setActiveStation = props.setActiveStation;
  var setStemLabTool = props.setStemLabTool;
  var setShowStemLab = props.setShowStemLab;
  var setStemLabTab = props.setStemLabTab;
  var handleToggleIsEditingLessonPlan = props.handleToggleIsEditingLessonPlan;
  var handleCopyToClipboard = props.handleCopyToClipboard;
  var handleExportPDF = props.handleExportPDF;
  var handleLessonPlanChange = props.handleLessonPlanChange;
  var handleGenerateExtensionGuide = props.handleGenerateExtensionGuide;
  var handleExport = props.handleExport;
  var handleGenerateProgression = props.handleGenerateProgression;
  var handleSetProgressionDataToNull = props.handleSetProgressionDataToNull;
  var handleActivateNextLesson = props.handleActivateNextLesson;
  var getRows = props.getRows;
  var normalizeMaterialItem = props.normalizeMaterialItem;
  var renderFormattedText = props.renderFormattedText;
  var addToast = props.addToast;
  var BilingualFieldRenderer = props.BilingualFieldRenderer;
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
 * AlloFlow View - Lesson Plan Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='lesson-plan' block.
 * Source range: 411 lines body.
 * Renders: full lesson plan layout (essential question, objectives, hook,
 * direct instruction, guided/independent practice, closure, materials,
 * extensions with teacher guides), STEM Station Recommendations panel,
 * teacher edit mode, copy/PDF/print exports, lesson progression card with
 * Deep Dive / Remediation / Linear next-topic suggestions.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.LessonPlanView) {
    console.log('[CDN] ViewLessonPlanModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewLessonPlanModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Copy = _lazyIcon('Copy');
  var FileDown = _lazyIcon('FileDown');
  var Backpack = _lazyIcon('Backpack');
  var Lightbulb = _lazyIcon('Lightbulb');
  var Flag = _lazyIcon('Flag');
  var Sparkles = _lazyIcon('Sparkles');
  var BookOpen = _lazyIcon('BookOpen');
  var Users = _lazyIcon('Users');
  var PenTool = _lazyIcon('PenTool');
  var ListChecks = _lazyIcon('ListChecks');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Printer = _lazyIcon('Printer');
  var GitMerge = _lazyIcon('GitMerge');
  var X = _lazyIcon('X');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LessonPlanView = LessonPlanView;
  window.AlloModules.ViewLessonPlanModule = true;
})();
`;

fs.writeFileSync('view_lesson_plan_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_lesson_plan_module.js', moduleSrc);
console.log('Wrote view_lesson_plan_module.js (' + moduleSrc.length + ' bytes)');
