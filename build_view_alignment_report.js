// Build view_alignment_report_module.js — extracted from
// AlloFlowANTI.txt activeView==='alignment-report' block (116 lines body).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_alignment.txt', 'utf-8');

const wrapped = `
function AlignmentReportView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
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
 * AlloFlow View - Alignment Report Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='alignment-report' block.
 * Source range: 116 lines body.
 * Renders: standards alignment audit report cards with text/activity/
 * assessment alignment status, evidence quotes, audit notes, gaps list,
 * admin recommendation. Display-only (no edit handlers).
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlignmentReportView) {
    console.log('[CDN] ViewAlignmentReportModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAlignmentReportModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ShieldCheck = _lazyIcon('ShieldCheck');
  var BookOpen = _lazyIcon('BookOpen');
  var Quote = _lazyIcon('Quote');
  var Layout = _lazyIcon('Layout');
  var CheckSquare = _lazyIcon('CheckSquare');
  var ClipboardList = _lazyIcon('ClipboardList');
  var AlertCircle = _lazyIcon('AlertCircle');
  var Sparkles = _lazyIcon('Sparkles');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlignmentReportView = AlignmentReportView;
  window.AlloModules.ViewAlignmentReportModule = true;
})();
`;

fs.writeFileSync('view_alignment_report_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_alignment_report_module.js', moduleSrc);
console.log('Wrote view_alignment_report_module.js (' + moduleSrc.length + ' bytes)');
