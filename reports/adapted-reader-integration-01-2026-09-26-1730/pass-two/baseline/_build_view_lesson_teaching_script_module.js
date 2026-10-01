#!/usr/bin/env node
/** Build the teacher-only lesson teaching-script view and its public mirror. */
const babel = require('@babel/core');
const fs = require('fs');
const source = fs.readFileSync('view_lesson_teaching_script_source.jsx', 'utf8');
const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } }
});
if (!result || !result.code) throw new Error('Teaching-script JSX transform failed');
const output = [
  '/** Teacher-only teaching script attached to an existing lesson plan. */',
  '(function () {',
  "  'use strict';",
  '  if (window.AlloModules && window.AlloModules.LessonTeachingScriptView) return;',
  '  var React = window.React;',
  "  if (!React) throw new Error('[LessonTeachingScriptView] React is required');",
  result.code,
  '  window.AlloModules = window.AlloModules || {};',
  '  window.AlloModules.LessonTeachingScriptView = LessonTeachingScriptView;',
  '  window.AlloModules.ViewLessonTeachingScriptModule = true;',
  '})();', ''
].join('\n');
for (const file of ['view_lesson_teaching_script_module.js', 'desktop/web-app/public/view_lesson_teaching_script_module.js']) {
  const temporary = file + '.teaching-script-build-next';
  fs.writeFileSync(temporary, output);
  fs.renameSync(temporary, file);
}
console.log('Built view_lesson_teaching_script_module.js (' + output.length + ' bytes)');
