/**
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
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6 flex justify-between items-start gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-orange-800"
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Providing options for perception. This graphic organizer helps students who process information visually or struggle with large blocks of text.", /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block bg-white/50 border border-orange-200 px-2 py-0.5 rounded text-xs font-bold"
  }, "Level: ", gradeLevel), leveledTextLanguage !== 'English' && /*#__PURE__*/React.createElement("span", {
    className: "inline-block bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-xs font-bold"
  }, leveledTextLanguage), standardsInput && /*#__PURE__*/React.createElement("span", {
    className: "inline-block bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(CheckCircle, {
    size: 10
  }), " ", standardsInput))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, isTeacherMode && (generatedContent?.data?.structureType !== 'Venn Diagram' || isInteractiveVenn || isVennPlaying) && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (generatedContent?.data?.structureType === 'Venn Diagram') {
        if (isInteractiveVenn || isVennPlaying) {
          setIsInteractiveVenn(false);
          setIsVennPlaying(false);
        } else {
          handleInitializeVenn();
        }
      } else {
        setIsInteractiveMap(!isInteractiveMap);
      }
    },
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isInteractiveMap || isInteractiveVenn || isVennPlaying ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50 animate-[pulse_3s_ease-in-out_infinite]'}`,
    title: isInteractiveMap || isInteractiveVenn || isVennPlaying ? t('outline.tooltip_static') : t('outline.tooltip_interactive')
  }, isInteractiveMap || isInteractiveVenn || isVennPlaying ? /*#__PURE__*/React.createElement(Layout, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Share2, {
    size: 14
  }), isInteractiveMap || isInteractiveVenn || isVennPlaying ? t('outline.view_static') : t('outline.view_interactive')), isTeacherMode && !isInteractiveMap && !isInteractiveVenn && !isVennPlaying && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_outline'),
    onClick: handleToggleIsEditingOutline,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingOutline ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'}`
  }, isEditingOutline ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingOutline ? t('common.done') : t('outline.edit_text')), !isInteractiveMap && !isInteractiveVenn && !isVennPlaying && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleGenerate('outline'),
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: `flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!isTeacherMode ? 'hidden' : ''}`
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: isProcessing ? "animate-spin" : ""
  }), " ", t('common.regenerate')))), isInteractiveMap ? !isConceptMapReady && !isChallengeActive ? /*#__PURE__*/React.createElement("div", {
    className: "max-w-3xl mx-auto bg-white p-10 rounded-2xl border-2 border-indigo-100 shadow-lg text-center flex flex-col items-center justify-center min-h-[400px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-4 rounded-full mb-4"
  }, /*#__PURE__*/React.createElement(Layout, {
    size: 48,
    className: "text-indigo-600"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-black text-indigo-900 mb-6"
  }, generatedContent?.data.main), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-3 mb-8 w-full"
  }, generatedContent?.data.branches && generatedContent?.data.branches.map((branch, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-white border-2 border-indigo-100 px-4 py-2 rounded-xl shadow-sm font-bold text-indigo-700 animate-in zoom-in duration-300 flex items-center gap-2 group",
    style: {
      animationDelay: `${idx * 50}ms`
    }
  }, branch.title, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    onClick: () => handleRemoveFromMapList(idx),
    className: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-indigo-600 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5",
    title: t('common.remove_concept')
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 animate-in zoom-in duration-300 delay-100"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_map_add_input'),
    type: "text",
    value: mapAddInput,
    onChange: e => setMapAddInput(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handleAddToMapList(mapAddInput),
    placeholder: t('concept_map.setup.add_concept_placeholder'),
    className: "px-3 py-2 rounded-xl border-2 border-indigo-600 text-sm focus:border-indigo-400 outline-none w-32 bg-slate-50 focus:bg-white transition-colors"
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.add'),
    onClick: () => handleAddToMapList(mapAddInput),
    className: "bg-indigo-100 text-indigo-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-200 transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 14
  }), " ", t('concept_map.setup.add_concept_btn')))), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 max-w-md mx-auto mb-6"
  }, "Review and curate the concepts before generating the interactive diagram."), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.initialize_map'),
    onClick: handleInitializeMap,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "w-full p-4 text-xl font-bold bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 24,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 24,
    className: "text-yellow-400 fill-current"
  }), isProcessing ? t('concept_map.setup.organizing') : t('concept_map.setup.create_diagram'))) : renderInteractiveMap() : renderOutlineContent());
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.OutlineView = OutlineView;
  window.AlloModules.ViewOutlineModule = true;
})();
