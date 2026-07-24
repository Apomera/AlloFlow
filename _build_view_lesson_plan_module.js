#!/usr/bin/env node
/**
 * Build view_lesson_plan_module.js from view_lesson_plan_source.jsx
 * Auto-migrated to source-wrapped format.
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_lesson_plan_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

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

  ` + result.code + `

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LessonPlanView = LessonPlanView;
  window.AlloModules.ViewLessonPlanModule = true;
})();
`;

fs.writeFileSync('view_lesson_plan_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_lesson_plan_module.js', moduleSrc);
console.log('Wrote view_lesson_plan_module.js (' + moduleSrc.length + ' bytes)');
