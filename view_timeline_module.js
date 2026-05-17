/**
 * AlloFlow View - Timeline Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='timeline' block.
 * Source range (pre-extraction): lines 35374-35751 (~378 lines).
 * Renders the timeline editor view: drag/drop reordering, AI verify,
 * auto-fix, image generation per item, revision flow, and the
 * timeline game launcher. ErrorBoundary + TimelineGame components
 * passed in as props.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.TimelineView) {
    console.log('[CDN] ViewTimelineModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewTimelineModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  // Lazy Lucide icon resolution from window.AlloIcons (populated by
  // host at AlloFlowANTI.txt:4930). Avoids threading 16 icon
  // components as props. Mirrors view_renderers_module.js pattern.
  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var AlertCircle = _lazyIcon('AlertCircle');
  var AlertTriangle = _lazyIcon('AlertTriangle');
  var Ban = _lazyIcon('Ban');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Gamepad2 = _lazyIcon('Gamepad2');
  var GripVertical = _lazyIcon('GripVertical');
  var ImageIcon = _lazyIcon('ImageIcon');
  var ListOrdered = _lazyIcon('ListOrdered');
  var Loader2 = _lazyIcon('Loader2');
  var Pencil = _lazyIcon('Pencil');
  var Plus = _lazyIcon('Plus');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Send = _lazyIcon('Send');
  var Sparkles = _lazyIcon('Sparkles');
  var Trash2 = _lazyIcon('Trash2');
  var X = _lazyIcon('X');

  function TimelineView(props) {
  // Pure data refs
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var leveledTextLanguage = props.leveledTextLanguage;
  var TIMELINE_MODE_DEFINITIONS = props.TIMELINE_MODE_DEFINITIONS;
  // State slices + flags
  var dismissedVerifications = props.dismissedVerifications;
  var draggedTimelineIndex = props.draggedTimelineIndex;
  var initialImageSize = props.initialImageSize;
  var timelineImageSize = props.timelineImageSize;
  var timelineRefinementInputs = props.timelineRefinementInputs;
  var timelineRevisionInput = props.timelineRevisionInput;
  var isAutoFixingTimeline = props.isAutoFixingTimeline;
  var isEditingTimeline = props.isEditingTimeline;
  var isGeneratingTimelineImage = props.isGeneratingTimelineImage;
  var isRevisingTimeline = props.isRevisingTimeline;
  var isTimelineGame = props.isTimelineGame;
  var isVerifyingTimeline = props.isVerifyingTimeline;
  // Setters
  var setDismissedVerifications = props.setDismissedVerifications;
  var setTimelineImageSize = props.setTimelineImageSize;
  var setTimelineRefinementInputs = props.setTimelineRefinementInputs;
  var setTimelineRevisionInput = props.setTimelineRevisionInput;
  // Handlers
  var handleAddTimelineStep = props.handleAddTimelineStep;
  var handleAutoFixTimeline = props.handleAutoFixTimeline;
  var handleDeleteTimelineStep = props.handleDeleteTimelineStep;
  var handleExplainTimelineItem = props.handleExplainTimelineItem;
  var handleGameCompletion = props.handleGameCompletion;
  var handleGameScoreUpdate = props.handleGameScoreUpdate;
  var handleGenerateTimelineItemImage = props.handleGenerateTimelineItemImage;
  var handleLockTimelineMode = props.handleLockTimelineMode;
  var handleSetIsTimelineGameToTrue = props.handleSetIsTimelineGameToTrue;
  var handleTimelineChange = props.handleTimelineChange;
  var handleTimelineDragEnd = props.handleTimelineDragEnd;
  var handleTimelineDragOver = props.handleTimelineDragOver;
  var handleTimelineDragStart = props.handleTimelineDragStart;
  var handleTimelineRevision = props.handleTimelineRevision;
  var handleToggleIsEditingTimeline = props.handleToggleIsEditingTimeline;
  var handleVerifyTimelineAccuracy = props.handleVerifyTimelineAccuracy;
  // Misc
  var closeTimeline = props.closeTimeline;
  // Components from host scope
  var ErrorBoundary = props.ErrorBoundary;
  var TimelineGame = props.TimelineGame;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6 flex justify-between items-center flex-wrap gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-indigo-800"
  }, /*#__PURE__*/React.createElement("strong", null, t('simplified.udl_goal').split(':')[0], ":"), " ", t('timeline.udl_goal_desc')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_game'),
    onClick: handleSetIsTimelineGameToTrue,
    className: "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), " ", isTeacherMode ? t('timeline.preview_game') : t('timeline.launch_sequencer')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_timeline'),
    onClick: handleToggleIsEditingTimeline,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingTimeline ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`
  }, isEditingTimeline ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingTimeline ? t('timeline.done_editing') : t('timeline.edit_sequence')), /*#__PURE__*/React.createElement("div", {
    "data-help-key": "timeline_image_size",
    className: "flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm",
    title: t('timeline.image_size_tooltip') || 'Resize sequence images'
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14,
    className: "text-indigo-400"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.range_slider') || 'Image size',
    type: "range",
    min: "64",
    max: "300",
    step: "16",
    value: timelineImageSize,
    onChange: e => setTimelineImageSize(Number(e.target.value)),
    className: "w-20 h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
  })))), isTeacherMode && generatedContent?.data && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded-lg border border-slate-400 shadow-sm flex flex-wrap gap-2 items-center"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-indigo-500"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.timeline_revise_placeholder'),
    type: "text",
    value: timelineRevisionInput || '',
    onChange: e => setTimelineRevisionInput(e.target.value),
    placeholder: t('timeline.revise_placeholder'),
    className: "flex-grow min-w-[200px] text-sm border border-slate-400 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleTimelineRevision(),
    disabled: isRevisingTimeline || !timelineRevisionInput?.trim(),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, isRevisingTimeline ? /*#__PURE__*/React.createElement(Loader2, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 14
  }), isRevisingTimeline ? t('timeline.revising') : t('timeline.revise_button'))), isTeacherMode && !Array.isArray(generatedContent?.data) && Array.isArray(generatedContent?.data?.validationIssues) && generatedContent.data.validationIssues.length > 0 && /*#__PURE__*/React.createElement("details", {
    className: "bg-amber-50 border border-amber-200 rounded-lg shadow-sm p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer flex flex-wrap items-center gap-2 text-xs font-bold text-amber-800"
  }, /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 14,
    className: "text-amber-600"
  }), t('timeline.validation.issues_header', {
    count: generatedContent.data.validationIssues.length
  }) || `${generatedContent.data.validationIssues.length} structural issue(s) detected`, /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.preventDefault();
      e.stopPropagation();
      handleAutoFixTimeline();
    },
    disabled: isAutoFixingTimeline,
    className: "ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50",
    "aria-busy": isAutoFixingTimeline
  }, isAutoFixingTimeline ? /*#__PURE__*/React.createElement(Loader2, {
    size: 12,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 12
  }), isAutoFixingTimeline ? t('timeline.validation.fixing') || 'Fixing…' : t('timeline.validation.auto_fix') || 'Auto-fix')), /*#__PURE__*/React.createElement("ul", {
    className: "mt-2 text-[12px] text-amber-900 list-disc list-inside space-y-1"
  }, generatedContent.data.validationIssues.map((iss, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, iss.message)))), isTeacherMode && generatedContent?.data && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleVerifyTimelineAccuracy(),
    disabled: isVerifyingTimeline,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
    "aria-busy": isVerifyingTimeline,
    title: t('timeline.validation.verify_tooltip') || 'Run AI accuracy check on each item'
  }, isVerifyingTimeline ? /*#__PURE__*/React.createElement(Loader2, {
    size: 14,
    className: "animate-spin"
  }) : '🔍', isVerifyingTimeline ? t('timeline.validation.verifying') || 'Verifying…' : t('timeline.validation.verify') || 'Verify accuracy')), /*#__PURE__*/React.createElement("div", {
    className: "relative pl-12 sm:pl-16 border-l-2 border-indigo-200 space-y-8 my-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-[-7px] top-0 font-black text-indigo-300 text-[11px] uppercase tracking-widest -translate-y-full"
  }, t('timeline.start_marker')), !Array.isArray(generatedContent?.data) && generatedContent?.data?.progressionLabel && /*#__PURE__*/React.createElement("div", {
    className: "absolute left-4 top-[-24px] flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md"
  }, /*#__PURE__*/React.createElement("span", {
    className: "opacity-70"
  }, t('timeline.order_by')), " ", generatedContent?.data.progressionLabel), generatedContent?.data.mode && TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode] && (generatedContent.data.autoDetected ? /*#__PURE__*/React.createElement("button", {
    onClick: handleLockTimelineMode,
    className: "bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full text-[11px] font-bold shadow-sm hover:bg-amber-100 transition-colors",
    title: t('timeline.click_to_lock_tooltip') || 'Click to lock this mode for future generations',
    "aria-label": t('timeline.click_to_lock_aria') || 'Click to lock this mode'
  }, "\u2728 ", t('timeline.detected_label') || 'Detected', ": ", TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode].label) : /*#__PURE__*/React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-400 px-2 py-1 rounded-full text-[11px] font-bold shadow-sm"
  }, "\uD83D\uDD12 ", TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode].label))), /*#__PURE__*/React.createElement("div", {
    className: "absolute left-[-5px] bottom-[-10px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-indigo-200"
  }), isEditingTimeline ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 italic text-center mb-2"
  }, t('timeline.edit_instruction')), (Array.isArray(generatedContent?.data) ? generatedContent?.data : generatedContent?.data?.items || []).map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    "data-timeline-row": true,
    draggable: true,
    onDragStart: e => handleTimelineDragStart(e, idx),
    onDragOver: e => handleTimelineDragOver(e, idx),
    onDragEnd: handleTimelineDragEnd,
    className: `relative flex items-start gap-2 p-3 rounded-xl border-2 transition-all ${draggedTimelineIndex === idx ? 'opacity-50 border-dashed border-indigo-300 bg-indigo-50' : 'bg-white border-slate-200 shadow-sm'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-1 mt-2 text-slate-600 cursor-grab active:cursor-grabbing hover:text-indigo-500"
  }, /*#__PURE__*/React.createElement(GripVertical, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold bg-slate-100 px-1.5 rounded text-slate-600"
  }, idx + 1)), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow grid grid-cols-1 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_item'),
    type: "text",
    value: item.date,
    onChange: e => handleTimelineChange(idx, 'date', e.target.value),
    className: "w-1/3 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: t('timeline.label_placeholder')
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.text_field'),
    type: "text",
    "data-timeline-event": true,
    value: item.event,
    onChange: e => handleTimelineChange(idx, 'event', e.target.value),
    className: "w-2/3 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-400 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: t('timeline.event_placeholder')
  })), (item.event_en || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_item'),
    type: "text",
    value: item.date_en || '',
    onChange: e => handleTimelineChange(idx, 'date', e.target.value, true),
    className: "w-1/3 text-[11px] font-bold text-indigo-600 bg-white border border-indigo-100 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: t('timeline.label_en_placeholder')
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.text_field'),
    type: "text",
    value: item.event_en || '',
    onChange: e => handleTimelineChange(idx, 'event', e.target.value, true),
    className: "w-2/3 text-xs text-slate-600 bg-white border border-slate-400 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: t('timeline.event_en_placeholder')
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-1 mt-1 shrink-0"
  }, item.image ? /*#__PURE__*/React.createElement("div", {
    className: "relative group/timgimg"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: item.image,
    alt: `${item.date || ''}: ${item.event || ''}`,
    className: "w-12 h-12 object-contain rounded border border-slate-400 bg-white"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date),
    disabled: isGeneratingTimelineImage[idx],
    "aria-busy": !!isGeneratingTimelineImage[idx],
    "aria-label": t('timeline.visuals.regen_button_aria') || 'Regenerate image for this item',
    className: "absolute inset-0 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover/timgimg:opacity-100 transition-opacity text-white disabled:opacity-80",
    title: t('common.regenerate') || 'Regenerate'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14
  })), isEditingTimeline && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full mt-1 left-0 w-44 bg-white border border-slate-400 rounded shadow-lg p-1.5 z-10 animate-in slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('timeline.visuals.remove_text_btn') || 'Remove text from image',
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date, "Remove all text, labels, letters, and words from the image. Keep the illustration clean."),
    disabled: isGeneratingTimelineImage[idx],
    className: "w-full mb-1 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-1.5 py-0.5 rounded flex items-center justify-center gap-1 font-bold",
    title: t('timeline.visuals.remove_text_tooltip') || 'Remove text/labels from this image'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Ban, {
    size: 10
  }), " ", t('timeline.visuals.remove_text_btn') || 'Remove Text'), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: timelineRefinementInputs[idx] || '',
    onChange: e => setTimelineRefinementInputs(prev => ({
      ...prev,
      [idx]: e.target.value
    })),
    placeholder: t('timeline.visuals.refine_placeholder') || 'e.g., make it cuter',
    className: "text-[10px] border border-yellow-600 rounded px-1 py-0.5 flex-1 focus:outline-none focus:ring-1 focus:ring-yellow-400 min-w-0",
    onKeyDown: e => {
      if (e.key === 'Enter' && timelineRefinementInputs[idx]) {
        handleGenerateTimelineItemImage(idx, item.event, item.date, timelineRefinementInputs[idx]);
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date, timelineRefinementInputs[idx]),
    disabled: !timelineRefinementInputs[idx] || isGeneratingTimelineImage[idx],
    className: "bg-yellow-400 text-yellow-900 p-1 rounded hover:bg-yellow-500 disabled:opacity-50 shrink-0",
    "aria-label": t('common.apply_edit') || 'Apply edit'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 10
  }))))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date),
    disabled: isGeneratingTimelineImage[idx] || !item.event,
    "aria-busy": !!isGeneratingTimelineImage[idx],
    "aria-label": t('timeline.visuals.regen_button_aria') || 'Generate image for this item',
    className: "w-12 h-12 rounded border-2 border-dashed border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-wait",
    title: t('timeline.visuals.regen_button_aria') || 'Generate image'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14
  }))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.delete'),
    onClick: () => handleDeleteTimelineStep(idx),
    className: "p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-1",
    title: t('timeline.remove_step_title')
  }, /*#__PURE__*/React.createElement(Trash2, {
    size: 16
  })))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.add'),
    onClick: handleAddTimelineStep,
    className: "w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 16
  }), " ", t('timeline.add_step'))) : isTeacherMode || isIndependentMode ? (Array.isArray(generatedContent?.data) ? generatedContent?.data : generatedContent?.data?.items || []).map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "relative animate-in slide-in-from-bottom-2 duration-300",
    style: {
      animationDelay: `${idx * 100}ms`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute -left-[57px] sm:-left-[73px] top-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-indigo-600 border-4 border-indigo-100 box-content"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm hover:shadow-md transition-shadow flex gap-3 items-start"
  }, item.image && /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: item.image,
    alt: `${item.date || ''}: ${item.event || ''}`,
    className: "object-contain rounded-lg bg-white border border-slate-100 shrink-0",
    style: {
      width: `${timelineImageSize}px`,
      height: `${timelineImageSize}px`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded mb-1 border border-indigo-200"
  }, item.date, item.date_en && /*#__PURE__*/React.createElement("span", {
    className: "opacity-60 font-normal ml-1"
  }, "(", item.date_en, ")")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-slate-800 leading-relaxed"
  }, item.event), item.event_en && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 italic mt-1"
  }, item.event_en), (() => {
    const _vKey = idx + ':' + (item.event || '');
    const _flagged = item.verification && (item.verification.factual === false || item.verification.position === false);
    if (!_flagged || dismissedVerifications.has(_vKey)) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "mt-2 border border-red-200 rounded-lg bg-red-50 p-2 text-[11px] text-red-800"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-1"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 12,
      className: "shrink-0 text-red-600"
    }), /*#__PURE__*/React.createElement("strong", null, t('timeline.validation.flagged') || 'Flagged'), /*#__PURE__*/React.createElement("span", {
      className: "text-red-700/70"
    }, item.verification.factual === false ? '• factual' : '', item.verification.position === false ? ' • position' : ''), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDismissedVerifications(prev => {
        const next = new Set(prev);
        next.add(_vKey);
        return next;
      }),
      className: "ml-auto text-red-600 hover:text-red-600 p-0.5 rounded",
      "aria-label": t('timeline.validation.dismiss') || 'Dismiss verification concern',
      title: t('timeline.validation.dismiss') || 'Dismiss'
    }, /*#__PURE__*/React.createElement(X, {
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-red-700 leading-relaxed pl-4"
    }, item.verification.concern || (item.verification.factual === false ? t('timeline.validation.factual_concern') || 'Factual concern — review this item.' : t('timeline.validation.position_concern') || 'Position may be wrong — check placement on the axis.')));
  })(), item.verification && item.verification.factual !== false && item.verification.position !== false && (item.verification.rationale ? /*#__PURE__*/React.createElement("details", {
    className: "mt-2 group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "inline-flex items-center gap-1 text-[11px] bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 text-emerald-800 cursor-pointer hover:bg-emerald-100 list-none transition-colors"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 11,
    className: "text-emerald-600"
  }), t('timeline.validation.verified') || 'Verified', /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700/70 ml-0.5 group-open:rotate-180 transition-transform"
  }, "\u25BE")), /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-[11px] bg-emerald-50/50 border-l-2 border-emerald-300 px-2 py-1.5 text-emerald-900/90 leading-relaxed rounded-r"
  }, item.verification.rationale)) : /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1 text-[11px] bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 text-emerald-800"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 11,
    className: "text-emerald-600"
  }), " ", t('timeline.validation.verified') || 'Verified')))))) : /*#__PURE__*/React.createElement("div", {
    className: "relative -ml-12 sm:-ml-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center animate-in fade-in zoom-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-4 rounded-full mb-4"
  }, /*#__PURE__*/React.createElement(ListOrdered, {
    size: 48,
    className: "text-indigo-500"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-black text-slate-700 mb-2"
  }, t('timeline.ready_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 mb-8 max-w-md"
  }, t('timeline.ready_desc')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_game'),
    onClick: handleSetIsTimelineGameToTrue,
    className: "px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 24,
    className: "fill-current text-yellow-700"
  }), " ", t('timeline.start_activity'))))), isTimelineGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Sequence Game encountered an error."
  }, /*#__PURE__*/React.createElement(TimelineGame, {
    data: generatedContent?.data,
    onClose: closeTimeline,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion,
    onExplainIncorrect: handleExplainTimelineItem,
    initialImageSize: timelineImageSize
  })));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TimelineView = TimelineView;
  window.AlloModules.ViewTimelineModule = true;
})();
