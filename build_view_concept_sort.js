// Build view_concept_sort_module.js — extracted from
// AlloFlowANTI.txt activeView==='concept-sort' block (309 lines body).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_concept_sort.txt', 'utf-8');

const wrapped = `
function ConceptSortView(props) {
  var t = props.t;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var generatedContent = props.generatedContent;
  var conceptSortImageScale = props.conceptSortImageScale;
  var csEdit = props.csEdit;
  var csAddingCatId = props.csAddingCatId;
  var csAddingText = props.csAddingText;
  var csBusyId = props.csBusyId;
  var isConceptSortGame = props.isConceptSortGame;
  var setConceptSortImageScale = props.setConceptSortImageScale;
  var setCsEdit = props.setCsEdit;
  var setCsAddingCatId = props.setCsAddingCatId;
  var setCsAddingText = props.setCsAddingText;
  var handleSetIsConceptSortGameToTrue = props.handleSetIsConceptSortGameToTrue;
  var csUpdateCategoryLabel = props.csUpdateCategoryLabel;
  var csUpdateItemText = props.csUpdateItemText;
  var csMoveItem = props.csMoveItem;
  var csRegenerateItem = props.csRegenerateItem;
  var csRegenerateItemImage = props.csRegenerateItemImage;
  var csUploadItemImage = props.csUploadItemImage;
  var csClearItemImage = props.csClearItemImage;
  var csDeleteItem = props.csDeleteItem;
  var csAddItem = props.csAddItem;
  var closeConceptSort = props.closeConceptSort;
  var handleGenerateConceptItem = props.handleGenerateConceptItem;
  var handleGameScoreUpdate = props.handleGameScoreUpdate;
  var handleGameCompletion = props.handleGameCompletion;
  var handleExplainConceptSortItem = props.handleExplainConceptSortItem;
  var playSound = props.playSound;
  var ErrorBoundary = props.ErrorBoundary;
  var ConceptSortGame = props.ConceptSortGame;
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

const moduleSrc = `/**
 * AlloFlow View - Concept Sort Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='concept-sort' block.
 * Source range: 309 lines body. Renders: pre-activity review (teacher
 * edit categories + items + image-size slider + regenerate/upload/clear
 * image), launch button, and the active ConceptSortGame component.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ConceptSortView) {
    console.log('[CDN] ViewConceptSortModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewConceptSortModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Filter = _lazyIcon('Filter');
  var Gamepad2 = _lazyIcon('Gamepad2');

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptSortView = ConceptSortView;
  window.AlloModules.ViewConceptSortModule = true;
})();
`;

fs.writeFileSync('view_concept_sort_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_concept_sort_module.js', moduleSrc);
console.log('Wrote view_concept_sort_module.js (' + moduleSrc.length + ' bytes)');
