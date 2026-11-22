
function _outlineAiDoor(t) {
  try {
    if (typeof window !== 'undefined') {
      if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window._alloQrBlocked === true) {
        return { disabled: true, available: false };
      }
      if (typeof window.callGemini === 'function' && window.callGemini._alloQrBlocked === true) {
        return { disabled: true, available: false };
      }
      if (typeof window.__alloAiSetupDoorway === 'function') {
        var res = window.__alloAiSetupDoorway('text', t);
        if (res && (res.disabled || res.available === false)) return res;
      }
      if (typeof window.__alloAiUsable === 'function' && !window.__alloAiUsable('text', window.callGemini)) {
        return { disabled: true, available: false };
      }
    }
  } catch (_) {}
  return { disabled: false };
}

function OutlineView(props) {
  props = props || {};
  // Pure data + state reads
  var t = typeof props.t === 'function' ? props.t : function (k) { return k; };
  var bionicOn = (typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function') ? window.__alloUseBionic() : false;
  var bt = function (s) { return (bionicOn && typeof s === 'string' && typeof window !== 'undefined' && typeof window.__alloBionicReact === 'function') ? window.__alloBionicReact(s) : s; };
  var outlineAiDoor = _outlineAiDoor(t);
  var outlineAiOff = !!(outlineAiDoor && (outlineAiDoor.disabled || outlineAiDoor.available === false));
  var outlineAiTitle = outlineAiOff ? (outlineAiDoor.title || (typeof t === 'function' && t('ai.setup_required')) || 'Set up AI to use this feature') : undefined;
  // English fallback whether t returns '' or the key itself for a missing string.
  var tl = function (key, fallback) { var v = typeof t === 'function' ? t(key) : ''; return v && v !== key ? v : fallback; };
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
  var broadcastInteractiveOrganizer = props.broadcastInteractiveOrganizer;
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
  var handleConceptSpacePersist = props.handleConceptSpacePersist;
  // Pure helpers
  var addToast = props.addToast;
  var copyToClipboard = props.copyToClipboard;
  var safeDownloadBlob = props.safeDownloadBlob;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var conceptCompositionRef = React.useRef(null);
  var _speakingOutlineState = React.useState(false);
  var speakingOutline = _speakingOutlineState[0], setSpeakingOutline = _speakingOutlineState[1];
  var speakingOutlineRef = React.useRef(false);
  var outlineMountedRef = React.useRef(true);
  var outlineSpeechListenerRef = React.useRef(null);
  var isOutlineGlobalMuted = function () {
    if (typeof window === 'undefined') return false;
    try {
      if (window.__alloMuted === true || window._alloGlobalMute === true || window._alloGlobalMuted === true) return true;
      if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return true;
    } catch (_) {}
    return false;
  };
  var stopOutlineSpeechListener = function () {
    if (outlineSpeechListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('allo-speech-state', outlineSpeechListenerRef.current);
      outlineSpeechListenerRef.current = null;
    }
  };
  var stopOutlineActiveSpeech = function () {
    stopOutlineSpeechListener();
    if (speakingOutlineRef.current) {
      speakingOutlineRef.current = false;
      try {
        var player = typeof window !== 'undefined' ? window.AlloSpeechPlayer : null;
        if (player && typeof player.stop === 'function') player.stop();
        else if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (_) {}
    }
  };
  React.useEffect(function () {
    outlineMountedRef.current = true;
    return function () { outlineMountedRef.current = false; stopOutlineActiveSpeech(); };
  }, []);
  React.useEffect(function () {
    stopOutlineActiveSpeech();
    setSpeakingOutline(false);
    return function () { stopOutlineActiveSpeech(); };
  }, [generatedContent && generatedContent.id]);
  var handleListenOutline = function () {
    var player = typeof window !== 'undefined' ? window.AlloSpeechPlayer : null;
    var finished = function () {
      stopOutlineSpeechListener();
      speakingOutlineRef.current = false;
      if (outlineMountedRef.current) setSpeakingOutline(false);
    };
    stopOutlineSpeechListener();
    if (speakingOutline) {
      speakingOutlineRef.current = false;
      if (player && typeof player.stop === 'function') player.stop();
      else if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      setSpeakingOutline(false);
      return;
    }
    if (isOutlineGlobalMuted()) return;
    var d = generatedContent && generatedContent.data;
    var parts = [];
    if (d && d.main) parts.push(String(d.main));
    (Array.isArray(d && d.branches) ? d.branches : []).forEach(function (b) {
      if (!b) return;
      var line = [b.title].concat(Array.isArray(b.items) ? b.items.map(function (it) { return typeof it === 'string' ? it : (it && (it.text || it.label || it.title || '')) || ''; }) : []).filter(Boolean).join('. ');
      if (line) parts.push(line);
    });
    var spoken = parts.join('. ').replace(/\s+/g, ' ').trim();
    if (!spoken) return;
    if (player && typeof player.speak === 'function') {
      var ourId = null;
      var onState = function (e) {
        var detail = e.detail || {};
        if (ourId === null) { if (detail.isPlaying) ourId = detail.currentId; return; }
        if (!detail.isPlaying || detail.currentId !== ourId) finished();
      };
      outlineSpeechListenerRef.current = onState;
      window.addEventListener('allo-speech-state', onState);
      speakingOutlineRef.current = true;
      setSpeakingOutline(true);
      var langOpt = leveledTextLanguage && leveledTextLanguage !== 'English' ? { language: leveledTextLanguage } : undefined;
      Promise.resolve(langOpt ? player.speak(spoken, langOpt) : player.speak(spoken)).then(function (res) { if (res === null && ourId === null) finished(); }, finished);
    } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
      speakingOutlineRef.current = true;
      setSpeakingOutline(true);
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(spoken);
      if (leveledTextLanguage && typeof window.languageToTTSCode === 'function') {
        try { var code = window.languageToTTSCode(leveledTextLanguage); if (code) u.lang = code; } catch (_) {}
      }
      u.onend = finished;
      u.onerror = finished;
      window.speechSynthesis.speak(u);
    }
  };
  var controlSize = { minHeight: 44, minWidth: 44, maxWidth: '100%' };
  var canAddConcept = typeof mapAddInput === 'string' && !!mapAddInput.trim();
  function addConcept() {
    if (canAddConcept && typeof handleAddToMapList === 'function') handleAddToMapList(mapAddInput);
  }
  function handleConceptKeyDown(event) {
    if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey || conceptCompositionRef.current === event.currentTarget || event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.nativeEvent?.keyCode === 229) return;
    event.preventDefault();
    addConcept();
  }
  return (
                  <div className="space-y-6 h-full">
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6 flex flex-col sm:flex-row flex-wrap justify-between items-start gap-4">
                        {/* The UDL rationale is the teacher's; a student's first read is the organizer. */}
                        {isTeacherMode && <div data-organizer-udl-goal className="text-sm text-orange-800">
                            <strong>{tl('outline.udl_goal_label', 'UDL Goal:')}</strong> {tl('outline.udl_goal_desc', 'Providing options for perception. This graphic organizer helps students who process information visually or struggle with large blocks of text.')}
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className="inline-block bg-white/50 border border-orange-200 px-2 py-0.5 rounded text-xs font-bold">{tl('outline.level_label', 'Level:')} {gradeLevel}</span>
                                {leveledTextLanguage && leveledTextLanguage !== 'English' && <span className="inline-block bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-xs font-bold">{leveledTextLanguage}</span>}
                                {standardsInput && <span className="inline-flex bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-xs font-bold items-center gap-1"><CheckCircle size={10} aria-hidden="true"/> {standardsInput}</span>}
                            </div>
                        </div>}
                        <div className="flex flex-wrap gap-2">
                            {isTeacherMode && (
(generatedContent?.data?.structureType !== 'Venn Diagram' || isInteractiveVenn || isVennPlaying) && <button
                                    type="button" style={controlSize} data-outline-layout-toggle
                                    aria-pressed={!!(isInteractiveMap || isInteractiveVenn || isVennPlaying)}
                                    onClick={() => {
                                        if (generatedContent?.data?.structureType === 'Venn Diagram') {
                                            if (isInteractiveVenn || isVennPlaying) {
                                                if (typeof setIsInteractiveVenn === 'function') setIsInteractiveVenn(false);
                                                if (typeof setIsVennPlaying === 'function') setIsVennPlaying(false);
                                                if (typeof broadcastInteractiveOrganizer === 'function') broadcastInteractiveOrganizer(null);
                                            } else if (typeof handleInitializeVenn === 'function') {
                                                handleInitializeVenn();
                                            }
                                        } else if (typeof setIsInteractiveMap === 'function') {
                                            setIsInteractiveMap(!isInteractiveMap);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${isInteractiveMap || isInteractiveVenn || isVennPlaying ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50 motion-safe:animate-[pulse_3s_ease-in-out_infinite]'}`}
                                    title={isInteractiveMap || isInteractiveVenn || isVennPlaying ? tl('outline.view_diagram', 'View diagram') : tl('outline.edit_layout_hint', 'Arrange the concepts and connections in this organizer.')}
                                >
                                    {(isInteractiveMap || isInteractiveVenn || isVennPlaying) ? <Layout size={14} aria-hidden="true"/> : <Share2 size={14} aria-hidden="true"/>}
                                    {(isInteractiveMap || isInteractiveVenn || isVennPlaying) ? tl('outline.view_diagram', 'View diagram') : tl('outline.edit_diagram_layout', 'Edit diagram layout')}
                                </button>
                            )}
                            {!isInteractiveMap && !isInteractiveVenn && !isVennPlaying
                                && Array.isArray(generatedContent?.data?.branches) && generatedContent.data.branches.length > 0 && (
                                <button
                                    type="button" style={controlSize} data-outline-listen
                                    aria-pressed={speakingOutline}
                                    onClick={handleListenOutline}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${speakingOutline ? 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200' : 'bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-50'}`}
                                    title={speakingOutline ? tl('common.stop', 'Stop') : tl('outline.listen_hint', 'Hear this graphic organizer read aloud')}
                                >
                                    <span aria-hidden="true">{speakingOutline ? '⏹️' : '🔊'}</span>
                                    {speakingOutline ? tl('common.stop', 'Stop') : tl('common.listen', 'Listen')}
                                </button>
                            )}
                            {!isInteractiveMap && !isInteractiveVenn && !isVennPlaying
                                && generatedContent?.data?.structureType !== '3D Concept Space'
                                && generatedContent?.data?.structureType !== 'Memory Palace'
                                && Array.isArray(generatedContent?.data?.branches) && generatedContent.data.branches.length > 0 && (
                                <button
                                    type="button" style={controlSize}
                                    onClick={() => {
                                        var vr = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ViewRenderers;
                                        if (vr && typeof vr.openConceptMap3D === 'function') {
                                            vr.openConceptMap3D({
                                                generated: generatedContent?.data,
                                                arrangement: (!isTeacherMode && props.organizerLearnerWork && props.organizerLearnerWork.conceptSpace !== undefined) ? props.organizerLearnerWork.conceptSpace : generatedContent?.data?.conceptSpace,
                                                onArrangementChange: typeof handleConceptSpacePersist === 'function' ? (function (arr) { handleConceptSpacePersist(arr, 'conceptSpace', generatedContent?.id); }) : undefined,
                                                canReset: !!isTeacherMode,
                                                title: generatedContent?.data?.main || generatedContent?.title || '',
                                                t: t,
                                                addToast: addToast
                                            });
                                        } else if (typeof addToast === 'function') {
                                            addToast(t('concept_map.view_3d_failed') || 'The 3D view could not load here. The outline still works.', 'error');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                    title={t('concept_map.toolbar.view_3d_tooltip') || 'See this organizer as an orbitable 3D view (depth = strand)'}
                                >
                                    <span aria-hidden="true">🧊</span> {t('concept_map.toolbar.view_3d') || 'View in 3D'}
                                </button>
                            )}
                            {!isInteractiveMap && !isInteractiveVenn && !isVennPlaying
                                && generatedContent?.data?.structureType !== '3D Concept Space'
                                && generatedContent?.data?.structureType !== 'Memory Palace'
                                && Array.isArray(generatedContent?.data?.branches) && generatedContent.data.branches.length > 0 && (
                                <button
                                    type="button" style={controlSize} data-outline-freeforms-copy
                                    onClick={() => {
                                        // gradual release: AI-authored organizer → student remixes it as their own
                                        // Free Forms composition. The host (AlloFlowANTI) listens for this event,
                                        // stashes the payload in labToolData._ffImport, and opens the tool.
                                        try {
                                            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('allo-open-freeforms', { detail: { generated: generatedContent?.data } }));
                                        } catch (e) {
                                            if (typeof addToast === 'function') addToast(t('concept_map.toolbar.remix_failed') || 'Free Forms could not open here.', 'error');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-white text-violet-700 border border-violet-200 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                                    title={tl('concept_map.toolbar.remix_copy_hint', 'Open a separate Free Forms copy to change the words and arrangement.')}
                                >
                                    <span aria-hidden="true">🏛️</span> {tl('concept_map.toolbar.remix_copy', 'Make a Free Forms copy')}
                                </button>
                            )}
                            {isTeacherMode && !isInteractiveMap && !isInteractiveVenn && !isVennPlaying && (
                                <button
                                    type="button" style={controlSize} data-outline-edit-text
                                    aria-pressed={!!isEditingOutline}
                                    title={isEditingOutline ? tl('outline.done_editing_text', 'Done editing text') : tl('outline.edit_text_hint', 'Change the wording in this organizer.')}
                                    onClick={() => { if (typeof handleToggleIsEditingOutline === 'function') handleToggleIsEditingOutline(); }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${isEditingOutline ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'}`}
                                >
                                    {isEditingOutline ? <CheckCircle2 size={14} aria-hidden="true"/> : <Pencil size={14} aria-hidden="true"/>}
                                    {isEditingOutline ? tl('outline.done_editing_text', 'Done editing text') : tl('outline.edit_text', 'Edit Text')}
                                </button>
                            )}
                            {/* Teacher only in the markup, not just hidden by a class. */}
                            {isTeacherMode && !isInteractiveMap && !isInteractiveVenn && !isVennPlaying && (
                            <button
                                type="button" style={controlSize} data-outline-regenerate
                                onClick={() => { if (!outlineAiOff && typeof handleGenerate === 'function') handleGenerate('outline'); }}
                                disabled={isProcessing || outlineAiOff} aria-busy={isProcessing}
                                title={outlineAiTitle}
                                className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                            >
                                <RefreshCw size={14} aria-hidden="true" className={isProcessing ? "animate-spin motion-reduce:animate-none" : ""} /> {t('common.regenerate')}
                            </button>
                            )}
                        </div>
                    </div>
                    {isInteractiveMap ? (
                        (!isConceptMapReady && !isChallengeActive) ? (
                            <div className="max-w-3xl mx-auto bg-white p-4 sm:p-10 rounded-2xl border-2 border-indigo-100 shadow-lg text-center flex flex-col items-center justify-center min-h-[400px]">
                                <div className="bg-indigo-50 p-4 rounded-full mb-4">
                                    <Layout size={48} className="text-indigo-600" aria-hidden="true" />
                                </div>
                                <h2 className="text-3xl font-black text-indigo-900 mb-6">{bt(generatedContent?.data?.main || '')}</h2>
                                <div className="flex flex-wrap justify-center gap-3 mb-8 w-full">
                                    {Array.isArray(generatedContent?.data?.branches) && generatedContent.data.branches.map((branch, idx) => (
                                        <div key={idx} className="bg-white border-2 border-indigo-100 px-4 py-2 rounded-xl shadow-sm font-bold text-indigo-700 animate-in motion-reduce:animate-none zoom-in duration-300 flex items-center gap-2 group" style={{ animationDelay: `${idx * 50}ms` }}>
                                            {bt(branch?.title || '')}
                                            <button
                                                type="button" style={controlSize} data-outline-remove-concept
                                                aria-label={tl('outline.remove_concept_named', 'Remove concept {name}').replace('{name}', String(branch?.title || ''))}
                                                onClick={() => { if (typeof handleRemoveFromMapList === 'function') handleRemoveFromMapList(idx); }}
                                                className="inline-flex items-center justify-center shrink-0 text-indigo-600 hover:text-red-700 hover:bg-red-50 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                                title={t('common.remove_concept')}
                                            >
                                                <X size={12} aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex flex-wrap items-center justify-center gap-2 animate-in motion-reduce:animate-none zoom-in duration-300 delay-100">
                                        <input aria-label={tl('concept_map.setup.add_concept_btn', 'Add Concept')}
                                            type="text" style={controlSize} data-outline-add-concept-input
                                            value={mapAddInput ?? ''}
                                            onChange={(e) => { if (typeof setMapAddInput === 'function') setMapAddInput(e.target.value); }}
                                            onCompositionStart={(e) => { conceptCompositionRef.current = e.currentTarget; }}
                                            onCompositionEnd={(e) => { if (conceptCompositionRef.current === e.currentTarget) conceptCompositionRef.current = null; }}
                                            onBlur={(e) => { if (conceptCompositionRef.current === e.currentTarget) conceptCompositionRef.current = null; }}
                                            onKeyDown={handleConceptKeyDown}
                                            placeholder={t('concept_map.setup.add_concept_placeholder')}
                                            className="px-3 py-2 rounded-xl border-2 border-indigo-600 text-sm focus:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 w-32 bg-slate-50 focus:bg-white transition-colors"
                                        />
                                        <button
                                            type="button" style={controlSize} data-outline-add-concept disabled={!canAddConcept}
                                            onClick={addConcept}
                                            className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                        >
                                            <Plus size={14} aria-hidden="true" /> {t('concept_map.setup.add_concept_btn')}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-slate-600 max-w-md mx-auto mb-6">{tl('outline.curate_concepts_hint', 'Review and curate the concepts before generating the interactive diagram.')}</p>
                                <button
                                    type="button" style={controlSize}
                                    onClick={handleInitializeMap}
                                    disabled={isProcessing} aria-busy={isProcessing}
                                    className="w-full p-4 text-xl font-bold bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all motion-reduce:transform-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                                >
                                    {isProcessing ? <RefreshCw size={24} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Sparkles size={24} className="text-yellow-300 fill-current" aria-hidden="true"/>}
                                    {isProcessing ? t('concept_map.setup.organizing') : t('concept_map.setup.create_diagram')}
                                </button>
                            </div>
                        ) : (
                            typeof renderInteractiveMap === 'function' ? renderInteractiveMap() : null
                        )
                    ) : (
                        typeof renderOutlineContent === 'function' ? renderOutlineContent() : null
                    )}
                  </div>
  );
}
