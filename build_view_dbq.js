// Build view_dbq_module.js from the extracted DBQ JSX block.
// Uses @babel/core with @babel/plugin-transform-react-jsx to convert
// JSX → React.createElement so the module can run as plain JS in the
// browser (CDN-loaded, no build step at runtime).

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const dbqBody = fs.readFileSync('/tmp/dbq_inner.jsx', 'utf-8');

// Wrap the body as a regular function so Babel parses it cleanly.
// Destructure props at the top so all bare refs inside the body
// (generatedContent, studentResponses, callGemini, etc.) resolve via
// the function's local scope. cleanJson is sometimes used as a bare
// helper — pass it as a prop so the host injects whatever's wired.
const wrapped = `
function DbqView(props) {
  var generatedContent = props.generatedContent;
  var studentResponses = props.studentResponses;
  var handleStudentInput = props.handleStudentInput;
  var callGemini = props.callGemini;
  var cleanJson = props.cleanJson;
  var addToast = props.addToast;
  var handleScoreUpdate = props.handleScoreUpdate;
  var gradeLevel = props.gradeLevel;
  var t = props.t;
  var isTeacherMode = props.isTeacherMode;
  var callTTS = props.callTTS;
  ${dbqBody}
}
`;

const result = babel.transformSync(wrapped, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
});

if (!result || !result.code) {
  console.error('Babel transform failed');
  process.exit(1);
}

const transformedFn = result.code;

// Module factory pattern matching escape_room_module.js. Self-contained
// IIFE that registers DbqView on window.AlloModules. The duplicate-load
// guard prevents double-registration if the script tag fires twice.
const moduleSrc = `/**
 * AlloFlow View — DBQ (Document-Based Question) Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='dbq' block.
 * Source range (pre-extraction): lines 37117-37991 (~875 lines).
 * Renders the full DBQ student-facing view: documents, sourcing
 * questions, analysis questions, source reliability check + AI
 * comparison, HAPP analysis, corroboration, synthesis essay,
 * AI grading, print/export. All host-scope deps come in via props
 * so the module is portable across host scopes.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.DbqView) {
    console.log('[CDN] ViewDbqModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewDbqModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.DbqView = DbqView;
  window.AlloModules.ViewDbqModule = true;  // breadcrumb for build.js MODULES detection
})();
`;

fs.writeFileSync('view_dbq_module.js', moduleSrc);
console.log('Wrote view_dbq_module.js (' + moduleSrc.length + ' bytes)');
