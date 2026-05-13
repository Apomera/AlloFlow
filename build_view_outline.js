// Build view_outline_module.js — extracted from AlloFlowANTI.txt activeView==='outline'
// block (lines 31127-31238, ~112 lines). Mirrors build_view_glossary.js pattern.

const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_outline.txt', 'utf-8');

// Comprehensive prop destructuring. Verified against view-internal phantom audit.
const wrapped = `
function OutlineView(props) {
  // Pure data + state reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var history = props.history;
  var inputText = props.inputText;
  var leveledTextLanguage = props.leveledTextLanguage;
  var standardsInput = props.standardsInput;
  var isTeacherMode = props.isTeacherMode;
  var gradeLevel = props.gradeLevel;
  var handleGenerate = props.handleGenerate;
  // Outline-specific state
  var isEditingOutline = props.isEditingOutline;
  var outlineType = props.outlineType;
  var structureType = props.structureType;
  var draggedNodeId = props.draggedNodeId;
  var conceptMapNodes = props.conceptMapNodes;
  var conceptMapEdges = props.conceptMapEdges;
  var isMapLocked = props.isMapLocked;
  var isInteractiveMap = props.isInteractiveMap;
  var isInteractiveVenn = props.isInteractiveVenn;
  var isVennPlaying = props.isVennPlaying;
  var connectingSourceId = props.connectingSourceId;
  var isConceptMapReady = props.isConceptMapReady;
  var isChallengeActive = props.isChallengeActive;
  var mapAddInput = props.mapAddInput;
  var branches = props.branches;
  var isProcessing = props.isProcessing;
  // Setters
  var setIsEditingOutline = props.setIsEditingOutline;
  var setOutlineType = props.setOutlineType;
  var setIsMapLocked = props.setIsMapLocked;
  var setIsInteractiveMap = props.setIsInteractiveMap;
  var setMapAddInput = props.setMapAddInput;
  var setConceptMapNodes = props.setConceptMapNodes;
  var setConceptMapEdges = props.setConceptMapEdges;
  var setIsInteractiveVenn = props.setIsInteractiveVenn;
  var setIsVennPlaying = props.setIsVennPlaying;
  var setConnectingSourceId = props.setConnectingSourceId;
  // Handlers
  var handleOutlineChange = props.handleOutlineChange;
  var handleToggleIsEditingOutline = props.handleToggleIsEditingOutline;
  var handleSetIsEditingOutlineToFalse = props.handleSetIsEditingOutlineToFalse;
  var handleAddOutlineSection = props.handleAddOutlineSection;
  var handleDeleteOutlineSection = props.handleDeleteOutlineSection;
  var handleAddSubPoint = props.handleAddSubPoint;
  var handleDeleteSubPoint = props.handleDeleteSubPoint;
  var handleSubPointChange = props.handleSubPointChange;
  var handleSectionTitleChange = props.handleSectionTitleChange;
  var handleAddToMapList = props.handleAddToMapList;
  var handleRemoveFromMapList = props.handleRemoveFromMapList;
  var handleInitializeMap = props.handleInitializeMap;
  var handleInitializeVenn = props.handleInitializeVenn;
  var handleNodeChange = props.handleNodeChange;
  var handleNodeDelete = props.handleNodeDelete;
  var handleAddNode = props.handleAddNode;
  var handleEdgeDelete = props.handleEdgeDelete;
  var handleAddEdge = props.handleAddEdge;
  var handleStartConnect = props.handleStartConnect;
  var handleCompleteConnect = props.handleCompleteConnect;
  var handleNodeDragStart = props.handleNodeDragStart;
  var handleNodeDrag = props.handleNodeDrag;
  var handleNodeDragEnd = props.handleNodeDragEnd;
  var handleVennToggle = props.handleVennToggle;
  var handleAddVennItem = props.handleAddVennItem;
  var handleVennDragStart = props.handleVennDragStart;
  var handleVennDrop = props.handleVennDrop;
  var renderInteractiveMap = props.renderInteractiveMap;
  var renderOutlineContent = props.renderOutlineContent;
  // Pure helpers
  var addToast = props.addToast;
  var copyToClipboard = props.copyToClipboard;
  var safeDownloadBlob = props.safeDownloadBlob;
  // Components
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
 * AlloFlow View - Outline Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='outline' block.
 * Source range (pre-extraction): lines 31127-31238 (~112 lines).
 * Renders the visual outline view: structured outlines, concept maps,
 * Venn diagrams, flow charts. Most actual rendering is delegated to
 * renderInteractiveMap() and renderOutlineContent() helpers from host scope.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.OutlineView) {
    console.log('[CDN] ViewOutlineModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewOutlineModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle = _lazyIcon('CheckCircle');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Edit = _lazyIcon('Edit');
  var Layout = _lazyIcon('Layout');
  var Pencil = _lazyIcon('Pencil');
  var Plus = _lazyIcon('Plus');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Save = _lazyIcon('Save');
  var Share2 = _lazyIcon('Share2');
  var Sparkles = _lazyIcon('Sparkles');
  var Trash2 = _lazyIcon('Trash2');
  var X = _lazyIcon('X');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.OutlineView = OutlineView;
  window.AlloModules.ViewOutlineModule = true;
})();
`;

fs.writeFileSync('view_outline_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_outline_module.js', moduleSrc);
console.log('Wrote view_outline_module.js (' + moduleSrc.length + ' bytes)');
