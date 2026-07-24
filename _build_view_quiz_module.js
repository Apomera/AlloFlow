#!/usr/bin/env node
/**
 * Build view_quiz_module.js from view_quiz_source.jsx
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy build_view_quiz.js (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('view_quiz_source.jsx', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Quiz Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='quiz' block.
 * Source range (post-Phase 1 lift of inline Firestore handlers): ~629 lines.
 * Renders: live-session controls (start/toggle/end via lifted host handlers),
 * presentation mode (slide-by-slide quiz), review game (Jeopardy-style board),
 * escape room (delegated to AlloModules.EscapeRoomGameplay), edit/student
 * quiz card view, fact-check panel, reflections.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.QuizView) {
    console.log('[CDN] ViewQuizModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewQuizModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizView = QuizView;
  window.AlloModules.ViewQuizModule = true;
})();
`;

fs.writeFileSync('view_quiz_module.js', moduleSrc);
fs.writeFileSync('desktop/web-app/public/view_quiz_module.js', moduleSrc);
console.log('Wrote view_quiz_module.js (' + moduleSrc.length + ' bytes)');
